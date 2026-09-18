package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "coding_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodingQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "exam_id")
    private Exam exam; // null when isGlobal = true

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String constraints;

    @Column(columnDefinition = "TEXT")
    private String sampleInput;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String sampleOutput;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(nullable = false)
    private String allowedLanguages;

    @Builder.Default
    private Integer timeLimitSeconds = 2;

    @Builder.Default
    private Integer memoryLimitMb = 256;

    @Column(nullable = false)
    private Double marks;

    @Builder.Default
    private Boolean partialMarking = false;

    @Builder.Default
    private Boolean isGlobal = false;

    private Integer orderIndex;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
