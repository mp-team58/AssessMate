package com.assessmate.repository;

import com.assessmate.entity.ExamEnrollment;
import com.assessmate.entity.User;
import com.assessmate.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExamEnrollmentRepository extends JpaRepository<ExamEnrollment, Long> {
    Optional<ExamEnrollment> findByExamAndCandidate(Exam exam, User candidate);
    
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"exam"})
    java.util.List<ExamEnrollment> findByCandidateIdOrderByJoinedAtDesc(Long candidateId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"exam"})
    org.springframework.data.domain.Page<ExamEnrollment> findByCandidateId(Long candidateId, org.springframework.data.domain.Pageable pageable);
    java.util.List<ExamEnrollment> findByStatusAndPersonalEndTimeBefore(com.assessmate.entity.EnrollmentStatus status, java.time.LocalDateTime time);
    
    @org.springframework.data.jpa.repository.Query("SELECT e FROM ExamEnrollment e WHERE e.status = :status AND (e.exam.status = 'ENDED' OR e.joinedAt < :cutoff)")
    java.util.List<ExamEnrollment> findAbandonedEnrollments(
            @org.springframework.data.repository.query.Param("status") com.assessmate.entity.EnrollmentStatus status, 
            @org.springframework.data.repository.query.Param("cutoff") java.time.LocalDateTime cutoff);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from ExamEnrollment e where e.id = :id")
    Optional<ExamEnrollment> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
