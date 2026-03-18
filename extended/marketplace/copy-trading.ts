/**
 * TONAIAgent - Copy Trading Engine
 *
 * Implements capital mirroring, proportional allocation, auto-rebalancing,
 * slippage protection, and risk controls for copy trading.
 */

import {
  CopyTradingPosition,
  CopyConfig,
  CopyPerformance,
  CopyRiskControls,
  CopyTradeEvent,
  CopyStatus,
  TradingAgent,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Copy Trading Engine Interface
// ============================================================================

export interface CopyTradingEngine {
  // Position management
  startCopying(input: StartCopyInput): Promise<CopyTradingPosition>;
  stopCopying(positionId: string, immediate?: boolean): Promise<CopyTradingPosition>;
  pauseCopying(positionId: string): Promise<CopyTradingPosition>;
  resumeCopying(positionId: string): Promise<CopyTradingPosition>;
  updateConfig(positionId: string, config: Partial<CopyConfig>): Promise<CopyTradingPosition>;

  // Position queries
  getPosition(positionId: string): Promise<CopyTradingPosition | null>;
  getUserPositions(userId: string): Promise<CopyTradingPosition[]>;
  getAgentFollowers(agentId: string): Promise<CopyTradingPosition[]>;

  // Trade execution
  processTrade(agentTrade: AgentTrade): Promise<CopyTradeEvent[]>;
  rebalance(positionId: string): Promise<CopyTradeEvent[]>;
  exitAllPositions(positionId: string): Promise<CopyTradeEvent[]>;

  // Risk management
  checkRiskLimits(positionId: string): Promise<RiskCheckResult>;
  triggerStopLoss(positionId: string, reason: string): Promise<CopyTradingPosition>;

  // Performance tracking
  updatePerformance(positionId: string): Promise<CopyPerformance>;
  getTradeHistory(positionId: string, limit?: number): Promise<CopyTradeEvent[]>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface StartCopyInput {
  userId: string;
  agentId: string;
  capitalAllocated: number;
  copyRatio?: number;
  maxPositionSize?: number;
  proportionalAllocation?: boolean;
  autoRebalance?: boolean;
  riskControls?: Partial<CopyRiskControls>;
  excludeTokens?: string[];
  excludeProtocols?: string[];
}

export interface AgentTrade {
  id: string;
  agentId: string;
  type: 'open' | 'close' | 'increase' | 'decrease';
  token: string;
  protocol?: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface RiskCheckResult {
  passed: boolean;
  violations: RiskViolation[];
  warnings: RiskWarning[];
  currentDrawdown: number;
  dailyPnl: number;
  dailyPnlPercent: number;
}

export interface RiskViolation {
  type: 'max_daily_loss' | 'max_drawdown' | 'volatility_threshold';
  limit: number;
  current: number;
  action: 'pause' | 'stop' | 'alert';
}

export interface RiskWarning {
  type: string;
  message: string;
  threshold: number;
  current: number;
}

// ============================================================================
// Default Copy Trading Engine Implementation
// ============================================================================

export class DefaultCopyTradingEngine implements CopyTradingEngine {
  private readonly positions: Map<string, CopyTradingPosition> = new Map();
  private readonly tradeEvents: Map<string, CopyTradeEvent[]> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: CopyTradingEngineConfig;

  // Simulated agent data for demo purposes
  private readonly agents: Map<string, TradingAgent> = new Map();

  constructor(config?: Partial<CopyTradingEngineConfig>) {
    this.config = {
      minCopyAmount: config?.minCopyAmount ?? 10, // 10 TON minimum
      maxCopyAmount: config?.maxCopyAmount ?? 100000, // 100k TON maximum
      defaultSlippageProtection: config?.defaultSlippageProtection ?? 1, // 1%
      maxFollowersPerAgent: config?.maxFollowersPerAgent ?? 1000,
      cooldownPeriodMinutes: config?.cooldownPeriodMinutes ?? 5,
      defaultRebalanceThreshold: config?.defaultRebalanceThreshold ?? 5, // 5%
      maxPositionsPerUser: config?.maxPositionsPerUser ?? 50,
      defaultMaxDailyLossPercent: config?.defaultMaxDailyLossPercent ?? 10,
      defaultMaxDrawdown: config?.defaultMaxDrawdown ?? 25,
    };
  }

  async startCopying(input: StartCopyInput): Promise<CopyTradingPosition> {
    // Validate input
    this.validateStartInput(input);

    // Check if user already copying this agent
    const existingPositions = await this.getUserPositions(input.userId);
    const alreadyCopying = existingPositions.find(
      p => p.agentId === input.agentId && p.status !== 'stopped'
    );
    if (alreadyCopying) {
      throw new Error(`Already copying agent ${input.agentId}`);
    }

    // Check user position limit
    const activePositions = existingPositions.filter(p => p.status !== 'stopped');
    if (activePositions.length >= this.config.maxPositionsPerUser) {
      throw new Error(`Maximum ${this.config.maxPositionsPerUser} active copy positions allowed`);
    }

    // Check agent follower limit
    const agentFollowers = await this.getAgentFollowers(input.agentId);
    const activeFollowers = agentFollowers.filter(p => p.status !== 'stopped');
    if (activeFollowers.length >= this.config.maxFollowersPerAgent) {
      throw new Error(`Agent has reached maximum follower limit`);
    }

    const positionId = this.generateId('copy');
    const now = new Date();

    const position: CopyTradingPosition = {
      id: positionId,
      userId: input.userId,
      agentId: input.agentId,
      status: 'active',
      config: {
        capitalAllocated: input.capitalAllocated,
        copyRatio: input.copyRatio ?? 1,
        maxPositionSize: input.maxPositionSize ?? input.capitalAllocated * 0.2,
        proportionalAllocation: input.proportionalAllocation ?? true,
        autoRebalance: input.autoRebalance ?? true,
        rebalanceThreshold: this.config.defaultRebalanceThreshold,
        slippageProtection: this.config.defaultSlippageProtection,
        excludeTokens: input.excludeTokens ?? [],
        excludeProtocols: input.excludeProtocols ?? [],
      },
      performance: {
        totalPnl: 0,
        totalPnlPercent: 0,
        copiedTrades: 0,
        successfulCopies: 0,
        failedCopies: 0,
        skippedTrades: 0,
        avgSlippage: 0,
        feePaid: 0,
        currentValue: input.capitalAllocated,
      },
      riskControls: {
        maxDailyLoss: input.riskControls?.maxDailyLoss ?? input.capitalAllocated * 0.1,
        maxDailyLossPercent: input.riskControls?.maxDailyLossPercent ?? this.config.defaultMaxDailyLossPercent,
        maxDrawdown: input.riskControls?.maxDrawdown ?? this.config.defaultMaxDrawdown,
        stopLossTriggered: false,
        pauseOnAgentPause: input.riskControls?.pauseOnAgentPause ?? true,
        pauseOnHighVolatility: input.riskControls?.pauseOnHighVolatility ?? true,
        volatilityThreshold: input.riskControls?.volatilityThreshold ?? 50,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.positions.set(positionId, position);
    this.tradeEvents.set(positionId, []);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'copy_started',
      severity: 'info',
      source: 'copy_trading_engine',
      message: `User ${input.userId} started copying agent ${input.agentId}`,
      data: {
        positionId,
        userId: input.userId,
        agentId: input.agentId,
        capitalAllocated: input.capitalAllocated,
      },
    });

    return position;
  }

  async stopCopying(positionId: string, immediate?: boolean): Promise<CopyTradingPosition> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    if (position.status === 'stopped') {
      throw new Error('Position already stopped');
    }

    const now = new Date();
    let newStatus: CopyStatus = immediate ? 'stopped' : 'stopping';

    // If immediate, exit all positions
    if (immediate) {
      await this.exitAllPositions(positionId);
    }

    const updatedPosition: CopyTradingPosition = {
      ...position,
      status: newStatus,
      updatedAt: now,
      exitedAt: immediate ? now : undefined,
    };

    this.positions.set(positionId, updatedPosition);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'copy_stopped',
      severity: 'info',
      source: 'copy_trading_engine',
      message: `Copy position ${positionId} ${immediate ? 'stopped' : 'stopping'}`,
      data: { positionId, immediate },
    });

    return updatedPosition;
  }

  async pauseCopying(positionId: string): Promise<CopyTradingPosition> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    if (position.status !== 'active') {
      throw new Error(`Cannot pause position in ${position.status} status`);
    }

    const now = new Date();
    const updatedPosition: CopyTradingPosition = {
      ...position,
      status: 'paused',
      updatedAt: now,
    };

    this.positions.set(positionId, updatedPosition);
    return updatedPosition;
  }

  async resumeCopying(positionId: string): Promise<CopyTradingPosition> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    if (position.status !== 'paused') {
      throw new Error(`Cannot resume position in ${position.status} status`);
    }

    // Check risk limits before resuming
    const riskCheck = await this.checkRiskLimits(positionId);
    if (!riskCheck.passed) {
      throw new Error(`Cannot resume: risk limits violated - ${riskCheck.violations.map(v => v.type).join(', ')}`);
    }

    const now = new Date();
    const updatedPosition: CopyTradingPosition = {
      ...position,
      status: 'active',
      updatedAt: now,
    };

    this.positions.set(positionId, updatedPosition);
    return updatedPosition;
  }

  async updateConfig(positionId: string, config: Partial<CopyConfig>): Promise<CopyTradingPosition> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    if (position.status === 'stopped') {
      throw new Error('Cannot update stopped position');
    }

    // Validate new capital allocation
    if (config.capitalAllocated !== undefined) {
      if (config.capitalAllocated < this.config.minCopyAmount) {
        throw new Error(`Minimum capital is ${this.config.minCopyAmount} TON`);
      }
      if (config.capitalAllocated > this.config.maxCopyAmount) {
        throw new Error(`Maximum capital is ${this.config.maxCopyAmount} TON`);
      }
    }

    // Validate copy ratio
    if (config.copyRatio !== undefined) {
      if (config.copyRatio <= 0 || config.copyRatio > 2) {
        throw new Error('Copy ratio must be between 0 and 2');
      }
    }

    const now = new Date();
    const updatedPosition: CopyTradingPosition = {
      ...position,
      config: {
        ...position.config,
        ...config,
      },
      updatedAt: now,
    };

    this.positions.set(positionId, updatedPosition);
    return updatedPosition;
  }

  async getPosition(positionId: string): Promise<CopyTradingPosition | null> {
    return this.positions.get(positionId) ?? null;
  }

  async getUserPositions(userId: string): Promise<CopyTradingPosition[]> {
    return Array.from(this.positions.values()).filter(p => p.userId === userId);
  }

  async getAgentFollowers(agentId: string): Promise<CopyTradingPosition[]> {
    return Array.from(this.positions.values()).filter(p => p.agentId === agentId);
  }

  async processTrade(agentTrade: AgentTrade): Promise<CopyTradeEvent[]> {
    const followers = await this.getAgentFollowers(agentTrade.agentId);
    const activeFollowers = followers.filter(p => p.status === 'active');
    const events: CopyTradeEvent[] = [];

    for (const position of activeFollowers) {
      const event = await this.executeCopyTrade(position, agentTrade);
      events.push(event);

      // Store event
      const positionEvents = this.tradeEvents.get(position.id) ?? [];
      positionEvents.push(event);
      this.tradeEvents.set(position.id, positionEvents);

      // Update performance
      await this.updatePositionPerformance(position.id, event);
    }

    return events;
  }

  async rebalance(positionId: string): Promise<CopyTradeEvent[]> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    if (position.status !== 'active') {
      throw new Error(`Cannot rebalance ${position.status} position`);
    }

    // Get agent's current positions
    const agent = this.agents.get(position.agentId);
    if (!agent) {
      // Agent not found - skip rebalance
      return [];
    }

    const events: CopyTradeEvent[] = [];
    const now = new Date();

    // Calculate target allocations based on agent's positions
    const agentPositions = agent.performance.currentPositions;
    const agentTotalValue = agentPositions.reduce((sum, p) => sum + (p.amount * p.currentPrice), 0);

    if (agentTotalValue === 0) {
      return events;
    }

    // Create rebalance event
    const event: CopyTradeEvent = {
      id: this.generateId('trade_event'),
      copyPositionId: positionId,
      agentTradeId: `rebalance_${now.getTime()}`,
      type: 'rebalance',
      details: {
        reason: 'Periodic rebalance to match agent allocation',
      },
      timestamp: now,
    };

    events.push(event);

    const positionEvents = this.tradeEvents.get(positionId) ?? [];
    positionEvents.push(event);
    this.tradeEvents.set(positionId, positionEvents);

    return events;
  }

  async exitAllPositions(positionId: string): Promise<CopyTradeEvent[]> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    const events: CopyTradeEvent[] = [];
    const now = new Date();

    // Create exit event
    const event: CopyTradeEvent = {
      id: this.generateId('trade_event'),
      copyPositionId: positionId,
      agentTradeId: `exit_all_${now.getTime()}`,
      type: 'exit',
      details: {
        reason: 'User requested exit of all positions',
      },
      timestamp: now,
    };

    events.push(event);

    // Update position
    const updatedPosition: CopyTradingPosition = {
      ...position,
      status: 'stopped',
      exitedAt: now,
      updatedAt: now,
    };

    this.positions.set(positionId, updatedPosition);

    const positionEvents = this.tradeEvents.get(positionId) ?? [];
    positionEvents.push(event);
    this.tradeEvents.set(positionId, positionEvents);

    return events;
  }

  async checkRiskLimits(positionId: string): Promise<RiskCheckResult> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    const { performance, riskControls, config } = position;

    // Calculate current drawdown
    const currentDrawdown = config.capitalAllocated > 0
      ? ((config.capitalAllocated - performance.currentValue) / config.capitalAllocated) * 100
      : 0;

    // Calculate daily P&L (simplified - in production would use actual daily data)
    const dailyPnl = performance.totalPnl;
    const dailyPnlPercent = config.capitalAllocated > 0
      ? (dailyPnl / config.capitalAllocated) * 100
      : 0;

    // Check max daily loss
    if (Math.abs(dailyPnl) > riskControls.maxDailyLoss && dailyPnl < 0) {
      violations.push({
        type: 'max_daily_loss',
        limit: riskControls.maxDailyLoss,
        current: Math.abs(dailyPnl),
        action: 'pause',
      });
    } else if (Math.abs(dailyPnlPercent) > riskControls.maxDailyLossPercent * 0.8 && dailyPnl < 0) {
      warnings.push({
        type: 'daily_loss_warning',
        message: 'Approaching daily loss limit',
        threshold: riskControls.maxDailyLossPercent,
        current: Math.abs(dailyPnlPercent),
      });
    }

    // Check max drawdown
    if (currentDrawdown > riskControls.maxDrawdown) {
      violations.push({
        type: 'max_drawdown',
        limit: riskControls.maxDrawdown,
        current: currentDrawdown,
        action: 'stop',
      });
    } else if (currentDrawdown > riskControls.maxDrawdown * 0.8) {
      warnings.push({
        type: 'drawdown_warning',
        message: 'Approaching maximum drawdown limit',
        threshold: riskControls.maxDrawdown,
        current: currentDrawdown,
      });
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      currentDrawdown,
      dailyPnl,
      dailyPnlPercent,
    };
  }

  async triggerStopLoss(positionId: string, reason: string): Promise<CopyTradingPosition> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    const now = new Date();

    // Exit all positions
    await this.exitAllPositions(positionId);

    const updatedPosition: CopyTradingPosition = {
      ...position,
      status: 'stopped',
      riskControls: {
        ...position.riskControls,
        stopLossTriggered: true,
      },
      updatedAt: now,
      exitedAt: now,
    };

    this.positions.set(positionId, updatedPosition);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'copy_stopped',
      severity: 'warning',
      source: 'copy_trading_engine',
      message: `Stop loss triggered for position ${positionId}: ${reason}`,
      data: { positionId, reason },
    });

    return updatedPosition;
  }

  async updatePerformance(positionId: string): Promise<CopyPerformance> {
    const position = await this.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    // In production, this would calculate based on actual on-chain positions
    // For now, return current performance
    return position.performance;
  }

  async getTradeHistory(positionId: string, limit?: number): Promise<CopyTradeEvent[]> {
    const events = this.tradeEvents.get(positionId) ?? [];
    const sorted = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateStartInput(input: StartCopyInput): void {
    if (!input.userId) {
      throw new Error('User ID is required');
    }

    if (!input.agentId) {
      throw new Error('Agent ID is required');
    }

    if (input.capitalAllocated < this.config.minCopyAmount) {
      throw new Error(`Minimum copy amount is ${this.config.minCopyAmount} TON`);
    }

    if (input.capitalAllocated > this.config.maxCopyAmount) {
      throw new Error(`Maximum copy amount is ${this.config.maxCopyAmount} TON`);
    }

    if (input.copyRatio !== undefined && (input.copyRatio <= 0 || input.copyRatio > 2)) {
      throw new Error('Copy ratio must be between 0 and 2');
    }
  }

  private async executeCopyTrade(
    position: CopyTradingPosition,
    agentTrade: AgentTrade
  ): Promise<CopyTradeEvent> {
    const now = new Date();
    const eventId = this.generateId('trade_event');

    // Check if trade should be skipped
    const skipReason = this.shouldSkipTrade(position, agentTrade);
    if (skipReason) {
      return {
        id: eventId,
        copyPositionId: position.id,
        agentTradeId: agentTrade.id,
        type: 'copy_skipped',
        details: {
          token: agentTrade.token,
          side: agentTrade.side,
          agentAmount: agentTrade.amount,
          reason: skipReason,
        },
        timestamp: now,
      };
    }

    // Calculate copy amount
    const copyAmount = this.calculateCopyAmount(position, agentTrade);

    // Check position size limits
    if (copyAmount > position.config.maxPositionSize) {
      return {
        id: eventId,
        copyPositionId: position.id,
        agentTradeId: agentTrade.id,
        type: 'copy_skipped',
        details: {
          token: agentTrade.token,
          side: agentTrade.side,
          agentAmount: agentTrade.amount,
          copyAmount: copyAmount,
          reason: 'Exceeds maximum position size',
        },
        timestamp: now,
      };
    }

    // Simulate trade execution with slippage
    const slippage = this.calculateSlippage(copyAmount, agentTrade.price);

    if (slippage > position.config.slippageProtection) {
      return {
        id: eventId,
        copyPositionId: position.id,
        agentTradeId: agentTrade.id,
        type: 'copy_failed',
        details: {
          token: agentTrade.token,
          side: agentTrade.side,
          agentAmount: agentTrade.amount,
          copyAmount: copyAmount,
          slippage: slippage,
          error: `Slippage ${slippage.toFixed(2)}% exceeds limit ${position.config.slippageProtection}%`,
        },
        timestamp: now,
      };
    }

    // Calculate execution price and fee
    const executionPrice = agentTrade.side === 'buy'
      ? agentTrade.price * (1 + slippage / 100)
      : agentTrade.price * (1 - slippage / 100);
    const fee = copyAmount * executionPrice * 0.001; // 0.1% fee

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'trade_copied',
      severity: 'info',
      source: 'copy_trading_engine',
      message: `Trade copied: ${agentTrade.side} ${copyAmount.toFixed(4)} ${agentTrade.token}`,
      data: {
        positionId: position.id,
        agentTradeId: agentTrade.id,
        token: agentTrade.token,
        side: agentTrade.side,
        amount: copyAmount,
        price: executionPrice,
        slippage,
        fee,
      },
    });

    return {
      id: eventId,
      copyPositionId: position.id,
      agentTradeId: agentTrade.id,
      type: 'copy_executed',
      details: {
        token: agentTrade.token,
        side: agentTrade.side,
        agentAmount: agentTrade.amount,
        copyAmount: copyAmount,
        price: executionPrice,
        slippage: slippage,
        fee: fee,
      },
      timestamp: now,
    };
  }

  private shouldSkipTrade(position: CopyTradingPosition, trade: AgentTrade): string | null {
    // Check excluded tokens
    if (position.config.excludeTokens?.includes(trade.token)) {
      return `Token ${trade.token} is excluded`;
    }

    // Check excluded protocols
    if (trade.protocol && position.config.excludeProtocols?.includes(trade.protocol)) {
      return `Protocol ${trade.protocol} is excluded`;
    }

    return null;
  }

  private calculateCopyAmount(position: CopyTradingPosition, agentTrade: AgentTrade): number {
    if (position.config.proportionalAllocation) {
      // Get agent's total capital (simplified - in production would fetch from agent)
      const agentCapital = 10000; // Placeholder
      const ratio = position.config.capitalAllocated / agentCapital;
      return agentTrade.amount * ratio * position.config.copyRatio;
    } else {
      return agentTrade.amount * position.config.copyRatio;
    }
  }

  private calculateSlippage(amount: number, _price: number): number {
    // Simplified slippage calculation based on trade size
    // In production, this would use actual liquidity data
    const baseSlippage = 0.1;
    const sizeImpact = Math.log10(amount + 1) * 0.05;
    return Math.min(baseSlippage + sizeImpact, 5);
  }

  private async updatePositionPerformance(positionId: string, event: CopyTradeEvent): Promise<void> {
    const position = await this.getPosition(positionId);
    if (!position) return;

    const performance = { ...position.performance };

    if (event.type === 'copy_executed') {
      performance.copiedTrades++;
      performance.successfulCopies++;
      performance.avgSlippage = (
        (performance.avgSlippage * (performance.copiedTrades - 1) + (event.details.slippage ?? 0)) /
        performance.copiedTrades
      );
      performance.feePaid += event.details.fee ?? 0;
    } else if (event.type === 'copy_failed') {
      performance.copiedTrades++;
      performance.failedCopies++;
    } else if (event.type === 'copy_skipped') {
      performance.skippedTrades++;
    }

    const updatedPosition: CopyTradingPosition = {
      ...position,
      performance,
      updatedAt: new Date(),
    };

    this.positions.set(positionId, updatedPosition);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: MarketplaceEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface CopyTradingEngineConfig {
  minCopyAmount: number;
  maxCopyAmount: number;
  defaultSlippageProtection: number;
  maxFollowersPerAgent: number;
  cooldownPeriodMinutes: number;
  defaultRebalanceThreshold: number;
  maxPositionsPerUser: number;
  defaultMaxDailyLossPercent: number;
  defaultMaxDrawdown: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCopyTradingEngine(
  config?: Partial<CopyTradingEngineConfig>
): DefaultCopyTradingEngine {
  return new DefaultCopyTradingEngine(config);
}
