<?php
/**
 * TON AI Agent - AI Provider Integration
 *
 * Handles AI requests to Groq, OpenAI, and Anthropic.
 * All AI calls are server-side only - never expose API keys to frontend.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'ai.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

class AIProvider {
    private array $config;
    private string $provider;

    public function __construct(array $config) {
        $this->config = $config;
        $this->provider = $config['default_provider'] ?? 'groq';
    }

    /**
     * Set active provider
     */
    public function setProvider(string $provider): void {
        if (!isset($this->config['providers'][$provider])) {
            throw new InvalidArgumentException("Unknown AI provider: $provider");
        }
        $this->provider = $provider;
    }

    /**
     * Get available providers
     */
    public function getAvailableProviders(): array {
        $available = [];
        foreach ($this->config['providers'] as $name => $config) {
            if (!empty($config['api_key'])) {
                $available[] = $name;
            }
        }
        return $available;
    }

    /**
     * Send chat completion request
     */
    public function chat(string $message, array $options = []): array {
        $providerConfig = $this->config['providers'][$this->provider];

        if (empty($providerConfig['api_key'])) {
            throw new RuntimeException("API key not configured for provider: {$this->provider}");
        }

        switch ($this->provider) {
            case 'groq':
                return $this->chatGroq($message, $providerConfig, $options);
            case 'openai':
                return $this->chatOpenAI($message, $providerConfig, $options);
            case 'anthropic':
                return $this->chatAnthropic($message, $providerConfig, $options);
            default:
                throw new RuntimeException("Unsupported provider: {$this->provider}");
        }
    }

    /**
     * Chat with Groq
     */
    private function chatGroq(string $message, array $config, array $options): array {
        $url = 'https://api.groq.com/openai/v1/chat/completions';

        $payload = [
            'model' => $options['model'] ?? $config['model'],
            'messages' => $options['messages'] ?? [
                ['role' => 'user', 'content' => $message]
            ],
            'max_tokens' => $options['max_tokens'] ?? $config['max_tokens'],
            'temperature' => $options['temperature'] ?? 0.7
        ];

        return $this->sendRequest($url, $config['api_key'], $payload);
    }

    /**
     * Chat with OpenAI
     */
    private function chatOpenAI(string $message, array $config, array $options): array {
        $url = 'https://api.openai.com/v1/chat/completions';

        $payload = [
            'model' => $options['model'] ?? $config['model'],
            'messages' => $options['messages'] ?? [
                ['role' => 'user', 'content' => $message]
            ],
            'max_tokens' => $options['max_tokens'] ?? $config['max_tokens'],
            'temperature' => $options['temperature'] ?? 0.7
        ];

        return $this->sendRequest($url, $config['api_key'], $payload);
    }

    /**
     * Chat with Anthropic
     */
    private function chatAnthropic(string $message, array $config, array $options): array {
        $url = 'https://api.anthropic.com/v1/messages';

        $payload = [
            'model' => $options['model'] ?? $config['model'],
            'max_tokens' => $options['max_tokens'] ?? $config['max_tokens'],
            'messages' => $options['messages'] ?? [
                ['role' => 'user', 'content' => $message]
            ]
        ];

        $headers = [
            'Content-Type: application/json',
            'x-api-key: ' . $config['api_key'],
            'anthropic-version: 2023-06-01'
        ];

        return $this->sendRequest($url, null, $payload, $headers);
    }

    /**
     * Send HTTP request
     */
    private function sendRequest(string $url, ?string $apiKey, array $payload, ?array $headers = null): array {
        if ($headers === null) {
            $headers = [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey
            ];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => json_encode($payload),
                'timeout' => 60
            ]
        ]);

        $result = @file_get_contents($url, false, $context);

        if ($result === false) {
            throw new RuntimeException('AI API request failed');
        }

        $data = json_decode($result, true);

        if (isset($data['error'])) {
            throw new RuntimeException('AI API error: ' . ($data['error']['message'] ?? 'Unknown error'));
        }

        return $data;
    }

    /**
     * Get response text from API result
     */
    public function getResponseText(array $result): string {
        // Handle different API response formats
        if (isset($result['choices'][0]['message']['content'])) {
            // OpenAI/Groq format
            return $result['choices'][0]['message']['content'];
        }

        if (isset($result['content'][0]['text'])) {
            // Anthropic format
            return $result['content'][0]['text'];
        }

        return '';
    }

    /**
     * Get strategy recommendations
     */
    public function getStrategyRecommendations(array $userProfile): string {
        $systemPrompt = "You are a TON AI Agent advisor. Based on the user's profile, recommend suitable trading strategies. Be concise and focus on actionable advice.";

        $userMessage = sprintf(
            "User Profile:\n- Risk Tolerance: %s\n- Investment Goal: %s\n- Experience Level: %s\n- Available Capital: %s TON\n\nRecommend 2-3 suitable strategies from: DCA, Yield Farming, Liquidity Management, Rebalancing, Arbitrage.",
            $userProfile['risk_tolerance'] ?? 'moderate',
            $userProfile['goal'] ?? 'passive income',
            $userProfile['experience'] ?? 'beginner',
            $userProfile['capital'] ?? '100'
        );

        $result = $this->chat($userMessage, [
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userMessage]
            ]
        ]);

        return $this->getResponseText($result);
    }

    /**
     * Explain strategy
     */
    public function explainStrategy(string $strategyName): string {
        $prompt = "Explain the '$strategyName' trading strategy in simple terms. Include: What it does, how it works, risks involved, and who it's suitable for. Keep it under 200 words.";

        $result = $this->chat($prompt);
        return $this->getResponseText($result);
    }

    /**
     * Get risk assessment
     */
    public function getRiskAssessment(array $portfolio): string {
        $systemPrompt = "You are a risk analyst for TON AI Agent. Analyze the portfolio and provide a risk assessment.";

        $portfolioJson = json_encode($portfolio, JSON_PRETTY_PRINT);
        $userMessage = "Analyze this portfolio for risks:\n$portfolioJson\n\nProvide: Risk Level (Low/Medium/High), Key Risks, Recommendations. Keep response under 150 words.";

        $result = $this->chat($userMessage, [
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userMessage]
            ]
        ]);

        return $this->getResponseText($result);
    }

    /**
     * Assist with onboarding
     */
    public function assistOnboarding(string $question): string {
        $systemPrompt = "You are a friendly TON AI Agent assistant helping new users. Answer questions about the platform, strategies, and getting started. Be helpful, concise, and encouraging.";

        $result = $this->chat($question, [
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $question]
            ],
            'max_tokens' => 500
        ]);

        return $this->getResponseText($result);
    }
}

/**
 * AI Assistant with conversation history
 */
class AIAssistant {
    private AIProvider $provider;
    private array $history = [];
    private int $maxHistory = 10;

    public function __construct(AIProvider $provider) {
        $this->provider = $provider;
    }

    /**
     * Send message with conversation context
     */
    public function send(string $message): string {
        // Add user message to history
        $this->history[] = ['role' => 'user', 'content' => $message];

        // Trim history if too long
        while (count($this->history) > $this->maxHistory * 2) {
            array_shift($this->history);
        }

        // Build messages array with system prompt
        $messages = array_merge(
            [['role' => 'system', 'content' => $this->getSystemPrompt()]],
            $this->history
        );

        // Get response
        $result = $this->provider->chat($message, ['messages' => $messages]);
        $response = $this->provider->getResponseText($result);

        // Add assistant response to history
        $this->history[] = ['role' => 'assistant', 'content' => $response];

        return $response;
    }

    /**
     * Clear conversation history
     */
    public function clearHistory(): void {
        $this->history = [];
    }

    /**
     * Get conversation history
     */
    public function getHistory(): array {
        return $this->history;
    }

    /**
     * Get system prompt
     */
    private function getSystemPrompt(): string {
        return "You are a helpful TON AI Agent assistant. You help users with:
- Understanding trading strategies (DCA, Yield Farming, Liquidity Management, Rebalancing, Arbitrage)
- Managing their AI agents
- Answering questions about the TON blockchain
- Providing risk warnings and best practices

Be concise, friendly, and helpful. Always prioritize user safety and never encourage risky behavior.";
    }
}
