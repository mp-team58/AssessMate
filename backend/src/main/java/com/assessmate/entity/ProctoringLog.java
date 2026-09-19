package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_logs",
        indexes = {
                @Index(name = "idx_proctoring_enrollment", columnList = "enrollment_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctoringLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private ExamEnrollment enrollment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProctoringEventType eventType;

    @Column(nullable = false)
    private LocalDateTime flaggedAt;

    private LocalDateTime clientReportedAt;
}
