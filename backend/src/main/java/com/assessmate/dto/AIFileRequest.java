package com.assessmate.dto;

import lombok.Data;

@Data
public class AIFileRequest {
    private Long examId;
    private String topic;
    private Integer totalQuestions;
    private Integer singleChoiceCount;
    private Integer multipleSelectCount;
    private Integer fillBlankCount;
    private Integer numericalCount;
}
