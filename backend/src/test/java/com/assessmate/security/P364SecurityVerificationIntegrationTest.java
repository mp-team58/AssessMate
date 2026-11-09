package com.assessmate.security;

import com.assessmate.config.DatabaseMigrationRunner;
import com.assessmate.dto.ResultResponseDTO;
import com.assessmate.entity.*;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.repository.*;
import com.assessmate.service.AdminAuditService;
import com.assessmate.service.CandidateService;
import com.assessmate.service.HostResultService;
import io.github.cdimascio.dotenv.Dotenv;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class P364SecurityVerificationIntegrationTest {

    static {
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        dotenv.entries().forEach(entry -> {
            if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
                System.setProperty(entry.getKey(), entry.getValue());
            }
        });
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private ExamEnrollmentRepository enrollmentRepository;

    @Autowired
    private ResultRepository resultRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private AdminAuditService auditService;

    @Autowired
    private CandidateService candidateService;

    @Autowired
    private HostResultService hostResultService;

    @Autowired
    private DatabaseMigrationRunner migrationRunner;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User hostA;
    private User hostB;
    private User candidateA;
    private User candidateB;
    private User adminUser;

    private String hostAToken;
    private String hostBToken;
    private String candidateAToken;
    private String candidateBToken;
    private String adminToken;

    private Exam examA;
    private ExamEnrollment enrollmentA;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        hostA = userRepository.save(User.builder()
                .name("Host A " + suffix)
                .email("host.a." + suffix + "@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.HOST)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1L)
                .build());

        hostB = userRepository.save(User.builder()
                .name("Host B " + suffix)
                .email("host.b." + suffix + "@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.HOST)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1L)
                .build());

        candidateA = userRepository.save(User.builder()
                .name("Candidate A " + suffix)
                .email("cand.a." + suffix + "@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1L)
                .build());

        candidateB = userRepository.save(User.builder()
                .name("Candidate B " + suffix)
                .email("cand.b." + suffix + "@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1L)
                .build());

        adminUser = userRepository.save(User.builder()
                .name("Admin " + suffix)
                .email("admin." + suffix + "@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1L)
                .build());

        hostAToken = jwtUtil.generateToken(hostA.getEmail(), "HOST", 1L);
        hostBToken = jwtUtil.generateToken(hostB.getEmail(), "HOST", 1L);
        candidateAToken = jwtUtil.generateToken(candidateA.getEmail(), "CANDIDATE", 1L);
        candidateBToken = jwtUtil.generateToken(candidateB.getEmail(), "CANDIDATE", 1L);
        adminToken = jwtUtil.generateToken(adminUser.getEmail(), "ADMIN", 1L);

        examA = examRepository.save(Exam.builder()
                .title("Security Test Exam " + suffix)
                .subject("Cybersecurity")
                .host(hostA)
                .status(ExamStatus.LIVE)
                .joinCode("S" + UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase())
                .durationMinutes(60)
                .gracePeriodMinutes(15)
                .resultsPublished(true)
                .scheduledStart(LocalDateTime.now().plusDays(1))
                .createdAt(LocalDateTime.now())
                .build());

        enrollmentA = enrollmentRepository.save(ExamEnrollment.builder()
                .exam(examA)
                .candidate(candidateA)
                .status(EnrollmentStatus.SUBMITTED)
                .personalEndTime(LocalDateTime.now().plusHours(1))
                .joinedAt(LocalDateTime.now().minusMinutes(30))
                .submittedAt(LocalDateTime.now().minusMinutes(5))
                .build());

        resultRepository.save(Result.builder()
                .enrollment(enrollmentA)
                .totalScore(85.0)
                .maxScore(100.0)
                .passed(true)
                .percentage(85.0)
                .build());
    }

    // =========================================================================
    // 1. Role-Based Perimeter Checks on /api/results/**
    // =========================================================================

    @Test
    @DisplayName("C.1 Security: Unauthenticated request to /api/results/** returns 401 or 403")
    void unauthenticatedRequestToResultsRejected() throws Exception {
        mockMvc.perform(get("/api/results/exam/" + examA.getId()))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("C.1 Security: CANDIDATE role rejected from /api/results/** with 403 Forbidden")
    void candidateRoleRejectedFromResults() throws Exception {
        mockMvc.perform(get("/api/results/exam/" + examA.getId())
                .header("Authorization", "Bearer " + candidateAToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("C.1 Security: ADMIN role rejected from host-specific /api/results/** with 403 Forbidden")
    void adminRoleRejectedFromResults() throws Exception {
        mockMvc.perform(get("/api/results/exam/" + examA.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 2. Cross-Host Ownership Restrictions
    // =========================================================================

    @Test
    @DisplayName("C.2 Security: Host B cannot view Host A's exam results (403 Forbidden)")
    void crossHostResultsAccessForbidden() throws Exception {
        mockMvc.perform(get("/api/results/exam/" + examA.getId())
                .header("Authorization", "Bearer " + hostBToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("C.2 Security: Host B cannot view Host A's candidate report (403 Forbidden)")
    void crossHostCandidateReportForbidden() throws Exception {
        mockMvc.perform(get("/api/results/exam/" + examA.getId() + "/candidate/" + enrollmentA.getId())
                .header("Authorization", "Bearer " + hostBToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("C.2 Security: Host B cannot toggle Host A's candidate result (403 Forbidden)")
    void crossHostToggleResultForbidden() throws Exception {
        mockMvc.perform(put("/api/results/exam/" + examA.getId() + "/candidate/" + enrollmentA.getId() + "/toggle-result")
                .header("Authorization", "Bearer " + hostBToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("C.2 Host Owner: Host A can access own exam results (200 OK)")
    void hostOwnerCanAccessResults() throws Exception {
        mockMvc.perform(get("/api/results/exam/" + examA.getId())
                .header("Authorization", "Bearer " + hostAToken))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 3. Candidate Isolation
    // =========================================================================

    @Test
    @DisplayName("C.3 Security: Candidate B cannot access Candidate A's exam result (403 Forbidden)")
    void candidateCannotAccessOtherCandidateResult() throws Exception {
        mockMvc.perform(get("/api/candidate/result/" + enrollmentA.getId())
                .header("Authorization", "Bearer " + candidateBToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("C.3 Candidate Owner: Candidate A can access own exam result (200 OK)")
    void candidateOwnerCanAccessOwnResult() throws Exception {
        mockMvc.perform(get("/api/candidate/result/" + enrollmentA.getId())
                .header("Authorization", "Bearer " + candidateAToken))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 4. AdminAuditService.logAction REQUIRES_NEW Independence
    // =========================================================================

    @Test
    @DisplayName("C.6 Audit Integrity: logAction persists independently when outer transaction rolls back")
    void auditLogPersistsAcrossOuterRollback() {
        String uniqueAuditAction = "TEST_ROLLBACK_" + UUID.randomUUID().toString().substring(0, 8);

        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);

        try {
            template.execute(status -> {
                // Outer transaction calls logAction (REQUIRES_NEW)
                auditService.logAction(
                        adminUser.getId(),
                        adminUser.getEmail(),
                        uniqueAuditAction,
                        "EXAM",
                        examA.getId().toString(),
                        "{\"test\":\"rollback_verification\"}",
                        "127.0.0.1"
                );

                // Simulate unexpected outer transaction failure
                throw new RuntimeException("Forced rollback of outer business transaction");
            });
        } catch (RuntimeException expected) {
            // Expected rollback
        }

        // Verify the audit log was committed in its own independent transaction
        List<AdminAuditLog> logs = auditLogRepository.findByAction(uniqueAuditAction);
        assertFalse(logs.isEmpty(), "Audit log must be persisted despite outer transaction rollback!");
        assertEquals(adminUser.getEmail(), logs.get(0).getActorEmail());
        assertEquals("EXAM", logs.get(0).getTargetType());
    }

    // =========================================================================
    // 5. Database Indexes Verification
    // =========================================================================

    @Test
    @DisplayName("C.7 Database: PostgreSQL indexes exist on high-frequency tables")
    void verifyPostgreSqlIndexesExist() {
        List<String> expectedIndexes = List.of(
                "idx_question_exam",
                "idx_question_created_by",
                "idx_exam_host",
                "idx_enrollment_exam",
                "idx_coding_exam",
                "idx_coding_created_by",
                "idx_test_case_coding_q",
                "idx_submission_enrollment",
                "idx_submission_candidate",
                "idx_submission_coding_q",
                "idx_tc_result_submission",
                "idx_admin_audit_created_at",
                "idx_admin_audit_action",
                "idx_admin_invitations_email",
                "idx_admin_invitations_token_hash"
        );

        for (String indexName : expectedIndexes) {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = ?",
                    Integer.class,
                    indexName
            );
            assertNotNull(count, "Query for index " + indexName + " returned null");
            assertTrue(count > 0, "Index " + indexName + " must exist in pg_indexes!");
        }
    }

    // =========================================================================
    // 6. Migration Idempotency
    // =========================================================================

    @Test
    @DisplayName("C.9 Migrations: DatabaseMigrationRunner is idempotent and succeeds repeatedly")
    void databaseMigrationsIdempotent() {
        assertDoesNotThrow(() -> {
            // Execute migration runner multiple times
            migrationRunner.runMigrations();
            migrationRunner.runMigrations();
        }, "Repeated execution of DatabaseMigrationRunner must not throw exceptions");
    }
}
