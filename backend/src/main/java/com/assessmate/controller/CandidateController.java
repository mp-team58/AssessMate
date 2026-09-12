package com.assessmate.controller;

import com.assessmate.dto.JoinExamResponse;
import com.assessmate.service.CandidateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/candidate")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class CandidateController {

    private final CandidateService candidateService;

    @PostMapping("/join/{code}")
    public ResponseEntity<JoinExamResponse> joinExam(
            @PathVariable String code,
            Principal principal) {
        return ResponseEntity.ok(candidateService.joinExam(code, principal.getName()));
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

    @PostMapping("/submit/{enrollmentId}")
    public ResponseEntity<Void> submitExam(
            @PathVariable Long enrollmentId,
            @RequestBody com.assessmate.dto.SubmitExamRequest request,
            Principal principal) {
        candidateService.submitExam(enrollmentId, request, principal.getName());
        return ResponseEntity.ok().build();
    }
}
