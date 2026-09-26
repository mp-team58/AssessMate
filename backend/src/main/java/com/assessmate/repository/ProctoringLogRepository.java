package com.assessmate.repository;

import com.assessmate.entity.ProctoringLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProctoringLogRepository extends JpaRepository<ProctoringLog, Long> {
    long countByEnrollmentIdAndEventTypeAndFlaggedAtAfter(Long enrollmentId, com.assessmate.entity.ProctoringEventType eventType, java.time.LocalDateTime time);
    java.util.List<ProctoringLog> findByEnrollmentIdIn(java.util.List<Long> enrollmentIds);
    java.util.List<ProctoringLog> findByEnrollmentIdOrderByFlaggedAtAsc(Long enrollmentId);
    long countByEnrollmentIdAndEventType(Long enrollmentId, com.assessmate.entity.ProctoringEventType eventType);
    java.util.List<ProctoringLog> findByEnrollmentId(Long enrollmentId);
    java.util.Optional<ProctoringLog> findByImageUrl(String imageUrl);
    java.util.Optional<ProctoringLog> findByAudioUrl(String audioUrl);
}
