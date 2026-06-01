# LOGIC-08 — Failed recovery is silently resurrected → max-attempt lockout bypass

**Severity:** 🔴 High
**Area:** Security / Emergency recovery
**Stage:** 3 — Auth hardening
**Suggested labels:** `bug`, `severity:high`, `area:security`
**Location:** `core/security/emergency.ts:613-635`

## Problem

When a verification step exhausts `maxAttempts`, the code sets `request.status = 'failed'`, but the very
next line **unconditionally overwrites** it with `'verification_pending'`. Because `verifyStep`'s guard at
`:598` only permits `'initiated'` or `'verification_pending'`, the request never becomes terminally failed
at the request level — it stays open for further verification calls.

## Evidence

```ts
if (verified) {
  step.status = 'verified';
  step.verifiedAt = new Date();
} else {
  step.attempts++;
  if (step.attempts >= step.maxAttempts) {
    step.status = 'failed';
    request.status = 'failed';      // recovery marked failed...
  }
}

request.status = 'verification_pending';   // ...immediately overwritten
```

## Impact

The attempt-limit lockout on the recovery flow (key/wallet recovery, which ultimately mints a new
key/address controlling user funds) is defeated. An attacker brute-forcing a recovery factor (e.g. the
6-digit email/SMS code, ~10^6 space — see LOGIC-10) is never hard-stopped at the request level.

## Suggested fix

Do not overwrite a terminal status:

```ts
if (request.status !== 'failed') request.status = 'verification_pending';
```

Also short-circuit `verifyStep` when the targeted step is already `'failed'`.

## Acceptance criteria

- [ ] Once a step reaches `maxAttempts`, `request.status` stays `'failed'` and further `verifyStep` calls throw.
- [ ] A failed step cannot be retried.
- [ ] Test exhausting attempts on a step and asserting the request is terminally failed.
