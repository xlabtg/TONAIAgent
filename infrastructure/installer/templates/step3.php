<?php
/**
 * Step 3 Template: Telegram Bot Configuration (Smart Setup Wizard)
 *
 * Features a guided setup flow with:
 * - Real-time token validation
 * - Bot info auto-detection
 * - Automatic provisioning options
 * - Health check diagnostics
 */

$tg = $stepData['telegram'] ?? [];
$isHttps = $tg['is_https'] ?? false;
?>

<!-- BotFather Instructions -->
<div class="alert alert-info">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
    <div>
        <strong><?= __('tg_botfather_title') ?>:</strong><br>
        1. <?= __('tg_botfather_step1') ?> <a href="https://t.me/BotFather" target="_blank" rel="noopener" style="color: var(--primary-light);">@BotFather</a><br>
        2. <?= __('tg_botfather_step2') ?><br>
        3. <?= __('tg_botfather_step3') ?>
    </div>
</div>

<?php if (!$isHttps): ?>
<div class="alert alert-warning">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    <div>
        <strong><?= __('tg_https_warning') ?></strong><br>
        <?= __('tg_https_warning_detail') ?>
    </div>
</div>
<?php endif; ?>

<form method="POST" id="telegram-form" autocomplete="off">
    <?= csrfField() ?>
    <!-- Bot Token Input -->
    <div class="form-group">
        <label for="bot_token"><?= __('tg_token') ?> <span class="required">*</span></label>
        <div style="position: relative;">
            <input type="text" class="form-control" id="bot_token" name="bot_token"
                   value="<?= htmlspecialchars($tg['bot_token']) ?>"
                   placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                   required autocomplete="off"
                   style="padding-right: 100px;">
            <button type="button" id="validate-token-btn" class="btn btn-outline"
                    style="position: absolute; right: 4px; top: 4px; bottom: 4px; padding: 0 12px; font-size: 12px;">
                <?= __('tg_validate') ?>
            </button>
        </div>
        <span class="form-hint"><?= __('tg_token_hint') ?></span>
    </div>

    <!-- Bot Info Display (populated after validation) -->
    <div id="bot-info-card" class="bot-info-card" style="display: none;">
        <div class="bot-info-header">
            <div class="bot-avatar" id="bot-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
            </div>
            <div class="bot-info-text">
                <div class="bot-name" id="bot-name">Bot Name</div>
                <div class="bot-username" id="bot-username-display">@username</div>
            </div>
            <div class="bot-status" id="bot-status">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <?= __('tg_validated') ?>
            </div>
        </div>
        <div class="bot-capabilities" id="bot-capabilities">
            <!-- Filled dynamically -->
        </div>
    </div>

    <!-- Hidden Bot Username -->
    <input type="hidden" id="bot_username" name="bot_username" value="<?= htmlspecialchars($tg['bot_username']) ?>">

    <!-- Auto-Provisioning Options -->
    <div class="provisioning-options" id="provisioning-options" style="<?= empty($tg['bot_token']) ? 'display: none;' : '' ?>">
        <h4 style="margin-bottom: 16px; font-size: 14px; color: var(--text-primary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
            <?= __('tg_auto_provisioning') ?>
        </h4>

        <div class="option-cards">
            <!-- Commands Option -->
            <label class="option-card">
                <input type="checkbox" name="set_commands" value="1" checked>
                <div class="option-card-content">
                    <div class="option-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    </div>
                    <div class="option-text">
                        <div class="option-title"><?= __('tg_option_commands') ?></div>
                        <div class="option-desc"><?= __('tg_option_commands_desc') ?></div>
                    </div>
                    <div class="option-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>
            </label>

            <!-- Webhook Option -->
            <label class="option-card <?= $isHttps ? '' : 'disabled' ?>">
                <input type="checkbox" name="setup_webhook" value="1" <?= $isHttps ? 'checked' : 'disabled' ?>>
                <div class="option-card-content">
                    <div class="option-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </div>
                    <div class="option-text">
                        <div class="option-title"><?= __('tg_option_webhook') ?></div>
                        <div class="option-desc">
                            <?= $isHttps ? __('tg_option_webhook_desc') : __('tg_option_webhook_https_required') ?>
                        </div>
                    </div>
                    <div class="option-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>
            </label>

            <!-- Menu Button Option -->
            <label class="option-card <?= $isHttps ? '' : 'disabled' ?>">
                <input type="checkbox" name="setup_menu_button" value="1" <?= $isHttps ? 'checked' : 'disabled' ?>>
                <div class="option-card-content">
                    <div class="option-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                            <line x1="12" y1="18" x2="12.01" y2="18"></line>
                        </svg>
                    </div>
                    <div class="option-text">
                        <div class="option-title"><?= __('tg_option_menu_button') ?></div>
                        <div class="option-desc">
                            <?= $isHttps ? __('tg_option_menu_button_desc') : __('tg_option_webhook_https_required') ?>
                        </div>
                    </div>
                    <div class="option-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>
            </label>
        </div>
    </div>

    <!-- Webhook URL Preview -->
    <div class="collapsible" id="webhook-details" style="margin-top: 20px;">
        <div class="collapsible-header">
            <span><?= __('tg_webhook') ?></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <p style="color: var(--text-secondary); margin-bottom: 12px;"><?= __('tg_webhook_hint') ?></p>
            <code style="display: block; background: var(--bg-dark); padding: 12px; border-radius: 6px; font-size: 13px; word-break: break-all;">
                <?= htmlspecialchars($tg['webhook_url']) ?>
            </code>
        </div>
    </div>

    <!-- Bot Commands Preview -->
    <div class="collapsible" style="margin-top: 12px;">
        <div class="collapsible-header">
            <span><?= __('tg_commands') ?></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <p style="color: var(--text-secondary); margin-bottom: 12px;"><?= __('tg_commands_hint') ?></p>
            <ul style="margin-left: 20px; color: var(--text-secondary);">
                <li><code>/start</code> - Start the bot and open Mini App</li>
                <li><code>/dashboard</code> - Open your dashboard</li>
                <li><code>/agents</code> - Manage your AI agents</li>
                <li><code>/marketplace</code> - Browse strategy marketplace</li>
                <li><code>/settings</code> - Configure your settings</li>
                <li><code>/help</code> - Get help and documentation</li>
            </ul>
        </div>
    </div>

    <!-- Navigation -->
    <div class="btn-group">
        <a href="?step=2" class="btn btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <?= __('back') ?>
        </a>
        <button type="submit" class="btn btn-primary" id="submit-btn">
            <?= __('tg_provision_continue') ?>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        </button>
    </div>
</form>

<style>
    .bot-info-card {
        background: var(--bg-input);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
    }

    .bot-info-header {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .bot-avatar {
        width: 48px;
        height: 48px;
        background: var(--primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .bot-avatar svg {
        width: 24px;
        height: 24px;
        stroke: white;
    }

    .bot-info-text {
        flex: 1;
    }

    .bot-name {
        font-weight: 600;
        font-size: 16px;
    }

    .bot-username {
        color: var(--text-muted);
        font-size: 14px;
    }

    .bot-status {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--success);
        font-size: 13px;
        font-weight: 500;
    }

    .bot-status svg {
        width: 16px;
        height: 16px;
    }

    .bot-capabilities {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
    }

    .capability-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: var(--bg-dark);
        border-radius: 20px;
        font-size: 12px;
        color: var(--text-secondary);
    }

    .capability-badge.active {
        background: rgba(16, 185, 129, 0.15);
        color: var(--success);
    }

    .capability-badge svg {
        width: 12px;
        height: 12px;
    }

    .provisioning-options {
        background: var(--bg-input);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .option-cards {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .option-card {
        display: block;
        cursor: pointer;
    }

    .option-card.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .option-card input {
        display: none;
    }

    .option-card-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--bg-dark);
        border: 2px solid var(--border);
        border-radius: 8px;
        transition: all 0.2s;
    }

    .option-card:hover:not(.disabled) .option-card-content {
        border-color: var(--primary);
    }

    .option-card input:checked + .option-card-content {
        border-color: var(--primary);
        background: rgba(0, 136, 204, 0.1);
    }

    .option-icon {
        width: 36px;
        height: 36px;
        background: var(--bg-input);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .option-icon svg {
        width: 18px;
        height: 18px;
        stroke: var(--text-secondary);
    }

    .option-card input:checked + .option-card-content .option-icon {
        background: var(--primary);
    }

    .option-card input:checked + .option-card-content .option-icon svg {
        stroke: white;
    }

    .option-text {
        flex: 1;
    }

    .option-title {
        font-weight: 500;
        font-size: 14px;
        margin-bottom: 2px;
    }

    .option-desc {
        font-size: 12px;
        color: var(--text-muted);
    }

    .option-check {
        width: 24px;
        height: 24px;
        border: 2px solid var(--border);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .option-check svg {
        width: 14px;
        height: 14px;
        stroke: transparent;
    }

    .option-card input:checked + .option-card-content .option-check {
        background: var(--primary);
        border-color: var(--primary);
    }

    .option-card input:checked + .option-card-content .option-check svg {
        stroke: white;
    }

    @media (max-width: 600px) {
        .bot-info-header {
            flex-wrap: wrap;
        }

        .bot-status {
            width: 100%;
            margin-top: 8px;
        }
    }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const tokenInput = document.getElementById('bot_token');
    const validateBtn = document.getElementById('validate-token-btn');
    const botInfoCard = document.getElementById('bot-info-card');
    const provisioningOptions = document.getElementById('provisioning-options');
    const submitBtn = document.getElementById('submit-btn');

    let isValidated = <?= !empty($tg['bot_token']) ? 'true' : 'false' ?>;

    // Token validation
    validateBtn.addEventListener('click', async function() {
        const token = tokenInput.value.trim();
        if (!token) {
            alert('<?= __('error_required') ?>');
            return;
        }

        validateBtn.disabled = true;
        validateBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>';

        try {
            const formData = new FormData();
            formData.append('action', 'validate_token');
            formData.append('bot_token', token);

            const response = await fetch('?step=3', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showBotInfo(result.bot_info);
                isValidated = true;
                provisioningOptions.style.display = 'block';
                document.getElementById('bot_username').value = result.bot_info.bot_username || '';
            } else {
                alert(result.error || '<?= __('tg_invalid') ?>');
                botInfoCard.style.display = 'none';
                isValidated = false;
            }
        } catch (error) {
            alert('<?= __('tg_invalid') ?>');
            console.error('Validation error:', error);
        } finally {
            validateBtn.disabled = false;
            validateBtn.textContent = '<?= __('tg_validate') ?>';
        }
    });

    function showBotInfo(info) {
        document.getElementById('bot-name').textContent = info.bot_first_name || 'Bot';
        document.getElementById('bot-username-display').textContent = '@' + (info.bot_username || 'unknown');

        // Show capabilities
        const capsContainer = document.getElementById('bot-capabilities');
        capsContainer.innerHTML = '';

        const capabilities = [
            { key: 'can_join_groups', label: 'Can Join Groups' },
            { key: 'can_read_all_group_messages', label: 'Privacy Mode Off' },
            { key: 'supports_inline_queries', label: 'Inline Queries' },
        ];

        capabilities.forEach(cap => {
            const isActive = info[cap.key];
            const badge = document.createElement('span');
            badge.className = 'capability-badge' + (isActive ? ' active' : '');
            badge.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${isActive
                        ? '<polyline points="20 6 9 17 4 12"></polyline>'
                        : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
                    }
                </svg>
                ${cap.label}
            `;
            capsContainer.appendChild(badge);
        });

        botInfoCard.style.display = 'block';
    }

    // Show bot info if already validated
    <?php if (!empty($tg['bot_token']) && !empty($savedTg['bot_info'])): ?>
    showBotInfo(<?= json_encode($savedTg['bot_info']) ?>);
    <?php endif; ?>

    // Form submission
    document.getElementById('telegram-form').addEventListener('submit', function(e) {
        if (!isValidated) {
            e.preventDefault();
            alert('<?= __('tg_validate_first') ?>');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> <?= __('processing') ?>';
    });

    // Auto-validate on paste
    tokenInput.addEventListener('paste', function() {
        setTimeout(() => {
            if (tokenInput.value.trim().match(/^\d+:[A-Za-z0-9_-]{35,}$/)) {
                validateBtn.click();
            }
        }, 100);
    });
});
</script>
