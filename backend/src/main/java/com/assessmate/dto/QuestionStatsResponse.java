package com.assessmate.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionStatsResponse {

    private Integer totalRequired;
    private Long totalAdded;

    private Integer easyRequired;
    private Long easyAdded;
    private String easyStatus;
    // COMPLETE / INCOMPLETE / EXCESS

    private Integer mediumRequired;
    private Long mediumAdded;
    private String mediumStatus;

    private Integer hardRequired;
    private Long hardAdded;
    private String hardStatus;

    private Boolean canPublish;
    private String message;
}