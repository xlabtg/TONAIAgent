<?php
/**
 * TON AI Agent - Telegram Integration
 *
 * Handles Telegram Bot API and WebApp integration.
 * Compatible with Telegram Bot API 9.5 (March 2026) and later.
 * Reference: https://core.telegram.org/bots/api
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Direct access forbidden');
}

require_once __DIR__ . '/security.php';

class Telegram
{
    private static array $config = [];
    private const API_BASE = 'https://api.telegram.org/bot';

    /**
     * Initialize with configuration
     */
    public static function init(): void
    {
        $configFile = __DIR__ . '/config.php';
        if (file_exists($configFile)) {
            $config = require $configFile;
            self::$config = $config['telegram'] ?? [];
        }
    }

    /**
     * Get bot token
     */
    private static function getBotToken(): string
    {
        if (empty(self::$config)) {
            self::init();
        }
        return self::$config['bot_token'] ?? '';
    }

    /**
     * Make API request to Telegram
     */
    public static function apiRequest(string $method, array $params = []): array
    {
        $token = self::getBotToken();

        if (empty($token)) {
            return ['ok' => false, 'error' => 'Bot token not configured'];
        }

        $url = self::API_BASE . $token . '/' . $method;

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($params),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("Telegram API error: $error");
            return ['ok' => false, 'error' => 'Network error'];
        }

        $result = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['ok' => false, 'error' => 'Invalid response'];
        }

        return $result;
    }

    /**
     * Send message to user
     */
    public static function sendMessage(int $chatId, string $text, array $options = []): array
    {
        return self::apiRequest('sendMessage', array_merge([
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ], $options));
    }

    /**
     * Send message with inline keyboard
     */
    public static function sendMessageWithKeyboard(
        int $chatId,
        string $text,
        array $keyboard,
        array $options = []
    ): array {
        return self::apiRequest('sendMessage', array_merge([
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'reply_markup' => [
                'inline_keyboard' => $keyboard,
            ],
        ], $options));
    }

    /**
     * Send Mini App button
     */
    public static function sendMiniAppButton(
        int $chatId,
        string $text,
        string $buttonText = 'Open App'
    ): array {
        $miniAppUrl = self::$config['mini_app_url'] ?? '';

        if (empty($miniAppUrl)) {
            return ['ok' => false, 'error' => 'Mini App URL not configured'];
        }

        return self::sendMessageWithKeyboard($chatId, $text, [[
            [
                'text' => $buttonText,
                'web_app' => ['url' => $miniAppUrl],
            ],
        ]]);
    }

    /**
     * Verify WebApp init data
     */
    public static function verifyWebAppData(string $initData): bool
    {
        $token = self::getBotToken();

        if (empty(self::$config['verify_signature'])) {
            return true; // Verification disabled
        }

        return Security::verifyTelegramWebAppData($initData, $token);
    }

    /**
     * Parse user from WebApp init data
     */
    public static function parseWebAppUser(string $initData): ?array
    {
        return Security::parseTelegramUser($initData);
    }

    /**
     * Set webhook.
     *
     * allowed_updates includes chat_member / my_chat_member / chat_join_request
     * for Bot API 9.5 member-tagging and group management events.
     */
    public static function setWebhook(string $url): array
    {
        $secret = self::$config['webhook_secret'] ?? '';

        return self::apiRequest('setWebhook', [
            'url' => $url,
            'secret_token' => $secret,
            'allowed_updates' => [
                'message',
                'callback_query',
                'inline_query',
                'web_app_data',
                'chat_member',
                'my_chat_member',
                'chat_join_request',
            ],
        ]);
    }

    /**
     * Set a member tag in a supergroup chat (Bot API 9.5+).
     * Requires the bot to be an admin with can_manage_tags privilege.
     *
     * @param int    $chatId Unique identifier of the target supergroup
     * @param int    $userId Unique identifier of the target user
     * @param string $tag    Custom tag text (may be empty to remove the tag)
     */
    public static function setChatMemberTag(int $chatId, int $userId, string $tag): array
    {
        return self::apiRequest('setChatMemberTag', [
            'chat_id' => $chatId,
            'user_id' => $userId,
            'tag'     => $tag,
        ]);
    }

    /**
     * Delete webhook
     */
    public static function deleteWebhook(): array
    {
        return self::apiRequest('deleteWebhook');
    }

    /**
     * Get webhook info
     */
    public static function getWebhookInfo(): array
    {
        return self::apiRequest('getWebhookInfo');
    }

    /**
     * Answer callback query
     */
    public static function answerCallbackQuery(
        string $callbackQueryId,
        ?string $text = null,
        bool $showAlert = false
    ): array {
        $params = ['callback_query_id' => $callbackQueryId];

        if ($text !== null) {
            $params['text'] = $text;
            $params['show_alert'] = $showAlert;
        }

        return self::apiRequest('answerCallbackQuery', $params);
    }

    /**
     * Edit message text
     */
    public static function editMessageText(
        int $chatId,
        int $messageId,
        string $text,
        array $options = []
    ): array {
        return self::apiRequest('editMessageText', array_merge([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ], $options));
    }

    /**
     * Get bot info
     */
    public static function getMe(): array
    {
        return self::apiRequest('getMe');
    }

    /**
     * Send notification to user about agent activity
     */
    public static function sendAgentNotification(
        int $chatId,
        string $agentName,
        string $action,
        array $details = []
    ): array {
        $emoji = match ($action) {
            'created' => '🤖',
            'activated' => '▶️',
            'paused' => '⏸️',
            'stopped' => '⏹️',
            'profit' => '📈',
            'loss' => '📉',
            'trade' => '💱',
            'alert' => '⚠️',
            default => '📋',
        };

        $text = "$emoji <b>$agentName</b>\n\n";
        $text .= "Action: " . ucfirst($action) . "\n";

        foreach ($details as $key => $value) {
            $text .= ucfirst($key) . ": $value\n";
        }

        return self::sendMessage($chatId, $text);
    }

    /**
     * Build deep link URL
     */
    public static function buildDeepLink(string $param): string
    {
        $botUsername = self::$config['bot_username'] ?? '';
        return "https://t.me/$botUsername?start=$param";
    }

    /**
     * Build Mini App URL with start parameter
     */
    public static function buildMiniAppLink(string $param = ''): string
    {
        $botUsername = self::$config['bot_username'] ?? '';
        $appName = 'app'; // Default app name

        $url = "https://t.me/$botUsername/$appName";

        if (!empty($param)) {
            $url .= "?startapp=$param";
        }

        return $url;
    }
}
