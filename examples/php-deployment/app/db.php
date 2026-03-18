<?php
/**
 * TON AI Agent - Database Connection Manager
 *
 * Provides secure PDO connection with prepared statements.
 * Uses singleton pattern for connection reuse.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'db.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

class Database {
    private static ?PDO $instance = null;
    private static array $config;

    /**
     * Initialize database configuration
     */
    public static function init(array $config): void {
        self::$config = $config;
    }

    /**
     * Get PDO instance (singleton)
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            if (empty(self::$config)) {
                throw new RuntimeException('Database not configured. Call Database::init() first.');
            }

            $cfg = self::$config;

            try {
                $dsn = sprintf(
                    '%s:host=%s;port=%d;dbname=%s;charset=%s',
                    $cfg['driver'],
                    $cfg['host'],
                    $cfg['port'],
                    $cfg['database'],
                    $cfg['charset']
                );

                self::$instance = new PDO(
                    $dsn,
                    $cfg['username'],
                    $cfg['password'],
                    $cfg['options']
                );

            } catch (PDOException $e) {
                // Log error but don't expose details
                error_log('Database connection failed: ' . $e->getMessage());
                throw new RuntimeException('Database connection failed. Please try again later.');
            }
        }

        return self::$instance;
    }

    /**
     * Execute a SELECT query with prepared statement
     */
    public static function select(string $sql, array $params = []): array {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Execute a SELECT query and return single row
     */
    public static function selectOne(string $sql, array $params = []): ?array {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Execute INSERT, UPDATE, DELETE with prepared statement
     */
    public static function execute(string $sql, array $params = []): int {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Insert and return last insert ID
     */
    public static function insert(string $sql, array $params = []): string {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return self::getConnection()->lastInsertId();
    }

    /**
     * Begin transaction
     */
    public static function beginTransaction(): bool {
        return self::getConnection()->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public static function commit(): bool {
        return self::getConnection()->commit();
    }

    /**
     * Rollback transaction
     */
    public static function rollback(): bool {
        return self::getConnection()->rollBack();
    }

    /**
     * Check if connection is active
     */
    public static function isConnected(): bool {
        try {
            self::getConnection()->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }

    /**
     * Close connection
     */
    public static function close(): void {
        self::$instance = null;
    }

    /**
     * Get table name with prefix
     */
    public static function table(string $name): string {
        return (self::$config['prefix'] ?? '') . $name;
    }

    /**
     * Escape identifier (table/column name)
     */
    public static function identifier(string $name): string {
        return '`' . str_replace('`', '``', $name) . '`';
    }

    /**
     * Build WHERE clause from array of conditions
     */
    public static function buildWhere(array $conditions): array {
        $where = [];
        $params = [];

        foreach ($conditions as $key => $value) {
            if (is_array($value)) {
                // Handle IN clause
                $placeholders = implode(',', array_fill(0, count($value), '?'));
                $where[] = self::identifier($key) . " IN ($placeholders)";
                $params = array_merge($params, $value);
            } elseif ($value === null) {
                $where[] = self::identifier($key) . ' IS NULL';
            } else {
                $where[] = self::identifier($key) . ' = ?';
                $params[] = $value;
            }
        }

        return [
            'clause' => implode(' AND ', $where),
            'params' => $params
        ];
    }
}

/**
 * Query Builder Helper
 */
class QueryBuilder {
    private string $table;
    private array $select = ['*'];
    private array $where = [];
    private array $params = [];
    private ?string $orderBy = null;
    private ?int $limit = null;
    private ?int $offset = null;

    public function __construct(string $table) {
        $this->table = Database::table($table);
    }

    public function select(array $columns = ['*']): self {
        $this->select = $columns;
        return $this;
    }

    public function where(string $column, $operator, $value = null): self {
        if ($value === null) {
            $value = $operator;
            $operator = '=';
        }
        $this->where[] = Database::identifier($column) . " $operator ?";
        $this->params[] = $value;
        return $this;
    }

    public function whereIn(string $column, array $values): self {
        $placeholders = implode(',', array_fill(0, count($values), '?'));
        $this->where[] = Database::identifier($column) . " IN ($placeholders)";
        $this->params = array_merge($this->params, $values);
        return $this;
    }

    public function orderBy(string $column, string $direction = 'ASC'): self {
        $direction = strtoupper($direction) === 'DESC' ? 'DESC' : 'ASC';
        $this->orderBy = Database::identifier($column) . ' ' . $direction;
        return $this;
    }

    public function limit(int $limit, int $offset = 0): self {
        $this->limit = $limit;
        $this->offset = $offset;
        return $this;
    }

    public function get(): array {
        $sql = $this->buildSelectQuery();
        return Database::select($sql, $this->params);
    }

    public function first(): ?array {
        $this->limit(1);
        $results = $this->get();
        return $results[0] ?? null;
    }

    public function count(): int {
        $this->select = ['COUNT(*) as count'];
        $result = $this->first();
        return (int) ($result['count'] ?? 0);
    }

    private function buildSelectQuery(): string {
        $columns = implode(', ', array_map([Database::class, 'identifier'], $this->select));
        if ($this->select === ['*']) {
            $columns = '*';
        }

        $sql = "SELECT $columns FROM " . Database::identifier($this->table);

        if (!empty($this->where)) {
            $sql .= ' WHERE ' . implode(' AND ', $this->where);
        }

        if ($this->orderBy) {
            $sql .= ' ORDER BY ' . $this->orderBy;
        }

        if ($this->limit !== null) {
            $sql .= " LIMIT $this->limit";
            if ($this->offset) {
                $sql .= " OFFSET $this->offset";
            }
        }

        return $sql;
    }
}

/**
 * Helper function to create query builder
 */
function db(string $table): QueryBuilder {
    return new QueryBuilder($table);
}
