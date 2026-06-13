# LOGIC-36 — Sanctions screening flags only when category contains the substring "sanction"; risk score & cluster ignored

**Severity:** 🔴 High
**Area:** Regulatory
**Stage:** Stage 3 — Compliance & sanctions hardening
**Suggested labels:** `bug`, `security`, `severity:high`, `area:regulatory`, `stage:3-compliance-hardening`, `audit:logic-review-v2`
**Location:** `services/regulatory/providers/chainalysis.ts:140-176`

## Problem

After fetching a Chainalysis address summary, `sanctioned` is set true only if some identification's
`category` string `.toLowerCase().includes('sanction')`. The numeric `riskScore` (severe/high mapped to
85-100) and the `cluster.category` (e.g. a known illicit-service cluster) are computed/returned but never feed
the sanctioned/blocking decision. `toSanctionsMatches()` filters identifications the same substring way.

## Evidence

```ts
const riskScore = riskStringToScore(data.risk ?? '');     // computed...
const sanctioned = identifications.some((id) =>
  id.category.toLowerCase().includes('sanction')           // ...but only this substring decides
);
// cluster.category and riskScore are returned but never gate the decision
```

## Impact

Addresses Chainalysis rates `severe`/`high` risk, or that belong to a flagged illicit cluster, are treated as
clean unless an identification category literally contains "sanction". A category labelled e.g. "OFAC SDN",
"terrorist financing", or "stolen funds" — or a severe risk score with no identification — slips through the
compliance gate.

## Suggested fix

Drive the block decision from all available signals: a configurable `riskScore` threshold, the cluster
category against an illicit-category list, **and** the identification categories (mapped via a list, not a bare
substring). Treat `SANCTIONS_CATEGORY_MAP` keys as the source of truth for sanction categories.

## Acceptance criteria

- [ ] A `severe`/`high` risk score (above a configured threshold) is screened as blocked even without a "sanction" substring.
- [ ] A flagged illicit `cluster.category` triggers a match.
- [ ] Identification → sanctions-list mapping uses the category map, not `includes("sanction")`.
- [ ] Regression tests cover each signal in isolation.
