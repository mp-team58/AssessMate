package com.assessmate.dto;
import lombok.*;
import java.util.List;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class HostCandidateReport {
    private Long enrollmentId;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private String examTitle;
    private ResultResponseDTO result;
    private List<CandidateAnswerReviewDTO> answers;
    private List<ProctoringEvent> proctoringEvents;
    private Long proctoringFlagCount;
}
