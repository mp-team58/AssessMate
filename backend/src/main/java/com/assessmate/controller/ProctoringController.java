package com.assessmate.controller;

import com.assessmate.dto.ProctoringDashboard;
import com.assessmate.dto.ProctoringEvent;
import com.assessmate.service.ProctoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/proctoring")
@RequiredArgsConstructor
public class ProctoringController {

    private final ProctoringService proctoringService;

    @GetMapping("/exam/{examId}")
    public ResponseEntity<ProctoringDashboard> getDashboard(
            @PathVariable Long examId, Principal principal) {
        return ResponseEntity.ok(proctoringService.getDashboard(examId, principal.getName()));
    }

    @GetMapping("/exam/{examId}/candidate/{enrollmentId}")
    public ResponseEntity<List<ProctoringEvent>> getCandidateTimeline(
            @PathVariable Long examId, @PathVariable Long enrollmentId, Principal principal) {
        return ResponseEntity.ok(
                proctoringService.getCandidateTimeline(examId, enrollmentId, principal.getName()));
    }
}
