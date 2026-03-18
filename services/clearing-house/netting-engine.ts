/**
 * TONAIAgent - AI Risk Netting Engine
 *
 * Aggregates exposures, calculates net obligations, detects concentration risk,
 * and performs cross-agent/fund/chain netting to minimize settlement requirements
 * and free up capital across the AI trading ecosystem.
 */

import {
  ClearingParticipantId,
  TradeId,
  ObligationId,
  RegisteredTrade,
  NetObligation,
  AssetObligation,
  NettingRun,
  ExposureMatrix,
  ExposureEntry,
  NettingStrategy,
  NettingEngineConfig,
  ObligationStatus,
  ClearingHouseEvent,
  ClearingHouseEventCallback,
} from './types';

// ============================================================================
// Netting Engine Interface
// ============================================================================

export interface NettingRunFilters {
  strategy?: NettingStrategy;
  fromDate?: Date;
  toDate?: Date;
}

export interface ObligationFilters {
  participantId?: ClearingParticipantId;
  status?: ObligationStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface ConcentrationRiskReport {
  assetId: string;
  assetName: string;
  herfindahlIndex: number; // 0-1
  topParticipants: ExposureEntry[];
  isConcentrated: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface NettingEngine {
  readonly config: NettingEngineConfig;

  // Netting Operations
  runBilateralNetting(trades: RegisteredTrade[]): NettingRun;
  runMultilateralNetting(trades: RegisteredTrade[]): NettingRun;
  runCrossAssetNetting(trades: RegisteredTrade[]): NettingRun;
  runFullNetting(trades: RegisteredTrade[]): NettingRun;

  // Obligation Management
  getObligation(obligationId: ObligationId): NetObligation | undefined;
  listObligations(filters?: ObligationFilters): NetObligation[];
  updateObligationStatus(obligationId: ObligationId, status: ObligationStatus): NetObligation;

  // Exposure Analysis
  buildExposureMatrix(trades: RegisteredTrade[]): ExposureMatrix[];
  getConcentrationRisk(trades: RegisteredTrade[]): ConcentrationRiskReport[];
  calculateNetPosition(participantId: ClearingParticipantId, assetId: string, trades: RegisteredTrade[]): number;

  // History
  listNettingRuns(filters?: NettingRunFilters): NettingRun[];
  getNettingRun(runId: string): NettingRun | undefined;

  // Events
  onEvent(callback: ClearingHouseEventCallback): void;
}

// ============================================================================
// Default Netting Engine Config
// ============================================================================

const DEFAULT_NETTING_CONFIG: NettingEngineConfig = {
  strategy: 'multilateral',
  minNettingThreshold: 1000,
  maxConcentrationRisk: 0.5,
  enableCrossAssetNetting: true,
  enableCrossCurrencyNetting: false,
  novationEnabled: true,
};

// ============================================================================
// Default Netting Engine Implementation
// ============================================================================

export class DefaultNettingEngine implements NettingEngine {
  readonly config: NettingEngineConfig;

  private readonly obligations: Map<ObligationId, NetObligation> = new Map();
  private readonly nettingRuns: Map<string, NettingRun> = new Map();
  private readonly eventCallbacks: ClearingHouseEventCallback[] = [];

  constructor(config?: Partial<NettingEngineConfig>) {
    this.config = { ...DEFAULT_NETTING_CONFIG, ...config };
  }

  // ============================================================================
  // Netting Operations
  // ============================================================================

  runBilateralNetting(trades: RegisteredTrade[]): NettingRun {
    // Group trades by participant pair
    const pairMap = new Map<string, RegisteredTrade[]>();

    for (const trade of trades) {
      if (trade.notionalValue < this.config.minNettingThreshold) continue;

      const pairKey = [trade.buyerParticipantId, trade.sellerParticipantId].sort().join(':');
      const existing = pairMap.get(pairKey) ?? [];
      existing.push(trade);
      pairMap.set(pairKey, existing);
    }

    const grossExposureBefore = trades.reduce((sum, t) => sum + t.notionalValue, 0);
    const createdObligations: ObligationId[] = [];
    let totalNetExposure = 0;

    for (const [, pairTrades] of pairMap.entries()) {
      // Net per asset within each pair
      const assetMap = new Map<string, { buy: number; sell: number; tradeIds: TradeId[] }>();

      for (const trade of pairTrades) {
        const entry = assetMap.get(trade.assetId) ?? { buy: 0, sell: 0, tradeIds: [] };
        entry.buy += trade.quantity * trade.price;
        entry.sell += trade.quantity * trade.price;
        entry.tradeIds.push(trade.id);
        assetMap.set(trade.assetId, entry);
      }

      for (const [assetId, { buy, sell, tradeIds }] of assetMap.entries()) {
        const netPayable = buy - sell;
        const netReceivable = sell - buy;
        const grossPayable = buy;

        const obligation = this.createObligation(
          pairTrades[0].buyerParticipantId,
          assetId,
          netPayable > 0 ? netPayable : 0,
          netPayable < 0 ? Math.abs(netPayable) : 0,
          grossPayable,
          grossPayable,
          [{ assetId, assetName: assetId, netQuantity: netPayable / (pairTrades[0].price || 1), grossQuantity: grossPayable / (pairTrades[0].price || 1), estimatedValue: Math.abs(netPayable), currency: pairTrades[0].currency }],
          tradeIds,
          pairTrades[0].settlementDate
        );

        createdObligations.push(obligation.id);
        totalNetExposure += Math.abs(netPayable);
      }
    }

    const run = this.recordNettingRun(
      'bilateral',
      trades.length,
      createdObligations.length,
      grossExposureBefore,
      totalNetExposure,
      createdObligations
    );

    return run;
  }

  runMultilateralNetting(trades: RegisteredTrade[]): NettingRun {
    // Group by asset, aggregate all positions
    const assetPositions = new Map<string, Map<ClearingParticipantId, number>>();

    for (const trade of trades) {
      if (trade.notionalValue < this.config.minNettingThreshold) continue;

      if (!assetPositions.has(trade.assetId)) {
        assetPositions.set(trade.assetId, new Map());
      }

      const positions = assetPositions.get(trade.assetId)!;

      // Buyer: positive position (receives asset)
      const buyerPos = positions.get(trade.buyerParticipantId) ?? 0;
      positions.set(trade.buyerParticipantId, buyerPos + trade.notionalValue);

      // Seller: negative position (delivers asset)
      const sellerPos = positions.get(trade.sellerParticipantId) ?? 0;
      positions.set(trade.sellerParticipantId, sellerPos - trade.notionalValue);
    }

    const grossExposureBefore = trades.reduce((sum, t) => sum + t.notionalValue, 0);
    const createdObligations: ObligationId[] = [];
    let totalNetExposure = 0;

    for (const [assetId, positions] of assetPositions.entries()) {
      const relatedTrades = trades.filter(t => t.assetId === assetId);

      for (const [participantId, netValue] of positions.entries()) {
        if (Math.abs(netValue) < this.config.minNettingThreshold) continue;

        const grossValue = relatedTrades
          .filter(t => t.buyerParticipantId === participantId || t.sellerParticipantId === participantId)
          .reduce((sum, t) => sum + t.notionalValue, 0);

        const nettingRatio = grossValue > 0 ? Math.abs(netValue) / grossValue : 0;
        const tradeIds = relatedTrades
          .filter(t => t.buyerParticipantId === participantId || t.sellerParticipantId === participantId)
          .map(t => t.id);

        const obligation = this.createObligation(
          participantId,
          assetId,
          netValue > 0 ? netValue : 0,
          netValue < 0 ? Math.abs(netValue) : 0,
          grossValue,
          grossValue,
          [{
            assetId,
            assetName: assetId,
            netQuantity: netValue / (relatedTrades[0]?.price || 1),
            grossQuantity: grossValue / (relatedTrades[0]?.price || 1),
            estimatedValue: Math.abs(netValue),
            currency: relatedTrades[0]?.currency ?? 'USD',
          }],
          tradeIds,
          relatedTrades[0]?.settlementDate ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        );

        createdObligations.push(obligation.id);
        totalNetExposure += Math.abs(netValue);

        // Suppress unused variable warning
        void nettingRatio;
      }
    }

    const run = this.recordNettingRun(
      'multilateral',
      trades.length,
      createdObligations.length,
      grossExposureBefore,
      totalNetExposure,
      createdObligations
    );

    return run;
  }

  runCrossAssetNetting(trades: RegisteredTrade[]): NettingRun {
    if (!this.config.enableCrossAssetNetting) {
      return this.runMultilateralNetting(trades);
    }

    // Group by participant, net across all assets (using USD value)
    const participantNetValues = new Map<ClearingParticipantId, number>();

    for (const trade of trades) {
      if (trade.notionalValue < this.config.minNettingThreshold) continue;

      const buyerVal = participantNetValues.get(trade.buyerParticipantId) ?? 0;
      participantNetValues.set(trade.buyerParticipantId, buyerVal + trade.notionalValue);

      const sellerVal = participantNetValues.get(trade.sellerParticipantId) ?? 0;
      participantNetValues.set(trade.sellerParticipantId, sellerVal - trade.notionalValue);
    }

    const grossExposureBefore = trades.reduce((sum, t) => sum + t.notionalValue, 0);
    const createdObligations: ObligationId[] = [];
    let totalNetExposure = 0;

    for (const [participantId, netValue] of participantNetValues.entries()) {
      if (Math.abs(netValue) < this.config.minNettingThreshold) continue;

      const relatedTrades = trades.filter(
        t => t.buyerParticipantId === participantId || t.sellerParticipantId === participantId
      );
      const grossValue = relatedTrades.reduce((sum, t) => sum + t.notionalValue, 0);

      // Build cross-asset obligations
      const assetObligations: AssetObligation[] = [];
      const assetMap = new Map<string, { net: number; gross: number; currency: string }>();

      for (const trade of relatedTrades) {
        const isBuyer = trade.buyerParticipantId === participantId;
        const entry = assetMap.get(trade.assetId) ?? { net: 0, gross: 0, currency: trade.currency };
        entry.net += isBuyer ? trade.notionalValue : -trade.notionalValue;
        entry.gross += trade.notionalValue;
        assetMap.set(trade.assetId, entry);
      }

      for (const [assetId, { net, gross, currency }] of assetMap.entries()) {
        assetObligations.push({
          assetId,
          assetName: assetId,
          netQuantity: net / (relatedTrades.find(t => t.assetId === assetId)?.price || 1),
          grossQuantity: gross / (relatedTrades.find(t => t.assetId === assetId)?.price || 1),
          estimatedValue: Math.abs(net),
          currency,
        });
      }

      const obligation = this.createObligation(
        participantId,
        'cross_asset',
        netValue > 0 ? netValue : 0,
        netValue < 0 ? Math.abs(netValue) : 0,
        grossValue,
        grossValue,
        assetObligations,
        relatedTrades.map(t => t.id),
        relatedTrades[0]?.settlementDate ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      );

      createdObligations.push(obligation.id);
      totalNetExposure += Math.abs(netValue);
    }

    const run = this.recordNettingRun(
      'cross_asset',
      trades.length,
      createdObligations.length,
      grossExposureBefore,
      totalNetExposure,
      createdObligations
    );

    return run;
  }

  runFullNetting(trades: RegisteredTrade[]): NettingRun {
    // Run the configured strategy
    switch (this.config.strategy) {
      case 'bilateral':
        return this.runBilateralNetting(trades);
      case 'multilateral':
        return this.runMultilateralNetting(trades);
      case 'cross_asset':
        return this.runCrossAssetNetting(trades);
      default:
        return this.runMultilateralNetting(trades);
    }
  }

  // ============================================================================
  // Obligation Management
  // ============================================================================

  getObligation(obligationId: ObligationId): NetObligation | undefined {
    return this.obligations.get(obligationId);
  }

  listObligations(filters?: ObligationFilters): NetObligation[] {
    let list = Array.from(this.obligations.values());

    if (filters) {
      if (filters.participantId) {
        list = list.filter(o => o.participantId === filters.participantId);
      }
      if (filters.status) {
        list = list.filter(o => o.status === filters.status);
      }
      if (filters.fromDate) {
        list = list.filter(o => o.createdAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        list = list.filter(o => o.createdAt <= filters.toDate!);
      }
    }

    return list;
  }

  updateObligationStatus(obligationId: ObligationId, status: ObligationStatus): NetObligation {
    const obligation = this.obligations.get(obligationId);
    if (!obligation) {
      throw new Error(`Obligation not found: ${obligationId}`);
    }

    obligation.status = status;
    obligation.updatedAt = new Date();
    this.obligations.set(obligationId, obligation);

    const severity = status === 'defaulted' ? 'error' : 'info';
    this.emitEvent(severity, 'netting_engine', `Obligation status updated to ${status}`, {
      obligationId,
      participantId: obligation.participantId,
      status,
    });

    return obligation;
  }

  // ============================================================================
  // Exposure Analysis
  // ============================================================================

  buildExposureMatrix(trades: RegisteredTrade[]): ExposureMatrix[] {
    const assetMap = new Map<string, { long: Map<ClearingParticipantId, number>; short: Map<ClearingParticipantId, number> }>();

    for (const trade of trades) {
      if (!assetMap.has(trade.assetId)) {
        assetMap.set(trade.assetId, { long: new Map(), short: new Map() });
      }

      const positions = assetMap.get(trade.assetId)!;

      // Buyer is long
      const longPos = positions.long.get(trade.buyerParticipantId) ?? 0;
      positions.long.set(trade.buyerParticipantId, longPos + trade.notionalValue);

      // Seller is short
      const shortPos = positions.short.get(trade.sellerParticipantId) ?? 0;
      positions.short.set(trade.sellerParticipantId, shortPos + trade.notionalValue);
    }

    const matrices: ExposureMatrix[] = [];

    for (const [assetId, { long, short }] of assetMap.entries()) {
      const grossLong = Array.from(long.values()).reduce((a, b) => a + b, 0);
      const grossShort = Array.from(short.values()).reduce((a, b) => a + b, 0);
      const total = grossLong + grossShort;

      const longEntries: ExposureEntry[] = Array.from(long.entries()).map(([id, exp]) => ({
        participantId: id,
        participantName: id,
        exposure: exp,
        percentOfTotal: total > 0 ? exp / total : 0,
      }));

      const shortEntries: ExposureEntry[] = Array.from(short.entries()).map(([id, exp]) => ({
        participantId: id,
        participantName: id,
        exposure: exp,
        percentOfTotal: total > 0 ? exp / total : 0,
      }));

      // Herfindahl-Hirschman Index for concentration
      const allShares = [...longEntries, ...shortEntries].map(e => e.percentOfTotal);
      const hhi = allShares.reduce((sum, s) => sum + s * s, 0);

      matrices.push({
        assetId,
        longParticipants: longEntries.sort((a, b) => b.exposure - a.exposure),
        shortParticipants: shortEntries.sort((a, b) => b.exposure - a.exposure),
        grossLongExposure: grossLong,
        grossShortExposure: grossShort,
        netExposure: grossLong - grossShort,
        concentrationRisk: hhi,
      });
    }

    return matrices;
  }

  getConcentrationRisk(trades: RegisteredTrade[]): ConcentrationRiskReport[] {
    const matrices = this.buildExposureMatrix(trades);

    return matrices.map(matrix => {
      const topParticipants = [
        ...matrix.longParticipants.slice(0, 3),
        ...matrix.shortParticipants.slice(0, 3),
      ].sort((a, b) => b.exposure - a.exposure);

      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (matrix.concentrationRisk < 0.15) {
        riskLevel = 'low';
      } else if (matrix.concentrationRisk < 0.25) {
        riskLevel = 'medium';
      } else if (matrix.concentrationRisk < 0.4) {
        riskLevel = 'high';
      } else {
        riskLevel = 'critical';
      }

      return {
        assetId: matrix.assetId,
        assetName: matrix.assetId,
        herfindahlIndex: matrix.concentrationRisk,
        topParticipants,
        isConcentrated: matrix.concentrationRisk > this.config.maxConcentrationRisk,
        riskLevel,
      };
    });
  }

  calculateNetPosition(
    participantId: ClearingParticipantId,
    assetId: string,
    trades: RegisteredTrade[]
  ): number {
    let net = 0;
    for (const trade of trades) {
      if (trade.assetId !== assetId) continue;
      if (trade.buyerParticipantId === participantId) {
        net += trade.notionalValue;
      } else if (trade.sellerParticipantId === participantId) {
        net -= trade.notionalValue;
      }
    }
    return net;
  }

  // ============================================================================
  // History
  // ============================================================================

  listNettingRuns(filters?: NettingRunFilters): NettingRun[] {
    let list = Array.from(this.nettingRuns.values());

    if (filters) {
      if (filters.strategy) {
        list = list.filter(r => r.strategy === filters.strategy);
      }
      if (filters.fromDate) {
        list = list.filter(r => r.executedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        list = list.filter(r => r.executedAt <= filters.toDate!);
      }
    }

    return list.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }

  getNettingRun(runId: string): NettingRun | undefined {
    return this.nettingRuns.get(runId);
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

  private createObligation(
    participantId: ClearingParticipantId,
    assetId: string,
    netPayable: number,
    netReceivable: number,
    grossPayable: number,
    grossReceivable: number,
    assetObligations: AssetObligation[],
    tradeIds: TradeId[],
    settlementDate: Date
  ): NetObligation {
    const nettingRatio = grossPayable > 0 ? netPayable / grossPayable : 0;

    const obligation: NetObligation = {
      id: `oblig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participantId,
      netPayable,
      netReceivable,
      grossPayable,
      grossReceivable,
      nettingRatio,
      assetObligations,
      status: 'pending',
      novatedFrom: tradeIds,
      settlementDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.obligations.set(obligation.id, obligation);

    this.emitEvent('info', 'netting_engine', 'Obligation created via netting', {
      obligationId: obligation.id,
      participantId,
      assetId,
      netPayable,
      netReceivable,
      nettingRatio,
      tradesConsolidated: tradeIds.length,
    });

    return obligation;
  }

  private recordNettingRun(
    strategy: NettingStrategy,
    tradesNetted: number,
    obligationsCreated: number,
    grossExposureBefore: number,
    netExposureAfter: number,
    obligationIds: ObligationId[]
  ): NettingRun {
    const capitalFreed = grossExposureBefore - netExposureAfter;
    const compressionRatio = grossExposureBefore > 0 ? netExposureAfter / grossExposureBefore : 1;
    const efficiencyGain =
      grossExposureBefore > 0
        ? ((grossExposureBefore - netExposureAfter) / grossExposureBefore) * 100
        : 0;

    const run: NettingRun = {
      id: `netrun_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      strategy,
      participantCount: obligationsCreated,
      tradesNetted,
      grossExposureBefore,
      netExposureAfter,
      capitalFreed,
      compressionRatio,
      efficiencyGain,
      obligationsCreated: obligationIds,
      executedAt: new Date(),
    };

    this.nettingRuns.set(run.id, run);

    this.emitEvent('info', 'netting_engine', `${strategy} netting completed`, {
      runId: run.id,
      tradesNetted,
      capitalFreed,
      efficiencyGain: `${efficiencyGain.toFixed(2)}%`,
      compressionRatio: `${(compressionRatio * 100).toFixed(2)}%`,
    });

    return run;
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: ClearingHouseEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'netting_executed',
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

export function createNettingEngine(config?: Partial<NettingEngineConfig>): DefaultNettingEngine {
  return new DefaultNettingEngine(config);
}
