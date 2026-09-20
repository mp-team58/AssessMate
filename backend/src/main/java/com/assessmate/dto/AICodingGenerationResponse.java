package com.assessmate.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AICodingGenerationResponse {

    // The generated problem
    // Host reviews this before saving
    private CodingQuestionRequest generated;

    // What input type was detected
    // TOPIC or DESCRIPTION
    private String detectedInputType;

    // Original input for reference
    private String originalInput;

    // Warning shown to host
    private String warning;

    // true = generation succeeded
    // false = generation failed
    private Boolean success;

    // Error message if failed
    private String error;
}
