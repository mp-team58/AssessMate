package com.assessmate.controller;

import com.assessmate.dto.AuthResponse;
import com.assessmate.dto.LoginRequest;
import com.assessmate.dto.RegisterRequest;
import com.assessmate.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthService authService;

    // Register API
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @RequestBody RegisterRequest request) {

        return ResponseEntity.ok(
                authService.register(request)
        );
    }

    // Login API
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest request) {

        return ResponseEntity.ok(
                authService.login(request)
        );
    }

    // Logout — clears active token
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            Principal principal) {
        authService.logout(principal.getName());
        return ResponseEntity.ok(
                Map.of("message",
                        "Logged out successfully"));
    }
}