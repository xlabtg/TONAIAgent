<?php
/**
 * Step 8 Template: Admin Account Setup
 *
 * Final step before installation completion.
 * Includes CSRF protection and pre-installation diagnostics.
 */

$admin = $stepData['admin'] ?? [];

$timezones = [
    'UTC' => 'UTC',
    'America/New_York' => 'Eastern Time (US)',
    'America/Chicago' => 'Central Time (US)',
    'America/Denver' => 'Mountain Time (US)',
    'America/Los_Angeles' => 'Pacific Time (US)',
    'Europe/London' => 'London',
    'Europe/Paris' => 'Paris',
    'Europe/Berlin' => 'Berlin',
    'Europe/Moscow' => 'Moscow',
    'Asia/Tokyo' => 'Tokyo',
    'Asia/Shanghai' => 'Shanghai',
    'Asia/Hong_Kong' => 'Hong Kong',
    'Asia/Singapore' => 'Singapore',
    'Asia/Dubai' => 'Dubai',
    'Australia/Sydney' => 'Sydney',
];

// Pre-installation diagnostics
$diagnostics = [];
$allGood = true;

// Check required directories
$dirs = [
    APP_ROOT . '/telegram-miniapp' => 'telegram-miniapp',
    APP_ROOT . '/telegram-miniapp/app' => 'telegram-miniapp/app',
];

foreach ($dirs as $path => $name) {
    $exists = is_dir($path);
    $writable = $exists && is_writable($path);
    $diagnostics['dir_' . md5($path)] = [
        'name' => $name,
        'status' => $writable ? 'pass' : ($exists ? 'warn' : 'fail'),
        'message' => $writable ? 'Ready' : ($exists ? 'Not writable' : 'Missing'),
    ];
    if (!$writable) $allGood = false;
}

// Check session data
$requiredSessions = ['installer_db', 'installer_telegram', 'installer_ai', 'installer_security'];
foreach ($requiredSessions as $key) {
    $hasData = !empty($_SESSION[$key]);
    $name = str_replace('installer_', '', $key);
    $diagnostics['session_' . $key] = [
        'name' => ucfirst($name) . ' config',
        'status' => $hasData ? 'pass' : 'fail',
        'message' => $hasData ? 'Configured' : 'Missing - go back to step',
    ];
    if (!$hasData) $allGood = false;
}
?>

<!-- Pre-installation Diagnostics -->
<div class="diagnostics-panel <?= $allGood ? 'success' : 'error' ?>">
    <h4>
        <?php if ($allGood): ?>
        <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <?= __('diag_ready') ?>
        <?php else: ?>
        <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <?= __('diag_issues') ?>
        <?php endif; ?>
    </h4>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-top: 12px;">
        <?php foreach ($diagnostics as $diag): ?>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-dark); border-radius: 4px;">
            <span style="font-size: 13px;"><?= htmlspecialchars($diag['name']) ?></span>
            <span class="requirement-status <?= $diag['status'] ?>" style="font-size: 12px;">
                <?= htmlspecialchars($diag['message']) ?>
            </span>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<form method="POST" autocomplete="off">
    <?= csrfField() ?>

    <div class="form-group">
        <label for="admin_tg_id"><?= __('admin_tg_id') ?></label>
        <input type="text" class="form-control" id="admin_tg_id" name="admin_tg_id"
               value="<?= htmlspecialchars($admin['telegram_id'] ?? '') ?>"
               placeholder="123456789">
        <span class="form-hint"><?= __('admin_tg_id_hint') ?></span>
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="admin_username"><?= __('admin_username') ?> <span class="required">*</span></label>
            <input type="text" class="form-control" id="admin_username" name="admin_username"
                   value="<?= htmlspecialchars($admin['username'] ?? 'admin') ?>" required autocomplete="off">
        </div>
        <div class="form-group">
            <label for="admin_email"><?= __('admin_email') ?></label>
            <input type="email" class="form-control" id="admin_email" name="admin_email"
                   value="<?= htmlspecialchars($admin['email'] ?? '') ?>"
                   placeholder="admin@example.com" autocomplete="off">
            <span class="form-hint"><?= __('admin_email_hint') ?></span>
        </div>
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="admin_password"><?= __('admin_password') ?></label>
            <input type="password" class="form-control" id="admin_password" name="admin_password"
                   placeholder="••••••••••••" autocomplete="new-password" minlength="8">
            <span class="form-hint"><?= __('admin_password_hint') ?></span>
        </div>
        <div class="form-group">
            <label for="admin_password_confirm"><?= __('admin_password_confirm') ?></label>
            <input type="password" class="form-control" id="admin_password_confirm" name="admin_password_confirm"
                   placeholder="••••••••••••" autocomplete="new-password">
        </div>
    </div>

    <hr style="border-color: var(--border); margin: 24px 0;">

    <div class="form-row">
        <div class="form-group">
            <label for="admin_locale"><?= __('admin_locale') ?></label>
            <select class="form-control" id="admin_locale" name="admin_locale">
                <option value="en" <?= ($admin['locale'] ?? 'en') === 'en' ? 'selected' : '' ?>>English</option>
                <option value="ru" <?= ($admin['locale'] ?? '') === 'ru' ? 'selected' : '' ?>>Русский</option>
                <option value="zh" <?= ($admin['locale'] ?? '') === 'zh' ? 'selected' : '' ?>>中文</option>
                <option value="ar" <?= ($admin['locale'] ?? '') === 'ar' ? 'selected' : '' ?>>العربية</option>
            </select>
        </div>
        <div class="form-group">
            <label for="admin_timezone"><?= __('admin_timezone') ?></label>
            <select class="form-control" id="admin_timezone" name="admin_timezone">
                <?php foreach ($timezones as $value => $label): ?>
                <option value="<?= $value ?>" <?= ($admin['timezone'] ?? 'UTC') === $value ? 'selected' : '' ?>>
                    <?= htmlspecialchars($label) ?>
                </option>
                <?php endforeach; ?>
            </select>
        </div>
    </div>

    <div class="btn-group">
        <a href="?step=7" class="btn btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <?= __('back') ?>
        </a>
        <button type="submit" class="btn btn-primary" <?= !$allGood ? 'disabled' : '' ?>>
            <?= __('complete_install') ?>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </button>
    </div>

    <?php if (!$allGood): ?>
    <div class="alert alert-warning" style="margin-top: 20px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span><?= __('diag_fix_issues') ?></span>
    </div>
    <?php endif; ?>
</form>
