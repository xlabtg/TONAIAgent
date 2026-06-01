# LOGIC-15 — AgentFactory multi-sig upgrade approval satisfiable by the single owner

**Severity:** 🟠 Medium
**Area:** Smart contracts (Tact)
**Stage:** 2 — Funds correctness
**Suggested labels:** `bug`, `severity:medium`, `area:contracts`
**Location:** `contracts/agent-factory.tact:279-294` (`ApproveUpgrade`)

## Problem

The proposal records an `approvalsRequired` threshold, implying an M-of-N multi-sig over the contract code
upgrade. But the handler is gated solely by `self.requireOwner()` and merely increments a counter without
recording **which** addresses approved. The single owner can call `ApproveUpgrade` repeatedly on the same
proposal to drive `approvalCount` up to `approvalsRequired` alone, marking the upgrade `executed`.

## Evidence

```tact
receive(msg: ApproveUpgrade) {
    self.requireOwner();                       // only the owner may approve
    ...
    p.approvalCount = p.approvalCount + 1;     // no tracking of WHICH approver
    if (p.approvalCount >= p.approvalsRequired) {
        p.executed = true;
        ...
    }
    self.upgradeProposals.set(msg.proposalId, p);
}
```

## Impact

The intended distributed-approval safeguard on contract upgrades is illusory — one key can authorize a
code-cell swap, removing the protection multi-sig is meant to provide against a single compromised owner
key. (Severity bounded because the live `set_code()` is left to deployer tooling, but the on-chain
`executed` authorization flag is fully bypassable.)

## Suggested fix

Restrict `ApproveUpgrade` to a registered admin set rather than only the owner, and record approvers in a
per-proposal `map<Address, Bool>`. Only increment `approvalCount` when `sender()` is an admin not already
counted for that proposal. Reject duplicate approvals.

## Acceptance criteria

- [ ] Each distinct approver counts at most once per proposal.
- [ ] A single key cannot reach `approvalsRequired` alone.
- [ ] Blueprint test: repeated approval from one key does not execute a 2-of-N proposal.
