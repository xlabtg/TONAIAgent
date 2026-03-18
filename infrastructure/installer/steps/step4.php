<?php
/**
 * Step 4: Telegram Mini App Setup
 *
 * - Configure Mini App URL
 * - Set app name and description
 * - Configure WebApp settings
 */

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $miniappUrl = trim($_POST['miniapp_url'] ?? '');
    $appName = trim($_POST['app_name'] ?? 'TON AI Agent');
    $appShortName = trim($_POST['app_short_name'] ?? 'TONAI');
    $appDescription = trim($_POST['app_description'] ?? '');

    if (empty($miniappUrl)) {
        $_SESSION['installer_error'] = __('error_required');
        header('Location: ?step=4');
        exit;
    }

    // Normalize URL
    $miniappUrl = rtrim($miniappUrl, '/');

    // Save to session
    $_SESSION['installer_miniapp'] = [
        'url' => $miniappUrl,
        'name' => $appName,
        'short_name' => $appShortName,
        'description' => $appDescription,
    ];

    $_SESSION['installer_success'] = __('miniapp_configured');
    header('Location: ?step=5');
    exit;
}

// Load saved values
$savedMiniapp = $_SESSION['installer_miniapp'] ?? [];
$savedTg = $_SESSION['installer_telegram'] ?? [];

// Default Mini App URL from base URL
$baseUrl = $savedTg['base_url'] ?? '';
$defaultMiniappUrl = $baseUrl ? ($baseUrl . '/app') : '';

$stepData['miniapp'] = [
    'url' => $savedMiniapp['url'] ?? $defaultMiniappUrl,
    'name' => $savedMiniapp['name'] ?? 'TON AI Agent',
    'short_name' => $savedMiniapp['short_name'] ?? 'TONAI',
    'description' => $savedMiniapp['description'] ?? 'AI-powered trading agents on TON blockchain',
];
