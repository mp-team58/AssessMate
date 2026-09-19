package com.assessmate.service;

import com.assessmate.dto.SubmitExamRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamSubmissionService {

    private final CandidateService candidateService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void submitExpiredExam(Long enrollmentId, String candidateEmail) {
        log.info("Auto-submitting expired exam for enrollment: {}", enrollmentId);
        SubmitExamRequest emptyRequest = new SubmitExamRequest();
        emptyRequest.setAnswers(new HashMap<>());
        candidateService.submitExam(enrollmentId, emptyRequest, candidateEmail);
    }
}
