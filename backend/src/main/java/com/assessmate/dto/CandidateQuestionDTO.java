package com.assessmate.dto;

import com.assessmate.entity.QuestionType;
import lombok.Builder;
import lombok.Data;
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

    @Data
    @Builder
    public static class OptionDTO {
        private String key;
        private String value;
    }
}
