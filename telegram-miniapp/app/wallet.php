<?php
/**
 * TON AI Agent - Wallet Functions
 *
 * Library of functions for TON wallet connect / disconnect operations.
 * Included by index.php and used via the /api/wallet route.
 *
 * @see telegram-miniapp/public/index.php for routing
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Direct access forbidden');
}

/**
 * Validate a TON user-friendly wallet address.
 *
 * TON supports two address formats:
 *   - User-friendly: 48 base64url characters (e.g. EQC..., UQ...)
 *   - Raw: workchain:hex  (e.g. 0:abcdef...64hex)
 *
 * @param string $address
 * @return bool
 */
function isValidTonAddress(string $address): bool
{
    // User-friendly format (48 base64url chars)
    if (preg_match('/^[A-Za-z0-9_\-+\/]{48}$/', $address)) {
        return true;
    }
    // Raw hex format with workchain prefix
    if (preg_match('/^-?[0-9]+:[0-9a-fA-F]{64}$/', $address)) {
        return true;
    }
    return false;
}

/**
 * Handle wallet connect / disconnect / status requests.
 *
 * Called by index.php route handler for POST /api/wallet.
 * Reads the raw JSON body, validates Telegram initData from the request header,
 * and dispatches to the appropriate sub-handler.
 */
function handleWallet(): void
{
    // Read and decode JSON body
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody, true);

    if (!is_array($payload)) {
        jsonResponse(['error' => 'Invalid JSON payload'], 400);
        return;
    }

    // Authenticate via Telegram initData
    $initData = trim($_SERVER['HTTP_X_TELEGRAM_INIT_DATA'] ?? '');

    if (empty($initData)) {
        jsonResponse(['error' => 'Missing Telegram authentication data'], 401);
        return;
    }

    // Load bot token from config
    $configFile = APP_ROOT . '/app/config.php';
    if (!file_exists($configFile)) {
        error_log('[wallet] Config file not found');
        jsonResponse(['error' => 'Server configuration error'], 500);
        return;
    }
    $config = require $configFile;
    $botToken = $config['telegram']['bot_token'] ?? '';

    if (empty($botToken)) {
        error_log('[wallet] Telegram bot token not configured');
        jsonResponse(['error' => 'Server configuration error'], 500);
        return;
    }

    // Verify Telegram signature
    if (!Security::verifyTelegramWebAppData($initData, $botToken)) {
        error_log('[wallet] initData verification failed');
        jsonResponse(['error' => 'Invalid Telegram authentication'], 401);
        return;
    }

    // Parse Telegram user from initData
    $telegramUser = Security::parseTelegramUser($initData);
    if (!$telegramUser || empty($telegramUser['id'])) {
        jsonResponse(['error' => 'Could not identify Telegram user'], 401);
        return;
    }

    $telegramId = (int) $telegramUser['id'];

    // Rate limit: max 20 wallet operations per session
    $rateLimitKey = 'wallet_ops_' . $telegramId;
    $_SESSION[$rateLimitKey] = ($_SESSION[$rateLimitKey] ?? 0) + 1;
    if ($_SESSION[$rateLimitKey] > 20) {
        jsonResponse(['error' => 'Rate limit exceeded. Please try again later.'], 429);
        return;
    }

    // Dispatch to sub-action
    $action = Security::sanitizeString($payload['action'] ?? '');

    switch ($action) {
        case 'connect':
            walletConnect($telegramId, $payload);
            break;

        case 'disconnect':
            walletDisconnect($telegramId);
            break;

        case 'status':
            walletStatus($telegramId);
            break;

        default:
            jsonResponse(['error' => 'Unknown wallet action: ' . htmlspecialchars($action, ENT_QUOTES)], 400);
    }
}

/**
 * Connect a wallet: validate address and store it for the user.
 *
 * @param int   $telegramId Verified Telegram user ID
 * @param array $payload    Decoded request payload
 */
function walletConnect(int $telegramId, array $payload): void
{
    $walletAddress = Security::sanitizeString($payload['wallet_address'] ?? '');
    $walletName    = Security::sanitizeString($payload['wallet_name']    ?? 'unknown');

    if (empty($walletAddress)) {
        jsonResponse(['error' => 'wallet_address is required'], 400);
        return;
    }

    if (!isValidTonAddress($walletAddress)) {
        jsonResponse(['error' => 'Invalid TON wallet address format'], 400);
        return;
    }

    // Truncate wallet name to a safe length
    $walletName = substr($walletName, 0, 64);

    try {
        $db = Database::getInstance();

        // Check if user exists
        $stmt = $db->prepare(
            'SELECT id FROM taa_users WHERE telegram_id = :telegram_id LIMIT 1'
        );
        $stmt->execute([':telegram_id' => $telegramId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // Create minimal user record — normal sign-in creates a full record
            $stmt = $db->prepare(
                'INSERT INTO taa_users (telegram_id, wallet_address, wallet_connected_at, created_at)
                 VALUES (:telegram_id, :wallet_address, NOW(), NOW())'
            );
            $stmt->execute([
                ':telegram_id'    => $telegramId,
                ':wallet_address' => $walletAddress,
            ]);
        } else {
            $stmt = $db->prepare(
                'UPDATE taa_users
                 SET wallet_address = :wallet_address,
                     wallet_connected_at = NOW(),
                     updated_at = NOW()
                 WHERE telegram_id = :telegram_id'
            );
            $stmt->execute([
                ':wallet_address' => $walletAddress,
                ':telegram_id'    => $telegramId,
            ]);
        }

        error_log(sprintf(
            '[wallet] Connected: telegram_id=%d wallet=%s... name=%s',
            $telegramId,
            substr($walletAddress, 0, 10),
            $walletName
        ));

        jsonResponse([
            'success'        => true,
            'message'        => 'Wallet connected successfully',
            'wallet_address' => $walletAddress,
            'wallet_name'    => $walletName,
        ]);

    } catch (PDOException $e) {
        error_log('[wallet] DB error on connect: ' . $e->getMessage());
        jsonResponse(['error' => 'Database error. Please try again.'], 500);
    }
}

/**
 * Disconnect the wallet: clear wallet_address for the user.
 *
 * @param int $telegramId Verified Telegram user ID
 */
function walletDisconnect(int $telegramId): void
{
    try {
        $db = Database::getInstance();
        $stmt = $db->prepare(
            'UPDATE taa_users
             SET wallet_address = NULL,
                 wallet_connected_at = NULL,
                 updated_at = NOW()
             WHERE telegram_id = :telegram_id'
        );
        $stmt->execute([':telegram_id' => $telegramId]);

        error_log(sprintf('[wallet] Disconnected: telegram_id=%d', $telegramId));

        jsonResponse(['success' => true, 'message' => 'Wallet disconnected successfully']);

    } catch (PDOException $e) {
        error_log('[wallet] DB error on disconnect: ' . $e->getMessage());
        jsonResponse(['error' => 'Database error. Please try again.'], 500);
    }
}

/**
 * Return wallet status for the current user.
 *
 * @param int $telegramId Verified Telegram user ID
 */
function walletStatus(int $telegramId): void
{
    try {
        $db = Database::getInstance();
        $stmt = $db->prepare(
            'SELECT wallet_address, wallet_connected_at
             FROM taa_users
             WHERE telegram_id = :telegram_id
             LIMIT 1'
        );
        $stmt->execute([':telegram_id' => $telegramId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            jsonResponse(['success' => true, 'connected' => false, 'wallet_address' => null]);
            return;
        }

        jsonResponse([
            'success'              => true,
            'connected'            => !empty($row['wallet_address']),
            'wallet_address'       => $row['wallet_address'] ?? null,
            'wallet_connected_at'  => $row['wallet_connected_at'] ?? null,
        ]);

    } catch (PDOException $e) {
        error_log('[wallet] DB error on status: ' . $e->getMessage());
        jsonResponse(['error' => 'Database error. Please try again.'], 500);
    }
}
