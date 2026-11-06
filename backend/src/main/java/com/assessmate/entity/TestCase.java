package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "test_cases", indexes = {
        @Index(name = "idx_test_case_coding_q", columnList = "coding_question_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coding_question_id", nullable = false)
    private CodingQuestion codingQuestion;

    @Column(columnDefinition = "TEXT")
    private String input;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String expectedOutput;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isHidden = true;

    @Builder.Default
    private Integer points = 1;

    private Integer orderIndex;
}
