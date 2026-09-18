package com.assessmate.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodingQuestionRequest {
    private String title;
    private String description;
    private String constraints;
    private String sampleInput;
    private String sampleOutput;
    private String explanation;
    private List<String> allowedLanguages;
    private Integer timeLimitSeconds;
    private Integer memoryLimitMb;
    private Double marks;
    private Boolean partialMarking;
    private Boolean saveToBank;
    private List<TestCaseRequest> testCases;
}
