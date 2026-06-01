# LOGIC-20 — Predictable `Math.random()` IDs for KYC/AML & AI-governance records

**Severity:** 🟡 Low
**Area:** Security / Regulatory
**Stage:** 3 — Auth hardening
**Suggested labels:** `bug`, `severity:low`, `area:security`
**Location:** `services/regulatory/kyc-aml.ts:907`, `services/regulatory/ai-governance.ts:605`

## Problem

KYC/AML and AI-governance record identifiers are generated with `Math.random()` (not a CSPRNG) plus a
millisecond timestamp. Elsewhere in security code, IDs that matter use `crypto.randomBytes`
(`emergency.ts:171`, `key-management.ts:1398`), so this is an inconsistent and weaker choice for
compliance-record IDs used for lookup/audit correlation.

## Evidence

```ts
private generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

## Impact

IDs are predictable and can collide. If any of these IDs are ever treated as an unguessable handle (e.g.
to fetch a KYC application/result without a separate authorization check), an attacker could enumerate or
forge them to read/correlate another user's compliance data; collisions can silently overwrite
audit/compliance records.

## Suggested fix

Generate the random component with `crypto.randomBytes` (e.g. `randomBytes(12).toString('hex')`) and never
rely on these IDs alone for access control.

## Acceptance criteria

- [ ] Regulatory record IDs use a CSPRNG.
- [ ] No security/authorization decision relies on ID unguessability alone.
