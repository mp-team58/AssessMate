package com.assessmate.dto;
import lombok.*;
import java.util.List;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class LiveMonitor {
    private Long examId;
    private String examTitle;
    private String examStatus;
    private Long joinedCount;
    private Long submittedCount;
    private Long ongoingCount;
    private List<LiveCandidateRow> candidates;
}
