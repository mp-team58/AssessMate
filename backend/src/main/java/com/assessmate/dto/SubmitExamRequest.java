package com.assessmate.dto;

import lombok.Data;
import java.util.Map;

@Data
public class SubmitExamRequest {
    private Map<Long, String> answers;
}
