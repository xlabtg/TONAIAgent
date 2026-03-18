<?php
/**
 * Step 7: Security Layer Initialization
 *
 * - Generate application secret
 * - Configure CSRF protection
 * - Set up rate limiting
 * - Configure session security
 */

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $appSecret = trim($_POST['app_secret'] ?? '');
    $webhookSecret = trim($_POST['webhook_secret'] ?? '');
    $csrfEnabled = isset($_POST['csrf_enabled']);
    $rateLimitEnabled = isset($_POST['rate_limit_enabled']);
    $rateMax = (int)($_POST['rate_max'] ?? 60);
    $rateWindow = (int)($_POST['rate_window'] ?? 60);
    $sessionLifetime = (int)($_POST['session_lifetime'] ?? 7200);

    // Generate secrets if not provided
    if (empty($appSecret)) {
        $appSecret = bin2hex(random_bytes(32));
    }

    if (empty($webhookSecret)) {
        $webhookSecret = bin2hex(random_bytes(32));
    }

    // Validate values
    $rateMax = max(10, min(1000, $rateMax));
    $rateWindow = max(10, min(3600, $rateWindow));
    $sessionLifetime = max(300, min(86400, $sessionLifetime));

    // Save to session
    $_SESSION['installer_security'] = [
        'app_secret' => $appSecret,
        'webhook_secret' => $webhookSecret,
        'csrf_enabled' => $csrfEnabled,
        'rate_limit' => [
            'enabled' => $rateLimitEnabled,
            'max_requests' => $rateMax,
            'time_window' => $rateWindow,
        ],
        'session' => [
            'lifetime' => $sessionLifetime,
        ],
    ];

    $_SESSION['installer_success'] = __('sec_configured');
    header('Location: ?step=8');
    exit;
}

// Load saved values
$savedSec = $_SESSION['installer_security'] ?? [];
$savedTg = $_SESSION['installer_telegram'] ?? [];

// Generate default secrets
$defaultAppSecret = bin2hex(random_bytes(32));
$defaultWebhookSecret = $savedTg['webhook_secret'] ?? bin2hex(random_bytes(32));

$stepData['security'] = [
    'app_secret' => $savedSec['app_secret'] ?? $defaultAppSecret,
    'webhook_secret' => $savedSec['webhook_secret'] ?? $defaultWebhookSecret,
    'csrf_enabled' => $savedSec['csrf_enabled'] ?? true,
    'rate_limit' => $savedSec['rate_limit'] ?? [
        'enabled' => true,
        'max_requests' => 60,
        'time_window' => 60,
    ],
    'session' => $savedSec['session'] ?? [
        'lifetime' => 7200,
    ],
];
