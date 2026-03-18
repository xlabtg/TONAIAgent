<?php
/**
 * Step 4 Template: Mini App Setup
 */

$miniapp = $stepData['miniapp'] ?? [];
?>

<div class="alert alert-info">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
    <div>
        <?= __('miniapp_botfather_note') ?><br>
        <a href="https://t.me/BotFather" target="_blank" style="color: var(--primary-light);">Open @BotFather</a>
    </div>
</div>

<form method="POST">
    <?= csrfField() ?>
    <div class="form-group">
        <label for="miniapp_url"><?= __('miniapp_url') ?> <span class="required">*</span></label>
        <input type="url" class="form-control" id="miniapp_url" name="miniapp_url"
               value="<?= htmlspecialchars($miniapp['url']) ?>"
               placeholder="https://your-domain.com/app" required>
        <span class="form-hint"><?= __('miniapp_url_hint') ?></span>
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="app_name"><?= __('miniapp_name') ?></label>
            <input type="text" class="form-control" id="app_name" name="app_name"
                   value="<?= htmlspecialchars($miniapp['name']) ?>"
                   placeholder="TON AI Agent">
            <span class="form-hint"><?= __('miniapp_name_hint') ?></span>
        </div>
        <div class="form-group">
            <label for="app_short_name"><?= __('miniapp_short_name') ?></label>
            <input type="text" class="form-control" id="app_short_name" name="app_short_name"
                   value="<?= htmlspecialchars($miniapp['short_name']) ?>"
                   placeholder="TONAI">
            <span class="form-hint"><?= __('miniapp_short_name_hint') ?></span>
        </div>
    </div>

    <div class="form-group">
        <label for="app_description"><?= __('miniapp_description') ?></label>
        <textarea class="form-control" id="app_description" name="app_description"
                  rows="3" placeholder="AI-powered trading agents on TON blockchain"><?= htmlspecialchars($miniapp['description']) ?></textarea>
        <span class="form-hint"><?= __('miniapp_description_hint') ?></span>
    </div>

    <div class="btn-group">
        <a href="?step=3" class="btn btn-outline">
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
