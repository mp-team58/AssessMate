package com.assessmate.service;

import com.assessmate.dto.JoinExamResponse;
import com.assessmate.entity.*;
import com.assessmate.repository.ExamEnrollmentRepository;
import com.assessmate.repository.ExamRepository;
import com.assessmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ExamEnrollmentRepository enrollmentRepository;

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
}
