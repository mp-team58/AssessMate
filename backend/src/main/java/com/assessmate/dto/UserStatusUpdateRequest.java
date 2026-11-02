package com.assessmate.dto;

import com.assessmate.entity.AccountStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserStatusUpdateRequest {
    @NotNull(message = "Status is required")
    private AccountStatus status;
}

