package com.assessmate.dto;

import com.assessmate.entity.DeviceAccess;
import com.assessmate.entity.TimerType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ExamRequest {

    // Basic Info
    private String title;
    private String subject;

    // Schedule
    private LocalDateTime scheduledStart;
    private Integer gracePeriodMinutes;

    // Timer
    private TimerType timerType;
    private Integer durationMinutes;
    // only required when timerType = WHOLE_EXAM

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

    // Difficulty Groups — Seconds per question
    private Integer easySeconds;
    private Integer mediumSeconds;
    private Integer hardSeconds;

    // Exam Rules
    private Boolean negativeMark;
    private DeviceAccess deviceAccess;

    // Coding Section
    private Boolean hasCodingSection;
    private Integer codingDurationMinutes;
}