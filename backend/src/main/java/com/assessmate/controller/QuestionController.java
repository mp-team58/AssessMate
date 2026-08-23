package com.assessmate.controller;

import com.assessmate.dto.*;
import com.assessmate.service.QuestionService;
import lombok.RequiredArgsConstructor;
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
public class QuestionController {

    private final QuestionService questionService;

    // ── GLOBAL BANK ──────────────────────────

    @PostMapping(value = "/bank/add",
            consumes = "multipart/form-data")
    public ResponseEntity<QuestionResponse>
    addToBank(
            @RequestPart("data")
            QuestionRequest req,
            @RequestPart(value = "image",
                    required = false)
            MultipartFile image,
            Principal principal)
            throws IOException {
        return ResponseEntity.ok(
                questionService.addToBank(
                        req, image,
                        principal.getName()));
    }

    @PostMapping("/bank")
    public ResponseEntity<List<QuestionResponse>>
    getGlobalBank(
            @RequestBody(required = false)
            QuestionBankFilterRequest filter,
            Principal principal) {
        return ResponseEntity.ok(
                questionService.getGlobalBank(
                        principal.getName(), filter));
    }

    @PostMapping("/bank/add-to-exam")
    public ResponseEntity<List<QuestionResponse>>
    addFromBank(
            @RequestBody
            AddFromBankRequest req,
            Principal principal) {
        return ResponseEntity.ok(
                questionService.addFromBank(
                        req, principal.getName()));
    }

    // ── EXAM QUESTIONS ───────────────────────

    @PostMapping(value = "/manual",
            consumes = "multipart/form-data")
    public ResponseEntity<QuestionResponse>
    addManually(
            @RequestPart("data")
            QuestionRequest req,
            @RequestPart(value = "image",
                    required = false)
            MultipartFile image,
            Principal principal)
            throws IOException {

        return ResponseEntity.ok(
                questionService.addManually(
                        req,
                        image,
                        principal.getName()));
    }

    @GetMapping("/exam/{examId}")
    public ResponseEntity<List<QuestionResponse>>
    getByExam(
            @PathVariable Long examId,
            Principal principal) {
        return ResponseEntity.ok(
                questionService.getByExamId(
                        examId, principal.getName()));
    }

    @GetMapping("/exam/{examId}/stats")
    public ResponseEntity<QuestionStatsResponse>
    getStats(
            @PathVariable Long examId,
            Principal principal) {
        return ResponseEntity.ok(
                questionService.getStats(
                        examId, principal.getName()));
    }

    @PutMapping(value = "/{id}",
            consumes = "multipart/form-data")
    public ResponseEntity<QuestionResponse> edit(
            @PathVariable Long id,
            @RequestPart("data")
            QuestionRequest req,
            @RequestPart(value = "image",
                    required = false)
            MultipartFile image,
            Principal principal)
            throws IOException {
        return ResponseEntity.ok(
                questionService.editQuestion(
                        id, req, image,
                        principal.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>>
    delete(
            @PathVariable Long id,
            Principal principal) {
        questionService.deleteQuestion(
                id, principal.getName());
        return ResponseEntity.ok(
                Map.of("message",
                        "Question deleted successfully"));
    }
}