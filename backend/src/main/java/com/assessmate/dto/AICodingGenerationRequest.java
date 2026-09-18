package com.assessmate.dto;

import lombok.Data;
import java.util.List;

@Data
public class AICodingGenerationRequest {

    // The main input — topic or description
    // Examples:
    // "Binary Search"
    // "I want a problem about finding
    //  duplicates in O(n) time"
    private String input;

    // AUTO = system detects from length
    // TOPIC = short keyword/phrase
    // DESCRIPTION = detailed explanation
    // Default: AUTO
    private String inputType = "AUTO";

    // Optional overrides
    // If null AI decides
    private String difficulty;
    // EASY / MEDIUM / HARD

    private Double marks;
    private Integer timeLimitSeconds;
    private Integer memoryLimitMb;
    private List<String> allowedLanguages;

    // How many test cases to generate
    // Default 4 (1 visible + 3 hidden)
    private Integer testCaseCount = 4;

    // Save to global coding bank too
    private Boolean saveToBank = false;
}
