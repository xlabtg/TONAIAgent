<?php
/**
 * TON AI Agent - AI Provider Integration
 *
 * Handles AI API calls (Groq, OpenAI, Anthropic)
 * All AI calls are server-side only - never expose API keys to client
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Direct access forbidden');
}

class AI
{
    private static array $config = [];
    private static array $providers = [];

    private const PROVIDER_ENDPOINTS = [
        'groq' => 'https://api.groq.com/openai/v1/chat/completions',
        'openai' => 'https://api.openai.com/v1/chat/completions',
        'anthropic' => 'https://api.anthropic.com/v1/messages',
    ];

    /**
     * Initialize with configuration
     */
    public static function init(): void
    {
        $configFile = __DIR__ . '/config.php';
        if (file_exists($configFile)) {
            $config = require $configFile;
            self::$config = $config['ai'] ?? [];
            self::$providers = self::$config['providers'] ?? [];
        }
    }

    /**
     * Get default provider
     */
    private static function getDefaultProvider(): string
    {
        if (empty(self::$config)) {
            self::init();
        }
        return self::$config['default_provider'] ?? 'groq';
    }

    /**
     * Get provider configuration
     */
    private static function getProviderConfig(string $provider): array
    {
        if (empty(self::$providers)) {
            self::init();
        }
        return self::$providers[$provider] ?? [];
    }

    /**
     * Make chat completion request
     */
    public static function chat(
        string $message,
        ?string $systemPrompt = null,
        ?string $provider = null,
        array $options = []
    ): array {
        $provider = $provider ?? self::getDefaultProvider();
        $config = self::getProviderConfig($provider);

        if (empty($config['api_key'])) {
            // Try fallback providers
            foreach (['groq', 'openai', 'anthropic'] as $fallback) {
                if ($fallback !== $provider) {
                    $fallbackConfig = self::getProviderConfig($fallback);
                    if (!empty($fallbackConfig['api_key'])) {
                        $provider = $fallback;
                        $config = $fallbackConfig;
                        break;
                    }
                }
            }
        }

        if (empty($config['api_key'])) {
            return [
                'success' => false,
                'error' => 'No AI provider configured',
            ];
        }

        // Route to appropriate provider
        return match ($provider) {
            'anthropic' => self::anthropicChat($message, $systemPrompt, $config, $options),
            default => self::openaiCompatibleChat($provider, $message, $systemPrompt, $config, $options),
        };
    }

    /**
     * OpenAI-compatible chat (Groq, OpenAI)
     */
    private static function openaiCompatibleChat(
        string $provider,
        string $message,
        ?string $systemPrompt,
        array $config,
        array $options
    ): array {
        $endpoint = self::PROVIDER_ENDPOINTS[$provider] ?? self::PROVIDER_ENDPOINTS['openai'];

        $messages = [];

        if ($systemPrompt) {
            $messages[] = ['role' => 'system', 'content' => $systemPrompt];
        }

        $messages[] = ['role' => 'user', 'content' => $message];

        $payload = [
            'model' => $config['model'],
            'messages' => $messages,
            'max_tokens' => $options['max_tokens'] ?? $config['max_tokens'] ?? 4096,
            'temperature' => $options['temperature'] ?? 0.7,
        ];

        $response = self::makeRequest($endpoint, $payload, [
            'Authorization: Bearer ' . $config['api_key'],
            'Content-Type: application/json',
        ]);

        if (!$response['success']) {
            return $response;
        }

        $data = $response['data'];

        return [
            'success' => true,
            'content' => $data['choices'][0]['message']['content'] ?? '',
            'usage' => $data['usage'] ?? [],
            'provider' => $provider,
        ];
    }

    /**
     * Anthropic chat
     */
    private static function anthropicChat(
        string $message,
        ?string $systemPrompt,
        array $config,
        array $options
    ): array {
        $endpoint = self::PROVIDER_ENDPOINTS['anthropic'];

        $payload = [
            'model' => $config['model'],
            'max_tokens' => $options['max_tokens'] ?? $config['max_tokens'] ?? 4096,
            'messages' => [
                ['role' => 'user', 'content' => $message],
            ],
        ];

        if ($systemPrompt) {
            $payload['system'] = $systemPrompt;
        }

        $response = self::makeRequest($endpoint, $payload, [
            'x-api-key: ' . $config['api_key'],
            'anthropic-version: 2023-06-01',
            'Content-Type: application/json',
        ]);

        if (!$response['success']) {
            return $response;
        }

        $data = $response['data'];

        return [
            'success' => true,
            'content' => $data['content'][0]['text'] ?? '',
            'usage' => $data['usage'] ?? [],
            'provider' => 'anthropic',
        ];
    }

    /**
     * Make HTTP request
     */
    private static function makeRequest(string $url, array $payload, array $headers): array
    {
        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("AI API error: $error");
            return ['success' => false, 'error' => 'Network error'];
        }

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['success' => false, 'error' => 'Invalid response'];
        }

        if ($httpCode >= 400) {
            $errorMsg = $data['error']['message'] ?? $data['error'] ?? 'API error';
            error_log("AI API error ($httpCode): $errorMsg");
            return ['success' => false, 'error' => $errorMsg];
        }

        return ['success' => true, 'data' => $data];
    }

    /**
     * Generate strategy explanation
     */
    public static function explainStrategy(string $strategyName, string $strategyDescription): array
    {
        $systemPrompt = "You are a helpful AI assistant for TON AI Agent, a platform for autonomous trading agents on TON blockchain. Explain trading strategies in simple terms that anyone can understand. Be concise but informative. Focus on risks and potential rewards.";

        $message = "Please explain this trading strategy:\n\nName: $strategyName\nDescription: $strategyDescription\n\nExplain:\n1. How it works\n2. Potential risks\n3. Expected returns\n4. Who should use it";

        return self::chat($message, $systemPrompt);
    }

    /**
     * Generate risk warning
     */
    public static function generateRiskWarning(float $investmentAmount, string $strategyType): array
    {
        $systemPrompt = "You are a risk advisor for a crypto trading platform. Generate brief, clear risk warnings. Be honest about potential losses.";

        $message = "Generate a brief risk warning for:\n- Investment: $investmentAmount TON\n- Strategy type: $strategyType";

        return self::chat($message, $systemPrompt, null, ['max_tokens' => 256]);
    }

    /**
     * Get investment recommendation
     */
    public static function getRecommendation(
        float $portfolioValue,
        string $riskTolerance,
        array $currentAllocations
    ): array {
        $systemPrompt = "You are a crypto investment advisor. Provide personalized recommendations based on user's portfolio and risk tolerance. Be conservative and always recommend diversification.";

        $allocationsStr = json_encode($currentAllocations);
        $message = "Based on this portfolio, recommend allocations:\n\nPortfolio value: $portfolioValue TON\nRisk tolerance: $riskTolerance\nCurrent allocations: $allocationsStr";

        return self::chat($message, $systemPrompt);
    }

    /**
     * Onboarding assistance
     */
    public static function onboardingHelp(string $question): array
    {
        $systemPrompt = "You are a friendly onboarding assistant for TON AI Agent. Help new users understand how to use the platform. Be encouraging and explain crypto/DeFi concepts simply.";

        return self::chat($question, $systemPrompt);
    }
}
