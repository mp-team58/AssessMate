package com.assessmate.service;

import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;

import com.assessmate.dto.JoinExamResponse;
import com.assessmate.dto.CandidateExamQuestionsResponse;
import com.assessmate.dto.CandidateQuestionDTO;
import com.assessmate.entity.*;
import com.assessmate.repository.ExamEnrollmentRepository;
import com.assessmate.repository.ExamRepository;
import com.assessmate.repository.UserRepository;
import com.assessmate.repository.ProctoringLogRepository;
import com.assessmate.repository.CandidateAnswerRepository;
import com.assessmate.repository.ResultRepository;
import com.assessmate.dto.ProctorEventRequest;
import com.assessmate.dto.SubmitExamRequest;
import com.assessmate.dto.ResultResponseDTO;
import com.assessmate.dto.CandidateHistoryDTO;
import com.assessmate.dto.CandidateAnswerReviewDTO;
import com.assessmate.dto.QuestionExpireResponse;
import com.assessmate.repository.CandidateQuestionTimingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
@lombok.extern.slf4j.Slf4j
public class CandidateService {

    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final com.assessmate.repository.QuestionRepository questionRepository;
    private final ProctoringLogRepository proctoringLogRepository;
    private final CandidateAnswerRepository candidateAnswerRepository;
    private final ResultRepository resultRepository;
    private final GeminiService geminiService;
    private final org.springframework.transaction.PlatformTransactionManager transactionManager;
    private final com.assessmate.repository.CodingQuestionRepository codingQuestionRepository;
    private final com.assessmate.repository.CodeSubmissionRepository codeSubmissionRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.assessmate.security.JoinCodeRateLimiterService joinCodeRateLimiterService;

    public void setJoinCodeRateLimiterService(com.assessmate.security.JoinCodeRateLimiterService joinCodeRateLimiterService) {
        this.joinCodeRateLimiterService = joinCodeRateLimiterService;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CandidateQuestionTimingRepository candidateQuestionTimingRepository;

    public void setCandidateQuestionTimingRepository(CandidateQuestionTimingRepository candidateQuestionTimingRepository) {
        this.candidateQuestionTimingRepository = candidateQuestionTimingRepository;
    }

    public int resolveQuestionDurationSeconds(Question q, Exam exam) {
        if (q.getTimeSeconds() != null && q.getTimeSeconds() > 0) {
            return q.getTimeSeconds();
        }
        Integer fallback = null;
        if (q.getDifficulty() == Difficulty.EASY) {
            fallback = exam.getEasySeconds();
        } else if (q.getDifficulty() == Difficulty.HARD) {
            fallback = exam.getHardSeconds();
        } else {
            fallback = exam.getMediumSeconds();
        }
        if (fallback == null || fallback <= 0) {
            if (exam.getTimerType() == TimerType.PER_QUESTION) {
                throw new BadRequestException("Invalid question duration configured for question: " + q.getId());
            }
            return 60;
        }
        return fallback;
    }

    private void forceSubmit(Long enrollmentId, String candidateEmail) {
        SubmitExamRequest emptyRequest = new SubmitExamRequest();
        emptyRequest.setAnswers(new java.util.HashMap<>());
        new org.springframework.transaction.support.TransactionTemplate(transactionManager)
                .executeWithoutResult(status -> submitExam(enrollmentId, emptyRequest, candidateEmail));
    }
    /**
     * Determines whether the client request originates from a mobile/touch device.
     * Heuristics prioritize Sec-CH-UA-Mobile client hints when present, then inspect
     * User-Agent for mobile indicators (iPhones, Android phones/tablets, iPads, Windows Phone, Opera Mini),
     * and classify Windows, macOS, Linux, and ChromeOS as desktop workstations.
     */
    public boolean isMobileDevice(String userAgent, String chMobile) {
        String ua = userAgent != null ? userAgent.toLowerCase() : "";
        String ch = chMobile != null ? chMobile.trim() : "";

        // 1. Client Hints (Chromium browsers)
        if ("?1".equals(ch)) {
            return true;
        }
        if ("?0".equals(ch)) {
            // Sec-CH-UA-Mobile explicitly states non-mobile (desktop or Android tablet)
            // Still verify if UA contains unambiguous mobile phone identifiers
            if (ua.contains("iphone") || ua.contains("ipod") || ua.contains("windows phone") || ua.contains("iemobile")) {
                return true;
            }
            if (ua.contains("android")) {
                return true;
            }
            return false;
        }

        // 2. iPhones, iPods, and mobile phones
        if (ua.contains("iphone") || ua.contains("ipod") || ua.contains("windows phone") || ua.contains("iemobile") || ua.contains("blackberry")) {
            return true;
        }

        // 3. Android devices (both phones and tablets)
        if (ua.contains("android")) {
            return true;
        }

        // 4. iPad (classic UA with ipad)
        if (ua.contains("ipad")) {
            return true;
        }

        // 5. Generic mobile indicators
        if (ua.contains("mobile") || ua.contains("opera mini")) {
            return true;
        }

        // Desktops: Windows, Macintosh, Linux, ChromeOS
        return false;
    }

    /**
     * Shared helper to validate device access policy against client headers.
     * Throws BadRequestException (400) if the device type is not permitted.
     */
    public void validateDeviceAccess(com.assessmate.entity.DeviceAccess deviceAccess, String userAgent, String chMobile) {
        if (deviceAccess == null || deviceAccess == com.assessmate.entity.DeviceAccess.BOTH) {
            return;
        }

        boolean isMobile = isMobileDevice(userAgent, chMobile);

        if (deviceAccess == com.assessmate.entity.DeviceAccess.DESKTOP && isMobile) {
            throw new BadRequestException("This exam is restricted to Desktop devices only.");
        }
        if (deviceAccess == com.assessmate.entity.DeviceAccess.MOBILE && !isMobile) {
            throw new BadRequestException("This exam is restricted to Mobile devices only.");
        }
    }

    public JoinExamResponse joinExam(String joinCode, String candidateEmail, String userAgent) {
        return joinExam(joinCode, candidateEmail, userAgent, null, null);
    }

    public JoinExamResponse joinExam(String joinCode, String candidateEmail, String userAgent, String clientIp) {
        return joinExam(joinCode, candidateEmail, userAgent, null, clientIp);
    }

    @org.springframework.transaction.annotation.Transactional
    public JoinExamResponse joinExam(String joinCode, String candidateEmail, String userAgent, String chMobile, String clientIp) {
        if (joinCodeRateLimiterService != null) {
            joinCodeRateLimiterService.checkRateLimit(clientIp, candidateEmail);
        }

        User candidate = userRepository.findByEmail(candidateEmail)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Candidate not found"));

        Exam exam = examRepository.findByJoinCode(joinCode).orElse(null);
        if (exam == null || exam.getStatus() != ExamStatus.LIVE) {
            if (joinCodeRateLimiterService != null) {
                joinCodeRateLimiterService.onJoinFailure(clientIp, candidateEmail);
            }
            throw new BadRequestException("Invalid or inactive exam join code.");
        }

        // A3: Device Access Check
        validateDeviceAccess(exam.getDeviceAccess(), userAgent, chMobile);

        // A4: Empty exam check
        long questionCount = questionRepository.countByExamId(exam.getId());
        if (questionCount == 0) {
            throw new BadRequestException("This exam has no questions yet. Contact your host.");
        }

        LocalDateTime now = LocalDateTime.now();

        // Check if already enrolled FIRST
        java.util.Optional<ExamEnrollment> existingEnrollment = enrollmentRepository.findByExamAndCandidate(exam, candidate);
        if (existingEnrollment.isPresent()) {
            ExamEnrollment enrollment = existingEnrollment.get();
            if (enrollment.getStatus() == EnrollmentStatus.SUBMITTED) {
                throw new BadRequestException("You have already submitted this exam.");
            }
            if (enrollment.getStatus() == EnrollmentStatus.EXPIRED) {
                throw new BadRequestException("Your time for this exam has expired.");
            }
            if (enrollment.getStatus() == EnrollmentStatus.ONGOING) {
                if (enrollment.getPersonalEndTime() != null && now.isAfter(enrollment.getPersonalEndTime())) {
                    try {
                        forceSubmit(enrollment.getId(), candidateEmail);
                    } catch (Exception e) {
                        log.warn("Auto-submit on rejoin failed for enrollment {}: {}", enrollment.getId(), e.getMessage());
                    }
                    throw new BadRequestException("Your time for this exam has expired.");
                }
                return buildJoinResponse(enrollment, exam);
            }
        }

        LocalDateTime scheduledStart = exam.getScheduledStart();
        int graceMinutes = exam.getGracePeriodMinutes() != null ? exam.getGracePeriodMinutes() : 0;
        LocalDateTime latestJoinTime = scheduledStart.plusMinutes(graceMinutes);

        if (now.isBefore(scheduledStart)) {
            throw new BadRequestException("Exam has not started yet. Please wait until " + scheduledStart);
        }

        if (now.isAfter(latestJoinTime)) {
            throw new BadRequestException("Grace period has ended. You cannot join this exam anymore.");
        }

        ExamEnrollment newEnrollment = ExamEnrollment.builder()
                .exam(exam)
                .candidate(candidate)
                .joinedAt(now)
                .status(EnrollmentStatus.ONGOING)
                .build();

        ExamEnrollment enrollment = enrollmentRepository.save(newEnrollment);

        if (joinCodeRateLimiterService != null) {
            joinCodeRateLimiterService.onJoinSuccess(clientIp, candidateEmail);
        }
        return buildJoinResponse(enrollment, exam);
    }

    private JoinExamResponse buildJoinResponse(ExamEnrollment enrollment, Exam exam) {
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
                .passingPercentage(exam.getPassingPercentage())
                .deviceAccess(exam.getDeviceAccess())
                .personalEndTime(enrollment.getPersonalEndTime())
                .instructions("Please read all questions carefully. Do not switch tabs. Your face must be visible at all times.")
                .requireCamera(exam.getRequireCamera())
                .requireMic(exam.getRequireMic())
                .requireScreenShare(false)
                .enableFaceDetection(exam.getEnableFaceDetection())
                .enableObjectDetection(exam.getEnableObjectDetection())
                .enableTabSwitchDetection(exam.getEnableTabSwitchDetection())
                .enableAudioDetection(exam.getEnableAudioDetection())
                .enableScreenCaptureProtection(exam.getEnableScreenCaptureProtection())
                .enableBrowserActivityDetection(exam.getEnableBrowserActivityDetection())
                .enableExamWatermark(exam.getEnableExamWatermark())
                .disableCopy(exam.getDisableCopy())
                .disablePaste(exam.getDisablePaste())
                .disableCut(exam.getDisableCut())
                .disableRightClick(exam.getDisableRightClick())
                .restrictBrowserShortcuts(exam.getRestrictBrowserShortcuts())
                .maxTabSwitches(exam.getMaxTabSwitches())
                .build();
    }

    public CandidateExamQuestionsResponse getExamQuestions(Long enrollmentId, String candidateEmail) {
        return getExamQuestions(enrollmentId, candidateEmail, "", "");
    }

    @org.springframework.transaction.annotation.Transactional
    public CandidateExamQuestionsResponse getExamQuestions(Long enrollmentId, String candidateEmail, String userAgent, String chMobile) {
        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new ForbiddenException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new BadRequestException("You can only get questions for an ongoing exam.");
        }

        Exam exam = examRepository.findById(enrollment.getExam().getId())
                .orElse(enrollment.getExam());
        validateDeviceAccess(exam.getDeviceAccess(), userAgent, chMobile);

        if (enrollment.getPersonalEndTime() == null) {
            LocalDateTime now = LocalDateTime.now();
            enrollment.setJoinedAt(now);
            
            if (exam.getTimerType() == TimerType.WHOLE_EXAM && exam.getDurationMinutes() != null) {
                enrollment.setPersonalEndTime(now.plusMinutes(exam.getDurationMinutes()));
            } else if (exam.getTimerType() == TimerType.PER_QUESTION) {
                int totalSeconds = 0;
                List<Question> questions = questionRepository.findByExamId(exam.getId());
                for (Question q : questions) {
                    totalSeconds += resolveQuestionDurationSeconds(q, exam);
                }
                if (exam.getHasCodingSection() != null && exam.getHasCodingSection() && exam.getCodingDurationMinutes() != null) {
                    totalSeconds += exam.getCodingDurationMinutes() * 60;
                }
                totalSeconds += 60; // 60s buffer
                enrollment.setPersonalEndTime(now.plusSeconds(totalSeconds));
            }
            enrollmentRepository.save(enrollment);
        }

        List<Question> examQuestions = new java.util.ArrayList<>(questionRepository.findByExamId(enrollment.getExam().getId()));
        examQuestions.sort(java.util.Comparator.comparing(Question::getId));
        java.util.Collections.shuffle(examQuestions, new java.util.Random(enrollment.getId()));

        LocalDateTime now = LocalDateTime.now();

        // Load existing timings if PER_QUESTION
        Map<Long, com.assessmate.entity.CandidateQuestionTiming> timingMap = new java.util.HashMap<>();
        Long activeQuestionId = null;
        LocalDateTime activeQuestionDeadline = null;
        Long activeQuestionRemainingSeconds = null;

        if (exam.getTimerType() == TimerType.PER_QUESTION && candidateQuestionTimingRepository != null) {
            List<com.assessmate.entity.CandidateQuestionTiming> timings = candidateQuestionTimingRepository.findByEnrollmentId(enrollmentId);
            boolean timingsUpdated = false;
            for (com.assessmate.entity.CandidateQuestionTiming t : timings) {
                if (!t.isExpired() && now.isAfter(t.getDeadline())) {
                    t.setExpired(true);
                    timingsUpdated = true;
                }
                timingMap.put(t.getQuestion().getId(), t);
            }
            if (timingsUpdated) {
                candidateQuestionTimingRepository.saveAll(timings);
            }

            if (timings.isEmpty() && !examQuestions.isEmpty()) {
                Question firstQ = examQuestions.get(0);
                int duration = resolveQuestionDurationSeconds(firstQ, exam);
                LocalDateTime deadline = now.plusSeconds(duration);
                com.assessmate.entity.CandidateQuestionTiming firstTiming = com.assessmate.entity.CandidateQuestionTiming.builder()
                        .enrollment(enrollment)
                        .question(firstQ)
                        .startedAt(now)
                        .deadline(deadline)
                        .isExpired(false)
                        .build();
                firstTiming = candidateQuestionTimingRepository.save(firstTiming);
                timingMap.put(firstQ.getId(), firstTiming);
                activeQuestionId = firstQ.getId();
                activeQuestionDeadline = deadline;
                activeQuestionRemainingSeconds = (long) duration;
            } else {
                for (Question q : examQuestions) {
                    com.assessmate.entity.CandidateQuestionTiming t = timingMap.get(q.getId());
                    if (t != null && !t.isExpired() && now.isBefore(t.getDeadline())) {
                        activeQuestionId = q.getId();
                        activeQuestionDeadline = t.getDeadline();
                        activeQuestionRemainingSeconds = Math.max(0, java.time.Duration.between(now, t.getDeadline()).getSeconds());
                        break;
                    }
                }
                if (activeQuestionId == null) {
                    for (Question q : examQuestions) {
                        com.assessmate.entity.CandidateQuestionTiming t = timingMap.get(q.getId());
                        if (t == null) {
                            int duration = resolveQuestionDurationSeconds(q, exam);
                            LocalDateTime deadline = now.plusSeconds(duration);
                            com.assessmate.entity.CandidateQuestionTiming nextTiming = com.assessmate.entity.CandidateQuestionTiming.builder()
                                    .enrollment(enrollment)
                                    .question(q)
                                    .startedAt(now)
                                    .deadline(deadline)
                                    .isExpired(false)
                                    .build();
                            nextTiming = candidateQuestionTimingRepository.save(nextTiming);
                            timingMap.put(q.getId(), nextTiming);
                            activeQuestionId = q.getId();
                            activeQuestionDeadline = deadline;
                            activeQuestionRemainingSeconds = (long) duration;
                            break;
                        }
                    }
                }
            }
        }

        // Load any previously autosaved answers so the paper can be restored on rejoin
        Map<Long, String> savedAnswers = candidateAnswerRepository.findByEnrollmentId(enrollmentId).stream()
                .filter(a -> a.getCandidateAnswer() != null)
                .collect(java.util.stream.Collectors.toMap(
                        a -> a.getQuestion().getId(),
                        CandidateAnswer::getCandidateAnswer));

        final Long finalActiveQuestionId = activeQuestionId;
        List<CandidateQuestionDTO> candidateQuestions = new java.util.ArrayList<>();
        for (Question q : examQuestions) {
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
                java.util.Collections.shuffle(options, new java.util.Random(enrollment.getId() * 31 + q.getId()));
            }

            int resolvedDuration = resolveQuestionDurationSeconds(q, exam);
            com.assessmate.entity.CandidateQuestionTiming t = timingMap.get(q.getId());
            boolean isExpired = t != null && (t.isExpired() || now.isAfter(t.getDeadline()));
            boolean isActive = t != null && !isExpired && (finalActiveQuestionId != null && finalActiveQuestionId.equals(q.getId()));
            LocalDateTime deadline = t != null ? t.getDeadline() : null;
            Long qRemainingSeconds = (t != null && !isExpired && now.isBefore(t.getDeadline()))
                    ? Math.max(0, java.time.Duration.between(now, t.getDeadline()).getSeconds())
                    : 0L;

            candidateQuestions.add(CandidateQuestionDTO.builder()
                    .id(q.getId())
                    .questionText(q.getQuestionText())
                    .imageUrl(q.getImageUrl())
                    .type(q.getType())
                    .marks(q.getMarks())
                    .negativeMarks(q.getNegativeMarks())
                    .timeSeconds(resolvedDuration)
                    .options(options)
                    .savedAnswer(savedAnswers.get(q.getId()))
                    .isExpired(isExpired)
                    .isActive(isActive)
                    .deadline(deadline)
                    .remainingSeconds(qRemainingSeconds)
                    .build());
        }

        Long remainingSeconds = null;
        if (enrollment.getPersonalEndTime() != null) {
            if (now.isAfter(enrollment.getPersonalEndTime())) {
                try {
                    forceSubmit(enrollment.getId(), candidateEmail);
                } catch (Exception e) {
                    log.warn("Auto-submit on question fetch failed for enrollment {}: {}", enrollment.getId(), e.getMessage());
                }
                throw new BadRequestException("Your time for this exam has expired.");
            }
            remainingSeconds = java.time.Duration.between(now, enrollment.getPersonalEndTime()).getSeconds();
        }

        long currentTabSwitches = proctoringLogRepository.countByEnrollmentIdAndEventTypeIn(
                enrollment.getId(), java.util.List.of(
                        com.assessmate.entity.ProctoringEventType.TAB_SWITCH,
                        com.assessmate.entity.ProctoringEventType.FULL_SCREEN_EXIT,
                        com.assessmate.entity.ProctoringEventType.SCREEN_SHARE_STOPPED));

        return CandidateExamQuestionsResponse.builder()
                .questions(candidateQuestions)
                .personalEndTime(enrollment.getPersonalEndTime())
                .remainingSeconds(remainingSeconds)
                .deviceAccess(enrollment.getExam().getDeviceAccess())
                .timerType(exam.getTimerType())
                .easySeconds(exam.getEasySeconds())
                .mediumSeconds(exam.getMediumSeconds())
                .hardSeconds(exam.getHardSeconds())
                .serverTime(now)
                .activeQuestionId(activeQuestionId)
                .activeQuestionDeadline(activeQuestionDeadline)
                .activeQuestionRemainingSeconds(activeQuestionRemainingSeconds)
                .requireCamera(exam.getRequireCamera())
                .requireMic(exam.getRequireMic())
                .requireScreenShare(false)
                .enableFaceDetection(exam.getEnableFaceDetection())
                .enableObjectDetection(exam.getEnableObjectDetection())
                .enableTabSwitchDetection(exam.getEnableTabSwitchDetection())
                .enableAudioDetection(exam.getEnableAudioDetection())
                .enableScreenCaptureProtection(exam.getEnableScreenCaptureProtection())
                .enableBrowserActivityDetection(exam.getEnableBrowserActivityDetection())
                .enableExamWatermark(exam.getEnableExamWatermark())
                .disableCopy(exam.getDisableCopy())
                .disablePaste(exam.getDisablePaste())
                .disableCut(exam.getDisableCut())
                .disableRightClick(exam.getDisableRightClick())
                .restrictBrowserShortcuts(exam.getRestrictBrowserShortcuts())
                .maxTabSwitches(exam.getMaxTabSwitches())
                .currentTabSwitches(currentTabSwitches)
                .build();
    }

    public boolean logProctorEvent(ProctorEventRequest request, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findById(request.getEnrollmentId())
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new ForbiddenException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new BadRequestException("You can only log events for an ongoing exam.");
        }

        Exam exam = examRepository.findById(enrollment.getExam().getId())
                .orElse(enrollment.getExam());
        if (!isDetectionEnabled(exam, request.getEventType())) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        // A22: Proctoring log trusts client timestamp - fixed to server time
        LocalDateTime clientTime = request.getTimestamp();

        // A23: Proctoring endpoint can be spammed - Debounce 5s
        long recentEvents = proctoringLogRepository.countByEnrollmentIdAndEventTypeAndFlaggedAtAfter(
                enrollment.getId(), request.getEventType(), now.minusSeconds(5));

        if (recentEvents > 0) {
            return false; // Ignore duplicate event within 5s
        }

        ProctoringLog log = ProctoringLog.builder()
                .enrollment(enrollment)
                .eventType(request.getEventType())
                .flaggedAt(now)
                .clientReportedAt(clientTime)
                .imageUrl(request.getImageUrl())
                .audioUrl(request.getAudioUrl())
                .details(request.getDetails())
                .severity(resolveSeverity(request.getEventType()))
                .build();

        proctoringLogRepository.save(log);

        if (request.getEventType() == ProctoringEventType.TAB_SWITCH 
                || request.getEventType() == ProctoringEventType.FULL_SCREEN_EXIT) {
            return checkTabSwitchLimit(enrollment);
        }
        return false;
    }

    private boolean isDetectionEnabled(Exam exam, ProctoringEventType type) {
        return switch (type) {
            case NO_FACE, MULTIPLE_FACES, GAZE_AWAY -> exam.getEnableFaceDetection() == null || exam.getEnableFaceDetection();
            case OBJECT_DETECTED -> exam.getEnableObjectDetection() == null || exam.getEnableObjectDetection();
            case TAB_SWITCH, FULL_SCREEN_EXIT -> exam.getEnableTabSwitchDetection() == null || exam.getEnableTabSwitchDetection();
            case AUDIO_DETECTED -> exam.getEnableAudioDetection() == null || exam.getEnableAudioDetection();
            case NO_CAMERA -> exam.getRequireCamera() == null || exam.getRequireCamera();
            case NO_MIC -> exam.getRequireMic() == null || exam.getRequireMic();
            case SCREEN_SHARE_STOPPED -> false;
            case WINDOW_BLUR, WINDOW_FOCUS, SCREENSHOT_ATTEMPT -> Boolean.TRUE.equals(exam.getEnableScreenCaptureProtection())
                    && (exam.getEnableBrowserActivityDetection() == null || Boolean.TRUE.equals(exam.getEnableBrowserActivityDetection()));
            case COPY_ATTEMPT -> Boolean.TRUE.equals(exam.getDisableCopy());
            case PASTE_ATTEMPT -> Boolean.TRUE.equals(exam.getDisablePaste());
            case CUT_ATTEMPT -> Boolean.TRUE.equals(exam.getDisableCut());
            case RIGHT_CLICK_ATTEMPT -> Boolean.TRUE.equals(exam.getDisableRightClick());
            case SHORTCUT_ATTEMPT -> Boolean.TRUE.equals(exam.getRestrictBrowserShortcuts());
        };
    }

    private boolean checkTabSwitchLimit(ExamEnrollment enrollment) {
        Exam exam = examRepository.findById(enrollment.getExam().getId())
                .orElse(enrollment.getExam());
        if (exam.getMaxTabSwitches() == null || exam.getMaxTabSwitches() <= 0) return false; // host didn't set a limit

        long count = proctoringLogRepository.countByEnrollmentIdAndEventTypeIn(
                enrollment.getId(), java.util.List.of(
                        ProctoringEventType.TAB_SWITCH,
                        ProctoringEventType.FULL_SCREEN_EXIT));

        if (count >= exam.getMaxTabSwitches()) {
            try {
                forceSubmit(enrollment.getId(), enrollment.getCandidate().getEmail());
            } catch (Exception e) {
                log.warn("Auto-submit after tab-switch limit failed for enrollment {}: {}", enrollment.getId(), e.getMessage());
            }
            return true;
        }
        return false;
    }

    private static final Map<ProctoringEventType, Double> DEDUCTIONS = Map.ofEntries(
        Map.entry(ProctoringEventType.GAZE_AWAY, 1.0),
        Map.entry(ProctoringEventType.NO_FACE, 3.0),
        Map.entry(ProctoringEventType.TAB_SWITCH, 4.0),
        Map.entry(ProctoringEventType.FULL_SCREEN_EXIT, 4.0),
        Map.entry(ProctoringEventType.AUDIO_DETECTED, 3.0),
        Map.entry(ProctoringEventType.MULTIPLE_FACES, 8.0),
        Map.entry(ProctoringEventType.OBJECT_DETECTED, 10.0),
        Map.entry(ProctoringEventType.NO_CAMERA, 10.0),
        Map.entry(ProctoringEventType.NO_MIC, 6.0),
        Map.entry(ProctoringEventType.SCREEN_SHARE_STOPPED, 0.0),
        Map.entry(ProctoringEventType.WINDOW_BLUR, 1.0),
        Map.entry(ProctoringEventType.WINDOW_FOCUS, 0.0),
        Map.entry(ProctoringEventType.SCREENSHOT_ATTEMPT, 2.0),
        Map.entry(ProctoringEventType.COPY_ATTEMPT, 1.0),
        Map.entry(ProctoringEventType.PASTE_ATTEMPT, 1.0),
        Map.entry(ProctoringEventType.CUT_ATTEMPT, 1.0),
        Map.entry(ProctoringEventType.RIGHT_CLICK_ATTEMPT, 0.5),
        Map.entry(ProctoringEventType.SHORTCUT_ATTEMPT, 1.0)
    );

    private Severity resolveSeverity(ProctoringEventType type) {
        return switch (type) {
            case GAZE_AWAY, WINDOW_FOCUS -> Severity.LOW;
            case NO_FACE, TAB_SWITCH, FULL_SCREEN_EXIT, AUDIO_DETECTED, WINDOW_BLUR, SCREENSHOT_ATTEMPT,
                 COPY_ATTEMPT, PASTE_ATTEMPT, CUT_ATTEMPT, RIGHT_CLICK_ATTEMPT, SHORTCUT_ATTEMPT -> Severity.MEDIUM;
            default -> Severity.HIGH;
        };
    }

    private double calculateHonestyScore(Long enrollmentId) {
        List<ProctoringLog> logs = proctoringLogRepository.findByEnrollmentId(enrollmentId);
        double score = 100.0;
        for (ProctoringLog log : logs) {
            score -= DEDUCTIONS.getOrDefault(log.getEventType(), 2.0);
        }
        return Math.max(0.0, score);
    }

    @org.springframework.transaction.annotation.Transactional
    public void submitExam(Long enrollmentId, SubmitExamRequest request, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findByIdForUpdate(enrollmentId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new ForbiddenException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new BadRequestException("This exam is no longer open for submission.");
        }

        if (resultRepository.findByEnrollmentId(enrollmentId).isPresent()) {
            return;
        }

        boolean isLate = false;
        LocalDateTime now = LocalDateTime.now();
        if (enrollment.getPersonalEndTime() != null && now.isAfter(enrollment.getPersonalEndTime().plusSeconds(30))) {
            isLate = true;
        }

        Exam exam = examRepository.findById(enrollment.getExam().getId())
                .orElse(enrollment.getExam());
        List<Question> questions = questionRepository.findByExamId(exam.getId());

        // Fall back to autosaved progress when the request itself has no
        // answers (this happens on every forced/auto-submit path: rejoin
        // after expiry, getExamQuestions expiry check, and the scheduler's
        // auto-submit all send an empty answers map). Read this BEFORE the
        // delete below wipes the autosaved rows.
        Map<Long, String> answers = request.getAnswers();
        if (answers == null || answers.isEmpty()) {
            answers = candidateAnswerRepository.findByEnrollmentId(enrollmentId).stream()
                    .filter(a -> a.getCandidateAnswer() != null)
                    .collect(java.util.stream.Collectors.toMap(
                            a -> a.getQuestion().getId(),
                            CandidateAnswer::getCandidateAnswer));
        }

        double totalScore = 0.0;
        double maxScore = 0.0;
        int correctCount = 0;
        int wrongCount = 0;
        int unansweredCount = 0;
        java.util.List<CandidateAnswer> answersToSave = new java.util.ArrayList<>();

        for (Question q : questions) {
            double qMarks = q.getMarks() != null ? q.getMarks() : 
                (com.assessmate.entity.Difficulty.EASY == q.getDifficulty() ? exam.getEasyMark() : 
                (com.assessmate.entity.Difficulty.HARD == q.getDifficulty() ? exam.getHardMark() : exam.getMediumMark()));
            
            double qNegative = q.getNegativeMarks() != null ? q.getNegativeMarks() : 
                (com.assessmate.entity.Difficulty.EASY == q.getDifficulty() ? exam.getEasyNegative() : 
                (com.assessmate.entity.Difficulty.HARD == q.getDifficulty() ? exam.getHardNegative() : exam.getMediumNegative()));

            maxScore += qMarks;
            String candidateAnswerStr = answers.get(q.getId());
            
            boolean isCorrect = false;
            double marksAwarded = 0.0;
            
            if (candidateAnswerStr == null || candidateAnswerStr.trim().isEmpty()) {
                unansweredCount++;
            } else {
                candidateAnswerStr = candidateAnswerStr.trim();
                
                if (q.getType() == QuestionType.SINGLE_CHOICE) {
                    isCorrect = candidateAnswerStr.equalsIgnoreCase(q.getCorrectAnswer().trim());
                    if (isCorrect) {
                        marksAwarded = qMarks;
                        correctCount++;
                    } else {
                        wrongCount++;
                        if (exam.getNegativeMark() != null && exam.getNegativeMark()) marksAwarded = -qNegative;
                    }
                } else if (q.getType() == QuestionType.FILL_BLANK) {
                    String normCand = candidateAnswerStr.replaceAll("[^a-zA-Z0-9 ]", "").replaceAll("\\s+", " ").trim();
                    String normCorr = q.getCorrectAnswer().replaceAll("[^a-zA-Z0-9 ]", "").replaceAll("\\s+", " ").trim();
                    isCorrect = normCand.equalsIgnoreCase(normCorr);
                    if (isCorrect) {
                        marksAwarded = qMarks;
                        correctCount++;
                    } else {
                        wrongCount++;
                        if (exam.getNegativeMark() != null && exam.getNegativeMark()) marksAwarded = -qNegative;
                    }
                } else if (q.getType() == QuestionType.NUMERICAL) {
                    try {
                        double candVal = Double.parseDouble(candidateAnswerStr);
                        double corrVal = Double.parseDouble(q.getCorrectAnswer().trim());
                        double tol = q.getTolerance() != null ? q.getTolerance() : 0.0;
                        isCorrect = Math.abs(candVal - corrVal) <= tol;
                        if (isCorrect) {
                            marksAwarded = qMarks;
                            correctCount++;
                        } else {
                            wrongCount++;
                            if (exam.getNegativeMark() != null && exam.getNegativeMark()) marksAwarded = -qNegative;
                        }
                    } catch (NumberFormatException e) {
                        isCorrect = false;
                        wrongCount++;
                        if (exam.getNegativeMark() != null && exam.getNegativeMark()) marksAwarded = -qNegative;
                    }
                } else if (q.getType() == QuestionType.MULTIPLE_SELECT) {
                    try {
                        java.util.List<String> candOpts = java.util.Arrays.stream(candidateAnswerStr.split(","))
                                .map(s -> s.trim().toUpperCase()).sorted().toList();
                        java.util.List<String> corrOpts = java.util.Arrays.stream(q.getCorrectAnswer().split(","))
                                .map(s -> s.trim().toUpperCase()).sorted().toList();
                        
                        if (q.getStrictMarking() != null && q.getStrictMarking()) {
                            isCorrect = candOpts.equals(corrOpts);
                            if (isCorrect) {
                                marksAwarded = qMarks;
                                correctCount++;
                            } else {
                                wrongCount++;
                                if (exam.getNegativeMark() != null && exam.getNegativeMark()) marksAwarded = -qNegative;
                            }
                        } else {
                            // Partial credit logic
                            boolean anyWrong = false;
                            int correctSelected = 0;
                            for (String opt : candOpts) {
                                if (!corrOpts.contains(opt)) {
                                    anyWrong = true;
                                    break;
                                } else {
                                    correctSelected++;
                                }
                            }
                            
                            if (anyWrong) {
                                isCorrect = false;
                                wrongCount++;
                                if (exam.getNegativeMark() != null && exam.getNegativeMark()) marksAwarded = -qNegative;
                            } else {
                                isCorrect = correctSelected == corrOpts.size();
                                if (isCorrect) correctCount++;
                                marksAwarded = qMarks * ((double) correctSelected / corrOpts.size());
                            }
                        }
                    } catch (Exception e) {
                        isCorrect = false;
                        wrongCount++;
                        if (exam.getNegativeMark() != null && exam.getNegativeMark()) marksAwarded = -qNegative;
                    }
                }
            }

            totalScore += marksAwarded;

            CandidateAnswer answer = CandidateAnswer.builder()
                    .enrollment(enrollment)
                    .question(q)
                    .candidateAnswer(candidateAnswerStr)
                    .isCorrect(isCorrect)
                    .marksAwarded(marksAwarded)
                    .build();
            answersToSave.add(answer);
        }

        // Add Coding Questions marks
        java.util.List<com.assessmate.entity.CodingQuestion> codingQuestions = codingQuestionRepository.findByExamId(exam.getId());
        java.util.List<com.assessmate.entity.CodeSubmission> codeSubmissions = codeSubmissionRepository.findByEnrollmentId(enrollmentId);
        java.util.Map<Long, com.assessmate.entity.CodeSubmission> latestSubmissions = new java.util.HashMap<>();
        for (com.assessmate.entity.CodeSubmission sub : codeSubmissions) {
            com.assessmate.entity.CodeSubmission existing = latestSubmissions.get(sub.getCodingQuestion().getId());
            if (existing == null || sub.getSubmittedAt().isAfter(existing.getSubmittedAt())) {
                latestSubmissions.put(sub.getCodingQuestion().getId(), sub);
            }
        }

        for (com.assessmate.entity.CodingQuestion cq : codingQuestions) {
            maxScore += cq.getMarks() != null ? cq.getMarks() : 10.0;
            com.assessmate.entity.CodeSubmission latest = latestSubmissions.get(cq.getId());
            if (latest != null && latest.getMarksAwarded() != null) {
                totalScore += latest.getMarksAwarded();
            } else {
                unansweredCount++;
            }
        }

        // Clear any autosaved rows before inserting the final graded ones —
        // required now that (enrollment_id, question_id) is unique. Without
        // this, submitting after even one autosave call throws a
        // DataIntegrityViolationException.
        candidateAnswerRepository.deleteByEnrollmentId(enrollmentId);
        candidateAnswerRepository.saveAll(answersToSave);

        if (isLate) {
            enrollment.setStatus(EnrollmentStatus.EXPIRED);
        } else {
            enrollment.setStatus(EnrollmentStatus.SUBMITTED);
        }
        enrollment.setSubmittedAt(now);
        enrollmentRepository.save(enrollment);

        totalScore = Math.max(0, totalScore);
        double percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0.0;
        boolean passed = percentage >= (exam.getPassingPercentage() != null ? exam.getPassingPercentage() : 50.0);

        Long timeTakenSeconds = enrollment.getJoinedAt() != null ? java.time.Duration.between(enrollment.getJoinedAt(), now).getSeconds() : 0L;

        double honestyScore = calculateHonestyScore(enrollmentId);
        int totalViolations = proctoringLogRepository.findByEnrollmentId(enrollmentId).size();

        Result result = Result.builder()
                .enrollment(enrollment)
                .totalScore(totalScore)
                .maxScore(maxScore)
                .percentage(percentage)
                .passed(passed)
                .lateSubmission(isLate)
                .timeTakenSeconds(timeTakenSeconds)
                .correctCount(correctCount)
                .wrongCount(wrongCount)
                .unansweredCount(unansweredCount)
                .honestyScore(honestyScore)
                .totalViolations(totalViolations)
                .build();
        resultRepository.save(result);

        // A18: Trigger AI feedback asynchronously so it's ready when the candidate views the result
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                generateAiFeedback(enrollment, result);
            } catch (Exception e) {
                log.error("Failed to generate async AI feedback for enrollment {}", enrollment.getId(), e);
            }
        });
    }

    private void generateAiFeedback(ExamEnrollment enrollment, Result result) {
        List<CandidateAnswer> wrongAnswers = candidateAnswerRepository.findByEnrollmentId(enrollment.getId())
                .stream()
                .filter(a -> Boolean.FALSE.equals(a.getIsCorrect()))
                .toList();

        if (!wrongAnswers.isEmpty()) {
            List<GeminiService.CandidateMistakeItem> mistakeItems = new java.util.ArrayList<>();
            int maxItems = Math.min(wrongAnswers.size(), 20);
            for (int i = 0; i < maxItems; i++) {
                CandidateAnswer ans = wrongAnswers.get(i);
                String rawAns = ans.getCandidateAnswer();
                String safeAns = rawAns != null ? (rawAns.length() > 500 ? rawAns.substring(0, 500) + "..." : rawAns) : "";
                String topic = ans.getQuestion().getTopic() != null ? ans.getQuestion().getTopic() : "General";
                String qText = ans.getQuestion().getQuestionText();
                if (qText != null && qText.length() > 500) {
                    qText = qText.substring(0, 500) + "...";
                }
                String corrAns = ans.getQuestion().getCorrectAnswer();
                if (corrAns != null && corrAns.length() > 300) {
                    corrAns = corrAns.substring(0, 300) + "...";
                }
                mistakeItems.add(new GeminiService.CandidateMistakeItem(topic, qText, safeAns, corrAns));
            }
            try {
                GeminiService.GeminiFeedbackResult feedback = geminiService.generateFeedbackFromMistakes(mistakeItems);
                result.setAiFeedback(feedback.getAiFeedback());
                result.setWeakTopicsJson(feedback.getWeakTopicsJson());
                result.setFeedbackStatus("READY");
            } catch (Exception e) {
                log.error("Failed to generate AI feedback for enrollment {}", enrollment.getId(), e);
                result.setAiFeedback(null);
                result.setWeakTopicsJson("[]");
                result.setFeedbackStatus("FAILED");
            }
            resultRepository.save(result);
        } else {
            result.setAiFeedback("Perfect score! Keep up the excellent work.");
            result.setWeakTopicsJson("[]");
            result.setFeedbackStatus("READY");
            resultRepository.save(result);
        }
    }

    public ResultResponseDTO getExamResult(Long enrollmentId, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new ForbiddenException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.SUBMITTED && enrollment.getStatus() != EnrollmentStatus.EXPIRED) {
            throw new BadRequestException("Exam is not completed yet.");
        }

        Result result = resultRepository.findByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Result not found."));

        Boolean isPublished = enrollment.getExam().getResultsPublished();

        if (!Boolean.TRUE.equals(isPublished)) {
            return ResultResponseDTO.builder()
                    .enrollmentId(enrollment.getId())
                    .examTitle(enrollment.getExam().getTitle())
                    .resultsPublished(false)
                    .build();
        }

        if (result.getAiFeedback() == null || result.getAiFeedback().isEmpty()) {
            // Lazy generation fallback (A18)
            generateAiFeedback(enrollment, result);
        }

        List<CandidateAnswer> dbAnswers = candidateAnswerRepository.findByEnrollmentId(enrollmentId);
        List<CandidateAnswerReviewDTO> answerDtos = dbAnswers.stream().map(a -> {
            Question q = a.getQuestion();
            List<CandidateAnswerReviewDTO.OptionDTO> options = new java.util.ArrayList<>();
            if (q.getType() == QuestionType.SINGLE_CHOICE || q.getType() == QuestionType.MULTIPLE_SELECT) {
                if (q.getOptionA() != null && !q.getOptionA().trim().isEmpty()) options.add(CandidateAnswerReviewDTO.OptionDTO.builder().key("A").value(q.getOptionA()).build());
                if (q.getOptionB() != null && !q.getOptionB().trim().isEmpty()) options.add(CandidateAnswerReviewDTO.OptionDTO.builder().key("B").value(q.getOptionB()).build());
                if (q.getOptionC() != null && !q.getOptionC().trim().isEmpty()) options.add(CandidateAnswerReviewDTO.OptionDTO.builder().key("C").value(q.getOptionC()).build());
                if (q.getOptionD() != null && !q.getOptionD().trim().isEmpty()) options.add(CandidateAnswerReviewDTO.OptionDTO.builder().key("D").value(q.getOptionD()).build());
            }

            return CandidateAnswerReviewDTO.builder()
                    .questionId(q.getId())
                    .questionText(q.getQuestionText())
                    .imageUrl(q.getImageUrl())
                    .type(q.getType())
                    .totalMarks(q.getMarks() != null ? q.getMarks() : 0.0)
                    .marksAwarded(a.getMarksAwarded())
                    .isCorrect(a.getIsCorrect())
                    .candidateAnswer(a.getCandidateAnswer())
                    .correctAnswer(q.getCorrectAnswer())
                    .explanation(q.getExplanation())
                    .topic(q.getTopic())
                    .difficulty(q.getDifficulty() != null ? q.getDifficulty().name() : null)
                    .options(options)
                    .build();
        }).toList();

        return ResultResponseDTO.builder()
                .enrollmentId(enrollment.getId())
                .examTitle(enrollment.getExam().getTitle())
                .totalScore(result.getTotalScore())
                .maxScore(result.getMaxScore())
                .percentage(result.getPercentage())
                .passed(result.getPassed())
                .lateSubmission(result.getLateSubmission())
                .timeTakenSeconds(result.getTimeTakenSeconds())
                .correctCount(result.getCorrectCount())
                .wrongCount(result.getWrongCount())
                .unansweredCount(result.getUnansweredCount())
                .weakTopicsJson(result.getWeakTopicsJson())
                .aiFeedback(result.getAiFeedback())
                .feedbackStatus(result.getFeedbackStatus())
                .honestyScore(result.getHonestyScore())
                .totalViolations(result.getTotalViolations())
                .resultsPublished(true)
                .answers(answerDtos)
                .build();
    }

    public org.springframework.data.domain.Page<CandidateHistoryDTO> getCandidateHistory(String candidateEmail, org.springframework.data.domain.Pageable pageable) {
        User candidate = userRepository.findByEmail(candidateEmail)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Candidate not found"));

        org.springframework.data.domain.Page<ExamEnrollment> enrollmentPage = enrollmentRepository.findByCandidateId(candidate.getId(), pageable);

        List<Long> completedIds = enrollmentPage.getContent().stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.SUBMITTED || e.getStatus() == EnrollmentStatus.EXPIRED)
                .map(ExamEnrollment::getId)
                .toList();

        java.util.Map<Long, Result> resultMap = new java.util.HashMap<>();
        if (!completedIds.isEmpty()) {
            List<Result> results = resultRepository.findByEnrollmentIdIn(completedIds);
            for (Result r : results) {
                resultMap.put(r.getEnrollment().getId(), r);
            }
        }

        return enrollmentPage.map(e -> {
            Double totalScore = null;
            Double percentage = null;
            
            if ((e.getStatus() == EnrollmentStatus.SUBMITTED || e.getStatus() == EnrollmentStatus.EXPIRED) && Boolean.TRUE.equals(e.getExam().getResultsPublished())) {
                Result r = resultMap.get(e.getId());
                if (r != null) {
                    totalScore = r.getTotalScore();
                    percentage = r.getPercentage();
                }
            }
            
            return CandidateHistoryDTO.builder()
                    .enrollmentId(e.getId())
                    .examTitle(e.getExam().getTitle())
                    .subject(e.getExam().getSubject())
                    .joinedAt(e.getJoinedAt())
                    .status(e.getStatus())
                    .totalScore(totalScore)
                    .percentage(percentage)
                    .deviceAccess(e.getExam().getDeviceAccess())
                    .build();
        });
    }

    public List<ExamEnrollment> getExpiredEnrollments() {
        List<ExamEnrollment> expired = new java.util.ArrayList<>(enrollmentRepository
                .findByStatusAndPersonalEndTimeBefore(EnrollmentStatus.ONGOING, LocalDateTime.now()));
        
        List<ExamEnrollment> abandoned = enrollmentRepository
                .findAbandonedEnrollments(EnrollmentStatus.ONGOING, LocalDateTime.now().minusHours(24));
        
        for (ExamEnrollment e : abandoned) {
            if (!expired.contains(e)) {
                expired.add(e);
            }
        }
        return expired;
    }

    @org.springframework.transaction.annotation.Transactional
    public void saveProgress(Long enrollmentId, com.assessmate.dto.SubmitExamRequest request, String candidateEmail) {
        // Lock the row (same as submitExam) so an autosave can't overwrite graded answers mid-submit
        ExamEnrollment enrollment = enrollmentRepository.findByIdForUpdate(enrollmentId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new ForbiddenException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new BadRequestException("This exam is no longer open for submission.");
        }

        // P4: Server-Side Autosave Deadline Enforcement
        LocalDateTime now = LocalDateTime.now();
        if (enrollment.getPersonalEndTime() != null && now.isAfter(enrollment.getPersonalEndTime().plusSeconds(30))) {
            throw new BadRequestException("Exam time has expired. Answers can no longer be saved.");
        }

        Exam exam = examRepository.findById(enrollment.getExam().getId())
                .orElse(enrollment.getExam());
        List<Question> questions = questionRepository.findByExamId(exam.getId());
        List<CandidateAnswer> existingAnswers = candidateAnswerRepository.findByEnrollmentId(enrollmentId);
        java.util.Map<Long, CandidateAnswer> existingMap = existingAnswers.stream()
                .collect(java.util.stream.Collectors.toMap(a -> a.getQuestion().getId(), a -> a));

        // Load timings if in PER_QUESTION mode
        Map<Long, com.assessmate.entity.CandidateQuestionTiming> timingMap = new java.util.HashMap<>();
        if (exam.getTimerType() == TimerType.PER_QUESTION && candidateQuestionTimingRepository != null) {
            List<com.assessmate.entity.CandidateQuestionTiming> timings = candidateQuestionTimingRepository.findByEnrollmentId(enrollmentId);
            for (com.assessmate.entity.CandidateQuestionTiming t : timings) {
                timingMap.put(t.getQuestion().getId(), t);
            }
        }

        java.util.List<CandidateAnswer> answersToSave = new java.util.ArrayList<>();
        for (Question q : questions) {
            String candidateAnswerStr = request.getAnswers() != null ? request.getAnswers().get(q.getId()) : null;
            if (candidateAnswerStr != null && !candidateAnswerStr.trim().isEmpty()) {
                CandidateAnswer answer = existingMap.get(q.getId());

                // Server-side question deadline enforcement in PER_QUESTION mode
                if (exam.getTimerType() == TimerType.PER_QUESTION && candidateQuestionTimingRepository != null) {
                    com.assessmate.entity.CandidateQuestionTiming timing = timingMap.get(q.getId());
                    if (timing == null) {
                        // Question has not started yet. In PER_QUESTION mode, future unstarted questions cannot accept answers.
                        if (answer == null) {
                            throw new BadRequestException("Question " + q.getId() + " has not started yet. In per-question mode, questions must be answered sequentially.");
                        } else if (!candidateAnswerStr.trim().equals(answer.getCandidateAnswer())) {
                            throw new BadRequestException("Question " + q.getId() + " has not started yet. In per-question mode, questions must be answered sequentially.");
                        }
                        continue;
                    }
                    boolean isExpired = timing.isExpired() || now.isAfter(timing.getDeadline());
                    if (isExpired) {
                        if (!timing.isExpired()) {
                            timing.setExpired(true);
                            candidateQuestionTimingRepository.save(timing);
                        }
                        if (answer == null) {
                            throw new BadRequestException("Question " + q.getId() + " time has expired. Answers can no longer be saved.");
                        } else if (!candidateAnswerStr.trim().equals(answer.getCandidateAnswer())) {
                            throw new BadRequestException("Question " + q.getId() + " time has expired. Answers can no longer be modified.");
                        }
                        // Matches existing saved answer -> preserve it without modifying
                        continue;
                    }
                }

                if (answer == null) {
                    answer = CandidateAnswer.builder()
                            .enrollment(enrollment)
                            .question(q)
                            .candidateAnswer(candidateAnswerStr.trim())
                            .isCorrect(null)
                            .marksAwarded(0.0)
                            .build();
                } else {
                    answer.setCandidateAnswer(candidateAnswerStr.trim());
                }
                answersToSave.add(answer);
            }
        }
        candidateAnswerRepository.saveAll(answersToSave);
    }

    @org.springframework.transaction.annotation.Transactional
    public void autosaveExamAnswers(Long enrollmentId, com.assessmate.dto.SubmitExamRequest request, String candidateEmail) {
        saveProgress(enrollmentId, request, candidateEmail);
    }

    @org.springframework.transaction.annotation.Transactional
    public QuestionExpireResponse expireQuestion(Long enrollmentId, Long questionId, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findByIdForUpdate(enrollmentId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new ForbiddenException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new BadRequestException("This exam is no longer active.");
        }

        Exam exam = examRepository.findById(enrollment.getExam().getId())
                .orElse(enrollment.getExam());
        if (exam.getTimerType() != TimerType.PER_QUESTION) {
            throw new BadRequestException("This exam does not use per-question timing.");
        }

        LocalDateTime now = LocalDateTime.now();

        // Check overall exam deadline
        if (enrollment.getPersonalEndTime() != null && now.isAfter(enrollment.getPersonalEndTime())) {
            try {
                forceSubmit(enrollmentId, candidateEmail);
            } catch (Exception e) {
                log.warn("Force submit failed on question expiry: {}", e.getMessage());
            }
            return QuestionExpireResponse.builder()
                    .expiredQuestionId(questionId)
                    .nextQuestionId(null)
                    .isExamCompleted(true)
                    .serverTime(now)
                    .build();
        }

        if (candidateQuestionTimingRepository != null) {
            com.assessmate.entity.CandidateQuestionTiming currentTiming = candidateQuestionTimingRepository
                    .findByEnrollmentIdAndQuestionIdForUpdate(enrollmentId, questionId)
                    .orElse(null);

            if (currentTiming != null) {
                currentTiming.setExpired(true);
                currentTiming.setCompletedAt(now);
                candidateQuestionTimingRepository.save(currentTiming);
            }
        }

        // Determine next question
        List<Question> examQuestions = new java.util.ArrayList<>(questionRepository.findByExamId(exam.getId()));
        examQuestions.sort(java.util.Comparator.comparing(Question::getId));
        java.util.Collections.shuffle(examQuestions, new java.util.Random(enrollment.getId()));

        int currentIndex = -1;
        for (int i = 0; i < examQuestions.size(); i++) {
            if (examQuestions.get(i).getId().equals(questionId)) {
                currentIndex = i;
                break;
            }
        }

        if (currentIndex >= 0 && currentIndex + 1 < examQuestions.size()) {
            Question nextQ = examQuestions.get(currentIndex + 1);
            int duration = resolveQuestionDurationSeconds(nextQ, exam);
            LocalDateTime nextDeadline = now.plusSeconds(duration);

            if (candidateQuestionTimingRepository != null) {
                com.assessmate.entity.CandidateQuestionTiming nextTiming = candidateQuestionTimingRepository
                        .findByEnrollmentIdAndQuestionIdForUpdate(enrollmentId, nextQ.getId())
                        .orElse(null);

                if (nextTiming == null) {
                    nextTiming = com.assessmate.entity.CandidateQuestionTiming.builder()
                            .enrollment(enrollment)
                            .question(nextQ)
                            .startedAt(now)
                            .deadline(nextDeadline)
                            .isExpired(false)
                            .build();
                    candidateQuestionTimingRepository.save(nextTiming);
                } else if (!nextTiming.isExpired()) {
                    nextDeadline = nextTiming.getDeadline();
                }
            }

            long remaining = Math.max(0, java.time.Duration.between(now, nextDeadline).getSeconds());
            return QuestionExpireResponse.builder()
                    .expiredQuestionId(questionId)
                    .nextQuestionId(nextQ.getId())
                    .nextQuestionDeadline(nextDeadline)
                    .nextQuestionRemainingSeconds(remaining)
                    .isExamCompleted(false)
                    .serverTime(now)
                    .build();
        } else {
            // Last question expired!
            return QuestionExpireResponse.builder()
                    .expiredQuestionId(questionId)
                    .nextQuestionId(null)
                    .isExamCompleted(true)
                    .serverTime(now)
                    .build();
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public QuestionExpireResponse advanceQuestion(Long enrollmentId, Long currentQuestionId, String candidateEmail) {
        return expireQuestion(enrollmentId, currentQuestionId, candidateEmail);
    }

    public java.util.Map<String, Object> getExamState(Long enrollmentId, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new ForbiddenException("You do not have access to this enrollment.");
        }

        java.util.Map<String, Object> state = new java.util.HashMap<>();
        state.put("status", enrollment.getStatus().name());
        Exam exam = examRepository.findById(enrollment.getExam().getId())
                .orElse(enrollment.getExam());
        state.put("timerType", exam.getTimerType() != null ? exam.getTimerType().name() : TimerType.WHOLE_EXAM.name());
        
        if (enrollment.getStatus() == EnrollmentStatus.ONGOING) {
            LocalDateTime now = LocalDateTime.now();
            long remainingSeconds = 0;
            if (enrollment.getPersonalEndTime() != null && now.isBefore(enrollment.getPersonalEndTime())) {
                remainingSeconds = java.time.Duration.between(now, enrollment.getPersonalEndTime()).getSeconds();
            }
            state.put("remainingSeconds", remainingSeconds);

            if (exam.getTimerType() == TimerType.PER_QUESTION && candidateQuestionTimingRepository != null) {
                List<com.assessmate.entity.CandidateQuestionTiming> timings = candidateQuestionTimingRepository.findByEnrollmentId(enrollmentId);
                for (com.assessmate.entity.CandidateQuestionTiming t : timings) {
                    if (!t.isExpired() && now.isBefore(t.getDeadline())) {
                        state.put("activeQuestionId", t.getQuestion().getId());
                        state.put("activeQuestionRemainingSeconds", java.time.Duration.between(now, t.getDeadline()).getSeconds());
                        state.put("activeQuestionDeadline", t.getDeadline().toString());
                        state.put("isQuestionExpired", false);
                        break;
                    }
                }
            }
        }

        return state;
    }

    public java.util.Map<String, Object> getDashboard(String candidateEmail) {
        User candidate = userRepository.findByEmail(candidateEmail)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Candidate not found"));

        List<ExamEnrollment> enrollments = enrollmentRepository.findByCandidateIdOrderByJoinedAtDesc(candidate.getId());
        
        long totalExams = enrollments.size();
        long completedExams = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.SUBMITTED || e.getStatus() == EnrollmentStatus.EXPIRED)
                .count();

        java.util.Map<String, Object> dashboard = new java.util.HashMap<>();
        dashboard.put("totalExams", totalExams);
        dashboard.put("completedExams", completedExams);
        dashboard.put("ongoingExams", totalExams - completedExams);
        
        return dashboard;
    }
}

