package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "exam_id")
    private Exam exam;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty;

    private String topic;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    @Column(nullable = false)
    private String correctAnswer;

    @Builder.Default
    private Double tolerance = 0.0;

    @Builder.Default
    private Boolean strictMarking = true;

    private String addedBy;
    // "MANUAL" / "AI" / "EXCEL" / "BANK"

    private Double marks;
    private Double negativeMarks;
    private Integer timeSeconds;

    @Builder.Default
    private Boolean isGlobal = true;

    @Builder.Default
    private Boolean isVerified = false;

    @Builder.Default
    private LocalDateTime createdAt =
            LocalDateTime.now();
}