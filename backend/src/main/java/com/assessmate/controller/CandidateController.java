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
}
