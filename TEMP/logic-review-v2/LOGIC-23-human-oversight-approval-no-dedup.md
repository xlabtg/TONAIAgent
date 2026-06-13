# LOGIC-23 — Multi-party approval quorum can be satisfied by a single approver (no dedup / no authority check)

**Severity:** 🔴 High
**Area:** Security
**Stage:** Stage 1 — Safety re-wiring & fail-open access control
**Suggested labels:** `bug`, `security`, `severity:high`, `area:security`, `stage:1-safety-rewiring`, `audit:logic-review-v2`
**Location:** `core/ai-safety/human-oversight.ts:508-543`

## Problem

`submitApproval()` is the human-in-the-loop gate for high-impact agent actions. It pushes the incoming
approval onto `request.approvals` and then approves the request once `approveCount >= requiredApprovers`.
But `approveCount` is computed as `request.approvals.filter(a => a.decision === 'approved').length` — a raw
row count. Nothing deduplicates by `approverId`, and nothing checks that the approver is authorised for the
request's level/role. The same caller can therefore call `submitApproval()` N times and single-handedly reach
any quorum.

## Evidence

```ts
// no check that approval.approverId is unique or authorised:
request.approvals.push({
  approverId: approval.approverId,
  decision: approval.decision,
  reason: approval.reason,
  timestamp: new Date(),
});

const level = this.config.approvalWorkflow.levels.find((l) => l.level === request.level);
const requiredApprovals = level?.requiredApprovers || 1;

const approveCount = request.approvals.filter((a) => a.decision === 'approved').length; // counts rows, not distinct approvers
if (approveCount >= requiredApprovals) {
  request.status = 'approved';
}
```

## Impact

A two-of-three (or any N-of-M) human-approval requirement provides no real protection: one compromised or
malicious operator (or a buggy client that retries) can approve a critical action — e.g. a large withdrawal or
a kill-switch override — entirely on their own. The control reads as "multi-party" but is effectively single-party.

## Suggested fix

Count **distinct, authorised** approvers. De-duplicate `request.approvals` by `approverId` before comparing
to `requiredApprovers` (keep the latest decision per approver), reject a second submission from an approver who
already voted (or treat it as an update), and validate that `approverId` is permitted for `request.level`
(role/allow-list). Apply the same distinct-approver rule to `denyCount`.

## Acceptance criteria

- [ ] `submitApproval` rejects or coalesces a repeat submission from an `approverId` that has already voted on the request.
- [ ] Quorum (`approveCount >= requiredApprovers`) is evaluated over **distinct** approver IDs, not raw rows.
- [ ] An approver not authorised for `request.level` cannot contribute to the quorum.
- [ ] Regression test: the same approver submitting `requiredApprovers` approvals leaves the request `pending`; approvals from that many *distinct* authorised approvers flips it to `approved`.
