package com.assessmate.dto;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class LiveCandidateRow {
    private Long enrollmentId;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private String status;
    private LocalDateTime joinedAt;
    private Long totalFlags;
}
