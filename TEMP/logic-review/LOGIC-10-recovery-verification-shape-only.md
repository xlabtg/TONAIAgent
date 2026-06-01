# LOGIC-10 — Recovery verification checks input *shape* only, not the secret value

**Severity:** 🟠 Medium
**Area:** Security / Emergency recovery
**Stage:** 3 — Auth hardening
**Suggested labels:** `bug`, `severity:medium`, `area:security`
**Location:** `core/security/emergency.ts:848-883` (`performVerification`)

## Problem

`performVerification` is the gate that decides whether a key/wallet-recovery step passes, yet it validates
only the *shape* of the input, never the *value*. Any 6-character string passes `email`/`sms`; any
24-element array passes `recovery_phrase`; any non-undefined value passes `guardian`, `biometric`,
`device`. The comments themselves note "would validate against stored hash" / "would use platform
biometric API", confirming the real check is absent.

## Evidence

```ts
case 'email':
  return data.code !== undefined && data.code.length === 6;
case 'recovery_phrase':
  return data.recoveryPhrase !== undefined && data.recoveryPhrase.length === 24;
case 'guardian':
  return data.guardianApproval !== undefined;
case 'device':
  return data.signature !== undefined;
```

## Impact

If `DefaultRecoveryManager` is wired into a live recovery endpoint, an attacker who initiates recovery for
any `userId` (no authentication required by `initiateRecovery`) can complete all "verification" steps with
arbitrary values, drive the request to `verification_complete`, then `executeRecovery` to obtain a new
key/address — a full account/funds takeover. Combined with LOGIC-08, no lockout stops the attempt.

## Suggested fix

Replace shape checks with real verification: compare codes against a server-generated, time-limited,
single-use value in constant time; verify the recovery phrase against a stored salted hash; verify
guardian/device approvals via real signature checks. **Fail closed** if a verifier backend is not
configured (do not return `true` for stubs).

## Acceptance criteria

- [ ] Each verifier compares against a real stored/derived secret, not just input shape.
- [ ] Codes are single-use and time-limited; comparison is constant-time.
- [ ] When no real backend is configured, verification fails closed.
- [ ] Tests: wrong code rejected; correct code accepted once; replay rejected.
