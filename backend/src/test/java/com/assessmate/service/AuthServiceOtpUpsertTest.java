package com.assessmate.service;

import com.assessmate.dto.ForgotPasswordRequest;
import com.assessmate.dto.RegisterRequest;
import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.OtpPurpose;
import com.assessmate.entity.OtpVerification;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.exception.BadRequestException;
import com.assessmate.repository.OtpVerificationRepository;
import com.assessmate.repository.UserRepository;
import com.assessmate.security.JwtUtil;
import com.assessmate.security.LoginRateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceOtpUpsertTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OtpVerificationRepository otpRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private EmailService emailService;

    @Mock
    private LoginRateLimiterService loginRateLimiterService;

    @InjectMocks
    private AuthService authService;

    private final String testEmail = "23012011120@gnu.ac.in";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "otpExpiryMinutes", 10);
        ReflectionTestUtils.setField(authService, "maxAttempts", 5);
        ReflectionTestUtils.setField(authService, "resendCooldownSeconds", 60);

        lenient().when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "encoded_" + inv.getArgument(0));
    }

    @Test
    @DisplayName("Fix Issue 2: Password reset request updates existing record in-place without duplicate-key delete/insert race")
    void testRequestPasswordResetOtp_UpdatesExistingRecordInPlace() {
        User user = User.builder()
                .id(1L)
                .email(testEmail)
                .name("Student User")
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .build();
        when(userRepository.findByEmail(testEmail)).thenReturn(Optional.of(user));

        // Simulate an existing OtpVerification record in DB created 70 seconds ago (cooldown expired)
        OtpVerification existingOtp = OtpVerification.builder()
                .id(999L)
                .email(testEmail)
                .purpose(OtpPurpose.FORGOT_PASSWORD)
                .otpHash("old_hash_123456")
                .attempts(3)
                .createdAt(LocalDateTime.now().minusSeconds(70))
                .expiresAt(LocalDateTime.now().minusMinutes(5))
                .build();
        when(otpRepository.findByEmailAndPurpose(testEmail, OtpPurpose.FORGOT_PASSWORD))
                .thenReturn(Optional.of(existingOtp));

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail(testEmail);

        authService.requestPasswordResetOtp(req);

        // Verify delete was NOT executed (preventing duplicate key / ordering violations in Hibernate)
        verify(otpRepository, never()).deleteByEmailAndPurpose(anyString(), any());

        // Verify saveAndFlush was called on the same entity ID (in-place UPDATE)
        ArgumentCaptor<OtpVerification> captor = ArgumentCaptor.forClass(OtpVerification.class);
        verify(otpRepository).saveAndFlush(captor.capture());

        OtpVerification saved = captor.getValue();
        assertEquals(999L, saved.getId(), "Must preserve existing entity primary key for SQL UPDATE");
        assertEquals(testEmail, saved.getEmail());
        assertEquals(OtpPurpose.FORGOT_PASSWORD, saved.getPurpose());
        assertEquals(0, saved.getAttempts(), "Attempts counter must be reset to 0");
        assertNotEquals("old_hash_123456", saved.getOtpHash(), "Hash must be updated to new OTP");
        assertTrue(saved.getExpiresAt().isAfter(LocalDateTime.now()), "Expiry must be refreshed to the future");

        // Verify email was dispatched
        verify(emailService).sendPasswordResetOtp(eq(testEmail), anyString());
    }

    @Test
    @DisplayName("Password reset creates new record when none exists")
    void testRequestPasswordResetOtp_CreatesNewRecordWhenNoneExists() {
        User user = User.builder()
                .id(1L)
                .email(testEmail)
                .name("Student User")
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .build();
        when(userRepository.findByEmail(testEmail)).thenReturn(Optional.of(user));
        when(otpRepository.findByEmailAndPurpose(testEmail, OtpPurpose.FORGOT_PASSWORD))
                .thenReturn(Optional.empty());

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail(testEmail);

        authService.requestPasswordResetOtp(req);

        ArgumentCaptor<OtpVerification> captor = ArgumentCaptor.forClass(OtpVerification.class);
        verify(otpRepository).saveAndFlush(captor.capture());

        OtpVerification saved = captor.getValue();
        assertNull(saved.getId(), "New entity has null ID prior to persistence");
        assertEquals(testEmail, saved.getEmail());
        assertEquals(OtpPurpose.FORGOT_PASSWORD, saved.getPurpose());
        assertEquals(0, saved.getAttempts());
    }

    @Test
    @DisplayName("Registration request updates existing pending record in-place when user re-requests OTP")
    void testRequestRegisterOtp_UpdatesExistingRecordInPlace() {
        when(userRepository.existsByEmail(testEmail)).thenReturn(false);

        // Existing registration attempt 80 seconds ago
        OtpVerification existingOtp = OtpVerification.builder()
                .id(888L)
                .email(testEmail)
                .purpose(OtpPurpose.REGISTER)
                .otpHash("old_reg_hash")
                .attempts(4)
                .createdAt(LocalDateTime.now().minusSeconds(80))
                .expiresAt(LocalDateTime.now().minusMinutes(2))
                .pendingName("Old Name")
                .pendingRole(Role.CANDIDATE)
                .build();
        when(otpRepository.findByEmailAndPurpose(testEmail, OtpPurpose.REGISTER))
                .thenReturn(Optional.of(existingOtp));

        RegisterRequest req = new RegisterRequest();
        req.setEmail(testEmail);
        req.setName("Updated Candidate");
        req.setPassword("Password123!");
        req.setRole("CANDIDATE");

        authService.requestRegisterOtp(req);

        verify(otpRepository, never()).deleteByEmailAndPurpose(anyString(), any());

        ArgumentCaptor<OtpVerification> captor = ArgumentCaptor.forClass(OtpVerification.class);
        verify(otpRepository).saveAndFlush(captor.capture());

        OtpVerification saved = captor.getValue();
        assertEquals(888L, saved.getId());
        assertEquals(testEmail, saved.getEmail());
        assertEquals(OtpPurpose.REGISTER, saved.getPurpose());
        assertEquals(0, saved.getAttempts());
        assertEquals("Updated Candidate", saved.getPendingName());
        assertNotEquals("old_reg_hash", saved.getOtpHash());
        verify(emailService).sendRegistrationOtp(eq(testEmail), eq("Updated Candidate"), anyString());
    }

    @Test
    @DisplayName("OTP request respects resend cooldown window")
    void testRequestPasswordResetOtp_EnforcesCooldown() {
        User user = User.builder()
                .id(1L)
                .email(testEmail)
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .build();
        when(userRepository.findByEmail(testEmail)).thenReturn(Optional.of(user));

        // OTP requested only 15 seconds ago (cooldown is 60 seconds)
        OtpVerification recentOtp = OtpVerification.builder()
                .id(777L)
                .email(testEmail)
                .purpose(OtpPurpose.FORGOT_PASSWORD)
                .createdAt(LocalDateTime.now().minusSeconds(15))
                .expiresAt(LocalDateTime.now().plusMinutes(9))
                .build();
        when(otpRepository.findByEmailAndPurpose(testEmail, OtpPurpose.FORGOT_PASSWORD))
                .thenReturn(Optional.of(recentOtp));

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail(testEmail);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authService.requestPasswordResetOtp(req));
        assertTrue(ex.getMessage().contains("Please wait before requesting another verification code"));

        verify(otpRepository, never()).saveAndFlush(any());
        verify(emailService, never()).sendPasswordResetOtp(anyString(), anyString());
    }
}

