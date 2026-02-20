/**
 * TONAIAgent - Treasury Management
 *
 * On-chain treasury management for the TON AI Ecosystem Fund.
 * Provides secure capital custody, allocation tracking, and transparent reporting.
 */

import {
  TreasuryConfig,
  Treasury,
  TreasuryAsset,
  TreasuryAllocation,
  TreasuryTransaction,
  TreasuryStats,
  AllocationCategory,
  RecipientType,
  AllocationStatus,
  AllocationMilestone,
  Disbursement,
  TransactionType,
  TransactionStatus,
  CreateAllocationRequest,
  EcosystemFundEvent,
  EcosystemFundEventCallback,
} from './types';

// ============================================================================
// Treasury Manager Interface
// ============================================================================

export interface TreasuryManager {
  readonly config: TreasuryConfig;

  // Treasury operations
  getBalance(): Promise<string>;
  getAvailableBalance(): Promise<string>;
  getTreasury(): Promise<Treasury>;
  getAssets(): Promise<TreasuryAsset[]>;

  // Allocation operations
  createAllocation(request: CreateAllocationRequest): Promise<TreasuryAllocation>;
  getallocation(allocationId: string): Promise<TreasuryAllocation>;
  getAllocations(filter?: AllocationFilter): Promise<TreasuryAllocation[]>;
  approveAllocation(allocationId: string, approverId: string): Promise<TreasuryAllocation>;
  cancelAllocation(allocationId: string, reason: string): Promise<TreasuryAllocation>;
  completeMilestone(
    allocationId: string,
    milestoneId: string,
    proofUrl: string
  ): Promise<AllocationMilestone>;

  // Disbursement operations
  scheduleDisbursement(
    allocationId: string,
    amount: string,
    scheduledAt: Date,
    milestoneId?: string
  ): Promise<Disbursement>;
  executeDisbursement(disbursementId: string): Promise<Disbursement>;
  getDisbursements(allocationId: string): Promise<Disbursement[]>;

  // Transaction operations
  getTransactions(filter?: TransactionFilter): Promise<TreasuryTransaction[]>;
  getTransactionsByCategory(category: AllocationCategory): Promise<TreasuryTransaction[]>;

  // Reporting
  getStats(): Promise<TreasuryStats>;
  getAllocationSummary(): Promise<AllocationSummary>;
  getUtilizationReport(): Promise<UtilizationReport>;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface AllocationFilter {
  category?: AllocationCategory;
  status?: AllocationStatus;
  recipientId?: string;
  recipientType?: RecipientType;
  minAmount?: string;
  maxAmount?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface TransactionFilter {
  type?: TransactionType;
  category?: AllocationCategory;
  status?: TransactionStatus;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AllocationSummary {
  totalAllocations: number;
  totalAmount: string;
  byCategory: { category: AllocationCategory; count: number; amount: string }[];
  byStatus: { status: AllocationStatus; count: number; amount: string }[];
  byRecipientType: { type: RecipientType; count: number; amount: string }[];
  averageAllocationSize: string;
  completionRate: number;
}

export interface UtilizationReport {
  period: string;
  totalBalance: string;
  allocatedAmount: string;
  disbursedAmount: string;
  utilizationRate: number;
  categoryBreakdown: CategoryUtilization[];
  monthlyTrend: { month: string; disbursed: string }[];
}

export interface CategoryUtilization {
  category: AllocationCategory;
  budgeted: string;
  allocated: string;
  disbursed: string;
  utilizationRate: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultTreasuryManager implements TreasuryManager {
  readonly config: TreasuryConfig;

  private treasury: Treasury;
  private allocations: Map<string, TreasuryAllocation> = new Map();
  private disbursements: Map<string, Disbursement> = new Map();
  private transactions: TreasuryTransaction[] = [];
  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<TreasuryConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      contractAddress: config.contractAddress,
      multisigRequired: config.multisigRequired ?? true,
      multisigThreshold: config.multisigThreshold ?? 3,
      maxSingleAllocation: config.maxSingleAllocation ?? '100000',
      allocationCooldown: config.allocationCooldown ?? 24,
      reserveRatio: config.reserveRatio ?? 0.2,
      allowedAssets: config.allowedAssets ?? ['TON', 'TONAI'],
    };

    this.treasury = this.initializeTreasury();
  }

  private initializeTreasury(): Treasury {
    return {
      id: this.generateId('treasury'),
      balance: '0',
      reserveBalance: '0',
      availableBalance: '0',
      allocatedBalance: '0',
      pendingBalance: '0',
      assets: [],
      allocations: [],
      transactions: [],
      stats: {
        totalDeposited: '0',
        totalDisbursed: '0',
        totalAllocated: '0',
        activeAllocations: 0,
        completedAllocations: 0,
        averageAllocationSize: '0',
        fundUtilization: 0,
        growthRate30d: 0,
        returnOnInvestment: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ============================================================================
  // Treasury Operations
  // ============================================================================

  async getBalance(): Promise<string> {
    return this.treasury.balance;
  }

  async getAvailableBalance(): Promise<string> {
    return this.treasury.availableBalance;
  }

  async getTreasury(): Promise<Treasury> {
    return { ...this.treasury };
  }

  async getAssets(): Promise<TreasuryAsset[]> {
    return [...this.treasury.assets];
  }

  // ============================================================================
  // Allocation Operations
  // ============================================================================

  async createAllocation(request: CreateAllocationRequest): Promise<TreasuryAllocation> {
    // Validate request
    this.validateAllocationRequest(request);

    const allocation: TreasuryAllocation = {
      id: this.generateId('allocation'),
      category: request.category,
      recipientId: request.recipientId,
      recipientType: this.inferRecipientType(request.category),
      amount: request.amount,
      purpose: request.purpose,
      status: 'proposed',
      approvedBy: [],
      milestones: request.terms?.milestones ?? [],
      disbursements: [],
      createdAt: new Date(),
    };

    this.allocations.set(allocation.id, allocation);
    this.treasury.allocations.push(allocation);

    // Update treasury stats
    this.updateTreasuryStats();

    // Emit event
    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'allocation_created',
      category: 'treasury',
      data: { allocationId: allocation.id, amount: request.amount, category: request.category },
      actorId: request.recipientId,
      relatedId: allocation.id,
    });

    return allocation;
  }

  async getallocation(allocationId: string): Promise<TreasuryAllocation> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }
    return { ...allocation };
  }

  async getAllocations(filter?: AllocationFilter): Promise<TreasuryAllocation[]> {
    let allocations = Array.from(this.allocations.values());

    if (filter) {
      if (filter.category) {
        allocations = allocations.filter((a) => a.category === filter.category);
      }
      if (filter.status) {
        allocations = allocations.filter((a) => a.status === filter.status);
      }
      if (filter.recipientId) {
        allocations = allocations.filter((a) => a.recipientId === filter.recipientId);
      }
      if (filter.recipientType) {
        allocations = allocations.filter((a) => a.recipientType === filter.recipientType);
      }
      if (filter.minAmount) {
        allocations = allocations.filter(
          (a) => BigInt(a.amount) >= BigInt(filter.minAmount!)
        );
      }
      if (filter.maxAmount) {
        allocations = allocations.filter(
          (a) => BigInt(a.amount) <= BigInt(filter.maxAmount!)
        );
      }
      if (filter.fromDate) {
        allocations = allocations.filter((a) => a.createdAt >= filter.fromDate!);
      }
      if (filter.toDate) {
        allocations = allocations.filter((a) => a.createdAt <= filter.toDate!);
      }
      if (filter.offset) {
        allocations = allocations.slice(filter.offset);
      }
      if (filter.limit) {
        allocations = allocations.slice(0, filter.limit);
      }
    }

    return allocations;
  }

  async approveAllocation(
    allocationId: string,
    approverId: string
  ): Promise<TreasuryAllocation> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    if (allocation.status !== 'proposed' && allocation.status !== 'under_review') {
      throw new Error(`Allocation cannot be approved in current status: ${allocation.status}`);
    }

    // Add approver
    if (!allocation.approvedBy.includes(approverId)) {
      allocation.approvedBy.push(approverId);
    }

    // Check if threshold met
    if (allocation.approvedBy.length >= this.config.multisigThreshold) {
      allocation.status = 'approved';
      allocation.approvedAt = new Date();

      // Update allocated balance
      this.treasury.allocatedBalance = (
        BigInt(this.treasury.allocatedBalance) + BigInt(allocation.amount)
      ).toString();
      this.treasury.availableBalance = (
        BigInt(this.treasury.balance) -
        BigInt(this.treasury.allocatedBalance) -
        BigInt(this.treasury.reserveBalance)
      ).toString();

      this.emitEvent({
        id: this.generateId('event'),
        timestamp: new Date(),
        type: 'allocation_approved',
        category: 'treasury',
        data: { allocationId, approvers: allocation.approvedBy },
        actorId: approverId,
        relatedId: allocationId,
      });
    } else {
      allocation.status = 'under_review';
    }

    this.allocations.set(allocationId, allocation);
    this.updateTreasuryStats();

    return allocation;
  }

  async cancelAllocation(
    allocationId: string,
    reason: string
  ): Promise<TreasuryAllocation> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    if (allocation.status === 'completed' || allocation.status === 'cancelled') {
      throw new Error(`Allocation cannot be cancelled in current status: ${allocation.status}`);
    }

    // Return allocated funds to available
    if (allocation.status === 'approved' || allocation.status === 'active') {
      const disbursedAmount = allocation.disbursements
        .filter((d) => d.status === 'completed')
        .reduce((sum, d) => sum + BigInt(d.amount), BigInt(0));
      const returnAmount = BigInt(allocation.amount) - disbursedAmount;

      this.treasury.allocatedBalance = (
        BigInt(this.treasury.allocatedBalance) - returnAmount
      ).toString();
      this.treasury.availableBalance = (
        BigInt(this.treasury.availableBalance) + returnAmount
      ).toString();
    }

    allocation.status = 'cancelled';

    this.allocations.set(allocationId, allocation);
    this.updateTreasuryStats();

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'allocation_cancelled',
      category: 'treasury',
      data: { allocationId, reason },
      relatedId: allocationId,
    });

    return allocation;
  }

  async completeMilestone(
    allocationId: string,
    milestoneId: string,
    proofUrl: string
  ): Promise<AllocationMilestone> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    if (!allocation.milestones || allocation.milestones.length === 0) {
      throw new Error(`Allocation has no milestones: ${allocationId}`);
    }

    const milestone = allocation.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneId}`);
    }

    milestone.status = 'completed';
    milestone.completedAt = new Date();
    milestone.proofUrl = proofUrl;

    // Check if all milestones completed
    const allCompleted = allocation.milestones.every((m) => m.status === 'completed');
    if (allCompleted) {
      allocation.status = 'completed';
      allocation.completedAt = new Date();

      this.emitEvent({
        id: this.generateId('event'),
        timestamp: new Date(),
        type: 'allocation_completed',
        category: 'treasury',
        data: { allocationId },
        relatedId: allocationId,
      });
    }

    this.allocations.set(allocationId, allocation);
    this.updateTreasuryStats();

    return milestone;
  }

  // ============================================================================
  // Disbursement Operations
  // ============================================================================

  async scheduleDisbursement(
    allocationId: string,
    amount: string,
    scheduledAt: Date,
    milestoneId?: string
  ): Promise<Disbursement> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    const disbursement: Disbursement = {
      id: this.generateId('disbursement'),
      allocationId,
      milestoneId,
      amount,
      status: 'scheduled',
      scheduledAt,
    };

    allocation.disbursements.push(disbursement);
    this.disbursements.set(disbursement.id, disbursement);
    this.allocations.set(allocationId, allocation);

    return disbursement;
  }

  async executeDisbursement(disbursementId: string): Promise<Disbursement> {
    const disbursement = this.disbursements.get(disbursementId);
    if (!disbursement) {
      throw new Error(`Disbursement not found: ${disbursementId}`);
    }

    if (disbursement.status !== 'scheduled' && disbursement.status !== 'pending') {
      throw new Error(`Disbursement cannot be executed in current status: ${disbursement.status}`);
    }

    // Execute disbursement (in real implementation, this would interact with blockchain)
    disbursement.status = 'processing';

    // Simulate successful disbursement
    disbursement.status = 'completed';
    disbursement.disbursedAt = new Date();
    disbursement.txHash = this.generateId('tx');

    // Update treasury stats
    this.treasury.stats.totalDisbursed = (
      BigInt(this.treasury.stats.totalDisbursed) + BigInt(disbursement.amount)
    ).toString();

    // Record transaction
    const transaction: TreasuryTransaction = {
      id: this.generateId('tx'),
      type: 'disbursement',
      category: 'grant', // Would be dynamic based on allocation
      amount: disbursement.amount,
      asset: 'TON',
      from: this.config.contractAddress ?? 'treasury',
      to: disbursement.allocationId,
      txHash: disbursement.txHash,
      status: 'confirmed',
      description: `Disbursement for allocation ${disbursement.allocationId}`,
      metadata: { disbursementId, milestoneId: disbursement.milestoneId },
      timestamp: new Date(),
    };
    this.transactions.push(transaction);

    this.disbursements.set(disbursementId, disbursement);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'allocation_disbursed',
      category: 'treasury',
      data: { disbursementId, allocationId: disbursement.allocationId, amount: disbursement.amount },
      relatedId: disbursement.allocationId,
    });

    return disbursement;
  }

  async getDisbursements(allocationId: string): Promise<Disbursement[]> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }
    return [...allocation.disbursements];
  }

  // ============================================================================
  // Transaction Operations
  // ============================================================================

  async getTransactions(filter?: TransactionFilter): Promise<TreasuryTransaction[]> {
    let transactions = [...this.transactions];

    if (filter) {
      if (filter.type) {
        transactions = transactions.filter((t) => t.type === filter.type);
      }
      if (filter.category) {
        transactions = transactions.filter((t) => t.category === filter.category);
      }
      if (filter.status) {
        transactions = transactions.filter((t) => t.status === filter.status);
      }
      if (filter.fromDate) {
        transactions = transactions.filter((t) => t.timestamp >= filter.fromDate!);
      }
      if (filter.toDate) {
        transactions = transactions.filter((t) => t.timestamp <= filter.toDate!);
      }
      if (filter.offset) {
        transactions = transactions.slice(filter.offset);
      }
      if (filter.limit) {
        transactions = transactions.slice(0, filter.limit);
      }
    }

    return transactions;
  }

  async getTransactionsByCategory(
    category: AllocationCategory
  ): Promise<TreasuryTransaction[]> {
    return this.transactions.filter((t) => t.category === category);
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  async getStats(): Promise<TreasuryStats> {
    return { ...this.treasury.stats };
  }

  async getAllocationSummary(): Promise<AllocationSummary> {
    const allocations = Array.from(this.allocations.values());

    const byCategory = new Map<AllocationCategory, { count: number; amount: bigint }>();
    const byStatus = new Map<AllocationStatus, { count: number; amount: bigint }>();
    const byRecipientType = new Map<RecipientType, { count: number; amount: bigint }>();

    let totalAmount = BigInt(0);
    let completedCount = 0;

    for (const allocation of allocations) {
      totalAmount += BigInt(allocation.amount);

      // By category
      const catStats = byCategory.get(allocation.category) ?? { count: 0, amount: BigInt(0) };
      catStats.count++;
      catStats.amount += BigInt(allocation.amount);
      byCategory.set(allocation.category, catStats);

      // By status
      const statusStats = byStatus.get(allocation.status) ?? { count: 0, amount: BigInt(0) };
      statusStats.count++;
      statusStats.amount += BigInt(allocation.amount);
      byStatus.set(allocation.status, statusStats);

      // By recipient type
      const typeStats = byRecipientType.get(allocation.recipientType) ?? {
        count: 0,
        amount: BigInt(0),
      };
      typeStats.count++;
      typeStats.amount += BigInt(allocation.amount);
      byRecipientType.set(allocation.recipientType, typeStats);

      if (allocation.status === 'completed') {
        completedCount++;
      }
    }

    return {
      totalAllocations: allocations.length,
      totalAmount: totalAmount.toString(),
      byCategory: Array.from(byCategory.entries()).map(([category, stats]) => ({
        category,
        count: stats.count,
        amount: stats.amount.toString(),
      })),
      byStatus: Array.from(byStatus.entries()).map(([status, stats]) => ({
        status,
        count: stats.count,
        amount: stats.amount.toString(),
      })),
      byRecipientType: Array.from(byRecipientType.entries()).map(([type, stats]) => ({
        type,
        count: stats.count,
        amount: stats.amount.toString(),
      })),
      averageAllocationSize:
        allocations.length > 0
          ? (totalAmount / BigInt(allocations.length)).toString()
          : '0',
      completionRate: allocations.length > 0 ? completedCount / allocations.length : 0,
    };
  }

  async getUtilizationReport(): Promise<UtilizationReport> {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalBalance = BigInt(this.treasury.balance);
    const allocatedAmount = BigInt(this.treasury.allocatedBalance);
    const disbursedAmount = BigInt(this.treasury.stats.totalDisbursed);

    const utilizationRate =
      totalBalance > BigInt(0)
        ? Number((allocatedAmount * BigInt(100)) / totalBalance)
        : 0;

    // Calculate category breakdown
    const categoryMap = new Map<AllocationCategory, CategoryUtilization>();
    const allocations = Array.from(this.allocations.values());

    for (const allocation of allocations) {
      let util = categoryMap.get(allocation.category);
      if (!util) {
        util = {
          category: allocation.category,
          budgeted: '0',
          allocated: '0',
          disbursed: '0',
          utilizationRate: 0,
        };
      }
      util.allocated = (BigInt(util.allocated) + BigInt(allocation.amount)).toString();

      const disbursed = allocation.disbursements
        .filter((d) => d.status === 'completed')
        .reduce((sum, d) => sum + BigInt(d.amount), BigInt(0));
      util.disbursed = (BigInt(util.disbursed) + disbursed).toString();

      categoryMap.set(allocation.category, util);
    }

    for (const util of categoryMap.values()) {
      if (BigInt(util.allocated) > BigInt(0)) {
        util.utilizationRate =
          Number((BigInt(util.disbursed) * BigInt(100)) / BigInt(util.allocated));
      }
    }

    return {
      period,
      totalBalance: totalBalance.toString(),
      allocatedAmount: allocatedAmount.toString(),
      disbursedAmount: disbursedAmount.toString(),
      utilizationRate,
      categoryBreakdown: Array.from(categoryMap.values()),
      monthlyTrend: [], // Would be calculated from historical data
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: EcosystemFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: EcosystemFundEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private validateAllocationRequest(request: CreateAllocationRequest): void {
    if (!request.recipientId) {
      throw new Error('Recipient ID is required');
    }
    if (!request.amount || BigInt(request.amount) <= BigInt(0)) {
      throw new Error('Valid amount is required');
    }
    if (!request.purpose) {
      throw new Error('Purpose is required');
    }

    // Check if amount exceeds max single allocation
    if (BigInt(request.amount) > BigInt(this.config.maxSingleAllocation)) {
      // This would require DAO approval
      if (!request.proposalId) {
        throw new Error(
          `Amount exceeds maximum single allocation (${this.config.maxSingleAllocation}). DAO proposal required.`
        );
      }
    }

    // Check available balance
    if (BigInt(request.amount) > BigInt(this.treasury.availableBalance)) {
      throw new Error('Insufficient available balance');
    }
  }

  private inferRecipientType(category: AllocationCategory): RecipientType {
    switch (category) {
      case 'grant':
        return 'project';
      case 'investment':
        return 'startup';
      case 'incubation':
        return 'startup';
      case 'incentive':
        return 'individual';
      case 'infrastructure':
        return 'infrastructure';
      case 'research':
        return 'research_institution';
      default:
        return 'project';
    }
  }

  private updateTreasuryStats(): void {
    const allocations = Array.from(this.allocations.values());
    const active = allocations.filter(
      (a) => a.status === 'active' || a.status === 'approved'
    ).length;
    const completed = allocations.filter((a) => a.status === 'completed').length;

    const totalAllocated = allocations.reduce(
      (sum, a) => sum + BigInt(a.amount),
      BigInt(0)
    );

    this.treasury.stats.activeAllocations = active;
    this.treasury.stats.completedAllocations = completed;
    this.treasury.stats.totalAllocated = totalAllocated.toString();
    this.treasury.stats.averageAllocationSize =
      allocations.length > 0
        ? (totalAllocated / BigInt(allocations.length)).toString()
        : '0';

    const balance = BigInt(this.treasury.balance);
    this.treasury.stats.fundUtilization =
      balance > BigInt(0)
        ? Number((totalAllocated * BigInt(100)) / balance)
        : 0;

    this.treasury.updatedAt = new Date();
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // ============================================================================
  // Treasury Funding (for simulation/testing)
  // ============================================================================

  async deposit(amount: string, asset: string = 'TON'): Promise<TreasuryTransaction> {
    const transaction: TreasuryTransaction = {
      id: this.generateId('tx'),
      type: 'deposit',
      category: 'operations',
      amount,
      asset,
      from: 'external',
      to: this.config.contractAddress ?? 'treasury',
      status: 'confirmed',
      description: `Deposit of ${amount} ${asset}`,
      metadata: {},
      timestamp: new Date(),
    };

    this.treasury.balance = (BigInt(this.treasury.balance) + BigInt(amount)).toString();
    this.treasury.stats.totalDeposited = (
      BigInt(this.treasury.stats.totalDeposited) + BigInt(amount)
    ).toString();

    // Calculate reserve and available
    const reserveAmount = (BigInt(this.treasury.balance) * BigInt(Math.floor(this.config.reserveRatio * 100))) / BigInt(100);
    this.treasury.reserveBalance = reserveAmount.toString();
    this.treasury.availableBalance = (
      BigInt(this.treasury.balance) -
      reserveAmount -
      BigInt(this.treasury.allocatedBalance)
    ).toString();

    // Update assets
    const existingAsset = this.treasury.assets.find((a) => a.symbol === asset);
    if (existingAsset) {
      existingAsset.balance = (BigInt(existingAsset.balance) + BigInt(amount)).toString();
    } else {
      this.treasury.assets.push({
        symbol: asset,
        name: asset,
        balance: amount,
        valueInTON: amount,
        percentage: 100,
      });
    }

    this.transactions.push(transaction);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'treasury_deposit',
      category: 'treasury',
      data: { amount, asset },
    });

    return transaction;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTreasuryManager(
  config?: Partial<TreasuryConfig>
): DefaultTreasuryManager {
  return new DefaultTreasuryManager(config);
}
