package com.assessmate.controller;

import com.assessmate.dto.*;
import com.assessmate.service.AIQuestionService;
import com.assessmate.service.ExcelService;
import com.assessmate.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/exams/{examId}/questions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ExamQuestionController {

    private final QuestionService questionService;
    private final AIQuestionService aiQuestionService;
    private final ExcelService excelService;

    // ── 1. LIST & STATS ──────────────────────

    // Get all questions in exam
    @GetMapping
    public ResponseEntity<List<QuestionResponse>> getByExam(
            @PathVariable Long examId,
            Principal principal) {
        return ResponseEntity.ok(
                questionService.getByExamId(examId, principal.getName()));
    }

    // Get exam question statistics & publish readiness
    @GetMapping("/stats")
    public ResponseEntity<QuestionStatsResponse> getStats(
            @PathVariable Long examId,
            Principal principal) {
        return ResponseEntity.ok(
                questionService.getStats(examId, principal.getName()));
    }

    // ── 2. ADD QUESTIONS TO EXAM ─────────────

    // Add manual question directly to exam
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QuestionResponse> addManually(
            @PathVariable Long examId,
            @RequestPart("data") QuestionRequest req,
            @RequestPart(value = "image", required = false) MultipartFile image,
            Principal principal) throws IOException {
        req.setExamId(examId);
        return ResponseEntity.ok(
                questionService.addManually(req, image, principal.getName()));
    }

    // Add questions from global question bank to exam
    @PostMapping("/from-bank")
    public ResponseEntity<List<QuestionResponse>> addFromBank(
            @PathVariable Long examId,
            @RequestBody AddFromBankRequest req,
            Principal principal) {
        req.setExamId(examId);
        return ResponseEntity.ok(
                questionService.addFromBank(req, principal.getName()));
    }

    // Upload questions to exam via Excel
    @PostMapping(value = "/excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelUploadResponse> uploadExcel(
            @PathVariable Long examId,
            @RequestParam("file") MultipartFile file,
            Principal principal) throws IOException {
        return ResponseEntity.ok(
                excelService.processExcel(examId, file, principal.getName()));
    }

    // ── 3. AI QUESTION GENERATION ────────────

    // AI generate questions from topic
    @PostMapping("/ai/topic")
    public ResponseEntity<AIGenerationResponse> generateFromTopic(
            @PathVariable Long examId,
            @RequestBody AIGenerationRequest req,
            Principal principal) {
        req.setExamId(examId);
        return ResponseEntity.ok(
                aiQuestionService.generateFromTopic(req, principal.getName()));
    }

    // AI generate questions from pasted text
    @PostMapping("/ai/text")
    public ResponseEntity<AIGenerationResponse> generateFromText(
            @PathVariable Long examId,
            @RequestBody AIGenerationRequest req,
            Principal principal) {
        req.setExamId(examId);
        return ResponseEntity.ok(
                aiQuestionService.generateFromText(req, principal.getName()));
    }

    // AI generate questions from uploaded file (PDF / DOCX / TXT / Images)
    @PostMapping(value = "/ai/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AIGenerationResponse> generateFromFile(
            @PathVariable Long examId,
            @RequestPart("data") AIFileRequest req,
            @RequestPart("file") MultipartFile file,
            Principal principal) throws IOException {
        req.setExamId(examId);
        return ResponseEntity.ok(
                aiQuestionService.generateFromFile(req, file, principal.getName()));
    }
}
