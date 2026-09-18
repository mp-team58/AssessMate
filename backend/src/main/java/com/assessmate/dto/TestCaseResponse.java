package com.assessmate.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestCaseResponse {
    private Long id;
    private String input;
    private String expectedOutput;
    private Boolean isHidden;
    private Integer points;
    private Integer orderIndex;
}
