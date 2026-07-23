package com.assessmate.repository;

import com.assessmate.entity.Exam;
import com.assessmate.entity.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    Optional<Exam> findByJoinCode(String joinCode);
    List<Exam> findByHostId(Long hostId);
    List<Exam> findByStatus(ExamStatus status);
}