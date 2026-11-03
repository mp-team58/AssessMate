package com.assessmate.repository;

import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);

    Boolean existsByEmail(String email);

    long countByRole(Role role);

    java.util.List<User> findByRole(Role role);

    long countByRoleAndStatus(Role role, AccountStatus status);

    java.util.List<User> findByRoleAndStatus(Role role, AccountStatus status);

    long countByStatus(AccountStatus status);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
