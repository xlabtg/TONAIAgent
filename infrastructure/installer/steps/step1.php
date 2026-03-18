<?php
/**
 * Step 1: Server Requirements Check
 *
 * Validates:
 * - PHP 8.1+
 * - MySQL/MariaDB
 * - HTTPS
 * - Required extensions (curl, mbstring, openssl, PDO)
 * - Writable directories
 */

// Check requirements
$requirements = [];

// PHP Version
$phpVersion = PHP_VERSION;
$phpRequired = '8.1.0';
$phpPass = version_compare($phpVersion, $phpRequired, '>=');
$requirements['php'] = [
    'name' => __('req_php_version'),
    'detail' => __('req_php_version_detail'),
    'required' => 'PHP ' . $phpRequired . '+',
    'current' => 'PHP ' . $phpVersion,
    'pass' => $phpPass,
    'fix' => $phpPass ? null : 'Upgrade PHP to version 8.1 or higher. Contact your hosting provider.',
];

// HTTPS Check
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    || (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
$requirements['https'] = [
    'name' => __('req_https'),
    'detail' => __('req_https_detail'),
    'required' => 'Enabled',
    'current' => $isHttps ? 'Enabled' : 'Disabled',
    'pass' => $isHttps,
    'warn' => !$isHttps, // Warning instead of fail for local development
    'fix' => $isHttps ? null : 'Install SSL certificate. Many hosting providers offer free Let\'s Encrypt certificates.',
];

// Required PHP Extensions
$requiredExtensions = [
    'curl' => ['name' => __('req_ext_curl'), 'detail' => __('req_ext_curl_detail')],
    'mbstring' => ['name' => __('req_ext_mbstring'), 'detail' => __('req_ext_mbstring_detail')],
    'openssl' => ['name' => __('req_ext_openssl'), 'detail' => __('req_ext_openssl_detail')],
    'pdo' => ['name' => __('req_ext_pdo'), 'detail' => __('req_ext_pdo_detail')],
    'pdo_mysql' => ['name' => 'PDO MySQL', 'detail' => 'MySQL database driver'],
    'json' => ['name' => __('req_ext_json'), 'detail' => __('req_ext_json_detail')],
];

foreach ($requiredExtensions as $ext => $info) {
    $loaded = extension_loaded($ext);
    $requirements['ext_' . $ext] = [
        'name' => $info['name'],
        'detail' => $info['detail'],
        'required' => 'Enabled',
        'current' => $loaded ? 'Enabled' : 'Disabled',
        'pass' => $loaded,
        'fix' => $loaded ? null : "Enable the $ext extension in php.ini or contact your hosting provider.",
    ];
}

// Optional Extensions
$optionalExtensions = [
    'redis' => ['name' => 'Redis', 'detail' => 'For high-performance caching (optional)'],
    'memcached' => ['name' => 'Memcached', 'detail' => 'For distributed caching (optional)'],
];

foreach ($optionalExtensions as $ext => $info) {
    $loaded = extension_loaded($ext);
    $requirements['opt_' . $ext] = [
        'name' => $info['name'],
        'detail' => $info['detail'],
        'required' => 'Optional',
        'current' => $loaded ? 'Enabled' : 'Disabled',
        'pass' => true, // Optional, always pass
        'warn' => !$loaded,
    ];
}

// Writable Directories
$writableDirs = [
    APP_ROOT . '/telegram-miniapp/app' => 'App Configuration',
    APP_ROOT . '/telegram-miniapp' => 'Mini App Root',
];

foreach ($writableDirs as $dir => $name) {
    $exists = is_dir($dir);
    $writable = $exists && is_writable($dir);

    // Try to create if doesn't exist
    if (!$exists) {
        @mkdir($dir, 0755, true);
        $exists = is_dir($dir);
        $writable = $exists && is_writable($dir);
    }

    $requirements['dir_' . md5($dir)] = [
        'name' => $name,
        'detail' => basename($dir) . ' ' . __('req_writable_detail'),
        'required' => 'Writable',
        'current' => $writable ? 'Writable' : ($exists ? 'Not Writable' : 'Missing'),
        'pass' => $writable,
        'fix' => $writable ? null : "chmod 755 $dir",
    ];
}

// Calculate overall status
$allPass = true;
$hasWarnings = false;
foreach ($requirements as $req) {
    if (!$req['pass'] && empty($req['warn'])) {
        $allPass = false;
    }
    if (!empty($req['warn'])) {
        $hasWarnings = true;
    }
}

// Save to session for use in template
$stepData['requirements'] = $requirements;
$stepData['allPass'] = $allPass;
$stepData['hasWarnings'] = $hasWarnings;
