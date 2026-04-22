# Task: Replace In-Memory Rate Limiter with Redis-Backed Store

**Priority:** 🟡 MEDIUM
**Effort:** ~3 days
**Related Issue:** #325 (re-audit finding §4)
**Suggested labels:** `security`, `api`, `rate-limiting`, `infrastructure`

## Problem

`RateLimiter` in PR #320 is in-memory, backed by a per-process sliding window. This has two production problems:

1. **Resets on restart** — a rolling restart or crash clears the window, allowing bursts that would otherwise be blocked.
2. **Ineffective in multi-instance deployments** — N replicas each allow N × the configured rate.

For a public-facing API and especially for the stricter `trade` bucket (10/min), these are real exposures.

## Acceptance Criteria

- [ ] Add a `RateLimiterStore` interface with `incr(key, windowMs): Promise<{ count, ttl }>`.
- [ ] Implement three backends:
  - `MemoryStore` (existing behaviour, keep for dev/tests)
  - `RedisStore` (production)
  - `NoOpStore` (explicit bypass, never-default)
- [ ] Use atomic Redis operations (`INCR` + `PEXPIRE` via Lua or `MULTI`) so the window is correct under concurrency.
- [ ] Make backend selection configurable via `RATE_LIMIT_STORE=redis|memory`.
- [ ] Fail-closed when `RATE_LIMIT_STORE=redis` and Redis is unreachable, unless `RATE_LIMIT_FAIL_OPEN=true` is explicitly set.
- [ ] Emit metric `tonaiagent_rate_limit_hit_total{bucket,result}` for observability.
- [ ] Update docs (`docs/api.md` and a new `docs/rate-limiting.md`) with operational notes and tuning guidance.
- [ ] Tests:
  - Unit: each store passes the same compliance suite
  - Integration: actual Redis (ephemeral container in CI)
  - Chaos: Redis dropped mid-window

## Implementation Notes

- Consider the sliding-window counter algorithm for simplicity, or sliding-window log for precision.
- Per-user + per-IP limiters can share the store with different key prefixes (`rl:user:*`, `rl:ip:*`).
- For distributed deployments, consider also adding [`08-http-server-wiring.md`](./08-http-server-wiring.md) before this — the rate limiter needs something to attach to.

## Files to Create/Modify

- `services/api/middleware/rate-limit.ts` — refactor around `RateLimiterStore`
- `services/api/middleware/rate-limit-stores/memory.ts`
- `services/api/middleware/rate-limit-stores/redis.ts`
- `services/api/middleware/rate-limit-stores/noop.ts`
- `tests/api/rate-limit.test.ts` — expand
- `tests/integration/rate-limit-redis.test.ts` (new)
- `docs/rate-limiting.md`

## References

- Re-audit report §4: API Input Validation
- PR #320 (merged)
- [ioredis](https://github.com/redis/ioredis)
- [Cloudflare sliding window algorithm](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)
