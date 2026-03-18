<?php
/**
 * Step 2 Template: Database Configuration
 */

$db = $stepData['db'] ?? [];
?>

<form method="POST" autocomplete="off">
    <?= csrfField() ?>
    <div class="form-row">
        <div class="form-group">
            <label for="db_host"><?= __('db_host') ?> <span class="required">*</span></label>
            <input type="text" class="form-control" id="db_host" name="db_host"
                   value="<?= htmlspecialchars($db['host']) ?>" required>
            <span class="form-hint"><?= __('db_host_hint') ?></span>
        </div>
        <div class="form-group">
            <label for="db_port"><?= __('db_port') ?></label>
            <input type="number" class="form-control" id="db_port" name="db_port"
                   value="<?= htmlspecialchars($db['port']) ?>">
            <span class="form-hint"><?= __('db_port_hint') ?></span>
        </div>
    </div>

    <div class="form-group">
        <label for="db_database"><?= __('db_name') ?> <span class="required">*</span></label>
        <input type="text" class="form-control" id="db_database" name="db_database"
               value="<?= htmlspecialchars($db['database']) ?>" required>
        <span class="form-hint"><?= __('db_name_hint') ?></span>
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="db_username"><?= __('db_user') ?> <span class="required">*</span></label>
            <input type="text" class="form-control" id="db_username" name="db_username"
                   value="<?= htmlspecialchars($db['username']) ?>" required autocomplete="off">
        </div>
        <div class="form-group">
            <label for="db_password"><?= __('db_pass') ?></label>
            <input type="password" class="form-control" id="db_password" name="db_password"
                   value="<?= htmlspecialchars($db['password']) ?>" autocomplete="new-password">
        </div>
    </div>

    <div class="form-group">
        <label for="db_prefix"><?= __('db_prefix') ?></label>
        <input type="text" class="form-control" id="db_prefix" name="db_prefix"
               value="<?= htmlspecialchars($db['prefix']) ?>">
        <span class="form-hint"><?= __('db_prefix_hint') ?></span>
    </div>

    <div class="form-group">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" name="db_demo_data" value="1" checked
                   style="width: 18px; height: 18px;">
            <span><?= __('db_demo_data') ?></span>
        </label>
        <span class="form-hint" style="margin-left: 28px;"><?= __('db_demo_data_hint') ?></span>
    </div>

    <div class="btn-group">
        <a href="?step=1" class="btn btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <?= __('back') ?>
        </a>
        <button type="submit" class="btn btn-primary">
            <?= __('test') ?> & <?= __('continue') ?>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        </button>
    </div>
</form>
