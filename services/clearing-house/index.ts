/**
 * TONAIAgent - AI-native Clearing House
 *
 * Comprehensive AI-native Clearing House infrastructure for autonomous AI funds
 * and agents on The Open Network (TON). Provides institutional-grade clearing and
 * settlement services including:
 *
 * - Central Clearing Smart Contract Layer: trade registration, obligation matching,
 *   settlement tracking, default management
 * - AI Risk Netting Engine: exposure aggregation, net obligation calculation,
 *   concentration risk detection, cross-agent/fund/chain netting
 * - Collateral Management System: initial/maintenance margin, dynamic margin models,
 *   volatility-adjusted requirements, real-time liquidation prevention
 * - Default Resolution Framework: automatic liquidation, insurance pool activation,
 *   socialized loss mechanism, risk containment
 * - Real-Time Settlement Layer: near-instant settlement, atomic settlement,
 *   cross-chain bridge settlement, RWA settlement mapping
 * - Clearing Audit & Transparency: immutable audit logs, institutional reporting,
 *   exposure dashboards, compliance-ready reports, systemic risk monitoring
 *
 * Architecture:
 * Agents / Funds → Prime Brokerage → Liquidity Network → Clearing House → Settlement Finality
 *
 * @example
 * ```typescript
 * import { createClearingHouseManager } from '@tonaiagent/core/clearing-house';
 *
 * // Initialize the clearing house
 * const ch = createClearingHouseManager();
 *
 * // Register participants
 * const fund1 = ch.clearing.registerParticipant({ name: 'Alpha AI Fund', type: 'ai_fund' });
 * const fund2 = ch.clearing.registerParticipant({ name: 'Beta AI Fund', type: 'ai_fund' });
 *
 * // Register trades
 * const trade = ch.clearing.registerTrade({
 *   buyerParticipantId: fund1.id,
 *   sellerParticipantId: fund2.id,
 *   assetId: 'TON',
 *   assetName: 'TON',
 *   assetClass: 'crypto',
 *   quantity: 1000,
 *   price: 5.0,
 * });
 *
 * // Post collateral
 * ch.collateral.postCollateral({
 *   participantId: fund1.id,
 *   assetId: 'USDT',
 *   assetName: 'Tether USD',
 *   collateralType: 'stablecoin',
 *   quantity: 10000,
 *   marketValue: 10000,
 *   heldFor: 'initial_margin',
 * });
 *
 * // Run netting
 * const trades = ch.clearing.listTrades();
 * const nettingRun = ch.netting.runMultilateralNetting(trades);
 * console.log('Capital freed:', nettingRun.capitalFreed);
 *
 * // Execute settlement
 * const obligation = ch.netting.listObligations()[0];
 * if (obligation) {
 *   const settlement = ch.settlement.createSettlement({
 *     obligationId: obligation.id,
 *     payerParticipantId: fund1.id,
 *     receiverParticipantId: fund2.id,
 *     assetId: 'TON',
 *     amount: obligation.netPayable,
 *   });
 *   ch.settlement.executeSettlement(settlement.id);
 * }
 *
 * // Get system status
 * const status = ch.getSystemStatus();
 * console.log('Clearing House Status:', status);
 * ```
 */

// Export all types
export * from './types';

// Export Central Clearing Layer
export {
  DefaultCentralClearingManager,
  createCentralClearingManager,
  type CentralClearingManager,
  type RegisterParticipantParams,
  type RegisterTradeParams,
  type TradeFilters,
  type ParticipantFilters,
  type ClearingSystemStatus,
} from './central-clearing';

// Export Netting Engine
export {
  DefaultNettingEngine,
  createNettingEngine,
  type NettingEngine,
  type NettingRunFilters,
  type ObligationFilters,
  type ConcentrationRiskReport,
} from './netting-engine';

// Export Collateral Management
export {
  DefaultCollateralManager,
  createCollateralManager,
  type CollateralManager,
  type PostCollateralParams,
  type CollateralFilters,
  type MarginCallResult,
  type CollateralHealthReport,
  type CollateralManagementSystemStatus,
} from './collateral-management';

// Export Default Resolution Framework
export {
  DefaultDefaultResolutionManager,
  createDefaultResolutionManager,
  type DefaultResolutionManager,
  type DeclareDefaultParams,
  type DefaultEventFilters,
  type InsuranceClaimFilters,
  type LiquidationResult,
  type DefaultFundActivationResult,
  type SocializedLossResult,
  type FileInsuranceClaimParams,
} from './default-resolution';

// Export Settlement Layer
export {
  DefaultSettlementLayer,
  createSettlementLayer,
  type SettlementLayer,
  type CreateSettlementParams,
  type SettlementFilters,
  type AtomicSettlementParams,
  type AtomicSettlementLeg,
  type CrossChainSettlementParams,
  type RWASettlementParams,
  type SettlementMetrics,
} from './settlement';

// Export Audit Module
export {
  DefaultClearingAuditModule,
  createClearingAuditModule,
  type ClearingAuditModule,
  type CreateAuditEntryParams,
  type AuditFilters,
  type ReportPeriod,
  type RiskSnapshotParams,
  type ExposureDashboardParams,
} from './audit';

// ============================================================================
// Unified Clearing House Manager
// ============================================================================

import { DefaultCentralClearingManager, createCentralClearingManager } from './central-clearing';
import { DefaultNettingEngine, createNettingEngine } from './netting-engine';
import { DefaultCollateralManager, createCollateralManager } from './collateral-management';
import { DefaultDefaultResolutionManager, createDefaultResolutionManager } from './default-resolution';
import { DefaultSettlementLayer, createSettlementLayer } from './settlement';
import { DefaultClearingAuditModule, createClearingAuditModule } from './audit';
import {
  ClearingHouseConfig,
  ClearingHouseEvent,
  ClearingHouseEventCallback,
} from './types';

export interface ClearingHouseSystemStatus {
  participants: number;
  activeParticipants: number;
  registeredTrades: number;
  openTrades: number;
  settledTrades: number;
  failedTrades: number;
  totalNotionalValue: number;
  pendingObligations: number;
  settledObligations: number;
  collateralPosted: number;
  marginCallsActive: number;
  pendingSettlements: number;
  completedSettlements: number;
  defaultFundSize: number;
  insurancePoolSize: number;
  defaultEventsTotal: number;
  auditEntriesTotal: number;
  systemicRiskScore: number;
  generatedAt: Date;
}

export interface ClearingHouseManager {
  readonly clearing: DefaultCentralClearingManager;
  readonly netting: DefaultNettingEngine;
  readonly collateral: DefaultCollateralManager;
  readonly defaultResolution: DefaultDefaultResolutionManager;
  readonly settlement: DefaultSettlementLayer;
  readonly audit: DefaultClearingAuditModule;

  onEvent(callback: ClearingHouseEventCallback): void;
  getSystemStatus(): ClearingHouseSystemStatus;
}

export class DefaultClearingHouseManager implements ClearingHouseManager {
  readonly clearing: DefaultCentralClearingManager;
  readonly netting: DefaultNettingEngine;
  readonly collateral: DefaultCollateralManager;
  readonly defaultResolution: DefaultDefaultResolutionManager;
  readonly settlement: DefaultSettlementLayer;
  readonly audit: DefaultClearingAuditModule;

  private readonly eventCallbacks: ClearingHouseEventCallback[] = [];

  constructor(config?: ClearingHouseConfig) {
    this.clearing = createCentralClearingManager();
    this.netting = createNettingEngine(config?.netting);
    this.collateral = createCollateralManager(config?.collateral);
    this.defaultResolution = createDefaultResolutionManager(config?.defaultResolution);
    this.settlement = createSettlementLayer(config?.settlement);
    this.audit = createClearingAuditModule(config?.audit);

    this.setupEventForwarding();
  }

  onEvent(callback: ClearingHouseEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): ClearingHouseSystemStatus {
    const clearingStatus = this.clearing.getSystemStatus();
    const collateralStatus = this.collateral.getSystemStatus();
    const settlementMetrics = this.settlement.getSettlementMetrics();
    const defaultFund = this.defaultResolution.getDefaultFund();
    const insurancePool = this.defaultResolution.getInsurancePool();
    const obligations = this.netting.listObligations();
    const defaultEvents = this.defaultResolution.listDefaultEvents();
    const auditEntries = this.audit.listAuditEntries();

    const latestRiskSnapshots = this.audit.listSystemicRiskSnapshots();
    const latestRisk = latestRiskSnapshots[latestRiskSnapshots.length - 1];

    return {
      participants: clearingStatus.totalParticipants,
      activeParticipants: clearingStatus.activeParticipants,
      registeredTrades: clearingStatus.registeredTrades,
      openTrades: clearingStatus.openTrades,
      settledTrades: clearingStatus.settledTrades,
      failedTrades: clearingStatus.failedTrades,
      totalNotionalValue: clearingStatus.totalNotionalValue,
      pendingObligations: obligations.filter(o => o.status === 'pending').length,
      settledObligations: obligations.filter(o => o.status === 'settled').length,
      collateralPosted: collateralStatus.totalCollateralPosted,
      marginCallsActive: collateralStatus.participantsWithMarginCalls,
      pendingSettlements: settlementMetrics.pendingInstructions,
      completedSettlements: settlementMetrics.completedInstructions,
      defaultFundSize: defaultFund.availableCapital,
      insurancePoolSize: insurancePool.availableCapital,
      defaultEventsTotal: defaultEvents.length,
      auditEntriesTotal: auditEntries.length,
      systemicRiskScore: latestRisk?.overallRiskScore ?? 0,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: ClearingHouseEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.clearing.onEvent(forwardEvent);
    this.netting.onEvent(forwardEvent);
    this.collateral.onEvent(forwardEvent);
    this.defaultResolution.onEvent(forwardEvent);
    this.settlement.onEvent(forwardEvent);
    this.audit.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createClearingHouseManager(
  config?: ClearingHouseConfig
): DefaultClearingHouseManager {
  return new DefaultClearingHouseManager(config);
}

// Default export
export default DefaultClearingHouseManager;
