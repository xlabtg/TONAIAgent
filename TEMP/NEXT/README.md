# NEXT — Remediation Task Breakdown for Mainnet Readiness

> Generated as part of Issue #304: Full repository audit and production readiness check.  
> Date: 2026-04-09

This folder contains the breakdown of all tasks required to achieve mainnet readiness based on the security audit (`AUDIT_REPORT_TONAIAgent_v2.35.0.md`).

## Priority Order

### CRITICAL (Must fix before mainnet)

| # | Task | File | Effort |
|---|------|------|--------|
| 01 | [HSM Key Management Integration](./01-hsm-integration.md) | `core/security/key-management.ts` | 2 weeks |
| 02 | [MPC Threshold Signature Scheme](./02-mpc-threshold-signing.md) | `core/security/key-management.ts` | 3 weeks |
| 03 | [TON Smart Contract Development & Audit](./03-smart-contract-audit.md) | `contracts/` (new) | 4 weeks |

### HIGH (Fix before mainnet)

| # | Task | File | Effort |
|---|------|------|--------|
| 04 | [API Input Validation](./04-api-input-validation.md) | `services/api/` | 1 week |
| 05 | [Production Secrets Management](./05-secrets-management.md) | `config/secrets.ts` (new) | 1 week |
| 06 | [KYC/AML Enforcement](./06-kyc-aml-enforcement.md) | `services/regulatory/` | 2 weeks |

### MEDIUM (Fix before or shortly after mainnet)

| # | Task | File | Effort |
|---|------|------|--------|
| 07 | [Prompt Injection Protection](./07-prompt-injection-protection.md) | `core/ai/` | 1 week |
| 08 | [Monitoring & Incident Response](./08-monitoring-incident-response.md) | `services/observability/` | 1 week |
| 09 | [User Security Documentation](./09-user-security-documentation.md) | `docs/` | 3 days |

## Already Fixed (in PR #305)

These Critical/High issues were fixed directly in the audit PR:

- ✅ **CRITICAL**: `Math.random()` replaced with `crypto.randomBytes()` in all security contexts
- ✅ **HIGH**: Telegram auth `auth_date` freshness validation added (replay attack prevention)
- ✅ **HIGH**: Simulation mode defaults to `true` (safe default), requires explicit `SIMULATION_MODE=false` for live trading
- ✅ **MEDIUM**: Silent security event callback errors now logged (was silently swallowed)
- ✅ **MEDIUM**: Unhandled promise rejection/exception handlers added to `AgentManager`

## Total Estimated Effort to Mainnet

| Priority | Tasks | Effort |
|----------|-------|--------|
| CRITICAL | 3 | ~9 weeks |
| HIGH | 3 | ~4 weeks |
| MEDIUM | 3 | ~2.5 weeks |
| **Total** | **9** | **~15 weeks** |

*Note: Some tasks can run in parallel. Realistic timeline with 2 developers: 8-10 weeks.*

## Suggested Sprint Plan

- **Sprint 1-2**: Smart contract development (can run in parallel with backend work)
- **Sprint 1**: HSM provider selection and integration start
- **Sprint 2-3**: MPC threshold signing implementation
- **Sprint 3**: API validation + secrets management
- **Sprint 4**: KYC/AML enforcement
- **Sprint 4-5**: Smart contract third-party audit (external, can overlap)
- **Sprint 5**: Monitoring + incident response + user documentation
- **Sprint 6**: Integration testing on TON testnet + staging environment
- **Sprint 7**: Mainnet deployment (contracts first, then backend)
