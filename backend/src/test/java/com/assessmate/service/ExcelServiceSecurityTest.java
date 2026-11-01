package com.assessmate.service;

import com.assessmate.dto.ExcelUploadResponse;
import com.assessmate.dto.QuestionResponse;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.repository.ExamRepository;
import com.assessmate.repository.QuestionRepository;
import com.assessmate.repository.UserRepository;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExcelServiceSecurityTest {

    @Mock
    private ExamRepository examRepository;
    @Mock
    private QuestionRepository questionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private QuestionService questionService;

    private ExcelService excelService;

    private User host;
    private Exam draftExam;

    @BeforeEach
    void setUp() {
        excelService = new ExcelService(questionRepository, examRepository, userRepository, questionService);

        host = User.builder()
                .id(1L)
                .email("host@example.com")
                .role(Role.HOST)
                .build();

        draftExam = Exam.builder()
                .id(10L)
                .title("Midterm Exam")
                .host(host)
                .status(ExamStatus.DRAFT)
                .totalQuestions(10)
                .easyPercent(50)
                .mediumPercent(50)
                .easyMark(1.0)
                .mediumMark(2.0)
                .hardMark(3.0)
                .build();
    }

    private byte[] createSampleWorkbookBytes(boolean isXlsx, int questionCount, String cellContentOverride) throws IOException {
        try (Workbook wb = isXlsx ? new XSSFWorkbook() : new HSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Questions");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Question Text");
            header.createCell(1).setCellValue("Type");
            header.createCell(2).setCellValue("Difficulty");
            header.createCell(3).setCellValue("Option A");
            header.createCell(4).setCellValue("Option B");
            header.createCell(5).setCellValue("Option C");
            header.createCell(6).setCellValue("Option D");
            header.createCell(7).setCellValue("Correct Answer");
            header.createCell(8).setCellValue("Tolerance");
            header.createCell(9).setCellValue("Topic");
            header.createCell(10).setCellValue("Explanation");
            header.createCell(11).setCellValue("Save To Bank");

            for (int i = 1; i <= questionCount; i++) {
                Row r = sheet.createRow(i);
                String qText = cellContentOverride != null ? cellContentOverride : ("Sample Question " + i);
                r.createCell(0).setCellValue(qText);
                r.createCell(1).setCellValue("SINGLE_CHOICE");
                r.createCell(2).setCellValue("EASY");
                r.createCell(3).setCellValue("Opt A");
                r.createCell(4).setCellValue("Opt B");
                r.createCell(5).setCellValue("Opt C");
                r.createCell(6).setCellValue("Opt D");
                r.createCell(7).setCellValue("A");
                r.createCell(8).setCellValue("");
                r.createCell(9).setCellValue("Java");
                r.createCell(10).setCellValue("Explanation");
                r.createCell(11).setCellValue("FALSE");
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            return baos.toByteArray();
        }
    }

    @Test
    @DisplayName("1. Valid XLSX upload is accepted and imports questions")
    void validXlsxUpload_Accepted() throws Exception {
        byte[] xlsxBytes = createSampleWorkbookBytes(true, 1, null);
        MockMultipartFile file = new MockMultipartFile("file", "questions.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsxBytes);

        when(examRepository.findById(10L)).thenReturn(Optional.of(draftExam));
        when(userRepository.findByEmail("host@example.com")).thenReturn(Optional.of(host));
        when(questionService.mapToResponse(any())).thenReturn(QuestionResponse.builder().id(101L).questionText("Sample Question 1").build());

        ExcelUploadResponse response = excelService.processExcel(10L, file, "host@example.com");

        assertNotNull(response);
        assertEquals(1, response.getTotalRows());
        assertEquals(1, response.getSavedCount());
        assertEquals(0, response.getSkippedCount());
    }

    @Test
    @DisplayName("2. Valid XLS (legacy) upload is accepted")
    void validXlsUpload_Accepted() throws Exception {
        byte[] xlsBytes = createSampleWorkbookBytes(false, 1, null);
        MockMultipartFile file = new MockMultipartFile("file", "questions.xls",
                "application/vnd.ms-excel", xlsBytes);

        when(examRepository.findById(10L)).thenReturn(Optional.of(draftExam));
        when(userRepository.findByEmail("host@example.com")).thenReturn(Optional.of(host));
        when(questionService.mapToResponse(any())).thenReturn(QuestionResponse.builder().id(101L).build());

        ExcelUploadResponse response = excelService.processExcel(10L, file, "host@example.com");

        assertNotNull(response);
        assertEquals(1, response.getTotalRows());
        assertEquals(1, response.getSavedCount());
    }

    @Test
    @DisplayName("3. Empty file is rejected")
    void emptyFile_Rejected() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[0]);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                excelService.processExcel(10L, file, "host@example.com"));

        assertTrue(ex.getMessage().toLowerCase().contains("empty"));
    }

    @Test
    @DisplayName("4. Invalid file signature is rejected")
    void invalidFileSignature_Rejected() {
        MockMultipartFile file = new MockMultipartFile("file", "fake.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[]{0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08});

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                excelService.processExcel(10L, file, "host@example.com"));

        assertTrue(ex.getMessage().contains("Invalid file signature"));
    }

    @Test
    @DisplayName("5. Renamed non-Excel file is rejected (e.g. XLS renamed to XLSX or vice-versa)")
    void renamedFileMismatchedSignature_Rejected() throws Exception {
        byte[] xlsBytes = createSampleWorkbookBytes(false, 1, null);
        MockMultipartFile spoofedXlsx = new MockMultipartFile("file", "fake_xlsx.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsBytes);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                excelService.processExcel(10L, spoofedXlsx, "host@example.com"));

        assertTrue(ex.getMessage().contains("legacy .xls format but has a .xlsx extension"));
    }

    @Test
    @DisplayName("6. File exceeding 5MB is rejected")
    void fileExceeding5MB_Rejected() {
        // Create 5MB + 10 bytes mock file
        byte[] bigFile = new byte[(int) (ExcelService.MAX_EXCEL_FILE_SIZE + 10)];
        MockMultipartFile file = new MockMultipartFile("file", "oversized.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bigFile);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                excelService.processExcel(10L, file, "host@example.com"));

        assertTrue(ex.getMessage().contains("exceeds maximum allowed limit of 5MB"));
    }

    @Test
    @DisplayName("7. ZIP decompression bomb protection rejects malicious ratio")
    void zipBombProtection_RejectsMaliciousInflation() throws Exception {
        byte[] xlsxBytes = createSampleWorkbookBytes(true, 1, null);
        MockMultipartFile file = new MockMultipartFile("file", "zipbomb.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsxBytes);

        when(examRepository.findById(10L)).thenReturn(Optional.of(draftExam));
        when(userRepository.findByEmail("host@example.com")).thenReturn(Optional.of(host));

        long originalMaxEntry = ZipSecureFile.getMaxEntrySize();
        try {
            ZipSecureFile.setMaxEntrySize(500L); // 500 bytes triggers zip bomb detection on standard entries
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                    excelService.processExcel(10L, file, "host@example.com"));

            assertTrue(ex.getMessage().contains("decompression limits") || ex.getMessage().contains("corrupted"));
        } finally {
            ZipSecureFile.setMaxEntrySize(originalMaxEntry);
        }
    }

    @Test
    @DisplayName("8. Workbook with more than 500 questions is rejected")
    void workbookWithMoreThan500Questions_Rejected() throws Exception {
        byte[] xlsxBytes = createSampleWorkbookBytes(true, 501, null);
        MockMultipartFile file = new MockMultipartFile("file", "large.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsxBytes);

        when(examRepository.findById(10L)).thenReturn(Optional.of(draftExam));
        when(userRepository.findByEmail("host@example.com")).thenReturn(Optional.of(host));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                excelService.processExcel(10L, file, "host@example.com"));

        assertTrue(ex.getMessage().contains("Maximum 500 questions per upload"));
    }

    @Test
    @DisplayName("9. Excessively long cell content is rejected")
    void excessivelyLongCellContent_Rejected() throws Exception {
        String longText = "A".repeat(ExcelService.MAX_CELL_STRING_LENGTH + 50);
        byte[] xlsxBytes = createSampleWorkbookBytes(true, 1, longText);
        MockMultipartFile file = new MockMultipartFile("file", "longcell.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsxBytes);

        when(examRepository.findById(10L)).thenReturn(Optional.of(draftExam));
        when(userRepository.findByEmail("host@example.com")).thenReturn(Optional.of(host));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                excelService.processExcel(10L, file, "host@example.com"));

        assertTrue(ex.getMessage().contains("exceeds maximum allowed length of 10000 characters"));
    }

    @Test
    @DisplayName("10. Unauthorized host upload is rejected with ForbiddenException")
    void unauthorizedHost_Rejected() throws Exception {
        byte[] xlsxBytes = createSampleWorkbookBytes(true, 1, null);
        MockMultipartFile file = new MockMultipartFile("file", "questions.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsxBytes);

        when(examRepository.findById(10L)).thenReturn(Optional.of(draftExam));

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                excelService.processExcel(10L, file, "attacker@example.com"));

        assertTrue(ex.getMessage().contains("Not authorized"));
    }

    @Test
    @DisplayName("11. Existing question types and capacity check function correctly")
    void existingQuestionImportFunctionality_WorksCorrectly() throws Exception {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Questions");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Question Text");
            header.createCell(1).setCellValue("Type");
            header.createCell(2).setCellValue("Difficulty");
            header.createCell(3).setCellValue("Option A");
            header.createCell(4).setCellValue("Option B");
            header.createCell(5).setCellValue("Option C");
            header.createCell(6).setCellValue("Option D");
            header.createCell(7).setCellValue("Correct Answer");
            header.createCell(8).setCellValue("Tolerance");
            header.createCell(9).setCellValue("Topic");
            header.createCell(10).setCellValue("Explanation");
            header.createCell(11).setCellValue("Save To Bank");

            // Row 1: Single Choice Easy
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("Single Choice 1");
            r1.createCell(1).setCellValue("SINGLE_CHOICE");
            r1.createCell(2).setCellValue("EASY");
            r1.createCell(3).setCellValue("Opt A");
            r1.createCell(4).setCellValue("Opt B");
            r1.createCell(5).setCellValue("Opt C");
            r1.createCell(6).setCellValue("Opt D");
            r1.createCell(7).setCellValue("A");
            r1.createCell(8).setCellValue("");
            r1.createCell(9).setCellValue("Java");
            r1.createCell(10).setCellValue("Expl");
            r1.createCell(11).setCellValue("TRUE");

            // Row 2: Numerical Medium
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("Numerical 1");
            r2.createCell(1).setCellValue("NUMERICAL");
            r2.createCell(2).setCellValue("MEDIUM");
            r2.createCell(7).setCellValue("42");
            r2.createCell(8).setCellValue("0.5");
            r2.createCell(11).setCellValue("FALSE");

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            byte[] bytes = baos.toByteArray();

            MockMultipartFile file = new MockMultipartFile("file", "questions.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);

            when(examRepository.findById(10L)).thenReturn(Optional.of(draftExam));
            when(userRepository.findByEmail("host@example.com")).thenReturn(Optional.of(host));
            when(questionService.mapToResponse(any())).thenReturn(QuestionResponse.builder().id(200L).build());

            ExcelUploadResponse resp = excelService.processExcel(10L, file, "host@example.com");

            assertNotNull(resp);
            assertEquals(2, resp.getTotalRows());
            assertEquals(2, resp.getSavedCount());
            assertEquals(0, resp.getSkippedCount());
            verify(questionRepository, atLeast(2)).save(any());
        }
    }
}
