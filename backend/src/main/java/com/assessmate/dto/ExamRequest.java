package com.assessmate.dto;

import com.assessmate.entity.DeviceAccess;
import com.assessmate.entity.TimerType;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ExamRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotNull(message = "Scheduled start is required")
    @Future(message = "Scheduled start must be in the future")
    private LocalDateTime scheduledStart;

    @NotNull(message = "Grace period is required")
    private Integer gracePeriodMinutes = 10;

    @NotNull(message = "Timer type is required")
    private TimerType timerType = TimerType.WHOLE_EXAM;

    private Integer durationMinutes;

    @NotNull(message = "Total questions is required")
    @Min(value = 1, message = "Must have at least 1 question")
    private Integer totalQuestions;

    @NotNull(message = "Easy percent is required")
    @Min(value = 0)
    @Max(value = 100)
    private Integer easyPercent;

    @NotNull(message = "Medium percent is required")
    @Min(value = 0)
    @Max(value = 100)
    private Integer mediumPercent;

    @NotNull(message = "Hard percent is required")
    @Min(value = 0)
    @Max(value = 100)
    private Integer hardPercent;

    @NotNull(message = "Easy mark is required")
    private Double easyMark = 1.0;
    
    @NotNull(message = "Medium mark is required")
    private Double mediumMark = 2.0;
    
    @NotNull(message = "Hard mark is required")
    private Double hardMark = 3.0;
    
    @NotNull(message = "Easy negative is required")
    private Double easyNegative = 0.25;
    
    @NotNull(message = "Medium negative is required")
    private Double mediumNegative = 0.50;
    
    @NotNull(message = "Hard negative is required")
    private Double hardNegative = 1.0;
    
    @NotNull(message = "Easy seconds is required")
    private Integer easySeconds = 30;
    
    @NotNull(message = "Medium seconds is required")
    private Integer mediumSeconds = 60;
    
    @NotNull(message = "Hard seconds is required")
    private Integer hardSeconds = 90;

    @NotNull(message = "Negative mark setting is required")
    private Boolean negativeMark = false;
    
    @NotNull(message = "Device access is required")
    private DeviceAccess deviceAccess = DeviceAccess.BOTH;
    
    @NotNull(message = "Has coding section is required")
    private Boolean hasCodingSection = false;
    
    private Integer codingDurationMinutes;

    @Min(value = 1)
    private Integer codingQuestionsCount;

    @NotNull(message = "Passing percentage is required")
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "100.0")
    private Double passingPercentage = 50.0;
}