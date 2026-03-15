<?php
/**
 * TON AI Agent - Database Connection
 *
 * Provides a secure PDO database connection with prepared statements.
 * All queries use parameterized statements to prevent SQL injection.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Direct access forbidden');
}

class Database
{
    private static ?PDO $instance = null;
    private static array $config = [];

    /**
     * Get database configuration
     */
    private static function getConfig(): array
    {
        if (empty(self::$config)) {
            $configFile = __DIR__ . '/config.php';
            if (!file_exists($configFile)) {
                throw new RuntimeException('Configuration file not found. Please copy config.example.php to config.php');
            }
            $config = require $configFile;
            self::$config = $config['database'] ?? [];
        }
        return self::$config;
    }

    /**
     * Get PDO instance (singleton)
     */
    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $config = self::getConfig();

            $dsn = sprintf(
                '%s:host=%s;port=%d;dbname=%s;charset=%s',
                $config['driver'],
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );

            try {
                self::$instance = new PDO(
                    $dsn,
                    $config['username'],
                    $config['password'],
                    $config['options']
                );
            } catch (PDOException $e) {
                // Log error but don't expose details to user
                error_log('Database connection failed: ' . $e->getMessage());
                throw new RuntimeException('Database connection failed. Please check configuration.');
            }
        }

        return self::$instance;
    }

    /**
     * Get table name with prefix
     */
    public static function table(string $name): string
    {
        $config = self::getConfig();
        return $config['prefix'] . $name;
    }

    /**
     * Execute a prepared statement
     */
    public static function execute(string $query, array $params = []): PDOStatement
    {
        $pdo = self::getInstance();
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        return $stmt;
    }

    /**
     * Fetch all rows
     */
    public static function fetchAll(string $query, array $params = []): array
    {
        return self::execute($query, $params)->fetchAll();
    }

    /**
     * Fetch single row
     */
    public static function fetchOne(string $query, array $params = []): ?array
    {
        $result = self::execute($query, $params)->fetch();
        return $result ?: null;
    }

    /**
     * Fetch single value
     */
    public static function fetchValue(string $query, array $params = [])
    {
        return self::execute($query, $params)->fetchColumn();
    }

    /**
     * Insert and return last insert ID
     */
    public static function insert(string $table, array $data): string
    {
        $columns = array_keys($data);
        $placeholders = array_map(fn($col) => ':' . $col, $columns);

        $query = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            self::table($table),
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        self::execute($query, $data);
        return self::getInstance()->lastInsertId();
    }

    /**
     * Update rows
     */
    public static function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $sets = array_map(fn($col) => "$col = :$col", array_keys($data));

        $query = sprintf(
            'UPDATE %s SET %s WHERE %s',
            self::table($table),
            implode(', ', $sets),
            $where
        );

        return self::execute($query, array_merge($data, $whereParams))->rowCount();
    }

    /**
     * Delete rows
     */
    public static function delete(string $table, string $where, array $params = []): int
    {
        $query = sprintf(
            'DELETE FROM %s WHERE %s',
            self::table($table),
            $where
        );

        return self::execute($query, $params)->rowCount();
    }

    /**
     * Begin transaction
     */
    public static function beginTransaction(): bool
    {
        return self::getInstance()->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public static function commit(): bool
    {
        return self::getInstance()->commit();
    }

    /**
     * Rollback transaction
     */
    public static function rollback(): bool
    {
        return self::getInstance()->rollBack();
    }

    /**
     * Check if table exists
     */
    public static function tableExists(string $table): bool
    {
        $config = self::getConfig();
        $query = "SELECT COUNT(*) FROM information_schema.tables
                  WHERE table_schema = :database AND table_name = :table";

        return (bool)self::fetchValue($query, [
            'database' => $config['database'],
            'table' => self::table($table)
        ]);
    }

    /**
     * Close connection
     */
    public static function close(): void
    {
        self::$instance = null;
    }
}
