# LOGIC-04 — Telegram initData HMAC compared with non-constant-time `!==`

**Severity:** 🔴 High
**Area:** Security / Auth
**Stage:** 3 — Auth hardening
**Suggested labels:** `bug`, `severity:high`, `area:security`
**Location:** `services/auth/auth-service.ts:121`

## Problem

The Telegram Mini App authentication HMAC is compared with the JavaScript `!==` operator, which
short-circuits on the first differing character and runs in non-constant time. Every other secret
comparison in this codebase deliberately uses constant-time comparison (`csrf.ts:118` uses
`crypto.timingSafeEqual`; `security-headers.ts:162` implements a constant-time `timingSafeEqual`), so this
is an isolated regression on the most security-critical auth path. `receivedHash` is fully
attacker-controlled (read straight from the `hash` query param at `:107`).

## Evidence

```ts
const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
const expectedHash = createHmac('sha256', secretKey).update(checkString).digest('hex');

if (expectedHash !== receivedHash) {
  throw new Error('Invalid Telegram initData signature');
}
```

## Impact

An attacker who submits many forged `initData` strings and measures response timing can incrementally
recover the correct HMAC (hex digest, one byte at a time) for a chosen payload, forging a valid Telegram
session for any `telegramId` — full account takeover via `authenticateTelegram` →
`findOrCreateTelegramUser`, which grants trading scopes.

## Suggested fix

```ts
import { timingSafeEqual } from 'crypto';
const a = Buffer.from(expectedHash, 'hex');
const b = Buffer.from(receivedHash, 'hex');
if (a.length !== b.length || !timingSafeEqual(a, b)) {
  throw new Error('Invalid Telegram initData signature');
}
```

## Acceptance criteria

- [ ] HMAC comparison uses `crypto.timingSafeEqual` over fixed-length buffers.
- [ ] Length mismatch is handled before `timingSafeEqual` (which throws on unequal lengths).
- [ ] Test confirming a valid initData authenticates and an invalid one is rejected.
