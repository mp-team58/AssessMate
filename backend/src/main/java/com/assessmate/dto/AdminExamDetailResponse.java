package com.assessmate.dto;

import com.assessmate.entity.ExamStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminExamDetailResponse {
    private Long id;
    private String title;
    private String subject;
    private String joinCode;
    private ExamStatus status;
    private Long hostId;
    private String hostName;
    private String hostEmail;
    private Integer durationMinutes;
    private Integer totalQuestions;
    private long enrollmentsCount;
    private LocalDateTime scheduledStart;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Boolean resultsPublished;
    private Boolean hasCodingSection;
    private Double passingPercentage;
}

