package com.assessmate.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CandidateExamQuestionsResponse {
    private List<CandidateQuestionDTO> questions;
    private LocalDateTime personalEndTime;
}
