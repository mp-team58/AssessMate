package com.assessmate.repository;

import com.assessmate.entity.TestCaseResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TestCaseResultRepository extends JpaRepository<TestCaseResult, Long> {
    List<TestCaseResult> findBySubmissionId(Long submissionId);
}
