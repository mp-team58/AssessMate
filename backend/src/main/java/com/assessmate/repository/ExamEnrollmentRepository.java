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
}
