package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.exception.*;
import com.assessmate.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CodingQuestionService {

    private final CodingQuestionRepository codingQuestionRepository;
    private final TestCaseRepository testCaseRepository;
    private final CodeSubmissionRepository codeSubmissionRepository;
    private final TestCaseResultRepository testCaseResultRepository;
    private final CodingAssignmentRepository codingAssignmentRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ExamEnrollmentRepository examEnrollmentRepository;
    private final Judge0Service judge0Service;
    private final GeminiService geminiService;


    // ─────────────────────────────────────────
    // ADD TO EXAM POOL
    // ─────────────────────────────────────────

    @Transactional
    public CodingQuestionResponse addToExam(
            Long examId,
            CodingQuestionRequest req,
            String hostEmail) {

        Exam exam = validateExamAccess(examId, hostEmail);
        User host = getUser(hostEmail);
        validateRequest(req);

        String allowedLangs = buildAllowedLanguages(req.getAllowedLanguages());

        CodingQuestion question = CodingQuestion.builder()
                .exam(exam)
                .createdBy(host)
                .title(req.getTitle())
                .description(req.getDescription())
                .constraints(req.getConstraints())
                .sampleInput(req.getSampleInput())
                .sampleOutput(req.getSampleOutput())
                .explanation(req.getExplanation())
                .allowedLanguages(allowedLangs)
                .timeLimitSeconds(
                        req.getTimeLimitSeconds() != null
                                ? req.getTimeLimitSeconds() : 2)
                .memoryLimitMb(
                        req.getMemoryLimitMb() != null
                                ? req.getMemoryLimitMb() : 256)
                .marks(req.getMarks())
                .partialMarking(
                        req.getPartialMarking() != null
                                ? req.getPartialMarking() : false)
                .isGlobal(false)
                .build();

        CodingQuestion saved = codingQuestionRepository.save(question);
        saveTestCases(saved, req.getTestCases());

        if (Boolean.TRUE.equals(req.getSaveToBank())) {
            saveToBankCopy(host, req, allowedLangs);
        }

        return mapToResponse(saved, true);
    }

    // ─────────────────────────────────────────
    // ADD TO GLOBAL BANK
    // ─────────────────────────────────────────

    @Transactional
    public CodingQuestionResponse addToBank(
            CodingQuestionRequest req,
            String hostEmail) {

        User host = getUser(hostEmail);
        validateRequest(req);

        String allowedLangs = buildAllowedLanguages(req.getAllowedLanguages());

        CodingQuestion question = CodingQuestion.builder()
                .exam(null)
                .createdBy(host)
                .title(req.getTitle())
                .description(req.getDescription())
                .constraints(req.getConstraints())
                .sampleInput(req.getSampleInput())
                .sampleOutput(req.getSampleOutput())
                .explanation(req.getExplanation())
                .allowedLanguages(allowedLangs)
                .timeLimitSeconds(
                        req.getTimeLimitSeconds() != null
                                ? req.getTimeLimitSeconds() : 2)
                .memoryLimitMb(
                        req.getMemoryLimitMb() != null
                                ? req.getMemoryLimitMb() : 256)
                .marks(req.getMarks())
                .partialMarking(
                        req.getPartialMarking() != null
                                ? req.getPartialMarking() : false)
                .isGlobal(true)
                .build();

        CodingQuestion saved = codingQuestionRepository.save(question);
        saveTestCases(saved, req.getTestCases());

        return mapToResponse(saved, true);
    }

    // ─────────────────────────────────────────
    // ADD FROM BANK TO EXAM
    // ─────────────────────────────────────────

    @Transactional
    public List<CodingQuestionResponse> addFromBank(
            Long examId,
            List<Long> questionIds,
            String hostEmail) {

        Exam exam = validateExamAccess(examId, hostEmail);
        User host = getUser(hostEmail);

        if (questionIds == null || questionIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<CodingQuestionResponse> added = new ArrayList<>();

        for (Long qId : questionIds) {
            CodingQuestion original = codingQuestionRepository.findById(qId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Coding question not found: " + qId));

            if (!original.getCreatedBy().getId().equals(host.getId())) {
                throw new ForbiddenException(
                        "You can only add questions from your own bank.");
            }

            CodingQuestion copy = CodingQuestion.builder()
                    .exam(exam)
                    .createdBy(host)
                    .title(original.getTitle())
                    .description(original.getDescription())
                    .constraints(original.getConstraints())
                    .sampleInput(original.getSampleInput())
                    .sampleOutput(original.getSampleOutput())
                    .explanation(original.getExplanation())
                    .allowedLanguages(original.getAllowedLanguages())
                    .timeLimitSeconds(original.getTimeLimitSeconds())
                    .memoryLimitMb(original.getMemoryLimitMb())
                    .marks(original.getMarks())
                    .partialMarking(original.getPartialMarking())
                    .isGlobal(false)
                    .build();

            CodingQuestion savedCopy = codingQuestionRepository.save(copy);

            List<TestCase> originalTcs = testCaseRepository.findByCodingQuestionId(original.getId());
            for (TestCase tc : originalTcs) {
                testCaseRepository.save(
                        TestCase.builder()
                                .codingQuestion(savedCopy)
                                .input(tc.getInput())
                                .expectedOutput(tc.getExpectedOutput())
                                .isHidden(tc.getIsHidden())
                                .points(tc.getPoints())
                                .orderIndex(tc.getOrderIndex())
                                .build());
            }

            added.add(mapToResponse(savedCopy, true));
        }

        return added;
    }

    // ─────────────────────────────────────────
    // GET EXAM POOL — HOST VIEW
    // ─────────────────────────────────────────

    public List<CodingQuestionResponse> getExamPool(
            Long examId,
            String hostEmail) {

        validateExamAccess(examId, hostEmail);

        return codingQuestionRepository.findByExamId(examId)
                .stream()
                .map(q -> mapToResponse(q, true))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────
    // GET ASSIGNED PROBLEMS — CANDIDATE VIEW
    // ─────────────────────────────────────────

    @Transactional
    public List<CodingQuestionResponse> getAssignedProblems(
            Long examId,
            String candidateEmail) {

        User candidate = getUser(candidateEmail);

        if (candidate.getRole() != Role.CANDIDATE) {
            throw new ForbiddenException("Only candidates can access exam problems.");
        }

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found."));

        if (exam.getStatus() != ExamStatus.LIVE) {
            throw new BadRequestException("Exam is not currently active.");
        }

        if (!Boolean.TRUE.equals(exam.getHasCodingSection())) {
            throw new BadRequestException("This exam has no coding section.");
        }

        Long enrollmentId = examEnrollmentRepository.findByExamAndCandidate(exam, candidate)
                .map(ExamEnrollment::getId)
                .orElse(candidate.getId());

        boolean alreadyAssigned = codingAssignmentRepository.existsByEnrollmentId(enrollmentId);

        if (alreadyAssigned) {
            return codingAssignmentRepository
                    .findByEnrollmentIdOrderByOrderIndexAsc(enrollmentId)
                    .stream()
                    .map(a -> mapToResponse(a.getCodingQuestion(), false))
                    .collect(Collectors.toList());
        }

        List<CodingQuestion> pool = codingQuestionRepository.findByExamId(examId);
        int count = exam.getCodingQuestionsCount() != null ? exam.getCodingQuestionsCount() : 1;

        if (pool.size() < count) {
            throw new BadRequestException("Not enough coding problems in exam pool.");
        }

        Collections.shuffle(pool);
        List<CodingQuestion> assigned = pool.subList(0, count);

        for (int i = 0; i < assigned.size(); i++) {
            codingAssignmentRepository.save(
                    CodingAssignment.builder()
                            .enrollmentId(enrollmentId)
                            .codingQuestion(assigned.get(i))
                            .orderIndex(i)
                            .build());
        }

        return assigned.stream()
                .map(q -> mapToResponse(q, false))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────
    // GET GLOBAL CODING BANK
    // ─────────────────────────────────────────

    public List<CodingQuestionResponse> getGlobalBank(String hostEmail) {
        User host = getUser(hostEmail);
        return codingQuestionRepository
                .findByCreatedByIdAndIsGlobalTrue(host.getId())
                .stream()
                .map(q -> mapToResponse(q, true))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────
    // RUN CODE — sample test
    // ─────────────────────────────────────────

    public RunCodeResponse runCode(
            RunCodeRequest req,
            String candidateEmail) {

        User candidate = getUser(candidateEmail);

        CodingQuestion question = codingQuestionRepository
                .findById(req.getCodingQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found."));

        Language language = validateLanguage(
                req.getLanguage(),
                question.getAllowedLanguages());

        String input = req.getCustomInput() != null && !req.getCustomInput().isEmpty()
                ? req.getCustomInput()
                : question.getSampleInput();

        log.info("Run code: candidateId={}, questionId={}, language={}",
                candidate.getId(), question.getId(), language.name());

        return judge0Service.runCode(
                req.getSourceCode(),
                language,
                input,
                question.getSampleOutput(),
                question.getTimeLimitSeconds(),
                question.getMemoryLimitMb());
    }

    // ─────────────────────────────────────────
    // SUBMIT CODE — all test cases
    // ─────────────────────────────────────────

    @Transactional
    public CodeSubmissionResponse submitCode(
            CodeSubmissionRequest req,
            String candidateEmail) {

        User candidate = getUser(candidateEmail);

        if (candidate.getRole() != Role.CANDIDATE) {
            throw new ForbiddenException("Only candidates can submit code.");
        }

        CodingQuestion question = codingQuestionRepository
                .findById(req.getCodingQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found."));

        if (question.getExam() == null) {
            throw new BadRequestException("This problem is not attached to an active exam.");
        }

        Exam exam = question.getExam();
        if (exam.getStatus() != ExamStatus.LIVE) {
            throw new BadRequestException("Exam is no longer active. Submissions are closed.");
        }

        Long enrollmentId = req.getEnrollmentId() != null
                ? req.getEnrollmentId()
                : examEnrollmentRepository.findByExamAndCandidate(exam, candidate)
                    .map(ExamEnrollment::getId)
                    .orElse(candidate.getId());

        boolean isAssigned = codingAssignmentRepository
                .findByEnrollmentIdOrderByOrderIndexAsc(enrollmentId)
                .stream()
                .anyMatch(a -> a.getCodingQuestion().getId().equals(question.getId()));

        if (!isAssigned && !enrollmentId.equals(candidate.getId())) {
            isAssigned = codingAssignmentRepository
                    .findByEnrollmentIdOrderByOrderIndexAsc(candidate.getId())
                    .stream()
                    .anyMatch(a -> a.getCodingQuestion().getId().equals(question.getId()));
        }

        if (!isAssigned) {
            throw new ForbiddenException("This problem was not assigned to you in this exam.");
        }

        Language language = validateLanguage(
                req.getLanguage(),
                question.getAllowedLanguages());

        List<TestCase> testCases = testCaseRepository.findByCodingQuestionId(question.getId());
        if (testCases.isEmpty()) {
            throw new BadRequestException("No test cases found for this problem.");
        }

        log.info("Code submission: candidateId={}, questionId={}, language={}, testCases={}",
                candidate.getId(), question.getId(), language.name(), testCases.size());

        CodeSubmission submission = CodeSubmission.builder()
                .candidate(candidate)
                .codingQuestion(question)
                .enrollmentId(enrollmentId)
                .language(language)
                .sourceCode(req.getSourceCode())
                .status(SubmissionStatus.RUNNING)
                .totalTestCases(testCases.size())
                .isFinal(true)
                .build();

        submission = codeSubmissionRepository.save(submission);

        List<TestCaseResult> results = judge0Service.submitCode(
                req.getSourceCode(),
                language,
                testCases,
                question.getTimeLimitSeconds(),
                question.getMemoryLimitMb(),
                submission);

        testCaseResultRepository.saveAll(results);

        long passed = results.stream()
                .filter(r -> r.getStatus() == SubmissionStatus.ACCEPTED)
                .count();

        submission.setTestCasesPassed((int) passed);

        double marksAwarded = calculateMarks(question, results, passed);
        submission.setMarksAwarded(marksAwarded);

        SubmissionStatus finalStatus;
        if (passed == testCases.size()) {
            finalStatus = SubmissionStatus.ACCEPTED;
        } else if (passed > 0) {
            finalStatus = SubmissionStatus.PARTIAL;
        } else {
            boolean hasCE = results.stream().anyMatch(r -> r.getStatus() == SubmissionStatus.CE);
            finalStatus = hasCE ? SubmissionStatus.CE : SubmissionStatus.WRONG;
        }

        submission.setStatus(finalStatus);
        submission = codeSubmissionRepository.save(submission);

        return mapSubmissionToResponse(submission, results);
    }

    // ─────────────────────────────────────────
    // AI GENERATE CODING PROBLEM
    // Single method for topic and description
    // Host reviews before saving
    // ─────────────────────────────────────────

    public AICodingGenerationResponse
            generateCodingProblem(
                Long examId,
                AICodingGenerationRequest req,
                String hostEmail) {

        // Validate exam access
        validateExamAccess(examId, hostEmail);

        if (req.getInput() == null
                || req.getInput().trim().isEmpty()) {
            throw new BadRequestException(
                "Please provide a topic or " +
                "description to generate from.");
        }

        // Auto-detect input type
        String detectedType = detectInputType(
            req.getInput(), req.getInputType());

        try {
            // Generate via Gemini
            GeminiService.CodingProblemGenerated
                generated =
                geminiService.generateCodingProblem(
                    req.getInput(),
                    detectedType,
                    req.getDifficulty(),
                    req.getTestCaseCount() != null
                        ? req.getTestCaseCount() : 4);

            // Build CodingQuestionRequest
            // from generated content
            // Host will review and optionally
            // edit before saving
            CodingQuestionRequest questionReq =
                new CodingQuestionRequest();

            questionReq.setTitle(
                generated.getTitle());
            questionReq.setDescription(
                generated.getDescription());
            questionReq.setConstraints(
                generated.getConstraints());
            questionReq.setSampleInput(
                generated.getSampleInput());
            questionReq.setSampleOutput(
                generated.getSampleOutput());
            questionReq.setExplanation(
                generated.getExplanation());

            // Use suggested values or
            // host overrides from request
            questionReq.setMarks(
                req.getMarks() != null
                ? req.getMarks()
                : generated.getSuggestedMarks());

            questionReq.setTimeLimitSeconds(
                req.getTimeLimitSeconds() != null
                ? req.getTimeLimitSeconds()
                : generated.getSuggestedTimeLimit());

            questionReq.setMemoryLimitMb(
                req.getMemoryLimitMb() != null
                ? req.getMemoryLimitMb() : 256);

            questionReq.setAllowedLanguages(
                req.getAllowedLanguages());

            questionReq.setPartialMarking(true);

            questionReq.setSaveToBank(
                req.getSaveToBank());

            questionReq.setTestCases(
                generated.getTestCases());

            return AICodingGenerationResponse
                .builder()
                .generated(questionReq)
                .detectedInputType(detectedType)
                .originalInput(req.getInput())
                .warning(
                    "Please review all test cases " +
                    "before saving. AI-generated " +
                    "expected outputs must be " +
                    "verified manually for accuracy.")
                .success(true)
                .build();

        } catch (Exception e) {
            log.error(
                "Coding problem generation failed: {}",
                e.getMessage());
            return AICodingGenerationResponse
                .builder()
                .success(false)
                .error(
                    "Generation failed: " +
                    e.getMessage() +
                    ". Please try again or " +
                    "rephrase your input.")
                .originalInput(req.getInput())
                .detectedInputType(detectedType)
                .build();
        }
    }

    // Detect if input is topic or description
    private String detectInputType(
            String input, String requested) {

        // If host explicitly set type use it
        if (requested != null
                && !requested.equals("AUTO")) {
            return requested;
        }

        // Auto-detect by word count
        String[] words = input.trim().split("\\s+");
        if (words.length <= 10) {
            return "TOPIC";
        } else {
            return "DESCRIPTION";
        }
    }

    // ─────────────────────────────────────────
    // EDIT QUESTION

    // ─────────────────────────────────────────

    @Transactional
    public CodingQuestionResponse editQuestion(
            Long id,
            CodingQuestionRequest req,
            String hostEmail) {

        CodingQuestion question = codingQuestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coding question not found."));

        if (!question.getCreatedBy().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("Not authorized to edit this question.");
        }

        validateRequest(req);

        question.setTitle(req.getTitle());
        question.setDescription(req.getDescription());
        question.setConstraints(req.getConstraints());
        question.setSampleInput(req.getSampleInput());
        question.setSampleOutput(req.getSampleOutput());
        question.setExplanation(req.getExplanation());
        question.setAllowedLanguages(buildAllowedLanguages(req.getAllowedLanguages()));

        if (req.getTimeLimitSeconds() != null) {
            question.setTimeLimitSeconds(req.getTimeLimitSeconds());
        }
        if (req.getMemoryLimitMb() != null) {
            question.setMemoryLimitMb(req.getMemoryLimitMb());
        }
        if (req.getMarks() != null) {
            question.setMarks(req.getMarks());
        }
        if (req.getPartialMarking() != null) {
            question.setPartialMarking(req.getPartialMarking());
        }

        if (req.getTestCases() != null && !req.getTestCases().isEmpty()) {
            testCaseRepository.deleteAll(testCaseRepository.findByCodingQuestionId(id));
            saveTestCases(question, req.getTestCases());
        }

        return mapToResponse(codingQuestionRepository.save(question), true);
    }

    // ─────────────────────────────────────────
    // DELETE QUESTION
    // ─────────────────────────────────────────

    @Transactional
    public void deleteQuestion(Long id, String hostEmail) {
        CodingQuestion question = codingQuestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coding question not found."));

        if (!question.getCreatedBy().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("Not authorized to delete this question.");
        }

        testCaseRepository.deleteAll(testCaseRepository.findByCodingQuestionId(id));
        codingQuestionRepository.delete(question);
    }

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────

    private void validateRequest(CodingQuestionRequest req) {
        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Problem title is required.");
        }
        if (req.getDescription() == null || req.getDescription().trim().isEmpty()) {
            throw new BadRequestException("Problem description is required.");
        }
        if (req.getSampleOutput() == null || req.getSampleOutput().trim().isEmpty()) {
            throw new BadRequestException("Sample output is required.");
        }
        if (req.getMarks() == null || req.getMarks() <= 0) {
            throw new BadRequestException("Marks must be greater than 0.");
        }
        if (req.getTestCases() == null || req.getTestCases().isEmpty()) {
            throw new BadRequestException("At least one test case is required.");
        }
        for (TestCaseRequest tc : req.getTestCases()) {
            if (tc.getExpectedOutput() == null || tc.getExpectedOutput().trim().isEmpty()) {
                throw new BadRequestException("Each test case must have an expected output.");
            }
        }
    }

    private void saveTestCases(CodingQuestion question, List<TestCaseRequest> testCaseReqs) {
        if (testCaseReqs == null) return;
        int index = 0;
        for (TestCaseRequest tcReq : testCaseReqs) {
            testCaseRepository.save(
                    TestCase.builder()
                            .codingQuestion(question)
                            .input(tcReq.getInput() != null ? tcReq.getInput() : "")
                            .expectedOutput(tcReq.getExpectedOutput())
                            .isHidden(tcReq.getIsHidden() != null ? tcReq.getIsHidden() : true)
                            .points(tcReq.getPoints() != null ? tcReq.getPoints() : 1)
                            .orderIndex(index++)
                            .build());
        }
    }

    private void saveToBankCopy(User host, CodingQuestionRequest req, String allowedLangs) {
        CodingQuestion bankCopy = CodingQuestion.builder()
                .exam(null)
                .createdBy(host)
                .title(req.getTitle())
                .description(req.getDescription())
                .constraints(req.getConstraints())
                .sampleInput(req.getSampleInput())
                .sampleOutput(req.getSampleOutput())
                .explanation(req.getExplanation())
                .allowedLanguages(allowedLangs)
                .timeLimitSeconds(req.getTimeLimitSeconds() != null ? req.getTimeLimitSeconds() : 2)
                .memoryLimitMb(req.getMemoryLimitMb() != null ? req.getMemoryLimitMb() : 256)
                .marks(req.getMarks())
                .partialMarking(req.getPartialMarking() != null ? req.getPartialMarking() : false)
                .isGlobal(true)
                .build();

        CodingQuestion saved = codingQuestionRepository.save(bankCopy);
        saveTestCases(saved, req.getTestCases());
    }

    private double calculateMarks(CodingQuestion question, List<TestCaseResult> results, long passed) {
        if (Boolean.TRUE.equals(question.getPartialMarking())) {
            int totalPoints = results.stream().mapToInt(r -> r.getTestCase().getPoints()).sum();
            int earnedPoints = results.stream()
                    .filter(r -> r.getStatus() == SubmissionStatus.ACCEPTED)
                    .mapToInt(r -> r.getTestCase().getPoints())
                    .sum();
            if (totalPoints == 0) return 0.0;
            return question.getMarks() * earnedPoints / totalPoints;
        } else {
            return passed == results.size() ? question.getMarks() : 0.0;
        }
    }

    private Language validateLanguage(String langName, String allowedLangs) {
        Language language;
        try {
            language = Language.fromName(langName);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown language: " + langName);
        }

        List<String> allowed = Arrays.asList(allowedLangs.split(","));
        if (!allowed.contains(language.name())) {
            throw new ForbiddenException(langName + " is not allowed for this problem.");
        }

        return language;
    }

    private String buildAllowedLanguages(List<String> languages) {
        if (languages == null || languages.isEmpty()) {
            return Arrays.stream(Language.values())
                    .map(Language::name)
                    .collect(Collectors.joining(","));
        }

        return languages.stream()
                .map(lang -> {
                    try {
                        return Language.fromName(lang).name();
                    } catch (IllegalArgumentException e) {
                        throw new BadRequestException("Unknown language: " + lang);
                    }
                })
                .collect(Collectors.joining(","));
    }

    private Exam validateExamAccess(Long examId, String hostEmail) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found."));

        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("Not authorized to modify this exam.");
        }

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new BadRequestException("Coding questions can only be added while exam is in DRAFT status.");
        }

        return exam;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    // ─────────────────────────────────────────
    // RESPONSE MAPPING
    // ─────────────────────────────────────────

    public CodingQuestionResponse mapToResponse(CodingQuestion q, boolean includeHidden) {
        List<TestCase> testCases = testCaseRepository.findByCodingQuestionId(q.getId());

        List<TestCaseResponse> tcResponses = testCases.stream()
                .filter(tc -> includeHidden || !Boolean.TRUE.equals(tc.getIsHidden()))
                .map(tc -> {
                    TestCaseResponse.TestCaseResponseBuilder builder = TestCaseResponse.builder()
                            .id(tc.getId())
                            .isHidden(tc.getIsHidden())
                            .orderIndex(tc.getOrderIndex());

                    if (includeHidden) {
                        builder.input(tc.getInput())
                                .expectedOutput(tc.getExpectedOutput())
                                .points(tc.getPoints());
                    } else {
                        if (!Boolean.TRUE.equals(tc.getIsHidden())) {
                            builder.input(tc.getInput())
                                    .expectedOutput(tc.getExpectedOutput());
                        }
                    }

                    return builder.build();
                })
                .collect(Collectors.toList());

        List<String> allowedLangs = Arrays.asList(q.getAllowedLanguages().split(","));

        return CodingQuestionResponse.builder()
                .id(q.getId())
                .examId(q.getExam() != null ? q.getExam().getId() : null)
                .createdByName(q.getCreatedBy().getName())
                .title(q.getTitle())
                .description(q.getDescription())
                .constraints(q.getConstraints())
                .sampleInput(q.getSampleInput())
                .sampleOutput(q.getSampleOutput())
                .explanation(q.getExplanation())
                .allowedLanguages(allowedLangs)
                .timeLimitSeconds(q.getTimeLimitSeconds())
                .memoryLimitMb(q.getMemoryLimitMb())
                .marks(q.getMarks())
                .partialMarking(q.getPartialMarking())
                .isGlobal(q.getIsGlobal())
                .orderIndex(q.getOrderIndex())
                .createdAt(q.getCreatedAt())
                .testCases(tcResponses)
                .build();
    }

    private CodeSubmissionResponse mapSubmissionToResponse(CodeSubmission sub, List<TestCaseResult> results) {
        List<TestCaseResultResponse> resultResponses = results.stream()
                .map(r -> {
                    TestCaseResultResponse.TestCaseResultResponseBuilder builder = TestCaseResultResponse.builder()
                            .testCaseId(r.getTestCase().getId())
                            .status(r.getStatus().name())
                            .isHidden(r.getIsHidden())
                            .executionTimeMs(r.getExecutionTimeMs())
                            .memoryUsedKb(r.getMemoryUsedKb());

                    if (!Boolean.TRUE.equals(r.getIsHidden())) {
                        builder.input(r.getTestCase().getInput())
                                .expectedOutput(r.getTestCase().getExpectedOutput())
                                .actualOutput(r.getActualOutput());
                    }

                    return builder.build();
                })
                .collect(Collectors.toList());

        return CodeSubmissionResponse.builder()
                .id(sub.getId())
                .codingQuestionId(sub.getCodingQuestion().getId())
                .problemTitle(sub.getCodingQuestion().getTitle())
                .language(sub.getLanguage().name())
                .status(sub.getStatus().name())
                .testCasesPassed(sub.getTestCasesPassed())
                .totalTestCases(sub.getTotalTestCases())
                .marksAwarded(sub.getMarksAwarded())
                .executionTimeMs(sub.getExecutionTimeMs())
                .memoryUsedKb(sub.getMemoryUsedKb())
                .compileOutput(sub.getCompileOutput())
                .isFinal(sub.getIsFinal())
                .submittedAt(sub.getSubmittedAt())
                .testCaseResults(resultResponses)
                .build();
    }
}
