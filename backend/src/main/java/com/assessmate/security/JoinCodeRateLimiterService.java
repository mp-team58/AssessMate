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
 * Thread-safe in-memory sliding-window rate limiter for exam join-code attempts.
 * Tracks failed join attempts per client IP and per candidate identity (email).
 */
@Service
@Slf4j
public class JoinCodeRateLimiterService {

    @Value("${app.rate-limit.join-code.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.rate-limit.join-code.window-seconds:60}")
    private long windowSeconds;

    private final Map<String, Deque<Instant>> ipAttempts = new ConcurrentHashMap<>();
    private final Map<String, Deque<Instant>> candidateAttempts = new ConcurrentHashMap<>();

    public JoinCodeRateLimiterService() {
    }

    public JoinCodeRateLimiterService(int maxAttempts, long windowSeconds) {
        this.maxAttempts = maxAttempts;
        this.windowSeconds = windowSeconds;
    }

    /**
     * Checks if either the client IP or the candidate identity has exceeded the failed join attempt rate limit.
     * Throws RateLimitExceededException if blocked.
     */
    public void checkRateLimit(String clientIp, String candidateEmail) {
        Instant now = Instant.now();
        Instant windowStart = now.minus(Duration.ofSeconds(windowSeconds));

        // 1. Check IP limit
        if (clientIp != null && !clientIp.trim().isEmpty()) {
            long ipRetryAfter = getRetryAfterSeconds(ipAttempts.get(clientIp), windowStart, now);
            if (ipRetryAfter > 0) {
                log.warn("Join-code rate limit exceeded for client IP: {}", clientIp);
                throw new RateLimitExceededException(
                    "Too many failed exam join attempts. Please try again in " + ipRetryAfter + " seconds.",
                    ipRetryAfter
                );
            }
        }

        // 2. Check Candidate identity limit
        if (candidateEmail != null && !candidateEmail.trim().isEmpty()) {
            String normalizedEmail = candidateEmail.trim().toLowerCase();
            long emailRetryAfter = getRetryAfterSeconds(candidateAttempts.get(normalizedEmail), windowStart, now);
            if (emailRetryAfter > 0) {
                log.warn("Join-code rate limit exceeded for candidate: {}", maskEmail(normalizedEmail));
                throw new RateLimitExceededException(
                    "Too many failed exam join attempts. Please try again in " + emailRetryAfter + " seconds.",
                    emailRetryAfter
                );
            }
        }
    }

    /**
     * Records a failed join attempt for client IP and candidate identity.
     */
    public void onJoinFailure(String clientIp, String candidateEmail) {
        Instant now = Instant.now();

        if (clientIp != null && !clientIp.trim().isEmpty()) {
            recordAttempt(ipAttempts, clientIp, now);
        }

        if (candidateEmail != null && !candidateEmail.trim().isEmpty()) {
            recordAttempt(candidateAttempts, candidateEmail.trim().toLowerCase(), now);
        }
    }

    /**
     * Resets failure counters upon successful join.
     */
    public void onJoinSuccess(String clientIp, String candidateEmail) {
        if (clientIp != null && !clientIp.trim().isEmpty()) {
            ipAttempts.remove(clientIp);
        }
        if (candidateEmail != null && !candidateEmail.trim().isEmpty()) {
            candidateAttempts.remove(candidateEmail.trim().toLowerCase());
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
        cleanupMap(candidateAttempts, windowStart);
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
