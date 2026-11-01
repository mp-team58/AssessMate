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

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }

    @Column(length = 512)
    private String activeToken;

    @Column(nullable = false, columnDefinition = "BIGINT DEFAULT 1")
    @Builder.Default
    private Long tokenVersion = 1L;

    public Long getTokenVersion() {
        return tokenVersion != null ? tokenVersion : 1L;
    }
// stores current valid JWT token
// replaced on every new login
// null = user is logged out
}