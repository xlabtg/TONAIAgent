<?php
/**
 * Step 6 Template: TON Blockchain Integration
 */

$ton = $stepData['ton'] ?? [];
?>

<form method="POST">
    <?= csrfField() ?>
    <div class="form-group">
        <label><?= __('ton_network') ?></label>
        <div class="provider-cards">
            <label class="provider-card <?= $ton['network'] === 'mainnet' ? 'selected' : '' ?>">
                <input type="radio" name="ton_network" value="mainnet" <?= $ton['network'] === 'mainnet' ? 'checked' : '' ?>>
                <h4><?= __('ton_mainnet') ?></h4>
                <p>Production network with real assets</p>
            </label>
            <label class="provider-card <?= $ton['network'] === 'testnet' ? 'selected' : '' ?>">
                <input type="radio" name="ton_network" value="testnet" <?= $ton['network'] === 'testnet' ? 'checked' : '' ?>>
                <h4><?= __('ton_testnet') ?></h4>
                <p>Testing network with test tokens</p>
            </label>
        </div>
    </div>

    <div class="form-group">
        <label for="ton_rpc"><?= __('ton_rpc') ?></label>
        <input type="url" class="form-control" id="ton_rpc" name="ton_rpc"
               value="<?= htmlspecialchars($ton['rpc_endpoint']) ?>"
               placeholder="https://toncenter.com/api/v2/jsonRPC">
        <span class="form-hint"><?= __('ton_rpc_hint') ?></span>
    </div>

    <div class="form-group">
        <label for="ton_api_key"><?= __('ton_api_key') ?></label>
        <input type="text" class="form-control" id="ton_api_key" name="ton_api_key"
               value="<?= htmlspecialchars($ton['api_key']) ?>"
               placeholder="Your TON Center API key">
        <span class="form-hint"><?= __('ton_api_key_hint') ?></span>
    </div>

    <div class="form-group">
        <label for="ton_wallet_version"><?= __('ton_wallet') ?></label>
        <select class="form-control" id="ton_wallet_version" name="ton_wallet_version">
            <option value="v4r2" <?= $ton['wallet_version'] === 'v4r2' ? 'selected' : '' ?>>Wallet v4r2 (Recommended)</option>
            <option value="v3r2" <?= $ton['wallet_version'] === 'v3r2' ? 'selected' : '' ?>>Wallet v3r2</option>
            <option value="v3r1" <?= $ton['wallet_version'] === 'v3r1' ? 'selected' : '' ?>>Wallet v3r1</option>
        </select>
        <span class="form-hint"><?= __('ton_wallet_hint') ?></span>
    </div>

    <div class="btn-group">
        <a href="?step=5" class="btn btn-outline">
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
