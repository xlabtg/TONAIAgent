<?php
/**
 * Step 9 Template: Installation Complete
 */

$complete = $stepData['complete'] ?? [];
$miniappUrl = $complete['miniapp_url'] ?? '/';
$botUsername = $complete['bot_username'] ?? '';
?>

<div class="complete-section">
    <div class="complete-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    </div>

    <h2><?= __('step_9_title') ?></h2>
    <p><?= __('complete_message') ?></p>

    <div class="btn-group" style="justify-content: center; margin-bottom: 30px;">
        <?php if (!empty($miniappUrl)): ?>
        <a href="<?= htmlspecialchars($miniappUrl) ?>" class="btn btn-primary" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <?= __('complete_open_app') ?>
        </a>
        <?php endif; ?>

        <?php if (!empty($botUsername)): ?>
        <a href="https://t.me/<?= htmlspecialchars($botUsername) ?>" class="btn btn-outline" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            Open Telegram Bot
        </a>
        <?php endif; ?>
    </div>

    <div class="next-steps">
        <h3><?= __('complete_next_steps') ?></h3>
        <ol>
            <li>
                <strong><?= __('complete_step_1') ?></strong><br>
                <small style="color: var(--text-muted);">
                    Open <a href="https://t.me/BotFather" target="_blank" style="color: var(--primary-light);">@BotFather</a> &rarr;
                    /mybots &rarr; Select your bot &rarr; Bot Settings &rarr; Menu Button / Web App
                </small>
            </li>
            <li>
                <strong><?= __('complete_step_2') ?></strong><br>
                <code style="font-size: 13px;">rm -rf /installer</code>
            </li>
            <li><?= __('complete_step_3') ?></li>
            <li><?= __('complete_step_4') ?></li>
        </ol>
    </div>

    <div class="warning-box">
        <strong style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Security Warning
        </strong>
        <?= __('complete_warning') ?>
    </div>
</div>
