package com.assessmate.dto;
import lombok.*;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class CandidateResultRow {
    private Long enrollmentId;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private String enrollmentStatus;
    private Double totalScore;
    private Double maxScore;
    private Double percentage;
    private Boolean passed;
    private Boolean lateSubmission;
    private Long timeTakenSeconds;
    private Long proctoringFlagCount;
}
