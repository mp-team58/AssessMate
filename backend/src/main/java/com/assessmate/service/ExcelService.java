package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.repository.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.util.*;
import java.math.BigDecimal;
import org.apache.poi.ss.usermodel.DateUtil;

@Service
@lombok.extern.slf4j.Slf4j
@RequiredArgsConstructor
public class ExcelService {

    public static final long MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    public static final int MAX_QUESTIONS = 500;
    public static final int MAX_ROW_LIMIT = 600;
    public static final int MAX_COLUMNS = 20;
    public static final int MAX_CELL_STRING_LENGTH = 10000;

    private static final byte[] XLSX_MAGIC = new byte[]{0x50, 0x4B, 0x03, 0x04};
    private static final byte[] XLS_MAGIC = new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, (byte) 0x1A, (byte) 0xE1};

    static {
        // P5: Apache POI Decompression Bomb Protection
        ZipSecureFile.setMinInflateRatio(0.01); // 1% minimum ratio prevents zip bombs
        ZipSecureFile.setMaxEntrySize(20 * 1024 * 1024L); // 20MB max uncompressed size per entry
        ZipSecureFile.setMaxTextSize(10 * 1024 * 1024L); // 10MB max text size
    }

    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final QuestionService questionService;
    private volatile byte[] cachedTemplate;

    public byte[] generateTemplate() throws IOException {
        if (cachedTemplate == null) {
            synchronized (this) {
                if (cachedTemplate == null) {
                    cachedTemplate = buildTemplate();
                }
            }
        }
        return cachedTemplate;
    }

    private byte[] buildTemplate() throws IOException {

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Questions");

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Row headerRow = sheet.createRow(0);
        String[] headers = {
                "Question Text", "Type", "Difficulty", "Option A", "Option B",
                "Option C", "Option D", "Correct Answer", "Tolerance", "Topic",
                "Explanation", "Save To Bank"
        };

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
            sheet.setColumnWidth(i, 5000);
        }

        addExampleRow(sheet, 1, "What does JVM stand for?", "SINGLE_CHOICE", "EASY",
                "Java Virtual Machine", "Java Variable Method", "Java Verified Module", "None of above",
                "A", "", "Java Basics", "JVM stands for Java Virtual Machine", "TRUE");

        addExampleRow(sheet, 2, "Which are OOP concepts?", "MULTIPLE_SELECT", "MEDIUM",
                "Inheritance", "Compilation", "Polymorphism", "Encapsulation",
                "A,C,D", "", "OOP", "OOP has Inheritance Polymorphism and Encapsulation", "TRUE");

        addExampleRow(sheet, 3, "JVM stands for Java _____ Machine", "FILL_BLANK", "EASY",
                "", "", "", "", "Virtual", "", "Java Basics", "", "FALSE");

        addExampleRow(sheet, 4, "What is the value of 2 power 8?", "NUMERICAL", "MEDIUM",
                "", "", "", "", "256", "0", "Mathematics", "", "TRUE");

        Sheet infoSheet = workbook.createSheet("Instructions");
        Row r1 = infoSheet.createRow(0);
        r1.createCell(0).setCellValue("INSTRUCTIONS");
        infoSheet.createRow(1).createCell(0).setCellValue("Type must be: SINGLE_CHOICE / MULTIPLE_SELECT / FILL_BLANK / NUMERICAL");
        infoSheet.createRow(2).createCell(0).setCellValue("Difficulty must be: EASY / MEDIUM / HARD");
        infoSheet.createRow(3).createCell(0).setCellValue("Correct Answer for SINGLE_CHOICE: A or B or C or D");
        infoSheet.createRow(4).createCell(0).setCellValue("Correct Answer for MULTIPLE_SELECT: A,C,D (comma separated)");
        infoSheet.createRow(5).createCell(0).setCellValue("Options not needed for FILL_BLANK and NUMERICAL");
        infoSheet.createRow(6).createCell(0).setCellValue("Tolerance only for NUMERICAL (0 = exact match)");
        infoSheet.createRow(7).createCell(0).setCellValue("Save To Bank: TRUE or FALSE");
        infoSheet.createRow(8).createCell(0).setCellValue("Do not change column headers");
        infoSheet.createRow(9).createCell(0).setCellValue("Maximum 500 questions per upload");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        return out.toByteArray();
    }

    private void addExampleRow(
            Sheet sheet, int rowNum, String questionText, String type,
            String difficulty, String optA, String optB, String optC, String optD,
            String correctAnswer, String tolerance, String topic, String explanation,
            String saveToBank) {

        Row row = sheet.createRow(rowNum);
        row.createCell(0).setCellValue(questionText);
        row.createCell(1).setCellValue(type);
        row.createCell(2).setCellValue(difficulty);
        row.createCell(3).setCellValue(optA);
        row.createCell(4).setCellValue(optB);
        row.createCell(5).setCellValue(optC);
        row.createCell(6).setCellValue(optD);
        row.createCell(7).setCellValue(correctAnswer);
        row.createCell(8).setCellValue(tolerance);
        row.createCell(9).setCellValue(topic);
        row.createCell(10).setCellValue(explanation);
        row.createCell(11).setCellValue(saveToBank);
    }

    public ExcelUploadResponse processExcel(
            Long examId,
            MultipartFile file,
            String hostEmail) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty.");
        }

        if (file.getSize() > MAX_EXCEL_FILE_SIZE) {
            throw new BadRequestException("Excel file size exceeds maximum allowed limit of 5MB.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || filename.trim().isEmpty()) {
            throw new BadRequestException("File name cannot be empty.");
        }

        validateFileSignature(file, filename);

        Exam exam = examRepository.findById(examId)
            .orElseThrow(() -> new ResourceNotFoundException("Exam not found."));

        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("Not authorized to upload questions to this exam.");
        }

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new BadRequestException("Questions can only be uploaded while exam is in DRAFT status.");
        }

        User host = userRepository.findByEmail(hostEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Host not found."));

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            if (workbook.getNumberOfSheets() == 0) {
                throw new BadRequestException("Spreadsheet contains no worksheets.");
            }

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new BadRequestException("Spreadsheet contains no worksheets.");
            }

            int lastRowNum = sheet.getLastRowNum();
            if (lastRowNum > MAX_ROW_LIMIT) {
                throw new BadRequestException("Spreadsheet contains too many rows (" + lastRowNum + "). Maximum allowed is " + MAX_QUESTIONS + " questions.");
            }

            int actualDataRows = 0;
            for (int i = 1; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row != null && !isRowEmpty(row)) {
                    if (row.getLastCellNum() > MAX_COLUMNS) {
                        throw new BadRequestException("Row " + (i + 1) + " contains excessive columns (" + row.getLastCellNum() + "). Expected at most 12 columns.");
                    }
                    actualDataRows++;
                }
            }

            if (actualDataRows > MAX_QUESTIONS) {
                throw new BadRequestException("Maximum " + MAX_QUESTIONS + " questions per upload. Your file has " + actualDataRows + " rows.");
            }

            if (actualDataRows == 0) {
                throw new BadRequestException("Spreadsheet contains no question data rows.");
            }

            int[] remaining = calculateRemainingCapacity(exam);

            List<QuestionResponse> savedQuestions = new ArrayList<>();
            List<String> errors = new ArrayList<>();
            int savedCount = 0;
            int skippedCount = 0;

            for (int i = 1; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                try {
                    Difficulty diff = parseDifficulty(getCellValue(row, 2));
                    int remaining_slots = getRemainingForDifficulty(remaining, diff);

                    if (remaining_slots <= 0) {
                        errors.add("Row " + (i + 1) + ": No remaining slots for " + diff + " questions. Skipped.");
                        skippedCount++;
                        continue;
                    }

                    QuestionResponse saved = processRow(row, i + 1, exam, host);
                    savedQuestions.add(saved);
                    savedCount++;

                    decrementSlot(remaining, diff);

                } catch (BadRequestException e) {
                    if (e.getMessage() != null && e.getMessage().contains("exceeds maximum allowed length")) {
                        throw e;
                    }
                    errors.add("Row " + (i + 1) + ": " + e.getMessage());
                    skippedCount++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 1) + ": " + e.getMessage());
                    skippedCount++;
                }
            }

            return ExcelUploadResponse.builder()
                .totalRows(actualDataRows)
                .savedCount(savedCount)
                .skippedCount(skippedCount)
                .errors(errors)
                .savedQuestions(savedQuestions)
                .build();
        } catch (BadRequestException | ForbiddenException | ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to parse Excel workbook: {}", e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (msg.contains("zip bomb") || msg.contains("inflate ratio") || msg.contains("ratio")) {
                throw new BadRequestException("The uploaded file violates decompression limits (possible zip bomb).");
            }
            throw new BadRequestException("The uploaded file is not a valid Excel spreadsheet or is corrupted.");
        }
    }

    private void validateFileSignature(MultipartFile file, String filename) throws IOException {
        byte[] header = new byte[8];
        int bytesRead;
        try (InputStream is = file.getInputStream()) {
            bytesRead = is.readNBytes(header, 0, 8);
        }

        if (bytesRead < 4) {
            throw new BadRequestException("File is too small to be a valid spreadsheet.");
        }

        String lowerName = filename.toLowerCase();
        boolean isZip = header[0] == XLSX_MAGIC[0] && header[1] == XLSX_MAGIC[1]
                && header[2] == XLSX_MAGIC[2] && header[3] == XLSX_MAGIC[3];

        boolean isOle2 = bytesRead >= 8
                && header[0] == XLS_MAGIC[0] && header[1] == XLS_MAGIC[1]
                && header[2] == XLS_MAGIC[2] && header[3] == XLS_MAGIC[3]
                && header[4] == XLS_MAGIC[4] && header[5] == XLS_MAGIC[5]
                && header[6] == XLS_MAGIC[6] && header[7] == XLS_MAGIC[7];

        if (lowerName.endsWith(".xlsx")) {
            if (!isZip) {
                if (isOle2) {
                    throw new BadRequestException("File content is in legacy .xls format but has a .xlsx extension.");
                }
                throw new BadRequestException("Invalid file signature. File is not a valid .xlsx spreadsheet.");
            }
        } else if (lowerName.endsWith(".xls")) {
            if (!isOle2) {
                if (isZip) {
                    throw new BadRequestException("File content is in .xlsx format but has a .xls extension.");
                }
                throw new BadRequestException("Invalid file signature. File is not a valid .xls spreadsheet.");
            }
        } else {
            throw new BadRequestException("Only .xlsx and .xls files are supported.");
        }
    }

    private QuestionResponse processRow(
            Row row, int rowNum,
            Exam exam, User host) {

        String questionText = getCellValue(row, 0);
        String typeStr = getCellValue(row, 1).toUpperCase().trim();
        String difficultyStr = getCellValue(row, 2).toUpperCase().trim();
        String optionA = getCellValue(row, 3);
        String optionB = getCellValue(row, 4);
        String optionC = getCellValue(row, 5);
        String optionD = getCellValue(row, 6);
        String correctAnswer = getCellValue(row, 7);
        String toleranceStr = getCellValue(row, 8);
        String topic = getCellValue(row, 9);
        String explanation = getCellValue(row, 10);
        String saveToBankStr = getCellValue(row, 11).toUpperCase().trim();

        if (questionText.isEmpty()) {
            throw new BadRequestException("Question text is required");
        }

        QuestionType type;
        try {
            type = QuestionType.valueOf(typeStr);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid type '" + typeStr + "'. Must be SINGLE_CHOICE, MULTIPLE_SELECT, FILL_BLANK, or NUMERICAL");
        }

        Difficulty difficulty;
        try {
            difficulty = Difficulty.valueOf(difficultyStr);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid difficulty '" + difficultyStr + "'. Must be EASY, MEDIUM, or HARD");
        }

        if (correctAnswer.isEmpty()) {
            throw new BadRequestException("Correct answer is required");
        }

        if (type == QuestionType.SINGLE_CHOICE || type == QuestionType.MULTIPLE_SELECT) {
            if (optionA.isEmpty() || optionB.isEmpty() || optionC.isEmpty() || optionD.isEmpty()) {
                throw new BadRequestException("All 4 options required for " + type);
            }
        }

        if (type == QuestionType.SINGLE_CHOICE) {
            correctAnswer = correctAnswer.trim().toUpperCase();
            if (!correctAnswer.matches("[ABCD]")) {
                throw new BadRequestException("Correct answer must be A, B, C, or D");
            }
        }

        if (type == QuestionType.MULTIPLE_SELECT) {
            correctAnswer = normalizeMultipleAnswers(correctAnswer);
            if (correctAnswer.isEmpty()) {
                throw new BadRequestException("Correct answer required. Example: A,C,D");
            }
        }

        Double tolerance = 0.0;
        if (type == QuestionType.NUMERICAL) {
            try {
                Double.parseDouble(correctAnswer);
            } catch (NumberFormatException e) {
                throw new BadRequestException("Correct answer for NUMERICAL must be a number");
            }
            if (!toleranceStr.isEmpty()) {
                try {
                    tolerance = Double.parseDouble(toleranceStr);
                    if (tolerance < 0) {
                        throw new BadRequestException("Tolerance cannot be negative");
                    }
                } catch (NumberFormatException e) {
                    throw new BadRequestException("Tolerance must be a number");
                }
            }
        }

        boolean saveToBank = saveToBankStr.equals("TRUE");

        Double marks = getMarks(exam, difficulty);
        Double negativeMarks = getNegative(exam, difficulty);
        Integer timeSeconds = getSeconds(exam, difficulty);

        if (saveToBank) {
            Question globalCopy = Question.builder()
                    .exam(null)
                    .createdBy(host)
                    .questionText(questionText)
                    .type(type)
                    .difficulty(difficulty)
                    .topic(topic.isEmpty() ? null : topic)
                    .explanation(explanation.isEmpty() ? null : explanation)
                    .optionA(optionA.isEmpty() ? null : optionA)
                    .optionB(optionB.isEmpty() ? null : optionB)
                    .optionC(optionC.isEmpty() ? null : optionC)
                    .optionD(optionD.isEmpty() ? null : optionD)
                    .correctAnswer(correctAnswer)
                    .tolerance(tolerance)
                    .strictMarking(true)
                    .addedBy("EXCEL")
                    .isGlobal(true)
                    .isVerified(true)
                    .build();
            questionRepository.save(globalCopy);
        }

        Question examQuestion = Question.builder()
                .exam(exam)
                .createdBy(host)
                .questionText(questionText)
                .type(type)
                .difficulty(difficulty)
                .topic(topic.isEmpty() ? null : topic)
                .explanation(explanation.isEmpty() ? null : explanation)
                .optionA(optionA.isEmpty() ? null : optionA)
                .optionB(optionB.isEmpty() ? null : optionB)
                .optionC(optionC.isEmpty() ? null : optionC)
                .optionD(optionD.isEmpty() ? null : optionD)
                .correctAnswer(correctAnswer)
                .tolerance(tolerance)
                .strictMarking(true)
                .addedBy("EXCEL")
                .marks(marks)
                .negativeMarks(negativeMarks)
                .timeSeconds(timeSeconds)
                .isGlobal(false)
                .isVerified(true)
                .build();

        return questionService.mapToResponse(questionRepository.save(examQuestion));
    }

    private String getCellValue(Row row, int colIndex) {
        Cell cell = row.getCell(colIndex);
        if (cell == null) return "";

        String val = switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getDateCellValue().toString();
                }
                double valNum = cell.getNumericCellValue();
                if (valNum == Math.rint(valNum) && !Double.isInfinite(valNum)) {
                    yield String.valueOf((long) valNum);
                } else {
                    yield BigDecimal.valueOf(valNum).stripTrailingZeros().toPlainString();
                }
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue()).toUpperCase();
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue().trim();
                } catch (Exception e) {
                    double valNum = cell.getNumericCellValue();
                    if (valNum == Math.rint(valNum)) {
                        yield String.valueOf((long) valNum);
                    } else {
                        yield BigDecimal.valueOf(valNum).stripTrailingZeros().toPlainString();
                    }
                }
            }
            default -> "";
        };

        if (val != null && val.length() > MAX_CELL_STRING_LENGTH) {
            throw new BadRequestException("Cell at row " + (row.getRowNum() + 1) + ", column " + (colIndex + 1)
                    + " exceeds maximum allowed length of " + MAX_CELL_STRING_LENGTH + " characters.");
        }

        return val;
    }

    private boolean isRowEmpty(Row row) {
        for (int c = 0; c < 8; c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK && !getCellValue(row, c).isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private String normalizeMultipleAnswers(String answer) {
        String[] parts = answer.split(",");
        List<String> seen = new ArrayList<>();
        for (String part : parts) {
            String cleaned = part.trim().toUpperCase();
            if (!cleaned.isEmpty() && !seen.contains(cleaned)) {
                seen.add(cleaned);
            }
        }
        Collections.sort(seen);
        return String.join(",", seen);
    }

    private Double getMarks(Exam exam, Difficulty d) {
        return switch (d) {
            case EASY -> exam.getEasyMark();
            case MEDIUM -> exam.getMediumMark();
            case HARD -> exam.getHardMark();
        };
    }

    private Double getNegative(Exam exam, Difficulty d) {
        if (!Boolean.TRUE.equals(exam.getNegativeMark())) return 0.0;
        return switch (d) {
            case EASY -> exam.getEasyNegative();
            case MEDIUM -> exam.getMediumNegative();
            case HARD -> exam.getHardNegative();
        };
    }

    private Integer getSeconds(Exam exam, Difficulty d) {
        if (exam.getTimerType() != TimerType.PER_QUESTION) return null;
        return switch (d) {
            case EASY -> exam.getEasySeconds();
            case MEDIUM -> exam.getMediumSeconds();
            case HARD -> exam.getHardSeconds();
        };
    }

    private int[] calculateRemainingCapacity(Exam exam) {
        int total = exam.getTotalQuestions();
        int[] required = ExamService.calculateRequiredCounts(total, exam.getEasyPercent(), exam.getMediumPercent());

        long existingEasy = questionRepository.countByExamIdAndDifficulty(exam.getId(), Difficulty.EASY);
        long existingMedium = questionRepository.countByExamIdAndDifficulty(exam.getId(), Difficulty.MEDIUM);
        long existingHard = questionRepository.countByExamIdAndDifficulty(exam.getId(), Difficulty.HARD);

        return new int[]{
            (int) Math.max(0, required[0] - existingEasy),
            (int) Math.max(0, required[1] - existingMedium),
            (int) Math.max(0, required[2] - existingHard)
        };
    }

    private int getRemainingForDifficulty(int[] remaining, Difficulty diff) {
        return switch (diff) {
            case EASY -> remaining[0];
            case MEDIUM -> remaining[1];
            case HARD -> remaining[2];
        };
    }

    private void decrementSlot(int[] remaining, Difficulty diff) {
        switch (diff) {
            case EASY -> remaining[0]--;
            case MEDIUM -> remaining[1]--;
            case HARD -> remaining[2]--;
        }
    }

    private Difficulty parseDifficulty(String val) {
        try {
            return Difficulty.valueOf(val.toUpperCase().trim());
        } catch (Exception e) {
            throw new BadRequestException("Invalid difficulty '" + val + "'. Must be EASY, MEDIUM, or HARD.");
        }
    }
}