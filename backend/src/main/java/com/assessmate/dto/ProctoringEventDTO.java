package com.assessmate.dto;

import com.assessmate.entity.ProctoringEventType;
import com.assessmate.entity.Severity;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ProctoringEventDTO {
    private ProctoringEventType eventType;
    private Severity severity;
    private LocalDateTime flaggedAt;
    private String imageUrl;
    private String audioUrl;
}
