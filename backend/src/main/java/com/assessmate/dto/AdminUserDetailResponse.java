package com.assessmate.dto;

import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDetailResponse {
    private Long id;
    private String name;
    private String email;
    private Role role;
    private AccountStatus status;
    private Boolean mustChangePassword;
    private LocalDateTime createdAt;
    private LocalDateTime deletedAt;
    private String deletedBy;
    private Map<String, Object> summary;
}

