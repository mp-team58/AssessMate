package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.Exam;
import com.assessmate.entity.ExamStatus;
import com.assessmate.entity.User;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.ExamRepository;
import com.assessmate.service.FileProcessingService.FileExtractionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AIQuestionJobServiceTest {

    @Mock
    private AIQuestionService aiQuestionService;

    @Mock
    private FileProcessingService fileProcessingService;

    @Mock
    private ExamRepository examRepository;

    @InjectMocks
    private AIQuestionJobService jobService;

    private Exam testExam;
    private User testHost;
    private final String HOST_EMAIL = "host@assessmate.com";
    private final Long EXAM_ID = 100L;

    @BeforeEach
    void setUp() {
        testHost = new User();
        testHost.setEmail(HOST_EMAIL);

        testExam = new Exam();
        testExam.setId(EXAM_ID);
        testExam.setTitle("Java Certification Exam");
        testExam.setHost(testHost);
        testExam.setStatus(ExamStatus.DRAFT);
        lenient().when(examRepository.findWithHostById(any())).thenReturn(Optional.of(testExam));
        lenient().when(examRepository.findById(any())).thenReturn(Optional.of(testExam));
    }

    @Test
    @DisplayName("Should successfully queue topic-based AI generation job")
    void shouldQueueTopicJobSuccessfully() throws InterruptedException {
        when(examRepository.findWithHostById(EXAM_ID)).thenReturn(Optional.of(testExam));

        AIGenerationResponse mockResponse = new AIGenerationResponse();
        mockResponse.setGeneratedCount(5);
        lenient().when(aiQuestionService.generateFromTopic(any(), eq(HOST_EMAIL))).thenReturn(mockResponse);

        AIGenerationRequest req = new AIGenerationRequest();
        req.setExamId(EXAM_ID);
        req.setTopic("Java Concurrency");
        req.setTotalQuestions(5);

        AIGenerationJobResponse jobResp = jobService.startTopicJob(req, HOST_EMAIL);

        assertNotNull(jobResp);
        assertNotNull(jobResp.getJobId());
        assertEquals("PROCESSING", jobResp.getStatus());
        assertEquals(EXAM_ID, jobResp.getExamId());

        // Wait for asynchronous job execution to finish
        Thread.sleep(100);

        AIGenerationJobResponse statusResp = jobService.getJobStatus(EXAM_ID, jobResp.getJobId(), HOST_EMAIL);
        assertEquals("COMPLETED", statusResp.getStatus());
        assertNotNull(statusResp.getResult());
        assertEquals(5, statusResp.getResult().getGeneratedCount());
    }

    @Test
    @DisplayName("Should reject concurrent duplicate jobs for the same exam")
    void shouldRejectConcurrentDuplicateJobs() {
        when(examRepository.findWithHostById(EXAM_ID)).thenReturn(Optional.of(testExam));

        // Stub aiQuestionService to block until interrupted or latch released
        CountDownLatch latch = new CountDownLatch(1);
        lenient().when(aiQuestionService.generateFromTopic(any(), eq(HOST_EMAIL))).thenAnswer(invocation -> {
            latch.await(2, TimeUnit.SECONDS);
            return new AIGenerationResponse();
        });

        AIGenerationRequest req1 = new AIGenerationRequest();
        req1.setExamId(EXAM_ID);
        req1.setTopic("Java Concurrency");

        AIGenerationJobResponse job1 = jobService.startTopicJob(req1, HOST_EMAIL);
        assertNotNull(job1.getJobId());

        AIGenerationRequest req2 = new AIGenerationRequest();
        req2.setExamId(EXAM_ID);
        req2.setTopic("Java Collections");

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> jobService.startTopicJob(req2, HOST_EMAIL));

        assertTrue(ex.getMessage().contains("already in progress"));
        latch.countDown();
    }

    @Test
    @DisplayName("Should require non-empty topic for topic job")
    void shouldValidateTopicPresence() {
        AIGenerationRequest req = new AIGenerationRequest();
        req.setExamId(EXAM_ID);
        req.setTopic("   ");

        assertThrows(BadRequestException.class, () -> jobService.startTopicJob(req, HOST_EMAIL));
    }

    @Test
    @DisplayName("Should require non-empty text for text job")
    void shouldValidateTextPresence() {
        AIGenerationRequest req = new AIGenerationRequest();
        req.setExamId(EXAM_ID);
        req.setText("   ");

        assertThrows(BadRequestException.class, () -> jobService.startTextJob(req, HOST_EMAIL));
    }

    @Test
    @DisplayName("Should validate file upload and extract synchronously before backgrounding")
    void shouldValidateFileAndExtractSynchronously() throws IOException, InterruptedException {
        when(examRepository.findWithHostById(EXAM_ID)).thenReturn(Optional.of(testExam));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.pdf",
                "application/pdf",
                "Sample content".getBytes());

        FileExtractionResult extraction = FileExtractionResult.builder()
                .fullText("Extracted notes")
                .fileType("PDF")
                .hasText(true)
                .build();
        when(fileProcessingService.extractFromFile(any(), any())).thenReturn(extraction);

        AIGenerationResponse mockResponse = new AIGenerationResponse();
        mockResponse.setGeneratedCount(3);
        when(aiQuestionService.generateFromFileExtraction(any(), eq(extraction), eq(HOST_EMAIL)))
                .thenReturn(mockResponse);

        AIFileRequest req = new AIFileRequest();
        req.setExamId(EXAM_ID);
        req.setTotalQuestions(3);

        AIGenerationJobResponse jobResp = jobService.startFileJob(req, file, HOST_EMAIL);
        assertNotNull(jobResp.getJobId());
        assertEquals("PROCESSING", jobResp.getStatus());

        // Verify synchronous extraction was called immediately
        verify(fileProcessingService).extractFromFile(eq(file), any());

        Thread.sleep(100);

        AIGenerationJobResponse statusResp = jobService.getJobStatus(EXAM_ID, jobResp.getJobId(), HOST_EMAIL);
        assertEquals("COMPLETED", statusResp.getStatus());
        assertEquals(3, statusResp.getResult().getGeneratedCount());
    }

    @Test
    @DisplayName("Should enforce exam ownership on job status check")
    void shouldEnforceOwnershipOnJobStatus() {
        when(examRepository.findWithHostById(EXAM_ID)).thenReturn(Optional.of(testExam));
        lenient().when(aiQuestionService.generateFromTopic(any(), eq(HOST_EMAIL))).thenReturn(new AIGenerationResponse());

        AIGenerationRequest req = new AIGenerationRequest();
        req.setExamId(EXAM_ID);
        req.setTopic("Spring Security");

        AIGenerationJobResponse job = jobService.startTopicJob(req, HOST_EMAIL);

        // Attempt retrieval by a different user
        assertThrows(ForbiddenException.class,
                () -> jobService.getJobStatus(EXAM_ID, job.getJobId(), "intruder@assessmate.com"));

        // Attempt retrieval with wrong examId
        assertThrows(ForbiddenException.class,
                () -> jobService.getJobStatus(999L, job.getJobId(), HOST_EMAIL));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException for unknown jobId")
    void shouldThrowNotFoundForUnknownJob() {
        assertThrows(ResourceNotFoundException.class,
                () -> jobService.getJobStatus(EXAM_ID, "non-existent-uuid", HOST_EMAIL));
    }

    @Test
    @DisplayName("Should capture and sanitize error when AI generation fails")
    void shouldCaptureAndSanitizeErrorOnFailure() throws InterruptedException {
        when(examRepository.findWithHostById(EXAM_ID)).thenReturn(Optional.of(testExam));
        lenient().when(aiQuestionService.generateFromTopic(any(), eq(HOST_EMAIL)))
                .thenThrow(new RuntimeException("Gemini quota exceeded: key=AIzaSySecretApiKey123"));

        AIGenerationRequest req = new AIGenerationRequest();
        req.setExamId(EXAM_ID);
        req.setTopic("Cloud Computing");

        AIGenerationJobResponse job = jobService.startTopicJob(req, HOST_EMAIL);

        Thread.sleep(100);

        AIGenerationJobResponse status = jobService.getJobStatus(EXAM_ID, job.getJobId(), HOST_EMAIL);
        assertEquals("FAILED", status.getStatus());
        assertNotNull(status.getError());
        // Verify sensitive keys or credentials are not leaked in error message
        assertFalse(status.getError().contains("AIzaSy"));
    }
}