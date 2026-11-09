package com.assessmate.service;

import com.assessmate.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import com.assessmate.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
@lombok.extern.slf4j.Slf4j
public class ProctoringService {

    private final com.assessmate.repository.ExamRepository examRepository;
    private final com.assessmate.repository.ExamEnrollmentRepository enrollmentRepository;
    private final com.assessmate.repository.ProctoringLogRepository proctoringLogRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final com.assessmate.service.storage.SupabaseStorageService supabaseStorageService;
    private final com.assessmate.service.storage.StorageFileValidator storageFileValidator;
    private final com.assessmate.service.storage.StorageFileNameGenerator storageFileNameGenerator;

    @org.springframework.beans.factory.annotation.Autowired
    public ProctoringService(
            com.assessmate.repository.ExamRepository examRepository,
            com.assessmate.repository.ExamEnrollmentRepository enrollmentRepository,
            com.assessmate.repository.ProctoringLogRepository proctoringLogRepository,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.assessmate.service.storage.SupabaseStorageService supabaseStorageService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.assessmate.service.storage.StorageFileValidator storageFileValidator,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.assessmate.service.storage.StorageFileNameGenerator storageFileNameGenerator
    ) {
        this.examRepository = examRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.proctoringLogRepository = proctoringLogRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.supabaseStorageService = supabaseStorageService;
        this.storageFileValidator = storageFileValidator != null ? storageFileValidator : new com.assessmate.service.storage.StorageFileValidator();
        this.storageFileNameGenerator = storageFileNameGenerator != null ? storageFileNameGenerator : new com.assessmate.service.storage.StorageFileNameGenerator();
    }

    public ProctoringService(
            com.assessmate.repository.ExamRepository examRepository,
            com.assessmate.repository.ExamEnrollmentRepository enrollmentRepository,
            com.assessmate.repository.ProctoringLogRepository proctoringLogRepository,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate
    ) {
        this(examRepository, enrollmentRepository, proctoringLogRepository, jdbcTemplate, null, null, null);
    }

    @jakarta.annotation.PostConstruct
    public void dropConstraint() {
        try {
            jdbcTemplate.execute("ALTER TABLE proctoring_logs DROP CONSTRAINT IF EXISTS proctoring_logs_event_type_check;");
            log.info("Dropped check constraint for proctoring_logs event_type");
        } catch (Exception e) {
            log.warn("Could not drop check constraint for proctoring_logs: {}", e.getMessage());
        }
    }

    private Exam getOwnedExam(Long examId, String hostEmail) {
        Exam exam = examRepository.findWithHostById(examId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Exam not found"));
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new com.assessmate.exception.ForbiddenException("You do not have access to this exam's proctoring data");
        }
        return exam;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public com.assessmate.dto.ProctoringDashboard getDashboard(Long examId, String hostEmail) {

        Exam exam = getOwnedExam(examId, hostEmail);

        List<ExamEnrollment> enrollments = enrollmentRepository.findByExamId(examId);
        List<Long> enrollmentIds = enrollments.stream().map(ExamEnrollment::getId).toList();

        List<ProctoringLog> logs = enrollmentIds.isEmpty()
                ? List.of() : proctoringLogRepository.findByEnrollmentIdIn(enrollmentIds);

        Map<Long, List<ProctoringLog>> logsByEnrollment = logs.stream()
                .collect(Collectors.groupingBy(l -> l.getEnrollment().getId()));

        List<com.assessmate.dto.CandidateProctoringRow> rows = enrollments.stream()
                .map(enr -> {
                    List<ProctoringLog> enrLogs = logsByEnrollment.getOrDefault(enr.getId(), List.of());
                    Map<ProctoringEventType, Long> countsByType = enrLogs.stream()
                            .collect(Collectors.groupingBy(ProctoringLog::getEventType, Collectors.counting()));

                    return com.assessmate.dto.CandidateProctoringRow.builder()
                            .enrollmentId(enr.getId())
                            .candidateId(enr.getCandidate().getId())
                            .candidateName(enr.getCandidate().getName())
                            .candidateEmail(enr.getCandidate().getEmail())
                            .noFaceCount(countsByType.getOrDefault(ProctoringEventType.NO_FACE, 0L))
                            .multipleFacesCount(countsByType.getOrDefault(ProctoringEventType.MULTIPLE_FACES, 0L))
                            .gazeAwayCount(countsByType.getOrDefault(ProctoringEventType.GAZE_AWAY, 0L))
                            .tabSwitchCount(countsByType.getOrDefault(ProctoringEventType.TAB_SWITCH, 0L))
                            .objectDetectedCount(countsByType.getOrDefault(ProctoringEventType.OBJECT_DETECTED, 0L))
                            .audioDetectedCount(countsByType.getOrDefault(ProctoringEventType.AUDIO_DETECTED, 0L))
                            .noCameraCount(countsByType.getOrDefault(ProctoringEventType.NO_CAMERA, 0L))
                            .noMicCount(countsByType.getOrDefault(ProctoringEventType.NO_MIC, 0L))
                            .screenShareStoppedCount(countsByType.getOrDefault(ProctoringEventType.SCREEN_SHARE_STOPPED, 0L))
                            .totalFlags((long) enrLogs.size())
                            .build();
                })
                .sorted(Comparator.comparingLong(com.assessmate.dto.CandidateProctoringRow::getTotalFlags).reversed())
                .toList();

        return com.assessmate.dto.ProctoringDashboard.builder()
                .examId(exam.getId()).examTitle(exam.getTitle()).candidates(rows)
                .build();
    }

    public List<com.assessmate.dto.ProctoringEventDTO> getCandidateTimeline(Long examId, Long enrollmentId, String hostEmail) {

        getOwnedExam(examId, hostEmail);

        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getExam().getId().equals(examId)) {
            throw new com.assessmate.exception.ForbiddenException("This candidate did not take this exam");
        }

        return proctoringLogRepository.findByEnrollmentId(enrollmentId).stream()
                .sorted(Comparator.comparing(ProctoringLog::getFlaggedAt))
                .map(l -> com.assessmate.dto.ProctoringEventDTO.builder()
                        .eventType(l.getEventType())
                        .severity(l.getSeverity())
                        .flaggedAt(l.getFlaggedAt())
                        .imageUrl(l.getImageUrl())
                        .audioUrl(l.getAudioUrl())
                        .details(l.getDetails())
                        .build())
                .toList();
    }

    public org.springframework.core.io.Resource loadEvidenceFile(String type, String filename, String userEmail) throws IOException {
        if (filename == null || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new com.assessmate.exception.BadRequestException("Invalid evidence filename");
        }

        String normalizedType = type;
        if ("image".equalsIgnoreCase(type)) normalizedType = "images";
        if (!"images".equals(normalizedType) && !"audio".equals(normalizedType)) {
            throw new com.assessmate.exception.BadRequestException("Invalid evidence type: " + type);
        }

        String relativeUrl = "/uploads/proctoring/" + normalizedType + "/" + filename;

        ProctoringLog log = ("images".equals(normalizedType)
                ? proctoringLogRepository.findByImageUrl(relativeUrl)
                : proctoringLogRepository.findByAudioUrl(relativeUrl))
                .orElseThrow(() -> new com.assessmate.exception.ResourceNotFoundException("Evidence file not found"));

        boolean isHost = log.getEnrollment().getExam().getHost().getEmail().equalsIgnoreCase(userEmail);
        boolean isCandidate = log.getEnrollment().getCandidate().getEmail().equalsIgnoreCase(userEmail);

        if (!isHost && !isCandidate) {
            throw new com.assessmate.exception.ForbiddenException("You do not have access to this evidence file");
        }

        String dir = "images".equals(normalizedType) ? imagesUploadDir : audioUploadDir;
        Path baseDir = Paths.get(dir).toAbsolutePath().normalize();
        Path filePath = baseDir.resolve(filename).normalize();

        if (!filePath.startsWith(baseDir) || !Files.exists(filePath)) {
            throw new com.assessmate.exception.ResourceNotFoundException("Evidence file not found on disk");
        }
        return new org.springframework.core.io.UrlResource(filePath.toUri());
    }


    @Value("${app.upload.dir.proctoring.images:uploads/proctoring/images/}")
    private String imagesUploadDir;

    @Value("${app.upload.dir.proctoring.audio:uploads/proctoring/audio/}")
    private String audioUploadDir;

    public String saveEvidence(MultipartFile file, String type) {
        return saveEvidence(file, type, null);
    }

    public String saveEvidence(MultipartFile file, String type, String userEmail) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Evidence file is empty.");
        }

        try {
            if ("image".equalsIgnoreCase(type)) {
                return saveImage(file, userEmail);
            } else if ("audio".equalsIgnoreCase(type)) {
                return saveAudio(file, userEmail);
            } else {
                throw new BadRequestException("Invalid evidence type: " + type);
            }
        } catch (IOException e) {
            throw new BadRequestException("Could not save evidence file: " + e.getMessage());
        }
    }

    private String saveImage(MultipartFile file, String userEmail) throws IOException {
        var validated = storageFileValidator != null ? storageFileValidator.validateImage(file) : null;
        String ext = validated != null ? validated.extension() : ".jpg";
        String mime = validated != null ? validated.mimeType() : "image/jpeg";

        if (supabaseStorageService != null && supabaseStorageService.isConfigured()) {
            String objectPath = storageFileNameGenerator.generateProctoringImageObjectPath(
                    extractIdentifier(userEmail), ext);
            supabaseStorageService.uploadFile(objectPath, file.getBytes(), mime);
            return objectPath;
        }

        // Local filesystem fallback
        Path uploadPath = Paths.get(imagesUploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String filename = UUID.randomUUID().toString() + ext;
        Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/proctoring/images/" + filename;
    }

    private String saveAudio(MultipartFile file, String userEmail) throws IOException {
        var validated = storageFileValidator != null ? storageFileValidator.validateAudio(file) : null;
        String ext = validated != null ? validated.extension() : ".webm";
        String mime = validated != null ? validated.mimeType() : "audio/webm";

        if (supabaseStorageService != null && supabaseStorageService.isConfigured()) {
            String objectPath = storageFileNameGenerator.generateProctoringAudioObjectPath(
                    extractIdentifier(userEmail), ext);
            supabaseStorageService.uploadFile(objectPath, file.getBytes(), mime);
            return objectPath;
        }

        // Local filesystem fallback
        Path uploadPath = Paths.get(audioUploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String filename = UUID.randomUUID().toString() + ext;
        Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/proctoring/audio/" + filename;
    }

    private String extractIdentifier(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) return "ev";
        String clean = userEmail.replaceAll("[^a-zA-Z0-9]", "");
        return clean.length() > 8 ? clean.substring(0, 8) : clean;
    }

    @org.springframework.transaction.annotation.Transactional
    public void cleanupOldEvidence(int daysRetention) {
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(daysRetention);
        List<Exam> oldExams = examRepository.findByStatusAndEndedAtBefore(ExamStatus.ENDED, cutoff);

        for (Exam exam : oldExams) {
            List<ExamEnrollment> enrollments = enrollmentRepository.findByExamId(exam.getId());
            for (ExamEnrollment enrollment : enrollments) {
                List<ProctoringLog> logs = proctoringLogRepository.findByEnrollmentId(enrollment.getId());
                for (ProctoringLog log : logs) {
                    if (log.getImageUrl() != null) {
                        deleteFileQuietly(log.getImageUrl());
                        log.setImageUrl(null); // Clear the reference
                    }
                    if (log.getAudioUrl() != null) {
                        deleteFileQuietly(log.getAudioUrl());
                        log.setAudioUrl(null); // Clear the reference
                    }
                }
                proctoringLogRepository.saveAll(logs);
            }
        }
    }

    private void deleteFileQuietly(String relativeUrl) {
        if (relativeUrl == null || relativeUrl.isBlank()) return;
        try {
            if (supabaseStorageService != null && supabaseStorageService.isConfigured()) {
                supabaseStorageService.deleteFile(relativeUrl);
                return;
            }
            String type = relativeUrl.contains("/images/") ? "images" : "audio";
            String filename = relativeUrl.substring(relativeUrl.lastIndexOf('/') + 1);
            String dir = "images".equals(type) ? imagesUploadDir : audioUploadDir;
            Path filePath = Paths.get(dir, filename);
            Files.deleteIfExists(filePath);
        } catch (Exception e) {
            // Log silently and continue, don't crash the scheduler
            log.warn("Failed to delete evidence file: {}", relativeUrl);
        }
    }
}
