package com.assessmate.repository;

import com.assessmate.entity.OtpPurpose;
import com.assessmate.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findByEmailAndPurpose(String email, OtpPurpose purpose);

    void deleteByEmailAndPurpose(String email, OtpPurpose purpose);

    void deleteByExpiresAtBefore(LocalDateTime time);
}
