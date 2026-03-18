<?php
/**
 * Step 6: TON Blockchain Integration
 *
 * - Configure TON network (mainnet/testnet)
 * - Set up RPC endpoint
 * - Configure wallet settings
 */

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $network = trim($_POST['ton_network'] ?? 'mainnet');
    $rpcEndpoint = trim($_POST['ton_rpc'] ?? '');
    $apiKey = trim($_POST['ton_api_key'] ?? '');
    $walletVersion = trim($_POST['ton_wallet_version'] ?? 'v4r2');

    // Set default RPC based on network
    if (empty($rpcEndpoint)) {
        $rpcEndpoint = $network === 'testnet'
            ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
            : 'https://toncenter.com/api/v2/jsonRPC';
    }

    // Validate RPC endpoint (optional - just check format)
    if (!filter_var($rpcEndpoint, FILTER_VALIDATE_URL)) {
        $_SESSION['installer_error'] = 'Invalid RPC endpoint URL.';
        header('Location: ?step=6');
        exit;
    }

    // Save to session
    $_SESSION['installer_ton'] = [
        'network' => $network,
        'rpc_endpoint' => $rpcEndpoint,
        'api_key' => $apiKey,
        'wallet_version' => $walletVersion,
    ];

    $_SESSION['installer_success'] = __('ton_configured');
    header('Location: ?step=7');
    exit;
}

// Load saved values
$savedTon = $_SESSION['installer_ton'] ?? [];

$stepData['ton'] = [
    'network' => $savedTon['network'] ?? 'mainnet',
    'rpc_endpoint' => $savedTon['rpc_endpoint'] ?? 'https://toncenter.com/api/v2/jsonRPC',
    'api_key' => $savedTon['api_key'] ?? '',
    'wallet_version' => $savedTon['wallet_version'] ?? 'v4r2',
];
