package com.assessmate.controller;

import com.assessmate.dto.LoginRequest;
import com.assessmate.exception.RateLimitExceededException;
import com.assessmate.security.JwtFilter;
import com.assessmate.security.JwtUtil;
import com.assessmate.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.mockito.ArgumentMatchers.anyString;
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
    private JwtFilter jwtFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @Test
    @DisplayName("AuthController returns 429 Too Many Requests with Retry-After when rate limit is exceeded")
    void testRateLimitExceededReturns429() throws Exception {
        when(authService.login(any(LoginRequest.class), anyString()))
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
}
