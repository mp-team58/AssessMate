package com.assessmate.controller;

import com.assessmate.entity.Developer;
import com.assessmate.repository.DeveloperRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HealthControllerTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private DeveloperRepository developerRepository;

    @InjectMocks
    private HealthController healthController;

    @Test
    @DisplayName("Health endpoint returns 200 and UP status when database is reachable")
    void testHealthSuccess() {
        when(jdbcTemplate.queryForObject(eq("SELECT 1"), eq(Integer.class))).thenReturn(1);

        ResponseEntity<Map<String, Object>> response = healthController.getHealth();

        assertNotNull(response.getBody());
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("UP", response.getBody().get("database"));
        assertEquals("AssessMate Backend API", response.getBody().get("service"));
    }

    @Test
    @DisplayName("Health endpoint returns 503 and DOWN status without leaking details when database fails")
    void testHealthDatabaseFailure() {
        when(jdbcTemplate.queryForObject(eq("SELECT 1"), eq(Integer.class)))
                .thenThrow(new DataAccessException("Connection to Supabase timed out") {});

        ResponseEntity<Map<String, Object>> response = healthController.getHealth();

        assertNotNull(response.getBody());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("DOWN", response.getBody().get("status"));
        assertEquals("DOWN", response.getBody().get("database"));
        assertEquals("AssessMate Backend API", response.getBody().get("service"));
        // Ensure no exception or credential leak in payload
        org.junit.jupiter.api.Assertions.assertFalse(response.getBody().containsKey("error"));
        org.junit.jupiter.api.Assertions.assertFalse(response.getBody().containsKey("exception"));
        org.junit.jupiter.api.Assertions.assertFalse(response.getBody().containsKey("message"));
    }

    @Test
    @DisplayName("Developer endpoint returns developer details without requiring login")
    void testGetDeveloper() {
        Developer developer = Developer.builder()
                .id(1L)
                .name("Mitkumar Thakkar")
                .email("meetthakkar9094@gmail.com")
                .phone("9313797763")
                .build();

        when(developerRepository.findByEmail("meetthakkar9094@gmail.com"))
                .thenReturn(Optional.of(developer));

        ResponseEntity<?> response = healthController.getDeveloper();

        assertNotNull(response.getBody());
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Developer body = (Developer) response.getBody();
        assertEquals("Mitkumar Thakkar", body.getName());
        assertEquals("meetthakkar9094@gmail.com", body.getEmail());
        assertEquals("9313797763", body.getPhone());
    }
}
