package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HostResultService {

    private final ExamRepository examRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final ResultRepository resultRepository;
    private final CandidateAnswerRepository candidateAnswerRepository;
    private final QuestionRepository questionRepository;
    private final ProctoringLogRepository proctoringLogRepository;

    private Exam getOwnedExam(Long examId, String hostEmail) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("You do not have access to this exam's results");
        }
        return exam;
    }

    public ExamResultsSummary getExamResults(Long examId, String hostEmail) {

        Exam exam = getOwnedExam(examId, hostEmail);

        List<ExamEnrollment> enrollments = enrollmentRepository.findByExamId(examId);
        List<Long> enrollmentIds = enrollments.stream().map(ExamEnrollment::getId).toList();

        List<Result> results = enrollmentIds.isEmpty()
                ? List.of() : resultRepository.findByEnrollmentIdIn(enrollmentIds);

        Map<Long, Result> resultByEnrollmentId = results.stream()
                .collect(Collectors.toMap(r -> r.getEnrollment().getId(), r -> r));

        Map<Long, Long> flagCountByEnrollmentId = enrollmentIds.isEmpty()
                ? Map.of()
                : proctoringLogRepository.findByEnrollmentIdIn(enrollmentIds).stream()
                        .collect(Collectors.groupingBy(p -> p.getEnrollment().getId(), Collectors.counting()));

        List<CandidateResultRow> candidateRows = enrollments.stream()
                .map(enr -> {
                    Result r = resultByEnrollmentId.get(enr.getId());
                    return CandidateResultRow.builder()
                            .enrollmentId(enr.getId())
                            .candidateId(enr.getCandidate().getId())
                            .candidateName(enr.getCandidate().getName())
                            .candidateEmail(enr.getCandidate().getEmail())
                            .enrollmentStatus(enr.getStatus().name())
                            .totalScore(r != null ? r.getTotalScore() : null)
                            .maxScore(r != null ? r.getMaxScore() : null)
                            .percentage(r != null ? r.getPercentage() : null)
                            .passed(r != null ? r.getPassed() : null)
                            .lateSubmission(r != null ? r.getLateSubmission() : null)
                            .timeTakenSeconds(r != null ? r.getTimeTakenSeconds() : null)
                            .proctoringFlagCount(flagCountByEnrollmentId.getOrDefault(enr.getId(), 0L))
                            .build();
                })
                .toList();

        List<Double> percentages = results.stream().map(Result::getPercentage).toList();
        double avgScore = results.stream().mapToDouble(Result::getTotalScore).average().orElse(0.0);
        double avgPercentage = percentages.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double passRate = results.isEmpty() ? 0.0 :
                (results.stream().filter(r -> Boolean.TRUE.equals(r.getPassed())).count() * 100.0) / results.size();
        double highest = percentages.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        double lowest = percentages.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);

        return ExamResultsSummary.builder()
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .totalCandidates((long) enrollments.size())
                .submittedCount((long) results.size())
                .averageScore(round1(avgScore))
                .averagePercentage(round1(avgPercentage))
                .passRate(round1(passRate))
                .highestPercentage(round1(highest))
                .lowestPercentage(round1(lowest))
                .candidates(candidateRows)
                .questionAccuracy(buildQuestionAccuracy(examId, enrollmentIds))
                .build();
    }

    private List<QuestionAccuracy> buildQuestionAccuracy(Long examId, List<Long> enrollmentIds) {
        List<Question> questions = questionRepository.findByExamId(examId);

        Map<Long, List<CandidateAnswer>> answersByQuestion = enrollmentIds.isEmpty()
                ? Map.of()
                : candidateAnswerRepository.findByEnrollmentIdIn(enrollmentIds).stream()
                        .collect(Collectors.groupingBy(a -> a.getQuestion().getId()));

        return questions.stream()
                .map(q -> {
                    List<CandidateAnswer> qAnswers = answersByQuestion.getOrDefault(q.getId(), List.of());
                    long attempts = qAnswers.stream()
                            .filter(a -> a.getCandidateAnswer() != null && !a.getCandidateAnswer().isBlank())
                            .count();
                    long correct = qAnswers.stream().filter(a -> Boolean.TRUE.equals(a.getIsCorrect())).count();
                    double accuracy = attempts == 0 ? 0.0 : (correct * 100.0) / attempts;
                    return QuestionAccuracy.builder()
                            .questionId(q.getId())
                            .questionText(q.getQuestionText())
                            .topic(q.getTopic())
                            .difficulty(q.getDifficulty().name())
                            .correctCount(correct)
                            .totalAttempts(attempts)
                            .accuracyPercent(round1(accuracy))
                            .build();
                })
                .toList();
    }

    public LiveMonitor getLiveMonitor(Long examId, String hostEmail) {

        Exam exam = getOwnedExam(examId, hostEmail);

        List<ExamEnrollment> enrollments = enrollmentRepository.findByExamId(examId);
        List<Long> enrollmentIds = enrollments.stream().map(ExamEnrollment::getId).toList();

        Map<Long, Long> flagCountByEnrollmentId = enrollmentIds.isEmpty()
                ? Map.of()
                : proctoringLogRepository.findByEnrollmentIdIn(enrollmentIds).stream()
                        .collect(Collectors.groupingBy(p -> p.getEnrollment().getId(), Collectors.counting()));

        List<LiveCandidateRow> rows = enrollments.stream()
                .map(enr -> LiveCandidateRow.builder()
                        .enrollmentId(enr.getId())
                        .candidateId(enr.getCandidate().getId())
                        .candidateName(enr.getCandidate().getName())
                        .candidateEmail(enr.getCandidate().getEmail())
                        .status(enr.getStatus().name())
                        .joinedAt(enr.getJoinedAt())
                        .totalFlags(flagCountByEnrollmentId.getOrDefault(enr.getId(), 0L))
                        .build())
                .sorted(Comparator.comparingLong(LiveCandidateRow::getTotalFlags).reversed())
                .toList();

        long submitted = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.SUBMITTED || e.getStatus() == EnrollmentStatus.EXPIRED)
                .count();

        return LiveMonitor.builder()
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .examStatus(exam.getStatus().name())
                .joinedCount((long) enrollments.size())
                .submittedCount(submitted)
                .ongoingCount(enrollments.size() - submitted)
                .candidates(rows)
                .build();
    }

    public HostCandidateReport getCandidateReport(Long examId, Long enrollmentId, String hostEmail) {

        getOwnedExam(examId, hostEmail);

        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getExam().getId().equals(examId)) {
            throw new ForbiddenException("This candidate did not take this exam");
        }

        if (enrollment.getStatus() == EnrollmentStatus.ONGOING) {
            throw new BadRequestException("This candidate has not submitted the exam yet");
        }

        Result result = resultRepository.findByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Result not found for this candidate"));

        ResultResponseDTO resultDto = ResultResponseDTO.builder()
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
                .build();

        List<CandidateAnswer> answers = candidateAnswerRepository.findByEnrollmentId(enrollmentId);
        List<CandidateAnswerReviewDTO> answerDtos = answers.stream().map(a -> {
            Question q = a.getQuestion();
            List<CandidateAnswerReviewDTO.OptionDTO> options = new ArrayList<>();
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

        List<ProctoringEventDTO> eventDtos = proctoringLogRepository
                .findByEnrollmentIdOrderByFlaggedAtAsc(enrollmentId).stream()
                .map(l -> ProctoringEventDTO.builder()
                        .eventType(l.getEventType())
                        .severity(l.getSeverity())
                        .flaggedAt(l.getFlaggedAt())
                        .imageUrl(l.getImageUrl())
                        .audioUrl(l.getAudioUrl())
                        .build())
                .toList();

        return HostCandidateReport.builder()
                .enrollmentId(enrollment.getId())
                .candidateId(enrollment.getCandidate().getId())
                .candidateName(enrollment.getCandidate().getName())
                .candidateEmail(enrollment.getCandidate().getEmail())
                .examTitle(enrollment.getExam().getTitle())
                .result(resultDto)
                .answers(answerDtos)
                .proctoringEvents(eventDtos)
                .proctoringFlagCount((long) eventDtos.size())
                .build();
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
