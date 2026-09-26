package com.assessmate.dto;
import lombok.*;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class QuestionAccuracy {
    private Long questionId;
    private String questionText;
    private String topic;
    private String difficulty;
    private Long correctCount;
    private Long totalAttempts;
    private Double accuracyPercent;
}
