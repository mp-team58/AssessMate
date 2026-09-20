package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_enrollments",
        uniqueConstraints = @UniqueConstraint(columnNames = {"exam_id", "candidate_id"}),
        indexes = {
                @Index(name = "idx_enrollment_candidate", columnList = "candidate_id"),
                @Index(name = "idx_enrollment_status_endtime", columnList = "status, personal_end_time")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "personal_end_time", nullable = false)
    private LocalDateTime personalEndTime;

    private LocalDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.ONGOING;
}
