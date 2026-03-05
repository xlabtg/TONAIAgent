/**
 * TONAIAgent - Protocol Treasury Vault (Issue #123)
 *
 * Manages protocol reserves, insurance funds, liquidity buffers, and strategic
 * capital. Aggregates revenue from performance fees, marketplace fees, RWA yield,
 * prime brokerage, and token issuance.
 */

import type {
  ProtocolReserve,
  ReserveCategory,
  TreasuryRevenue,
  TreasuryRevenueSource,
  TreasurySnapshot,
  MonetaryPolicyEvent,
  MonetaryPolicyEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface ProtocolTreasuryVault {
  // Reserve management
  getReserves(): ProtocolReserve[];
  getReserve(category: ReserveCategory): ProtocolReserve | undefined;
  getTotalValueTon(): number;
  getAvailableForDeployment(): number;

  // Revenue intake
  recordRevenue(
    source: TreasuryRevenueSource,
    amount: number,
    assetSymbol: string,
    valueInTon: number,
    description: string,
    txHash?: string
  ): TreasuryRevenue;
  getRevenueHistory(limit?: number): TreasuryRevenue[];
  getTotalRevenueBySource(): Record<TreasuryRevenueSource, number>;

  // Reserve operations
  depositToReserve(category: ReserveCategory, amount: number, reason: string): void;
  withdrawFromReserve(category: ReserveCategory, amount: number, reason: string): void;
  transferBetweenReserves(from: ReserveCategory, to: ReserveCategory, amount: number, reason: string): void;

  // Snapshots
  takeSnapshot(): TreasurySnapshot;
  getSnapshotHistory(limit?: number): TreasurySnapshot[];

  // Events
  onEvent(callback: MonetaryPolicyEventCallback): () => void;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_RESERVES: Array<Omit<ProtocolReserve, 'id' | 'lastUpdated'>> = [
  {
    category: 'liquidity_buffer',
    name: 'Liquidity Buffer',
    balanceTon: 0,
    targetAllocationPercent: 30,
    currentAllocationPercent: 0,
    minBalanceTon: 0,
    sources: ['performance_fees', 'marketplace_fees', 'protocol_fees'],
  },
  {
    category: 'insurance_fund',
    name: 'Insurance Fund',
    balanceTon: 0,
    targetAllocationPercent: 20,
    currentAllocationPercent: 0,
    minBalanceTon: 0,
    sources: ['performance_fees', 'marketplace_fees'],
  },
  {
    category: 'strategic_capital',
    name: 'Strategic Capital',
    balanceTon: 0,
    targetAllocationPercent: 20,
    currentAllocationPercent: 0,
    minBalanceTon: 0,
    sources: ['token_issuance', 'prime_brokerage', 'rwa_yield'],
  },
  {
    category: 'stabilization_fund',
    name: 'Stabilization Fund',
    balanceTon: 0,
    targetAllocationPercent: 15,
    currentAllocationPercent: 0,
    minBalanceTon: 0,
    sources: ['protocol_fees', 'staking_yield'],
  },
  {
    category: 'protocol_reserves',
    name: 'Protocol Reserves',
    balanceTon: 0,
    targetAllocationPercent: 15,
    currentAllocationPercent: 0,
    minBalanceTon: 0,
    sources: ['performance_fees', 'marketplace_fees', 'protocol_fees', 'rwa_yield'],
  },
];

// ============================================================================
// Implementation
// ============================================================================

export class DefaultProtocolTreasuryVault implements ProtocolTreasuryVault {
  private readonly reserves: Map<ReserveCategory, ProtocolReserve>;
  private readonly revenues: TreasuryRevenue[] = [];
  private readonly snapshots: TreasurySnapshot[] = [];
  private readonly eventCallbacks: MonetaryPolicyEventCallback[] = [];
  private idCounter = 0;

  constructor() {
    this.reserves = new Map();
    for (const r of DEFAULT_RESERVES) {
      const reserve: ProtocolReserve = {
        ...r,
        id: `reserve-${r.category}`,
        lastUpdated: new Date(),
      };
      this.reserves.set(r.category, reserve);
    }
  }

  private nextId(): string {
    return `${++this.idCounter}`;
  }

  private emit(type: MonetaryPolicyEvent['type'], data: Record<string, unknown>): void {
    const event: MonetaryPolicyEvent = { type, data, timestamp: new Date() };
    for (const cb of this.eventCallbacks) cb(event);
  }

  private updateAllocations(): void {
    const total = this.getTotalValueTon();
    if (total <= 0) return;
    for (const reserve of this.reserves.values()) {
      reserve.currentAllocationPercent = (reserve.balanceTon / total) * 100;
    }
  }

  getReserves(): ProtocolReserve[] {
    return Array.from(this.reserves.values());
  }

  getReserve(category: ReserveCategory): ProtocolReserve | undefined {
    return this.reserves.get(category);
  }

  getTotalValueTon(): number {
    let total = 0;
    for (const r of this.reserves.values()) total += r.balanceTon;
    return total;
  }

  getAvailableForDeployment(): number {
    // Available = liquidity buffer + strategic capital above minimum
    const buffer = this.reserves.get('liquidity_buffer');
    const strategic = this.reserves.get('strategic_capital');
    const available = (buffer?.balanceTon ?? 0) + (strategic?.balanceTon ?? 0);
    return Math.max(0, available);
  }

  recordRevenue(
    source: TreasuryRevenueSource,
    amount: number,
    assetSymbol: string,
    valueInTon: number,
    description: string,
    txHash?: string
  ): TreasuryRevenue {
    const revenue: TreasuryRevenue = {
      id: `rev-${this.nextId()}`,
      source,
      amount,
      assetSymbol,
      valueInTon,
      timestamp: new Date(),
      description,
      txHash,
    };
    this.revenues.push(revenue);

    // Auto-distribute revenue to reserves based on their sources
    const eligibleReserves = Array.from(this.reserves.values()).filter(r =>
      r.sources.includes(source)
    );
    if (eligibleReserves.length > 0) {
      const sharePerReserve = valueInTon / eligibleReserves.length;
      for (const reserve of eligibleReserves) {
        reserve.balanceTon += sharePerReserve;
        reserve.lastUpdated = new Date();
      }
      this.updateAllocations();
    }

    this.emit('treasury.revenue_received', {
      revenueId: revenue.id,
      source,
      amount,
      assetSymbol,
      valueInTon,
    });

    return revenue;
  }

  getRevenueHistory(limit?: number): TreasuryRevenue[] {
    const sorted = [...this.revenues].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getTotalRevenueBySource(): Record<TreasuryRevenueSource, number> {
    const result: Record<string, number> = {};
    for (const rev of this.revenues) {
      result[rev.source] = (result[rev.source] ?? 0) + rev.valueInTon;
    }
    return result as Record<TreasuryRevenueSource, number>;
  }

  depositToReserve(category: ReserveCategory, amount: number, reason: string): void {
    const reserve = this.reserves.get(category);
    if (!reserve) throw new Error(`Reserve category not found: ${category}`);
    if (amount <= 0) throw new Error('Deposit amount must be positive');

    reserve.balanceTon += amount;
    reserve.lastUpdated = new Date();
    this.updateAllocations();

    this.emit('treasury.reserve_rebalanced', {
      action: 'deposit',
      category,
      amount,
      reason,
      newBalance: reserve.balanceTon,
    });
  }

  withdrawFromReserve(category: ReserveCategory, amount: number, reason: string): void {
    const reserve = this.reserves.get(category);
    if (!reserve) throw new Error(`Reserve category not found: ${category}`);
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    if (amount > reserve.balanceTon) {
      throw new Error(
        `Insufficient reserve balance: requested ${amount}, available ${reserve.balanceTon}`
      );
    }
    if (reserve.balanceTon - amount < reserve.minBalanceTon) {
      throw new Error(
        `Withdrawal would breach minimum balance of ${reserve.minBalanceTon}`
      );
    }

    reserve.balanceTon -= amount;
    reserve.lastUpdated = new Date();
    this.updateAllocations();

    this.emit('treasury.capital_deployed', {
      action: 'withdraw',
      category,
      amount,
      reason,
      newBalance: reserve.balanceTon,
    });
  }

  transferBetweenReserves(
    from: ReserveCategory,
    to: ReserveCategory,
    amount: number,
    reason: string
  ): void {
    this.withdrawFromReserve(from, amount, reason);
    this.depositToReserve(to, amount, reason);

    this.emit('treasury.reserve_rebalanced', {
      action: 'transfer',
      from,
      to,
      amount,
      reason,
    });
  }

  takeSnapshot(): TreasurySnapshot {
    const reserves = this.getReserves();
    const total = this.getTotalValueTon();

    // Compute liquidity ratio: liquid reserves / total
    const liquidBalance =
      (this.reserves.get('liquidity_buffer')?.balanceTon ?? 0) +
      (this.reserves.get('protocol_reserves')?.balanceTon ?? 0) * 0.5;
    const liquidityRatio = total > 0 ? liquidBalance / total : 0;

    // Simple coverage ratio: treasury value vs. 3x insurance fund target
    const insuranceBalance = this.reserves.get('insurance_fund')?.balanceTon ?? 0;
    const coverageRatio = total > 0 ? insuranceBalance / (total * 0.3) : 0;

    // Compute growth from previous snapshot
    const prev = this.snapshots[this.snapshots.length - 1];
    const growthRate30d = prev
      ? ((total - prev.totalValueTon) / (prev.totalValueTon || 1)) * 100
      : 0;

    // Revenue rate from last 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueRate30d =
      this.revenues
        .filter(r => r.timestamp >= cutoff)
        .reduce((sum, r) => sum + r.valueInTon, 0) / 30;

    const snapshot: TreasurySnapshot = {
      id: `snap-${this.nextId()}`,
      totalValueTon: total,
      reserves,
      liquidityRatio,
      coverageRatio,
      growthRate30d,
      revenueRate30d,
      snapshotAt: new Date(),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  getSnapshotHistory(limit?: number): TreasurySnapshot[] {
    const sorted = [...this.snapshots].sort(
      (a, b) => b.snapshotAt.getTime() - a.snapshotAt.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  onEvent(callback: MonetaryPolicyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }
}

export function createProtocolTreasuryVault(): DefaultProtocolTreasuryVault {
  return new DefaultProtocolTreasuryVault();
}
