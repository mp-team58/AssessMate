package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exams")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    // Basic Info
    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String subject;

    // Schedule
    @Column(nullable = false)
    private LocalDateTime scheduledStart;

    @Builder.Default
    private Integer gracePeriodMinutes = 10;

    // Timer
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TimerType timerType = TimerType.WHOLE_EXAM;

    private Integer durationMinutes;
    // used when timerType = WHOLE_EXAM

    // Question Settings
    private Integer totalQuestions;
    private Integer easyPercent;
    private Integer mediumPercent;
    private Integer hardPercent;

    // Difficulty Groups — Marks
    @Builder.Default
    private Double easyMark = 1.0;
    @Builder.Default
    private Double mediumMark = 2.0;
    @Builder.Default
    private Double hardMark = 3.0;

    // Difficulty Groups — Negative Marks
    @Builder.Default
    private Double easyNegative = 0.25;
    @Builder.Default
    private Double mediumNegative = 0.50;
    @Builder.Default
    private Double hardNegative = 1.00;

    // Difficulty Groups — Seconds per question
    // used when timerType = PER_QUESTION
    @Builder.Default
    private Integer easySeconds = 30;
    @Builder.Default
    private Integer mediumSeconds = 60;
    @Builder.Default
    private Integer hardSeconds = 90;

    // Exam Rules
    @Builder.Default
    private Boolean negativeMark = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DeviceAccess deviceAccess = DeviceAccess.BOTH;

    // Auto Generated
    @Column(unique = true, nullable = false)
    private String joinCode;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ExamStatus status = ExamStatus.DRAFT;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
}