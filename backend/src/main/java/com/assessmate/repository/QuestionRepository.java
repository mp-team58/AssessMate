package com.assessmate.repository;

import com.assessmate.entity.Difficulty;
import com.assessmate.entity.Question;
import org.springframework.data.jpa.repository
        .JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuestionRepository
        extends JpaRepository<Question, Long> {

    List<Question> findByExamId(Long examId);

    List<Question> findByExamIdAndDifficulty(
            Long examId, Difficulty difficulty);

    Long countByExamId(Long examId);

    Long countByExamIdAndDifficulty(
            Long examId, Difficulty difficulty);

    List<Question>
    findByCreatedByIdAndIsGlobalTrue(
            Long hostId);

    List<Question>
    findByCreatedByIdAndIsGlobalTrueAndDifficulty(
            Long hostId, Difficulty difficulty);

    // Case in-sensitive partial topic search
    List<Question>
    findByCreatedByIdAndIsGlobalTrueAndTopicContainingIgnoreCase(
            Long hostId, String topic);

    Long countByCreatedByIdAndIsGlobalTrue(
            Long hostId);
}