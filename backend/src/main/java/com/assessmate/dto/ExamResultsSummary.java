package com.assessmate.dto;
import lombok.*;
import java.util.List;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class ExamResultsSummary {
    private Long examId;
    private String examTitle;
    private Long totalCandidates;
    private Long submittedCount;
    private Double averageScore;
    private Double averagePercentage;
    private Double passRate;
    private Double highestPercentage;
    private Double lowestPercentage;
    private List<CandidateResultRow> candidates;
    private List<QuestionAccuracy> questionAccuracy;
}
