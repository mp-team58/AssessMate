package com.assessmate.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelUploadResponse {

    private Integer totalRows;
    // total data rows in Excel

    private Integer savedCount;
    // how many questions saved successfully

    private Integer skippedCount;
    // how many rows had errors and were skipped

    private List<String> errors;
    // list of error messages per skipped row
    // example: "Row 3: Correct answer must be A,B,C or D"

    private List<QuestionResponse> savedQuestions;
    // the questions that were saved successfully
}