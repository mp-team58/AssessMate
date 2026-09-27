package com.assessmate.repository;

import com.assessmate.entity.CandidateAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateAnswerRepository extends JpaRepository<CandidateAnswer, Long> {
    List<CandidateAnswer> findByEnrollmentId(Long enrollmentId);

    List<CandidateAnswer> findByEnrollmentIdIn(List<Long> enrollmentIds);
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM CandidateAnswer c WHERE c.enrollment.id = :enrollmentId")
    void deleteByEnrollmentId(@org.springframework.data.repository.query.Param("enrollmentId") Long enrollmentId);
}
