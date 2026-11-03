package com.assessmate.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Idempotent, safe database migration runner executing at application startup.
 * Upgrades schema for ADMIN role, user status, deletion metadata, and audit logs
 * without requiring a heavy migration framework or database reset.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseMigrationRunner {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    @Order(1)
    public void runMigrations() {
        log.info("Running idempotent AssessMate database migrations...");

        try {
            // 1. Drop existing users_role_check constraint if it exists and replace with one including ADMIN
            try {
                jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
                jdbcTemplate.execute("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('HOST', 'CANDIDATE', 'ADMIN'))");
                log.info("Migration: Updated users_role_check to support ('HOST', 'CANDIDATE', 'ADMIN').");
            } catch (Exception e) {
                log.debug("Note: users_role_check modification notice: {}", e.getMessage());
            }

            // 2. Ensure status column exists and is backfilled for existing rows
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE'");
                jdbcTemplate.execute("UPDATE users SET status = 'ACTIVE' WHERE status IS NULL");
                jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check");
                jdbcTemplate.execute("ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'DELETED', 'PENDING_INVITATION'))");
                log.info("Migration: Updated users_status_check to support ('ACTIVE', 'DEACTIVATED', 'DELETED', 'PENDING_INVITATION').");
            } catch (Exception e) {
                log.debug("Note: users.status column notice: {}", e.getMessage());
            }

            // 3. Ensure deleted_at and deleted_by columns exist
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP");
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255)");
            } catch (Exception e) {
                log.debug("Note: users deletion columns notice: {}", e.getMessage());
            }

            // 4. Ensure must_change_password column exists
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE");
                jdbcTemplate.execute("UPDATE users SET must_change_password = FALSE WHERE must_change_password IS NULL");
            } catch (Exception e) {
                log.debug("Note: users.must_change_password column notice: {}", e.getMessage());
            }

            // 5. Ensure admin_audit_logs table exists
            try {
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS admin_audit_logs (
                        id BIGSERIAL PRIMARY KEY,
                        actor_id BIGINT,
                        actor_email VARCHAR(255),
                        action VARCHAR(64) NOT NULL,
                        target_type VARCHAR(64),
                        target_id VARCHAR(64),
                        metadata_json TEXT,
                        client_ip VARCHAR(64),
                        created_at TIMESTAMP NOT NULL
                    )
                """);
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs(created_at DESC)");
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action)");
                log.info("Migration: admin_audit_logs table verified.");
            } catch (Exception e) {
                log.debug("Note: admin_audit_logs creation notice: {}", e.getMessage());
            }

            // 6. Ensure admin_invitations table exists
            try {
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS admin_invitations (
                        id BIGSERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        token_hash VARCHAR(128) NOT NULL UNIQUE,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        used_at TIMESTAMP,
                        created_by VARCHAR(255)
                    )
                """);
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email)");
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_admin_invitations_token_hash ON admin_invitations(token_hash)");
                log.info("Migration: admin_invitations table verified.");
            } catch (Exception e) {
                log.debug("Note: admin_invitations creation notice: {}", e.getMessage());
            }

            log.info("AssessMate database migrations completed successfully.");
        } catch (Exception e) {
            log.warn("Migration warning: {}", e.getMessage());
        }
    }
}

