package com.assessmate.dto;

import com.assessmate.entity.QuestionType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CandidateQuestionDTO {
    private Long id;
    private String questionText;
    private String imageUrl;
    private QuestionType type;
    private Double marks;
    private Double negativeMarks;
    private Integer timeSeconds;
    private List<OptionDTO> options;
    private String savedAnswer;

    // P3.5.9: Per-question timing extensions
    private Boolean isExpired;
    private Boolean isActive;
    private LocalDateTime deadline;
    private Long remainingSeconds;

    @Data
    @Builder
    public static class OptionDTO {
        private String key;
        private String value;
    }
}
