package com.assessmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSecurityStatusResponse {
    private long totalActiveAdmins;
    private boolean singleActiveAdminWarning;
    private boolean emergencyRecoveryConfigured;
    private boolean emergencyRecoveryEnabled;
    private String lastRecoveryEvent;
    private LocalDateTime lastRecoveryTimestamp;
}

