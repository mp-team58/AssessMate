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
import com.assessmate.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamService {

    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final CodingQuestionRepository codingQuestionRepository;
    private final TestCaseRepository testCaseRepository;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    @Transactional
    public ExamResponse createExam(ExamRequest req, String hostEmail) {

        int total = req.getEasyPercent() + req.getMediumPercent() + req.getHardPercent();
        if (total != 100) {
            throw new BadRequestException("Difficulty percentages must add up to 100. Current total: " + total);
        }

        if (req.getScheduledStart().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Scheduled start time must be in the future");
        }

        if (req.getTimerType() == TimerType.WHOLE_EXAM && req.getDurationMinutes() == null) {
            throw new BadRequestException("Duration in minutes is required for whole exam timer");
        }

        if (Boolean.TRUE.equals(req.getHasCodingSection())) {
            if (req.getCodingQuestionsCount() == null || req.getCodingQuestionsCount() < 1) {
                throw new BadRequestException("Coding questions count must be at least 1 when coding section is enabled.");
            }
        }

        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Host not found"));

        Exam exam = Exam.builder()
                .host(host)
                .title(req.getTitle())
                .subject(req.getSubject())
                .scheduledStart(req.getScheduledStart())
                .gracePeriodMinutes(req.getGracePeriodMinutes() != null ? req.getGracePeriodMinutes() : 10)
                .timerType(req.getTimerType() != null ? req.getTimerType() : TimerType.WHOLE_EXAM)
                .durationMinutes(req.getDurationMinutes())
                .totalQuestions(req.getTotalQuestions())
                .easyPercent(req.getEasyPercent())
                .mediumPercent(req.getMediumPercent())
                .hardPercent(req.getHardPercent())
                .easyMark(req.getEasyMark() != null ? req.getEasyMark() : 1.0)
                .mediumMark(req.getMediumMark() != null ? req.getMediumMark() : 2.0)
                .hardMark(req.getHardMark() != null ? req.getHardMark() : 3.0)
                .easyNegative(req.getEasyNegative() != null ? req.getEasyNegative() : 0.25)
                .mediumNegative(req.getMediumNegative() != null ? req.getMediumNegative() : 0.50)
                .hardNegative(req.getHardNegative() != null ? req.getHardNegative() : 1.00)
                .easySeconds(req.getEasySeconds() != null ? req.getEasySeconds() : 30)
                .mediumSeconds(req.getMediumSeconds() != null ? req.getMediumSeconds() : 60)
                .hardSeconds(req.getHardSeconds() != null ? req.getHardSeconds() : 90)
                .negativeMark(req.getNegativeMark() != null ? req.getNegativeMark() : false)
                .deviceAccess(req.getDeviceAccess() != null ? req.getDeviceAccess() : DeviceAccess.BOTH)
                .joinCode(generateUniqueJoinCode())
                .hasCodingSection(req.getHasCodingSection() != null ? req.getHasCodingSection() : false)
                .codingDurationMinutes(req.getCodingDurationMinutes())
                .codingQuestionsCount(req.getCodingQuestionsCount())
                .passingPercentage(req.getPassingPercentage() != null ? req.getPassingPercentage() : 50.0)
                .status(ExamStatus.DRAFT)
                .build();

        return mapToResponse(examRepository.save(exam));
    }

    @Transactional
    public ExamResponse updateExam(Long id, ExamRequest req, String hostEmail) {
        Exam exam = findExamForHost(id, hostEmail);

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT exams can be edited.");
        }

        int total = req.getEasyPercent() + req.getMediumPercent() + req.getHardPercent();
        if (total != 100) {
            throw new BadRequestException("Difficulty percentages must add up to 100. Current total: " + total);
        }

        if (req.getScheduledStart().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Scheduled start time must be in the future");
        }

        if (req.getTimerType() == TimerType.WHOLE_EXAM && req.getDurationMinutes() == null) {
            throw new BadRequestException("Duration in minutes is required for whole exam timer");
        }

        if (Boolean.TRUE.equals(req.getHasCodingSection())) {
            if (req.getCodingQuestionsCount() == null || req.getCodingQuestionsCount() < 1) {
                throw new BadRequestException("Coding questions count must be at least 1 when coding section is enabled.");
            }
        }

        exam.setTitle(req.getTitle());
        exam.setSubject(req.getSubject());
        exam.setScheduledStart(req.getScheduledStart());
        exam.setGracePeriodMinutes(req.getGracePeriodMinutes() != null ? req.getGracePeriodMinutes() : 10);
        exam.setTimerType(req.getTimerType() != null ? req.getTimerType() : TimerType.WHOLE_EXAM);
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setTotalQuestions(req.getTotalQuestions());
        exam.setEasyPercent(req.getEasyPercent());
        exam.setMediumPercent(req.getMediumPercent());
        exam.setHardPercent(req.getHardPercent());
        exam.setEasyMark(req.getEasyMark() != null ? req.getEasyMark() : 1.0);
        exam.setMediumMark(req.getMediumMark() != null ? req.getMediumMark() : 2.0);
        exam.setHardMark(req.getHardMark() != null ? req.getHardMark() : 3.0);
        exam.setEasyNegative(req.getEasyNegative() != null ? req.getEasyNegative() : 0.25);
        exam.setMediumNegative(req.getMediumNegative() != null ? req.getMediumNegative() : 0.50);
        exam.setHardNegative(req.getHardNegative() != null ? req.getHardNegative() : 1.00);
        exam.setEasySeconds(req.getEasySeconds() != null ? req.getEasySeconds() : 30);
        exam.setMediumSeconds(req.getMediumSeconds() != null ? req.getMediumSeconds() : 60);
        exam.setHardSeconds(req.getHardSeconds() != null ? req.getHardSeconds() : 90);
        exam.setNegativeMark(req.getNegativeMark() != null ? req.getNegativeMark() : false);
        exam.setDeviceAccess(req.getDeviceAccess() != null ? req.getDeviceAccess() : DeviceAccess.BOTH);
        exam.setHasCodingSection(req.getHasCodingSection() != null ? req.getHasCodingSection() : false);
        exam.setCodingDurationMinutes(req.getCodingDurationMinutes());
        exam.setCodingQuestionsCount(req.getCodingQuestionsCount());
        exam.setPassingPercentage(req.getPassingPercentage() != null ? req.getPassingPercentage() : 50.0);

        return mapToResponse(examRepository.save(exam));
    }


    public List<ExamResponse> getMyExams(String hostEmail) {
        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Host not found"));
        return examRepository.findByHostId(host.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExamResponse getExamById(Long id, String hostEmail) {
        Exam exam = examRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Exam not found."));
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("Not authorized to view this exam.");
        }
        return mapToResponse(exam);
    }

    @Transactional
    public ExamResponse publishExam(Long id, String hostEmail) {
        Exam exam = findExamForHost(id, hostEmail);

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT exams can be published.");
        }

        validateMcqQuestions(exam);
        validateCodingSection(exam);

        long unverifiedCount = questionRepository.countByExamIdAndIsVerifiedFalse(exam.getId());
        if (unverifiedCount > 0) {
            throw new BadRequestException(unverifiedCount + " question(s) are not verified. Please verify all questions before publishing.");
        }

        exam.setStatus(ExamStatus.LIVE);
        exam.setStartedAt(LocalDateTime.now());
        return mapToResponse(examRepository.save(exam));
    }

    @Transactional
    public ExamResponse endExam(Long id, String hostEmail) {
        Exam exam = findExamForHost(id, hostEmail);
        if (exam.getStatus() != ExamStatus.LIVE) {
            throw new BadRequestException("Only LIVE exams can be ended.");
        }
        exam.setStatus(ExamStatus.ENDED);
        exam.setEndedAt(LocalDateTime.now());
        return mapToResponse(examRepository.save(exam));
    }

    @Transactional
    public void deleteExam(Long id, String hostEmail) {
        Exam exam = examRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Exam not found."));

        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("Not authorized to delete this exam.");
        }

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT exams can be deleted.");
        }

        List<Question> questions = questionRepository.findByExamId(id);

        for (Question q : questions) {
            if (q.getImageUrl() != null) {
                deleteImageFile(q.getImageUrl());
            }
        }

        questionRepository.deleteByExamId(id);

        codingQuestionRepository.findByExamId(id).forEach(cq -> {
            testCaseRepository.deleteAll(testCaseRepository.findByCodingQuestionId(cq.getId()));
        });
        codingQuestionRepository.deleteByExamId(id);

        examRepository.delete(exam);
    }

    private void deleteImageFile(String imageUrl) {
        try {
            String filename = imageUrl.replace("/uploads/questions/", "");
            Path filePath = Paths.get("uploads/questions/", filename);
            Files.deleteIfExists(filePath);
        } catch (Exception e) {
            log.warn("Could not delete image file: {}", imageUrl);
        }
    }

    private Exam findExamForHost(Long id, String hostEmail) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found."));
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("Not authorized to modify this exam.");
        }
        return exam;
    }

    private void validateMcqQuestions(Exam exam) {
        int total = exam.getTotalQuestions();
        int[] required = calculateRequiredCounts(total, exam.getEasyPercent(), exam.getMediumPercent());
        int easyRequired = required[0];
        int mediumRequired = required[1];
        int hardRequired = required[2];

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
            throw new BadRequestException("Exactly " + total + " questions required. Currently have " + totalCount + ".");
        }
    }

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
            throw new BadRequestException("Coding section requires at least " + requested + " problems in the pool. Currently have " + poolSize + ".");
        }
    }

    private String generateUniqueJoinCode() {
        int maxAttempts = 5;
        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            StringBuilder code = new StringBuilder(8);
            for (int i = 0; i < 8; i++) {
                code.append(JOIN_CODE_CHARS.charAt(SECURE_RANDOM.nextInt(JOIN_CODE_CHARS.length())));
            }
            String generated = code.toString();
            if (!examRepository.findByJoinCode(generated).isPresent()) {
                return generated;
            }
        }
        throw new RuntimeException("Could not generate unique join code. Please try again.");
    }

    public static int[] calculateRequiredCounts(int total, int easyPct, int mediumPct) {
        int easy = (int) (total * easyPct / 100.0);
        int medium = (int) (total * mediumPct / 100.0);
        int hard = total - easy - medium;
        return new int[]{easy, medium, hard};
    }

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
                .passingPercentage(exam.getPassingPercentage())
                .joinCode(exam.getJoinCode())
                .status(exam.getStatus())
                .createdAt(exam.getCreatedAt())
                .startedAt(exam.getStartedAt())
                .endedAt(exam.getEndedAt())
                .build();
    }
}