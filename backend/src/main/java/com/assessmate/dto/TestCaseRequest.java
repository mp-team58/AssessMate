package com.assessmate.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestCaseRequest {
    private String input;
    private String expectedOutput;
    private Boolean isHidden;
    private Integer points;
}
