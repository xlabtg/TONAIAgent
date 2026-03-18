/**
 * TONAIAgent - Real World Assets (RWA) & Tokenized Funds Types
 *
 * Core type definitions for the RWA tokenization framework,
 * compliance layer, AI allocation module, hybrid portfolio engine,
 * liquidity mechanisms, and cross-chain integration.
 */

// ============================================================================
// Enumerations
// ============================================================================

export type RWAAssetClass =
  | 'real_estate'
  | 'private_credit'
  | 'government_bonds'
  | 'corporate_bonds'
  | 'commodities'
  | 'infrastructure'
  | 'private_equity'
  | 'structured_products'
  | 'treasury_bills'
  | 'money_market';

export type TokenizationStatus =
  | 'draft'
  | 'pending_legal'
  | 'pending_audit'
  | 'active'
  | 'suspended'
  | 'redeemed'
  | 'matured';

export type ComplianceStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expired';

export type KycLevel = 'basic' | 'enhanced' | 'institutional';

export type InvestorType =
  | 'retail'
  | 'accredited'
  | 'qualified_institutional'
  | 'professional';

export type AllocationStrategy =
  | 'yield_maximization'
  | 'risk_minimization'
  | 'balanced'
  | 'custom';

export type PortfolioRebalanceStrategy =
  | 'threshold'
  | 'calendar'
  | 'tactical'
  | 'ai_driven';

export type LiquidityTier = 'high' | 'medium' | 'low' | 'illiquid';

export type ChainId =
  | 'ton'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'solana'
  | 'avalanche';

export type RWAEventType =
  | 'asset_tokenized'
  | 'compliance_approved'
  | 'compliance_rejected'
  | 'allocation_updated'
  | 'portfolio_rebalanced'
  | 'redemption_initiated'
  | 'redemption_completed'
  | 'yield_distributed'
  | 'reserve_updated'
  | 'cross_chain_bridged'
  | 'fund_deployed'
  | 'risk_alert';

// ============================================================================
// RWA Asset Types
// ============================================================================

export interface RWAAsset {
  id: string;
  name: string;
  symbol: string;
  assetClass: RWAAssetClass;
  description: string;
  issuer: string;
  custodian: string;
  jurisdiction: string;
  tokenContractAddress?: string;
  totalSupply: number;
  circulatingSupply: number;
  faceValue: number;
  currentPrice: number;
  currency: string;
  maturityDate?: Date;
  yieldRate?: number; // Annual yield as decimal
  creditRating?: string;
  status: TokenizationStatus;
  legalDocuments: LegalDocument[];
  auditReports: AuditReport[];
  proofOfReserves?: ProofOfReserves;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LegalDocument {
  id: string;
  type: 'prospectus' | 'legal_opinion' | 'trust_deed' | 'custody_agreement' | 'subscription_agreement' | 'other';
  name: string;
  hash: string; // IPFS hash or document hash
  url?: string;
  jurisdiction: string;
  validFrom: Date;
  validUntil?: Date;
  uploadedAt: Date;
}

export interface AuditReport {
  id: string;
  auditor: string;
  reportType: 'financial' | 'compliance' | 'technical' | 'reserves';
  period: string;
  findings: string;
  hash: string;
  publishedAt: Date;
}

export interface ProofOfReserves {
  assetId: string;
  totalAssetValue: number;
  totalTokenizedValue: number;
  collateralizationRatio: number;
  lastVerified: Date;
  verifier: string;
  attestationHash: string;
  breakdown: ReserveBreakdown[];
}

export interface ReserveBreakdown {
  assetType: string;
  value: number;
  currency: string;
  custodian: string;
  verificationMethod: string;
}

export interface TokenizationRequest {
  assetClass: RWAAssetClass;
  name: string;
  symbol: string;
  description: string;
  issuer: string;
  custodian: string;
  jurisdiction: string;
  totalValue: number;
  currency: string;
  tokenSupply: number;
  minimumInvestment: number;
  yieldRate?: number;
  maturityDate?: Date;
  legalDocuments?: Omit<LegalDocument, 'id' | 'uploadedAt'>[];
  metadata?: Record<string, unknown>;
}

export interface TokenizationResult {
  assetId: string;
  tokenContractAddress?: string;
  status: TokenizationStatus;
  estimatedActivationDate?: Date;
  nextSteps: string[];
}

// ============================================================================
// Compliance Types
// ============================================================================

export interface InvestorProfile {
  id: string;
  userId: string;
  investorType: InvestorType;
  kycLevel: KycLevel;
  kycStatus: ComplianceStatus;
  amlStatus: ComplianceStatus;
  accreditationStatus?: ComplianceStatus;
  accreditationExpiry?: Date;
  allowedJurisdictions: string[];
  restrictedAssetClasses: RWAAssetClass[];
  maximumInvestmentAmount?: number;
  netWorthVerified?: boolean;
  annualIncomeVerified?: boolean;
  institutionName?: string;
  regulatoryIds: Record<string, string>; // LEI, CRD, etc.
  onboardedAt: Date;
  lastReviewAt: Date;
  metadata: Record<string, unknown>;
}

export interface JurisdictionRule {
  jurisdiction: string;
  allowedInvestorTypes: InvestorType[];
  requiredKycLevel: KycLevel;
  maxInvestmentPerInvestor?: number;
  requiresAccreditation: boolean;
  restrictedAssetClasses: RWAAssetClass[];
  reportingRequirements: string[];
  holdingPeriod?: number; // days
}

export interface ComplianceCheck {
  id: string;
  investorId: string;
  assetId: string;
  checkType: 'kyc' | 'aml' | 'accreditation' | 'jurisdiction' | 'investment_limit';
  status: ComplianceStatus;
  reason?: string;
  checkedAt: Date;
  validUntil?: Date;
}

export interface InstitutionalOnboarding {
  id: string;
  organizationName: string;
  organizationType: 'bank' | 'fund' | 'insurance' | 'family_office' | 'endowment' | 'other';
  jurisdiction: string;
  lei?: string; // Legal Entity Identifier
  regulatoryRegistrations: string[];
  aum?: number; // Assets Under Management
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  assignedRelationshipManager?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  documents: LegalDocument[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// AI Allocation Types
// ============================================================================

export interface AllocationConfig {
  strategy: AllocationStrategy;
  maxRWAAllocation: number; // Max % of portfolio in RWAs
  minCryptoAllocation: number; // Min % of portfolio in crypto
  targetYield?: number; // Target annual yield
  maxDrawdown?: number;
  rebalanceThreshold: number; // Drift % before rebalance triggered
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredAssetClasses: RWAAssetClass[];
  excludedAssetClasses?: RWAAssetClass[];
  jurisdictionPreferences?: string[];
  parameters: Record<string, unknown>;
}

export interface RWAOpportunity {
  assetId: string;
  assetClass: RWAAssetClass;
  name: string;
  yieldRate: number;
  riskScore: number; // 0-100, higher = more risk
  liquidityScore: number; // 0-100, higher = more liquid
  minimumInvestment: number;
  availableAmount: number;
  jurisdiction: string;
  maturityDate?: Date;
  creditRating?: string;
  aiScore: number; // AI-calculated composite score
  reasoning: string;
}

export interface AllocationRecommendation {
  id: string;
  generatedAt: Date;
  strategy: AllocationStrategy;
  cryptoAllocation: number; // % in crypto
  rwaAllocation: number; // % in RWAs
  cashAllocation: number; // % in cash/stablecoins
  rwaBreakdown: RWAAllocationItem[];
  expectedYield: number;
  expectedRisk: number;
  sharpeRatio: number;
  reasoning: string;
  confidence: number; // 0-1
}

export interface RWAAllocationItem {
  assetId: string;
  assetName: string;
  assetClass: RWAAssetClass;
  allocationPercent: number;
  allocationAmount: number;
  expectedYield: number;
  riskContribution: number;
}

export interface YieldComparison {
  cryptoYield: number;
  rwaYield: number;
  riskAdjustedCryptoYield: number;
  riskAdjustedRwaYield: number;
  recommendation: 'increase_rwa' | 'increase_crypto' | 'maintain';
  reasoning: string;
}

// ============================================================================
// Hybrid Portfolio Types
// ============================================================================

export interface HybridPortfolio {
  id: string;
  name: string;
  ownerId: string;
  totalValue: number;
  currency: string;
  cryptoPositions: CryptoPosition[];
  rwaPositions: RWAPosition[];
  cashBalance: number;
  allocationConfig: AllocationConfig;
  performance: PortfolioPerformance;
  riskMetrics: PortfolioRiskMetrics;
  lastRebalancedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CryptoPosition {
  id: string;
  asset: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  weight: number;
  chain: ChainId;
}

export interface RWAPosition {
  id: string;
  assetId: string;
  assetName: string;
  assetClass: RWAAssetClass;
  tokenAmount: number;
  averageCost: number;
  currentValue: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  weight: number;
  accruedYield: number;
  yieldRate: number;
  jurisdiction: string;
  acquiredAt: Date;
}

export interface PortfolioPerformance {
  totalReturn: number;
  totalReturnPercent: number;
  cryptoReturn: number;
  rwaReturn: number;
  yieldIncome: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  period: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
}

export interface PortfolioRiskMetrics {
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  beta: number; // Portfolio beta vs crypto market
  concentration: number; // Largest single position weight
  cryptoCorrelation: number; // Correlation with pure crypto portfolio
  liquidityRisk: number; // 0-100, higher = more illiquid
  counterpartyRisk: number; // 0-100, higher = more counterparty risk
  jurisdictionRisk: number; // 0-100, higher = more regulatory risk
}

export interface RebalanceOrder {
  id: string;
  portfolioId: string;
  type: 'crypto_buy' | 'crypto_sell' | 'rwa_buy' | 'rwa_sell';
  assetId: string;
  assetName: string;
  targetAmount: number;
  currentAmount: number;
  tradeSizeUsd: number;
  priority: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
}

// ============================================================================
// Liquidity & Redemption Types
// ============================================================================

export interface LiquidityPool {
  id: string;
  assetId: string;
  assetName: string;
  totalLiquidity: number;
  availableLiquidity: number;
  utilizationRate: number;
  tier: LiquidityTier;
  sources: LiquiditySource[];
  redemptionQueue: RedemptionRequest[];
  lastUpdated: Date;
}

export interface LiquiditySource {
  id: string;
  type: 'primary_market' | 'secondary_market' | 'amm' | 'otc' | 'custodian';
  name: string;
  availableLiquidity: number;
  priceImpact: number; // Estimated price impact for large trades
  settlementDays: number;
  minimumSize: number;
  maximumSize?: number;
  isActive: boolean;
}

export interface RedemptionRequest {
  id: string;
  investorId: string;
  assetId: string;
  tokenAmount: number;
  estimatedValue: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  redemptionType: 'standard' | 'early' | 'emergency';
  earlyRedemptionPenalty?: number;
  estimatedSettlementDate: Date;
  actualSettlementDate?: Date;
  destinationAddress?: string;
  reason?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface LiquidityRoutingResult {
  requestId: string;
  totalAmount: number;
  routes: LiquidityRoute[];
  estimatedCost: number;
  estimatedSettlement: Date;
  priceImpact: number;
  recommended: boolean;
}

export interface LiquidityRoute {
  sourceId: string;
  sourceName: string;
  amount: number;
  estimatedCost: number;
  settlementDays: number;
  sequence: number;
}

// ============================================================================
// Cross-Chain Types
// ============================================================================

export interface CrossChainBridge {
  id: string;
  name: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  supportedAssets: string[];
  bridgeFee: number; // In basis points
  estimatedTime: number; // Minutes
  securityScore: number; // 0-100
  isActive: boolean;
  dailyVolume: number;
  totalVolumeBridged: number;
}

export interface BridgeTransaction {
  id: string;
  bridgeId: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  assetId: string;
  amount: number;
  fromAddress: string;
  toAddress: string;
  sourceTxHash?: string;
  targetTxHash?: string;
  status: 'initiated' | 'source_confirmed' | 'bridging' | 'target_confirmed' | 'completed' | 'failed';
  fee: number;
  initiatedAt: Date;
  completedAt?: Date;
}

export interface CrossChainRWAProtocol {
  id: string;
  name: string;
  chain: ChainId;
  protocolType: 'lending' | 'tokenization' | 'yield' | 'structured';
  tvl: number;
  apy: number;
  supportedAssetClasses: RWAAssetClass[];
  audited: boolean;
  riskRating: 'low' | 'medium' | 'high';
  integrationStatus: 'active' | 'beta' | 'planned';
  contractAddress?: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Tokenized Fund Types
// ============================================================================

export interface TokenizedFund {
  id: string;
  name: string;
  symbol: string;
  fundType: 'open_ended' | 'closed_ended' | 'interval';
  strategy: AllocationStrategy;
  nav: number; // Net Asset Value per share
  totalShares: number;
  totalAum: number;
  currency: string;
  managementFee: number; // Annual management fee %
  performanceFee: number; // Performance fee %
  hurdle?: number; // Hurdle rate for performance fee
  minimumInvestment: number;
  lockupPeriod?: number; // Days
  redemptionNoticeDays: number;
  portfolio: HybridPortfolio;
  investors: FundInvestor[];
  status: 'active' | 'paused' | 'closed' | 'liquidating';
  launchedAt: Date;
  metadata: Record<string, unknown>;
}

export interface FundInvestor {
  id: string;
  investorId: string;
  sharesOwned: number;
  totalInvested: number;
  currentValue: number;
  unrealizedPnL: number;
  yieldEarned: number;
  subscriptionDate: Date;
  lastTransactionDate: Date;
}

export interface FundSubscription {
  id: string;
  fundId: string;
  investorId: string;
  amount: number;
  currency: string;
  sharesAllocated?: number;
  navAtSubscription?: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  processedAt?: Date;
  createdAt: Date;
}

export interface FundRedemption {
  id: string;
  fundId: string;
  investorId: string;
  sharesRedeemed: number;
  estimatedValue: number;
  actualValue?: number;
  navAtRedemption?: number;
  penalty?: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
}

// ============================================================================
// Event Types
// ============================================================================

export interface RWAEvent {
  id: string;
  type: RWAEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type RWAEventCallback = (event: RWAEvent) => void;

// ============================================================================
// Manager Config Types
// ============================================================================

export interface TokenizationConfig {
  defaultCustodian?: string;
  requireAuditBeforeActivation: boolean;
  proofOfReservesFrequency: 'daily' | 'weekly' | 'monthly';
  auditRefreshDays: number;
  supportedJurisdictions: string[];
}

export interface ComplianceConfig {
  strictMode: boolean;
  kycRefreshDays: number;
  amlMonitoringEnabled: boolean;
  accreditationRequired: boolean;
  defaultJurisdiction?: string;
}

export interface AllocationEngineConfig {
  defaultStrategy: AllocationStrategy;
  aiEnabled: boolean;
  rebalanceFrequency: 'hourly' | 'daily' | 'weekly';
  yieldUpdateFrequency: 'realtime' | 'hourly' | 'daily';
  maxSlippage: number;
}

export interface LiquidityConfig {
  minimumLiquidityBuffer: number; // Min % to keep liquid
  redemptionQueueProcessingFrequency: 'hourly' | 'daily';
  earlyRedemptionPenaltyRate: number;
  emergencyRedemptionEnabled: boolean;
}

export interface CrossChainConfig {
  enabledChains: ChainId[];
  defaultBridge?: string;
  maxBridgeFee: number;
  requireAuditedBridges: boolean;
  minSecurityScore: number;
}
