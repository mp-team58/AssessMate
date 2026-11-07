package com.assessmate.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public health check endpoint for monitoring, uptime verification,
 * and deployment readiness checks (Render, external ping services, etc.).
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    private final Instant startedAt = Instant.now();

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("service", "AssessMate Backend API");
        health.put("timestamp", Instant.now().toString());
        health.put("startedAt", startedAt.toString());
        health.put("environment", "production");
        return ResponseEntity.ok(health);
    }
}

