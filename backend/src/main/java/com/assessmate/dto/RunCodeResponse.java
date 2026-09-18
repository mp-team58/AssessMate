package com.assessmate.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RunCodeResponse {
    private String status;
    private String stdout;
    private String stderr;
    private String compileOutput;
    private String expectedOutput;
    private Double executionTimeMs;
    private Integer memoryUsedKb;
    private boolean passed;
}
