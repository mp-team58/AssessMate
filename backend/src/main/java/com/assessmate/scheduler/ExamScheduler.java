package com.assessmate.scheduler;

import com.assessmate.service.CandidateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExamScheduler {

    private final CandidateService candidateService;

    // Run every 60 seconds
    @Scheduled(fixedRate = 60000)
    public void autoSubmitExams() {
        log.info("Running scheduled task to check for expired exams...");
        candidateService.autoSubmitExpiredExams();
    }
}
