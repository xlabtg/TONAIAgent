/**
 * Tests for Issue #309: Comprehensive API Input Validation
 *
 * Covers:
 * - validateBody: success, missing fields, wrong types, out-of-range values
 * - validateContentType: JSON enforcement, safe-method bypass
 * - sanitizeString / sanitizeObject: XSS prevention
 * - RateLimiter: under-limit pass-through, limit enforcement, window reset
 * - createStandardRateLimit / createTradeRateLimit: factory defaults
 * - getSecurityHeaders: presence and values of all expected headers
 * - isCsrfTokenValid: valid token, missing token, method bypass
 * - isBodySizeAllowed: within limit, over limit, absent header
 * - withTimeout: completes before timeout, times out
 * - CreateAgentSchema / ConfigureAgentSchema: valid + invalid inputs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

import {
  validateBody,
  validateContentType,
  sanitizeString,
  sanitizeObject,
} from '../../services/api/middleware/validate.js';

import {
  RateLimiter,
  createStandardRateLimit,
  createTradeRateLimit,
} from '../../services/api/middleware/rate-limit.js';

import {
  getSecurityHeaders,
  isCsrfTokenValid,
  isBodySizeAllowed,
  withTimeout,
  RequestTimeoutError,
} from '../../services/api/middleware/security-headers.js';

import {
  CreateAgentSchema,
  ConfigureAgentSchema,
} from '../../services/api/schemas/agent.js';

import type { AgentControlRequest } from '../../core/agents/control/index.js';

// ============================================================================
// Helpers
// ============================================================================

function makeReq(overrides: Partial<AgentControlRequest> = {}): AgentControlRequest {
  return {
    method: 'GET',
    path: '/api/agents',
    headers: { 'content-type': 'application/json' },
    ...overrides,
  };
}

// ============================================================================
// validateBody
// ============================================================================

describe('validateBody', () => {
  const schema = z.object({ name: z.string().min(1), value: z.number() });

  it('returns ok=true with parsed data on valid body', () => {
    const req = makeReq({ body: { name: 'test', value: 42 } });
    const result = validateBody(req, schema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('test');
      expect(result.data.value).toBe(42);
    }
  });

  it('returns ok=false with 400 response on missing required field', () => {
    const req = makeReq({ body: { name: 'test' } });
    const result = validateBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.statusCode).toBe(400);
      expect(result.response.body.success).toBe(false);
      expect(result.response.body.error).toMatch(/validation/i);
    }
  });

  it('returns ok=false when body is null', () => {
    const req = makeReq({ body: null });
    const result = validateBody(req, schema);
    expect(result.ok).toBe(false);
  });

  it('returns ok=false when field type is wrong', () => {
    const req = makeReq({ body: { name: 'ok', value: 'not-a-number' } });
    const result = validateBody(req, schema);
    expect(result.ok).toBe(false);
  });

  it('includes field path in error details', () => {
    const req = makeReq({ body: { value: 5 } }); // missing name
    const result = validateBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const details = (result.response.body as Record<string, unknown>).details as Array<{ path: string; message: string }>;
      expect(details.some(d => d.path === 'name')).toBe(true);
    }
  });
});

// ============================================================================
// validateContentType
// ============================================================================

describe('validateContentType', () => {
  it('returns null for GET requests (no body required)', () => {
    const req = makeReq({ method: 'GET', headers: {} });
    expect(validateContentType(req)).toBeNull();
  });

  it('returns null for POST with application/json', () => {
    const req = makeReq({ method: 'POST', headers: { 'content-type': 'application/json' } });
    expect(validateContentType(req)).toBeNull();
  });

  it('returns null for POST with application/json; charset=utf-8', () => {
    const req = makeReq({ method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' } });
    expect(validateContentType(req)).toBeNull();
  });

  it('returns 415 for POST with text/plain', () => {
    const req = makeReq({ method: 'POST', headers: { 'content-type': 'text/plain' } });
    const res = validateContentType(req);
    expect(res).not.toBeNull();
    expect(res?.statusCode).toBe(415);
    expect(res?.body.success).toBe(false);
  });

  it('returns 415 for POST with missing content-type header', () => {
    const req = makeReq({ method: 'POST', headers: {} });
    const res = validateContentType(req);
    expect(res?.statusCode).toBe(415);
  });
});

// ============================================================================
// sanitizeString
// ============================================================================

describe('sanitizeString', () => {
  it('removes null bytes', () => {
    expect(sanitizeString('he\0llo')).toBe('hello');
  });

  it('strips HTML tags', () => {
    expect(sanitizeString('<script>alert(1)</script>hello')).toBe('hello');
  });

  it('encodes remaining angle brackets after tag stripping', () => {
    // "a<b" has no closing >, so the tag is not matched — angle bracket is encoded
    expect(sanitizeString('a<b')).toBe('a&lt;b');
  });

  it('does not modify clean strings', () => {
    expect(sanitizeString('Hello World 123')).toBe('Hello World 123');
  });
});

// ============================================================================
// sanitizeObject
// ============================================================================

describe('sanitizeObject', () => {
  it('sanitizes string values in a flat object', () => {
    const result = sanitizeObject({ name: '<b>Alice</b>', age: 30 }) as Record<string, unknown>;
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('recurses into nested objects', () => {
    const result = sanitizeObject({ outer: { inner: '<evil>' } }) as Record<string, unknown>;
    expect((result.outer as Record<string, unknown>).inner).toBe('');
  });

  it('sanitizes strings inside arrays', () => {
    const result = sanitizeObject(['<img>', 'safe']) as string[];
    expect(result[0]).toBe('');
    expect(result[1]).toBe('safe');
  });

  it('leaves numbers and booleans unchanged', () => {
    expect(sanitizeObject(42)).toBe(42);
    expect(sanitizeObject(true)).toBe(true);
  });
});

// ============================================================================
// RateLimiter
// ============================================================================

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 60_000, max: 3 });
  });

  const makeIpReq = (ip: string): AgentControlRequest =>
    makeReq({ headers: { 'x-forwarded-for': ip } });

  it('allows requests below the limit', () => {
    expect(limiter.check(makeIpReq('1.2.3.4'))).toBeNull();
    expect(limiter.check(makeIpReq('1.2.3.4'))).toBeNull();
    expect(limiter.check(makeIpReq('1.2.3.4'))).toBeNull();
  });

  it('blocks the (max+1)-th request with 429', () => {
    for (let i = 0; i < 3; i++) limiter.check(makeIpReq('1.2.3.4'));
    const res = limiter.check(makeIpReq('1.2.3.4'));
    expect(res?.statusCode).toBe(429);
    expect(res?.body.success).toBe(false);
  });

  it('tracks different IPs independently', () => {
    for (let i = 0; i < 3; i++) limiter.check(makeIpReq('1.1.1.1'));
    // 1.1.1.1 is now at the limit, but 2.2.2.2 should pass freely
    expect(limiter.check(makeIpReq('2.2.2.2'))).toBeNull();
  });

  it('resets the counter on reset(key)', () => {
    for (let i = 0; i < 3; i++) limiter.check(makeIpReq('1.2.3.4'));
    limiter.reset('1.2.3.4');
    expect(limiter.check(makeIpReq('1.2.3.4'))).toBeNull();
  });

  it('resets all counters on reset()', () => {
    for (let i = 0; i < 3; i++) limiter.check(makeIpReq('1.2.3.4'));
    limiter.reset();
    expect(limiter.check(makeIpReq('1.2.3.4'))).toBeNull();
  });

  it('uses x-real-ip as fallback key', () => {
    const req = makeReq({ headers: { 'x-real-ip': '5.6.7.8' } });
    expect(limiter.check(req)).toBeNull();
  });

  it('falls back to "unknown" when no IP header present', () => {
    const req = makeReq({ headers: {} });
    expect(limiter.check(req)).toBeNull();
  });
});

describe('createStandardRateLimit', () => {
  it('creates a limiter with max 100', () => {
    const limiter = createStandardRateLimit();
    // Should allow 100 requests
    const makeIpReq = (ip: string) => makeReq({ headers: { 'x-forwarded-for': ip } });
    for (let i = 0; i < 100; i++) expect(limiter.check(makeIpReq('10.0.0.1'))).toBeNull();
    expect(limiter.check(makeIpReq('10.0.0.1'))?.statusCode).toBe(429);
  });
});

describe('createTradeRateLimit', () => {
  it('creates a limiter with max 10', () => {
    const limiter = createTradeRateLimit();
    const makeIpReq = (ip: string) => makeReq({ headers: { 'x-forwarded-for': ip } });
    for (let i = 0; i < 10; i++) expect(limiter.check(makeIpReq('10.0.0.2'))).toBeNull();
    expect(limiter.check(makeIpReq('10.0.0.2'))?.statusCode).toBe(429);
  });
});

// ============================================================================
// getSecurityHeaders
// ============================================================================

describe('getSecurityHeaders', () => {
  it('includes all required security headers', () => {
    const headers = getSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-XSS-Protection']).toBe('0');
    expect(headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(headers['Referrer-Policy']).toBe('no-referrer');
    expect(headers['Cache-Control']).toBe('no-store');
  });

  it('does not include HSTS by default', () => {
    const headers = getSecurityHeaders();
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('includes HSTS when enableHSTS=true', () => {
    const headers = getSecurityHeaders({ enableHSTS: true });
    expect(headers['Strict-Transport-Security']).toMatch(/max-age=\d+/);
  });

  it('respects custom hstsMaxAge', () => {
    const headers = getSecurityHeaders({ enableHSTS: true, hstsMaxAge: 3600 });
    expect(headers['Strict-Transport-Security']).toContain('max-age=3600');
  });
});

// ============================================================================
// isCsrfTokenValid
// ============================================================================

describe('isCsrfTokenValid', () => {
  const token = 'my-secret-csrf-token';

  it('returns true for GET requests (no CSRF needed)', () => {
    expect(isCsrfTokenValid('GET', {}, token)).toBe(true);
  });

  it('returns true for HEAD requests', () => {
    expect(isCsrfTokenValid('HEAD', {}, token)).toBe(true);
  });

  it('returns true for POST with correct token', () => {
    expect(isCsrfTokenValid('POST', { 'x-csrf-token': token }, token)).toBe(true);
  });

  it('returns false for POST with wrong token', () => {
    expect(isCsrfTokenValid('POST', { 'x-csrf-token': 'wrong' }, token)).toBe(false);
  });

  it('returns false for POST with missing token', () => {
    expect(isCsrfTokenValid('POST', {}, token)).toBe(false);
  });

  it('returns false for PUT with missing token', () => {
    expect(isCsrfTokenValid('PUT', {}, token)).toBe(false);
  });

  it('returns false for DELETE with wrong token', () => {
    expect(isCsrfTokenValid('DELETE', { 'x-csrf-token': token + 'X' }, token)).toBe(false);
  });
});

// ============================================================================
// isBodySizeAllowed
// ============================================================================

describe('isBodySizeAllowed', () => {
  const limit = 102_400; // 100 KB

  it('returns true when content-length is below limit', () => {
    expect(isBodySizeAllowed({ 'content-length': '1024' }, limit)).toBe(true);
  });

  it('returns true when content-length equals limit', () => {
    expect(isBodySizeAllowed({ 'content-length': String(limit) }, limit)).toBe(true);
  });

  it('returns false when content-length exceeds limit', () => {
    expect(isBodySizeAllowed({ 'content-length': String(limit + 1) }, limit)).toBe(false);
  });

  it('returns true when content-length header is absent', () => {
    expect(isBodySizeAllowed({}, limit)).toBe(true);
  });

  it('returns true when headers are undefined', () => {
    expect(isBodySizeAllowed(undefined, limit)).toBe(true);
  });

  it('returns true for non-numeric content-length', () => {
    expect(isBodySizeAllowed({ 'content-length': 'bogus' }, limit)).toBe(true);
  });
});

// ============================================================================
// withTimeout
// ============================================================================

describe('withTimeout', () => {
  it('resolves when handler completes in time', async () => {
    const result = await withTimeout(() => Promise.resolve(42), 1000);
    expect(result).toBe(42);
  });

  it('rejects with RequestTimeoutError when handler exceeds timeout', async () => {
    const slow = () => new Promise<never>(resolve => setTimeout(resolve, 200));
    await expect(withTimeout(slow, 50)).rejects.toBeInstanceOf(RequestTimeoutError);
  });

  it('propagates handler errors', async () => {
    const broken = () => Promise.reject(new Error('boom'));
    await expect(withTimeout(broken, 1000)).rejects.toThrow('boom');
  });
});

// ============================================================================
// CreateAgentSchema
// ============================================================================

describe('CreateAgentSchema', () => {
  const validPayload = {
    userId: 'user_123',
    name: 'My Trend Agent',
    strategy: 'trend',
    budgetTon: 500,
    riskLevel: 'medium',
  };

  it('accepts a fully valid payload', () => {
    expect(CreateAgentSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects missing userId', () => {
    const { userId: _, ...rest } = validPayload;
    expect(CreateAgentSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty userId', () => {
    expect(CreateAgentSchema.safeParse({ ...validPayload, userId: '' }).success).toBe(false);
  });

  it('rejects userId longer than 100 characters', () => {
    expect(CreateAgentSchema.safeParse({ ...validPayload, userId: 'x'.repeat(101) }).success).toBe(false);
  });

  it('rejects unknown strategy', () => {
    expect(CreateAgentSchema.safeParse({ ...validPayload, strategy: 'unknown' }).success).toBe(false);
  });

  it('accepts all valid strategies', () => {
    for (const strategy of ['trend', 'arbitrage', 'ai_signal']) {
      expect(CreateAgentSchema.safeParse({ ...validPayload, strategy }).success).toBe(true);
    }
  });

  it('rejects negative budgetTon', () => {
    expect(CreateAgentSchema.safeParse({ ...validPayload, budgetTon: -1 }).success).toBe(false);
  });

  it('rejects budgetTon exceeding 1_000_000', () => {
    expect(CreateAgentSchema.safeParse({ ...validPayload, budgetTon: 1_000_001 }).success).toBe(false);
  });

  it('rejects invalid riskLevel', () => {
    expect(CreateAgentSchema.safeParse({ ...validPayload, riskLevel: 'extreme' }).success).toBe(false);
  });
});

// ============================================================================
// ConfigureAgentSchema
// ============================================================================

describe('ConfigureAgentSchema', () => {
  it('accepts a partial update with just one field', () => {
    expect(ConfigureAgentSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('accepts a full update', () => {
    expect(ConfigureAgentSchema.safeParse({
      name: 'Updated',
      strategy: 'arbitrage',
      budgetTon: 100,
      riskLevel: 'low',
    }).success).toBe(true);
  });

  it('rejects an empty object', () => {
    expect(ConfigureAgentSchema.safeParse({}).success).toBe(false);
  });

  it('rejects invalid strategy', () => {
    expect(ConfigureAgentSchema.safeParse({ strategy: 'bad' }).success).toBe(false);
  });
});
