<?php
/**
 * TON AI Agent - Main Configuration File
 *
 * SECURITY: This file should be placed OUTSIDE the public web directory.
 * Never expose this file to the browser or version control.
 *
 * Copy this file and update the values for your deployment.
 * Create a .env file for environment-specific overrides.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'config.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

// Load environment variables if .env exists
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

/**
 * Get environment variable with fallback
 */
function env(string $key, $default = null) {
    $value = getenv($key);
    if ($value === false) {
        $value = $_ENV[$key] ?? $default;
    }
    // Handle boolean strings
    if ($value === 'true') return true;
    if ($value === 'false') return false;
    return $value;
}

return [
    // Application Settings
    'app' => [
        'name' => env('APP_NAME', 'TON AI Agent'),
        'env' => env('APP_ENV', 'production'), // development, staging, production
        'debug' => env('APP_DEBUG', false),
        'url' => env('APP_URL', 'https://tonaiagent.com'),
        'key' => env('APP_KEY', ''), // Generate with: php -r "echo bin2hex(random_bytes(32));"
        'timezone' => env('APP_TIMEZONE', 'UTC'),
    ],

    // Database Configuration
    'database' => [
        'driver' => env('DB_DRIVER', 'mysql'),
        'host' => env('DB_HOST', 'localhost'),
        'port' => env('DB_PORT', 3306),
        'database' => env('DB_DATABASE', 'tonaiagent'),
        'username' => env('DB_USERNAME', 'tonai_user'),
        'password' => env('DB_PASSWORD', ''),
        'charset' => env('DB_CHARSET', 'utf8mb4'),
        'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
        'prefix' => env('DB_PREFIX', 'tonai_'),
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        ],
    ],

    // Telegram Bot Configuration
    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN', ''),
        'bot_username' => env('TELEGRAM_BOT_USERNAME', 'TONAIAgentBot'),
        'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET', ''),
        'mini_app_url' => env('TELEGRAM_MINI_APP_URL', ''),
        'enable_auth' => env('TELEGRAM_ENABLE_AUTH', true),
    ],

    // TON Blockchain Configuration
    'ton' => [
        'rpc_endpoint' => env('TON_RPC_ENDPOINT', 'https://toncenter.com/api/v2/jsonRPC'),
        'api_key' => env('TON_API_KEY', ''),
        'network' => env('TON_NETWORK', 'mainnet'), // mainnet, testnet
        'wallet_version' => env('TON_WALLET_VERSION', 'v4r2'),
    ],

    // AI Provider Configuration
    'ai' => [
        'default_provider' => env('AI_DEFAULT_PROVIDER', 'groq'),
        'providers' => [
            'groq' => [
                'api_key' => env('GROQ_API_KEY', ''),
                'model' => env('GROQ_MODEL', 'llama-3.1-70b-versatile'),
                'max_tokens' => env('GROQ_MAX_TOKENS', 4096),
            ],
            'openai' => [
                'api_key' => env('OPENAI_API_KEY', ''),
                'model' => env('OPENAI_MODEL', 'gpt-4-turbo-preview'),
                'max_tokens' => env('OPENAI_MAX_TOKENS', 4096),
            ],
            'anthropic' => [
                'api_key' => env('ANTHROPIC_API_KEY', ''),
                'model' => env('ANTHROPIC_MODEL', 'claude-3-opus-20240229'),
                'max_tokens' => env('ANTHROPIC_MAX_TOKENS', 4096),
            ],
        ],
    ],

    // Email Settings
    'email' => [
        'driver' => env('MAIL_DRIVER', 'smtp'), // smtp, mail, sendmail
        'host' => env('MAIL_HOST', 'smtp.mailtrap.io'),
        'port' => env('MAIL_PORT', 587),
        'username' => env('MAIL_USERNAME', ''),
        'password' => env('MAIL_PASSWORD', ''),
        'encryption' => env('MAIL_ENCRYPTION', 'tls'), // tls, ssl, null
        'from_address' => env('MAIL_FROM_ADDRESS', 'noreply@tonaiagent.com'),
        'from_name' => env('MAIL_FROM_NAME', 'TON AI Agent'),
        'admin_email' => env('ADMIN_EMAIL', 'admin@tonaiagent.com'),
    ],

    // Security Configuration
    'security' => [
        // CSRF Protection
        'csrf_enabled' => env('CSRF_ENABLED', true),
        'csrf_token_lifetime' => env('CSRF_TOKEN_LIFETIME', 3600), // seconds

        // Rate Limiting
        'rate_limit_enabled' => env('RATE_LIMIT_ENABLED', true),
        'rate_limit_requests' => env('RATE_LIMIT_REQUESTS', 60), // requests
        'rate_limit_window' => env('RATE_LIMIT_WINDOW', 60), // per seconds

        // Session
        'session_lifetime' => env('SESSION_LIFETIME', 1440), // minutes
        'session_secure' => env('SESSION_SECURE', true), // HTTPS only
        'session_httponly' => env('SESSION_HTTPONLY', true),

        // Honeypot
        'honeypot_field' => env('HONEYPOT_FIELD', 'website'),

        // reCAPTCHA
        'recaptcha_enabled' => env('RECAPTCHA_ENABLED', false),
        'recaptcha_site_key' => env('RECAPTCHA_SITE_KEY', ''),
        'recaptcha_secret_key' => env('RECAPTCHA_SECRET_KEY', ''),
    ],

    // Logging Configuration
    'logging' => [
        'enabled' => env('LOG_ENABLED', true),
        'level' => env('LOG_LEVEL', 'info'), // debug, info, warning, error
        'channel' => env('LOG_CHANNEL', 'file'), // file, database
        'path' => env('LOG_PATH', __DIR__ . '/../storage/logs/'),
        'max_files' => env('LOG_MAX_FILES', 14), // days to keep
    ],

    // Analytics Configuration
    'analytics' => [
        'google_analytics_id' => env('GOOGLE_ANALYTICS_ID', ''),
        'posthog_enabled' => env('POSTHOG_ENABLED', false),
        'posthog_key' => env('POSTHOG_KEY', ''),
    ],

    // Localization
    'localization' => [
        'default_locale' => env('DEFAULT_LOCALE', 'en'),
        'supported_locales' => ['en', 'ru', 'zh'],
        'fallback_locale' => 'en',
    ],

    // Revenue & Fees
    'revenue' => [
        'performance_fee_percent' => env('PERFORMANCE_FEE_PERCENT', 15), // %
        'platform_share' => env('PLATFORM_SHARE', 30), // % of fees
        'creator_share' => env('CREATOR_SHARE', 70), // % of fees
        'min_payout_threshold' => env('MIN_PAYOUT_THRESHOLD', 100), // TON
    ],

    // Premium Subscriptions
    'subscriptions' => [
        'tiers' => [
            'basic' => ['price' => 0, 'features' => ['basic_analytics', 'community_support']],
            'pro' => ['price' => 29, 'features' => ['advanced_analytics', 'priority_support', 'api_access']],
            'institutional' => ['price' => 299, 'features' => ['full_access', 'dedicated_support', 'custom_api', 'audit_logs']],
        ],
    ],
];
