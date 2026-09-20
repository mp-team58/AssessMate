package com.assessmate.controller;

import com.assessmate.dto.ExamRequest;
import com.assessmate.dto.ExamResponse;
import com.assessmate.service.ExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    @PostMapping
    public ResponseEntity<ExamResponse> createExam(@Valid @RequestBody ExamRequest req, Principal principal) {
        return ResponseEntity.ok(examService.createExam(req, principal.getName()));
    }

    @GetMapping
    public ResponseEntity<List<ExamResponse>> getMyExams(Principal principal) {
        return ResponseEntity.ok(examService.getMyExams(principal.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExamResponse> getExamById(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(examService.getExamById(id, principal.getName()));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ExamResponse> publishExam(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(examService.publishExam(id, principal.getName()));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<ExamResponse> endExam(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(examService.endExam(id, principal.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteExam(@PathVariable Long id, Principal principal) {
        examService.deleteExam(id, principal.getName());
        return ResponseEntity.ok(Map.of("message", "Exam deleted successfully"));
    }
}
