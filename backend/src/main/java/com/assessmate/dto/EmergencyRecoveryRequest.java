package com.assessmate.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EmergencyRecoveryRequest {

    @NotBlank(message = "Recovery authorization secret is required")
    private String recoverySecret;

    @NotBlank(message = "Admin email is required")
    @Email(message = "Valid admin email is required")
    private String adminEmail;

    @NotBlank(message = "New password is required")
    @Size(min = 12, message = "Password must be at least 12 characters")
    private String newPassword;
}

