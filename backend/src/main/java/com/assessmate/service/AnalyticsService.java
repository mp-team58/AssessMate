package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final ExamRepository examRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final ResultRepository resultRepository;
    private final CandidateAnswerRepository candidateAnswerRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;

    public HostAnalyticsDashboard getDashboard(String hostEmail) {

        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Host not found"));

        List<Exam> exams = examRepository.findByHostId(host.getId());

        if (exams.isEmpty()) {
            return HostAnalyticsDashboard.builder()
                    .totalExams(0).totalCandidates(0L).averagePercentage(0.0)
                    .examPerformance(List.of()).difficultyDistribution(Map.of())
                    .performanceTrend(List.of()).topWeakTopics(List.of())
                    .build();
        }

        List<Long> examIds = exams.stream().map(Exam::getId).toList();
        List<ExamEnrollment> enrollments = enrollmentRepository.findByExamIdIn(examIds);
        List<Long> enrollmentIds = enrollments.stream().map(ExamEnrollment::getId).toList();

        List<Result> results = enrollmentIds.isEmpty()
                ? List.of() : resultRepository.findByEnrollmentIdIn(enrollmentIds);

        Map<Long, Long> enrollmentIdToExamId = enrollments.stream()
                .collect(Collectors.toMap(ExamEnrollment::getId, e -> e.getExam().getId()));

        double overallAverage = results.stream().mapToDouble(Result::getPercentage).average().orElse(0.0);

        Map<Long, List<Result>> resultsByExam = results.stream()
                .collect(Collectors.groupingBy(r -> enrollmentIdToExamId.get(r.getEnrollment().getId())));

        List<ExamAnalyticsPoint> examPerformance = exams.stream()
                .map(exam -> {
                    List<Result> examResults = resultsByExam.getOrDefault(exam.getId(), List.of());
                    double avg = examResults.stream().mapToDouble(Result::getPercentage).average().orElse(0.0);
                    return ExamAnalyticsPoint.builder()
                            .examId(exam.getId()).examTitle(exam.getTitle())
                            .averagePercentage(round1(avg))
                            .candidateCount((long) examResults.size())
                            .build();
                })
                .toList();

        List<Question> allQuestions = questionRepository.findByExamIdIn(examIds);
        Map<String, Long> difficultyDistribution = allQuestions.stream()
                .collect(Collectors.groupingBy(q -> q.getDifficulty().name(), Collectors.counting()));

        Map<Long, LocalDate> enrollmentSubmitDate = enrollments.stream()
                .filter(e -> e.getSubmittedAt() != null)
                .collect(Collectors.toMap(ExamEnrollment::getId, e -> e.getSubmittedAt().toLocalDate()));

        Map<LocalDate, List<Double>> percentagesByDate = new TreeMap<>();
        for (Result r : results) {
            LocalDate date = enrollmentSubmitDate.get(r.getEnrollment().getId());
            if (date == null) continue;
            percentagesByDate.computeIfAbsent(date, d -> new ArrayList<>()).add(r.getPercentage());
        }

        List<PerformanceTrendPoint> performanceTrend = percentagesByDate.entrySet().stream()
                .map(e -> PerformanceTrendPoint.builder()
                        .date(e.getKey())
                        .averagePercentage(round1(e.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0)))
                        .build())
                .toList();

        List<CandidateAnswer> wrongAnswers = enrollmentIds.isEmpty()
                ? List.of()
                : candidateAnswerRepository.findByEnrollmentIdIn(enrollmentIds).stream()
                        .filter(a -> Boolean.FALSE.equals(a.getIsCorrect()))
                        .filter(a -> a.getQuestion().getTopic() != null && !a.getQuestion().getTopic().isBlank())
                        .toList();

        Map<String, Long> topicWrongCounts = wrongAnswers.stream()
                .collect(Collectors.groupingBy(a -> a.getQuestion().getTopic(), Collectors.counting()));

        List<TopicFrequency> topWeakTopics = topicWrongCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> TopicFrequency.builder().topic(e.getKey()).wrongCount(e.getValue()).build())
                .toList();

        return HostAnalyticsDashboard.builder()
                .totalExams(exams.size())
                .totalCandidates((long) enrollments.size())
                .averagePercentage(round1(overallAverage))
                .examPerformance(examPerformance)
                .difficultyDistribution(difficultyDistribution)
                .performanceTrend(performanceTrend)
                .topWeakTopics(topWeakTopics)
                .build();
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
