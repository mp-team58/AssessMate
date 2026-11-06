package com.assessmate.security;

import com.assessmate.controller.AuthController;
import com.assessmate.dto.ForgotPasswordRequest;
import com.assessmate.dto.RegisterRequest;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.RateLimitExceededException;
import com.assessmate.service.AdminService;
import com.assessmate.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OtpRateLimitingTest {

    private OtpRateLimiterService otpRateLimiterService;
    private ClientIpResolver clientIpResolver;

    @Mock
    private AuthService authService;

    @Mock
    private AdminService adminService;

    private AuthController authController;

    @BeforeEach
    void setUp() {
        otpRateLimiterService = new OtpRateLimiterService(5, 60);
        clientIpResolver = new ClientIpResolver("127.0.0.1,::1,10.0.0.0/8");

        authController = new AuthController(authService, adminService);
        authController.setOtpRateLimiterService(otpRateLimiterService);
        authController.setClientIpResolver(clientIpResolver);
    }

    @Test
    @DisplayName("1. Up to 5 OTP requests from the same IP are permitted within 60 seconds")
    void testAllowedWithinLimit() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.10");

        RegisterRequest req = new RegisterRequest();
        req.setEmail("test1@example.com");
        req.setPassword("Password123!");
        req.setName("Test User");
        req.setRole("CANDIDATE");

        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> authController.requestRegisterOtp(req, request));
        }

        verify(authService, times(5)).requestRegisterOtp(any(RegisterRequest.class));
    }

    @Test
    @DisplayName("2. 6th OTP request from the same IP throws RateLimitExceededException (HTTP 429)")
    void testLimitExceededThrows429() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.10");

        RegisterRequest req = new RegisterRequest();
        req.setEmail("test@example.com");
        req.setPassword("Password123!");
        req.setName("Test User");
        req.setRole("CANDIDATE");

        for (int i = 0; i < 5; i++) {
            authController.requestRegisterOtp(req, request);
        }

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
                authController.requestRegisterOtp(req, request));

        assertTrue(ex.getMessage().contains("Too many verification code requests from this IP address"));
        assertTrue(ex.getRetryAfterSeconds() > 0 && ex.getRetryAfterSeconds() <= 60);
        verify(authService, times(5)).requestRegisterOtp(any(RegisterRequest.class));
    }

    @Test
    @DisplayName("3. Rotating arbitrary emails does NOT bypass IP rate limit")
    void testRotatingEmailsDoesNotBypassIpLimit() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.25");

        for (int i = 1; i <= 5; i++) {
            RegisterRequest req = new RegisterRequest();
            req.setEmail("random" + i + "@attacker.org");
            req.setPassword("Password123!");
            req.setName("Attacker " + i);
            req.setRole("CANDIDATE");

            authController.requestRegisterOtp(req, request);
        }

        RegisterRequest req6 = new RegisterRequest();
        req6.setEmail("random6@attacker.org");
        req6.setPassword("Password123!");
        req6.setName("Attacker 6");
        req6.setRole("CANDIDATE");

        assertThrows(RateLimitExceededException.class, () ->
                authController.requestRegisterOtp(req6, request));
    }

    @Test
    @DisplayName("4. Different IP addresses maintain independent rate limit counters")
    void testDifferentIpsHaveSeparateLimits() {
        MockHttpServletRequest reqIp1 = new MockHttpServletRequest();
        reqIp1.setRemoteAddr("198.51.100.1");

        MockHttpServletRequest reqIp2 = new MockHttpServletRequest();
        reqIp2.setRemoteAddr("198.51.100.2");

        RegisterRequest req = new RegisterRequest();
        req.setEmail("candidate@example.com");
        req.setPassword("Password123!");
        req.setName("Candidate");
        req.setRole("CANDIDATE");

        // Exhaust IP 1
        for (int i = 0; i < 5; i++) {
            authController.requestRegisterOtp(req, reqIp1);
        }
        assertThrows(RateLimitExceededException.class, () ->
                authController.requestRegisterOtp(req, reqIp1));

        // IP 2 is still allowed
        assertDoesNotThrow(() -> authController.requestRegisterOtp(req, reqIp2));
    }

    @Test
    @DisplayName("5. Both registration and forgot-password endpoints are protected and share IP budget")
    void testBothEndpointsProtected() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.77");

        RegisterRequest regReq = new RegisterRequest();
        regReq.setEmail("user@example.com");
        regReq.setPassword("Password123!");
        regReq.setName("User");
        regReq.setRole("CANDIDATE");

        ForgotPasswordRequest forgotReq = new ForgotPasswordRequest();
        forgotReq.setEmail("user@example.com");
        forgotReq.setPortal("CANDIDATE");

        // 3 register requests
        for (int i = 0; i < 3; i++) {
            authController.requestRegisterOtp(regReq, request);
        }

        // 2 forgot-password requests
        for (int i = 0; i < 2; i++) {
            authController.requestPasswordResetOtp(forgotReq, request);
        }

        // 6th OTP request across either endpoint is blocked
        assertThrows(RateLimitExceededException.class, () ->
                authController.requestPasswordResetOtp(forgotReq, request));
        assertThrows(RateLimitExceededException.class, () ->
                authController.requestRegisterOtp(regReq, request));
    }

    @Test
    @DisplayName("6. Spoofed X-Forwarded-For headers from untrusted clients are ignored")
    void testSpoofedForwardedHeadersIgnored() {
        // Direct client IP is untrusted public address 203.0.113.5
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("X-Forwarded-For", "192.0.2.1"); // Attempt to spoof a different IP

        RegisterRequest req = new RegisterRequest();
        req.setEmail("spoof@example.com");
        req.setPassword("Password123!");
        req.setName("Spoofer");
        req.setRole("CANDIDATE");

        // ClientIpResolver must resolve 203.0.113.5 because remoteAddr is not a trusted proxy
        assertEquals("203.0.113.5", clientIpResolver.resolveClientIp(request));

        for (int i = 0; i < 5; i++) {
            // Change spoofed header each time; real IP is still 203.0.113.5
            request.removeHeader("X-Forwarded-For");
            request.addHeader("X-Forwarded-For", "192.0.2." + (i + 10));
            authController.requestRegisterOtp(req, request);
        }

        // 6th attempt with yet another spoofed IP still fails
        request.removeHeader("X-Forwarded-For");
        request.addHeader("X-Forwarded-For", "192.0.2.99");
        assertThrows(RateLimitExceededException.class, () ->
                authController.requestRegisterOtp(req, request));
    }

    @Test
    @DisplayName("7. Trusted proxy X-Forwarded-For is properly extracted and rate-limited")
    void testTrustedProxyXForwardedForHonored() {
        // Arrives from trusted proxy 127.0.0.1
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "198.51.100.99, 10.0.0.1");

        RegisterRequest req = new RegisterRequest();
        req.setEmail("client@example.com");
        req.setPassword("Password123!");
        req.setName("Client");
        req.setRole("CANDIDATE");

        for (int i = 0; i < 5; i++) {
            authController.requestRegisterOtp(req, request);
        }

        assertThrows(RateLimitExceededException.class, () ->
                authController.requestRegisterOtp(req, request));
    }

    @Test
    @DisplayName("8. Per-email cooldown continues to function alongside IP rate limiting")
    void testPerEmailCooldownStillWorks() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.50");

        RegisterRequest req = new RegisterRequest();
        req.setEmail("cooldown@example.com");
        req.setPassword("Password123!");
        req.setName("Cooldown User");
        req.setRole("CANDIDATE");

        // First attempt succeeds
        authController.requestRegisterOtp(req, request);

        // Second attempt on same email rejected by AuthService cooldown
        doThrow(new BadRequestException("Please wait before requesting another verification code."))
                .when(authService).requestRegisterOtp(req);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authController.requestRegisterOtp(req, request));
        assertEquals("Please wait before requesting another verification code.", ex.getMessage());
    }
}

