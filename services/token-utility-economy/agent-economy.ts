/**
 * TONAIAgent - Autonomous Agent Economy
 *
 * Tracks and manages the autonomous economic activities of AI agents.
 * Agents pay for compute/API, earn from strategies, reinvest capital,
 * and interact economically with other agents.
 *
 * Flow: User -> Agent -> Strategy -> Profit -> Reinvestment -> Token Flow
 */

import {
  AgentEconomicProfile,
  AgentAutonomyLevel,
  AgentEconomicStatus,
  AgentEconomicTransaction,
  AgentTransactionType,
  AgentComputeUsage,
  ComputeCostBreakdown,
  AgentEconomyHealth,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Default Configurations
// ============================================================================

// Compute cost rates (tokens per unit)
const COMPUTE_RATES = {
  computeUnitCost: '100000000',        // 0.1 token per compute unit
  apiCallCost: '10000000',             // 0.01 token per API call
  storageBytesCostPerMb: '1000000',    // 0.001 token per MB
  bandwidthCostPerMb: '500000',        // 0.0005 token per MB
};

// ============================================================================
// Interfaces
// ============================================================================

export interface AgentEconomyConfig {
  maxAutonomousTransactionAmount?: string;   // Max amount per autonomous tx
  reinvestmentRate?: number;                  // 0-1, default reinvestment rate
  computeRates?: Partial<typeof COMPUTE_RATES>;
}

export interface RegisterAgentRequest {
  agentId: string;
  walletAddress: string;
  autonomyLevel: AgentAutonomyLevel;
  initialBalance?: string;
}

export interface RecordComputeUsageRequest {
  agentId: string;
  period: string;
  computeUnits: number;
  apiCalls: number;
  storageBytes: number;
  bandwidthBytes: number;
}

export interface AgentEarningRequest {
  agentId: string;
  strategyId?: string;
  amount: string;
  earningType: 'strategy_profit' | 'service_fee' | 'staking_reward';
  description?: string;
}

export interface AgentEconomyModule {
  registerAgent(request: RegisterAgentRequest): AgentEconomicProfile;
  getAgentProfile(agentId: string): AgentEconomicProfile | null;
  recordComputeUsage(request: RecordComputeUsageRequest): AgentComputeUsage;
  recordEarning(request: AgentEarningRequest): AgentEconomicTransaction;
  recordReinvestment(agentId: string, amount: string): AgentEconomicTransaction;
  updateAutonomyLevel(agentId: string, level: AgentAutonomyLevel): AgentEconomicProfile | null;
  getAllProfiles(): AgentEconomicProfile[];
  getTransactionHistory(agentId: string): AgentEconomicTransaction[];
  getHealth(): AgentEconomyHealth;
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAgentEconomyModule implements AgentEconomyModule {
  private readonly profiles: Map<string, AgentEconomicProfile> = new Map();
  private readonly transactions: Map<string, AgentEconomicTransaction[]> = new Map();
  private readonly config: Required<AgentEconomyConfig>;
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  constructor(config: AgentEconomyConfig = {}) {
    this.config = {
      maxAutonomousTransactionAmount: config.maxAutonomousTransactionAmount ?? '1000000000000',
      reinvestmentRate: config.reinvestmentRate ?? 0.20,
      computeRates: { ...COMPUTE_RATES, ...config.computeRates },
    };
  }

  registerAgent(request: RegisterAgentRequest): AgentEconomicProfile {
    const profile: AgentEconomicProfile = {
      agentId: request.agentId,
      walletAddress: request.walletAddress,
      tokenBalance: request.initialBalance ?? '0',
      earnedTotal: '0',
      spentTotal: '0',
      computeCostTotal: '0',
      apiCostTotal: '0',
      reinvestedTotal: '0',
      netRevenue: '0',
      profitMargin: 0,
      autonomyLevel: request.autonomyLevel,
      economicStatus: 'bootstrapping',
      lastUpdated: new Date(),
    };

    this.profiles.set(request.agentId, profile);
    this.transactions.set(request.agentId, []);

    this.emitEvent({
      id: `agent-reg-${Date.now()}`,
      type: 'economy.transaction',
      data: { action: 'agent_registered', agentId: request.agentId, autonomyLevel: request.autonomyLevel },
      agentId: request.agentId,
      timestamp: new Date(),
    });

    return profile;
  }

  getAgentProfile(agentId: string): AgentEconomicProfile | null {
    return this.profiles.get(agentId) ?? null;
  }

  recordComputeUsage(request: RecordComputeUsageRequest): AgentComputeUsage {
    const rates = this.config.computeRates;

    const computeCost = BigInt(rates.computeUnitCost!) * BigInt(request.computeUnits);
    const apiCost = BigInt(rates.apiCallCost!) * BigInt(request.apiCalls);
    const mbStorage = BigInt(Math.ceil(request.storageBytes / (1024 * 1024)));
    const storageCost = BigInt(rates.storageBytesCostPerMb!) * mbStorage;
    const mbBandwidth = BigInt(Math.ceil(request.bandwidthBytes / (1024 * 1024)));
    const bandwidthCost = BigInt(rates.bandwidthCostPerMb!) * mbBandwidth;
    const totalCost = computeCost + apiCost + storageCost + bandwidthCost;

    const breakdown: ComputeCostBreakdown = {
      computeCost: computeCost.toString(),
      apiCost: apiCost.toString(),
      storageCost: storageCost.toString(),
      bandwidthCost: bandwidthCost.toString(),
    };

    const usage: AgentComputeUsage = {
      agentId: request.agentId,
      period: request.period,
      computeUnits: request.computeUnits,
      apiCalls: request.apiCalls,
      storageBytes: request.storageBytes,
      bandwidthBytes: request.bandwidthBytes,
      totalCost: totalCost.toString(),
      breakdown,
    };

    // Update agent profile
    const profile = this.profiles.get(request.agentId);
    if (profile) {
      const updatedComputeCost = BigInt(profile.computeCostTotal) + computeCost;
      const updatedApiCost = BigInt(profile.apiCostTotal) + apiCost;
      const updatedSpent = BigInt(profile.spentTotal) + totalCost;
      const updatedBalance = BigInt(profile.tokenBalance) - totalCost;

      const updated = this.updateProfileRevenue({
        ...profile,
        computeCostTotal: updatedComputeCost.toString(),
        apiCostTotal: updatedApiCost.toString(),
        spentTotal: updatedSpent.toString(),
        tokenBalance: (updatedBalance < BigInt(0) ? BigInt(0) : updatedBalance).toString(),
      });
      this.profiles.set(request.agentId, updated);

      // Record transaction
      this.addTransaction(request.agentId, {
        id: `tx-compute-${Date.now()}`,
        fromAgentId: request.agentId,
        transactionType: 'compute_payment',
        amount: totalCost.toString(),
        description: `Compute usage for period ${request.period}`,
        timestamp: new Date(),
        status: 'completed',
      });
    }

    return usage;
  }

  recordEarning(request: AgentEarningRequest): AgentEconomicTransaction {
    const profile = this.profiles.get(request.agentId);
    if (!profile) {
      throw new Error(`Agent ${request.agentId} not registered`);
    }

    const transactionType: AgentTransactionType =
      request.earningType === 'strategy_profit' ? 'strategy_earning'
      : request.earningType === 'service_fee' ? 'service_earning'
      : 'staking_reward';

    const tx: AgentEconomicTransaction = {
      id: `tx-earn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fromAgentId: 'platform',
      toAgentId: request.agentId,
      transactionType,
      amount: request.amount,
      description: request.description ?? `Earning: ${request.earningType}`,
      metadata: request.strategyId ? { strategyId: request.strategyId } : undefined,
      timestamp: new Date(),
      status: 'completed',
    };

    const earned = BigInt(request.amount);
    const updatedEarned = BigInt(profile.earnedTotal) + earned;
    const updatedBalance = BigInt(profile.tokenBalance) + earned;

    const updated = this.updateProfileRevenue({
      ...profile,
      earnedTotal: updatedEarned.toString(),
      tokenBalance: updatedBalance.toString(),
    });
    this.profiles.set(request.agentId, updated);

    this.addTransaction(request.agentId, tx);

    this.emitEvent({
      id: `earn-${Date.now()}`,
      type: 'economy.transaction',
      data: {
        agentId: request.agentId,
        type: transactionType,
        amount: request.amount,
        strategyId: request.strategyId,
      },
      agentId: request.agentId,
      timestamp: new Date(),
    });

    return tx;
  }

  recordReinvestment(agentId: string, amount: string): AgentEconomicTransaction {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      throw new Error(`Agent ${agentId} not registered`);
    }

    const reinvested = BigInt(amount);
    const updatedReinvested = BigInt(profile.reinvestedTotal) + reinvested;

    const updated = this.updateProfileRevenue({
      ...profile,
      reinvestedTotal: updatedReinvested.toString(),
    });
    this.profiles.set(agentId, updated);

    const tx: AgentEconomicTransaction = {
      id: `tx-reinvest-${Date.now()}`,
      fromAgentId: agentId,
      transactionType: 'reinvestment',
      amount,
      description: 'Capital reinvestment',
      timestamp: new Date(),
      status: 'completed',
    };

    this.addTransaction(agentId, tx);
    return tx;
  }

  updateAutonomyLevel(agentId: string, level: AgentAutonomyLevel): AgentEconomicProfile | null {
    const profile = this.profiles.get(agentId);
    if (!profile) return null;

    const updated: AgentEconomicProfile = { ...profile, autonomyLevel: level, lastUpdated: new Date() };
    this.profiles.set(agentId, updated);
    return updated;
  }

  getAllProfiles(): AgentEconomicProfile[] {
    return Array.from(this.profiles.values());
  }

  getTransactionHistory(agentId: string): AgentEconomicTransaction[] {
    return this.transactions.get(agentId) ?? [];
  }

  getHealth(): AgentEconomyHealth {
    const profiles = Array.from(this.profiles.values());
    const activeProfiles = profiles.filter(p => p.economicStatus !== 'suspended');

    const totalCirculation = profiles.reduce(
      (acc, p) => acc + BigInt(p.earnedTotal),
      BigInt(0)
    );

    const allTxs = Array.from(this.transactions.values()).flat();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTxs = allTxs.filter(tx => tx.timestamp >= today);

    const networkRevenue = profiles.reduce(
      (acc, p) => acc + BigInt(p.earnedTotal),
      BigInt(0)
    );

    const profitableProfiles = profiles.filter(p => p.profitMargin > 0);
    const avgProfitMargin = profitableProfiles.length > 0
      ? profitableProfiles.reduce((acc, p) => acc + p.profitMargin, 0) / profitableProfiles.length
      : 0;

    const agentsByStatus: Record<AgentEconomicStatus, number> = {
      bootstrapping: 0, growing: 0, profitable: 0, struggling: 0, suspended: 0,
    };
    for (const p of profiles) {
      agentsByStatus[p.economicStatus]++;
    }

    return {
      overall: activeProfiles.length > 0 ? 'healthy' : 'degraded',
      totalActiveAgents: activeProfiles.length,
      totalTokensInCirculation: totalCirculation.toString(),
      totalTransactionsToday: todayTxs.length,
      networkRevenue: networkRevenue.toString(),
      averageAgentProfitMargin: Math.round(avgProfitMargin * 100) / 100,
      agentsByStatus,
    };
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private updateProfileRevenue(profile: AgentEconomicProfile): AgentEconomicProfile {
    const earned = BigInt(profile.earnedTotal);
    const spent = BigInt(profile.spentTotal);
    const computeCost = BigInt(profile.computeCostTotal);
    const apiCost = BigInt(profile.apiCostTotal);

    const totalCosts = spent + computeCost + apiCost;
    const netRevenue = earned - totalCosts;
    const profitMargin = earned > BigInt(0)
      ? Number((netRevenue * BigInt(10000)) / earned) / 10000
      : 0;

    let economicStatus: AgentEconomicStatus;
    if (profile.economicStatus === 'suspended') {
      economicStatus = 'suspended';
    } else if (earned === BigInt(0)) {
      economicStatus = 'bootstrapping';
    } else if (profitMargin < 0) {
      economicStatus = 'struggling';
    } else if (profitMargin >= 0.15) {
      economicStatus = 'profitable';
    } else {
      economicStatus = 'growing';
    }

    return {
      ...profile,
      netRevenue: netRevenue.toString(),
      profitMargin: Math.max(-1, Math.min(1, profitMargin)),
      economicStatus,
      lastUpdated: new Date(),
    };
  }

  private addTransaction(agentId: string, tx: AgentEconomicTransaction): void {
    const existing = this.transactions.get(agentId) ?? [];
    existing.push(tx);
    this.transactions.set(agentId, existing);
  }

  private emitEvent(event: TokenUtilityEconomyEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createAgentEconomyModule(
  config?: AgentEconomyConfig
): DefaultAgentEconomyModule {
  return new DefaultAgentEconomyModule(config);
}
