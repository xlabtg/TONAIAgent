/**
 * TONAIAgent - Global Autonomous Asset Management Protocol (GAAMP) v1
 *
 * An open, standardized, protocol-level infrastructure for AI-managed asset
 * management at global scale. Built initially on The Open Network (TON),
 * designed for cross-chain expansion.
 *
 * Comparable to:
 * - BlackRock (scale of asset management) — but autonomous
 * - DTCC (clearing backbone) — but AI-native
 * - Vanguard Group (systemic capital management) — but programmable & decentralized
 *
 * ## Macro Architecture
 *
 * ```
 * Users / Institutions
 *         ↓
 * AI Funds  ←──────── Agent Layer
 *         ↓
 * Prime Brokerage  ←── Prime & Liquidity Layer
 *         ↓
 * Liquidity Network
 *         ↓
 * Clearing House  ←──── Clearing & Settlement Layer
 *         ↓
 * Settlement Layer
 *         ↓
 * Protocol Governance  ← Governance Layer
 *                        Compliance & Identity Layer
 * ```
 *
 * ## Protocol Layers
 *
 * 1. **Agent Layer** — AI-managed trading/strategy/risk/treasury agents
 *    Standardized interface: allocate(), rebalance(), hedge(), report(), shutdown()
 *
 * 2. **Fund Layer** — Tokenized funds, DAO funds, institutional vehicles, structured products
 *    Supports NAV accounting, performance tracking, risk profiling
 *
 * 3. **Prime & Liquidity Layer** — Prime brokerage, liquidity aggregation, smart routing,
 *    internal capital netting
 *
 * 4. **Clearing & Settlement Layer** — AI netting, margin engine, default resolution,
 *    settlement finality
 *
 * 5. **Governance Layer** — Protocol parameter tuning, risk thresholds, insurance pools,
 *    upgrade mechanisms. DAO-controlled evolution.
 *
 * 6. **Compliance & Identity Layer** — Institutional onboarding, jurisdiction-aware logic,
 *    permissioned fund classes, audit transparency
 *
 * @example
 * ```typescript
 * import { createGAAMPProtocol } from '@tonaiagent/core/gaamp';
 *
 * // Initialize GAAMP protocol
 * const protocol = createGAAMPProtocol({
 *   chainId: 'ton',
 *   protocolParameters: {
 *     maxAgentsPerFund: 10,
 *     minMarginRatio: 0.1,
 *   },
 * });
 *
 * // Register participant
 * const participant = protocol.compliance.registerParticipant({
 *   name: 'Alpha Capital',
 *   type: 'institution',
 *   institutionalType: 'hedge_fund',
 *   primaryJurisdiction: 'US',
 * });
 * protocol.compliance.approveKYC(participant.id, 'institutional');
 *
 * // Create AI fund
 * const fund = protocol.fundLayer.createFund({
 *   name: 'TON Alpha AI Fund',
 *   description: 'AI-managed multi-strategy fund on TON',
 *   type: 'hedge',
 *   fundClass: 'institutional',
 *   chain: 'ton',
 *   initialCapital: 10_000_000,
 *   fees: { managementFeePercent: 1, performanceFeePercent: 20 },
 * });
 *
 * // Deploy agent
 * const agent = protocol.agentLayer.registerAgent({
 *   name: 'Alpha Trading Agent',
 *   type: 'trading',
 *   fundId: fund.id,
 * });
 * protocol.agentLayer.activateAgent(agent.id);
 *
 * // Allocate capital
 * const allocation = protocol.agentLayer.executeAllocate(agent.id, {
 *   totalCapital: 10_000_000,
 *   targetAllocations: { 'TON': 0.4, 'USDT': 0.3, 'BTC': 0.3 },
 * });
 *
 * // Submit trade for clearing
 * const clearing = protocol.clearingLayer.submitTrade({
 *   tradeId: 'trade_001',
 *   buyerFundId: fund.id,
 *   sellerFundId: 'counterparty_fund',
 *   asset: 'TON',
 *   quantity: 100_000,
 *   price: 5.50,
 *   chain: 'ton',
 * });
 *
 * // Governance: propose a parameter change
 * protocol.governanceLayer.setVotingPower(participant.id, 1000);
 * const proposal = protocol.governanceLayer.submitProposal({
 *   title: 'Increase max leverage',
 *   description: 'Raise max leverage from 2x to 3x for institutional funds',
 *   type: 'parameter_change',
 *   proposerId: participant.id,
 *   parameters: { defaultLeverage: 3.0 },
 * });
 *
 * // Get system status
 * const status = protocol.getSystemStatus();
 * console.log('GAAMP Protocol Status:', status);
 * ```
 *
 * @module gaamp
 */

// Export all types
export * from './types';

// Export Agent Layer
export {
  DefaultAgentLayer,
  createAgentLayer,
  type AgentLayer,
  type RegisterAgentParams,
  type AgentFilters,
} from './agent-layer';

// Export Fund Layer
export {
  DefaultFundLayer,
  createFundLayer,
  type FundLayer,
  type CreateFundParams,
  type FundFilters,
  type InvestmentParams,
  type RedemptionParams,
  type TransactionFilters,
} from './fund-layer';

// Export Prime & Liquidity Layer
export {
  DefaultPrimeLiquidityLayer,
  createPrimeLiquidityLayer,
  type PrimeLiquidityLayer,
  type RegisterPoolParams,
  type PoolFilters,
  type FindRouteParams,
  type ExecutionEstimate,
  type NettingPosition,
  type SystemLiquidityMetrics,
} from './prime-liquidity-layer';

// Export Clearing & Settlement Layer
export {
  DefaultClearingSettlementLayer,
  createClearingSettlementLayer,
  type ClearingSettlementLayer,
  type SubmitTradeParams,
  type ClearingFilters,
  type IssueMarginCallParams,
  type MarginCallFilters,
  type SettlementFilters,
  type ResolveDefaultParams,
  type ClearingStats,
} from './clearing-settlement-layer';

// Export Governance Layer
export {
  DefaultGovernanceLayer,
  createGovernanceLayer,
  DEFAULT_PROTOCOL_PARAMETERS,
  type GovernanceLayer,
  type SubmitProposalParams,
  type ProposalFilters,
  type CastVoteParams,
} from './governance-layer';

// Export Compliance & Identity Layer
export {
  DefaultComplianceIdentityLayer,
  createComplianceIdentityLayer,
  DEFAULT_BLOCKED_JURISDICTIONS,
  FUND_CLASS_KYC_REQUIREMENTS,
  type ComplianceIdentityLayer,
  type RegisterParticipantParams,
  type ParticipantFilters,
  type RecordAuditParams,
  type AuditTrailFilters,
  type GenerateReportParams,
  type ReportFilters,
} from './compliance-identity-layer';

// ============================================================================
// Unified GAAMP Protocol Manager
// ============================================================================

import { DefaultAgentLayer, createAgentLayer } from './agent-layer';
import { DefaultFundLayer, createFundLayer } from './fund-layer';
import { DefaultPrimeLiquidityLayer, createPrimeLiquidityLayer } from './prime-liquidity-layer';
import { DefaultClearingSettlementLayer, createClearingSettlementLayer } from './clearing-settlement-layer';
import { DefaultGovernanceLayer, createGovernanceLayer } from './governance-layer';
import { DefaultComplianceIdentityLayer, createComplianceIdentityLayer } from './compliance-identity-layer';
import {
  GAMPConfig,
  GAMPEvent,
  GAMPEventCallback,
  GAAMP_VERSION,
} from './types';

export interface GAAMPSystemStatus {
  version: string;
  chain: string;
  isPaused: boolean;
  agents: number;
  activeFunds: number;
  totalAUM: number;
  liquidityPools: number;
  availableLiquidity: number;
  pendingClearing: number;
  activeMarginCalls: number;
  insurancePoolBalance: number;
  governanceProposals: number;
  registeredParticipants: number;
  generatedAt: Date;
}

export interface GAAMPProtocol {
  readonly version: string;
  readonly agentLayer: DefaultAgentLayer;
  readonly fundLayer: DefaultFundLayer;
  readonly liquidityLayer: DefaultPrimeLiquidityLayer;
  readonly clearingLayer: DefaultClearingSettlementLayer;
  readonly governanceLayer: DefaultGovernanceLayer;
  readonly compliance: DefaultComplianceIdentityLayer;

  onEvent(callback: GAMPEventCallback): void;
  getSystemStatus(): GAAMPSystemStatus;
}

export class DefaultGAAMPProtocol implements GAAMPProtocol {
  readonly version = GAAMP_VERSION;
  readonly agentLayer: DefaultAgentLayer;
  readonly fundLayer: DefaultFundLayer;
  readonly liquidityLayer: DefaultPrimeLiquidityLayer;
  readonly clearingLayer: DefaultClearingSettlementLayer;
  readonly governanceLayer: DefaultGovernanceLayer;
  readonly compliance: DefaultComplianceIdentityLayer;

  private readonly eventCallbacks: GAMPEventCallback[] = [];
  private readonly chain: string;

  constructor(config?: GAMPConfig) {
    this.chain = config?.chainId ?? 'ton';

    this.agentLayer = createAgentLayer(config?.agentLayer);
    this.fundLayer = createFundLayer(config?.fundLayer);
    this.liquidityLayer = createPrimeLiquidityLayer(config?.liquidityLayer);
    this.clearingLayer = createClearingSettlementLayer(config?.clearingLayer);
    this.governanceLayer = createGovernanceLayer(
      config?.governanceLayer,
      config?.protocolParameters
    );
    this.compliance = createComplianceIdentityLayer(config?.complianceLayer);

    this.setupEventForwarding();
  }

  onEvent(callback: GAMPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): GAAMPSystemStatus {
    const agents = this.agentLayer.listAgents();
    const funds = this.fundLayer.listFunds();
    const activeFunds = funds.filter(f => f.status === 'active');
    const totalAUM = activeFunds.reduce((sum, f) => sum + f.aum, 0);
    const liquidity = this.liquidityLayer.getSystemLiquidity();
    const clearingStats = this.clearingLayer.getClearingStats();
    const proposals = this.governanceLayer.listProposals();
    const participants = this.compliance.listParticipants();

    return {
      version: this.version,
      chain: this.chain,
      isPaused: this.governanceLayer.isPaused(),
      agents: agents.length,
      activeFunds: activeFunds.length,
      totalAUM,
      liquidityPools: liquidity.poolCount,
      availableLiquidity: liquidity.availableLiquidity,
      pendingClearing: clearingStats.pendingClearing,
      activeMarginCalls: clearingStats.activeMarginCalls,
      insurancePoolBalance: clearingStats.insurancePoolBalance,
      governanceProposals: proposals.length,
      registeredParticipants: participants.length,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventForwarding(): void {
    const forward = (event: GAMPEvent) => {
      for (const cb of this.eventCallbacks) {
        try {
          cb(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.agentLayer.onEvent(forward);
    this.fundLayer.onEvent(forward);
    this.liquidityLayer.onEvent(forward);
    this.clearingLayer.onEvent(forward);
    this.governanceLayer.onEvent(forward);
    this.compliance.onEvent(forward);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGAAMPProtocol(config?: GAMPConfig): DefaultGAAMPProtocol {
  return new DefaultGAAMPProtocol(config);
}

// Default export
export default DefaultGAAMPProtocol;
