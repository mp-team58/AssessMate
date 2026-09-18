package com.assessmate.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodeSubmissionResponse {
    private Long id;
    private Long codingQuestionId;
    private String problemTitle;
    private String language;
    private String status;
    private Integer testCasesPassed;
    private Integer totalTestCases;
    private Double marksAwarded;
    private Double executionTimeMs;
    private Integer memoryUsedKb;
    private String compileOutput;
    private Boolean isFinal;
    private LocalDateTime submittedAt;
    private List<TestCaseResultResponse> testCaseResults;
}
