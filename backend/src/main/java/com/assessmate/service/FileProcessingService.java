package com.assessmate.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.*;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;

@Service
@Slf4j
public class FileProcessingService {

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    // Chunk size in words
    private static final int CHUNK_SIZE = 400;

    // Overlap between adjacent chunks
    private static final int CHUNK_OVERLAP = 40;

    // Minimum chars per question for
    // sufficiency warning
    private static final int MIN_CHARS_PER_Q = 300;

    // Only check first 50 pages for image pages
    private static final int MAX_IMAGE_SCAN_PAGES = 50;

    // ─────────────────────────────────────────
    // MAIN ENTRY POINT
    // ─────────────────────────────────────────

    public FileExtractionResult extractFromFile(
            MultipartFile file,
            String topic) throws IOException {

        validateFile(file);

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("File name cannot be null");
        }
        String filename = originalFilename.toLowerCase();

        // Route by extension
        // Only supported formats listed here
        if (filename.endsWith(".pdf")) {
            return extractFromPdf(file, topic);
        } else if (filename.endsWith(".pptx")) {
            return extractFromPptx(file, topic);
        } else if (filename.endsWith(".docx")) {
            return extractFromDocx(file, topic);
        } else if (filename.endsWith(".jpg")
                || filename.endsWith(".jpeg")
                || filename.endsWith(".png")) {
            return extractFromImage(file);
        } else {
            // .ppt and .doc are intentionally
            // excluded — not supported by
            // XMLSlideShow or XWPFDocument
            throw new RuntimeException(
                    "Unsupported file type. " +
                            "Supported formats are " +
                            "PDF, PPTX, DOCX, JPG, JPEG, " +
                            "and PNG.");
        }
    }

    // ─────────────────────────────────────────
    // PDF EXTRACTION — PDFBox 3.x Loader API
    // ─────────────────────────────────────────

    private FileExtractionResult extractFromPdf(
            MultipartFile file,
            String topic) throws IOException {

        // PDFBox 3.x requires Loader.loadPDF
        // Do NOT use PDDocument.load()
        byte[] fileBytes = file.getBytes();
        PDDocument document = Loader.loadPDF(fileBytes);

        try {
            int totalPages = document.getNumberOfPages();

            PDFTextStripper stripper = new PDFTextStripper();
            String fullText = stripper.getText(document);

            boolean hasText = fullText != null
                    && fullText.trim().length() > 100;

            List<byte[]> pageImages = new ArrayList<>();
            List<String> imagePageNumbers = new ArrayList<>();

            // Only scan first 50 pages
            // for image-heavy pages
            int pagesToCheck = Math.min(
                    totalPages, MAX_IMAGE_SCAN_PAGES);
            boolean imageScanLimited = totalPages > MAX_IMAGE_SCAN_PAGES;

            PDFRenderer renderer = new PDFRenderer(document);

            for (int i = 0; i < pagesToCheck; i++) {
                stripper.setStartPage(i + 1);
                stripper.setEndPage(i + 1);
                String pageText = stripper.getText(document)
                        .trim();

                // Page with very little text
                // likely has an image or diagram
                if (pageText.length() < 50) {
                    try {
                        BufferedImage image = renderer
                                .renderImageWithDPI(
                                        i, 150);
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        ImageIO.write(
                                image, "PNG", baos);
                        pageImages.add(
                                baos.toByteArray());
                        imagePageNumbers.add(
                                "Page " + (i + 1));
                    } catch (Exception e) {
                        log.warn(
                                "Could not render " +
                                        "page {}: {}",
                                i + 1, e.getMessage());
                    }
                }
            }

            // Cannot use this file
            if (!hasText && pageImages.isEmpty()) {
                throw new RuntimeException(
                        "This PDF has no readable " +
                                "text or images. Please " +
                                "upload a text-based PDF.");
            }

            // Chunk text in original order
            // TF-IDF scored separately
            List<TextChunk> chunks = splitIntoChunks(fullText);
            scoreChunksTfIdf(chunks, topic);

            return FileExtractionResult.builder()
                    .fullText(fullText)
                    .chunks(chunks)
                    .pageImages(pageImages)
                    .imagePageNumbers(imagePageNumbers)
                    .totalPages(totalPages)
                    .hasText(hasText)
                    .fileType("PDF")
                    .imageScanLimited(
                            imageScanLimited)
                    .build();

        } finally {
            document.close();
        }
    }

    // ─────────────────────────────────────────
    // PPTX EXTRACTION — XMLSlideShow
    // Only .pptx supported, not .ppt
    // ─────────────────────────────────────────

    private FileExtractionResult extractFromPptx(
            MultipartFile file,
            String topic) throws IOException {

        XMLSlideShow ppt = new XMLSlideShow(
                file.getInputStream());
        StringBuilder fullText = new StringBuilder();
        int slideCount = 0;

        try {
            for (XSLFSlide slide : ppt.getSlides()) {
                slideCount++;
                fullText.append("Slide ")
                        .append(slideCount)
                        .append(":\n");
                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape) {
                        String text = ((XSLFTextShape) shape)
                                .getText();
                        if (text != null
                                && !text.isEmpty()) {
                            fullText.append(text)
                                    .append("\n");
                        }
                    }
                }
                fullText.append("\n");
            }
        } finally {
            ppt.close();
        }

        String text = fullText.toString();
        if (text.trim().isEmpty()) {
            throw new RuntimeException(
                    "Could not extract any text " +
                            "from this PPTX file.");
        }

        List<TextChunk> chunks = splitIntoChunks(text);
        scoreChunksTfIdf(chunks, topic);

        return FileExtractionResult.builder()
                .fullText(text)
                .chunks(chunks)
                .pageImages(new ArrayList<>())
                .imagePageNumbers(new ArrayList<>())
                .totalPages(slideCount)
                .hasText(true)
                .fileType("PPTX")
                .imageScanLimited(false)
                .build();
    }

    // ─────────────────────────────────────────
    // DOCX EXTRACTION — XWPFDocument
    // Only .docx supported, not .doc
    // ─────────────────────────────────────────

    private FileExtractionResult extractFromDocx(
            MultipartFile file,
            String topic) throws IOException {

        XWPFDocument document = new XWPFDocument(
                file.getInputStream());
        StringBuilder fullText = new StringBuilder();

        try {
            for (XWPFParagraph para : document.getParagraphs()) {
                String text = para.getText();
                if (text != null
                        && !text.trim().isEmpty()) {
                    fullText.append(text)
                            .append("\n");
                }
            }
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        fullText.append(
                                cell.getText())
                                .append(" | ");
                    }
                    fullText.append("\n");
                }
            }
        } finally {
            document.close();
        }

        String text = fullText.toString();
        if (text.trim().isEmpty()) {
            throw new RuntimeException(
                    "Could not extract any text " +
                            "from this DOCX file.");
        }

        List<TextChunk> chunks = splitIntoChunks(text);
        scoreChunksTfIdf(chunks, topic);

        return FileExtractionResult.builder()
                .fullText(text)
                .chunks(chunks)
                .pageImages(new ArrayList<>())
                .imagePageNumbers(new ArrayList<>())
                .totalPages(1)
                .hasText(true)
                .fileType("DOCX")
                .imageScanLimited(false)
                .build();
    }

    // ─────────────────────────────────────────
    // IMAGE EXTRACTION — JPG/JPEG/PNG
    // ─────────────────────────────────────────

    private FileExtractionResult extractFromImage(
            MultipartFile file)
            throws IOException {

        byte[] imageBytes = file.getBytes();

        return FileExtractionResult.builder()
                .fullText("")
                .chunks(new ArrayList<>())
                .pageImages(
                        Collections.singletonList(
                                imageBytes))
                .imagePageNumbers(
                        Collections.singletonList(
                                "Uploaded Image"))
                .totalPages(1)
                .hasText(false)
                .fileType("IMAGE")
                .imageScanLimited(false)
                .build();
    }

    // ─────────────────────────────────────────
    // CHUNK SPLITTING
    // Returns chunks in ORIGINAL document order
    // Does NOT sort — sorting is caller's job
    // ─────────────────────────────────────────

    public List<TextChunk> splitIntoChunks(
            String text) {

        if (text == null
                || text.trim().isEmpty()) {
            return new ArrayList<>();
        }

        String[] paragraphs = text.split("\n\n+");

        List<TextChunk> chunks = new ArrayList<>();
        StringBuilder currentChunk = new StringBuilder();
        int wordCount = 0;
        int chunkIndex = 0;

        for (String paragraph : paragraphs) {
            String trimmed = paragraph.trim();
            if (trimmed.isEmpty())
                continue;

            String[] words = trimmed.split("\\s+");

            if (wordCount + words.length > CHUNK_SIZE
                    && wordCount > 0) {

                String chunkText = currentChunk.toString().trim();
                if (!chunkText.isEmpty()) {
                    chunks.add(TextChunk.builder()
                            .index(chunkIndex++)
                            .text(chunkText)
                            .wordCount(wordCount)
                            // score set later
                            .relevanceScore(0.0)
                            .build());
                }

                // Overlap for context continuity
                String[] chunkWords = currentChunk.toString()
                        .split("\\s+");
                int overlapStart = Math.max(0,
                        chunkWords.length
                                - CHUNK_OVERLAP);
                currentChunk = new StringBuilder();
                wordCount = 0;

                for (int i = overlapStart; i < chunkWords.length; i++) {
                    currentChunk.append(
                            chunkWords[i]).append(" ");
                    wordCount++;
                }
            }

            currentChunk.append(trimmed)
                    .append("\n\n");
            wordCount += words.length;
        }

        // Last chunk
        String lastChunk = currentChunk.toString().trim();
        if (!lastChunk.isEmpty()) {
            chunks.add(TextChunk.builder()
                    .index(chunkIndex)
                    .text(lastChunk)
                    .wordCount(wordCount)
                    .relevanceScore(0.0)
                    .build());
        }

        // Return in original document order
        // NO sorting here
        return chunks;
    }

    // ─────────────────────────────────────────
    // TF-IDF SCORING
    // Scores each chunk in place
    // Original list order preserved
    // ─────────────────────────────────────────

    public void scoreChunksTfIdf(
            List<TextChunk> chunks,
            String topic) {

        if (topic == null
                || topic.trim().isEmpty()
                || chunks.isEmpty()) {
            // No topic — all scores stay 0.0
            return;
        }

        Set<String> queryTerms = tokenize(topic);

        if (queryTerms.isEmpty())
            return;

        int totalChunks = chunks.size();

        // Step 1 — term frequency per chunk
        List<Map<String, Integer>> chunkTermFreqs = new ArrayList<>();

        for (TextChunk chunk : chunks) {
            chunkTermFreqs.add(
                    computeTermFreq(chunk.getText()));
        }

        // Step 2 — IDF per query term
        Map<String, Double> idfMap = new HashMap<>();

        for (String term : queryTerms) {
            long docsWithTerm = chunkTermFreqs.stream()
                    .filter(tf -> tf.containsKey(term))
                    .count();

            if (docsWithTerm == 0) {
                idfMap.put(term, 0.0);
            } else {
                double idf = Math.log(
                        (double) totalChunks
                                / docsWithTerm);
                idfMap.put(term, idf);
            }
        }

        // Step 3 — TF-IDF score per chunk
        for (int i = 0; i < chunks.size(); i++) {
            TextChunk chunk = chunks.get(i);
            Map<String, Integer> tf = chunkTermFreqs.get(i);

            int totalTermsInChunk = tf.values().stream()
                    .mapToInt(Integer::intValue)
                    .sum();

            if (totalTermsInChunk == 0) {
                chunk.setRelevanceScore(0.0);
                continue;
            }

            double score = 0.0;
            for (String term : queryTerms) {
                int termCount = tf.getOrDefault(term, 0);
                double termFreq = (double) termCount
                        / totalTermsInChunk;
                double idf = idfMap.getOrDefault(
                        term, 0.0);
                score += termFreq * idf;
            }
            chunk.setRelevanceScore(score);
        }
        // Chunks still in original order
        // Only scores changed
    }

    // ─────────────────────────────────────────
    // NEIGHBOR-AWARE CHUNK SELECTION
    // 1. Ranks by TF-IDF score
    // 2. Selects top N
    // 3. Expands to include neighbors
    // 4. Returns in ORIGINAL document order
    // ─────────────────────────────────────────

    public List<TextChunk> selectChunksWithNeighbors(
            List<TextChunk> chunks,
            int topN) {

        if (chunks.isEmpty())
            return chunks;

        // Sort a COPY of indices by score
        // Do not mutate original list
        List<Integer> sortedByScore = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            sortedByScore.add(i);
        }
        sortedByScore.sort((a, b) -> Double.compare(
                chunks.get(b)
                        .getRelevanceScore(),
                chunks.get(a)
                        .getRelevanceScore()));

        // Select top N indices
        // then add their neighbors
        Set<Integer> selected = new LinkedHashSet<>();

        for (int rank = 0; rank < Math.min(topN,
                sortedByScore.size()); rank++) {
            int idx = sortedByScore.get(rank);
            selected.add(idx);

            // Add previous neighbor
            if (idx > 0) {
                selected.add(idx - 1);
            }
            // Add next neighbor
            if (idx < chunks.size() - 1) {
                selected.add(idx + 1);
            }
        }

        // Sort selected indices to restore
        // original document order
        List<Integer> inOrder = new ArrayList<>(selected);
        Collections.sort(inOrder);

        return inOrder.stream()
                .filter(java.util.Objects::nonNull)
                .mapToInt(Integer::intValue)
                .mapToObj(chunks::get)
                .toList();
    }

    // ─────────────────────────────────────────
    // CONTENT SUFFICIENCY CHECK
    // Returns warning string if content
    // is too thin for the question count
    // Returns null if sufficient
    // ─────────────────────────────────────────

    public String checkContentSufficiency(
            List<TextChunk> selectedChunks,
            int totalQuestions,
            String topic) {

        int totalChars = selectedChunks.stream()
                .mapToInt(c -> c.getText().length())
                .sum();

        int minRequired = MIN_CHARS_PER_Q * totalQuestions;

        if (totalChars < minRequired) {
            int recommended = Math.max(1,
                    totalChars / MIN_CHARS_PER_Q);

            if (topic != null
                    && !topic.isEmpty()) {
                return "Only " + totalChars
                        + " characters of content "
                        + "found for topic '"
                        + topic + "'. This may not "
                        + "be enough for "
                        + totalQuestions
                        + " quality questions. "
                        + "Consider reducing to "
                        + recommended
                        + " questions or providing "
                        + "more material on this topic.";
            } else {
                return "Limited source content "
                        + "found ("
                        + totalChars
                        + " characters). "
                        + "Consider reducing to "
                        + recommended
                        + " questions for better quality.";
            }
        }

        return null; // null means sufficient
    }

    // ─────────────────────────────────────────
    // TF-IDF TOKENIZATION HELPERS
    // ─────────────────────────────────────────

    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
            "a", "an", "the", "is", "are", "was",
            "were", "be", "been", "have", "has",
            "had", "do", "does", "did", "will",
            "would", "could", "should", "may",
            "might", "must", "can", "of", "in",
            "on", "at", "to", "for", "with", "by",
            "from", "as", "and", "or", "not", "no",
            "it", "its", "this", "that", "which",
            "who", "what", "how", "when", "where",
            "why", "also", "such", "into", "than",
            "then", "so", "if", "but", "about",
            "up", "out", "their", "they", "we",
            "our", "you", "your", "he", "she",
            "his", "her", "them", "us", "i",
            "me", "my", "am", "being"));

    public Set<String> tokenize(String text) {
        if (text == null
                || text.trim().isEmpty()) {
            return new HashSet<>();
        }
        Set<String> tokens = new HashSet<>();
        // Use word boundary split
        String[] words = text.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .split("\\s+");
        for (String word : words) {
            String trimmed = word.trim();
            // Allow 2-char terms for AI, ML etc
            // Only skip single chars and stop words
            if (trimmed.length() >= 2
                    && !STOP_WORDS.contains(
                            trimmed)) {
                tokens.add(trimmed);
            }
        }
        return tokens;
    }

    private Map<String, Integer> computeTermFreq(
            String text) {
        Map<String, Integer> freq = new HashMap<>();
        if (text == null)
            return freq;
        String[] words = text.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .split("\\s+");
        for (String word : words) {
            String trimmed = word.trim();
            if (trimmed.length() >= 2 && !STOP_WORDS.contains(trimmed)) {
                freq.put(trimmed, freq.getOrDefault(trimmed, 0) + 1);
            }
        }
        return freq;
    }

    // ─────────────────────────────────────────
    // FILE VALIDATION
    // ─────────────────────────────────────────

    private void validateFile(
            MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException(
                    "File is empty. " +
                            "Please upload a valid file.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException(
                    "File too large. " +
                            "Maximum allowed size is 50MB.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null
                || filename.trim().isEmpty()) {
            throw new RuntimeException(
                    "Invalid file name.");
        }

        String lower = filename.toLowerCase()
                .trim();

        // Only allow supported extensions
        // .ppt and .doc are NOT supported
        if (!lower.endsWith(".pdf")
                && !lower.endsWith(".pptx")
                && !lower.endsWith(".docx")
                && !lower.endsWith(".jpg")
                && !lower.endsWith(".jpeg")
                && !lower.endsWith(".png")) {
            throw new RuntimeException(
                    "Unsupported file type. " +
                            "Supported formats are " +
                            "PDF, PPTX, DOCX, JPG, JPEG, " +
                            "and PNG.");
        }
    }

    // ─────────────────────────────────────────
    // INNER CLASSES
    // ─────────────────────────────────────────

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class FileExtractionResult {
        private String fullText;
        private List<TextChunk> chunks;
        private List<byte[]> pageImages;
        private List<String> imagePageNumbers;
        private int totalPages;
        private boolean hasText;
        private String fileType;
        // true when PDF > 50 pages
        // and not all pages were scanned
        private boolean imageScanLimited;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TextChunk {
        private int index;
        private String text;
        private int wordCount;
        private double relevanceScore;
    }
}