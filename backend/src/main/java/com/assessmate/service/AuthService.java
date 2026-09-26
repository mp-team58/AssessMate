package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.repository.UserRepository;
import com.assessmate.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ResourceNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(
            RegisterRequest req) {

        if (userRepository.existsByEmail(
                req.getEmail())) {
            throw new BadRequestException(
                    "Email already registered");
        }

        if ("HOST".equalsIgnoreCase(req.getRole())) {
            throw new BadRequestException("Host registration is currently disabled.");
        }

        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(
                        req.getPassword()))
                .role(Role.valueOf(req.getRole().toUpperCase()))
                .build();

        userRepository.save(user);

        // Generate token
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name());

        // Save token to database
        user.setActiveToken(token);
        userRepository.save(user);

        return new AuthResponse(
                token,
                user.getRole().name(),
                user.getName(),
                user.getId());
    }

    public AuthResponse login(LoginRequest req) {

        User user = userRepository
                .findByEmail(req.getEmail())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));

        if (!passwordEncoder.matches(
                req.getPassword(),
                user.getPassword())) {
            throw new BadRequestException(
                    "Invalid password");
        }

        // Role check
        if (req.getRole() != null
                && !req.getRole().isEmpty()) {
            if (!user.getRole().name()
                    .equalsIgnoreCase(req.getRole())) {
                throw new BadRequestException(
                        "This account is registered as "
                                + user.getRole().name()
                                + ". Please select "
                                + "the correct role.");
            }
        }

        // Generate new token
        // This invalidates all previous tokens
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name());

        // Replace old token in database
        user.setActiveToken(token);
        userRepository.save(user);

        return new AuthResponse(
                token,
                user.getRole().name(),
                user.getName(),
                user.getId());
    }

    public void logout(String email) {
        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));

        // Clear token from database
        user.setActiveToken(null);
        userRepository.save(user);
    }
}