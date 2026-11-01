package com.assessmate.security;

import com.assessmate.exception.RateLimitExceededException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory sliding-window rate limiter for login attempts.
 * Tracks failed login attempts per client IP and per normalized account identifier (email).
 *
 * NOTE: Limits are tracked in-memory per application instance. Counts and blocks reset
 * upon application restart. This is not a distributed rate limiter across multiple nodes.
 */
@Service
@Slf4j
public class LoginRateLimiterService {

    @Value("${app.rate-limit.login.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.rate-limit.login.window-seconds:60}")
    private long windowSeconds;

    private final Map<String, Deque<Instant>> ipAttempts = new ConcurrentHashMap<>();
    private final Map<String, Deque<Instant>> emailAttempts = new ConcurrentHashMap<>();

    public LoginRateLimiterService() {
    }

    public LoginRateLimiterService(int maxAttempts, long windowSeconds) {
        this.maxAttempts = maxAttempts;
        this.windowSeconds = windowSeconds;
    }

    /**
     * Checks if either the client IP or the account identifier has exceeded the failed login rate limit.
     * Throws RateLimitExceededException if blocked.
     */
    public void checkRateLimit(String clientIp, String normalizedEmail) {
        Instant now = Instant.now();
        Instant windowStart = now.minus(Duration.ofSeconds(windowSeconds));

        // 1. Check IP limit
        if (clientIp != null && !clientIp.trim().isEmpty()) {
            long ipRetryAfter = getRetryAfterSeconds(ipAttempts.get(clientIp), windowStart, now);
            if (ipRetryAfter > 0) {
                log.warn("Login rate limit exceeded for client IP: {}", clientIp);
                throw new RateLimitExceededException(
                    "Too many failed login attempts from this IP address. Please try again in " + ipRetryAfter + " seconds.",
                    ipRetryAfter
                );
            }
        }

        // 2. Check Account / Email limit
        if (normalizedEmail != null && !normalizedEmail.trim().isEmpty()) {
            long emailRetryAfter = getRetryAfterSeconds(emailAttempts.get(normalizedEmail), windowStart, now);
            if (emailRetryAfter > 0) {
                log.warn("Login rate limit exceeded for account identifier: {}", maskEmail(normalizedEmail));
                throw new RateLimitExceededException(
                    "Too many failed login attempts for this account. Please try again in " + emailRetryAfter + " seconds.",
                    emailRetryAfter
                );
            }
        }
    }

    /**
     * Records a failed login attempt for the client IP and account identifier.
     */
    public void onLoginFailure(String clientIp, String normalizedEmail) {
        Instant now = Instant.now();

        if (clientIp != null && !clientIp.trim().isEmpty()) {
            recordAttempt(ipAttempts, clientIp, now);
        }

        if (normalizedEmail != null && !normalizedEmail.trim().isEmpty()) {
            recordAttempt(emailAttempts, normalizedEmail, now);
        }
    }

    /**
     * Clears failed attempt counters on successful login.
     */
    public void onLoginSuccess(String clientIp, String normalizedEmail) {
        if (clientIp != null && !clientIp.trim().isEmpty()) {
            ipAttempts.remove(clientIp);
        }
        if (normalizedEmail != null && !normalizedEmail.trim().isEmpty()) {
            emailAttempts.remove(normalizedEmail);
        }
    }

    private void recordAttempt(Map<String, Deque<Instant>> map, String key, Instant timestamp) {
        map.compute(key, (k, deque) -> {
            if (deque == null) {
                deque = new ArrayDeque<>();
            }
            synchronized (deque) {
                deque.addLast(timestamp);
            }
            return deque;
        });
    }

    private long getRetryAfterSeconds(Deque<Instant> deque, Instant windowStart, Instant now) {
        if (deque == null) {
            return 0;
        }

        synchronized (deque) {
            while (!deque.isEmpty() && deque.peekFirst().isBefore(windowStart)) {
                deque.pollFirst();
            }

            if (deque.size() >= maxAttempts) {
                Instant oldestInWindow = deque.peekFirst();
                if (oldestInWindow != null) {
                    long elapsedSeconds = Duration.between(oldestInWindow, now).getSeconds();
                    long remainingSeconds = windowSeconds - elapsedSeconds;
                    return Math.max(1, remainingSeconds);
                }
                return windowSeconds;
            }
        }

        return 0;
    }

    @Scheduled(fixedRate = 60000)
    public void cleanupStaleEntries() {
        Instant windowStart = Instant.now().minus(Duration.ofSeconds(windowSeconds));
        cleanupMap(ipAttempts, windowStart);
        cleanupMap(emailAttempts, windowStart);
    }

    private void cleanupMap(Map<String, Deque<Instant>> map, Instant windowStart) {
        map.entrySet().removeIf(entry -> {
            Deque<Instant> deque = entry.getValue();
            synchronized (deque) {
                while (!deque.isEmpty() && deque.peekFirst().isBefore(windowStart)) {
                    deque.pollFirst();
                }
                return deque.isEmpty();
            }
        });
    }

    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return "***" + email.substring(Math.max(0, atIndex));
        }
        return email.charAt(0) + "***" + email.substring(atIndex - 1);
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public long getWindowSeconds() {
        return windowSeconds;
    }
}
