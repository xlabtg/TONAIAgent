<?php
/**
 * Step 8: Admin Dashboard Setup
 *
 * - Create super admin account
 * - Set localization preferences
 * - Generate configuration files
 * - Finalize installation
 *
 * Fixed: HTTP 500 error by adding comprehensive error handling
 */

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        installerLog('Step 8: Processing admin account setup');

        $telegramId = trim($_POST['admin_tg_id'] ?? '');
        $username = trim($_POST['admin_username'] ?? '');
        $email = trim($_POST['admin_email'] ?? '');
        $password = $_POST['admin_password'] ?? '';
        $passwordConfirm = $_POST['admin_password_confirm'] ?? '';
        $locale = trim($_POST['admin_locale'] ?? 'en');
        $timezone = trim($_POST['admin_timezone'] ?? 'UTC');

        // Validate inputs
        $errors = [];

        if (empty($username)) {
            $errors[] = __('error_required');
        }

        if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = __('error_invalid_email');
        }

        if (!empty($password)) {
            if (strlen($password) < 8) {
                $errors[] = __('error_password_weak');
            }
            if ($password !== $passwordConfirm) {
                $errors[] = __('error_password_mismatch');
            }
        }

        if (!empty($errors)) {
            installerLog('Step 8: Validation errors: ' . implode(', ', $errors), 'warning');
            $_SESSION['installer_error'] = implode(' ', $errors);
            header('Location: ?step=8');
            exit;
        }

        // Hash password if provided
        $passwordHash = null;
        if (!empty($password)) {
            if (defined('PASSWORD_ARGON2ID')) {
                $passwordHash = password_hash($password, PASSWORD_ARGON2ID);
            } else {
                $passwordHash = password_hash($password, PASSWORD_BCRYPT);
            }
        }

        // Save admin config
        $_SESSION['installer_admin'] = [
            'telegram_id' => $telegramId,
            'username' => $username,
            'email' => $email,
            'password_hash' => $passwordHash,
            'locale' => $locale,
            'timezone' => $timezone,
        ];

        installerLog('Step 8: Admin config saved, starting finalization');

        // Now finalize installation - generate config files
        $result = finalizeInstallation();

        if ($result['success']) {
            // Mark as installed
            $installedFile = APP_ROOT . '/.installed';
            if (!@file_put_contents($installedFile, date('Y-m-d H:i:s'))) {
                installerLog('Warning: Could not create .installed marker file', 'warning');
            }

            installerLog('Step 8: Installation completed successfully');
            $_SESSION['installer_success'] = __('admin_created');
            header('Location: ?step=9');
            exit;
        } else {
            installerLog('Step 8: Installation failed: ' . $result['error'], 'error');
            $_SESSION['installer_error'] = $result['error'];
            header('Location: ?step=8');
            exit;
        }

    } catch (Exception $e) {
        installerLog('Step 8: Exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString(), 'error');
        $_SESSION['installer_error'] = 'An error occurred during installation. Please check the logs.';
        header('Location: ?step=8');
        exit;
    }
}

/**
 * Generate all configuration files with comprehensive error handling
 */
function finalizeInstallation(): array {
    try {
        $db = $_SESSION['installer_db'] ?? [];
        $tg = $_SESSION['installer_telegram'] ?? [];
        $miniapp = $_SESSION['installer_miniapp'] ?? [];
        $ai = $_SESSION['installer_ai'] ?? [];
        $ton = $_SESSION['installer_ton'] ?? [];
        $sec = $_SESSION['installer_security'] ?? [];
        $admin = $_SESSION['installer_admin'] ?? [];

        installerLog('Finalize: Starting configuration generation');

        // Validate required session data
        if (empty($db) || empty($db['host'])) {
            return ['success' => false, 'error' => 'Database configuration missing. Please go back to Step 2.'];
        }

        // Ensure all directories exist
        $dirs = [
            APP_ROOT . '/telegram-miniapp',
            APP_ROOT . '/telegram-miniapp/app',
            APP_ROOT . '/telegram-miniapp/logs',
            APP_ROOT . '/telegram-miniapp/cache',
            APP_ROOT . '/telegram-miniapp/storage',
        ];

        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                if (!@mkdir($dir, 0755, true)) {
                    installerLog("Finalize: Failed to create directory: $dir", 'error');
                    return ['success' => false, 'error' => "Could not create directory: $dir. Please check permissions."];
                }
                installerLog("Finalize: Created directory: $dir");
            }

            // Verify directory is writable
            if (!is_writable($dir)) {
                installerLog("Finalize: Directory not writable: $dir", 'error');
                return ['success' => false, 'error' => "Directory not writable: $dir. Please run: chmod 755 $dir"];
            }
        }

        // Generate config.php content
        installerLog('Finalize: Generating config.php');
        $config = generateConfigFile($db, $tg, $miniapp, $ai, $ton, $sec, $admin);

        // Write config file to telegram-miniapp/app/config.php
        $configPath = APP_ROOT . '/telegram-miniapp/app/config.php';
        if (@file_put_contents($configPath, $config) === false) {
            $error = error_get_last();
            installerLog("Finalize: Failed to write config.php: " . ($error['message'] ?? 'Unknown error'), 'error');
            return ['success' => false, 'error' => 'Could not write config.php. Please check permissions.'];
        }
        @chmod($configPath, 0600);
        installerLog('Finalize: config.php written successfully');

        // Generate .env file
        installerLog('Finalize: Generating .env file');
        $env = generateEnvFile($db, $tg, $miniapp, $ai, $ton, $sec);
        $envPath = APP_ROOT . '/telegram-miniapp/.env';
        if (@file_put_contents($envPath, $env) === false) {
            installerLog('Finalize: Warning - could not write .env file', 'warning');
        } else {
            @chmod($envPath, 0600);
            installerLog('Finalize: .env written successfully');
        }

        // Set up webhook if we have a valid bot token
        if (!empty($tg['bot_token']) && !empty($tg['webhook_url'])) {
            installerLog('Finalize: Setting up Telegram webhook');
            try {
                $webhookSecret = $sec['webhook_secret'] ?? '';
                $ch = curl_init("https://api.telegram.org/bot{$tg['bot_token']}/setWebhook");
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode([
                        'url' => $tg['webhook_url'],
                        'secret_token' => $webhookSecret,
                        'allowed_updates' => ['message', 'callback_query', 'inline_query'],
                    ]),
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 30,
                ]);
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode === 200) {
                    installerLog('Finalize: Webhook set successfully');
                } else {
                    installerLog("Finalize: Webhook setup returned HTTP $httpCode: $response", 'warning');
                }
            } catch (Exception $e) {
                installerLog('Finalize: Webhook setup failed: ' . $e->getMessage(), 'warning');
            }
        }

        // Create admin user in database
        if (!empty($db['host']) && !empty($admin['username'])) {
            installerLog('Finalize: Creating admin user in database');
            try {
                $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['database']};charset=utf8mb4";
                $pdo = new PDO($dsn, $db['username'], $db['password'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 10,
                ]);

                $prefix = $db['prefix'] ?? 'taa_';
                $telegramId = $admin['telegram_id'] ?: mt_rand(100000000, 999999999);

                // Check if table exists
                $stmt = $pdo->query("SHOW TABLES LIKE '{$prefix}users'");
                if ($stmt->rowCount() > 0) {
                    // Insert admin user
                    $stmt = $pdo->prepare("
                        INSERT INTO {$prefix}users (telegram_id, username, first_name, language_code, subscription_tier, created_at)
                        VALUES (?, ?, ?, ?, 'institutional', NOW())
                        ON DUPLICATE KEY UPDATE username = VALUES(username)
                    ");
                    $stmt->execute([$telegramId, $admin['username'], 'Admin', $admin['locale'] ?? 'en']);
                    installerLog('Finalize: Admin user created successfully');
                } else {
                    installerLog('Finalize: Users table does not exist, skipping admin user creation', 'warning');
                }

            } catch (PDOException $e) {
                // Log but continue - not critical
                installerLog('Finalize: Admin user creation failed: ' . $e->getMessage(), 'warning');
            }
        }

        installerLog('Finalize: Installation completed successfully');
        return ['success' => true, 'error' => null];

    } catch (Exception $e) {
        installerLog('Finalize: Exception: ' . $e->getMessage(), 'error');
        return ['success' => false, 'error' => 'Installation failed: ' . $e->getMessage()];
    }
}

/**
 * Generate config.php content with proper escaping
 */
function generateConfigFile($db, $tg, $miniapp, $ai, $ton, $sec, $admin): string {
    $date = date('Y-m-d H:i:s');

    // Escape values for PHP
    $escape = function($val) {
        return addslashes((string)($val ?? ''));
    };

    // Safely get nested values
    $getAiKey = function($provider, $key) use ($ai, $escape) {
        return $escape($ai['providers'][$provider][$key] ?? '');
    };

    // Default values for security settings
    $csrfEnabled = isset($sec['csrf_enabled']) ? ($sec['csrf_enabled'] ? 'true' : 'false') : 'true';
    $rateLimitEnabled = isset($sec['rate_limit']['enabled']) ? ($sec['rate_limit']['enabled'] ? 'true' : 'false') : 'true';
    $rateMax = $sec['rate_limit']['max_requests'] ?? 60;
    $rateWindow = $sec['rate_limit']['time_window'] ?? 60;
    $sessionLifetime = $sec['session']['lifetime'] ?? 7200;

    // Database port needs to be pre-computed for HEREDOC
    $dbPort = (int)($db['port'] ?? 3306);

    return <<<PHP
<?php
/**
 * TON AI Agent - Configuration File
 * Generated by installer on {$date}
 *
 * IMPORTANT: Keep this file secure and outside public web root
 */

// Prevent direct access
if (basename(\$_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Direct access forbidden');
}

return [
    'app' => [
        'name' => 'TON AI Agent',
        'version' => '2.0.0',
        'env' => 'production',
        'debug' => false,
        'url' => '{$escape($miniapp['url'] ?? '')}',
        'timezone' => '{$escape($admin['timezone'] ?? 'UTC')}',
        'secret_key' => '{$escape($sec['app_secret'] ?? '')}',
    ],

    'database' => [
        'driver' => 'mysql',
        'host' => '{$escape($db['host'] ?? 'localhost')}',
        'port' => {$dbPort},
        'database' => '{$escape($db['database'] ?? '')}',
        'username' => '{$escape($db['username'] ?? '')}',
        'password' => '{$escape($db['password'] ?? '')}',
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => '{$escape($db['prefix'] ?? 'taa_')}',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ],
    ],

    'telegram' => [
        'bot_token' => '{$escape($tg['bot_token'] ?? '')}',
        'bot_username' => '{$escape($tg['bot_username'] ?? '')}',
        'webhook_secret' => '{$escape($sec['webhook_secret'] ?? '')}',
        'mini_app_url' => '{$escape($miniapp['url'] ?? '')}',
        'verify_signature' => true,
    ],

    'ton' => [
        'network' => '{$escape($ton['network'] ?? 'mainnet')}',
        'rpc_endpoint' => '{$escape($ton['rpc_endpoint'] ?? '')}',
        'api_key' => '{$escape($ton['api_key'] ?? '')}',
        'wallet_version' => '{$escape($ton['wallet_version'] ?? 'v4r2')}',
    ],

    'ai' => [
        'default_provider' => '{$escape($ai['default_provider'] ?? 'groq')}',
        'providers' => [
            'groq' => [
                'api_key' => '{$getAiKey('groq', 'api_key')}',
                'model' => '{$getAiKey('groq', 'model')}',
                'max_tokens' => 4096,
            ],
            'openai' => [
                'api_key' => '{$getAiKey('openai', 'api_key')}',
                'model' => '{$getAiKey('openai', 'model')}',
                'max_tokens' => 4096,
            ],
            'anthropic' => [
                'api_key' => '{$getAiKey('anthropic', 'api_key')}',
                'model' => '{$getAiKey('anthropic', 'model')}',
                'max_tokens' => 4096,
            ],
            'google' => [
                'api_key' => '{$getAiKey('google', 'api_key')}',
                'model' => '{$getAiKey('google', 'model')}',
                'max_tokens' => 4096,
            ],
            'xai' => [
                'api_key' => '{$getAiKey('xai', 'api_key')}',
                'model' => '{$getAiKey('xai', 'model')}',
                'max_tokens' => 4096,
            ],
            'openrouter' => [
                'api_key' => '{$getAiKey('openrouter', 'api_key')}',
                'model' => '{$getAiKey('openrouter', 'model')}',
                'max_tokens' => 4096,
            ],
        ],
        'server_side_only' => true,
    ],

    'security' => [
        'csrf' => [
            'enabled' => {$csrfEnabled},
            'token_name' => '_csrf_token',
            'token_length' => 32,
        ],
        'rate_limit' => [
            'enabled' => {$rateLimitEnabled},
            'max_requests' => {$rateMax},
            'time_window' => {$rateWindow},
        ],
        'session' => [
            'name' => 'TAASESSID',
            'lifetime' => {$sessionLifetime},
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Strict',
        ],
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
    ],

    'logging' => [
        'enabled' => true,
        'level' => 'info',
        'path' => __DIR__ . '/../logs',
        'max_files' => 30,
    ],

    'cache' => [
        'driver' => 'file',
        'path' => __DIR__ . '/../cache',
        'ttl' => 3600,
        'prefix' => 'taa_cache_',
    ],

    'revenue' => [
        'performance_fee_percent' => 15,
        'management_fee_percent' => 2,
        'platform_share' => 30,
        'min_withdrawal' => 10,
    ],

    'premium' => [
        'tiers' => [
            'basic' => ['price' => 0, 'max_agents' => 1],
            'pro' => ['price' => 29, 'max_agents' => 5],
            'institutional' => ['price' => 299, 'max_agents' => 50],
        ],
    ],

    'localization' => [
        'default_locale' => '{$escape($admin['locale'] ?? 'en')}',
        'supported_locales' => ['en', 'ru', 'zh', 'ar'],
        'fallback_locale' => 'en',
    ],
];
PHP;
}

/**
 * Generate .env file content with safe value handling
 */
function generateEnvFile($db, $tg, $miniapp, $ai, $ton, $sec): string {
    $date = date('Y-m-d H:i:s');

    // Safe getter for nested values
    $getVal = function($arr, ...$keys) {
        $val = $arr;
        foreach ($keys as $key) {
            $val = $val[$key] ?? '';
            if ($val === '') return '';
        }
        return $val;
    };

    return <<<ENV
# TON AI Agent - Environment Configuration
# Generated by installer on {$date}
# NEVER commit this file to version control

# Application
APP_ENV=production
APP_DEBUG=false
APP_URL={$getVal($miniapp, 'url')}
APP_SECRET={$getVal($sec, 'app_secret')}
APP_TIMEZONE=UTC

# Database
DB_HOST={$getVal($db, 'host')}
DB_PORT={$getVal($db, 'port')}
DB_DATABASE={$getVal($db, 'database')}
DB_USERNAME={$getVal($db, 'username')}
DB_PASSWORD={$getVal($db, 'password')}
DB_PREFIX={$getVal($db, 'prefix')}

# Telegram Bot
TELEGRAM_BOT_TOKEN={$getVal($tg, 'bot_token')}
TELEGRAM_BOT_USERNAME={$getVal($tg, 'bot_username')}
TELEGRAM_WEBHOOK_SECRET={$getVal($sec, 'webhook_secret')}
TELEGRAM_MINI_APP_URL={$getVal($miniapp, 'url')}

# TON Blockchain
TON_NETWORK={$getVal($ton, 'network')}
TON_RPC_ENDPOINT={$getVal($ton, 'rpc_endpoint')}
TON_API_KEY={$getVal($ton, 'api_key')}

# AI Providers
AI_DEFAULT_PROVIDER={$getVal($ai, 'default_provider')}
GROQ_API_KEY={$getVal($ai, 'providers', 'groq', 'api_key')}
GROQ_MODEL={$getVal($ai, 'providers', 'groq', 'model')}
OPENAI_API_KEY={$getVal($ai, 'providers', 'openai', 'api_key')}
OPENAI_MODEL={$getVal($ai, 'providers', 'openai', 'model')}
ANTHROPIC_API_KEY={$getVal($ai, 'providers', 'anthropic', 'api_key')}
ANTHROPIC_MODEL={$getVal($ai, 'providers', 'anthropic', 'model')}
GOOGLE_API_KEY={$getVal($ai, 'providers', 'google', 'api_key')}
GOOGLE_MODEL={$getVal($ai, 'providers', 'google', 'model')}
XAI_API_KEY={$getVal($ai, 'providers', 'xai', 'api_key')}
XAI_MODEL={$getVal($ai, 'providers', 'xai', 'model')}
OPENROUTER_API_KEY={$getVal($ai, 'providers', 'openrouter', 'api_key')}
OPENROUTER_MODEL={$getVal($ai, 'providers', 'openrouter', 'model')}

# Cache
CACHE_DRIVER=file

# Logging
LOG_LEVEL=info
ENV;
}

// Load saved values
$savedAdmin = $_SESSION['installer_admin'] ?? [];

$stepData['admin'] = [
    'telegram_id' => $savedAdmin['telegram_id'] ?? '',
    'username' => $savedAdmin['username'] ?? 'admin',
    'email' => $savedAdmin['email'] ?? '',
    'locale' => $savedAdmin['locale'] ?? 'en',
    'timezone' => $savedAdmin['timezone'] ?? 'UTC',
];
