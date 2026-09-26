package com.assessmate.dto;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class ProctoringEvent {
    private String eventType;
    private LocalDateTime flaggedAt;
}
