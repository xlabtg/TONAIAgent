<?php
/**
 * Step 1 Template: Requirements Check
 */

$requirements = $stepData['requirements'] ?? [];
$allPass = $stepData['allPass'] ?? false;
$hasWarnings = $stepData['hasWarnings'] ?? false;
?>

<div class="requirements-list">
    <?php foreach ($requirements as $key => $req): ?>
    <div class="requirement-item">
        <div class="requirement-info">
            <span class="requirement-name"><?= htmlspecialchars($req['name']) ?></span>
            <span class="requirement-detail"><?= htmlspecialchars($req['detail']) ?></span>
        </div>
        <div class="requirement-status <?= $req['pass'] ? (isset($req['warn']) && $req['warn'] ? 'warn' : 'pass') : 'fail' ?>">
            <span><?= htmlspecialchars($req['current']) ?></span>
            <?php if ($req['pass'] && empty($req['warn'])): ?>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            <?php elseif (!empty($req['warn'])): ?>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            <?php else: ?>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            <?php endif; ?>
        </div>
    </div>

    <?php if (!$req['pass'] && !empty($req['fix'])): ?>
    <div class="collapsible" style="margin-bottom: 16px; margin-top: -4px;">
        <div class="collapsible-header">
            <span><?= __('req_fix_suggestion') ?></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="collapsible-content">
            <code style="display: block; background: var(--bg-dark); padding: 12px; border-radius: 6px; font-size: 13px;">
                <?= htmlspecialchars($req['fix']) ?>
            </code>
        </div>
    </div>
    <?php endif; ?>
    <?php endforeach; ?>
</div>

<?php if ($allPass): ?>
<div class="alert alert-success">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span><?= __('req_all_pass') ?></span>
</div>
<?php elseif ($hasWarnings && $allPass): ?>
<div class="alert alert-warning">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    <span>Some optional requirements have warnings. You can continue, but some features may be limited.</span>
</div>
<?php else: ?>
<div class="alert alert-error">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span><?= __('req_some_fail') ?></span>
</div>
<?php endif; ?>

<div class="btn-group">
    <?php if ($allPass || $hasWarnings): ?>
    <a href="?step=2" class="btn btn-primary">
        <?= __('continue') ?>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    </a>
    <?php else: ?>
    <button class="btn btn-primary" disabled><?= __('continue') ?></button>
    <a href="?step=1" class="btn btn-outline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        Re-check
    </a>
    <?php endif; ?>
</div>
