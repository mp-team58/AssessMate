package com.assessmate.dto;
import lombok.*;
import java.util.List;
import java.util.Map;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class HostAnalyticsDashboard {
    private Integer totalExams;
    private Long totalCandidates;
    private Double averagePercentage;
    private List<ExamAnalyticsPoint> examPerformance;
    private Map<String, Long> difficultyDistribution;
    private List<PerformanceTrendPoint> performanceTrend;
    private List<TopicFrequency> topWeakTopics;
}
