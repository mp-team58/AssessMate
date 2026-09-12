package com.assessmate.dto;

import com.assessmate.entity.ProctoringEventType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ProctorEventRequest {
    private Long enrollmentId;
    private ProctoringEventType eventType;
    private LocalDateTime timestamp;
}
