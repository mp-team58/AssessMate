package com.assessmate.service.storage;

import com.assessmate.entity.Exam;
import com.assessmate.entity.ProctoringLog;
import com.assessmate.entity.Question;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.ExamEnrollmentRepository;
import com.assessmate.repository.ProctoringLogRepository;
import com.assessmate.repository.QuestionRepository;
import com.assessmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageAuthorizationService {

    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final ProctoringLogRepository proctoringLogRepository;
    private final ExamEnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public void validateReadAccess(String objectPath, String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            throw new ForbiddenException("Authentication required to access storage media.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ForbiddenException("User not found"));

        // Global admins can view media for audit/monitoring
        if (user.getRole() == Role.ADMIN) {
            return;
        }

        String normalizedPath = normalizePath(objectPath);
        String filename = extractFilename(normalizedPath);

        if (normalizedPath.startsWith("questions/")) {
            validateQuestionAccess(normalizedPath, filename, user);
        } else if (normalizedPath.startsWith("proctoring/")) {
            validateProctoringAccess(normalizedPath, filename, user);
        } else {
            throw new BadRequestException("Invalid or unsupported storage media path.");
        }
    }

    @Transactional(readOnly = true)
    public void validateDeleteAccess(String objectPath, String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            throw new ForbiddenException("Authentication required to modify storage media.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ForbiddenException("User not found"));

        if (user.getRole() == Role.ADMIN) {
            return;
        }

        String normalizedPath = normalizePath(objectPath);
        String filename = extractFilename(normalizedPath);

        if (normalizedPath.startsWith("questions/")) {
            List<Question> questions = questionRepository.findMatchingQuestions(normalizedPath, filename);
            if (questions.isEmpty()) {
                throw new ResourceNotFoundException("Question media record not found.");
            }
            for (Question q : questions) {
                if (!q.getCreatedBy().getEmail().equalsIgnoreCase(user.getEmail())) {
                    throw new ForbiddenException("Only the author of the question can delete its media.");
                }
            }
        } else if (normalizedPath.startsWith("proctoring/")) {
            // Proctoring records are managed by system schedulers or exam hosts
            List<ProctoringLog> logs = proctoringLogRepository.findMatchingImages(normalizedPath, filename);
            if (logs.isEmpty()) {
                logs = proctoringLogRepository.findMatchingAudios(normalizedPath, filename);
            }
            if (logs.isEmpty()) {
                throw new ResourceNotFoundException("Proctoring evidence not found.");
            }
            for (ProctoringLog l : logs) {
                boolean isHost = l.getEnrollment().getExam().getHost().getEmail().equalsIgnoreCase(user.getEmail());
                if (!isHost) {
                    throw new ForbiddenException("Only the exam host or administrator can remove proctoring evidence.");
                }
            }
        } else {
            throw new BadRequestException("Invalid storage path.");
        }
    }

    private void validateQuestionAccess(String normalizedPath, String filename, User user) {
        List<Question> questions = questionRepository.findMatchingQuestions(normalizedPath, filename);
        if (questions.isEmpty()) {
            throw new ResourceNotFoundException("Question media not found.");
        }

        for (Question q : questions) {
            Exam exam = q.getExam();
            if (exam != null) {
                // Host of the exam
                if (exam.getHost().getEmail().equalsIgnoreCase(user.getEmail())) {
                    return;
                }
                // Candidate enrolled in the exam
                if (user.getRole() == Role.CANDIDATE) {
                    boolean isEnrolled = enrollmentRepository.findByExamAndCandidate(exam, user).isPresent();
                    if (isEnrolled) {
                        return;
                    }
                }
            } else {
                // Global question bank item
                if (user.getRole() == Role.HOST) {
                    if (Boolean.TRUE.equals(q.getIsGlobal()) || q.getCreatedBy().getEmail().equalsIgnoreCase(user.getEmail())) {
                        return;
                    }
                }
            }
        }

        throw new ForbiddenException("You are not authorized to view this question media.");
    }

    private void validateProctoringAccess(String normalizedPath, String filename, User user) {
        List<ProctoringLog> logs = proctoringLogRepository.findMatchingImages(normalizedPath, filename);
        if (logs.isEmpty()) {
            logs = proctoringLogRepository.findMatchingAudios(normalizedPath, filename);
        }

        if (logs.isEmpty()) {
            throw new ResourceNotFoundException("Proctoring evidence not found.");
        }

        for (ProctoringLog l : logs) {
            boolean isHost = l.getEnrollment().getExam().getHost().getEmail().equalsIgnoreCase(user.getEmail());
            boolean isCandidate = l.getEnrollment().getCandidate().getEmail().equalsIgnoreCase(user.getEmail());
            if (isHost || isCandidate) {
                return;
            }
        }

        throw new ForbiddenException("You do not have permission to access this proctoring evidence.");
    }

    private String normalizePath(String path) {
        if (path == null) return "";
        String p = path.trim().replaceAll("^/+", "");
        if (p.startsWith("uploads/questions/")) {
            return "questions/" + p.substring("uploads/questions/".length());
        }
        if (p.startsWith("uploads/proctoring/images/")) {
            return "proctoring/image/" + p.substring("uploads/proctoring/images/".length());
        }
        if (p.startsWith("uploads/proctoring/audio/")) {
            return "proctoring/audio/" + p.substring("uploads/proctoring/audio/".length());
        }
        return p;
    }

    private String extractFilename(String path) {
        if (path == null || !path.contains("/")) return path;
        return path.substring(path.lastIndexOf('/') + 1);
    }
}

