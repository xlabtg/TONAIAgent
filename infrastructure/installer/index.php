<?php
/**
 * TON AI Agent - Professional One-Click Installer
 *
 * Enterprise-grade installer with:
 * - Comprehensive error handling and logging
 * - CSRF protection
 * - Installation recovery
 * - Pre-installation diagnostics
 * - Dynamic AI model discovery
 *
 * Installation time: < 10 minutes
 *
 * IMPORTANT: Delete the entire /installer directory after successful installation!
 *
 * @version 2.0.0
 * @license MIT
 */

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

// Error reporting - log all errors but don't display
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Define installer root and app root
define('INSTALLER_ROOT', __DIR__);
define('APP_ROOT', dirname(__DIR__));

// Create logs directory if needed
$logsDir = INSTALLER_ROOT . '/logs';
if (!is_dir($logsDir)) {
    @mkdir($logsDir, 0755, true);
}

// Custom error handler for logging
set_error_handler(function($severity, $message, $file, $line) {
    installerLog("PHP Error [$severity]: $message in $file:$line", 'error');
    return false; // Let PHP handle it too
});

// Exception handler
set_exception_handler(function($e) {
    installerLog("Uncaught Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'error');
    $_SESSION['installer_error'] = 'An unexpected error occurred. Please check the logs.';
});

// Shutdown handler for fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        installerLog("Fatal Error: {$error['message']} in {$error['file']}:{$error['line']}", 'error');
    }
});

/**
 * Log message to installer log file
 */
function installerLog(string $message, string $level = 'info'): void {
    $logsDir = INSTALLER_ROOT . '/logs';
    $logFile = $logsDir . '/install.log';

    if (!is_dir($logsDir)) {
        @mkdir($logsDir, 0755, true);
    }

    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message\n";

    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Session configuration with security settings
if (session_status() === PHP_SESSION_NONE) {
    // Configure secure session settings
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
        || (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

    session_set_cookie_params([
        'lifetime' => 7200,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Strict'
    ]);

    session_start();
}

// Generate CSRF token if not exists
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/**
 * Verify CSRF token
 */
function verifyCsrfToken(): bool {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return true;
    }

    $token = $_POST['_csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

/**
 * Get CSRF token input field
 */
function csrfField(): string {
    return '<input type="hidden" name="_csrf_token" value="' . htmlspecialchars($_SESSION['csrf_token'] ?? '') . '">';
}

// Verify CSRF on POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !verifyCsrfToken()) {
    installerLog('CSRF token verification failed', 'warning');
    $_SESSION['installer_error'] = 'Security token expired. Please try again.';
    header('Location: ' . $_SERVER['REQUEST_URI']);
    exit;
}

// Load language files
$locale = $_GET['lang'] ?? $_SESSION['locale'] ?? 'en';
$supportedLocales = ['en', 'ru', 'zh', 'ar'];
if (!in_array($locale, $supportedLocales)) {
    $locale = 'en';
}
$_SESSION['locale'] = $locale;

// Load translations
$translations = [];
$langFile = INSTALLER_ROOT . "/lang/{$locale}.php";
if (file_exists($langFile)) {
    $translations = require $langFile;
}

// Helper function for translations
function __($key, $params = []) {
    global $translations;
    $text = $translations[$key] ?? $key;
    foreach ($params as $param => $value) {
        $text = str_replace("{{$param}}", $value, $text);
    }
    return $text;
}

// Installation steps
$steps = [
    1 => ['id' => 'requirements', 'name' => __('step_requirements'), 'icon' => 'check-circle'],
    2 => ['id' => 'database', 'name' => __('step_database'), 'icon' => 'database'],
    3 => ['id' => 'telegram', 'name' => __('step_telegram'), 'icon' => 'send'],
    4 => ['id' => 'miniapp', 'name' => __('step_miniapp'), 'icon' => 'smartphone'],
    5 => ['id' => 'ai', 'name' => __('step_ai'), 'icon' => 'cpu'],
    6 => ['id' => 'ton', 'name' => __('step_ton'), 'icon' => 'hexagon'],
    7 => ['id' => 'security', 'name' => __('step_security'), 'icon' => 'shield'],
    8 => ['id' => 'admin', 'name' => __('step_admin'), 'icon' => 'user'],
    9 => ['id' => 'complete', 'name' => __('step_complete'), 'icon' => 'check'],
];

// Get current step
$currentStep = isset($_GET['step']) ? max(1, min(9, (int)$_GET['step'])) : 1;

// Log step visits
installerLog("Visiting step $currentStep");

// Check if installation is already complete
if (file_exists(APP_ROOT . '/.installed') && $currentStep !== 9) {
    header('Location: ?step=9');
    exit;
}

// Create required directories early to prevent issues
$requiredDirs = [
    APP_ROOT . '/telegram-miniapp',
    APP_ROOT . '/telegram-miniapp/app',
    APP_ROOT . '/telegram-miniapp/logs',
    APP_ROOT . '/telegram-miniapp/cache',
    APP_ROOT . '/telegram-miniapp/storage',
    INSTALLER_ROOT . '/logs',
];

foreach ($requiredDirs as $dir) {
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0755, true)) {
            installerLog("Failed to create directory: $dir", 'warning');
        } else {
            installerLog("Created directory: $dir");
        }
    }
}

// Load step handler
$stepFile = INSTALLER_ROOT . "/steps/step{$currentStep}.php";
$stepData = ['error' => null, 'success' => null, 'data' => []];

try {
    if (file_exists($stepFile)) {
        require $stepFile;
    }
} catch (Exception $e) {
    installerLog("Error in step $currentStep: " . $e->getMessage(), 'error');
    $stepData['error'] = 'An error occurred. Please try again or check the logs.';
}

// Get messages from session
$error = $_SESSION['installer_error'] ?? $stepData['error'] ?? null;
$success = $_SESSION['installer_success'] ?? $stepData['success'] ?? null;
unset($_SESSION['installer_error'], $_SESSION['installer_success']);

?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($locale) ?>" dir="<?= $locale === 'ar' ? 'rtl' : 'ltr' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title><?= __('installer_title') ?> - TON AI Agent</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #0088CC;
            --primary-dark: #006699;
            --primary-light: #00aaff;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
            --bg-dark: #0f0f1a;
            --bg-card: #1a1a2e;
            --bg-input: #252540;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --border: #334155;
            --radius: 12px;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-dark);
            color: var(--text-primary);
            min-height: 100vh;
            line-height: 1.6;
        }

        .installer-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Header */
        .header {
            text-align: center;
            padding: 40px 20px 30px;
        }

        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .logo-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logo-icon svg {
            width: 28px;
            height: 28px;
            fill: white;
        }

        .logo h1 {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary-light), var(--primary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .header p {
            color: var(--text-secondary);
            font-size: 16px;
        }

        /* Language Selector */
        .lang-selector {
            position: absolute;
            top: 20px;
            right: 20px;
        }

        .lang-selector select {
            background: var(--bg-input);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 8px 32px 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 16px;
        }

        /* Steps Progress */
        .steps-progress {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            position: relative;
            padding: 0 10px;
        }

        .steps-progress::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 30px;
            right: 30px;
            height: 2px;
            background: var(--border);
            z-index: 0;
        }

        .step-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            z-index: 1;
            flex: 1;
        }

        .step-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--bg-card);
            border: 2px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            transition: all 0.3s ease;
        }

        .step-circle svg {
            width: 18px;
            height: 18px;
            stroke: var(--text-muted);
        }

        .step-item.active .step-circle {
            background: var(--primary);
            border-color: var(--primary);
        }

        .step-item.active .step-circle svg {
            stroke: white;
        }

        .step-item.completed .step-circle {
            background: var(--success);
            border-color: var(--success);
        }

        .step-item.completed .step-circle svg {
            stroke: white;
        }

        .step-label {
            font-size: 11px;
            color: var(--text-muted);
            text-align: center;
            max-width: 80px;
        }

        .step-item.active .step-label {
            color: var(--primary-light);
            font-weight: 500;
        }

        .step-item.completed .step-label {
            color: var(--success);
        }

        @media (max-width: 768px) {
            .step-label {
                display: none;
            }
            .step-circle {
                width: 32px;
                height: 32px;
            }
            .step-circle svg {
                width: 14px;
                height: 14px;
            }
        }

        /* Main Card */
        .card {
            background: var(--bg-card);
            border-radius: var(--radius);
            box-shadow: var(--shadow-lg);
            overflow: hidden;
        }

        .card-header {
            padding: 24px 30px;
            border-bottom: 1px solid var(--border);
        }

        .card-header h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .card-header p {
            color: var(--text-secondary);
            font-size: 14px;
        }

        .card-body {
            padding: 30px;
        }

        /* Alerts */
        .alert {
            padding: 14px 18px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .alert svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6ee7b7;
        }

        .alert-warning {
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #fcd34d;
        }

        .alert-info {
            background: rgba(0, 136, 204, 0.15);
            border: 1px solid rgba(0, 136, 204, 0.3);
            color: #7dd3fc;
        }

        /* Form Elements */
        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .form-group label .required {
            color: var(--error);
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(0, 136, 204, 0.2);
        }

        .form-control::placeholder {
            color: var(--text-muted);
        }

        .form-hint {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 6px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }

        .btn svg {
            width: 18px;
            height: 18px;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-dark);
        }

        .btn-outline {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border);
        }

        .btn-outline:hover {
            background: var(--bg-input);
            color: var(--text-primary);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-group {
            display: flex;
            gap: 12px;
            margin-top: 30px;
        }

        /* Requirements List */
        .requirements-list {
            margin-bottom: 20px;
        }

        .requirement-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 16px;
            background: var(--bg-input);
            border-radius: 8px;
            margin-bottom: 8px;
        }

        .requirement-info {
            display: flex;
            flex-direction: column;
        }

        .requirement-name {
            font-weight: 500;
        }

        .requirement-detail {
            font-size: 12px;
            color: var(--text-muted);
        }

        .requirement-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
        }

        .requirement-status.pass {
            color: var(--success);
        }

        .requirement-status.fail {
            color: var(--error);
        }

        .requirement-status.warn {
            color: var(--warning);
        }

        /* Complete Section */
        .complete-section {
            text-align: center;
            padding: 40px 20px;
        }

        .complete-icon {
            width: 80px;
            height: 80px;
            background: var(--success);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }

        .complete-icon svg {
            width: 40px;
            height: 40px;
            stroke: white;
        }

        .complete-section h2 {
            font-size: 24px;
            margin-bottom: 12px;
        }

        .complete-section p {
            color: var(--text-secondary);
            margin-bottom: 30px;
        }

        .next-steps {
            text-align: left;
            background: var(--bg-input);
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }

        .next-steps h3 {
            font-size: 16px;
            margin-bottom: 16px;
        }

        .next-steps ol {
            margin-left: 20px;
            color: var(--text-secondary);
        }

        .next-steps li {
            margin-bottom: 10px;
        }

        .next-steps code {
            background: var(--bg-dark);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 13px;
        }

        .warning-box {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
            color: #fcd34d;
            text-align: left;
        }

        /* Loading State */
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 40px;
            color: var(--text-secondary);
        }

        .spinner {
            width: 24px;
            height: 24px;
            border: 3px solid var(--border);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 30px;
            color: var(--text-muted);
            font-size: 13px;
        }

        .footer a {
            color: var(--primary-light);
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* Collapsible Section */
        .collapsible {
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 12px;
        }

        .collapsible-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 16px;
            cursor: pointer;
            background: var(--bg-input);
            border-radius: 8px;
        }

        .collapsible-header:hover {
            background: var(--bg-card);
        }

        .collapsible-content {
            padding: 16px;
            display: none;
            border-top: 1px solid var(--border);
        }

        .collapsible.open .collapsible-content {
            display: block;
        }

        .collapsible-header svg {
            width: 18px;
            height: 18px;
            stroke: var(--text-muted);
            transition: transform 0.2s;
        }

        .collapsible.open .collapsible-header svg {
            transform: rotate(180deg);
        }

        /* Provider Cards */
        .provider-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }

        .provider-card {
            padding: 16px;
            background: var(--bg-input);
            border: 2px solid var(--border);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .provider-card:hover {
            border-color: var(--primary);
        }

        .provider-card.selected {
            border-color: var(--primary);
            background: rgba(0, 136, 204, 0.1);
        }

        .provider-card input {
            display: none;
        }

        .provider-card h4 {
            font-size: 14px;
            margin-bottom: 4px;
        }

        .provider-card p {
            font-size: 12px;
            color: var(--text-muted);
        }

        /* Diagnostics Panel */
        .diagnostics-panel {
            background: var(--bg-input);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
        }

        .diagnostics-panel h4 {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .diagnostics-panel .status-icon {
            width: 16px;
            height: 16px;
        }

        .diagnostics-panel.checking {
            border: 1px solid var(--primary);
        }

        .diagnostics-panel.success {
            border: 1px solid var(--success);
        }

        .diagnostics-panel.error {
            border: 1px solid var(--error);
        }

        /* Checkbox styling */
        .form-check {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
        }

        .form-check input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
        }

        .form-check label {
            margin: 0;
            cursor: pointer;
        }

        /* Model selector with badges */
        .model-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 8px;
        }

        .model-badge.fast {
            background: rgba(16, 185, 129, 0.2);
            color: var(--success);
        }

        .model-badge.smart {
            background: rgba(0, 136, 204, 0.2);
            color: var(--primary-light);
        }

        .model-badge.new {
            background: rgba(245, 158, 11, 0.2);
            color: var(--warning);
        }
    </style>
</head>
<body>
    <div class="lang-selector">
        <select onchange="window.location.href='?step=<?= $currentStep ?>&lang=' + this.value">
            <option value="en" <?= $locale === 'en' ? 'selected' : '' ?>>English</option>
            <option value="ru" <?= $locale === 'ru' ? 'selected' : '' ?>>Русский</option>
            <option value="zh" <?= $locale === 'zh' ? 'selected' : '' ?>>中文</option>
            <option value="ar" <?= $locale === 'ar' ? 'selected' : '' ?>>العربية</option>
        </select>
    </div>

    <div class="installer-container">
        <header class="header">
            <div class="logo">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h1>TON AI Agent</h1>
            </div>
            <p><?= __('installer_subtitle') ?></p>
        </header>

        <!-- Steps Progress -->
        <div class="steps-progress">
            <?php foreach ($steps as $num => $step): ?>
            <div class="step-item <?= $num < $currentStep ? 'completed' : ($num === $currentStep ? 'active' : '') ?>">
                <div class="step-circle">
                    <?php if ($num < $currentStep): ?>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    <?php else: ?>
                        <?= getStepIcon($step['icon']) ?>
                    <?php endif; ?>
                </div>
                <span class="step-label"><?= htmlspecialchars($step['name']) ?></span>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Main Card -->
        <div class="card">
            <div class="card-header">
                <h2><?= __("step_{$currentStep}_title") ?></h2>
                <p><?= __("step_{$currentStep}_desc") ?></p>
            </div>

            <div class="card-body">
                <?php if ($error): ?>
                <div class="alert alert-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span><?= htmlspecialchars($error) ?></span>
                </div>
                <?php endif; ?>

                <?php if ($success): ?>
                <div class="alert alert-success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span><?= htmlspecialchars($success) ?></span>
                </div>
                <?php endif; ?>

                <?php
                // Include step-specific content
                $contentFile = INSTALLER_ROOT . "/templates/step{$currentStep}.php";
                if (file_exists($contentFile)) {
                    require $contentFile;
                } else {
                    echo '<p>Step content not found.</p>';
                }
                ?>
            </div>
        </div>

        <footer class="footer">
            <p>
                <?= __('footer_text') ?>
                <a href="https://github.com/xlabtg/TONAIAgent" target="_blank">GitHub</a> |
                <a href="https://t.me/tonaiagent" target="_blank">Telegram</a>
            </p>
        </footer>
    </div>

    <script>
        // Form validation
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', function(e) {
                const btn = form.querySelector('button[type="submit"]');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<span class="spinner"></span> <?= __('processing') ?>';
                }
            });
        });

        // Collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', function() {
                this.parentElement.classList.toggle('open');
            });
        });

        // Provider card selection
        document.querySelectorAll('.provider-card').forEach(card => {
            card.addEventListener('click', function() {
                const input = this.querySelector('input');
                if (input.type === 'radio') {
                    document.querySelectorAll('.provider-card').forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                    input.checked = true;
                } else if (input.type === 'checkbox') {
                    this.classList.toggle('selected');
                    input.checked = !input.checked;
                }
            });
        });
    </script>
</body>
</html>
<?php

/**
 * Get SVG icon for step
 */
function getStepIcon(string $icon): string {
    $icons = [
        'check-circle' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        'database' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
        'send' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
        'smartphone' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
        'cpu' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
        'hexagon' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>',
        'shield' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
        'user' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        'check' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    ];
    return $icons[$icon] ?? $icons['check'];
}
