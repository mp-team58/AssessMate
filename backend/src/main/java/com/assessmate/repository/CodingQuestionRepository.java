package com.assessmate.repository;

import com.assessmate.entity.CodingQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CodingQuestionRepository extends JpaRepository<CodingQuestion, Long> {
    long countByExamId(Long examId);
    List<CodingQuestion> findByExamId(Long examId);
    List<CodingQuestion> findByCreatedByIdAndIsGlobalTrue(Long createdById);
}
