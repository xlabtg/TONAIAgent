# Rate Limiting

TONAIAgent uses a pluggable sliding-window rate limiter to protect public API
endpoints from abuse.  The backend store is selected at runtime via the
`RATE_LIMIT_STORE` environment variable.

---

## Buckets

| Bucket | Limit | Window | Endpoints |
|---|---|---|---|
| `standard` | 100 req | 15 min | General read endpoints |
| `trade` | 10 req | 1 min | State-mutating endpoints (start / stop / restart) |

When a request exceeds the limit the server responds with `429 Too Many
Requests` and includes a `Retry-After` header (seconds until the window
resets).

---

## Store backends

Select the backend via the `RATE_LIMIT_STORE` environment variable.

### `memory` (default)

```
RATE_LIMIT_STORE=memory
```

An in-process sliding-window map.  Zero dependencies, ideal for development
and single-instance deployments.

**Limitations:** state is lost on restart; each replica has its own counter so
effective throughput in an N-replica deployment is N × the configured limit.

### `redis` (production)

```
RATE_LIMIT_STORE=redis
REDIS_URL=redis://redis:6379
```

Atomically increments a counter in Redis using a Lua script (`INCR` +
`PEXPIRE`) so the window is correct under concurrent requests from any number
of replicas.

Requires:
- `REDIS_URL` — standard Redis connection URL (supports TLS via `rediss://`).
- The `ioredis` package installed (`npm install ioredis`).

### `noop`

```
RATE_LIMIT_STORE=noop
```

Bypass mode — every request is allowed regardless of count.  Reserved for
trusted internal traffic only.  **Never set this as a default.**

---

## Fail behaviour

When `RATE_LIMIT_STORE=redis` and Redis becomes unreachable the limiter
defaults to **fail-closed**: it returns `429` to protect the system from
unmetered traffic surges.

To prefer availability over strict enforcement set:

```
RATE_LIMIT_FAIL_OPEN=true
```

> **Warning:** fail-open means a Redis outage removes all rate-limit
> protection for the duration of the outage.  Use with caution.

---

## Observability

The rate limiter increments an in-process counter for every decision:

```
tonaiagent_rate_limit_hit_total{bucket,result}
```

Labels:

| Label | Values |
|---|---|
| `bucket` | `standard`, `trade` |
| `result` | `allowed`, `blocked`, `error` |

The `error` result is emitted when the store throws (e.g. Redis connection
failure).  Alerting on a sustained `error` rate signals store degradation.

The counter snapshot is included in the `/metrics` Prometheus endpoint.

---

## Key prefixes

Per-IP and per-user rate limiters share the same Redis store with different
key prefixes:

| Prefix | Example key |
|---|---|
| `rl:ip:<ip>` | `rl:ip:1.2.3.4` |
| `rl:user:<id>` | `rl:user:user_abc123` |

---

## Tuning

Adjust limits by passing a custom `RateLimitConfig` to `RateLimiter`:

```ts
import { RateLimiter, createStoreFromEnv } from './middleware/rate-limit.js';

const store = await createStoreFromEnv();

const limiter = new RateLimiter({
  windowMs: 60_000,   // 1 minute
  max: 30,
  bucket: 'custom',
  store,
});
```

For multi-tenant deployments, provide a custom `keyExtractor` to include the
tenant/user ID in the key:

```ts
const limiter = new RateLimiter({
  windowMs: 60_000,
  max: 10,
  bucket: 'trade',
  store,
  keyExtractor: (req) => `rl:user:${req.headers['x-user-id'] ?? 'unknown'}`,
});
```

---

## Redis operational notes

- Use Redis 6+ with `PEXPIRE` support (available since Redis 2.6, but 6+ is
  recommended for production).
- Enable persistence (`appendonly yes`) if you need counters to survive Redis
  restarts.  Without persistence a Redis restart is equivalent to a process
  restart for the MemoryStore.
- Monitor `tonaiagent_rate_limit_hit_total{result="error"}` to detect Redis
  connectivity issues before they impact users.
- Key TTL is bounded by `windowMs`; Redis memory usage is proportional to the
  number of unique keys active within the window.

---

## References

- [Cloudflare sliding-window algorithm](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)
- [ioredis](https://github.com/redis/ioredis)
- Implementation: `services/api/middleware/rate-limit.ts`
- Store backends: `services/api/middleware/rate-limit-stores/`
