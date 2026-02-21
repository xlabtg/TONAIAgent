/**
 * TONAIAgent - Treasury Interoperability Manager
 *
 * Manages connections and operations with external treasuries including DAO treasuries,
 * corporate treasuries, fund structures, and protocol treasuries. Provides AI agent
 * automation for treasury operations, allocation strategy management, automated
 * rebalancing, and cross-chain treasury coordination.
 */

import {
  TreasuryType,
  TreasuryConnection,
  TreasurySigner,
  TreasuryPermissions,
  AllocationStrategy,
  TargetAllocation,
  AutomationConfig,
  TreasuryReportingConfig,
  TreasuryMetrics,
  TreasuryInteropConfig,
  InstitutionalNetworkEvent,
  InstitutionalNetworkEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface TreasuryInteropManager {
  // Treasury connection management
  connectTreasury(config: ConnectTreasuryRequest): Promise<TreasuryConnection>;
  disconnectTreasury(connectionId: string): Promise<void>;
  updateTreasuryConnection(connectionId: string, updates: TreasuryConnectionUpdates): Promise<TreasuryConnection>;
  getTreasuryConnection(connectionId: string): Promise<TreasuryConnection | null>;

  // Allocation strategy management
  setAllocationStrategy(connectionId: string, strategy: AllocationStrategy): Promise<void>;
  getAllocationStrategy(connectionId: string): Promise<AllocationStrategy | null>;
  updateAllocationTargets(connectionId: string, targets: TargetAllocation[]): Promise<void>;

  // Automation configuration
  setAutomation(connectionId: string, automation: AutomationConfig): Promise<void>;
  getAutomation(connectionId: string): Promise<AutomationConfig | null>;
  enableAutomation(connectionId: string): Promise<void>;
  disableAutomation(connectionId: string): Promise<void>;
  triggerEmergencyStop(connectionId: string, reason: string): Promise<void>;

  // Rebalancing operations
  executeRebalance(connectionId: string): Promise<RebalanceResult>;
  scheduleRebalance(connectionId: string, scheduledAt: Date): Promise<ScheduledRebalance>;
  cancelScheduledRebalance(rebalanceId: string): Promise<void>;
  getRebalanceHistory(connectionId: string, limit?: number): Promise<RebalanceResult[]>;

  // Position management
  getPositions(connectionId: string): Promise<TreasuryPosition[]>;
  getPositionHistory(connectionId: string, asset: string, period: string): Promise<PositionHistoryEntry[]>;

  // Treasury metrics
  getTreasuryMetrics(connectionId: string): Promise<TreasuryMetrics>;
  getAggregatedMetrics(): Promise<AggregatedTreasuryMetrics>;

  // Treasury operations
  proposeOperation(connectionId: string, operation: TreasuryOperationRequest): Promise<TreasuryOperation>;
  approveOperation(operationId: string, approver: OperationApprover): Promise<TreasuryOperation>;
  rejectOperation(operationId: string, approver: OperationApprover, reason: string): Promise<TreasuryOperation>;
  executeOperation(operationId: string): Promise<OperationExecutionResult>;
  cancelOperation(operationId: string, reason: string): Promise<void>;
  getPendingOperations(connectionId: string): Promise<TreasuryOperation[]>;
  getOperationHistory(connectionId: string, limit?: number): Promise<TreasuryOperation[]>;

  // Treasury queries
  getConnectedTreasuries(filters?: TreasuryFilters): Promise<TreasuryConnection[]>;
  getTreasuriesByType(type: TreasuryType): Promise<TreasuryConnection[]>;
  getTreasuriesByChain(blockchain: string): Promise<TreasuryConnection[]>;

  // Cross-chain coordination
  initiateCrossChainTransfer(request: CrossChainTransferRequest): Promise<CrossChainTransfer>;
  getCrossChainTransferStatus(transferId: string): Promise<CrossChainTransfer>;
  getCrossChainTransfers(connectionId: string): Promise<CrossChainTransfer[]>;

  // Reporting
  generateTreasuryReport(connectionId: string, config: ReportGenerationConfig): Promise<TreasuryReport>;
  getReports(connectionId: string, limit?: number): Promise<TreasuryReport[]>;

  // Health and status
  getTreasuryHealth(): Promise<TreasuryHealthReport>;
  getConnectionHealth(connectionId: string): Promise<ConnectionHealth>;

  // Event handling
  onEvent(callback: InstitutionalNetworkEventCallback): void;

  // Health check
  getHealth(): TreasuryInteropHealth;
}

export interface ConnectTreasuryRequest {
  name: string;
  type: TreasuryType;
  partnerId?: string;
  blockchain: string;
  address: string;
  contractType: 'multisig' | 'timelock' | 'governor' | 'safe' | 'custom';
  signers: Omit<TreasurySigner, 'isActive'>[];
  threshold: number;
  timelockDelay?: number;
  executionDelay?: number;
  connectionMethod: 'direct' | 'bridge' | 'oracle' | 'api';
  permissions?: Partial<TreasuryPermissions>;
  allocation?: Partial<AllocationStrategy>;
  automation?: Partial<AutomationConfig>;
  reporting?: Partial<TreasuryReportingConfig>;
  metadata?: Record<string, unknown>;
}

export interface TreasuryConnectionUpdates {
  name?: string;
  status?: 'active' | 'pending' | 'suspended' | 'disconnected';
  permissions?: Partial<TreasuryPermissions>;
  reporting?: Partial<TreasuryReportingConfig>;
  metadata?: Record<string, unknown>;
}

export interface RebalanceResult {
  id: string;
  connectionId: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'partial';
  initiatedAt: Date;
  completedAt?: Date;
  previousAllocations: AllocationSnapshot[];
  targetAllocations: TargetAllocation[];
  resultingAllocations: AllocationSnapshot[];
  operations: RebalanceOperation[];
  totalValueRebalanced: string;
  gasUsed?: string;
  fees?: string;
  error?: string;
}

export interface AllocationSnapshot {
  asset: string;
  amount: string;
  valueUsd: string;
  percentOfTotal: number;
  category: 'stable' | 'volatile' | 'yield' | 'governance' | 'liquidity';
}

export interface RebalanceOperation {
  id: string;
  type: 'swap' | 'stake' | 'unstake' | 'deposit' | 'withdraw' | 'claim';
  fromAsset?: string;
  toAsset?: string;
  amount: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  txHash?: string;
  error?: string;
}

export interface ScheduledRebalance {
  id: string;
  connectionId: string;
  scheduledAt: Date;
  status: 'scheduled' | 'cancelled' | 'executed';
  createdAt: Date;
  executedAt?: Date;
  result?: RebalanceResult;
}

export interface TreasuryPosition {
  asset: string;
  symbol: string;
  amount: string;
  valueUsd: string;
  percentOfTotal: number;
  category: 'stable' | 'volatile' | 'yield' | 'governance' | 'liquidity';
  protocol?: string;
  chain: string;
  isStaked: boolean;
  stakingApy?: number;
  isLent: boolean;
  lendingApy?: number;
  lastUpdatedAt: Date;
}

export interface PositionHistoryEntry {
  timestamp: Date;
  asset: string;
  amount: string;
  valueUsd: string;
  percentOfTotal: number;
  change24h: number;
  changeType: 'increase' | 'decrease' | 'stable';
}

export interface AggregatedTreasuryMetrics {
  totalConnections: number;
  activeConnections: number;
  totalValueManaged: string;
  totalYieldGenerated: string;
  averageYieldApy: number;
  valueChange24h: number;
  valueChange7d: number;
  valueChange30d: number;
  totalTransactionCount: number;
  treasuriesByType: Record<TreasuryType, number>;
  treasuriesByChain: Record<string, number>;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

export interface TreasuryOperationRequest {
  type: TreasuryOperationType;
  description: string;
  params: TreasuryOperationParams;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  expiresAt?: Date;
}

export type TreasuryOperationType =
  | 'transfer'
  | 'swap'
  | 'stake'
  | 'unstake'
  | 'deposit'
  | 'withdraw'
  | 'claim'
  | 'vote'
  | 'delegate'
  | 'rebalance'
  | 'custom';

export interface TreasuryOperationParams {
  asset?: string;
  fromAsset?: string;
  toAsset?: string;
  amount?: string;
  recipient?: string;
  protocol?: string;
  proposalId?: string;
  voteChoice?: string;
  delegatee?: string;
  customData?: Record<string, unknown>;
}

export interface TreasuryOperation {
  id: string;
  connectionId: string;
  type: TreasuryOperationType;
  description: string;
  params: TreasuryOperationParams;
  status: TreasuryOperationStatus;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  proposedBy: string;
  proposedAt: Date;
  approvals: OperationApproval[];
  rejections: OperationRejection[];
  requiredApprovals: number;
  currentApprovals: number;
  executedAt?: Date;
  executedBy?: string;
  txHash?: string;
  result?: OperationExecutionResult;
  expiresAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

export type TreasuryOperationStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface OperationApprover {
  address: string;
  name?: string;
  role: string;
  signature?: string;
}

export interface OperationApproval {
  approver: OperationApprover;
  approvedAt: Date;
  notes?: string;
}

export interface OperationRejection {
  approver: OperationApprover;
  rejectedAt: Date;
  reason: string;
}

export interface OperationExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  fees?: string;
  output?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

export interface TreasuryFilters {
  types?: TreasuryType[];
  statuses?: ('active' | 'pending' | 'suspended' | 'disconnected')[];
  chains?: string[];
  partnerIds?: string[];
  minValue?: string;
  maxValue?: string;
  automationEnabled?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CrossChainTransferRequest {
  sourceConnectionId: string;
  targetConnectionId: string;
  asset: string;
  amount: string;
  bridgeProtocol?: string;
  maxSlippage?: number;
  urgency?: 'low' | 'medium' | 'high';
}

export interface CrossChainTransfer {
  id: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  sourceChain: string;
  targetChain: string;
  asset: string;
  amount: string;
  status: CrossChainTransferStatus;
  bridgeProtocol: string;
  sourceTxHash?: string;
  targetTxHash?: string;
  initiatedAt: Date;
  completedAt?: Date;
  fees?: string;
  slippage?: number;
  error?: string;
}

export type CrossChainTransferStatus =
  | 'pending'
  | 'source_confirmed'
  | 'bridging'
  | 'target_pending'
  | 'completed'
  | 'failed';

export interface ReportGenerationConfig {
  type: 'summary' | 'detailed' | 'performance' | 'compliance' | 'risk';
  period: {
    startDate: Date;
    endDate: Date;
  };
  format: 'json' | 'csv' | 'pdf';
  includePositions: boolean;
  includeOperations: boolean;
  includeMetrics: boolean;
  recipients?: string[];
}

export interface TreasuryReport {
  id: string;
  connectionId: string;
  type: string;
  title: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  format: string;
  summary: TreasuryReportSummary;
  positions?: TreasuryPosition[];
  operations?: TreasuryOperation[];
  metrics?: TreasuryMetrics;
  url?: string;
}

export interface TreasuryReportSummary {
  totalValue: string;
  valueChange: number;
  yieldGenerated: string;
  averageApy: number;
  operationCount: number;
  highlights: string[];
  alerts: string[];
}

export interface TreasuryHealthReport {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  totalConnections: number;
  healthyConnections: number;
  degradedConnections: number;
  disconnectedConnections: number;
  issues: TreasuryHealthIssue[];
  lastCheckedAt: Date;
}

export interface TreasuryHealthIssue {
  connectionId: string;
  connectionName: string;
  issue: string;
  severity: 'warning' | 'error' | 'critical';
  since: Date;
  recommendation?: string;
}

export interface ConnectionHealth {
  connectionId: string;
  status: 'healthy' | 'degraded' | 'disconnected';
  lastSyncAt: Date;
  lastActivityAt: Date;
  signerStatus: SignerHealthStatus[];
  automationStatus: 'enabled' | 'disabled' | 'error';
  pendingOperations: number;
  issues: string[];
}

export interface SignerHealthStatus {
  address: string;
  name?: string;
  isActive: boolean;
  lastSeenAt?: Date;
}

export interface TreasuryInteropHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionCount: number;
  activeConnections: number;
  lastSyncAt: Date;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultTreasuryInteropManager implements TreasuryInteropManager {
  private connections: Map<string, TreasuryConnection> = new Map();
  private operations: Map<string, TreasuryOperation> = new Map();
  private rebalances: Map<string, RebalanceResult> = new Map();
  private scheduledRebalances: Map<string, ScheduledRebalance> = new Map();
  private crossChainTransfers: Map<string, CrossChainTransfer> = new Map();
  private reports: Map<string, TreasuryReport> = new Map();
  private eventCallbacks: InstitutionalNetworkEventCallback[] = [];
  private config: TreasuryInteropConfig;
  private lastSyncAt: Date = new Date();

  constructor(config?: Partial<TreasuryInteropConfig>) {
    this.config = {
      enabled: true,
      supportedChains: ['ton', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc'],
      automationEnabled: true,
      maxAutomationLevel: 'full_autonomy',
      defaultRebalanceThreshold: 5, // 5% deviation
      ...config,
    };
  }

  async connectTreasury(request: ConnectTreasuryRequest): Promise<TreasuryConnection> {
    const connectionId = this.generateId('treasury');

    const connection: TreasuryConnection = {
      id: connectionId,
      name: request.name,
      type: request.type,
      partnerId: request.partnerId,
      status: 'pending',
      configuration: {
        blockchain: request.blockchain,
        address: request.address,
        contractType: request.contractType,
        signers: request.signers.map((s) => ({ ...s, isActive: true })),
        threshold: request.threshold,
        timelockDelay: request.timelockDelay,
        executionDelay: request.executionDelay,
        connectionMethod: request.connectionMethod,
      },
      permissions: {
        canDeposit: true,
        canWithdraw: true,
        canTrade: false,
        canStake: false,
        canLend: false,
        canBorrow: false,
        canVote: false,
        maxWithdrawalPerTx: '0',
        maxDailyWithdrawal: '0',
        whitelistedAssets: [],
        whitelistedProtocols: [],
        ...request.permissions,
      },
      allocation: {
        type: 'passive',
        targetAllocations: [],
        rebalanceThreshold: this.config.defaultRebalanceThreshold,
        rebalanceFrequency: 'weekly',
        riskProfile: 'moderate',
        ...request.allocation,
      },
      automation: {
        enabled: false,
        automationLevel: 'none',
        agentIds: [],
        automatedOperations: [],
        approvalRequired: true,
        approvalThreshold: '1000',
        emergencyStop: true,
        emergencyContacts: [],
        ...request.automation,
      },
      reporting: {
        enabled: true,
        frequency: 'daily',
        reports: ['summary', 'positions'],
        recipients: [],
        format: 'json',
        ...request.reporting,
      },
      metrics: {
        totalValue: '0',
        valueChange24h: 0,
        valueChange7d: 0,
        valueChange30d: 0,
        assetCount: 0,
        yieldGenerated: '0',
        yieldApy: 0,
        transactionCount: 0,
        lastActivityAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.connections.set(connectionId, connection);
    this.emitEvent('treasury_connected', 'treasury', connectionId, 'connect', { ...connection });

    // Verify connection and set to active if successful
    await this.verifyConnection(connectionId);

    return connection;
  }

  async disconnectTreasury(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    connection.status = 'disconnected';
    connection.updatedAt = new Date();
    connection.automation.enabled = false;

    this.connections.set(connectionId, connection);
    this.emitEvent('treasury_connected', 'treasury', connectionId, 'disconnect', { reason: 'User initiated disconnect' });
  }

  async updateTreasuryConnection(
    connectionId: string,
    updates: TreasuryConnectionUpdates
  ): Promise<TreasuryConnection> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    const updatedConnection: TreasuryConnection = {
      ...connection,
      name: updates.name || connection.name,
      status: updates.status || connection.status,
      permissions: updates.permissions
        ? { ...connection.permissions, ...updates.permissions }
        : connection.permissions,
      reporting: updates.reporting
        ? { ...connection.reporting, ...updates.reporting }
        : connection.reporting,
      updatedAt: new Date(),
    };

    this.connections.set(connectionId, updatedConnection);
    this.emitEvent('treasury_operation', 'treasury', connectionId, 'update', { updates });

    return updatedConnection;
  }

  async getTreasuryConnection(connectionId: string): Promise<TreasuryConnection | null> {
    return this.connections.get(connectionId) || null;
  }

  async setAllocationStrategy(connectionId: string, strategy: AllocationStrategy): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    connection.allocation = strategy;
    connection.updatedAt = new Date();
    this.connections.set(connectionId, connection);

    this.emitEvent('treasury_operation', 'treasury', connectionId, 'set_allocation_strategy', { strategy });
  }

  async getAllocationStrategy(connectionId: string): Promise<AllocationStrategy | null> {
    const connection = this.connections.get(connectionId);
    return connection?.allocation || null;
  }

  async updateAllocationTargets(connectionId: string, targets: TargetAllocation[]): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    connection.allocation.targetAllocations = targets;
    connection.updatedAt = new Date();
    this.connections.set(connectionId, connection);

    this.emitEvent('treasury_operation', 'treasury', connectionId, 'update_allocation_targets', { targets });
  }

  async setAutomation(connectionId: string, automation: AutomationConfig): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    connection.automation = automation;
    connection.updatedAt = new Date();
    this.connections.set(connectionId, connection);

    this.emitEvent('treasury_operation', 'treasury', connectionId, 'set_automation', { automation });
  }

  async getAutomation(connectionId: string): Promise<AutomationConfig | null> {
    const connection = this.connections.get(connectionId);
    return connection?.automation || null;
  }

  async enableAutomation(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    connection.automation.enabled = true;
    connection.updatedAt = new Date();
    this.connections.set(connectionId, connection);

    this.emitEvent('treasury_operation', 'treasury', connectionId, 'enable_automation', {});
  }

  async disableAutomation(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    connection.automation.enabled = false;
    connection.updatedAt = new Date();
    this.connections.set(connectionId, connection);

    this.emitEvent('treasury_operation', 'treasury', connectionId, 'disable_automation', {});
  }

  async triggerEmergencyStop(connectionId: string, reason: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    connection.automation.enabled = false;
    connection.status = 'suspended';
    connection.updatedAt = new Date();
    this.connections.set(connectionId, connection);

    // Cancel all pending operations
    for (const [opId, operation] of this.operations) {
      if (operation.connectionId === connectionId && operation.status === 'pending_approval') {
        operation.status = 'cancelled';
        operation.cancelledAt = new Date();
        operation.cancellationReason = `Emergency stop: ${reason}`;
        this.operations.set(opId, operation);
      }
    }

    this.emitEvent('treasury_operation', 'treasury', connectionId, 'emergency_stop', { reason });
  }

  async executeRebalance(connectionId: string): Promise<RebalanceResult> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    const rebalanceId = this.generateId('rebalance');
    const currentPositions = await this.getPositions(connectionId);

    const previousAllocations: AllocationSnapshot[] = currentPositions.map((p) => ({
      asset: p.asset,
      amount: p.amount,
      valueUsd: p.valueUsd,
      percentOfTotal: p.percentOfTotal,
      category: p.category,
    }));

    const result: RebalanceResult = {
      id: rebalanceId,
      connectionId,
      status: 'executing',
      initiatedAt: new Date(),
      previousAllocations,
      targetAllocations: connection.allocation.targetAllocations,
      resultingAllocations: [],
      operations: [],
      totalValueRebalanced: '0',
    };

    this.rebalances.set(rebalanceId, result);

    // Simulate rebalance execution
    try {
      const operations = this.calculateRebalanceOperations(previousAllocations, connection.allocation.targetAllocations);
      result.operations = operations;

      // Mark as completed
      result.status = 'completed';
      result.completedAt = new Date();
      result.resultingAllocations = previousAllocations; // In real implementation, would reflect actual new positions

      let totalRebalanced = BigInt(0);
      for (const op of operations) {
        op.status = 'completed';
        try {
          totalRebalanced += BigInt(op.amount.replace(/[^0-9]/g, '') || '0');
        } catch {
          // Ignore parsing errors
        }
      }
      result.totalValueRebalanced = totalRebalanced.toString();
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.rebalances.set(rebalanceId, result);
    this.emitEvent('treasury_operation', 'treasury', connectionId, 'rebalance', { ...result });

    return result;
  }

  async scheduleRebalance(connectionId: string, scheduledAt: Date): Promise<ScheduledRebalance> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    const scheduled: ScheduledRebalance = {
      id: this.generateId('scheduled_rebalance'),
      connectionId,
      scheduledAt,
      status: 'scheduled',
      createdAt: new Date(),
    };

    this.scheduledRebalances.set(scheduled.id, scheduled);
    return scheduled;
  }

  async cancelScheduledRebalance(rebalanceId: string): Promise<void> {
    const scheduled = this.scheduledRebalances.get(rebalanceId);
    if (!scheduled) {
      throw new Error(`Scheduled rebalance not found: ${rebalanceId}`);
    }

    scheduled.status = 'cancelled';
    this.scheduledRebalances.set(rebalanceId, scheduled);
  }

  async getRebalanceHistory(connectionId: string, limit: number = 50): Promise<RebalanceResult[]> {
    const results: RebalanceResult[] = [];
    for (const rebalance of this.rebalances.values()) {
      if (rebalance.connectionId === connectionId) {
        results.push(rebalance);
      }
    }
    return results
      .sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime())
      .slice(0, limit);
  }

  async getPositions(connectionId: string): Promise<TreasuryPosition[]> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    // In a real implementation, this would fetch actual on-chain positions
    // For now, return mock positions based on target allocations
    const positions: TreasuryPosition[] = connection.allocation.targetAllocations.map((target) => ({
      asset: target.asset,
      symbol: target.asset.toUpperCase(),
      amount: '0',
      valueUsd: '0',
      percentOfTotal: target.targetPercent,
      category: target.category,
      chain: connection.configuration.blockchain,
      isStaked: false,
      isLent: false,
      lastUpdatedAt: new Date(),
    }));

    return positions;
  }

  async getPositionHistory(_connectionId: string, _asset: string, _period: string): Promise<PositionHistoryEntry[]> {
    // In a real implementation, this would fetch historical position data
    return [];
  }

  async getTreasuryMetrics(connectionId: string): Promise<TreasuryMetrics> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    return connection.metrics;
  }

  async getAggregatedMetrics(): Promise<AggregatedTreasuryMetrics> {
    const connections = Array.from(this.connections.values());
    const active = connections.filter((c) => c.status === 'active');

    let totalValue = BigInt(0);
    let totalYield = BigInt(0);
    let totalApy = 0;
    let totalTxCount = 0;

    const treasuriesByType: Record<TreasuryType, number> = {} as any;
    const treasuriesByChain: Record<string, number> = {};

    for (const conn of active) {
      try {
        totalValue += BigInt(conn.metrics.totalValue.replace(/[^0-9]/g, '') || '0');
        totalYield += BigInt(conn.metrics.yieldGenerated.replace(/[^0-9]/g, '') || '0');
      } catch {
        // Ignore parsing errors
      }
      totalApy += conn.metrics.yieldApy;
      totalTxCount += conn.metrics.transactionCount;

      treasuriesByType[conn.type] = (treasuriesByType[conn.type] || 0) + 1;
      const chain = conn.configuration.blockchain;
      treasuriesByChain[chain] = (treasuriesByChain[chain] || 0) + 1;
    }

    const avgApy = active.length > 0 ? totalApy / active.length : 0;

    return {
      totalConnections: connections.length,
      activeConnections: active.length,
      totalValueManaged: totalValue.toString(),
      totalYieldGenerated: totalYield.toString(),
      averageYieldApy: avgApy,
      valueChange24h: 0,
      valueChange7d: 0,
      valueChange30d: 0,
      totalTransactionCount: totalTxCount,
      treasuriesByType,
      treasuriesByChain,
      healthStatus: this.determineOverallHealth(connections),
    };
  }

  async proposeOperation(connectionId: string, request: TreasuryOperationRequest): Promise<TreasuryOperation> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    const operationId = this.generateId('operation');

    const operation: TreasuryOperation = {
      id: operationId,
      connectionId,
      type: request.type,
      description: request.description,
      params: request.params,
      status: 'pending_approval',
      urgency: request.urgency,
      proposedBy: 'system',
      proposedAt: new Date(),
      approvals: [],
      rejections: [],
      requiredApprovals: connection.configuration.threshold,
      currentApprovals: 0,
      expiresAt: request.expiresAt,
    };

    this.operations.set(operationId, operation);
    this.emitEvent('treasury_operation', 'treasury', connectionId, 'propose_operation', { ...operation });

    return operation;
  }

  async approveOperation(operationId: string, approver: OperationApprover): Promise<TreasuryOperation> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    if (operation.status !== 'pending_approval') {
      throw new Error(`Operation is not pending approval: ${operation.status}`);
    }

    // Check if approver already approved
    if (operation.approvals.some((a) => a.approver.address === approver.address)) {
      throw new Error('Approver has already approved this operation');
    }

    operation.approvals.push({
      approver,
      approvedAt: new Date(),
    });
    operation.currentApprovals = operation.approvals.length;

    // Check if we have enough approvals
    if (operation.currentApprovals >= operation.requiredApprovals) {
      operation.status = 'approved';
    }

    this.operations.set(operationId, operation);
    this.emitEvent('treasury_operation', 'treasury', operation.connectionId, 'approve_operation', { operationId, approver });

    return operation;
  }

  async rejectOperation(operationId: string, approver: OperationApprover, reason: string): Promise<TreasuryOperation> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    if (operation.status !== 'pending_approval') {
      throw new Error(`Operation is not pending approval: ${operation.status}`);
    }

    operation.rejections.push({
      approver,
      rejectedAt: new Date(),
      reason,
    });

    // A single rejection may not reject the operation, but for simplicity:
    const connection = this.connections.get(operation.connectionId);
    const totalSigners = connection?.configuration.signers.length || 0;
    const maxPossibleApprovals = totalSigners - operation.rejections.length;

    if (maxPossibleApprovals < operation.requiredApprovals) {
      operation.status = 'rejected';
    }

    this.operations.set(operationId, operation);
    this.emitEvent('treasury_operation', 'treasury', operation.connectionId, 'reject_operation', { operationId, approver, reason });

    return operation;
  }

  async executeOperation(operationId: string): Promise<OperationExecutionResult> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    if (operation.status !== 'approved') {
      throw new Error(`Operation is not approved: ${operation.status}`);
    }

    operation.status = 'executing';
    this.operations.set(operationId, operation);

    // Simulate execution
    const result: OperationExecutionResult = {
      success: true,
      txHash: `0x${this.generateId('tx')}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      gasUsed: '21000',
      fees: '0.001',
    };

    operation.status = result.success ? 'completed' : 'failed';
    operation.executedAt = new Date();
    operation.txHash = result.txHash;
    operation.result = result;

    this.operations.set(operationId, operation);
    this.emitEvent('treasury_operation', 'treasury', operation.connectionId, 'execute_operation', { operationId, result });

    return result;
  }

  async cancelOperation(operationId: string, reason: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    if (operation.status !== 'pending_approval') {
      throw new Error(`Cannot cancel operation with status: ${operation.status}`);
    }

    operation.status = 'cancelled';
    operation.cancelledAt = new Date();
    operation.cancellationReason = reason;

    this.operations.set(operationId, operation);
    this.emitEvent('treasury_operation', 'treasury', operation.connectionId, 'cancel_operation', { operationId, reason });
  }

  async getPendingOperations(connectionId: string): Promise<TreasuryOperation[]> {
    const pending: TreasuryOperation[] = [];
    for (const operation of this.operations.values()) {
      if (operation.connectionId === connectionId && operation.status === 'pending_approval') {
        pending.push(operation);
      }
    }
    return pending.sort((a, b) => b.proposedAt.getTime() - a.proposedAt.getTime());
  }

  async getOperationHistory(connectionId: string, limit: number = 50): Promise<TreasuryOperation[]> {
    const ops: TreasuryOperation[] = [];
    for (const operation of this.operations.values()) {
      if (operation.connectionId === connectionId) {
        ops.push(operation);
      }
    }
    return ops
      .sort((a, b) => b.proposedAt.getTime() - a.proposedAt.getTime())
      .slice(0, limit);
  }

  async getConnectedTreasuries(filters?: TreasuryFilters): Promise<TreasuryConnection[]> {
    let connections = Array.from(this.connections.values());

    if (filters) {
      if (filters.types?.length) {
        connections = connections.filter((c) => filters.types!.includes(c.type));
      }
      if (filters.statuses?.length) {
        connections = connections.filter((c) => filters.statuses!.includes(c.status));
      }
      if (filters.chains?.length) {
        connections = connections.filter((c) => filters.chains!.includes(c.configuration.blockchain));
      }
      if (filters.partnerIds?.length) {
        connections = connections.filter((c) => c.partnerId && filters.partnerIds!.includes(c.partnerId));
      }
      if (filters.automationEnabled !== undefined) {
        connections = connections.filter((c) => c.automation.enabled === filters.automationEnabled);
      }

      // Sorting
      if (filters.sortBy) {
        connections.sort((a, b) => {
          const aVal = this.getNestedValue(a, filters.sortBy!);
          const bVal = this.getNestedValue(b, filters.sortBy!);
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return aVal > bVal ? order : aVal < bVal ? -order : 0;
        });
      }

      // Pagination
      if (filters.offset !== undefined) {
        connections = connections.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        connections = connections.slice(0, filters.limit);
      }
    }

    return connections;
  }

  async getTreasuriesByType(type: TreasuryType): Promise<TreasuryConnection[]> {
    return this.getConnectedTreasuries({ types: [type] });
  }

  async getTreasuriesByChain(blockchain: string): Promise<TreasuryConnection[]> {
    return this.getConnectedTreasuries({ chains: [blockchain] });
  }

  async initiateCrossChainTransfer(request: CrossChainTransferRequest): Promise<CrossChainTransfer> {
    const source = this.connections.get(request.sourceConnectionId);
    const target = this.connections.get(request.targetConnectionId);

    if (!source) {
      throw new Error(`Source treasury not found: ${request.sourceConnectionId}`);
    }
    if (!target) {
      throw new Error(`Target treasury not found: ${request.targetConnectionId}`);
    }

    const transfer: CrossChainTransfer = {
      id: this.generateId('crosschain'),
      sourceConnectionId: request.sourceConnectionId,
      targetConnectionId: request.targetConnectionId,
      sourceChain: source.configuration.blockchain,
      targetChain: target.configuration.blockchain,
      asset: request.asset,
      amount: request.amount,
      status: 'pending',
      bridgeProtocol: request.bridgeProtocol || 'default_bridge',
      initiatedAt: new Date(),
    };

    this.crossChainTransfers.set(transfer.id, transfer);
    this.emitEvent('treasury_operation', 'treasury', request.sourceConnectionId, 'cross_chain_transfer', { ...transfer });

    return transfer;
  }

  async getCrossChainTransferStatus(transferId: string): Promise<CrossChainTransfer> {
    const transfer = this.crossChainTransfers.get(transferId);
    if (!transfer) {
      throw new Error(`Cross-chain transfer not found: ${transferId}`);
    }
    return transfer;
  }

  async getCrossChainTransfers(connectionId: string): Promise<CrossChainTransfer[]> {
    const transfers: CrossChainTransfer[] = [];
    for (const transfer of this.crossChainTransfers.values()) {
      if (transfer.sourceConnectionId === connectionId || transfer.targetConnectionId === connectionId) {
        transfers.push(transfer);
      }
    }
    return transfers.sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime());
  }

  async generateTreasuryReport(connectionId: string, config: ReportGenerationConfig): Promise<TreasuryReport> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    const reportId = this.generateId('report');

    const report: TreasuryReport = {
      id: reportId,
      connectionId,
      type: config.type,
      title: `${connection.name} - ${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Report`,
      period: config.period,
      generatedAt: new Date(),
      format: config.format,
      summary: {
        totalValue: connection.metrics.totalValue,
        valueChange: connection.metrics.valueChange30d,
        yieldGenerated: connection.metrics.yieldGenerated,
        averageApy: connection.metrics.yieldApy,
        operationCount: connection.metrics.transactionCount,
        highlights: this.generateReportHighlights(connection),
        alerts: this.generateReportAlerts(connection),
      },
    };

    if (config.includePositions) {
      report.positions = await this.getPositions(connectionId);
    }
    if (config.includeOperations) {
      report.operations = await this.getOperationHistory(connectionId, 100);
    }
    if (config.includeMetrics) {
      report.metrics = connection.metrics;
    }

    this.reports.set(reportId, report);
    return report;
  }

  async getReports(connectionId: string, limit: number = 20): Promise<TreasuryReport[]> {
    const reports: TreasuryReport[] = [];
    for (const report of this.reports.values()) {
      if (report.connectionId === connectionId) {
        reports.push(report);
      }
    }
    return reports
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  async getTreasuryHealth(): Promise<TreasuryHealthReport> {
    const connections = Array.from(this.connections.values());
    const issues: TreasuryHealthIssue[] = [];

    let healthy = 0;
    let degraded = 0;
    let disconnected = 0;

    for (const conn of connections) {
      switch (conn.status) {
        case 'active':
          healthy++;
          break;
        case 'suspended':
        case 'pending':
          degraded++;
          issues.push({
            connectionId: conn.id,
            connectionName: conn.name,
            issue: `Treasury is ${conn.status}`,
            severity: 'warning',
            since: conn.updatedAt,
          });
          break;
        case 'disconnected':
          disconnected++;
          issues.push({
            connectionId: conn.id,
            connectionName: conn.name,
            issue: 'Treasury is disconnected',
            severity: 'error',
            since: conn.updatedAt,
            recommendation: 'Reconnect treasury or verify configuration',
          });
          break;
      }
    }

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (disconnected > 0) {
      overallHealth = 'critical';
    } else if (degraded > 0) {
      overallHealth = 'degraded';
    }

    return {
      overallHealth,
      totalConnections: connections.length,
      healthyConnections: healthy,
      degradedConnections: degraded,
      disconnectedConnections: disconnected,
      issues,
      lastCheckedAt: new Date(),
    };
  }

  async getConnectionHealth(connectionId: string): Promise<ConnectionHealth> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Treasury connection not found: ${connectionId}`);
    }

    const pendingOps = await this.getPendingOperations(connectionId);
    const issues: string[] = [];

    if (connection.status !== 'active') {
      issues.push(`Connection status is ${connection.status}`);
    }
    if (!connection.automation.enabled && connection.allocation.type !== 'passive') {
      issues.push('Automation is disabled but strategy requires it');
    }

    return {
      connectionId,
      status: connection.status === 'active' ? 'healthy' : connection.status === 'disconnected' ? 'disconnected' : 'degraded',
      lastSyncAt: connection.updatedAt,
      lastActivityAt: connection.metrics.lastActivityAt,
      signerStatus: connection.configuration.signers.map((s) => ({
        address: s.address,
        name: s.name,
        isActive: s.isActive,
      })),
      automationStatus: connection.automation.enabled ? 'enabled' : 'disabled',
      pendingOperations: pendingOps.length,
      issues,
    };
  }

  onEvent(callback: InstitutionalNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): TreasuryInteropHealth {
    const connections = Array.from(this.connections.values());
    const active = connections.filter((c) => c.status === 'active').length;
    const issues: string[] = [];

    // Check for stale data
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - this.lastSyncAt.getTime() > staleThreshold) {
      issues.push('Data sync is overdue');
    }

    // Check for disconnected treasuries
    const disconnected = connections.filter((c) => c.status === 'disconnected').length;
    if (disconnected > 0) {
      issues.push(`${disconnected} treasuries are disconnected`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'degraded' : 'unhealthy',
      connectionCount: connections.length,
      activeConnections: active,
      lastSyncAt: this.lastSyncAt,
      issues,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: InstitutionalNetworkEvent['type'],
    category: InstitutionalNetworkEvent['category'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: InstitutionalNetworkEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      category,
      severity: 'info',
      source: 'treasury_interop',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedEntities: [{ type: 'treasury', id: sourceId, impact: 'direct' }],
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private async verifyConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // In a real implementation, this would verify the on-chain connection
    // For now, just set to active after a brief simulated verification
    connection.status = 'active';
    connection.updatedAt = new Date();
    this.connections.set(connectionId, connection);
  }

  private calculateRebalanceOperations(
    current: AllocationSnapshot[],
    targets: TargetAllocation[]
  ): RebalanceOperation[] {
    const operations: RebalanceOperation[] = [];

    for (const target of targets) {
      const currentAlloc = current.find((c) => c.asset === target.asset);
      const currentPercent = currentAlloc?.percentOfTotal || 0;
      const diff = target.targetPercent - currentPercent;

      if (Math.abs(diff) > 1) { // Only rebalance if difference > 1%
        operations.push({
          id: this.generateId('rebal_op'),
          type: diff > 0 ? 'swap' : 'swap',
          fromAsset: diff > 0 ? 'USDC' : target.asset,
          toAsset: diff > 0 ? target.asset : 'USDC',
          amount: Math.abs(diff).toString(),
          status: 'pending',
        });
      }
    }

    return operations;
  }

  private determineOverallHealth(connections: TreasuryConnection[]): 'healthy' | 'degraded' | 'critical' {
    const disconnected = connections.filter((c) => c.status === 'disconnected').length;
    const suspended = connections.filter((c) => c.status === 'suspended').length;

    if (disconnected > connections.length * 0.2) return 'critical';
    if (disconnected > 0 || suspended > connections.length * 0.1) return 'degraded';
    return 'healthy';
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0;
  }

  private generateReportHighlights(connection: TreasuryConnection): string[] {
    const highlights: string[] = [];

    if (connection.metrics.yieldApy > 5) {
      highlights.push(`Strong yield performance at ${connection.metrics.yieldApy.toFixed(2)}% APY`);
    }
    if (connection.metrics.valueChange30d > 10) {
      highlights.push(`Value increased ${connection.metrics.valueChange30d.toFixed(2)}% over 30 days`);
    }
    if (connection.automation.enabled) {
      highlights.push('Automation enabled for optimized operations');
    }

    return highlights;
  }

  private generateReportAlerts(connection: TreasuryConnection): string[] {
    const alerts: string[] = [];

    if (connection.metrics.valueChange30d < -10) {
      alerts.push(`Value decreased ${Math.abs(connection.metrics.valueChange30d).toFixed(2)}% over 30 days`);
    }
    if (connection.status !== 'active') {
      alerts.push(`Treasury status is ${connection.status}`);
    }
    if (!connection.automation.enabled && connection.allocation.type !== 'passive') {
      alerts.push('Automation disabled - manual management required');
    }

    return alerts;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTreasuryInteropManager(
  config?: Partial<TreasuryInteropConfig>
): DefaultTreasuryInteropManager {
  return new DefaultTreasuryInteropManager(config);
}

// Default export
export default DefaultTreasuryInteropManager;
