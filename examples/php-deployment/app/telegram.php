<?php
/**
 * TON AI Agent - Telegram Integration
 *
 * Handles Telegram Bot API, Mini App authentication,
 * and deep linking functionality.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'telegram.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

class TelegramBot {
    private string $botToken;
    private string $botUsername;
    private string $apiUrl;
    private ?string $miniAppUrl;

    public function __construct(array $config) {
        $this->botToken = $config['bot_token'] ?? '';
        $this->botUsername = $config['bot_username'] ?? '';
        $this->miniAppUrl = $config['mini_app_url'] ?? null;
        $this->apiUrl = 'https://api.telegram.org/bot' . $this->botToken;
    }

    /**
     * Send API request to Telegram
     */
    private function request(string $method, array $params = []): array {
        $url = $this->apiUrl . '/' . $method;

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => json_encode($params),
                'timeout' => 30
            ]
        ]);

        $result = @file_get_contents($url, false, $context);

        if ($result === false) {
            throw new RuntimeException('Telegram API request failed');
        }

        $data = json_decode($result, true);

        if (!$data['ok']) {
            throw new RuntimeException('Telegram API error: ' . ($data['description'] ?? 'Unknown error'));
        }

        return $data['result'] ?? [];
    }

    /**
     * Get bot info
     */
    public function getMe(): array {
        return $this->request('getMe');
    }

    /**
     * Send message
     */
    public function sendMessage(int $chatId, string $text, array $options = []): array {
        return $this->request('sendMessage', array_merge([
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML'
        ], $options));
    }

    /**
     * Send message with inline keyboard
     */
    public function sendMessageWithButtons(int $chatId, string $text, array $buttons): array {
        return $this->sendMessage($chatId, $text, [
            'reply_markup' => [
                'inline_keyboard' => $buttons
            ]
        ]);
    }

    /**
     * Send Mini App button
     */
    public function sendMiniAppButton(int $chatId, string $text, string $buttonText, ?string $startParam = null): array {
        $url = $this->miniAppUrl;
        if ($startParam) {
            $url .= (strpos($url, '?') !== false ? '&' : '?') . 'startapp=' . urlencode($startParam);
        }

        return $this->sendMessage($chatId, $text, [
            'reply_markup' => [
                'inline_keyboard' => [[
                    [
                        'text' => $buttonText,
                        'web_app' => ['url' => $url]
                    ]
                ]]
            ]
        ]);
    }

    /**
     * Answer callback query
     */
    public function answerCallbackQuery(string $callbackQueryId, ?string $text = null, bool $showAlert = false): array {
        $params = ['callback_query_id' => $callbackQueryId];
        if ($text) {
            $params['text'] = $text;
            $params['show_alert'] = $showAlert;
        }
        return $this->request('answerCallbackQuery', $params);
    }

    /**
     * Set webhook
     */
    public function setWebhook(string $url, ?string $secretToken = null): array {
        $params = ['url' => $url];
        if ($secretToken) {
            $params['secret_token'] = $secretToken;
        }
        return $this->request('setWebhook', $params);
    }

    /**
     * Delete webhook
     */
    public function deleteWebhook(): array {
        return $this->request('deleteWebhook');
    }

    /**
     * Get webhook info
     */
    public function getWebhookInfo(): array {
        return $this->request('getWebhookInfo');
    }

    /**
     * Validate webhook secret token
     */
    public function validateWebhookSecret(?string $secret): bool {
        $headerSecret = $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '';
        return !empty($secret) && hash_equals($secret, $headerSecret);
    }

    /**
     * Generate Mini App deep link
     */
    public function generateMiniAppLink(?string $startParam = null): string {
        $link = "https://t.me/{$this->botUsername}";
        if ($startParam) {
            $link .= '?startapp=' . urlencode($startParam);
        }
        return $link;
    }

    /**
     * Generate start deep link
     */
    public function generateStartLink(?string $startParam = null): string {
        $link = "https://t.me/{$this->botUsername}";
        if ($startParam) {
            $link .= '?start=' . urlencode($startParam);
        }
        return $link;
    }

    /**
     * Generate referral link
     */
    public function generateReferralLink(string $userId): string {
        return $this->generateMiniAppLink('ref_' . $userId);
    }

    /**
     * Generate strategy share link
     */
    public function generateStrategyLink(string $strategyId): string {
        return $this->generateMiniAppLink('strategy_' . $strategyId);
    }

    /**
     * Generate agent share link
     */
    public function generateAgentLink(string $agentId): string {
        return $this->generateMiniAppLink('agent_' . $agentId);
    }

    /**
     * Parse start parameter
     */
    public function parseStartParam(string $startParam): array {
        if (strpos($startParam, 'ref_') === 0) {
            return ['type' => 'referral', 'id' => substr($startParam, 4)];
        }
        if (strpos($startParam, 'strategy_') === 0) {
            return ['type' => 'strategy', 'id' => substr($startParam, 9)];
        }
        if (strpos($startParam, 'agent_') === 0) {
            return ['type' => 'agent', 'id' => substr($startParam, 6)];
        }
        return ['type' => 'unknown', 'value' => $startParam];
    }
}

/**
 * Telegram Mini App Authentication Handler
 */
class TelegramMiniApp {
    private string $botToken;
    private ?array $userData = null;
    private ?string $initData = null;

    public function __construct(string $botToken) {
        $this->botToken = $botToken;
    }

    /**
     * Authenticate from init data
     */
    public function authenticate(string $initData): bool {
        $this->initData = $initData;

        // Validate signature
        if (!Security::validateTelegramInitData($initData, $this->botToken)) {
            return false;
        }

        // Parse user data
        $data = Security::parseTelegramInitData($initData);
        if (!$data || empty($data['user'])) {
            return false;
        }

        // Check auth date (valid for 1 hour)
        $authDate = (int) ($data['auth_date'] ?? 0);
        if (time() - $authDate > 3600) {
            return false;
        }

        $this->userData = $data['user'];
        return true;
    }

    /**
     * Get authenticated user
     */
    public function getUser(): ?array {
        return $this->userData;
    }

    /**
     * Get user ID
     */
    public function getUserId(): ?int {
        return $this->userData['id'] ?? null;
    }

    /**
     * Get username
     */
    public function getUsername(): ?string {
        return $this->userData['username'] ?? null;
    }

    /**
     * Get first name
     */
    public function getFirstName(): ?string {
        return $this->userData['first_name'] ?? null;
    }

    /**
     * Get last name
     */
    public function getLastName(): ?string {
        return $this->userData['last_name'] ?? null;
    }

    /**
     * Get full name
     */
    public function getFullName(): string {
        $parts = array_filter([
            $this->getFirstName(),
            $this->getLastName()
        ]);
        return implode(' ', $parts) ?: 'User';
    }

    /**
     * Get language code
     */
    public function getLanguageCode(): string {
        return $this->userData['language_code'] ?? 'en';
    }

    /**
     * Check if user is premium
     */
    public function isPremium(): bool {
        return $this->userData['is_premium'] ?? false;
    }

    /**
     * Get start param from init data
     */
    public function getStartParam(): ?string {
        $data = Security::parseTelegramInitData($this->initData ?? '');
        return $data['start_param'] ?? null;
    }

    /**
     * Generate session token for user
     */
    public function generateSessionToken(): string {
        if (!$this->userData) {
            throw new RuntimeException('User not authenticated');
        }

        $payload = [
            'user_id' => $this->userData['id'],
            'username' => $this->userData['username'] ?? null,
            'iat' => time(),
            'exp' => time() + 86400 // 24 hours
        ];

        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64_encode(json_encode($payload));
        $signature = base64_encode(hash_hmac('sha256', "$header.$payload", $this->botToken, true));

        return "$header.$payload.$signature";
    }

    /**
     * Verify session token
     */
    public function verifySessionToken(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($header, $payload, $signature) = $parts;

        // Verify signature
        $expectedSignature = base64_encode(hash_hmac('sha256', "$header.$payload", $this->botToken, true));
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        // Decode payload
        $data = json_decode(base64_decode($payload), true);
        if (!$data) {
            return null;
        }

        // Check expiration
        if (($data['exp'] ?? 0) < time()) {
            return null;
        }

        return $data;
    }
}
