package com.assessmate.repository;

import com.assessmate.entity.ProctoringLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProctoringLogRepository extends JpaRepository<ProctoringLog, Long> {
    long countByEnrollmentIdAndEventTypeAndFlaggedAtAfter(Long enrollmentId, com.assessmate.entity.ProctoringEventType eventType, java.time.LocalDateTime time);
}
