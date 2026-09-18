package com.assessmate.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodeSubmissionRequest {
    private Long codingQuestionId;
    private Long enrollmentId;
    private String language;
    private String sourceCode;
}
