<?php
/**
 * Step 2: Database Setup
 *
 * - Configure database connection
 * - Create database if not exists
 * - Import schema
 * - Seed demo data (optional)
 */

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $host = trim($_POST['db_host'] ?? 'localhost');
    $port = (int)($_POST['db_port'] ?? 3306);
    $database = trim($_POST['db_database'] ?? '');
    $username = trim($_POST['db_username'] ?? '');
    $password = $_POST['db_password'] ?? '';
    $prefix = trim($_POST['db_prefix'] ?? 'taa_');
    $insertDemo = isset($_POST['db_demo_data']);

    // Validate inputs
    if (empty($host) || empty($database) || empty($username)) {
        $_SESSION['installer_error'] = __('error_required');
        header('Location: ?step=2');
        exit;
    }

    try {
        // Test connection (without database first)
        $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        // Create database if not exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // Switch to database
        $pdo->exec("USE `$database`");

        // Import schema from telegram-miniapp/database.sql
        $schemaFile = APP_ROOT . '/telegram-miniapp/database.sql';
        if (file_exists($schemaFile)) {
            $schema = file_get_contents($schemaFile);

            // Update table prefix if different from default
            if ($prefix !== 'taa_') {
                $schema = str_replace('taa_', $prefix, $schema);
            }

            // Execute schema (split by delimiter)
            $statements = preg_split('/;\s*$/m', $schema);
            foreach ($statements as $statement) {
                $statement = trim($statement);
                if (!empty($statement) && stripos($statement, 'SET ') !== 0) {
                    try {
                        $pdo->exec($statement);
                    } catch (PDOException $e) {
                        // Ignore "already exists" errors
                        if (strpos($e->getMessage(), 'already exists') === false &&
                            strpos($e->getMessage(), 'Duplicate') === false) {
                            throw $e;
                        }
                    }
                }
            }
        }

        // Save database config to session
        $_SESSION['installer_db'] = [
            'host' => $host,
            'port' => $port,
            'database' => $database,
            'username' => $username,
            'password' => $password,
            'prefix' => $prefix,
        ];

        $_SESSION['installer_success'] = __('db_tables_created');
        header('Location: ?step=3');
        exit;

    } catch (PDOException $e) {
        $_SESSION['installer_error'] = __('db_test_fail') . ': ' . $e->getMessage();
        header('Location: ?step=2');
        exit;
    }
}

// Load saved values
$savedDb = $_SESSION['installer_db'] ?? [];
$stepData['db'] = [
    'host' => $savedDb['host'] ?? 'localhost',
    'port' => $savedDb['port'] ?? 3306,
    'database' => $savedDb['database'] ?? 'tonaiagent',
    'username' => $savedDb['username'] ?? '',
    'password' => $savedDb['password'] ?? '',
    'prefix' => $savedDb['prefix'] ?? 'taa_',
];
