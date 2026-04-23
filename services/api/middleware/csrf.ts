/**
 * TONAIAgent - CSRF Token Generation and Verification
 *
 * Implements the double-submit cookie pattern with HMAC-signed tokens:
 *   1. Server issues a signed token via Set-Cookie on GET /healthz (or session creation).
 *   2. Client reads the cookie (HttpOnly=false) and echoes it in X-CSRF-Token header.
 *   3. Server verifies header === cookie value AND that the HMAC is valid.
 *
 * Token format (base64url-encoded):
 *   <32-byte-random-hex>.<issuedAt-ms>.<sessionId>.<HMAC-hex>
 *
 * Implements Issue #357 / re-audit §4.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// ============================================================================
// Constants
// ============================================================================

/** Token TTL: 24 hours */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Nonce length in bytes (produces 64 hex chars) */
const NONCE_BYTES = 32;

// ============================================================================
// Types
// ============================================================================

export interface CsrfTokenResult {
  /** The signed CSRF token — set as cookie value and echoed in X-CSRF-Token */
  token: string;
  /** Complete Set-Cookie header value */
  cookie: string;
}

export interface CsrfVerifyResult {
  valid: boolean;
  /** Human-readable reason when valid === false */
  reason?: 'missing' | 'malformed' | 'expired' | 'signature_mismatch';
}

// ============================================================================
// Generation
// ============================================================================

/**
 * Generate a signed CSRF token for the given session.
 *
 * @param sessionId - A stable identifier for the current session (e.g. Telegram user ID, JWT sub).
 *                    Pass an empty string for unauthenticated sessions.
 * @param secret    - HMAC signing key (CSRF_SECRET env var).
 * @param secure    - Whether to include the Secure flag on the cookie (true in production).
 */
export function generateCsrfToken(
  sessionId: string,
  secret: string,
  secure = process.env['NODE_ENV'] === 'production',
): CsrfTokenResult {
  const nonce = randomBytes(NONCE_BYTES).toString('hex');
  const issuedAt = Date.now().toString();
  const payload = `${nonce}.${issuedAt}.${sessionId}`;
  const sig = sign(payload, secret);
  const token = `${payload}.${sig}`;

  const cookieFlags = [
    `csrf_token=${token}`,
    'SameSite=Strict',
    'Path=/',
    // HttpOnly=false is intentional: the client JS must read and echo the value
  ];
  if (secure) cookieFlags.push('Secure');

  return { token, cookie: cookieFlags.join('; ') };
}

// ============================================================================
// Verification
// ============================================================================

/**
 * Verify a CSRF token that was read from the X-CSRF-Token header.
 *
 * Checks:
 *   1. Token is present and structurally valid (4 parts).
 *   2. HMAC signature matches (using constant-time comparison).
 *   3. Token has not expired (TTL: 24 h).
 */
export function verifyCsrfToken(
  token: string | undefined,
  secret: string,
): CsrfVerifyResult {
  if (!token || token.length === 0) {
    return { valid: false, reason: 'missing' };
  }

  const parts = token.split('.');
  if (parts.length !== 4) {
    return { valid: false, reason: 'malformed' };
  }

  const [nonce, issuedAtStr, sessionId, receivedSig] = parts;

  if (!nonce || !issuedAtStr || sessionId === undefined || !receivedSig) {
    return { valid: false, reason: 'malformed' };
  }

  const payload = `${nonce}.${issuedAtStr}.${sessionId}`;
  const expectedSig = sign(payload, secret);

  // Constant-time comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  const receivedBuf = Buffer.from(receivedSig, 'utf8');
  if (expectedBuf.length !== receivedBuf.length) {
    return { valid: false, reason: 'signature_mismatch' };
  }
  if (!timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: 'signature_mismatch' };
  }

  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt) || Date.now() - issuedAt > TOKEN_TTL_MS) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true };
}

// ============================================================================
// Cookie parsing
// ============================================================================

/**
 * Extract the csrf_token value from a raw Cookie header string.
 * Returns undefined when no csrf_token cookie is present.
 */
export function parseCsrfCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('csrf_token=')) {
      return trimmed.slice('csrf_token='.length);
    }
  }
  return undefined;
}

// ============================================================================
// Private helpers
// ============================================================================

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
