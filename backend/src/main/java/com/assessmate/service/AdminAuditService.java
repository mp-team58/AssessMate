package com.assessmate.service;

import com.assessmate.entity.AdminAuditLog;
import com.assessmate.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuditService {

    private final AdminAuditLogRepository auditLogRepository;

    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void logAction(Long actorId, String actorEmail, String action, String targetType, String targetId, String metadataJson, String clientIp) {
        try {
            AdminAuditLog logEntry = AdminAuditLog.builder()
                    .actorId(actorId)
                    .actorEmail(actorEmail)
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .metadataJson(metadataJson)
                    .clientIp(clientIp)
                    .createdAt(LocalDateTime.now())
                    .build();
            auditLogRepository.save(logEntry);
        } catch (Exception e) {
            log.error("Failed to record admin audit log: {}", e.getMessage());
        }
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int atIndex = email.indexOf('@');
        String name = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (name.length() <= 1) {
            return name + "***" + domain;
        }
        return name.charAt(0) + "***" + domain;
    }
}

