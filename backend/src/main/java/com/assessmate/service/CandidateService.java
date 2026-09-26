package com.assessmate.service;

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

    public JoinExamResponse joinExam(String joinCode, String candidateEmail, String userAgent) {
        User candidate = userRepository.findByEmail(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));

        Exam exam = examRepository.findByJoinCode(joinCode)
                .orElseThrow(() -> new RuntimeException("Invalid join code"));

        if (exam.getStatus() != ExamStatus.LIVE) {
            throw new RuntimeException("This exam is not currently LIVE");
        }

        // A3: Device Access Check
        boolean isMobile = userAgent.toLowerCase().contains("mobi") || userAgent.toLowerCase().contains("android") || userAgent.toLowerCase().contains("iphone");
        if (exam.getDeviceAccess() == com.assessmate.entity.DeviceAccess.DESKTOP && isMobile) {
            throw new RuntimeException("This exam is restricted to Desktop devices only.");
        }
        if (exam.getDeviceAccess() == com.assessmate.entity.DeviceAccess.MOBILE && !isMobile) {
            throw new RuntimeException("This exam is restricted to Mobile devices only.");
        }

        // A4: Empty exam check
        long questionCount = questionRepository.countByExamId(exam.getId());
        if (questionCount == 0) {
            throw new RuntimeException("This exam has no questions yet. Contact your host.");
        }

        LocalDateTime now = LocalDateTime.now();

        // Check if already enrolled FIRST
        java.util.Optional<ExamEnrollment> existingEnrollment = enrollmentRepository.findByExamAndCandidate(exam, candidate);
        if (existingEnrollment.isPresent()) {
            ExamEnrollment enrollment = existingEnrollment.get();
            if (enrollment.getStatus() == EnrollmentStatus.SUBMITTED) {
                throw new RuntimeException("You have already submitted this exam.");
            }
            if (enrollment.getStatus() == EnrollmentStatus.EXPIRED) {
                throw new RuntimeException("Your time for this exam has expired.");
            }
            if (enrollment.getStatus() == EnrollmentStatus.ONGOING) {
                if (enrollment.getPersonalEndTime() != null && now.isAfter(enrollment.getPersonalEndTime())) {
                    try {
                        SubmitExamRequest emptyRequest = new SubmitExamRequest();
                        emptyRequest.setAnswers(new java.util.HashMap<>());
                        submitExam(enrollment.getId(), emptyRequest, candidateEmail);
                    } catch (Exception e) {}
                    throw new RuntimeException("Your time for this exam has expired.");
                }
                return buildJoinResponse(enrollment, exam);
            }
        }

        LocalDateTime scheduledStart = exam.getScheduledStart();
        int graceMinutes = exam.getGracePeriodMinutes() != null ? exam.getGracePeriodMinutes() : 0;
        LocalDateTime latestJoinTime = scheduledStart.plusMinutes(graceMinutes);

        if (now.isBefore(scheduledStart)) {
            throw new RuntimeException("Exam has not started yet. Please wait until " + scheduledStart);
        }

        if (now.isAfter(latestJoinTime)) {
            throw new RuntimeException("Grace period has ended. You cannot join this exam anymore.");
        }

        ExamEnrollment newEnrollment = ExamEnrollment.builder()
                .exam(exam)
                .candidate(candidate)
                .joinedAt(now)
                .status(EnrollmentStatus.ONGOING)
                .build();

        if (exam.getTimerType() == TimerType.WHOLE_EXAM && exam.getDurationMinutes() != null) {
            newEnrollment.setPersonalEndTime(now.plusMinutes(exam.getDurationMinutes()));
        } else if (exam.getTimerType() == TimerType.PER_QUESTION) {
            int totalSeconds = 0;
            List<Question> questions = questionRepository.findByExamId(exam.getId());
            for (Question q : questions) {
                if (q.getTimeSeconds() != null) {
                    totalSeconds += q.getTimeSeconds();
                } else {
                    if (com.assessmate.entity.Difficulty.EASY == q.getDifficulty()) totalSeconds += exam.getEasySeconds();
                    else if (com.assessmate.entity.Difficulty.HARD == q.getDifficulty()) totalSeconds += exam.getHardSeconds();
                    else totalSeconds += exam.getMediumSeconds();
                }
            }
            if (exam.getHasCodingSection() != null && exam.getHasCodingSection() && exam.getCodingDurationMinutes() != null) {
                totalSeconds += exam.getCodingDurationMinutes() * 60;
            }
            totalSeconds += 60; // 60s buffer
            newEnrollment.setPersonalEndTime(now.plusSeconds(totalSeconds));
        }

        ExamEnrollment enrollment = enrollmentRepository.save(newEnrollment);
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

        // Load any previously autosaved answers so the paper can be restored on rejoin
        Map<Long, String> savedAnswers = candidateAnswerRepository.findByEnrollmentId(enrollmentId).stream()
                .filter(a -> a.getCandidateAnswer() != null)
                .collect(java.util.stream.Collectors.toMap(
                        a -> a.getQuestion().getId(),
                        CandidateAnswer::getCandidateAnswer));

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
                java.util.Collections.shuffle(options, new java.util.Random(enrollment.getId() * 31 + q.getId()));
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
                    .savedAnswer(savedAnswers.get(q.getId()))
                    .build();
        }).toList());

        // Shuffle the questions randomly but deterministically for this enrollment
        java.util.Collections.shuffle(candidateQuestions, new java.util.Random(enrollment.getId()));

        LocalDateTime now = LocalDateTime.now();
        Long remainingSeconds = null;
        if (enrollment.getPersonalEndTime() != null) {
            if (now.isAfter(enrollment.getPersonalEndTime())) {
                try {
                    SubmitExamRequest emptyRequest = new SubmitExamRequest();
                    emptyRequest.setAnswers(new java.util.HashMap<>());
                    submitExam(enrollment.getId(), emptyRequest, candidateEmail);
                } catch (Exception e) {}
                throw new RuntimeException("Your time for this exam has expired.");
            }
            remainingSeconds = java.time.Duration.between(now, enrollment.getPersonalEndTime()).getSeconds();
        }

        return CandidateExamQuestionsResponse.builder()
                .questions(candidateQuestions)
                .personalEndTime(enrollment.getPersonalEndTime())
                .remainingSeconds(remainingSeconds)
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

        Exam exam = enrollment.getExam();
        if (!isDetectionEnabled(exam, request.getEventType())) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        // A22: Proctoring log trusts client timestamp - fixed to server time
        LocalDateTime clientTime = request.getTimestamp();

        // A23: Proctoring endpoint can be spammed - Debounce 5s
        long recentEvents = proctoringLogRepository.countByEnrollmentIdAndEventTypeAndFlaggedAtAfter(
                enrollment.getId(), request.getEventType(), now.minusSeconds(5));

        if (recentEvents > 0) {
            return; // Ignore duplicate event within 5s
        }

        ProctoringLog log = ProctoringLog.builder()
                .enrollment(enrollment)
                .eventType(request.getEventType())
                .flaggedAt(now)
                .clientReportedAt(clientTime)
                .imageUrl(request.getImageUrl())
                .audioUrl(request.getAudioUrl())
                .severity(resolveSeverity(request.getEventType()))
                .build();

        proctoringLogRepository.save(log);

        if (request.getEventType() == ProctoringEventType.TAB_SWITCH) {
            checkTabSwitchLimit(enrollment);
        }
    }

    private boolean isDetectionEnabled(Exam exam, ProctoringEventType type) {
        return switch (type) {
            case NO_FACE, MULTIPLE_FACES, GAZE_AWAY -> Boolean.TRUE.equals(exam.getEnableFaceDetection());
            case OBJECT_DETECTED -> Boolean.TRUE.equals(exam.getEnableObjectDetection());
            case TAB_SWITCH -> Boolean.TRUE.equals(exam.getEnableTabSwitchDetection());
            case AUDIO_DETECTED -> Boolean.TRUE.equals(exam.getEnableAudioDetection());
            case NO_CAMERA -> Boolean.TRUE.equals(exam.getRequireCamera());
            case NO_MIC -> Boolean.TRUE.equals(exam.getRequireMic());
            case SCREEN_SHARE_STOPPED -> Boolean.TRUE.equals(exam.getRequireScreenShare());
        };
    }

    private void checkTabSwitchLimit(ExamEnrollment enrollment) {
        Exam exam = enrollment.getExam();
        if (exam.getMaxTabSwitches() == null) return; // host didn't set a limit

        long count = proctoringLogRepository.countByEnrollmentIdAndEventType(
                enrollment.getId(), ProctoringEventType.TAB_SWITCH);

        if (count >= exam.getMaxTabSwitches()) {
            SubmitExamRequest emptyRequest = new SubmitExamRequest();
            emptyRequest.setAnswers(new java.util.HashMap<>());
            submitExam(enrollment.getId(), emptyRequest, enrollment.getCandidate().getEmail());
        }
    }

    private static final Map<ProctoringEventType, Double> DEDUCTIONS = Map.of(
        ProctoringEventType.GAZE_AWAY, 1.0,
        ProctoringEventType.NO_FACE, 3.0,
        ProctoringEventType.TAB_SWITCH, 4.0,
        ProctoringEventType.AUDIO_DETECTED, 3.0,
        ProctoringEventType.MULTIPLE_FACES, 8.0,
        ProctoringEventType.OBJECT_DETECTED, 10.0,
        ProctoringEventType.NO_CAMERA, 10.0,
        ProctoringEventType.NO_MIC, 6.0,
        ProctoringEventType.SCREEN_SHARE_STOPPED, 10.0
    );

    private Severity resolveSeverity(ProctoringEventType type) {
        return switch (type) {
            case GAZE_AWAY -> Severity.LOW;
            case NO_FACE, TAB_SWITCH, AUDIO_DETECTED -> Severity.MEDIUM;
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
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new RuntimeException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new RuntimeException("This exam is no longer open for submission.");
        }

        if (resultRepository.findByEnrollmentId(enrollmentId).isPresent()) {
            return;
        }

        boolean isLate = false;
        LocalDateTime now = LocalDateTime.now();
        if (enrollment.getPersonalEndTime() != null && now.isAfter(enrollment.getPersonalEndTime().plusSeconds(30))) {
            isLate = true;
        }

        Exam exam = enrollment.getExam();
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
            StringBuilder sb = new StringBuilder();
            for (CandidateAnswer ans : wrongAnswers) {
                sb.append("Question: ").append(ans.getQuestion().getQuestionText()).append("\n");
                sb.append("Candidate answered: ").append(ans.getCandidateAnswer()).append("\n");
                sb.append("Correct answer was: ").append(ans.getQuestion().getCorrectAnswer()).append("\n");
                if (ans.getQuestion().getTopic() != null) {
                    sb.append("Topic: ").append(ans.getQuestion().getTopic()).append("\n");
                }
                sb.append("\n");
            }
            try {
                GeminiService.GeminiFeedbackResult feedback = geminiService.generateFeedback(sb.toString());
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
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new RuntimeException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.SUBMITTED && enrollment.getStatus() != EnrollmentStatus.EXPIRED) {
            throw new RuntimeException("Exam is not completed yet.");
        }

        Result result = resultRepository.findByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Result not found."));

        if (result.getAiFeedback() == null || result.getAiFeedback().isEmpty()) {
            // Lazy generation fallback (A18)
            generateAiFeedback(enrollment, result);
        }

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
                .build();
    }

    public List<com.assessmate.dto.CandidateAnswerReviewDTO> getAnswerReview(Long enrollmentId, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new RuntimeException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.SUBMITTED && enrollment.getStatus() != EnrollmentStatus.EXPIRED) {
            throw new RuntimeException("Exam is not completed yet.");
        }

        List<CandidateAnswer> answers = candidateAnswerRepository.findByEnrollmentId(enrollmentId);
        
        return answers.stream().map(a -> {
            Question q = a.getQuestion();
            List<com.assessmate.dto.CandidateAnswerReviewDTO.OptionDTO> options = new java.util.ArrayList<>();
            if (q.getType() == QuestionType.SINGLE_CHOICE || q.getType() == QuestionType.MULTIPLE_SELECT) {
                if (q.getOptionA() != null && !q.getOptionA().trim().isEmpty()) options.add(com.assessmate.dto.CandidateAnswerReviewDTO.OptionDTO.builder().key("A").value(q.getOptionA()).build());
                if (q.getOptionB() != null && !q.getOptionB().trim().isEmpty()) options.add(com.assessmate.dto.CandidateAnswerReviewDTO.OptionDTO.builder().key("B").value(q.getOptionB()).build());
                if (q.getOptionC() != null && !q.getOptionC().trim().isEmpty()) options.add(com.assessmate.dto.CandidateAnswerReviewDTO.OptionDTO.builder().key("C").value(q.getOptionC()).build());
                if (q.getOptionD() != null && !q.getOptionD().trim().isEmpty()) options.add(com.assessmate.dto.CandidateAnswerReviewDTO.OptionDTO.builder().key("D").value(q.getOptionD()).build());
            }

            return com.assessmate.dto.CandidateAnswerReviewDTO.builder()
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
        }).collect(java.util.stream.Collectors.toList());
    }

    public org.springframework.data.domain.Page<CandidateHistoryDTO> getCandidateHistory(String candidateEmail, org.springframework.data.domain.Pageable pageable) {
        User candidate = userRepository.findByEmail(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));

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
            
            if (e.getStatus() == EnrollmentStatus.SUBMITTED || e.getStatus() == EnrollmentStatus.EXPIRED) {
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
        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new RuntimeException("You do not have access to this enrollment.");
        }

        if (enrollment.getStatus() != EnrollmentStatus.ONGOING) {
            throw new RuntimeException("This exam is no longer open for submission.");
        }

        Exam exam = enrollment.getExam();
        List<Question> questions = questionRepository.findByExamId(exam.getId());

        candidateAnswerRepository.deleteByEnrollmentId(enrollmentId);

        java.util.List<CandidateAnswer> answersToSave = new java.util.ArrayList<>();
        for (Question q : questions) {
            String candidateAnswerStr = request.getAnswers() != null ? request.getAnswers().get(q.getId()) : null;
            if (candidateAnswerStr != null && !candidateAnswerStr.trim().isEmpty()) {
                CandidateAnswer answer = CandidateAnswer.builder()
                        .enrollment(enrollment)
                        .question(q)
                        .candidateAnswer(candidateAnswerStr.trim())
                        .isCorrect(null)
                        .marksAwarded(0.0)
                        .build();
                answersToSave.add(answer);
            }
        }
        candidateAnswerRepository.saveAll(answersToSave);
    }

    public java.util.Map<String, Object> getExamState(Long enrollmentId, String candidateEmail) {
        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        if (!enrollment.getCandidate().getEmail().equals(candidateEmail)) {
            throw new RuntimeException("You do not have access to this enrollment.");
        }

        java.util.Map<String, Object> state = new java.util.HashMap<>();
        state.put("status", enrollment.getStatus().name());
        
        if (enrollment.getStatus() == EnrollmentStatus.ONGOING) {
            LocalDateTime now = LocalDateTime.now();
            long remainingSeconds = 0;
            if (enrollment.getPersonalEndTime() != null && now.isBefore(enrollment.getPersonalEndTime())) {
                remainingSeconds = java.time.Duration.between(now, enrollment.getPersonalEndTime()).getSeconds();
            }
            state.put("remainingSeconds", remainingSeconds);
        }

        return state;
    }

    public java.util.Map<String, Object> getDashboard(String candidateEmail) {
        User candidate = userRepository.findByEmail(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));

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