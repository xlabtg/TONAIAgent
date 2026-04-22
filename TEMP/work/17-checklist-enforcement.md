# Task: Gate Live Trading on Mainnet Readiness Checklist Completion

**Priority:** 🟡 MEDIUM
**Effort:** ~4 days
**Related Issue:** #325 (re-audit finding §9)
**Suggested labels:** `security`, `compliance`, `onboarding`

## Problem

`docs/mainnet-readiness-checklist.md` (PR #324) is a 30+ item document that users are expected to read before enabling live trading. Today, this is **advisory only** — the platform does not verify completion. A user can accept the three mandatory UI modals without having actually understood or completed any of the checklist.

## Acceptance Criteria

- [ ] Model the checklist as structured data (e.g. `config/mainnet-checklist.json`) with one entry per item: `{ id, title, category, mandatoryForLive }`.
- [ ] Expose `GET /users/me/checklist` returning the user's per-item status.
- [ ] Expose `POST /users/me/checklist/:id/acknowledge` for the user to attest each item.
- [ ] Require that all `mandatoryForLive: true` items are acknowledged before the `simulation → live` transition in [`16-simulation-mode-server-enforcement.md`](./16-simulation-mode-server-enforcement.md) succeeds.
- [ ] Re-require acknowledgement if the checklist version changes (e.g. new mandatory item added).
- [ ] Telegram Mini App renders the checklist as an interactive screen (checkbox list with descriptions and "I understand" buttons).
- [ ] Audit log every acknowledgement: `{ userId, itemId, version, timestamp, ip }`.
- [ ] Tests:
  - Missing item → live mode blocked
  - Outdated version → mode downgraded to simulation at next transition attempt
  - Full acknowledgement → live mode enabled

## Implementation Notes

- Keep the checklist document (markdown) as the canonical source — generate the JSON from it at build time to prevent drift.
- Consider grouping items by category (funds, keys, monitoring, compliance) in the UI to reduce cognitive load.

## Files to Create/Modify

- `docs/mainnet-readiness-checklist.md` — extract structured front-matter per item
- `scripts/generate-checklist-json.ts` (new — doc → JSON)
- `config/mainnet-checklist.json` (generated)
- `services/api/routes/checklist.ts` (new)
- `core/users/checklist-status.ts` (new)
- `apps/mini-app/screens/Checklist.tsx` (new)
- `tests/integration/checklist-gating.test.ts`

## References

- Re-audit report §9: Security Documentation
- PR #324 (merged)
