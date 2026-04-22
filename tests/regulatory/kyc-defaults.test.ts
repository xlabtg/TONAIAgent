/**
 * KYC/AML Default Enforcement Tests (Issue #330)
 *
 * Verifies the safety-critical change that flipped both compliance gates
 * to **on** by default:
 *
 *  1. `DEFAULT_ORCHESTRATOR_CONFIG.kycEnforcement.enabled` defaults to true
 *  2. `DEFAULT_CONFIG.enforceAmlChecks` (execution engine) defaults to true
 *  3. The env-driven helpers in `services/regulatory/compliance-flags.ts`
 *     resolve to safe-by-default values
 *  4. `assertComplianceGatesEnabled` refuses to pass when either gate is off
 *  5. The orchestrator KYC gate fires for non-demo strategies under defaults
 */

import { describe, it, expect, afterEach } from 'vitest';

import { DEFAULT_ORCHESTRATOR_CONFIG } from '../../core/agents/orchestrator';
import { DEFAULT_CONFIG as EXECUTION_ENGINE_DEFAULT_CONFIG } from '../../core/trading/live/execution-engine';
import {
  assertComplianceGatesEnabled,
  isAmlEnforcementEnabled,
  isKycEnforcementEnabled,
  KYC_ENFORCEMENT_ENV_VAR,
  AML_ENFORCEMENT_ENV_VAR,
} from '../../services/regulatory/compliance-flags';

// ============================================================================
// Mainnet-profile defaults
// ============================================================================

describe('Compliance defaults — mainnet profile (Issue #330)', () => {
  it('orchestrator KYC enforcement is enabled by default', () => {
    expect(DEFAULT_ORCHESTRATOR_CONFIG.kycEnforcement?.enabled).toBe(true);
  });

  it('execution engine AML enforcement is enabled by default', () => {
    expect(EXECUTION_ENGINE_DEFAULT_CONFIG.enforceAmlChecks).toBe(true);
  });
});

// ============================================================================
// Env-driven flag resolution
// ============================================================================

describe('compliance-flags helpers', () => {
  it('treats unset env vars as enabled', () => {
    expect(isKycEnforcementEnabled({})).toBe(true);
    expect(isAmlEnforcementEnabled({})).toBe(true);
  });

  it('treats the literal string "false" (case-insensitive) as disabled', () => {
    expect(isKycEnforcementEnabled({ [KYC_ENFORCEMENT_ENV_VAR]: 'false' })).toBe(false);
    expect(isKycEnforcementEnabled({ [KYC_ENFORCEMENT_ENV_VAR]: 'FALSE' })).toBe(false);
    expect(isKycEnforcementEnabled({ [KYC_ENFORCEMENT_ENV_VAR]: ' false ' })).toBe(false);
    expect(isAmlEnforcementEnabled({ [AML_ENFORCEMENT_ENV_VAR]: 'false' })).toBe(false);
  });

  it('treats other values as enabled (safe-by-default)', () => {
    expect(isKycEnforcementEnabled({ [KYC_ENFORCEMENT_ENV_VAR]: 'true' })).toBe(true);
    expect(isKycEnforcementEnabled({ [KYC_ENFORCEMENT_ENV_VAR]: '0' })).toBe(true); // not "false"
    expect(isKycEnforcementEnabled({ [KYC_ENFORCEMENT_ENV_VAR]: '' })).toBe(true);
    expect(isAmlEnforcementEnabled({ [AML_ENFORCEMENT_ENV_VAR]: 'yes' })).toBe(true);
  });
});

// ============================================================================
// Deploy-time / startup-time assertion
// ============================================================================

describe('assertComplianceGatesEnabled', () => {
  it('passes when both flags are unset (default-on)', () => {
    const result = assertComplianceGatesEnabled({});
    expect(result.ok).toBe(true);
    expect(result.kycEnabled).toBe(true);
    expect(result.amlEnabled).toBe(true);
  });

  it('refuses when KYC is disabled', () => {
    const result = assertComplianceGatesEnabled({ [KYC_ENFORCEMENT_ENV_VAR]: 'false' });
    expect(result.ok).toBe(false);
    expect(result.kycEnabled).toBe(false);
    expect(result.message).toMatch(/Compliance gates must be enabled/);
    expect(result.message).toContain(KYC_ENFORCEMENT_ENV_VAR);
  });

  it('refuses when AML is disabled', () => {
    const result = assertComplianceGatesEnabled({ [AML_ENFORCEMENT_ENV_VAR]: 'false' });
    expect(result.ok).toBe(false);
    expect(result.amlEnabled).toBe(false);
    expect(result.message).toContain(AML_ENFORCEMENT_ENV_VAR);
  });

  it('refuses when both are disabled and lists both vars', () => {
    const result = assertComplianceGatesEnabled({
      [KYC_ENFORCEMENT_ENV_VAR]: 'false',
      [AML_ENFORCEMENT_ENV_VAR]: 'false',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain(KYC_ENFORCEMENT_ENV_VAR);
    expect(result.message).toContain(AML_ENFORCEMENT_ENV_VAR);
  });
});

// ============================================================================
// Orchestrator default-on KYC gate (end-to-end)
// ============================================================================

describe('AgentOrchestrator — default-on KYC gate (Issue #330)', () => {
  /**
   * Re-import the orchestrator inside the test so that toggling the env var
   * actually re-evaluates `isKycEnforcementEnabled()` at module load time.
   */
  const ORIG_KYC = process.env[KYC_ENFORCEMENT_ENV_VAR];

  afterEach(() => {
    if (ORIG_KYC === undefined) {
      delete process.env[KYC_ENFORCEMENT_ENV_VAR];
    } else {
      process.env[KYC_ENFORCEMENT_ENV_VAR] = ORIG_KYC;
    }
  });

  it('blocks non-demo agent creation when no KYC record exists (default config)', async () => {
    const { AgentOrchestrator } = await import('../../core/agents/orchestrator/orchestrator');
    const orchestrator = new AgentOrchestrator(); // no overrides → defaults apply

    await expect(
      orchestrator.createAgent({
        userId: 'user_default_no_kyc',
        strategy: 'trading',
        environment: 'demo',
      }),
    ).rejects.toMatchObject({ code: 'KYC_REQUIRED' });
  });

  it('still allows demo strategy without any KYC record (demo bypass)', async () => {
    const { AgentOrchestrator } = await import('../../core/agents/orchestrator/orchestrator');
    const orchestrator = new AgentOrchestrator();

    const result = await orchestrator.createAgent({
      userId: 'user_demo_default',
      strategy: 'demo',
      environment: 'demo',
    });
    expect(result.agentId).toBeDefined();
    expect(result.status).toBe('active');
  });
});
