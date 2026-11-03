package com.assessmate.dto;

import com.assessmate.entity.DeviceAccess;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CandidateExamQuestionsResponse {
    private List<CandidateQuestionDTO> questions;
    private LocalDateTime personalEndTime;
    private Long remainingSeconds;
    private DeviceAccess deviceAccess;
}
