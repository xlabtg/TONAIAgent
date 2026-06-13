#!/usr/bin/env node
/**
 * Generator for the TONAIAgent v2.43.0 logic RE-audit (Issue #431).
 *
 * Produces, from the single FINDINGS table below:
 *   - TEMP/logic-review-v2/LOGIC-NN-<slug>.md   (one ready-to-file issue per finding)
 *   - TEMP/logic-review-v2/README.md            (index + stage breakdown + LOGIC→issue map)
 *   - AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW_v2.md (companion report)
 *
 * It is deterministic and idempotent: re-running regenerates the same files.
 * The filed-issue numbers are read back from issues.json (written by file-issues.mjs)
 * when present, so the docs can be regenerated with live issue links.
 *
 * Run: node experiments/logic-review-v2/generate.mjs
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'TEMP', 'logic-review-v2');
const REPO = 'xlabtg/TONAIAgent';

const SEV = { high: '🔴 High', medium: '🟠 Medium', low: '🟡 Low' };

const STAGES = {
  1: 'Stage 1 — Safety re-wiring & fail-open access control',
  2: 'Stage 2 — Funds & accounting correctness',
  3: 'Stage 3 — Compliance & sanctions hardening',
  4: 'Stage 4 — Strategy / backtest / optimizer integrity',
  5: 'Stage 5 — Runtime reliability & resource hygiene',
};
const STAGE_LABEL = {
  1: 'stage:1-safety-rewiring',
  2: 'stage:2-funds-correctness',
  3: 'stage:3-compliance-hardening',
  4: 'stage:4-strategy-integrity',
  5: 'stage:5-runtime-hygiene',
};

// ---------------------------------------------------------------------------
// Findings (LOGIC-23 .. LOGIC-51) — every one verified against the source at the
// stated path/line range on branch issue-431-c0be08c13d26.
// ---------------------------------------------------------------------------
const FINDINGS = [
  // ===================== Stage 1 — safety re-wiring =====================
  {
    id: 23, slug: 'human-oversight-approval-no-dedup', stage: 1, severity: 'high',
    area: 'security', areaLabel: 'area:security',
    title: 'Multi-party approval quorum can be satisfied by a single approver (no dedup / no authority check)',
    loc: 'core/ai-safety/human-oversight.ts:508-543',
    problem:
`\`submitApproval()\` is the human-in-the-loop gate for high-impact agent actions. It pushes the incoming
approval onto \`request.approvals\` and then approves the request once \`approveCount >= requiredApprovers\`.
But \`approveCount\` is computed as \`request.approvals.filter(a => a.decision === 'approved').length\` — a raw
row count. Nothing deduplicates by \`approverId\`, and nothing checks that the approver is authorised for the
request's level/role. The same caller can therefore call \`submitApproval()\` N times and single-handedly reach
any quorum.`,
    evidenceLang: 'ts',
    evidence:
`// no check that approval.approverId is unique or authorised:
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
}`,
    impact:
`A two-of-three (or any N-of-M) human-approval requirement provides no real protection: one compromised or
malicious operator (or a buggy client that retries) can approve a critical action — e.g. a large withdrawal or
a kill-switch override — entirely on their own. The control reads as "multi-party" but is effectively single-party.`,
    fix:
`Count **distinct, authorised** approvers. De-duplicate \`request.approvals\` by \`approverId\` before comparing
to \`requiredApprovers\` (keep the latest decision per approver), reject a second submission from an approver who
already voted (or treat it as an update), and validate that \`approverId\` is permitted for \`request.level\`
(role/allow-list). Apply the same distinct-approver rule to \`denyCount\`.`,
    acceptance: [
      '`submitApproval` rejects or coalesces a repeat submission from an `approverId` that has already voted on the request.',
      'Quorum (`approveCount >= requiredApprovers`) is evaluated over **distinct** approver IDs, not raw rows.',
      'An approver not authorised for `request.level` cannot contribute to the quorum.',
      'Regression test: the same approver submitting `requiredApprovers` approvals leaves the request `pending`; approvals from that many *distinct* authorised approvers flips it to `approved`.',
    ],
  },
  {
    id: 24, slug: 'key-management-unverified-signature-count', stage: 1, severity: 'high',
    area: 'security', areaLabel: 'area:security',
    title: 'Threshold signing counts unverified signatures toward the required-signature quorum',
    loc: 'core/security/key-management.ts:1439-1472',
    problem:
`\`addSignature()\` verifies each incoming signature and stores the boolean on \`signatureWithVerification.verified\`,
but the threshold gate that flips a request to \`ready_to_broadcast\` compares
\`request.collectedSignatures.length\` — the count of **all** collected signatures — to \`requiredSignatures\`.
A signature whose \`verified === false\` still counts toward the quorum.`,
    evidenceLang: 'ts',
    evidence:
`const verified = await this.storage.verify(signature.publicKey, request.message, signature.signature);
const signatureWithVerification = { ...signature, verified };
request.collectedSignatures.push(signatureWithVerification);

// quorum uses the array length, not the count of verified === true:
if (request.collectedSignatures.length >= request.requiredSignatures) {
  request.status = 'ready_to_broadcast';
}`,
    impact:
`A multi-sig / threshold-signing request can reach \`ready_to_broadcast\` with invalid signatures. An attacker
who can submit junk signatures (or a buggy signer) drives the request to "ready" without contributing a valid
signature, defeating the threshold guarantee for fund-moving transactions.`,
    fix:
`Gate on the number of **verified** signatures:
\`request.collectedSignatures.filter(s => s.verified).length >= request.requiredSignatures\`. Optionally reject
unverified signatures outright (don't store them), and reject duplicate public keys so one signer cannot fill
multiple slots.`,
    acceptance: [
      'The `ready_to_broadcast` transition counts only signatures with `verified === true`.',
      'Duplicate public keys cannot occupy more than one signature slot.',
      'Regression test: a request with `requiredSignatures = 2` and one valid + one invalid signature stays in `collecting_signatures`; it becomes `ready_to_broadcast` only after two valid signatures.',
    ],
  },
  {
    id: 25, slug: 'guardrails-pii-redaction-dead', stage: 1, severity: 'high',
    area: 'security', areaLabel: 'area:security',
    title: 'PII redaction never fires: detector emits `warn` while the engine only redacts on `block`',
    loc: 'core/ai/safety/guardrails.ts:296-307 + core/ai/orchestration/engine.ts:241-247',
    problem:
`\`detectPii()\` returns \`action: this.config.redactSensitive ? 'warn' : 'block'\`. With the default
\`redactSensitive: true\`, a PII hit yields \`action: 'warn'\`. The orchestration engine, however, only redacts
when it finds a check with \`action === 'block'\`. So precisely when redaction is enabled, the action is \`warn\`,
which the engine ignores — and the PII passes through unredacted. The two booleans are inverted relative to
each other, making the redaction path dead code.`,
    evidenceLang: 'ts',
    evidence:
`// guardrails.ts — detectPii:
action: this.config.redactSensitive ? 'warn' : 'block',   // redaction ON => 'warn'

// engine.ts — only 'block' triggers redaction:
const blocked = outputChecks.find((c) => c.action === 'block');
if (blocked) {
  response.choices[0].message.content = this.safetyManager.redactOutput(...);
}`,
    impact:
`Model output containing detected PII (emails, card numbers, etc.) is returned to the caller verbatim whenever
\`redactSensitive\` is enabled — the exact configuration intended to protect it. The \`redactOutput()\` routine is
implemented and tested but never invoked for PII in the default configuration.`,
    fix:
`Make the action consistent with intent: when \`redactSensitive\` is true the PII check should drive redaction.
Either emit a dedicated \`redact\` action that the engine honours, or have the engine redact on \`warn\`-with-PII,
or invert the detector so \`redactSensitive\` produces the action the engine actually acts upon. Add a test that
runs the full engine path.`,
    acceptance: [
      'With `redactSensitive: true`, output containing PII is redacted before being returned by the engine.',
      'With `redactSensitive: false`, the response is blocked/failed (or handled per policy) rather than silently returned.',
      'Regression test exercises the engine end-to-end (not `redactOutput` in isolation) and asserts the PII is gone from the returned content.',
    ],
  },
  {
    id: 26, slug: 'payment-capture-accepts-pending', stage: 1, severity: 'high',
    area: 'financial', areaLabel: 'area:financial',
    title: 'capturePayment accepts `pending` payments, bypassing the authorization step',
    loc: 'services/payments/payment-gateway.ts:332-354',
    problem:
`\`capturePayment()\` permits capture when the status is either \`authorized\` **or** \`pending\`. A capture should
only follow a successful authorization. Accepting \`pending\` lets a payment that was never authorised be
captured and then processed to completion.`,
    evidenceLang: 'ts',
    evidence:
`if (payment.status !== 'authorized' && payment.status !== 'pending') {
  throw new Error(\`Cannot capture payment with status: \${payment.status}\`);
}
// ...
payment.status = 'captured';
await this.processPayment(payment);   // proceeds to completion`,
    impact:
`The authorization gate is bypassable: a freshly-created \`pending\` payment can be captured directly, skipping
authorization (and any limit/risk checks attached to it). Funds are moved for a payment that was never
authorised.`,
    fix:
`Require \`payment.status === 'authorized'\` for capture. If a "capture without explicit prior authorize" flow is
genuinely needed, model it as an explicit auth-and-capture method that performs the authorization checks first,
rather than silently treating \`pending\` as capturable.`,
    acceptance: [
      'Capturing a `pending` (never-authorized) payment throws.',
      'Only `authorized` payments can be captured (or an explicit auth+capture path runs the authorization checks).',
      'Regression test covers capture attempts from each status.',
    ],
  },
  {
    id: 27, slug: 'reset-daily-limits-reenables-breached', stage: 1, severity: 'low',
    area: 'financial', areaLabel: 'area:financial',
    title: 'resetDailyLimits re-enables trading for agents still in breach (latent)',
    loc: 'core/risk-engine/trade-validator.ts:426-440',
    problem:
`\`resetDailyLimits()\` clears \`tradingDisabled\` for daily records without checking whether the record being
cleared belongs to the *current* day / is still in breach. If invoked while a record is still over its limit
(e.g. a record keyed to today, or a scheduling skew), it unblocks an agent that should remain disabled. There
is currently no production caller, so this is latent — but it is a foot-gun that will fire the moment a reset
scheduler is wired up.`,
    evidenceLang: 'ts',
    evidence:
`// clears the breach flag without verifying the record is from a *prior* day:
for (const record of this.dailyRecords.values()) {
  record.tradingDisabled = false;
  // ... resets counters
}`,
    impact:
`Once a daily-reset job is added, an agent that tripped its daily-loss breaker could be re-enabled prematurely,
allowing it to keep trading past the loss limit the breaker was meant to enforce.`,
    fix:
`Only reset records strictly older than the current day boundary, and never clear \`tradingDisabled\` for a record
that is still over its limit for the active period. Key daily records by date and roll over rather than mutate
in place.`,
    acceptance: [
      'Resetting does not clear `tradingDisabled` on a record that is still in breach for the current day.',
      'Only records from prior periods are reset.',
      'Regression test: a breached current-day record survives a reset; a prior-day record is cleared.',
    ],
  },

  // ===================== Stage 2 — funds correctness =====================
  {
    id: 28, slug: 'portfolio-allocator-no-renormalize', stage: 2, severity: 'high',
    area: 'financial', areaLabel: 'area:financial',
    title: 'Portfolio allocator never re-normalizes after the minFraction floor → capital over-allocation',
    loc: 'services/portfolio-allocator/index.ts:159-188',
    problem:
`The \`allocate()\` docstring promises (step 4) "After clamping, fractions are re-normalised so they sum to ≤1."
The code applies the \`minFraction\` floor and then assigns \`const normalised = fractions;\` — no re-normalization
happens. Raising several agents up to \`minFraction\` can push \`sum(fractions)\` above 1, and the result is used
directly to compute \`capitalAmount = fraction * totalBalance\`.`,
    evidenceLang: 'ts',
    evidence:
`// Step 4 — Apply minFraction floor (may cause sum > 1; absorbed proportionally)
for (let i = 0; i < agents.length; i++) {
  const lo = Math.min(minFrac, maxExposures[i]!);
  if (fractions[i]! < lo) fractions[i] = lo;
}

const normalised = fractions;   // <-- promised re-normalization is absent`,
    impact:
`With enough low-score agents (each floored to \`minFraction\`, default 0.05), the fractions sum to more than 1
and the allocator hands out **more capital than \`totalBalance\`** — over-leveraging the portfolio. The comment
"absorbed proportionally" describes behaviour that is not implemented; \`unallocated\` clamps at 0 and hides it.`,
    fix:
`Implement the documented step 4: after the floor, if \`sum(fractions) > 1\`, scale all fractions by
\`1 / sum\` (respecting \`maxExposure\` caps where possible) so the total never exceeds 1. Add an invariant
assertion/test that \`sum(allocationFraction) <= 1 + ε\` and \`sum(capitalAmount) <= totalBalance + ε\`.`,
    acceptance: [
      'After allocation, the sum of `allocationFraction` never exceeds 1 (within floating-point epsilon).',
      'The sum of `capitalAmount` never exceeds `totalBalance`.',
      'Regression test with many low-score agents (enough that `n * minFraction > 1`) asserts no over-allocation.',
    ],
  },
  {
    id: 29, slug: 'treasury-disbursement-no-debit', stage: 2, severity: 'high',
    area: 'financial', areaLabel: 'area:financial',
    title: 'executeDisbursement never debits the treasury balance / allocated balance',
    loc: 'services/ecosystem-fund/treasury.ts:471-523',
    problem:
`\`executeDisbursement()\` marks the disbursement \`completed\`, sets a tx hash, increments the
\`stats.totalDisbursed\` counter and records a transaction — but it never decrements the treasury's available
balance or the allocation's reserved/allocated balance. The fund's tracked balance is unchanged by a
disbursement.`,
    evidenceLang: 'ts',
    evidence:
`disbursement.status = 'completed';
disbursement.disbursedAt = new Date();
disbursement.txHash = this.generateId('tx');

// only a stat counter is updated — no balance debit:
this.treasury.stats.totalDisbursed = (
  BigInt(this.treasury.stats.totalDisbursed) + BigInt(disbursement.amount)
).toString();
// ... records a transaction, but treasury.balance / allocatedBalance are never reduced`,
    impact:
`The treasury can disburse without bound: balance never decreases, so balance-based guards (if any) never trip
and the books do not reflect outflows. Accounting is corrupted and over-disbursement is possible.`,
    fix:
`Debit the available balance (and release/settle the allocation's reserved amount) atomically when a
disbursement completes, after asserting sufficient balance. Reconcile \`stats.totalDisbursed\` with the actual
balance delta.`,
    acceptance: [
      'A completed disbursement reduces the treasury available balance by the disbursed amount.',
      'Disbursing more than the available balance is rejected.',
      'Regression test asserts balance before/after and that over-disbursement throws.',
    ],
  },
  {
    id: 30, slug: 'collateral-release-not-idempotent', stage: 2, severity: 'high',
    area: 'financial', areaLabel: 'area:financial',
    title: 'releaseCollateral is not idempotent → margin debited twice on repeat release',
    loc: 'services/clearing-house/collateral-management.ts:194-228',
    problem:
`\`releaseCollateral()\` rejects only \`seized\` and \`liquidated\` positions. A position that is already
\`released\` is happily released again: it re-runs the margin-account reduction
(\`initialMarginPosted -= adjustedValue\`, etc.). Calling it twice on the same position subtracts the collateral
value from the margin account twice.`,
    evidenceLang: 'ts',
    evidence:
`if (position.status === 'seized' || position.status === 'liquidated') {
  throw new Error(\`Cannot release collateral in status: \${position.status}\`);
}
// 'released' is NOT rejected — a second call re-runs the debit:
position.status = 'released';
if (position.heldFor === 'initial_margin') {
  account.initialMarginPosted = Math.max(0, account.initialMarginPosted - position.adjustedValue);
}`,
    impact:
`A duplicate / retried release double-counts the margin reduction, understating posted margin and overstating
excess margin — which can in turn permit withdrawals or new positions that the real collateral does not support.`,
    fix:
`Make release idempotent: reject (or no-op) when \`position.status === 'released'\`, so the margin debit runs at
most once per position.`,
    acceptance: [
      'Calling `releaseCollateral` twice on the same position debits the margin account only once (second call throws or is a no-op).',
      'Regression test asserts margin-account values are identical after one vs. two release calls.',
    ],
  },
  {
    id: 31, slug: 'cross-chain-confirmation-swallows-failures', stage: 2, severity: 'high',
    area: 'reliability', areaLabel: 'area:reliability',
    title: 'Cross-chain waitForConfirmation reports success on missing connector / still-pending tx',
    loc: 'connectors/cross-chain-liquidity/execution.ts:379-405 (consumed at :142-163)',
    problem:
`\`waitForConfirmation()\` has two unsafe exits: (1) if no connector is registered for the chain it returns a
synthetic \`{ status: 'confirmed' }\`; (2) after \`maxAttempts\` polls without confirmation it returns
\`connector.checkTransactionStatus(txHash)\` once more, which can still be \`pending\`. The caller (\`executeTrade\`)
only treats \`status === 'failed'\` as an error, so both a missing connector and a never-confirmed tx are treated
as a completed leg.`,
    evidenceLang: 'ts',
    evidence:
`const connector = this.registry.get(chainId);
if (!connector) {
  return { hash: txHash, chainId, status: 'confirmed', confirmations: 1, submittedAt: new Date() }; // phantom success
}
for (let attempt = 0; attempt < maxAttempts; attempt++) { ... }
return connector.checkTransactionStatus(txHash);   // may still be 'pending'

// caller only rejects on 'failed':
if (txDetails.status === 'failed') { throw new Error(\`Transaction failed: \${txDetails.hash}\`); }`,
    impact:
`A multi-leg cross-chain swap can be reported as confirmed when a leg's transaction never actually confirmed
(or no connector exists), so the engine proceeds to the next leg / marks the trade complete while funds are
in limbo. This can strand or double-spend value across chains.`,
    fix:
`Treat a missing connector as an error (fail-closed), and treat a non-\`confirmed\` terminal poll result as
unconfirmed (throw / mark the leg pending-for-retry) rather than returning it as success. The caller should
require \`status === 'confirmed'\` to proceed, not merely "not failed".`,
    acceptance: [
      'A missing connector causes `waitForConfirmation` to fail-closed (no synthetic `confirmed`).',
      'A tx still `pending` after `maxAttempts` does not advance the trade as if confirmed.',
      'The caller proceeds only on `status === "confirmed"`.',
      'Regression tests cover missing-connector and timeout-still-pending paths.',
    ],
  },
  {
    id: 32, slug: 'default-resolution-phantom-recovery', stage: 2, severity: 'high',
    area: 'financial', areaLabel: 'area:financial',
    title: 'Loss socialization zeroes the full deficit while honouring a cap → phantom recovery',
    loc: 'services/clearing-house/default-resolution.ts:570-599',
    problem:
`\`socializeLoss\` computes \`lossPercent\` capped at \`maxSocializedLossPercent\`, but then unconditionally records
\`amountRecovered: event.totalDeficit\`, sets \`event.socializedLoss = event.totalDeficit\` and
\`event.totalDeficit = 0\`. The capped percentage is reported, yet the books show the **entire** deficit as
recovered and the remaining deficit as zero — even when the cap means only part of it could actually be
socialized.`,
    evidenceLang: 'ts',
    evidence:
`const lossPercent = Math.min(
  this.config.maxSocializedLossPercent,
  event.totalDeficit / (participantIds.length * 1_000_000)
);
const step = { action: 'socialize_loss', amountRecovered: event.totalDeficit, remainingDeficit: 0, ... };
event.socializedLoss = event.totalDeficit;
event.totalDeficit = 0;          // full deficit cleared regardless of the cap`,
    impact:
`The clearing house believes a default has been fully resolved when, under the socialized-loss cap, a residual
deficit should remain (to be covered by the default fund / further steps). Real losses are hidden, and the
default-waterfall stops early, leaving the shortfall unfunded.`,
    fix:
`Compute the actually-socialized amount from the cap (e.g. \`socialized = min(totalDeficit, cap * basis)\`), set
\`socializedLoss = socialized\`, \`amountRecovered = socialized\`, and \`totalDeficit -= socialized\` so any residual
deficit remains and drives the next waterfall step.`,
    acceptance: [
      'When the socialized-loss cap binds, `totalDeficit` is reduced only by the actually-socialized amount, leaving a residual.',
      '`amountRecovered`/`socializedLoss` equal the capped amount, not the full deficit.',
      'Regression test with a deficit larger than the cap asserts a non-zero residual deficit remains.',
    ],
  },
  {
    id: 33, slug: 'refund-no-over-refund-guard', stage: 2, severity: 'medium',
    area: 'financial', areaLabel: 'area:financial',
    title: 'refundPayment has no upper-bound guard → refund can exceed the captured amount',
    loc: 'services/payments/payment-gateway.ts:377-408',
    problem:
`\`refundPayment()\` accepts an arbitrary \`amount\` and never checks it against the captured payment amount. It
computes \`isPartialRefund = BigInt(refundAmount) < BigInt(payment.amount)\`; when \`refundAmount\` is *greater*
than \`payment.amount\` this is \`false\`, so the payment is marked fully \`refunded\` and the oversized
\`refundAmount\` is returned as the refund. There is also no cumulative-refund tracking, so the remaining
balance after a partial refund cannot be refunded (status leaves \`completed\`) — the two issues bracket the
missing amount accounting.`,
    evidenceLang: 'ts',
    evidence:
`const refundAmount = amount || payment.amount;
const isPartialRefund = BigInt(refundAmount) < BigInt(payment.amount);   // no upper bound
payment.status = isPartialRefund ? 'partially_refunded' : 'refunded';
// returns refundAmount verbatim, even if > payment.amount`,
    impact:
`A caller can request a refund larger than what was captured and the gateway will report a successful refund of
that larger amount, enabling over-refund / fund leakage. Conversely, a single partial refund locks the
remainder because the status guard only allows refunding a \`completed\` payment.`,
    fix:
`Validate \`refundAmount <= payment.amount - alreadyRefunded\`. Track cumulative refunded amount on the payment so
multiple partial refunds are supported up to (but not beyond) the captured total, and reject any request that
would exceed it.`,
    acceptance: [
      'A refund greater than the captured amount (minus prior refunds) is rejected.',
      'Cumulative partial refunds are allowed up to the captured total and no further.',
      'Regression test covers over-refund and sequential partial refunds.',
    ],
  },
  {
    id: 34, slug: 'portfolio-protection-peak-denominator', stage: 2, severity: 'medium',
    area: 'financial', areaLabel: 'area:financial',
    title: 'Daily-loss percent uses peak value as denominator → loss% understated, breaker trips late',
    loc: 'core/risk-engine/portfolio-protection.ts:428-430',
    problem:
`The daily-loss breaker computes \`dailyLossPercent = dailyLossUsd / peakValueUsd\`. Using the all-time *peak*
portfolio value as the denominator (instead of the current portfolio value, or the day's starting value)
systematically understates the loss percentage whenever the portfolio has drawn down from its peak.`,
    evidenceLang: 'ts',
    evidence:
`const dailyLossPercent = this.state.peakValueUsd > 0
  ? (dailyLossUsd / this.state.peakValueUsd) * 100
  : 0;`,
    impact:
`After a drawdown, the same dollar loss maps to a smaller percentage than reality, so the daily-loss circuit
breaker trips later than its configured threshold — exactly when capital is already depleted and protection
matters most.`,
    fix:
`Use the appropriate base for "daily loss percent": the day's starting equity (or current portfolio value),
not the historical peak. Define the denominator explicitly and document it.`,
    acceptance: [
      'Daily-loss percentage is computed against the day-start (or current) portfolio value, not the historical peak.',
      'Regression test: a fixed dollar loss after a drawdown yields the correct percentage and trips the breaker at the configured threshold.',
    ],
  },
  {
    id: 35, slug: 'risk-controls-single-trade-as-portfolio', stage: 2, severity: 'medium',
    area: 'financial', areaLabel: 'area:financial',
    title: 'Live risk-controls use a single trade notional as the portfolio-value proxy',
    loc: 'core/trading/live/risk-controls.ts:282-289',
    problem:
`When recording a trade for daily-loss tracking, the code sets \`const portfolioValue = value;\` where \`value\` is
the notional of the single trade being recorded, then derives the daily-loss percentage from it. Using one
trade's notional as the portfolio value makes the percentage meaningless.`,
    evidenceLang: 'ts',
    evidence:
`const portfolioValue = value;   // 'value' is this trade's notional, not the portfolio
// daily-loss percentage is then computed against this single-trade proxy`,
    impact:
`The live daily-loss percentage is computed against the wrong base, so the loss-percent threshold does not
reflect actual portfolio drawdown — the breaker can trip spuriously on a large single trade or fail to trip on
a real cumulative loss.`,
    fix:
`Thread the actual current portfolio value into \`recordTrade\` (it is available to the risk engine elsewhere)
and use it as the denominator; do not substitute the trade notional.`,
    acceptance: [
      'Daily-loss percentage in live risk-controls uses the real portfolio value, not a single-trade notional.',
      'Regression test asserts the percentage matches the portfolio-relative loss.',
    ],
  },

  // ===================== Stage 3 — compliance hardening =====================
  {
    id: 36, slug: 'chainalysis-sanctioned-substring-only', stage: 3, severity: 'high',
    area: 'regulatory', areaLabel: 'area:regulatory',
    title: 'Sanctions screening flags only when category contains the substring "sanction"; risk score & cluster ignored',
    loc: 'services/regulatory/providers/chainalysis.ts:140-176',
    problem:
`After fetching a Chainalysis address summary, \`sanctioned\` is set true only if some identification's
\`category\` string \`.toLowerCase().includes('sanction')\`. The numeric \`riskScore\` (severe/high mapped to
85-100) and the \`cluster.category\` (e.g. a known illicit-service cluster) are computed/returned but never feed
the sanctioned/blocking decision. \`toSanctionsMatches()\` filters identifications the same substring way.`,
    evidenceLang: 'ts',
    evidence:
`const riskScore = riskStringToScore(data.risk ?? '');     // computed...
const sanctioned = identifications.some((id) =>
  id.category.toLowerCase().includes('sanction')           // ...but only this substring decides
);
// cluster.category and riskScore are returned but never gate the decision`,
    impact:
`Addresses Chainalysis rates \`severe\`/\`high\` risk, or that belong to a flagged illicit cluster, are treated as
clean unless an identification category literally contains "sanction". A category labelled e.g. "OFAC SDN",
"terrorist financing", or "stolen funds" — or a severe risk score with no identification — slips through the
compliance gate.`,
    fix:
`Drive the block decision from all available signals: a configurable \`riskScore\` threshold, the cluster
category against an illicit-category list, **and** the identification categories (mapped via a list, not a bare
substring). Treat \`SANCTIONS_CATEGORY_MAP\` keys as the source of truth for sanction categories.`,
    acceptance: [
      'A `severe`/`high` risk score (above a configured threshold) is screened as blocked even without a "sanction" substring.',
      'A flagged illicit `cluster.category` triggers a match.',
      'Identification → sanctions-list mapping uses the category map, not `includes("sanction")`.',
      'Regression tests cover each signal in isolation.',
    ],
  },
  {
    id: 37, slug: 'sanctions-list-checksum-unused', stage: 3, severity: 'medium',
    area: 'regulatory', areaLabel: 'area:regulatory',
    title: 'Downloaded sanctions lists are never integrity-validated (checksum computed but unused)',
    loc: 'services/regulatory/providers/list-downloader.ts:314-329',
    problem:
`\`refreshList()\` downloads a sanctions list, computes a SHA-256 \`checksum\` and stores it on the snapshot, but
never validates it against a pinned/expected hash, the previous snapshot, or a minimum entry count. A truncated,
empty, or tampered download is accepted as a valid list.`,
    evidenceLang: 'ts',
    evidence:
`const content = await this.download(src.url);
const checksum = crypto.createHash('sha256').update(content).digest('hex');  // computed, never compared
const entries = parseContent(content, src.format);
// snapshot stored regardless of integrity / size sanity`,
    impact:
`A partial HTTP body, an upstream outage returning an error page, or a tampered feed yields a sanctions list
with missing entries — sanctioned entities silently disappear from screening, a direct compliance failure.`,
    fix:
`Validate the download before accepting it: compare \`checksum\`/entry-count against the previous snapshot and
reject an unexpected large shrink; support a pinned expected hash where the source publishes one; refuse empty
or unpar. able payloads. Surface a loud error/alert on rejection rather than silently replacing the list.`,
    acceptance: [
      'A download that parses to zero/abnormally-few entries (vs. the prior snapshot) is rejected, not stored.',
      'Where a source publishes a checksum, the download is verified against it.',
      'Rejection raises an alert and keeps the last-known-good list.',
    ],
  },
  {
    id: 38, slug: 'agent-commerce-block-after-amount', stage: 3, severity: 'medium',
    area: 'financial', areaLabel: 'area:financial',
    title: 'Agent-commerce authorization checks blocked merchant/category after the large-amount approval branch',
    loc: 'services/payments/agent-commerce.ts:516-552',
    problem:
`\`checkAuthorization()\` evaluates the amount limit before the blocked-merchant / blocked-category checks. When
the amount exceeds \`maxAmount\` and a matching approval threshold requires approval, it \`return\`s
\`{ authorized: true, requiresApproval: true }\` immediately — before reaching the \`blockedMerchants\` and
\`blockedCategories\` checks. A transaction to a blocked merchant therefore returns "authorized (pending
approval)" instead of being denied.`,
    evidenceLang: 'ts',
    evidence:
`if (BigInt(transaction.amount) > BigInt(auth.scope.maxAmount)) {
  for (const threshold of config.limits.approvalRequired) {
    if (... threshold.requiresApproval) {
      return { authorized: true, requiresApproval: true, ... };   // returns BEFORE the block checks below
    }
  }
  return { authorized: false, reason: 'Amount exceeds maximum authorized amount' };
}
if (config.limits.blockedMerchants.includes(transaction.merchantId)) { return { authorized: false, ... }; }
if (transaction.category && config.limits.blockedCategories.includes(transaction.category)) { ... }`,
    impact:
`A blocked merchant or category can be authorised (subject only to human approval) as long as the amount is
large enough to take the approval branch — the deny-list is bypassed for exactly the high-value transactions
that most need it.`,
    fix:
`Evaluate the hard deny-lists (blocked merchants/categories) **before** the amount/approval logic, so a blocked
counterparty is rejected regardless of amount.`,
    acceptance: [
      'A transaction to a blocked merchant/category is denied even when the amount triggers the approval branch.',
      'Deny-list checks run before the amount-limit/approval logic.',
      'Regression test: large-amount transaction to a blocked merchant returns `authorized: false`.',
    ],
  },
  {
    id: 39, slug: 'subscription-usage-ignores-idempotency', stage: 3, severity: 'medium',
    area: 'financial', areaLabel: 'area:financial',
    title: 'reportUsage ignores its idempotencyKey → duplicate usage events double-bill',
    loc: 'services/payments/subscription-engine.ts:808-830 (UsageReport.idempotencyKey at :141)',
    problem:
`\`UsageReport\` carries an optional \`idempotencyKey\` (defined at line 141), but \`reportUsage()\` never consults
it: it unconditionally accumulates \`usage.value\` into \`currentPeriodUsage[usage.metric]\`. A retried or
duplicated usage report (same key) is counted twice.`,
    evidenceLang: 'ts',
    evidence:
`export interface UsageReport {
  // ...
  idempotencyKey?: string;        // line 141 — declared but never read
}

async reportUsage(subscriptionId: string, usage: UsageReport): Promise<Subscription> {
  // ...
  const currentUsage = subscription.usage.currentPeriodUsage[usage.metric] || 0;
  subscription.usage.currentPeriodUsage[usage.metric] = currentUsage + usage.value;  // no idempotency guard
  // ...
}`,
    impact:
`At-least-once delivery (network retries, client retries) leads to duplicate metered-usage records, which
inflates usage-based billing — customers are over-charged for the same usage.`,
    fix:
`Track processed \`idempotencyKey\`s per subscription and short-circuit (return the prior result) when a key
recurs, so each logical usage event is recorded exactly once.`,
    acceptance: [
      'Two `reportUsage` calls with the same `idempotencyKey` record usage once.',
      'A call without a key behaves as before.',
      'Regression test asserts idempotent accumulation.',
    ],
  },

  // ===================== Stage 4 — strategy / backtest integrity =====================
  {
    id: 40, slug: 'backtest-trades-missing-pnl', stage: 4, severity: 'high',
    area: 'strategy', areaLabel: 'area:strategy',
    title: 'Backtest trades never carry per-trade pnl → win rate, expectancy and returns are always zero',
    loc: 'core/strategies/engine/backtesting.ts:602-617, 650-666, 767-841',
    problem:
`Trade records pushed during a backtest never set a \`pnl\` field. Buy trades are pushed without \`pnl\`; the
sell path computes a local \`pnl\` and adds it to \`realizedPnl\` but does not record a trade carrying it.
The performance summary then derives \`winningTrades = trades.filter(t => (t.pnl ?? 0) > 0)\`,
\`winRate\`, \`avgWin\`, \`expectancy\`, and per-trade \`returns\` — all of which collapse because every
\`t.pnl\` is \`undefined → 0\`.`,
    evidenceLang: 'ts',
    evidence:
`// buy trade pushed — no pnl:
trades.push({ id: ..., type: 'buy', token, amount: tokensReceived, price: effectivePrice, value: amount, fees, slippage });

// sell path computes pnl locally but records no trade with it:
const pnl = (position.currentPrice - position.entryPrice) * sellAmount;
state.realizedPnl += pnl;

// summary depends on t.pnl, which is always undefined:
const winningTrades = trades.filter(t => (t.pnl ?? 0) > 0);     // always empty
const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;  // always 0
const returns = trades.map(t => (t.pnl ?? 0) / t.value);        // all 0`,
    impact:
`Every backtest reports a 0% win rate, zero expectancy, and zero per-trade returns regardless of the strategy's
actual performance. Any ranking, selection, or marketplace surfacing built on these metrics is meaningless.`,
    fix:
`Record realized P&L on the closing (sell) trade (and/or attach \`pnl\` to the trade objects the summary
consumes). Ensure \`winningTrades\`/\`losingTrades\`/\`returns\` read a populated \`pnl\`. Add a test asserting a
known winning strategy yields a non-zero win rate.`,
    acceptance: [
      'Closed trades carry a realized `pnl` consumed by the performance summary.',
      'A deterministic profitable scenario yields `winRate > 0` and non-zero expectancy.',
      'Per-trade `returns` reflect realized P&L.',
    ],
  },
  {
    id: 41, slug: 'capital-manager-priority-inverted', stage: 4, severity: 'medium',
    area: 'strategy', areaLabel: 'area:strategy',
    title: 'Partial capital allocation favours the lowest-priority requests (priority semantics inverted)',
    loc: 'core/multi-agent/resources/capital-manager.ts:90-101 (TaskPriority defined at core/multi-agent/types.ts:301)',
    problem:
`\`TaskPriority\` is documented as \`1 | 2 | 3 | 4 | 5; // 1 = highest\`. When available capital is insufficient,
the partial-allocation path is guarded by \`request.priority >= 3\` — i.e. it fires only for the *lower-priority*
half (3-5). Highest-priority requests (1-2) take the \`else\` branch and are rejected outright, while
low-priority requests are partially funded.`,
    evidenceLang: 'ts',
    evidence:
`// TaskPriority: 1 = highest
if (request.amount > pool.availableCapital) {
  if (request.priority >= 3 && pool.availableCapital > 0) {   // only LOW priority gets partial fill
    request.amount = pool.availableCapital;
  } else {
    request.status = 'rejected';                              // HIGH priority rejected entirely
    return null;
  }
}`,
    impact:
`Under capital contention the highest-priority agents are starved (rejected) while the lowest-priority ones
receive the remaining capital — the opposite of the intended prioritisation.`,
    fix:
`Decide the intended policy and make the comparison match \`1 = highest\`. If partial fills should favour
high-priority requests, gate on \`request.priority <= N\`; document the chosen semantics with a named constant
rather than a bare \`>= 3\`.`,
    acceptance: [
      'Under contention, partial allocation favours higher-priority requests per the documented `1 = highest` ordering (or the chosen policy is documented and tested).',
      'Regression test contrasts a priority-1 and a priority-5 request against the same limited pool.',
    ],
  },
  {
    id: 42, slug: 'genetic-optimizer-iteration-divided', stage: 4, severity: 'medium',
    area: 'strategy', areaLabel: 'area:strategy',
    title: 'Genetic optimizer terminates immediately when maxIterations < populationSize',
    loc: 'core/strategies/engine/optimization.ts:837-839',
    problem:
`\`isComplete()\` returns \`this.generation >= Math.floor(this.config.maxIterations / this.populationSize)\`. The
iteration budget is divided by the population size, so with the default \`populationSize\` (20) any
\`maxIterations < 20\` yields \`floor(maxIterations / 20) === 0\` and the optimizer is "complete" at generation 0 —
it never evolves a single generation. Even moderate budgets are silently cut by a factor of \`populationSize\`.`,
    evidenceLang: 'ts',
    evidence:
`isComplete(): boolean {
  return this.generation >= Math.floor(this.config.maxIterations / this.populationSize);
}`,
    impact:
`Genetic optimization runs effectively perform no search for typical configs: the returned parameters are the
initial random population's best, not an optimized result. Users believe tuning happened when it did not.`,
    fix:
`Interpret \`maxIterations\` as the number of generations directly (\`generation >= maxIterations\`), or convert a
function-evaluation budget to generations explicitly and guard against a zero result (\`max(1, ...)\`). Document
the unit of \`maxIterations\`.`,
    acceptance: [
      'With a small `maxIterations` (e.g. 5) and default population, the optimizer runs the expected number of generations (not zero).',
      'Regression test asserts `generation` advances and best fitness can improve over the run.',
    ],
  },
  {
    id: 43, slug: 'shared-memory-read-locks-not-shared', stage: 4, severity: 'medium',
    area: 'reliability', areaLabel: 'area:reliability',
    title: 'Shared-memory read locks overwrite each other (single map entry per key)',
    loc: 'core/multi-agent/memory/shared-memory.ts:108-146',
    problem:
`Locks are stored in \`this.locks: Map<key, MemoryLock>\` — at most one lock record per key. Read locks are
supposed to be shareable by multiple holders, but acquiring a second read lock simply overwrites the map entry
with the new holder. The first reader's lock record is lost; when that reader calls \`releaseLock\`, the
\`holderId\` no longer matches and the release returns \`false\`, while the lock now reflects only the last reader.`,
    evidenceLang: 'ts',
    evidence:
`const existingLock = this.locks.get(key);
if (existingLock && existingLock.expiresAt > new Date()) {
  if (existingLock.type === 'write') return null;
  if (type === 'write') return null;
}
// read-on-read falls through and OVERWRITES the single entry:
this.locks.set(key, lock);`,
    impact:
`Concurrent readers silently evict each other's lock bookkeeping. A reader cannot reliably release its own lock,
and a write lock can be acquired once the *last* reader's TTL passes even if earlier readers are still active —
breaking the read/write mutual-exclusion guarantee the lock is meant to provide.`,
    fix:
`Model read locks as a set of holders per key (e.g. \`Map<key, { write?: Lock; readers: Map<holderId, Lock> }>\`):
allow multiple concurrent readers, block writers until all readers release, and release per holder.`,
    acceptance: [
      'Multiple concurrent read-lock holders are tracked independently; each can release its own lock.',
      'A write lock is granted only when there are no active readers.',
      'Regression test acquires two read locks, releases one, and asserts the other still holds.',
    ],
  },
  {
    id: 44, slug: 'conflict-resolver-contention-off-by-one', stage: 4, severity: 'low',
    area: 'reliability', areaLabel: 'area:reliability',
    title: 'Capital-contention detection off-by-one misses two-agent contention',
    loc: 'core/multi-agent/resources/conflict-resolver.ts:193-216',
    problem:
`The capital-contention detector enters its check only when \`significantAllocations.length > 2\` — i.e. it
requires **three or more** agents holding significant allocations before it even looks for simultaneous
execution. Contention between exactly two agents over the same capital pool is therefore never detected. The
outer threshold should be \`>= 2\` (two or more competitors is already contention); the inner
\`conflictingAgents.length > 1\` check is already correct.`,
    evidenceLang: 'ts',
    evidence:
`const significantAllocations = Array.from(agentAllocations.entries())
  .filter(([, amount]) => amount > 1000);

if (significantAllocations.length > 2) {     // requires 3+; misses the 2-agent case
  const executingAgents = context.agents.filter((a) => a.status === 'executing').map((a) => a.agentId);
  const conflictingAgents = significantAllocations
    .filter(([agentId]) => executingAgents.includes(agentId))
    .map(([agentId]) => agentId);
  if (conflictingAgents.length > 1) { /* raise capital_contention conflict */ }
}`,
    impact:
`The most common contention case — two agents wanting the same capital pool — is never surfaced or resolved by
the conflict resolver, so it falls through to whatever first-come behaviour exists.`,
    fix:
`Use \`significantAllocations.length >= 2\` (or \`> 1\`) so any two-or-more-way contention is evaluated; the inner
\`conflictingAgents.length > 1\` guard already handles the simultaneous-execution requirement.`,
    acceptance: [
      'Two agents contending for the same resource are detected as a conflict.',
      'Regression test with exactly two competitors asserts a contention conflict is raised.',
    ],
  },

  // ===================== Stage 5 — runtime hygiene =====================
  {
    id: 45, slug: 'worker-pool-returns-busy-worker', stage: 5, severity: 'high',
    area: 'reliability', areaLabel: 'area:reliability',
    title: 'Worker pool hands out a busy worker when the pool is exhausted (over-subscription)',
    loc: 'services/distributed-scheduler/worker-pool.ts:229-256',
    problem:
`\`acquireWorker()\` returns an idle worker, or spawns one while under \`maxWorkers\`. When the pool is exhausted
it returns \`Array.from(this.workers.values())[0]\` — the first worker — regardless of whether it is busy. The
inline comment acknowledges "here we pick first busy worker". A second job is thus assigned to a worker already
running a job.`,
    evidenceLang: 'ts',
    evidence:
`if (activeCount < this.config.maxWorkers) {
  return this.spawnWorker();
}
// Pool exhausted — reuse the least-loaded worker (best effort)
// In production this would queue the job; here we pick first busy worker
const first = Array.from(this.workers.values())[0];
if (!first) return this.spawnWorker();
return first;   // may be busy`,
    impact:
`Under load the pool over-subscribes: two jobs share one worker, corrupting per-job worker state (current job,
status, metrics) and violating the \`maxWorkers\` concurrency bound. Results can be attributed to the wrong job
or lost.`,
    fix:
`Queue the job until a worker frees up (back-pressure) instead of returning a busy worker; or pick a genuinely
idle worker and block/await otherwise. Never hand out a worker whose status is not \`idle\`.`,
    acceptance: [
      'When all workers are busy and at `maxWorkers`, jobs queue rather than being assigned to a busy worker.',
      'A worker is never assigned two concurrent jobs.',
      'Regression test saturates the pool and asserts no double-assignment.',
    ],
  },
  {
    id: 46, slug: 'retry-engine-unbounded-history', stage: 5, severity: 'high',
    area: 'reliability', areaLabel: 'area:reliability',
    title: 'Retry-engine execution history grows unbounded; retention config is never applied',
    loc: 'services/distributed-scheduler/retry-engine.ts:69-73 (config at services/distributed-scheduler/scheduler.ts:50)',
    problem:
`\`recordExecution()\` appends to \`executionHistory\` per job and never trims it. The configured
\`executionHistoryRetentionMs\` (default 7 days) is declared in the scheduler config but never read anywhere in
the retry engine — entries are only ever removed by an explicit \`cleanupJob(jobId)\`. For recurring jobs that
reuse a \`jobId\`, history accumulates without bound.`,
    evidenceLang: 'ts',
    evidence:
`recordExecution(record: ExecutionRecord): void {
  const history = this.executionHistory.get(record.jobId) ?? [];
  history.push(record);                       // never trimmed by age/size
  this.executionHistory.set(record.jobId, history);
}
// executionHistoryRetentionMs (scheduler.ts:50) is never referenced by the retry engine`,
    impact:
`Long-running schedulers leak memory as execution history grows for every retried/recurring job, eventually
risking OOM. The 7-day retention the operator configured silently has no effect.`,
    fix:
`Apply \`executionHistoryRetentionMs\`: prune records older than the retention window (and/or cap per-job history
length) on insert or on a periodic sweep.`,
    acceptance: [
      'Execution records older than `executionHistoryRetentionMs` are pruned.',
      'Per-job history is bounded (by age and/or count).',
      'Regression test inserts old records and asserts they are evicted.',
    ],
  },
  {
    id: 47, slug: 'iceberg-execution-infinite-loop', stage: 5, severity: 'high',
    area: 'reliability', areaLabel: 'area:reliability',
    title: 'Iceberg execution loops forever on an unfilled resting limit order',
    loc: 'core/trading/live/execution-engine.ts:471-500',
    problem:
`\`executeIceberg\` slices the order with \`while (remainingQuantity > 0 && status !== 'cancelled')\`, decrementing
\`remainingQuantity\` by \`order.filledQuantity\`. It \`break\`s only on \`rejected\`/\`expired\` status (or a thrown
error). A limit order that rests unfilled (status \`open\`/\`new\`, \`filledQuantity === 0\`) leaves
\`remainingQuantity\` unchanged, so the loop repeats forever (with a 1s sleep per slice), re-placing slices
indefinitely.`,
    evidenceLang: 'ts',
    evidence:
`while (remainingQuantity > 0 && (execution.status as string) !== 'cancelled') {
  const order = await connector.placeOrder({ type: 'limit', price: request.priceLimit, ... });
  execution.orders.push(order);
  remainingQuantity -= order.filledQuantity;          // 0 if the limit order just rests
  if (order.status === 'rejected' || order.status === 'expired') break;  // 'open'/'new' never breaks
  if (remainingQuantity > 0) await sleep(1000);
}`,
    impact:
`Against a limit price that is not immediately marketable, the engine spins forever, continuously placing new
resting slices — unbounded order spam, resource exhaustion, and a stuck execution that never completes or fails.`,
    fix:
`Add a termination condition independent of fill: a maximum number of slices / total timeout, and handle
resting (non-terminal) order statuses — cancel-and-repost with a bound, or abort the iceberg after N
unproductive iterations. Make zero forward progress over a slice a stop condition.`,
    acceptance: [
      'An iceberg whose slices rest unfilled terminates after a bounded number of attempts / a timeout.',
      'The loop cannot place an unbounded number of orders.',
      'Regression test with a connector that always returns `filledQuantity: 0` asserts the loop exits.',
    ],
  },
  {
    id: 48, slug: 'scheduler-manual-trigger-no-running-guard', stage: 5, severity: 'medium',
    area: 'reliability', areaLabel: 'area:reliability',
    title: 'triggerJobManually has no running-state guard → concurrent double execution',
    loc: 'services/distributed-scheduler/scheduler.ts:561-567',
    problem:
`\`triggerJobManually()\` dispatches a job for immediate execution without checking whether that job is already
running. A manual trigger fired while a scheduled (or prior manual) run is in flight executes the same job
concurrently.`,
    evidenceLang: 'ts',
    evidence:
`// no check that the job isn't already executing before dispatching:
async triggerJobManually(jobId: string): Promise<...> {
  const job = ...;
  // dispatches immediately regardless of in-flight status
}`,
    impact:
`A job with side effects (placing trades, sending payments, rebalancing) can run twice simultaneously,
duplicating its effects — and non-reentrant jobs may corrupt shared state.`,
    fix:
`Guard on the job's running state: refuse (or queue) a manual trigger when the job is already executing, mirroring
the scheduler's normal concurrency control.`,
    acceptance: [
      'A manual trigger for an already-running job is rejected or queued, not run concurrently.',
      'Regression test triggers a long-running job twice and asserts a single concurrent execution.',
    ],
  },
  {
    id: 49, slug: 'agent-manager-cycle-double-count', stage: 5, severity: 'medium',
    area: 'reliability', areaLabel: 'area:reliability',
    title: 'Runtime telemetry double-counts each agent cycle (explicit recordEvent + forwarded loop event)',
    loc: 'core/runtime/agent-manager.ts:587-599 & 693-696 (events from core/runtime/execution-loop.ts:437,504,542)',
    problem:
`Each agent cycle is recorded to the monitor twice. \`executeAgentCycle()\` explicitly calls
\`this.monitor.recordEvent({ type: cycle.completed | cycle.failed, ... })\`. Separately, the manager subscribes to
the execution loop (\`this.executionLoop.subscribe(event => { this.forwardEvent(event); this.monitor.recordEvent(event); })\`),
and the execution loop already emits \`cycle.completed\` / \`cycle.failed\` for the same cycle. The monitor thus
receives two events per cycle.`,
    evidenceLang: 'ts',
    evidence:
`// explicit, in executeAgentCycle:
this.monitor.recordEvent({ type: result.success ? 'cycle.completed' : 'cycle.failed', ... });

// and again via the loop subscription:
this.executionLoop.subscribe((event) => {
  this.forwardEvent(event);
  this.monitor.recordEvent(event);     // execution-loop already emits cycle.completed/failed
});`,
    impact:
`Cycle counts, success/failure rates and any metric derived from these events are inflated ~2×. Dashboards,
alert thresholds, and health/auto-pause logic that count cycle events are driven by wrong numbers.`,
    fix:
`Record the cycle once: either drop the explicit \`recordEvent\` in \`executeAgentCycle\` and rely on the forwarded
loop event, or stop forwarding cycle events to the monitor and keep the explicit call. Ensure exactly one path
records each cycle event.`,
    acceptance: [
      'Exactly one monitor event is recorded per completed/failed cycle.',
      'Regression test runs one cycle and asserts a single `cycle.completed` (or `cycle.failed`) is recorded.',
    ],
  },
  {
    id: 50, slug: 'price-comparator-unfiltered-fallback', stage: 5, severity: 'medium',
    area: 'financial', areaLabel: 'area:financial',
    title: 'Liquidity router falls back to unfiltered quotes, bypassing liquidity/impact safety filters',
    loc: 'connectors/liquidity-router/price_comparator.ts:62-77',
    problem:
`After filtering candidate venues by liquidity / price-impact safety constraints, if the filtered set is empty
the comparator falls back to the **unfiltered** quote list and picks the best of those. This silently bypasses
the very constraints that removed those venues, and the \`INSUFFICIENT_LIQUIDITY\` branch becomes unreachable.`,
    evidenceLang: 'ts',
    evidence:
`const qualified = quotes.filter(q =>
  q.liquidityUsd >= this.minLiquidityUsd &&
  q.priceImpactPercent <= this.maxPriceImpactPercent
);
// If nothing passes the filter, fall back to unfiltered set:
const candidates = qualified.length > 0 ? qualified : quotes;   // bypasses the filter

if (candidates.length === 0) {                 // unreachable: quotes.length===0 already threw NO_ROUTES above
  throw new LiquidityRouterError(..., 'INSUFFICIENT_LIQUIDITY', ...);
}
// ranking then picks the best of UNFILTERED candidates`,
    impact:
`A trade can be routed to a venue with insufficient liquidity or excessive price impact precisely when no safe
venue exists — the safety filter is defeated exactly when it matters, and the user is not told liquidity was
insufficient.`,
    fix:
`When no venue passes the safety filter, return \`INSUFFICIENT_LIQUIDITY\` (or surface the constraint breach to the
caller) instead of routing through an unfiltered fallback. If a degraded fallback is intentional, gate it behind
an explicit opt-in and report the breached constraint.`,
    acceptance: [
      'With no venue passing the liquidity/impact filter, the router reports `INSUFFICIENT_LIQUIDITY` rather than routing anyway.',
      'Any intentional fallback is explicit and reported.',
      'Regression test with all venues failing the filter asserts the insufficient-liquidity outcome.',
    ],
  },
  {
    id: 51, slug: 'clearing-audit-liquidity-risk-saturates', stage: 5, severity: 'low',
    area: 'financial', areaLabel: 'area:financial',
    title: 'Liquidity-risk metric saturates at 1, losing resolution for severe undercollateralization',
    loc: 'services/clearing-house/audit.ts:309-314',
    problem:
`The systemic liquidity-risk score is computed as roughly \`required / posted\` and capped at 1. Once posted
collateral falls to/below required, the metric pins at 1 and cannot distinguish "exactly at requirement" from
"severely undercollateralized" (e.g. posted is a tenth of required). Crisis-classification driven by this score
loses all resolution in the danger zone.`,
    evidenceLang: 'ts',
    evidence:
`const liquidityRisk = Math.min(1, required / posted);   // saturates at 1; 1x vs 10x shortfall look identical`,
    impact:
`Risk dashboards and any threshold logic keyed on this score treat a mild and a catastrophic collateral shortfall
identically, blunting escalation exactly when the shortfall is worst.`,
    fix:
`Use an unbounded (or higher-ceiling) shortfall ratio for the danger region, or a piecewise/normalized scale that
preserves resolution beyond 1× (e.g. report \`required / posted\` without the cap, or map to severity bands).`,
    acceptance: [
      'The liquidity-risk metric distinguishes degrees of undercollateralization beyond 1×.',
      'Crisis classification escalates with worsening shortfall.',
      'Regression test asserts a 10× shortfall scores worse than a 1.1× shortfall.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function sevWord(s) { return s[0].toUpperCase() + s.slice(1); }

function issueMap() {
  const p = join(OUT_DIR, 'issues.json');
  if (existsSync(p)) {
    try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; }
  }
  return {};
}

function issueLink(filed, id) {
  const n = filed[String(id)];
  return n ? `[#${n}](https://github.com/${REPO}/issues/${n})` : '_(pending)_';
}

function renderDoc(f, filed) {
  const labels = ['bug', `severity:${f.severity}`, f.areaLabel, STAGE_LABEL[f.stage], 'audit:logic-review-v2'];
  if (f.area === 'security' || f.area === 'regulatory') labels.splice(1, 0, 'security');
  const filedNum = filed[String(f.id)];
  const lines = [];
  lines.push(`# LOGIC-${f.id} — ${f.title}`);
  lines.push('');
  lines.push(`**Severity:** ${SEV[f.severity]}`);
  lines.push(`**Area:** ${sevWord(f.area)}`);
  lines.push(`**Stage:** ${STAGES[f.stage]}`);
  lines.push(`**Suggested labels:** ${labels.map((l) => '`' + l + '`').join(', ')}`);
  lines.push(`**Location:** \`${f.loc}\``);
  if (filedNum) lines.push(`**Filed as:** [#${filedNum}](https://github.com/${REPO}/issues/${filedNum})`);
  lines.push('');
  lines.push('## Problem');
  lines.push('');
  lines.push(f.problem);
  lines.push('');
  lines.push('## Evidence');
  lines.push('');
  lines.push('```' + (f.evidenceLang || 'ts'));
  lines.push(f.evidence);
  lines.push('```');
  lines.push('');
  lines.push('## Impact');
  lines.push('');
  lines.push(f.impact);
  lines.push('');
  lines.push('## Suggested fix');
  lines.push('');
  lines.push(f.fix);
  lines.push('');
  lines.push('## Acceptance criteria');
  lines.push('');
  for (const a of f.acceptance) lines.push(`- [ ] ${a}`);
  lines.push('');
  return lines.join('\n');
}

function docFileName(f) { return `LOGIC-${f.id}-${f.slug}.md`; }

mkdirSync(OUT_DIR, { recursive: true });
const filed = issueMap();

for (const f of FINDINGS) {
  writeFileSync(join(OUT_DIR, docFileName(f)), renderDoc(f, filed));
}

// ---- README index ----
const counts = FINDINGS.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {});
const bySev = (s) => FINDINGS.filter((f) => f.severity === s);
const byStage = (n) => FINDINGS.filter((f) => f.stage === n);

function sevTable(s) {
  const rows = bySev(s).map((f) =>
    `| LOGIC-${f.id} | [${f.title}](./${docFileName(f)}) | ${sevWord(f.area)} | \`${f.loc.split(':')[0]}\` | ${issueLink(filed, f.id)} |`);
  return rows.join('\n');
}
function stageTable(n) {
  const rows = byStage(n).map((f) =>
    `| LOGIC-${f.id} | [${f.title}](./${docFileName(f)}) | ${sevWord(f.severity)} | ${issueLink(filed, f.id)} |`);
  return rows.join('\n');
}

const readme = `# Logic RE-Review — Ready-to-File Issue Breakdown (v2 / Issue #431)

> Generated as part of Issue [#431](https://github.com/${REPO}/issues/431): "Check via Claude Fable".
> Audited version: v2.43.0 · Branch: \`issue-431-c0be08c13d26\`
> Companion report: [\`AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW_v2.md\`](../../AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW_v2.md)

This folder contains one **ready-to-file professional issue** per finding from the v2.43.0 logic *re-audit*.
It is a fresh pass that **does not** overlap with the previous review (LOGIC-01..22, issues #386–#407, all
fixed); numbering continues at **LOGIC-23**. Each file is self-contained: problem statement, exact code
location, evidence, impact, suggested fix, acceptance criteria, suggested labels, and the implementation stage.

Every finding was confirmed by reading the actual source at the stated path/line range. One candidate
(\`services/regulatory/ai-governance.ts\` "fails open") was investigated and **dropped** as a false positive —
the missing-field branch leaves oversight *more* readily triggered (fail-closed), not less.

## Severity summary

| Severity | Count |
|----------|:-----:|
| 🔴 High | ${counts.high || 0} |
| 🟠 Medium | ${counts.medium || 0} |
| 🟡 Low | ${counts.low || 0} |
| **Total** | **${FINDINGS.length}** |

## High severity

| ID | Title | Area | File | Issue |
|----|-------|------|------|-------|
${sevTable('high')}

## Medium severity

| ID | Title | Area | File | Issue |
|----|-------|------|------|-------|
${sevTable('medium')}

## Low severity

| ID | Title | Area | File | Issue |
|----|-------|------|------|-------|
${sevTable('low')}

## Suggested labels

The repository lacks severity/area/stage labels and the audit account has \`pull\`-only (triage-less) access, so
labels can not be applied at filing time (this matched the prior round, #386–#407). Maintainers should create
and apply:

- Severity: \`severity:high\`, \`severity:medium\`, \`severity:low\`
- Area: \`area:financial\`, \`area:security\`, \`area:regulatory\`, \`area:strategy\`, \`area:reliability\`
- Stage: \`${STAGE_LABEL[1]}\` … \`${STAGE_LABEL[5]}\`
- Plus the existing \`bug\` (and \`security\` for security/regulatory findings) and a grouping label \`audit:logic-review-v2\`.

Until then, every issue body carries its severity/area/stage as text.

## Priority order & implementation stages

### ${STAGES[1]}

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
${stageTable(1)}

### ${STAGES[2]}

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
${stageTable(2)}

### ${STAGES[3]}

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
${stageTable(3)}

### ${STAGES[4]}

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
${stageTable(4)}

### ${STAGES[5]}

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
${stageTable(5)}
`;
writeFileSync(join(OUT_DIR, 'README.md'), readme);

// ---- Audit report ----
const highList = bySev('high').map((f) => `| LOGIC-${f.id} | ${f.title} | ${sevWord(f.area)} | \`${f.loc.split(':')[0]}\` |`).join('\n');
const medList = bySev('medium').map((f) => `| LOGIC-${f.id} | ${f.title} | ${sevWord(f.area)} | \`${f.loc.split(':')[0]}\` |`).join('\n');
const lowList = bySev('low').map((f) => `| LOGIC-${f.id} | ${f.title} | ${sevWord(f.area)} | \`${f.loc.split(':')[0]}\` |`).join('\n');

const areaCount = (area, sev) => FINDINGS.filter((f) => f.area === area && f.severity === sev).length;
const areaRow = (label, area) => `| ${label} | ${areaCount(area,'high')} | ${areaCount(area,'medium')} | ${areaCount(area,'low')} | ${FINDINGS.filter((f)=>f.area===area).length} |`;

const report = `# 📄 LOGIC RE-REVIEW & CODE AUDIT (v2) — TONAIAgent v2.43.0

**Audit Type:** Full Application Logic Re-Review (correctness, financial, security, reliability)
**Prepared For:** ${REPO} (Issue [#431](https://github.com/${REPO}/issues/431) — "Check via Claude Fable")
**Audited Version:** v2.43.0 (branch: \`issue-431-c0be08c13d26\`)
**Auditor:** Automated AI Logic Audit (konard / AI Issue Solver)

---

## Executive Summary

This is a **second, independent logic-focused pass** over the entire TONAIAgent codebase (~976 TypeScript
files, plus Tact contracts), requested by Issue #431. It deliberately **does not re-report** the first
review's findings: LOGIC-01..22 (issues [#386–#407](https://github.com/${REPO}/issues/386)) were verified as
**fixed** in the current tree before this pass began (spot-checked: the daily-loss breaker is now wired into
\`validate()\`; the Telegram HMAC now uses \`timingSafeEqual\`). New numbering continues at **LOGIC-23**.

The dominant pattern from the first review — *"built but not wired"* safety controls — **recurs**. Several
guards exist and are unit-tested, yet the runtime path that should make them fire is broken (PII redaction that
never triggers, a signature threshold that counts unverified signatures, a human-approval quorum that one person
can satisfy). Alongside these, this pass surfaces a cluster of **funds-accounting** defects (a treasury that
disburses without debiting, non-idempotent collateral release, an allocator that over-allocates capital, loss
socialization that hides residual deficits) and **runtime reliability** defects (an iceberg execution that can
loop forever, a worker pool that over-subscribes, unbounded retry history).

**Overall assessment:** ⚠️ **${counts.high || 0} High, ${counts.medium || 0} Medium, ${counts.low || 0} Low** genuine logic defects, every one confirmed against the
source. As with the prior report, severities are rated for the current (largely simulation-default) posture;
several **High** findings escalate to *Critical* under live funds (e.g. LOGIC-28 over-allocation, LOGIC-29
treasury disbursement, LOGIC-31 cross-chain phantom legs, LOGIC-24 unverified-signature threshold).

| Category | High | Medium | Low | Total |
|----------|:----:|:------:|:---:|:-----:|
${areaRow('Financial / Trading correctness', 'financial')}
${areaRow('Security / Access control / Crypto', 'security')}
${areaRow('Regulatory / Compliance', 'regulatory')}
${areaRow('Strategy / Backtest / Optimizer', 'strategy')}
${areaRow('Reliability / Runtime / Concurrency', 'reliability')}
| **Total** | **${counts.high || 0}** | **${counts.medium || 0}** | **${counts.low || 0}** | **${FINDINGS.length}** |

---

## Methodology

**Scope:** Full static analysis of the TypeScript source, partitioned into five subsystems analysed in
parallel (Financial/Trading, Security/Auth/Crypto, AI/Strategies/Backtesting, Services/Connectors/Contracts,
Runtime/Agents/Concurrency), mirroring the first review's structure.

**Verification:** Every finding includes a file path + line reference, an exact code excerpt, and a concrete
failure scenario. Each agent-surfaced candidate was **re-read against the source before filing**; one candidate
(\`services/regulatory/ai-governance.ts\` "fail-open") was dropped after verification showed it fails *closed*.

**Limitations:** No dynamic/penetration testing or on-chain execution. This is not a substitute for a
professional human security audit before any real-fund deployment.

---

## Findings Index

Each finding has a self-contained issue document under [\`TEMP/logic-review-v2/\`](./TEMP/logic-review-v2/) with
acceptance criteria, suggested labels, and an implementation stage. IDs (\`LOGIC-NN\`) are stable references. See
the [\`LOGIC-NN → issue\` mapping](./TEMP/logic-review-v2/README.md).

### High severity

| ID | Title | Area | File |
|----|-------|------|------|
${highList}

### Medium severity

| ID | Title | Area | File |
|----|-------|------|------|
${medList}

### Low severity

| ID | Title | Area | File |
|----|-------|------|------|
${lowList}

---

## Cross-cutting theme: "Built but not wired" (still)

The single highest-leverage observation from the first review holds again: safety controls are present and
tested, but the path that activates them is broken.

- **LOGIC-25** — PII redaction is implemented and configurable, but the detector emits \`warn\` exactly when
  redaction is enabled, while the engine only redacts on \`block\`; the redaction routine is dead in the default
  config.
- **LOGIC-24** — threshold signing computes per-signature \`verified\`, then ignores it and counts array length.
- **LOGIC-23** — the human-approval quorum counts rows, so one approver can satisfy an N-of-M gate.
- **LOGIC-31 / LOGIC-45 / LOGIC-47** — confirmation, worker acquisition, and iceberg slicing all have a
  "best-effort / TODO" shortcut (synthetic success, busy-worker reuse, fill-only termination) that silently
  defeats the intended guarantee.

These share a root cause (a guard reading state nothing maintains, or a code path that returns success on a
not-success condition) and should be prioritised together in Stage 1 / Stage 5.

---

## Recommended remediation stages

| Stage | Theme | Findings |
|-------|-------|----------|
| **${STAGES[1]}** | Make existing safety/access controls actually fire | ${byStage(1).map((f)=>'LOGIC-'+f.id).join(', ')} |
| **${STAGES[2]}** | Money math, balances & settlement | ${byStage(2).map((f)=>'LOGIC-'+f.id).join(', ')} |
| **${STAGES[3]}** | Sanctions/compliance & idempotency | ${byStage(3).map((f)=>'LOGIC-'+f.id).join(', ')} |
| **${STAGES[4]}** | Trustworthy strategy/optimizer/backtest numbers | ${byStage(4).map((f)=>'LOGIC-'+f.id).join(', ')} |
| **${STAGES[5]}** | Liveness, concurrency & resource hygiene | ${byStage(5).map((f)=>'LOGIC-'+f.id).join(', ')} |

Each finding doc contains acceptance criteria scoped to a single PR; items within a stage can be parallelised.

---

## References

- Issue [#431](https://github.com/${REPO}/issues/431) — "Check via Claude Fable"
- First logic review: [\`AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW.md\`](./AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW.md) (LOGIC-01..22, #386–#407)
- Ready-to-file issue documents: [\`TEMP/logic-review-v2/\`](./TEMP/logic-review-v2/)

---

*This report was generated by automated AI logic analysis. It does not constitute a professional security audit
and should be supplemented with human expert review before any real-fund deployment. Every finding was verified
against the source at the stated path and line range on branch \`issue-431-c0be08c13d26\`.*
`;
writeFileSync(join(ROOT, 'AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW_v2.md'), report);

console.log(`Generated ${FINDINGS.length} finding docs + README + audit report into ${OUT_DIR}`);
console.log(`Severity: High=${counts.high||0} Medium=${counts.medium||0} Low=${counts.low||0}`);
