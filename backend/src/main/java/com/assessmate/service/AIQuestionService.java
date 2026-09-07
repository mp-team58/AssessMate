package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.repository.*;
import com.assessmate.service.FileProcessingService.*;
import com.assessmate.service.GeminiService.GeneratedQuestion;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIQuestionService {

    private final GeminiService geminiService;
    private final FileProcessingService fileProcessingService;
    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final QuestionService questionService;

    // ─────────────────────────────────────────
    // Valid stage values:
    // TOPIC_ONLY
    // FULL_TEXT
    // KEYWORD_MATCH
    // FALLBACK_BEGINNING
    // IMAGE_GENERATION
    // ─────────────────────────────────────────

    // Stop words for answer verification
    private static final Set<String> STOP_WORDS =
        new HashSet<>(Arrays.asList(
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
            "his", "her", "them", "us"));

    // ─────────────────────────────────────────
    // GENERATE FROM TOPIC
    // inputType = TOPIC
    // stage = TOPIC_ONLY
    // ─────────────────────────────────────────

    public AIGenerationResponse generateFromTopic(
            AIGenerationRequest req,
            String hostEmail) {

        if (req.getTopic() == null
                || req.getTopic().trim().isEmpty()) {
            throw new RuntimeException(
                "Topic is required for topic-based AI generation.");
        }

        Exam exam = validateAndGetExam(
            req.getExamId(), hostEmail);
        int[] counts = calculateCounts(req, exam);

        List<GeneratedQuestion> generated =
            geminiService.generateFromTopic(
                req.getTopic(),
                req.getTotalQuestions(),
                counts[0], counts[1], counts[2],
                counts[3], counts[4],
                counts[5], counts[6]);

        return saveGeneratedQuestions(
            generated,
            exam,
            getHost(hostEmail),
            null,
            "TOPIC_ONLY",
            "TOPIC",
            "Questions generated from AI " +
            "knowledge only. No source material " +
            "was used. Please verify all answers " +
            "carefully.",
            req.getTopic(),
            req.getTotalQuestions());
    }

    // ─────────────────────────────────────────
    // GENERATE FROM PASTED TEXT
    // inputType = TEXT
    // stage = KEYWORD_MATCH / FULL_TEXT
    //       / FALLBACK_BEGINNING
    // ─────────────────────────────────────────

    public AIGenerationResponse generateFromText(
            AIGenerationRequest req,
            String hostEmail) {

        if (req.getText() == null
                || req.getText().trim().isEmpty()) {
            throw new RuntimeException(
                "Please paste some text content.");
        }

        String[] words =
            req.getText().trim().split("\\s+");
        if (words.length < 50) {
            throw new RuntimeException(
                "Text is too short. Please paste " +
                "at least 50 words.");
        }

        Exam exam = validateAndGetExam(
            req.getExamId(), hostEmail);
        int[] counts = calculateCounts(req, exam);

        // Split into chunks — original order kept
        List<TextChunk> chunks =
            fileProcessingService.splitIntoChunks(
                req.getText());

        // Score with TF-IDF in place
        fileProcessingService.scoreChunksTfIdf(
            chunks, req.getTopic());

        int topN = dynamicChunkCount(
            req.getTotalQuestions());

        String stage;
        String warning = null;
        List<TextChunk> selected;

        boolean hasTopic =
            req.getTopic() != null
            && !req.getTopic().trim().isEmpty();

        boolean anyRelevant = chunks.stream()
            .anyMatch(c ->
                c.getRelevanceScore() > 0);

        if (hasTopic && anyRelevant) {
            // Topic found — use TF-IDF + neighbor
            selected = fileProcessingService
                .selectChunksWithNeighbors(
                    chunks, topN);
            stage = "KEYWORD_MATCH";

        } else if (hasTopic) {
            // Topic entered but NOT found in text
            // STRICT — do not generate
            // Ask host to change topic
            throw new RuntimeException(
                "Topic '"
                + req.getTopic()
                + "' was not found in the pasted text. "
                + "Please check your topic or paste "
                + "text that contains content about "
                + "this topic.");

        } else {
            // No topic provided — use full text
            // Only when text is reasonably small
            selected = chunks.stream()
                .limit(topN)
                .collect(Collectors.toList());
            stage = "FULL_TEXT";
            warning =
                "No topic was provided. Questions "
                + "will be generated from the full "
                + "pasted text. For better quality, "
                + "provide a specific topic.";
        }

        // Sufficiency warning
        String sufficiencyWarning =
            fileProcessingService
                .checkContentSufficiency(
                    selected,
                    req.getTotalQuestions(),
                    req.getTopic());
        if (sufficiencyWarning != null) {
            warning = warning == null
                ? sufficiencyWarning
                : warning + " " + sufficiencyWarning;
        }

        String textToSend = selected.stream()
            .map(TextChunk::getText)
            .collect(Collectors.joining("\n\n"));

        List<GeneratedQuestion> generated =
            geminiService.generateFromText(
                textToSend,
                req.getTopic(),
                req.getTotalQuestions(),
                counts[0], counts[1], counts[2],
                counts[3], counts[4],
                counts[5], counts[6]);

        return saveGeneratedQuestions(
            generated,
            exam,
            getHost(hostEmail),
            req.getText(),
            stage,
            "TEXT",
            warning,
            req.getTopic(),
            req.getTotalQuestions());
    }

    // ─────────────────────────────────────────
    // GENERATE FROM FILE
    // inputType = FILE
    // stage = KEYWORD_MATCH / FULL_TEXT
    //       / FALLBACK_BEGINNING
    //       / IMAGE_GENERATION
    // ─────────────────────────────────────────

    public AIGenerationResponse generateFromFile(
            AIFileRequest req,
            MultipartFile file,
            String hostEmail) throws IOException {

        Exam exam = validateAndGetExam(
            req.getExamId(), hostEmail);

        AIGenerationRequest countReq =
            new AIGenerationRequest();
        countReq.setTotalQuestions(
            req.getTotalQuestions());
        countReq.setSingleChoiceCount(
            req.getSingleChoiceCount());
        countReq.setMultipleSelectCount(
            req.getMultipleSelectCount());
        countReq.setFillBlankCount(
            req.getFillBlankCount());
        countReq.setNumericalCount(
            req.getNumericalCount());

        int[] counts = calculateCounts(
            countReq, exam);

        FileExtractionResult extraction =
            fileProcessingService.extractFromFile(
                file, req.getTopic());

        // ── IMAGE ONLY FILE ──────────────────
        // No readable text — use Gemini Vision
        // on first detected image page only
        if (!extraction.isHasText()) {

            if (extraction.getPageImages()
                    .isEmpty()) {
                throw new RuntimeException(
                    "Could not extract any " +
                    "readable content from " +
                    "this file.");
            }

            // Use only first image page
            byte[] firstImage =
                extraction.getPageImages().get(0);

            String imageWarning =
                "This appears to be an " +
                "image-based or scanned " +
                "document. Questions were " +
                "generated from the first " +
                "detected page/image. " +
                "Upload a smaller relevant " +
                "page range or image for " +
                "better results.";

            if (extraction.isImageScanLimited()) {
                imageWarning +=
                    " Only the first 50 PDF " +
                    "pages were checked for " +
                    "image-heavy pages. Large " +
                    "scanned documents should " +
                    "be uploaded in smaller " +
                    "page ranges.";
            }

            List<GeneratedQuestion> generated =
                geminiService.generateFromImage(
                    firstImage,
                    req.getTopic(),
                    req.getTotalQuestions());

            return saveGeneratedQuestions(
                generated,
                exam,
                getHost(hostEmail),
                null,
                "IMAGE_GENERATION",
                "FILE",
                imageWarning,
                req.getTopic(),
                req.getTotalQuestions());
        }

        // ── TEXT FILE ────────────────────────
        // File has readable text
        // Use text chunk RAG generation ONLY
        // Do NOT automatically mix images
        // even if image pages were detected

        List<TextChunk> chunks =
            extraction.getChunks();

        if (chunks.isEmpty()) {
            throw new RuntimeException(
                "Could not extract readable " +
                "text from this file.");
        }

        // TF-IDF already scored during extraction
        // Chunks are in original document order

        int topN = dynamicChunkCount(
            req.getTotalQuestions());

        String stage;
        String warning = null;
        List<TextChunk> selected;

        boolean hasTopic =
            req.getTopic() != null
            && !req.getTopic().trim().isEmpty();

        boolean anyRelevant = chunks.stream()
            .anyMatch(c ->
                c.getRelevanceScore() > 0);

        if (hasTopic && anyRelevant) {
            // Topic found — use TF-IDF + neighbor
            selected = fileProcessingService
                .selectChunksWithNeighbors(
                    chunks, topN);
            stage = "KEYWORD_MATCH";

        } else if (hasTopic) {
            // Topic entered but NOT found in file
            // STRICT — do not generate
            // Ask host to try another topic
            throw new RuntimeException(
                "Topic '"
                + req.getTopic()
                + "' was not found in the uploaded "
                + "file. Please enter another topic "
                + "that matches the content of this "
                + "file, or upload a file that "
                + "contains relevant material about "
                + "this topic.");

        } else {
            // No topic provided
            // Use beginning of document
            // Show warning
            selected = chunks.stream()
                .limit(topN)
                .collect(Collectors.toList());
            stage = "FULL_TEXT";
            warning =
                "No topic was provided. Questions "
                + "will be generated from the "
                + "beginning sections of the uploaded "
                + "file. For better quality and "
                + "relevance, provide a specific topic.";
        }

        // Sufficiency warning
        String sufficiencyWarning =
            fileProcessingService
                .checkContentSufficiency(
                    selected,
                    req.getTotalQuestions(),
                    req.getTopic());
        if (sufficiencyWarning != null) {
            warning = warning == null
                ? sufficiencyWarning
                : warning + " " + sufficiencyWarning;
        }

        if (extraction.isImageScanLimited()) {
            String imageScanWarning =
                "Only the first 50 PDF pages were " +
                "checked for image-heavy pages. " +
                "Text extraction still used the full " +
                "document. Upload a smaller page " +
                "range if you need image/graph-based " +
                "question generation.";

            warning = warning == null
                ? imageScanWarning
                : warning + " " + imageScanWarning;
        }

        String textToSend = selected.stream()
            .map(TextChunk::getText)
            .collect(Collectors.joining("\n\n"));

        List<GeneratedQuestion> generated =
            geminiService.generateFromText(
                textToSend,
                req.getTopic(),
                req.getTotalQuestions(),
                counts[0], counts[1], counts[2],
                counts[3], counts[4],
                counts[5], counts[6]);

        return saveGeneratedQuestions(
            generated,
            exam,
            getHost(hostEmail),
            extraction.getFullText(),
            stage,
            "FILE",
            warning,
            req.getTopic(),
            req.getTotalQuestions());
    }

    // ─────────────────────────────────────────
    // SAVE + VALIDATE + VERIFY
    // requestedCount = host's requested count
    // generatedCount = actually saved count
    // ─────────────────────────────────────────

    private AIGenerationResponse
            saveGeneratedQuestions(
                List<GeneratedQuestion> generated,
                Exam exam,
                User host,
                String sourceText,
                String stage,
                String inputType,
                String warning,
                String topic,
                int requestedCount) {

        List<QuestionResponse> verified =
            new ArrayList<>();
        List<QuestionResponse> unverified =
            new ArrayList<>();

        for (GeneratedQuestion gq : generated) {
            try {
                // Basic null checks
                if (gq.getQuestionText() == null
                        || gq.getQuestionText()
                            .trim().isEmpty()) {
                    log.warn(
                        "Skipped: empty " +
                        "question text");
                    continue;
                }
                if (gq.getCorrectAnswer() == null
                        || gq.getCorrectAnswer()
                            .trim().isEmpty()) {
                    log.warn(
                        "Skipped: empty " +
                        "correct answer");
                    continue;
                }

                // Parse and validate type
                QuestionType type;
                try {
                    type = QuestionType.valueOf(
                        gq.getType()
                            .toUpperCase().trim());
                } catch (Exception e) {
                    log.warn(
                        "Skipped: invalid type {}",
                        gq.getType());
                    continue;
                }

                // Parse and validate difficulty
                Difficulty difficulty;
                try {
                    difficulty = Difficulty.valueOf(
                        gq.getDifficulty()
                            .toUpperCase().trim());
                } catch (Exception e) {
                    log.warn(
                        "Skipped: invalid " +
                        "difficulty {}",
                        gq.getDifficulty());
                    continue;
                }

                // Validate and normalize
                // based on question type
                String correctAnswer;
                try {
                    correctAnswer =
                        validateAndNormalize(
                            gq, type);
                } catch (Exception e) {
                    log.warn(
                        "Skipped: {} — {}",
                        gq.getQuestionText()
                            .substring(0,
                                Math.min(40,
                                gq.getQuestionText()
                                    .length())),
                        e.getMessage());
                    continue;
                }

                // Conservative answer verification
                boolean isVerified =
                    sourceText != null
                    && verifyAnswer(
                        gq, correctAnswer,
                        type, sourceText);

                Double tolerance = 0.0;
                if (type == QuestionType.NUMERICAL) {
                    tolerance =
                        gq.getTolerance() != null
                        && gq.getTolerance() >= 0
                        ? gq.getTolerance()
                        : 0.0;
                }

                Question question =
                    Question.builder()
                        .exam(exam)
                        .createdBy(host)
                        .questionText(
                            gq.getQuestionText()
                                .trim())
                        .type(type)
                        .difficulty(difficulty)
                        .topic(
                            topic != null
                            && !topic.isEmpty()
                            ? topic
                            : gq.getTopic())
                        .explanation(
                            gq.getExplanation())
                        .optionA(gq.getOptionA())
                        .optionB(gq.getOptionB())
                        .optionC(gq.getOptionC())
                        .optionD(gq.getOptionD())
                        .correctAnswer(
                            correctAnswer)
                        .tolerance(tolerance)
                        .strictMarking(true)
                        .addedBy("AI")
                        .marks(getMarks(
                            exam, difficulty))
                        .negativeMarks(getNegative(
                            exam, difficulty))
                        .timeSeconds(getSeconds(
                            exam, difficulty))
                        .isGlobal(false)
                        // isVerified means:
                        // answer has evidence in
                        // source material
                        // NOT factual guarantee
                        .isVerified(isVerified)
                        .build();

                QuestionResponse saved =
                    questionService.mapToResponse(
                        questionRepository
                            .save(question));

                if (isVerified) {
                    verified.add(saved);
                } else {
                    unverified.add(saved);
                }

            } catch (Exception e) {
                log.warn(
                    "Skipped question: {}",
                    e.getMessage());
            }
        }

        return AIGenerationResponse.builder()
            // requestedCount = what host asked for
            .requestedCount(requestedCount)
            // generatedCount = actually saved
            .generatedCount(
                verified.size() + unverified.size())
            .verifiedCount(verified.size())
            .unverifiedCount(unverified.size())
            // inputType = TOPIC / TEXT / FILE
            .inputType(inputType)
            // stage = how source was selected
            .stage(stage)
            .warning(warning)
            .verifiedQuestions(verified)
            .unverifiedQuestions(unverified)
            .build();
    }

    // ─────────────────────────────────────────
    // VALIDATE AND NORMALIZE PER QUESTION TYPE
    // Throws RuntimeException if invalid
    // ─────────────────────────────────────────

    private String validateAndNormalize(
            GeneratedQuestion gq,
            QuestionType type) {

        String answer =
            gq.getCorrectAnswer().trim();

        switch (type) {

            case SINGLE_CHOICE: {
                // Options required
                if (isNullOrEmpty(gq.getOptionA())
                        || isNullOrEmpty(
                            gq.getOptionB())
                        || isNullOrEmpty(
                            gq.getOptionC())
                        || isNullOrEmpty(
                            gq.getOptionD())) {
                    throw new RuntimeException(
                        "SINGLE_CHOICE missing " +
                        "one or more options");
                }
                // Answer must be A/B/C/D
                String normalized =
                    answer.toUpperCase();
                if (!normalized.matches("[ABCD]")) {
                    throw new RuntimeException(
                        "SINGLE_CHOICE answer " +
                        "must be A, B, C, or D " +
                        "— got: " + answer);
                }
                return normalized;
            }

            case MULTIPLE_SELECT: {
                // Options required
                if (isNullOrEmpty(gq.getOptionA())
                        || isNullOrEmpty(
                            gq.getOptionB())
                        || isNullOrEmpty(
                            gq.getOptionC())
                        || isNullOrEmpty(
                            gq.getOptionD())) {
                    throw new RuntimeException(
                        "MULTIPLE_SELECT missing " +
                        "one or more options");
                }
                // Normalize to sorted A,C,D format
                String normalized =
                    normalizeMultiple(answer);
                if (normalized.isEmpty()) {
                    throw new RuntimeException(
                        "MULTIPLE_SELECT answer " +
                        "has no valid letters");
                }
                for (String part :
                        normalized.split(",")) {
                    if (!part.matches("[ABCD]")) {
                        throw new RuntimeException(
                            "MULTIPLE_SELECT " +
                            "answer contains " +
                            "invalid letter: "
                            + part);
                    }
                }
                return normalized;
            }

            case FILL_BLANK: {
                // Options not required
                // Answer must not be empty
                if (answer.isEmpty()) {
                    throw new RuntimeException(
                        "FILL_BLANK answer " +
                        "is empty");
                }
                return answer;
            }

            case NUMERICAL: {
                // Options not required
                // Answer must parse as double
                try {
                    Double.parseDouble(answer);
                } catch (NumberFormatException e) {
                    throw new RuntimeException(
                        "NUMERICAL answer is not " +
                        "a valid number: " + answer);
                }
                return answer;
            }

            default:
                throw new RuntimeException(
                    "Unknown question type: "
                    + type);
        }
    }

    private boolean isNullOrEmpty(String s) {
        return s == null || s.trim().isEmpty();
    }

    // ─────────────────────────────────────────
    // CONSERVATIVE ANSWER VERIFICATION
    // isVerified = true means:
    //   the expected answer has supporting
    //   evidence in source material
    // isVerified = false means:
    //   could not confirm from source
    //   host should review
    //
    // UNCLEAR → UNVERIFIED
    // ─────────────────────────────────────────

    private boolean verifyAnswer(
            GeneratedQuestion gq,
            String normalizedAnswer,
            QuestionType type,
            String sourceText) {

        if (sourceText == null
                || sourceText.trim().isEmpty()) {
            return false;
        }

        String sourceLower =
            sourceText.toLowerCase();

        try {
            return switch (type) {
                case SINGLE_CHOICE ->
                    verifySingleChoice(
                        normalizedAnswer,
                        gq, sourceLower);
                case MULTIPLE_SELECT ->
                    verifyMultipleSelect(
                        normalizedAnswer,
                        gq, sourceLower);
                case FILL_BLANK ->
                    verifyFillBlank(
                        normalizedAnswer,
                        sourceLower);
                case NUMERICAL ->
                    verifyNumerical(
                        normalizedAnswer,
                        sourceLower);
            };
        } catch (Exception e) {
            // Any error → conservative
            return false;
        }
    }

    private boolean verifySingleChoice(
            String answer,
            GeneratedQuestion gq,
            String sourceLower) {

        // Check OPTION TEXT in source
        // not the letter itself
        String optionText =
            getOptionText(answer, gq);

        if (isNullOrEmpty(optionText)) {
            return false;
        }

        String optionLower =
            optionText.toLowerCase().trim();

        // Too short — unreliable
        if (optionLower.length() < 5) {
            return false;
        }

        // 75% of meaningful keywords
        // must appear in source
        return keywordsFoundInSource(
            optionLower, sourceLower, 0.75);
    }

    private boolean verifyMultipleSelect(
            String answer,
            GeneratedQuestion gq,
            String sourceLower) {

        String[] letters = answer.split(",");
        if (letters.length == 0) return false;

        // ALL selected options must pass
        for (String letter : letters) {
            String optionText =
                getOptionText(letter.trim(), gq);

            if (isNullOrEmpty(optionText)) {
                return false;
            }

            String optionLower =
                optionText.toLowerCase().trim();

            // Too short — conservative fail
            if (optionLower.length() < 5) {
                return false;
            }

            // 80% threshold per option
            if (!keywordsFoundInSource(
                    optionLower, sourceLower,
                    0.80)) {
                return false;
            }
        }

        return true;
    }

    private boolean verifyFillBlank(
            String answer,
            String sourceLower) {

        String answerLower =
            answer.toLowerCase().trim();

        if (answerLower.isEmpty()) return false;

        // Very short single answers unreliable
        if (answerLower.length() < 3) return false;

        // Exact substring match — most reliable
        if (sourceLower.contains(answerLower)) {
            return true;
        }

        // Multi-word phrase — high threshold
        if (answerLower.contains(" ")) {
            return keywordsFoundInSource(
                answerLower, sourceLower, 0.80);
        }

        // Single word not found exactly
        // → unverified (conservative)
        return false;
    }

    private boolean verifyNumerical(
            String answer,
            String sourceLower) {

        String trimmed = answer.trim();
        if (trimmed.isEmpty()) return false;

        try {
            Double.parseDouble(trimmed);
        } catch (NumberFormatException e) {
            return false;
        }

        // Word boundary match only
        // prevents "256" matching "12560"
        Pattern p = Pattern.compile(
            "\\b"
            + Pattern.quote(trimmed)
            + "\\b");
        Matcher m = p.matcher(sourceLower);
        return m.find();
    }

    private String getOptionText(
            String letter,
            GeneratedQuestion gq) {
        if (letter == null) return null;
        return switch (
                letter.toUpperCase().trim()) {
            case "A" -> gq.getOptionA();
            case "B" -> gq.getOptionB();
            case "C" -> gq.getOptionC();
            case "D" -> gq.getOptionD();
            default -> null;
        };
    }

    private boolean keywordsFoundInSource(
            String text,
            String sourceLower,
            double threshold) {

        String[] words = text.split("\\s+");
        List<String> keywords = new ArrayList<>();

        for (String word : words) {
            String cleaned = word
                .replaceAll("[^a-z0-9]", "")
                .toLowerCase();
            // Allow 2+ char terms (AI, ML etc)
            if (cleaned.length() >= 2
                    && !STOP_WORDS.contains(
                        cleaned)) {
                keywords.add(cleaned);
            }
        }

        if (keywords.isEmpty()) return false;

        // Single keyword — require exact
        // word boundary match
        if (keywords.size() == 1) {
            Pattern p = Pattern.compile(
                "\\b"
                + Pattern.quote(keywords.get(0))
                + "\\b");
            return p.matcher(sourceLower).find();
        }

        // Multiple keywords — word boundary
        // match per keyword then threshold
        long foundCount = keywords.stream()
            .filter(kw -> {
                Pattern p = Pattern.compile(
                    "\\b"
                    + Pattern.quote(kw)
                    + "\\b");
                return p.matcher(sourceLower)
                    .find();
            })
            .count();

        double ratio = (double) foundCount
            / keywords.size();
        return ratio >= threshold;
    }

    // ─────────────────────────────────────────
    // CALCULATE REMAINING CAPACITY PER DIFFICULTY
    // Returns int[] {easy, medium, hard, total}
    // ─────────────────────────────────────────

    private int[] calculateRemainingCapacity(
            Exam exam) {

        int total = exam.getTotalQuestions();

        // Exam difficulty targets (floor based)
        int easyTarget = (int) (
            total * exam.getEasyPercent() / 100.0);
        int mediumTarget = (int) (
            total * exam.getMediumPercent() / 100.0);
        int hardTarget = total
            - easyTarget - mediumTarget;

        // Existing question counts
        long existingEasy = questionRepository
            .countByExamIdAndDifficulty(
                exam.getId(), Difficulty.EASY);
        long existingMedium = questionRepository
            .countByExamIdAndDifficulty(
                exam.getId(), Difficulty.MEDIUM);
        long existingHard = questionRepository
            .countByExamIdAndDifficulty(
                exam.getId(), Difficulty.HARD);

        // Remaining slots per difficulty
        int remainingEasy = (int) Math.max(0,
            easyTarget - existingEasy);
        int remainingMedium = (int) Math.max(0,
            mediumTarget - existingMedium);
        int remainingHard = (int) Math.max(0,
            hardTarget - existingHard);
        int remainingTotal = remainingEasy
            + remainingMedium + remainingHard;

        return new int[]{
            remainingEasy,   // [0]
            remainingMedium, // [1]
            remainingHard,   // [2]
            remainingTotal   // [3]
        };
    }

    // ─────────────────────────────────────────
    // DISTRIBUTE REQUESTED COUNT ACROSS
    // REMAINING SLOTS PROPORTIONALLY
    // Returns int[] {easy, medium, hard}
    // ─────────────────────────────────────────

    private int[] distributeAcrossRemaining(
            int requested,
            int remainingEasy,
            int remainingMedium,
            int remainingHard) {

        int remainingTotal = remainingEasy
            + remainingMedium + remainingHard;

        if (remainingTotal == 0) {
            return new int[]{0, 0, 0};
        }

        // Proportional distribution across
        // remaining slots
        int easyGen = (int) Math.floor(
            requested * (double) remainingEasy
            / remainingTotal);
        int mediumGen = (int) Math.floor(
            requested * (double) remainingMedium
            / remainingTotal);
        int hardGen = requested
            - easyGen - mediumGen;

        // Cap each by its remaining slot
        easyGen = Math.min(easyGen, remainingEasy);
        mediumGen = Math.min(
            mediumGen, remainingMedium);
        hardGen = Math.min(hardGen, remainingHard);

        // Handle rounding remainder
        // Give remainder to difficulty with most space
        int assigned = easyGen + mediumGen + hardGen;
        int remainder = requested - assigned;

        while (remainder > 0) {
            if (remainingEasy - easyGen
                    >= remainingMedium - mediumGen
                    && remainingEasy - easyGen
                    >= remainingHard - hardGen
                    && remainingEasy > easyGen) {
                easyGen++;
            } else if (remainingMedium - mediumGen
                    >= remainingHard - hardGen
                    && remainingMedium > mediumGen) {
                mediumGen++;
            } else if (remainingHard > hardGen) {
                hardGen++;
            } else {
                // No more space anywhere
                break;
            }
            remainder--;
        }

        return new int[]{easyGen, mediumGen, hardGen};
    }

    private int[] calculateCounts(
            AIGenerationRequest req, Exam exam) {

        if (req.getTotalQuestions() == null
                || req.getTotalQuestions() <= 0) {
            throw new RuntimeException(
                "Total questions must be " +
                "greater than 0.");
        }

        int requested = req.getTotalQuestions();

        // Get remaining slots
        int[] remaining =
            calculateRemainingCapacity(exam);
        int remainingEasy   = remaining[0];
        int remainingMedium = remaining[1];
        int remainingHard   = remaining[2];
        int remainingTotal  = remaining[3];

        // Problem 3 — check capacity
        if (requested > remainingTotal) {
            throw new RuntimeException(
                "Only " + remainingTotal
                + " question slot(s) remaining "
                + "in this exam ("
                + remainingEasy + " Easy, "
                + remainingMedium + " Medium, "
                + remainingHard + " Hard). "
                + "Please request "
                + remainingTotal
                + " or fewer questions.");
        }

        // Distribute requested count
        // proportionally across remaining slots
        int[] diffCounts = distributeAcrossRemaining(
            requested,
            remainingEasy,
            remainingMedium,
            remainingHard);

        int easyCount   = diffCounts[0];
        int mediumCount = diffCounts[1];
        int hardCount   = diffCounts[2];

        // Question type distribution
        int multipleSelect = req
            .getMultipleSelectCount() != null
            ? Math.max(0,
                req.getMultipleSelectCount()) : 0;
        int fillBlank = req
            .getFillBlankCount() != null
            ? Math.max(0,
                req.getFillBlankCount()) : 0;
        int numerical = req
            .getNumericalCount() != null
            ? Math.max(0,
                req.getNumericalCount()) : 0;

        int otherTypes = multipleSelect
            + fillBlank + numerical;

        if (otherTypes > requested) {
            throw new RuntimeException(
                "Question type counts ("
                + otherTypes + ") exceed "
                + "total questions ("
                + requested + ").");
        }

        int singleChoice = requested - otherTypes;

        return new int[]{
            easyCount,      // [0]
            mediumCount,    // [1]
            hardCount,      // [2]
            singleChoice,   // [3]
            multipleSelect, // [4]
            fillBlank,      // [5]
            numerical       // [6]
        };
    }

    // ─────────────────────────────────────────
    // DYNAMIC CHUNK COUNT
    // Scales with totalQuestions
    // Min 3, Max 12
    // ─────────────────────────────────────────

    private int dynamicChunkCount(
            int totalQuestions) {
        // 1 chunk per 3 questions
        // Min 3, Max 12
        return Math.min(12,
            Math.max(3, totalQuestions / 3));
    }

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────

    private Exam validateAndGetExam(
            Long examId, String hostEmail) {

        Exam exam = examRepository
            .findById(examId)
            .orElseThrow(() ->
                new RuntimeException(
                    "Exam not found."));

        if (!exam.getHost().getEmail()
                .equals(hostEmail)) {
            throw new RuntimeException(
                "Not authorized to modify " +
                "this exam.");
        }

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new RuntimeException(
                "Questions can only be added " +
                "while the exam is in " +
                "DRAFT status.");
        }

        return exam;
    }

    private User getHost(String email) {
        return userRepository
            .findByEmail(email)
            .orElseThrow(() ->
                new RuntimeException(
                    "Host not found."));
    }

    private String normalizeMultiple(
            String answer) {
        String[] parts = answer.split(",");
        List<String> cleaned = new ArrayList<>();
        for (String p : parts) {
            String c = p.trim().toUpperCase();
            if (!c.isEmpty()
                    && !cleaned.contains(c)) {
                cleaned.add(c);
            }
        }
        Collections.sort(cleaned);
        return String.join(",", cleaned);
    }

    private Double getMarks(
            Exam exam, Difficulty d) {
        return switch (d) {
            case EASY -> exam.getEasyMark();
            case MEDIUM -> exam.getMediumMark();
            case HARD -> exam.getHardMark();
        };
    }

    private Double getNegative(
            Exam exam, Difficulty d) {
        if (!exam.getNegativeMark()) return 0.0;
        return switch (d) {
            case EASY -> exam.getEasyNegative();
            case MEDIUM -> exam.getMediumNegative();
            case HARD -> exam.getHardNegative();
        };
    }

    private Integer getSeconds(
            Exam exam, Difficulty d) {
        if (exam.getTimerType()
                != TimerType.PER_QUESTION) {
            return null;
        }
        return switch (d) {
            case EASY -> exam.getEasySeconds();
            case MEDIUM -> exam.getMediumSeconds();
            case HARD -> exam.getHardSeconds();
        };
    }
}
