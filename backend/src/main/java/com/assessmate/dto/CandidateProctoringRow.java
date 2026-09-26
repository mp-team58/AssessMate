package com.assessmate.dto;
import lombok.*;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class CandidateProctoringRow {
    private Long enrollmentId;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private Long noFaceCount;
    private Long multipleFacesCount;
    private Long gazeAwayCount;
    private Long tabSwitchCount;
    private Long totalFlags;
}
