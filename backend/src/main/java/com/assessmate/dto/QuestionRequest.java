package com.assessmate.dto;

import com.assessmate.entity.Difficulty;
import com.assessmate.entity.QuestionType;
import lombok.Data;

@Data
public class QuestionRequest {

    private Long examId;
    // null when adding to global bank only

    private String questionText;

    private QuestionType type;
    // SINGLE_CHOICE / MULTIPLE_SELECT
    // FILL_BLANK / NUMERICAL

    private Difficulty difficulty;

    private String topic;
    // optional

    private String explanation;
    // optional

    // Required for SINGLE_CHOICE
    // and MULTIPLE_SELECT only
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    // Format per type:
    // SINGLE_CHOICE   → "A"
    // MULTIPLE_SELECT → "A,C,D"
    // FILL_BLANK      → "Java"
    // NUMERICAL       → "9.8"
    private String correctAnswer;

    // Only for NUMERICAL
    private Double tolerance;

    // Only for MULTIPLE_SELECT
    // true = all correct needed for full marks
    private Boolean strictMarking;

    // Only when examId is set
    // true = also save copy to global bank
    // false = exam only, skip global bank
    private Boolean saveToBank;
}