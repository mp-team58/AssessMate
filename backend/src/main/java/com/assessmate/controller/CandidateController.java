package com.assessmate.controller;


import com.assessmate.dto.JoinExamResponse;
import com.assessmate.service.CandidateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

import java.security.Principal;
import java.util.Map;


@RestController
@RequestMapping("/api/candidate")
@RequiredArgsConstructor

public class CandidateController {

    private final CandidateService candidateService;
    private final com.assessmate.service.ProctoringService proctoringService;

    @PostMapping("/join/{code}")
    public ResponseEntity<JoinExamResponse> joinExam(
            @PathVariable String code,
            @RequestHeader(value = "User-Agent", defaultValue = "") String userAgent,
            Principal principal) {
        return ResponseEntity.ok(candidateService.joinExam(code, principal.getName(), userAgent));
    }

    @GetMapping("/exam/{enrollmentId}/questions")
    public ResponseEntity<com.assessmate.dto.CandidateExamQuestionsResponse> getExamQuestions(
            @PathVariable Long enrollmentId,
            Principal principal) {
        return ResponseEntity.ok(candidateService.getExamQuestions(enrollmentId, principal.getName()));
    }

    @PostMapping("/proctor/log")
    public ResponseEntity<Void> logProctorEvent(
            @RequestBody com.assessmate.dto.ProctorEventRequest request,
            Principal principal) {
        candidateService.logProctorEvent(request, principal.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/proctor/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadEvidence(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type, // "image" or "audio"
            Principal principal) {
        String url = proctoringService.saveEvidence(file, type);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/submit/{enrollmentId}")
    public ResponseEntity<Void> submitExam(
            @PathVariable Long enrollmentId,
            @RequestBody com.assessmate.dto.SubmitExamRequest request,
            Principal principal) {
        candidateService.submitExam(enrollmentId, request, principal.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/result/{enrollmentId}")
    public ResponseEntity<com.assessmate.dto.ResultResponseDTO> getExamResult(
            @PathVariable Long enrollmentId,
            Principal principal) {
        return ResponseEntity.ok(candidateService.getExamResult(enrollmentId, principal.getName()));
    }

    @GetMapping("/result/{enrollmentId}/answers")
    public ResponseEntity<java.util.List<com.assessmate.dto.CandidateAnswerReviewDTO>> getAnswerReview(
            @PathVariable Long enrollmentId,
            Principal principal) {
        return ResponseEntity.ok(candidateService.getAnswerReview(enrollmentId, principal.getName()));
    }

    @PostMapping("/exam/{enrollmentId}/progress")
    public ResponseEntity<Void> saveProgress(
            @PathVariable Long enrollmentId,
            @RequestBody com.assessmate.dto.SubmitExamRequest request,
            Principal principal) {
        candidateService.saveProgress(enrollmentId, request, principal.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/exam/{enrollmentId}/state")
    public ResponseEntity<java.util.Map<String, Object>> getExamState(
            @PathVariable Long enrollmentId,
            Principal principal) {
        return ResponseEntity.ok(candidateService.getExamState(enrollmentId, principal.getName()));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<java.util.Map<String, Object>> getDashboard(Principal principal) {
        return ResponseEntity.ok(candidateService.getDashboard(principal.getName()));
    }

    @GetMapping("/history")
    public ResponseEntity<org.springframework.data.domain.Page<com.assessmate.dto.CandidateHistoryDTO>> getCandidateHistory(
            @org.springframework.data.web.PageableDefault(size = 10, sort = "joinedAt", direction = org.springframework.data.domain.Sort.Direction.DESC) org.springframework.data.domain.Pageable pageable,
            Principal principal) {
        return ResponseEntity.ok(candidateService.getCandidateHistory(principal.getName(), pageable));
    }
}
