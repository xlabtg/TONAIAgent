/**
 * SDACL Component 4 — Jurisdiction Enforcement Layer
 *
 * Implements geographic restrictions, participant eligibility,
 * sovereign asset isolation, sanction-aware routing (configurable),
 * and modular, opt-in enforcement rules.
 */

import {
  JurisdictionRule,
  RestrictionType,
  EnforcementAction,
  ParticipantEligibility,
  EnforcementEvent,
  JurisdictionEnforcementStatus,
  SovereignAssetId,
  ParticipantId,
  JurisdictionCode,
  EnforcementRuleId,
  SDACLEvent,
  SDACLEventCallback,
} from './types';

// ============================================================================
// Jurisdiction Enforcement Layer Interface
// ============================================================================

export interface JurisdictionEnforcementManager {
  // Rule management
  createRule(params: CreateRuleParams): JurisdictionRule;
  getRule(ruleId: EnforcementRuleId): JurisdictionRule | undefined;
  listRules(filters?: RuleFilters): JurisdictionRule[];
  updateRule(ruleId: EnforcementRuleId, updates: Partial<UpdateRuleParams>): JurisdictionRule;
  enableRule(ruleId: EnforcementRuleId): void;
  disableRule(ruleId: EnforcementRuleId): void;
  deleteRule(ruleId: EnforcementRuleId): void;

  // Participant eligibility
  checkParticipantEligibility(params: CheckEligibilityParams): ParticipantEligibility;
  getParticipantEligibility(participantId: ParticipantId): ParticipantEligibility | undefined;
  updateParticipantKycLevel(participantId: ParticipantId, kycLevel: ParticipantEligibility['kycLevel']): void;
  flagParticipantSanction(participantId: ParticipantId, clear: boolean): void;

  // Transaction enforcement
  evaluateTransaction(params: EvaluateTransactionParams): TransactionEvaluation;
  getEnforcementEvents(filters?: EnforcementEventFilters): EnforcementEvent[];

  // Sanction list management
  loadSanctionList(listRef: string, entries: string[]): void;
  checkSanctionList(listRef: string, participantId: ParticipantId): boolean;

  getComponentStatus(): JurisdictionEnforcementStatus;
  onEvent(callback: SDACLEventCallback): void;
}

export interface CreateRuleParams {
  jurisdictionCode: JurisdictionCode;
  restrictionType: RestrictionType;
  description: string;
  targetAssets: SovereignAssetId[] | '*';
  targetParticipants?: ParticipantId[] | '*';
  enforcementAction: EnforcementAction;
  volumeLimitUsd?: number;
  kycThreshold?: number;
  sanctionListRef?: string;
  enabled?: boolean;
  optIn?: boolean;
}

export interface UpdateRuleParams {
  description?: string;
  targetAssets?: SovereignAssetId[] | '*';
  targetParticipants?: ParticipantId[] | '*';
  enforcementAction?: EnforcementAction;
  volumeLimitUsd?: number;
  kycThreshold?: number;
  sanctionListRef?: string;
  enabled?: boolean;
  optIn?: boolean;
}

export interface RuleFilters {
  jurisdictionCode?: JurisdictionCode;
  restrictionType?: RestrictionType;
  enforcementAction?: EnforcementAction;
  enabled?: boolean;
}

export interface CheckEligibilityParams {
  participantId: ParticipantId;
  jurisdictionCode: JurisdictionCode;
  kycLevel?: ParticipantEligibility['kycLevel'];
}

export interface EvaluateTransactionParams {
  participantId: ParticipantId;
  assetId: SovereignAssetId;
  jurisdictionCode: JurisdictionCode;
  transactionAmountUsd: number;
}

export interface TransactionEvaluation {
  allowed: boolean;
  triggeredRules: EnforcementRuleId[];
  actions: EnforcementAction[];
  blockedReason?: string;
  requiresApproval: boolean;
  flaggedForReview: boolean;
  evaluatedAt: Date;
}

export interface EnforcementEventFilters {
  jurisdictionCode?: JurisdictionCode;
  ruleId?: EnforcementRuleId;
  participantId?: ParticipantId;
  assetId?: SovereignAssetId;
  action?: EnforcementAction;
  fromDate?: Date;
  toDate?: Date;
}

// ============================================================================
// Default Jurisdiction Enforcement Manager
// ============================================================================

export class DefaultJurisdictionEnforcementManager implements JurisdictionEnforcementManager {
  private readonly rules: Map<EnforcementRuleId, JurisdictionRule> = new Map();
  private readonly participantEligibility: Map<ParticipantId, ParticipantEligibility> = new Map();
  private readonly enforcementEvents: EnforcementEvent[] = [];
  private readonly sanctionLists: Map<string, Set<string>> = new Map();
  private readonly eventCallbacks: SDACLEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  createRule(params: CreateRuleParams): JurisdictionRule {
    const rule: JurisdictionRule = {
      id: this.generateId('rule'),
      jurisdictionCode: params.jurisdictionCode,
      restrictionType: params.restrictionType,
      description: params.description,
      targetAssets: params.targetAssets,
      targetParticipants: params.targetParticipants,
      enforcementAction: params.enforcementAction,
      volumeLimitUsd: params.volumeLimitUsd,
      kycThreshold: params.kycThreshold,
      sanctionListRef: params.sanctionListRef,
      enabled: params.enabled ?? true,
      optIn: params.optIn ?? false,
      createdAt: new Date(),
    };

    this.rules.set(rule.id, rule);
    return rule;
  }

  getRule(ruleId: EnforcementRuleId): JurisdictionRule | undefined {
    return this.rules.get(ruleId);
  }

  listRules(filters?: RuleFilters): JurisdictionRule[] {
    let result = Array.from(this.rules.values());
    if (filters?.jurisdictionCode) result = result.filter(r => r.jurisdictionCode === filters.jurisdictionCode);
    if (filters?.restrictionType) result = result.filter(r => r.restrictionType === filters.restrictionType);
    if (filters?.enforcementAction) result = result.filter(r => r.enforcementAction === filters.enforcementAction);
    if (filters?.enabled !== undefined) result = result.filter(r => r.enabled === filters.enabled);
    return result;
  }

  updateRule(ruleId: EnforcementRuleId, updates: Partial<UpdateRuleParams>): JurisdictionRule {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error(`Jurisdiction rule ${ruleId} not found`);

    const updated: JurisdictionRule = {
      ...rule,
      ...updates,
    };
    this.rules.set(ruleId, updated);
    return updated;
  }

  enableRule(ruleId: EnforcementRuleId): void {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error(`Jurisdiction rule ${ruleId} not found`);
    this.rules.set(ruleId, { ...rule, enabled: true });
  }

  disableRule(ruleId: EnforcementRuleId): void {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error(`Jurisdiction rule ${ruleId} not found`);
    this.rules.set(ruleId, { ...rule, enabled: false });
  }

  deleteRule(ruleId: EnforcementRuleId): void {
    if (!this.rules.has(ruleId)) throw new Error(`Jurisdiction rule ${ruleId} not found`);
    this.rules.delete(ruleId);
  }

  checkParticipantEligibility(params: CheckEligibilityParams): ParticipantEligibility {
    const { participantId, jurisdictionCode, kycLevel } = params;

    // Check if participant is on any sanction list
    let sanctionClear = true;
    for (const [, sanctionSet] of this.sanctionLists.entries()) {
      if (sanctionSet.has(participantId)) {
        sanctionClear = false;
        break;
      }
    }

    // Determine restricted assets
    const restrictedAssets: SovereignAssetId[] = [];
    const applicableRules = Array.from(this.rules.values()).filter(
      r => r.enabled && r.jurisdictionCode === jurisdictionCode
    );

    for (const rule of applicableRules) {
      if (rule.restrictionType === 'asset_isolation' && rule.targetAssets !== '*') {
        for (const assetId of rule.targetAssets) {
          if (!restrictedAssets.includes(assetId)) {
            restrictedAssets.push(assetId);
          }
        }
      }
    }

    const eligibility: ParticipantEligibility = {
      participantId,
      jurisdictionCode,
      eligible: sanctionClear,
      kycLevel: kycLevel ?? 'none',
      sanctionChecked: true,
      sanctionClear,
      restrictedAssets,
      eligibilityCheckedAt: new Date(),
      reason: !sanctionClear ? 'Participant found on sanction list' : undefined,
    };

    this.participantEligibility.set(participantId, eligibility);

    this.emitEvent('participant_eligibility_checked', 4, {
      participantId,
      jurisdictionCode,
      eligible: eligibility.eligible,
      sanctionClear,
    });

    return eligibility;
  }

  getParticipantEligibility(participantId: ParticipantId): ParticipantEligibility | undefined {
    return this.participantEligibility.get(participantId);
  }

  updateParticipantKycLevel(participantId: ParticipantId, kycLevel: ParticipantEligibility['kycLevel']): void {
    const existing = this.participantEligibility.get(participantId);
    if (!existing) throw new Error(`Participant eligibility for ${participantId} not found`);
    this.participantEligibility.set(participantId, { ...existing, kycLevel });
  }

  flagParticipantSanction(participantId: ParticipantId, clear: boolean): void {
    const existing = this.participantEligibility.get(participantId);
    if (!existing) throw new Error(`Participant eligibility for ${participantId} not found`);
    this.participantEligibility.set(participantId, {
      ...existing,
      sanctionClear: clear,
      eligible: clear,
      reason: clear ? undefined : 'Participant flagged on sanction list',
    });
  }

  evaluateTransaction(params: EvaluateTransactionParams): TransactionEvaluation {
    const { participantId, assetId, jurisdictionCode, transactionAmountUsd } = params;

    const triggeredRules: EnforcementRuleId[] = [];
    const actions: EnforcementAction[] = [];
    let allowed = true;
    let blockedReason: string | undefined;
    let requiresApproval = false;
    let flaggedForReview = false;

    const applicableRules = Array.from(this.rules.values()).filter(
      r => r.enabled && r.jurisdictionCode === jurisdictionCode
    );

    // Check participant eligibility
    const eligibility = this.participantEligibility.get(participantId);
    if (eligibility && !eligibility.eligible) {
      allowed = false;
      blockedReason = eligibility.reason ?? 'Participant not eligible';
    }

    // Check restricted assets
    if (eligibility?.restrictedAssets.includes(assetId)) {
      allowed = false;
      blockedReason = `Asset ${assetId} is restricted for participant ${participantId}`;
    }

    // Evaluate each rule
    for (const rule of applicableRules) {
      let triggered = false;

      // Check if rule applies to this asset
      if (rule.targetAssets !== '*' && !rule.targetAssets.includes(assetId)) {
        continue;
      }

      // Check if rule applies to this participant
      if (rule.targetParticipants && rule.targetParticipants !== '*') {
        if (!rule.targetParticipants.includes(participantId)) {
          continue;
        }
      }

      // Check volume limit
      if (rule.restrictionType === 'volume_limit' && rule.volumeLimitUsd !== undefined) {
        if (transactionAmountUsd > rule.volumeLimitUsd) {
          triggered = true;
        }
      }

      // Check KYC threshold
      // Transactions above KYC threshold require enhanced or institutional KYC
      if (rule.restrictionType === 'kyc_threshold' && rule.kycThreshold !== undefined) {
        if (transactionAmountUsd > rule.kycThreshold) {
          const kycLevelScore = this.getKycLevelScore(eligibility?.kycLevel ?? 'none');
          // Require at least enhanced (3) or institutional (4) KYC for high-value transactions
          if (kycLevelScore < 3) {
            triggered = true;
          }
        }
      }

      // Check sanction
      if (rule.restrictionType === 'sanction' && rule.sanctionListRef) {
        const onSanctionList = this.checkSanctionList(rule.sanctionListRef, participantId);
        if (onSanctionList) {
          triggered = true;
        }
      }

      // Check geographic restriction
      if (rule.restrictionType === 'geographic') {
        triggered = true;
      }

      // Check asset isolation
      if (rule.restrictionType === 'asset_isolation') {
        if (rule.targetAssets !== '*' && rule.targetAssets.includes(assetId)) {
          triggered = true;
        }
      }

      // Check participant eligibility restriction
      if (rule.restrictionType === 'participant_eligibility') {
        if (eligibility && !eligibility.eligible) {
          triggered = true;
        }
      }

      if (triggered) {
        triggeredRules.push(rule.id);
        actions.push(rule.enforcementAction);

        // Record enforcement event
        const event: EnforcementEvent = {
          id: this.generateId('enforcement_event'),
          ruleId: rule.id,
          participantId,
          assetId,
          jurisdictionCode,
          action: rule.enforcementAction,
          triggered: true,
          details: `Rule ${rule.id} (${rule.restrictionType}) triggered for transaction`,
          timestamp: new Date(),
        };
        this.enforcementEvents.push(event);

        this.emitEvent('enforcement_triggered', 4, {
          eventId: event.id,
          ruleId: rule.id,
          participantId,
          assetId,
          action: rule.enforcementAction,
        });

        // Apply enforcement action
        switch (rule.enforcementAction) {
          case 'block':
            allowed = false;
            blockedReason = blockedReason ?? `Blocked by rule ${rule.id}: ${rule.description}`;
            break;
          case 'require_approval':
            requiresApproval = true;
            break;
          case 'flag':
            flaggedForReview = true;
            break;
          case 'limit':
            if (rule.volumeLimitUsd && transactionAmountUsd > rule.volumeLimitUsd) {
              allowed = false;
              blockedReason = `Transaction exceeds volume limit of ${rule.volumeLimitUsd} USD`;
            }
            break;
          case 'report':
            flaggedForReview = true;
            break;
        }
      }
    }

    return {
      allowed,
      triggeredRules,
      actions,
      blockedReason,
      requiresApproval,
      flaggedForReview,
      evaluatedAt: new Date(),
    };
  }

  getEnforcementEvents(filters?: EnforcementEventFilters): EnforcementEvent[] {
    let result = [...this.enforcementEvents];

    if (filters?.jurisdictionCode) {
      result = result.filter(e => e.jurisdictionCode === filters.jurisdictionCode);
    }
    if (filters?.ruleId) {
      result = result.filter(e => e.ruleId === filters.ruleId);
    }
    if (filters?.participantId) {
      result = result.filter(e => e.participantId === filters.participantId);
    }
    if (filters?.assetId) {
      result = result.filter(e => e.assetId === filters.assetId);
    }
    if (filters?.action) {
      result = result.filter(e => e.action === filters.action);
    }
    if (filters?.fromDate) {
      result = result.filter(e => e.timestamp >= filters.fromDate!);
    }
    if (filters?.toDate) {
      result = result.filter(e => e.timestamp <= filters.toDate!);
    }

    return result;
  }

  loadSanctionList(listRef: string, entries: string[]): void {
    this.sanctionLists.set(listRef, new Set(entries));
  }

  checkSanctionList(listRef: string, participantId: ParticipantId): boolean {
    const list = this.sanctionLists.get(listRef);
    if (!list) return false;
    return list.has(participantId);
  }

  getComponentStatus(): JurisdictionEnforcementStatus {
    const rules = Array.from(this.rules.values());
    const activeRules = rules.filter(r => r.enabled);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventsToday = this.enforcementEvents.filter(e => e.timestamp >= today);
    const blockedToday = eventsToday.filter(e => e.action === 'block').length;
    const flaggedToday = eventsToday.filter(e => e.action === 'flag' || e.action === 'report').length;

    return {
      totalRules: rules.length,
      activeRules: activeRules.length,
      enforcementEventsToday: eventsToday.length,
      participantsChecked: this.participantEligibility.size,
      blockedTransactions: blockedToday,
      flaggedTransactions: flaggedToday,
    };
  }

  onEvent(callback: SDACLEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private getKycLevelScore(kycLevel: ParticipantEligibility['kycLevel']): number {
    switch (kycLevel) {
      case 'institutional': return 4;
      case 'enhanced': return 3;
      case 'basic': return 2;
      case 'none': return 1;
      default: return 0;
    }
  }

  private emitEvent(type: SDACLEvent['type'], component: SDACLEvent['component'], data: Record<string, unknown>): void {
    const event: SDACLEvent = { type, component, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createJurisdictionEnforcementManager(): DefaultJurisdictionEnforcementManager {
  return new DefaultJurisdictionEnforcementManager();
}
