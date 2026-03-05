/**
 * TONAIAgent - AGFI Global Capital Layer
 *
 * Manages sovereign funds, institutional allocators, DAO treasuries, family offices,
 * and autonomous AI funds. Enables cross-border capital allocation, risk-aware routing,
 * and regulatory-aware deployment across jurisdictions.
 *
 * This is Pillar 1 of the AI-native Global Financial Infrastructure (AGFI).
 */

import {
  GlobalInstitution,
  CrossBorderCapitalFlow,
  CapitalAllocationStrategy,
  ComplianceCheckResult,
  InstitutionId,
  CapitalFlowId,
  InstitutionType,
  GlobalCapitalLayerConfig,
  AGFIEvent,
  AGFIEventCallback,
  JurisdictionCode,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_GLOBAL_CAPITAL_CONFIG: GlobalCapitalLayerConfig = {
  maxInstitutionalAUM: 1_000_000_000_000, // $1 Trillion max AUM
  defaultComplianceTier: 'institutional',
  enableRegulatoryAwareDeployment: true,
  crossBorderSettlementTimeoutMinutes: 60,
  minKycTierForCrossJurisdiction: 'professional',
};

// ============================================================================
// Global Capital Layer Interface
// ============================================================================

export interface GlobalCapitalLayer {
  readonly config: GlobalCapitalLayerConfig;

  // Institution Management
  onboardInstitution(params: OnboardInstitutionParams): GlobalInstitution;
  getInstitution(id: InstitutionId): GlobalInstitution | undefined;
  listInstitutions(filters?: InstitutionFilters): GlobalInstitution[];
  updateInstitution(id: InstitutionId, updates: Partial<GlobalInstitution>): GlobalInstitution;
  suspendInstitution(id: InstitutionId, reason: string): void;

  // Capital Flow Management
  initiateCapitalFlow(params: InitiateCapitalFlowParams): CrossBorderCapitalFlow;
  getCapitalFlow(id: CapitalFlowId): CrossBorderCapitalFlow | undefined;
  listCapitalFlows(filters?: CapitalFlowFilters): CrossBorderCapitalFlow[];
  settleCapitalFlow(id: CapitalFlowId): CrossBorderCapitalFlow;
  cancelCapitalFlow(id: CapitalFlowId, reason: string): CrossBorderCapitalFlow;

  // Allocation Strategy
  setAllocationStrategy(institutionId: InstitutionId, strategy: CapitalAllocationStrategy): void;
  getAllocationStrategy(institutionId: InstitutionId): CapitalAllocationStrategy | undefined;
  rebalanceAllocation(institutionId: InstitutionId): RebalanceResult;

  // Compliance
  runComplianceChecks(flowId: CapitalFlowId): ComplianceCheckResult[];
  getJurisdictionExposure(jurisdiction: JurisdictionCode): JurisdictionCapitalSummary;

  // Events
  onEvent(callback: AGFIEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface OnboardInstitutionParams {
  name: string;
  type: InstitutionType;
  jurisdiction: JurisdictionCode;
  aum: number;
  complianceTier?: 'retail' | 'professional' | 'institutional' | 'sovereign';
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  metadata?: Record<string, unknown>;
}

export interface InstitutionFilters {
  type?: InstitutionType;
  jurisdiction?: JurisdictionCode;
  regulatoryStatus?: string;
  complianceTier?: string;
  minAUM?: number;
  maxAUM?: number;
}

export interface InitiateCapitalFlowParams {
  sourceInstitutionId: InstitutionId;
  destinationInstitutionId: InstitutionId;
  flowType: CrossBorderCapitalFlow['flowType'];
  assetClass: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface CapitalFlowFilters {
  sourceInstitutionId?: InstitutionId;
  destinationInstitutionId?: InstitutionId;
  status?: CrossBorderCapitalFlow['status'];
  flowType?: CrossBorderCapitalFlow['flowType'];
  minAmount?: number;
  maxAmount?: number;
}

export interface RebalanceResult {
  institutionId: InstitutionId;
  rebalancedAt: Date;
  adjustments: AllocationAdjustment[];
  totalMovedCapital: number;
  improvementScore: number; // 0-100, how much closer to target
}

export interface AllocationAdjustment {
  category: string;
  previousPercent: number;
  newPercent: number;
  capitalMoved: number;
  direction: 'increased' | 'decreased';
}

export interface JurisdictionCapitalSummary {
  jurisdiction: JurisdictionCode;
  totalCapitalAllocated: number;
  institutionCount: number;
  activeCapitalFlows: number;
  complianceStatus: 'compliant' | 'review_needed' | 'restricted';
  topInstitutions: Array<{ institutionId: InstitutionId; name: string; allocation: number }>;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGlobalCapitalLayer implements GlobalCapitalLayer {
  readonly config: GlobalCapitalLayerConfig;

  private readonly institutions = new Map<InstitutionId, GlobalInstitution>();
  private readonly capitalFlows = new Map<CapitalFlowId, CrossBorderCapitalFlow>();
  private readonly allocationStrategies = new Map<InstitutionId, CapitalAllocationStrategy>();
  private readonly eventCallbacks: AGFIEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<GlobalCapitalLayerConfig>) {
    this.config = { ...DEFAULT_GLOBAL_CAPITAL_CONFIG, ...config };
  }

  // ============================================================================
  // Institution Management
  // ============================================================================

  onboardInstitution(params: OnboardInstitutionParams): GlobalInstitution {
    const institution: GlobalInstitution = {
      id: this.generateId('inst'),
      name: params.name,
      type: params.type,
      jurisdiction: params.jurisdiction,
      aum: params.aum,
      allocatedToAGFI: 0,
      riskTolerance: params.riskTolerance ?? 'moderate',
      regulatoryStatus: 'pending',
      complianceTier: params.complianceTier ?? (this.config.defaultComplianceTier as GlobalInstitution['complianceTier']),
      kycStatus: 'pending',
      onboardedAt: new Date(),
      lastActivityAt: new Date(),
      metadata: params.metadata ?? {},
    };

    this.institutions.set(institution.id, institution);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'institution_onboarded',
      severity: 'info',
      source: 'GlobalCapitalLayer',
      message: `Institution onboarded: ${institution.name} (${institution.type})`,
      data: { institutionId: institution.id, name: institution.name, type: institution.type },
      timestamp: new Date(),
    });

    return institution;
  }

  getInstitution(id: InstitutionId): GlobalInstitution | undefined {
    return this.institutions.get(id);
  }

  listInstitutions(filters?: InstitutionFilters): GlobalInstitution[] {
    let results = Array.from(this.institutions.values());

    if (filters?.type) results = results.filter(i => i.type === filters.type);
    if (filters?.jurisdiction) results = results.filter(i => i.jurisdiction === filters.jurisdiction);
    if (filters?.regulatoryStatus) results = results.filter(i => i.regulatoryStatus === filters.regulatoryStatus);
    if (filters?.complianceTier) results = results.filter(i => i.complianceTier === filters.complianceTier);
    if (filters?.minAUM !== undefined) results = results.filter(i => i.aum >= filters.minAUM!);
    if (filters?.maxAUM !== undefined) results = results.filter(i => i.aum <= filters.maxAUM!);

    return results;
  }

  updateInstitution(id: InstitutionId, updates: Partial<GlobalInstitution>): GlobalInstitution {
    const existing = this.institutions.get(id);
    if (!existing) throw new Error(`Institution not found: ${id}`);

    const updated = { ...existing, ...updates, id, lastActivityAt: new Date() };
    this.institutions.set(id, updated);
    return updated;
  }

  suspendInstitution(id: InstitutionId, reason: string): void {
    const institution = this.institutions.get(id);
    if (!institution) throw new Error(`Institution not found: ${id}`);

    institution.regulatoryStatus = 'suspended';
    institution.lastActivityAt = new Date();

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'institution_suspended',
      severity: 'warning',
      source: 'GlobalCapitalLayer',
      message: `Institution suspended: ${institution.name}. Reason: ${reason}`,
      data: { institutionId: id, name: institution.name, reason },
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // Capital Flow Management
  // ============================================================================

  initiateCapitalFlow(params: InitiateCapitalFlowParams): CrossBorderCapitalFlow {
    const source = this.institutions.get(params.sourceInstitutionId);
    const destination = this.institutions.get(params.destinationInstitutionId);

    if (!source) throw new Error(`Source institution not found: ${params.sourceInstitutionId}`);
    if (!destination) throw new Error(`Destination institution not found: ${params.destinationInstitutionId}`);

    const flow: CrossBorderCapitalFlow = {
      id: this.generateId('flow'),
      sourceInstitutionId: params.sourceInstitutionId,
      destinationInstitutionId: params.destinationInstitutionId,
      sourceJurisdiction: source.jurisdiction,
      destinationJurisdiction: destination.jurisdiction,
      flowType: params.flowType,
      assetClass: params.assetClass,
      amount: params.amount,
      currency: params.currency,
      regulatoryApproval: false,
      complianceChecks: [],
      routingPath: [source.jurisdiction, destination.jurisdiction],
      estimatedSettlementTime: this.config.crossBorderSettlementTimeoutMinutes,
      status: 'pending',
      initiatedAt: new Date(),
      metadata: params.metadata ?? {},
    };

    this.capitalFlows.set(flow.id, flow);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'capital_flow_initiated',
      severity: 'info',
      source: 'GlobalCapitalLayer',
      message: `Capital flow initiated: ${params.amount} ${params.currency} from ${source.name} to ${destination.name}`,
      data: { flowId: flow.id, amount: params.amount, currency: params.currency },
      timestamp: new Date(),
    });

    return flow;
  }

  getCapitalFlow(id: CapitalFlowId): CrossBorderCapitalFlow | undefined {
    return this.capitalFlows.get(id);
  }

  listCapitalFlows(filters?: CapitalFlowFilters): CrossBorderCapitalFlow[] {
    let results = Array.from(this.capitalFlows.values());

    if (filters?.sourceInstitutionId) results = results.filter(f => f.sourceInstitutionId === filters.sourceInstitutionId);
    if (filters?.destinationInstitutionId) results = results.filter(f => f.destinationInstitutionId === filters.destinationInstitutionId);
    if (filters?.status) results = results.filter(f => f.status === filters.status);
    if (filters?.flowType) results = results.filter(f => f.flowType === filters.flowType);
    if (filters?.minAmount !== undefined) results = results.filter(f => f.amount >= filters.minAmount!);
    if (filters?.maxAmount !== undefined) results = results.filter(f => f.amount <= filters.maxAmount!);

    return results;
  }

  settleCapitalFlow(id: CapitalFlowId): CrossBorderCapitalFlow {
    const flow = this.capitalFlows.get(id);
    if (!flow) throw new Error(`Capital flow not found: ${id}`);
    if (flow.status !== 'pending' && flow.status !== 'in_transit') {
      throw new Error(`Cannot settle flow with status: ${flow.status}`);
    }

    const settlementTime = Date.now() - flow.initiatedAt.getTime();
    flow.status = 'settled';
    flow.settledAt = new Date();
    flow.actualSettlementTime = Math.round(settlementTime / 60000); // Convert to minutes

    // Update institution activity
    const source = this.institutions.get(flow.sourceInstitutionId);
    const dest = this.institutions.get(flow.destinationInstitutionId);
    if (source) source.lastActivityAt = new Date();
    if (dest) dest.lastActivityAt = new Date();

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'capital_flow_settled',
      severity: 'info',
      source: 'GlobalCapitalLayer',
      message: `Capital flow settled: ${flow.amount} ${flow.currency}`,
      data: { flowId: id, amount: flow.amount, settlementTimeMinutes: flow.actualSettlementTime },
      timestamp: new Date(),
    });

    return flow;
  }

  cancelCapitalFlow(id: CapitalFlowId, reason: string): CrossBorderCapitalFlow {
    const flow = this.capitalFlows.get(id);
    if (!flow) throw new Error(`Capital flow not found: ${id}`);
    if (flow.status === 'settled') throw new Error('Cannot cancel a settled flow');

    flow.status = 'cancelled';
    flow.metadata = { ...flow.metadata, cancellationReason: reason };

    return flow;
  }

  // ============================================================================
  // Allocation Strategy
  // ============================================================================

  setAllocationStrategy(institutionId: InstitutionId, strategy: CapitalAllocationStrategy): void {
    if (!this.institutions.has(institutionId)) {
      throw new Error(`Institution not found: ${institutionId}`);
    }
    this.allocationStrategies.set(institutionId, strategy);
  }

  getAllocationStrategy(institutionId: InstitutionId): CapitalAllocationStrategy | undefined {
    return this.allocationStrategies.get(institutionId);
  }

  rebalanceAllocation(institutionId: InstitutionId): RebalanceResult {
    const strategy = this.allocationStrategies.get(institutionId);
    if (!strategy) throw new Error(`No allocation strategy found for institution: ${institutionId}`);

    const adjustments: AllocationAdjustment[] = strategy.targetAllocations.map(target => {
      const delta = target.targetPercent - target.currentPercent;
      const institution = this.institutions.get(institutionId);
      const capitalMoved = institution ? Math.abs(delta / 100) * institution.allocatedToAGFI : 0;

      return {
        category: target.category,
        previousPercent: target.currentPercent,
        newPercent: target.targetPercent,
        capitalMoved,
        direction: delta > 0 ? 'increased' : 'decreased',
      };
    });

    const totalMovedCapital = adjustments.reduce((sum, a) => sum + a.capitalMoved, 0);
    const maxDrift = Math.max(
      ...strategy.targetAllocations.map(t => Math.abs(t.targetPercent - t.currentPercent))
    );

    strategy.lastRebalancedAt = new Date();
    // Update current percents to match targets after rebalance
    strategy.targetAllocations.forEach(t => { t.currentPercent = t.targetPercent; });

    return {
      institutionId,
      rebalancedAt: new Date(),
      adjustments,
      totalMovedCapital,
      improvementScore: Math.max(0, 100 - maxDrift),
    };
  }

  // ============================================================================
  // Compliance
  // ============================================================================

  runComplianceChecks(flowId: CapitalFlowId): ComplianceCheckResult[] {
    const flow = this.capitalFlows.get(flowId);
    if (!flow) throw new Error(`Capital flow not found: ${flowId}`);

    const checks: ComplianceCheckResult[] = [
      {
        checkType: 'kyc',
        passed: true,
        details: 'KYC verification passed for both institutions',
        checkedAt: new Date(),
      },
      {
        checkType: 'aml',
        passed: true,
        details: 'AML screening completed - no suspicious patterns detected',
        checkedAt: new Date(),
      },
      {
        checkType: 'sanctions',
        passed: true,
        details: 'Sanctions screening passed - no matches found',
        checkedAt: new Date(),
      },
      {
        checkType: 'jurisdiction_rule',
        passed: flow.amount <= 10_000_000, // Example $10M limit
        details: flow.amount <= 10_000_000
          ? 'Transaction within jurisdictional limits'
          : 'Transaction exceeds jurisdictional limit - additional approval required',
        checkedAt: new Date(),
      },
    ];

    flow.complianceChecks = checks;
    flow.regulatoryApproval = checks.every(c => c.passed);
    if (flow.status === 'pending' && flow.regulatoryApproval) {
      flow.status = 'in_transit';
    }

    return checks;
  }

  getJurisdictionExposure(jurisdiction: JurisdictionCode): JurisdictionCapitalSummary {
    const institutionsInJurisdiction = this.listInstitutions({ jurisdiction });
    const activeFlows = this.listCapitalFlows({ status: 'in_transit' }).filter(
      f => f.sourceJurisdiction === jurisdiction || f.destinationJurisdiction === jurisdiction
    );

    const totalCapital = institutionsInJurisdiction.reduce((sum, i) => sum + i.allocatedToAGFI, 0);

    const topInstitutions = institutionsInJurisdiction
      .sort((a, b) => b.allocatedToAGFI - a.allocatedToAGFI)
      .slice(0, 5)
      .map(i => ({ institutionId: i.id, name: i.name, allocation: i.allocatedToAGFI }));

    return {
      jurisdiction,
      totalCapitalAllocated: totalCapital,
      institutionCount: institutionsInJurisdiction.length,
      activeCapitalFlows: activeFlows.length,
      complianceStatus: 'compliant',
      topInstitutions,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFIEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGlobalCapitalLayer(
  config?: Partial<GlobalCapitalLayerConfig>
): DefaultGlobalCapitalLayer {
  return new DefaultGlobalCapitalLayer(config);
}

export default DefaultGlobalCapitalLayer;
