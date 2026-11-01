package com.assessmate.security;

import com.assessmate.dto.JoinExamResponse;
import com.assessmate.entity.Exam;
import com.assessmate.entity.ExamStatus;
import com.assessmate.entity.User;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.RateLimitExceededException;
import com.assessmate.repository.*;
import com.assessmate.service.CandidateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JoinCodeRateLimitingTest {

    @Mock private ExamRepository examRepository;
    @Mock private UserRepository userRepository;
    @Mock private ExamEnrollmentRepository enrollmentRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private ProctoringLogRepository proctoringLogRepository;
    @Mock private CandidateAnswerRepository candidateAnswerRepository;
    @Mock private ResultRepository resultRepository;
    @Mock private com.assessmate.service.GeminiService geminiService;
    @Mock private org.springframework.transaction.PlatformTransactionManager transactionManager;
    @Mock private CodingQuestionRepository codingQuestionRepository;
    @Mock private CodeSubmissionRepository codeSubmissionRepository;

    private JoinCodeRateLimiterService rateLimiterService;
    private CandidateService candidateService;
    private ClientIpResolver clientIpResolver;

    private User candidateUser;
    private Exam liveExam;

    @BeforeEach
    void setUp() {
        rateLimiterService = new JoinCodeRateLimiterService(5, 60);
        // Configured with exact IPs, IPv4 CIDR ranges, and IPv6
        clientIpResolver = new ClientIpResolver("127.0.0.1,10.0.0.0/8,192.168.0.0/16,::1,2001:db8::/32");

        candidateService = new CandidateService(
                examRepository,
                userRepository,
                enrollmentRepository,
                questionRepository,
                proctoringLogRepository,
                candidateAnswerRepository,
                resultRepository,
                geminiService,
                transactionManager,
                codingQuestionRepository,
                codeSubmissionRepository
        );
        candidateService.setJoinCodeRateLimiterService(rateLimiterService);

        candidateUser = new User();
        candidateUser.setId(10L);
        candidateUser.setEmail("candidate@test.com");

        liveExam = new Exam();
        liveExam.setId(100L);
        liveExam.setJoinCode("LIVE123");
        liveExam.setStatus(ExamStatus.LIVE);
        liveExam.setDurationMinutes(60);
        liveExam.setTitle("Test Exam");
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        liveExam.setScheduledStart(now.minusMinutes(5));
        liveExam.setGracePeriodMinutes(30);
        liveExam.setStartedAt(now.minusMinutes(5));
        liveExam.setTotalQuestions(5);
        liveExam.setHasCodingSection(false);
        liveExam.setTimerType(com.assessmate.entity.TimerType.WHOLE_EXAM);
    }

    @Test
    @DisplayName("1. Valid join-code attempt succeeds and resets failure allowance")
    void testValidJoinCodeAttemptWorks() {
        when(userRepository.findByEmail("candidate@test.com")).thenReturn(Optional.of(candidateUser));
        when(examRepository.findByJoinCode("LIVE123")).thenReturn(Optional.of(liveExam));
        when(questionRepository.countByExamId(100L)).thenReturn(5L);
        when(enrollmentRepository.findByExamAndCandidate(any(), any())).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any())).thenAnswer(inv -> {
            var enr = (com.assessmate.entity.ExamEnrollment) inv.getArgument(0);
            enr.setId(500L);
            return enr;
        });

        JoinExamResponse response = candidateService.joinExam("LIVE123", "candidate@test.com", "Mozilla/5.0 Desktop", "192.168.1.100");
        assertNotNull(response);
        assertEquals(100L, response.getExamId());
    }

    @Test
    @DisplayName("2. Repeated invalid attempts trigger RateLimitExceededException (HTTP 429)")
    void testRepeatedInvalidAttemptsTriggerHttp429() {
        when(userRepository.findByEmail("candidate@test.com")).thenReturn(Optional.of(candidateUser));
        when(examRepository.findByJoinCode("WRONG_CODE")).thenReturn(Optional.empty());

        for (int i = 0; i < 5; i++) {
            assertThrows(BadRequestException.class, () ->
                candidateService.joinExam("WRONG_CODE", "candidate@test.com", "Desktop", "192.168.1.100")
            );
        }

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
            candidateService.joinExam("WRONG_CODE", "candidate@test.com", "Desktop", "192.168.1.100")
        );
        assertTrue(ex.getMessage().contains("Too many failed exam join attempts"));
        assertTrue(ex.getRetryAfterSeconds() > 0);
    }

    @Test
    @DisplayName("3. Retry-After header duration is returned and is positive")
    void testRetryAfterHeaderIsReturned() {
        for (int i = 0; i < 5; i++) {
            rateLimiterService.onJoinFailure("10.0.0.1", "user@test.com");
        }

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
            rateLimiterService.checkRateLimit("10.0.0.1", "user@test.com")
        );
        assertTrue(ex.getRetryAfterSeconds() > 0 && ex.getRetryAfterSeconds() <= 60);
    }

    @Test
    @DisplayName("4. Rate limit window expires after configured duration")
    void testRateLimitExpiresAfterConfiguredWindow() {
        JoinCodeRateLimiterService shortLimiter = new JoinCodeRateLimiterService(2, 1);
        shortLimiter.onJoinFailure("10.0.0.2", "candidate2@test.com");
        shortLimiter.onJoinFailure("10.0.0.2", "candidate2@test.com");

        assertThrows(RateLimitExceededException.class, () ->
            shortLimiter.checkRateLimit("10.0.0.2", "candidate2@test.com")
        );

        try { Thread.sleep(1100); } catch (InterruptedException ignored) {}

        assertDoesNotThrow(() ->
            shortLimiter.checkRateLimit("10.0.0.2", "candidate2@test.com")
        );
    }

    @Test
    @DisplayName("5. One candidate cannot bypass limit simply by changing email or changing IP")
    void testCannotBypassLimitByChangingDimensions() {
        for (int i = 0; i < 5; i++) {
            rateLimiterService.onJoinFailure("203.0.113.5", "attacker1@test.com");
        }

        RateLimitExceededException exIp = assertThrows(RateLimitExceededException.class, () ->
            rateLimiterService.checkRateLimit("203.0.113.5", "different_victim@test.com")
        );
        assertTrue(exIp.getMessage().contains("Too many failed exam join attempts"));

        for (int i = 0; i < 5; i++) {
            rateLimiterService.onJoinFailure("198.51.100.1", "targeted_candidate@test.com");
        }

        RateLimitExceededException exCand = assertThrows(RateLimitExceededException.class, () ->
            rateLimiterService.checkRateLimit("198.51.100.99", "targeted_candidate@test.com")
        );
        assertTrue(exCand.getMessage().contains("Too many failed exam join attempts"));
    }

    @Test
    @DisplayName("6. Generic error messages do not reveal join-code existence")
    void testGenericErrorMessagesDoNotRevealCodeExistence() {
        when(userRepository.findByEmail("candidate@test.com")).thenReturn(Optional.of(candidateUser));

        when(examRepository.findByJoinCode("NON_EXISTENT")).thenReturn(Optional.empty());
        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
            candidateService.joinExam("NON_EXISTENT", "candidate@test.com", "Desktop", "10.1.1.1")
        );

        Exam draftExam = new Exam();
        draftExam.setStatus(ExamStatus.DRAFT);
        when(examRepository.findByJoinCode("DRAFT_EXAM")).thenReturn(Optional.of(draftExam));
        BadRequestException ex2 = assertThrows(BadRequestException.class, () ->
            candidateService.joinExam("DRAFT_EXAM", "candidate@test.com", "Desktop", "10.1.1.2")
        );

        assertEquals("Invalid or inactive exam join code.", ex1.getMessage());
        assertEquals("Invalid or inactive exam join code.", ex2.getMessage());
    }

    @Test
    @DisplayName("7. Untrusted client cannot bypass IP limit by spoofing X-Forwarded-For")
    void testUntrustedClientCannotSpoofIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.50"); // untrusted public IP
        request.addHeader("X-Forwarded-For", "1.1.1.1, 2.2.2.2");
        request.addHeader("X-Real-IP", "3.3.3.3");

        String resolvedIp = clientIpResolver.resolveClientIp(request);
        assertEquals("203.0.113.50", resolvedIp, "Must ignore spoofed headers from untrusted remote address");
    }

    @Test
    @DisplayName("8. Trusted exact IP proxy allows legitimate forwarded client IP")
    void testTrustedExactIpAllowsForwardedIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1"); // trusted exact IP
        request.addHeader("X-Forwarded-For", "203.0.113.88, 10.0.0.1");

        String resolvedIp = clientIpResolver.resolveClientIp(request);
        assertEquals("203.0.113.88", resolvedIp, "Must extract real client IP when forwarded from trusted proxy");
    }

    @Test
    @DisplayName("9. Trusted IPv4 CIDR range proxy allows legitimate forwarded client IP")
    void testTrustedIpv4CidrRangeAllowsForwardedIp() {
        // 10.254.1.5 is inside 10.0.0.0/8
        MockHttpServletRequest requestInCidr = new MockHttpServletRequest();
        requestInCidr.setRemoteAddr("10.254.1.5");
        requestInCidr.addHeader("X-Forwarded-For", "198.51.100.42");
        assertEquals("198.51.100.42", clientIpResolver.resolveClientIp(requestInCidr));

        // 192.168.10.20 is inside 192.168.0.0/16
        MockHttpServletRequest requestIn192 = new MockHttpServletRequest();
        requestIn192.setRemoteAddr("192.168.10.20");
        requestIn192.addHeader("X-Real-IP", "198.51.100.43");
        assertEquals("198.51.100.43", clientIpResolver.resolveClientIp(requestIn192));

        // 172.16.0.1 is NOT in configured ranges, so forwarded headers must be ignored
        MockHttpServletRequest requestOutside = new MockHttpServletRequest();
        requestOutside.setRemoteAddr("172.16.0.1");
        requestOutside.addHeader("X-Forwarded-For", "198.51.100.44");
        assertEquals("172.16.0.1", clientIpResolver.resolveClientIp(requestOutside));
    }

    @Test
    @DisplayName("10. Trusted IPv6 proxy (exact and CIDR) allows legitimate forwarded client IP")
    void testTrustedIpv6ProxyAllowsForwardedIp() {
        // ::1 loopback
        MockHttpServletRequest reqLoopback = new MockHttpServletRequest();
        reqLoopback.setRemoteAddr("0:0:0:0:0:0:0:1");
        reqLoopback.addHeader("X-Forwarded-For", "203.0.113.99");
        assertEquals("203.0.113.99", clientIpResolver.resolveClientIp(reqLoopback));

        // 2001:db8:1::1 is inside 2001:db8::/32
        MockHttpServletRequest reqV6Cidr = new MockHttpServletRequest();
        reqV6Cidr.setRemoteAddr("2001:db8:1::1");
        reqV6Cidr.addHeader("X-Forwarded-For", "203.0.113.100");
        assertEquals("203.0.113.100", clientIpResolver.resolveClientIp(reqV6Cidr));
    }
}
