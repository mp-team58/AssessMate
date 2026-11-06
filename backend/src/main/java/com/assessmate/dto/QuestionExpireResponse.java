package com.assessmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionExpireResponse {
    private Long expiredQuestionId;
    private Long nextQuestionId;
    private LocalDateTime nextQuestionDeadline;
    private Long nextQuestionRemainingSeconds;
    private Boolean isExamCompleted;
    private LocalDateTime serverTime;
}

