package com.assessmate.security;

import com.assessmate.controller.ProctoringEvidenceController;
import com.assessmate.entity.Exam;
import com.assessmate.entity.ExamEnrollment;
import com.assessmate.entity.ProctoringLog;
import com.assessmate.entity.User;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.ProctoringLogRepository;
import com.assessmate.service.ProctoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Principal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProctoringEvidenceAccessControlTest {

    @Mock private ProctoringLogRepository proctoringLogRepository;
    @Mock private com.assessmate.repository.ExamRepository examRepository;
    @Mock private com.assessmate.repository.ExamEnrollmentRepository enrollmentRepository;
    @Mock private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    @Mock private JwtUtil jwtUtil;

    private ProctoringService proctoringService;
    private ProctoringEvidenceController controller;

    @TempDir
    Path tempDir;

    private Path imagesDir;
    private Path audioDir;

    private User hostUser;
    private User candidateUser;
    private Exam exam;
    private ExamEnrollment enrollment;
    private ProctoringLog imageLog;

    @BeforeEach
    void setUp() throws IOException {
        imagesDir = tempDir.resolve("images");
        audioDir = tempDir.resolve("audio");
        Files.createDirectories(imagesDir);
        Files.createDirectories(audioDir);

        proctoringService = new ProctoringService(examRepository, enrollmentRepository, proctoringLogRepository, jdbcTemplate);
        ReflectionTestUtils.setField(proctoringService, "imagesUploadDir", imagesDir.toString() + File.separator);
        ReflectionTestUtils.setField(proctoringService, "audioUploadDir", audioDir.toString() + File.separator);

        controller = new ProctoringEvidenceController(proctoringService, jwtUtil);

        hostUser = new User();
        hostUser.setId(1L);
        hostUser.setEmail("host@assessmate.com");

        candidateUser = new User();
        candidateUser.setId(2L);
        candidateUser.setEmail("candidate@assessmate.com");

        exam = new Exam();
        exam.setId(10L);
        exam.setHost(hostUser);

        enrollment = new ExamEnrollment();
        enrollment.setId(20L);
        enrollment.setExam(exam);
        enrollment.setCandidate(candidateUser);

        imageLog = new ProctoringLog();
        imageLog.setId(100L);
        imageLog.setEnrollment(enrollment);
        imageLog.setImageUrl("/uploads/proctoring/images/test_snapshot.jpg");
    }

    @Test
    @DisplayName("1. Unauthenticated request to ProctoringEvidenceController returns 401")
    void testUnauthenticatedRequestReturns401() throws IOException {
        ResponseEntity<Resource> response = controller.getEvidence("images", "test_snapshot.jpg", null);
        assertEquals(401, response.getStatusCode().value());
    }

    @Test
    @DisplayName("2. Authorized host can retrieve evidence for their own exam")
    void testAuthorizedHostCanRetrieveEvidence() throws IOException {
        Path evidenceFile = imagesDir.resolve("test_snapshot.jpg");
        Files.writeString(evidenceFile, "fake-image-bytes");

        when(proctoringLogRepository.findByImageUrl("/uploads/proctoring/images/test_snapshot.jpg"))
                .thenReturn(Optional.of(imageLog));

        Principal hostPrincipal = () -> "host@assessmate.com";
        ResponseEntity<Resource> response = controller.getEvidence("images", "test_snapshot.jpg", hostPrincipal);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("image/jpeg", response.getHeaders().getContentType().toString());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().exists());
    }

    @Test
    @DisplayName("3. Another host cannot retrieve evidence for an exam they do not own (HTTP 403)")
    void testOtherHostCannotRetrieveEvidence() {
        when(proctoringLogRepository.findByImageUrl("/uploads/proctoring/images/test_snapshot.jpg"))
                .thenReturn(Optional.of(imageLog));

        Principal attackerPrincipal = () -> "other_host@assessmate.com";
        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
            controller.getEvidence("images", "test_snapshot.jpg", attackerPrincipal)
        );
        assertEquals("You do not have access to this evidence file", ex.getMessage());
    }

    @Test
    @DisplayName("4. Candidate cannot retrieve another candidate's evidence (HTTP 403)")
    void testCandidateCannotRetrieveOtherCandidateEvidence() {
        when(proctoringLogRepository.findByImageUrl("/uploads/proctoring/images/test_snapshot.jpg"))
                .thenReturn(Optional.of(imageLog));

        Principal otherCandidatePrincipal = () -> "snooping_candidate@assessmate.com";
        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
            controller.getEvidence("images", "test_snapshot.jpg", otherCandidatePrincipal)
        );
        assertEquals("You do not have access to this evidence file", ex.getMessage());
    }

    @Test
    @DisplayName("5. Authorized candidate can retrieve their own proctoring evidence")
    void testAuthorizedCandidateCanRetrieveOwnEvidence() throws IOException {
        Path evidenceFile = imagesDir.resolve("test_snapshot.jpg");
        Files.writeString(evidenceFile, "candidate-own-image");

        when(proctoringLogRepository.findByImageUrl("/uploads/proctoring/images/test_snapshot.jpg"))
                .thenReturn(Optional.of(imageLog));

        Principal candidatePrincipal = () -> "candidate@assessmate.com";
        ResponseEntity<Resource> response = controller.getEvidence("images", "test_snapshot.jpg", candidatePrincipal);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("6. Directory traversal attempts with relative paths are rejected")
    void testDirectoryTraversalRejected() {
        Principal hostPrincipal = () -> "host@assessmate.com";

        assertThrows(BadRequestException.class, () ->
            controller.getEvidence("images", "../../etc/passwd", hostPrincipal)
        );

        assertThrows(BadRequestException.class, () ->
            controller.getEvidence("images", "..\\windows\\system32\\cmd.exe", hostPrincipal)
        );

        assertThrows(BadRequestException.class, () ->
            controller.getEvidence("images", "sub/folder/hack.jpg", hostPrincipal)
        );
    }

    @Test
    @DisplayName("7. Missing or deleted evidence returns ResourceNotFoundException without leaking paths")
    void testMissingEvidenceReturns404() {
        when(proctoringLogRepository.findByImageUrl("/uploads/proctoring/images/missing.jpg"))
                .thenReturn(Optional.empty());

        Principal hostPrincipal = () -> "host@assessmate.com";
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
            controller.getEvidence("images", "missing.jpg", hostPrincipal)
        );
        assertEquals("Evidence file not found", ex.getMessage());
        assertFalse(ex.getMessage().contains(tempDir.toString()), "Must not disclose storage paths");
    }

    @Test
    @DisplayName("8. Symbolic link pointing outside evidence directory is blocked")
    void testSymbolicLinkTraversalBlocked() throws IOException {
        // Create a sensitive file outside the images directory
        Path outsideSecret = tempDir.resolve("super_secret.txt");
        Files.writeString(outsideSecret, "sensitive root secret");

        // Create a symlink inside images directory pointing to the outside secret
        Path symlinkFile = imagesDir.resolve("traversal_link.jpg");
        try {
            Files.createSymbolicLink(symlinkFile, outsideSecret);
        } catch (UnsupportedOperationException | java.nio.file.FileSystemException e) {
            // Symlink creation may require elevated privileges on some Windows configurations; skip if OS forbids
            return;
        }

        ProctoringLog symlinkLog = new ProctoringLog();
        symlinkLog.setId(200L);
        symlinkLog.setEnrollment(enrollment);
        symlinkLog.setImageUrl("/uploads/proctoring/images/traversal_link.jpg");

        when(proctoringLogRepository.findByImageUrl("/uploads/proctoring/images/traversal_link.jpg"))
                .thenReturn(Optional.of(symlinkLog));

        Principal hostPrincipal = () -> "host@assessmate.com";
        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
            controller.getEvidence("images", "traversal_link.jpg", hostPrincipal)
        );
        assertTrue(ex.getMessage().contains("Access to evidence file is restricted"));
    }
}
