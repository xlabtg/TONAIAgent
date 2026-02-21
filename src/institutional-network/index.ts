/**
 * TONAIAgent - Global Institutional Network Module
 *
 * Comprehensive global institutional network integrating funds, banks, custodians,
 * liquidity providers, infrastructure partners, and fintech companies into the
 * TON AI ecosystem.
 *
 * The module positions the platform as:
 * - Institutional-grade AI asset management infrastructure
 * - Treasury automation layer
 * - Cross-border financial coordination system
 * - Next-generation decentralized capital network
 *
 * Built on The Open Network, this network bridges traditional finance
 * and AI-native autonomous systems.
 *
 * @example
 * ```typescript
 * import {
 *   createInstitutionalNetworkManager,
 *   InstitutionalPartnerType,
 * } from '@tonaiagent/core/institutional-network';
 *
 * // Create the institutional network manager
 * const network = createInstitutionalNetworkManager({
 *   partnerRegistry: { enabled: true },
 *   custodyInfrastructure: { enabled: true },
 *   liquidityNetwork: { enabled: true },
 *   treasuryInteroperability: { enabled: true },
 *   onboarding: { enabled: true },
 *   reporting: { enabled: true },
 *   expansion: { enabled: true },
 *   aiAdvantage: { enabled: true },
 *   governance: { enabled: true },
 * });
 *
 * // Register a new institutional partner
 * const partner = await network.partners.registerPartner({
 *   name: 'Acme Capital',
 *   legalName: 'Acme Capital LLC',
 *   type: 'hedge_fund',
 *   region: 'north_america',
 *   jurisdictions: ['US'],
 *   profile: { ... },
 *   capabilities: { ... },
 * });
 *
 * // Configure custody for the partner
 * const custody = await network.custody.createCustodyConfiguration({
 *   partnerId: partner.id,
 *   provider: 'mpc',
 *   securityLevel: 'institutional',
 * });
 *
 * // Add liquidity source
 * const source = await network.liquidity.addLiquiditySource({
 *   name: 'Primary Exchange',
 *   type: 'exchange',
 *   partnerId: partner.id,
 * });
 *
 * // Generate network report
 * const report = await network.reporting.generateReport(
 *   'network_overview',
 *   { type: 'monthly', startDate: new Date(), endDate: new Date() }
 * );
 * ```
 */

// Export all types
export * from './types';

// Export partner registry
export {
  DefaultPartnerRegistryManager,
  createPartnerRegistryManager,
  type PartnerRegistryManager,
  type RegisterPartnerRequest,
  type PartnerUpdates,
  type PartnerFilters,
  type PartnerComplianceAlert,
  type ComplianceIssue,
  type IntegrationHealthReport,
  type IntegrationIssue,
  type NetworkPartnerMetrics,
  type PartnerSummary,
  type PartnerPerformanceReport,
  type PartnerMatchResult,
  type RegistryHealth,
} from './partner-registry';

// Export custody infrastructure
export {
  DefaultCustodyInfrastructureManager,
  createCustodyInfrastructureManager,
  type CustodyInfrastructureManager,
  type CreateCustodyConfigRequest,
  type CustodyConfigUpdates,
  type CustodyConfigFilters,
  type MPCConfiguration,
  type HSMConfiguration,
  type ProofOfReservesReport,
  type DisasterRecoveryTestResult,
  type SecurityComplianceReport,
  type CustodyHealthReport,
} from './custody-infrastructure';

// Export liquidity network
export {
  DefaultLiquidityNetworkManager,
  createLiquidityNetworkManager,
  type LiquidityNetworkManager,
  type CreateLiquiditySourceRequest,
  type LiquiditySourceUpdates,
  type LiquiditySourceFilters,
  type TradeRequest,
  type TradeResult,
  type OptimalRoute,
  type RouteStep,
  type SpreadAnalysis,
  type LiquidityHealth,
} from './liquidity-network';

// Export treasury interoperability
export {
  DefaultTreasuryInteropManager,
  createTreasuryInteropManager,
  type TreasuryInteropManager,
  type ConnectTreasuryRequest,
  type TreasuryConnectionUpdates,
  type TreasuryPosition,
  type TreasuryOperation,
  type OperationApproval,
  type TreasuryHealthReport,
} from './treasury-interop';

// Export onboarding
export {
  DefaultOnboardingManager,
  createOnboardingManager,
  type OnboardingManager,
  type OnboardingMetrics,
  type OnboardingHealth,
} from './onboarding';

// Export reporting
export {
  DefaultInstitutionalReportingManager,
  createInstitutionalReportingManager,
  type InstitutionalReportingManager,
  type ReportFilters,
  type DashboardConfig,
  type DashboardData,
  type ReportingHealth,
} from './reporting';

// Export expansion
export {
  DefaultExpansionManager,
  createExpansionManager,
  type ExpansionManager,
  type CreateExpansionStrategyRequest,
  type ExpansionStrategyUpdates,
  type RegionalProgressReport,
  type ExpansionHealthReport,
} from './expansion';

// Export AI advantage
export {
  DefaultAIAdvantageManager,
  createAIAdvantageManager,
  type AIAdvantageManager,
  type AICapabilitiesConfig,
  type RiskModelingConfig,
  type RiskAssessmentResult,
  type OptimalAllocationResult,
  type AnomalyAlert,
  type PerformanceAnalysisResult,
  type ComplianceScanResult,
  type AIInsight,
  type AIHealthStatus,
} from './ai-advantage';

// Export governance
export {
  DefaultInstitutionalGovernanceManager,
  createInstitutionalGovernanceManager,
  type InstitutionalGovernanceManager,
  type CreateAdvisoryBoardRequest,
  type CreateCommitteeRequest,
  type CreatePolicyRequest,
  type PolicyUpdates,
  type CreateVotingMechanismRequest,
  type DecisionLogFilters,
  type GovernanceHealthReport,
} from './governance';

// ============================================================================
// Unified Institutional Network Manager
// ============================================================================

import { DefaultPartnerRegistryManager, createPartnerRegistryManager } from './partner-registry';
import { DefaultCustodyInfrastructureManager, createCustodyInfrastructureManager } from './custody-infrastructure';
import { DefaultLiquidityNetworkManager, createLiquidityNetworkManager } from './liquidity-network';
import { DefaultTreasuryInteropManager, createTreasuryInteropManager } from './treasury-interop';
import { DefaultOnboardingManager, createOnboardingManager } from './onboarding';
import { DefaultInstitutionalReportingManager, createInstitutionalReportingManager } from './reporting';
import { DefaultExpansionManager, createExpansionManager } from './expansion';
import { DefaultAIAdvantageManager, createAIAdvantageManager } from './ai-advantage';
import { DefaultInstitutionalGovernanceManager, createInstitutionalGovernanceManager } from './governance';
import {
  InstitutionalNetworkConfig,
  InstitutionalNetworkEvent,
  InstitutionalNetworkEventCallback,
  NetworkMetrics,
} from './types';

export interface InstitutionalNetworkManager {
  readonly partners: DefaultPartnerRegistryManager;
  readonly custody: DefaultCustodyInfrastructureManager;
  readonly liquidity: DefaultLiquidityNetworkManager;
  readonly treasury: DefaultTreasuryInteropManager;
  readonly onboarding: DefaultOnboardingManager;
  readonly reporting: DefaultInstitutionalReportingManager;
  readonly expansion: DefaultExpansionManager;
  readonly ai: DefaultAIAdvantageManager;
  readonly governance: DefaultInstitutionalGovernanceManager;

  // Unified event handling
  onEvent(callback: InstitutionalNetworkEventCallback): void;

  // Network-wide operations
  getNetworkMetrics(): Promise<NetworkMetrics>;
  getNetworkHealth(): NetworkHealth;

  // Convenience methods
  initializeNetwork(name: string, config?: Partial<InstitutionalNetworkConfig>): Promise<NetworkInitializationResult>;
}

export interface NetworkHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentHealth[];
  issues: string[];
  lastCheckedAt: Date;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: string;
}

export interface NetworkInitializationResult {
  networkId: string;
  partnersEnabled: boolean;
  custodyEnabled: boolean;
  liquidityEnabled: boolean;
  treasuryEnabled: boolean;
  onboardingEnabled: boolean;
  reportingEnabled: boolean;
  expansionEnabled: boolean;
  aiEnabled: boolean;
  governanceEnabled: boolean;
}

export class DefaultInstitutionalNetworkManager implements InstitutionalNetworkManager {
  readonly partners: DefaultPartnerRegistryManager;
  readonly custody: DefaultCustodyInfrastructureManager;
  readonly liquidity: DefaultLiquidityNetworkManager;
  readonly treasury: DefaultTreasuryInteropManager;
  readonly onboarding: DefaultOnboardingManager;
  readonly reporting: DefaultInstitutionalReportingManager;
  readonly expansion: DefaultExpansionManager;
  readonly ai: DefaultAIAdvantageManager;
  readonly governance: DefaultInstitutionalGovernanceManager;

  private readonly eventCallbacks: InstitutionalNetworkEventCallback[] = [];

  constructor(config?: Partial<InstitutionalNetworkConfig>) {

    // Initialize all sub-managers
    this.partners = createPartnerRegistryManager(config?.partnerRegistry);
    this.custody = createCustodyInfrastructureManager(config?.custodyInfrastructure);
    this.liquidity = createLiquidityNetworkManager(config?.liquidityNetwork);
    this.treasury = createTreasuryInteropManager(config?.treasuryInteroperability);
    this.onboarding = createOnboardingManager(config?.onboarding);
    this.reporting = createInstitutionalReportingManager(config?.reporting);
    this.expansion = createExpansionManager(config?.expansion);
    this.ai = createAIAdvantageManager(config?.aiAdvantage);
    this.governance = createInstitutionalGovernanceManager(config?.governance);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  onEvent(callback: InstitutionalNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    // Collect metrics from all components
    const partnerMetrics = await this.partners.getNetworkMetrics();
    const liquidityHealth = this.liquidity.getHealth();
    const custodyHealth = this.custody.getHealth();

    return {
      timestamp: new Date(),
      partners: {
        totalPartners: partnerMetrics.totalPartners,
        activePartners: partnerMetrics.activePartners,
        partnersByType: partnerMetrics.partnersByType,
        partnersByTier: partnerMetrics.partnersByTier,
        partnersByRegion: partnerMetrics.partnersByRegion,
        newPartnersThisPeriod: 0,
        churnedPartnersThisPeriod: 0,
        averagePartnerTenure: 0,
        averagePartnerSatisfaction: partnerMetrics.averageSatisfactionScore,
      },
      liquidity: {
        totalLiquiditySources: liquidityHealth.sourceCount || 0,
        activeLiquiditySources: liquidityHealth.sourceCount || 0,
        totalAvailableLiquidity: '0',
        averageSpread: 0,
        averageDepth: '0',
        totalVolume24h: '0',
        totalVolume7d: '0',
        totalVolume30d: '0',
        fillRate: 0,
        averageSlippage: 0,
        uptime: 99.9,
      },
      custody: {
        totalCustodyProviders: custodyHealth.configurationCount || 0,
        totalAssetsUnderCustody: '0',
        aucChange24h: 0,
        aucChange7d: 0,
        aucChange30d: 0,
        averageSecurityScore: 0,
        insuranceCoverage: '0',
        proofOfReservesCompliant: custodyHealth.configurationCount || 0,
        incidentsThisPeriod: 0,
      },
      volume: {
        totalVolume: partnerMetrics.totalVolume,
        volumeByAsset: {},
        volumeByPartner: {},
        volumeByRegion: {},
        transactionCount: 0,
        averageTransactionSize: '0',
        largestTransaction: '0',
        volumeTrend: 'stable',
      },
      performance: {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        uptime: 99.9,
        errorRate: 0,
        throughput: 0,
        successRate: 100,
        averageSettlementTime: 0,
      },
      risk: {
        overallRiskScore: 0,
        riskByCategory: {},
        concentrationRisk: {
          topPartnerConcentration: 0,
          topAssetConcentration: 0,
          topRegionConcentration: 0,
          herfindahlIndex: 0,
          riskLevel: 'low',
        },
        counterpartyRisk: {
          averageCounterpartyRating: 0,
          highRiskCounterparties: 0,
          exposureToHighRisk: '0',
          defaultProbability: 0,
          riskLevel: 'low',
        },
        operationalRisk: {
          incidentCount: 0,
          averageResolutionTime: 0,
          systemAvailability: 99.9,
          processFailureRate: 0,
          riskLevel: 'low',
        },
        marketRisk: {
          volatility: 0,
          beta: 0,
          var95: '0',
          var99: '0',
          maxDrawdown: 0,
          riskLevel: 'low',
        },
        openIssues: 0,
        criticalIssues: 0,
      },
      compliance: {
        overallComplianceScore: 100,
        partnersFullyCompliant: partnerMetrics.activePartners,
        partnersPartiallyCompliant: 0,
        partnersNonCompliant: 0,
        pendingKyc: 0,
        expiringKyc: 0,
        amlAlerts: 0,
        sanctionsMatches: 0,
        regulatoryIssues: 0,
      },
    };
  }

  getNetworkHealth(): NetworkHealth {
    const components: ComponentHealth[] = [];
    const issues: string[] = [];

    // Check partner registry health
    const partnerHealth = this.partners.getHealth();
    components.push({
      name: 'Partner Registry',
      status: partnerHealth.status,
      details: partnerHealth.issues.join(', ') || undefined,
    });
    if (partnerHealth.status !== 'healthy') {
      issues.push(...partnerHealth.issues.map((i: string) => `Partner Registry: ${i}`));
    }

    // Check custody health
    const custodyHealth = this.custody.getHealth();
    components.push({
      name: 'Custody Infrastructure',
      status: custodyHealth.status,
      details: custodyHealth.issues.join(', ') || undefined,
    });
    if (custodyHealth.status !== 'healthy') {
      issues.push(...custodyHealth.issues.map((i: string) => `Custody: ${i}`));
    }

    // Check liquidity health
    const liquidityHealth = this.liquidity.getHealth();
    components.push({
      name: 'Liquidity Network',
      status: liquidityHealth.status,
      details: liquidityHealth.issues.join(', ') || undefined,
    });
    if (liquidityHealth.status !== 'healthy') {
      issues.push(...liquidityHealth.issues.map((i: string) => `Liquidity: ${i}`));
    }

    // Check treasury health
    const treasuryHealth = this.treasury.getHealth();
    components.push({
      name: 'Treasury Interoperability',
      status: treasuryHealth.status,
      details: treasuryHealth.issues.join(', ') || undefined,
    });
    if (treasuryHealth.status !== 'healthy') {
      issues.push(...treasuryHealth.issues.map((i: string) => `Treasury: ${i}`));
    }

    // Check onboarding health
    const onboardingHealth = this.onboarding.getHealth();
    components.push({
      name: 'Onboarding',
      status: onboardingHealth.status,
      details: onboardingHealth.issues.join(', ') || undefined,
    });
    if (onboardingHealth.status !== 'healthy') {
      issues.push(...onboardingHealth.issues.map((i: string) => `Onboarding: ${i}`));
    }

    // Check reporting health
    const reportingHealth = this.reporting.getReportingHealth();
    components.push({
      name: 'Reporting',
      status: reportingHealth.status,
      details: reportingHealth.issues?.join(', ') || undefined,
    });
    if (reportingHealth.status !== 'healthy' && reportingHealth.issues) {
      issues.push(...reportingHealth.issues.map((i: string) => `Reporting: ${i}`));
    }

    // Check expansion health
    const expansionHealth = this.expansion.getHealth();
    components.push({
      name: 'Expansion',
      status: expansionHealth.status,
      details: expansionHealth.issues.join(', ') || undefined,
    });
    if (expansionHealth.status !== 'healthy') {
      issues.push(...expansionHealth.issues.map((i: string) => `Expansion: ${i}`));
    }

    // Check AI health
    const aiHealth = this.ai.getAIHealth();
    components.push({
      name: 'AI Advantage',
      status: aiHealth.status,
      details: aiHealth.issues?.join(', ') || undefined,
    });
    if (aiHealth.status !== 'healthy' && aiHealth.issues) {
      issues.push(...aiHealth.issues.map((i: string) => `AI: ${i}`));
    }

    // Check governance health
    const governanceHealth = this.governance.getGovernanceHealth();
    components.push({
      name: 'Governance',
      status: governanceHealth.status,
      details: governanceHealth.issues?.map((i) => i.description).join(', ') || undefined,
    });
    if (governanceHealth.status !== 'healthy' && governanceHealth.issues) {
      issues.push(...governanceHealth.issues.map((i) => `Governance: ${i.description}`));
    }

    // Determine overall status
    const unhealthyCount = components.filter((c) => c.status === 'unhealthy').length;
    const degradedCount = components.filter((c) => c.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      components,
      issues,
      lastCheckedAt: new Date(),
    };
  }

  async initializeNetwork(
    _name: string,
    config?: Partial<InstitutionalNetworkConfig>
  ): Promise<NetworkInitializationResult> {
    const networkId = `network_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize governance structure
    if (config?.governance?.enabled !== false) {
      await this.governance.initializeGovernance(networkId, {
        type: 'hybrid',
        tiers: [],
        decisionAuthority: [],
        escalationPath: [],
      });
    }

    return {
      networkId,
      partnersEnabled: config?.partnerRegistry?.enabled !== false,
      custodyEnabled: config?.custodyInfrastructure?.enabled !== false,
      liquidityEnabled: config?.liquidityNetwork?.enabled !== false,
      treasuryEnabled: config?.treasuryInteroperability?.enabled !== false,
      onboardingEnabled: config?.onboarding?.enabled !== false,
      reportingEnabled: config?.reporting?.enabled !== false,
      expansionEnabled: config?.expansion?.enabled !== false,
      aiEnabled: config?.aiAdvantage?.enabled !== false,
      governanceEnabled: config?.governance?.enabled !== false,
    };
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: InstitutionalNetworkEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.partners.onEvent(forwardEvent);
    this.custody.onEvent(forwardEvent);
    this.liquidity.onEvent(forwardEvent);
    this.treasury.onEvent(forwardEvent);
    this.onboarding.onEvent(forwardEvent);
    this.reporting.onEvent(forwardEvent);
    this.expansion.onEvent(forwardEvent);
    this.ai.onEvent(forwardEvent);
    this.governance.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createInstitutionalNetworkManager(
  config?: Partial<InstitutionalNetworkConfig>
): DefaultInstitutionalNetworkManager {
  return new DefaultInstitutionalNetworkManager(config);
}

// Default export
export default DefaultInstitutionalNetworkManager;
