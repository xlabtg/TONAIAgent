<?php
/**
 * Step 5 Template: AI Provider Setup
 *
 * Enhanced with:
 * - Dynamic Groq model selection
 * - Additional providers (Google, xAI, OpenRouter)
 * - Model info badges
 */

$ai = $stepData['ai'] ?? [];
$providers = $ai['providers'] ?? [];
$defaultProvider = $ai['default_provider'] ?? 'groq';
$groqModels = $ai['groq_models'] ?? [];
?>

<form method="POST" autocomplete="off">
    <?= csrfField() ?>

    <p style="color: var(--text-secondary); margin-bottom: 20px;">
        <?= __('ai_setup_intro') ?>
    </p>

    <div class="form-group">
        <label><?= __('ai_default') ?></label>
        <div class="provider-cards">
            <label class="provider-card <?= $defaultProvider === 'groq' ? 'selected' : '' ?>">
                <input type="radio" name="ai_default" value="groq" <?= $defaultProvider === 'groq' ? 'checked' : '' ?>>
                <h4><?= __('ai_groq') ?> <span class="model-badge fast">Fastest</span></h4>
                <p><?= __('ai_groq_desc') ?></p>
            </label>
            <label class="provider-card <?= $defaultProvider === 'openai' ? 'selected' : '' ?>">
                <input type="radio" name="ai_default" value="openai" <?= $defaultProvider === 'openai' ? 'checked' : '' ?>>
                <h4><?= __('ai_openai') ?></h4>
                <p><?= __('ai_openai_desc') ?></p>
            </label>
            <label class="provider-card <?= $defaultProvider === 'anthropic' ? 'selected' : '' ?>">
                <input type="radio" name="ai_default" value="anthropic" <?= $defaultProvider === 'anthropic' ? 'checked' : '' ?>>
                <h4><?= __('ai_anthropic') ?> <span class="model-badge smart">Smart</span></h4>
                <p><?= __('ai_anthropic_desc') ?></p>
            </label>
            <label class="provider-card <?= $defaultProvider === 'google' ? 'selected' : '' ?>">
                <input type="radio" name="ai_default" value="google" <?= $defaultProvider === 'google' ? 'checked' : '' ?>>
                <h4><?= __('ai_google') ?></h4>
                <p><?= __('ai_google_desc') ?></p>
            </label>
            <label class="provider-card <?= $defaultProvider === 'xai' ? 'selected' : '' ?>">
                <input type="radio" name="ai_default" value="xai" <?= $defaultProvider === 'xai' ? 'checked' : '' ?>>
                <h4><?= __('ai_xai') ?> <span class="model-badge new">New</span></h4>
                <p><?= __('ai_xai_desc') ?></p>
            </label>
            <label class="provider-card <?= $defaultProvider === 'openrouter' ? 'selected' : '' ?>">
                <input type="radio" name="ai_default" value="openrouter" <?= $defaultProvider === 'openrouter' ? 'checked' : '' ?>>
                <h4><?= __('ai_openrouter') ?></h4>
                <p><?= __('ai_openrouter_desc') ?></p>
            </label>
        </div>
    </div>

    <!-- Groq Configuration -->
    <div class="collapsible open">
        <div class="collapsible-header">
            <span>Groq (<?= __('ai_recommended') ?>)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <div class="form-row">
                <div class="form-group">
                    <label for="groq_api_key"><?= __('ai_api_key') ?></label>
                    <input type="password" class="form-control" id="groq_api_key" name="groq_api_key"
                           value="<?= htmlspecialchars($providers['groq']['api_key'] ?? '') ?>"
                           placeholder="gsk_..." autocomplete="new-password">
                    <span class="form-hint"><?= __('ai_groq_key_hint') ?></span>
                </div>
                <div class="form-group">
                    <label for="groq_model"><?= __('ai_model') ?></label>
                    <select class="form-control" id="groq_model" name="groq_model">
                        <?php foreach ($groqModels as $model): ?>
                        <option value="<?= htmlspecialchars($model['id']) ?>"
                                <?= ($providers['groq']['model'] ?? '') === $model['id'] ? 'selected' : '' ?>>
                            <?= htmlspecialchars($model['name']) ?>
                            (<?= number_format($model['context'] / 1000) ?>k ctx, <?= $model['speed'] ?>)
                        </option>
                        <?php endforeach; ?>
                    </select>
                    <span class="form-hint"><?= __('ai_groq_model_hint') ?></span>
                </div>
            </div>
        </div>
    </div>

    <!-- OpenAI Configuration -->
    <div class="collapsible">
        <div class="collapsible-header">
            <span>OpenAI (<?= __('ai_fallback') ?>)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <div class="form-row">
                <div class="form-group">
                    <label for="openai_api_key"><?= __('ai_api_key') ?></label>
                    <input type="password" class="form-control" id="openai_api_key" name="openai_api_key"
                           value="<?= htmlspecialchars($providers['openai']['api_key'] ?? '') ?>"
                           placeholder="sk-..." autocomplete="new-password">
                    <span class="form-hint"><?= __('ai_openai_key_hint') ?></span>
                </div>
                <div class="form-group">
                    <label for="openai_model"><?= __('ai_model') ?></label>
                    <select class="form-control" id="openai_model" name="openai_model">
                        <option value="gpt-4o" <?= ($providers['openai']['model'] ?? '') === 'gpt-4o' ? 'selected' : '' ?>>GPT-4o (128k ctx, fast)</option>
                        <option value="gpt-4o-mini" <?= ($providers['openai']['model'] ?? '') === 'gpt-4o-mini' ? 'selected' : '' ?>>GPT-4o Mini (128k ctx, very fast)</option>
                        <option value="gpt-4-turbo" <?= ($providers['openai']['model'] ?? '') === 'gpt-4-turbo' ? 'selected' : '' ?>>GPT-4 Turbo (128k ctx)</option>
                        <option value="gpt-3.5-turbo" <?= ($providers['openai']['model'] ?? '') === 'gpt-3.5-turbo' ? 'selected' : '' ?>>GPT-3.5 Turbo (16k ctx, fast)</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <!-- Anthropic Configuration -->
    <div class="collapsible">
        <div class="collapsible-header">
            <span>Anthropic (<?= __('ai_fallback') ?>)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <div class="form-row">
                <div class="form-group">
                    <label for="anthropic_api_key"><?= __('ai_api_key') ?></label>
                    <input type="password" class="form-control" id="anthropic_api_key" name="anthropic_api_key"
                           value="<?= htmlspecialchars($providers['anthropic']['api_key'] ?? '') ?>"
                           placeholder="sk-ant-..." autocomplete="new-password">
                    <span class="form-hint"><?= __('ai_anthropic_key_hint') ?></span>
                </div>
                <div class="form-group">
                    <label for="anthropic_model"><?= __('ai_model') ?></label>
                    <select class="form-control" id="anthropic_model" name="anthropic_model">
                        <option value="claude-3-5-sonnet-20241022" <?= ($providers['anthropic']['model'] ?? '') === 'claude-3-5-sonnet-20241022' ? 'selected' : '' ?>>Claude 3.5 Sonnet (200k ctx)</option>
                        <option value="claude-3-opus-20240229" <?= ($providers['anthropic']['model'] ?? '') === 'claude-3-opus-20240229' ? 'selected' : '' ?>>Claude 3 Opus (200k ctx)</option>
                        <option value="claude-3-sonnet-20240229" <?= ($providers['anthropic']['model'] ?? '') === 'claude-3-sonnet-20240229' ? 'selected' : '' ?>>Claude 3 Sonnet (200k ctx)</option>
                        <option value="claude-3-haiku-20240307" <?= ($providers['anthropic']['model'] ?? '') === 'claude-3-haiku-20240307' ? 'selected' : '' ?>>Claude 3 Haiku (200k ctx, fast)</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <!-- Google Configuration -->
    <div class="collapsible">
        <div class="collapsible-header">
            <span>Google AI (<?= __('ai_optional') ?>)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <div class="form-row">
                <div class="form-group">
                    <label for="google_api_key"><?= __('ai_api_key') ?></label>
                    <input type="password" class="form-control" id="google_api_key" name="google_api_key"
                           value="<?= htmlspecialchars($providers['google']['api_key'] ?? '') ?>"
                           placeholder="AIza..." autocomplete="new-password">
                    <span class="form-hint"><?= __('ai_google_key_hint') ?></span>
                </div>
                <div class="form-group">
                    <label for="google_model"><?= __('ai_model') ?></label>
                    <select class="form-control" id="google_model" name="google_model">
                        <option value="gemini-1.5-pro" <?= ($providers['google']['model'] ?? '') === 'gemini-1.5-pro' ? 'selected' : '' ?>>Gemini 1.5 Pro (1M ctx)</option>
                        <option value="gemini-1.5-flash" <?= ($providers['google']['model'] ?? '') === 'gemini-1.5-flash' ? 'selected' : '' ?>>Gemini 1.5 Flash (1M ctx, fast)</option>
                        <option value="gemini-2.0-flash-exp" <?= ($providers['google']['model'] ?? '') === 'gemini-2.0-flash-exp' ? 'selected' : '' ?>>Gemini 2.0 Flash (experimental)</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <!-- xAI Configuration -->
    <div class="collapsible">
        <div class="collapsible-header">
            <span>xAI / Grok (<?= __('ai_optional') ?>)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <div class="form-row">
                <div class="form-group">
                    <label for="xai_api_key"><?= __('ai_api_key') ?></label>
                    <input type="password" class="form-control" id="xai_api_key" name="xai_api_key"
                           value="<?= htmlspecialchars($providers['xai']['api_key'] ?? '') ?>"
                           placeholder="xai-..." autocomplete="new-password">
                    <span class="form-hint"><?= __('ai_xai_key_hint') ?></span>
                </div>
                <div class="form-group">
                    <label for="xai_model"><?= __('ai_model') ?></label>
                    <select class="form-control" id="xai_model" name="xai_model">
                        <option value="grok-2" <?= ($providers['xai']['model'] ?? '') === 'grok-2' ? 'selected' : '' ?>>Grok 2 (131k ctx)</option>
                        <option value="grok-2-mini" <?= ($providers['xai']['model'] ?? '') === 'grok-2-mini' ? 'selected' : '' ?>>Grok 2 Mini (131k ctx, fast)</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <!-- OpenRouter Configuration -->
    <div class="collapsible">
        <div class="collapsible-header">
            <span>OpenRouter (<?= __('ai_optional') ?>)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <div class="form-row">
                <div class="form-group">
                    <label for="openrouter_api_key"><?= __('ai_api_key') ?></label>
                    <input type="password" class="form-control" id="openrouter_api_key" name="openrouter_api_key"
                           value="<?= htmlspecialchars($providers['openrouter']['api_key'] ?? '') ?>"
                           placeholder="sk-or-..." autocomplete="new-password">
                    <span class="form-hint"><?= __('ai_openrouter_key_hint') ?></span>
                </div>
                <div class="form-group">
                    <label for="openrouter_model"><?= __('ai_model') ?></label>
                    <select class="form-control" id="openrouter_model" name="openrouter_model">
                        <option value="anthropic/claude-3.5-sonnet" <?= ($providers['openrouter']['model'] ?? '') === 'anthropic/claude-3.5-sonnet' ? 'selected' : '' ?>>Claude 3.5 Sonnet</option>
                        <option value="openai/gpt-4o" <?= ($providers['openrouter']['model'] ?? '') === 'openai/gpt-4o' ? 'selected' : '' ?>>GPT-4o</option>
                        <option value="google/gemini-pro-1.5" <?= ($providers['openrouter']['model'] ?? '') === 'google/gemini-pro-1.5' ? 'selected' : '' ?>>Gemini 1.5 Pro</option>
                        <option value="meta-llama/llama-3.1-405b-instruct" <?= ($providers['openrouter']['model'] ?? '') === 'meta-llama/llama-3.1-405b-instruct' ? 'selected' : '' ?>>Llama 3.1 405B</option>
                    </select>
                </div>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">
                <?= __('ai_openrouter_note') ?>
            </p>
        </div>
    </div>

    <div class="btn-group">
        <a href="?step=4" class="btn btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <?= __('back') ?>
        </a>
        <button type="submit" class="btn btn-primary">
            <?= __('continue') ?>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        </button>
    </div>
</form>
