package com.assessmate.controller;

import com.assessmate.dto.ExamResultsSummary;
import com.assessmate.dto.HostCandidateReport;
import com.assessmate.dto.LiveMonitor;
import com.assessmate.service.HostResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/results")
@RequiredArgsConstructor
public class HostResultController {

    private final HostResultService hostResultService;

    @GetMapping("/exam/{examId}")
    public ResponseEntity<ExamResultsSummary> getExamResults(
            @PathVariable Long examId, Principal principal) {
        return ResponseEntity.ok(hostResultService.getExamResults(examId, principal.getName()));
    }

    @GetMapping("/exam/{examId}/candidate/{enrollmentId}")
    public ResponseEntity<HostCandidateReport> getCandidateReport(
            @PathVariable Long examId, @PathVariable Long enrollmentId, Principal principal) {
        return ResponseEntity.ok(
                hostResultService.getCandidateReport(examId, enrollmentId, principal.getName()));
    }
    @GetMapping("/exam/{examId}/live")
    public ResponseEntity<LiveMonitor> getLiveMonitor(
            @PathVariable Long examId, Principal principal) {
        return ResponseEntity.ok(hostResultService.getLiveMonitor(examId, principal.getName()));
    }
}
