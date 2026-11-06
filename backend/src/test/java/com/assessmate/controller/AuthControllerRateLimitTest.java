package com.assessmate.controller;

import com.assessmate.dto.ForgotPasswordRequest;
import com.assessmate.dto.LoginRequest;
import com.assessmate.dto.RegisterRequest;
import com.assessmate.exception.RateLimitExceededException;
import com.assessmate.security.ClientIpResolver;
import com.assessmate.security.JwtFilter;
import com.assessmate.security.JwtUtil;
import com.assessmate.security.OtpRateLimiterService;
import com.assessmate.service.AdminService;
import com.assessmate.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(com.assessmate.exception.GlobalExceptionHandler.class)
class AuthControllerRateLimitTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private AdminService adminService;

    @MockBean
    private JwtFilter jwtFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private OtpRateLimiterService otpRateLimiterService;

    @MockBean
    private ClientIpResolver clientIpResolver;

    @BeforeEach
    void setUp() {
        when(clientIpResolver.resolveClientIp(any())).thenReturn("203.0.113.195");
    }

    @Test
    @DisplayName("AuthController returns 429 Too Many Requests with Retry-After when login rate limit is exceeded")
    void testRateLimitExceededReturns429() throws Exception {
        when(authService.login(any(LoginRequest.class), any()))
            .thenThrow(new RateLimitExceededException(
                "Too many failed login attempts from this IP address. Please try again in 55 seconds.", 55L
            ));

        LoginRequest req = new LoginRequest();
        req.setEmail("attacker@example.com");
        req.setPassword("wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req))
                .header("X-Forwarded-For", "203.0.113.195"))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string("Retry-After", "55"))
            .andExpect(jsonPath("$.status").value(429))
            .andExpect(jsonPath("$.error").value("Too Many Requests"))
            .andExpect(jsonPath("$.message").value("Too many failed login attempts from this IP address. Please try again in 55 seconds."));
    }

    @Test
    @DisplayName("Register request-otp returns 429 when OTP rate limit is exceeded")
    void testRegisterRequestOtpRateLimitExceededReturns429() throws Exception {
        doThrow(new RateLimitExceededException(
                "Too many verification code requests from this IP address. Please try again in 50 seconds.", 50L
        )).when(otpRateLimiterService).checkAndRecord(any());

        RegisterRequest req = new RegisterRequest();
        req.setEmail("candidate@example.com");
        req.setPassword("ValidPassword123!");
        req.setName("Test Candidate");
        req.setRole("CANDIDATE");

        mockMvc.perform(post("/api/auth/register/request-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string("Retry-After", "50"))
            .andExpect(jsonPath("$.status").value(429))
            .andExpect(jsonPath("$.message").value("Too many verification code requests from this IP address. Please try again in 50 seconds."));
    }

    @Test
    @DisplayName("Forgot-password request-otp returns 429 when OTP rate limit is exceeded")
    void testForgotPasswordRequestOtpRateLimitExceededReturns429() throws Exception {
        doThrow(new RateLimitExceededException(
                "Too many verification code requests from this IP address. Please try again in 45 seconds.", 45L
        )).when(otpRateLimiterService).checkAndRecord(any());

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("candidate@example.com");
        req.setPortal("CANDIDATE");

        mockMvc.perform(post("/api/auth/forgot-password/request-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string("Retry-After", "45"))
            .andExpect(jsonPath("$.status").value(429))
            .andExpect(jsonPath("$.message").value("Too many verification code requests from this IP address. Please try again in 45 seconds."));
    }
}
