package com.assessmate.controller;

import com.assessmate.dto.*;
import com.assessmate.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class QuestionController {

    private final QuestionService questionService;

    // ── GLOBAL QUESTION BANK ─────────────────

    // Search/filter global question bank (via query parameters: ?topic=&difficulty=&type=&search=)
    @GetMapping("/bank")
    public ResponseEntity<List<QuestionResponse>> getGlobalBank(
            @ModelAttribute QuestionBankFilterRequest filter,
            Principal principal) {
        return ResponseEntity.ok(
                questionService.getGlobalBank(
                        principal.getName(), filter));
    }

    // Add question directly to global question bank
    @PostMapping(value = "/bank", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QuestionResponse> addToBank(
            @RequestPart("data") QuestionRequest req,
            @RequestPart(value = "image", required = false) MultipartFile image,
            Principal principal) throws IOException {
        return ResponseEntity.ok(
                questionService.addToBank(
                        req, image,
                        principal.getName()));
    }

    // ── INDIVIDUAL QUESTION OPERATIONS ───────

    // Edit a question by ID
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QuestionResponse> edit(
            @PathVariable Long id,
            @RequestPart("data") QuestionRequest req,
            @RequestPart(value = "image", required = false) MultipartFile image,
            Principal principal) throws IOException {
        return ResponseEntity.ok(
                questionService.editQuestion(
                        id, req, image,
                        principal.getName()));
    }

    // Delete a question by ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id,
            Principal principal) {
        questionService.deleteQuestion(
                id, principal.getName());
        return ResponseEntity.ok(
                Map.of("message",
                        "Question deleted successfully"));
    }

    // Mark a question as verified by host
    @PatchMapping("/{id}/verify")
    public ResponseEntity<QuestionResponse> markAsVerified(
            @PathVariable Long id,
            Principal principal) {
        return ResponseEntity.ok(
            questionService.markAsVerified(
                id, principal.getName()));
    }
}