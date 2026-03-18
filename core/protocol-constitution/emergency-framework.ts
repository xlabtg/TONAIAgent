/**
 * TONAIAgent - Protocol Constitution: Emergency Framework (Issue #126)
 *
 * Manages the protocol's emergency powers framework: activation conditions,
 * available powers, auto-sunset mechanisms, and post-emergency review.
 * Emergency powers are strictly time-bounded and require DAO ratification.
 */

import type {
  EmergencyFramework,
  EmergencyActivation,
  EmergencyTriggerCondition,
  EmergencyPowerType,
  EmergencyTriggerDefinition,
  EmergencyPowerDefinition,
  ConstitutionEvent,
  ConstitutionEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface EmergencyFrameworkManager {
  // Framework access
  getFramework(): EmergencyFramework;
  getActiveEmergencies(): EmergencyActivation[];
  getEmergencyById(id: string): EmergencyActivation | undefined;

  // Activation
  activateEmergency(
    triggerCondition: EmergencyTriggerCondition,
    triggerDetails: string,
    triggeredBy: string,
    requestedPowers: EmergencyPowerType[]
  ): EmergencyActivation;

  // Resolution
  resolveEmergency(
    emergencyId: string,
    resolvedBy: string,
    resolutionNotes: string
  ): EmergencyActivation;

  // Sunset enforcement
  expireOverdueEmergencies(): EmergencyActivation[];

  // Validation
  canActivate(triggerCondition: EmergencyTriggerCondition): boolean;
  isPowerAvailable(power: EmergencyPowerType): boolean;

  // Events
  onEvent(callback: ConstitutionEventCallback): () => void;
}

// ============================================================================
// Default Emergency Framework
// ============================================================================

const DEFAULT_TRIGGER_DEFINITIONS: EmergencyTriggerDefinition[] = [
  {
    condition: 'systemic_risk_threshold',
    description: 'Protocol-wide risk score exceeds 85/100 threshold',
    thresholdMetric: 'systemic_risk_score',
    thresholdValue: 85,
    monitoringFrequencyMinutes: 5,
  },
  {
    condition: 'clearing_failure',
    description: 'Settlement or clearing system fails to process transactions',
    monitoringFrequencyMinutes: 1,
  },
  {
    condition: 'oracle_failure',
    description: 'Price oracle deviates >10% from consensus or stops updating',
    thresholdMetric: 'oracle_deviation_percent',
    thresholdValue: 10,
    monitoringFrequencyMinutes: 1,
  },
  {
    condition: 'stablecoin_depeg',
    description: 'Key stablecoin loses peg by more than 5%',
    thresholdMetric: 'stablecoin_peg_deviation_percent',
    thresholdValue: 5,
    monitoringFrequencyMinutes: 2,
  },
  {
    condition: 'governance_attack',
    description: 'Detected coordinated governance manipulation attempt',
    monitoringFrequencyMinutes: 10,
  },
  {
    condition: 'smart_contract_exploit',
    description: 'Critical smart contract vulnerability actively being exploited',
    monitoringFrequencyMinutes: 1,
  },
  {
    condition: 'regulatory_order',
    description: 'Mandatory compliance action required by regulatory authority',
    monitoringFrequencyMinutes: 60,
  },
];

const DEFAULT_POWER_DEFINITIONS: EmergencyPowerDefinition[] = [
  {
    power: 'trading_halt',
    description: 'Pause all trading and new position opening across protocol',
    affectedSystems: ['strategy_engine', 'margin_leverage', 'cross_chain'],
    maxDurationDays: 3,
    requiresDAORatification: true,
    ratificationWindowDays: 2,
  },
  {
    power: 'leverage_freeze',
    description: 'Freeze all existing leverage positions and prevent new leveraged positions',
    affectedSystems: ['margin_leverage', 'capital_efficiency'],
    maxDurationDays: 7,
    requiresDAORatification: true,
    ratificationWindowDays: 2,
  },
  {
    power: 'treasury_deployment',
    description: 'Deploy emergency treasury reserves up to 10% of TVL for stability',
    affectedSystems: ['treasury_vault', 'risk_governance'],
    maxDurationDays: 7,
    requiresDAORatification: true,
    ratificationWindowDays: 1,
  },
  {
    power: 'circuit_breaker',
    description: 'Activate full protocol circuit breaker halting all automated activity',
    affectedSystems: ['risk_governance', 'ai_treasury', 'dao_governance'],
    maxDurationDays: 1,
    requiresDAORatification: true,
    ratificationWindowDays: 1,
  },
  {
    power: 'governance_pause',
    description: 'Temporarily pause governance votes to prevent exploitation during crisis',
    affectedSystems: ['governance_engine'],
    maxDurationDays: 3,
    requiresDAORatification: true,
    ratificationWindowDays: 1,
  },
  {
    power: 'protocol_migration',
    description: 'Emergency protocol upgrade or migration to safe state',
    affectedSystems: ['all'],
    maxDurationDays: 14,
    requiresDAORatification: true,
    ratificationWindowDays: 3,
  },
];

// ============================================================================
// Implementation
// ============================================================================

export class DefaultEmergencyFrameworkManager implements EmergencyFrameworkManager {
  private framework: EmergencyFramework;
  private readonly emergencies = new Map<string, EmergencyActivation>();
  private readonly eventCallbacks: ConstitutionEventCallback[] = [];

  constructor(initialFramework?: Partial<EmergencyFramework>) {
    const now = new Date();
    this.framework = {
      id: this.generateId(),
      version: '1.0.0',
      triggerConditions: DEFAULT_TRIGGER_DEFINITIONS,
      availablePowers: DEFAULT_POWER_DEFINITIONS,
      maxActivationDurationDays: 7,    // Emergency powers auto-expire after 7 days
      requiredActivators: 4,           // Requires 4/7 emergency committee members
      emergencyCommitteeSize: 7,
      postEmergencyReviewRequired: true,
      activeEmergencies: [],
      adoptedAt: now,
      updatedAt: now,
      ...initialFramework,
    };
  }

  // --------------------------------------------------------------------------
  // Framework Access
  // --------------------------------------------------------------------------

  getFramework(): EmergencyFramework {
    this.expireOverdueEmergencies();
    return {
      ...this.framework,
      activeEmergencies: this.getActiveEmergencies(),
    };
  }

  getActiveEmergencies(): EmergencyActivation[] {
    this.expireOverdueEmergencies();
    return Array.from(this.emergencies.values()).filter(e => e.active);
  }

  getEmergencyById(id: string): EmergencyActivation | undefined {
    return this.emergencies.get(id);
  }

  // --------------------------------------------------------------------------
  // Activation
  // --------------------------------------------------------------------------

  activateEmergency(
    triggerCondition: EmergencyTriggerCondition,
    triggerDetails: string,
    triggeredBy: string,
    requestedPowers: EmergencyPowerType[]
  ): EmergencyActivation {
    if (!this.canActivate(triggerCondition)) {
      throw new Error(`Emergency cannot be activated for condition: ${triggerCondition}`);
    }

    if (!triggeredBy) throw new Error('Triggering authority required');
    if (requestedPowers.length === 0) throw new Error('At least one emergency power must be requested');

    // Validate all requested powers exist
    for (const power of requestedPowers) {
      if (!this.isPowerAvailable(power)) {
        throw new Error(`Emergency power not available: ${power}`);
      }
    }

    const now = new Date();
    const sunsetAt = new Date(now.getTime() + this.framework.maxActivationDurationDays * 24 * 3600 * 1000);

    const activation: EmergencyActivation = {
      id: this.generateId(),
      triggerCondition,
      triggerDetails,
      triggeredBy,
      activatedPowers: requestedPowers,
      affectedComponents: this.getAffectedComponents(requestedPowers),
      activatedAt: now,
      sunsetAt,
      active: true,
    };

    this.emergencies.set(activation.id, activation);

    this.emit({
      type: 'emergency.activated',
      data: {
        emergencyId: activation.id,
        triggerCondition,
        powers: requestedPowers,
        sunsetAt: sunsetAt.toISOString(),
        triggeredBy,
      },
      timestamp: now,
    });

    return activation;
  }

  // --------------------------------------------------------------------------
  // Resolution
  // --------------------------------------------------------------------------

  resolveEmergency(
    emergencyId: string,
    resolvedBy: string,
    resolutionNotes: string
  ): EmergencyActivation {
    const emergency = this.emergencies.get(emergencyId);
    if (!emergency) throw new Error(`Emergency ${emergencyId} not found`);
    if (!emergency.active) throw new Error(`Emergency ${emergencyId} is already resolved`);
    if (!resolvedBy) throw new Error('Resolver identity required');

    const now = new Date();
    const resolved: EmergencyActivation = {
      ...emergency,
      active: false,
      resolvedAt: now,
      resolvedBy,
      resolutionNotes,
    };

    this.emergencies.set(emergencyId, resolved);

    this.emit({
      type: 'emergency.resolved',
      data: { emergencyId, resolvedBy, resolutionNotes },
      timestamp: now,
    });

    return resolved;
  }

  // --------------------------------------------------------------------------
  // Sunset Enforcement
  // --------------------------------------------------------------------------

  expireOverdueEmergencies(): EmergencyActivation[] {
    const now = new Date();
    const expired: EmergencyActivation[] = [];

    for (const emergency of this.emergencies.values()) {
      if (emergency.active && emergency.sunsetAt <= now) {
        const expiredEmergency: EmergencyActivation = {
          ...emergency,
          active: false,
          resolvedAt: now,
          resolvedBy: 'system_sunset',
          resolutionNotes: 'Emergency powers automatically expired at constitutional sunset time',
        };
        this.emergencies.set(emergency.id, expiredEmergency);
        expired.push(expiredEmergency);

        this.emit({
          type: 'emergency.expired',
          data: { emergencyId: emergency.id, sunsetAt: emergency.sunsetAt.toISOString() },
          timestamp: now,
        });
      }
    }

    return expired;
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  canActivate(triggerCondition: EmergencyTriggerCondition): boolean {
    const triggerDef = this.framework.triggerConditions.find(t => t.condition === triggerCondition);
    return triggerDef !== undefined;
  }

  isPowerAvailable(power: EmergencyPowerType): boolean {
    return this.framework.availablePowers.some(p => p.power === power);
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

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private getAffectedComponents(powers: EmergencyPowerType[]): string[] {
    const components = new Set<string>();
    for (const power of powers) {
      const def = this.framework.availablePowers.find(p => p.power === power);
      if (def) {
        for (const sys of def.affectedSystems) {
          components.add(sys);
        }
      }
    }
    return Array.from(components);
  }

  private emit(event: ConstitutionEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `ef-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createEmergencyFrameworkManager(
  initialFramework?: Partial<EmergencyFramework>
): DefaultEmergencyFrameworkManager {
  return new DefaultEmergencyFrameworkManager(initialFramework);
}
