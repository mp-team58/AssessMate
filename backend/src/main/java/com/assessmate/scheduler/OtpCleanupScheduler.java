package com.assessmate.scheduler;

import com.assessmate.repository.OtpVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class OtpCleanupScheduler {

    private final OtpVerificationRepository otpVerificationRepository;

    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void cleanupExpiredOtps() {
        log.debug("Running expired OTP cleanup task...");
        try {
            otpVerificationRepository.deleteByExpiresAtBefore(LocalDateTime.now());
            log.debug("Expired OTP cleanup task completed.");
        } catch (Exception e) {
            log.error("Failed to clean up expired OTPs", e);
        }
    }
}
