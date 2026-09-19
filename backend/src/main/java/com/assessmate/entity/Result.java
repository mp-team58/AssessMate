package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Result {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false, unique = true)
    private ExamEnrollment enrollment;

    @Column(name = "total_score")
    private Double totalScore;

    @Column(name = "max_score")
    private Double maxScore;

    private Double percentage;
    private Boolean passed;
    private Boolean lateSubmission;

    private Long timeTakenSeconds;
    private Integer correctCount;
    private Integer wrongCount;
    private Integer unansweredCount;

    @Column(name = "weak_topics_json", columnDefinition = "TEXT")
    private String weakTopicsJson;

    @Column(name = "ai_feedback", columnDefinition = "TEXT")
    private String aiFeedback;

    @Column(name = "feedback_status")
    @Builder.Default
    private String feedbackStatus = "PENDING"; // READY, PENDING, FAILED

    @Column(name = "generated_at")
    @Builder.Default
    private LocalDateTime generatedAt = LocalDateTime.now();
}
