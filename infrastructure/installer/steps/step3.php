<?php
/**
 * Step 3: Telegram Bot Configuration (Enhanced with Auto-Provisioning)
 *
 * Features:
 * - Validate bot token via getMe API
 * - Auto-detect bot username and capabilities
 * - Configure bot commands (multi-language)
 * - Set up webhook with HTTPS detection
 * - Configure Mini App menu button
 * - Run health checks
 */

// Load the provisioner if available
$provisionerPath = APP_ROOT . '/php-app/app/telegram-provisioner.php';
if (file_exists($provisionerPath)) {
    require_once $provisionerPath;
}

// Handle AJAX validation request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'validate_token') {
    header('Content-Type: application/json');

    $botToken = trim($_POST['bot_token'] ?? '');

    if (empty($botToken)) {
        echo json_encode(['success' => false, 'error' => __('error_required')]);
        exit;
    }

    // Validate token format
    if (!preg_match('/^\d+:[A-Za-z0-9_-]{35,}$/', $botToken)) {
        echo json_encode([
            'success' => false,
            'error' => __('tg_invalid_format'),
            'suggestions' => [
                __('tg_suggestion_format'),
                __('tg_suggestion_botfather'),
            ],
        ]);
        exit;
    }

    // Use provisioner if available, otherwise fallback
    if (class_exists('TelegramBotProvisioner')) {
        $provisioner = new TelegramBotProvisioner($botToken);
        $result = $provisioner->validateToken();

        if (!$result->success) {
            echo json_encode([
                'success' => false,
                'error' => $result->message,
                'error_code' => $result->errorCode,
                'suggestions' => $result->suggestions,
            ]);
            exit;
        }

        echo json_encode([
            'success' => true,
            'bot_info' => $result->data,
            'message' => __('tg_valid'),
        ]);
        exit;
    }

    // Fallback validation
    $response = @file_get_contents("https://api.telegram.org/bot{$botToken}/getMe");
    if (!$response) {
        echo json_encode(['success' => false, 'error' => __('tg_invalid')]);
        exit;
    }

    $data = json_decode($response, true);
    if (!($data['ok'] ?? false)) {
        echo json_encode(['success' => false, 'error' => __('tg_invalid')]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'bot_info' => [
            'bot_id' => $data['result']['id'],
            'bot_username' => $data['result']['username'],
            'bot_first_name' => $data['result']['first_name'] ?? '',
        ],
        'message' => __('tg_valid'),
    ]);
    exit;
}

// Handle full form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['action'])) {
    $botToken = trim($_POST['bot_token'] ?? '');
    $botUsername = trim($_POST['bot_username'] ?? '');
    $setCommands = isset($_POST['set_commands']);
    $setupWebhook = isset($_POST['setup_webhook']);
    $setupMenuButton = isset($_POST['setup_menu_button']);

    if (empty($botToken)) {
        $_SESSION['installer_error'] = __('error_required');
        header('Location: ?step=3');
        exit;
    }

    // Determine app URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $baseUrl = $protocol . '://' . $host;
    $baseDir = dirname(dirname($_SERVER['REQUEST_URI'] ?? ''));
    if ($baseDir !== '/' && $baseDir !== '\\') {
        $baseUrl .= rtrim($baseDir, '/');
    }

    // Generate webhook secret
    $webhookSecret = bin2hex(random_bytes(32));
    $webhookUrl = $baseUrl . '/webhook.php';
    $miniAppUrl = $baseUrl . '/app';

    $provisioningResults = [];
    $botInfo = null;

    // Use provisioner if available
    if (class_exists('TelegramBotProvisioner')) {
        $provisioner = new TelegramBotProvisioner($botToken, true);

        // Validate token
        $tokenResult = $provisioner->validateToken();
        if (!$tokenResult->success) {
            $_SESSION['installer_error'] = $tokenResult->message;
            header('Location: ?step=3');
            exit;
        }

        $botInfo = $tokenResult->data;
        if (empty($botUsername)) {
            $botUsername = $botInfo['bot_username'] ?? '';
        }

        $provisioningResults['token'] = true;

        // Set commands if requested
        if ($setCommands) {
            $commandResult = $provisioner->setDefaultCommands(['en', 'ru', 'zh', 'ar']);
            $provisioningResults['commands'] = $commandResult->success;
            if (!$commandResult->success) {
                $provisioningResults['commands_error'] = $commandResult->message;
            }
        }

        // Set webhook if HTTPS and requested
        if ($setupWebhook && $protocol === 'https') {
            $webhookResult = $provisioner->setWebhookWithRetry($webhookUrl, $webhookSecret);
            $provisioningResults['webhook'] = $webhookResult->success;
            if (!$webhookResult->success) {
                $provisioningResults['webhook_error'] = $webhookResult->message;
            }
        }

        // Set menu button if HTTPS and requested
        if ($setupMenuButton && $protocol === 'https') {
            $menuResult = $provisioner->setChatMenuButton($miniAppUrl, 'Open TON AI Agent');
            $provisioningResults['menu_button'] = $menuResult->success;
            if (!$menuResult->success) {
                $provisioningResults['menu_button_error'] = $menuResult->message;
            }
        }

        // Get health check results
        $healthChecks = $provisioner->runHealthChecks([]);
        $provisioningResults['health_checks'] = array_map(function($check) {
            return [
                'name' => $check->name,
                'status' => $check->status,
                'message' => $check->message,
            ];
        }, $healthChecks);

    } else {
        // Fallback - basic validation only
        $response = @file_get_contents("https://api.telegram.org/bot{$botToken}/getMe");
        if (!$response) {
            $_SESSION['installer_error'] = __('tg_invalid');
            header('Location: ?step=3');
            exit;
        }

        $data = json_decode($response, true);
        if (!($data['ok'] ?? false)) {
            $_SESSION['installer_error'] = __('tg_invalid');
            header('Location: ?step=3');
            exit;
        }

        if (empty($botUsername)) {
            $botUsername = $data['result']['username'] ?? '';
        }

        $botInfo = [
            'bot_id' => $data['result']['id'],
            'bot_username' => $data['result']['username'],
        ];

        // Basic command setup
        if ($setCommands) {
            $commands = [
                ['command' => 'start', 'description' => 'Start the bot and open Mini App'],
                ['command' => 'dashboard', 'description' => 'Open your dashboard'],
                ['command' => 'agents', 'description' => 'Manage your AI agents'],
                ['command' => 'marketplace', 'description' => 'Browse strategy marketplace'],
                ['command' => 'settings', 'description' => 'Configure your settings'],
                ['command' => 'help', 'description' => 'Get help and documentation'],
            ];

            $ch = curl_init("https://api.telegram.org/bot{$botToken}/setMyCommands");
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode(['commands' => $commands]),
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30,
            ]);
            $commandResponse = curl_exec($ch);
            curl_close($ch);
            $provisioningResults['commands'] = !empty($commandResponse);
        }

        $provisioningResults['token'] = true;
    }

    // Save to session
    $_SESSION['installer_telegram'] = [
        'bot_token' => $botToken,
        'bot_username' => $botUsername,
        'bot_info' => $botInfo,
        'webhook_secret' => $webhookSecret,
        'webhook_url' => $webhookUrl,
        'mini_app_url' => $miniAppUrl,
        'base_url' => $baseUrl,
        'provisioning_results' => $provisioningResults,
    ];

    // Build success message
    $successParts = [__('tg_valid')];
    if ($provisioningResults['commands'] ?? false) {
        $successParts[] = __('tg_commands_set');
    }
    if ($provisioningResults['webhook'] ?? false) {
        $successParts[] = __('tg_webhook_set');
    }
    if ($provisioningResults['menu_button'] ?? false) {
        $successParts[] = __('tg_menu_button_set');
    }

    $_SESSION['installer_success'] = implode(' ', $successParts);
    header('Location: ?step=4');
    exit;
}

// Load saved values
$savedTg = $_SESSION['installer_telegram'] ?? [];

// Detect base URL and HTTPS
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl = $savedTg['base_url'] ?? ($protocol . '://' . $host);
$isHttps = strpos($baseUrl, 'https://') === 0;

$stepData['telegram'] = [
    'bot_token' => $savedTg['bot_token'] ?? '',
    'bot_username' => $savedTg['bot_username'] ?? '',
    'webhook_url' => $savedTg['webhook_url'] ?? ($baseUrl . '/webhook.php'),
    'mini_app_url' => $savedTg['mini_app_url'] ?? ($baseUrl . '/app'),
    'base_url' => $baseUrl,
    'is_https' => $isHttps,
    'provisioning_results' => $savedTg['provisioning_results'] ?? [],
];
