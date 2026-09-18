package com.assessmate.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestCaseResultResponse {
    private Long testCaseId;
    private String status;
    private Boolean isHidden;
    private Double executionTimeMs;
    private Integer memoryUsedKb;
    private String input;
    private String expectedOutput;
    private String actualOutput;
}
