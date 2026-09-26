package com.assessmate.dto;
import lombok.*;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class ExamAnalyticsPoint {
    private Long examId;
    private String examTitle;
    private Double averagePercentage;
    private Long candidateCount;
}
