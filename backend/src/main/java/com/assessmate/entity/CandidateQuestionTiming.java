package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "candidate_question_timings",
        uniqueConstraints = @UniqueConstraint(name = "uk_enrollment_question_timing", columnNames = {"enrollment_id", "question_id"}),
        indexes = {
                @Index(name = "idx_qt_enrollment", columnList = "enrollment_id"),
                @Index(name = "idx_qt_enrollment_question", columnList = "enrollment_id, question_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateQuestionTiming {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private ExamEnrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "deadline", nullable = false)
    private LocalDateTime deadline;

    @Column(name = "is_expired", nullable = false)
    @Builder.Default
    private boolean isExpired = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}

