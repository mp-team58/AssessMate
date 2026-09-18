package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "coding_assignments",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {
            "enrollment_id",
            "coding_question_id"
        }
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodingAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long enrollmentId;

    @ManyToOne(optional = false)
    @JoinColumn(
        name = "coding_question_id",
        nullable = false)
    private CodingQuestion codingQuestion;

    @Column(nullable = false)
    private Integer orderIndex;

    @Builder.Default
    private LocalDateTime assignedAt = LocalDateTime.now();
}
