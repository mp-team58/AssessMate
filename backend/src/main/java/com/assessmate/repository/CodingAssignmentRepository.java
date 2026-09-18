package com.assessmate.repository;

import com.assessmate.entity.CodingAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CodingAssignmentRepository
        extends JpaRepository<CodingAssignment, Long> {

    // Check if candidate already assigned
    List<CodingAssignment> findByEnrollmentIdOrderByOrderIndexAsc(Long enrollmentId);

    boolean existsByEnrollmentId(Long enrollmentId);

    long countByEnrollmentId(Long enrollmentId);
}
