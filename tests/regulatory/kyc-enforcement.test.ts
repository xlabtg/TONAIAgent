/**
 * KYC/AML Enforcement Tests
 *
 * Verifies that:
 *  1. enforceKycForAgentCreation blocks users without sufficient KYC tier
 *  2. enforceTierLimits blocks trades that exceed per-tier position limits
 *  3. freezeAccount / unfreezeAccount prevent and restore trading
 *  4. SanctionsScreener correctly identifies sanctioned addresses
 *  5. AgentOrchestrator createAgent respects the KYC gate
 *  6. ExecutionEngine rejects transactions flagged by AML
 *  7. Audit trail is populated for all enforcement decisions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createKycAmlManager,
  KycAmlManager,
  KYC_ENFORCEMENT_DEFAULTS,
} from '../../services/regulatory/kyc-aml';
import type {
  KycEnforcementConfig,
} from '../../services/regulatory/kyc-aml';
import { createSanctionsScreener, SanctionsScreener } from '../../services/regulatory/sanctions';
import type { SanctionsMatch } from '../../services/regulatory/sanctions';
import { AgentOrchestrator } from '../../core/agents/orchestrator/orchestrator';
import {
  createExecutionEngine,
  DefaultExecutionEngine,
} from '../../core/trading/live/execution-engine';
import { createConnectorRegistry } from '../../core/trading/live/connector';
import type { KycApplication } from '../../services/regulatory/types';
import { CreateAgentSchema, ConfigureAgentSchema } from '../../services/api/schemas/agent';

// ============================================================================
// Helpers
// ============================================================================

/** Build a KycApplication for a given userId and tier */
function makeKycApplication(userId: string, tier: 'basic' | 'standard' | 'enhanced' = 'standard'): KycApplication {
  const docs: KycApplication['documents'] = [];
  if (tier !== 'basic') {
    docs.push({ type: 'passport', documentId: 'PP001', issuingCountry: 'CH', verified: true });
    docs.push({ type: 'utility_bill', documentId: 'UB001', issuingCountry: 'CH', verified: true });
  }
  return {
    userId,
    requestedTier: tier,
    documents: docs,
    submittedAt: new Date(),
  };
}

// ============================================================================
// KycAmlManager Enforcement Tests
// ============================================================================

describe('KycAmlManager — enforceKycForAgentCreation', () => {
  let manager: KycAmlManager;
  const mainnetConfig: KycEnforcementConfig = KYC_ENFORCEMENT_DEFAULTS.mainnet;
  const testnetConfig: KycEnforcementConfig = KYC_ENFORCEMENT_DEFAULTS.testnet;

  beforeEach(() => {
    manager = createKycAmlManager({ enabled: true });
  });

  it('blocks a user with no KYC status on mainnet', async () => {
    const result = await manager.enforceKycForAgentCreation('user_no_kyc', mainnetConfig);
    expect(result.allowed).toBe(false);
    expect(result.currentTier).toBe('none');
    expect(result.requiredTier).toBe('standard');
    expect(result.reason).toMatch(/KYC verification required/i);
  });

  it('blocks a user with only basic KYC on mainnet (requires standard)', async () => {
    await manager.processKyc(makeKycApplication('user_basic', 'basic'));
    const result = await manager.enforceKycForAgentCreation('user_basic', mainnetConfig);
    expect(result.allowed).toBe(false);
    expect(result.currentTier).toBe('basic');
    expect(result.requiredTier).toBe('standard');
  });

  it('allows a user with standard KYC on mainnet', async () => {
    await manager.processKyc(makeKycApplication('user_standard', 'standard'));
    const result = await manager.enforceKycForAgentCreation('user_standard', mainnetConfig);
    expect(result.allowed).toBe(true);
    expect(result.currentTier).toBe('standard');
  });

  it('allows a user with basic KYC on testnet (requires basic)', async () => {
    await manager.processKyc(makeKycApplication('user_basic_testnet', 'basic'));
    const result = await manager.enforceKycForAgentCreation('user_basic_testnet', testnetConfig);
    expect(result.allowed).toBe(true);
    expect(result.currentTier).toBe('basic');
  });

  it('blocks a frozen account even with sufficient KYC', async () => {
    await manager.processKyc(makeKycApplication('user_frozen', 'standard'));
    manager.freezeAccount('user_frozen', 'Suspicious activity', 'compliance-officer');

    const result = await manager.enforceKycForAgentCreation('user_frozen', mainnetConfig);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/frozen/i);
  });

  it('allows an advisory-mode decision even when KYC is missing', async () => {
    const advisoryConfig: KycEnforcementConfig = {
      ...mainnetConfig,
      enforceOnAgentCreation: false,
    };
    const result = await manager.enforceKycForAgentCreation('user_no_kyc_advisory', advisoryConfig);
    expect(result.allowed).toBe(true);
    expect(result.reason).toMatch(/advisory/i);
  });

  it('populates the audit log with enforcement decisions', async () => {
    await manager.enforceKycForAgentCreation('user_audit_test', mainnetConfig);
    const log = manager.getAuditLog('user_audit_test');
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].userId).toBe('user_audit_test');
    expect(log[0].action).toMatch(/kyc_enforcement/);
  });
});

// ============================================================================
// KycAmlManager Tier Limits Tests
// ============================================================================

describe('KycAmlManager — enforceTierLimits', () => {
  let manager: KycAmlManager;

  beforeEach(() => {
    manager = createKycAmlManager({ enabled: true });
  });

  it('blocks a user with no KYC from any trade', async () => {
    const result = await manager.enforceTierLimits('user_no_kyc', 100, 'singleTransaction');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/No approved KYC/i);
  });

  it('blocks a basic-tier user who exceeds single transaction limit (500 USD)', async () => {
    await manager.processKyc(makeKycApplication('user_basic_limit', 'basic'));
    const result = await manager.enforceTierLimits('user_basic_limit', 600, 'singleTransaction');
    expect(result.allowed).toBe(false);
    expect(result.limitAmount).toBe(500);
    expect(result.reason).toMatch(/exceeds/i);
  });

  it('allows a basic-tier user below single transaction limit', async () => {
    await manager.processKyc(makeKycApplication('user_basic_ok', 'basic'));
    const result = await manager.enforceTierLimits('user_basic_ok', 499, 'singleTransaction');
    expect(result.allowed).toBe(true);
    expect(result.currentTier).toBe('basic');
  });

  it('allows a standard-tier user up to 25 000 USD per transaction', async () => {
    await manager.processKyc(makeKycApplication('user_standard_limit', 'standard'));
    const result = await manager.enforceTierLimits('user_standard_limit', 25000, 'singleTransaction');
    expect(result.allowed).toBe(true);
  });

  it('blocks a standard-tier user above 25 000 USD per transaction', async () => {
    await manager.processKyc(makeKycApplication('user_standard_over', 'standard'));
    const result = await manager.enforceTierLimits('user_standard_over', 25001, 'singleTransaction');
    expect(result.allowed).toBe(false);
    expect(result.limitAmount).toBe(25000);
  });

  it('emits aml.tier_limit_exceeded event when limit is breached', async () => {
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    await manager.processKyc(makeKycApplication('user_event_test', 'basic'));
    await manager.enforceTierLimits('user_event_test', 600, 'singleTransaction');

    expect(events).toContain('aml.tier_limit_exceeded');
  });
});

// ============================================================================
// KycAmlManager Account Freeze Tests
// ============================================================================

describe('KycAmlManager — freeze/unfreezeAccount', () => {
  let manager: KycAmlManager;

  beforeEach(() => {
    manager = createKycAmlManager();
  });

  it('freezes an account and marks it as frozen', () => {
    manager.freezeAccount('user_to_freeze', 'Sanctions hit detected', 'system');
    expect(manager.isAccountFrozen('user_to_freeze')).toBe(true);

    const frozen = manager.getFrozenAccount('user_to_freeze');
    expect(frozen).toBeDefined();
    expect(frozen?.reason).toBe('Sanctions hit detected');
    expect(frozen?.frozenBy).toBe('system');
  });

  it('unfreezes an account', () => {
    manager.freezeAccount('user_freeze_unfreeze', 'Test freeze', 'system');
    expect(manager.isAccountFrozen('user_freeze_unfreeze')).toBe(true);

    manager.unfreezeAccount('user_freeze_unfreeze', 'compliance-officer', 'Investigation complete');
    expect(manager.isAccountFrozen('user_freeze_unfreeze')).toBe(false);
    expect(manager.getFrozenAccount('user_freeze_unfreeze')).toBeUndefined();
  });

  it('emits kyc.account_frozen and kyc.account_unfrozen events', () => {
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    manager.freezeAccount('user_event_freeze', 'AML alert', 'system');
    manager.unfreezeAccount('user_event_freeze', 'officer', 'Cleared');

    expect(events).toContain('kyc.account_frozen');
    expect(events).toContain('kyc.account_unfrozen');
  });

  it('unfreezing a non-existent account is a no-op', () => {
    expect(() => {
      manager.unfreezeAccount('user_never_frozen', 'officer', 'No-op');
    }).not.toThrow();
  });
});

// ============================================================================
// SanctionsScreener Tests
// ============================================================================

describe('SanctionsScreener', () => {
  let screener: SanctionsScreener;

  const sampleMatch: SanctionsMatch = {
    list: 'ofac_sdn',
    entityName: 'ACME Sanctions Corp',
    entityType: 'entity',
    matchScore: 100,
    sanctionedSince: new Date('2022-01-01'),
    programs: ['CYBER2'],
    aliases: ['ACME Corp', 'Acme SC'],
  };

  beforeEach(() => {
    screener = createSanctionsScreener();
  });

  it('returns no match for an unknown address', async () => {
    const result = await screener.screenAddress('EQClean123');
    expect(result.isMatch).toBe(false);
    expect(result.matches).toHaveLength(0);
    expect(result.screened).toBe(true);
  });

  it('detects a sanctioned address', async () => {
    screener.addSanctionedAddress('EQSanctioned456', [sampleMatch]);
    const result = await screener.screenAddress('EQSanctioned456');
    expect(result.isMatch).toBe(true);
    expect(result.riskScore).toBe(100);
    expect(result.matches[0].list).toBe('ofac_sdn');
  });

  it('caches results and returns them on re-query', async () => {
    screener.addSanctionedAddress('EQCached789', [sampleMatch]);
    const first = await screener.screenAddress('EQCached789');
    const second = await screener.screenAddress('EQCached789');
    expect(first.cachedAt.getTime()).toBe(second.cachedAt.getTime());
  });

  it('invalidates cache when address is removed from sanctions list', async () => {
    screener.addSanctionedAddress('EQRemoved000', [sampleMatch]);
    await screener.screenAddress('EQRemoved000'); // populate cache
    screener.removeSanctionedAddress('EQRemoved000');
    const result = await screener.screenAddress('EQRemoved000');
    expect(result.isMatch).toBe(false);
  });

  it('isSanctionedAddress fast-path works', () => {
    screener.addSanctionedAddress('EQFast111', [sampleMatch]);
    expect(screener.isSanctionedAddress('EQFast111')).toBe(true);
    expect(screener.isSanctionedAddress('EQClean222')).toBe(false);
  });

  it('screens entities by name with alias matching', async () => {
    screener.addSanctionedAddress('EQEntity333', [sampleMatch]);
    const result = await screener.screenEntity('ACME Corp');
    expect(result.isMatch).toBe(true);
  });

  it('loads a sanctions list and replaces existing entries for that list', () => {
    screener.addSanctionedAddress('EQOld444', [{ ...sampleMatch, entityName: 'Old Entry' }]);
    screener.loadSanctionsList('ofac_sdn', [
      { address: 'EQNew555', match: { ...sampleMatch, entityName: 'New Entry' } },
    ]);
    expect(screener.isSanctionedAddress('EQOld444')).toBe(false);
    expect(screener.isSanctionedAddress('EQNew555')).toBe(true);
  });

  it('emits aml.transaction_blocked event on sanctions hit', async () => {
    const events: string[] = [];
    screener.onEvent((e) => events.push(e.type));
    screener.addSanctionedAddress('EQEvt666', [sampleMatch]);
    await screener.screenAddress('EQEvt666');
    expect(events).toContain('aml.transaction_blocked');
  });

  it('returns metrics', () => {
    const metrics = screener.getMetrics();
    expect(metrics.totalScreenings).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.sanctionedAddressCount).toBe('number');
  });
});

// ============================================================================
// AgentOrchestrator KYC Gate Tests
// ============================================================================

describe('AgentOrchestrator — KYC gate on createAgent', () => {
  it('blocks agent creation when KYC enforcement is enabled and user has no KYC', async () => {
    const kycManager = createKycAmlManager({ enabled: true });
    const orchestrator = new AgentOrchestrator(
      { kycEnforcement: { enabled: true, mode: 'mainnet' } },
      kycManager,
    );

    await expect(
      orchestrator.createAgent({ userId: 'user_no_kyc', strategy: 'trading', environment: 'mainnet' }),
    ).rejects.toThrow(/KYC/i);
  });

  it('allows agent creation for demo strategy even without KYC', async () => {
    const kycManager = createKycAmlManager({ enabled: true });
    const orchestrator = new AgentOrchestrator(
      { kycEnforcement: { enabled: true, mode: 'mainnet' } },
      kycManager,
    );

    // Demo strategy bypasses KYC gate
    const result = await orchestrator.createAgent({
      userId: 'user_no_kyc_demo',
      strategy: 'demo',
      environment: 'demo',
    });
    expect(result.agentId).toBeDefined();
    expect(result.status).toBe('active');
  });

  it('allows agent creation when enforcement is explicitly disabled', async () => {
    // Issue #330: defaults are now ON, so we explicitly opt out here
    // to verify the orchestrator still passes through when disabled.
    const orchestrator = new AgentOrchestrator({
      kycEnforcement: { enabled: false, mode: 'testnet' },
    });
    const result = await orchestrator.createAgent({
      userId: 'user_no_kyc_noforce',
      strategy: 'trading',
      environment: 'demo',
    });
    expect(result.agentId).toBeDefined();
  });

  it('allows agent creation when user has sufficient KYC on mainnet', async () => {
    const kycManager = createKycAmlManager({ enabled: true });
    await kycManager.processKyc(makeKycApplication('user_verified', 'standard'));
    const orchestrator = new AgentOrchestrator(
      { kycEnforcement: { enabled: true, mode: 'mainnet' } },
      kycManager,
    );
    const result = await orchestrator.createAgent({
      userId: 'user_verified',
      strategy: 'trading',
      environment: 'demo',
    });
    expect(result.agentId).toBeDefined();
  });

  it('throws AgentOrchestratorError with code KYC_REQUIRED when blocked', async () => {
    const kycManager = createKycAmlManager({ enabled: true });
    const orchestrator = new AgentOrchestrator(
      { kycEnforcement: { enabled: true, mode: 'mainnet' } },
      kycManager,
    );

    let errorCode: string | undefined;
    try {
      await orchestrator.createAgent({ userId: 'user_kyc_code_check', strategy: 'trading', environment: 'mainnet' });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        errorCode = (err as { code: string }).code;
      }
    }
    expect(errorCode).toBe('KYC_REQUIRED');
  });

  it('blocks a frozen account during agent creation', async () => {
    const kycManager = createKycAmlManager({ enabled: true });
    await kycManager.processKyc(makeKycApplication('user_frozen_orch', 'standard'));
    kycManager.freezeAccount('user_frozen_orch', 'AML hold', 'compliance');

    const orchestrator = new AgentOrchestrator(
      { kycEnforcement: { enabled: true, mode: 'mainnet' } },
      kycManager,
    );

    await expect(
      orchestrator.createAgent({ userId: 'user_frozen_orch', strategy: 'trading', environment: 'mainnet' }),
    ).rejects.toThrow(/frozen/i);
  });
});

// ============================================================================
// Demo Strategy KYC Bypass Regression Tests (Issue #369)
// ============================================================================

describe('AgentOrchestrator — demo strategy KYC bypass security (Issue #369)', () => {
  it('KYC bypass for demo strategy is driven by server registry flag, not string matching', async () => {
    // The system-defined demo strategy has isDemoStrategy=true in the registry.
    // Verify that the bypass is granted through that flag.
    const kycManager = createKycAmlManager({ enabled: true });
    const orchestrator = new AgentOrchestrator(
      { kycEnforcement: { enabled: true, mode: 'mainnet' } },
      kycManager,
    );

    // system 'demo' strategy has isDemoStrategy:true in STRATEGY_REGISTRY → allowed
    const result = await orchestrator.createAgent({
      userId: 'user_demo_registry_flag',
      strategy: 'demo',
      environment: 'demo',
    });
    expect(result.agentId).toBeDefined();
    expect(result.status).toBe('active');
  });

  it('non-demo strategies still require KYC even on mainnet enforcement', async () => {
    // Regression: ensure the old bypass path (strategy === 'demo' string) does not
    // generalise to other strategies. A user submitting strategy='trading' without
    // KYC must still be blocked.
    const kycManager = createKycAmlManager({ enabled: true });
    const orchestrator = new AgentOrchestrator(
      { kycEnforcement: { enabled: true, mode: 'mainnet' } },
      kycManager,
    );

    await expect(
      orchestrator.createAgent({
        userId: 'user_no_kyc_trading_real_funds',
        strategy: 'trading',
        environment: 'mainnet',
      }),
    ).rejects.toThrow(/KYC/i);
  });

  it('demo strategy is forced into simulation mode (cannot trade real funds)', async () => {
    // System demo strategies should always be treated as simulation, not live.
    const kycManager = createKycAmlManager({ enabled: true });
    const orchestrator = new AgentOrchestrator(
      { kycEnforcement: { enabled: true, mode: 'mainnet' } },
      kycManager,
    );

    const result = await orchestrator.createAgent({
      userId: 'user_demo_sim_mode',
      strategy: 'demo',
      environment: 'demo',
    });
    // The runtime subsystem should indicate simulationMode=true for demo agents
    expect(result.provisioningSummary.runtime.success).toBe(true);
    expect(result.provisioningSummary.runtime.details?.simulationMode).toBe(true);
  });

  it('CreateAgentSchema rejects isDemoStrategy field supplied by a client', () => {
    // Privilege must be granted by server config, never user-supplied data.
    const payloadWithBypassAttempt = {
      userId: 'attacker',
      name: 'My Agent',
      strategy: 'trend',
      budgetTon: 100,
      riskLevel: 'low',
      isDemoStrategy: true, // attacker attempts to set server-only flag
    };
    const parseResult = CreateAgentSchema.safeParse(payloadWithBypassAttempt);
    expect(parseResult.success).toBe(false);
  });

  it('ConfigureAgentSchema rejects isDemoStrategy field supplied by a client', () => {
    const payloadWithBypassAttempt = {
      name: 'Updated Agent',
      isDemoStrategy: true,
    };
    const parseResult = ConfigureAgentSchema.safeParse(payloadWithBypassAttempt);
    expect(parseResult.success).toBe(false);
  });
});

// ============================================================================
// ExecutionEngine AML Check Tests
// ============================================================================

describe('DefaultExecutionEngine — AML checks', () => {
  it('blocks execution when AML check returns approved=false', async () => {
    const kycManager = createKycAmlManager({ enabled: true });
    // Add a blacklisted destination to trigger the block rule
    kycManager.addBlacklistedAddress('TONUSDT');

    const registry = createConnectorRegistry();
    const engine = createExecutionEngine(
      registry,
      { enforceAmlChecks: true },
      kycManager,
    );

    const result = await engine.execute({
      id: 'req_aml_block',
      agentId: 'agent_aml_test',
      symbol: 'TONUSDT',
      side: 'buy',
      quantity: 100,
      priceLimit: 10,
      slippageTolerance: 0.5,
      executionStrategy: 'direct',
    });

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/AML/i);
  });

  it('skips AML check when enforceAmlChecks is explicitly disabled', async () => {
    // Issue #330: defaults are now ON, so we explicitly opt out here.
    const registry = createConnectorRegistry();
    const engine = createExecutionEngine(registry, { enforceAmlChecks: false });

    // Without any connector, execution will fail with NO_ROUTE but NOT an AML error
    const result = await engine.execute({
      id: 'req_no_aml',
      agentId: 'agent_no_aml',
      symbol: 'TONUSDT',
      side: 'buy',
      quantity: 10,
      slippageTolerance: 0.5,
      executionStrategy: 'direct',
    });

    // Failed due to routing, not AML
    expect(result.status).toBe('failed');
    expect(result.error).not.toMatch(/AML/i);
  });
});
