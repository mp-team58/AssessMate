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
@lombok.extern.slf4j.Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final com.assessmate.security.LoginRateLimiterService loginRateLimiterService;
    private final OtpVerificationRepository otpRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AdminAuditService auditService;

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.otp.resend-cooldown-seconds:60}")
    private int resendCooldownSeconds;

    @Transactional
    public void requestRegisterOtp(RegisterRequest req) {
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);

        // Security check: strictly whitelist registration roles. Public registration can never create ADMIN.
        if (req.getRole() == null || 
            (!req.getRole().equalsIgnoreCase("HOST") && !req.getRole().equalsIgnoreCase("CANDIDATE"))) {
            throw new BadRequestException("Invalid role. Registration is only permitted for HOST or CANDIDATE.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already registered");
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
                .pendingRole(Role.valueOf(req.getRole().toUpperCase(Locale.ROOT)))
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
                .status(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .build();

        userRepository.save(user);
        otpRepository.delete(otpVerification);

        Long tokenVer = user.getTokenVersion() != null ? user.getTokenVersion() : 1L;
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), tokenVer);
        user.setActiveToken(token);
        userRepository.save(user);

        return new AuthResponse(token, user.getRole().name(), user.getName(), user.getId(), false);
    }

    @Transactional
    public void requestPasswordResetOtp(ForgotPasswordRequest req) {
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();
        if (user.getStatus() == AccountStatus.DELETED || 
            user.getStatus() == AccountStatus.DEACTIVATED || 
            user.getStatus() == AccountStatus.PENDING_INVITATION) {
            // Return quietly without revealing existence or status
            return;
        }

        // Restrict recovery to active ADMIN accounts when initiated from Admin portal
        if ("ADMIN".equalsIgnoreCase(req.getPortal()) && user.getRole() != Role.ADMIN) {
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

        if (user.getStatus() == AccountStatus.DELETED || 
            user.getStatus() == AccountStatus.DEACTIVATED || 
            user.getStatus() == AccountStatus.PENDING_INVITATION) {
            throw new BadRequestException("If an account exists for this email, a verification code has been sent.");
        }

        // Restrict recovery to active ADMIN accounts when initiated from Admin portal
        if ("ADMIN".equalsIgnoreCase(req.getPortal()) && user.getRole() != Role.ADMIN) {
            throw new BadRequestException("If an account exists for this email, a verification code has been sent.");
        }

        OtpVerification otpVerification = otpRepository.findByEmailAndPurpose(email, OtpPurpose.FORGOT_PASSWORD)
                .orElseThrow(() -> new BadRequestException("Verification code has expired. Please request a new code."));

        validateOtp(otpVerification, req.getOtp());

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setActiveToken(null);
        Long currentVersion = user.getTokenVersion() != null ? user.getTokenVersion() : 1L;
        user.setTokenVersion(currentVersion + 1);
        userRepository.save(user);

        otpRepository.delete(otpVerification);
    }

    public AuthResponse login(LoginRequest req) {
        return login(req, "127.0.0.1");
    }

    public AuthResponse login(LoginRequest req, String clientIp) {
        String email = req.getEmail() != null ? req.getEmail().trim().toLowerCase(Locale.ROOT) : "";

        // Rate limit check before attempting DB query or password comparison
        loginRateLimiterService.checkRateLimit(clientIp, email);

        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new BadRequestException("Invalid email or password"));

            // 1. Admin portal validation: if portal=ADMIN, only ADMIN can authenticate
            if (req.getPortal() != null && req.getPortal().equalsIgnoreCase("ADMIN")) {
                if (user.getRole() != Role.ADMIN) {
                    throw new BadRequestException("Invalid email or password");
                }
            }

            // 2. Account status validation
            if (user.getStatus() == AccountStatus.DELETED) {
                throw new BadRequestException("Invalid email or password");
            }

            if (user.getStatus() == AccountStatus.DEACTIVATED) {
                throw new BadRequestException("Your account has been deactivated. Please contact support.");
            }

            if (user.getStatus() == AccountStatus.PENDING_INVITATION) {
                throw new BadRequestException("Account invitation is pending. Please complete password setup via the link sent to your email.");
            }

            // 3. Password match
            if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
                throw new BadRequestException("Invalid email or password");
            }

            // 4. Role mismatch check for standard login
            if (req.getRole() != null && !req.getRole().isEmpty()) {
                if (!user.getRole().name().equalsIgnoreCase(req.getRole())) {
                    throw new BadRequestException("This account is registered as " + user.getRole().name() + ". Please select the correct role.");
                }
            }

            // Successful login resets failed attempt counters
            loginRateLimiterService.onLoginSuccess(clientIp, email);

            Long tokenVer = user.getTokenVersion() != null ? user.getTokenVersion() : 1L;
            user.setTokenVersion(tokenVer);
            String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), tokenVer);
            user.setActiveToken(token);
            userRepository.save(user);

            // Audit admin login
            if (user.getRole() == Role.ADMIN) {
                auditService.logAction(
                        user.getId(),
                        user.getEmail(),
                        "ADMIN_LOGIN",
                        "AUTH",
                        user.getId().toString(),
                        String.format("{\"portal\":\"%s\"}", req.getPortal() != null ? req.getPortal() : "DEFAULT"),
                        clientIp
                );
            }

            return new AuthResponse(token, user.getRole().name(), user.getName(), user.getId(), user.getMustChangePassword());

        } catch (BadRequestException ex) {
            loginRateLimiterService.onLoginFailure(clientIp, email);
            throw ex;
        }
    }

    @Transactional
    public void changePassword(String email, com.assessmate.dto.ChangePasswordRequest request) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password does not match");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password cannot be the same as your current password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        Long currentVersion = user.getTokenVersion() != null ? user.getTokenVersion() : 1L;
        user.setTokenVersion(currentVersion + 1);
        user.setActiveToken(null);
        userRepository.save(user);
    }

    public void logout(String email) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setActiveToken(null);
        userRepository.save(user);

        if (user.getRole() == Role.ADMIN) {
            auditService.logAction(
                    user.getId(),
                    user.getEmail(),
                    "ADMIN_LOGOUT",
                    "AUTH",
                    user.getId().toString(),
                    "{}",
                    "127.0.0.1"
            );
        }
    }

    public ProfileResponse getMyProfile(java.security.Principal principal) {
        String email = principal.getName().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return ProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .status(user.getStatus() != null ? user.getStatus().name() : "ACTIVE")
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Transactional
    public ProfileResponse updateProfile(String authenticatedEmail, UpdateProfileRequest request, String clientIp) {
        String email = authenticatedEmail.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getStatus() == AccountStatus.DELETED || user.getStatus() == AccountStatus.DEACTIVATED) {
            throw new BadRequestException("Account is inactive.");
        }

        String newName = request.getName().trim();
        String previousName = user.getName();
        user.setName(newName);
        userRepository.save(user);

        try {
            auditService.logAction(
                    user.getId(),
                    user.getEmail(),
                    "PROFILE_UPDATE",
                    "USER",
                    user.getId().toString(),
                    String.format("{\"previousName\":\"%s\", \"newName\":\"%s\"}", previousName, newName),
                    clientIp
            );
        } catch (Exception e) {
            log.warn("Failed to audit profile update for user {}: {}", user.getId(), e.getMessage());
        }

        return ProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .status(user.getStatus() != null ? user.getStatus().name() : "ACTIVE")
                .createdAt(user.getCreatedAt())
                .build();
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
