/**
 * TONAIAgent - Internal Liquidity Pooling
 *
 * Enables agent-to-agent liquidity sharing, treasury-to-fund routing,
 * capital reuse across the platform, and internal settlement without
 * external execution costs.
 */

import {
  InternalLiquidityPool,
  InternalLiquidityLoan,
  InternalPoolParticipant,
  InternalPoolParticipantKind,
  LiquidityNetworkEvent,
  LiquidityNetworkEventCallback,
} from './types';

export interface CreateInternalPoolParams {
  name: string;
  assetId: string;
  interestRate?: number;
}

export interface JoinPoolParams {
  poolId: string;
  participantId: string;
  kind: InternalPoolParticipantKind;
  name: string;
  contributionAmount: string;
}

export interface BorrowFromPoolParams {
  poolId: string;
  borrowerId: string;
  borrowerKind: InternalPoolParticipantKind;
  lenderId: string;
  lenderKind: InternalPoolParticipantKind;
  amount: string;
  durationMs?: number;
}

export interface RepayLoanParams {
  loanId: string;
}

export interface InternalPoolFilters {
  assetId?: string;
  status?: InternalLiquidityPool['status'];
}

export interface InternalLiquidityPoolManager {
  createPool(params: CreateInternalPoolParams): InternalLiquidityPool;
  getPool(poolId: string): InternalLiquidityPool | undefined;
  listPools(filters?: InternalPoolFilters): InternalLiquidityPool[];
  closePool(poolId: string): void;

  joinPool(params: JoinPoolParams): InternalPoolParticipant;
  leavePool(poolId: string, participantId: string, withdrawAmount?: string): void;

  borrowFromPool(params: BorrowFromPoolParams): InternalLiquidityLoan;
  repayLoan(params: RepayLoanParams): InternalLiquidityLoan;
  getLoan(loanId: string): InternalLiquidityLoan | undefined;
  listLoans(filters?: { poolId?: string; borrowerId?: string; status?: InternalLiquidityLoan['status'] }): InternalLiquidityLoan[];

  onEvent(callback: LiquidityNetworkEventCallback): void;
}

export class DefaultInternalLiquidityPoolManager implements InternalLiquidityPoolManager {
  private pools: Map<string, InternalLiquidityPool> = new Map();
  private loans: Map<string, InternalLiquidityLoan> = new Map();
  private eventCallbacks: LiquidityNetworkEventCallback[] = [];

  createPool(params: CreateInternalPoolParams): InternalLiquidityPool {
    const poolId = this.generateId('ipool');
    const now = new Date();
    const pool: InternalLiquidityPool = {
      id: poolId,
      name: params.name,
      assetId: params.assetId,
      totalLiquidity: '0',
      availableLiquidity: '0',
      utilizationRate: 0,
      participants: [],
      interestRate: params.interestRate ?? 0.05,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.pools.set(poolId, pool);
    this.emitEvent('pool_created', 'internal_pool', poolId, { name: pool.name, assetId: pool.assetId });
    return pool;
  }

  getPool(poolId: string): InternalLiquidityPool | undefined {
    return this.pools.get(poolId);
  }

  listPools(filters?: InternalPoolFilters): InternalLiquidityPool[] {
    let pools = Array.from(this.pools.values());
    if (filters?.assetId) {
      pools = pools.filter(p => p.assetId === filters.assetId);
    }
    if (filters?.status) {
      pools = pools.filter(p => p.status === filters.status);
    }
    return pools;
  }

  closePool(poolId: string): void {
    const pool = this.requirePool(poolId);
    pool.status = 'closed';
    pool.updatedAt = new Date();
    this.pools.set(poolId, pool);
    this.emitEvent('pool_updated', 'internal_pool', poolId, { status: 'closed' });
  }

  joinPool(params: JoinPoolParams): InternalPoolParticipant {
    const pool = this.requirePool(params.poolId);
    if (pool.status !== 'active') {
      throw new Error(`Pool is not active: ${params.poolId}`);
    }

    const existingParticipant = pool.participants.find(p => p.participantId === params.participantId);
    if (existingParticipant) {
      // Add to existing contribution
      const additional = parseFloat(params.contributionAmount);
      existingParticipant.contributedAmount = (
        parseFloat(existingParticipant.contributedAmount) + additional
      ).toString();
      existingParticipant.availableAmount = (
        parseFloat(existingParticipant.availableAmount) + additional
      ).toString();
      this.recalculatePoolTotals(pool);
      return existingParticipant;
    }

    const participant: InternalPoolParticipant = {
      participantId: params.participantId,
      kind: params.kind,
      name: params.name,
      contributedAmount: params.contributionAmount,
      availableAmount: params.contributionAmount,
      borrowedAmount: '0',
      joinedAt: new Date(),
    };

    pool.participants.push(participant);
    this.recalculatePoolTotals(pool);
    pool.updatedAt = new Date();
    this.pools.set(params.poolId, pool);

    return participant;
  }

  leavePool(poolId: string, participantId: string, withdrawAmount?: string): void {
    const pool = this.requirePool(poolId);
    const participantIndex = pool.participants.findIndex(p => p.participantId === participantId);
    if (participantIndex === -1) {
      throw new Error(`Participant ${participantId} not found in pool ${poolId}`);
    }

    const participant = pool.participants[participantIndex];
    const borrowedAmount = parseFloat(participant.borrowedAmount);
    if (borrowedAmount > 0) {
      throw new Error(`Participant has outstanding borrowed amount: ${participant.borrowedAmount}`);
    }

    if (withdrawAmount !== undefined) {
      const withdrawal = parseFloat(withdrawAmount);
      const available = parseFloat(participant.availableAmount);
      if (withdrawal > available) {
        throw new Error(`Withdrawal amount exceeds available balance`);
      }
      participant.contributedAmount = (parseFloat(participant.contributedAmount) - withdrawal).toString();
      participant.availableAmount = (available - withdrawal).toString();
      if (parseFloat(participant.contributedAmount) <= 0) {
        pool.participants.splice(participantIndex, 1);
      }
    } else {
      pool.participants.splice(participantIndex, 1);
    }

    this.recalculatePoolTotals(pool);
    pool.updatedAt = new Date();
    this.pools.set(poolId, pool);
  }

  borrowFromPool(params: BorrowFromPoolParams): InternalLiquidityLoan {
    const pool = this.requirePool(params.poolId);
    if (pool.status !== 'active') {
      throw new Error(`Pool is not active: ${params.poolId}`);
    }

    const borrowAmount = parseFloat(params.amount);
    const availableLiquidity = parseFloat(pool.availableLiquidity);
    if (borrowAmount > availableLiquidity) {
      throw new Error(`Insufficient pool liquidity. Available: ${pool.availableLiquidity}`);
    }

    // Find lender participant
    const lender = pool.participants.find(p => p.participantId === params.lenderId);
    if (!lender) {
      throw new Error(`Lender participant not found: ${params.lenderId}`);
    }
    if (parseFloat(lender.availableAmount) < borrowAmount) {
      throw new Error(`Lender has insufficient available amount`);
    }

    // Deduct from lender
    lender.availableAmount = (parseFloat(lender.availableAmount) - borrowAmount).toString();

    // Update or create borrower participant
    let borrower = pool.participants.find(p => p.participantId === params.borrowerId);
    if (!borrower) {
      borrower = {
        participantId: params.borrowerId,
        kind: params.borrowerKind,
        name: params.borrowerId,
        contributedAmount: '0',
        availableAmount: borrowAmount.toString(),
        borrowedAmount: borrowAmount.toString(),
        joinedAt: new Date(),
      };
      pool.participants.push(borrower);
    } else {
      borrower.borrowedAmount = (parseFloat(borrower.borrowedAmount) + borrowAmount).toString();
    }

    this.recalculatePoolTotals(pool);
    pool.updatedAt = new Date();
    this.pools.set(params.poolId, pool);

    const loanId = this.generateId('loan');
    const now = new Date();
    const defaultDuration = 24 * 60 * 60 * 1000; // 24 hours
    const loan: InternalLiquidityLoan = {
      id: loanId,
      poolId: params.poolId,
      borrowerId: params.borrowerId,
      borrowerKind: params.borrowerKind,
      lenderId: params.lenderId,
      lenderKind: params.lenderKind,
      amount: params.amount,
      interestRate: pool.interestRate,
      dueAt: new Date(now.getTime() + (params.durationMs ?? defaultDuration)),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.loans.set(loanId, loan);
    this.emitEvent('internal_loan_created', 'loan', loanId, { amount: loan.amount, poolId: loan.poolId });

    return loan;
  }

  repayLoan(params: RepayLoanParams): InternalLiquidityLoan {
    const loan = this.requireLoan(params.loanId);
    if (loan.status !== 'active') {
      throw new Error(`Loan is not active: ${params.loanId}`);
    }

    const pool = this.requirePool(loan.poolId);

    // Restore lender's available amount
    const lender = pool.participants.find(p => p.participantId === loan.lenderId);
    if (lender) {
      lender.availableAmount = (
        parseFloat(lender.availableAmount) + parseFloat(loan.amount)
      ).toString();
    }

    // Reduce borrower's borrowed amount
    const borrower = pool.participants.find(p => p.participantId === loan.borrowerId);
    if (borrower) {
      borrower.borrowedAmount = (
        parseFloat(borrower.borrowedAmount) - parseFloat(loan.amount)
      ).toString();
    }

    this.recalculatePoolTotals(pool);
    pool.updatedAt = new Date();
    this.pools.set(loan.poolId, pool);

    loan.status = 'repaid';
    loan.updatedAt = new Date();
    this.loans.set(params.loanId, loan);
    this.emitEvent('internal_loan_repaid', 'loan', params.loanId, { poolId: loan.poolId });

    return loan;
  }

  getLoan(loanId: string): InternalLiquidityLoan | undefined {
    return this.loans.get(loanId);
  }

  listLoans(filters?: {
    poolId?: string;
    borrowerId?: string;
    status?: InternalLiquidityLoan['status'];
  }): InternalLiquidityLoan[] {
    let loans = Array.from(this.loans.values());
    if (filters?.poolId) loans = loans.filter(l => l.poolId === filters.poolId);
    if (filters?.borrowerId) loans = loans.filter(l => l.borrowerId === filters.borrowerId);
    if (filters?.status) loans = loans.filter(l => l.status === filters.status);
    return loans;
  }

  onEvent(callback: LiquidityNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private requirePool(poolId: string): InternalLiquidityPool {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Internal liquidity pool not found: ${poolId}`);
    return pool;
  }

  private requireLoan(loanId: string): InternalLiquidityLoan {
    const loan = this.loans.get(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);
    return loan;
  }

  private recalculatePoolTotals(pool: InternalLiquidityPool): void {
    let total = 0;
    let available = 0;

    for (const p of pool.participants) {
      const contributed = parseFloat(p.contributedAmount);
      const borrowed = parseFloat(p.borrowedAmount);
      total += contributed;
      available += Math.max(0, parseFloat(p.availableAmount) - borrowed);
    }

    // Sum all available amounts
    const totalAvailable = pool.participants.reduce(
      (sum, p) => sum + parseFloat(p.availableAmount),
      0
    );

    pool.totalLiquidity = total.toString();
    pool.availableLiquidity = totalAvailable.toString();
    pool.utilizationRate = total > 0 ? Math.min(1, (total - totalAvailable) / total) : 0;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(
    type: LiquidityNetworkEvent['type'],
    entityKind: string,
    entityId: string,
    payload: Record<string, unknown>
  ): void {
    const event: LiquidityNetworkEvent = {
      id: this.generateId('evt'),
      type,
      entityId,
      entityKind,
      payload,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

export function createInternalLiquidityPoolManager(): DefaultInternalLiquidityPoolManager {
  return new DefaultInternalLiquidityPoolManager();
}
