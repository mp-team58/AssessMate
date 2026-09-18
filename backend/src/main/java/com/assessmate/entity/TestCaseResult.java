package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "test_case_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestCaseResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private CodeSubmission submission;

    @ManyToOne(optional = false)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubmissionStatus status;

    @Column(columnDefinition = "TEXT")
    private String actualOutput;

    private Double executionTimeMs;
    private Integer memoryUsedKb;
    private Boolean isHidden;
}
