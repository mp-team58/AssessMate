package com.assessmate.service;

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
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateServiceAutosaveDeadlineTest {

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

    private CandidateService candidateService;

    private User candidate;
    private Exam exam;
    private ExamEnrollment enrollment;
    private Question question1;
    private SubmitExamRequest submitRequest;

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

        candidate = User.builder()
                .id(1L)
                .email("candidate@example.com")
                .role(Role.CANDIDATE)
                .build();

        exam = Exam.builder()
                .id(10L)
                .title("Java Fundamentals")
                .status(ExamStatus.LIVE)
                .easyMark(1.0)
                .mediumMark(2.0)
                .hardMark(3.0)
                .build();

        question1 = Question.builder()
                .id(101L)
                .exam(exam)
                .type(QuestionType.SINGLE_CHOICE)
                .questionText("What is Java?")
                .correctAnswer("A programming language")
                .difficulty(Difficulty.EASY)
                .build();

        enrollment = ExamEnrollment.builder()
                .id(100L)
                .exam(exam)
                .candidate(candidate)
                .status(EnrollmentStatus.ONGOING)
                .joinedAt(LocalDateTime.now().minusMinutes(30))
                .personalEndTime(LocalDateTime.now().plusMinutes(30))
                .build();

        submitRequest = new SubmitExamRequest();
        Map<Long, String> answers = new HashMap<>();
        answers.put(101L, "A programming language");
        submitRequest.setAnswers(answers);
    }

    @Test
    @DisplayName("1. Autosave before deadline is accepted and saves answers")
    void autosaveBeforeDeadline_Accepted() {
        enrollment.setPersonalEndTime(LocalDateTime.now().plusMinutes(15));
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(question1));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> candidateService.saveProgress(100L, submitRequest, "candidate@example.com"));

        verify(candidateAnswerRepository, times(1)).saveAll(any());
    }

    @Test
    @DisplayName("2. Autosave within 30-second grace period is accepted (consistent with submitExam)")
    void autosaveWithinGracePeriod_Accepted() {
        // Deadline passed 10 seconds ago, still within 30s grace window
        enrollment.setPersonalEndTime(LocalDateTime.now().minusSeconds(10));
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(question1));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> candidateService.saveProgress(100L, submitRequest, "candidate@example.com"));

        verify(candidateAnswerRepository, times(1)).saveAll(any());
    }

    @Test
    @DisplayName("3. Autosave after deadline plus grace period is rejected with BadRequestException")
    void autosaveAfterGracePeriod_Rejected() {
        // Deadline passed 35 seconds ago (grace period expired)
        enrollment.setPersonalEndTime(LocalDateTime.now().minusSeconds(35));
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.saveProgress(100L, submitRequest, "candidate@example.com"));

        assertTrue(ex.getMessage().contains("expired"), "Exception message should indicate expiration");
        verify(candidateAnswerRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("4. Autosave when enrollment is not in ONGOING status is rejected")
    void autosaveWhenNotOngoing_Rejected() {
        enrollment.setStatus(EnrollmentStatus.SUBMITTED);
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                candidateService.saveProgress(100L, submitRequest, "candidate@example.com"));

        assertEquals("This exam is no longer open for submission.", ex.getMessage());
        verify(candidateAnswerRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("5. Expired autosave does not modify previously saved answers")
    void expiredAutosaveDoesNotModifyPreviouslySavedAnswers() {
        enrollment.setPersonalEndTime(LocalDateTime.now().minusSeconds(60));
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));

        assertThrows(BadRequestException.class, () ->
                candidateService.saveProgress(100L, submitRequest, "candidate@example.com"));

        verify(candidateAnswerRepository, never()).saveAll(any());
        verify(candidateAnswerRepository, never()).deleteByEnrollmentId(any());
        verify(candidateAnswerRepository, never()).save(any());
    }

    @Test
    @DisplayName("6. Normal exam submission still works")
    void normalExamSubmissionStillWorks() {
        enrollment.setPersonalEndTime(LocalDateTime.now().plusMinutes(10));
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(resultRepository.findByEnrollmentId(100L)).thenReturn(Optional.empty());
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(question1));
        when(codingQuestionRepository.findByExamId(10L)).thenReturn(Collections.emptyList());
        when(codeSubmissionRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> candidateService.submitExam(100L, submitRequest, "candidate@example.com"));

        assertEquals(EnrollmentStatus.SUBMITTED, enrollment.getStatus());
        verify(candidateAnswerRepository, times(1)).saveAll(any());
        verify(resultRepository, atLeastOnce()).save(any());
    }

    @Test
    @DisplayName("7. Autosave with null personalEndTime is accepted (consistent with existing logic)")
    void autosaveWithNullPersonalEndTime_Accepted() {
        enrollment.setPersonalEndTime(null);
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(question1));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> candidateService.saveProgress(100L, submitRequest, "candidate@example.com"));

        verify(candidateAnswerRepository, times(1)).saveAll(any());
    }

    @Test
    @DisplayName("8. autosaveExamAnswers alias delegates properly to saveProgress")
    void autosaveExamAnswersAlias_WorksIdentically() {
        enrollment.setPersonalEndTime(LocalDateTime.now().plusMinutes(15));
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));
        when(questionRepository.findByExamId(10L)).thenReturn(List.of(question1));
        when(candidateAnswerRepository.findByEnrollmentId(100L)).thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> candidateService.autosaveExamAnswers(100L, submitRequest, "candidate@example.com"));

        verify(candidateAnswerRepository, times(1)).saveAll(any());
    }

    @Test
    @DisplayName("9. Autosave by unauthorized candidate is forbidden")
    void autosaveUnauthorizedCandidate_Forbidden() {
        when(enrollmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(enrollment));

        assertThrows(ForbiddenException.class, () ->
                candidateService.saveProgress(100L, submitRequest, "attacker@example.com"));

        verify(candidateAnswerRepository, never()).saveAll(any());
    }
}
