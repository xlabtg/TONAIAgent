/**
 * TONAIAgent - Central Clearing Smart Contract Layer
 *
 * Core clearing infrastructure for trade registration, obligation matching,
 * settlement tracking, and default management. Acts as the Central Counterparty
 * Clearing (CCP) layer that guarantees settlement between AI agents and funds.
 */

import {
  ClearingParticipant,
  ClearingParticipantId,
  ParticipantType,
  RiskTier,
  RegisteredTrade,
  TradeId,
  ClearingTradeStatus,
  ObligationId,
  SettlementMechanism,
  ParticipantMarginAccount,
  DefaultStatus,
  ClearingHouseEvent,
  ClearingHouseEventCallback,
  ClearingHouseEventType,
} from './types';

// ============================================================================
// Central Clearing Manager Interface
// ============================================================================

export interface RegisterParticipantParams {
  name: string;
  type: ParticipantType;
  tier?: RiskTier;
  creditLimit?: number;
  metadata?: Record<string, unknown>;
}

export interface RegisterTradeParams {
  buyerParticipantId: ClearingParticipantId;
  sellerParticipantId: ClearingParticipantId;
  assetId: string;
  assetName: string;
  assetClass: string;
  quantity: number;
  price: number;
  currency?: string;
  settlementDate?: Date;
  settlementMechanism?: SettlementMechanism;
  chainId?: string;
  metadata?: Record<string, unknown>;
}

export interface TradeFilters {
  buyerParticipantId?: ClearingParticipantId;
  sellerParticipantId?: ClearingParticipantId;
  assetId?: string;
  status?: ClearingTradeStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface ParticipantFilters {
  type?: ParticipantType;
  tier?: RiskTier;
  isActive?: boolean;
  defaultStatus?: DefaultStatus;
}

export interface ClearingSystemStatus {
  totalParticipants: number;
  activeParticipants: number;
  registeredTrades: number;
  openTrades: number;
  settledTrades: number;
  failedTrades: number;
  totalNotionalValue: number;
  generatedAt: Date;
}

export interface CentralClearingManager {
  // Participant Management
  registerParticipant(params: RegisterParticipantParams): ClearingParticipant;
  getParticipant(participantId: ClearingParticipantId): ClearingParticipant | undefined;
  listParticipants(filters?: ParticipantFilters): ClearingParticipant[];
  updateParticipantStatus(participantId: ClearingParticipantId, isActive: boolean): ClearingParticipant;
  updateParticipantRisk(participantId: ClearingParticipantId, riskScore: number, tier?: RiskTier): ClearingParticipant;
  getParticipantMarginAccount(participantId: ClearingParticipantId): ParticipantMarginAccount | undefined;

  // Trade Registration & Matching
  registerTrade(params: RegisterTradeParams): RegisteredTrade;
  getTrade(tradeId: TradeId): RegisteredTrade | undefined;
  listTrades(filters?: TradeFilters): RegisteredTrade[];
  matchTrade(tradeId: TradeId, matchedTradeId: TradeId): RegisteredTrade;
  updateTradeStatus(tradeId: TradeId, status: ClearingTradeStatus, obligationId?: ObligationId): RegisteredTrade;
  cancelTrade(tradeId: TradeId, reason: string): RegisteredTrade;

  // Obligation Tracking
  setTradeObligation(tradeId: TradeId, obligationId: ObligationId): RegisteredTrade;
  getTradesForObligation(obligationId: ObligationId): RegisteredTrade[];

  // System Status
  getSystemStatus(): ClearingSystemStatus;

  // Events
  onEvent(callback: ClearingHouseEventCallback): void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CREDIT_LIMITS: Record<ParticipantType, number> = {
  ai_fund: 100_000_000,
  ai_agent: 10_000_000,
  prime_broker: 500_000_000,
  liquidity_provider: 250_000_000,
  institutional_client: 200_000_000,
  market_maker: 150_000_000,
};

const DEFAULT_RISK_TIERS: Record<ParticipantType, RiskTier> = {
  ai_fund: 'medium',
  ai_agent: 'high',
  prime_broker: 'low',
  liquidity_provider: 'low',
  institutional_client: 'medium',
  market_maker: 'low',
};

// ============================================================================
// Default Central Clearing Manager Implementation
// ============================================================================

export class DefaultCentralClearingManager implements CentralClearingManager {
  private readonly participants: Map<ClearingParticipantId, ClearingParticipant> = new Map();
  private readonly trades: Map<TradeId, RegisteredTrade> = new Map();
  private readonly obligationTradeMap: Map<ObligationId, TradeId[]> = new Map();
  private readonly eventCallbacks: ClearingHouseEventCallback[] = [];

  // ============================================================================
  // Participant Management
  // ============================================================================

  registerParticipant(params: RegisterParticipantParams): ClearingParticipant {
    const id: ClearingParticipantId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tier = params.tier ?? DEFAULT_RISK_TIERS[params.type];
    const creditLimit = params.creditLimit ?? DEFAULT_CREDIT_LIMITS[params.type];

    const marginAccount: ParticipantMarginAccount = {
      participantId: id,
      initialMarginRequired: 0,
      maintenanceMarginRequired: 0,
      initialMarginPosted: 0,
      variationMargin: 0,
      excessMargin: 0,
      marginCallAmount: 0,
      hasMarginCall: false,
      lastUpdated: new Date(),
    };

    const participant: ClearingParticipant = {
      id,
      name: params.name,
      type: params.type,
      tier,
      registeredAt: new Date(),
      isActive: true,
      capitalBalance: 0,
      marginAccount,
      collateralPledged: 0,
      openObligations: 0,
      defaultStatus: 'none',
      creditLimit,
      utilizationRate: 0,
      riskScore: this.computeInitialRiskScore(params.type, tier),
      metadata: params.metadata ?? {},
    };

    this.participants.set(id, participant);

    this.emitEvent('info', 'central_clearing', 'Participant registered', {
      participantId: id,
      name: params.name,
      type: params.type,
      tier,
    });

    return participant;
  }

  getParticipant(participantId: ClearingParticipantId): ClearingParticipant | undefined {
    return this.participants.get(participantId);
  }

  listParticipants(filters?: ParticipantFilters): ClearingParticipant[] {
    let list = Array.from(this.participants.values());

    if (filters) {
      if (filters.type !== undefined) {
        list = list.filter(p => p.type === filters.type);
      }
      if (filters.tier !== undefined) {
        list = list.filter(p => p.tier === filters.tier);
      }
      if (filters.isActive !== undefined) {
        list = list.filter(p => p.isActive === filters.isActive);
      }
      if (filters.defaultStatus !== undefined) {
        list = list.filter(p => p.defaultStatus === filters.defaultStatus);
      }
    }

    return list;
  }

  updateParticipantStatus(
    participantId: ClearingParticipantId,
    isActive: boolean
  ): ClearingParticipant {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    participant.isActive = isActive;
    this.participants.set(participantId, participant);

    this.emitEvent('info', 'central_clearing', `Participant ${isActive ? 'activated' : 'deactivated'}`, {
      participantId,
      isActive,
    });

    return participant;
  }

  updateParticipantRisk(
    participantId: ClearingParticipantId,
    riskScore: number,
    tier?: RiskTier
  ): ClearingParticipant {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const previousRiskScore = participant.riskScore;
    participant.riskScore = Math.max(0, Math.min(100, riskScore));
    if (tier) {
      participant.tier = tier;
    }

    this.participants.set(participantId, participant);

    const severity = riskScore > 80 ? 'warning' : 'info';
    this.emitEvent(severity, 'central_clearing', 'Participant risk updated', {
      participantId,
      previousRiskScore,
      newRiskScore: riskScore,
      tier: participant.tier,
    });

    return participant;
  }

  getParticipantMarginAccount(participantId: ClearingParticipantId): ParticipantMarginAccount | undefined {
    return this.participants.get(participantId)?.marginAccount;
  }

  // ============================================================================
  // Trade Registration & Matching
  // ============================================================================

  registerTrade(params: RegisterTradeParams): RegisteredTrade {
    const buyer = this.participants.get(params.buyerParticipantId);
    if (!buyer) {
      throw new Error(`Buyer participant not found: ${params.buyerParticipantId}`);
    }
    if (!buyer.isActive) {
      throw new Error(`Buyer participant is not active: ${params.buyerParticipantId}`);
    }

    const seller = this.participants.get(params.sellerParticipantId);
    if (!seller) {
      throw new Error(`Seller participant not found: ${params.sellerParticipantId}`);
    }
    if (!seller.isActive) {
      throw new Error(`Seller participant is not active: ${params.sellerParticipantId}`);
    }

    const notionalValue = params.quantity * params.price;
    const tradeDate = new Date();
    const settlementDate = params.settlementDate ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // T+2

    const trade: RegisteredTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      buyerParticipantId: params.buyerParticipantId,
      sellerParticipantId: params.sellerParticipantId,
      assetId: params.assetId,
      assetName: params.assetName,
      assetClass: params.assetClass,
      quantity: params.quantity,
      price: params.price,
      notionalValue,
      currency: params.currency ?? 'USD',
      tradeDate,
      settlementDate,
      status: 'registered',
      settlementMechanism: params.settlementMechanism ?? 'dvp',
      chainId: params.chainId,
      metadata: params.metadata ?? {},
      registeredAt: new Date(),
      updatedAt: new Date(),
    };

    this.trades.set(trade.id, trade);

    // Update utilization rates for both participants
    this.updateParticipantUtilization(params.buyerParticipantId);
    this.updateParticipantUtilization(params.sellerParticipantId);

    this.emitEvent('info', 'central_clearing', 'Trade registered', {
      tradeId: trade.id,
      buyerParticipantId: params.buyerParticipantId,
      sellerParticipantId: params.sellerParticipantId,
      assetId: params.assetId,
      notionalValue,
    });

    return trade;
  }

  getTrade(tradeId: TradeId): RegisteredTrade | undefined {
    return this.trades.get(tradeId);
  }

  listTrades(filters?: TradeFilters): RegisteredTrade[] {
    let list = Array.from(this.trades.values());

    if (filters) {
      if (filters.buyerParticipantId) {
        list = list.filter(t => t.buyerParticipantId === filters.buyerParticipantId);
      }
      if (filters.sellerParticipantId) {
        list = list.filter(t => t.sellerParticipantId === filters.sellerParticipantId);
      }
      if (filters.assetId) {
        list = list.filter(t => t.assetId === filters.assetId);
      }
      if (filters.status) {
        list = list.filter(t => t.status === filters.status);
      }
      if (filters.fromDate) {
        list = list.filter(t => t.tradeDate >= filters.fromDate!);
      }
      if (filters.toDate) {
        list = list.filter(t => t.tradeDate <= filters.toDate!);
      }
    }

    return list;
  }

  matchTrade(tradeId: TradeId, matchedTradeId: TradeId): RegisteredTrade {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      throw new Error(`Trade not found: ${tradeId}`);
    }

    const matchedTrade = this.trades.get(matchedTradeId);
    if (!matchedTrade) {
      throw new Error(`Matched trade not found: ${matchedTradeId}`);
    }

    // Verify the trades are opposing (buyer/seller match)
    if (
      trade.assetId !== matchedTrade.assetId ||
      trade.buyerParticipantId !== matchedTrade.sellerParticipantId ||
      trade.sellerParticipantId !== matchedTrade.buyerParticipantId
    ) {
      throw new Error('Trades do not form a valid match');
    }

    trade.status = 'matched';
    trade.updatedAt = new Date();
    matchedTrade.status = 'matched';
    matchedTrade.updatedAt = new Date();

    this.trades.set(tradeId, trade);
    this.trades.set(matchedTradeId, matchedTrade);

    this.emitEvent('info', 'central_clearing', 'Trades matched', {
      tradeId,
      matchedTradeId,
    });

    return trade;
  }

  updateTradeStatus(
    tradeId: TradeId,
    status: ClearingTradeStatus,
    obligationId?: ObligationId
  ): RegisteredTrade {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      throw new Error(`Trade not found: ${tradeId}`);
    }

    trade.status = status;
    trade.updatedAt = new Date();
    if (obligationId) {
      trade.obligationId = obligationId;
    }

    this.trades.set(tradeId, trade);

    const severity = status === 'failed' || status === 'defaulted' ? 'error' : 'info';
    const eventType: ClearingHouseEventType =
      status === 'settled'
        ? 'settlement_completed'
        : status === 'failed'
          ? 'settlement_failed'
          : 'trade_registered';

    this.emitEvent(severity, 'central_clearing', `Trade status updated to ${status}`, {
      tradeId,
      status,
      obligationId,
      eventType,
    });

    return trade;
  }

  cancelTrade(tradeId: TradeId, reason: string): RegisteredTrade {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      throw new Error(`Trade not found: ${tradeId}`);
    }

    if (trade.status === 'settled') {
      throw new Error(`Cannot cancel a settled trade: ${tradeId}`);
    }

    trade.status = 'cancelled';
    trade.updatedAt = new Date();
    trade.metadata = { ...trade.metadata, cancellationReason: reason };

    this.trades.set(tradeId, trade);

    // Update utilization rates
    this.updateParticipantUtilization(trade.buyerParticipantId);
    this.updateParticipantUtilization(trade.sellerParticipantId);

    this.emitEvent('info', 'central_clearing', 'Trade cancelled', {
      tradeId,
      reason,
    });

    return trade;
  }

  // ============================================================================
  // Obligation Tracking
  // ============================================================================

  setTradeObligation(tradeId: TradeId, obligationId: ObligationId): RegisteredTrade {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      throw new Error(`Trade not found: ${tradeId}`);
    }

    trade.obligationId = obligationId;
    trade.status = 'obligation_set';
    trade.updatedAt = new Date();
    this.trades.set(tradeId, trade);

    // Track obligation -> trade mapping
    const existing = this.obligationTradeMap.get(obligationId) ?? [];
    if (!existing.includes(tradeId)) {
      existing.push(tradeId);
    }
    this.obligationTradeMap.set(obligationId, existing);

    return trade;
  }

  getTradesForObligation(obligationId: ObligationId): RegisteredTrade[] {
    const tradeIds = this.obligationTradeMap.get(obligationId) ?? [];
    return tradeIds
      .map(id => this.trades.get(id))
      .filter((t): t is RegisteredTrade => t !== undefined);
  }

  // ============================================================================
  // System Status
  // ============================================================================

  getSystemStatus(): ClearingSystemStatus {
    const participants = Array.from(this.participants.values());
    const trades = Array.from(this.trades.values());
    const openStatuses: ClearingTradeStatus[] = ['registered', 'matched', 'netting_eligible', 'obligation_set', 'settlement_pending', 'settling'];

    return {
      totalParticipants: participants.length,
      activeParticipants: participants.filter(p => p.isActive).length,
      registeredTrades: trades.length,
      openTrades: trades.filter(t => openStatuses.includes(t.status)).length,
      settledTrades: trades.filter(t => t.status === 'settled').length,
      failedTrades: trades.filter(t => t.status === 'failed' || t.status === 'defaulted').length,
      totalNotionalValue: trades.reduce((sum, t) => sum + t.notionalValue, 0),
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: ClearingHouseEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private computeInitialRiskScore(type: ParticipantType, tier: RiskTier): number {
    const tierScores: Record<RiskTier, number> = {
      low: 20,
      medium: 40,
      high: 65,
      critical: 85,
    };
    return tierScores[tier] ?? 50;
  }

  private updateParticipantUtilization(participantId: ClearingParticipantId): void {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const openTrades = Array.from(this.trades.values()).filter(
      t =>
        (t.buyerParticipantId === participantId || t.sellerParticipantId === participantId) &&
        t.status !== 'settled' &&
        t.status !== 'cancelled' &&
        t.status !== 'failed'
    );

    const totalExposure = openTrades.reduce((sum, t) => sum + t.notionalValue, 0);
    participant.utilizationRate =
      participant.creditLimit > 0 ? totalExposure / participant.creditLimit : 0;

    this.participants.set(participantId, participant);
  }

  protected emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: ClearingHouseEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: (data.eventType as ClearingHouseEventType) ?? 'trade_registered',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

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
// Factory Function
// ============================================================================

export function createCentralClearingManager(): DefaultCentralClearingManager {
  return new DefaultCentralClearingManager();
}
