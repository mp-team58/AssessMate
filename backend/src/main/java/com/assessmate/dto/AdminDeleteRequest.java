package com.assessmate.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminDeleteRequest {

    @NotBlank(message = "Current administrator password is required for confirmation")
    private String currentPassword;
}

