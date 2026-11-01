package com.assessmate.security;

import com.assessmate.exception.RateLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LoginRateLimiterServiceTest {

    private LoginRateLimiterService rateLimiter;

    @BeforeEach
    void setUp() {
        // 5 max attempts, 60 seconds window
        rateLimiter = new LoginRateLimiterService(5, 60);
    }

    @Test
    @DisplayName("First five failed attempts are permitted without exception")
    void testFirstFiveFailuresAllowed() {
        String ip = "192.168.1.100";
        String email = "candidate@example.com";

        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> rateLimiter.checkRateLimit(ip, email));
            rateLimiter.onLoginFailure(ip, email);
        }
    }

    @Test
    @DisplayName("Sixth rapid failed attempt from same IP throws RateLimitExceededException")
    void testSixthAttemptBlockedByIp() {
        String ip = "192.168.1.101";
        String email = "target@example.com";

        for (int i = 0; i < 5; i++) {
            rateLimiter.onLoginFailure(ip, email);
        }

        RateLimitExceededException ex = assertThrows(
            RateLimitExceededException.class,
            () -> rateLimiter.checkRateLimit(ip, "another@example.com")
        );

        assertTrue(ex.getRetryAfterSeconds() > 0 && ex.getRetryAfterSeconds() <= 60);
        assertTrue(ex.getMessage().contains("Too many failed login attempts from this IP address"));
    }

    @Test
    @DisplayName("Account identifier limit blocks distributed attack against same email")
    void testBlockedByAccountAcrossDifferentIps() {
        String email = "victim@example.com";

        for (int i = 0; i < 5; i++) {
            rateLimiter.onLoginFailure("10.0.0." + i, email);
        }

        RateLimitExceededException ex = assertThrows(
            RateLimitExceededException.class,
            () -> rateLimiter.checkRateLimit("10.0.0.99", email)
        );

        assertTrue(ex.getRetryAfterSeconds() > 0 && ex.getRetryAfterSeconds() <= 60);
        assertTrue(ex.getMessage().contains("Too many failed login attempts for this account"));
    }

    @Test
    @DisplayName("Successful login resets failure count")
    void testSuccessfulLoginResetsCount() {
        String ip = "192.168.1.102";
        String email = "user@example.com";

        // 4 failed attempts
        for (int i = 0; i < 4; i++) {
            rateLimiter.onLoginFailure(ip, email);
        }

        // 5th attempt succeeds
        rateLimiter.onLoginSuccess(ip, email);

        // Subsequent failure should be count 1, not 5
        assertDoesNotThrow(() -> rateLimiter.checkRateLimit(ip, email));
        rateLimiter.onLoginFailure(ip, email);
        assertDoesNotThrow(() -> rateLimiter.checkRateLimit(ip, email));
    }

    @Test
    @DisplayName("Different client IPs have independent limits")
    void testDifferentIpsIndependentLimits() {
        String ipA = "192.168.1.1";
        String ipB = "192.168.1.2";
        String emailA = "userA@example.com";
        String emailB = "userB@example.com";

        // IP A fails 5 times
        for (int i = 0; i < 5; i++) {
            rateLimiter.onLoginFailure(ipA, emailA);
        }

        // IP A should be blocked
        assertThrows(RateLimitExceededException.class, () -> rateLimiter.checkRateLimit(ipA, emailA));

        // IP B should NOT be blocked
        assertDoesNotThrow(() -> rateLimiter.checkRateLimit(ipB, emailB));
    }
}
