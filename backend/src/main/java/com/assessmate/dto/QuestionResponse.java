package com.assessmate.dto;

import com.assessmate.entity.Difficulty;
import com.assessmate.entity.QuestionType;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionResponse {

    private Long id;
    private Long examId;
    private Long createdById;
    private String createdByName;
    private String questionText;
    private String imageUrl;
    private QuestionType type;
    private Difficulty difficulty;
    private String topic;
    private String explanation;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctAnswer;
    private Double tolerance;
    private Boolean strictMarking;
    private String addedBy;
    private Double marks;
    private Double negativeMarks;
    private Integer timeSeconds;
    private Boolean isGlobal;
    private Boolean isVerified;
    private LocalDateTime createdAt;
}