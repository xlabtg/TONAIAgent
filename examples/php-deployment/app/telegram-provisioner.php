<?php
/**
 * TON AI Agent - Telegram Bot Auto-Provisioning System
 *
 * Provides automated Telegram Bot setup, configuration, and management:
 * - Bot token validation and verification
 * - Automatic command registration (multi-language)
 * - Webhook auto-configuration with HTTPS detection
 * - Mini App integration (setChatMenuButton, setMyDefaultAdministratorRights)
 * - Health check diagnostics
 * - Multi-bot support for enterprise environments
 * - Auto-recovery system for webhook failures
 *
 * @version 1.0.0
 * @license MIT
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'telegram-provisioner.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

/**
 * Telegram Bot Provisioning Result
 */
class ProvisioningResult {
    public bool $success;
    public string $message;
    public array $data;
    public ?string $errorCode;
    public ?array $suggestions;

    public function __construct(
        bool $success,
        string $message = '',
        array $data = [],
        ?string $errorCode = null,
        ?array $suggestions = null
    ) {
        $this->success = $success;
        $this->message = $message;
        $this->data = $data;
        $this->errorCode = $errorCode;
        $this->suggestions = $suggestions;
    }

    public static function success(string $message, array $data = []): self {
        return new self(true, $message, $data);
    }

    public static function failure(string $message, ?string $errorCode = null, ?array $suggestions = null): self {
        return new self(false, $message, [], $errorCode, $suggestions);
    }

    public function toArray(): array {
        return [
            'success' => $this->success,
            'message' => $this->message,
            'data' => $this->data,
            'error_code' => $this->errorCode,
            'suggestions' => $this->suggestions,
        ];
    }
}

/**
 * Bot Command Definition
 */
class BotCommand {
    public string $command;
    public array $descriptions; // Keyed by language code

    public function __construct(string $command, array $descriptions) {
        $this->command = $command;
        $this->descriptions = $descriptions;
    }

    public function getDescription(string $languageCode = 'en'): string {
        return $this->descriptions[$languageCode] ?? $this->descriptions['en'] ?? $this->command;
    }
}

/**
 * Health Check Result
 */
class HealthCheckResult {
    public string $name;
    public string $status; // 'pass', 'fail', 'warn'
    public string $message;
    public ?string $suggestion;
    public ?array $details;
    public float $duration; // milliseconds

    public function __construct(
        string $name,
        string $status,
        string $message,
        ?string $suggestion = null,
        ?array $details = null,
        float $duration = 0
    ) {
        $this->name = $name;
        $this->status = $status;
        $this->message = $message;
        $this->suggestion = $suggestion;
        $this->details = $details;
        $this->duration = $duration;
    }

    public function isPassing(): bool {
        return $this->status === 'pass';
    }
}

/**
 * Telegram Bot Auto-Provisioner
 *
 * Main class for automated Telegram bot setup and configuration
 */
class TelegramBotProvisioner {
    private string $botToken;
    private string $apiUrl;
    private array $botInfo = [];
    private bool $verbose = false;
    private array $logs = [];

    // Default bot commands with multi-language support
    private static array $defaultCommands = [
        'start' => [
            'en' => 'Start the bot and open Mini App',
            'ru' => 'Запустить бота и открыть Mini App',
            'zh' => '启动机器人并打开迷你应用',
            'ar' => 'ابدأ الروبوت وافتح التطبيق المصغر',
        ],
        'dashboard' => [
            'en' => 'Open your dashboard',
            'ru' => 'Открыть панель управления',
            'zh' => '打开您的仪表板',
            'ar' => 'افتح لوحة التحكم',
        ],
        'agents' => [
            'en' => 'Manage your AI agents',
            'ru' => 'Управление AI агентами',
            'zh' => '管理您的AI代理',
            'ar' => 'إدارة وكلاء الذكاء الاصطناعي',
        ],
        'marketplace' => [
            'en' => 'Browse strategy marketplace',
            'ru' => 'Маркетплейс стратегий',
            'zh' => '浏览策略市场',
            'ar' => 'تصفح سوق الاستراتيجيات',
        ],
        'settings' => [
            'en' => 'Configure your settings',
            'ru' => 'Настройки',
            'zh' => '配置您的设置',
            'ar' => 'تكوين الإعدادات',
        ],
        'help' => [
            'en' => 'Get help and documentation',
            'ru' => 'Помощь и документация',
            'zh' => '获取帮助和文档',
            'ar' => 'احصل على المساعدة والوثائق',
        ],
    ];

    public function __construct(string $botToken, bool $verbose = false) {
        $this->botToken = $botToken;
        $this->apiUrl = 'https://api.telegram.org/bot' . $botToken;
        $this->verbose = $verbose;
    }

    /**
     * Log a message
     */
    private function log(string $level, string $message, array $context = []): void {
        $entry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
        ];
        $this->logs[] = $entry;

        if ($this->verbose) {
            error_log("[TelegramProvisioner][$level] $message " . json_encode($context));
        }
    }

    /**
     * Get all logs
     */
    public function getLogs(): array {
        return $this->logs;
    }

    /**
     * Send API request to Telegram
     */
    private function request(string $method, array $params = [], int $timeout = 30): array {
        $url = $this->apiUrl . '/' . $method;
        $startTime = microtime(true);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($params),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $duration = (microtime(true) - $startTime) * 1000;

        if ($response === false) {
            $this->log('error', "API request failed: $method", ['error' => $error, 'duration_ms' => $duration]);
            return ['ok' => false, 'error_code' => 0, 'description' => "cURL error: $error"];
        }

        $data = json_decode($response, true);
        if ($data === null) {
            $this->log('error', "Invalid JSON response: $method", ['response' => $response, 'duration_ms' => $duration]);
            return ['ok' => false, 'error_code' => 0, 'description' => 'Invalid JSON response'];
        }

        $this->log($data['ok'] ? 'info' : 'warning', "API $method", [
            'ok' => $data['ok'],
            'http_code' => $httpCode,
            'duration_ms' => $duration,
        ]);

        return $data;
    }

    // =========================================================================
    // STEP 1: Bot Token Validation
    // =========================================================================

    /**
     * Validate bot token and get bot information
     */
    public function validateToken(): ProvisioningResult {
        $this->log('info', 'Validating bot token');

        $response = $this->request('getMe');

        if (!$response['ok']) {
            $errorCode = $response['error_code'] ?? 0;
            $description = $response['description'] ?? 'Unknown error';

            // Provide specific suggestions based on error
            $suggestions = [];
            if ($errorCode === 401) {
                $suggestions = [
                    'Check that the bot token is correct',
                    'Ensure the bot has not been deleted or revoked',
                    'Get a new token from @BotFather',
                ];
            }

            return ProvisioningResult::failure(
                "Invalid bot token: $description",
                "INVALID_TOKEN",
                $suggestions
            );
        }

        $this->botInfo = $response['result'];

        return ProvisioningResult::success('Bot token validated successfully', [
            'bot_id' => $this->botInfo['id'],
            'bot_username' => $this->botInfo['username'],
            'bot_first_name' => $this->botInfo['first_name'] ?? '',
            'can_join_groups' => $this->botInfo['can_join_groups'] ?? false,
            'can_read_all_group_messages' => $this->botInfo['can_read_all_group_messages'] ?? false,
            'supports_inline_queries' => $this->botInfo['supports_inline_queries'] ?? false,
            'is_bot' => $this->botInfo['is_bot'] ?? true,
        ]);
    }

    /**
     * Get bot info (must call validateToken first)
     */
    public function getBotInfo(): array {
        return $this->botInfo;
    }

    /**
     * Get bot username
     */
    public function getBotUsername(): ?string {
        return $this->botInfo['username'] ?? null;
    }

    // =========================================================================
    // STEP 2: Automatic Command Setup
    // =========================================================================

    /**
     * Set bot commands for a specific language
     */
    public function setCommands(array $commands, ?string $languageCode = null): ProvisioningResult {
        $this->log('info', 'Setting bot commands', ['language' => $languageCode ?? 'default']);

        $formattedCommands = [];
        foreach ($commands as $command) {
            if ($command instanceof BotCommand) {
                $formattedCommands[] = [
                    'command' => $command->command,
                    'description' => $command->getDescription($languageCode ?? 'en'),
                ];
            } else {
                $formattedCommands[] = $command;
            }
        }

        $params = ['commands' => $formattedCommands];
        if ($languageCode !== null) {
            $params['language_code'] = $languageCode;
        }

        $response = $this->request('setMyCommands', $params);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to set bot commands: ' . ($response['description'] ?? 'Unknown error'),
                'COMMANDS_FAILED'
            );
        }

        return ProvisioningResult::success('Bot commands configured successfully', [
            'language' => $languageCode ?? 'default',
            'commands_count' => count($formattedCommands),
        ]);
    }

    /**
     * Set default TON AI Agent commands with multi-language support
     */
    public function setDefaultCommands(array $languages = ['en', 'ru', 'zh', 'ar']): ProvisioningResult {
        $this->log('info', 'Setting default commands for languages', ['languages' => $languages]);

        $results = [];
        $allSuccess = true;

        // Create BotCommand objects
        $commands = [];
        foreach (self::$defaultCommands as $cmd => $descriptions) {
            $commands[] = new BotCommand($cmd, $descriptions);
        }

        // Set commands for each language
        foreach ($languages as $lang) {
            $result = $this->setCommands($commands, $lang);
            $results[$lang] = $result->success;
            if (!$result->success) {
                $allSuccess = false;
            }
        }

        // Also set default (no language) commands
        $result = $this->setCommands($commands);
        $results['default'] = $result->success;
        if (!$result->success) {
            $allSuccess = false;
        }

        if (!$allSuccess) {
            return ProvisioningResult::failure(
                'Some commands failed to set',
                'PARTIAL_COMMANDS_FAILURE',
                ['Check Telegram API status', 'Retry setting commands']
            );
        }

        return ProvisioningResult::success('All bot commands configured', [
            'languages' => $results,
            'commands' => array_keys(self::$defaultCommands),
        ]);
    }

    /**
     * Delete all bot commands
     */
    public function deleteCommands(?string $languageCode = null): ProvisioningResult {
        $params = [];
        if ($languageCode !== null) {
            $params['language_code'] = $languageCode;
        }

        $response = $this->request('deleteMyCommands', $params);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to delete commands: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        return ProvisioningResult::success('Bot commands deleted');
    }

    /**
     * Get current bot commands
     */
    public function getCommands(?string $languageCode = null): ProvisioningResult {
        $params = [];
        if ($languageCode !== null) {
            $params['language_code'] = $languageCode;
        }

        $response = $this->request('getMyCommands', $params);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to get commands: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        return ProvisioningResult::success('Commands retrieved', [
            'commands' => $response['result'] ?? [],
        ]);
    }

    // =========================================================================
    // STEP 3: Webhook Auto-Configuration
    // =========================================================================

    /**
     * Detect if HTTPS is available for the given URL
     */
    public static function detectHttps(string $url): bool {
        return strpos(strtolower($url), 'https://') === 0;
    }

    /**
     * Validate webhook URL
     */
    public function validateWebhookUrl(string $url): ProvisioningResult {
        // Must be HTTPS
        if (!self::detectHttps($url)) {
            return ProvisioningResult::failure(
                'Webhook URL must use HTTPS',
                'HTTPS_REQUIRED',
                [
                    'Obtain an SSL certificate (Let\'s Encrypt is free)',
                    'Configure your web server for HTTPS',
                    'Use a reverse proxy with SSL termination',
                ]
            );
        }

        // Validate URL format
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return ProvisioningResult::failure(
                'Invalid webhook URL format',
                'INVALID_URL'
            );
        }

        // Check if URL is reachable (optional, may be behind firewall during setup)
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_NOBODY => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
        ]);
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($httpCode === 0) {
            return ProvisioningResult::success('URL format valid (connectivity check skipped)', [
                'url' => $url,
                'https' => true,
                'reachable' => 'unknown',
                'note' => 'Could not verify reachability: ' . $error,
            ]);
        }

        return ProvisioningResult::success('Webhook URL is valid', [
            'url' => $url,
            'https' => true,
            'reachable' => true,
            'http_code' => $httpCode,
        ]);
    }

    /**
     * Set webhook with automatic configuration
     */
    public function setWebhook(
        string $url,
        ?string $secretToken = null,
        ?string $ipAddress = null,
        int $maxConnections = 40,
        array $allowedUpdates = null,
        bool $dropPendingUpdates = false
    ): ProvisioningResult {
        $this->log('info', 'Setting webhook', ['url' => $url]);

        // Validate URL first
        $validation = $this->validateWebhookUrl($url);
        if (!$validation->success && $validation->errorCode === 'HTTPS_REQUIRED') {
            return $validation;
        }

        $params = [
            'url' => $url,
            'max_connections' => $maxConnections,
            'drop_pending_updates' => $dropPendingUpdates,
        ];

        if ($secretToken !== null) {
            $params['secret_token'] = $secretToken;
        }

        if ($ipAddress !== null) {
            $params['ip_address'] = $ipAddress;
        }

        if ($allowedUpdates !== null) {
            $params['allowed_updates'] = $allowedUpdates;
        }

        $response = $this->request('setWebhook', $params);

        if (!$response['ok']) {
            $errorDesc = $response['description'] ?? 'Unknown error';

            // Analyze common errors
            $suggestions = [];
            if (strpos($errorDesc, 'HTTPS') !== false) {
                $suggestions[] = 'Ensure your SSL certificate is valid and properly configured';
            }
            if (strpos($errorDesc, 'IP address') !== false) {
                $suggestions[] = 'Check that your server IP is accessible from Telegram servers';
            }
            if (strpos($errorDesc, 'port') !== false) {
                $suggestions[] = 'Telegram webhooks only support ports 443, 80, 88, or 8443';
            }

            return ProvisioningResult::failure(
                "Failed to set webhook: $errorDesc",
                'WEBHOOK_FAILED',
                $suggestions
            );
        }

        return ProvisioningResult::success('Webhook configured successfully', [
            'url' => $url,
            'secret_token_set' => $secretToken !== null,
            'max_connections' => $maxConnections,
        ]);
    }

    /**
     * Set webhook with retry mechanism
     */
    public function setWebhookWithRetry(
        string $url,
        ?string $secretToken = null,
        int $maxRetries = 3,
        int $retryDelayMs = 1000
    ): ProvisioningResult {
        $lastResult = null;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            $this->log('info', "Webhook setup attempt $attempt of $maxRetries");

            $lastResult = $this->setWebhook($url, $secretToken);

            if ($lastResult->success) {
                $lastResult->data['attempts'] = $attempt;
                return $lastResult;
            }

            if ($attempt < $maxRetries) {
                usleep($retryDelayMs * 1000);
            }
        }

        $lastResult->data['attempts'] = $maxRetries;
        $lastResult->suggestions[] = "Webhook setup failed after $maxRetries attempts";
        return $lastResult;
    }

    /**
     * Get current webhook info
     */
    public function getWebhookInfo(): ProvisioningResult {
        $response = $this->request('getWebhookInfo');

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to get webhook info: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        $info = $response['result'];

        // Analyze webhook health
        $isHealthy = true;
        $issues = [];

        if (empty($info['url'])) {
            $isHealthy = false;
            $issues[] = 'No webhook URL configured';
        }

        if (($info['last_error_date'] ?? 0) > time() - 3600) {
            $isHealthy = false;
            $issues[] = 'Recent webhook error: ' . ($info['last_error_message'] ?? 'Unknown');
        }

        if (($info['pending_update_count'] ?? 0) > 100) {
            $issues[] = 'High number of pending updates: ' . $info['pending_update_count'];
        }

        return ProvisioningResult::success('Webhook info retrieved', [
            'url' => $info['url'] ?? '',
            'has_custom_certificate' => $info['has_custom_certificate'] ?? false,
            'pending_update_count' => $info['pending_update_count'] ?? 0,
            'ip_address' => $info['ip_address'] ?? null,
            'last_error_date' => $info['last_error_date'] ?? null,
            'last_error_message' => $info['last_error_message'] ?? null,
            'max_connections' => $info['max_connections'] ?? 40,
            'allowed_updates' => $info['allowed_updates'] ?? [],
            'is_healthy' => $isHealthy,
            'issues' => $issues,
        ]);
    }

    /**
     * Delete webhook (switch to polling mode)
     */
    public function deleteWebhook(bool $dropPendingUpdates = false): ProvisioningResult {
        $response = $this->request('deleteWebhook', [
            'drop_pending_updates' => $dropPendingUpdates,
        ]);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to delete webhook: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        return ProvisioningResult::success('Webhook deleted (polling mode enabled)', [
            'dropped_pending_updates' => $dropPendingUpdates,
        ]);
    }

    // =========================================================================
    // STEP 4: Mini App Integration
    // =========================================================================

    /**
     * Set chat menu button to open Mini App
     */
    public function setChatMenuButton(string $miniAppUrl, string $text = 'Open App'): ProvisioningResult {
        $this->log('info', 'Setting chat menu button', ['url' => $miniAppUrl]);

        if (!self::detectHttps($miniAppUrl)) {
            return ProvisioningResult::failure(
                'Mini App URL must use HTTPS',
                'HTTPS_REQUIRED'
            );
        }

        $response = $this->request('setChatMenuButton', [
            'menu_button' => [
                'type' => 'web_app',
                'text' => $text,
                'web_app' => ['url' => $miniAppUrl],
            ],
        ]);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to set chat menu button: ' . ($response['description'] ?? 'Unknown error'),
                'MENU_BUTTON_FAILED'
            );
        }

        return ProvisioningResult::success('Chat menu button configured', [
            'mini_app_url' => $miniAppUrl,
            'button_text' => $text,
        ]);
    }

    /**
     * Get current chat menu button configuration
     */
    public function getChatMenuButton(): ProvisioningResult {
        $response = $this->request('getChatMenuButton');

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to get chat menu button: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        return ProvisioningResult::success('Chat menu button retrieved', [
            'menu_button' => $response['result'],
        ]);
    }

    /**
     * Set default administrator rights for groups
     */
    public function setMyDefaultAdministratorRights(
        bool $forChannels = false,
        array $rights = null
    ): ProvisioningResult {
        $defaultRights = $rights ?? [
            'can_manage_chat' => true,
            'can_post_messages' => $forChannels,
            'can_edit_messages' => $forChannels,
            'can_delete_messages' => true,
            'can_manage_video_chats' => false,
            'can_restrict_members' => false,
            'can_promote_members' => false,
            'can_change_info' => false,
            'can_invite_users' => true,
            'can_pin_messages' => true,
            'is_anonymous' => false,
        ];

        $response = $this->request('setMyDefaultAdministratorRights', [
            'rights' => $defaultRights,
            'for_channels' => $forChannels,
        ]);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to set administrator rights: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        return ProvisioningResult::success('Administrator rights configured', [
            'for_channels' => $forChannels,
            'rights' => $defaultRights,
        ]);
    }

    /**
     * Set bot name
     */
    public function setMyName(string $name, ?string $languageCode = null): ProvisioningResult {
        $params = ['name' => $name];
        if ($languageCode !== null) {
            $params['language_code'] = $languageCode;
        }

        $response = $this->request('setMyName', $params);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to set bot name: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        return ProvisioningResult::success('Bot name set', ['name' => $name, 'language' => $languageCode]);
    }

    /**
     * Set bot description
     */
    public function setMyDescription(string $description, ?string $languageCode = null): ProvisioningResult {
        $params = ['description' => $description];
        if ($languageCode !== null) {
            $params['language_code'] = $languageCode;
        }

        $response = $this->request('setMyDescription', $params);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to set bot description: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        return ProvisioningResult::success('Bot description set', [
            'description' => $description,
            'language' => $languageCode,
        ]);
    }

    /**
     * Set bot short description (shown in profile)
     */
    public function setMyShortDescription(string $shortDescription, ?string $languageCode = null): ProvisioningResult {
        $params = ['short_description' => $shortDescription];
        if ($languageCode !== null) {
            $params['language_code'] = $languageCode;
        }

        $response = $this->request('setMyShortDescription', $params);

        if (!$response['ok']) {
            return ProvisioningResult::failure(
                'Failed to set bot short description: ' . ($response['description'] ?? 'Unknown error')
            );
        }

        return ProvisioningResult::success('Bot short description set', [
            'short_description' => $shortDescription,
            'language' => $languageCode,
        ]);
    }

    // =========================================================================
    // HEALTH CHECKS & DIAGNOSTICS
    // =========================================================================

    /**
     * Run comprehensive health checks
     */
    public function runHealthChecks(array $config = []): array {
        $results = [];

        // 1. Bot API Connectivity
        $results[] = $this->checkBotApiConnectivity();

        // 2. Webhook Status
        $results[] = $this->checkWebhookStatus();

        // 3. Bot Permissions
        $results[] = $this->checkBotPermissions();

        // 4. AI Provider (if configured)
        if (!empty($config['ai_api_key'])) {
            $results[] = $this->checkAiProvider($config['ai_api_key'], $config['ai_provider'] ?? 'groq');
        }

        // 5. TON RPC (if configured)
        if (!empty($config['ton_rpc_endpoint'])) {
            $results[] = $this->checkTonRpc($config['ton_rpc_endpoint']);
        }

        // 6. Database (if configured)
        if (!empty($config['db_host'])) {
            $results[] = $this->checkDatabase($config);
        }

        return $results;
    }

    /**
     * Check Bot API connectivity
     */
    public function checkBotApiConnectivity(): HealthCheckResult {
        $startTime = microtime(true);

        $response = $this->request('getMe', [], 10);
        $duration = (microtime(true) - $startTime) * 1000;

        if (!$response['ok']) {
            return new HealthCheckResult(
                'Bot API Connectivity',
                'fail',
                'Cannot connect to Telegram Bot API',
                'Check your bot token and network connectivity',
                ['error' => $response['description'] ?? 'Unknown'],
                $duration
            );
        }

        return new HealthCheckResult(
            'Bot API Connectivity',
            'pass',
            'Connected to Telegram Bot API',
            null,
            [
                'bot_username' => $response['result']['username'] ?? 'Unknown',
                'latency_ms' => round($duration, 2),
            ],
            $duration
        );
    }

    /**
     * Check webhook status
     */
    public function checkWebhookStatus(): HealthCheckResult {
        $startTime = microtime(true);

        $result = $this->getWebhookInfo();
        $duration = (microtime(true) - $startTime) * 1000;

        if (!$result->success) {
            return new HealthCheckResult(
                'Webhook Status',
                'fail',
                'Cannot retrieve webhook info',
                null,
                null,
                $duration
            );
        }

        $data = $result->data;

        if (empty($data['url'])) {
            return new HealthCheckResult(
                'Webhook Status',
                'warn',
                'No webhook configured (polling mode)',
                'Set up a webhook for production use',
                ['mode' => 'polling'],
                $duration
            );
        }

        if (!$data['is_healthy']) {
            return new HealthCheckResult(
                'Webhook Status',
                'fail',
                'Webhook has issues',
                implode('; ', $data['issues']),
                $data,
                $duration
            );
        }

        return new HealthCheckResult(
            'Webhook Status',
            'pass',
            'Webhook is configured and healthy',
            null,
            [
                'url' => $data['url'],
                'pending_updates' => $data['pending_update_count'],
            ],
            $duration
        );
    }

    /**
     * Check bot permissions
     */
    public function checkBotPermissions(): HealthCheckResult {
        $startTime = microtime(true);

        if (empty($this->botInfo)) {
            $this->validateToken();
        }

        $duration = (microtime(true) - $startTime) * 1000;

        $permissions = [
            'can_join_groups' => $this->botInfo['can_join_groups'] ?? false,
            'can_read_all_group_messages' => $this->botInfo['can_read_all_group_messages'] ?? false,
            'supports_inline_queries' => $this->botInfo['supports_inline_queries'] ?? false,
        ];

        $warnings = [];
        if (!$permissions['can_join_groups']) {
            $warnings[] = 'Bot cannot join groups';
        }

        return new HealthCheckResult(
            'Bot Permissions',
            empty($warnings) ? 'pass' : 'warn',
            empty($warnings) ? 'Bot permissions are configured' : 'Some permissions may need adjustment',
            empty($warnings) ? null : 'Configure bot settings in @BotFather',
            $permissions,
            $duration
        );
    }

    /**
     * Check AI provider connectivity
     */
    public function checkAiProvider(string $apiKey, string $provider = 'groq'): HealthCheckResult {
        $startTime = microtime(true);

        $endpoints = [
            'groq' => 'https://api.groq.com/openai/v1/models',
            'openai' => 'https://api.openai.com/v1/models',
            'anthropic' => 'https://api.anthropic.com/v1/messages',
        ];

        $url = $endpoints[$provider] ?? $endpoints['groq'];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
            ],
        ]);

        if ($provider === 'anthropic') {
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'x-api-key: ' . $apiKey,
                'anthropic-version: 2023-06-01',
                'Content-Type: application/json',
            ]);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $duration = (microtime(true) - $startTime) * 1000;

        if ($httpCode === 401 || $httpCode === 403) {
            return new HealthCheckResult(
                "AI Provider ($provider)",
                'fail',
                'Invalid API key',
                'Check your API key in provider dashboard',
                ['http_code' => $httpCode],
                $duration
            );
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            return new HealthCheckResult(
                "AI Provider ($provider)",
                'pass',
                'AI provider connected',
                null,
                ['provider' => $provider, 'latency_ms' => round($duration, 2)],
                $duration
            );
        }

        return new HealthCheckResult(
            "AI Provider ($provider)",
            'warn',
            "AI provider returned status $httpCode",
            'Check API status page',
            ['http_code' => $httpCode],
            $duration
        );
    }

    /**
     * Check TON RPC connectivity
     */
    public function checkTonRpc(string $endpoint): HealthCheckResult {
        $startTime = microtime(true);

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode([
                'id' => 1,
                'jsonrpc' => '2.0',
                'method' => 'getMasterchainInfo',
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $duration = (microtime(true) - $startTime) * 1000;

        if ($httpCode !== 200) {
            return new HealthCheckResult(
                'TON RPC',
                'fail',
                'Cannot connect to TON RPC',
                'Check endpoint URL and network connectivity',
                ['http_code' => $httpCode],
                $duration
            );
        }

        $data = json_decode($response, true);
        if (isset($data['error'])) {
            return new HealthCheckResult(
                'TON RPC',
                'fail',
                'TON RPC error: ' . ($data['error']['message'] ?? 'Unknown'),
                null,
                $data['error'],
                $duration
            );
        }

        return new HealthCheckResult(
            'TON RPC',
            'pass',
            'TON RPC connected',
            null,
            ['endpoint' => $endpoint, 'latency_ms' => round($duration, 2)],
            $duration
        );
    }

    /**
     * Check database connectivity
     */
    public function checkDatabase(array $config): HealthCheckResult {
        $startTime = microtime(true);

        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;charset=utf8mb4',
                $config['db_host'],
                $config['db_port'] ?? 3306
            );

            $pdo = new PDO(
                $dsn,
                $config['db_user'] ?? '',
                $config['db_pass'] ?? '',
                [PDO::ATTR_TIMEOUT => 5]
            );

            $duration = (microtime(true) - $startTime) * 1000;

            return new HealthCheckResult(
                'Database',
                'pass',
                'Database connected',
                null,
                ['host' => $config['db_host'], 'latency_ms' => round($duration, 2)],
                $duration
            );
        } catch (PDOException $e) {
            $duration = (microtime(true) - $startTime) * 1000;

            return new HealthCheckResult(
                'Database',
                'fail',
                'Database connection failed',
                'Check credentials and ensure database server is running',
                ['error' => $e->getMessage()],
                $duration
            );
        }
    }

    // =========================================================================
    // AUTO-RECOVERY SYSTEM
    // =========================================================================

    /**
     * Attempt to recover webhook if it's in a failed state
     */
    public function attemptWebhookRecovery(string $webhookUrl, ?string $secretToken = null): ProvisioningResult {
        $this->log('info', 'Attempting webhook recovery');

        // Get current webhook status
        $info = $this->getWebhookInfo();

        if (!$info->success) {
            return ProvisioningResult::failure('Cannot get webhook info for recovery');
        }

        $currentUrl = $info->data['url'] ?? '';
        $hasRecentError = !empty($info->data['last_error_date']) &&
                          ($info->data['last_error_date'] > time() - 3600);

        // If webhook is configured but has errors, try to reset it
        if (!empty($currentUrl) && $hasRecentError) {
            $this->log('info', 'Resetting webhook due to recent errors');

            // Delete webhook first
            $this->deleteWebhook(false);

            // Small delay
            usleep(500000); // 500ms

            // Re-set webhook
            $result = $this->setWebhook($webhookUrl, $secretToken);

            if ($result->success) {
                $result->data['recovery_action'] = 'reset';
                return $result;
            }
        }

        // If no webhook configured, set it
        if (empty($currentUrl)) {
            $result = $this->setWebhook($webhookUrl, $secretToken);
            if ($result->success) {
                $result->data['recovery_action'] = 'initial_setup';
            }
            return $result;
        }

        // Webhook is healthy
        return ProvisioningResult::success('Webhook is healthy, no recovery needed', [
            'recovery_action' => 'none',
            'current_url' => $currentUrl,
        ]);
    }

    // =========================================================================
    // COMPLETE PROVISIONING FLOW
    // =========================================================================

    /**
     * Run complete bot provisioning
     */
    public function provisionBot(array $config): array {
        $results = [
            'steps' => [],
            'overall_success' => true,
            'bot_info' => null,
        ];

        // Step 1: Validate Token
        $this->log('info', '=== Step 1: Validating bot token ===');
        $tokenResult = $this->validateToken();
        $results['steps']['token_validation'] = $tokenResult->toArray();
        if (!$tokenResult->success) {
            $results['overall_success'] = false;
            return $results;
        }
        $results['bot_info'] = $this->botInfo;

        // Step 2: Set Commands
        if ($config['set_commands'] ?? true) {
            $this->log('info', '=== Step 2: Setting bot commands ===');
            $languages = $config['command_languages'] ?? ['en', 'ru', 'zh', 'ar'];
            $commandResult = $this->setDefaultCommands($languages);
            $results['steps']['commands'] = $commandResult->toArray();
            if (!$commandResult->success) {
                $results['overall_success'] = false;
            }
        }

        // Step 3: Set Webhook
        if (!empty($config['webhook_url'])) {
            $this->log('info', '=== Step 3: Setting webhook ===');
            $webhookResult = $this->setWebhookWithRetry(
                $config['webhook_url'],
                $config['webhook_secret'] ?? null,
                $config['webhook_retries'] ?? 3
            );
            $results['steps']['webhook'] = $webhookResult->toArray();
            if (!$webhookResult->success) {
                $results['overall_success'] = false;
            }
        }

        // Step 4: Configure Mini App
        if (!empty($config['mini_app_url'])) {
            $this->log('info', '=== Step 4: Configuring Mini App ===');
            $menuResult = $this->setChatMenuButton(
                $config['mini_app_url'],
                $config['menu_button_text'] ?? 'Open App'
            );
            $results['steps']['mini_app'] = $menuResult->toArray();
            if (!$menuResult->success) {
                $results['overall_success'] = false;
            }
        }

        // Step 5: Set Bot Description (optional)
        if (!empty($config['bot_description'])) {
            $this->log('info', '=== Step 5: Setting bot description ===');
            $descResult = $this->setMyDescription($config['bot_description']);
            $results['steps']['description'] = $descResult->toArray();
        }

        // Step 6: Set Bot Short Description (optional)
        if (!empty($config['bot_short_description'])) {
            $shortDescResult = $this->setMyShortDescription($config['bot_short_description']);
            $results['steps']['short_description'] = $shortDescResult->toArray();
        }

        // Step 7: Run Health Checks
        if ($config['run_health_checks'] ?? true) {
            $this->log('info', '=== Step 7: Running health checks ===');
            $healthChecks = $this->runHealthChecks($config);
            $results['steps']['health_checks'] = array_map(function($check) {
                return [
                    'name' => $check->name,
                    'status' => $check->status,
                    'message' => $check->message,
                    'suggestion' => $check->suggestion,
                    'details' => $check->details,
                    'duration_ms' => $check->duration,
                ];
            }, $healthChecks);

            // Check if any health check failed
            foreach ($healthChecks as $check) {
                if ($check->status === 'fail') {
                    $results['overall_success'] = false;
                    break;
                }
            }
        }

        $results['logs'] = $this->logs;

        return $results;
    }
}

/**
 * Multi-Bot Manager for Enterprise environments
 */
class MultiBotManager {
    private array $bots = [];
    private ?PDO $db = null;

    public function __construct(?PDO $db = null) {
        $this->db = $db;
    }

    /**
     * Register a bot
     */
    public function registerBot(string $id, string $token, array $config = []): TelegramBotProvisioner {
        $provisioner = new TelegramBotProvisioner($token);
        $this->bots[$id] = [
            'provisioner' => $provisioner,
            'config' => $config,
            'registered_at' => time(),
        ];
        return $provisioner;
    }

    /**
     * Get a registered bot
     */
    public function getBot(string $id): ?TelegramBotProvisioner {
        return $this->bots[$id]['provisioner'] ?? null;
    }

    /**
     * List all registered bots
     */
    public function listBots(): array {
        $list = [];
        foreach ($this->bots as $id => $data) {
            $list[$id] = [
                'registered_at' => $data['registered_at'],
                'config' => $data['config'],
            ];
        }
        return $list;
    }

    /**
     * Remove a bot
     */
    public function removeBot(string $id): bool {
        if (isset($this->bots[$id])) {
            unset($this->bots[$id]);
            return true;
        }
        return false;
    }

    /**
     * Run health checks on all bots
     */
    public function runAllHealthChecks(): array {
        $results = [];
        foreach ($this->bots as $id => $data) {
            $results[$id] = $data['provisioner']->runHealthChecks($data['config']);
        }
        return $results;
    }

    /**
     * Attempt recovery on all bots with webhook issues
     */
    public function attemptAllRecoveries(): array {
        $results = [];
        foreach ($this->bots as $id => $data) {
            $config = $data['config'];
            if (!empty($config['webhook_url'])) {
                $results[$id] = $data['provisioner']->attemptWebhookRecovery(
                    $config['webhook_url'],
                    $config['webhook_secret'] ?? null
                );
            }
        }
        return $results;
    }

    /**
     * Save bots configuration to database
     */
    public function saveToDB(): bool {
        if ($this->db === null) {
            return false;
        }

        // This would be implemented based on your database schema
        // Placeholder for multi-tenant bot storage
        return true;
    }

    /**
     * Load bots from database
     */
    public function loadFromDB(): bool {
        if ($this->db === null) {
            return false;
        }

        // This would be implemented based on your database schema
        // Placeholder for multi-tenant bot loading
        return true;
    }
}
