<?php
/**
 * TON AI Agent - Router
 *
 * Simple routing for API endpoints and page requests.
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'router.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

class Router {
    private array $routes = [];
    private array $middleware = [];
    private ?string $prefix = null;

    /**
     * Add GET route
     */
    public function get(string $path, callable $handler): self {
        return $this->addRoute('GET', $path, $handler);
    }

    /**
     * Add POST route
     */
    public function post(string $path, callable $handler): self {
        return $this->addRoute('POST', $path, $handler);
    }

    /**
     * Add PUT route
     */
    public function put(string $path, callable $handler): self {
        return $this->addRoute('PUT', $path, $handler);
    }

    /**
     * Add DELETE route
     */
    public function delete(string $path, callable $handler): self {
        return $this->addRoute('DELETE', $path, $handler);
    }

    /**
     * Add route for any method
     */
    public function any(string $path, callable $handler): self {
        return $this->addRoute('ANY', $path, $handler);
    }

    /**
     * Add route
     */
    private function addRoute(string $method, string $path, callable $handler): self {
        $fullPath = $this->prefix ? $this->prefix . $path : $path;
        $this->routes[] = [
            'method' => $method,
            'path' => $fullPath,
            'handler' => $handler,
            'middleware' => $this->middleware
        ];
        return $this;
    }

    /**
     * Group routes with prefix
     */
    public function group(string $prefix, callable $callback): self {
        $previousPrefix = $this->prefix;
        $this->prefix = $previousPrefix . $prefix;
        $callback($this);
        $this->prefix = $previousPrefix;
        return $this;
    }

    /**
     * Add middleware
     */
    public function middleware(callable $middleware): self {
        $this->middleware[] = $middleware;
        return $this;
    }

    /**
     * Clear middleware
     */
    public function clearMiddleware(): self {
        $this->middleware = [];
        return $this;
    }

    /**
     * Dispatch request
     */
    public function dispatch(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Remove trailing slash
        $path = rtrim($path, '/') ?: '/';

        foreach ($this->routes as $route) {
            if ($this->matchRoute($route, $method, $path, $params)) {
                // Run middleware
                foreach ($route['middleware'] as $middleware) {
                    $result = $middleware();
                    if ($result === false) {
                        return;
                    }
                }

                // Call handler
                $route['handler']($params);
                return;
            }
        }

        // No route matched
        $this->notFound();
    }

    /**
     * Match route against request
     */
    private function matchRoute(array $route, string $method, string $path, ?array &$params): bool {
        // Check method
        if ($route['method'] !== 'ANY' && $route['method'] !== $method) {
            return false;
        }

        // Build regex pattern
        $pattern = $route['path'];
        $pattern = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[^/]+)', $pattern);
        $pattern = '#^' . $pattern . '$#';

        if (preg_match($pattern, $path, $matches)) {
            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
            return true;
        }

        return false;
    }

    /**
     * Handle 404
     */
    private function notFound(): void {
        http_response_code(404);
        if ($this->isJsonRequest()) {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Not found', 'code' => 404]);
        } else {
            echo '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1></body></html>';
        }
    }

    /**
     * Check if request expects JSON
     */
    private function isJsonRequest(): bool {
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
        return strpos($accept, 'application/json') !== false ||
               strpos($_SERVER['REQUEST_URI'], '/api/') !== false;
    }
}

/**
 * JSON Response Helper
 */
class Response {
    /**
     * Send JSON response
     */
    public static function json(array $data, int $statusCode = 200): void {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Send success response
     */
    public static function success(array $data = [], string $message = 'Success'): void {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
    }

    /**
     * Send error response
     */
    public static function error(string $message, int $statusCode = 400, array $errors = []): void {
        $response = [
            'success' => false,
            'error' => $message
        ];
        if (!empty($errors)) {
            $response['errors'] = $errors;
        }
        self::json($response, $statusCode);
    }

    /**
     * Send validation error response
     */
    public static function validationError(array $errors): void {
        self::error('Validation failed', 422, $errors);
    }

    /**
     * Send unauthorized response
     */
    public static function unauthorized(string $message = 'Unauthorized'): void {
        self::error($message, 401);
    }

    /**
     * Send forbidden response
     */
    public static function forbidden(string $message = 'Forbidden'): void {
        self::error($message, 403);
    }

    /**
     * Redirect
     */
    public static function redirect(string $url, int $statusCode = 302): void {
        http_response_code($statusCode);
        header('Location: ' . $url);
        exit;
    }

    /**
     * Send HTML response
     */
    public static function html(string $content, int $statusCode = 200): void {
        http_response_code($statusCode);
        header('Content-Type: text/html; charset=utf-8');
        echo $content;
        exit;
    }

    /**
     * Render view
     */
    public static function view(string $viewPath, array $data = []): void {
        extract($data);
        ob_start();
        include $viewPath;
        $content = ob_get_clean();
        self::html($content);
    }
}

/**
 * Request Helper
 */
class Request {
    private static ?array $jsonBody = null;

    /**
     * Get request method
     */
    public static function method(): string {
        return $_SERVER['REQUEST_METHOD'];
    }

    /**
     * Get request path
     */
    public static function path(): string {
        return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    }

    /**
     * Get query parameter
     */
    public static function query(string $key, $default = null) {
        return $_GET[$key] ?? $default;
    }

    /**
     * Get all query parameters
     */
    public static function queryAll(): array {
        return $_GET;
    }

    /**
     * Get POST parameter
     */
    public static function input(string $key, $default = null) {
        // Check POST first
        if (isset($_POST[$key])) {
            return $_POST[$key];
        }

        // Then check JSON body
        $body = self::json();
        return $body[$key] ?? $default;
    }

    /**
     * Get all POST/JSON parameters
     */
    public static function all(): array {
        return array_merge($_POST, self::json());
    }

    /**
     * Get JSON body
     */
    public static function json(): array {
        if (self::$jsonBody === null) {
            $body = file_get_contents('php://input');
            self::$jsonBody = json_decode($body, true) ?? [];
        }
        return self::$jsonBody;
    }

    /**
     * Get header
     */
    public static function header(string $key, $default = null): ?string {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $key));
        return $_SERVER[$key] ?? $default;
    }

    /**
     * Get bearer token
     */
    public static function bearerToken(): ?string {
        $auth = self::header('Authorization');
        if ($auth && preg_match('/Bearer\s+(.+)$/i', $auth, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Check if request is AJAX
     */
    public static function isAjax(): bool {
        return self::header('X-Requested-With') === 'XMLHttpRequest';
    }

    /**
     * Check if request expects JSON
     */
    public static function wantsJson(): bool {
        $accept = self::header('Accept', '');
        return strpos($accept, 'application/json') !== false;
    }

    /**
     * Get client IP
     */
    public static function ip(): string {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Get user agent
     */
    public static function userAgent(): string {
        return $_SERVER['HTTP_USER_AGENT'] ?? '';
    }

    /**
     * Validate CSRF token
     */
    public static function validateCsrf(): bool {
        $token = self::input('_csrf_token') ?? self::header('X-CSRF-TOKEN');
        return Security::verifyCsrfToken($token);
    }
}
