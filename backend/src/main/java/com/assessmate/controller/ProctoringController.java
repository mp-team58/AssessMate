package com.assessmate.controller;

import com.assessmate.dto.ProctoringDashboard;
import com.assessmate.dto.ProctoringEventDTO;
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
    public ResponseEntity<List<ProctoringEventDTO>> getCandidateTimeline(
            @PathVariable Long examId, @PathVariable Long enrollmentId, Principal principal) {
        return ResponseEntity.ok(
                proctoringService.getCandidateTimeline(examId, enrollmentId, principal.getName()));
    }

    @GetMapping("/evidence/{type}/{filename}")
    public ResponseEntity<org.springframework.core.io.Resource> getEvidence(
            @PathVariable String type, @PathVariable String filename, Principal principal) throws java.io.IOException {
        org.springframework.core.io.Resource resource = proctoringService.loadEvidenceFile(type, filename, principal.getName());
        String contentType = switch (filename.substring(filename.lastIndexOf('.') + 1)) {
            case "png" -> "image/png"; case "webp" -> "image/webp"; case "jpg", "jpeg" -> "image/jpeg";
            case "wav" -> "audio/wav"; case "ogg" -> "audio/ogg"; case "webm" -> "audio/webm"; default -> "application/octet-stream";
        };
        return ResponseEntity.ok().contentType(org.springframework.http.MediaType.parseMediaType(contentType)).body(resource);
    }
}
