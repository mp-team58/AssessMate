package com.assessmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIGenerationJobResponse {
    private String jobId;
    private Long examId;
    private String status; // PROCESSING, COMPLETED, FAILED
    private String message;
    private String error;
    private LocalDateTime createdAt;
    private AIGenerationResponse result;
}

