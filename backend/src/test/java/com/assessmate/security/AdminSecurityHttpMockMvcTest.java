package com.assessmate.security;

import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.repository.UserRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminSecurityHttpMockMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User adminUser;
    private User hostUser;
    private User candidateUser;
    private User deactivatedUser;
    private User deletedUser;

    private String adminToken;
    private String hostToken;
    private String candidateToken;
    private String deactivatedToken;
    private String deletedToken;

    @BeforeEach
    void setUp() {
        // Create Admin
        adminUser = userRepository.save(User.builder()
                .name("Super Admin")
                .email("http.admin@test.com")
                .password(passwordEncoder.encode("AdminPass123!"))
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .build());
        adminToken = jwtUtil.generateToken(adminUser.getEmail(), "ADMIN", 1L);
        adminUser.setActiveToken(adminToken);
        userRepository.save(adminUser);

        // Create Host
        hostUser = userRepository.save(User.builder()
                .name("Exam Host")
                .email("http.host@test.com")
                .password(passwordEncoder.encode("HostPass123!"))
                .role(Role.HOST)
                .status(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .build());
        hostToken = jwtUtil.generateToken(hostUser.getEmail(), "HOST", 1L);
        hostUser.setActiveToken(hostToken);
        userRepository.save(hostUser);

        // Create Candidate
        candidateUser = userRepository.save(User.builder()
                .name("Exam Candidate")
                .email("http.cand@test.com")
                .password(passwordEncoder.encode("CandPass123!"))
                .role(Role.CANDIDATE)
                .status(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .build());
        candidateToken = jwtUtil.generateToken(candidateUser.getEmail(), "CANDIDATE", 1L);
        candidateUser.setActiveToken(candidateToken);
        userRepository.save(candidateUser);

        // Create Deactivated User
        deactivatedUser = userRepository.save(User.builder()
                .name("Deactivated Host")
                .email("http.deact@test.com")
                .password(passwordEncoder.encode("DeactPass123!"))
                .role(Role.HOST)
                .status(AccountStatus.DEACTIVATED)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .build());
        deactivatedToken = jwtUtil.generateToken(deactivatedUser.getEmail(), "HOST", 1L);
        deactivatedUser.setActiveToken(deactivatedToken);
        userRepository.save(deactivatedUser);

        // Create Deleted User
        deletedUser = userRepository.save(User.builder()
                .name("Deleted Candidate")
                .email("deleted-999@deleted.invalid")
                .password(passwordEncoder.encode("DeletedPass123!"))
                .role(Role.CANDIDATE)
                .status(AccountStatus.DELETED)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .build());
        deletedToken = jwtUtil.generateToken(deletedUser.getEmail(), "CANDIDATE", 1L);
        deletedUser.setActiveToken(deletedToken);
        userRepository.save(deletedUser);
    }

    @Test
    @DisplayName("GET /api/admin/dashboard without token returns 401 Unauthorized")
    void testUnauthenticatedAdminEndpointReturns401() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/admin/dashboard with CANDIDATE role token returns 403 Forbidden")
    void testCandidateTokenOnAdminEndpointReturns403() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + candidateToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/admin/dashboard with HOST role token returns 403 Forbidden")
    void testHostTokenOnAdminEndpointReturns403() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + hostToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/admin/dashboard with ADMIN role token returns 200 OK")
    void testAdminTokenOnAdminEndpointReturns200() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").exists())
                .andExpect(jsonPath("$.totalAdmins").exists());
    }

    @Test
    @DisplayName("Authenticated request with DEACTIVATED user JWT returns 401 Unauthorized")
    void testDeactivatedUserJwtReturns401() throws Exception {
        mockMvc.perform(get("/api/auth/profile")
                        .header("Authorization", "Bearer " + deactivatedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Your account has been deactivated. Please contact support."));
    }

    @Test
    @DisplayName("Authenticated request with DELETED user JWT returns 401 Unauthorized")
    void testDeletedUserJwtReturns401() throws Exception {
        mockMvc.perform(get("/api/auth/profile")
                        .header("Authorization", "Bearer " + deletedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("User not found."));
    }

    @Test
    @DisplayName("Admin with mustChangePassword=true is blocked with 403 on admin endpoints")
    void testAdminMustChangePasswordRestrictedFromAdminEndpoints() throws Exception {
        adminUser.setMustChangePassword(true);
        userRepository.save(adminUser);

        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Password change required. You must change your temporary password before accessing administrative features."));
    }

    @Test
    @DisplayName("Admin with mustChangePassword=true is allowed to access /api/auth/change-password")
    void testAdminMustChangePasswordAllowedOnPasswordChange() throws Exception {
        adminUser.setMustChangePassword(true);
        userRepository.save(adminUser);

        String payload = """
            {
                "currentPassword": "AdminPass123!",
                "newPassword": "NewAdminSecretPassword456!"
            }
        """;

        mockMvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("DELETE /api/admin/users/{id} without authentication returns 401 Unauthorized")
    void testDeleteUserAnonymousReturns401() throws Exception {
        mockMvc.perform(delete("/api/admin/users/999"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("DELETE /api/admin/users/{id} with HOST token returns 403 Forbidden")
    void testDeleteUserWithHostTokenReturns403() throws Exception {
        mockMvc.perform(delete("/api/admin/users/999")
                        .header("Authorization", "Bearer " + hostToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE /api/admin/users/{id} with CANDIDATE token returns 403 Forbidden")
    void testDeleteUserWithCandidateTokenReturns403() throws Exception {
        mockMvc.perform(delete("/api/admin/users/999")
                        .header("Authorization", "Bearer " + candidateToken))
                .andExpect(status().isForbidden());
    }
}

