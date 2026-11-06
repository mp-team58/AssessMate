package com.assessmate.repository;

import com.assessmate.entity.Exam;
import com.assessmate.entity.ExamStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long>, JpaSpecificationExecutor<Exam> {
    Optional<Exam> findByJoinCode(String joinCode);

    @EntityGraph(attributePaths = {"host"})
    List<Exam> findByHostId(Long hostId);

    @Override
    @EntityGraph(attributePaths = {"host"})
    Page<Exam> findAll(Specification<Exam> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"host"})
    @Query("SELECT e FROM Exam e WHERE e.id = :id")
    Optional<Exam> findWithHostById(@Param("id") Long id);

    long countByHostId(Long hostId);

    List<Exam> findByStatus(ExamStatus status);

    long countByStatus(ExamStatus status);

    boolean existsByHostIdAndStatus(Long hostId, ExamStatus status);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Exam> findByStatusAndEndedAtBefore(ExamStatus status, LocalDateTime time);
}
