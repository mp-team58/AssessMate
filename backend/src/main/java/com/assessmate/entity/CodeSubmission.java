package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "code_submissions", indexes = {
        @Index(name = "idx_submission_enrollment", columnList = "enrollmentId"),
        @Index(name = "idx_submission_candidate", columnList = "candidate_id"),
        @Index(name = "idx_submission_coding_q", columnList = "coding_question_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodeSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coding_question_id", nullable = false)
    private CodingQuestion codingQuestion;

    private Long enrollmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Language language;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String sourceCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubmissionStatus status;

    private Integer totalTestCases;
    private Integer testCasesPassed;
    private Double marksAwarded;
    private Double executionTimeMs;
    private Integer memoryUsedKb;

    @Column(columnDefinition = "TEXT")
    private String compileOutput;

    @Builder.Default
    private Boolean isFinal = true;

    @Builder.Default
    private LocalDateTime submittedAt = LocalDateTime.now();
}
