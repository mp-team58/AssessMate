package com.assessmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String role;
    private String name;
    private Long id;
    private Boolean mustChangePassword;

    public AuthResponse(String token, String role, String name, Long id) {
        this(token, role, name, id, false);
    }
}
