package com.assessmate.dto;

import com.assessmate.entity.Difficulty;
import com.assessmate.entity.QuestionType;
import lombok.Data;

@Data
public class QuestionBankFilterRequest {
    private Difficulty difficulty;
    private QuestionType type;
    private String topic;
    private String search;
}