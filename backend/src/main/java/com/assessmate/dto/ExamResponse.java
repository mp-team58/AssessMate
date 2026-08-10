package com.assessmate.dto;

import com.assessmate.entity.DeviceAccess;
import com.assessmate.entity.ExamStatus;
import com.assessmate.entity.TimerType;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamResponse {

    private Long id;
    private String hostName;

    // Basic Info
    private String title;
    private String subject;

    // Schedule
    private LocalDateTime scheduledStart;
    private Integer gracePeriodMinutes;

    // Timer
    private TimerType timerType;
    private Integer durationMinutes;

    // Question Settings
    private Integer totalQuestions;
    private Integer easyPercent;
    private Integer mediumPercent;
    private Integer hardPercent;

    // Difficulty Groups — Marks
    private Double easyMark;
    private Double mediumMark;
    private Double hardMark;

    // Difficulty Groups — Negative
    private Double easyNegative;
    private Double mediumNegative;
    private Double hardNegative;

    // Difficulty Groups — Seconds
    private Integer easySeconds;
    private Integer mediumSeconds;
    private Integer hardSeconds;

    // Exam Rules
    private Boolean negativeMark;
    private DeviceAccess deviceAccess;

    // Auto Generated
    private String joinCode;
    private ExamStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    // Coding Section
    private Boolean hasCodingSection;
    private Integer codingDurationMinutes;
}