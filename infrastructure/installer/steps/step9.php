<?php
/**
 * Step 9: Installation Complete
 *
 * - Display success message
 * - Show next steps
 * - Provide links to Mini App and Dashboard
 */

// Load configuration values from session
$tg = $_SESSION['installer_telegram'] ?? [];
$miniapp = $_SESSION['installer_miniapp'] ?? [];

$stepData['complete'] = [
    'bot_username' => $tg['bot_username'] ?? '',
    'miniapp_url' => $miniapp['url'] ?? '',
    'webhook_url' => $tg['webhook_url'] ?? '',
];

// Clear session data (keep locale)
$locale = $_SESSION['locale'] ?? 'en';
$installerKeys = ['installer_db', 'installer_telegram', 'installer_miniapp', 'installer_ai', 'installer_ton', 'installer_security', 'installer_admin', 'installer_error', 'installer_success'];
foreach ($installerKeys as $key) {
    unset($_SESSION[$key]);
}
$_SESSION['locale'] = $locale;
