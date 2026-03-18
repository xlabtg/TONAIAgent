-- TON AI Agent - Database Schema
-- MySQL 8.0+ / MariaDB 10.3+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Users table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `telegram_id` BIGINT UNSIGNED NOT NULL,
    `username` VARCHAR(255) NULL,
    `first_name` VARCHAR(255) NULL,
    `last_name` VARCHAR(255) NULL,
    `language_code` VARCHAR(10) DEFAULT 'en',
    `is_premium` TINYINT(1) DEFAULT 0,
    `wallet_address` VARCHAR(255) NULL,
    `referred_by` BIGINT UNSIGNED NULL,
    `subscription_tier` ENUM('basic', 'pro', 'institutional') DEFAULT 'basic',
    `subscription_expires_at` DATETIME NULL,
    `privacy_consent` TINYINT(1) DEFAULT 0,
    `privacy_consent_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_telegram_id` (`telegram_id`),
    KEY `idx_username` (`username`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_referred_by` (`referred_by`),
    KEY `idx_subscription_tier` (`subscription_tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Agents table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_agents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `strategy_id` VARCHAR(64) NOT NULL,
    `status` ENUM('created', 'active', 'paused', 'stopped') DEFAULT 'created',
    `initial_balance` DECIMAL(24, 8) DEFAULT 0,
    `current_balance` DECIMAL(24, 8) DEFAULT 0,
    `total_pnl` DECIMAL(24, 8) DEFAULT 0,
    `total_trades` INT UNSIGNED DEFAULT 0,
    `winning_trades` INT UNSIGNED DEFAULT 0,
    `parameters` JSON NULL,
    `risk_level` ENUM('low', 'medium', 'high') DEFAULT 'medium',
    `max_drawdown` DECIMAL(5, 2) DEFAULT 20.00,
    `activated_at` DATETIME NULL,
    `paused_at` DATETIME NULL,
    `stopped_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_strategy_id` (`strategy_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `fk_agents_user` FOREIGN KEY (`user_id`) REFERENCES `tonai_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Strategies table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_strategies` (
    `id` VARCHAR(64) NOT NULL,
    `creator_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('accumulation', 'yield', 'liquidity', 'portfolio', 'trading') NOT NULL,
    `risk_level` ENUM('low', 'medium', 'high') DEFAULT 'medium',
    `is_template` TINYINT(1) DEFAULT 0,
    `is_public` TINYINT(1) DEFAULT 1,
    `min_investment` DECIMAL(24, 8) DEFAULT 10,
    `performance_fee` DECIMAL(5, 2) DEFAULT 10.00,
    `parameters_schema` JSON NULL,
    `default_parameters` JSON NULL,
    `total_subscribers` INT UNSIGNED DEFAULT 0,
    `total_tvl` DECIMAL(24, 8) DEFAULT 0,
    `avg_apy` DECIMAL(8, 2) DEFAULT 0,
    `avg_rating` DECIMAL(3, 2) DEFAULT 0,
    `total_ratings` INT UNSIGNED DEFAULT 0,
    `status` ENUM('draft', 'active', 'paused', 'deprecated') DEFAULT 'active',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_creator_id` (`creator_id`),
    KEY `idx_category` (`category`),
    KEY `idx_risk_level` (`risk_level`),
    KEY `idx_is_public` (`is_public`),
    KEY `idx_total_subscribers` (`total_subscribers`),
    CONSTRAINT `fk_strategies_creator` FOREIGN KEY (`creator_id`) REFERENCES `tonai_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Strategy subscriptions (copy trading)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_strategy_subscriptions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `strategy_id` VARCHAR(64) NOT NULL,
    `agent_id` BIGINT UNSIGNED NULL,
    `allocation` DECIMAL(24, 8) DEFAULT 0,
    `status` ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    `subscribed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `cancelled_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_user_strategy` (`user_id`, `strategy_id`),
    KEY `idx_strategy_id` (`strategy_id`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `tonai_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_subscriptions_strategy` FOREIGN KEY (`strategy_id`) REFERENCES `tonai_strategies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_subscriptions_agent` FOREIGN KEY (`agent_id`) REFERENCES `tonai_agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Trades table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_trades` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `agent_id` BIGINT UNSIGNED NOT NULL,
    `type` ENUM('buy', 'sell', 'swap', 'stake', 'unstake', 'claim') NOT NULL,
    `asset_in` VARCHAR(64) NOT NULL,
    `asset_out` VARCHAR(64) NULL,
    `amount_in` DECIMAL(24, 8) NOT NULL,
    `amount_out` DECIMAL(24, 8) NULL,
    `price` DECIMAL(24, 8) NULL,
    `fee` DECIMAL(24, 8) DEFAULT 0,
    `gas_used` DECIMAL(24, 8) DEFAULT 0,
    `tx_hash` VARCHAR(255) NULL,
    `status` ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
    `error_message` TEXT NULL,
    `executed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_agent_id` (`agent_id`),
    KEY `idx_type` (`type`),
    KEY `idx_status` (`status`),
    KEY `idx_executed_at` (`executed_at`),
    CONSTRAINT `fk_trades_agent` FOREIGN KEY (`agent_id`) REFERENCES `tonai_agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Revenue records
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_revenue` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type` ENUM('performance_fee', 'management_fee', 'subscription', 'referral') NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `agent_id` BIGINT UNSIGNED NULL,
    `strategy_id` VARCHAR(64) NULL,
    `amount` DECIMAL(24, 8) NOT NULL,
    `currency` VARCHAR(10) DEFAULT 'TON',
    `platform_share` DECIMAL(24, 8) DEFAULT 0,
    `creator_share` DECIMAL(24, 8) DEFAULT 0,
    `status` ENUM('pending', 'processed', 'paid') DEFAULT 'pending',
    `processed_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_type` (`type`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_agent_id` (`agent_id`),
    KEY `idx_strategy_id` (`strategy_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Referrals
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_referrals` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `referrer_id` BIGINT UNSIGNED NOT NULL,
    `referred_id` BIGINT UNSIGNED NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `status` ENUM('pending', 'active', 'rewarded') DEFAULT 'pending',
    `reward_amount` DECIMAL(24, 8) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `activated_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_referred_id` (`referred_id`),
    KEY `idx_referrer_id` (`referrer_id`),
    KEY `idx_code` (`code`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_referrals_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `tonai_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_referrals_referred` FOREIGN KEY (`referred_id`) REFERENCES `tonai_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Agent rankings (cached/computed)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_agent_rankings` (
    `agent_id` BIGINT UNSIGNED NOT NULL,
    `rank` INT UNSIGNED DEFAULT 0,
    `score` DECIMAL(10, 4) DEFAULT 0,
    `performance_score` DECIMAL(10, 4) DEFAULT 0,
    `stability_score` DECIMAL(10, 4) DEFAULT 0,
    `risk_score` DECIMAL(10, 4) DEFAULT 0,
    `reputation_score` DECIMAL(10, 4) DEFAULT 0,
    `onchain_score` DECIMAL(10, 4) DEFAULT 0,
    `pnl_30d` DECIMAL(24, 8) DEFAULT 0,
    `win_rate` DECIMAL(5, 2) DEFAULT 0,
    `sharpe_ratio` DECIMAL(8, 4) DEFAULT 0,
    `max_drawdown` DECIMAL(5, 2) DEFAULT 0,
    `calculated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`agent_id`),
    KEY `idx_rank` (`rank`),
    KEY `idx_score` (`score`),
    CONSTRAINT `fk_rankings_agent` FOREIGN KEY (`agent_id`) REFERENCES `tonai_agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Audit log
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_audit_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `action` VARCHAR(64) NOT NULL,
    `entity_type` VARCHAR(64) NULL,
    `entity_id` VARCHAR(64) NULL,
    `details` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_action` (`action`),
    KEY `idx_entity` (`entity_type`, `entity_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Rate limiting
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_rate_limits` (
    `key` VARCHAR(255) NOT NULL,
    `hits` INT UNSIGNED DEFAULT 1,
    `reset_at` DATETIME NOT NULL,
    PRIMARY KEY (`key`),
    KEY `idx_reset_at` (`reset_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_sessions` (
    `id` VARCHAR(128) NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `payload` TEXT NOT NULL,
    `last_activity` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_last_activity` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Telegram Bots (Multi-Bot Support for Enterprise)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_telegram_bots` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `bot_id` BIGINT UNSIGNED NOT NULL COMMENT 'Telegram bot user ID',
    `bot_username` VARCHAR(255) NOT NULL,
    `bot_token_hash` VARCHAR(255) NOT NULL COMMENT 'Hashed token for security',
    `bot_token_encrypted` TEXT NOT NULL COMMENT 'Encrypted token',
    `display_name` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `owner_id` BIGINT UNSIGNED NULL COMMENT 'User who owns this bot',
    `organization_id` BIGINT UNSIGNED NULL COMMENT 'For enterprise multi-tenant',
    `webhook_url` VARCHAR(512) NULL,
    `webhook_secret_hash` VARCHAR(255) NULL,
    `mini_app_url` VARCHAR(512) NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `is_primary` TINYINT(1) DEFAULT 0 COMMENT 'Primary bot for this org',
    `features` JSON NULL COMMENT 'Enabled features for this bot',
    `settings` JSON NULL COMMENT 'Bot-specific settings',
    `commands_version` VARCHAR(32) NULL COMMENT 'Track command updates',
    `last_health_check` DATETIME NULL,
    `health_status` ENUM('healthy', 'degraded', 'unhealthy', 'unknown') DEFAULT 'unknown',
    `health_details` JSON NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_bot_id` (`bot_id`),
    UNIQUE KEY `idx_bot_username` (`bot_username`),
    KEY `idx_owner_id` (`owner_id`),
    KEY `idx_organization_id` (`organization_id`),
    KEY `idx_is_active` (`is_active`),
    KEY `idx_health_status` (`health_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Telegram Auth Nonces (Replay Protection)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_telegram_nonces` (
    `nonce_hash` VARCHAR(64) NOT NULL,
    `expires_at` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`nonce_hash`),
    KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Telegram Webhook Events Log
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_telegram_webhook_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `bot_id` BIGINT UNSIGNED NOT NULL,
    `update_id` BIGINT UNSIGNED NOT NULL,
    `event_type` VARCHAR(64) NOT NULL COMMENT 'message, callback_query, etc.',
    `chat_id` BIGINT NULL,
    `user_id` BIGINT NULL,
    `payload_hash` VARCHAR(64) NOT NULL COMMENT 'For deduplication',
    `processed` TINYINT(1) DEFAULT 0,
    `processed_at` DATETIME NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_bot_update` (`bot_id`, `update_id`),
    KEY `idx_event_type` (`event_type`),
    KEY `idx_chat_id` (`chat_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_processed` (`processed`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Bot Health Check History
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_bot_health_checks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `bot_id` BIGINT UNSIGNED NOT NULL,
    `check_type` VARCHAR(64) NOT NULL COMMENT 'api, webhook, commands, etc.',
    `status` ENUM('pass', 'fail', 'warn') NOT NULL,
    `message` VARCHAR(512) NULL,
    `latency_ms` INT UNSIGNED NULL,
    `details` JSON NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_bot_id` (`bot_id`),
    KEY `idx_check_type` (`check_type`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Organizations (Enterprise Multi-Tenant)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_organizations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `owner_id` BIGINT UNSIGNED NOT NULL,
    `plan` ENUM('starter', 'professional', 'enterprise') DEFAULT 'starter',
    `max_bots` INT UNSIGNED DEFAULT 1,
    `max_users` INT UNSIGNED DEFAULT 5,
    `settings` JSON NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_slug` (`slug`),
    KEY `idx_owner_id` (`owner_id`),
    KEY `idx_plan` (`plan`),
    KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Organization Members
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_organization_members` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role` ENUM('owner', 'admin', 'operator', 'viewer') DEFAULT 'viewer',
    `permissions` JSON NULL,
    `invited_by` BIGINT UNSIGNED NULL,
    `accepted_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_org_user` (`organization_id`, `user_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_role` (`role`),
    CONSTRAINT `fk_org_members_org` FOREIGN KEY (`organization_id`) REFERENCES `tonai_organizations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_org_members_user` FOREIGN KEY (`user_id`) REFERENCES `tonai_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Bot Activity Monitoring (Enterprise)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tonai_bot_activity` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `bot_id` BIGINT UNSIGNED NOT NULL,
    `date` DATE NOT NULL,
    `hour` TINYINT UNSIGNED NULL COMMENT 'For hourly stats',
    `messages_received` INT UNSIGNED DEFAULT 0,
    `messages_sent` INT UNSIGNED DEFAULT 0,
    `callback_queries` INT UNSIGNED DEFAULT 0,
    `inline_queries` INT UNSIGNED DEFAULT 0,
    `unique_users` INT UNSIGNED DEFAULT 0,
    `mini_app_opens` INT UNSIGNED DEFAULT 0,
    `errors` INT UNSIGNED DEFAULT 0,
    `avg_response_time_ms` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_bot_date_hour` (`bot_id`, `date`, `hour`),
    KEY `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Insert default strategies
-- --------------------------------------------------------
INSERT INTO `tonai_strategies` (`id`, `name`, `description`, `category`, `risk_level`, `is_template`, `min_investment`, `performance_fee`) VALUES
('dca', 'Dollar Cost Averaging', 'Automatically invest fixed amounts at regular intervals to reduce the impact of volatility.', 'accumulation', 'low', 1, 10, 10.00),
('yield_farming', 'Yield Farming', 'Optimize returns across multiple DeFi protocols by moving funds to highest-yield opportunities.', 'yield', 'medium', 1, 100, 15.00),
('liquidity_management', 'Liquidity Management', 'Provide liquidity to DEXes and manage positions to maximize fees while minimizing impermanent loss.', 'liquidity', 'medium', 1, 500, 15.00),
('rebalancing', 'Portfolio Rebalancing', 'Maintain target portfolio allocations by automatically buying and selling assets.', 'portfolio', 'low', 1, 200, 10.00),
('arbitrage', 'Simple Arbitrage', 'Exploit price differences across exchanges for profit.', 'trading', 'high', 1, 1000, 20.00);

SET FOREIGN_KEY_CHECKS = 1;
