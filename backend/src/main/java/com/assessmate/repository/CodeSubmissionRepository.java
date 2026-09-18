package com.assessmate.repository;

import com.assessmate.entity.CodeSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CodeSubmissionRepository extends JpaRepository<CodeSubmission, Long> {
    List<CodeSubmission> findByEnrollmentId(Long enrollmentId);
    List<CodeSubmission> findByCandidateId(Long candidateId);
}
