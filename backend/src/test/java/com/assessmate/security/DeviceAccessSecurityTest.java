package com.assessmate.security;

import com.assessmate.dto.CandidateExamQuestionsResponse;
import com.assessmate.dto.JoinExamResponse;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.repository.*;
import com.assessmate.service.CandidateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DeviceAccessSecurityTest {

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

    private CandidateService candidateService;

    private User candidateUser;
    private Exam desktopExam;
    private Exam mobileExam;
    private Exam bothExam;

    private static final String DESKTOP_WIN_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String DESKTOP_MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String DESKTOP_LINUX_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String MOBILE_ANDROID_PHONE_UA = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    private static final String MOBILE_IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
    private static final String TABLET_ANDROID_UA = "Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String TABLET_IPAD_UA = "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";

    @BeforeEach
    void setUp() {
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

        candidateUser = new User();
        candidateUser.setId(10L);
        candidateUser.setEmail("candidate@test.com");

        LocalDateTime now = LocalDateTime.now();

        desktopExam = new Exam();
        desktopExam.setId(101L);
        desktopExam.setJoinCode("DESK101");
        desktopExam.setStatus(ExamStatus.LIVE);
        desktopExam.setDeviceAccess(DeviceAccess.DESKTOP);
        desktopExam.setDurationMinutes(60);
        desktopExam.setTitle("Desktop Only Exam");
        desktopExam.setScheduledStart(now.minusMinutes(5));
        desktopExam.setGracePeriodMinutes(30);
        desktopExam.setTimerType(TimerType.WHOLE_EXAM);

        mobileExam = new Exam();
        mobileExam.setId(102L);
        mobileExam.setJoinCode("MOBI102");
        mobileExam.setStatus(ExamStatus.LIVE);
        mobileExam.setDeviceAccess(DeviceAccess.MOBILE);
        mobileExam.setDurationMinutes(60);
        mobileExam.setTitle("Mobile Only Exam");
        mobileExam.setScheduledStart(now.minusMinutes(5));
        mobileExam.setGracePeriodMinutes(30);
        mobileExam.setTimerType(TimerType.WHOLE_EXAM);

        bothExam = new Exam();
        bothExam.setId(103L);
        bothExam.setJoinCode("BOTH103");
        bothExam.setStatus(ExamStatus.LIVE);
        bothExam.setDeviceAccess(DeviceAccess.BOTH);
        bothExam.setDurationMinutes(60);
        bothExam.setTitle("Both Devices Exam");
        bothExam.setScheduledStart(now.minusMinutes(5));
        bothExam.setGracePeriodMinutes(30);
        bothExam.setTimerType(TimerType.WHOLE_EXAM);
    }

    // --- Device Classification Unit Tests ---

    @Test
    @DisplayName("Windows, Mac, Linux desktop user agents are classified as Desktop")
    void testDesktopClassification() {
        assertFalse(candidateService.isMobileDevice(DESKTOP_WIN_UA, ""));
        assertFalse(candidateService.isMobileDevice(DESKTOP_WIN_UA, "?0"));
        assertFalse(candidateService.isMobileDevice(DESKTOP_MAC_UA, ""));
        assertFalse(candidateService.isMobileDevice(DESKTOP_LINUX_UA, ""));
    }

    @Test
    @DisplayName("Android phones and iPhones are classified as Mobile")
    void testMobileClassification() {
        assertTrue(candidateService.isMobileDevice(MOBILE_ANDROID_PHONE_UA, ""));
        assertTrue(candidateService.isMobileDevice(MOBILE_ANDROID_PHONE_UA, "?1"));
        assertTrue(candidateService.isMobileDevice(MOBILE_IPHONE_UA, ""));
    }

    @Test
    @DisplayName("Android tablets and iPads are classified as Mobile in ecosystem check")
    void testTabletClassification() {
        assertTrue(candidateService.isMobileDevice(TABLET_ANDROID_UA, ""));
        assertTrue(candidateService.isMobileDevice(TABLET_IPAD_UA, ""));
    }

    @Test
    @DisplayName("Sec-CH-UA-Mobile ?1 forces mobile classification")
    void testSecChUaMobile_ForcesMobile() {
        assertTrue(candidateService.isMobileDevice(DESKTOP_WIN_UA, "?1"));
    }

    // --- Validation Policy Unit Tests ---

    @Test
    @DisplayName("Desktop Only: Allowed for desktop, throws 400 for mobile")
    void testValidateDeviceAccess_DesktopOnly() {
        // Desktop allowed
        assertDoesNotThrow(() -> candidateService.validateDeviceAccess(DeviceAccess.DESKTOP, DESKTOP_WIN_UA, "?0"));

        // Mobile phone blocked
        BadRequestException exPhone = assertThrows(BadRequestException.class,
                () -> candidateService.validateDeviceAccess(DeviceAccess.DESKTOP, MOBILE_ANDROID_PHONE_UA, "?1"));
        assertEquals("This exam is restricted to Desktop devices only.", exPhone.getMessage());

        // iPhone blocked
        BadRequestException exIphone = assertThrows(BadRequestException.class,
                () -> candidateService.validateDeviceAccess(DeviceAccess.DESKTOP, MOBILE_IPHONE_UA, ""));
        assertEquals("This exam is restricted to Desktop devices only.", exIphone.getMessage());
    }

    @Test
    @DisplayName("Mobile Only: Allowed for mobile, throws 400 for desktop")
    void testValidateDeviceAccess_MobileOnly() {
        // Mobile allowed
        assertDoesNotThrow(() -> candidateService.validateDeviceAccess(DeviceAccess.MOBILE, MOBILE_IPHONE_UA, ""));

        // Desktop blocked
        BadRequestException exDesk = assertThrows(BadRequestException.class,
                () -> candidateService.validateDeviceAccess(DeviceAccess.MOBILE, DESKTOP_WIN_UA, "?0"));
        assertEquals("This exam is restricted to Mobile devices only.", exDesk.getMessage());
    }

    @Test
    @DisplayName("Both: Permitted for both desktop and mobile")
    void testValidateDeviceAccess_Both() {
        assertDoesNotThrow(() -> candidateService.validateDeviceAccess(DeviceAccess.BOTH, DESKTOP_WIN_UA, "?0"));
        assertDoesNotThrow(() -> candidateService.validateDeviceAccess(DeviceAccess.BOTH, MOBILE_ANDROID_PHONE_UA, "?1"));
        assertDoesNotThrow(() -> candidateService.validateDeviceAccess(null, DESKTOP_WIN_UA, ""));
    }

    // --- Join Exam Workflow Tests ---

    @Test
    @DisplayName("joinExam on Desktop Only exam blocks mobile candidate on entry")
    void testJoinExam_DesktopOnly_BlockedForMobile() {
        when(userRepository.findByEmail("candidate@test.com")).thenReturn(Optional.of(candidateUser));
        when(examRepository.findByJoinCode("DESK101")).thenReturn(Optional.of(desktopExam));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.joinExam("DESK101", "candidate@test.com", MOBILE_ANDROID_PHONE_UA, "?1", "127.0.0.1")
        );
        assertEquals("This exam is restricted to Desktop devices only.", ex.getMessage());
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("joinExam on Mobile Only exam blocks desktop candidate on entry")
    void testJoinExam_MobileOnly_BlockedForDesktop() {
        when(userRepository.findByEmail("candidate@test.com")).thenReturn(Optional.of(candidateUser));
        when(examRepository.findByJoinCode("MOBI102")).thenReturn(Optional.of(mobileExam));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.joinExam("MOBI102", "candidate@test.com", DESKTOP_WIN_UA, "?0", "127.0.0.1")
        );
        assertEquals("This exam is restricted to Mobile devices only.", ex.getMessage());
        verify(enrollmentRepository, never()).save(any());
    }

    // --- Cross-Device Resume Enforcement (getExamQuestions) ---

    @Test
    @DisplayName("getExamQuestions: Candidate enrolled on Desktop is blocked when resuming from Mobile on Desktop Only exam")
    void testResumeExam_DesktopEnrolled_BlockedOnMobileResume() {
        ExamEnrollment enrollment = ExamEnrollment.builder()
                .id(501L)
                .exam(desktopExam)
                .candidate(candidateUser)
                .status(EnrollmentStatus.ONGOING)
                .personalEndTime(LocalDateTime.now().plusMinutes(45))
                .build();

        when(enrollmentRepository.findById(501L)).thenReturn(Optional.of(enrollment));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.getExamQuestions(501L, "candidate@test.com", MOBILE_ANDROID_PHONE_UA, "?1")
        );

        assertEquals("This exam is restricted to Desktop devices only.", ex.getMessage());
        verify(questionRepository, never()).findByExamId(any());
    }

    @Test
    @DisplayName("getExamQuestions: Candidate enrolled on Mobile is blocked when resuming from Desktop on Mobile Only exam")
    void testResumeExam_MobileEnrolled_BlockedOnDesktopResume() {
        ExamEnrollment enrollment = ExamEnrollment.builder()
                .id(502L)
                .exam(mobileExam)
                .candidate(candidateUser)
                .status(EnrollmentStatus.ONGOING)
                .personalEndTime(LocalDateTime.now().plusMinutes(45))
                .build();

        when(enrollmentRepository.findById(502L)).thenReturn(Optional.of(enrollment));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.getExamQuestions(502L, "candidate@test.com", DESKTOP_WIN_UA, "?0")
        );

        assertEquals("This exam is restricted to Mobile devices only.", ex.getMessage());
        verify(questionRepository, never()).findByExamId(any());
    }

    @Test
    @DisplayName("getExamQuestions: Allowed on authorized device and returns deviceAccess in DTO")
    void testResumeExam_DesktopEnrolled_AllowedOnDesktop() {
        ExamEnrollment enrollment = ExamEnrollment.builder()
                .id(503L)
                .exam(desktopExam)
                .candidate(candidateUser)
                .status(EnrollmentStatus.ONGOING)
                .personalEndTime(LocalDateTime.now().plusMinutes(45))
                .build();

        when(enrollmentRepository.findById(503L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(desktopExam.getId())).thenReturn(Collections.emptyList());
        when(candidateAnswerRepository.findByEnrollmentId(503L)).thenReturn(Collections.emptyList());

        CandidateExamQuestionsResponse response = candidateService.getExamQuestions(
                503L, "candidate@test.com", DESKTOP_WIN_UA, "?0"
        );

        assertNotNull(response);
        assertEquals(DeviceAccess.DESKTOP, response.getDeviceAccess());
    }
}

