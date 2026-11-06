package com.assessmate.repository;

import com.assessmate.entity.CodingQuestion;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface CodingQuestionRepository extends JpaRepository<CodingQuestion, Long> {
    long countByExamId(Long examId);

    @EntityGraph(attributePaths = {"createdBy"})
    List<CodingQuestion> findByExamId(Long examId);

    @EntityGraph(attributePaths = {"createdBy"})
    List<CodingQuestion> findByCreatedByIdAndIsGlobalTrue(Long createdById);

    @Transactional
    void deleteByExamId(Long examId);
}
