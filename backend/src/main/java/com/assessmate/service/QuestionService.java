package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.entity.ExamStatus;
import com.assessmate.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository
            questionRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads/questions/}")
    private String uploadDir;

    // ─────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────

    private void validateQuestion(
            QuestionRequest req) {

        if (req.getQuestionText() == null
                || req.getQuestionText()
                .trim().isEmpty()) {
            throw new RuntimeException(
                    "Question text is required");
        }
        if (req.getType() == null) {
            throw new RuntimeException(
                    "Question type is required");
        }
        if (req.getDifficulty() == null) {
            throw new RuntimeException(
                    "Difficulty is required");
        }
        if (req.getCorrectAnswer() == null
                || req.getCorrectAnswer()
                .trim().isEmpty()) {
            throw new RuntimeException(
                    "Correct answer is required");
        }

        if (req.getType() ==
                QuestionType.SINGLE_CHOICE ||
                req.getType() ==
                        QuestionType.MULTIPLE_SELECT) {

            if (req.getOptionA() == null
                    || req.getOptionB() == null
                    || req.getOptionC() == null
                    || req.getOptionD() == null) {
                throw new RuntimeException(
                        "All 4 options are required " +
                                "for this question type");
            }

            if (req.getType() ==
                    QuestionType.SINGLE_CHOICE) {
                String ans = req.getCorrectAnswer()
                        .trim().toUpperCase();
                if (!ans.matches("[ABCD]")) {
                    throw new RuntimeException(
                            "Correct answer must be " +
                                    "A, B, C, or D");
                }
                req.setCorrectAnswer(ans);
            }

            if (req.getType() ==
                    QuestionType.MULTIPLE_SELECT) {
                String normalized =
                        normalizeMultipleAnswers(
                                req.getCorrectAnswer());
                if (normalized.isBlank()) {
                    throw new RuntimeException(
                            "At least one correct " +
                                    "answer is required");
                }
                for (String ans :
                        normalized.split(",")) {
                    if (!ans.matches("[ABCD]")) {
                        throw new RuntimeException(
                                "Correct answers must " +
                                        "be A, B, C, or D — " +
                                        "example: A,C,D");
                    }
                }
                req.setCorrectAnswer(normalized);
            }
        }

        if (req.getType() ==
                QuestionType.NUMERICAL) {
            try {
                Double.parseDouble(
                        req.getCorrectAnswer());
            } catch (NumberFormatException e) {
                throw new RuntimeException(
                        "Correct answer for numerical " +
                                "question must be a number");
            }
            if (req.getTolerance() != null
                    && req.getTolerance() < 0) {
                throw new RuntimeException(
                        "Tolerance cannot be negative");
            }
        }
    }

    private String normalizeMultipleAnswers(
            String answer) {
        return Arrays.stream(answer.split(","))
                .map(String::trim)
                .map(String::toUpperCase)
                .filter(s -> !s.isEmpty())
                .distinct()
                .sorted()
                .collect(Collectors.joining(","));
    }

    // ─────────────────────────────────────────
    // GLOBAL BANK METHODS
    // ─────────────────────────────────────────

    @Transactional
    public QuestionResponse addToBank(
            QuestionRequest req,
            MultipartFile image,
            String hostEmail) throws IOException {

        validateQuestion(req);

        User host = userRepository
                .findByEmail(hostEmail)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Host not found"));

        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            imageUrl = saveImage(image);
        }

        Question question = buildQuestion(
                req, null, host, imageUrl,
                "MANUAL", true, true);

        return mapToResponse(
                questionRepository.save(question));
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> getGlobalBank(
            String hostEmail,
            QuestionBankFilterRequest filter) {

        if (filter == null) {
            filter = new QuestionBankFilterRequest();
        }

        User host = userRepository
            .findByEmail(hostEmail)
            .orElseThrow(() ->
                new ResourceNotFoundException(
                    "Host not found."));

        List<Question> questions =
            questionRepository
                .findByHostFiltered(
                    host.getId(),
                    filter.getDifficulty(),
                    filter.getType(),
                    filter.getTopic(),
                    filter.getSearch());

        return questions.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public List<QuestionResponse> addFromBank(
            AddFromBankRequest req,
            String hostEmail) {

        Exam exam = examRepository
                .findById(req.getExamId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Exam not found"));

        // Ownership check
        if (!exam.getHost().getEmail()
                .equals(hostEmail)) {
            throw new RuntimeException(
                    "You are not authorized " +
                            "to modify this exam");
        }

        // Block if not DRAFT
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new RuntimeException(
                    "Questions can only be added " +
                            "while the exam is in DRAFT status");
        }

        User host = userRepository
                .findByEmail(hostEmail)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Host not found"));

        List<QuestionResponse> added =
                new ArrayList<>();

        for (Long questionId :
                req.getQuestionIds()) {

            Question original =
                    questionRepository
                            .findById(questionId)
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Question not found: "
                                                    + questionId));

            // Security ownership check
            if (!Boolean.TRUE.equals(
                    original.getIsGlobal())
                    || !original.getCreatedBy()
                    .getId()
                    .equals(host.getId())) {
                throw new RuntimeException(
                        "You can only add questions " +
                                "from your own bank");
            }

            Question copy = Question.builder()
                    .exam(exam)
                    .createdBy(host)
                    .questionText(
                            original.getQuestionText())
                    .imageUrl(original.getImageUrl())
                    .type(original.getType())
                    .difficulty(original.getDifficulty())
                    .topic(original.getTopic())
                    .explanation(
                            original.getExplanation())
                    .optionA(original.getOptionA())
                    .optionB(original.getOptionB())
                    .optionC(original.getOptionC())
                    .optionD(original.getOptionD())
                    .correctAnswer(
                            original.getCorrectAnswer())
                    .tolerance(original.getTolerance())
                    .strictMarking(
                            original.getStrictMarking())
                    .addedBy("BANK")
                    .marks(getMarks(exam,
                            original.getDifficulty()))
                    .negativeMarks(getNegative(exam,
                            original.getDifficulty()))
                    .timeSeconds(getSeconds(exam,
                            original.getDifficulty()))
                    .isGlobal(false)
                    .isVerified(true)
                    .build();

            added.add(mapToResponse(
                    questionRepository.save(copy)));
        }

        return added;
    }

    // ─────────────────────────────────────────
    // EXAM QUESTION METHODS
    // ─────────────────────────────────────────

    @Transactional
    public QuestionResponse addManually(
            QuestionRequest req,
            MultipartFile image,
            String hostEmail) throws IOException {

        validateQuestion(req);

        Exam exam = examRepository
                .findById(req.getExamId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Exam not found"));

        // Ownership check
        if (!exam.getHost().getEmail()
                .equals(hostEmail)) {
            throw new RuntimeException(
                    "You are not authorized to " +
                            "add questions to this exam");
        }

        // Block if not DRAFT
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new RuntimeException(
                    "Questions can only be added " +
                            "while the exam is in DRAFT status");
        }

        User host = userRepository
                .findByEmail(hostEmail)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Host not found"));

        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            imageUrl = saveImage(image);
        }

        // Check capacity before saving
        checkDifficultyCapacity(exam, req.getDifficulty());

        // Save to global bank only if opted in
        boolean saveToBank = Boolean.TRUE
                .equals(req.getSaveToBank());

        if (saveToBank) {
            Question globalCopy = buildQuestion(
                    req, null, host, imageUrl,
                    "MANUAL", true, true);
            questionRepository.save(globalCopy);
        }

        // Save to exam bank
        Question examQuestion = buildQuestion(
                req, exam, host, imageUrl,
                "MANUAL", false, true);
        examQuestion.setMarks(
                getMarks(exam, req.getDifficulty()));
        examQuestion.setNegativeMarks(
                getNegative(exam, req.getDifficulty()));
        examQuestion.setTimeSeconds(
                getSeconds(exam, req.getDifficulty()));

        return mapToResponse(
                questionRepository.save(examQuestion));
    }

    public List<QuestionResponse> getByExamId(
            Long examId, String hostEmail) {

        Exam exam = examRepository
                .findById(examId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Exam not found"));

        if (!exam.getHost().getEmail()
                .equals(hostEmail)) {
            throw new RuntimeException(
                    "Not authorized to view " +
                            "this exam's questions");
        }

        return questionRepository
                .findByExamId(examId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public QuestionStatsResponse getStats(
            Long examId, String hostEmail) {

        Exam exam = examRepository
                .findById(examId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Exam not found"));

        if (!exam.getHost().getEmail()
                .equals(hostEmail)) {
            throw new RuntimeException(
                    "Not authorized to view " +
                            "this exam's stats");
        }

        int total = exam.getTotalQuestions();
        int[] required = ExamService.calculateRequiredCounts(
            total,
            exam.getEasyPercent(),
            exam.getMediumPercent());

        int easyRequired = required[0];
        int mediumRequired = required[1];
        int hardRequired = required[2];

        long easyAdded = questionRepository
                .countByExamIdAndDifficulty(
                        examId, Difficulty.EASY);
        long mediumAdded = questionRepository
                .countByExamIdAndDifficulty(
                        examId, Difficulty.MEDIUM);
        long hardAdded = questionRepository
                .countByExamIdAndDifficulty(
                        examId, Difficulty.HARD);

        long totalAdded = easyAdded
                + mediumAdded + hardAdded;

        String easyStatus = getStatus(
                easyAdded, easyRequired);
        String mediumStatus = getStatus(
                mediumAdded, mediumRequired);
        String hardStatus = getStatus(
                hardAdded, hardRequired);

        // EXCESS also blocks publish
        // must be exact count
        boolean canPublish =
                easyStatus.equals("COMPLETE") &&
                        mediumStatus.equals("COMPLETE") &&
                        hardStatus.equals("COMPLETE");

        String message = buildMessage(
                easyAdded, easyRequired,
                mediumAdded, mediumRequired,
                hardAdded, hardRequired,
                canPublish);

        long unverifiedCount = questionRepository
                .countByExamIdAndIsVerifiedFalse(examId);

        return QuestionStatsResponse.builder()
                .totalRequired(total)
                .totalAdded(totalAdded)
                .easyRequired(easyRequired)
                .easyAdded(easyAdded)
                .easyStatus(easyStatus)
                .mediumRequired(mediumRequired)
                .mediumAdded(mediumAdded)
                .mediumStatus(mediumStatus)
                .hardRequired(hardRequired)
                .hardAdded(hardAdded)
                .hardStatus(hardStatus)
                .unverifiedCount(unverifiedCount)
                .canPublish(canPublish)
                .message(message)
                .build();
    }

    @Transactional
    public QuestionResponse editQuestion(
            Long id,
            QuestionRequest req,
            MultipartFile image,
            String hostEmail) throws IOException {

        validateQuestion(req);

        Question question = questionRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Question not found"));

        // Ownership check
        if (!question.getCreatedBy().getEmail()
                .equals(hostEmail)) {
            throw new RuntimeException(
                    "You are not authorized " +
                            "to edit this question");
        }

        // Block if exam is not DRAFT
        if (question.getExam() != null
                && question.getExam().getStatus()
                != ExamStatus.DRAFT) {
            throw new RuntimeException(
                    "Questions can only be changed " +
                            "while the exam is in DRAFT status");
        }

        if (image != null && !image.isEmpty()) {
            question.setImageUrl(saveImage(image));
        }

        question.setQuestionText(
                req.getQuestionText());
        question.setType(req.getType());
        question.setDifficulty(req.getDifficulty());
        question.setTopic(req.getTopic());
        question.setExplanation(
                req.getExplanation());
        question.setOptionA(req.getOptionA());
        question.setOptionB(req.getOptionB());
        question.setOptionC(req.getOptionC());
        question.setOptionD(req.getOptionD());
        question.setCorrectAnswer(
                req.getCorrectAnswer());
        question.setTolerance(req.getTolerance());
        question.setStrictMarking(
                req.getStrictMarking());

        if (question.getExam() != null) {
            Exam exam = question.getExam();
            question.setMarks(getMarks(
                    exam, req.getDifficulty()));
            question.setNegativeMarks(getNegative(
                    exam, req.getDifficulty()));
            question.setTimeSeconds(getSeconds(
                    exam, req.getDifficulty()));
        }

        return mapToResponse(
                questionRepository.save(question));
    }

    @Transactional
    public void deleteQuestion(
            Long id, String hostEmail) {

        Question question = questionRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Question not found"));

        // Ownership check
        if (!question.getCreatedBy().getEmail()
                .equals(hostEmail)) {
            throw new RuntimeException(
                    "You are not authorized " +
                            "to delete this question");
        }

        // Block if exam is not DRAFT
        if (question.getExam() != null
                && question.getExam().getStatus()
                != ExamStatus.DRAFT) {
            throw new RuntimeException(
                    "Questions can only be changed " +
                            "while the exam is in DRAFT status");
        }

        questionRepository.deleteById(id);
    }

    // ─────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────

    private Question buildQuestion(
            QuestionRequest req,
            Exam exam,
            User host,
            String imageUrl,
            String addedBy,
            boolean isGlobal,
            boolean isVerified) {

        return Question.builder()
                .exam(exam)
                .createdBy(host)
                .questionText(req.getQuestionText())
                .imageUrl(imageUrl)
                .type(req.getType())
                .difficulty(req.getDifficulty())
                .topic(req.getTopic())
                .explanation(req.getExplanation())
                .optionA(req.getOptionA())
                .optionB(req.getOptionB())
                .optionC(req.getOptionC())
                .optionD(req.getOptionD())
                .correctAnswer(req.getCorrectAnswer())
                .tolerance(
                        req.getTolerance() != null
                                ? req.getTolerance() : 0.0)
                .strictMarking(
                        req.getStrictMarking() != null
                                ? req.getStrictMarking() : true)
                .addedBy(addedBy)
                .isGlobal(isGlobal)
                .isVerified(isVerified)
                .build();
    }

    private String saveImage(
            MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new BadRequestException(
                "Image file is empty.");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException(
                "Image too large. Max 5MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null
                || (!contentType.equals("image/jpeg")
                    && !contentType.equals("image/png")
                    && !contentType.equals(
                        "image/webp"))) {
            throw new BadRequestException(
                "Only JPEG, PNG, and WebP images " +
                "are allowed.");
        }

        try {
            java.awt.image.BufferedImage img =
                ImageIO.read(file.getInputStream());
            if (img == null) {
                throw new BadRequestException(
                    "File is not a valid image.");
            }
        } catch (Exception e) {
            throw new BadRequestException(
                "Could not read image file.");
        }

        Path uploadPath = Paths.get(
            uploadDir); 
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };

        String filename = UUID.randomUUID()
            .toString() + extension;

        Files.copy(
            file.getInputStream(),
            uploadPath.resolve(filename),
            StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/questions/" + filename;
    }

    private Double getMarks(
            Exam exam, Difficulty d) {
        return switch (d) {
            case EASY -> exam.getEasyMark();
            case MEDIUM -> exam.getMediumMark();
            case HARD -> exam.getHardMark();
        };
    }

    private Double getNegative(
            Exam exam, Difficulty d) {
        if (!Boolean.TRUE.equals(
                exam.getNegativeMark())) {
            return 0.0;
        }
        return switch (d) {
            case EASY -> exam.getEasyNegative();
            case MEDIUM -> exam.getMediumNegative();
            case HARD -> exam.getHardNegative();
        };
    }

    private void checkDifficultyCapacity(
            Exam exam, Difficulty difficulty) {
        int total = exam.getTotalQuestions();
        int[] required = ExamService
            .calculateRequiredCounts(
                total,
                exam.getEasyPercent(),
                exam.getMediumPercent());

        long existing = questionRepository
            .countByExamIdAndDifficulty(
                exam.getId(), difficulty);

        int target = switch (difficulty) {
            case EASY -> required[0];
            case MEDIUM -> required[1];
            case HARD -> required[2];
        };

        if (existing >= target) {
            throw new BadRequestException(
                difficulty + " question slots are " +
                "full (" + existing + "/" + target + ").");
        }
    }

    private Integer getSeconds(
            Exam exam, Difficulty d) {
        if (exam.getTimerType()
                != TimerType.PER_QUESTION)
            return null;
        return switch (d) {
            case EASY -> exam.getEasySeconds();
            case MEDIUM -> exam.getMediumSeconds();
            case HARD -> exam.getHardSeconds();
        };
    }

    private String getStatus(
            long added, int required) {
        if (added < required) return "INCOMPLETE";
        if (added == required) return "COMPLETE";
        return "EXCESS";
    }

    private String buildMessage(
            long easyAdded, int easyRequired,
            long mediumAdded, int mediumRequired,
            long hardAdded, int hardRequired,
            boolean canPublish) {

        if (canPublish) {
            return "All questions added. " +
                    "Ready to publish!";
        }

        StringBuilder msg =
                new StringBuilder("Need: ");
        if (easyAdded < easyRequired) {
            msg.append(easyRequired - easyAdded)
                    .append(" more Easy, ");
        } else if (easyAdded > easyRequired) {
            msg.append("Remove ")
                    .append(easyAdded - easyRequired)
                    .append(" Easy, ");
        }
        if (mediumAdded < mediumRequired) {
            msg.append(mediumRequired - mediumAdded)
                    .append(" more Medium, ");
        } else if (mediumAdded > mediumRequired) {
            msg.append("Remove ")
                    .append(mediumAdded - mediumRequired)
                    .append(" Medium, ");
        }
        if (hardAdded < hardRequired) {
            msg.append(hardRequired - hardAdded)
                    .append(" more Hard, ");
        } else if (hardAdded > hardRequired) {
            msg.append("Remove ")
                    .append(hardAdded - hardRequired)
                    .append(" Hard, ");
        }

        String result = msg.toString();
        if (result.endsWith(", ")) {
            result = result.substring(
                    0, result.length() - 2);
        }
        return result;
    }

    public QuestionResponse mapToResponse(
            Question q) {
        return QuestionResponse.builder()
                .id(q.getId())
                .examId(q.getExam() != null
                        ? q.getExam().getId() : null)
                .createdById(
                        q.getCreatedBy().getId())
                .createdByName(
                        q.getCreatedBy().getName())
                .questionText(q.getQuestionText())
                .imageUrl(q.getImageUrl())
                .type(q.getType())
                .difficulty(q.getDifficulty())
                .topic(q.getTopic())
                .explanation(q.getExplanation())
                .optionA(q.getOptionA())
                .optionB(q.getOptionB())
                .optionC(q.getOptionC())
                .optionD(q.getOptionD())
                .correctAnswer(q.getCorrectAnswer())
                .tolerance(q.getTolerance())
                .strictMarking(q.getStrictMarking())
                .addedBy(q.getAddedBy())
                .marks(q.getMarks())
                .negativeMarks(q.getNegativeMarks())
                .timeSeconds(q.getTimeSeconds())
                .isGlobal(q.getIsGlobal())
                .isVerified(q.getIsVerified())
                .createdAt(q.getCreatedAt())
                .build();
    }

    // ─────────────────────────────────────────
    // MARK QUESTION AS VERIFIED
    // Only host who owns the question can do this
    // ─────────────────────────────────────────

    @Transactional
    public QuestionResponse markAsVerified(
            Long questionId,
            String hostEmail) {

        Question question = questionRepository
            .findById(questionId)
            .orElseThrow(() ->
                new RuntimeException(
                    "Question not found"));

        // Ownership check
        if (!question.getCreatedBy().getEmail()
                .equals(hostEmail)) {
            throw new RuntimeException(
                "You are not authorized to " +
                "verify this question");
        }

        // Check exam is still DRAFT
        if (question.getExam() != null
                && question.getExam().getStatus()
                    != ExamStatus.DRAFT) {
            throw new RuntimeException(
                "Cannot modify questions after " +
                "exam is published");
        }

        question.setIsVerified(true);
        return mapToResponse(
            questionRepository.save(question));
    }
}