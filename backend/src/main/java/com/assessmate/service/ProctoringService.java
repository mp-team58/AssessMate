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
}
