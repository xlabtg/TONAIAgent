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
require_once APP_ROOT . '/app/wallet.php';

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
        '/api/prices' => 'handlePrices',
        '/api/trades' => 'handleTrades',
        '/api/analytics' => 'handleAnalytics',
        '/api/portfolio/history' => 'handlePortfolioHistory',
        '/api/keys' => 'handleListApiKeys',          // Issue #271: list own API keys
    ],
    'POST' => [
        '/api/auth' => 'handleAuth',
        '/api/user' => 'handleUser',
        '/api/agents' => 'handleAgents',
        '/api/agent/execute' => 'handleAgentExecute',
        '/api/strategies' => 'handleStrategies',
        '/api/wallet' => 'handleWallet',
        '/api/ai/chat' => 'handleAiChat',
        '/webhook' => 'handleWebhook',
        '/api/keys' => 'handleCreateApiKey',         // Issue #271: create API key
        '/api/keys/revoke' => 'handleRevokeApiKey',  // Issue #271: revoke API key
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
 * Live market prices endpoint (Issue #251 — Real-Time Market Data)
 *
 * GET /api/prices
 *
 * Returns the latest prices for all MVP assets, sourced from CoinGecko/Binance
 * with a simulation fallback. This endpoint is polled by live-prices.js
 * at 1-second intervals to power the streaming price ticker in the UI.
 *
 * Response shape:
 * {
 *   "success": true,
 *   "prices": {
 *     "TON":  { "price": 5.25, "change24h": 1.23, "source": "coingecko", "timestamp": "..." },
 *     "BTC":  { "price": 65000, ... },
 *     ...
 *   },
 *   "source": "coingecko",
 *   "timestamp": "2026-03-18T12:00:00Z"
 * }
 */
function handlePrices(): void
{
    // Cache-control: short TTL so browsers don't over-cache
    header('Cache-Control: no-store, max-age=0');
    header('Access-Control-Allow-Origin: *');

    // Baseline prices (used when live APIs are unavailable)
    $baseline = [
        'TON'  => ['price' => 5.25,   'change24h' => 0.0],
        'BTC'  => ['price' => 65000,  'change24h' => 0.0],
        'ETH'  => ['price' => 3500,   'change24h' => 0.0],
        'SOL'  => ['price' => 175,    'change24h' => 0.0],
        'USDT' => ['price' => 1.00,   'change24h' => 0.0],
    ];

    $prices = [];
    $source = 'baseline';

    // Attempt to fetch live prices from CoinGecko free tier (no API key required)
    $coinGeckoIds = [
        'TON'  => 'the-open-network',
        'BTC'  => 'bitcoin',
        'ETH'  => 'ethereum',
        'SOL'  => 'solana',
        'USDT' => 'tether',
    ];
    $ids = implode(',', array_values($coinGeckoIds));
    $cgUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=' . $ids
           . '&vs_currencies=usd&include_24hr_change=true';

    $ctx = stream_context_create([
        'http' => [
            'method'  => 'GET',
            'timeout' => 3,
            'header'  => "User-Agent: TONAIAgent/1.0\r\n",
        ],
    ]);

    $raw = @file_get_contents($cgUrl, false, $ctx);
    if ($raw !== false) {
        $data = json_decode($raw, true);
        if (is_array($data)) {
            foreach ($coinGeckoIds as $symbol => $cgId) {
                if (isset($data[$cgId]['usd'])) {
                    $prices[$symbol] = [
                        'price'     => (float) $data[$cgId]['usd'],
                        'change24h' => (float) ($data[$cgId]['usd_24h_change'] ?? 0),
                        'source'    => 'coingecko',
                        'timestamp' => date('c'),
                    ];
                }
            }
            if (!empty($prices)) {
                $source = 'coingecko';
            }
        }
    }

    // Fill any missing assets from baseline
    foreach ($baseline as $symbol => $base) {
        if (!isset($prices[$symbol])) {
            $prices[$symbol] = [
                'price'     => $base['price'],
                'change24h' => $base['change24h'],
                'source'    => 'baseline',
                'timestamp' => date('c'),
            ];
        }
    }

    jsonResponse([
        'success'   => true,
        'prices'    => $prices,
        'source'    => $source,
        'timestamp' => date('c'),
    ]);
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
            // Auto-create user — role defaults to 'user', status to 'active' (Issue #271)
            $userId = Database::insert('users', [
                'telegram_id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'language_code' => $user['language_code'],
                'is_premium' => $user['is_premium'] ? 1 : 0,
                'role' => 'user',
                'status' => 'active',
                'created_at' => date('Y-m-d H:i:s'),
                'last_login_at' => date('Y-m-d H:i:s'),
            ]);
        }

        // Fetch current user record (including role/status for session binding)
        $dbUser = Database::fetchOne(
            'SELECT id, telegram_id, username, first_name, role, status FROM '
            . Database::table('users') . ' WHERE id = :id',
            ['id' => $userId]
        );

        // Guard: suspended/deleted users cannot authenticate
        if ($dbUser && in_array($dbUser['status'], ['suspended', 'deleted'], true)) {
            jsonResponse(['error' => 'Account suspended or deleted'], 403);
            return;
        }

        // Generate session token
        $sessionToken = Security::generateToken();

        // Store session — include role for downstream RBAC checks
        $_SESSION['user_id'] = $userId;
        $_SESSION['telegram_id'] = $user['id'];
        $_SESSION['session_token'] = $sessionToken;
        $_SESSION['user_role'] = $dbUser['role'] ?? 'user';

        jsonResponse([
            'success' => true,
            'user' => [
                'id' => $userId,
                'telegram_id' => $user['id'],
                'first_name' => $user['first_name'],
                'username' => $user['username'],
                'role' => $dbUser['role'] ?? 'user',
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
 * Handle end-to-end trade execution request (Issue #249)
 *
 * POST /api/agent/execute
 *
 * Payload:
 *   {
 *     "userId":   "telegram_id",   // overridden by session when authenticated
 *     "strategy": "momentum",      // momentum | arbitrage | mean-reversion
 *     "pair":     "TON/USDT",
 *     "amount":   100,
 *     "mode":     "demo | live"
 *   }
 *
 * The pipeline:
 *   Mini App → Agent Controller → Strategy Engine → Risk Engine →
 *   Execution Engine → DEX Connector → Portfolio Update → UI Update
 */
function handleAgentExecute(): void
{
    requireAuth();

    if (!Security::checkRateLimit('execute_' . ($_SESSION['user_id'] ?? 'anon'))) {
        jsonResponse(['error' => 'Rate limit exceeded'], 429);
        return;
    }

    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    // Validate required fields
    $strategy = Security::sanitizeString($body['strategy'] ?? '', 50);
    $pair     = Security::sanitizeString($body['pair'] ?? '', 20);
    $amount   = Security::sanitizeFloat($body['amount'] ?? 0);
    $mode     = Security::sanitizeString($body['mode'] ?? 'demo', 10);
    // Issue #271: agent_id for ownership validation — if provided, verify caller owns it
    $agentId  = isset($body['agent_id']) ? (int)$body['agent_id'] : null;

    // Issue #267: execution_mode controls demo vs live on-chain execution
    $executionMode   = Security::sanitizeString($body['execution_mode'] ?? 'demo', 10);
    $walletAddress   = Security::sanitizeString($body['wallet_address'] ?? '', 128);

    // Issue #271: Ownership check — if agent_id is supplied, confirm the caller owns it
    if ($agentId !== null) {
        $agentOwner = Database::fetchOne(
            'SELECT user_id FROM ' . Database::table('agents') . ' WHERE id = :id',
            ['id' => $agentId]
        );
        $sessionUserId = (int)$_SESSION['user_id'];
        $sessionRole   = $_SESSION['user_role'] ?? 'user';

        if (!$agentOwner) {
            jsonResponse(['error' => 'Agent not found'], 404);
            return;
        }
        // Only admins can execute another user's agent
        if ((int)$agentOwner['user_id'] !== $sessionUserId && $sessionRole !== 'admin') {
            jsonResponse(['error' => 'Forbidden: you do not own this agent'], 403);
            return;
        }
    }

    if (empty($strategy) || empty($pair) || $amount <= 0) {
        jsonResponse(['error' => 'strategy, pair, and amount are required'], 400);
        return;
    }

    if (!in_array($mode, ['demo', 'live'], true)) {
        jsonResponse(['error' => 'mode must be "demo" or "live"'], 400);
        return;
    }

    if (!in_array($executionMode, ['demo', 'live'], true)) {
        jsonResponse(['error' => 'execution_mode must be "demo" or "live"'], 400);
        return;
    }

    // Issue #267: Live mode requires a connected wallet address
    if ($executionMode === 'live' && empty($walletAddress)) {
        jsonResponse(['error' => 'wallet_address is required for live execution'], 400);
        return;
    }

    // Issue #267: Validate wallet address format for live mode
    if ($executionMode === 'live' && !empty($walletAddress) && !isValidTonAddress($walletAddress)) {
        jsonResponse(['error' => 'Invalid wallet address format'], 400);
        return;
    }

    // Issue #267: Maximum trade size limit for live mode (safety)
    $maxLiveTradeTon = 1000;
    if ($executionMode === 'live' && $amount > $maxLiveTradeTon) {
        jsonResponse(['error' => "Live trade amount exceeds maximum limit of {$maxLiveTradeTon} TON"], 400);
        return;
    }

    // Use the authenticated session user ID
    $userId = (string)$_SESSION['telegram_id'];

    // Validate pair format (e.g. "TON/USDT")
    if (!preg_match('/^[A-Z]{2,10}\/[A-Z]{2,10}$/', $pair)) {
        jsonResponse(['error' => 'Invalid pair format. Expected e.g. "TON/USDT"'], 400);
        return;
    }

    // Map strategy names to canonical values used by the trading engine
    $strategyMap = [
        'momentum'      => 'trend',
        'trend'         => 'trend',
        'arbitrage'     => 'arbitrage',
        'mean-reversion'=> 'ai-signal',
        'ai-signal'     => 'ai-signal',
    ];
    $canonicalStrategy = $strategyMap[$strategy] ?? 'trend';

    try {
        // Persist the execution request to the database
        $insertData = [
            'user_id'    => $_SESSION['user_id'],
            'strategy'   => $canonicalStrategy,
            'pair'       => $pair,
            'amount'     => $amount,
            'mode'       => $mode,
            'status'     => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
        ];

        // Issue #267: Include on-chain execution fields
        if ($executionMode === 'live') {
            $insertData['execution_mode'] = 'live';
            $insertData['wallet_address'] = $walletAddress;
        } else {
            $insertData['execution_mode'] = 'demo';
        }

        $executionId = Database::insert('agent_executions', $insertData);

        // Simulate the trade signal and portfolio update.
        // In 'live' mode this would route to the on-chain execution layer via
        // the SwapExecutor / DEX connectors (DeDust, STON.fi, TONCO).
        // For the MVP we return the simulated result and mark the execution as
        // completed so the UI can update immediately.
        $signal = 'hold';
        $tradeExecuted = false;
        $pnlDelta = 0.0;

        if ($mode === 'demo') {
            // Deterministic demo signal based on strategy
            $demoSignals = [
                'trend'     => 'buy',
                'arbitrage' => 'buy',
                'ai-signal' => 'hold',
            ];
            $signal = $demoSignals[$canonicalStrategy] ?? 'hold';
            $tradeExecuted = ($signal !== 'hold');
            $pnlDelta = $tradeExecuted ? round($amount * 0.012, 6) : 0.0; // 1.2 % demo gain
        }

        // Update execution record
        Database::update(
            'agent_executions',
            [
                'signal'        => $signal,
                'trade_executed'=> $tradeExecuted ? 1 : 0,
                'pnl_delta'     => $pnlDelta,
                'status'        => 'completed',
                'completed_at'  => date('Y-m-d H:i:s'),
            ],
            'id = :id',
            ['id' => $executionId]
        );

        $portfolioValueAfter = $amount + $pnlDelta;

        // Notify via Telegram if trade was executed
        if ($tradeExecuted && !empty($_SESSION['telegram_id'])) {
            Telegram::sendAgentNotification(
                $_SESSION['telegram_id'],
                'Trade Agent',
                'executed',
                [
                    'Strategy' => $strategy,
                    'Pair'     => $pair,
                    'Signal'   => strtoupper($signal),
                    'PnL'      => ($pnlDelta >= 0 ? '+' : '') . $pnlDelta . ' TON',
                    'Mode'     => $mode,
                ]
            );
        }

        $response = [
            'success'              => true,
            'agentId'              => 'exec_' . $executionId,
            'signal'               => $signal,
            'tradeExecuted'        => $tradeExecuted,
            'portfolioValueBefore' => (float)$amount,
            'portfolioValueAfter'  => (float)$portfolioValueAfter,
            'pnlDelta'             => (float)$pnlDelta,
            'pair'                 => $pair,
            'mode'                 => $mode,
            'executionMode'        => $executionMode,
            'timestamp'            => date('c'),
        ];

        // Issue #267: Include on-chain execution fields for live mode
        if ($executionMode === 'live') {
            $response['walletAddress'] = $walletAddress;
            // In production, txHash would come from the on-chain execution result.
            // The actual signing and submission happens client-side via TON Connect.
            $response['txHash'] = null;
            $response['explorerUrl'] = null;
            $response['gasFee'] = null;
        }

        jsonResponse($response);

    } catch (Exception $e) {
        error_log('Agent execute error: ' . $e->getMessage());
        jsonResponse(['error' => 'Execution failed'], 500);
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
 * GET /api/trades
 *
 * Returns paginated trade history from taa_agent_executions for the
 * authenticated user.
 *
 * Query params:
 *   page      (int, default 1)
 *   per_page  (int, default 20, max 100)
 *   sort      "desc" | "asc"  (default "desc")
 *   action    "BUY" | "SELL"  (optional filter)
 *   pair      e.g. "TON/USDT" (optional filter)
 * (Issue #255 — Trade History, Analytics & Performance Tracking)
 */
function handleTrades(): void
{
    requireAuth();

    $userId = (int)$_SESSION['user_id'];

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
    $sort    = in_array($_GET['sort'] ?? 'desc', ['asc', 'desc'], true) ? $_GET['sort'] : 'desc';
    $action  = Security::sanitizeString($_GET['action'] ?? '', 10);
    $pair    = Security::sanitizeString($_GET['pair'] ?? '', 20);

    $where  = 'user_id = :uid AND status = "completed"';
    $params = ['uid' => $userId];

    if ($action === 'BUY') {
        $where .= ' AND signal = "buy"';
    } elseif ($action === 'SELL') {
        $where .= ' AND signal = "sell"';
    }

    if (!empty($pair)) {
        $where .= ' AND pair = :pair';
        $params['pair'] = $pair;
    }

    try {
        $total = (int)Database::fetchOne(
            'SELECT COUNT(*) AS cnt FROM ' . Database::table('agent_executions') . ' WHERE ' . $where,
            $params
        )['cnt'];

        $offset = ($page - 1) * $perPage;
        $rows = Database::fetchAll(
            'SELECT id, strategy, pair, amount, mode, signal, trade_executed,
                    pnl_delta, execution_price, slippage_bps, dex, status,
                    created_at, completed_at
             FROM ' . Database::table('agent_executions') . '
             WHERE ' . $where . '
             ORDER BY created_at ' . strtoupper($sort) . '
             LIMIT :limit OFFSET :offset',
            array_merge($params, ['limit' => $perPage, 'offset' => $offset])
        );

        $trades = array_map(function ($r) {
            $action = $r['signal'] === 'buy' ? 'BUY' : ($r['signal'] === 'sell' ? 'SELL' : 'HOLD');
            $pair   = $r['pair'];
            $asset  = explode('/', $pair)[0] ?? $pair;
            return [
                'id'              => (int)$r['id'],
                'asset'           => $asset,
                'pair'            => $pair,
                'action'          => $action,
                'amount'          => (float)$r['amount'],
                'price'           => $r['execution_price'] !== null ? (float)$r['execution_price'] : null,
                'value'           => (float)$r['amount'],
                'pnl'             => (float)$r['pnl_delta'],
                'slippage_bps'    => $r['slippage_bps'] !== null ? (int)$r['slippage_bps'] : null,
                'dex'             => $r['dex'],
                'strategy_name'   => $r['strategy'],
                'mode'            => $r['mode'],
                'status'          => $r['status'],
                'timestamp'       => $r['created_at'],
            ];
        }, $rows);

        jsonResponse([
            'success' => true,
            'trades'  => $trades,
            'pagination' => [
                'page'     => $page,
                'per_page' => $perPage,
                'total'    => $total,
                'pages'    => (int)ceil($total / $perPage),
            ],
        ]);

    } catch (Exception $e) {
        error_log('Trades fetch error: ' . $e->getMessage());
        jsonResponse(['error' => 'Failed to fetch trades'], 500);
    }
}

/**
 * GET /api/analytics
 *
 * Returns aggregated performance analytics for the authenticated user
 * computed from taa_agent_executions records.
 *
 * Query params:
 *   period  "7d" | "30d" | "90d" | "all"  (default "30d")
 * (Issue #255 — Trade History, Analytics & Performance Tracking)
 */
function handleAnalytics(): void
{
    requireAuth();

    $userId = (int)$_SESSION['user_id'];
    $period = Security::sanitizeString($_GET['period'] ?? '30d', 5);

    $since = match ($period) {
        '7d'  => date('Y-m-d H:i:s', strtotime('-7 days')),
        '90d' => date('Y-m-d H:i:s', strtotime('-90 days')),
        'all' => '2000-01-01 00:00:00',
        default => date('Y-m-d H:i:s', strtotime('-30 days')),
    };

    try {
        $rows = Database::fetchAll(
            'SELECT signal, trade_executed, pnl_delta, strategy, created_at
             FROM ' . Database::table('agent_executions') . '
             WHERE user_id = :uid AND status = "completed" AND created_at >= :since',
            ['uid' => $userId, 'since' => $since]
        );

        $totalTrades    = count($rows);
        $executed       = array_filter($rows, fn($r) => (int)$r['trade_executed'] === 1);
        $pnlValues      = array_column(array_values($executed), 'pnl_delta');
        $winners        = array_filter($pnlValues, fn($p) => (float)$p > 0);
        $losers         = array_filter($pnlValues, fn($p) => (float)$p < 0);

        $totalPnL   = array_sum(array_map('floatval', $pnlValues));
        $execCount  = count($executed);
        $avgPnL     = $execCount > 0 ? $totalPnL / $execCount : 0;
        $bestTrade  = $execCount > 0 ? (float)max(array_map('floatval', $pnlValues)) : 0;
        $worstTrade = $execCount > 0 ? (float)min(array_map('floatval', $pnlValues)) : 0;
        $winRate    = $execCount > 0 ? (count($winners) / $execCount) * 100 : 0;

        $grossProfit = array_sum(array_map('floatval', $winners));
        $grossLoss   = abs(array_sum(array_map('floatval', $losers)));
        $profitFactor = $grossLoss > 0 ? $grossProfit / $grossLoss : ($grossProfit > 0 ? 999 : 0);

        // Basic Sharpe ratio (mean/stddev of PnL)
        $sharpe = 0.0;
        if (count($pnlValues) >= 2) {
            $mean = $totalPnL / count($pnlValues);
            $variance = array_sum(array_map(fn($p) => pow((float)$p - $mean, 2), $pnlValues))
                        / (count($pnlValues) - 1);
            $stdDev = sqrt($variance);
            $sharpe = $stdDev > 0 ? $mean / $stdDev : 0;
        }

        // Max drawdown
        $maxDD = 0.0;
        $peak  = 0.0;
        $cum   = 0.0;
        foreach ($pnlValues as $p) {
            $cum += (float)$p;
            if ($cum > $peak) $peak = $cum;
            $dd = $peak > 0 ? (($peak - $cum) / $peak) * 100 : 0;
            if ($dd > $maxDD) $maxDD = $dd;
        }

        // Per-strategy breakdown
        $strategyMap = [];
        foreach ($executed as $r) {
            $s = $r['strategy'];
            if (!isset($strategyMap[$s])) {
                $strategyMap[$s] = ['count' => 0, 'totalPnl' => 0, 'wins' => 0];
            }
            $strategyMap[$s]['count']++;
            $strategyMap[$s]['totalPnl'] += (float)$r['pnl_delta'];
            if ((float)$r['pnl_delta'] > 0) $strategyMap[$s]['wins']++;
        }

        $byStrategy = [];
        foreach ($strategyMap as $name => $data) {
            $byStrategy[] = [
                'strategy'  => $name,
                'count'     => $data['count'],
                'totalPnl'  => round($data['totalPnl'], 8),
                'winRate'   => $data['count'] > 0 ? round($data['wins'] / $data['count'] * 100, 2) : 0,
            ];
        }
        usort($byStrategy, fn($a, $b) => $b['totalPnl'] <=> $a['totalPnl']);

        jsonResponse([
            'success' => true,
            'period'  => $period,
            'metrics' => [
                'totalTrades'    => $totalTrades,
                'executedTrades' => $execCount,
                'winRate'        => round($winRate, 2),
                'totalPnL'       => round($totalPnL, 8),
                'avgPnL'         => round($avgPnL, 8),
                'bestTrade'      => round($bestTrade, 8),
                'worstTrade'     => round($worstTrade, 8),
                'sharpeRatio'    => round($sharpe, 4),
                'maxDrawdown'    => round($maxDD, 2),
                'profitFactor'   => round($profitFactor, 4),
            ],
            'byStrategy' => $byStrategy,
        ]);

    } catch (Exception $e) {
        error_log('Analytics error: ' . $e->getMessage());
        jsonResponse(['error' => 'Failed to compute analytics'], 500);
    }
}

/**
 * GET /api/portfolio/history
 *
 * Returns daily portfolio value snapshots for the equity curve.
 * Falls back to deriving the curve from execution PnL when no explicit
 * snapshots exist in taa_portfolio_history.
 *
 * Query params:
 *   period  "7d" | "30d" | "90d" | "all"  (default "30d")
 * (Issue #255 — Trade History, Analytics & Performance Tracking)
 */
function handlePortfolioHistory(): void
{
    requireAuth();

    $userId = (int)$_SESSION['user_id'];
    $period = Security::sanitizeString($_GET['period'] ?? '30d', 5);

    $since = match ($period) {
        '7d'  => date('Y-m-d', strtotime('-7 days')),
        '90d' => date('Y-m-d', strtotime('-90 days')),
        'all' => '2000-01-01',
        default => date('Y-m-d', strtotime('-30 days')),
    };

    try {
        // Try stored snapshots first
        $snapshots = Database::fetchAll(
            'SELECT snapshot_date, portfolio_value, realized_pnl, unrealized_pnl, total_pnl
             FROM ' . Database::table('portfolio_history') . '
             WHERE user_id = :uid AND snapshot_date >= :since
             ORDER BY snapshot_date ASC',
            ['uid' => $userId, 'since' => $since]
        );

        if (!empty($snapshots)) {
            $history = array_map(fn($r) => [
                'date'            => $r['snapshot_date'],
                'portfolio_value' => (float)$r['portfolio_value'],
                'realized_pnl'    => (float)$r['realized_pnl'],
                'unrealized_pnl'  => (float)$r['unrealized_pnl'],
                'total_pnl'       => (float)$r['total_pnl'],
            ], $snapshots);

            jsonResponse(['success' => true, 'period' => $period, 'history' => $history]);
            return;
        }

        // Derive curve from daily execution PnL sums
        $rows = Database::fetchAll(
            'SELECT DATE(created_at) AS day, SUM(pnl_delta) AS day_pnl
             FROM ' . Database::table('agent_executions') . '
             WHERE user_id = :uid AND status = "completed" AND trade_executed = 1
               AND DATE(created_at) >= :since
             GROUP BY DATE(created_at)
             ORDER BY DATE(created_at) ASC',
            ['uid' => $userId, 'since' => $since]
        );

        // Get approximate initial portfolio value
        $userRow = Database::fetchOne(
            'SELECT COALESCE(SUM(initial_investment), 0) AS init
             FROM ' . Database::table('agents') . '
             WHERE user_id = :uid',
            ['uid' => $userId]
        );
        $initialValue = (float)($userRow['init'] ?? 0);

        $history = [];
        $cumPnl  = 0.0;
        foreach ($rows as $r) {
            $cumPnl += (float)$r['day_pnl'];
            $history[] = [
                'date'            => $r['day'],
                'portfolio_value' => round($initialValue + $cumPnl, 8),
                'realized_pnl'    => round($cumPnl, 8),
                'unrealized_pnl'  => 0.0,
                'total_pnl'       => round($cumPnl, 8),
            ];
        }

        jsonResponse(['success' => true, 'period' => $period, 'history' => $history]);

    } catch (Exception $e) {
        error_log('Portfolio history error: ' . $e->getMessage());
        jsonResponse(['error' => 'Failed to fetch portfolio history'], 500);
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

// === API Key Handlers (Issue #271) ===

/**
 * GET /api/keys — List the current user's API keys (no raw key shown)
 */
function handleListApiKeys(): void
{
    requireAuth();

    $userId = (int)$_SESSION['user_id'];

    try {
        $keys = Database::fetchAll(
            'SELECT id, name, key_prefix, scopes, status, rate_limit, usage_count, created_at, expires_at, last_used_at'
            . ' FROM ' . Database::table('api_keys')
            . ' WHERE user_id = :uid ORDER BY created_at DESC',
            ['uid' => $userId]
        );

        jsonResponse(['success' => true, 'keys' => $keys ?: []]);
    } catch (Exception $e) {
        error_log('List API keys error: ' . $e->getMessage());
        jsonResponse(['error' => 'Failed to list API keys'], 500);
    }
}

/**
 * POST /api/keys — Create a new API key for the current user
 *
 * Request body:
 *   { "name": "My Integration", "scopes": ["agent:read", "agent:execute"], "rate_limit": 60 }
 *
 * Response includes the raw key once — it will not be shown again.
 */
function handleCreateApiKey(): void
{
    requireAuth();

    $userId = (int)$_SESSION['user_id'];
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];

    $name      = Security::sanitizeString($body['name'] ?? '', 255);
    $scopes    = $body['scopes'] ?? ['agent:read'];
    $rateLimit = max(1, min(600, (int)($body['rate_limit'] ?? 60)));
    $expiresAt = !empty($body['expires_at']) ? Security::sanitizeString($body['expires_at'], 30) : null;

    if (empty($name)) {
        jsonResponse(['error' => 'name is required'], 400);
        return;
    }

    // Validate scopes
    $allowedScopes = ['agent:read', 'agent:execute', 'portfolio:read', 'analytics:read', 'admin:all'];
    $sessionRole   = $_SESSION['user_role'] ?? 'user';
    if (in_array('admin:all', $scopes, true) && $sessionRole !== 'admin') {
        jsonResponse(['error' => 'admin:all scope requires admin role'], 403);
        return;
    }
    foreach ($scopes as $scope) {
        if (!in_array($scope, $allowedScopes, true)) {
            jsonResponse(['error' => "Invalid scope: {$scope}"], 400);
            return;
        }
    }

    try {
        // Generate a cryptographically random API key
        $rawBytes = random_bytes(32);
        $rawKey   = 'tonai_' . rtrim(strtr(base64_encode($rawBytes), '+/', '-_'), '=');
        $keyHash  = hash('sha256', $rawKey);
        $keyPrefix = substr($rawKey, 0, 12);

        $keyId = Database::insert('api_keys', [
            'user_id'    => $userId,
            'name'       => $name,
            'key_prefix' => $keyPrefix,
            'key_hash'   => $keyHash,
            'scopes'     => implode(',', $scopes),
            'status'     => 'active',
            'rate_limit' => $rateLimit,
            'expires_at' => $expiresAt,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        jsonResponse([
            'success' => true,
            'key' => [
                'id'         => $keyId,
                'name'       => $name,
                'key_prefix' => $keyPrefix,
                'scopes'     => $scopes,
                'rate_limit' => $rateLimit,
                'expires_at' => $expiresAt,
                'created_at' => date('c'),
                // Raw key is returned once — store it securely, it will not be shown again
                'raw_key'    => $rawKey,
            ],
        ]);
    } catch (Exception $e) {
        error_log('Create API key error: ' . $e->getMessage());
        jsonResponse(['error' => 'Failed to create API key'], 500);
    }
}

/**
 * POST /api/keys/revoke — Revoke an API key
 *
 * Request body: { "key_id": 123 }
 */
function handleRevokeApiKey(): void
{
    requireAuth();

    $userId = (int)$_SESSION['user_id'];
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $keyId  = (int)($body['key_id'] ?? 0);

    if ($keyId <= 0) {
        jsonResponse(['error' => 'key_id is required'], 400);
        return;
    }

    try {
        $key = Database::fetchOne(
            'SELECT id, user_id, status FROM ' . Database::table('api_keys') . ' WHERE id = :id',
            ['id' => $keyId]
        );

        if (!$key) {
            jsonResponse(['error' => 'API key not found'], 404);
            return;
        }

        $sessionRole = $_SESSION['user_role'] ?? 'user';
        if ((int)$key['user_id'] !== $userId && $sessionRole !== 'admin') {
            jsonResponse(['error' => 'Forbidden: you do not own this key'], 403);
            return;
        }

        Database::update('api_keys', ['status' => 'revoked'], 'id = :id', ['id' => $keyId]);

        jsonResponse(['success' => true, 'key_id' => $keyId, 'status' => 'revoked']);
    } catch (Exception $e) {
        error_log('Revoke API key error: ' . $e->getMessage());
        jsonResponse(['error' => 'Failed to revoke API key'], 500);
    }
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
