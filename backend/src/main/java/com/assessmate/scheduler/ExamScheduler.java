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
    private final com.assessmate.service.ExamSubmissionService examSubmissionService;
    private final com.assessmate.service.ExamService examService;

    // Run every 60 seconds
    @Scheduled(fixedRate = 60000)
    public void autoSubmitExams() {
        log.info("Running scheduled task to check for expired exams...");
        candidateService.getExpiredEnrollments().forEach(enrollment -> {
            try {
                examSubmissionService.submitExpiredExam(enrollment.getId(), enrollment.getCandidate().getEmail());
            } catch (Exception e) {
                log.error("Failed to auto-submit enrollment {}", enrollment.getId(), e);
            }
        });
        
        try {
            examService.autoEndExams();
        } catch (Exception e) {
            log.error("Failed to auto-end exams", e);
        }
    }
}
