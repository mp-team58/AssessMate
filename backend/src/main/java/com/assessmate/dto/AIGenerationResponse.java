package com.assessmate.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIGenerationResponse {

    private Integer requestedCount;
    // what host asked for

    private Integer generatedCount;
    // how many were actually saved

    private Integer verifiedCount;
    private Integer unverifiedCount;

    private String inputType;
    // TOPIC / TEXT / FILE

    private String stage;
    // TOPIC_ONLY / FULL_TEXT / KEYWORD_MATCH
    // FALLBACK_BEGINNING / IMAGE_GENERATION

    private String warning;
    // null if no warning

    private List<QuestionResponse> verifiedQuestions;

    private List<QuestionResponse> unverifiedQuestions;
}
