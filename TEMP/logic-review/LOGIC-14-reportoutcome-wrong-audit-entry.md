# LOGIC-14 — `StrategyExecutor.ReportOutcome` patches the wrong audit entry

**Severity:** 🟠 Medium
**Area:** Smart contracts (Tact)
**Stage:** 2 — Funds correctness
**Suggested labels:** `bug`, `severity:medium`, `area:contracts`
**Location:** `contracts/strategy-executor.tact:326-356` (esp. `:348`), vs. write site `:287-305`

## Problem

Each `ExecuteSignal` increments `executionCount` and stores the audit entry under
`auditKey(strategyId, executionCount)`. `ReportOutcome` recomputes the key with the **current**
`r.executionCount` — the count of the most recent execution, not the execution corresponding to the
reported `msg.signalNonce`. The `ReportOutcome` message even carries `signalNonce` (`:86-91`) but the
handler ignores it. If any `ExecuteSignal` occurred after the reported signal (the normal case for an
active strategy), the key no longer matches.

## Evidence

```tact
// ExecuteSignal: entry keyed by executionCount AT EXECUTION TIME
r.executionCount = r.executionCount + 1;
let auditKey: Int = self.auditKey(msg.strategyId, r.executionCount);
self.auditLog.set(auditKey, AuditEntry{ ... seqno: r.executionCount, signalNonce: msg.signalNonce, ... });

// ReportOutcome: uses CURRENT executionCount, not the reported signal's seqno
let auditKey: Int = self.auditKey(msg.strategyId, r.executionCount);
let entry: AuditEntry? = self.auditLog.get(auditKey);
```

## Impact

Actual PnL/gas figures get written onto the wrong `AuditEntry` (the latest execution), while the entry for
the reported signal keeps `actualPnlNano: 0`. The on-chain audit log is corrupted and any
loss/accounting reconciliation built on it is wrong. (Note: `cumulativeLossNano` tracking is independent
of this key, so fund-stopping still works; the defect is audit integrity.)

## Suggested fix

Persist a mapping from `signalNonce` → seqno used when the entry was written, or key audit entries by
`(strategyId, signalNonce)` directly. In `ReportOutcome` look up by `msg.signalNonce`.

## Acceptance criteria

- [ ] `ReportOutcome` updates the audit entry matching the reported `signalNonce`.
- [ ] Blueprint test: execute two signals, report outcome for the first, assert the first entry is updated.
