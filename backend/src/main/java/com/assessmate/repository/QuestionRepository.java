package com.assessmate.repository;

import com.assessmate.entity.Difficulty;
import com.assessmate.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.assessmate.entity.QuestionType;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface QuestionRepository
                extends JpaRepository<Question, Long> {

        List<Question> findByExamId(Long examId);

        List<Question> findByExamIdIn(List<Long> examIds);

        List<Question> findByExamIdAndDifficulty(
                        Long examId, Difficulty difficulty);

        Long countByExamId(Long examId);

        Long countByExamIdAndDifficulty(
                        Long examId, Difficulty difficulty);

        // Problem 2 — count unverified
        Long countByExamIdAndIsVerifiedFalse(
                        Long examId);

        List<Question> findByCreatedByIdAndIsGlobalTrue(
                        Long hostId);

        List<Question> findByCreatedByIdAndIsGlobalTrueAndDifficulty(
                        Long hostId, Difficulty difficulty);

        // Case in-sensitive partial topic search
        List<Question> findByCreatedByIdAndIsGlobalTrueAndTopicContainingIgnoreCase(
                        Long hostId, String topic);

        Long countByCreatedByIdAndIsGlobalTrue(
                        Long hostId);

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
}