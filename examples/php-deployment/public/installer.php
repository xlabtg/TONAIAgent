<?php
/**
 * TON AI Agent - One-Click Installer
 *
 * This script helps set up the application on a new server.
 * DELETE THIS FILE after installation for security!
 */

// Security: Only run in CLI or via authenticated request
$installKey = $_GET['key'] ?? '';
$expectedKey = 'tonai_install_' . date('Ymd'); // Simple daily key

if (php_sapi_name() !== 'cli' && $installKey !== $expectedKey) {
    // Show install key for today
    if (empty($installKey)) {
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>TON AI Agent - Installer</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                h1 { color: #0088CC; }
                .key { background: #f0f0f0; padding: 10px 20px; border-radius: 8px; font-family: monospace; }
                .warning { color: #f59e0b; }
                .info { color: #3b82f6; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1>TON AI Agent Installer</h1>
            <p>To run the installer, add the following key to the URL:</p>
            <p class="key">?key=<?php echo $expectedKey; ?></p>
            <p class="warning">This key changes daily for security.</p>
            <p class="info">Or run from command line: <code>php installer.php</code></p>
        </body>
        </html>
        <?php
        exit;
    }
    http_response_code(403);
    exit('Invalid installation key');
}

// Installer class
class Installer {
    private array $errors = [];
    private array $warnings = [];
    private array $success = [];

    public function run(): void {
        $this->output("===========================================");
        $this->output("  TON AI Agent - Installation Wizard");
        $this->output("===========================================\n");

        // Step 1: Check requirements
        $this->checkRequirements();

        // Step 2: Check directory structure
        $this->checkDirectories();

        // Step 3: Check configuration
        $this->checkConfiguration();

        // Step 4: Test database connection
        $this->checkDatabase();

        // Step 5: Create database tables
        $this->setupDatabase();

        // Step 6: Set permissions
        $this->setPermissions();

        // Display results
        $this->displayResults();
    }

    private function checkRequirements(): void {
        $this->output("Checking system requirements...\n");

        // PHP Version
        if (version_compare(PHP_VERSION, '8.0.0', '>=')) {
            $this->success[] = "PHP version: " . PHP_VERSION . " (OK)";
        } else {
            $this->errors[] = "PHP 8.0+ required. Current: " . PHP_VERSION;
        }

        // Required extensions
        $requiredExtensions = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'openssl', 'curl'];
        foreach ($requiredExtensions as $ext) {
            if (extension_loaded($ext)) {
                $this->success[] = "Extension '$ext': Loaded";
            } else {
                $this->errors[] = "Extension '$ext': Not loaded (required)";
            }
        }

        // Optional extensions
        $optionalExtensions = ['redis', 'memcached', 'imagick'];
        foreach ($optionalExtensions as $ext) {
            if (extension_loaded($ext)) {
                $this->success[] = "Extension '$ext': Loaded (optional)";
            } else {
                $this->warnings[] = "Extension '$ext': Not loaded (optional)";
            }
        }
    }

    private function checkDirectories(): void {
        $this->output("\nChecking directory structure...\n");

        $appRoot = dirname(__DIR__);
        $requiredDirs = [
            $appRoot . '/app' => 'Application files',
            $appRoot . '/storage' => 'Storage directory',
            $appRoot . '/storage/logs' => 'Log directory',
            $appRoot . '/database' => 'Database migrations'
        ];

        foreach ($requiredDirs as $dir => $description) {
            if (is_dir($dir)) {
                $this->success[] = "$description: Exists";
            } else {
                // Try to create
                if (@mkdir($dir, 0755, true)) {
                    $this->success[] = "$description: Created";
                } else {
                    $this->errors[] = "$description: Cannot create $dir";
                }
            }
        }

        // Check writability
        $writableDirs = [
            $appRoot . '/storage',
            $appRoot . '/storage/logs'
        ];

        foreach ($writableDirs as $dir) {
            if (is_writable($dir)) {
                $this->success[] = basename($dir) . ": Writable";
            } else {
                $this->errors[] = basename($dir) . ": Not writable";
            }
        }
    }

    private function checkConfiguration(): void {
        $this->output("\nChecking configuration...\n");

        $appRoot = dirname(__DIR__);
        $envFile = $appRoot . '/.env';
        $envExample = $appRoot . '/.env.example';

        if (file_exists($envFile)) {
            $this->success[] = ".env file: Exists";
        } else {
            if (file_exists($envExample)) {
                if (@copy($envExample, $envFile)) {
                    $this->warnings[] = ".env file: Created from .env.example - Please configure!";
                } else {
                    $this->errors[] = ".env file: Cannot create from example";
                }
            } else {
                $this->errors[] = ".env.example file: Not found";
            }
        }

        // Check config.php exists
        $configFile = $appRoot . '/app/config.php';
        if (file_exists($configFile)) {
            $this->success[] = "config.php: Exists";
        } else {
            $this->errors[] = "config.php: Not found in /app directory";
        }
    }

    private function checkDatabase(): void {
        $this->output("\nChecking database connection...\n");

        $appRoot = dirname(__DIR__);
        $configFile = $appRoot . '/app/config.php';

        if (!file_exists($configFile)) {
            $this->errors[] = "Cannot test database: config.php not found";
            return;
        }

        try {
            $config = require $configFile;
            $dbConfig = $config['database'] ?? [];

            if (empty($dbConfig['host']) || empty($dbConfig['database'])) {
                $this->warnings[] = "Database: Not configured in .env";
                return;
            }

            $dsn = sprintf(
                '%s:host=%s;port=%d;dbname=%s;charset=%s',
                $dbConfig['driver'] ?? 'mysql',
                $dbConfig['host'],
                $dbConfig['port'] ?? 3306,
                $dbConfig['database'],
                $dbConfig['charset'] ?? 'utf8mb4'
            );

            $pdo = new PDO(
                $dsn,
                $dbConfig['username'] ?? '',
                $dbConfig['password'] ?? '',
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            $this->success[] = "Database: Connected successfully";

            // Check if tables exist
            $stmt = $pdo->query("SHOW TABLES LIKE 'tonai_%'");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if (count($tables) > 0) {
                $this->success[] = "Database tables: " . count($tables) . " tables found";
            } else {
                $this->warnings[] = "Database tables: None found - need to run schema";
            }

        } catch (PDOException $e) {
            $this->errors[] = "Database connection failed: " . $e->getMessage();
        }
    }

    private function setupDatabase(): void {
        $this->output("\nSetting up database...\n");

        $appRoot = dirname(__DIR__);
        $schemaFile = $appRoot . '/database/schema.sql';
        $configFile = $appRoot . '/app/config.php';

        if (!file_exists($schemaFile)) {
            $this->warnings[] = "Schema file not found: $schemaFile";
            return;
        }

        if (!file_exists($configFile)) {
            $this->warnings[] = "Cannot setup database: config.php not found";
            return;
        }

        // Ask for confirmation in interactive mode
        if (php_sapi_name() === 'cli') {
            echo "Do you want to run the database schema? This will create tables. (y/N): ";
            $handle = fopen("php://stdin", "r");
            $line = fgets($handle);
            fclose($handle);

            if (trim(strtolower($line)) !== 'y') {
                $this->warnings[] = "Database setup skipped by user";
                return;
            }
        }

        try {
            $config = require $configFile;
            $dbConfig = $config['database'] ?? [];

            if (empty($dbConfig['password'])) {
                $this->warnings[] = "Database password not set - skipping schema setup";
                return;
            }

            $dsn = sprintf(
                '%s:host=%s;port=%d;dbname=%s;charset=%s',
                $dbConfig['driver'] ?? 'mysql',
                $dbConfig['host'],
                $dbConfig['port'] ?? 3306,
                $dbConfig['database'],
                $dbConfig['charset'] ?? 'utf8mb4'
            );

            $pdo = new PDO(
                $dsn,
                $dbConfig['username'] ?? '',
                $dbConfig['password'] ?? '',
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            // Read and execute schema
            $schema = file_get_contents($schemaFile);

            // Split by semicolons (simple approach)
            $statements = array_filter(array_map('trim', explode(';', $schema)));

            $executed = 0;
            foreach ($statements as $statement) {
                if (!empty($statement) && stripos($statement, 'SET ') !== 0) {
                    try {
                        $pdo->exec($statement);
                        $executed++;
                    } catch (PDOException $e) {
                        // Table might already exist
                        if (strpos($e->getMessage(), 'already exists') === false) {
                            $this->warnings[] = "SQL Warning: " . $e->getMessage();
                        }
                    }
                }
            }

            $this->success[] = "Database schema: Executed $executed statements";

        } catch (Exception $e) {
            $this->errors[] = "Database setup failed: " . $e->getMessage();
        }
    }

    private function setPermissions(): void {
        $this->output("\nSetting file permissions...\n");

        $appRoot = dirname(__DIR__);

        // Directories that need write access
        $writablePaths = [
            $appRoot . '/storage' => 0755,
            $appRoot . '/storage/logs' => 0755,
        ];

        foreach ($writablePaths as $path => $perms) {
            if (is_dir($path)) {
                if (@chmod($path, $perms)) {
                    $this->success[] = basename($path) . ": Permissions set";
                } else {
                    $this->warnings[] = basename($path) . ": Could not set permissions";
                }
            }
        }
    }

    private function displayResults(): void {
        $this->output("\n===========================================");
        $this->output("  Installation Results");
        $this->output("===========================================\n");

        if (!empty($this->success)) {
            $this->output("SUCCESS:");
            foreach ($this->success as $msg) {
                $this->output("  [OK] $msg");
            }
        }

        if (!empty($this->warnings)) {
            $this->output("\nWARNINGS:");
            foreach ($this->warnings as $msg) {
                $this->output("  [!] $msg");
            }
        }

        if (!empty($this->errors)) {
            $this->output("\nERRORS:");
            foreach ($this->errors as $msg) {
                $this->output("  [X] $msg");
            }
        }

        $this->output("\n===========================================");

        if (empty($this->errors)) {
            $this->output("  Installation completed successfully!");
            $this->output("");
            $this->output("  IMPORTANT: Delete installer.php now!");
            $this->output("  rm public/installer.php");
        } else {
            $this->output("  Installation completed with errors.");
            $this->output("  Please fix the issues and run again.");
        }

        $this->output("===========================================\n");
    }

    private function output(string $message): void {
        if (php_sapi_name() === 'cli') {
            echo $message . "\n";
        } else {
            echo nl2br(htmlspecialchars($message)) . "<br>";
        }
    }
}

// HTML wrapper for web
if (php_sapi_name() !== 'cli') {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>TON AI Agent - Installer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: 'JetBrains Mono', Consolas, monospace;
                background: #1a1a2e;
                color: #f8fafc;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                line-height: 1.6;
            }
            h1 { color: #0088CC; text-align: center; }
            .output {
                background: #0f0f1a;
                padding: 20px;
                border-radius: 8px;
                white-space: pre-wrap;
                font-size: 14px;
            }
            [OK] { color: #10b981; }
            [!] { color: #f59e0b; }
            [X] { color: #ef4444; }
        </style>
    </head>
    <body>
        <h1>TON AI Agent Installer</h1>
        <div class="output">
    <?php
}

// Run installer
$installer = new Installer();
$installer->run();

if (php_sapi_name() !== 'cli') {
    ?>
        </div>
    </body>
    </html>
    <?php
}
