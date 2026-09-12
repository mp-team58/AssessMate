package com.assessmate.dto;

import com.assessmate.entity.EnrollmentStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class CandidateHistoryDTO {
    private Long enrollmentId;
    private String examTitle;
    private String subject;
    private LocalDateTime joinedAt;
    private EnrollmentStatus status;
    private Double totalScore;
    private Double percentage;
}
