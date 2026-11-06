package com.assessmate.repository;

import com.assessmate.entity.CandidateQuestionTiming;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateQuestionTimingRepository extends JpaRepository<CandidateQuestionTiming, Long> {

    List<CandidateQuestionTiming> findByEnrollmentId(Long enrollmentId);

    Optional<CandidateQuestionTiming> findByEnrollmentIdAndQuestionId(Long enrollmentId, Long questionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT qt FROM CandidateQuestionTiming qt WHERE qt.enrollment.id = :enrollmentId AND qt.question.id = :questionId")
    Optional<CandidateQuestionTiming> findByEnrollmentIdAndQuestionIdForUpdate(@Param("enrollmentId") Long enrollmentId, @Param("questionId") Long questionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT qt FROM CandidateQuestionTiming qt WHERE qt.enrollment.id = :enrollmentId")
    List<CandidateQuestionTiming> findByEnrollmentIdForUpdate(@Param("enrollmentId") Long enrollmentId);
}

