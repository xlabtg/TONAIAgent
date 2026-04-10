/**
 * TONAIAgent - Security Headers Middleware
 *
 * Framework-agnostic security-header helpers inspired by Helmet.js.
 * Returns a plain `Record<string, string>` that callers can merge into
 * their HTTP response headers.
 *
 * Headers applied:
 *   X-Content-Type-Options: nosniff            — prevent MIME sniffing
 *   X-Frame-Options: DENY                       — prevent clickjacking
 *   X-XSS-Protection: 0                         — disable legacy XSS filter (modern browsers ignore it; CSP is the real protection)
 *   Content-Security-Policy: default-src 'none' — strict CSP for API responses
 *   Strict-Transport-Security                   — enforce HTTPS (in production)
 *   Referrer-Policy: no-referrer                — do not leak referrer
 *   Permissions-Policy                          — disable unused browser features
 *   Cache-Control: no-store                     — never cache API responses
 *
 * Implements Issue #309: API input validation
 */

// ============================================================================
// Types
// ============================================================================

export interface SecurityHeadersOptions {
  /**
   * Set to `true` in production to emit the Strict-Transport-Security header.
   * Default: `false` (avoids breaking local HTTP development).
   */
  enableHSTS?: boolean;
  /** HSTS max-age in seconds. Default: 1 year (31 536 000). */
  hstsMaxAge?: number;
}

// ============================================================================
// Header Generation
// ============================================================================

/**
 * Generate a set of security response headers.
 *
 * @example
 * ```ts
 * const headers = getSecurityHeaders({ enableHSTS: process.env.NODE_ENV === 'production' });
 * // Merge into your HTTP framework's response headers.
 * ```
 */
export function getSecurityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const { enableHSTS = false, hstsMaxAge = 31_536_000 } = options;

  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // Modern browsers ignore X-XSS-Protection; keeping it at 0 prevents
    // the legacy mode from inadvertently blocking legitimate content.
    'X-XSS-Protection': '0',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // API responses must never be cached to prevent sensitive data exposure
    'Cache-Control': 'no-store',
  };

  if (enableHSTS) {
    headers['Strict-Transport-Security'] = `max-age=${hstsMaxAge}; includeSubDomains`;
  }

  return headers;
}

// ============================================================================
// CSRF helpers
// ============================================================================

/** HTTP methods that mutate state and therefore require CSRF protection */
const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Validate the CSRF token for state-mutating requests.
 *
 * The expected token must be provided out-of-band (e.g. via an initial
 * GET request or a secure cookie) and matched against the `x-csrf-token`
 * request header.
 *
 * Returns `true` when:
 *   - The request method is safe (GET, HEAD, OPTIONS).
 *   - The `x-csrf-token` header matches the expected token.
 *
 * Returns `false` (invalid) when the header is absent or does not match.
 */
export function isCsrfTokenValid(
  method: string,
  headers: Record<string, string> | undefined,
  expectedToken: string,
): boolean {
  if (!CSRF_PROTECTED_METHODS.has(method)) return true;
  const token = headers?.['x-csrf-token'];
  if (!token || token.length === 0) return false;
  return timingSafeEqual(token, expectedToken);
}

// ============================================================================
// Request size validation
// ============================================================================

/**
 * Check whether the declared `Content-Length` exceeds the configured maximum.
 * Returns `true` when the size is within bounds (or when the header is absent).
 */
export function isBodySizeAllowed(
  headers: Record<string, string> | undefined,
  maxBytes: number,
): boolean {
  const raw = headers?.['content-length'];
  if (!raw) return true;
  const bytes = parseInt(raw, 10);
  if (isNaN(bytes)) return true;
  return bytes <= maxBytes;
}

// ============================================================================
// Request timeout helpers
// ============================================================================

/**
 * Wrap an async handler with a timeout.
 * Rejects with a structured timeout error if the handler takes longer than
 * `timeoutMs` milliseconds.
 */
export async function withTimeout<T>(
  handler: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RequestTimeoutError(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    handler().then(
      result => { clearTimeout(timer); resolve(result); },
      err    => { clearTimeout(timer); reject(err); },
    );
  });
}

export class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

// ============================================================================
// Private helpers
// ============================================================================

/**
 * Constant-time string comparison to prevent timing attacks.
 * Falls back to a simple comparison when strings have different lengths
 * (length itself is observable, but exposing it here leaks no secret).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
