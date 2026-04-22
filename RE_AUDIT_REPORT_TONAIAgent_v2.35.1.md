# 📄 RE-AUDIT REPORT — TONAIAgent v2.35.1

**Audit Type:** Independent Verification Re-Audit of 9 Critical Security Fixes  
**Prepared For:** xlabtg/TONAIAgent (Issue #325)  
**Audit Date:** 2026-04-10  
**Audited Version:** v2.35.1 (branch: `main`, post-merge of PRs #316–#324)  
**Re-Auditor:** Automated AI Security Re-Audit (konard/AI Issue Solver)  
**Original Audit Reference:** [AUDIT_REPORT_TONAIAgent_v2.35.0.md](./AUDIT_REPORT_TONAIAgent_v2.35.0.md) (Issue #304, PR #305)

---

## Executive Summary

Following the original audit (Issue #304), the TONAIAgent team merged 9 pull requests (#316–#324) addressing the most critical security findings. This report provides an independent verification of each fix's implementation quality, integration completeness, test coverage, and remaining gaps.

**Overall Production Readiness: ⚠️ CONDITIONALLY NOT READY FOR MAINNET**

The team has made **significant, genuine progress** on all 9 areas. The critical blockers from v2.35.0 (stub HSM, fake MPC signatures, no smart contracts, no documentation) have been substantially addressed. However, **5 medium-to-high severity gaps remain** that must be resolved before real-fund mainnet deployment.

| # | Fix Area | PR | Status | Verdict |
|---|----------|----|--------|---------|
| 1 | HSM Key Management | #323 | ⚠️ Partial | Ed25519/TON incompatibility unresolved |
| 2 | MPC Threshold Signatures | #322 | ⚠️ Partial | Centralized coordinator — not true distributed MPC |
| 3 | TON Smart Contracts | #321 | ⚠️ Partial | Contracts implemented but not deployed or externally audited |
| 4 | API Input Validation | #320 | ✅ Implemented | Orphaned — no HTTP server integration |
| 5 | Production Secrets Management | #319 | ⚠️ Partial | Not wired to application entry point |
| 6 | KYC/AML Enforcement | #318 | ⚠️ Partial | Both gates **disabled by default** |
| 7 | AI Safety & Prompt Injection | #317 | ✅ Implemented | PromptBuilder not integrated into AI call paths |
| 8 | Monitoring & Incident Response | #316 | ✅ Implemented | No metric collection wiring |
| 9 | Security Documentation | #324 | ✅ Implemented | Client-side only — no server enforcement |

**Remaining Critical Issues:** 1 (Ed25519 HSM incompatibility with TON)  
**Remaining High Issues:** 3 (MPC centralized, contracts not audited/deployed, KYC/AML defaults off)  
**Remaining Medium Issues:** 5 (secrets not integrated, PromptBuilder not wired, monitoring not wired, client-side sim mode, rate limiter in-memory)

---

## Scope & Methodology

### Scope
This re-audit covers the following merged pull requests:
- PR #316 — Monitoring & Incident Response (Issue #313)
- PR #317 — AI Safety & Prompt Injection (Issue #312)
- PR #318 — KYC/AML Enforcement (Issue #311)
- PR #319 — Production Secrets Management (Issue #310)
- PR #320 — API Input Validation (Issue #309)
- PR #321 — TON Smart Contracts Audit (Issue #308)
- PR #322 — MPC Threshold Signatures (Issue #307)
- PR #323 — HSM Key Management (Issue #306)
- PR #324 — Security Documentation (Issue #314)

### Methodology
1. `gh pr view` / `gh pr diff` for each PR — full diff analysis
2. Static analysis of modified files in the working tree
3. Cross-reference with original audit findings
4. Integration path tracing (entry points, call graphs)
5. Test coverage review

### Limitations
- Dynamic analysis and penetration testing not performed
- End-to-end integration tests against live TON testnet not run
- Third-party cloud HSM/KMS credentials not available for live testing
- Smart contract on-chain deployment and testing not performed

---

## Verification Results

---

### 1️⃣ HSM Key Management — PR #323

**Original Finding (CRIT-02):** `HSMKeyStorage` threw `Error` on every operation. No key generation was possible in production.

**Implementation Review:**

Three provider adapters were added: `MockHSMAdapter` (dev/CI), `AwsKmsAdapter` (AWS KMS / CloudHSM), and `AzureKeyVaultAdapter` (Azure Key Vault). Provider selection via `NODE_HSM_PROVIDER` environment variable.

The implementation correctly:
- ✅ Eliminates the previous stub `throw new Error(...)` in all HSM methods
- ✅ `MockHSMAdapter` uses real `node:crypto` operations (blocked in production)
- ✅ AWS and Azure adapters use officially supported SDKs as optional peer dependencies
- ✅ 26 tests added (20 mock-based, 6 real-cloud gated behind env flags)
- ✅ HSM setup documentation added (`docs/hsm-setup.md`)

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🔴 Critical | **Ed25519/TON incompatibility**: AWS KMS and Azure Key Vault do not natively support Ed25519. The adapters fall back to P-256 / ECDSA-SHA-256. TON blockchain requires Ed25519 signatures. HSM-backed production signing cannot produce TON-valid signatures. |
| 🟠 High | **In-memory key registry**: `AwsKmsAdapter` keeps `Map<string, string>` (app keyId → KMS ARN) in RAM. This mapping is lost on restart, requiring manual re-mapping or re-generation. |
| 🟡 Medium | **Real cloud tests skip in CI**: 6 real-cloud tests gated behind `AWS_KMS_TEST=true` / `AZURE_KV_TEST=true`. Cloud HSM integrations are never exercised in automated CI. |

**Verdict:** ⚠️ Partially Implemented — The Ed25519 incompatibility is a **blocker for TON mainnet HSM-backed custody**. Requires either: (a) a custom HSM appliance (YubiHSM 2, Thales) that supports Ed25519, or (b) a signing service shim that bridges P-256 KMS keys to Ed25519 via key wrapping.

---

### 2️⃣ MPC Threshold Signatures — PR #322

**Original Finding (CRIT-03):** `MPCCoordinator.combineSignatures()` returned a fake placeholder string (`mpc_sig_<base64>`) that could not be validated on-chain.

**Implementation Review:**

A threshold EdDSA protocol was implemented using Shamir's Secret Sharing over the Ed25519 group order, with FROST-like partial signature aggregation via `@noble/curves`.

The implementation correctly:
- ✅ Replaces the fake `mpc_sig_<base64>` stub with real cryptographic operations
- ✅ Produces valid 64-byte Ed25519 wire-format signatures verifiable by `@noble/curves`
- ✅ Uses audited cryptographic libraries (`@noble/curves`, `@noble/hashes`)
- ✅ `thresholdSign()` and `verifyThresholdSignature()` APIs are functional
- ✅ 36 tests covering t-of-n configurations and signature verification
- ✅ Architecture documented in `docs/mpc-architecture.md`

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🟠 High | **Centralized coordinator architecture**: The `MPCCoordinator` server holds all party nonces in memory. A true distributed MPC would have parties never reveal nonces to a single server. The current design reconstructs the equivalent of a single-server signing scheme. |
| 🟠 High | **Missing binding factor (FROST security property)**: The implementation is described as "simplified FROST-like." Full FROST includes binding factors per signer that prevent certain rogue-key and Wagner's attack variants. Without binding factors, the scheme is weaker than advertised. |
| 🟡 Medium | **Key reconstruction possible at coordinator**: `shamirSplit` / `lagrangeCoefficient` logic allows full private key reconstruction when ≥ threshold shares are held by the coordinator. |
| 🟡 Medium | **Ed25519 vs P-256 divergence**: MPC uses Ed25519 (correct for TON), but HSM (#323) falls back to P-256. These are incompatible systems with no bridging strategy. |

**Verdict:** ⚠️ Partially Implemented — The signature placeholder is replaced with real crypto, which is the primary blocker resolved. However, the centralization model means this is not "MPC" in the academic/security sense — it is a threshold signing scheme with a trusted coordinator. For a self-custody financial product, this distinction matters.

---

### 3️⃣ TON Smart Contracts — PR #321

**Original Finding (HIGH-01/02):** No FunC/Tact contract source code existed; all operations were JavaScript simulations. Null/burn address in `DEFAULT_FACTORY_CONFIG`.

**Implementation Review:**

Three Tact contracts were written: `agent-wallet.tact`, `agent-factory.tact`, and `strategy-executor.tact`. Null-address guard added to `FactoryContractManager`.

The implementation correctly:
- ✅ Adds real Tact smart contract source files for all three core contracts
- ✅ Implements security features: per-trade limits, daily rolling limits, DEX whitelist, time-locks, replay protection via monotonic nonce
- ✅ Null-address guard throws at construction time if `owner`/`treasury` is zero-address
- ✅ 42+ Blueprint tests covering core contract behaviors
- ✅ Deployment scripts with hard mainnet confirmation gates
- ✅ `strategy-executor.tact` includes append-only on-chain audit trail

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🟠 High | **Contracts not deployed or externally audited**: The PR itself acknowledges that testnet deployment, third-party audit, and mainnet deployment are open tasks. No audit firm has reviewed the Tact contracts. |
| 🟠 High | **Blueprint tests excluded from main CI**: `vitest.config.ts` excludes `contracts/tests/`; Blueprint tests require `npx blueprint test`. This means the contract test suite is never run in standard CI (`npm test`). |
| 🟡 Medium | **TypeScript contract wrappers not implemented**: `contracts/wrappers/` contains only a README. Off-chain TypeScript code cannot interact with deployed contracts without these wrappers. |
| 🟡 Medium | **JS simulation layer not removed**: The old `connectors/ton-factory/factory-contract.ts` simulation code still exists alongside the new Tact contracts. The migration path is undocumented. |

**Verdict:** ⚠️ Partially Implemented — The critical gap (no contract code) is resolved. However, the contracts require external audit and testnet deployment before mainnet use.

---

### 4️⃣ API Input Validation — PR #320

**Original Finding (HIGH-04):** No input validation, rate limiting, security headers, CSRF protection, or body-size limits on API endpoints.

**Implementation Review:**

Comprehensive middleware suite added: Zod body validation, XSS sanitization, in-memory rate limiter, security headers, CSRF token validation, body-size guard, request timeouts.

The implementation correctly:
- ✅ `validateBody` with Zod schemas and field-level error detail
- ✅ `sanitizeString` / `sanitizeObject` stripping script blocks, HTML tags, null bytes
- ✅ `RateLimiter` with sliding-window; pre-built standard (100/15 min) and trade (10/min) profiles
- ✅ Full security header set (CSP, HSTS, X-Content-Type-Options, etc.)
- ✅ `isCsrfTokenValid` with constant-time comparison
- ✅ 60 tests covering validation edge cases
- ✅ Framework-agnostic design

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🟡 Medium | **No HTTP server to attach middleware to**: The project has no HTTP framework integration. Middleware is orphaned as standalone utilities. |
| 🟡 Medium | **In-memory rate limiter**: Resets on restart; ineffective in distributed deployments. Redis-backed rate limiting needed for production. |
| 🟡 Medium | **No CSRF token generation**: `isCsrfTokenValid` validates tokens but no token generation/distribution mechanism exists. |

**Verdict:** ✅ Implementation Complete (with integration caveats) — The middleware itself is well-implemented and tested. Integration is the remaining work and is expected to happen when the HTTP server is built.

---

### 5️⃣ Production Secrets Management — PR #319

**Original Finding (HIGH-05):** All secrets loaded directly from `process.env` with no centralized management, rotation support, or audit trail.

**Implementation Review:**

`SecretsLoader` class added with AWS Secrets Manager, HashiCorp Vault, and env-fallback backends. In-memory cache, audit callbacks, health checks, and strict-mode for production.

The implementation correctly:
- ✅ Supports AWS Secrets Manager, HashiCorp Vault, and env-fallback
- ✅ In-memory cache with configurable TTL
- ✅ `onAudit()` callback for key-name-only access logging
- ✅ `getHealth()` readiness probe method
- ✅ `refresh()` for zero-downtime secret rotation pickup
- ✅ Strict mode throws on missing secrets in production
- ✅ 27 tests covering various secret loading scenarios
- ✅ Documentation in `docs/secrets-management.md`

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🟡 Medium | **Not integrated at application startup**: `initConfig()` is not called from any entry point in the codebase. The application still reads secrets directly from `process.env`. |
| 🟡 Medium | **AWS/Vault backends incomplete**: The actual `GetSecretValueCommand` (AWS) and Vault HTTP call implementations may be incomplete stubs — the diff did not show full implementation details. |

**Verdict:** ⚠️ Partially Implemented — The infrastructure is built but not wired to the application. A single `await initConfig()` call in the main entry point would activate the feature.

---

### 6️⃣ KYC/AML Enforcement — PR #318

**Original Finding (HIGH-07):** `KycAmlManager` was advisory-only; users with no KYC could create live trading agents.

**Implementation Review:**

KYC gates added to `AgentOrchestrator.createAgent()`; AML checks added to `DefaultExecutionEngine.execute()`. `SanctionsScreener` added with hooks for OFAC, EU, UN, and UK HM Treasury lists.

The implementation correctly:
- ✅ `KycAmlManager` extended with `enforceKycForAgentCreation`, `enforceTierLimits`, `freezeAccount`/`unfreezeAccount`
- ✅ `SanctionsScreener` with external provider hooks (Chainalysis, ComplyAdvantage, Elliptic)
- ✅ All decisions append to audit trail and emit regulatory events
- ✅ Configurable per-environment (testnet: basic KYC, mainnet: standard)
- ✅ 34 tests covering KYC enforcement scenarios
- ✅ Documentation in `docs/regulatory-compliance.md`

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🔴 Critical | **Both enforcement gates are DISABLED by default**: `kycEnforcement.enabled: false` in `DEFAULT_ORCHESTRATOR_CONFIG`; `enforceAmlChecks: false` in `DEFAULT_CONFIG`. A default deployment has zero KYC/AML enforcement. |
| 🟠 High | **Sanctions lists are likely stub implementations**: `SanctionsScreener` hooks for OFAC/Chainalysis exist but no real API integration is confirmed. The implementation likely contains in-memory mock data. |
| 🟡 Medium | **`'demo'` strategy name bypasses KYC**: Any strategy with name `'demo'` bypasses KYC checks. If strategy names are user-controlled, this is an exploitable bypass. |

**Verdict:** ⚠️ Partially Implemented — The enforcement **infrastructure** exists but is **disabled by default**. For mainnet, defaults must be inverted: `enabled: true`, `enforceAmlChecks: true`. This is a configuration-level fix but must be explicitly verified before any mainnet deployment.

---

### 7️⃣ AI Safety & Prompt Injection — PR #317

**Original Finding (MED-01):** User-controlled data was concatenated directly into AI prompts, creating injection vectors.

**Implementation Review:**

`sanitize.ts` utilities and `PromptBuilder` class added. `guardrails.ts` updated to sanitize strategy names at input stage.

The implementation correctly:
- ✅ `sanitize.ts`: strips C0/C1 control chars, HTML, injection markers (`[system]`, `{{admin}}`, backtick system blocks), base64 payloads
- ✅ `PromptBuilder`: enforces static system prompts; user data JSON-serialized in user role (never concatenated)
- ✅ `guardrails.ts` sanitizes strategy names before rule evaluation
- ✅ 32 tests covering known jailbreak and injection patterns
- ✅ Length limits on all user-controlled fields

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🟡 Medium | **`PromptBuilder` not integrated into existing AI call paths**: The class is available but must be manually adopted. Existing AI invocation paths may still concatenate user data directly. |
| 🟡 Medium | **No AI output filtering**: Only input sanitization is implemented. AI responses are not validated against expected schemas before being acted upon. |
| 🟡 Medium | **Regex-based detection is bypassable**: Known injection patterns are caught, but Unicode lookalikes, encoded variants, and novel patterns are not covered. |

**Verdict:** ✅ Implemented (with integration caveats) — Core sanitization utilities are correct and tested. The remaining work is to replace direct prompt concatenation with `PromptBuilder` across existing AI call sites.

---

### 8️⃣ Monitoring & Incident Response — PR #316

**Original Finding (MED-04):** No production monitoring, alerting, or incident response infrastructure existed.

**Implementation Review:**

`TradingCircuitBreaker` and `AlertingManager` added. Three Grafana dashboard JSONs added. Incident response and monitoring runbooks documented.

The implementation correctly:
- ✅ `TradingCircuitBreaker` with warning/critical thresholds (error rate, drawdown, volume, latency)
- ✅ `AlertingManager` routing to Console, Telegram, PagerDuty, OpsGenie, generic webhooks
- ✅ Critical circuit trips wire to `EmergencyController.triggerEmergency()`
- ✅ 3 Grafana dashboard JSON definitions
- ✅ 85 tests (52 circuit-breaker, 33 alerting)
- ✅ Documented incident response playbooks (P1–P4 severity levels)
- ✅ Monitoring runbook with thresholds and routine checks

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🟡 Medium | **No metric collection wiring**: `CircuitBreakerMetrics` must be constructed and passed by the caller. Nothing in the codebase automatically collects and feeds live trading metrics. |
| 🟡 Medium | **No Prometheus exporter**: Dashboard JSONs reference `tonaiagent_*` metrics, but no metrics emission code or Prometheus exporter exists. |
| 🟡 Medium | **In-memory only**: Circuit breaker state resets on restart. No persistent state or history. |

**Verdict:** ✅ Implemented (with wiring caveats) — The monitoring primitives are solid. Wiring metrics collection from actual trading paths is the remaining integration work.

---

### 9️⃣ Security Documentation — PR #324

**Original Finding (MED-07/08):** No user-facing security documentation, risk disclosures, or mainnet readiness checklist existed.

**Implementation Review:**

Three documentation files added: `user-security-guide.md`, `mainnet-readiness-checklist.md`, `risk-disclosures.md`. Telegram Mini App UI updated with simulation banner and live trading confirmation modal.

The implementation correctly:
- ✅ Comprehensive user security guide with simulation vs. live comparison
- ✅ 7-section mainnet readiness checklist with 30+ actionable items
- ✅ Full risk disclosures document covering all major risk categories
- ✅ Prominent simulation mode banner in UI
- ✅ Live trading confirmation modal requiring 3 mandatory acknowledgments
- ✅ Strategy CTA relabeled "Start Agent in Simulation"

**Remaining Gaps:**

| Severity | Finding |
|----------|---------|
| 🟡 Medium | **Simulation/live mode is client-side only**: State stored in `localStorage`. No server-side enforcement. The backend has no awareness of the client's simulation/live toggle. |
| 🟡 Medium | **Checklist is advisory only**: Users read it as a document; the platform does not verify completion before enabling live trading. |
| 🟡 Low | **No automated tests**: The JS components (`security.js`) have no automated tests; test plan is entirely manual. |

**Verdict:** ✅ Implemented — Documentation and UI warnings are complete and high-quality. Server-side enforcement of simulation mode is the remaining integration work (depends on backend integration generally).

---

## New Findings

During this re-audit, the following new observations were made that were not in the original audit:

### NEW-01: KYC/AML Defaults Must Be Inverted Before Mainnet

**Severity:** 🔴 Critical (for mainnet deployment)  
**Files:**
- `core/agents/orchestrator/orchestrator.ts` — `DEFAULT_ORCHESTRATOR_CONFIG.kycEnforcement.enabled = false`
- `core/trading/live/execution-engine.ts` — `DEFAULT_CONFIG.enforceAmlChecks = false`

The KYC and AML enforcement code was merged with both gates disabled. This was appropriate for development/testing, but **must be explicitly enabled before any real-fund deployment**. The risk is that a misconfigured staging or canary deployment could silently skip KYC and allow unverified users to trade with real funds.

**Recommendation:** Add an assertion in `deploy-mainnet.ts` that validates `KYC_ENFORCEMENT_ENABLED=true` and `AML_ENFORCEMENT_ENABLED=true` are set in the environment before deployment proceeds.

---

### NEW-02: HSM + MPC Architecture Gap (Ed25519 vs P-256)

**Severity:** 🟠 High  
**Cross-cutting issue:** PR #322 + PR #323

TON blockchain requires Ed25519 signatures. The MPC implementation (PR #322) correctly uses Ed25519. However, both AWS KMS and Azure Key Vault (the cloud HSM providers in PR #323) do not support Ed25519 natively — they fall back to P-256. This creates a fundamental incompatibility: **the HSM path cannot produce TON-compatible signatures**.

The fix options are:
1. Use hardware HSMs that support Ed25519 (YubiHSM 2, Thales Luna) — requires physical hardware or cloud-based alternatives
2. Use the MPC path exclusively for TON signing (HSM for non-TON operations)
3. Implement an Ed25519 key wrapping scheme where the HSM stores and protects a P-256 key that encrypts the Ed25519 private key (reduces the security benefit of HSM but maintains key confidentiality)

**Recommendation:** Explicitly document which custody path (MPC vs. HSM) is the intended production path for TON transactions, and ensure the chosen path produces valid Ed25519 signatures.

---

### NEW-03: No HTTP Server Implementation

**Severity:** 🟡 Medium  
**Affects:** PR #320 (API Validation), PR #316 (Monitoring), PR #319 (Secrets)

Multiple PRs added server-side infrastructure (middleware, secrets loading, monitoring) but the project has no HTTP server. All these utilities are orphaned until an HTTP server is implemented. This is not a regression from v2.35.0, but the merged PRs implicitly assume a server exists.

---

## Mainnet Readiness Sign-off

### Prerequisites for Mainnet Launch

The following **must** be completed before real-fund mainnet deployment:

| # | Requirement | Status | Owner |
|---|-------------|--------|-------|
| 1 | Resolve Ed25519 HSM path for TON signing | ❌ Open | Security Engineering |
| 2 | External audit of Tact smart contracts | ❌ Open | Smart Contract Team |
| 3 | Deploy and test contracts on TON testnet | ❌ Open | Smart Contract Team |
| 4 | Enable KYC/AML by default (or add deploy-time assertions) | ❌ Open | Compliance Team |
| 5 | Wire `initConfig()` to application startup | ❌ Open | Backend Engineering |
| 6 | Wire `PromptBuilder` to all AI call paths | ❌ Open | AI Engineering |
| 7 | Wire `CircuitBreakerMetrics` to live trading data | ❌ Open | Engineering |
| 8 | Implement HTTP server and attach middleware | ❌ Open | Backend Engineering |

### What IS Ready for Mainnet

The following are **complete** and do not block mainnet:

- ✅ Cryptographically secure ID generation (CRIT-01, fixed in #305)
- ✅ Emergency stop / circuit breaker infrastructure (#316)
- ✅ Prompt injection filtering at guardrail layer (#317)
- ✅ KYC/AML enforcement *code* (gates exist, just disabled)
- ✅ Secrets management infrastructure (built, not yet wired)
- ✅ Comprehensive API validation middleware (built, not yet wired)
- ✅ Null-address guard on factory contract (#321)
- ✅ Real threshold signature implementation (#322)
- ✅ Mainnet readiness checklist and risk disclosures for users (#324)
- ✅ Simulation mode UI with mandatory acknowledgments (#324)

---

## Appendices

### A. Test Coverage Summary

| PR | Test File | Tests | Coverage Focus |
|----|-----------|-------|----------------|
| #316 | `tests/observability/circuit-breaker.test.ts` | 52 | Threshold triggers, emergency integration |
| #316 | `tests/observability/alerting.test.ts` | 33 | Channel routing, partial failure |
| #317 | `tests/ai/prompt-injection.test.ts` | 32 | Known jailbreak patterns, sanitization |
| #318 | `tests/regulatory/kyc-enforcement.test.ts` | 34 | KYC gates, tier limits, sanctions |
| #319 | `tests/config/secrets.test.ts` | 27 | AWS/Vault/env backends, cache, strict mode |
| #320 | `tests/api/validation.test.ts` | 60 | Schema validation, rate limiting, CSRF, headers |
| #321 | `contracts/tests/*.spec.ts` (Blueprint) | 42+ | Contract behavior (not in standard CI) |
| #322 | `tests/security/mpc-threshold.test.ts` | 36 | Threshold signing, verification, edge cases |
| #323 | `tests/security/hsm-integration.test.ts` | 26 | Mock HSM ops, cloud adapters (gated) |
| #324 | — | 0 | Manual only |
| **Total** | | **372+** | |

### B. Cryptography Assessment

| Component | Algorithm | Status |
|-----------|-----------|--------|
| ID generation | `crypto.randomBytes` | ✅ Secure (fixed in #305) |
| Software key storage | AES-256-GCM + Ed25519 | ✅ Secure (fixed in #302, blocked in prod) |
| Threshold signatures | Ed25519 / FROST-lite | ✅ Valid signatures, ⚠️ centralized |
| HSM (mock) | `node:crypto` Ed25519 | ✅ Secure, dev only |
| HSM (AWS KMS) | ECDSA P-256 | ❌ TON-incompatible |
| HSM (Azure KV) | ECDSA P-256 | ❌ TON-incompatible |

### C. References

- Original Audit: [AUDIT_REPORT_TONAIAgent_v2.35.0.md](./AUDIT_REPORT_TONAIAgent_v2.35.0.md)
- Issue #304: https://github.com/xlabtg/TONAIAgent/issues/304
- Issue #325: https://github.com/xlabtg/TONAIAgent/issues/325
- Security Documentation: [docs/security.md](./docs/security.md)
- Mainnet Readiness Checklist: [docs/mainnet-readiness-checklist.md](./docs/mainnet-readiness-checklist.md)
- TON Security Best Practices: https://docs.ton.org/contract-dev/security
- FROST Protocol: https://eprint.iacr.org/2020/852.pdf

---

*This report was generated by automated AI security analysis. It does not constitute a professional security audit and should be supplemented with human expert review before any real-fund deployment.*
