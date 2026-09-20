package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "candidate_answers",
        uniqueConstraints = @UniqueConstraint(columnNames = {"enrollment_id", "question_id"}),
        indexes = {
                @Index(name = "idx_answer_enrollment", columnList = "enrollment_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private ExamEnrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "candidate_answer", columnDefinition = "TEXT")
    private String candidateAnswer;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "marks_awarded")
    private Double marksAwarded;
}
