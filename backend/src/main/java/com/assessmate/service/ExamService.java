package com.assessmate.service;

import com.assessmate.dto.ExamRequest;
import com.assessmate.dto.ExamResponse;
import com.assessmate.entity.*;
import com.assessmate.repository.ExamRepository;
import com.assessmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;
    private final UserRepository userRepository;

    // Create Exam
    public ExamResponse createExam(
            ExamRequest req, String hostEmail) {

        // Validate difficulty adds to 100
        int total = req.getEasyPercent()
                + req.getMediumPercent()
                + req.getHardPercent();
        if (total != 100) {
            throw new RuntimeException(
                    "Difficulty percentages must add up to 100. " +
                            "Current total: " + total
            );
        }

        // Validate scheduledStart is in future
        if (req.getScheduledStart()
                .isBefore(LocalDateTime.now())) {
            throw new RuntimeException(
                    "Scheduled start time must be in the future"
            );
        }

        // Validate duration for WHOLE_EXAM
        if (req.getTimerType() == TimerType.WHOLE_EXAM
                && req.getDurationMinutes() == null) {
            throw new RuntimeException(
                    "Duration in minutes is required " +
                            "for whole exam timer"
            );
        }

        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() ->
                        new RuntimeException("Host not found")
                );

        Exam exam = Exam.builder()
                .host(host)
                .title(req.getTitle())
                .subject(req.getSubject())
                .scheduledStart(req.getScheduledStart())
                .gracePeriodMinutes(
                        req.getGracePeriodMinutes() != null
                                ? req.getGracePeriodMinutes() : 10)
                .timerType(
                        req.getTimerType() != null
                                ? req.getTimerType() : TimerType.WHOLE_EXAM)
                .durationMinutes(req.getDurationMinutes())
                .totalQuestions(req.getTotalQuestions())
                .easyPercent(req.getEasyPercent())
                .mediumPercent(req.getMediumPercent())
                .hardPercent(req.getHardPercent())
                .easyMark(
                        req.getEasyMark() != null
                                ? req.getEasyMark() : 1.0)
                .mediumMark(
                        req.getMediumMark() != null
                                ? req.getMediumMark() : 2.0)
                .hardMark(
                        req.getHardMark() != null
                                ? req.getHardMark() : 3.0)
                .easyNegative(
                        req.getEasyNegative() != null
                                ? req.getEasyNegative() : 0.25)
                .mediumNegative(
                        req.getMediumNegative() != null
                                ? req.getMediumNegative() : 0.50)
                .hardNegative(
                        req.getHardNegative() != null
                                ? req.getHardNegative() : 1.00)
                .easySeconds(
                        req.getEasySeconds() != null
                                ? req.getEasySeconds() : 30)
                .mediumSeconds(
                        req.getMediumSeconds() != null
                                ? req.getMediumSeconds() : 60)
                .hardSeconds(
                        req.getHardSeconds() != null
                                ? req.getHardSeconds() : 90)
                .negativeMark(
                        req.getNegativeMark() != null
                                ? req.getNegativeMark() : false)
                .deviceAccess(
                        req.getDeviceAccess() != null
                                ? req.getDeviceAccess() : DeviceAccess.BOTH)
                .joinCode(generateUniqueJoinCode())
                .status(ExamStatus.DRAFT)
                .build();

        return mapToResponse(examRepository.save(exam));
    }

    // Get all exams by host
    public List<ExamResponse> getMyExams(String hostEmail) {
        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() ->
                        new RuntimeException("Host not found")
                );
        return examRepository.findByHostId(host.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Get single exam by ID
    public ExamResponse getExamById(Long id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Exam not found")
                );
        return mapToResponse(exam);
    }

    // Publish exam
    public ExamResponse publishExam(
            Long id, String hostEmail) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Exam not found")
                );
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new RuntimeException(
                    "Not authorized to publish this exam"
            );
        }
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new RuntimeException(
                    "Only DRAFT exams can be published"
            );
        }
        exam.setStatus(ExamStatus.LIVE);
        exam.setStartedAt(LocalDateTime.now());
        return mapToResponse(examRepository.save(exam));
    }

    // End exam
    public ExamResponse endExam(
            Long id, String hostEmail) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Exam not found")
                );
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new RuntimeException(
                    "Not authorized to end this exam"
            );
        }
        if (exam.getStatus() != ExamStatus.LIVE) {
            throw new RuntimeException(
                    "Only LIVE exams can be ended"
            );
        }
        exam.setStatus(ExamStatus.ENDED);
        exam.setEndedAt(LocalDateTime.now());
        return mapToResponse(examRepository.save(exam));
    }

    // Delete exam
    public void deleteExam(Long id, String hostEmail) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Exam not found")
                );
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new RuntimeException(
                    "Not authorized to delete this exam"
            );
        }
        examRepository.delete(exam);
    }

    // Generate unique 6 digit join code
    private String generateUniqueJoinCode() {
        String code;
        do {
            code = String.valueOf(
                    100000 + new Random().nextInt(900000)
            );
        } while (
                examRepository.findByJoinCode(code).isPresent()
        );
        return code;
    }

    // Map Exam to ExamResponse
    public ExamResponse mapToResponse(Exam exam) {
        return ExamResponse.builder()
                .id(exam.getId())
                .hostName(exam.getHost().getName())
                .title(exam.getTitle())
                .subject(exam.getSubject())
                .scheduledStart(exam.getScheduledStart())
                .gracePeriodMinutes(exam.getGracePeriodMinutes())
                .timerType(exam.getTimerType())
                .durationMinutes(exam.getDurationMinutes())
                .totalQuestions(exam.getTotalQuestions())
                .easyPercent(exam.getEasyPercent())
                .mediumPercent(exam.getMediumPercent())
                .hardPercent(exam.getHardPercent())
                .easyMark(exam.getEasyMark())
                .mediumMark(exam.getMediumMark())
                .hardMark(exam.getHardMark())
                .easyNegative(exam.getEasyNegative())
                .mediumNegative(exam.getMediumNegative())
                .hardNegative(exam.getHardNegative())
                .easySeconds(exam.getEasySeconds())
                .mediumSeconds(exam.getMediumSeconds())
                .hardSeconds(exam.getHardSeconds())
                .negativeMark(exam.getNegativeMark())
                .deviceAccess(exam.getDeviceAccess())
                .joinCode(exam.getJoinCode())
                .status(exam.getStatus())
                .createdAt(exam.getCreatedAt())
                .startedAt(exam.getStartedAt())
                .endedAt(exam.getEndedAt())
                .build();
    }
}