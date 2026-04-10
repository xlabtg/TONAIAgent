# Security Fix PRs Research: xlabtg/TONAIAgent PRs 316–324

Researched on: 2026-04-10

## File Structure Context

```
/tmp/gh-issue-solver-1775813712111/core/security/
  audit.ts
  authorization.ts
  custody.ts
  emergency.ts
  index.ts
  key-management.ts
  policy.ts
  risk.ts
  types.ts

/tmp/gh-issue-solver-1775813712111/contracts/
  agent-factory.tact
  agent-wallet.tact
  blueprint.config.ts
  strategy-executor.tact
  tests/
  wrappers/
```

---

## PR #316 — Monitoring & Incident Response (Issue #313)

### Original Problem
No production monitoring, alerting, or incident response infrastructure existed. There was no automated way to detect trading anomalies, no alerting pipeline, no Grafana dashboards, and no defined incident response procedures.

### Files Changed
- `services/observability/circuit-breaker.ts` (new)
- `services/observability/alerting.ts` (new)
- `services/observability/index.ts` (new)
- `infrastructure/grafana/agent-overview.json` (new)
- `infrastructure/grafana/trading-performance.json` (new)
- `infrastructure/grafana/system-health.json` (new)
- `infrastructure/grafana/README.md` (new)
- `docs/incident-response.md` (new)
- `docs/monitoring-runbook.md` (new)
- `tests/observability/circuit-breaker.test.ts` (new)
- `tests/observability/alerting.test.ts` (new)

### Core Implementation Approach
- `TradingCircuitBreaker`: evaluates a `CircuitBreakerMetrics` snapshot on every `checkAndTrip()` call. Fires structured `CircuitTripEvent`s (warning + critical levels). Critical breaches call `EmergencyController.triggerEmergency()`, wiring monitoring directly to the emergency stop.
- `AlertingManager`: routes `AlertEvent`s to Console, Telegram, PagerDuty (Events API v2), OpsGenie, and generic Webhooks. Each channel fails independently.
- 3 Grafana dashboards (agent overview, trading performance, system health) as JSON definitions.
- Incident response runbook with P1–P4 severity levels and 7 specific playbooks.
- Monitoring runbook with architecture diagrams, thresholds, channel setup, and routine checks.
- 85 tests total (52 circuit-breaker, 33 alerting).

**Thresholds:**
| Metric | Warning | Critical |
|--------|---------|----------|
| Agent error rate | >5% / window | >20% / window |
| Portfolio drawdown | >-10% | >-20% |
| Trade volume ratio | 3× avg | 10× avg |
| Key management errors | — | Any |
| API latency p99 | >2 s | >5 s |

### Gaps / Issues
- **No HTTP server integration**: The circuit breaker and alerting are standalone TypeScript services with no wiring to actual API handlers or metric collection pipelines. The dashboards reference `tonaiagent_*` Prometheus metrics, but no Prometheus exporter or metric emission code was added.
- **In-memory only**: No persistent state for the circuit breaker — a restart resets all thresholds and trip history.
- **Grafana JSON only**: The dashboard files are raw JSON definitions; there is no Prometheus metrics scrape setup, no docker-compose for Grafana, and no automated provisioning.
- **Alerting channels are partial mocks**: The Telegram, PagerDuty, OpsGenie implementations make real HTTP calls but have no retry logic, rate limiting, or dead-letter queue for failed alerts.
- **No metric collection wiring**: The `CircuitBreakerMetrics` object must be constructed and passed by the caller — nothing in the codebase actually collects and feeds these metrics automatically.

---

## PR #317 — AI Safety & Prompt Injection (Issue #312)

### Original Problem
User-controlled data (strategy names, market conditions, addresses) was being concatenated directly into AI prompts, creating injection attack vectors where malicious input could override system instructions or exfiltrate data.

### Files Changed
- `core/ai/sanitize.ts` (new)
- `core/ai/prompt-builder.ts` (new)
- `core/ai-safety/guardrails.ts` (modified — added sanitization gate)
- `tests/ai/prompt-injection.test.ts` (new)

### Core Implementation Approach
- `sanitize.ts`: utilities `sanitizeUserInput`, `sanitizeStrategyName`, `sanitizeMarketData`, `sanitizeAddress`. Strips ASCII control characters (C0/C1), HTML tags/comments, prompt-injection markers (`[system]`, `{{admin}}`, backtick system blocks), base64 payloads, with per-field length limits.
- `PromptBuilder` class: enforces static system prompts (zero user data in system role). User-controlled values are JSON-serialized in the `user` role — never string-concatenated into instructions.
- `guardrails.ts` modified: sanitizes `strategy.name` and `strategy.type` at input stage before rule evaluation.
- 32 tests covering known jailbreak and injection patterns.

### Gaps / Issues
- **PromptBuilder is not integrated**: The `PromptBuilder` class is implemented but there is no evidence it is actually called anywhere in the existing AI invocation code paths. It is available as a utility but requires manual adoption.
- **Regex-based injection detection is bypassable**: The `removeInjectionMarkers` patterns catch known patterns but are easily circumvented by Unicode lookalikes, encoded variants, or novel patterns not yet in the list.
- **No output filtering**: Only input sanitization is implemented. AI model responses are not validated against expected schemas before being acted upon.
- **`sanitizeAddress` is a stub**: The function exists but the implementation details (e.g., TON address format validation) are not shown in the diff; it may only strip characters rather than validate the address format.

---

## PR #318 — KYC/AML Enforcement (Issue #311)

### Original Problem
The existing `KycAmlManager` was advisory-only — it could be queried but never blocked operations. Users with no KYC could create live trading agents on mainnet, and trades exceeding per-tier limits were not blocked.

### Files Changed
- `services/regulatory/kyc-aml.ts` (modified — added enforcement methods)
- `services/regulatory/sanctions.ts` (new)
- `services/regulatory/types.ts` (modified — new event types)
- `services/regulatory/index.ts` (modified)
- `core/agents/orchestrator/orchestrator.ts` (modified — KYC gate on `createAgent`)
- `core/agents/orchestrator/types.ts` (modified — new error codes)
- `core/trading/live/execution-engine.ts` (modified — AML check before execution)
- `docs/regulatory-compliance.md` (new)
- `tests/regulatory/kyc-enforcement.test.ts` (new, 34 tests)

### Core Implementation Approach
- `KycAmlManager` extended with: `enforceKycForAgentCreation`, `enforceTierLimits`, `freezeAccount`/`unfreezeAccount`, `getAuditLog`. All decisions appended to audit trail and emitted as regulatory events.
- `SanctionsScreener`: address/entity screening against OFAC SDN, EU Consolidated, UN Security Council, UK HM Treasury lists. Results cached 24h. External provider hooks for Chainalysis, ComplyAdvantage, Elliptic.
- `AgentOrchestrator.createAgent`: KYC gate before provisioning. Configurable per-environment (testnet: basic, mainnet: standard). Demo strategy bypasses the gate.
- `DefaultExecutionEngine.execute`: AML transaction check before routing when `enforceAmlChecks: true`.
- **KYC enforcement is disabled by default** (`enabled: false` in `DEFAULT_ORCHESTRATOR_CONFIG`).
- **AML enforcement is disabled by default** (`enforceAmlChecks: false` in `DEFAULT_CONFIG`).

### Gaps / Issues
- **Both enforcement gates are opt-in and disabled by default**: A deployment that doesn't explicitly set `kycEnforcement.enabled: true` and `enforceAmlChecks: true` gets zero KYC/AML enforcement. This is dangerous for mainnet readiness.
- **Sanctions lists are stub implementations**: `SanctionsScreener` likely contains in-memory mock data rather than connections to real external sanctions databases. No real API integration to OFAC/Chainalysis is wired.
- **No real-time list updates**: The 24h cache is good, but there is no mechanism to subscribe to live sanctions list updates.
- **Tier limits enforcement**: `enforceTierLimits` is added but must be explicitly called by the execution engine — it is not automatically enforced on all trades.
- **Demo bypass is broad**: Any strategy named `'demo'` bypasses KYC entirely, which could be exploited if the strategy name is user-controlled.

---

## PR #319 — Production Secrets Management (Issue #310)

### Original Problem
All secrets (API keys, JWT secrets, encryption keys) were being loaded directly from environment variables with no centralized management, no rotation support, no audit trail, and no integration with secrets managers.

### Files Changed
- `config/secrets.types.ts` (new)
- `config/secrets.ts` (new — `SecretsLoader` class)
- `config/index.ts` (new — `AppConfig` entry point)
- `docs/secrets-management.md` (new)
- `.env.example` (modified — annotated with secrets manager guidance)
- `eslint.config.mjs` (modified — includes `config/` directory)
- `tsconfig.json` (modified — includes `config/` directory)
- `tests/config/secrets.test.ts` (new, 27 tests)

### Core Implementation Approach
- `SecretsLoader` class: supports AWS Secrets Manager (Option A), HashiCorp Vault (Option B), and environment variable fallback for local dev.
- In-memory cache with configurable TTL (default 5 min) to reduce backend API calls.
- Audit log for all secret reads (key names only, never values) via `onAudit()` callback.
- `getHealth()` method for readiness probe integration.
- `refresh()` for zero-downtime secret rotation pickup.
- Strict mode: throws on missing secrets in production.
- `initConfig()` / `initSecrets()` startup entry points.

### Gaps / Issues
- **Not integrated at application startup**: `initConfig()` is defined but there is no evidence it is called from `main.ts` or any entry point in the existing codebase. The app likely still reads secrets directly from `process.env`.
- **AWS/Vault backends are partial implementations**: The SDK clients are loaded dynamically, but the actual AWS `GetSecretValueCommand` and Vault `GET /v1/secret/data/...` call implementations were not shown fully in the diff — they may be incomplete stubs.
- **No secret re-encryption workflow**: The runbook mentions that rotating `KEY_ENCRYPTION_KEY` requires re-encrypting all stored keys, but there is no tooling to perform this migration automatically.
- **Single secrets bundle**: All secrets are loaded as one blob from the secrets manager. There is no per-secret granular access control or rotation scheduling.
- **`tsconfig.json` and `eslint.config.mjs` changes**: Including `config/` required modifying build configuration, suggesting the module was not cleanly integrated into the existing structure.

---

## PR #320 — API Input Validation (Issue #309)

### Original Problem
No input validation, rate limiting, security headers, CSRF protection, or body size limits existed on API endpoints. The system was vulnerable to oversized payloads, XSS via reflected inputs, CSRF attacks, and brute-force/DoS via unlimited request rates.

### Files Changed
- `services/api/middleware/validate.ts` (new)
- `services/api/middleware/rate-limit.ts` (new)
- `services/api/middleware/security-headers.ts` (new)
- `services/api/middleware/index.ts` (new)
- `services/api/schemas/agent.ts` (new)
- `services/api/schemas/index.ts` (new)
- `services/api/index.ts` (modified — exports middleware)
- `core/agents/control/types.ts` (modified — added `retryAfter`, `details`, new error codes)
- `package.json` + `package-lock.json` (modified — added `zod` dependency)
- `tests/api/validation.test.ts` (new, 60 tests)

### Core Implementation Approach
- `validateBody`: validates request bodies against Zod schemas; returns structured 400 responses with field-level error details.
- `validateContentType`: enforces `application/json` (415 on mismatch).
- XSS sanitization (`sanitizeString`/`sanitizeObject`): strips script/style blocks, HTML tags, encodes `<`/`>`, removes null bytes.
- `RateLimiter`: in-memory sliding-window. Pre-configured `createStandardRateLimit()` (100 req/15 min) and `createTradeRateLimit()` (10 req/min).
- `getSecurityHeaders()`: emits `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store`, optional HSTS.
- `isCsrfTokenValid`: constant-time comparison for state-mutating endpoints.
- `isBodySizeAllowed`: rejects requests with `Content-Length` > 100 KB.
- `withTimeout`: wraps async handlers with configurable deadline.
- All middleware is framework-agnostic (no Express dependency).

### Gaps / Issues
- **Middleware is not wired to any route handler**: The middleware functions exist as standalone utilities but there is no HTTP framework (Express, Fastify, etc.) integration. They must be manually called by whoever implements the HTTP layer — they are not automatically applied.
- **In-memory rate limiter only**: The `RateLimiter` stores state in RAM; it resets on restart, does not work across multiple instances, and is trivially bypassed in a distributed deployment.
- **CSRF token generation is absent**: `isCsrfTokenValid` validates tokens but there is no corresponding token generation or distribution mechanism.
- **No actual HTTP server**: The project appears to have no HTTP server implementation, making all of this middleware orphaned unless explicitly wired up.
- **Security headers require response object**: The `getSecurityHeaders()` returns an object of header key-value pairs, but applying them still requires a response-writing mechanism that does not exist in the codebase.

---

## PR #321 — TON Smart Contracts (Issue #308)

### Original Problem
The repository had no actual FunC/Tact smart contract source code — all contract operations were JavaScript simulations. Additionally, `DEFAULT_FACTORY_CONFIG` set both `owner` and `treasury` to the null/burn address `0:0000…0000`, meaning any deployment with defaults would silently send funds and admin control to an unowned address.

### Files Changed
- `contracts/agent-wallet.tact` (new)
- `contracts/agent-factory.tact` (new)
- `contracts/strategy-executor.tact` (new)
- `contracts/blueprint.config.ts` (new)
- `contracts/tests/agent-wallet.spec.ts` (new, 15+ tests)
- `contracts/tests/agent-factory.spec.ts` (new, 12+ tests)
- `contracts/tests/strategy-executor.spec.ts` (new, 15+ tests)
- `contracts/wrappers/README.md` (new)
- `scripts/deploy-testnet.ts` (new)
- `scripts/deploy-mainnet.ts` (new)
- `connectors/ton-factory/factory-contract.ts` (modified — null-address guard)
- `connectors/ton-factory/index.ts` (modified — null-address guard)
- `.env.example` (modified — contract addresses)
- `tests/ton-factory/ton-factory.test.ts` (modified — 3 new null-address guard tests)
- `vitest.config.ts` (modified)

### Core Implementation Approach
**Smart Contracts (Tact language):**
- `agent-wallet.tact`: Custodial wallet — per-trade limit, rolling daily limit, DEX whitelist, time-locked large withdrawals, emergency drain, owner-only pause.
- `agent-factory.tact`: Deploys `AgentWallet` contracts, enforces per-user caps, collects fees to treasury, multi-sig upgrade proposals.
- `strategy-executor.tact`: On-chain AI signal validator — monotonic nonce (replay protection), position size guard, max-execution cap, cumulative loss auto-stop, append-only on-chain audit trail.

**Null-address fix:** `FactoryContractManager` and `DefaultTonFactoryService` now throw at construction time if `owner` or `treasury` is missing or equals the null address. `createFactoryContractManager()` factory function now requires both fields in its type signature.

**Deploy scripts:** `deploy-testnet.ts` (guided with env validation), `deploy-mainnet.ts` (hard gates: `NETWORK=mainnet` + `CONFIRM_MAINNET=yes`).

### Gaps / Issues
- **Contracts not yet deployed or audited**: The PR explicitly notes that third-party auditing, testnet deployment, and mainnet deployment remain as open tasks.
- **Blueprint test suite requires external tooling**: `npx blueprint test` requires Blueprint to be installed separately; these tests do not run in the standard `npm test` CI suite.
- **No contract wrapper implementations**: `contracts/wrappers/` contains only a `README.md` — the TypeScript wrapper classes for interacting with the deployed contracts from off-chain code are not implemented.
- **JS simulation not removed**: The old JavaScript simulation code in `connectors/ton-factory/` appears to still exist alongside the new Tact contracts; there is no migration path documented.
- **`vitest.config.ts` modified to exclude contracts**: The contracts test directory was excluded from the standard vitest run, meaning contract tests are siloed from the main test suite.

---

## PR #322 — MPC Threshold Signatures (Issue #307)

### Original Problem
`MPCCoordinator.combineSignatures()` returned a fake placeholder string `mpc_sig_<base64>` that would fail any blockchain signature validation. No actual threshold cryptography was implemented.

### Files Changed
- `core/security/key-management.ts` (modified — implemented real threshold EdDSA)
- `core/security/types.ts` (modified — added `ThresholdSigningSession`, `ShamirShareValue`, `DKGResult`)
- `docs/mpc-architecture.md` (new)
- `experiments/test_threshold_signing.mjs` (new — development scratch file)
- `package.json` + `package-lock.json` (modified — added `@noble/curves`, `@noble/hashes`)
- `tests/security/mpc-threshold.test.ts` (new, 36 tests)

### Core Implementation Approach
Implemented a simplified FROST-like threshold EdDSA protocol using Shamir's Secret Sharing over the ed25519 group order:

**Protocol:**
1. `generateShares()`: generates Ed25519 key, splits private scalar via Shamir's SSS (t-of-n polynomial), stores public key.
2. `openSigningSession()`: each party gets a random nonce, aggregate nonce `R = Σ Rᵢ` computed.
3. `computeAndCollectPartialSignature()`: each party computes `sᵢ = rᵢ + h·λᵢ·yᵢ mod ℓ`.
4. `combineSignatures()`: aggregates `S = Σsᵢ`, encodes as 64-byte Ed25519 wire format `(R ∥ S)`.
5. `thresholdSign()`: convenience single-call signing API.
6. `verifyThresholdSignature()`: verifies via `@noble/curves`.

Uses `@noble/curves` (audited Ed25519 curve operations) and `@noble/hashes` (SHA-512).

### Gaps / Issues
- **Coordinator holds all nonces in memory**: The `ActiveSigningSession` stores all per-party nonces on the coordinator server-side. A true distributed MPC protocol would never have the coordinator see individual nonces. This is a centralized simulation of MPC, not actual multi-party distributed computation.
- **All parties must be online simultaneously via coordinator**: There is no async communication protocol between parties. A real MPC system would require parties to operate independently.
- **`experiments/` file committed**: `experiments/test_threshold_signing.mjs` is a development scratch file that was committed to the main branch, indicating the implementation may not be fully production-ready.
- **Simplified FROST, not full FROST**: The PR explicitly describes this as "simplified FROST-like" — it lacks binding factor computation, which is present in full FROST and prevents certain rogue-key attacks.
- **Key reconstruction risk**: The `shamirSplit` and `lagrangeCoefficient` functions technically allow reconstructing the full private key if a threshold of shares are combined — the current coordinator architecture could reconstruct it.
- **Ed25519 vs P-256 mismatch**: HSM PR #323 notes AWS/Azure don't support Ed25519 natively, creating a gap between the MPC (Ed25519) and HSM (P-256) implementations.

---

## PR #323 — HSM Key Management (Issue #306)

### Original Problem
`HSMKeyStorage` in `core/security/key-management.ts` threw `Error` on every operation (`generateKeyPair`, `sign`, `verify`, `getPublicKey`, `deleteKey`). `SoftwareKeyStorage` was already blocked in `NODE_ENV=production`, meaning **no key generation was possible in production** at all.

### Files Changed
- `core/security/key-management.ts` (modified — implemented 3 HSM provider adapters)
- `core/security/types.ts` (modified — extended `HSMConfig` with provider-specific fields, added `'mock'` provider type)
- `docs/hsm-setup.md` (new)
- `.env.example` (modified — HSM/KMS env var section)
- `tests/security/hsm-integration.test.ts` (new, 20 mock + 6 real-HSM tests)

### Core Implementation Approach
Three provider adapters implemented behind the existing `HSMKeyStorage` API:

| Provider | Class | Notes |
|----------|-------|-------|
| `mock` | `MockHSMAdapter` | In-memory `node:crypto` — real crypto ops, no hardware. Default for dev/CI. Blocked in production. |
| `aws_kms` / `aws_cloudhsm` | `AwsKmsAdapter` | AWS KMS via `@aws-sdk/client-kms` (optional peer dep). secp256k1 → `ECC_SECG_P256K1`, ed25519 → `ECC_NIST_P256`. |
| `azure_hsm` | `AzureKeyVaultAdapter` | Azure Key Vault via `@azure/keyvault-keys` + `@azure/identity` (optional peer deps). P-256 / P-256K. |

Both cloud SDKs are optional lazy-loaded peer dependencies (only needed when the corresponding provider is configured). Provider selection via `NODE_HSM_PROVIDER` env var.

### Gaps / Issues
- **Ed25519 not natively supported**: AWS KMS and Azure Key Vault do not support Ed25519. The adapters fall back to P-256 / ECDSA-SHA-256, which means HSM-protected keys cannot produce native TON Ed25519 signatures. This creates a fundamental incompatibility with the TON blockchain's signature requirement.
- **AWS/Azure SDKs are peer dependencies**: They must be separately installed. If a deployment doesn't install them and sets the provider to `aws_kms`, the error at runtime will be confusing.
- **Key registry is in-memory**: The `AwsKmsAdapter` keeps an in-memory `Map<string, string>` from application keyId to KMS Key ARN. This mapping is lost on restart.
- **Real HSM tests are skipped in CI**: The 6 real-HSM tests are gated behind `AWS_KMS_TEST=true` / `AZURE_KV_TEST=true` env flags. CI never validates the actual cloud integrations.
- **`verify` method**: The diff does not show a `verify` implementation for cloud adapters — it may still throw or be unimplemented.
- **Production blocked by `mock`**: `MockHSMAdapter` is blocked in production, but `aws_kms` / `azure_hsm` produce P-256 signatures that are incompatible with TON's Ed25519 requirement. No production-viable path for HSM-backed signing on TON exists.

---

## PR #324 — Security Documentation (Issue #314)

### Original Problem
No user-facing security documentation, risk disclosures, or mainnet readiness checklist existed. Users had no clear indication of the difference between simulation and live trading, and the UI defaulted to an unclear state regarding real funds.

### Files Changed
- `docs/user-security-guide.md` (new)
- `docs/mainnet-readiness-checklist.md` (new)
- `docs/risk-disclosures.md` (new)
- `apps/telegram-miniapp/frontend/components/security.js` (new)
- `apps/telegram-miniapp/frontend/components/onboarding.js` (modified)
- `apps/telegram-miniapp/frontend/index.html` (modified — simulation banner + modal)
- `apps/telegram-miniapp/frontend/styles.css` (modified — banner + modal styles)

### Core Implementation Approach
**Documentation (3 new files):**
- `user-security-guide.md`: Step-by-step guide — simulation vs. live comparison, 6-step pre-launch checklist, risk disclosures, data protection, safe configuration, emergency procedures.
- `mainnet-readiness-checklist.md`: 7-section checklist — account security, wallet readiness, platform understanding, simulation review (min 7-day run), risk configuration, monitoring setup, final acknowledgment.
- `risk-disclosures.md`: Legal disclosures covering total loss risk, market risks, smart contract risk, platform risk, authentication risk, regulatory risk, limitation of liability.

**UI changes (Telegram Mini App):**
- Prominent simulation mode banner: `⚠️ SIMULATION MODE — No real funds at risk`, updates to `LIVE TRADING — Real funds in use` in live mode.
- Live trading confirmation modal: requires all 3 acknowledgment checkboxes before enabling confirm button.
- Risk warning box added to onboarding confirm step.
- CTA button relabeled from "Start Agent" to "Start Agent in Simulation".
- `security.js` component: manages simulation/live state in `localStorage`, dispatches `tonai:live_trading_enabled` / `tonai:simulation_mode_enabled` custom events.

### Gaps / Issues
- **State stored in `localStorage` only**: Live trading mode is toggled via `localStorage.setItem(STORAGE_KEY_LIVE, 'true')`. This is purely client-side and does not interact with any server-side enforcement. A user could manually set this value or bypass it entirely.
- **No server-side enforcement of simulation mode**: The backend execution engine has no awareness of the client-side simulation/live toggle. Real enforcement must come from the server.
- **Documentation is not versioned**: The risk disclosures and security guides are static markdown files with no version numbers or last-updated dates.
- **Checklist is advisory only**: The `mainnet-readiness-checklist.md` is a document users read, not an enforced gate. There is no system check that verifies completion before enabling live trading.
- **Test plan is entirely manual**: The PR's test plan is a manual checklist ("Open the Mini App..."), with no automated tests for the JavaScript components.
- **`window.App` dependency**: `security.js` depends on `window.App.el` and `window.App.TG` being present, creating an undocumented dependency on the global app initialization order.

---

## Summary Table

| PR | Status | Tests Added | Key Concern |
|----|--------|-------------|-------------|
| #316 Monitoring | Merged | 85 | Not wired to real metric collection; dashboards are JSON only |
| #317 AI Safety | Merged | 32 | PromptBuilder not integrated into AI call paths |
| #318 KYC/AML | Merged | 34 | Both enforcement gates disabled by default |
| #319 Secrets Mgmt | Merged | 27 | Not integrated at app startup; AWS/Vault backends incomplete |
| #320 API Validation | Merged | 60 | Middleware orphaned — no HTTP server to attach to |
| #321 Smart Contracts | Merged | 42+ (Blueprint) | Not deployed/audited; no wrappers; Blueprint tests excluded from CI |
| #322 MPC Signatures | Merged | 36 | Centralized coordinator holds nonces; not truly distributed MPC |
| #323 HSM Key Mgmt | Merged | 26 | Ed25519 incompatibility with TON; P-256 fallback not valid for TON |
| #324 Security Docs | Merged | 0 (manual only) | Client-side only; no server enforcement of simulation mode |
