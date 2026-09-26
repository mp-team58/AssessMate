package com.assessmate.dto;

import com.assessmate.entity.EnrollmentStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProctoringSummaryDTO {
    private Long enrollmentId;
    private String candidateName;
    private String candidateEmail;
    private Double honestyScore;
    private Integer totalViolations;
    private EnrollmentStatus status;
}
