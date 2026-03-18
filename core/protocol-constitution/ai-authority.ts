/**
 * TONAIAgent - Protocol Constitution: AI Authority Specification (Issue #126)
 *
 * Defines and enforces the boundaries of AI autonomy within the protocol:
 * what AI can do autonomously, what requires DAO approval, what requires
 * human override, and what is absolutely prohibited.
 */

import type {
  AiAuthoritySpec,
  AiCapabilitySpec,
  AiAuthorityLevel,
  AiActionBounds,
  ConstitutionEvent,
  ConstitutionEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface AiAuthorityManager {
  // Specification management
  getAuthoritySpec(): AiAuthoritySpec;
  getCapability(capabilityId: string): AiCapabilitySpec | undefined;
  getAllCapabilities(): AiCapabilitySpec[];
  getCapabilitiesByLevel(level: AiAuthorityLevel): AiCapabilitySpec[];
  getProhibitedActions(): string[];

  // Authority checks
  canActAutonomously(capabilityId: string): boolean;
  requiresDAOApproval(capabilityId: string): boolean;
  requiresHumanOverride(capabilityId: string): boolean;
  isProhibited(action: string): boolean;
  validateActionWithinBounds(capabilityId: string, proposedValue: number): boolean;

  // Override management
  applyHumanOverride(capabilityId: string, reason: string, authorizedBy: string): AiOverrideRecord;
  getActiveOverrides(): AiOverrideRecord[];
  clearOverride(overrideId: string, authorizedBy: string): boolean;

  // Audit
  recordAiAction(capabilityId: string, action: string, result: string): AiActionLog;
  getActionLog(limit?: number): AiActionLog[];

  // Updates (restricted)
  updateCapabilityBounds(capabilityId: string, bounds: Partial<AiActionBounds>, authorizedBy: string): AiCapabilitySpec;

  // Events
  onEvent(callback: ConstitutionEventCallback): () => void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface AiOverrideRecord {
  id: string;
  capabilityId: string;
  reason: string;
  authorizedBy: string;
  appliedAt: Date;
  expiresAt?: Date;
  active: boolean;
}

export interface AiActionLog {
  id: string;
  capabilityId: string;
  action: string;
  result: string;
  authorityLevel: AiAuthorityLevel;
  overrideApplied: boolean;
  timestamp: Date;
}

// ============================================================================
// Default AI Capability Specifications
// ============================================================================

const DEFAULT_AI_CAPABILITIES: Omit<AiCapabilitySpec, 'id'>[] = [
  // --- BOUNDED AUTONOMOUS ACTIONS ---
  {
    name: 'Monetary Supply Adjustment',
    description: 'AI can adjust token emission rate within pre-approved bounds',
    authorityLevel: 'bounded_autonomous',
    bounds: {
      maxPercentageChange: 5,      // Max 5% change per adjustment
      maxFrequencyHours: 168,      // At most weekly
      cooldownHours: 24,
      requiresConsecutiveSignals: 3,
    },
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Risk Parameter Tuning',
    description: 'AI can tune risk parameters within governance-approved ranges',
    authorityLevel: 'bounded_autonomous',
    bounds: {
      maxPercentageChange: 10,
      maxFrequencyHours: 24,
      cooldownHours: 4,
    },
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Emergency Circuit Breaker',
    description: 'AI can activate circuit breaker when risk thresholds are crossed',
    authorityLevel: 'bounded_autonomous',
    bounds: {
      maxFrequencyHours: 1,
      requiresConsecutiveSignals: 1,
    },
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Portfolio Rebalancing',
    description: 'AI can rebalance portfolio allocations within approved strategy set',
    authorityLevel: 'bounded_autonomous',
    bounds: {
      maxPercentageChange: 20,     // Max 20% rebalance per action
      maxFrequencyHours: 168,      // Weekly max
      cooldownHours: 12,
    },
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Yield Optimization',
    description: 'AI can optimize yield allocation across approved strategies',
    authorityLevel: 'bounded_autonomous',
    bounds: {
      maxPercentageChange: 15,
      maxFrequencyHours: 24,
      cooldownHours: 8,
    },
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },

  // --- ADVISORY ONLY ACTIONS ---
  {
    name: 'Governance Proposal Analysis',
    description: 'AI analyzes proposals and provides risk scores and recommendations',
    authorityLevel: 'advisory_only',
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Treasury Rebalance Recommendation',
    description: 'AI recommends treasury rebalancing but cannot execute without DAO approval above threshold',
    authorityLevel: 'advisory_only',
    requiresDAOApproval: true,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Large Treasury Allocation',
    description: 'AI can recommend but not execute treasury allocations above 20% of vault',
    authorityLevel: 'advisory_only',
    requiresDAOApproval: true,
    requiresHumanOverride: true,
    auditLogged: true,
  },
  {
    name: 'Strategy Approval',
    description: 'AI can flag/score strategies but DAO must approve all new strategies',
    authorityLevel: 'advisory_only',
    requiresDAOApproval: true,
    requiresHumanOverride: false,
    auditLogged: true,
  },

  // --- PROHIBITED ACTIONS ---
  {
    name: 'Treasury Confiscation',
    description: 'AI shall never confiscate or redirect user funds without explicit DAO mandate',
    authorityLevel: 'prohibited',
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Governance Override',
    description: 'AI shall never override a valid DAO supermajority governance decision',
    authorityLevel: 'prohibited',
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Protocol Shutdown',
    description: 'AI shall never initiate unilateral protocol shutdown',
    authorityLevel: 'prohibited',
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
  {
    name: 'Voting Right Removal',
    description: 'AI shall never remove or restrict legitimate token holder voting rights',
    authorityLevel: 'prohibited',
    requiresDAOApproval: false,
    requiresHumanOverride: false,
    auditLogged: true,
  },
];

const DEFAULT_PROHIBITED_ACTIONS: string[] = [
  'treasury_confiscation',
  'governance_override',
  'protocol_shutdown',
  'voting_right_removal',
  'fee_extraction_without_dao_approval',
  'unauthorized_contract_upgrade',
  'emergency_committee_dissolution',
  'constitutional_clause_modification',
];

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAiAuthorityManager implements AiAuthorityManager {
  private spec: AiAuthoritySpec;
  private readonly capabilities = new Map<string, AiCapabilitySpec>();
  private readonly overrides = new Map<string, AiOverrideRecord>();
  private readonly actionLogs: AiActionLog[] = [];
  private readonly eventCallbacks: ConstitutionEventCallback[] = [];

  constructor(initialSpec?: Partial<AiAuthoritySpec>) {
    const now = new Date();

    // Build capabilities map
    const capabilities: AiCapabilitySpec[] = DEFAULT_AI_CAPABILITIES.map((cap, idx) => ({
      id: `ai-cap-${idx + 1}`,
      ...cap,
    }));

    for (const cap of capabilities) {
      this.capabilities.set(cap.id, cap);
    }

    this.spec = {
      id: this.generateId(),
      version: '1.0.0',
      capabilities,
      prohibitedActions: DEFAULT_PROHIBITED_ACTIONS,
      overrideAuthority: ['emergency_stabilization_committee', 'risk_oversight_council', 'dao_supermajority'],
      humanCheckpointTriggers: [
        'Portfolio drawdown exceeds 15%',
        'Single strategy exposure exceeds 30% of TVL',
        'Oracle deviation exceeds 5% from consensus',
        'Three consecutive AI recommendations overridden',
        'Emergency activation triggered',
      ],
      transparencyRequirements: [
        'All bounded autonomous actions logged on-chain',
        'Weekly AI performance report published to governance',
        'Real-time monitoring dashboard for all AI activity',
        'Quarterly third-party audit of AI decision logic',
      ],
      auditFrequencyDays: 90,
      adoptedAt: now,
      updatedAt: now,
      ...initialSpec,
    };
  }

  // --------------------------------------------------------------------------
  // Specification Access
  // --------------------------------------------------------------------------

  getAuthoritySpec(): AiAuthoritySpec {
    return {
      ...this.spec,
      capabilities: Array.from(this.capabilities.values()),
    };
  }

  getCapability(capabilityId: string): AiCapabilitySpec | undefined {
    return this.capabilities.get(capabilityId);
  }

  getAllCapabilities(): AiCapabilitySpec[] {
    return Array.from(this.capabilities.values());
  }

  getCapabilitiesByLevel(level: AiAuthorityLevel): AiCapabilitySpec[] {
    return Array.from(this.capabilities.values()).filter(c => c.authorityLevel === level);
  }

  getProhibitedActions(): string[] {
    return [...this.spec.prohibitedActions];
  }

  // --------------------------------------------------------------------------
  // Authority Checks
  // --------------------------------------------------------------------------

  canActAutonomously(capabilityId: string): boolean {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) return false;
    if (cap.authorityLevel === 'prohibited') return false;
    if (cap.authorityLevel === 'advisory_only') return false;

    // Check for active override
    for (const override of this.overrides.values()) {
      if (override.capabilityId === capabilityId && override.active) {
        if (!override.expiresAt || override.expiresAt > new Date()) {
          return false;
        }
      }
    }

    return cap.authorityLevel === 'fully_autonomous' || cap.authorityLevel === 'bounded_autonomous';
  }

  requiresDAOApproval(capabilityId: string): boolean {
    const cap = this.capabilities.get(capabilityId);
    return cap?.requiresDAOApproval ?? true;
  }

  requiresHumanOverride(capabilityId: string): boolean {
    const cap = this.capabilities.get(capabilityId);
    return cap?.requiresHumanOverride ?? true;
  }

  isProhibited(action: string): boolean {
    return this.spec.prohibitedActions.includes(action);
  }

  validateActionWithinBounds(capabilityId: string, proposedValue: number): boolean {
    const cap = this.capabilities.get(capabilityId);
    if (!cap || !cap.bounds) return true;  // No bounds = no constraint to violate

    const bounds = cap.bounds;
    if (bounds.maxAbsoluteValue !== undefined && proposedValue > bounds.maxAbsoluteValue) return false;
    if (bounds.minAbsoluteValue !== undefined && proposedValue < bounds.minAbsoluteValue) return false;

    return true;
  }

  // --------------------------------------------------------------------------
  // Override Management
  // --------------------------------------------------------------------------

  applyHumanOverride(capabilityId: string, reason: string, authorizedBy: string): AiOverrideRecord {
    if (!this.capabilities.has(capabilityId)) {
      throw new Error(`Unknown AI capability: ${capabilityId}`);
    }
    if (!authorizedBy) throw new Error('Authorization required to apply override');

    const override: AiOverrideRecord = {
      id: this.generateId(),
      capabilityId,
      reason,
      authorizedBy,
      appliedAt: new Date(),
      active: true,
    };

    this.overrides.set(override.id, override);
    this.emit({
      type: 'ai_authority.override_applied',
      data: { overrideId: override.id, capabilityId, authorizedBy },
      timestamp: new Date(),
    });

    return override;
  }

  getActiveOverrides(): AiOverrideRecord[] {
    const now = new Date();
    return Array.from(this.overrides.values()).filter(o => {
      if (!o.active) return false;
      if (o.expiresAt && o.expiresAt <= now) return false;
      return true;
    });
  }

  clearOverride(overrideId: string, authorizedBy: string): boolean {
    const override = this.overrides.get(overrideId);
    if (!override) return false;
    if (!authorizedBy) throw new Error('Authorization required to clear override');

    override.active = false;
    return true;
  }

  // --------------------------------------------------------------------------
  // Audit Logging
  // --------------------------------------------------------------------------

  recordAiAction(capabilityId: string, action: string, result: string): AiActionLog {
    const cap = this.capabilities.get(capabilityId);
    const activeOverride = this.getActiveOverrides().some(o => o.capabilityId === capabilityId);

    const log: AiActionLog = {
      id: this.generateId(),
      capabilityId,
      action,
      result,
      authorityLevel: cap?.authorityLevel ?? 'advisory_only',
      overrideApplied: activeOverride,
      timestamp: new Date(),
    };

    this.actionLogs.push(log);
    this.emit({
      type: 'ai_authority.action_taken',
      data: { capabilityId, action, result },
      timestamp: new Date(),
    });

    return log;
  }

  getActionLog(limit = 100): AiActionLog[] {
    return this.actionLogs.slice(-limit);
  }

  // --------------------------------------------------------------------------
  // Updates
  // --------------------------------------------------------------------------

  updateCapabilityBounds(
    capabilityId: string,
    bounds: Partial<AiActionBounds>,
    authorizedBy: string
  ): AiCapabilitySpec {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) throw new Error(`AI capability not found: ${capabilityId}`);
    if (!authorizedBy) throw new Error('Authorization required');

    if (cap.authorityLevel === 'prohibited') {
      throw new Error('Cannot update bounds on prohibited action');
    }

    const updated: AiCapabilitySpec = {
      ...cap,
      bounds: { ...(cap.bounds ?? {}), ...bounds },
    };
    this.capabilities.set(capabilityId, updated);

    return updated;
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: ConstitutionEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private emit(event: ConstitutionEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createAiAuthorityManager(
  initialSpec?: Partial<AiAuthoritySpec>
): DefaultAiAuthorityManager {
  return new DefaultAiAuthorityManager(initialSpec);
}
