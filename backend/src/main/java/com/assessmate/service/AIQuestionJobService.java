package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.Exam;
import com.assessmate.entity.ExamStatus;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.ExamRepository;
import com.assessmate.service.FileProcessingService.FileExtractionResult;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Manages asynchronous AI question generation jobs.
 * Prevents long-running Gemini API calls from blocking Tomcat HTTP worker
 * threads.
 *
 * Provides:
 * - Immediate HTTP 202 Accepted response with a unique jobId
 * - Polling status endpoint with host ownership authorization
 * - Duplicate job prevention per exam
 * - Sanitized error messaging (no API keys or internal stack traces exposed)
 * - Automatic eviction of stale jobs
 */
@Service
@Slf4j
public class AIQuestionJobService {

    private final AIQuestionService aiQuestionService;
    private final FileProcessingService fileProcessingService;
    private final ExamRepository examRepository;

    private final ExecutorService jobExecutor = Executors.newFixedThreadPool(4);

    private final ConcurrentHashMap<String, AIGenerationJob> jobs = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, String> activeExamJobs = new ConcurrentHashMap<>();

    public AIQuestionJobService(
            AIQuestionService aiQuestionService,
            FileProcessingService fileProcessingService,
            ExamRepository examRepository) {
        this.aiQuestionService = aiQuestionService;
        this.fileProcessingService = fileProcessingService;
        this.examRepository = examRepository;
    }

    @Getter
    @Setter
    public static class AIGenerationJob {
        private String jobId;
        private Long examId;
        private String hostEmail;
        private String status; // PROCESSING, COMPLETED, FAILED
        private LocalDateTime createdAt;
        private Instant createdInstant;
        private AIGenerationResponse result;
        private String errorMessage;

        public AIGenerationJob(String jobId, Long examId, String hostEmail) {
            this.jobId = jobId;
            this.examId = examId;
            this.hostEmail = hostEmail;
            this.status = "PROCESSING";
            this.createdAt = LocalDateTime.now();
            this.createdInstant = Instant.now();
        }
    }

    public AIGenerationJobResponse startTopicJob(AIGenerationRequest req, String hostEmail) {
        if (req.getTopic() == null || req.getTopic().trim().isEmpty()) {
            throw new BadRequestException("Topic is required for topic-based AI generation.");
        }
        validateExamAccess(req.getExamId(), hostEmail);

        String jobId = createJob(req.getExamId(), hostEmail);
        AIGenerationJob job = jobs.get(jobId);

        jobExecutor.submit(() -> {
            try {
                AIGenerationResponse response = aiQuestionService.generateFromTopic(req, hostEmail);
                job.setStatus("COMPLETED");
                job.setResult(response);
            } catch (Exception e) {
                log.error("AI topic question generation job {} failed: {}", jobId, e.getMessage());
                job.setStatus("FAILED");
                job.setErrorMessage(sanitizeErrorMessage(e));
            } finally {
                activeExamJobs.remove(req.getExamId(), jobId);
            }
        });

        return toResponse(job, "Question generation job queued successfully.");
    }

    public AIGenerationJobResponse startTextJob(AIGenerationRequest req, String hostEmail) {
        if (req.getText() == null || req.getText().trim().isEmpty()) {
            throw new BadRequestException("Please paste some text content.");
        }
        validateExamAccess(req.getExamId(), hostEmail);

        String jobId = createJob(req.getExamId(), hostEmail);
        AIGenerationJob job = jobs.get(jobId);

        jobExecutor.submit(() -> {
            try {
                AIGenerationResponse response = aiQuestionService.generateFromText(req, hostEmail);
                job.setStatus("COMPLETED");
                job.setResult(response);
            } catch (Exception e) {
                log.error("AI text question generation job {} failed: {}", jobId, e.getMessage());
                job.setStatus("FAILED");
                job.setErrorMessage(sanitizeErrorMessage(e));
            } finally {
                activeExamJobs.remove(req.getExamId(), jobId);
            }
        });

        return toResponse(job, "Question generation job queued successfully.");
    }

    public AIGenerationJobResponse startFileJob(AIFileRequest req, MultipartFile file, String hostEmail)
            throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please select a file to upload.");
        }
        validateExamAccess(req.getExamId(), hostEmail);

        // Synchronously extract file content in request thread before backgrounding
        FileExtractionResult extraction = fileProcessingService.extractFromFile(file, req.getTopic());

        String jobId = createJob(req.getExamId(), hostEmail);
        AIGenerationJob job = jobs.get(jobId);

        jobExecutor.submit(() -> {
            try {
                AIGenerationResponse response = aiQuestionService.generateFromFileExtraction(req, extraction,
                        hostEmail);
                job.setStatus("COMPLETED");
                job.setResult(response);
            } catch (Exception e) {
                log.error("AI file question generation job {} failed: {}", jobId, e.getMessage());
                job.setStatus("FAILED");
                job.setErrorMessage(sanitizeErrorMessage(e));
            } finally {
                activeExamJobs.remove(req.getExamId(), jobId);
            }
        });

        return toResponse(job, "Question generation job queued successfully.");
    }

    public AIGenerationJobResponse getJobStatus(Long examId, String jobId, String hostEmail) {
        AIGenerationJob job = jobs.get(jobId);
        if (job == null) {
            throw new ResourceNotFoundException("Generation job not found or has expired.");
        }

        if (!job.getExamId().equals(examId) || !job.getHostEmail().equalsIgnoreCase(hostEmail)) {
            throw new ForbiddenException("You do not have access to this generation job.");
        }

        String msg = "PROCESSING".equals(job.getStatus())
                ? "AI question generation is in progress..."
                : ("COMPLETED".equals(job.getStatus()) ? "AI questions generated successfully." : "Generation failed.");

        return toResponse(job, msg);
    }

    private String createJob(Long examId, String hostEmail) {
        String jobId = UUID.randomUUID().toString();
        String existing = activeExamJobs.putIfAbsent(examId, jobId);
        if (existing != null) {
            AIGenerationJob existingJob = jobs.get(existing);
            if (existingJob != null && "PROCESSING".equals(existingJob.getStatus())) {
                throw new BadRequestException(
                        "A question generation job is already in progress for this exam. Please wait for it to complete.");
            } else {
                // Stale mapping override
                activeExamJobs.put(examId, jobId);
            }
        }

        AIGenerationJob job = new AIGenerationJob(jobId, examId, hostEmail);
        jobs.put(jobId, job);
        return jobId;
    }

    private void validateExamAccess(Long examId, String hostEmail) {
        if (examId == null) {
            throw new BadRequestException("Exam ID is required.");
        }

        Exam exam = examRepository.findWithHostById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!exam.getHost().getEmail().equalsIgnoreCase(hostEmail)) {
            throw new ForbiddenException("You are not authorized to modify this exam.");
        }

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new BadRequestException("Questions can only be generated while the exam is in DRAFT status.");
        }
    }

    private AIGenerationJobResponse toResponse(AIGenerationJob job, String message) {
        return AIGenerationJobResponse.builder()
                .jobId(job.getJobId())
                .examId(job.getExamId())
                .status(job.getStatus())
                .message(message)
                .error(job.getErrorMessage())
                .createdAt(job.getCreatedAt())
                .result(job.getResult())
                .build();
    }

    private String sanitizeErrorMessage(Throwable t) {
        String msg = t.getMessage();
        if (msg == null || msg.isBlank()) {
            return "AI generation failed. Please try again in a moment.";
        }
        String lower = msg.toLowerCase();
        if (lower.contains("timeout") || lower.contains("timed out") || lower.contains("too long")) {
            return "AI generation timed out. Try generating fewer questions or paste shorter source text.";
        }
        if (lower.contains("429") || lower.contains("too many requests") || lower.contains("quota exceeded")) {
            return "AI service is currently busy. Please wait a moment and try again.";
        }
        if (lower.contains("api key") || lower.contains("key=") || lower.contains("aiza") || lower.contains("x-goog-api-key") || lower.contains("credential") || lower.contains("secret")) {
            return "AI service configuration error. Please contact system administrator.";
        }
        if (t instanceof BadRequestException) {
            return msg;
        }
        return "AI question generation failed. Please try again later.";
    }

    @Scheduled(fixedRate = 60000)
    public void cleanupOldJobs() {
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(30));
        jobs.entrySet().removeIf(entry -> {
            AIGenerationJob job = entry.getValue();
            return !"PROCESSING".equals(job.getStatus()) && job.getCreatedInstant().isBefore(cutoff);
        });
    }
}