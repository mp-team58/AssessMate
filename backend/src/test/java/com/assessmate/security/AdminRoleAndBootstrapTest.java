package com.assessmate.security;

import com.assessmate.dto.LoginRequest;
import com.assessmate.dto.RegisterRequest;
import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.exception.BadRequestException;
import com.assessmate.repository.OtpVerificationRepository;
import com.assessmate.repository.UserRepository;
import com.assessmate.service.AdminBootstrapService;
import com.assessmate.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminRoleAndBootstrapTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OtpVerificationRepository otpRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private LoginRateLimiterService loginRateLimiterService;

    @InjectMocks
    private AuthService authService;

    @InjectMocks
    private AdminBootstrapService adminBootstrapService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "otpExpiryMinutes", 10);
        ReflectionTestUtils.setField(authService, "maxAttempts", 5);
        ReflectionTestUtils.setField(authService, "resendCooldownSeconds", 60);
    }

    @Test
    @DisplayName("Public registration rejects ADMIN role")
    void testRegistrationRejectsAdminRole() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Malicious Admin");
        req.setEmail("fakeadmin@assessmate.com");
        req.setPassword("Password123!");
        req.setRole("ADMIN");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.requestRegisterOtp(req));
        assertTrue(ex.getMessage().contains("Registration is only permitted for HOST or CANDIDATE"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Login with portal=ADMIN rejects non-admin users without issuing token")
    void testAdminPortalRejectsCandidate() {
        User candidate = User.builder()
                .id(1L)
                .name("Candidate User")
                .email("candidate@test.com")
                .password("encoded_pass")
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .build();

        when(userRepository.findByEmail("candidate@test.com")).thenReturn(Optional.of(candidate));

        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("candidate@test.com");
        loginReq.setPassword("Password123!");
        loginReq.setPortal("ADMIN");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(loginReq, "127.0.0.1"));
        assertEquals("Invalid email or password", ex.getMessage());
        verify(jwtUtil, never()).generateToken(anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Login rejects DEACTIVATED accounts with explicit message")
    void testLoginRejectsDeactivatedAccount() {
        User deactivated = User.builder()
                .id(2L)
                .name("Deactivated User")
                .email("deact@test.com")
                .password("encoded_pass")
                .role(Role.HOST)
                .status(AccountStatus.DEACTIVATED)
                .build();

        when(userRepository.findByEmail("deact@test.com")).thenReturn(Optional.of(deactivated));

        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("deact@test.com");
        loginReq.setPassword("Password123!");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(loginReq, "127.0.0.1"));
        assertEquals("Your account has been deactivated. Please contact support.", ex.getMessage());
        verify(jwtUtil, never()).generateToken(anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Admin bootstrap creates administrator when enabled and no admin exists")
    void testBootstrapCreatesAdmin() {
        ReflectionTestUtils.setField(adminBootstrapService, "bootstrapEnabled", true);
        ReflectionTestUtils.setField(adminBootstrapService, "bootstrapEmail", "admin@assessmate.com");
        ReflectionTestUtils.setField(adminBootstrapService, "bootstrapPassword", "AdminSecret123!");

        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);
        when(userRepository.existsByEmail("admin@assessmate.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_secret");

        adminBootstrapService.bootstrapAdmin();

        verify(userRepository).save(argThat(user ->
                user.getRole() == Role.ADMIN &&
                user.getStatus() == AccountStatus.ACTIVE &&
                Boolean.TRUE.equals(user.getMustChangePassword()) &&
                "admin@assessmate.com".equals(user.getEmail())
        ));
    }

    @Test
    @DisplayName("Admin bootstrap does nothing if an admin already exists")
    void testBootstrapSkipsWhenAdminExists() {
        ReflectionTestUtils.setField(adminBootstrapService, "bootstrapEnabled", true);
        ReflectionTestUtils.setField(adminBootstrapService, "bootstrapEmail", "admin@assessmate.com");
        ReflectionTestUtils.setField(adminBootstrapService, "bootstrapPassword", "AdminSecret123!");

        when(userRepository.countByRole(Role.ADMIN)).thenReturn(1L);

        adminBootstrapService.bootstrapAdmin();

        verify(userRepository, never()).save(any());
    }
}

