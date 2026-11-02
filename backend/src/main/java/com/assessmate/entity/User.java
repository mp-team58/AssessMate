package com.assessmate.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private AccountStatus status = AccountStatus.ACTIVE;

    public AccountStatus getStatus() {
        return status != null ? status : AccountStatus.ACTIVE;
    }

    @Column
    private LocalDateTime deletedAt;

    @Column(length = 255)
    private String deletedBy;

    @Column(nullable = false)
    @Builder.Default
    private Boolean mustChangePassword = false;

    public Boolean getMustChangePassword() {
        return mustChangePassword != null && mustChangePassword;
    }

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = AccountStatus.ACTIVE;
        }
        if (mustChangePassword == null) {
            mustChangePassword = false;
        }
    }

    @Column(length = 512)
    private String activeToken;

    @Column(nullable = false, columnDefinition = "BIGINT DEFAULT 1")
    @Builder.Default
    private Long tokenVersion = 1L;

    public Long getTokenVersion() {
        return tokenVersion != null ? tokenVersion : 1L;
    }
}
