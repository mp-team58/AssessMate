package com.assessmate.dto;

import lombok.Data;
import java.util.List;

@Data
public class AddFromBankRequest {
    private Long examId;
    private List<Long> questionIds;
}