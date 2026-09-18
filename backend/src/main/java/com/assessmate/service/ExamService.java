package com.assessmate.service;

import com.assessmate.dto.ExamRequest;
import com.assessmate.dto.ExamResponse;
import com.assessmate.entity.*;
import com.assessmate.entity.Difficulty;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.CodingQuestionRepository;
import com.assessmate.repository.ExamRepository;
import com.assessmate.repository.QuestionRepository;
import com.assessmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final CodingQuestionRepository codingQuestionRepository;

    // Create Exam
    public ExamResponse createExam(ExamRequest req, String hostEmail) {

        // Validate difficulty adds to 100
        int total = req.getEasyPercent()
                + req.getMediumPercent()
                + req.getHardPercent();
        if (total != 100) {
            throw new BadRequestException(
                    "Difficulty percentages must add up to 100. Current total: " + total
            );
        }

        // Validate scheduledStart is in future
        if (req.getScheduledStart().isBefore(LocalDateTime.now())) {
            throw new BadRequestException(
                    "Scheduled start time must be in the future"
            );
        }

        // Validate duration for WHOLE_EXAM
        if (req.getTimerType() == TimerType.WHOLE_EXAM
                && req.getDurationMinutes() == null) {
            throw new BadRequestException(
                    "Duration in minutes is required for whole exam timer"
            );
        }

        // Validate coding section fields
        if (Boolean.TRUE.equals(req.getHasCodingSection())) {
            if (req.getCodingQuestionsCount() == null || req.getCodingQuestionsCount() < 1) {
                throw new BadRequestException(
                        "Coding questions count must be at least 1 when coding section is enabled."
                );
            }
        }

        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Host not found"));

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
                .hasCodingSection(
                        req.getHasCodingSection() != null
                                ? req.getHasCodingSection() : false)
                .codingDurationMinutes(req.getCodingDurationMinutes())
                .codingQuestionsCount(req.getCodingQuestionsCount())
                .status(ExamStatus.DRAFT)
                .build();

        return mapToResponse(examRepository.save(exam));
    }

    // Get all exams by host
    public List<ExamResponse> getMyExams(String hostEmail) {
        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Host not found"));
        return examRepository.findByHostId(host.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Get single exam by ID
    public ExamResponse getExamById(Long id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        return mapToResponse(exam);
    }

    // Publish exam
    @Transactional
    public ExamResponse publishExam(Long id, String hostEmail) {
        Exam exam = findExamForHost(id, hostEmail);

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT exams can be published.");
        }

        // Validate MCQ questions
        validateMcqQuestions(exam);

        // Validate coding section if enabled
        validateCodingSection(exam);

        // Validate no unverified questions
        long unverifiedCount = questionRepository.countByExamIdAndIsVerifiedFalse(exam.getId());
        if (unverifiedCount > 0) {
            throw new BadRequestException(
                    unverifiedCount + " question(s) are not verified. Please verify all questions before publishing."
            );
        }

        exam.setStatus(ExamStatus.LIVE);
        exam.setStartedAt(LocalDateTime.now());
        return mapToResponse(examRepository.save(exam));
    }

    // End exam
    public ExamResponse endExam(Long id, String hostEmail) {
        Exam exam = findExamForHost(id, hostEmail);
        if (exam.getStatus() != ExamStatus.LIVE) {
            throw new BadRequestException("Only LIVE exams can be ended.");
        }
        exam.setStatus(ExamStatus.ENDED);
        exam.setEndedAt(LocalDateTime.now());
        return mapToResponse(examRepository.save(exam));
    }

    // Delete exam
    public void deleteExam(Long id, String hostEmail) {
        Exam exam = findExamForHost(id, hostEmail);
        examRepository.delete(exam);
    }

    // Find exam and verify host ownership
    private Exam findExamForHost(Long id, String hostEmail) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found."));
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("Not authorized to modify this exam.");
        }
        return exam;
    }

    // Validate MCQ requirements
    private void validateMcqQuestions(Exam exam) {
        int total = exam.getTotalQuestions();
        int easyRequired = (int) (total * exam.getEasyPercent() / 100.0);
        int mediumRequired = (int) (total * exam.getMediumPercent() / 100.0);
        int hardRequired = total - easyRequired - mediumRequired;

        long easyCount = questionRepository.countByExamIdAndDifficulty(exam.getId(), Difficulty.EASY);
        long mediumCount = questionRepository.countByExamIdAndDifficulty(exam.getId(), Difficulty.MEDIUM);
        long hardCount = questionRepository.countByExamIdAndDifficulty(exam.getId(), Difficulty.HARD);

        if (easyCount < easyRequired) {
            throw new BadRequestException("Need " + (easyRequired - easyCount) + " more Easy questions.");
        }
        if (mediumCount < mediumRequired) {
            throw new BadRequestException("Need " + (mediumRequired - mediumCount) + " more Medium questions.");
        }
        if (hardCount < hardRequired) {
            throw new BadRequestException("Need " + (hardRequired - hardCount) + " more Hard questions.");
        }

        long totalCount = easyCount + mediumCount + hardCount;
        if (totalCount != total) {
            throw new BadRequestException(
                    "Exactly " + total + " questions required. Currently have " + totalCount + "."
            );
        }
    }

    // Validate Coding section pool size
    private void validateCodingSection(Exam exam) {
        if (!Boolean.TRUE.equals(exam.getHasCodingSection())) {
            return;
        }

        Integer requested = exam.getCodingQuestionsCount();
        if (requested == null || requested < 1) {
            throw new BadRequestException("Coding questions count must be set when coding section is enabled.");
        }

        long poolSize = codingQuestionRepository.countByExamId(exam.getId());
        if (poolSize < requested) {
            throw new BadRequestException(
                    "Coding section requires at least " + requested
                            + " problems in the pool. Currently have " + poolSize + "."
            );
        }
    }

    // Generate unique 6 digit join code
    private String generateUniqueJoinCode() {
        String code;
        do {
            code = String.valueOf(100000 + new Random().nextInt(900000));
        } while (examRepository.findByJoinCode(code).isPresent());
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
                .hasCodingSection(exam.getHasCodingSection())
                .codingDurationMinutes(exam.getCodingDurationMinutes())
                .codingQuestionsCount(exam.getCodingQuestionsCount())
                .joinCode(exam.getJoinCode())
                .status(exam.getStatus())
                .createdAt(exam.getCreatedAt())
                .startedAt(exam.getStartedAt())
                .endedAt(exam.getEndedAt())
                .build();
    }
}