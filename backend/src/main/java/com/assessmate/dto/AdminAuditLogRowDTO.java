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
public class AdminAuditLogRowDTO {
    private Long id;
    private Long actorId;
    private String actorEmail;
    private String action;
    private String targetType;
    private String targetId;
    private String metadataJson;
    private String clientIp;
    private LocalDateTime createdAt;
}

