package com.assessmate.security;

import com.assessmate.dto.AdminDeleteRequest;
import com.assessmate.dto.AdminSetupPasswordRequest;
import com.assessmate.dto.CreateAdminRequest;
import com.assessmate.dto.UserStatusUpdateRequest;
import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.AdminInvitation;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.exception.BadRequestException;
import com.assessmate.repository.AdminInvitationRepository;
import com.assessmate.repository.UserRepository;
import com.assessmate.service.AdminService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminGovernanceSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AdminInvitationRepository invitationRepository;

    @Autowired
    private AdminService adminService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private User primaryAdmin;
    private User secondaryAdmin;
    private String primaryAdminToken;
    private String secondaryAdminToken;

    @BeforeEach
    void setUp() {
        userRepository.findByRole(Role.ADMIN).forEach(u -> {
            u.setStatus(AccountStatus.DEACTIVATED);
            userRepository.save(u);
        });

        primaryAdmin = userRepository.save(User.builder()
                .name("Primary Admin")
                .email("primary.admin@test.com")
                .password(passwordEncoder.encode("MasterPassword123!"))
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .build());
        primaryAdminToken = jwtUtil.generateToken(primaryAdmin.getEmail(), primaryAdmin.getRole().name(), 1L);

        secondaryAdmin = userRepository.save(User.builder()
                .name("Secondary Admin")
                .email("secondary.admin@test.com")
                .password(passwordEncoder.encode("SecondaryPassword123!"))
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .build());
        secondaryAdminToken = jwtUtil.generateToken(secondaryAdmin.getEmail(), secondaryAdmin.getRole().name(), 1L);
    }

    @Test
    @DisplayName("Provision Admin creates account in PENDING_INVITATION status with single-use token")
    void testProvisionAdminFlow() throws Exception {
        CreateAdminRequest req = new CreateAdminRequest();
        req.setName("Invited Admin");
        req.setEmail("invited.admin@test.com");

        mockMvc.perform(post("/api/admin/admins")
                        .header("Authorization", "Bearer " + primaryAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitationSent").value(true))
                .andExpect(jsonPath("$.email").value("invited.admin@test.com"));

        User invited = userRepository.findByEmail("invited.admin@test.com").orElse(null);
        assertNotNull(invited);
        assertEquals(AccountStatus.PENDING_INVITATION, invited.getStatus());

        AdminInvitation inv = invitationRepository.findTopByEmailOrderByCreatedAtDesc("invited.admin@test.com").orElse(null);
        assertNotNull(inv);
        assertFalse(inv.isExpired());
        assertFalse(inv.isUsed());
    }

    @Test
    @DisplayName("Pending Admin cannot access protected Admin APIs")
    void testPendingAdminCannotAccessProtectedApis() throws Exception {
        User pending = userRepository.save(User.builder()
                .name("Pending Admin")
                .email("pending.admin@test.com")
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.ADMIN)
                .status(AccountStatus.PENDING_INVITATION)
                .tokenVersion(1L)
                .build());
        String token = jwtUtil.generateToken(pending.getEmail(), "ADMIN", 1L);

        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Password setup with valid invitation token activates account and consumes token")
    void testPasswordSetupFlow() throws Exception {
        String rawToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String tokenHash = AdminService.hashToken(rawToken);

        User pending = userRepository.save(User.builder()
                .name("Alice Candidate")
                .email("alice.invite@test.com")
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.ADMIN)
                .status(AccountStatus.PENDING_INVITATION)
                .tokenVersion(1L)
                .build());

        invitationRepository.save(AdminInvitation.builder()
                .email(pending.getEmail())
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .createdAt(LocalDateTime.now())
                .createdBy(primaryAdmin.getEmail())
                .build());

        // Validate token
        mockMvc.perform(get("/api/auth/admin/invitation/validate")
                        .param("token", rawToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.email").value("alice.invite@test.com"));

        // Setup password
        AdminSetupPasswordRequest setupReq = new AdminSetupPasswordRequest();
        setupReq.setToken(rawToken);
        setupReq.setNewPassword("SecureNewAdminPassword123!");

        mockMvc.perform(post("/api/auth/admin/setup-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(setupReq)))
                .andExpect(status().isOk());

        User activated = userRepository.findByEmail("alice.invite@test.com").orElse(null);
        assertNotNull(activated);
        assertEquals(AccountStatus.ACTIVE, activated.getStatus());
        assertTrue(passwordEncoder.matches("SecureNewAdminPassword123!", activated.getPassword()));

        // Second attempt with same consumed token must fail
        mockMvc.perform(post("/api/auth/admin/setup-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(setupReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Admin can delete another Admin with valid password confirmation")
    void testDeleteAnotherAdmin() throws Exception {
        AdminDeleteRequest req = new AdminDeleteRequest();
        req.setCurrentPassword("MasterPassword123!");

        mockMvc.perform(delete("/api/admin/admins/" + secondaryAdmin.getId())
                        .header("Authorization", "Bearer " + primaryAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        User deleted = userRepository.findById(secondaryAdmin.getId()).orElse(null);
        assertNotNull(deleted);
        assertEquals(AccountStatus.DELETED, deleted.getStatus());
    }

    @Test
    @DisplayName("Admin deletion fails when current password confirmation is incorrect")
    void testDeleteAdminWrongPasswordFails() throws Exception {
        AdminDeleteRequest req = new AdminDeleteRequest();
        req.setCurrentPassword("WrongPassword!");

        mockMvc.perform(delete("/api/admin/admins/" + secondaryAdmin.getId())
                        .header("Authorization", "Bearer " + primaryAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Admin cannot delete themselves")
    void testAdminCannotDeleteSelf() throws Exception {
        AdminDeleteRequest req = new AdminDeleteRequest();
        req.setCurrentPassword("MasterPassword123!");

        mockMvc.perform(delete("/api/admin/admins/" + primaryAdmin.getId())
                        .header("Authorization", "Bearer " + primaryAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Cannot delete or deactivate the last active administrator")
    void testCannotDeleteLastActiveAdmin() throws Exception {
        User thirdAdmin = userRepository.save(User.builder()
                .name("Third Admin")
                .email("third.admin@test.com")
                .password(passwordEncoder.encode("ThirdPassword123!"))
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .tokenVersion(1L)
                .build());

        // Deactivate secondaryAdmin using primaryAdminToken
        UserStatusUpdateRequest updateReq = new UserStatusUpdateRequest();
        updateReq.setStatus(AccountStatus.DEACTIVATED);

        mockMvc.perform(patch("/api/admin/users/" + secondaryAdmin.getId() + "/status")
                        .header("Authorization", "Bearer " + primaryAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk());

        // Deactivate thirdAdmin
        mockMvc.perform(patch("/api/admin/users/" + thirdAdmin.getId() + "/status")
                        .header("Authorization", "Bearer " + primaryAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk());

        // Now only primaryAdmin is active. Service check: deleting primaryAdmin must throw BadRequestException
        AdminDeleteRequest delReq = new AdminDeleteRequest();
        delReq.setCurrentPassword("ThirdPassword123!");

        assertThrows(BadRequestException.class, () ->
                adminService.deleteAdmin(primaryAdmin.getId(), delReq, thirdAdmin.getEmail(), "127.0.0.1")
        );
    }

    @Test
    @DisplayName("Admin security status endpoint returns admin count and warnings")
    void testAdminSecurityStatus() throws Exception {
        mockMvc.perform(get("/api/admin/security-status")
                        .header("Authorization", "Bearer " + primaryAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalActiveAdmins").isNumber());
    }
}
