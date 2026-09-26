package com.assessmate.controller;

import com.assessmate.dto.HostAnalyticsDashboard;
import com.assessmate.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<HostAnalyticsDashboard> getDashboard(Principal principal) {
        return ResponseEntity.ok(analyticsService.getDashboard(principal.getName()));
    }
}
