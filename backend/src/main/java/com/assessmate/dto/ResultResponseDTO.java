package com.assessmate.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResultResponseDTO {
    private Long enrollmentId;
    private String examTitle;
    private Double totalScore;
    private Double maxScore;
    private Double percentage;
    private Boolean passed;
    private String weakTopicsJson;
    private String aiFeedback;
}
