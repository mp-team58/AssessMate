package com.assessmate.dto;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder
public class ExamShareDetailsDTO {
    private Long examId;
    private String title;
    private String subject;
    private String joinCode;
    private LocalDateTime scheduledStart;
    private Integer durationMinutes;
    private Integer gracePeriodMinutes;
    private String deviceAccess;
    private Boolean hasCodingSection;
    private String shareMessage;
}
