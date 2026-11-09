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
    long countByEnrollmentIdAndEventTypeIn(Long enrollmentId, java.util.List<com.assessmate.entity.ProctoringEventType> eventTypes);
    java.util.List<ProctoringLog> findByEnrollmentId(Long enrollmentId);
    java.util.Optional<ProctoringLog> findByImageUrl(String imageUrl);
    java.util.Optional<ProctoringLog> findByAudioUrl(String audioUrl);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM ProctoringLog p WHERE p.imageUrl = :path OR p.imageUrl = CONCAT('/', :path) OR p.imageUrl LIKE CONCAT('%', :filename)")
    java.util.List<ProctoringLog> findMatchingImages(@org.springframework.data.repository.query.Param("path") String path, @org.springframework.data.repository.query.Param("filename") String filename);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM ProctoringLog p WHERE p.audioUrl = :path OR p.audioUrl = CONCAT('/', :path) OR p.audioUrl LIKE CONCAT('%', :filename)")
    java.util.List<ProctoringLog> findMatchingAudios(@org.springframework.data.repository.query.Param("path") String path, @org.springframework.data.repository.query.Param("filename") String filename);
}
