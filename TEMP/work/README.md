# WORK — Ready-Made Issue Templates for TONAIAgent v2.35.1 Re-Audit Gaps

> Generated as part of Issue #325: Re-audit verification of PRs #316–#324.
> Date: 2026-04-22
> Source report: [`RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md`](../../RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md)

This folder contains ready-made issue documents for each gap identified in the independent re-audit of TONAIAgent v2.35.1. Each file is written in the same style as the originals in [`../NEXT/`](../NEXT/) so it can be pasted directly into a new GitHub issue.

## How to use

For each file:
1. Open it in the editor.
2. Copy the entire contents.
3. Create a new issue at https://github.com/xlabtg/TONAIAgent/issues/new.
4. Use the first `# ...` heading as the issue title (strip the leading `Task: `), paste the rest as the body.
5. Apply the suggested labels (listed at the top of each file).

## Priority Order

### 🔴 CRITICAL — Must resolve before any real-fund mainnet deployment

| # | Task | File | Source Finding |
|---|------|------|----------------|
| 01 | Invert KYC/AML enforcement defaults for mainnet | [`01-kyc-aml-defaults.md`](./01-kyc-aml-defaults.md) | NEW-01, §6 |
| 02 | Resolve Ed25519/TON incompatibility in HSM signing path | [`02-hsm-ed25519-ton.md`](./02-hsm-ed25519-ton.md) | NEW-02, §1 |

### 🟠 HIGH — Required for safe mainnet operation

| # | Task | File | Source Finding |
|---|------|------|----------------|
| 03 | Externally audit and deploy Tact smart contracts | [`03-contracts-external-audit.md`](./03-contracts-external-audit.md) | §3 |
| 04 | Enable Blueprint contract tests in main CI | [`04-contracts-ci.md`](./04-contracts-ci.md) | §3 |
| 05 | Decentralize MPC coordinator and add FROST binding factors | [`05-mpc-hardening.md`](./05-mpc-hardening.md) | §2 |
| 06 | Integrate real sanctions screening providers | [`06-sanctions-screening.md`](./06-sanctions-screening.md) | §6 |
| 07 | Persist AWS KMS key registry (remove in-memory Map) | [`07-hsm-key-registry-persistence.md`](./07-hsm-key-registry-persistence.md) | §1 |

### 🟡 MEDIUM — Required integrations of already-built infrastructure

| # | Task | File | Source Finding |
|---|------|------|----------------|
| 08 | Implement HTTP server and wire API validation middleware | [`08-http-server-wiring.md`](./08-http-server-wiring.md) | NEW-03, §4 |
| 09 | Wire `initConfig()` / `SecretsLoader` to application startup | [`09-secrets-wiring.md`](./09-secrets-wiring.md) | §5 |
| 10 | Adopt `PromptBuilder` across all AI call paths | [`10-promptbuilder-adoption.md`](./10-promptbuilder-adoption.md) | §7 |
| 11 | Add AI output schema validation and response filtering | [`11-ai-output-validation.md`](./11-ai-output-validation.md) | §7 |
| 12 | Wire `CircuitBreakerMetrics` and add Prometheus exporter | [`12-metrics-wiring.md`](./12-metrics-wiring.md) | §8 |
| 13 | Replace in-memory rate limiter with Redis-backed store | [`13-distributed-rate-limit.md`](./13-distributed-rate-limit.md) | §4 |
| 14 | Implement CSRF token generation and distribution | [`14-csrf-token-generation.md`](./14-csrf-token-generation.md) | §4 |
| 15 | Persist circuit breaker state across restarts | [`15-circuit-breaker-persistence.md`](./15-circuit-breaker-persistence.md) | §8 |
| 16 | Enforce simulation/live mode server-side | [`16-simulation-mode-server-enforcement.md`](./16-simulation-mode-server-enforcement.md) | §9 |
| 17 | Gate live trading on mainnet readiness checklist completion | [`17-checklist-enforcement.md`](./17-checklist-enforcement.md) | §9 |
| 18 | Implement TypeScript wrappers for Tact contracts | [`18-contract-wrappers.md`](./18-contract-wrappers.md) | §3 |
| 19 | Remove or document JS factory simulation layer | [`19-js-simulation-layer-cleanup.md`](./19-js-simulation-layer-cleanup.md) | §3 |
| 20 | Close `'demo'` strategy name KYC bypass | [`20-demo-strategy-bypass.md`](./20-demo-strategy-bypass.md) | §6 |
| 21 | Audit real cloud HSM adapters in CI (nightly) | [`21-hsm-cloud-ci.md`](./21-hsm-cloud-ci.md) | §1 |

### 🟢 LOW — Quality / defense-in-depth

| # | Task | File | Source Finding |
|---|------|------|----------------|
| 22 | Add automated tests for Telegram Mini App security UI | [`22-mini-app-security-tests.md`](./22-mini-app-security-tests.md) | §9 |
| 23 | Harden prompt-injection detection beyond regex | [`23-prompt-injection-hardening.md`](./23-prompt-injection-hardening.md) | §7 |

## Summary

- **Total tasks:** 23
- **Critical:** 2
- **High:** 5
- **Medium:** 14
- **Low:** 2

Use [`../../RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md`](../../RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md) for the full findings context.
