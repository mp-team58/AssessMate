package com.assessmate.controller;

import com.assessmate.entity.Developer;
import com.assessmate.repository.DeveloperRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public health check and developer information endpoints.
 * Publicly accessible without authentication.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final JdbcTemplate jdbcTemplate;
    private final DeveloperRepository developerRepository;
    private final Instant startedAt = Instant.now();

    @EventListener(ApplicationReadyEvent.class)
    public void initDeveloper() {
        try {
            if (developerRepository.findByEmail("meetthakkar9094@gmail.com").isEmpty()) {
                developerRepository.save(Developer.builder()
                        .name("Mitkumar Thakkar")
                        .email("meetthakkar9094@gmail.com")
                        .phone("9313797763")
                        .build());
                log.info("Developer details initialized in database.");
            }
        } catch (Exception e) {
            log.warn("Failed to initialize developer details: {}", e.getMessage());
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("service", "AssessMate Backend API");
        health.put("timestamp", Instant.now().toString());
        health.put("startedAt", startedAt.toString());
        health.put("environment", "production");

        boolean dbHealthy = checkDatabase();

        if (dbHealthy) {
            health.put("status", "UP");
            health.put("database", "UP");
            return ResponseEntity.ok(health);
        } else {
            health.put("status", "DOWN");
            health.put("database", "DOWN");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
        }
    }

    @GetMapping("/developer")
    public ResponseEntity<?> getDeveloper() {
        return developerRepository.findByEmail("meetthakkar9094@gmail.com")
                .or(() -> developerRepository.findAll().stream().findFirst())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(
                        developerRepository.save(Developer.builder()
                                .name("Mitkumar Thakkar")
                                .email("meetthakkar9094@gmail.com")
                                .phone("9313797763")
                                .build())
                ));
    }

    private boolean checkDatabase() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return result != null && result == 1;
        } catch (Exception e) {
            log.error("Database health check failed");
            return false;
        }
    }
}
