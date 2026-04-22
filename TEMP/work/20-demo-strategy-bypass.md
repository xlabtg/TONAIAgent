# Task: Close `'demo'` Strategy Name KYC Bypass

**Priority:** 🟡 MEDIUM
**Effort:** ~2 days
**Related Issue:** #325 (re-audit finding §6)
**Suggested labels:** `security`, `compliance`, `bypass`

## Problem

In PR #318, the KYC enforcement gate contains a shortcut: if a strategy name equals `'demo'`, the KYC check is skipped. This was added so tutorial / demo flows can run without requiring a full KYC tier.

However, if strategy names are **user-controlled** (or even user-visible and copy-pasteable), an attacker can set `strategy = 'demo'` on a real agent and bypass KYC entirely. For a regulated product, relying on a magic string is fragile.

## Acceptance Criteria

- [ ] Audit all call sites that create or update a strategy — list which fields are user-controlled.
- [ ] Replace the string match with a boolean flag on the strategy definition (e.g. `isDemoStrategy: true`) that is set **only** for system-defined demo strategies at codebase-build time, never by user input.
- [ ] Reject any user payload that attempts to set `isDemoStrategy` directly.
- [ ] Demo strategies are limited to simulation mode (see [`16-simulation-mode-server-enforcement.md`](./16-simulation-mode-server-enforcement.md)) — a "demo" strategy cannot trade real funds even if KYC is satisfied.
- [ ] Add regression tests:
  - User sends `strategy = 'demo'` with real funds → KYC still enforced
  - System demo strategy in simulation mode → KYC bypass works
  - User sends `isDemoStrategy: true` → rejected by schema validation
- [ ] Document the demo-strategy policy in `docs/regulatory-compliance.md`.

## Implementation Notes

- Think of this as "privilege should be granted by server configuration, never derived from user-supplied data."
- If historically some user-created strategies happened to be named `'demo'`, add a one-time migration that inspects their fund source — if real, rename them and require KYC.

## Files to Modify

- `services/regulatory/kyc-aml.ts` — remove the `strategy === 'demo'` check
- `core/strategies/registry.ts` — add `isDemoStrategy` marker
- `services/api/schemas/agents.ts` — reject `isDemoStrategy` in incoming payloads
- `tests/regulatory/kyc-enforcement.test.ts` — add bypass tests
- `docs/regulatory-compliance.md`

## References

- Re-audit report §6: KYC/AML Enforcement
- PR #318 (merged)
