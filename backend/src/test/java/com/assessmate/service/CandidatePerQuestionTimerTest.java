package com.assessmate.service;

import com.assessmate.dto.CandidateExamQuestionsResponse;
import com.assessmate.dto.CandidateQuestionDTO;
import com.assessmate.dto.QuestionExpireResponse;
import com.assessmate.dto.SubmitExamRequest;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CandidatePerQuestionTimerTest {

    @Mock
    private ExamRepository examRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ExamEnrollmentRepository enrollmentRepository;
    @Mock
    private QuestionRepository questionRepository;
    @Mock
    private ProctoringLogRepository proctoringLogRepository;
    @Mock
    private CandidateAnswerRepository candidateAnswerRepository;
    @Mock
    private ResultRepository resultRepository;
    @Mock
    private GeminiService geminiService;
    @Mock
    private PlatformTransactionManager transactionManager;
    @Mock
    private CodingQuestionRepository codingQuestionRepository;
    @Mock
    private CodeSubmissionRepository codeSubmissionRepository;
    @Mock
    private CandidateQuestionTimingRepository candidateQuestionTimingRepository;

    private CandidateService candidateService;

    private User candidate;
    private User otherCandidate;
    private Exam exam;
    private ExamEnrollment enrollment;
    private Question q1Easy;
    private Question q2Medium;
    private Question q3Hard;
    private Question q4Custom;

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
        candidateService.setCandidateQuestionTimingRepository(candidateQuestionTimingRepository);

        candidate = User.builder()
                .id(1L)
                .email("candidate@example.com")
                .role(Role.CANDIDATE)
                .build();

        otherCandidate = User.builder()
                .id(2L)
                .email("intruder@example.com")
                .role(Role.CANDIDATE)
                .build();

        exam = Exam.builder()
                .id(10L)
                .title("Per Question Timing Exam")
                .timerType(TimerType.PER_QUESTION)
                .easySeconds(30)
                .mediumSeconds(60)
                .hardSeconds(90)
                .durationMinutes(30)
                .deviceAccess(DeviceAccess.BOTH)
                .build();

        enrollment = ExamEnrollment.builder()
                .id(100L)
                .candidate(candidate)
                .exam(exam)
                .status(EnrollmentStatus.ONGOING)
                .joinedAt(LocalDateTime.now())
                .personalEndTime(LocalDateTime.now().plusMinutes(30))
                .build();

        q1Easy = Question.builder()
                .id(1L)
                .exam(exam)
                .questionText("Easy Question")
                .difficulty(Difficulty.EASY)
                .timeSeconds(null) // Fallback 30
                .type(QuestionType.SINGLE_CHOICE)
                .optionA("A1")
                .optionB("B1")
                .build();

        q2Medium = Question.builder()
                .id(2L)
                .exam(exam)
                .questionText("Medium Question")
                .difficulty(Difficulty.MEDIUM)
                .timeSeconds(null) // Fallback 60
                .type(QuestionType.SINGLE_CHOICE)
                .optionA("A2")
                .optionB("B2")
                .build();

        q3Hard = Question.builder()
                .id(3L)
                .exam(exam)
                .questionText("Hard Question")
                .difficulty(Difficulty.HARD)
                .timeSeconds(null) // Fallback 90
                .type(QuestionType.SINGLE_CHOICE)
                .optionA("A3")
                .optionB("B3")
                .build();

        q4Custom = Question.builder()
                .id(4L)
                .exam(exam)
                .questionText("Custom Timing Question")
                .difficulty(Difficulty.MEDIUM)
                .timeSeconds(45) // Override
                .type(QuestionType.SINGLE_CHOICE)
                .optionA("A4")
                .optionB("B4")
                .build();
    }

    @Test
    @DisplayName("Part 1: Difficulty fallback correctly resolves EASY, MEDIUM, HARD and explicit overrides")
    void testDurationFallbacks() {
        assertEquals(30, candidateService.resolveQuestionDurationSeconds(q1Easy, exam));
        assertEquals(60, candidateService.resolveQuestionDurationSeconds(q2Medium, exam));
        assertEquals(90, candidateService.resolveQuestionDurationSeconds(q3Hard, exam));
        assertEquals(45, candidateService.resolveQuestionDurationSeconds(q4Custom, exam));
    }

    @Test
    @DisplayName("Part 1: Invalid/negative duration throws controlled BadRequestException")
    void testInvalidDurationThrowsBadRequest() {
        Exam brokenExam = Exam.builder()
                .id(11L)
                .timerType(TimerType.PER_QUESTION)
                .easySeconds(0) // Invalid
                .mediumSeconds(-10) // Invalid
                .hardSeconds(null) // Invalid
                .build();

        Question brokenQ = Question.builder()
                .id(99L)
                .exam(brokenExam)
                .difficulty(Difficulty.EASY)
                .timeSeconds(null)
                .build();

        assertThrows(BadRequestException.class, () ->
                candidateService.resolveQuestionDurationSeconds(brokenQ, brokenExam));
    }

    @Test
    @DisplayName("Part 1 & 2: First question activates automatically and timing response is populated")
    void testGetQuestionsInitialActivation() {
        when(enrollmentRepository.findById(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy, q2Medium, q3Hard));
        when(candidateQuestionTimingRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());
        when(candidateQuestionTimingRepository.save(any(CandidateQuestionTiming.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CandidateExamQuestionsResponse response = candidateService.getExamQuestions(100L, "candidate@example.com", "desktop", "");

        assertNotNull(response);
        assertEquals(TimerType.PER_QUESTION, response.getTimerType());
        assertEquals(30, response.getEasySeconds());
        assertEquals(60, response.getMediumSeconds());
        assertEquals(90, response.getHardSeconds());
        assertNotNull(response.getServerTime());
        assertNotNull(response.getActiveQuestionId());

        verify(candidateQuestionTimingRepository, atLeastOnce()).save(any(CandidateQuestionTiming.class));

        List<CandidateQuestionDTO> questions = response.getQuestions();
        assertEquals(3, questions.size());
        for (CandidateQuestionDTO dto : questions) {
            assertNotNull(dto.getTimeSeconds());
            assertTrue(dto.getTimeSeconds() > 0);
        }
    }

    @Test
    @DisplayName("Part 2 & 7: Refreshing retains existing deadline and does not reset timer")
    void testRefreshPreservesExistingDeadline() {
        LocalDateTime startedAt = LocalDateTime.now().minusSeconds(10);
        LocalDateTime originalDeadline = startedAt.plusSeconds(30);

        CandidateQuestionTiming existingTiming = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(startedAt)
                .deadline(originalDeadline)
                .isExpired(false)
                .build();

        when(enrollmentRepository.findById(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy));
        when(candidateQuestionTimingRepository.findByEnrollmentId(100L)).thenReturn(List.of(existingTiming));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        CandidateExamQuestionsResponse response = candidateService.getExamQuestions(100L, "candidate@example.com", "desktop", "");

        assertEquals(q1Easy.getId(), response.getActiveQuestionId());
        assertEquals(originalDeadline, response.getActiveQuestionDeadline());
        assertTrue(response.getActiveQuestionRemainingSeconds() <= 21 && response.getActiveQuestionRemainingSeconds() >= 18);
    }

    @Test
    @DisplayName("Part 3: Save progress accepts answer before question deadline")
    void testSaveProgressBeforeDeadlineAccepted() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        CandidateQuestionTiming activeTiming = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(LocalDateTime.now())
                .deadline(LocalDateTime.now().plusSeconds(25))
                .isExpired(false)
                .build();

        when(candidateQuestionTimingRepository.findByEnrollmentId(100L)).thenReturn(List.of(activeTiming));

        SubmitExamRequest req = new SubmitExamRequest();
        req.setAnswers(Map.of(q1Easy.getId(), "A"));

        assertDoesNotThrow(() -> candidateService.saveProgress(100L, req, "candidate@example.com"));
        verify(candidateAnswerRepository, times(1)).saveAll(any());
    }

    @Test
    @DisplayName("Part 3: Save progress rejects answer after question deadline has passed")
    void testSaveProgressAfterDeadlineRejected() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        CandidateQuestionTiming expiredTiming = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(LocalDateTime.now().minusSeconds(40))
                .deadline(LocalDateTime.now().minusSeconds(10))
                .isExpired(true)
                .build();

        when(candidateQuestionTimingRepository.findByEnrollmentId(100L)).thenReturn(List.of(expiredTiming));

        SubmitExamRequest req = new SubmitExamRequest();
        req.setAnswers(Map.of(q1Easy.getId(), "A"));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.saveProgress(100L, req, "candidate@example.com"));

        assertTrue(ex.getMessage().contains("expired"));
    }

    @Test
    @DisplayName("Part 3: Modifying an already accepted answer on expired question is rejected")
    void testModifyExpiredAnswerRejected() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy));

        CandidateAnswer existingAccepted = CandidateAnswer.builder()
                .id(10L)
                .enrollment(enrollment)
                .question(q1Easy)
                .candidateAnswer("A")
                .build();
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(List.of(existingAccepted));

        CandidateQuestionTiming expiredTiming = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(LocalDateTime.now().minusSeconds(40))
                .deadline(LocalDateTime.now().minusSeconds(10))
                .isExpired(true)
                .build();
        when(candidateQuestionTimingRepository.findByEnrollmentId(100L)).thenReturn(List.of(expiredTiming));

        // Attempt to change answer from "A" to "B" after expiration
        SubmitExamRequest req = new SubmitExamRequest();
        req.setAnswers(Map.of(q1Easy.getId(), "B"));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.saveProgress(100L, req, "candidate@example.com"));

        assertTrue(ex.getMessage().contains("expired"));
    }

    @Test
    @DisplayName("Part 4: Question expire operation advances to next question and sets new deadline")
    void testQuestionExpireAdvancesToNext() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy, q2Medium));

        CandidateQuestionTiming q1Timing = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(LocalDateTime.now().minusSeconds(31))
                .deadline(LocalDateTime.now().minusSeconds(1))
                .isExpired(false)
                .build();

        when(candidateQuestionTimingRepository.findByEnrollmentIdAndQuestionIdForUpdate(100L, q1Easy.getId()))
                .thenReturn(Optional.of(q1Timing));
        when(candidateQuestionTimingRepository.findByEnrollmentIdAndQuestionIdForUpdate(100L, q2Medium.getId()))
                .thenReturn(Optional.empty());

        QuestionExpireResponse res = candidateService.expireQuestion(100L, q1Easy.getId(), "candidate@example.com");

        assertNotNull(res);
        assertEquals(q1Easy.getId(), res.getExpiredQuestionId());
        assertNotNull(res.getNextQuestionId());
        assertFalse(res.getIsExamCompleted());
        assertNotNull(res.getNextQuestionDeadline());
        assertTrue(res.getNextQuestionRemainingSeconds() > 0);
        assertTrue(q1Timing.isExpired());
    }

    @Test
    @DisplayName("Part 4: Last question expiration flags exam as completed")
    void testLastQuestionExpireCompletesExam() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy));

        CandidateQuestionTiming q1Timing = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(LocalDateTime.now().minusSeconds(31))
                .deadline(LocalDateTime.now().minusSeconds(1))
                .isExpired(false)
                .build();

        when(candidateQuestionTimingRepository.findByEnrollmentIdAndQuestionIdForUpdate(100L, q1Easy.getId()))
                .thenReturn(Optional.of(q1Timing));

        QuestionExpireResponse res = candidateService.expireQuestion(100L, q1Easy.getId(), "candidate@example.com");

        assertNotNull(res);
        assertEquals(q1Easy.getId(), res.getExpiredQuestionId());
        assertNull(res.getNextQuestionId());
        assertTrue(res.getIsExamCompleted());
    }

    @Test
    @DisplayName("Part 9: Critical Scenario — Q1(30s) -> Q2(60s) -> Q3(90s) sequential timing lifecycle")
    void testCriticalScenarioQ1Q2Q3Lifecycle() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy, q2Medium, q3Hard));

        // Q1 is active: 30s
        LocalDateTime q1Start = LocalDateTime.now();
        CandidateQuestionTiming q1Timing = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(q1Start)
                .deadline(q1Start.plusSeconds(30))
                .isExpired(false)
                .build();
        when(candidateQuestionTimingRepository.findByEnrollmentIdAndQuestionIdForUpdate(100L, q1Easy.getId()))
                .thenReturn(Optional.of(q1Timing));

        // 1. Q1 expires after 30s
        QuestionExpireResponse expireQ1 = candidateService.expireQuestion(100L, q1Easy.getId(), "candidate@example.com");
        assertTrue(q1Timing.isExpired());
        assertNotNull(expireQ1.getNextQuestionId());
        assertFalse(expireQ1.getIsExamCompleted());

        // 2. Q2 receives 60s
        assertEquals(60, candidateService.resolveQuestionDurationSeconds(q2Medium, exam));

        // 3. Q3 receives 90s
        assertEquals(90, candidateService.resolveQuestionDurationSeconds(q3Hard, exam));
    }

    @Test
    @DisplayName("Candidate enrollment ownership check blocks unauthorized candidate")
    void testEnrollmentOwnershipEnforced() {
        when(enrollmentRepository.findById(100L)).thenReturn(Optional.of(enrollment));

        assertThrows(ForbiddenException.class, () ->
                candidateService.getExamQuestions(100L, "intruder@example.com", "desktop", ""));
    }

    @Test
    @DisplayName("Overall personalEndTime hard ceiling takes absolute precedence")
    void testPersonalEndTimePrecedence() {
        // Exam enrollment whose personalEndTime is in the past
        enrollment.setPersonalEndTime(LocalDateTime.now().minusMinutes(2));
        when(enrollmentRepository.findById(100L)).thenReturn(Optional.of(enrollment));

        assertThrows(BadRequestException.class, () ->
                candidateService.getExamQuestions(100L, "candidate@example.com", "desktop", ""));
    }

    @Test
    @DisplayName("P1.1 Exam Integrity: saveProgress rejects answers for unstarted questions in PER_QUESTION mode")
    void testSaveProgressUnstartedQuestionRejectedInPerQuestionMode() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy, q2Medium, q3Hard));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        // Only Q1 has a timing record (Q2 is unstarted)
        LocalDateTime now = LocalDateTime.now();
        CandidateQuestionTiming q1Timing = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(now)
                .deadline(now.plusSeconds(30))
                .isExpired(false)
                .build();
        when(candidateQuestionTimingRepository.findByEnrollmentId(100L)).thenReturn(List.of(q1Timing));

        // Candidate attempts to submit answer for unstarted Q2
        SubmitExamRequest req = new SubmitExamRequest();
        req.setAnswers(Map.of(q2Medium.getId(), "Option B"));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.saveProgress(100L, req, "candidate@example.com"));

        assertTrue(ex.getMessage().contains("has not started yet"));
        assertTrue(ex.getMessage().contains("In per-question mode, questions must be answered sequentially."));
    }

    @Test
    @DisplayName("P1.1 Exam Integrity: saveProgress accepts answers for currently active question in PER_QUESTION mode")
    void testSaveProgressActiveQuestionAccepted() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy, q2Medium, q3Hard));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        LocalDateTime now = LocalDateTime.now();
        CandidateQuestionTiming q1Timing = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(now)
                .deadline(now.plusSeconds(30))
                .isExpired(false)
                .build();
        when(candidateQuestionTimingRepository.findByEnrollmentId(100L)).thenReturn(List.of(q1Timing));

        SubmitExamRequest req = new SubmitExamRequest();
        req.setAnswers(Map.of(q1Easy.getId(), "Option A"));

        assertDoesNotThrow(() -> candidateService.saveProgress(100L, req, "candidate@example.com"));
        verify(candidateAnswerRepository).saveAll(any());
    }

    @Test
    @DisplayName("P1.1 Exam Integrity: saveProgress rejects modification of expired question answers in PER_QUESTION mode")
    void testSaveProgressExpiredQuestionModifiedRejected() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy, q2Medium, q3Hard));

        CandidateAnswer existingAnswer = CandidateAnswer.builder()
                .id(50L)
                .enrollment(enrollment)
                .question(q1Easy)
                .candidateAnswer("Old Answer")
                .build();
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(List.of(existingAnswer));

        LocalDateTime past = LocalDateTime.now().minusSeconds(10);
        CandidateQuestionTiming q1Timing = CandidateQuestionTiming.builder()
                .id(1L)
                .enrollment(enrollment)
                .question(q1Easy)
                .startedAt(past.minusSeconds(30))
                .deadline(past)
                .isExpired(true)
                .build();
        when(candidateQuestionTimingRepository.findByEnrollmentId(100L)).thenReturn(List.of(q1Timing));

        SubmitExamRequest req = new SubmitExamRequest();
        req.setAnswers(Map.of(q1Easy.getId(), "Modified Answer"));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.saveProgress(100L, req, "candidate@example.com"));

        assertTrue(ex.getMessage().contains("time has expired. Answers can no longer be modified."));
    }

    @Test
    @DisplayName("P1.1 Exam Integrity: saveProgress in WHOLE_EXAM mode allows any question navigation/answering")
    void testSaveProgressWholeExamModeAllowsAnyQuestion() {
        exam.setTimerType(TimerType.WHOLE_EXAM);
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(q1Easy, q2Medium, q3Hard));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        SubmitExamRequest req = new SubmitExamRequest();
        req.setAnswers(Map.of(q2Medium.getId(), "Any Option"));

        assertDoesNotThrow(() -> candidateService.saveProgress(100L, req, "candidate@example.com"));
        verify(candidateAnswerRepository).saveAll(any());
    }
}
