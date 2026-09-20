package com.assessmate.dto;

import com.assessmate.entity.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CandidateAnswerReviewDTO {
    private Long questionId;
    private String questionText;
    private String imageUrl;
    private QuestionType type;
    private Double totalMarks;
    private Double marksAwarded;
    private Boolean isCorrect;
    private String candidateAnswer;
    private String correctAnswer;
    private String explanation;
    private String topic;
    private String difficulty;
    private List<OptionDTO> options;

    @Data
    @Builder
    public static class OptionDTO {
        private String key;
        private String value;
    }
}
