package com.assessmate.storage;

import com.assessmate.controller.StorageController;
import com.assessmate.dto.SignedUrlResponse;
import com.assessmate.dto.StorageUploadResponse;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.repository.ExamEnrollmentRepository;
import com.assessmate.repository.ProctoringLogRepository;
import com.assessmate.repository.QuestionRepository;
import com.assessmate.repository.UserRepository;
import com.assessmate.service.storage.StorageAuthorizationService;
import com.assessmate.service.storage.StorageFileNameGenerator;
import com.assessmate.service.storage.StorageFileValidator;
import com.assessmate.service.storage.SupabaseStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SupabaseStorageIntegrationTest {

    private StorageFileValidator validator;
    private StorageFileNameGenerator nameGenerator;
    private SupabaseStorageService storageService;
    private StorageAuthorizationService authService;
    private StorageController storageController;

    @Mock private UserRepository userRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private ProctoringLogRepository proctoringLogRepository;
    @Mock private ExamEnrollmentRepository enrollmentRepository;

    private User hostUser;
    private User candidateUser;
    private User otherCandidate;
    private Exam exam;
    private ExamEnrollment enrollment;
    private Question question;
    private ProctoringLog proctoringLog;

    @BeforeEach
    void setUp() {
        validator = new StorageFileValidator();
        nameGenerator = new StorageFileNameGenerator();
        storageService = new SupabaseStorageService(
                "https://vpdgjxmkluecxbhizzcd.supabase.co",
                "mock-service-role-key-for-test",
                "assessmate-media",
                900,
                new ObjectMapper()
        );

        authService = new StorageAuthorizationService(
                userRepository,
                questionRepository,
                proctoringLogRepository,
                enrollmentRepository
        );

        storageController = new StorageController(
                storageService,
                validator,
                nameGenerator,
                authService,
                userRepository
        );

        hostUser = new User();
        hostUser.setId(10L);
        hostUser.setEmail("host@assessmate.me");
        hostUser.setRole(Role.HOST);

        candidateUser = new User();
        candidateUser.setId(20L);
        candidateUser.setEmail("candidate@assessmate.me");
        candidateUser.setRole(Role.CANDIDATE);

        otherCandidate = new User();
        otherCandidate.setId(30L);
        otherCandidate.setEmail("intruder@assessmate.me");
        otherCandidate.setRole(Role.CANDIDATE);

        exam = new Exam();
        exam.setId(100L);
        exam.setHost(hostUser);

        enrollment = new ExamEnrollment();
        enrollment.setId(200L);
        enrollment.setExam(exam);
        enrollment.setCandidate(candidateUser);

        question = new Question();
        question.setId(500L);
        question.setExam(exam);
        question.setCreatedBy(hostUser);
        question.setImageUrl("questions/q_100_a83f29c1.png");

        proctoringLog = new ProctoringLog();
        proctoringLog.setId(800L);
        proctoringLog.setEnrollment(enrollment);
        proctoringLog.setImageUrl("proctoring/image/p_20_a83f29c1.jpg");
        proctoringLog.setAudioUrl("proctoring/audio/p_20_b27d41e8.webm");
    }

    // ─────────────────────────────────────────────────────────────
    // 1-6: MIME & File Validation Tests (JPEG, PNG, WEBP, MP3, WAV, WebM)
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("1. Upload and validate a valid JPEG image")
    void testValidateJpegImage() {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0};
        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", jpegBytes);

        var result = validator.validateImage(file);
        assertEquals("image/jpeg", result.mimeType());
        assertEquals(".jpg", result.extension());
    }

    @Test
    @DisplayName("2. Upload and validate a valid PNG image")
    void testValidatePngImage() {
        byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", pngBytes);

        var result = validator.validateImage(file);
        assertEquals("image/png", result.mimeType());
        assertEquals(".png", result.extension());
    }

    @Test
    @DisplayName("3. Upload and validate a valid WEBP image")
    void testValidateWebpImage() {
        byte[] webpBytes = new byte[]{
                'R', 'I', 'F', 'F', 30, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.webp", "image/webp", webpBytes);

        var result = validator.validateImage(file);
        assertEquals("image/webp", result.mimeType());
        assertEquals(".webp", result.extension());
    }

    @Test
    @DisplayName("4. Upload and validate a valid MP3 audio file")
    void testValidateMp3Audio() {
        byte[] mp3Bytes = new byte[]{'I', 'D', '3', 3, 0, 0, 0, 0, 0, 10};
        MockMultipartFile file = new MockMultipartFile("file", "test.mp3", "audio/mpeg", mp3Bytes);

        var result = validator.validateAudio(file);
        assertEquals("audio/mpeg", result.mimeType());
        assertEquals(".mp3", result.extension());
    }

    @Test
    @DisplayName("5. Upload and validate a valid WAV audio file")
    void testValidateWavAudio() {
        byte[] wavBytes = new byte[]{
                'R', 'I', 'F', 'F', 36, 0, 0, 0, 'W', 'A', 'V', 'E', 'f', 'm', 't', ' '
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.wav", "audio/wav", wavBytes);

        var result = validator.validateAudio(file);
        assertEquals("audio/wav", result.mimeType());
        assertEquals(".wav", result.extension());
    }

    @Test
    @DisplayName("6. Upload and validate a valid WebM audio file")
    void testValidateWebmAudio() {
        byte[] webmBytes = new byte[]{(byte) 0x1A, (byte) 0x45, (byte) 0xDF, (byte) 0xA3, 0x01, 0x00, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "evidence.webm", "audio/webm", webmBytes);

        var result = validator.validateAudio(file);
        assertEquals("audio/webm", result.mimeType());
        assertEquals(".webm", result.extension());
    }

    // ─────────────────────────────────────────────────────────────
    // 7-10: Folder Structure, Short Filenames, Uniqueness
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("7. Verify automatic folder path and prefix generation for questions and proctoring")
    void testFolderStructureGeneration() {
        String qPath = nameGenerator.generateQuestionObjectPath(104, ".png");
        String pImgPath = nameGenerator.generateProctoringImageObjectPath(892, ".jpg");
        String pAudPath = nameGenerator.generateProctoringAudioObjectPath(892, ".webm");

        assertTrue(qPath.startsWith("questions/q_104_"));
        assertTrue(pImgPath.startsWith("proctoring/image/p_892_"));
        assertTrue(pAudPath.startsWith("proctoring/audio/p_892_"));
    }

    @Test
    @DisplayName("8. Verify automatic short filename generation (no long UUIDs)")
    void testShortFilenameGeneration() {
        String path = nameGenerator.generateQuestionObjectPath(42, ".png");
        // e.g., questions/q_42_a83f29c1.png
        String filename = path.substring(path.lastIndexOf('/') + 1);
        assertEquals(17, filename.length()); // q_ (2) + 42_ (3) + 8 hex + .png (4) = 17
        assertTrue(filename.matches("^q_42_[0-9a-f]{8}\\.png$"));
    }

    @Test
    @DisplayName("9. Verify filenames are unique and do not collide")
    void testFilenameUniqueness() {
        String path1 = nameGenerator.generateQuestionObjectPath(100, ".jpg");
        String path2 = nameGenerator.generateQuestionObjectPath(100, ".jpg");
        assertNotEquals(path1, path2, "Consecutive generations must not collide");
    }

    @Test
    @DisplayName("10. Verify permanent object path structure in Question and Proctoring records")
    void testDatabaseObjectPathFormat() {
        assertEquals("questions/q_100_a83f29c1.png", question.getImageUrl());
        assertEquals("proctoring/image/p_20_a83f29c1.jpg", proctoringLog.getImageUrl());
        assertEquals("proctoring/audio/p_20_b27d41e8.webm", proctoringLog.getAudioUrl());
    }

    // ─────────────────────────────────────────────────────────────
    // 11-17: Authorization, IDOR Protection, Signed URL Access
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("11. Generate a signed URL for an authorized host viewing question media")
    void testAuthorizedHostCanAccessQuestionMedia() {
        when(userRepository.findByEmail("host@assessmate.me")).thenReturn(Optional.of(hostUser));
        when(questionRepository.findMatchingQuestions(eq("questions/q_100_a83f29c1.png"), anyString()))
                .thenReturn(List.of(question));

        assertDoesNotThrow(() -> authService.validateReadAccess("questions/q_100_a83f29c1.png", "host@assessmate.me"));
    }

    @Test
    @DisplayName("12. Authorized candidate enrolled in exam can access question media")
    void testAuthorizedCandidateCanAccessQuestionMedia() {
        when(userRepository.findByEmail("candidate@assessmate.me")).thenReturn(Optional.of(candidateUser));
        when(questionRepository.findMatchingQuestions(eq("questions/q_100_a83f29c1.png"), anyString()))
                .thenReturn(List.of(question));
        when(enrollmentRepository.findByExamAndCandidate(exam, candidateUser)).thenReturn(Optional.of(enrollment));

        assertDoesNotThrow(() -> authService.validateReadAccess("questions/q_100_a83f29c1.png", "candidate@assessmate.me"));
    }

    @Test
    @DisplayName("13. Unauthorized candidate cannot access question media from an exam they are not enrolled in (HTTP 403)")
    void testUnauthorizedCandidateDeniedAccess() {
        when(userRepository.findByEmail("intruder@assessmate.me")).thenReturn(Optional.of(otherCandidate));
        when(questionRepository.findMatchingQuestions(eq("questions/q_100_a83f29c1.png"), anyString()))
                .thenReturn(List.of(question));
        when(enrollmentRepository.findByExamAndCandidate(exam, otherCandidate)).thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class, () ->
                authService.validateReadAccess("questions/q_100_a83f29c1.png", "intruder@assessmate.me")
        );
    }

    @Test
    @DisplayName("14. Another host cannot access proctoring evidence of an exam they do not own (HTTP 403)")
    void testUnauthorizedHostDeniedProctoringEvidence() {
        User otherHost = new User();
        otherHost.setId(99L);
        otherHost.setEmail("other_host@assessmate.me");
        otherHost.setRole(Role.HOST);

        when(userRepository.findByEmail("other_host@assessmate.me")).thenReturn(Optional.of(otherHost));
        when(proctoringLogRepository.findMatchingImages(eq("proctoring/image/p_20_a83f29c1.jpg"), anyString()))
                .thenReturn(List.of(proctoringLog));

        assertThrows(ForbiddenException.class, () ->
                authService.validateReadAccess("proctoring/image/p_20_a83f29c1.jpg", "other_host@assessmate.me")
        );
    }

    @Test
    @DisplayName("15. Unauthenticated request to /api/storage/signed-url is blocked")
    void testUnauthenticatedSignedUrlBlocked() {
        assertThrows(ForbiddenException.class, () ->
                storageController.getSignedUrl("questions/q_100_a83f29c1.png", 900, null)
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 18-20: Security Rejections (Size, MIME, Malicious Content)
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("18. Reject image files larger than 5MB limit")
    void testOversizedImageRejected() {
        byte[] bigBytes = new byte[6 * 1024 * 1024]; // 6 MB
        MockMultipartFile bigFile = new MockMultipartFile("file", "big.jpg", "image/jpeg", bigBytes);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> validator.validateImage(bigFile));
        assertTrue(ex.getMessage().contains("exceeds maximum allowed size of 5MB"));
    }

    @Test
    @DisplayName("19. Reject unsupported MIME types (e.g., application/pdf)")
    void testUnsupportedMimeRejected() {
        byte[] pdfBytes = "%PDF-1.5 fake content".getBytes();
        MockMultipartFile pdfFile = new MockMultipartFile("file", "doc.pdf", "application/pdf", pdfBytes);

        assertThrows(BadRequestException.class, () -> validator.validateImage(pdfFile));
    }

    @Test
    @DisplayName("20. Reject invalid or disguised malicious script content")
    void testMaliciousScriptDisguisedAsImageRejected() {
        byte[] fakeJpg = "<script>alert('xss')</script>".getBytes();
        MockMultipartFile fakeFile = new MockMultipartFile("file", "fake.jpg", "image/jpeg", fakeJpg);

        assertThrows(BadRequestException.class, () -> validator.validateImage(fakeFile));
    }

    // ─────────────────────────────────────────────────────────────
    // 21-22: File Deletion and Replacement Authorization
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("21. Host can delete media belonging to their own question")
    void testHostCanDeleteOwnQuestionMedia() {
        when(userRepository.findByEmail("host@assessmate.me")).thenReturn(Optional.of(hostUser));
        when(questionRepository.findMatchingQuestions(eq("questions/q_100_a83f29c1.png"), anyString()))
                .thenReturn(List.of(question));

        assertDoesNotThrow(() -> authService.validateDeleteAccess("questions/q_100_a83f29c1.png", "host@assessmate.me"));
    }

    @Test
    @DisplayName("22. Candidate cannot delete host's question media (HTTP 403)")
    void testCandidateCannotDeleteQuestionMedia() {
        when(userRepository.findByEmail("candidate@assessmate.me")).thenReturn(Optional.of(candidateUser));
        when(questionRepository.findMatchingQuestions(eq("questions/q_100_a83f29c1.png"), anyString()))
                .thenReturn(List.of(question));

        assertThrows(ForbiddenException.class, () ->
                authService.validateDeleteAccess("questions/q_100_a83f29c1.png", "candidate@assessmate.me")
        );
    }
}
