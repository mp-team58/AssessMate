package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.repository.OtpVerificationRepository;
import com.assessmate.repository.UserRepository;
import com.assessmate.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OtpVerificationRepository otpRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.otp.resend-cooldown-seconds:60}")
    private int resendCooldownSeconds;

    @Transactional
    public void requestRegisterOtp(RegisterRequest req) {
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already registered");
        }

        if ("HOST".equalsIgnoreCase(req.getRole())) {
            throw new BadRequestException("Host registration is currently disabled.");
        }

        checkCooldown(email, OtpPurpose.REGISTER);

        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp);

        otpRepository.deleteByEmailAndPurpose(email, OtpPurpose.REGISTER);
        otpRepository.flush();

        OtpVerification otpVerification = OtpVerification.builder()
                .email(email)
                .purpose(OtpPurpose.REGISTER)
                .otpHash(otpHash)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .attempts(0)
                .createdAt(LocalDateTime.now())
                .pendingName(req.getName())
                .pendingPasswordHash(passwordEncoder.encode(req.getPassword()))
                .pendingRole(Role.valueOf(req.getRole().toUpperCase()))
                .build();

        otpRepository.save(otpVerification);
        emailService.sendRegistrationOtp(email, req.getName(), otp);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public AuthResponse verifyRegisterOtp(VerifyOtpRequest req) {
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);

        OtpVerification otpVerification = otpRepository.findByEmailAndPurpose(email, OtpPurpose.REGISTER)
                .orElseThrow(() -> new BadRequestException("Verification code has expired. Please request a new code."));

        validateOtp(otpVerification, req.getOtp());

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .name(otpVerification.getPendingName())
                .email(email)
                .password(otpVerification.getPendingPasswordHash())
                .role(otpVerification.getPendingRole())
                .build();

        userRepository.save(user);
        otpRepository.delete(otpVerification);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        user.setActiveToken(token);
        userRepository.save(user);

        return new AuthResponse(token, user.getRole().name(), user.getName(), user.getId());
    }

    @Transactional
    public void requestPasswordResetOtp(ForgotPasswordRequest req) {
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return;
        }

        checkCooldown(email, OtpPurpose.FORGOT_PASSWORD);

        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp);

        otpRepository.deleteByEmailAndPurpose(email, OtpPurpose.FORGOT_PASSWORD);
        otpRepository.flush();

        OtpVerification otpVerification = OtpVerification.builder()
                .email(email)
                .purpose(OtpPurpose.FORGOT_PASSWORD)
                .otpHash(otpHash)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .attempts(0)
                .createdAt(LocalDateTime.now())
                .build();

        otpRepository.save(otpVerification);
        emailService.sendPasswordResetOtp(email, otp);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public void resetPassword(ResetPasswordRequest req) {
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("If an account exists for this email, a verification code has been sent."));

        OtpVerification otpVerification = otpRepository.findByEmailAndPurpose(email, OtpPurpose.FORGOT_PASSWORD)
                .orElseThrow(() -> new BadRequestException("Verification code has expired. Please request a new code."));

        validateOtp(otpVerification, req.getOtp());

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setActiveToken(null);
        userRepository.save(user);

        otpRepository.delete(otpVerification);
    }

    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        if (req.getRole() != null && !req.getRole().isEmpty()) {
            if (!user.getRole().name().equalsIgnoreCase(req.getRole())) {
                throw new BadRequestException("This account is registered as " + user.getRole().name() + ". Please select the correct role.");
            }
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        user.setActiveToken(token);
        userRepository.save(user);

        return new AuthResponse(token, user.getRole().name(), user.getName(), user.getId());
    }

    public void logout(String email) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setActiveToken(null);
        userRepository.save(user);
    }

    private void checkCooldown(String email, OtpPurpose purpose) {
        Optional<OtpVerification> existing = otpRepository.findByEmailAndPurpose(email, purpose);
        if (existing.isPresent()) {
            if (LocalDateTime.now().isBefore(existing.get().getCreatedAt().plusSeconds(resendCooldownSeconds))) {
                throw new BadRequestException("Please wait before requesting another verification code.");
            }
        }
    }

    private void validateOtp(OtpVerification otpVerification, String rawOtp) {
        if (LocalDateTime.now().isAfter(otpVerification.getExpiresAt())) {
            otpRepository.delete(otpVerification);
            throw new BadRequestException("Verification code has expired. Please request a new code.");
        }

        if (otpVerification.getAttempts() >= maxAttempts) {
            otpRepository.delete(otpVerification);
            throw new BadRequestException("Too many incorrect attempts. Please request a new verification code.");
        }

        if (!passwordEncoder.matches(rawOtp, otpVerification.getOtpHash())) {
            otpVerification.setAttempts(otpVerification.getAttempts() + 1);
            otpRepository.save(otpVerification);
            throw new BadRequestException("Invalid verification code.");
        }
    }

    private String generateOtp() {
        int otp = new SecureRandom().nextInt(1_000_000);
        return String.format("%06d", otp);
    }
}