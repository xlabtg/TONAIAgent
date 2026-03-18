<?php
/**
 * TON AI Agent - Security Functions
 *
 * Provides CSRF protection, rate limiting, input sanitization,
 * and other security utilities.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'security.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

class Security {
    private static array $config = [];
    private static ?string $csrfToken = null;

    /**
     * Initialize security configuration
     */
    public static function init(array $config): void {
        self::$config = $config;

        // Configure session security
        if (session_status() === PHP_SESSION_NONE) {
            ini_set('session.cookie_httponly', $config['session_httponly'] ? '1' : '0');
            ini_set('session.cookie_secure', $config['session_secure'] ? '1' : '0');
            ini_set('session.cookie_samesite', 'Strict');
            ini_set('session.gc_maxlifetime', $config['session_lifetime'] * 60);

            session_start();
        }

        // Regenerate session ID periodically
        if (!isset($_SESSION['_created'])) {
            $_SESSION['_created'] = time();
        } elseif (time() - $_SESSION['_created'] > 1800) {
            session_regenerate_id(true);
            $_SESSION['_created'] = time();
        }
    }

    /**
     * Generate CSRF token
     */
    public static function generateCsrfToken(): string {
        if (self::$csrfToken === null) {
            self::$csrfToken = bin2hex(random_bytes(32));
            $_SESSION['_csrf_token'] = self::$csrfToken;
            $_SESSION['_csrf_time'] = time();
        }
        return self::$csrfToken;
    }

    /**
     * Verify CSRF token
     */
    public static function verifyCsrfToken(?string $token): bool {
        if (!self::$config['csrf_enabled']) {
            return true;
        }

        if (empty($token) || empty($_SESSION['_csrf_token'])) {
            return false;
        }

        // Check token expiration
        $tokenTime = $_SESSION['_csrf_time'] ?? 0;
        if (time() - $tokenTime > self::$config['csrf_token_lifetime']) {
            unset($_SESSION['_csrf_token'], $_SESSION['_csrf_time']);
            return false;
        }

        // Constant-time comparison to prevent timing attacks
        return hash_equals($_SESSION['_csrf_token'], $token);
    }

    /**
     * Get CSRF input field HTML
     */
    public static function csrfField(): string {
        $token = self::generateCsrfToken();
        return '<input type="hidden" name="_csrf_token" value="' . htmlspecialchars($token, ENT_QUOTES, 'UTF-8') . '">';
    }

    /**
     * Get CSRF meta tag for AJAX requests
     */
    public static function csrfMeta(): string {
        $token = self::generateCsrfToken();
        return '<meta name="csrf-token" content="' . htmlspecialchars($token, ENT_QUOTES, 'UTF-8') . '">';
    }

    /**
     * Check rate limit
     */
    public static function checkRateLimit(string $key = ''): bool {
        if (!self::$config['rate_limit_enabled']) {
            return true;
        }

        $identifier = $key ?: ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $cacheKey = 'rate_limit_' . md5($identifier);

        // Use session-based rate limiting (for simplicity)
        // In production, consider using Redis or Memcached
        if (!isset($_SESSION[$cacheKey])) {
            $_SESSION[$cacheKey] = [
                'count' => 0,
                'reset' => time() + self::$config['rate_limit_window']
            ];
        }

        $data = &$_SESSION[$cacheKey];

        // Reset if window expired
        if (time() > $data['reset']) {
            $data['count'] = 0;
            $data['reset'] = time() + self::$config['rate_limit_window'];
        }

        // Increment counter
        $data['count']++;

        // Check if exceeded
        if ($data['count'] > self::$config['rate_limit_requests']) {
            return false;
        }

        return true;
    }

    /**
     * Get remaining rate limit requests
     */
    public static function getRateLimitRemaining(string $key = ''): int {
        $identifier = $key ?: ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $cacheKey = 'rate_limit_' . md5($identifier);

        if (!isset($_SESSION[$cacheKey])) {
            return self::$config['rate_limit_requests'];
        }

        $remaining = self::$config['rate_limit_requests'] - $_SESSION[$cacheKey]['count'];
        return max(0, $remaining);
    }

    /**
     * Sanitize string input
     */
    public static function sanitizeString(?string $input): string {
        if ($input === null) {
            return '';
        }
        // Remove null bytes and control characters
        $input = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $input);
        // Trim whitespace
        return trim($input);
    }

    /**
     * Sanitize email
     */
    public static function sanitizeEmail(?string $email): string {
        if ($email === null) {
            return '';
        }
        return filter_var(trim($email), FILTER_SANITIZE_EMAIL) ?: '';
    }

    /**
     * Validate email
     */
    public static function validateEmail(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Sanitize integer
     */
    public static function sanitizeInt($input): int {
        return (int) filter_var($input, FILTER_SANITIZE_NUMBER_INT);
    }

    /**
     * Sanitize float
     */
    public static function sanitizeFloat($input): float {
        return (float) filter_var($input, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    }

    /**
     * Sanitize URL
     */
    public static function sanitizeUrl(?string $url): string {
        if ($url === null) {
            return '';
        }
        return filter_var(trim($url), FILTER_SANITIZE_URL) ?: '';
    }

    /**
     * Validate URL
     */
    public static function validateUrl(string $url): bool {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    /**
     * Escape HTML
     */
    public static function escapeHtml(?string $input): string {
        if ($input === null) {
            return '';
        }
        return htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Escape for JavaScript
     */
    public static function escapeJs(?string $input): string {
        if ($input === null) {
            return '';
        }
        return json_encode($input, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    }

    /**
     * Check honeypot field (anti-spam)
     */
    public static function checkHoneypot(): bool {
        $field = self::$config['honeypot_field'] ?? 'website';
        return empty($_POST[$field]);
    }

    /**
     * Verify reCAPTCHA
     */
    public static function verifyRecaptcha(string $response): bool {
        if (!self::$config['recaptcha_enabled']) {
            return true;
        }

        if (empty($response) || empty(self::$config['recaptcha_secret_key'])) {
            return false;
        }

        $verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
        $data = [
            'secret' => self::$config['recaptcha_secret_key'],
            'response' => $response,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
        ];

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/x-www-form-urlencoded',
                'content' => http_build_query($data),
                'timeout' => 10
            ]
        ]);

        $result = @file_get_contents($verifyUrl, false, $context);
        if ($result === false) {
            return false;
        }

        $json = json_decode($result, true);
        return $json['success'] ?? false;
    }

    /**
     * Generate secure random token
     */
    public static function generateToken(int $length = 32): string {
        return bin2hex(random_bytes($length));
    }

    /**
     * Hash password
     */
    public static function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3
        ]);
    }

    /**
     * Verify password
     */
    public static function verifyPassword(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }

    /**
     * Check if password needs rehashing
     */
    public static function needsRehash(string $hash): bool {
        return password_needs_rehash($hash, PASSWORD_ARGON2ID);
    }

    /**
     * Set security headers
     */
    public static function setSecurityHeaders(): void {
        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');

        // Prevent clickjacking
        header('X-Frame-Options: DENY');

        // XSS protection
        header('X-XSS-Protection: 1; mode=block');

        // Referrer policy
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Content Security Policy (adjust as needed)
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.telegram.org https://toncenter.com;");

        // Permissions policy
        header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    }

    /**
     * Validate Telegram WebApp init data
     */
    public static function validateTelegramInitData(string $initData, string $botToken): bool {
        if (empty($initData) || empty($botToken)) {
            return false;
        }

        // Parse init data
        parse_str($initData, $data);

        if (empty($data['hash'])) {
            return false;
        }

        $hash = $data['hash'];
        unset($data['hash']);

        // Sort alphabetically
        ksort($data);

        // Build data check string
        $dataCheckString = [];
        foreach ($data as $key => $value) {
            $dataCheckString[] = "$key=$value";
        }
        $dataCheckString = implode("\n", $dataCheckString);

        // Calculate secret key
        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);

        // Calculate hash
        $calculatedHash = bin2hex(hash_hmac('sha256', $dataCheckString, $secretKey, true));

        // Compare hashes
        return hash_equals($calculatedHash, $hash);
    }

    /**
     * Parse Telegram init data
     */
    public static function parseTelegramInitData(string $initData): ?array {
        parse_str($initData, $data);

        if (empty($data)) {
            return null;
        }

        // Parse user data if present
        if (!empty($data['user'])) {
            $data['user'] = json_decode($data['user'], true);
        }

        return $data;
    }
}

/**
 * Helper functions for templates
 */
function csrf_field(): string {
    return Security::csrfField();
}

function csrf_meta(): string {
    return Security::csrfMeta();
}

function e(?string $string): string {
    return Security::escapeHtml($string);
}

function sanitize(string $input): string {
    return Security::sanitizeString($input);
}
