package com.assessmate.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodingQuestionResponse {
    private Long id;
    private Long examId;
    private String createdByName;
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
    private Boolean isGlobal;
    private Integer orderIndex;
    private LocalDateTime createdAt;
    private List<TestCaseResponse> testCases;
}
