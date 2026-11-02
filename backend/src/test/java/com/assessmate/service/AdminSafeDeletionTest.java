package com.assessmate.service;

import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.repository.AdminAuditLogRepository;
import com.assessmate.repository.ExamEnrollmentRepository;
import com.assessmate.repository.ExamRepository;
import com.assessmate.repository.OtpVerificationRepository;
import com.assessmate.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminSafeDeletionTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ExamRepository examRepository;

    @Mock
    private ExamEnrollmentRepository examEnrollmentRepository;

    @Mock
    private AdminAuditLogRepository auditLogRepository;

    @Mock
    private AdminAuditService auditService;

    @Mock
    private OtpVerificationRepository otpRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ExamSubmissionService examSubmissionService;

    @InjectMocks
    private AdminService adminService;

    @Test
    @DisplayName("Admin cannot delete self")
    void testAdminCannotDeleteSelf() {
        User admin = User.builder()
                .id(1L)
                .email("admin@test.com")
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminService.deleteUser(1L, "admin@test.com", "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Administrators cannot be deleted"));
    }

    @Test
    @DisplayName("Admin cannot delete other administrators")
    void testAdminCannotDeleteOtherAdmins() {
        User targetAdmin = User.builder()
                .id(2L)
                .email("otheradmin@test.com")
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .build();

        when(userRepository.findById(2L)).thenReturn(Optional.of(targetAdmin));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminService.deleteUser(2L, "callingadmin@test.com", "127.0.0.1")
        );
        assertEquals("Administrators cannot be deleted via this endpoint.", ex.getMessage());
    }

    @Test
    @DisplayName("Cannot delete host with active LIVE exams")
    void testCannotDeleteHostWithLiveExams() {
        User host = User.builder()
                .id(3L)
                .email("host@test.com")
                .role(Role.HOST)
                .status(AccountStatus.ACTIVE)
                .build();

        when(userRepository.findById(3L)).thenReturn(Optional.of(host));
        when(examRepository.existsByHostIdAndStatus(3L, ExamStatus.LIVE)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminService.deleteUser(3L, "admin@test.com", "127.0.0.1")
        );
        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Cannot delete host with active LIVE exams"));
    }

    @Test
    @DisplayName("Cannot delete candidate with ongoing assessment")
    void testCannotDeleteCandidateWithOngoingAssessment() {
        User candidate = User.builder()
                .id(4L)
                .email("candidate@test.com")
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .build();

        when(userRepository.findById(4L)).thenReturn(Optional.of(candidate));
        when(examEnrollmentRepository.existsByCandidateIdAndStatus(4L, EnrollmentStatus.ONGOING)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminService.deleteUser(4L, "admin@test.com", "127.0.0.1")
        );
        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Cannot delete candidate with an ongoing assessment"));
    }

    @Test
    @DisplayName("Safe deletion performs anonymization, status update, session revocation, and audit logging")
    void testSuccessfulSafeDeletion() {
        User candidate = User.builder()
                .id(5L)
                .email("realcandidate@test.com")
                .name("Alice Real")
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1L)
                .build();

        when(userRepository.findById(5L)).thenReturn(Optional.of(candidate));
        when(examEnrollmentRepository.existsByCandidateIdAndStatus(5L, EnrollmentStatus.ONGOING)).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("random_scrambled_hash");

        adminService.deleteUser(5L, "admin@test.com", "127.0.0.1");

        assertEquals(AccountStatus.DELETED, candidate.getStatus());
        assertEquals("deleted-5@deleted.invalid", candidate.getEmail());
        assertEquals("Deleted User", candidate.getName());
        assertNull(candidate.getActiveToken());
        assertEquals(2L, candidate.getTokenVersion());
        assertNotNull(candidate.getDeletedAt());
        assertEquals("admin@test.com", candidate.getDeletedBy());

        verify(userRepository).save(candidate);
        verify(auditService).logAction(
                isNull(),
                eq("admin@test.com"),
                eq("USER_DELETE"),
                eq("USER"),
                eq("5"),
                anyString(),
                eq("127.0.0.1")
        );
    }
}

