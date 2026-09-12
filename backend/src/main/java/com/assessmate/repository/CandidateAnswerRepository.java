package com.assessmate.repository;

import com.assessmate.entity.CandidateAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateAnswerRepository extends JpaRepository<CandidateAnswer, Long> {
    List<CandidateAnswer> findByEnrollmentId(Long enrollmentId);
}
