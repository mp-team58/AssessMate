package com.assessmate.controller;

import com.assessmate.dto.*;
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
    private final com.assessmate.service.AdminService adminService;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.assessmate.security.ClientIpResolver clientIpResolver;

    @GetMapping("/admin/invitation/validate")
    public ResponseEntity<Map<String, Object>> validateAdminInvitation(@RequestParam String token) {
        return ResponseEntity.ok(adminService.validateInvitationToken(token));
    }

    @PostMapping("/admin/setup-password")
    public ResponseEntity<Map<String, String>> setupAdminPassword(
            @Valid @RequestBody AdminSetupPasswordRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest
    ) {
        String clientIp = clientIpResolver != null ? clientIpResolver.resolveClientIp(httpRequest) : "127.0.0.1";
        return ResponseEntity.ok(adminService.setupAdminPassword(request, clientIp));
    }

    @PostMapping("/admin/emergency-recovery")
    public ResponseEntity<Map<String, String>> emergencyRecoverAdmin(
            @Valid @RequestBody EmergencyRecoveryRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest
    ) {
        String clientIp = clientIpResolver != null ? clientIpResolver.resolveClientIp(httpRequest) : "127.0.0.1";
        return ResponseEntity.ok(adminService.emergencyRecoverAdmin(request, clientIp));
    }

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
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest
    ) {
        String clientIp = clientIpResolver != null ? clientIpResolver.resolveClientIp(httpRequest) : extractClientIp(httpRequest);
        return ResponseEntity.ok(authService.login(request, clientIp));
    }

    private String extractClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.trim().isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.trim().isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody com.assessmate.dto.ChangePasswordRequest request,
            Principal principal
    ) {
        if (principal == null) {
            throw new BadRequestException("No active session found.");
        }
        authService.changePassword(principal.getName(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully. Please log in with your new password."));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(Principal principal) {
        if (principal == null) {
            throw new BadRequestException("No active session found.");
        }
        authService.logout(principal.getName());
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping({"/me", "/profile"})
    public ResponseEntity<com.assessmate.dto.ProfileResponse> getMyProfile(Principal principal) {
        if (principal == null) {
            throw new BadRequestException("No active session found.");
        }
        return ResponseEntity.ok(authService.getMyProfile(principal));
    }

    @PatchMapping("/profile")
    public ResponseEntity<com.assessmate.dto.ProfileResponse> updateProfile(
            @Valid @RequestBody com.assessmate.dto.UpdateProfileRequest request,
            Principal principal,
            jakarta.servlet.http.HttpServletRequest httpRequest
    ) {
        if (principal == null) {
            throw new BadRequestException("No active session found.");
        }
        String clientIp = clientIpResolver != null ? clientIpResolver.resolveClientIp(httpRequest) : extractClientIp(httpRequest);
        return ResponseEntity.ok(authService.updateProfile(principal.getName(), request, clientIp));
    }
}
