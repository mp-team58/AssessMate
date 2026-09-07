package com.assessmate.dto;

import lombok.Data;

@Data
public class AIGenerationRequest {

    private Long examId;

    private String inputType;
    // "TOPIC" / "TEXT" / "FILE"

    private String topic;
    // optional but recommended
    // used for all input types as focus area

    private String text;
    // filled when inputType = TEXT
    // host pastes content here

    private Integer totalQuestions;
    // how many questions to generate

    // Question type distribution
    // if null system decides automatically
    private Integer singleChoiceCount;
    private Integer multipleSelectCount;
    private Integer fillBlankCount;
    private Integer numericalCount;
}
