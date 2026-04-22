# Task: Integrate Real Sanctions Screening Providers (OFAC / EU / UN / UK HMT)

**Priority:** 🟠 HIGH
**Effort:** ~2 weeks
**Related Issue:** #325 (re-audit finding §6)
**Suggested labels:** `security`, `compliance`, `aml`, `integration`

## Problem

PR #318 introduced `SanctionsScreener` with hooks for OFAC, EU, UN, and UK HM Treasury sanctions lists, and provider adapters for Chainalysis, ComplyAdvantage, and Elliptic. However, the re-audit found that these are "likely stub implementations" — the screener accepts the shape of a sanctions check but does not currently call live APIs or load live list data.

Until real screening runs, any AML decisions based on these checks are cosmetic.

## Acceptance Criteria

- [ ] Select the primary sanctions data provider(s). Recommended: one on-chain provider (Chainalysis KYT or Elliptic) + one name-list provider (ComplyAdvantage or OpenSanctions).
- [ ] Implement live API integration for the selected provider(s).
- [ ] For name/address lists (OFAC SDN, EU Consolidated, UN Consolidated, UK HMT), implement a scheduled downloader that:
  - Refreshes daily (cron or scheduled worker)
  - Stores a versioned copy with checksum in durable storage
  - Alerts if refresh fails for >48h
- [ ] Cache screening results per (address, listVersion) with configurable TTL (default 24h).
- [ ] Handle provider outages gracefully — **fail-closed** (block the trade) when enforcement is enabled and the upstream provider is unreachable.
- [ ] Add metrics: `sanctions_check_total{provider,result}`, `sanctions_check_duration_seconds`.
- [ ] Add structured audit log entries for every positive hit: `{userId, address, lists[], provider, matchedEntity, timestamp}`.
- [ ] Tests:
  - Unit: mocked provider responses (match, no-match, error)
  - Integration: real provider call in a nightly job (gated by secret)
  - Chaos: simulated provider timeout / 5xx

## Implementation Notes

- API keys go through `SecretsLoader` (see [`09-secrets-wiring.md`](./09-secrets-wiring.md)) — never from `process.env` directly.
- Provider choice has cost implications; document monthly quota expectations in `docs/regulatory-compliance.md`.
- Keep the `SanctionsScreener` interface stable so providers can be swapped per environment (mock in dev, Chainalysis in prod).

## Files to Create/Modify

- `services/regulatory/sanctions.ts` — replace stubs with live calls
- `services/regulatory/providers/chainalysis.ts` (new)
- `services/regulatory/providers/opensanctions.ts` (new) — optional
- `services/regulatory/providers/list-downloader.ts` (new) — for OFAC/EU/UN/HMT raw lists
- `tests/regulatory/sanctions-integration.test.ts`
- `docs/regulatory-compliance.md` — provider selection, data flow, fail-closed policy
- `.env.example` — `CHAINALYSIS_API_KEY`, `OPENSANCTIONS_API_KEY`

## References

- Re-audit report §6: KYC/AML Enforcement
- [Chainalysis KYT API](https://docs.chainalysis.com/api/kyt/)
- [OpenSanctions](https://www.opensanctions.org/docs/api/)
- [OFAC SDN list download](https://www.treasury.gov/ofac/downloads/)
- PR #318 (merged)
