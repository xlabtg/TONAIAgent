# Task: Implement HTTP Server and Wire API Validation Middleware

**Priority:** 🟡 MEDIUM (blocks activation of PRs #316, #319, #320)
**Effort:** ~2 weeks
**Related Issue:** #325 (re-audit finding NEW-03, §4)
**Suggested labels:** `backend`, `api`, `integration`

## Problem

PR #320 shipped a comprehensive middleware suite (Zod body validation, XSS sanitization, rate limiter, security headers, CSRF, body-size guard, timeouts) with 60 passing tests — but **the project has no HTTP server implementation yet**. The middleware is framework-agnostic utility code that nothing currently consumes.

The same observation applies to:
- Secrets loader (PR #319) — no entry point calls `initConfig()`
- Monitoring metrics (PR #316) — no endpoints to expose `/metrics`

This issue tracks building the HTTP server shell and wiring in the existing middleware so the shipped code becomes active.

## Acceptance Criteria

- [ ] Choose HTTP framework. Recommended: **Fastify** (performant, first-class Zod integration via `fastify-type-provider-zod`). Alternative: Express + zod middleware.
- [ ] Create `apps/api/` (or equivalent) as the HTTP entry point.
- [ ] Wire the following middleware in order:
  1. Request ID / correlation ID
  2. Security headers (from PR #320)
  3. Body-size guard (from PR #320)
  4. Request timeout (from PR #320)
  5. Rate limiter (from PR #320; see also [`13-distributed-rate-limit.md`](./13-distributed-rate-limit.md))
  6. CSRF validation (from PR #320; see also [`14-csrf-token-generation.md`](./14-csrf-token-generation.md))
  7. Zod body validation (from PR #320)
  8. XSS sanitization (from PR #320)
- [ ] Expose endpoints for the first trading flow: `POST /agents`, `GET /agents/:id`, `POST /agents/:id/pause`, `DELETE /agents/:id`.
- [ ] Expose `/healthz` (liveness) and `/readyz` (readiness, including secrets-loader and HSM health).
- [ ] Expose `/metrics` (Prometheus format; see [`12-metrics-wiring.md`](./12-metrics-wiring.md)).
- [ ] Call `await initConfig()` at startup (see [`09-secrets-wiring.md`](./09-secrets-wiring.md)).
- [ ] E2E tests that send real HTTP requests through the full middleware stack and assert 200/4xx behaviour.
- [ ] Dockerfile for the API app.
- [ ] Load test: confirm the rate limiter and body-size guard trigger under load.

## Proposed Directory Layout

```
apps/
  api/
    src/
      index.ts              # bootstrap, initConfig, listen
      server.ts             # framework-agnostic factory
      routes/
        agents.ts
        health.ts
        metrics.ts
      middleware/
        chain.ts            # wires PR #320 middleware in order
    package.json
    Dockerfile
    tests/e2e/
```

## Files to Create

- `apps/api/**` (full new app)
- `docs/api.md` — endpoint contract and error-code table

## References

- Re-audit report §4: API Input Validation
- Re-audit report §New Findings: NEW-03
- PR #320 (merged) — middleware source
- [Fastify + Zod](https://github.com/turkerdev/fastify-type-provider-zod)
