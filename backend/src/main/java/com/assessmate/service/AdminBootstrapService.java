package com.assessmate.service;

import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrapService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_BOOTSTRAP_ENABLED:false}")
    private boolean bootstrapEnabled;

    @Value("${ADMIN_BOOTSTRAP_EMAIL:}")
    private String bootstrapEmail;

    @Value("${ADMIN_BOOTSTRAP_PASSWORD:}")
    private String bootstrapPassword;

    @EventListener(ApplicationReadyEvent.class)
    @Order(2)
    public void bootstrapAdmin() {
        if (!bootstrapEnabled) {
            log.debug("Admin bootstrap is disabled.");
            return;
        }

        long adminCount = userRepository.countByRole(Role.ADMIN);
        if (adminCount > 0) {
            log.info("Admin bootstrap: Administrator account already exists. Skipping bootstrap.");
            return;
        }

        if (bootstrapEmail == null || !bootstrapEmail.contains("@") || bootstrapEmail.trim().length() < 5) {
            log.warn("Admin bootstrap: Invalid or missing ADMIN_BOOTSTRAP_EMAIL. Skipping bootstrap.");
            return;
        }

        if (bootstrapPassword == null || bootstrapPassword.length() < 12) {
            log.warn("Admin bootstrap: ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters. Skipping bootstrap.");
            return;
        }

        String normalizedEmail = bootstrapEmail.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(normalizedEmail)) {
            log.warn("Admin bootstrap: An account with bootstrap email already exists. Skipping bootstrap.");
            return;
        }

        User adminUser = User.builder()
                .name("System Administrator")
                .email(normalizedEmail)
                .password(passwordEncoder.encode(bootstrapPassword))
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .mustChangePassword(true)
                .tokenVersion(1L)
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(adminUser);
        log.info("Admin bootstrap: Initial administrator account successfully created. mustChangePassword is set to true.");
    }
}

