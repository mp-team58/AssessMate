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
 * Thread-safe in-memory sliding-window rate limiter for OTP generation requests.
 * Protects public endpoints from abuse and brute-force email flooding:
 * - POST /api/auth/register/request-otp
 * - POST /api/auth/forgot-password/request-otp
 *
 * Rate Limit Policy: Maximum 5 requests per IP address per 60-second sliding window.
 *
 * MULTI-INSTANCE LIMITATION:
 * This rate limiter tracks request timestamps in-memory on the local application instance.
 * In a horizontally scaled multi-node environment, limits are enforced per node rather than
 * globally across the cluster, unless an external distributed store (such as Redis) or API
 * gateway rate-limiting tier is configured.
 */
@Service
@Slf4j
public class OtpRateLimiterService {

    @Value("${app.rate-limit.otp.max-requests:5}")
    private String maxRequestsStr = "5";

    @Value("${app.rate-limit.otp.window-seconds:60}")
    private String windowSecondsStr = "60";

    private int maxRequests = 5;
    private long windowSeconds = 60;

    @jakarta.annotation.PostConstruct
    public void init() {
        if (maxRequestsStr != null && !maxRequestsStr.trim().isEmpty()) {
            try {
                this.maxRequests = Integer.parseInt(maxRequestsStr.trim());
            } catch (NumberFormatException e) {
                log.warn("Invalid app.rate-limit.otp.max-requests '{}', defaulting to 5", maxRequestsStr);
                this.maxRequests = 5;
            }
        }
        if (windowSecondsStr != null && !windowSecondsStr.trim().isEmpty()) {
            try {
                this.windowSeconds = Long.parseLong(windowSecondsStr.trim());
            } catch (NumberFormatException e) {
                log.warn("Invalid app.rate-limit.otp.window-seconds '{}', defaulting to 60", windowSecondsStr);
                this.windowSeconds = 60;
            }
        }
    }

    public int getMaxRequests() {
        return maxRequests;
    }

    public void setMaxRequests(int maxRequests) {
        this.maxRequests = maxRequests;
    }

    public long getWindowSeconds() {
        return windowSeconds;
    }

    public void setWindowSeconds(long windowSeconds) {
        this.windowSeconds = windowSeconds;
    }

    private final Map<String, Deque<Instant>> ipAttempts = new ConcurrentHashMap<>();

    public OtpRateLimiterService() {
    }

    public OtpRateLimiterService(int maxRequests, long windowSeconds) {
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
    }

    /**
     * Checks if the given client IP has exceeded the allowed OTP requests in the sliding window.
     * If the limit is exceeded, throws RateLimitExceededException with the computed retry-after seconds.
     * If under the limit, records this attempt timestamp and returns normally.
     *
     * @param clientIp resolved client IP address
     * @throws RateLimitExceededException when maximum attempts are exceeded
     */
    public void checkAndRecord(String clientIp) {
        if (clientIp == null || clientIp.trim().isEmpty()) {
            return;
        }

        Instant now = Instant.now();
        Instant windowStart = now.minus(Duration.ofSeconds(windowSeconds));

        Deque<Instant> deque = ipAttempts.computeIfAbsent(clientIp, k -> new ArrayDeque<>());
        synchronized (deque) {
            // Evict timestamps older than the sliding window
            while (!deque.isEmpty() && deque.peekFirst().isBefore(windowStart)) {
                deque.pollFirst();
            }

            if (deque.size() >= maxRequests) {
                Instant oldestInWindow = deque.peekFirst();
                long remainingSeconds = windowSeconds;
                if (oldestInWindow != null) {
                    long elapsedSeconds = Duration.between(oldestInWindow, now).getSeconds();
                    remainingSeconds = Math.max(1, windowSeconds - elapsedSeconds);
                }

                // Log sanitized warning — never log OTPs, emails, or payload contents
                log.warn("OTP rate limit exceeded for client IP: {}", clientIp);
                throw new RateLimitExceededException(
                        "Too many verification code requests from this IP address. Please try again in " + remainingSeconds + " seconds.",
                        remainingSeconds
                );
            }

            deque.addLast(now);
        }
    }

    /**
     * Resets rate limit tracking for a specific IP (useful for test isolation).
     */
    public void reset(String clientIp) {
        if (clientIp != null) {
            ipAttempts.remove(clientIp);
        }
    }

    /**
     * Clears all tracked rate limit state.
     */
    public void clearAll() {
        ipAttempts.clear();
    }

    /**
     * Periodically cleans up empty or expired IP entries to prevent memory leaks.
     */
    @Scheduled(fixedRate = 60000)
    public void cleanupStaleEntries() {
        Instant windowStart = Instant.now().minus(Duration.ofSeconds(windowSeconds));
        ipAttempts.entrySet().removeIf(entry -> {
            Deque<Instant> deque = entry.getValue();
            synchronized (deque) {
                while (!deque.isEmpty() && deque.peekFirst().isBefore(windowStart)) {
                    deque.pollFirst();
                }
                return deque.isEmpty();
            }
        });
    }
}

