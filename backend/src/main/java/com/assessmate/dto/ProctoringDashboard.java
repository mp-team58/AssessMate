package com.assessmate.dto;
import lombok.*;
import java.util.List;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class ProctoringDashboard {
    private Long examId;
    private String examTitle;
    private List<CandidateProctoringRow> candidates;
}
