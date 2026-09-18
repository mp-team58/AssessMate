package com.assessmate.controller;

import org.springframework.web.bind.annotation.CrossOrigin;

import com.assessmate.dto.AddFromBankRequest;
import com.assessmate.dto.CodingQuestionRequest;
import com.assessmate.dto.CodingQuestionResponse;
import com.assessmate.dto.AICodingGenerationRequest;
import com.assessmate.dto.AICodingGenerationResponse;
import com.assessmate.service.CodingQuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Collections;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/exams/{examId}/coding")
@RequiredArgsConstructor

public class ExamCodingQuestionController {

    private final CodingQuestionService codingQuestionService;

    // ── 1. LIST CODING QUESTIONS IN EXAM ──────────────

    // Get all coding problems in exam pool (host view)
    @GetMapping
    public ResponseEntity<List<CodingQuestionResponse>> getExamPool(
            @PathVariable Long examId,
            Principal principal) {
        return ResponseEntity.ok(
                codingQuestionService.getExamPool(examId, principal.getName()));
    }

    // ── 2. ADD CODING QUESTIONS TO EXAM ───────────────

    // Add coding question directly to exam pool
    @PostMapping
    public ResponseEntity<CodingQuestionResponse> addToExam(
            @PathVariable Long examId,
            @RequestBody CodingQuestionRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                codingQuestionService.addToExam(examId, req, principal.getName()));
    }

    // Add coding questions from global coding bank to exam
    @PostMapping("/from-bank")
    public ResponseEntity<List<CodingQuestionResponse>> addFromBank(
            @PathVariable Long examId,
            @RequestBody AddFromBankRequest req,
            Principal principal) {
        req.setExamId(examId);
        List<Long> questionIds = req.getQuestionIds() != null
                ? req.getQuestionIds() : Collections.emptyList();
        return ResponseEntity.ok(
                codingQuestionService.addFromBank(examId, questionIds, principal.getName()));
    }

    // ── 3. CANDIDATE ASSIGNED PROBLEMS ────────────────

    // Get assigned coding problems for candidate (shuffled, masked test cases)
    @GetMapping("/candidate")
    public ResponseEntity<List<CodingQuestionResponse>> getAssignedProblems(
            @PathVariable Long examId,
            Principal principal) {
        return ResponseEntity.ok(
                codingQuestionService.getAssignedProblems(examId, principal.getName()));
    }

    // ── 4. AI GENERATION ──────────────────────────────

    // POST generate coding problem with AI
    // topic or description — auto detected
    @PostMapping("/generate")
    public ResponseEntity<AICodingGenerationResponse> generateCodingProblem(
            @PathVariable Long examId,
            @RequestBody AICodingGenerationRequest req,
            Principal principal) {
        return ResponseEntity.ok(
            codingQuestionService.generateCodingProblem(
                examId, req, principal.getName()));
    }
}
