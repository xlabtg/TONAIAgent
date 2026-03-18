<?php
/**
 * Step 5: AI Provider Setup
 *
 * Features:
 * - Dynamic Groq model fetching from API
 * - Support for multiple AI providers (Groq, OpenAI, Anthropic, Google, xAI, OpenRouter)
 * - API key validation
 * - Fallback provider configuration
 */

/**
 * Fetch available Groq models dynamically
 */
function fetchGroqModels(string $apiKey): array {
    $defaultModels = [
        ['id' => 'llama-3.3-70b-versatile', 'name' => 'Llama 3.3 70B', 'context' => 128000, 'speed' => 'fast'],
        ['id' => 'llama-3.1-70b-versatile', 'name' => 'Llama 3.1 70B', 'context' => 131072, 'speed' => 'fast'],
        ['id' => 'llama-3.1-8b-instant', 'name' => 'Llama 3.1 8B', 'context' => 131072, 'speed' => 'very fast'],
        ['id' => 'mixtral-8x7b-32768', 'name' => 'Mixtral 8x7B', 'context' => 32768, 'speed' => 'fast'],
        ['id' => 'gemma2-9b-it', 'name' => 'Gemma 2 9B', 'context' => 8192, 'speed' => 'very fast'],
    ];

    if (empty($apiKey)) {
        return $defaultModels;
    }

    try {
        $ch = curl_init('https://api.groq.com/openai/v1/models');
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => ["Authorization: Bearer $apiKey"],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            installerLog("Groq API returned HTTP $httpCode, using default models", 'warning');
            return $defaultModels;
        }

        $data = json_decode($response, true);
        if (!isset($data['data']) || !is_array($data['data'])) {
            return $defaultModels;
        }

        $models = [];
        foreach ($data['data'] as $model) {
            if (isset($model['id'])) {
                // Filter for chat models only
                $id = $model['id'];
                if (strpos($id, 'whisper') !== false || strpos($id, 'tool') !== false) {
                    continue;
                }

                $models[] = [
                    'id' => $id,
                    'name' => formatModelName($id),
                    'context' => $model['context_window'] ?? 8192,
                    'speed' => getModelSpeed($id),
                ];
            }
        }

        // Sort by context window descending
        usort($models, function($a, $b) {
            return ($b['context'] ?? 0) - ($a['context'] ?? 0);
        });

        return !empty($models) ? $models : $defaultModels;

    } catch (Exception $e) {
        installerLog('Error fetching Groq models: ' . $e->getMessage(), 'warning');
        return $defaultModels;
    }
}

/**
 * Format model ID into readable name
 */
function formatModelName(string $id): string {
    $parts = explode('-', $id);
    $name = [];
    foreach ($parts as $part) {
        if (is_numeric($part) || preg_match('/^\d+b$/i', $part)) {
            $name[] = strtoupper($part);
        } else {
            $name[] = ucfirst($part);
        }
    }
    return implode(' ', $name);
}

/**
 * Get model speed tier
 */
function getModelSpeed(string $id): string {
    if (strpos($id, '8b') !== false || strpos($id, 'instant') !== false || strpos($id, 'flash') !== false) {
        return 'very fast';
    }
    if (strpos($id, '70b') !== false || strpos($id, 'mixtral') !== false) {
        return 'fast';
    }
    return 'moderate';
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        installerLog('Step 5: Processing AI provider configuration');

        $defaultProvider = trim($_POST['ai_default'] ?? 'groq');

        // Collect all provider configurations
        $providers = [
            'groq' => [
                'api_key' => trim($_POST['groq_api_key'] ?? ''),
                'model' => trim($_POST['groq_model'] ?? 'llama-3.3-70b-versatile'),
            ],
            'openai' => [
                'api_key' => trim($_POST['openai_api_key'] ?? ''),
                'model' => trim($_POST['openai_model'] ?? 'gpt-4o'),
            ],
            'anthropic' => [
                'api_key' => trim($_POST['anthropic_api_key'] ?? ''),
                'model' => trim($_POST['anthropic_model'] ?? 'claude-3-5-sonnet-20241022'),
            ],
            'google' => [
                'api_key' => trim($_POST['google_api_key'] ?? ''),
                'model' => trim($_POST['google_model'] ?? 'gemini-1.5-pro'),
            ],
            'xai' => [
                'api_key' => trim($_POST['xai_api_key'] ?? ''),
                'model' => trim($_POST['xai_model'] ?? 'grok-2'),
            ],
            'openrouter' => [
                'api_key' => trim($_POST['openrouter_api_key'] ?? ''),
                'model' => trim($_POST['openrouter_model'] ?? 'anthropic/claude-3.5-sonnet'),
            ],
        ];

        // Check that at least one provider is configured
        $hasProvider = false;
        foreach ($providers as $name => $config) {
            if (!empty($config['api_key'])) {
                $hasProvider = true;
                break;
            }
        }

        if (!$hasProvider) {
            $_SESSION['installer_error'] = __('error_ai_required');
            header('Location: ?step=5');
            exit;
        }

        // Validate the default provider has a key
        if (empty($providers[$defaultProvider]['api_key'])) {
            // Switch to first available provider
            foreach ($providers as $name => $config) {
                if (!empty($config['api_key'])) {
                    $defaultProvider = $name;
                    installerLog("Default provider switched to $name (original had no key)");
                    break;
                }
            }
        }

        // Validate API keys
        $validationWarnings = [];

        // Validate Groq key
        if (!empty($providers['groq']['api_key'])) {
            $ch = curl_init('https://api.groq.com/openai/v1/models');
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER => ["Authorization: Bearer {$providers['groq']['api_key']}"],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                $validationWarnings[] = 'Groq API key validation failed (HTTP ' . $httpCode . ')';
                installerLog("Groq key validation failed: HTTP $httpCode", 'warning');
            }
        }

        // Validate OpenAI key
        if (!empty($providers['openai']['api_key'])) {
            $ch = curl_init('https://api.openai.com/v1/models');
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER => ["Authorization: Bearer {$providers['openai']['api_key']}"],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                $validationWarnings[] = 'OpenAI API key validation failed';
                installerLog("OpenAI key validation failed: HTTP $httpCode", 'warning');
            }
        }

        // Save to session
        $_SESSION['installer_ai'] = [
            'default_provider' => $defaultProvider,
            'providers' => $providers,
        ];

        if (!empty($validationWarnings)) {
            $_SESSION['installer_success'] = __('ai_test_success') . ' ' . __('ai_warnings') . ': ' . implode(', ', $validationWarnings);
        } else {
            $_SESSION['installer_success'] = __('ai_test_success');
        }

        installerLog('Step 5: AI providers configured successfully');
        header('Location: ?step=6');
        exit;

    } catch (Exception $e) {
        installerLog('Step 5: Error: ' . $e->getMessage(), 'error');
        $_SESSION['installer_error'] = 'An error occurred. Please try again.';
        header('Location: ?step=5');
        exit;
    }
}

// Load saved values
$savedAi = $_SESSION['installer_ai'] ?? [];

// Fetch Groq models if we have a key
$groqApiKey = $savedAi['providers']['groq']['api_key'] ?? '';
$groqModels = fetchGroqModels($groqApiKey);

$stepData['ai'] = [
    'default_provider' => $savedAi['default_provider'] ?? 'groq',
    'providers' => $savedAi['providers'] ?? [
        'groq' => ['api_key' => '', 'model' => 'llama-3.3-70b-versatile'],
        'openai' => ['api_key' => '', 'model' => 'gpt-4o'],
        'anthropic' => ['api_key' => '', 'model' => 'claude-3-5-sonnet-20241022'],
        'google' => ['api_key' => '', 'model' => 'gemini-1.5-pro'],
        'xai' => ['api_key' => '', 'model' => 'grok-2'],
        'openrouter' => ['api_key' => '', 'model' => 'anthropic/claude-3.5-sonnet'],
    ],
    'groq_models' => $groqModels,
];
