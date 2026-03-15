<?php
/**
 * TON AI Agent - Configuration File
 *
 * IMPORTANT: This file contains sensitive credentials.
 * - Never commit this file with real credentials to version control
 * - Keep this file outside the public web root
 * - Set restrictive file permissions (chmod 600)
 *
 * Copy this file to config.php and update with your settings.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Direct access forbidden');
}

return [
    /**
     * Application Settings
     */
    'app' => [
        'name' => 'TON AI Agent',
        'version' => '1.0.0',
        'env' => getenv('APP_ENV') ?: 'production', // development, staging, production
        'debug' => filter_var(getenv('APP_DEBUG') ?: false, FILTER_VALIDATE_BOOLEAN),
        'url' => getenv('APP_URL') ?: 'https://your-domain.com',
        'timezone' => getenv('APP_TIMEZONE') ?: 'UTC',
        'secret_key' => getenv('APP_SECRET') ?: 'CHANGE_THIS_TO_A_RANDOM_STRING_32_CHARS',
    ],

    /**
     * Database Configuration
     */
    'database' => [
        'driver' => 'mysql',
        'host' => getenv('DB_HOST') ?: 'localhost',
        'port' => (int)(getenv('DB_PORT') ?: 3306),
        'database' => getenv('DB_DATABASE') ?: 'tonaiagent',
        'username' => getenv('DB_USERNAME') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: '',
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => getenv('DB_PREFIX') ?: 'taa_',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ],
    ],

    /**
     * Telegram Bot Configuration
     */
    'telegram' => [
        'bot_token' => getenv('TELEGRAM_BOT_TOKEN') ?: '',
        'bot_username' => getenv('TELEGRAM_BOT_USERNAME') ?: '',
        'webhook_secret' => getenv('TELEGRAM_WEBHOOK_SECRET') ?: '',
        'mini_app_url' => getenv('TELEGRAM_MINI_APP_URL') ?: '',
        // Enable signature verification for WebApp data
        'verify_signature' => true,
    ],

    /**
     * TON Blockchain Configuration
     */
    'ton' => [
        'network' => getenv('TON_NETWORK') ?: 'mainnet', // mainnet, testnet
        'rpc_endpoint' => getenv('TON_RPC_ENDPOINT') ?: 'https://toncenter.com/api/v2/jsonRPC',
        'api_key' => getenv('TON_API_KEY') ?: '',
        'wallet_version' => 'v4r2',
    ],

    /**
     * AI Provider Configuration
     * Primary: Groq (fast inference)
     * Fallback: OpenAI, Anthropic
     */
    'ai' => [
        'default_provider' => getenv('AI_DEFAULT_PROVIDER') ?: 'groq',
        'providers' => [
            'groq' => [
                'api_key' => getenv('GROQ_API_KEY') ?: '',
                'model' => getenv('GROQ_MODEL') ?: 'llama-3.1-70b-versatile',
                'max_tokens' => 4096,
            ],
            'openai' => [
                'api_key' => getenv('OPENAI_API_KEY') ?: '',
                'model' => getenv('OPENAI_MODEL') ?: 'gpt-4-turbo-preview',
                'max_tokens' => 4096,
            ],
            'anthropic' => [
                'api_key' => getenv('ANTHROPIC_API_KEY') ?: '',
                'model' => getenv('ANTHROPIC_MODEL') ?: 'claude-3-opus-20240229',
                'max_tokens' => 4096,
            ],
        ],
        // AI calls must be server-side only
        'server_side_only' => true,
    ],

    /**
     * Security Configuration
     */
    'security' => [
        // CSRF Protection
        'csrf' => [
            'enabled' => true,
            'token_name' => '_csrf_token',
            'token_length' => 32,
            'cookie_name' => 'csrf_cookie',
            'cookie_httponly' => true,
            'cookie_secure' => true, // Set to false for local development without HTTPS
            'cookie_samesite' => 'Strict',
        ],
        // Rate Limiting
        'rate_limit' => [
            'enabled' => true,
            'max_requests' => 60,
            'time_window' => 60, // seconds
            'by' => 'ip', // ip, user, or both
        ],
        // Session Security
        'session' => [
            'name' => 'TAASESSID',
            'lifetime' => 7200, // 2 hours
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Strict',
        ],
        // Content Security Policy
        'csp' => [
            'enabled' => true,
            'directives' => [
                'default-src' => "'self'",
                'script-src' => "'self' 'unsafe-inline' https://telegram.org",
                'style-src' => "'self' 'unsafe-inline' https://fonts.googleapis.com",
                'font-src' => "'self' https://fonts.gstatic.com",
                'img-src' => "'self' data: https:",
                'connect-src' => "'self' https://api.telegram.org https://toncenter.com",
            ],
        ],
        // Input Validation
        'input' => [
            'max_length' => 10000,
            'allowed_html_tags' => [], // No HTML allowed by default
        ],
    ],

    /**
     * Logging Configuration
     */
    'logging' => [
        'enabled' => true,
        'level' => getenv('LOG_LEVEL') ?: 'info', // debug, info, warning, error
        'path' => __DIR__ . '/../logs',
        'max_files' => 30,
        'format' => '[%datetime%] %level%: %message% %context%',
    ],

    /**
     * Cache Configuration
     */
    'cache' => [
        'driver' => getenv('CACHE_DRIVER') ?: 'file', // file, redis, memcached
        'path' => __DIR__ . '/../cache',
        'ttl' => 3600, // 1 hour default
        'prefix' => 'taa_cache_',
        'redis' => [
            'host' => getenv('REDIS_HOST') ?: '127.0.0.1',
            'port' => (int)(getenv('REDIS_PORT') ?: 6379),
            'password' => getenv('REDIS_PASSWORD') ?: null,
        ],
    ],

    /**
     * Revenue Configuration
     */
    'revenue' => [
        'performance_fee_percent' => 15, // 15% of profits
        'management_fee_percent' => 2, // 2% annual
        'platform_share' => 30, // 30% platform, 70% creator
        'min_withdrawal' => 10, // TON
    ],

    /**
     * Premium Tiers
     */
    'premium' => [
        'tiers' => [
            'basic' => [
                'price' => 0,
                'max_agents' => 1,
                'features' => ['basic_strategies'],
            ],
            'pro' => [
                'price' => 29,
                'max_agents' => 5,
                'features' => ['all_strategies', 'ai_assistant', 'priority_support'],
            ],
            'institutional' => [
                'price' => 299,
                'max_agents' => 50,
                'features' => ['all_strategies', 'ai_assistant', 'priority_support', 'api_access', 'custom_strategies'],
            ],
        ],
    ],

    /**
     * Localization
     */
    'localization' => [
        'default_locale' => 'en',
        'supported_locales' => ['en', 'ru', 'zh'],
        'fallback_locale' => 'en',
    ],
];
