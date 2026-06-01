# LOGIC-17 — Full-jitter backoff can return 0 ms, defeating exponential backoff

**Severity:** 🟠 Medium
**Area:** Reliability / Distributed scheduler
**Stage:** 5 — Runtime hygiene
**Suggested labels:** `bug`, `severity:medium`, `area:reliability`
**Location:** `services/distributed-scheduler/retry-engine.ts:103-109`

## Problem

With `jitter: true` (the default policy at `:21-27`), the delay is `Math.floor(Math.random() * capped)`,
uniformly distributed over `[0, capped)`. It frequently returns values near 0 (and can be exactly 0), so
the exponential growth in `base` is discarded for the actual wait.

## Evidence

```ts
calculateDelay(attempt: number, policy: RetryPolicy): number {
  const base = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
  const capped = Math.min(base, policy.maxDelayMs);
  if (!policy.jitter) return capped;
  // Full jitter: random value between 0 and capped
  return Math.floor(Math.random() * capped);
}
```

## Impact

A persistently failing job (downstream dependency down) is retried almost immediately and repeatedly,
hammering the worker pool and downstream service during an outage — the opposite of what backoff is for.

## Suggested fix

Use "equal jitter" with a floor:

```ts
const half = capped / 2;
return Math.floor(half + Math.random() * half);
// or: Math.max(policy.initialDelayMs, Math.floor(Math.random() * capped));
```

## Acceptance criteria

- [ ] Jittered delay never drops below a sensible floor (e.g. `initialDelayMs` or half of `capped`).
- [ ] Delay still grows with attempt number.
- [ ] Test asserting monotonic lower bound across attempts.
