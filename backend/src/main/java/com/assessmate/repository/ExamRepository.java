package com.assessmate.repository;

import com.assessmate.entity.Exam;
import com.assessmate.entity.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long>, JpaSpecificationExecutor<Exam> {
    Optional<Exam> findByJoinCode(String joinCode);

    List<Exam> findByHostId(Long hostId);

    long countByHostId(Long hostId);

    List<Exam> findByStatus(ExamStatus status);

    long countByStatus(ExamStatus status);

    boolean existsByHostIdAndStatus(Long hostId, ExamStatus status);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Exam> findByStatusAndEndedAtBefore(ExamStatus status, LocalDateTime time);
}
