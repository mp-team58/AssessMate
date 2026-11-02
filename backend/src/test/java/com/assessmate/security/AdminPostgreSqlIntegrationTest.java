package com.assessmate.security;

import com.assessmate.dto.ForgotPasswordRequest;
import com.assessmate.dto.LoginRequest;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.repository.*;
import com.assessmate.service.AdminService;
import com.assessmate.service.AuthService;
import io.github.cdimascio.dotenv.Dotenv;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AdminPostgreSqlIntegrationTest {

    static {
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        dotenv.entries().forEach(entry -> {
            if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
                System.setProperty(entry.getKey(), entry.getValue());
            }
        });
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private ExamEnrollmentRepository examEnrollmentRepository;

    @Autowired
    private ResultRepository resultRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private OtpVerificationRepository otpRepository;

    @Autowired
    private AdminService adminService;

    @Autowired
    private AuthService authService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("Real PostgreSQL database check constraint accepts ADMIN role without violation")
    void testPostgreSqlRoleCheckConstraintAcceptsAdmin() {
        String uniqueEmail = "pg.admin." + UUID.randomUUID() + "@test.com";

        User admin = User.builder()
                .name("PostgreSQL Admin")
                .email(uniqueEmail)
                .password("EncryptedAdminPassword123!")
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .createdAt(LocalDateTime.now())
                .build();

        User saved = userRepository.saveAndFlush(admin);
        assertNotNull(saved.getId());
        assertEquals(Role.ADMIN, saved.getRole());

        // Also verify via raw SQL query directly against PostgreSQL table
        String dbRole = jdbcTemplate.queryForObject(
                "SELECT role FROM users WHERE email = ?",
                String.class,
                uniqueEmail
        );
        assertEquals("ADMIN", dbRole);

        userRepository.delete(saved);
    }

    @Test
    @DisplayName("Transactional safe deletion rolls back fully if an unexpected failure occurs")
    void testDatabaseTransactionRollsBackOnDeletionFailure() {
        String testEmail = "rollback.candidate." + UUID.randomUUID() + "@test.com";
        User user = userRepository.saveAndFlush(User.builder()
                .name("Rollback Candidate")
                .email(testEmail)
                .password("Password123!")
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        Long userId = user.getId();

        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        assertThrows(RuntimeException.class, () -> {
            txTemplate.execute(status -> {
                adminService.deleteUser(userId, "admin@test.com", "127.0.0.1");
                throw new RuntimeException("Simulated unexpected transaction failure");
            });
        });

        // After rollback, verify user remains ACTIVE and original email was preserved
        User verifiedUser = userRepository.findById(userId).orElseThrow();
        assertEquals(AccountStatus.ACTIVE, verifiedUser.getStatus());
        assertEquals(testEmail, verifiedUser.getEmail());
        assertEquals("Rollback Candidate", verifiedUser.getName());

        userRepository.delete(verifiedUser);
    }

    @Test
    @DisplayName("Host exams and candidate submissions/results remain intact after user deletion")
    void testHostExamsAndCandidateSubmissionsIntactAfterDeletion() {
        // 1. Create Host and Exam
        User host = userRepository.saveAndFlush(User.builder()
                .name("Test Host")
                .email("host.intact." + UUID.randomUUID() + "@test.com")
                .password(passwordEncoder.encode("HostPass123!"))
                .role(Role.HOST)
                .status(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        Exam exam = examRepository.saveAndFlush(Exam.builder()
                .title("Preserved Exam Title")
                .subject("Software Engineering")
                .host(host)
                .status(ExamStatus.ENDED)
                .joinCode(UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .scheduledStart(LocalDateTime.now().minusHours(2))
                .durationMinutes(60)
                .totalQuestions(5)
                .resultsPublished(true)
                .createdAt(LocalDateTime.now())
                .build());

        // 2. Create Candidate, Enrollment, and Result
        User candidate = userRepository.saveAndFlush(User.builder()
                .name("Test Candidate")
                .email("candidate.intact." + UUID.randomUUID() + "@test.com")
                .password(passwordEncoder.encode("CandPass123!"))
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        ExamEnrollment enrollment = examEnrollmentRepository.saveAndFlush(ExamEnrollment.builder()
                .candidate(candidate)
                .exam(exam)
                .status(EnrollmentStatus.SUBMITTED)
                .joinedAt(LocalDateTime.now().minusMinutes(50))
                .personalEndTime(LocalDateTime.now().plusMinutes(10))
                .submittedAt(LocalDateTime.now().minusMinutes(5))
                .build());

        Result result = resultRepository.saveAndFlush(Result.builder()
                .enrollment(enrollment)
                .totalScore(85.0)
                .maxScore(100.0)
                .percentage(85.0)
                .passed(true)
                .build());

        // 3. Delete Host safely
        adminService.deleteUser(host.getId(), "audit.admin@test.com", "127.0.0.1");

        // Verify Exam still exists and host relationship is intact
        Exam retrievedExam = examRepository.findById(exam.getId()).orElseThrow();
        assertEquals("Preserved Exam Title", retrievedExam.getTitle());
        assertEquals(host.getId(), retrievedExam.getHost().getId());
        assertEquals(AccountStatus.DELETED, retrievedExam.getHost().getStatus());

        // 4. Delete Candidate safely
        adminService.deleteUser(candidate.getId(), "audit.admin@test.com", "127.0.0.1");

        // Verify Enrollment and Result still exist and point to candidate
        ExamEnrollment retrievedEnrollment = examEnrollmentRepository.findById(enrollment.getId()).orElseThrow();
        assertEquals(candidate.getId(), retrievedEnrollment.getCandidate().getId());
        assertEquals(EnrollmentStatus.SUBMITTED, retrievedEnrollment.getStatus());

        Result retrievedResult = resultRepository.findByEnrollmentId(enrollment.getId()).orElseThrow();
        assertEquals(85.0, retrievedResult.getTotalScore());
        assertEquals(85.0, retrievedResult.getPercentage());
    }

    @Test
    @DisplayName("Deleted user cannot log in with previous credentials")
    void testDeletedUserCannotLogIn() {
        String originalEmail = "deleted.login." + UUID.randomUUID() + "@test.com";
        String rawPassword = "CandidatePassword123!";

        User user = userRepository.saveAndFlush(User.builder()
                .name("Target For Deletion")
                .email(originalEmail)
                .password(passwordEncoder.encode(rawPassword))
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        // Delete user
        adminService.deleteUser(user.getId(), "audit.admin@test.com", "127.0.0.1");

        // Attempt login with original credentials -> Must fail
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail(originalEmail);
        loginReq.setPassword(rawPassword);

        assertThrows(BadRequestException.class, () -> authService.login(loginReq, "127.0.0.1"));
    }

    @Test
    @DisplayName("Same original email can register again after account deletion")
    void testSameEmailCanRegisterAgainAfterDeletion() {
        String recycledEmail = "recycle." + UUID.randomUUID() + "@test.com";

        User firstUser = userRepository.saveAndFlush(User.builder()
                .name("First Registered User")
                .email(recycledEmail)
                .password(passwordEncoder.encode("Pass12345!"))
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        // Delete user -> Email becomes deleted-{id}@deleted.invalid
        adminService.deleteUser(firstUser.getId(), "audit.admin@test.com", "127.0.0.1");

        // Verify the original email is completely freed from the unique index
        assertFalse(userRepository.existsByEmail(recycledEmail));

        // A new user can register with the exact same email without constraint violation
        User secondUser = userRepository.saveAndFlush(User.builder()
                .name("Second User With Same Email")
                .email(recycledEmail)
                .password(passwordEncoder.encode("DifferentPass789!"))
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        assertNotNull(secondUser.getId());
        assertNotEquals(firstUser.getId(), secondUser.getId());
        assertEquals(recycledEmail, secondUser.getEmail());
    }

    @Test
    @DisplayName("Forgot-password for a deleted account sends no OTP and leaks no info")
    void testForgotPasswordForDeletedAccountSendsNoOtp() {
        String originalEmail = "forgot.deleted." + UUID.randomUUID() + "@test.com";

        User user = userRepository.saveAndFlush(User.builder()
                .name("Forgot Deleted Candidate")
                .email(originalEmail)
                .password(passwordEncoder.encode("Pass12345!"))
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        adminService.deleteUser(user.getId(), "audit.admin@test.com", "127.0.0.1");

        // Request password reset for original email
        ForgotPasswordRequest reqOriginal = new ForgotPasswordRequest();
        reqOriginal.setEmail(originalEmail);
        assertDoesNotThrow(() -> authService.requestPasswordResetOtp(reqOriginal));

        // Request password reset for anonymized deleted email
        ForgotPasswordRequest reqAnonymized = new ForgotPasswordRequest();
        reqAnonymized.setEmail("deleted-" + user.getId() + "@deleted.invalid");
        assertDoesNotThrow(() -> authService.requestPasswordResetOtp(reqAnonymized));

        // Verify zero OTP records were generated
        assertEquals(0, otpRepository.findAll().stream()
                .filter(o -> o.getEmail().equalsIgnoreCase(originalEmail) || o.getEmail().contains("deleted-"))
                .count());
    }

    @Test
    @DisplayName("Last active administrator cannot be deactivated or deleted")
    void testLastActiveAdminCannotBeDeactivatedOrDeleted() {
        // Ensure there is at least one active admin
        User singleAdmin = userRepository.findByRoleAndStatus(Role.ADMIN, AccountStatus.ACTIVE)
                .stream().findFirst().orElseGet(() -> userRepository.saveAndFlush(User.builder()
                        .name("Sole Administrator")
                        .email("sole.admin." + UUID.randomUUID() + "@test.com")
                        .password(passwordEncoder.encode("AdminPass12345!"))
                        .role(Role.ADMIN)
                        .status(AccountStatus.ACTIVE)
                        .createdAt(LocalDateTime.now())
                        .build()));

        // Ensure other active admins are removed or deactivated for this specific test
        List<User> otherAdmins = userRepository.findByRoleAndStatus(Role.ADMIN, AccountStatus.ACTIVE)
                .stream()
                .filter(u -> !u.getId().equals(singleAdmin.getId()))
                .toList();

        for (User other : otherAdmins) {
            other.setStatus(AccountStatus.DEACTIVATED);
            userRepository.saveAndFlush(other);
        }

        assertEquals(1, userRepository.countByRoleAndStatus(Role.ADMIN, AccountStatus.ACTIVE));

        // Attempt to delete last active admin -> must be blocked
        BadRequestException deleteEx = assertThrows(BadRequestException.class, () ->
                adminService.deleteUser(singleAdmin.getId(), "calling.admin@test.com", "127.0.0.1")
        );
        assertEquals("Administrators cannot be deleted via this endpoint.", deleteEx.getMessage());

        // Attempt to deactivate last active admin -> must be blocked
        BadRequestException deactEx = assertThrows(BadRequestException.class, () ->
                adminService.updateUserStatus(singleAdmin.getId(), AccountStatus.DEACTIVATED, "calling.admin@test.com", "127.0.0.1")
        );
        assertEquals("Cannot deactivate the last active administrator.", deactEx.getMessage());

        // Restore other admins back to ACTIVE
        for (User other : otherAdmins) {
            other.setStatus(AccountStatus.ACTIVE);
            userRepository.saveAndFlush(other);
        }
    }

    @Test
    @DisplayName("Audit log entries never contain raw passwords, raw tokens, or unmasked full emails")
    void testAuditEntriesContainNoPasswordsTokensOrFullEmails() {
        List<AdminAuditLog> logs = auditLogRepository.findAll();
        assertFalse(logs.isEmpty(), "Audit log table should contain records");

        for (AdminAuditLog logEntry : logs) {
            String details = logEntry.getMetadataJson() != null ? logEntry.getMetadataJson() : "";

            // 1. Details must never contain password keys or values
            assertFalse(details.toLowerCase().contains("password"), "Audit details must never contain password fields: " + details);
            assertFalse(details.toLowerCase().contains("temporarypassword"), "Audit details must never contain temporary password: " + details);

            // 2. Details must never contain Bearer or JWT signatures
            assertFalse(details.contains("Bearer "), "Audit details must never log JWT bearer tokens");
            assertFalse(details.contains("eyJ"), "Audit details must never log raw JWT strings");

            // 3. Target email in details must be masked (j***@domain.com) or anonymized (deleted-*)
            if (details.contains("@")) {
                assertTrue(
                        details.matches(".*[a-zA-Z0-9]\\*\\*\\*@[a-zA-Z0-9.-]+.*") || details.contains("@deleted.invalid"),
                        "Any email in audit details must be properly masked: " + details
                );
            }
        }
    }
}
