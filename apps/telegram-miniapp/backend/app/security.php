<?php
/**
 * TON AI Agent - Security Module
 *
 * Provides security features:
 * - CSRF protection
 * - Input sanitization
 * - Rate limiting
 * - Telegram WebApp signature verification
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Direct access forbidden');
}

class Security
{
    private static array $config = [];
    private static bool $initialized = false;

    /**
     * Initialize security module
     */
    public static function init(): void
    {
        if (self::$initialized) {
            return;
        }

        $configFile = __DIR__ . '/config.php';
        if (file_exists($configFile)) {
            $config = require $configFile;
            self::$config = $config['security'] ?? [];
        }

        // Initialize session
        self::initSession();

        // Set security headers
        self::setSecurityHeaders();

        self::$initialized = true;
    }

    /**
     * Initialize secure session
     */
    private static function initSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $sessionConfig = self::$config['session'] ?? [];

        session_name($sessionConfig['name'] ?? 'PHPSESSID');

        session_set_cookie_params([
            'lifetime' => $sessionConfig['lifetime'] ?? 7200,
            'path' => '/',
            'domain' => '',
            'secure' => $sessionConfig['secure'] ?? true,
            'httponly' => $sessionConfig['httponly'] ?? true,
            'samesite' => $sessionConfig['samesite'] ?? 'Strict',
        ]);

        session_start();

        // Regenerate session ID periodically
        if (!isset($_SESSION['_created'])) {
            $_SESSION['_created'] = time();
        } elseif (time() - $_SESSION['_created'] > 1800) {
            session_regenerate_id(true);
            $_SESSION['_created'] = time();
        }
    }

    /**
     * Set security headers
     */
    private static function setSecurityHeaders(): void
    {
        // Prevent clickjacking
        header('X-Frame-Options: DENY');

        // XSS protection
        header('X-XSS-Protection: 1; mode=block');

        // Prevent MIME sniffing
        header('X-Content-Type-Options: nosniff');

        // Referrer policy
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Content Security Policy
        $csp = self::$config['csp'] ?? [];
        if (!empty($csp['enabled']) && !empty($csp['directives'])) {
            $directives = [];
            foreach ($csp['directives'] as $name => $value) {
                $directives[] = "$name $value";
            }
            header('Content-Security-Policy: ' . implode('; ', $directives));
        }

        // Strict Transport Security (HTTPS only)
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }

    /**
     * Generate CSRF token
     */
    public static function generateCsrfToken(): string
    {
        $csrfConfig = self::$config['csrf'] ?? [];
        $tokenLength = $csrfConfig['token_length'] ?? 32;

        $token = bin2hex(random_bytes($tokenLength));
        $_SESSION['_csrf_token'] = $token;
        $_SESSION['_csrf_time'] = time();

        return $token;
    }

    /**
     * Validate CSRF token
     */
    public static function validateCsrfToken(?string $token): bool
    {
        if (!isset($_SESSION['_csrf_token']) || empty($token)) {
            return false;
        }

        // Check token expiration (1 hour)
        if (time() - ($_SESSION['_csrf_time'] ?? 0) > 3600) {
            unset($_SESSION['_csrf_token'], $_SESSION['_csrf_time']);
            return false;
        }

        return hash_equals($_SESSION['_csrf_token'], $token);
    }

    /**
     * Get CSRF token input HTML
     */
    public static function csrfField(): string
    {
        $token = self::generateCsrfToken();
        $name = self::$config['csrf']['token_name'] ?? '_csrf_token';
        return sprintf('<input type="hidden" name="%s" value="%s">', htmlspecialchars($name), htmlspecialchars($token));
    }

    /**
     * Sanitize input string
     */
    public static function sanitizeString(string $input, int $maxLength = 0): string
    {
        // Remove null bytes
        $input = str_replace("\0", '', $input);

        // Trim whitespace
        $input = trim($input);

        // Apply max length
        if ($maxLength > 0 && mb_strlen($input) > $maxLength) {
            $input = mb_substr($input, 0, $maxLength);
        }

        // Remove any HTML tags
        $input = strip_tags($input);

        return $input;
    }

    /**
     * Sanitize email
     */
    public static function sanitizeEmail(string $email): ?string
    {
        $email = filter_var($email, FILTER_SANITIZE_EMAIL);
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    }

    /**
     * Sanitize integer
     */
    public static function sanitizeInt($value): int
    {
        return filter_var($value, FILTER_VALIDATE_INT) !== false
            ? (int)$value
            : 0;
    }

    /**
     * Sanitize float
     */
    public static function sanitizeFloat($value): float
    {
        return filter_var($value, FILTER_VALIDATE_FLOAT) !== false
            ? (float)$value
            : 0.0;
    }

    /**
     * Sanitize URL
     */
    public static function sanitizeUrl(string $url): ?string
    {
        $url = filter_var($url, FILTER_SANITIZE_URL);
        return filter_var($url, FILTER_VALIDATE_URL) ? $url : null;
    }

    /**
     * HTML escape for output
     */
    public static function escape(string $string): string
    {
        return htmlspecialchars($string, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Check rate limit
     */
    public static function checkRateLimit(string $key = ''): bool
    {
        $rateLimitConfig = self::$config['rate_limit'] ?? [];

        if (empty($rateLimitConfig['enabled'])) {
            return true;
        }

        $maxRequests = $rateLimitConfig['max_requests'] ?? 60;
        $timeWindow = $rateLimitConfig['time_window'] ?? 60;

        // Use IP address if no key provided
        if (empty($key)) {
            $key = self::getClientIp();
        }

        $cacheKey = 'rate_limit_' . md5($key);
        $now = time();

        // Get current count from session (in production, use Redis/Memcached)
        $data = $_SESSION[$cacheKey] ?? ['count' => 0, 'reset' => $now + $timeWindow];

        // Reset if window expired
        if ($now > $data['reset']) {
            $data = ['count' => 0, 'reset' => $now + $timeWindow];
        }

        // Check if limit exceeded
        if ($data['count'] >= $maxRequests) {
            return false;
        }

        // Increment count
        $data['count']++;
        $_SESSION[$cacheKey] = $data;

        return true;
    }

    /**
     * Get client IP address
     */
    public static function getClientIp(): string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR',
        ];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return '0.0.0.0';
    }

    /**
     * Verify Telegram WebApp init data signature
     *
     * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
     */
    public static function verifyTelegramWebAppData(string $initData, string $botToken): bool
    {
        if (empty($initData) || empty($botToken)) {
            return false;
        }

        // Parse init data
        parse_str($initData, $params);

        if (!isset($params['hash'])) {
            return false;
        }

        $hash = $params['hash'];
        unset($params['hash']);

        // Sort parameters alphabetically
        ksort($params);

        // Build data check string
        $dataCheckArr = [];
        foreach ($params as $key => $value) {
            $dataCheckArr[] = "$key=$value";
        }
        $dataCheckString = implode("\n", $dataCheckArr);

        // Calculate secret key
        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);

        // Calculate hash
        $calculatedHash = bin2hex(hash_hmac('sha256', $dataCheckString, $secretKey, true));

        // Verify hash matches
        if (!hash_equals($calculatedHash, $hash)) {
            return false;
        }

        // Verify auth_date is not too old (within 24 hours)
        if (isset($params['auth_date'])) {
            $authDate = (int)$params['auth_date'];
            if (time() - $authDate > 86400) {
                return false;
            }
        }

        return true;
    }

    /**
     * Parse Telegram WebApp user data
     */
    public static function parseTelegramUser(string $initData): ?array
    {
        parse_str($initData, $params);

        if (!isset($params['user'])) {
            return null;
        }

        $user = json_decode($params['user'], true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        return [
            'id' => $user['id'] ?? null,
            'first_name' => $user['first_name'] ?? null,
            'last_name' => $user['last_name'] ?? null,
            'username' => $user['username'] ?? null,
            'language_code' => $user['language_code'] ?? 'en',
            'is_premium' => $user['is_premium'] ?? false,
        ];
    }

    /**
     * Generate secure random token
     */
    public static function generateToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }

    /**
     * Hash password securely
     */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3,
        ]);
    }

    /**
     * Verify password hash
     */
    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    /**
     * Encrypt sensitive data
     */
    public static function encrypt(string $data, string $key): string
    {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-GCM', $key, OPENSSL_RAW_DATA, $iv, $tag);

        return base64_encode($iv . $tag . $encrypted);
    }

    /**
     * Decrypt sensitive data
     */
    public static function decrypt(string $data, string $key): ?string
    {
        $data = base64_decode($data);

        if (strlen($data) < 32) {
            return null;
        }

        $iv = substr($data, 0, 16);
        $tag = substr($data, 16, 16);
        $encrypted = substr($data, 32);

        $decrypted = openssl_decrypt($encrypted, 'AES-256-GCM', $key, OPENSSL_RAW_DATA, $iv, $tag);

        return $decrypted !== false ? $decrypted : null;
    }
}
