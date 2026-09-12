package com.assessmate.service;

import com.assessmate.dto.JoinExamResponse;
import com.assessmate.dto.CandidateExamQuestionsResponse;
import com.assessmate.dto.CandidateQuestionDTO;
import com.assessmate.entity.*;
import com.assessmate.repository.ExamEnrollmentRepository;
import com.assessmate.repository.ExamRepository;
import com.assessmate.repository.UserRepository;
import com.assessmate.repository.ProctoringLogRepository;
import com.assessmate.dto.ProctorEventRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final com.assessmate.repository.QuestionRepository questionRepository;
    private final ProctoringLogRepository proctoringLogRepository;

    public JoinExamResponse joinExam(String joinCode, String candidateEmail) {
        User candidate = userRepository.findByEmail(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));

        Exam exam = examRepository.findByJoinCode(joinCode)
                .orElseThrow(() -> new RuntimeException("Invalid join code"));

        if (exam.getStatus() != ExamStatus.LIVE) {
            throw new RuntimeException("This exam is not currently LIVE");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime scheduledStart = exam.getScheduledStart();
        int graceMinutes = exam.getGracePeriodMinutes() != null ? exam.getGracePeriodMinutes() : 0;
        LocalDateTime latestJoinTime = scheduledStart.plusMinutes(graceMinutes);

        if (now.isBefore(scheduledStart)) {
            throw new RuntimeException("Exam has not started yet. Please wait until " + scheduledStart);
        }

        if (now.isAfter(latestJoinTime)) {
            throw new RuntimeException("Grace period has ended. You cannot join this exam anymore.");
        }

        // Check if already enrolled
        ExamEnrollment enrollment = enrollmentRepository.findByExamAndCandidate(exam, candidate)
                .orElseGet(() -> {
                    ExamEnrollment newEnrollment = ExamEnrollment.builder()
                            .exam(exam)
                            .candidate(candidate)
                            .joinedAt(now)
                            .status(EnrollmentStatus.ONGOING)
                            .build();

                    if (exam.getTimerType() == TimerType.WHOLE_EXAM && exam.getDurationMinutes() != null) {
                        newEnrollment.setPersonalEndTime(now.plusMinutes(exam.getDurationMinutes()));
                    }

                    return enrollmentRepository.save(newEnrollment);
                });

        if (enrollment.getStatus() == EnrollmentStatus.SUBMITTED) {
            throw new RuntimeException("You have already submitted this exam.");
        }
        
        if (enrollment.getStatus() == EnrollmentStatus.EXPIRED) {
            throw new RuntimeException("Your time for this exam has expired.");
        }

        return JoinExamResponse.builder()
                .enrollmentId(enrollment.getId())
                .examId(exam.getId())
                .title(exam.getTitle())
                .subject(exam.getSubject())
                .timerType(exam.getTimerType())
                .durationMinutes(exam.getDurationMinutes())
                .totalQuestions(exam.getTotalQuestions())
                .hasCodingSection(exam.getHasCodingSection())
                .negativeMark(exam.getNegativeMark())
                .deviceAccess(exam.getDeviceAccess())
                .personalEndTime(enrollment.getPersonalEndTime())
                .instructions("Please read all questions carefully. Do not switch tabs. Your face must be visible at all times.")
                .build();
    }

    public CandidateExamQuestionsResponse getExamQuestions(Long enrollmentId, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new RuntimeException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new RuntimeException("You can only get questions for an ongoing exam.");
        }

        List<Question> examQuestions = questionRepository.findByExamId(enrollment.getExam().getId());

        List<CandidateQuestionDTO> candidateQuestions = new java.util.ArrayList<>(examQuestions.stream().map(q -> {
            List<CandidateQuestionDTO.OptionDTO> options = new java.util.ArrayList<>();
            if (q.getType() == QuestionType.SINGLE_CHOICE || q.getType() == QuestionType.MULTIPLE_SELECT) {
                if (q.getOptionA() != null && !q.getOptionA().trim().isEmpty()) {
                    options.add(CandidateQuestionDTO.OptionDTO.builder().key("A").value(q.getOptionA()).build());
                }
                if (q.getOptionB() != null && !q.getOptionB().trim().isEmpty()) {
                    options.add(CandidateQuestionDTO.OptionDTO.builder().key("B").value(q.getOptionB()).build());
                }
                if (q.getOptionC() != null && !q.getOptionC().trim().isEmpty()) {
                    options.add(CandidateQuestionDTO.OptionDTO.builder().key("C").value(q.getOptionC()).build());
                }
                if (q.getOptionD() != null && !q.getOptionD().trim().isEmpty()) {
                    options.add(CandidateQuestionDTO.OptionDTO.builder().key("D").value(q.getOptionD()).build());
                }
                java.util.Collections.shuffle(options);
            }

            return CandidateQuestionDTO.builder()
                    .id(q.getId())
                    .questionText(q.getQuestionText())
                    .imageUrl(q.getImageUrl())
                    .type(q.getType())
                    .marks(q.getMarks())
                    .negativeMarks(q.getNegativeMarks())
                    .timeSeconds(q.getTimeSeconds())
                    .options(options)
                    .build();
        }).toList());

        // Shuffle the questions randomly
        java.util.Collections.shuffle(candidateQuestions);

        return CandidateExamQuestionsResponse.builder()
                .questions(candidateQuestions)
                .personalEndTime(enrollment.getPersonalEndTime())
                .build();
    }

    public void logProctorEvent(ProctorEventRequest request, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findById(request.getEnrollmentId())
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new RuntimeException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new RuntimeException("You can only log events for an ongoing exam.");
        }

        LocalDateTime eventTime = request.getTimestamp() != null ? request.getTimestamp() : LocalDateTime.now();

        ProctoringLog log = ProctoringLog.builder()
                .enrollment(enrollment)
                .eventType(request.getEventType())
                .flaggedAt(eventTime)
                .build();

        proctoringLogRepository.save(log);
    }
}
