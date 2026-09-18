package com.assessmate.controller;

import org.springframework.web.bind.annotation.CrossOrigin;

import com.assessmate.dto.*;
import com.assessmate.service.CodingQuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/coding")
@RequiredArgsConstructor

public class CodingQuestionController {

    private final CodingQuestionService codingQuestionService;

    // ── 1. GLOBAL CODING BANK ─────────────────────────

    // Get host's global coding bank
    @GetMapping("/bank")
    public ResponseEntity<List<CodingQuestionResponse>> getGlobalBank(
            Principal principal) {
        return ResponseEntity.ok(
                codingQuestionService.getGlobalBank(principal.getName()));
    }

    // Add problem directly to global bank
    @PostMapping("/bank")
    public ResponseEntity<CodingQuestionResponse> addToBank(
            @RequestBody CodingQuestionRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                codingQuestionService.addToBank(req, principal.getName()));
    }

    // ── 2. INDIVIDUAL PROBLEM OPERATIONS ──────────────

    // Edit a coding problem by ID
    @PutMapping("/{id}")
    public ResponseEntity<CodingQuestionResponse> editQuestion(
            @PathVariable Long id,
            @RequestBody CodingQuestionRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                codingQuestionService.editQuestion(id, req, principal.getName()));
    }

    // Delete a coding problem by ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteQuestion(
            @PathVariable Long id,
            Principal principal) {
        codingQuestionService.deleteQuestion(id, principal.getName());
        return ResponseEntity.ok(
                Map.of("message", "Coding question deleted successfully"));
    }

    // ── 3. CODE EXECUTION & SUBMISSION ────────────────

    // Candidate run code (sample test case execution)
    @PostMapping("/run")
    public ResponseEntity<RunCodeResponse> runCode(
            @RequestBody RunCodeRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                codingQuestionService.runCode(req, principal.getName()));
    }

    // Candidate submit code (all test cases & grading)
    @PostMapping("/submit")
    public ResponseEntity<CodeSubmissionResponse> submitCode(
            @RequestBody CodeSubmissionRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                codingQuestionService.submitCode(req, principal.getName()));
    }
}
