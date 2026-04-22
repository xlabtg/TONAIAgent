# TONAIAgent Smart Contracts — External Audit Report v1

> **Status:** PLACEHOLDER — To be completed by the external audit firm.
>
> This file will be replaced with the auditor's final report. The template
> below documents the expected structure agreed with the audit team.

---

## Report Metadata

| Field | Value |
|-------|-------|
| Project | TONAIAgent Smart Contracts |
| Audit firm | _(To be filled by auditor)_ |
| Report version | 1.0 |
| Audit started | _(date)_ |
| Audit completed | _(date)_ |
| Commit / tag audited | _(git SHA or tag)_ |
| Contracts in scope | `agent-wallet.tact`, `agent-factory.tact`, `strategy-executor.tact` |
| Blockchain | TON (The Open Network) |
| Language | Tact |
| Framework | Blueprint / @ton/sandbox |

---

## Executive Summary

_(To be completed by the audit firm.)_

A brief summary of the overall security posture, the number of findings by severity, and any major recommendations.

---

## Scope

### Contracts Audited

| Contract | File | Lines of Code |
|----------|------|--------------|
| `AgentWallet` | `contracts/agent-wallet.tact` | ~333 |
| `AgentFactory` | `contracts/agent-factory.tact` | ~317 |
| `StrategyExecutor` | `contracts/strategy-executor.tact` | ~399 |

### Out of Scope

- FunC standard library (`@stdlib/deploy`, `@stdlib/ownable`)
- Off-chain orchestrator logic
- Frontend and backend infrastructure
- Third-party integrations (DEXes, bridges)

---

## Findings Summary

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| _(AF-01)_ | _(Finding title)_ | Critical / High / Medium / Low / Informational | Open / Fixed / Acknowledged |

---

## Detailed Findings

### [SEVERITY] Finding ID: Title

**Severity:** Critical / High / Medium / Low / Informational  
**Location:** `contracts/<file>.tact`, line(s) N–M  
**Status:** Open / Fixed in commit `<sha>` / Acknowledged

#### Description

_(Clear description of the vulnerability or issue.)_

#### Impact

_(What an attacker can do if this is exploited; what assets are at risk.)_

#### Proof of Concept

```tact
// Minimal reproducer (if applicable)
```

#### Recommendation

_(Specific code change or design recommendation.)_

#### Team Response

_(TONAIAgent team's response and remediation plan.)_

---

## Automated Analysis Results

| Tool | Version | Command | Findings |
|------|---------|---------|---------|
| _(tool name)_ | _(version)_ | _(command used)_ | _(summary)_ |

---

## Test Coverage Observations

_(Auditor's observations on Blueprint test coverage, including any test gaps identified.)_

---

## Disclaimer

_(Standard audit firm disclaimer.)_

---

*This file is a placeholder. The completed report will be published here after the external audit engagement concludes and all Critical/High findings are resolved.*
