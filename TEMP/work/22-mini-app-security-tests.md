# Task: Add Automated Tests for Telegram Mini App Security UI

**Priority:** 🟢 LOW
**Effort:** ~3 days
**Related Issue:** #325 (re-audit finding §9)
**Suggested labels:** `testing`, `mini-app`, `security`

## Problem

PR #324's JS components (`apps/mini-app/.../security.js` — simulation banner, live-trading confirmation modal, checklist rendering) have **no automated tests**. The PR test plan is entirely manual. UI regressions that remove the banner or break the mandatory modal could slip through without detection — and those UI elements are load-bearing for the mainnet risk disclosure.

## Acceptance Criteria

- [ ] Pick a browser testing stack appropriate for the Mini App. Recommended: **Playwright** (already available in this org tooling) with a TMA-specific setup harness.
- [ ] Add tests for:
  - Simulation banner renders when `tradingMode === 'simulation'`
  - Simulation banner does **not** render when `tradingMode === 'live'`
  - Live trading confirmation modal requires all 3 acknowledgements — buttons are disabled until all checked
  - "Start Agent in Simulation" CTA label — regression test the copy
  - Risk disclosures link present and navigates correctly
  - Mainnet readiness checklist screen lists all mandatory items
- [ ] Capture screenshots for every test as visual-regression baselines; store them in `docs/screenshots/` and commit to the repo so reviewers see intentional changes.
- [ ] Run the Playwright suite in CI on every PR touching `apps/mini-app/**`.
- [ ] Keep the suite fast (<5 min) — mock server responses where possible.

## Implementation Notes

- Mock the server-side `tradingMode` and `checklist` endpoints so tests don't need a running backend.
- For Telegram-specific behaviours (`window.Telegram.WebApp`), provide a test-time shim.

## Files to Create/Modify

- `apps/mini-app/tests/e2e/security-banner.spec.ts` (new)
- `apps/mini-app/tests/e2e/live-trading-modal.spec.ts` (new)
- `apps/mini-app/tests/e2e/checklist.spec.ts` (new)
- `apps/mini-app/playwright.config.ts` (new)
- `.github/workflows/mini-app.yml` — add Playwright job
- `docs/screenshots/*.png`

## References

- Re-audit report §9: Security Documentation
- PR #324 (merged)
- [Playwright](https://playwright.dev/)
