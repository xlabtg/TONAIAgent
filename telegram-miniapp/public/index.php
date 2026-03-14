<?php
/**
 * TON AI Agent - Telegram Mini App
 * Main entry point with routing and security
 */

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Define app paths
define('APP_ROOT', dirname(__DIR__));
define('PUBLIC_ROOT', __DIR__);

// Load application modules
require_once APP_ROOT . '/app/security.php';
require_once APP_ROOT . '/app/db.php';
require_once APP_ROOT . '/app/telegram.php';
require_once APP_ROOT . '/app/ai.php';

// Initialize security
Security::init();

// Initialize Telegram
Telegram::init();

// Get request info
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Simple router
$routes = [
    'GET' => [
        '/' => 'handleIndex',
        '/app' => 'handleApp',
        '/health' => 'handleHealth',
    ],
    'POST' => [
        '/api/auth' => 'handleAuth',
        '/api/user' => 'handleUser',
        '/api/agents' => 'handleAgents',
        '/api/strategies' => 'handleStrategies',
        '/api/ai/chat' => 'handleAiChat',
        '/webhook' => 'handleWebhook',
    ],
];

// Match route
$handler = $routes[$requestMethod][$requestUri] ?? null;

if ($handler && function_exists($handler)) {
    try {
        $handler();
    } catch (Exception $e) {
        error_log('Application error: ' . $e->getMessage());
        jsonResponse(['error' => 'Internal server error'], 500);
    }
} elseif (file_exists(PUBLIC_ROOT . $requestUri) && !is_dir(PUBLIC_ROOT . $requestUri)) {
    // Serve static files
    return false;
} else {
    // 404 Not Found
    if (str_starts_with($requestUri, '/api/')) {
        jsonResponse(['error' => 'Not found'], 404);
    } else {
        http_response_code(404);
        echo '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1></body></html>';
    }
}

// === Route Handlers ===

/**
 * Serve index page (redirect to app)
 */
function handleIndex(): void
{
    header('Location: /app');
    exit;
}

/**
 * Serve the Mini App HTML
 */
function handleApp(): void
{
    $htmlFile = PUBLIC_ROOT . '/index.html';

    if (!file_exists($htmlFile)) {
        http_response_code(500);
        echo 'App not found';
        return;
    }

    header('Content-Type: text/html; charset=utf-8');
    readfile($htmlFile);
}

/**
 * Health check endpoint
 */
function handleHealth(): void
{
    $health = [
        'status' => 'ok',
        'timestamp' => date('c'),
        'version' => '1.0.0',
    ];

    // Check database connection
    try {
        Database::getInstance();
        $health['database'] = 'connected';
    } catch (Exception $e) {
        $health['database'] = 'error';
        $health['status'] = 'degraded';
    }

    jsonResponse($health);
}

/**
 * Handle Telegram WebApp authentication
 */
function handleAuth(): void
{
    // Check rate limit
    if (!Security::checkRateLimit()) {
        jsonResponse(['error' => 'Too many requests'], 429);
        return;
    }

    // Get init data from header or body
    $initData = $_SERVER['HTTP_X_TELEGRAM_INIT_DATA'] ?? '';

    if (empty($initData)) {
        $body = json_decode(file_get_contents('php://input'), true);
        $initData = $body['init_data'] ?? '';
    }

    if (empty($initData)) {
        jsonResponse(['error' => 'Missing init data'], 400);
        return;
    }

    // Verify Telegram signature
    if (!Telegram::verifyWebAppData($initData)) {
        jsonResponse(['error' => 'Invalid signature'], 401);
        return;
    }

    // Parse user data
    $user = Telegram::parseWebAppUser($initData);

    if (!$user || !$user['id']) {
        jsonResponse(['error' => 'Invalid user data'], 400);
        return;
    }

    // Create or update user in database
    try {
        $existingUser = Database::fetchOne(
            'SELECT * FROM ' . Database::table('users') . ' WHERE telegram_id = :tid',
            ['tid' => $user['id']]
        );

        if ($existingUser) {
            // Update user
            Database::update('users', [
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'language_code' => $user['language_code'],
                'is_premium' => $user['is_premium'] ? 1 : 0,
                'last_login_at' => date('Y-m-d H:i:s'),
            ], 'telegram_id = :tid', ['tid' => $user['id']]);

            $userId = $existingUser['id'];
        } else {
            // Create user
            $userId = Database::insert('users', [
                'telegram_id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'language_code' => $user['language_code'],
                'is_premium' => $user['is_premium'] ? 1 : 0,
                'created_at' => date('Y-m-d H:i:s'),
                'last_login_at' => date('Y-m-d H:i:s'),
            ]);
        }

        // Generate session token
        $sessionToken = Security::generateToken();

        // Store session
        $_SESSION['user_id'] = $userId;
        $_SESSION['telegram_id'] = $user['id'];
        $_SESSION['session_token'] = $sessionToken;

        jsonResponse([
            'success' => true,
            'user' => [
                'id' => $userId,
                'telegram_id' => $user['id'],
                'first_name' => $user['first_name'],
                'username' => $user['username'],
            ],
            'token' => $sessionToken,
        ]);

    } catch (Exception $e) {
        error_log('Auth error: ' . $e->getMessage());
        jsonResponse(['error' => 'Authentication failed'], 500);
    }
}

/**
 * Handle user data requests
 */
function handleUser(): void
{
    requireAuth();

    $userId = $_SESSION['user_id'];

    try {
        // Get user with portfolio data
        $user = Database::fetchOne(
            'SELECT u.*,
                    COALESCE(SUM(a.current_value), 0) as portfolio_value,
                    COUNT(CASE WHEN a.status = "active" THEN 1 END) as active_agents
             FROM ' . Database::table('users') . ' u
             LEFT JOIN ' . Database::table('agents') . ' a ON a.user_id = u.id
             WHERE u.id = :id
             GROUP BY u.id',
            ['id' => $userId]
        );

        if (!$user) {
            jsonResponse(['error' => 'User not found'], 404);
            return;
        }

        jsonResponse([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'telegram_id' => $user['telegram_id'],
                'first_name' => $user['first_name'],
                'username' => $user['username'],
                'portfolio_value' => (float)$user['portfolio_value'],
                'active_agents' => (int)$user['active_agents'],
                'subscription_tier' => $user['subscription_tier'] ?? 'basic',
            ],
        ]);

    } catch (Exception $e) {
        error_log('User fetch error: ' . $e->getMessage());
        jsonResponse(['error' => 'Failed to fetch user'], 500);
    }
}

/**
 * Handle agents CRUD
 */
function handleAgents(): void
{
    requireAuth();

    $userId = $_SESSION['user_id'];
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $body['action'] ?? 'list';

    try {
        switch ($action) {
            case 'list':
                $agents = Database::fetchAll(
                    'SELECT a.*, s.name as strategy_name
                     FROM ' . Database::table('agents') . ' a
                     LEFT JOIN ' . Database::table('strategies') . ' s ON s.id = a.strategy_id
                     WHERE a.user_id = :uid
                     ORDER BY a.created_at DESC',
                    ['uid' => $userId]
                );

                jsonResponse(['success' => true, 'agents' => $agents]);
                break;

            case 'create':
                // Validate CSRF
                if (!Security::validateCsrfToken($body['_csrf_token'] ?? '')) {
                    jsonResponse(['error' => 'Invalid CSRF token'], 403);
                    return;
                }

                $strategyId = Security::sanitizeInt($body['strategy_id'] ?? 0);
                $amount = Security::sanitizeFloat($body['amount'] ?? 0);
                $name = Security::sanitizeString($body['name'] ?? 'Agent', 100);

                if ($strategyId <= 0 || $amount <= 0) {
                    jsonResponse(['error' => 'Invalid parameters'], 400);
                    return;
                }

                // Check strategy exists
                $strategy = Database::fetchOne(
                    'SELECT * FROM ' . Database::table('strategies') . ' WHERE id = :id',
                    ['id' => $strategyId]
                );

                if (!$strategy) {
                    jsonResponse(['error' => 'Strategy not found'], 404);
                    return;
                }

                // Check min investment
                if ($amount < $strategy['min_investment']) {
                    jsonResponse(['error' => 'Amount below minimum investment'], 400);
                    return;
                }

                $agentId = Database::insert('agents', [
                    'user_id' => $userId,
                    'strategy_id' => $strategyId,
                    'name' => $name,
                    'initial_investment' => $amount,
                    'current_value' => $amount,
                    'status' => 'pending',
                    'created_at' => date('Y-m-d H:i:s'),
                ]);

                // Send Telegram notification
                $telegramId = $_SESSION['telegram_id'];
                Telegram::sendAgentNotification(
                    $telegramId,
                    $name,
                    'created',
                    ['Strategy' => $strategy['name'], 'Investment' => $amount . ' TON']
                );

                jsonResponse([
                    'success' => true,
                    'agent_id' => $agentId,
                    'message' => 'Agent created successfully',
                ]);
                break;

            case 'update':
                $agentId = Security::sanitizeInt($body['agent_id'] ?? 0);
                $status = Security::sanitizeString($body['status'] ?? '', 20);

                if (!in_array($status, ['active', 'paused', 'stopped'])) {
                    jsonResponse(['error' => 'Invalid status'], 400);
                    return;
                }

                $updated = Database::update(
                    'agents',
                    ['status' => $status, 'updated_at' => date('Y-m-d H:i:s')],
                    'id = :id AND user_id = :uid',
                    ['id' => $agentId, 'uid' => $userId]
                );

                if ($updated === 0) {
                    jsonResponse(['error' => 'Agent not found'], 404);
                    return;
                }

                jsonResponse(['success' => true, 'message' => 'Agent updated']);
                break;

            default:
                jsonResponse(['error' => 'Unknown action'], 400);
        }

    } catch (Exception $e) {
        error_log('Agents error: ' . $e->getMessage());
        jsonResponse(['error' => 'Operation failed'], 500);
    }
}

/**
 * Handle strategies list
 */
function handleStrategies(): void
{
    try {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $category = Security::sanitizeString($body['category'] ?? '', 50);
        $riskLevel = Security::sanitizeString($body['risk_level'] ?? '', 20);

        $query = 'SELECT * FROM ' . Database::table('strategies') . ' WHERE is_active = 1';
        $params = [];

        if (!empty($category)) {
            $query .= ' AND category = :category';
            $params['category'] = $category;
        }

        if (!empty($riskLevel)) {
            $query .= ' AND risk_level = :risk';
            $params['risk'] = $riskLevel;
        }

        $query .= ' ORDER BY total_subscribers DESC';

        $strategies = Database::fetchAll($query, $params);

        jsonResponse(['success' => true, 'strategies' => $strategies]);

    } catch (Exception $e) {
        error_log('Strategies error: ' . $e->getMessage());
        jsonResponse(['error' => 'Failed to fetch strategies'], 500);
    }
}

/**
 * Handle AI chat (server-side only)
 */
function handleAiChat(): void
{
    requireAuth();

    // Check rate limit (stricter for AI)
    if (!Security::checkRateLimit('ai_' . $_SESSION['user_id'])) {
        jsonResponse(['error' => 'AI rate limit exceeded'], 429);
        return;
    }

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $message = Security::sanitizeString($body['message'] ?? '', 2000);
    $type = Security::sanitizeString($body['type'] ?? 'chat', 50);

    if (empty($message)) {
        jsonResponse(['error' => 'Message required'], 400);
        return;
    }

    try {
        $result = match ($type) {
            'explain_strategy' => AI::explainStrategy(
                $body['strategy_name'] ?? '',
                $body['strategy_description'] ?? ''
            ),
            'risk_warning' => AI::generateRiskWarning(
                (float)($body['amount'] ?? 0),
                $body['strategy_type'] ?? ''
            ),
            'onboarding' => AI::onboardingHelp($message),
            default => AI::chat($message),
        };

        if (!$result['success']) {
            jsonResponse(['error' => $result['error'] ?? 'AI request failed'], 500);
            return;
        }

        jsonResponse([
            'success' => true,
            'response' => $result['content'],
            'provider' => $result['provider'] ?? 'unknown',
        ]);

    } catch (Exception $e) {
        error_log('AI error: ' . $e->getMessage());
        jsonResponse(['error' => 'AI service unavailable'], 503);
    }
}

/**
 * Handle Telegram webhook
 */
function handleWebhook(): void
{
    // Verify webhook secret
    $secret = $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '';
    $configFile = APP_ROOT . '/app/config.php';
    $config = file_exists($configFile) ? require $configFile : [];
    $expectedSecret = $config['telegram']['webhook_secret'] ?? '';

    if (!empty($expectedSecret) && !hash_equals($expectedSecret, $secret)) {
        http_response_code(401);
        exit;
    }

    $update = json_decode(file_get_contents('php://input'), true);

    if (!$update) {
        http_response_code(400);
        exit;
    }

    // Process update (Bot API 9.5 compatible)
    try {
        if (isset($update['message'])) {
            $message = $update['message'];
            $chatId = $message['chat']['id'];
            $text = $message['text'] ?? '';

            // Handle /start command
            if (str_starts_with($text, '/start')) {
                Telegram::sendMiniAppButton(
                    $chatId,
                    "Welcome to TON AI Agent! 🤖\n\nDeploy autonomous AI agents that trade and optimize yields on TON blockchain.\n\nClick the button below to get started:",
                    "🚀 Open App"
                );
            }

            // Bot API 9.5: messages may carry a sender_tag field
            if (!empty($update['message']['sender_tag'])) {
                error_log('Message sender tag: ' . $update['message']['sender_tag']);
            }
        }

        if (isset($update['callback_query'])) {
            $callbackQuery = $update['callback_query'];
            Telegram::answerCallbackQuery($callbackQuery['id']);
        }

        // Bot API 9.5: handle chat_member updates (member tagging events)
        if (isset($update['chat_member'])) {
            $chatMember = $update['chat_member'];
            // Log tag changes for monitoring; extend here to react to tag assignments
            if (isset($chatMember['new_chat_member']['tag'])) {
                error_log(sprintf(
                    'Member tag update in chat %d: user %d tag="%s"',
                    $chatMember['chat']['id'] ?? 0,
                    $chatMember['new_chat_member']['user']['id'] ?? 0,
                    $chatMember['new_chat_member']['tag']
                ));
            }
        }

    } catch (Exception $e) {
        error_log('Webhook error: ' . $e->getMessage());
    }

    // Always return 200 to Telegram
    http_response_code(200);
    echo 'OK';
}

// === Helper Functions ===

/**
 * Require authentication
 */
function requireAuth(): void
{
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Unauthorized'], 401);
        exit;
    }

    // Verify session token from header
    $token = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
    if (!empty($_SESSION['session_token']) && $token !== $_SESSION['session_token']) {
        jsonResponse(['error' => 'Invalid session'], 401);
        exit;
    }
}

/**
 * Send JSON response
 */
function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
