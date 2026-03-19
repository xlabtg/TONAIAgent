-- TON AI Agent - Migration 001: Multi-User RBAC & API Key System
-- Issue #271: Multi-User Accounts, RBAC & API Key System
--
-- Apply this migration after database.sql:
--   mysql -u root -p tonaiagent < migrations/001_multi_user_rbac_api_keys.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Extend taa_users with RBAC role, status, and email
-- Required for multi-user account isolation (Issue #271)
-- -----------------------------------------------------
ALTER TABLE `taa_users`
    ADD COLUMN IF NOT EXISTS `email` VARCHAR(320) DEFAULT NULL AFTER `telegram_id`,
    ADD COLUMN IF NOT EXISTS `role` ENUM('user', 'admin', 'service') NOT NULL DEFAULT 'user' AFTER `email`,
    ADD COLUMN IF NOT EXISTS `status` ENUM('active', 'suspended', 'pending', 'deleted') NOT NULL DEFAULT 'active' AFTER `role`;

-- Unique email index (allow NULL to support Telegram-only users)
ALTER TABLE `taa_users`
    ADD UNIQUE INDEX IF NOT EXISTS `idx_email` (`email`);

-- Role and status indices for fast filtering
ALTER TABLE `taa_users`
    ADD INDEX IF NOT EXISTS `idx_role` (`role`),
    ADD INDEX IF NOT EXISTS `idx_status` (`status`);

-- -----------------------------------------------------
-- Add user_id to agent executions for ownership tracking
-- -----------------------------------------------------
ALTER TABLE `taa_agent_executions`
    ADD COLUMN IF NOT EXISTS `user_id` BIGINT UNSIGNED DEFAULT NULL AFTER `agent_id`,
    ADD INDEX IF NOT EXISTS `idx_user_id` (`user_id`),
    ADD CONSTRAINT IF NOT EXISTS `fk_exec_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `taa_users` (`id`) ON DELETE SET NULL;

-- -----------------------------------------------------
-- Table: API Keys
-- Hashed API keys for external integrations (Issue #271)
-- Plain-text key is NEVER stored — only SHA-256 hash.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_api_keys` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    -- First 12 chars of the generated key for display (never the full key)
    `key_prefix` VARCHAR(16) NOT NULL,
    -- SHA-256 hex hash of the full raw key
    `key_hash` CHAR(64) NOT NULL UNIQUE,
    -- Comma-separated scopes: agent:read, agent:execute, portfolio:read, analytics:read, admin:all
    `scopes` TEXT NOT NULL DEFAULT 'agent:read',
    `status` ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
    `rate_limit` SMALLINT UNSIGNED NOT NULL DEFAULT 60 COMMENT 'Max requests per minute',
    `usage_count` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` DATETIME DEFAULT NULL,
    `last_used_at` DATETIME DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_key_hash` (`key_hash`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`user_id`) REFERENCES `taa_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='API keys for programmatic access — key_hash stores SHA-256 of the raw key';

-- -----------------------------------------------------
-- Table: Auth Audit Log
-- All authentication and authorization events
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_auth_audit` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED DEFAULT NULL,
    `action` VARCHAR(64) NOT NULL COMMENT 'e.g. session.created, access.denied, api_key.used',
    `resource` VARCHAR(64) DEFAULT NULL,
    `resource_id` VARCHAR(128) DEFAULT NULL,
    `api_key_id` BIGINT UNSIGNED DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `metadata` JSON DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_action` (`action`),
    INDEX `idx_created_at` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `taa_users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`api_key_id`) REFERENCES `taa_api_keys` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Auth and authorization audit trail for compliance and security monitoring';

SET FOREIGN_KEY_CHECKS = 1;
