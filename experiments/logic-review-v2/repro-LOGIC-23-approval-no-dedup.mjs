#!/usr/bin/env node
/**
 * Reproduction for LOGIC-23 — the multi-party human-approval quorum in
 * core/ai-safety/human-oversight.ts:508-543 can be satisfied by a SINGLE
 * approver.
 *
 * `submitApproval()` pushes every incoming approval onto `request.approvals`
 * and then counts rows:
 *
 *     const approveCount = request.approvals
 *       .filter((a) => a.decision === 'approved').length; // raw row count
 *     if (approveCount >= requiredApprovals) request.status = 'approved';
 *
 * Nothing deduplicates by `approverId`, so the same caller can vote N times and
 * single-handedly reach any N-of-M quorum. This script mirrors that arithmetic
 * for a level-3 ("Critical", requiredApprovers: 3) request and shows one
 * operator flipping it to `approved` on their own.
 *
 * The script also runs the FIXED arithmetic (count DISTINCT approverIds) to show
 * the same sequence of votes correctly leaves the request `pending`.
 *
 * Run: node experiments/logic-review-v2/repro-LOGIC-23-approval-no-dedup.mjs
 */

const requiredApprovers = 3; // level 3 — "Critical"

// One and the same operator submits three "approved" votes (e.g. a buggy retry
// loop, or a compromised/malicious operator).
const submissions = [
  { approverId: 'operator-A', decision: 'approved' },
  { approverId: 'operator-A', decision: 'approved' },
  { approverId: 'operator-A', decision: 'approved' },
];

// ---- Current (buggy) behaviour: count rows -------------------------------
const buggyApprovals = [];
for (const s of submissions) {
  buggyApprovals.push({ ...s, timestamp: new Date() });
}
const buggyApproveCount = buggyApprovals.filter((a) => a.decision === 'approved').length;
const buggyStatus = buggyApproveCount >= requiredApprovers ? 'approved' : 'pending';

// ---- Fixed behaviour: count distinct approverIds -------------------------
const latestByApprover = new Map();
for (const s of submissions) {
  latestByApprover.set(s.approverId, s.decision); // coalesce: keep latest per approver
}
const distinctApproveCount = [...latestByApprover.values()].filter((d) => d === 'approved').length;
const fixedStatus = distinctApproveCount >= requiredApprovers ? 'approved' : 'pending';

console.log('LOGIC-23 — single approver vs. multi-party quorum');
console.log('-------------------------------------------------');
console.log(`requiredApprovers        : ${requiredApprovers}`);
console.log(`distinct approverIds      : ${latestByApprover.size} (${[...latestByApprover.keys()].join(', ')})`);
console.log('');
console.log(`[buggy]  rows counted     : ${buggyApproveCount}  -> status: ${buggyStatus}`);
console.log(`[fixed]  distinct counted : ${distinctApproveCount}  -> status: ${fixedStatus}`);
console.log('');

const bugReproduced = buggyStatus === 'approved' && fixedStatus === 'pending';
console.log(
  bugReproduced
    ? 'BUG REPRODUCED: one approver reached a 3-of-3 quorum; the fix keeps it pending.'
    : 'No discrepancy — bug not reproduced.'
);

process.exit(bugReproduced ? 1 : 0);
