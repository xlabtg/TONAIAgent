/**
 * TONAIAgent - Real World Assets (RWA) & Tokenized Funds
 *
 * Comprehensive infrastructure layer for tokenization of real-world assets,
 * AI-driven allocation into RWAs, institutional-grade compliance, hybrid
 * portfolios combining crypto and traditional assets, liquidity mechanisms,
 * and cross-chain integration on The Open Network.
 *
 * Features:
 * - RWA Tokenization Framework (on-chain representation, legal/compliance mapping)
 * - Asset-backed token standards (real estate, private credit, bonds, commodities)
 * - Proof of reserves, audit trails, custodian integrations
 * - Compliance & Legal Layer (KYC/AML, jurisdictional restrictions)
 * - Permissioned access, accredited investor verification
 * - Institutional onboarding and regulatory audits
 * - AI Allocation Engine (crypto vs RWA yield comparison, risk-adjusted returns)
 * - Volatility hedging, stable real-world yield allocation
 * - Hybrid Portfolio Engine (crypto + RWA portfolios, dynamic rebalancing)
 * - Yield stacking, risk-adjusted capital flows
 * - Liquidity & Redemption (secondary markets, redemption frameworks)
 * - Cross-Chain Integration (Ethereum RWA protocols, multi-chain bridging)
 * - Tokenized Fund structures (open/closed-ended, structured products)
 *
 * @example
 * ```typescript
 * import { createRWAManager } from '@tonaiagent/core/rwa';
 *
 * // Create the RWA manager
 * const rwa = createRWAManager();
 *
 * // Tokenize a real estate asset
 * const result = await rwa.tokenization.tokenizeAsset({
 *   assetClass: 'real_estate',
 *   name: 'NYC Office Tower REIT',
 *   symbol: 'NYCOT',
 *   description: 'Tokenized office real estate in Manhattan',
 *   issuer: 'Prime Real Estate Fund',
 *   custodian: 'Fireblocks',
 *   jurisdiction: 'US',
 *   totalValue: 100000000,
 *   currency: 'USD',
 *   tokenSupply: 1000000,
 *   minimumInvestment: 10000,
 *   yieldRate: 0.065,
 * });
 *
 * // Create and verify an investor
 * const investor = await rwa.compliance.createInvestorProfile(
 *   'user_123',
 *   'accredited',
 *   { allowedJurisdictions: ['US', 'EU'] }
 * );
 * await rwa.compliance.approveKyc(investor.id, 'enhanced');
 * await rwa.compliance.approveAml(investor.id);
 *
 * // Register RWA opportunities and get AI recommendation
 * rwa.allocation.registerOpportunity({
 *   assetId: result.assetId,
 *   assetClass: 'real_estate',
 *   name: 'NYC Office Tower REIT',
 *   yieldRate: 0.065,
 *   riskScore: 35,
 *   liquidityScore: 60,
 *   minimumInvestment: 10000,
 *   availableAmount: 100000000,
 *   jurisdiction: 'US',
 *   aiScore: 0,
 *   reasoning: '',
 * });
 *
 * const recommendation = rwa.allocation.generateRecommendation(
 *   5000000, // $5M portfolio
 *   { strategy: 'balanced', maxRWAAllocation: 0.4, minCryptoAllocation: 0.4, rebalanceThreshold: 0.05, riskTolerance: 'moderate', preferredAssetClasses: ['real_estate'], parameters: {} },
 *   0.08 // 8% crypto yield
 * );
 *
 * // Deploy a tokenized fund
 * const fund = await rwa.portfolio.createTokenizedFund({
 *   name: 'TON Hybrid Yield Fund',
 *   symbol: 'THYF',
 *   fundType: 'open_ended',
 *   strategy: 'balanced',
 *   currency: 'USD',
 *   managementFee: 0.015, // 1.5% annual
 *   performanceFee: 0.20, // 20%
 *   hurdle: 0.08, // 8% hurdle rate
 *   minimumInvestment: 100000,
 *   redemptionNoticeDays: 30,
 *   allocationConfig: recommendation ? { ...recommendation, maxRWAAllocation: recommendation.rwaAllocation, minCryptoAllocation: recommendation.cryptoAllocation, rebalanceThreshold: 0.05, parameters: {} } : { strategy: 'balanced', maxRWAAllocation: 0.4, minCryptoAllocation: 0.4, rebalanceThreshold: 0.05, riskTolerance: 'moderate', preferredAssetClasses: [], parameters: {} },
 * });
 *
 * console.log('Fund deployed:', fund.id);
 * console.log('RWA allocation:', recommendation.rwaAllocation * 100, '%');
 * console.log('Expected yield:', recommendation.expectedYield * 100, '%');
 * ```
 */

// Export all types
export * from './types';

// Export Tokenization Framework
export {
  DefaultTokenizationManager,
  createTokenizationManager,
  type TokenizationManager,
  type AssetFilters,
  type YieldDistributionResult,
} from './tokenization';

// Export Compliance Layer
export {
  DefaultComplianceManager,
  createComplianceManager,
  DEFAULT_JURISDICTION_RULES,
  type ComplianceManager,
  type InvestorFilters,
  type AccreditationEvidence,
  type AccessCheckResult,
  type OnboardingFilters,
  type AuditFilters,
  type RegulatoryAuditReport,
  type ComplianceIssue,
} from './compliance';

// Export AI Allocation Engine
export {
  DefaultAllocationEngine,
  createAllocationEngine,
  type AllocationEngine,
  type OpportunityFilters,
  type OptimizationResult,
  type RWARiskAnalysis,
  type HedgeRecommendation,
} from './allocation';

// Export Hybrid Portfolio Engine
export {
  DefaultHybridPortfolioEngine,
  createHybridPortfolioEngine,
  type HybridPortfolioEngine,
  type RebalanceCheck,
  type RebalanceResult,
  type YieldDashboard,
  type YieldByAsset,
  type UpcomingDistribution,
  type TokenizedFundConfig,
  type FundFilters,
  type ProcessingResult,
} from './portfolio';

// Export Liquidity Manager
export {
  DefaultLiquidityManager,
  createLiquidityManager,
  type LiquidityManager,
  type PoolFilters,
  type RedemptionFilters,
  type RedemptionProcessingResult,
  type LiquidityEstimate,
  type SecondaryListing,
  type SecondaryTrade,
} from './liquidity';

// Export Cross-Chain Manager
export {
  DefaultCrossChainManager,
  createCrossChainManager,
  KNOWN_RWA_PROTOCOLS,
  KNOWN_BRIDGES,
  type CrossChainManager,
  type BridgeFilters,
  type BridgeTxFilters,
  type ProtocolFilters,
  type BridgeRecommendation,
  type CrossChainAnalytics,
} from './cross-chain';

// ============================================================================
// Unified RWA Manager
// ============================================================================

import { DefaultTokenizationManager, createTokenizationManager } from './tokenization';
import { DefaultComplianceManager, createComplianceManager } from './compliance';
import { DefaultAllocationEngine, createAllocationEngine } from './allocation';
import { DefaultHybridPortfolioEngine, createHybridPortfolioEngine } from './portfolio';
import { DefaultLiquidityManager, createLiquidityManager } from './liquidity';
import { DefaultCrossChainManager, createCrossChainManager } from './cross-chain';
import {
  TokenizationConfig,
  ComplianceConfig,
  AllocationEngineConfig,
  LiquidityConfig,
  CrossChainConfig,
  RWAEventCallback,
  RWAEvent,
} from './types';

export interface RWAManagerConfig {
  tokenization?: Partial<TokenizationConfig>;
  compliance?: Partial<ComplianceConfig>;
  allocation?: Partial<AllocationEngineConfig>;
  liquidity?: Partial<LiquidityConfig>;
  crossChain?: Partial<CrossChainConfig>;
}

export interface RWAManager {
  readonly tokenization: DefaultTokenizationManager;
  readonly compliance: DefaultComplianceManager;
  readonly allocation: DefaultAllocationEngine;
  readonly portfolio: DefaultHybridPortfolioEngine;
  readonly liquidity: DefaultLiquidityManager;
  readonly crossChain: DefaultCrossChainManager;

  // Unified event handling
  onEvent(callback: RWAEventCallback): void;

  // Convenience methods
  getSystemStatus(): RWASystemStatus;
}

export interface RWASystemStatus {
  tokenizedAssets: number;
  activeAssets: number;
  registeredInvestors: number;
  approvedInvestors: number;
  liquidityPools: number;
  registeredProtocols: number;
  activeBridges: number;
  generatedAt: Date;
}

export class DefaultRWAManager implements RWAManager {
  readonly tokenization: DefaultTokenizationManager;
  readonly compliance: DefaultComplianceManager;
  readonly allocation: DefaultAllocationEngine;
  readonly portfolio: DefaultHybridPortfolioEngine;
  readonly liquidity: DefaultLiquidityManager;
  readonly crossChain: DefaultCrossChainManager;

  private readonly eventCallbacks: RWAEventCallback[] = [];

  constructor(config?: RWAManagerConfig) {
    this.tokenization = createTokenizationManager(config?.tokenization);
    this.compliance = createComplianceManager(config?.compliance);
    this.allocation = createAllocationEngine(config?.allocation);
    this.portfolio = createHybridPortfolioEngine();
    this.liquidity = createLiquidityManager(config?.liquidity);
    this.crossChain = createCrossChainManager(config?.crossChain);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  onEvent(callback: RWAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): RWASystemStatus {
    const allAssets = this.tokenization.listAssets();
    const activeAssets = allAssets.filter(a => a.status === 'active');
    const allInvestors = this.compliance.listInvestors();
    const approvedInvestors = allInvestors.filter(
      i => i.kycStatus === 'approved' && i.amlStatus === 'approved'
    );
    const pools = this.liquidity.listPools();
    const protocols = this.crossChain.listProtocols();
    const bridges = this.crossChain.listBridges({ isActive: true });

    return {
      tokenizedAssets: allAssets.length,
      activeAssets: activeAssets.length,
      registeredInvestors: allInvestors.length,
      approvedInvestors: approvedInvestors.length,
      liquidityPools: pools.length,
      registeredProtocols: protocols.length,
      activeBridges: bridges.length,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: RWAEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.tokenization.onEvent(forwardEvent);
    this.compliance.onEvent(forwardEvent);
    this.allocation.onEvent(forwardEvent);
    this.portfolio.onEvent(forwardEvent);
    this.liquidity.onEvent(forwardEvent);
    this.crossChain.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRWAManager(config?: RWAManagerConfig): DefaultRWAManager {
  return new DefaultRWAManager(config);
}

// Default export
export default DefaultRWAManager;
