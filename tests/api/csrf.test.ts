/**
 * Tests for Issue #357: CSRF Token Generation and Distribution
 *
 * Covers:
 * - generateCsrfToken: output shape, cookie flags
 * - verifyCsrfToken: valid token, missing token, malformed token, expired token,
 *   signature mismatch
 * - parseCsrfCookie: present, absent, multiple cookies
 * - E2E (via Fastify inject): 403 on missing/invalid/expired token, 2xx on valid token
 * - GET /healthz issues Set-Cookie csrf_token when CSRF_SECRET is set
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
import {
  generateCsrfToken,
  verifyCsrfToken,
  parseCsrfCookie,
} from '../../services/api/middleware/csrf.js';
import { createServer } from '../../apps/api/src/server.js';
import type { FastifyInstance } from 'fastify';

const SECRET = 'test-csrf-secret-32-chars-minimum!';

// ============================================================================
// generateCsrfToken
// ============================================================================

describe('generateCsrfToken', () => {
  it('returns a token and a cookie string', () => {
    const result = generateCsrfToken('session-abc', SECRET);
    expect(typeof result.token).toBe('string');
    expect(typeof result.cookie).toBe('string');
  });

  it('token has 4 dot-separated parts', () => {
    const { token } = generateCsrfToken('session-abc', SECRET);
    expect(token.split('.')).toHaveLength(4);
  });

  it('first part is a 64-char hex nonce', () => {
    const { token } = generateCsrfToken('session-abc', SECRET);
    const [nonce] = token.split('.');
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it('cookie contains csrf_token= prefix', () => {
    const { cookie } = generateCsrfToken('session-abc', SECRET);
    expect(cookie.startsWith('csrf_token=')).toBe(true);
  });

  it('cookie includes SameSite=Strict', () => {
    const { cookie } = generateCsrfToken('session-abc', SECRET);
    expect(cookie).toContain('SameSite=Strict');
  });

  it('cookie includes Path=/', () => {
    const { cookie } = generateCsrfToken('session-abc', SECRET);
    expect(cookie).toContain('Path=/');
  });

  it('cookie does NOT include HttpOnly (client JS must read it)', () => {
    const { cookie } = generateCsrfToken('session-abc', SECRET);
    expect(cookie).not.toContain('HttpOnly');
  });

  it('generates different tokens on each call', () => {
    const t1 = generateCsrfToken('session-abc', SECRET).token;
    const t2 = generateCsrfToken('session-abc', SECRET).token;
    expect(t1).not.toBe(t2);
  });
});

// ============================================================================
// verifyCsrfToken
// ============================================================================

describe('verifyCsrfToken', () => {
  it('returns valid=true for a freshly generated token', () => {
    const { token } = generateCsrfToken('session-abc', SECRET);
    const result = verifyCsrfToken(token, SECRET);
    expect(result.valid).toBe(true);
  });

  it('returns valid=false with reason=missing for undefined', () => {
    const result = verifyCsrfToken(undefined, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing');
  });

  it('returns valid=false with reason=missing for empty string', () => {
    const result = verifyCsrfToken('', SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing');
  });

  it('returns valid=false with reason=malformed for token with wrong part count', () => {
    const result = verifyCsrfToken('a.b.c', SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('malformed');
  });

  it('returns valid=false with reason=signature_mismatch for tampered token', () => {
    const { token } = generateCsrfToken('session-abc', SECRET);
    const parts = token.split('.');
    parts[3] = 'deadbeef'.repeat(8); // replace signature
    const tampered = parts.join('.');
    const result = verifyCsrfToken(tampered, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_mismatch');
  });

  it('returns valid=false with reason=signature_mismatch for wrong secret', () => {
    const { token } = generateCsrfToken('session-abc', SECRET);
    const result = verifyCsrfToken(token, 'wrong-secret');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_mismatch');
  });

  it('returns valid=false with reason=expired for a token with issuedAt in the distant past', () => {
    // Manually craft a token with issuedAt = 0 (epoch)
    const { token } = generateCsrfToken('session-abc', SECRET);
    const parts = token.split('.');
    // Replace issuedAt (part[1]) with 0
    parts[1] = '0';
    // Re-sign with correct secret so signature check passes, but TTL fails
    const payload = `${parts[0]}.${parts[1]}.${parts[2]}`;
    const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
    parts[3] = sig;
    const expiredToken = parts.join('.');
    const result = verifyCsrfToken(expiredToken, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });
});

// ============================================================================
// parseCsrfCookie
// ============================================================================

describe('parseCsrfCookie', () => {
  it('returns undefined for undefined input', () => {
    expect(parseCsrfCookie(undefined)).toBeUndefined();
  });

  it('returns undefined when csrf_token is not present', () => {
    expect(parseCsrfCookie('session_id=abc; other=xyz')).toBeUndefined();
  });

  it('extracts csrf_token from a single-cookie header', () => {
    expect(parseCsrfCookie('csrf_token=abc123')).toBe('abc123');
  });

  it('extracts csrf_token when mixed with other cookies', () => {
    expect(parseCsrfCookie('session_id=xyz; csrf_token=mytoken; theme=dark')).toBe('mytoken');
  });
});

// ============================================================================
// E2E: CSRF enforcement via Fastify inject
// ============================================================================

describe('CSRF E2E', () => {
  let app: FastifyInstance;
  const originalCsrfSecret = process.env['CSRF_SECRET'];
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeAll(async () => {
    process.env['CSRF_SECRET'] = SECRET;
    process.env['NODE_ENV'] = 'production';
    app = await createServer({ logLevel: 'silent' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    process.env['CSRF_SECRET'] = originalCsrfSecret;
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  // Unique IP per test to avoid rate-limiter interference
  let ipCounter = 100;
  function nextIp(): string {
    return `192.168.1.${ipCounter++}`;
  }

  it('GET /healthz sets a csrf_token cookie when CSRF_SECRET is configured', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers['set-cookie'] as string | undefined;
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('csrf_token=');
    expect(setCookie).toContain('SameSite=Strict');
  });

  it('POST /agents → 403 when X-CSRF-Token header is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': nextIp(),
      },
      payload: JSON.stringify({
        userId: 'u1', name: 'Agent', strategy: 'trend', budgetTon: 100, riskLevel: 'low',
      }),
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe('CSRF_INVALID');
  });

  it('POST /agents → 403 when X-CSRF-Token header has a mismatched value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': nextIp(),
        'x-csrf-token': 'wrong.token.here.value',
      },
      payload: JSON.stringify({
        userId: 'u1', name: 'Agent', strategy: 'trend', budgetTon: 100, riskLevel: 'low',
      }),
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe('CSRF_INVALID');
  });

  it('POST /agents → 403 when X-CSRF-Token contains an expired token', async () => {
    // Craft a validly-signed token with issuedAt = epoch (expired)
    const nonce = randomBytes(32).toString('hex');
    const issuedAt = '0'; // epoch = always expired
    const sessionId = '';
    const payload = `${nonce}.${issuedAt}.${sessionId}`;
    const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
    const expiredToken = `${payload}.${sig}`;

    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': nextIp(),
        'x-csrf-token': expiredToken,
      },
      payload: JSON.stringify({
        userId: 'u1', name: 'Agent', strategy: 'trend', budgetTon: 100, riskLevel: 'low',
      }),
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe('CSRF_INVALID');
  });

  it('POST /agents → 202 when X-CSRF-Token is a valid signed token', async () => {
    const { token } = generateCsrfToken('', SECRET);
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': nextIp(),
        'x-csrf-token': token,
      },
      payload: JSON.stringify({
        userId: 'user_csrf_ok',
        name: 'CSRF Test Agent',
        strategy: 'trend',
        budgetTon: 100,
        riskLevel: 'low',
      }),
    });
    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
