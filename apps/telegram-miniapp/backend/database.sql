-- TON AI Agent - Database Schema
-- MySQL 8.0+ / MariaDB 10.5+
--
-- Execute this file to create the database schema:
-- mysql -u root -p tonaiagent < database.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Table: Users
-- Telegram users who have accessed the Mini App
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `telegram_id` BIGINT NOT NULL UNIQUE,
    `first_name` VARCHAR(255) DEFAULT NULL,
    `last_name` VARCHAR(255) DEFAULT NULL,
    `username` VARCHAR(255) DEFAULT NULL,
    `language_code` VARCHAR(10) DEFAULT 'en',
    `is_premium` TINYINT(1) DEFAULT 0,
    `subscription_tier` ENUM('basic', 'pro', 'institutional') DEFAULT 'basic',
    `subscription_expires_at` DATETIME DEFAULT NULL,
    `wallet_address` VARCHAR(128) DEFAULT NULL,
    `wallet_connected_at` DATETIME DEFAULT NULL,
    `referral_code` VARCHAR(32) DEFAULT NULL,
    `referred_by` BIGINT UNSIGNED DEFAULT NULL,
    `total_earnings` DECIMAL(20, 8) DEFAULT 0,
    `privacy_consent` TINYINT(1) DEFAULT 0,
    `privacy_consent_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_login_at` DATETIME DEFAULT NULL,
    `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_telegram_id` (`telegram_id`),
    INDEX `idx_referral_code` (`referral_code`),
    INDEX `idx_referred_by` (`referred_by`),
    INDEX `idx_wallet_address` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: Strategies
-- Trading strategy templates available in marketplace
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_strategies` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `creator_id` BIGINT UNSIGNED DEFAULT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `category` ENUM('dca', 'yield', 'liquidity', 'trading', 'arbitrage', 'rebalancing') NOT NULL,
    `risk_level` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `min_investment` DECIMAL(20, 8) NOT NULL DEFAULT 10,
    `expected_apy_min` DECIMAL(10, 2) DEFAULT 0,
    `expected_apy_max` DECIMAL(10, 2) DEFAULT 0,
    `performance_fee_percent` DECIMAL(5, 2) DEFAULT 10,
    `is_official` TINYINT(1) DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `total_subscribers` INT UNSIGNED DEFAULT 0,
    `total_value_locked` DECIMAL(20, 8) DEFAULT 0,
    `avg_rating` DECIMAL(3, 2) DEFAULT 0,
    `rating_count` INT UNSIGNED DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_creator` (`creator_id`),
    INDEX `idx_category` (`category`),
    INDEX `idx_risk_level` (`risk_level`),
    INDEX `idx_is_active` (`is_active`),
    FOREIGN KEY (`creator_id`) REFERENCES `taa_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: Agents
-- User's deployed AI agents
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_agents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `strategy_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` ENUM('pending', 'active', 'paused', 'stopped', 'error') NOT NULL DEFAULT 'pending',
    `initial_investment` DECIMAL(20, 8) NOT NULL,
    `current_value` DECIMAL(20, 8) NOT NULL,
    `total_pnl` DECIMAL(20, 8) DEFAULT 0,
    `total_pnl_percent` DECIMAL(10, 4) DEFAULT 0,
    `total_trades` INT UNSIGNED DEFAULT 0,
    `winning_trades` INT UNSIGNED DEFAULT 0,
    `wallet_address` VARCHAR(128) DEFAULT NULL,
    `owner_wallet` VARCHAR(128) DEFAULT NULL COMMENT 'TON wallet address of the agent owner (set at deploy time)',
    `last_activity_at` DATETIME DEFAULT NULL,
    `started_at` DATETIME DEFAULT NULL,
    `stopped_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user` (`user_id`),
    INDEX `idx_strategy` (`strategy_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_owner_wallet` (`owner_wallet`),
    FOREIGN KEY (`user_id`) REFERENCES `taa_users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`strategy_id`) REFERENCES `taa_strategies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: Agent Trades
-- Trade history for agents
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_agent_trades` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `agent_id` BIGINT UNSIGNED NOT NULL,
    `trade_type` ENUM('buy', 'sell', 'swap', 'stake', 'unstake', 'provide_liquidity', 'remove_liquidity') NOT NULL,
    `asset_in` VARCHAR(64) NOT NULL,
    `asset_out` VARCHAR(64) NOT NULL,
    `amount_in` DECIMAL(20, 8) NOT NULL,
    `amount_out` DECIMAL(20, 8) NOT NULL,
    `price` DECIMAL(20, 8) DEFAULT NULL,
    `fee_amount` DECIMAL(20, 8) DEFAULT 0,
    `tx_hash` VARCHAR(128) DEFAULT NULL,
    `status` ENUM('pending', 'confirmed', 'failed') NOT NULL DEFAULT 'pending',
    `pnl` DECIMAL(20, 8) DEFAULT 0,
    `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_agent` (`agent_id`),
    INDEX `idx_trade_type` (`trade_type`),
    INDEX `idx_status` (`status`),
    INDEX `idx_executed_at` (`executed_at`),
    FOREIGN KEY (`agent_id`) REFERENCES `taa_agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: Agent Rankings
-- Cached rankings for agents
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_agent_rankings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `agent_id` BIGINT UNSIGNED NOT NULL,
    `rank` INT UNSIGNED NOT NULL,
    `rank_change` INT DEFAULT 0,
    `score` DECIMAL(10, 4) NOT NULL DEFAULT 0,
    `performance_score` DECIMAL(10, 4) DEFAULT 0,
    `stability_score` DECIMAL(10, 4) DEFAULT 0,
    `risk_score` DECIMAL(10, 4) DEFAULT 0,
    `reputation_score` DECIMAL(10, 4) DEFAULT 0,
    `onchain_score` DECIMAL(10, 4) DEFAULT 0,
    `ranking_period` DATE NOT NULL,
    `calculated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_agent_period` (`agent_id`, `ranking_period`),
    INDEX `idx_rank` (`rank`),
    INDEX `idx_score` (`score`),
    INDEX `idx_period` (`ranking_period`),
    FOREIGN KEY (`agent_id`) REFERENCES `taa_agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: Revenue Records
-- Fee and revenue tracking
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_revenue` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED DEFAULT NULL,
    `agent_id` BIGINT UNSIGNED DEFAULT NULL,
    `strategy_id` BIGINT UNSIGNED DEFAULT NULL,
    `revenue_type` ENUM('performance_fee', 'management_fee', 'subscription', 'referral') NOT NULL,
    `gross_amount` DECIMAL(20, 8) NOT NULL,
    `platform_amount` DECIMAL(20, 8) NOT NULL,
    `creator_amount` DECIMAL(20, 8) DEFAULT 0,
    `currency` VARCHAR(10) DEFAULT 'TON',
    `period_start` DATE DEFAULT NULL,
    `period_end` DATE DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user` (`user_id`),
    INDEX `idx_agent` (`agent_id`),
    INDEX `idx_strategy` (`strategy_id`),
    INDEX `idx_type` (`revenue_type`),
    INDEX `idx_created_at` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `taa_users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`agent_id`) REFERENCES `taa_agents` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`strategy_id`) REFERENCES `taa_strategies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: Referrals
-- Referral tracking
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_referrals` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `referrer_id` BIGINT UNSIGNED NOT NULL,
    `referred_id` BIGINT UNSIGNED NOT NULL,
    `referral_code` VARCHAR(32) NOT NULL,
    `status` ENUM('pending', 'activated', 'converted') NOT NULL DEFAULT 'pending',
    `activated_at` DATETIME DEFAULT NULL,
    `converted_at` DATETIME DEFAULT NULL,
    `total_earnings` DECIMAL(20, 8) DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_referred` (`referred_id`),
    INDEX `idx_referrer` (`referrer_id`),
    INDEX `idx_code` (`referral_code`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`referrer_id`) REFERENCES `taa_users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`referred_id`) REFERENCES `taa_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: Admin Actions
-- Audit log for admin actions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_admin_actions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` BIGINT UNSIGNED NOT NULL,
    `action_type` VARCHAR(64) NOT NULL,
    `target_type` VARCHAR(64) DEFAULT NULL,
    `target_id` BIGINT UNSIGNED DEFAULT NULL,
    `details` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_admin` (`admin_id`),
    INDEX `idx_action_type` (`action_type`),
    INDEX `idx_target` (`target_type`, `target_id`),
    INDEX `idx_created_at` (`created_at`),
    FOREIGN KEY (`admin_id`) REFERENCES `taa_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: System Alerts
-- Risk and system alerts
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_system_alerts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `alert_type` VARCHAR(64) NOT NULL,
    `severity` ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT,
    `target_type` VARCHAR(64) DEFAULT NULL,
    `target_id` BIGINT UNSIGNED DEFAULT NULL,
    `is_resolved` TINYINT(1) DEFAULT 0,
    `resolved_by` BIGINT UNSIGNED DEFAULT NULL,
    `resolved_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_type` (`alert_type`),
    INDEX `idx_severity` (`severity`),
    INDEX `idx_is_resolved` (`is_resolved`),
    INDEX `idx_created_at` (`created_at`),
    FOREIGN KEY (`resolved_by`) REFERENCES `taa_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Insert default strategies
-- -----------------------------------------------------
INSERT INTO `taa_strategies` (`name`, `description`, `category`, `risk_level`, `min_investment`, `expected_apy_min`, `expected_apy_max`, `is_official`, `is_active`) VALUES
('DCA Basic', 'Dollar-cost averaging into selected TON assets. Automatically buy at regular intervals to reduce volatility impact.', 'dca', 'low', 10, 5, 15, 1, 1),
('Yield Optimizer', 'Automatically find and rotate between the best yield farming opportunities on TON DeFi protocols.', 'yield', 'medium', 50, 15, 40, 1, 1),
('Liquidity Manager', 'Manage concentrated liquidity positions across TON DEXes for optimized fee capture.', 'liquidity', 'medium', 100, 20, 50, 1, 1),
('Portfolio Rebalancer', 'Automatically rebalance your portfolio based on target allocations. Maintain optimal diversification.', 'rebalancing', 'low', 25, 8, 20, 1, 1),
('DEX Arbitrage', 'Capture price differences across TON DEXes. High frequency, algorithmically optimized execution.', 'arbitrage', 'high', 200, 30, 100, 1, 1);

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------
-- Table: Agent Executions (Issue #249 — End-to-End Trading Flow)
-- Records every call to POST /api/agent/execute
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_agent_executions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `strategy` VARCHAR(50) NOT NULL,
    `pair` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(20, 8) NOT NULL,
    `mode` ENUM('demo', 'live') NOT NULL DEFAULT 'demo',
    `signal` ENUM('buy', 'sell', 'hold', 'none') DEFAULT NULL,
    `trade_executed` TINYINT(1) DEFAULT 0,
    `pnl_delta` DECIMAL(20, 8) DEFAULT 0,
    `execution_price` DECIMAL(20, 8) DEFAULT NULL,
    `slippage_bps` SMALLINT UNSIGNED DEFAULT NULL,
    `dex` VARCHAR(20) DEFAULT NULL,
    `status` ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_user` (`user_id`),
    INDEX `idx_strategy` (`strategy`),
    INDEX `idx_pair` (`pair`),
    INDEX `idx_mode` (`mode`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `taa_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: Portfolio History (Issue #255 — Trade History & Analytics)
-- Daily snapshots of each user's portfolio value for equity curve
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `taa_portfolio_history` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `snapshot_date` DATE NOT NULL,
    `portfolio_value` DECIMAL(20, 8) NOT NULL DEFAULT 0,
    `realized_pnl` DECIMAL(20, 8) NOT NULL DEFAULT 0,
    `unrealized_pnl` DECIMAL(20, 8) NOT NULL DEFAULT 0,
    `total_pnl` DECIMAL(20, 8) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_date` (`user_id`, `snapshot_date`),
    INDEX `idx_user` (`user_id`),
    INDEX `idx_snapshot_date` (`snapshot_date`),
    FOREIGN KEY (`user_id`) REFERENCES `taa_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Migration: Trade History & Analytics (Issue #255)
-- Add execution_price, slippage, dex fields to agent executions
-- Run on existing installations:
-- ALTER TABLE `taa_agent_executions`
--     ADD COLUMN IF NOT EXISTS `execution_price` DECIMAL(20, 8) DEFAULT NULL AFTER `pnl_delta`,
--     ADD COLUMN IF NOT EXISTS `slippage_bps` SMALLINT UNSIGNED DEFAULT NULL AFTER `execution_price`,
--     ADD COLUMN IF NOT EXISTS `dex` VARCHAR(20) DEFAULT NULL AFTER `slippage_bps`;
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Migration: TON Wallet Integration (Issue #233)
-- Run these statements on existing installations to add
-- the wallet-related columns without rebuilding the schema.
-- -----------------------------------------------------
-- ALTER TABLE `taa_users`
--     ADD COLUMN IF NOT EXISTS `wallet_connected_at` DATETIME DEFAULT NULL AFTER `wallet_address`,
--     ADD INDEX IF NOT EXISTS `idx_wallet_address` (`wallet_address`);
--
-- ALTER TABLE `taa_agents`
--     ADD COLUMN IF NOT EXISTS `owner_wallet` VARCHAR(128) DEFAULT NULL
--         COMMENT 'TON wallet address of the agent owner (set at deploy time)'
--         AFTER `wallet_address`,
--     ADD INDEX IF NOT EXISTS `idx_owner_wallet` (`owner_wallet`);
