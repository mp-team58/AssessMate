package com.assessmate.service;

import com.assessmate.dto.AuthResponse;
import com.assessmate.dto.LoginRequest;
import com.assessmate.dto.RegisterRequest;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.repository.UserRepository;
import com.assessmate.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // Register a new user
    public AuthResponse register(RegisterRequest req) {

        // Check if email already exists
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        // Create User object
        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.valueOf(req.getRole()))
                .build();

        // Save user to database
        userRepository.save(user);

        // Generate JWT token
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name()
        );

        // Return response
        return new AuthResponse(
                token,
                user.getRole().name(),
                user.getName(),
                user.getId()
        );
    }

    // Login existing user
    public AuthResponse login(LoginRequest req) {

        // Find user by email
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        // Verify password
        if (!passwordEncoder.matches(
                req.getPassword(),
                user.getPassword())) {

            throw new RuntimeException("Invalid password");
        }

        // Generate JWT token
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name()
        );

        // Return response
        return new AuthResponse(
                token,
                user.getRole().name(),
                user.getName(),
                user.getId()
        );
    }
}