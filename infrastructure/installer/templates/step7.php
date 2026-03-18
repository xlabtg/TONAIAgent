<?php
/**
 * Step 7 Template: Security Configuration
 */

$sec = $stepData['security'] ?? [];
$rateLimit = $sec['rate_limit'] ?? [];
$session = $sec['session'] ?? [];
?>

<form method="POST">
    <?= csrfField() ?>
    <div class="form-group">
        <label for="app_secret"><?= __('sec_app_secret') ?></label>
        <input type="text" class="form-control" id="app_secret" name="app_secret"
               value="<?= htmlspecialchars($sec['app_secret']) ?>" readonly
               style="background: var(--bg-dark); cursor: not-allowed;">
        <span class="form-hint"><?= __('sec_app_secret_hint') ?></span>
    </div>

    <div class="form-group">
        <label for="webhook_secret"><?= __('sec_webhook_secret') ?></label>
        <input type="text" class="form-control" id="webhook_secret" name="webhook_secret"
               value="<?= htmlspecialchars($sec['webhook_secret']) ?>" readonly
               style="background: var(--bg-dark); cursor: not-allowed;">
        <span class="form-hint"><?= __('sec_webhook_secret_hint') ?></span>
    </div>

    <hr style="border-color: var(--border); margin: 24px 0;">

    <div class="form-group">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" name="csrf_enabled" value="1"
                   <?= $sec['csrf_enabled'] ? 'checked' : '' ?>
                   style="width: 18px; height: 18px;">
            <span><?= __('sec_csrf') ?></span>
        </label>
        <span class="form-hint" style="margin-left: 28px;"><?= __('sec_csrf_hint') ?></span>
    </div>

    <div class="form-group">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" name="rate_limit_enabled" value="1"
                   <?= $rateLimit['enabled'] ? 'checked' : '' ?>
                   style="width: 18px; height: 18px;">
            <span><?= __('sec_rate_limit') ?></span>
        </label>
        <span class="form-hint" style="margin-left: 28px;"><?= __('sec_rate_limit_hint') ?></span>
    </div>

    <div class="form-row" style="margin-left: 28px;">
        <div class="form-group">
            <label for="rate_max"><?= __('sec_rate_max') ?></label>
            <input type="number" class="form-control" id="rate_max" name="rate_max"
                   value="<?= htmlspecialchars($rateLimit['max_requests']) ?>"
                   min="10" max="1000">
        </div>
        <div class="form-group">
            <label for="rate_window"><?= __('sec_rate_window') ?></label>
            <input type="number" class="form-control" id="rate_window" name="rate_window"
                   value="<?= htmlspecialchars($rateLimit['time_window']) ?>"
                   min="10" max="3600">
        </div>
    </div>

    <hr style="border-color: var(--border); margin: 24px 0;">

    <h4 style="margin-bottom: 16px;"><?= __('sec_session') ?></h4>

    <div class="form-group">
        <label for="session_lifetime"><?= __('sec_session_lifetime') ?></label>
        <input type="number" class="form-control" id="session_lifetime" name="session_lifetime"
               value="<?= htmlspecialchars($session['lifetime']) ?>"
               min="300" max="86400" style="max-width: 200px;">
        <span class="form-hint">Default: 7200 (2 hours)</span>
    </div>

    <div class="btn-group">
        <a href="?step=6" class="btn btn-outline">
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
