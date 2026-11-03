package com.assessmate.repository;

import com.assessmate.entity.AdminInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminInvitationRepository extends JpaRepository<AdminInvitation, Long> {

    Optional<AdminInvitation> findByTokenHash(String tokenHash);

    List<AdminInvitation> findByEmailOrderByCreatedAtDesc(String email);

    Optional<AdminInvitation> findTopByEmailOrderByCreatedAtDesc(String email);

    void deleteByEmail(String email);
}

