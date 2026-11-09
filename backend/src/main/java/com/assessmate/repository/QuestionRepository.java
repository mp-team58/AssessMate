package com.assessmate.repository;

import com.assessmate.entity.Difficulty;
import com.assessmate.entity.Question;
import com.assessmate.entity.QuestionType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {

    @EntityGraph(attributePaths = {"createdBy"})
    List<Question> findByExamId(Long examId);

    @EntityGraph(attributePaths = {"createdBy"})
    List<Question> findByExamIdIn(List<Long> examIds);

    @EntityGraph(attributePaths = {"createdBy"})
    List<Question> findByExamIdAndDifficulty(Long examId, Difficulty difficulty);

    Long countByExamId(Long examId);

    Long countByExamIdAndDifficulty(Long examId, Difficulty difficulty);

    // Problem 2 — count unverified
    Long countByExamIdAndIsVerifiedFalse(Long examId);

    @EntityGraph(attributePaths = {"createdBy"})
    List<Question> findByCreatedByIdAndIsGlobalTrue(Long hostId);

    @EntityGraph(attributePaths = {"createdBy"})
    List<Question> findByCreatedByIdAndIsGlobalTrueAndDifficulty(Long hostId, Difficulty difficulty);

    // Case in-sensitive partial topic search
    @EntityGraph(attributePaths = {"createdBy"})
    List<Question> findByCreatedByIdAndIsGlobalTrueAndTopicContainingIgnoreCase(Long hostId, String topic);

    Long countByCreatedByIdAndIsGlobalTrue(Long hostId);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query("SELECT q FROM Question q " +
            "WHERE q.createdBy.id = :hostId " +
            "AND q.isGlobal = true " +
            "AND (:difficulty IS NULL " +
            "  OR q.difficulty = :difficulty) " +
            "AND (:type IS NULL " +
            "  OR q.type = :type) " +
            "AND (:topic IS NULL OR :topic = '' " +
            "  OR LOWER(q.topic) LIKE " +
            "  LOWER(CONCAT('%', :topic, '%'))) " +
            "AND (:search IS NULL OR :search = '' " +
            "  OR LOWER(q.questionText) LIKE " +
            "  LOWER(CONCAT('%', :search, '%')))")
    List<Question> findByHostFiltered(
            @Param("hostId") Long hostId,
            @Param("difficulty") Difficulty difficulty,
            @Param("type") QuestionType type,
            @Param("topic") String topic,
            @Param("search") String search);

    @Transactional
    void deleteByExamId(Long examId);

    @Query("SELECT q FROM Question q WHERE q.imageUrl = :path OR q.imageUrl = CONCAT('/', :path) OR q.imageUrl LIKE CONCAT('%', :filename)")
    List<Question> findMatchingQuestions(@Param("path") String path, @Param("filename") String filename);
}
