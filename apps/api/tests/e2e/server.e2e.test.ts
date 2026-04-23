/**
 * E2E tests for the HTTP API server.
 *
 * These tests spin up the Fastify server in-process (no external port) and
 * send real HTTP requests through the full middleware stack.
 *
 * Coverage:
 *   - /healthz returns 200
 *   - /readyz returns 200 or 503 depending on secrets state
 *   - /metrics returns Prometheus text
 *   - Security headers are present on every response
 *   - Body-size guard returns 413 for oversized Content-Length
 *   - Rate limiter returns 429 after exceeding the trade limit
 *   - GET /agents/:id routes to the agent control API
 *   - POST /agents validates the body (400 on invalid, 202 on valid)
 *   - Content-Type enforcement (415 on non-JSON POST body)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

// ── Test helpers ─────────────────────────────────────────────────────────────

let app: FastifyInstance;

beforeAll(async () => {
  app = await createServer({ logLevel: 'silent' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ── Health endpoints ─────────────────────────────────────────────────────────

describe('GET /healthz', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { status: string };
    expect(body.status).toBe('ok');
  });
});

describe('GET /readyz', () => {
  it('returns 200 or 503 with a checks object', async () => {
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect([200, 503]).toContain(res.statusCode);
    const body = JSON.parse(res.body) as { checks: Record<string, string> };
    expect(body.checks).toBeDefined();
    expect(typeof body.checks['secrets']).toBe('string');
  });
});

// ── Metrics endpoint ──────────────────────────────────────────────────────────

describe('GET /metrics', () => {
  it('returns Prometheus text format', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.body).toContain('# HELP');
    expect(res.body).toContain('# TYPE');
  });
});

// ── Security headers ──────────────────────────────────────────────────────────

describe('Security headers', () => {
  it('sets X-Content-Type-Options on every response', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: DENY', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets Cache-Control: no-store', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('sets x-request-id header', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('echoes the caller-provided x-request-id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { 'x-request-id': 'test-correlation-id' },
    });
    expect(res.headers['x-request-id']).toBe('test-correlation-id');
  });
});

// ── Body-size guard ───────────────────────────────────────────────────────────

describe('Body-size guard', () => {
  it('returns 413 when Content-Length exceeds 1 MiB', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: {
        'content-type': 'application/json',
        'content-length': String(2 * 1024 * 1024), // 2 MiB
      },
      payload: '{}',
    });
    expect(res.statusCode).toBe(413);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe('BODY_TOO_LARGE');
  });
});

// ── Rate limiter ──────────────────────────────────────────────────────────────

describe('Rate limiter', () => {
  it('returns 429 after exceeding the trade rate limit (10 req/min)', async () => {
    // The trade limiter applies to mutation methods (POST/PUT/DELETE).
    // CSRF is skipped in non-production without CSRF_SECRET — no env set in tests.
    // Send 20 requests — at least one must be blocked regardless of prior state.
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/agents',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({
          userId: 'u1',
          name: 'Agent',
          strategy: 'trend',
          budgetTon: 100,
          riskLevel: 'low',
        }),
      });
      statuses.push(res.statusCode);
    }
    expect(statuses).toContain(429);
  });
});

// ── Agent routes ──────────────────────────────────────────────────────────────

describe('GET /agents/:id', () => {
  it('returns 404 for unknown agent IDs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/agents/no-such-agent-xyz',
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 200 for a known demo agent', async () => {
    // The demo AgentManager pre-populates agent_001 / agent_002
    const res = await app.inject({
      method: 'GET',
      url: '/agents/agent_001',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('agent_001');
  });
});

describe('POST /agents', () => {
  // Use a unique source IP per describe block so the rate limiter does not
  // bleed state from the previous rate-limiter stress test.
  const ip = '10.0.0.2';

  it('returns 415 when Content-Type is not application/json', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: { 'content-type': 'text/plain', 'x-forwarded-for': ip },
      payload: 'hello',
    });
    expect(res.statusCode).toBe(415);
  });

  it('returns 400 when the body fails schema validation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      payload: JSON.stringify({ userId: '', name: '' }),
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 202 with a valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      payload: JSON.stringify({
        userId: 'user_42',
        name: 'My Agent',
        strategy: 'trend',
        budgetTon: 500,
        riskLevel: 'medium',
      }),
    });
    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body) as { success: boolean };
    expect(body.success).toBe(true);
  });
});

// ── XSS sanitization ──────────────────────────────────────────────────────────

describe('XSS sanitization on POST /agents', () => {
  const ip = '10.0.0.3';

  it('sanitizes script tags in string fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      payload: JSON.stringify({
        userId: 'user_1',
        name: '<script>alert(1)</script>My Agent',
        strategy: 'trend',
        budgetTon: 100,
        riskLevel: 'low',
      }),
    });
    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body) as { data: { input: { name: string } } };
    expect(body.data.input.name).not.toContain('<script>');
  });
});
