/**
 * TONAIAgent — Autonomous Capital Markets Stack (ACMS)
 *
 * A vertically integrated, AI-native capital markets infrastructure
 * built on The Open Network (TON). ACMS replaces the fragmented traditional
 * capital markets structure with a unified, programmable, AI-coordinated system.
 *
 * Architecture:
 * Users/Institutions → AI Funds & Agents → Prime Brokerage →
 * Liquidity Network → Clearing House → Risk & Stability Engine →
 * Treasury & Monetary Policy → Inter-Protocol Layer → Global Capital Coordination
 *
 * Stack Architecture — 9 Layers:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Layer 9: Governance         — DAO governance, parameter tuning         │
 * │  Layer 8: Inter-Protocol     — IPLS, cross-chain routing, liquidity     │
 * │  Layer 7: Monetary/Treasury  — Emission control, treasury allocation    │
 * │  Layer 6: Risk & Stability   — Circuit breakers, stability index        │
 * │  Layer 5: Clearing/Settlement— Netting, collateral, default resolution  │
 * │  Layer 4: Prime Brokerage    — Margin, leverage, capital efficiency     │
 * │  Layer 3: Liquidity          — Smart routing, cross-chain liquidity     │
 * │  Layer 2: Agent & Fund       — AI hedge funds, strategy agents          │
 * │  Layer 1: Asset              — Crypto, RWA, tokenized funds             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Institutional Comparison:
 * - Replaces BlackRock (Asset Management) → Layer 1-2
 * - Replaces Goldman Sachs (Prime Brokerage) → Layer 4
 * - Replaces NASDAQ (Liquidity/Execution) → Layer 3
 * - Replaces DTCC (Clearing & Settlement) → Layer 5
 * - Replaces Basel Committee (Risk Regulation) → Layer 6
 * - Replaces Federal Reserve (Monetary Policy) → Layer 7
 * - Enables Global Protocol Layer → Layers 8-9
 *
 * @example
 * ```typescript
 * import { createACMSManager } from '@tonaiagent/core/acms';
 *
 * // Initialize the full ACMS stack
 * const acms = createACMSManager({
 *   networkId: 'ton-mainnet',
 *   environment: 'sandbox',
 *   stabilityIndexTarget: 80,
 *   maxSystemLeverage: 10,
 * });
 *
 * // Layer 1: Issue a tokenized fund
 * const fundToken = acms.assetLayer.createTokenizedFund({
 *   fundManagerId: 'manager_agent_1',
 *   name: 'TON Alpha Fund',
 *   symbol: 'TALF',
 *   chainId: 'ton',
 *   initialNavPerShare: 100,
 *   initialShares: 1_000_000,
 *   managementFeeRate: 0.02,
 *   performanceFeeRate: 0.2,
 *   redemptionNoticeDays: 30,
 *   strategyDescription: 'AI-driven TON ecosystem arbitrage',
 * });
 *
 * // Layer 2: Deploy an AI fund
 * const fund = acms.agentFundLayer.createFund({
 *   name: 'TON Alpha Fund',
 *   fundType: 'hedge_fund',
 *   managerAgentId: 'manager_agent_1',
 *   initialAum: 10_000_000,
 *   initialNavPerShare: 100,
 *   targetReturn: 0.25,
 * });
 * const agent = acms.agentFundLayer.deployAgent({
 *   name: 'Arbitrage Agent Alpha',
 *   type: 'arbitrage_agent',
 *   fundId: fund.id,
 *   allocationUsd: 2_000_000,
 *   maxLeverage: 3,
 *   strategies: ['cross-dex-arbitrage', 'funding-rate-arbitrage'],
 * });
 *
 * // Layer 3: Route a large order
 * const route = acms.liquidityLayer.routeOrder({
 *   assetIn: 'TON',
 *   assetOut: 'USDT',
 *   amountIn: 100_000,
 *   orderType: 'twap',
 *   side: 'sell',
 *   maxSlippageBps: 30,
 * });
 *
 * // Layer 4: Set up prime brokerage
 * const pool = acms.primeBrokerageLayer.createCapitalPool('Main Pool', 50_000_000);
 * acms.primeBrokerageLayer.allocateFundToPool(pool.id, fund.id, fund.name, 10_000_000, 2.5);
 *
 * // Layer 5: Submit trade for clearing
 * const clearing = acms.clearingSettlementLayer.submitTrade({
 *   tradeId: 'trade_001',
 *   buyerId: agent.id,
 *   sellerId: 'counterparty_001',
 *   assetId: 'TON',
 *   quantity: 10000,
 *   priceUsd: 3.5,
 * });
 *
 * // Layer 6: Monitor system stability
 * const stability = acms.riskStabilityLayer.computeStabilityIndex({
 *   liquidityScore: 85, leverageScore: 75, collateralizationScore: 90,
 *   concentrationScore: 70, volatilityScore: 80,
 * });
 * console.log('Stability Index:', stability.score, stability.riskLevel);
 *
 * // Layer 7: Treasury management
 * const policy = acms.monetaryTreasuryLayer.createMonetaryPolicy({
 *   name: 'Growth Phase Policy',
 *   targetInflationRate: 0.03,
 *   initialEmissionRate: 100000,
 *   reserveRatio: 0.15,
 *   collateralizationRatio: 1.5,
 *   stabilizationBuffer: 500000,
 * });
 *
 * // Layer 8: Cross-protocol integration
 * const protocol = acms.interProtocolLayer.registerProtocol({
 *   name: 'TON Lending Protocol',
 *   type: 'defi_lending',
 *   chainId: 'ton',
 *   tvlUsd: 50_000_000,
 *   integrationType: 'bidirectional',
 *   adapterVersion: '1.0.0',
 * });
 *
 * // Layer 9: Governance
 * const proposal = acms.governanceLayer.createProposal({
 *   type: 'parameter_change',
 *   title: 'Adjust max system leverage',
 *   description: 'Reduce max leverage from 10x to 8x for safety',
 *   proposerId: 'governance_token_holder_1',
 *   targetLayer: 6,
 *   targetParameter: 'maxSystemLeverage',
 *   proposedValue: 8,
 *   currentValue: 10,
 *   votingDurationHours: 72,
 *   quorumRequired: 1000000,
 * });
 *
 * // Get full ACMS stack status
 * const status = acms.getStackStatus();
 * console.log('ACMS Stack Status:', JSON.stringify(status, null, 2));
 * ```
 */

// Export all types
export * from './types';

// Export Layer 1: Asset Layer
export {
  DefaultAssetLayerManager,
  createAssetLayerManager,
  type AssetLayerManager,
  type AssetFilters,
  type CreateTokenizedFundParams,
  type CreateStructuredProductParams,
} from './asset-layer';

// Export Layer 2: Agent & Fund Layer
export {
  DefaultAgentFundLayerManager,
  createAgentFundLayerManager,
  type AgentFundLayerManager,
  type DeployAgentParams,
  type AgentFilters,
  type CreateFundParams,
  type FundFilters,
} from './agent-fund-layer';

// Export Layer 3: Liquidity Layer
export {
  DefaultLiquidityLayerManager,
  createLiquidityLayerManager,
  type LiquidityLayerManager,
  type RegisterSourceParams,
  type SourceFilters,
  type CreatePoolParams,
  type RouteOrderParams,
  type RouteExecutionResult,
  type RouteFilters,
} from './liquidity-layer';

// Export Layer 4: Prime Brokerage Layer
export {
  DefaultPrimeBrokerageLayerManager,
  createPrimeBrokerageLayerManager,
  type PrimeBrokerageLayerManager,
  type UpdateMarginParams,
  type MarginCallResult,
  type LiquidationResult,
  type MarginAccountFilters,
  type CollateralReceipt,
  type NetExposureResult,
} from './prime-brokerage-layer';

// Export Layer 5: Clearing & Settlement Layer
export {
  DefaultClearingSettlementLayerManager,
  createClearingSettlementLayerManager,
  type ClearingSettlementLayerManager,
  type SubmitTradeParams,
  type ClearingEntryFilters,
} from './clearing-settlement-layer';

// Export Layer 6: Risk & Stability Layer
export {
  DefaultRiskStabilityLayerManager,
  createRiskStabilityLayerManager,
  type RiskStabilityLayerManager,
  type StabilityMetrics,
  type UpdateLeverageParams,
  type DelevaragingResult,
  type RegisterCircuitBreakerParams,
  type StressTestScenario,
  type StressTestResult,
  type InsuranceFundDrawdown,
} from './risk-stability-layer';

// Export Layer 7: Monetary & Treasury Layer
export {
  DefaultMonetaryTreasuryLayerManager,
  createMonetaryTreasuryLayerManager,
  type MonetaryTreasuryLayerManager,
  type CreateMonetaryPolicyParams,
  type CreateEmissionScheduleParams,
  type TreasuryAllocationParams,
  type MonetaryActionResult,
  type TreasurySpendRecord,
} from './monetary-treasury-layer';

// Export Layer 8: Inter-Protocol Layer
export {
  DefaultInterProtocolLayerManager,
  createInterProtocolLayerManager,
  type InterProtocolLayerManager,
  type RegisterProtocolParams,
  type ProtocolFilters,
  type IssuePassportParams,
  type RegisterPositionParams,
  type PositionFilters,
  type InitiateAllocationParams,
  type AllocationFilters,
} from './inter-protocol-layer';

// Export Layer 9: Governance Layer
export {
  DefaultGovernanceLayerManager,
  createGovernanceLayerManager,
  type GovernanceLayerManager,
  type CreateProposalParams,
  type CastVoteParams,
  type ProposalFinalizeResult,
  type ProposalFilters,
  type RegisterParameterParams,
  type ActivateOverrideParams,
} from './governance-layer';

// ============================================================================
// Unified ACMS Manager
// ============================================================================

import { DefaultAssetLayerManager, createAssetLayerManager } from './asset-layer';
import { DefaultAgentFundLayerManager, createAgentFundLayerManager } from './agent-fund-layer';
import { DefaultLiquidityLayerManager, createLiquidityLayerManager } from './liquidity-layer';
import { DefaultPrimeBrokerageLayerManager, createPrimeBrokerageLayerManager } from './prime-brokerage-layer';
import { DefaultClearingSettlementLayerManager, createClearingSettlementLayerManager } from './clearing-settlement-layer';
import { DefaultRiskStabilityLayerManager, createRiskStabilityLayerManager } from './risk-stability-layer';
import { DefaultMonetaryTreasuryLayerManager, createMonetaryTreasuryLayerManager } from './monetary-treasury-layer';
import { DefaultInterProtocolLayerManager, createInterProtocolLayerManager } from './inter-protocol-layer';
import { DefaultGovernanceLayerManager, createGovernanceLayerManager } from './governance-layer';
import {
  ACMSConfig,
  ACMSEvent,
  ACMSEventCallback,
  ACMSStackStatus,
  DEFAULT_ACMS_CONFIG,
} from './types';

export interface ACMSManager {
  readonly assetLayer: DefaultAssetLayerManager;
  readonly agentFundLayer: DefaultAgentFundLayerManager;
  readonly liquidityLayer: DefaultLiquidityLayerManager;
  readonly primeBrokerageLayer: DefaultPrimeBrokerageLayerManager;
  readonly clearingSettlementLayer: DefaultClearingSettlementLayerManager;
  readonly riskStabilityLayer: DefaultRiskStabilityLayerManager;
  readonly monetaryTreasuryLayer: DefaultMonetaryTreasuryLayerManager;
  readonly interProtocolLayer: DefaultInterProtocolLayerManager;
  readonly governanceLayer: DefaultGovernanceLayerManager;

  getStackStatus(): ACMSStackStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export class DefaultACMSManager implements ACMSManager {
  readonly assetLayer: DefaultAssetLayerManager;
  readonly agentFundLayer: DefaultAgentFundLayerManager;
  readonly liquidityLayer: DefaultLiquidityLayerManager;
  readonly primeBrokerageLayer: DefaultPrimeBrokerageLayerManager;
  readonly clearingSettlementLayer: DefaultClearingSettlementLayerManager;
  readonly riskStabilityLayer: DefaultRiskStabilityLayerManager;
  readonly monetaryTreasuryLayer: DefaultMonetaryTreasuryLayerManager;
  readonly interProtocolLayer: DefaultInterProtocolLayerManager;
  readonly governanceLayer: DefaultGovernanceLayerManager;

  readonly config: ACMSConfig;
  private readonly eventCallbacks: ACMSEventCallback[] = [];

  constructor(config: ACMSConfig = DEFAULT_ACMS_CONFIG) {
    this.config = { ...DEFAULT_ACMS_CONFIG, ...config };

    this.assetLayer = createAssetLayerManager();
    this.agentFundLayer = createAgentFundLayerManager();
    this.liquidityLayer = createLiquidityLayerManager();
    this.primeBrokerageLayer = createPrimeBrokerageLayerManager();
    this.clearingSettlementLayer = createClearingSettlementLayerManager();
    this.riskStabilityLayer = createRiskStabilityLayerManager();
    this.monetaryTreasuryLayer = createMonetaryTreasuryLayerManager();
    this.interProtocolLayer = createInterProtocolLayerManager();
    this.governanceLayer = createGovernanceLayerManager();

    this.setupEventForwarding();
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getStackStatus(): ACMSStackStatus {
    const assetStatus = this.assetLayer.getLayerStatus();
    const agentFundStatus = this.agentFundLayer.getLayerStatus();
    const liquidityStatus = this.liquidityLayer.getLayerStatus();
    const pbStatus = this.primeBrokerageLayer.getLayerStatus();
    const clearingStatus = this.clearingSettlementLayer.getLayerStatus();
    const riskStatus = this.riskStabilityLayer.getLayerStatus();
    const monetaryStatus = this.monetaryTreasuryLayer.getLayerStatus();
    const interProtoStatus = this.interProtocolLayer.getLayerStatus();
    const govStatus = this.governanceLayer.getLayerStatus();

    const totalAumUsd = agentFundStatus.totalAumUsd;
    const totalTvlUsd = liquidityStatus.totalTvlUsd + liquidityStatus.totalPoolTvlUsd;

    return {
      layer1AssetLayer: assetStatus,
      layer2AgentFundLayer: agentFundStatus,
      layer3LiquidityLayer: liquidityStatus,
      layer4PrimeBrokerage: pbStatus,
      layer5ClearingSettlement: clearingStatus,
      layer6RiskStability: riskStatus,
      layer7MonetaryTreasury: monetaryStatus,
      layer8InterProtocol: interProtoStatus,
      layer9Governance: govStatus,
      systemStabilityIndex: riskStatus.stabilityIndex,
      totalAumUsd,
      totalTvlUsd,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: ACMSEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.assetLayer.onEvent(forwardEvent);
    this.agentFundLayer.onEvent(forwardEvent);
    this.liquidityLayer.onEvent(forwardEvent);
    this.primeBrokerageLayer.onEvent(forwardEvent);
    this.clearingSettlementLayer.onEvent(forwardEvent);
    this.riskStabilityLayer.onEvent(forwardEvent);
    this.monetaryTreasuryLayer.onEvent(forwardEvent);
    this.interProtocolLayer.onEvent(forwardEvent);
    this.governanceLayer.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createACMSManager(config?: Partial<ACMSConfig>): DefaultACMSManager {
  return new DefaultACMSManager({ ...DEFAULT_ACMS_CONFIG, ...config });
}

// Default export
export default DefaultACMSManager;
