<?php
/**
 * TON AI Agent - Secure Telegram Authentication Layer
 *
 * Provides enterprise-grade Telegram Mini App authentication:
 * - HMAC signature verification per Telegram spec
 * - Replay protection with nonce tracking
 * - Expiration checks with configurable window
 * - Session token management
 * - Token hijacking protection
 *
 * @version 1.0.0
 * @license MIT
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'telegram-auth.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

/**
 * Telegram Authentication Result
 */
class TelegramAuthResult {
    public bool $valid;
    public ?array $user;
    public ?string $error;
    public ?string $errorCode;
    public ?int $authDate;
    public ?string $startParam;
    public ?string $chatType;
    public ?int $chatInstance;

    public function __construct(
        bool $valid,
        ?array $user = null,
        ?string $error = null,
        ?string $errorCode = null
    ) {
        $this->valid = $valid;
        $this->user = $user;
        $this->error = $error;
        $this->errorCode = $errorCode;
    }

    public static function success(array $user, array $data = []): self {
        $result = new self(true, $user);
        $result->authDate = $data['auth_date'] ?? null;
        $result->startParam = $data['start_param'] ?? null;
        $result->chatType = $data['chat_type'] ?? null;
        $result->chatInstance = $data['chat_instance'] ?? null;
        return $result;
    }

    public static function failure(string $error, string $errorCode): self {
        return new self(false, null, $error, $errorCode);
    }

    public function getUserId(): ?int {
        return $this->user['id'] ?? null;
    }

    public function getUsername(): ?string {
        return $this->user['username'] ?? null;
    }

    public function getFullName(): string {
        $parts = array_filter([
            $this->user['first_name'] ?? '',
            $this->user['last_name'] ?? '',
        ]);
        return implode(' ', $parts) ?: 'User';
    }

    public function isPremium(): bool {
        return $this->user['is_premium'] ?? false;
    }

    public function getLanguageCode(): string {
        return $this->user['language_code'] ?? 'en';
    }

    public function toArray(): array {
        return [
            'valid' => $this->valid,
            'user' => $this->user,
            'error' => $this->error,
            'error_code' => $this->errorCode,
            'auth_date' => $this->authDate,
            'start_param' => $this->startParam,
            'chat_type' => $this->chatType,
            'chat_instance' => $this->chatInstance,
        ];
    }
}

/**
 * Nonce Storage Interface for Replay Protection
 */
interface NonceStorageInterface {
    public function hasNonce(string $nonce): bool;
    public function storeNonce(string $nonce, int $ttl): void;
    public function cleanup(): void;
}

/**
 * Session-based Nonce Storage (suitable for single-server deployments)
 */
class SessionNonceStorage implements NonceStorageInterface {
    private string $sessionKey = '_telegram_nonces';

    public function hasNonce(string $nonce): bool {
        $this->cleanup();
        return isset($_SESSION[$this->sessionKey][$nonce]);
    }

    public function storeNonce(string $nonce, int $ttl): void {
        if (!isset($_SESSION[$this->sessionKey])) {
            $_SESSION[$this->sessionKey] = [];
        }
        $_SESSION[$this->sessionKey][$nonce] = time() + $ttl;
    }

    public function cleanup(): void {
        if (!isset($_SESSION[$this->sessionKey])) {
            return;
        }
        $now = time();
        $_SESSION[$this->sessionKey] = array_filter(
            $_SESSION[$this->sessionKey],
            fn($expiry) => $expiry > $now
        );
    }
}

/**
 * File-based Nonce Storage (for shared hosting without Redis)
 */
class FileNonceStorage implements NonceStorageInterface {
    private string $storagePath;
    private string $filePrefix = 'tg_nonce_';

    public function __construct(string $storagePath) {
        $this->storagePath = rtrim($storagePath, '/');
        if (!is_dir($this->storagePath)) {
            mkdir($this->storagePath, 0755, true);
        }
    }

    public function hasNonce(string $nonce): bool {
        $file = $this->getFilePath($nonce);
        if (!file_exists($file)) {
            return false;
        }
        $expiry = (int) file_get_contents($file);
        if ($expiry < time()) {
            @unlink($file);
            return false;
        }
        return true;
    }

    public function storeNonce(string $nonce, int $ttl): void {
        $file = $this->getFilePath($nonce);
        file_put_contents($file, (string)(time() + $ttl), LOCK_EX);
    }

    public function cleanup(): void {
        $files = glob($this->storagePath . '/' . $this->filePrefix . '*');
        $now = time();
        foreach ($files as $file) {
            $expiry = (int) @file_get_contents($file);
            if ($expiry < $now) {
                @unlink($file);
            }
        }
    }

    private function getFilePath(string $nonce): string {
        return $this->storagePath . '/' . $this->filePrefix . md5($nonce);
    }
}

/**
 * Database-based Nonce Storage (for multi-server deployments)
 */
class DatabaseNonceStorage implements NonceStorageInterface {
    private PDO $db;
    private string $tableName;

    public function __construct(PDO $db, string $tableName = 'telegram_nonces') {
        $this->db = $db;
        $this->tableName = $tableName;
        $this->ensureTable();
    }

    private function ensureTable(): void {
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS {$this->tableName} (
                nonce_hash VARCHAR(64) PRIMARY KEY,
                expires_at INT UNSIGNED NOT NULL,
                INDEX idx_expires (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    }

    public function hasNonce(string $nonce): bool {
        $hash = hash('sha256', $nonce);
        $stmt = $this->db->prepare(
            "SELECT 1 FROM {$this->tableName} WHERE nonce_hash = ? AND expires_at > ?"
        );
        $stmt->execute([$hash, time()]);
        return $stmt->fetchColumn() !== false;
    }

    public function storeNonce(string $nonce, int $ttl): void {
        $hash = hash('sha256', $nonce);
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->tableName} (nonce_hash, expires_at) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)"
        );
        $stmt->execute([$hash, time() + $ttl]);
    }

    public function cleanup(): void {
        $this->db->exec("DELETE FROM {$this->tableName} WHERE expires_at < " . time());
    }
}

/**
 * Secure Telegram Authentication Handler
 */
class TelegramAuth {
    private string $botToken;
    private int $authValiditySeconds;
    private bool $enableReplayProtection;
    private ?NonceStorageInterface $nonceStorage;
    private array $config;

    // Error codes
    public const ERROR_EMPTY_DATA = 'EMPTY_INIT_DATA';
    public const ERROR_MISSING_HASH = 'MISSING_HASH';
    public const ERROR_INVALID_SIGNATURE = 'INVALID_SIGNATURE';
    public const ERROR_EXPIRED = 'AUTH_EXPIRED';
    public const ERROR_MISSING_USER = 'MISSING_USER';
    public const ERROR_REPLAY_DETECTED = 'REPLAY_DETECTED';
    public const ERROR_INVALID_USER_DATA = 'INVALID_USER_DATA';

    public function __construct(string $botToken, array $config = []) {
        $this->botToken = $botToken;
        $this->authValiditySeconds = $config['auth_validity_seconds'] ?? 3600; // 1 hour default
        $this->enableReplayProtection = $config['enable_replay_protection'] ?? true;
        $this->nonceStorage = $config['nonce_storage'] ?? null;
        $this->config = $config;

        // Default to session storage if no storage provided and replay protection enabled
        if ($this->enableReplayProtection && $this->nonceStorage === null) {
            $this->nonceStorage = new SessionNonceStorage();
        }
    }

    /**
     * Authenticate using Telegram init data
     *
     * @param string $initData The raw init data string from Telegram WebApp
     * @return TelegramAuthResult
     */
    public function authenticate(string $initData): TelegramAuthResult {
        // Step 1: Validate basic input
        if (empty($initData)) {
            return TelegramAuthResult::failure(
                'Init data is empty',
                self::ERROR_EMPTY_DATA
            );
        }

        // Step 2: Parse init data
        $data = $this->parseInitData($initData);

        // Step 3: Verify hash exists
        if (empty($data['hash'])) {
            return TelegramAuthResult::failure(
                'Hash is missing from init data',
                self::ERROR_MISSING_HASH
            );
        }

        // Step 4: Verify HMAC signature
        if (!$this->verifySignature($data)) {
            return TelegramAuthResult::failure(
                'Invalid signature - data may have been tampered with',
                self::ERROR_INVALID_SIGNATURE
            );
        }

        // Step 5: Verify auth_date is not expired
        $authDate = (int) ($data['auth_date'] ?? 0);
        if ($authDate === 0 || (time() - $authDate) > $this->authValiditySeconds) {
            return TelegramAuthResult::failure(
                'Authentication has expired (older than ' . $this->authValiditySeconds . ' seconds)',
                self::ERROR_EXPIRED
            );
        }

        // Step 6: Check for replay attack (if enabled)
        if ($this->enableReplayProtection && $this->nonceStorage !== null) {
            $nonce = $this->generateNonce($data);
            if ($this->nonceStorage->hasNonce($nonce)) {
                return TelegramAuthResult::failure(
                    'Replay attack detected - this auth data has already been used',
                    self::ERROR_REPLAY_DETECTED
                );
            }
            // Store nonce to prevent future replay
            $this->nonceStorage->storeNonce($nonce, $this->authValiditySeconds);
        }

        // Step 7: Parse and validate user data
        if (empty($data['user'])) {
            return TelegramAuthResult::failure(
                'User data is missing',
                self::ERROR_MISSING_USER
            );
        }

        $user = is_string($data['user']) ? json_decode($data['user'], true) : $data['user'];
        if (!is_array($user) || empty($user['id'])) {
            return TelegramAuthResult::failure(
                'Invalid user data format',
                self::ERROR_INVALID_USER_DATA
            );
        }

        // Success - return authenticated result
        return TelegramAuthResult::success($user, [
            'auth_date' => $authDate,
            'start_param' => $data['start_param'] ?? null,
            'chat_type' => $data['chat_type'] ?? null,
            'chat_instance' => $data['chat_instance'] ?? null,
        ]);
    }

    /**
     * Parse init data string into array
     */
    private function parseInitData(string $initData): array {
        $result = [];
        parse_str($initData, $result);
        return $result;
    }

    /**
     * Verify HMAC signature
     */
    private function verifySignature(array $data): bool {
        $hash = $data['hash'];
        unset($data['hash']);

        // Sort alphabetically
        ksort($data);

        // Build data check string
        $pairs = [];
        foreach ($data as $key => $value) {
            $pairs[] = "$key=$value";
        }
        $dataCheckString = implode("\n", $pairs);

        // Calculate secret key using HMAC-SHA256
        $secretKey = hash_hmac('sha256', $this->botToken, 'WebAppData', true);

        // Calculate expected hash
        $calculatedHash = bin2hex(hash_hmac('sha256', $dataCheckString, $secretKey, true));

        // Constant-time comparison to prevent timing attacks
        return hash_equals($calculatedHash, $hash);
    }

    /**
     * Generate a unique nonce for replay protection
     */
    private function generateNonce(array $data): string {
        // Combine multiple fields to create unique identifier
        return hash('sha256', implode('|', [
            $data['hash'] ?? '',
            $data['auth_date'] ?? '',
            $data['user'] ?? '',
        ]));
    }

    /**
     * Validate init data (legacy method, use authenticate() instead)
     */
    public function validateInitData(string $initData): bool {
        return $this->authenticate($initData)->valid;
    }

    /**
     * Generate a session token for the authenticated user
     */
    public function generateSessionToken(TelegramAuthResult $authResult, int $ttlSeconds = 86400): string {
        if (!$authResult->valid || !$authResult->user) {
            throw new RuntimeException('Cannot generate token for invalid auth result');
        }

        $payload = [
            'user_id' => $authResult->user['id'],
            'username' => $authResult->user['username'] ?? null,
            'first_name' => $authResult->user['first_name'] ?? null,
            'is_premium' => $authResult->user['is_premium'] ?? false,
            'iat' => time(),
            'exp' => time() + $ttlSeconds,
            'jti' => bin2hex(random_bytes(16)), // Unique token ID
        ];

        $header = $this->base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payloadEncoded = $this->base64UrlEncode(json_encode($payload));
        $signature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payloadEncoded", $this->botToken, true)
        );

        return "$header.$payloadEncoded.$signature";
    }

    /**
     * Verify and decode a session token
     */
    public function verifySessionToken(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $parts;

        // Verify signature
        $expectedSignature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", $this->botToken, true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        // Decode payload
        $data = json_decode($this->base64UrlDecode($payload), true);
        if (!$data) {
            return null;
        }

        // Check expiration
        if (($data['exp'] ?? 0) < time()) {
            return null;
        }

        return $data;
    }

    /**
     * Refresh a session token (extends expiration)
     */
    public function refreshSessionToken(string $token, int $ttlSeconds = 86400): ?string {
        $data = $this->verifySessionToken($token);
        if (!$data) {
            return null;
        }

        // Create new token with extended expiration
        $payload = $data;
        $payload['iat'] = time();
        $payload['exp'] = time() + $ttlSeconds;
        $payload['jti'] = bin2hex(random_bytes(16));

        $header = $this->base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payloadEncoded = $this->base64UrlEncode(json_encode($payload));
        $signature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payloadEncoded", $this->botToken, true)
        );

        return "$header.$payloadEncoded.$signature";
    }

    /**
     * Base64 URL encode
     */
    private function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     */
    private function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Parse start parameter to extract deep link data
     */
    public function parseStartParam(?string $startParam): array {
        if (empty($startParam)) {
            return ['type' => 'none', 'value' => null];
        }

        // Known deep link patterns
        $patterns = [
            '/^ref_(.+)$/' => 'referral',
            '/^strategy_(.+)$/' => 'strategy',
            '/^agent_(.+)$/' => 'agent',
            '/^invite_(.+)$/' => 'invite',
            '/^campaign_(.+)$/' => 'campaign',
        ];

        foreach ($patterns as $pattern => $type) {
            if (preg_match($pattern, $startParam, $matches)) {
                return [
                    'type' => $type,
                    'value' => $matches[1],
                    'raw' => $startParam,
                ];
            }
        }

        return [
            'type' => 'custom',
            'value' => $startParam,
            'raw' => $startParam,
        ];
    }

    /**
     * Cleanup expired nonces
     */
    public function cleanupNonces(): void {
        if ($this->nonceStorage) {
            $this->nonceStorage->cleanup();
        }
    }
}

/**
 * Telegram Auth Middleware for protecting routes
 */
class TelegramAuthMiddleware {
    private TelegramAuth $auth;
    private bool $requireAuth;
    private array $excludedPaths;

    public function __construct(TelegramAuth $auth, array $config = []) {
        $this->auth = $auth;
        $this->requireAuth = $config['require_auth'] ?? true;
        $this->excludedPaths = $config['excluded_paths'] ?? [];
    }

    /**
     * Process the request
     */
    public function process(callable $next): void {
        // Check if path is excluded
        $path = $_SERVER['REQUEST_URI'] ?? '/';
        foreach ($this->excludedPaths as $excludedPath) {
            if (strpos($path, $excludedPath) === 0) {
                $next();
                return;
            }
        }

        // Get auth token from header or session
        $token = $this->getAuthToken();

        if (!$token && $this->requireAuth) {
            $this->sendUnauthorized('No authentication token provided');
            return;
        }

        if ($token) {
            $userData = $this->auth->verifySessionToken($token);
            if (!$userData && $this->requireAuth) {
                $this->sendUnauthorized('Invalid or expired token');
                return;
            }

            // Store user data for use in the application
            $_SESSION['telegram_user'] = $userData;
        }

        $next();
    }

    /**
     * Get auth token from various sources
     */
    private function getAuthToken(): ?string {
        // Check Authorization header
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
            return $matches[1];
        }

        // Check X-Telegram-Auth header
        if (!empty($_SERVER['HTTP_X_TELEGRAM_AUTH'])) {
            return $_SERVER['HTTP_X_TELEGRAM_AUTH'];
        }

        // Check session
        if (!empty($_SESSION['telegram_session_token'])) {
            return $_SESSION['telegram_session_token'];
        }

        return null;
    }

    /**
     * Send unauthorized response
     */
    private function sendUnauthorized(string $message): void {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => true,
            'message' => $message,
            'code' => 'UNAUTHORIZED',
        ]);
        exit;
    }
}
