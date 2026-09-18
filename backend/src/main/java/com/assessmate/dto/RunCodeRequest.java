package com.assessmate.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RunCodeRequest {
    private Long codingQuestionId;
    private String language;
    private String sourceCode;
    private String customInput;
}
