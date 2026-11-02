package com.assessmate.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminProfileUpdateRequest {
    @NotBlank(message = "Name cannot be blank")
    private String name;
}

