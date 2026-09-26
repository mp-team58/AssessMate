package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.*;
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
@RequiredArgsConstructor
public class ProctoringService {

    private final ExamRepository examRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final ProctoringLogRepository proctoringLogRepository;

    private Exam getOwnedExam(Long examId, String hostEmail) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        if (!exam.getHost().getEmail().equals(hostEmail)) {
            throw new ForbiddenException("You do not have access to this exam's proctoring data");
        }
        return exam;
    }

    public ProctoringDashboard getDashboard(Long examId, String hostEmail) {

        Exam exam = getOwnedExam(examId, hostEmail);

        List<ExamEnrollment> enrollments = enrollmentRepository.findByExamId(examId);
        List<Long> enrollmentIds = enrollments.stream().map(ExamEnrollment::getId).toList();

        List<ProctoringLog> logs = enrollmentIds.isEmpty()
                ? List.of() : proctoringLogRepository.findByEnrollmentIdIn(enrollmentIds);

        Map<Long, List<ProctoringLog>> logsByEnrollment = logs.stream()
                .collect(Collectors.groupingBy(l -> l.getEnrollment().getId()));

        List<CandidateProctoringRow> rows = enrollments.stream()
                .map(enr -> {
                    List<ProctoringLog> enrLogs = logsByEnrollment.getOrDefault(enr.getId(), List.of());
                    Map<ProctoringEventType, Long> countsByType = enrLogs.stream()
                            .collect(Collectors.groupingBy(ProctoringLog::getEventType, Collectors.counting()));

                    return CandidateProctoringRow.builder()
                            .enrollmentId(enr.getId())
                            .candidateId(enr.getCandidate().getId())
                            .candidateName(enr.getCandidate().getName())
                            .candidateEmail(enr.getCandidate().getEmail())
                            .noFaceCount(countsByType.getOrDefault(ProctoringEventType.NO_FACE, 0L))
                            .multipleFacesCount(countsByType.getOrDefault(ProctoringEventType.MULTIPLE_FACES, 0L))
                            .gazeAwayCount(countsByType.getOrDefault(ProctoringEventType.GAZE_AWAY, 0L))
                            .tabSwitchCount(countsByType.getOrDefault(ProctoringEventType.TAB_SWITCH, 0L))
                            .totalFlags((long) enrLogs.size())
                            .build();
                })
                .sorted(Comparator.comparingLong(CandidateProctoringRow::getTotalFlags).reversed())
                .toList();

        return ProctoringDashboard.builder()
                .examId(exam.getId()).examTitle(exam.getTitle()).candidates(rows)
                .build();
    }

    public List<ProctoringEvent> getCandidateTimeline(Long examId, Long enrollmentId, String hostEmail) {

        getOwnedExam(examId, hostEmail);

        ExamEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

        if (!enrollment.getExam().getId().equals(examId)) {
            throw new ForbiddenException("This candidate did not take this exam");
        }

        return proctoringLogRepository.findByEnrollmentIdOrderByFlaggedAtAsc(enrollmentId).stream()
                .map(l -> ProctoringEvent.builder()
                        .eventType(l.getEventType().name())
                        .flaggedAt(l.getFlaggedAt())
                        .build())
                .toList();
    }
    @Value("${app.upload.dir.proctoring.images:uploads/proctoring/images/}")
    private String imagesUploadDir;

    @Value("${app.upload.dir.proctoring.audio:uploads/proctoring/audio/}")
    private String audioUploadDir;

    public String saveEvidence(MultipartFile file, String type) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Evidence file is empty.");
        }

        try {
            if ("image".equalsIgnoreCase(type)) {
                return saveImage(file);
            } else if ("audio".equalsIgnoreCase(type)) {
                return saveAudio(file);
            } else {
                throw new BadRequestException("Invalid evidence type: " + type);
            }
        } catch (IOException e) {
            throw new BadRequestException("Could not save evidence file: " + e.getMessage());
        }
    }

    private String saveImage(MultipartFile file) throws IOException {
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new BadRequestException("Image too large. Max 2MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/webp"))) {
            throw new BadRequestException("Only JPEG, PNG, and WebP images are allowed.");
        }

        try {
            java.awt.image.BufferedImage img = ImageIO.read(file.getInputStream());
            if (img == null) {
                throw new BadRequestException("File is not a valid image.");
            }
        } catch (Exception e) {
            throw new BadRequestException("Could not read image file.");
        }

        Path uploadPath = Paths.get(imagesUploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };

        String filename = UUID.randomUUID().toString() + extension;
        Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/proctoring/images/" + filename;
    }

    private String saveAudio(MultipartFile file) throws IOException {
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("Audio too large. Max 5MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("audio/webm") && !contentType.equals("audio/ogg") && !contentType.equals("audio/wav"))) {
            throw new BadRequestException("Only WebM, OGG, and WAV audio are allowed.");
        }

        Path uploadPath = Paths.get(audioUploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String extension = switch (contentType) {
            case "audio/webm" -> ".webm";
            case "audio/ogg" -> ".ogg";
            case "audio/wav" -> ".wav";
            default -> ".webm";
        };

        String filename = UUID.randomUUID().toString() + extension;
        Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/proctoring/audio/" + filename;
    }
}
