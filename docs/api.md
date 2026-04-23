# TONAIAgent HTTP API

Entry point: `apps/api/src/index.ts`  
Framework: [Fastify v5](https://fastify.dev/)

---

## Running the server

```bash
# Development (tsx watch)
PORT=3000 npm run dev --workspace=apps/api

# Production (compiled)
npm run build --workspace=apps/api
node apps/api/dist/index.js
```

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | TCP port to listen on |
| `HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` | Pino log level |
| `NODE_ENV` | — | Set to `production` to enable HSTS and strict secrets mode |
| `CSRF_SECRET` | — | Secret for CSRF token validation (required in production) |
| `SECRETS_BACKEND` | `env` | `env` / `aws` / `vault` |
| `RATE_LIMIT_STORE` | `memory` | Rate-limit backend: `memory` / `redis` / `noop` |
| `REDIS_URL` | — | Redis connection URL (required when `RATE_LIMIT_STORE=redis`) |
| `RATE_LIMIT_FAIL_OPEN` | `false` | Allow requests when Redis is unreachable (`true` / `false`) |

---

## Middleware chain

Requests pass through the following middleware in order before reaching any route handler:

1. **Correlation ID** — reads or generates `x-request-id`; echoed in the response
2. **Security headers** — sets `X-Content-Type-Options`, `X-Frame-Options`, `CSP`, `Cache-Control: no-store`, etc.
3. **Body-size guard** — rejects `Content-Length > 1 MiB` with `413`
4. **Request timeout** — per-route, 30 s default; returns `504` on breach
5. **Rate limiter** — pluggable sliding-window; `100 req / 15 min` for reads, `10 req / 1 min` for mutations; backend selected via `RATE_LIMIT_STORE` (see [docs/rate-limiting.md](./rate-limiting.md))
6. **CSRF validation** — validates `x-csrf-token` header for `POST / PUT / PATCH / DELETE` (skipped in dev when `CSRF_SECRET` is unset)
7. **Zod body validation** — per-route, returns `400 VALIDATION_ERROR` on failure
8. **XSS sanitization** — strips script/style tags and HTML from all string fields after validation

---

## Endpoints

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Liveness probe — always `200` while the process is up |
| `GET` | `/readyz` | Readiness probe — checks secrets-loader health |

#### `GET /healthz` — 200

```json
{ "status": "ok", "timestamp": "2026-04-22T00:00:00.000Z" }
```

#### `GET /readyz` — 200 or 503

```json
{
  "status": "ok",
  "checks": { "secrets": "ok" },
  "timestamp": "2026-04-22T00:00:00.000Z"
}
```

---

### Metrics

| Method | Path | Description |
|---|---|---|
| `GET` | `/metrics` | Prometheus text format |

Returns `text/plain; version=0.0.4` with the following metrics:

| Metric | Type | Description |
|---|---|---|
| `tonaiagent_trade_total` | counter | Total trades attempted |
| `tonaiagent_trade_success_total` | counter | Successful trades |
| `tonaiagent_trade_failure_total` | counter | Failed trades |
| `tonaiagent_trade_success_rate` | gauge | Trade success rate (0–100) |
| `tonaiagent_avg_execution_time_ms` | gauge | Average trade execution time |
| `tonaiagent_active_agents` | gauge | Currently active agents |
| `tonaiagent_stopped_agents` | gauge | Stopped agents |
| `tonaiagent_total_agents` | gauge | All registered agents |
| `tonaiagent_api_latency_avg_ms` | gauge | Average API latency |
| `tonaiagent_errors_per_sec` | gauge | Errors per second (1 s window) |
| `tonaiagent_memory_usage_bytes` | gauge | Heap memory usage |
| `tonaiagent_uptime_ms` | gauge | Process uptime |
| `tonaiagent_marketplace_active_subscriptions` | gauge | Active marketplace subscriptions |
| `tonaiagent_marketplace_total_revenue` | gauge | Total marketplace revenue (USD) |

---

### Agents

| Method | Path | Description |
|---|---|---|
| `POST` | `/agents` | Create a new agent (queued) |
| `GET` | `/agents/:id` | Get agent status |
| `POST` | `/agents/:id/pause` | Pause a running agent |
| `DELETE` | `/agents/:id` | Stop and remove an agent |

#### `POST /agents` request body

```json
{
  "userId": "string (1–100 chars)",
  "name": "string (1–200 chars)",
  "strategy": "trend | arbitrage | ai_signal",
  "budgetTon": "number (0 < x ≤ 1_000_000)",
  "riskLevel": "low | medium | high"
}
```

Response: `202 Accepted`

```json
{
  "success": true,
  "data": { "message": "Agent creation queued", "input": { "..." } }
}
```

#### `GET /agents/:id` — 200

```json
{
  "success": true,
  "data": {
    "id": "agent_001",
    "name": "Demo Agent",
    "status": "running",
    "strategy": "trend",
    "ownerId": "demo_user",
    "uptimeSeconds": 120,
    "tradesExecuted": 3,
    "createdAt": "...",
    "updatedAt": "...",
    "lastExecutedAt": "...",
    "errorMessage": null
  }
}
```

---

## Error codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed Zod schema validation |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Content-Type is not `application/json` |
| `BODY_TOO_LARGE` | 413 | Request body > 1 MiB |
| `CSRF_INVALID` | 403 | Missing or invalid `x-csrf-token` header |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests; see `Retry-After` header |
| `REQUEST_TIMEOUT` | 504 | Handler exceeded the 30 s timeout |
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |
| `AGENT_ALREADY_RUNNING` | 409 | Agent is already in the requested state |
| `AGENT_ALREADY_STOPPED` | 409 | Agent is already stopped |
| `AGENT_IN_ERROR_STATE` | 409 | Agent is in an error state |
| `OPERATION_FAILED` | 500 | Unexpected internal error |

---

## E2E tests

```bash
npx vitest run apps/api/tests/e2e
```

## Load test

Requires the server running locally on port 3000:

```bash
node apps/api/scripts/load-test.mjs
```
