package com.assessmate.controller;

import com.assessmate.dto.AuthResponse;
import com.assessmate.dto.LoginRequest;
import com.assessmate.dto.RegisterRequest;
import com.assessmate.exception.BadRequestException;
import com.assessmate.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor

public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/request-otp")
    public ResponseEntity<Map<String, String>> requestRegisterOtp(
            @Valid @RequestBody RegisterRequest request
    ) {
        authService.requestRegisterOtp(request);
        return ResponseEntity.ok(
                Map.of("message", "A verification code has been sent to your email.")
        );
    }

    @PostMapping("/register/verify-otp")
    public ResponseEntity<AuthResponse> verifyRegisterOtp(
            @Valid @RequestBody com.assessmate.dto.VerifyOtpRequest request
    ) {
        return ResponseEntity.ok(authService.verifyRegisterOtp(request));
    }

    @PostMapping("/forgot-password/request-otp")
    public ResponseEntity<Map<String, String>> requestPasswordResetOtp(
            @Valid @RequestBody com.assessmate.dto.ForgotPasswordRequest request
    ) {
        authService.requestPasswordResetOtp(request);
        return ResponseEntity.ok(
                Map.of("message", "If an account exists for this email, a verification code has been sent.")
        );
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody com.assessmate.dto.ResetPasswordRequest request
    ) {
        authService.resetPassword(request);
        return ResponseEntity.ok(
                Map.of("message", "Password reset successfully. Please log in with your new password.")
        );
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(Principal principal) {
        if (principal == null) {
            throw new BadRequestException("No active session found.");
        }
        authService.logout(principal.getName());
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
