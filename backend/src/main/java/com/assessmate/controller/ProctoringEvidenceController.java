package com.assessmate.controller;

import com.assessmate.service.ProctoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.security.Principal;

@RestController
@RequiredArgsConstructor
public class ProctoringEvidenceController {

    private final ProctoringService proctoringService;
    private final com.assessmate.security.JwtUtil jwtUtil;

    @org.springframework.web.bind.annotation.GetMapping("/api/proctoring/token")
    public ResponseEntity<java.util.Map<String, String>> getMediaToken(
            @org.springframework.web.bind.annotation.RequestParam String file,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        if (file == null || file.contains("..") || file.contains("/") || file.contains("\\")) {
            throw new com.assessmate.exception.BadRequestException("Invalid filename");
        }
        String mediaToken = jwtUtil.generateMediaToken(principal.getName(), file, 120);
        return ResponseEntity.ok(java.util.Map.of("mediaToken", mediaToken, "expiresIn", "120s"));
    }

    @GetMapping({"/uploads/proctoring/{type}/{filename}", "/api/proctoring/evidence/{type}/{filename}"})
    public ResponseEntity<Resource> getEvidence(
            @PathVariable String type,
            @PathVariable String filename,
            Principal principal
    ) throws IOException {
        if (principal == null || principal.getName() == null) {
            return ResponseEntity.status(401).build();
        }

        Resource resource = proctoringService.loadEvidenceFile(type, filename, principal.getName());
        String contentType = determineContentType(filename);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    private String determineContentType(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "application/octet-stream";
        }
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        return switch (ext) {
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "jpg", "jpeg" -> "image/jpeg";
            case "wav" -> "audio/wav";
            case "ogg" -> "audio/ogg";
            case "webm" -> "audio/webm";
            case "mp4" -> "audio/mp4";
            default -> "application/octet-stream";
        };
    }
}
