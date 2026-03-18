/**
 * TONAIAgent - Treasury Capital Allocation Engine (Issue #123)
 *
 * Deploys treasury capital strategically across:
 * - Insurance backstop
 * - Liquidity injection
 * - New fund seeding
 * - RWA onboarding
 * - Stabilization
 * - Strategic co-investments
 * - Protocol upgrades
 */

import type {
  CapitalDeploymentRequest,
  CapitalDeploymentResult,
  CapitalDeploymentType,
  CapitalAllocationConfig,
  MonetaryPolicyEvent,
  MonetaryPolicyEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface TreasuryCapitalAllocator {
  // Deployment requests
  requestDeployment(
    type: CapitalDeploymentType,
    amount: number,
    targetId: string,
    targetName: string,
    rationale: string,
    requester: string,
    urgency?: CapitalDeploymentRequest['urgency'],
    expectedReturn?: number,
    expectedImpact?: string
  ): CapitalDeploymentRequest;

  // Execution
  executeDeployment(
    requestId: string,
    deployedAmount: number,
    approvalId?: string,
    txHash?: string
  ): CapitalDeploymentResult;
  rejectDeployment(requestId: string, reason: string): CapitalDeploymentResult;

  // Queries
  getRequest(requestId: string): CapitalDeploymentRequest | undefined;
  getPendingRequests(): CapitalDeploymentRequest[];
  getDeploymentHistory(limit?: number): CapitalDeploymentResult[];
  getTotalDeployedByType(): Record<CapitalDeploymentType, number>;

  // Emergency deploy
  emergencyDeploy(
    type: CapitalDeploymentType,
    amount: number,
    targetId: string,
    targetName: string,
    reason: string,
    triggeredBy: string
  ): CapitalDeploymentResult;

  // Config
  getConfig(): CapitalAllocationConfig;
  updateConfig(config: Partial<CapitalAllocationConfig>): void;

  // Events
  onEvent(callback: MonetaryPolicyEventCallback): () => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CAPITAL_ALLOCATION_CONFIG: CapitalAllocationConfig = {
  maxAutoDeployPercent: 5,          // AI can auto-deploy up to 5% without governance
  requireGovernanceAbovePercent: 10, // Governance vote above 10%
  emergencyDeployEnabled: true,
  maxEmergencyDeployPercent: 15,
  allocationLimits: {
    insurance_backstop: 20,
    liquidity_injection: 25,
    fund_seeding: 15,
    rwa_onboarding: 10,
    stabilization: 20,
    strategic_investment: 10,
    protocol_upgrade: 10,
  },
  coInvestmentEnabled: true,
  maxCoInvestmentPercent: 5,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTreasuryCapitalAllocator implements TreasuryCapitalAllocator {
  private config: CapitalAllocationConfig;
  private readonly requests = new Map<string, CapitalDeploymentRequest>();
  private readonly results: CapitalDeploymentResult[] = [];
  private readonly eventCallbacks: MonetaryPolicyEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<CapitalAllocationConfig>) {
    this.config = { ...DEFAULT_CAPITAL_ALLOCATION_CONFIG, ...config };
  }

  private nextId(): string {
    return `cap-${++this.idCounter}-${Date.now()}`;
  }

  private emit(type: MonetaryPolicyEvent['type'], data: Record<string, unknown>): void {
    const event: MonetaryPolicyEvent = { type, data, timestamp: new Date() };
    for (const cb of this.eventCallbacks) cb(event);
  }

  private determineRequiredApproval(
    type: CapitalDeploymentType,
    amount: number,
    urgency: CapitalDeploymentRequest['urgency'],
    treasuryValue: number
  ): CapitalDeploymentRequest['requiredApproval'] {
    if (urgency === 'critical') return 'ai_auto';

    const percent = treasuryValue > 0 ? (amount / treasuryValue) * 100 : 0;
    if (percent <= this.config.maxAutoDeployPercent) return 'ai_auto';
    if (percent <= this.config.requireGovernanceAbovePercent) return 'multisig';
    return 'governance_vote';
  }

  requestDeployment(
    type: CapitalDeploymentType,
    amount: number,
    targetId: string,
    targetName: string,
    rationale: string,
    requester: string,
    urgency: CapitalDeploymentRequest['urgency'] = 'normal',
    expectedReturn?: number,
    expectedImpact?: string
  ): CapitalDeploymentRequest {
    if (amount <= 0) throw new Error('Deployment amount must be positive');

    const requiredApproval = this.determineRequiredApproval(type, amount, urgency, 0);

    const request: CapitalDeploymentRequest = {
      id: this.nextId(),
      type,
      requestedAmount: amount,
      targetId,
      targetName,
      rationale,
      expectedReturn,
      expectedImpact: expectedImpact ?? `Deploy ${amount} TON to ${targetName}`,
      requester,
      urgency,
      requiredApproval,
      requestedAt: new Date(),
    };
    this.requests.set(request.id, request);
    return request;
  }

  executeDeployment(
    requestId: string,
    deployedAmount: number,
    approvalId?: string,
    txHash?: string
  ): CapitalDeploymentResult {
    const request = this.requests.get(requestId);
    if (!request) throw new Error(`Deployment request not found: ${requestId}`);
    if (deployedAmount <= 0) throw new Error('Deployed amount must be positive');

    const result: CapitalDeploymentResult = {
      deploymentId: this.nextId(),
      requestId,
      type: request.type,
      deployedAmount,
      targetId: request.targetId,
      status: 'executed',
      approvalId,
      executedAt: new Date(),
      txHash,
    };
    this.results.push(result);

    this.emit('treasury.capital_deployed', {
      deploymentId: result.deploymentId,
      requestId,
      type: request.type,
      deployedAmount,
      targetId: request.targetId,
      targetName: request.targetName,
      txHash,
    });

    return result;
  }

  rejectDeployment(requestId: string, reason: string): CapitalDeploymentResult {
    const request = this.requests.get(requestId);
    if (!request) throw new Error(`Deployment request not found: ${requestId}`);

    const result: CapitalDeploymentResult = {
      deploymentId: this.nextId(),
      requestId,
      type: request.type,
      deployedAmount: 0,
      targetId: request.targetId,
      status: 'rejected',
      reason,
    };
    this.results.push(result);
    return result;
  }

  getRequest(requestId: string): CapitalDeploymentRequest | undefined {
    return this.requests.get(requestId);
  }

  getPendingRequests(): CapitalDeploymentRequest[] {
    const executedIds = new Set(this.results.map(r => r.requestId));
    return Array.from(this.requests.values()).filter(r => !executedIds.has(r.id));
  }

  getDeploymentHistory(limit?: number): CapitalDeploymentResult[] {
    const sorted = [...this.results].sort((a, b) => {
      const tA = a.executedAt?.getTime() ?? 0;
      const tB = b.executedAt?.getTime() ?? 0;
      return tB - tA;
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getTotalDeployedByType(): Record<CapitalDeploymentType, number> {
    const result: Record<string, number> = {};
    for (const r of this.results.filter(r => r.status === 'executed')) {
      result[r.type] = (result[r.type] ?? 0) + r.deployedAmount;
    }
    return result as Record<CapitalDeploymentType, number>;
  }

  emergencyDeploy(
    type: CapitalDeploymentType,
    amount: number,
    targetId: string,
    targetName: string,
    reason: string,
    triggeredBy: string
  ): CapitalDeploymentResult {
    if (!this.config.emergencyDeployEnabled) {
      throw new Error('Emergency deployment is disabled');
    }

    const request = this.requestDeployment(
      type,
      amount,
      targetId,
      targetName,
      reason,
      triggeredBy,
      'critical'
    );

    const result = this.executeDeployment(request.id, amount, 'emergency');

    this.emit('treasury.capital_deployed', {
      deploymentId: result.deploymentId,
      type: 'emergency',
      amount,
      targetId,
      targetName,
      reason,
      triggeredBy,
    });

    return result;
  }

  getConfig(): CapitalAllocationConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<CapitalAllocationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onEvent(callback: MonetaryPolicyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }
}

export function createTreasuryCapitalAllocator(
  config?: Partial<CapitalAllocationConfig>
): DefaultTreasuryCapitalAllocator {
  return new DefaultTreasuryCapitalAllocator(config);
}
