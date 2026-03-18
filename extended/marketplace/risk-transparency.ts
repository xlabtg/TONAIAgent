/**
 * TONAIAgent - Risk Transparency Module
 *
 * Implements risk disclosure, worst-case scenarios, exposure analysis,
 * historical drawdowns, smart contract risk assessment, warnings,
 * automatic safeguards, and capital caps.
 */

import {
  Strategy,
  StrategyRiskProfile,
  TradingAgent,
  CopyTradingPosition,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Risk Transparency Manager Interface
// ============================================================================

export interface RiskTransparencyManager {
  // Risk assessment
  assessStrategyRisk(strategy: Strategy): Promise<RiskAssessment>;
  assessAgentRisk(agentId: string): Promise<RiskAssessment>;
  assessCopyRisk(position: CopyTradingPosition, agent: TradingAgent): Promise<CopyRiskAssessment>;

  // Risk disclosures
  generateRiskDisclosure(strategyId: string): Promise<RiskDisclosure>;
  generateWorstCaseScenario(strategyId: string, capital: number): Promise<WorstCaseScenario>;

  // Exposure analysis
  analyzeExposure(agentId: string): Promise<ExposureAnalysis>;
  analyzeLiquidityRisk(agentId: string): Promise<LiquidityRiskAnalysis>;

  // Smart contract risk
  assessSmartContractRisk(protocols: string[]): Promise<SmartContractRiskAssessment>;

  // Capital caps
  calculateCapitalCap(userId: string, riskLevel: string): Promise<CapitalCap>;
  enforceCapitalCap(userId: string, proposedCapital: number, riskLevel: string): CapitalCapResult;

  // Warnings and safeguards
  getWarnings(strategyId: string): Promise<RiskWarning[]>;
  checkSafeguards(agentId: string, action: ProposedAction): Promise<SafeguardCheckResult>;

  // User acknowledgments
  recordAcknowledgment(userId: string, riskId: string, type: AcknowledgmentType): Promise<void>;
  hasAcknowledged(userId: string, riskId: string): Promise<boolean>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Types
// ============================================================================

export interface RiskAssessment {
  id: string;
  entityType: 'strategy' | 'agent';
  entityId: string;
  overallRisk: RiskLevel;
  components: RiskComponent[];
  score: number; // 0-100, higher = more risky
  warnings: RiskWarning[];
  recommendations: string[];
  assessedAt: Date;
  validUntil: Date;
}

export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'extreme';

export interface RiskComponent {
  name: string;
  category: RiskCategory;
  level: RiskLevel;
  score: number;
  description: string;
  mitigations?: string[];
}

export type RiskCategory =
  | 'market'
  | 'liquidity'
  | 'smart_contract'
  | 'protocol'
  | 'operational'
  | 'counterparty'
  | 'regulatory';

export interface CopyRiskAssessment extends RiskAssessment {
  correlationRisk: number;
  slippageRisk: number;
  agentReliabilityScore: number;
  capitalAtRisk: number;
  maxPotentialLoss: number;
}

export interface RiskDisclosure {
  id: string;
  strategyId: string;
  version: string;
  generalWarnings: string[];
  specificRisks: SpecificRisk[];
  historicalDrawdowns: DrawdownEvent[];
  worstCaseScenarios: WorstCaseScenario[];
  requiredAcknowledgments: AcknowledgmentRequirement[];
  lastUpdated: Date;
}

export interface SpecificRisk {
  id: string;
  name: string;
  category: RiskCategory;
  description: string;
  likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
  impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic';
  mitigations: string[];
}

export interface DrawdownEvent {
  startDate: Date;
  endDate: Date;
  maxDrawdown: number;
  recoveryDays?: number;
  cause?: string;
}

export interface WorstCaseScenario {
  scenario: string;
  probability: number;
  potentialLoss: number;
  potentialLossPercent: number;
  description: string;
  triggers: string[];
  protections: string[];
}

export interface AcknowledgmentRequirement {
  id: string;
  type: AcknowledgmentType;
  text: string;
  required: boolean;
}

export type AcknowledgmentType = 'risk_disclosure' | 'loss_potential' | 'volatility' | 'smart_contract' | 'regulatory';

export interface ExposureAnalysis {
  agentId: string;
  totalExposure: number;
  exposureByToken: TokenExposure[];
  exposureByProtocol: ProtocolExposure[];
  concentrationRisk: number;
  diversificationScore: number;
  recommendations: string[];
  analyzedAt: Date;
}

export interface TokenExposure {
  token: string;
  amount: number;
  valueInTon: number;
  percentage: number;
  volatility24h: number;
  riskLevel: RiskLevel;
}

export interface ProtocolExposure {
  protocol: string;
  valueInTon: number;
  percentage: number;
  tvl?: number;
  auditStatus: 'audited' | 'unaudited' | 'partial';
  riskLevel: RiskLevel;
}

export interface LiquidityRiskAnalysis {
  agentId: string;
  overallLiquidityScore: number; // 0-100, higher = more liquid
  exitTimeEstimate: number; // hours to exit all positions
  slippageEstimate: number; // percentage
  illiquidPositions: IlliquidPosition[];
  recommendations: string[];
}

export interface IlliquidPosition {
  token: string;
  amount: number;
  estimatedSlippage: number;
  liquidityDepth: number;
  exitTimeHours: number;
}

export interface SmartContractRiskAssessment {
  protocols: ProtocolRisk[];
  overallRisk: RiskLevel;
  score: number;
  unauditedCount: number;
  highRiskCount: number;
  recommendations: string[];
}

export interface ProtocolRisk {
  protocol: string;
  riskLevel: RiskLevel;
  score: number;
  audits: AuditRecord[];
  knownIssues: KnownIssue[];
  tvl?: number;
  age: number; // days since launch
  incidents: SecurityIncident[];
}

export interface AuditRecord {
  auditor: string;
  date: Date;
  score?: number;
  reportUrl?: string;
}

export interface KnownIssue {
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'mitigated' | 'resolved';
}

export interface SecurityIncident {
  date: Date;
  type: string;
  lossAmount?: number;
  description: string;
  resolved: boolean;
}

export interface CapitalCap {
  userId: string;
  riskLevel: string;
  maxCapitalPercent: number;
  maxAbsoluteCapital: number;
  currentAllocation: number;
  remainingCapacity: number;
  factors: CapitalCapFactor[];
}

export interface CapitalCapFactor {
  name: string;
  adjustment: number;
  reason: string;
}

export interface CapitalCapResult {
  allowed: boolean;
  proposedCapital: number;
  maxAllowed: number;
  excess?: number;
  reason?: string;
}

export interface RiskWarning {
  id: string;
  severity: 'info' | 'caution' | 'warning' | 'danger';
  category: RiskCategory;
  title: string;
  message: string;
  actionRequired?: string;
  dismissible: boolean;
}

export interface ProposedAction {
  type: 'deploy' | 'increase_capital' | 'follow_agent' | 'change_settings';
  targetId: string;
  amount?: number;
  parameters?: Record<string, unknown>;
}

export interface SafeguardCheckResult {
  allowed: boolean;
  safeguards: SafeguardResult[];
  overallRisk: RiskLevel;
  recommendations: string[];
  requiresApproval: boolean;
  approvalReason?: string;
}

export interface SafeguardResult {
  name: string;
  passed: boolean;
  reason?: string;
  threshold?: number;
  actual?: number;
}

// ============================================================================
// Default Risk Transparency Manager Implementation
// ============================================================================

export class DefaultRiskTransparencyManager implements RiskTransparencyManager {
  private readonly assessments: Map<string, RiskAssessment> = new Map();
  private readonly disclosures: Map<string, RiskDisclosure> = new Map();
  private readonly acknowledgments: Map<string, Set<string>> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: RiskTransparencyConfig;

  // Simulated protocol risk data
  private readonly protocolRiskData: Map<string, ProtocolRisk> = new Map();

  constructor(config?: Partial<RiskTransparencyConfig>) {
    this.config = {
      assessmentValidityHours: config?.assessmentValidityHours ?? 24,
      maxRiskLevelAllowed: config?.maxRiskLevelAllowed ?? 'high',
      requireWarningsAcknowledgment: config?.requireWarningsAcknowledgment ?? true,
      capitalCaps: config?.capitalCaps ?? [
        { riskLevel: 'low', maxCapitalPercent: 50, maxAbsoluteCapital: 100000 },
        { riskLevel: 'moderate', maxCapitalPercent: 30, maxAbsoluteCapital: 50000 },
        { riskLevel: 'high', maxCapitalPercent: 15, maxAbsoluteCapital: 25000 },
        { riskLevel: 'extreme', maxCapitalPercent: 5, maxAbsoluteCapital: 10000 },
      ],
      safeguardThresholds: config?.safeguardThresholds ?? {
        maxDrawdown: 30,
        maxConcentration: 40,
        minLiquidity: 80,
        maxVolatility: 50,
      },
    };

    this.initializeProtocolRiskData();
  }

  async assessStrategyRisk(strategy: Strategy): Promise<RiskAssessment> {
    const assessmentId = this.generateId('assessment');
    const now = new Date();

    const components: RiskComponent[] = [];
    let totalScore = 0;
    const warnings: RiskWarning[] = [];

    // Market risk from volatility
    const marketRisk = this.assessMarketRisk(strategy.riskProfile);
    components.push(marketRisk);
    totalScore += marketRisk.score * 0.25;

    // Liquidity risk
    const liquidityRisk = this.assessLiquidityRiskFromStrategy(strategy);
    components.push(liquidityRisk);
    totalScore += liquidityRisk.score * 0.20;

    // Smart contract risk from protocols
    const scRisk = await this.assessSmartContractRiskComponent(strategy.config.supportedProtocols);
    components.push(scRisk);
    totalScore += scRisk.score * 0.25;

    // Operational risk
    const operationalRisk = this.assessOperationalRisk(strategy);
    components.push(operationalRisk);
    totalScore += operationalRisk.score * 0.15;

    // Protocol risk
    const protocolRisk = this.assessProtocolRisk(strategy.config.supportedProtocols);
    components.push(protocolRisk);
    totalScore += protocolRisk.score * 0.15;

    // Generate warnings from profile
    warnings.push(...this.generateWarningsFromRiskProfile(strategy.riskProfile));
    warnings.push(...strategy.riskProfile.warnings.map((w, i) => ({
      id: `warn_${i}`,
      severity: 'warning' as const,
      category: 'market' as RiskCategory,
      title: 'Strategy Warning',
      message: w,
      dismissible: false,
    })));

    const overallRisk = this.scoreToRiskLevel(totalScore);

    const assessment: RiskAssessment = {
      id: assessmentId,
      entityType: 'strategy',
      entityId: strategy.id,
      overallRisk,
      components,
      score: totalScore,
      warnings,
      recommendations: this.generateRecommendations(components, totalScore),
      assessedAt: now,
      validUntil: new Date(now.getTime() + this.config.assessmentValidityHours * 60 * 60 * 1000),
    };

    this.assessments.set(assessmentId, assessment);
    return assessment;
  }

  async assessAgentRisk(agentId: string): Promise<RiskAssessment> {
    // Create a placeholder assessment - in production would fetch agent data
    const assessmentId = this.generateId('assessment');
    const now = new Date();

    const assessment: RiskAssessment = {
      id: assessmentId,
      entityType: 'agent',
      entityId: agentId,
      overallRisk: 'moderate',
      components: [
        {
          name: 'Market Exposure',
          category: 'market',
          level: 'moderate',
          score: 45,
          description: 'Agent has moderate market exposure',
        },
        {
          name: 'Liquidity',
          category: 'liquidity',
          level: 'low',
          score: 25,
          description: 'Positions are generally liquid',
        },
      ],
      score: 35,
      warnings: [],
      recommendations: ['Consider diversifying across more protocols'],
      assessedAt: now,
      validUntil: new Date(now.getTime() + this.config.assessmentValidityHours * 60 * 60 * 1000),
    };

    this.assessments.set(assessmentId, assessment);
    return assessment;
  }

  async assessCopyRisk(position: CopyTradingPosition, agent: TradingAgent): Promise<CopyRiskAssessment> {
    const baseAssessment = await this.assessAgentRisk(agent.id);

    const correlationRisk = 0.3; // Placeholder - would calculate actual correlation
    const slippageRisk = position.config.slippageProtection / 100;
    const agentReliabilityScore = agent.reputation.reliabilityScore;
    const capitalAtRisk = position.config.capitalAllocated;
    const maxPotentialLoss = capitalAtRisk * (position.riskControls.maxDrawdown / 100);

    return {
      ...baseAssessment,
      correlationRisk,
      slippageRisk,
      agentReliabilityScore,
      capitalAtRisk,
      maxPotentialLoss,
    };
  }

  async generateRiskDisclosure(strategyId: string): Promise<RiskDisclosure> {
    const disclosureId = this.generateId('disclosure');
    const now = new Date();

    const disclosure: RiskDisclosure = {
      id: disclosureId,
      strategyId,
      version: '1.0',
      generalWarnings: [
        'Past performance does not guarantee future results.',
        'You may lose some or all of your invested capital.',
        'Cryptocurrency markets are highly volatile and unpredictable.',
        'This strategy involves automated trading which carries additional risks.',
        'Smart contract risks may result in loss of funds.',
      ],
      specificRisks: [
        {
          id: 'market_volatility',
          name: 'Market Volatility',
          category: 'market',
          description: 'Cryptocurrency markets can experience extreme price swings',
          likelihood: 'likely',
          impact: 'major',
          mitigations: ['Stop-loss orders', 'Position sizing limits', 'Diversification'],
        },
        {
          id: 'liquidity_risk',
          name: 'Liquidity Risk',
          category: 'liquidity',
          description: 'Some tokens may have limited liquidity during market stress',
          likelihood: 'possible',
          impact: 'moderate',
          mitigations: ['Liquidity checks before trading', 'Maximum position sizes'],
        },
        {
          id: 'smart_contract_risk',
          name: 'Smart Contract Risk',
          category: 'smart_contract',
          description: 'Bugs or exploits in smart contracts could result in loss of funds',
          likelihood: 'unlikely',
          impact: 'catastrophic',
          mitigations: ['Only use audited protocols', 'Diversify across protocols'],
        },
      ],
      historicalDrawdowns: [], // Would be populated from actual history
      worstCaseScenarios: [
        {
          scenario: 'Total Strategy Loss',
          probability: 0.01,
          potentialLoss: 100,
          potentialLossPercent: 100,
          description: 'Complete loss of invested capital due to black swan event',
          triggers: ['Protocol exploit', 'Market crash', 'Regulatory action'],
          protections: ['Stop-loss', 'Capital limits', 'Emergency pause'],
        },
        {
          scenario: 'Significant Drawdown',
          probability: 0.10,
          potentialLoss: 50,
          potentialLossPercent: 50,
          description: '50% loss of capital during adverse market conditions',
          triggers: ['Market correction', 'Protocol issues'],
          protections: ['Risk controls', 'Auto-rebalancing'],
        },
      ],
      requiredAcknowledgments: [
        {
          id: 'ack_risk_disclosure',
          type: 'risk_disclosure',
          text: 'I have read and understood the risk disclosure',
          required: true,
        },
        {
          id: 'ack_loss_potential',
          type: 'loss_potential',
          text: 'I understand I may lose some or all of my invested capital',
          required: true,
        },
        {
          id: 'ack_volatility',
          type: 'volatility',
          text: 'I understand cryptocurrency markets are highly volatile',
          required: true,
        },
      ],
      lastUpdated: now,
    };

    this.disclosures.set(strategyId, disclosure);
    return disclosure;
  }

  async generateWorstCaseScenario(_strategyId: string, capital: number): Promise<WorstCaseScenario> {
    // Calculate worst case based on capital
    return {
      scenario: 'Maximum Loss Scenario',
      probability: 0.05,
      potentialLoss: capital,
      potentialLossPercent: 100,
      description: `Under extreme market conditions, you could lose your entire ${capital} TON investment`,
      triggers: [
        'Protocol hack or exploit',
        'Market crash >90%',
        'Regulatory shutdown',
        'Smart contract vulnerability',
      ],
      protections: [
        'Stop-loss at configured threshold',
        'Emergency pause capability',
        'Capital allocation limits',
        'Diversification requirements',
      ],
    };
  }

  async analyzeExposure(agentId: string): Promise<ExposureAnalysis> {
    // Placeholder exposure analysis - would be populated from actual positions
    const now = new Date();

    return {
      agentId,
      totalExposure: 10000,
      exposureByToken: [
        { token: 'TON', amount: 5000, valueInTon: 5000, percentage: 50, volatility24h: 3.5, riskLevel: 'low' },
        { token: 'USDT', amount: 3000, valueInTon: 3000, percentage: 30, volatility24h: 0.1, riskLevel: 'minimal' },
        { token: 'JETTON1', amount: 2000, valueInTon: 2000, percentage: 20, volatility24h: 15.2, riskLevel: 'high' },
      ],
      exposureByProtocol: [
        { protocol: 'DeDust', valueInTon: 4000, percentage: 40, tvl: 50000000, auditStatus: 'audited', riskLevel: 'low' },
        { protocol: 'STON.fi', valueInTon: 3500, percentage: 35, tvl: 30000000, auditStatus: 'audited', riskLevel: 'low' },
        { protocol: 'Other DEX', valueInTon: 2500, percentage: 25, auditStatus: 'partial', riskLevel: 'moderate' },
      ],
      concentrationRisk: 40, // 50% in single token
      diversificationScore: 65,
      recommendations: [
        'Consider reducing TON concentration below 40%',
        'Add exposure to stablecoin yield strategies',
        'Monitor JETTON1 volatility closely',
      ],
      analyzedAt: now,
    };
  }

  async analyzeLiquidityRisk(agentId: string): Promise<LiquidityRiskAnalysis> {
    return {
      agentId,
      overallLiquidityScore: 75,
      exitTimeEstimate: 2.5, // hours
      slippageEstimate: 0.8, // percent
      illiquidPositions: [
        {
          token: 'JETTON1',
          amount: 2000,
          estimatedSlippage: 3.5,
          liquidityDepth: 10000,
          exitTimeHours: 4,
        },
      ],
      recommendations: [
        'Consider reducing position in JETTON1 due to low liquidity',
        'Exit illiquid positions during high-volume periods',
      ],
    };
  }

  async assessSmartContractRisk(protocols: string[]): Promise<SmartContractRiskAssessment> {
    const protocolRisks: ProtocolRisk[] = [];
    let totalScore = 0;
    let unauditedCount = 0;
    let highRiskCount = 0;

    for (const protocol of protocols) {
      const risk = this.protocolRiskData.get(protocol) ?? this.createDefaultProtocolRisk(protocol);
      protocolRisks.push(risk);
      totalScore += risk.score;
      if (risk.audits.length === 0) unauditedCount++;
      if (risk.riskLevel === 'high' || risk.riskLevel === 'extreme') highRiskCount++;
    }

    const avgScore = protocols.length > 0 ? totalScore / protocols.length : 50;
    const overallRisk = this.scoreToRiskLevel(avgScore);

    return {
      protocols: protocolRisks,
      overallRisk,
      score: avgScore,
      unauditedCount,
      highRiskCount,
      recommendations: [
        ...(unauditedCount > 0 ? [`${unauditedCount} unaudited protocol(s) detected - consider reducing exposure`] : []),
        ...(highRiskCount > 0 ? [`${highRiskCount} high-risk protocol(s) - apply strict capital limits`] : []),
      ],
    };
  }

  async calculateCapitalCap(userId: string, riskLevel: string): Promise<CapitalCap> {
    const capConfig = this.config.capitalCaps.find(c => c.riskLevel === riskLevel)
      ?? { riskLevel, maxCapitalPercent: 10, maxAbsoluteCapital: 10000 };

    // In production, would fetch user's total capital and current allocation
    const userTotalCapital = 100000; // Placeholder
    const currentAllocation = 20000; // Placeholder

    const maxByPercent = userTotalCapital * (capConfig.maxCapitalPercent / 100);
    const effectiveMax = Math.min(maxByPercent, capConfig.maxAbsoluteCapital);
    const remainingCapacity = Math.max(0, effectiveMax - currentAllocation);

    return {
      userId,
      riskLevel,
      maxCapitalPercent: capConfig.maxCapitalPercent,
      maxAbsoluteCapital: capConfig.maxAbsoluteCapital,
      currentAllocation,
      remainingCapacity,
      factors: [
        { name: 'Risk Level', adjustment: capConfig.maxCapitalPercent / 100, reason: `${riskLevel} risk level` },
        { name: 'Absolute Cap', adjustment: capConfig.maxAbsoluteCapital, reason: 'Platform maximum' },
      ],
    };
  }

  enforceCapitalCap(_userId: string, proposedCapital: number, riskLevel: string): CapitalCapResult {
    const capConfig = this.config.capitalCaps.find(c => c.riskLevel === riskLevel)
      ?? { riskLevel, maxCapitalPercent: 10, maxAbsoluteCapital: 10000 };

    const maxAllowed = capConfig.maxAbsoluteCapital;

    if (proposedCapital <= maxAllowed) {
      return {
        allowed: true,
        proposedCapital,
        maxAllowed,
      };
    }

    return {
      allowed: false,
      proposedCapital,
      maxAllowed,
      excess: proposedCapital - maxAllowed,
      reason: `Capital exceeds maximum allowed for ${riskLevel} risk level`,
    };
  }

  async getWarnings(strategyId: string): Promise<RiskWarning[]> {
    const disclosure = this.disclosures.get(strategyId);
    if (!disclosure) {
      return [
        {
          id: 'no_disclosure',
          severity: 'danger',
          category: 'operational',
          title: 'No Risk Disclosure',
          message: 'This strategy has not been assessed for risk',
          dismissible: false,
        },
      ];
    }

    return disclosure.specificRisks.map(risk => ({
      id: risk.id,
      severity: this.impactToSeverity(risk.impact),
      category: risk.category,
      title: risk.name,
      message: risk.description,
      dismissible: true,
    }));
  }

  async checkSafeguards(_agentId: string, _action: ProposedAction): Promise<SafeguardCheckResult> {
    const safeguards: SafeguardResult[] = [];
    const thresholds = this.config.safeguardThresholds;

    // Check drawdown limit
    safeguards.push({
      name: 'Maximum Drawdown',
      passed: true, // Would check actual drawdown
      threshold: thresholds.maxDrawdown,
      actual: 15, // Placeholder
    });

    // Check concentration
    safeguards.push({
      name: 'Concentration Limit',
      passed: true, // Would check actual concentration
      threshold: thresholds.maxConcentration,
      actual: 30, // Placeholder
    });

    // Check liquidity
    safeguards.push({
      name: 'Minimum Liquidity',
      passed: true, // Would check actual liquidity
      threshold: thresholds.minLiquidity,
      actual: 85, // Placeholder
    });

    // Check volatility
    safeguards.push({
      name: 'Volatility Limit',
      passed: true, // Would check actual volatility
      threshold: thresholds.maxVolatility,
      actual: 35, // Placeholder
    });

    const allPassed = safeguards.every(s => s.passed);
    const failedSafeguards = safeguards.filter(s => !s.passed);

    return {
      allowed: allPassed,
      safeguards,
      overallRisk: allPassed ? 'low' : 'high',
      recommendations: failedSafeguards.map(s => `Address ${s.name} (current: ${s.actual}, limit: ${s.threshold})`),
      requiresApproval: !allPassed,
      approvalReason: !allPassed ? 'Safeguard violations require manual review' : undefined,
    };
  }

  async recordAcknowledgment(userId: string, riskId: string, type: AcknowledgmentType): Promise<void> {
    let userAcks = this.acknowledgments.get(userId);
    if (!userAcks) {
      userAcks = new Set();
      this.acknowledgments.set(userId, userAcks);
    }
    userAcks.add(`${riskId}:${type}`);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'copy_started', // Using available event type
      severity: 'info',
      source: 'risk_transparency',
      message: `User ${userId} acknowledged risk ${riskId}`,
      data: { userId, riskId, type },
    });
  }

  async hasAcknowledged(userId: string, riskId: string): Promise<boolean> {
    const userAcks = this.acknowledgments.get(userId);
    if (!userAcks) return false;

    // Check if any acknowledgment type exists for this risk
    return Array.from(userAcks).some(ack => ack.startsWith(`${riskId}:`));
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializeProtocolRiskData(): void {
    // Initialize known protocol risk data
    this.protocolRiskData.set('DeDust', {
      protocol: 'DeDust',
      riskLevel: 'low',
      score: 20,
      audits: [{ auditor: 'CertiK', date: new Date('2024-01-15'), score: 92 }],
      knownIssues: [],
      tvl: 50000000,
      age: 500,
      incidents: [],
    });

    this.protocolRiskData.set('STON.fi', {
      protocol: 'STON.fi',
      riskLevel: 'low',
      score: 25,
      audits: [{ auditor: 'Trail of Bits', date: new Date('2024-02-01'), score: 88 }],
      knownIssues: [],
      tvl: 30000000,
      age: 400,
      incidents: [],
    });
  }

  private createDefaultProtocolRisk(protocol: string): ProtocolRisk {
    return {
      protocol,
      riskLevel: 'moderate',
      score: 50,
      audits: [],
      knownIssues: [{ severity: 'info', description: 'No audit information available', status: 'open' }],
      age: 0,
      incidents: [],
    };
  }

  private assessMarketRisk(profile: StrategyRiskProfile): RiskComponent {
    // Map strategy risk level to RiskLevel ('medium' -> 'moderate')
    const riskLevelMap: Record<string, RiskLevel> = {
      low: 'low',
      medium: 'moderate',
      high: 'high',
      extreme: 'extreme',
    };
    return {
      name: 'Market Risk',
      category: 'market',
      level: riskLevelMap[profile.riskLevel] ?? 'moderate',
      score: profile.volatilityScore,
      description: `Volatility score: ${profile.volatilityScore}/100. Max drawdown: ${profile.maxDrawdown}%`,
      mitigations: ['Stop-loss orders', 'Position sizing', 'Diversification'],
    };
  }

  private assessLiquidityRiskFromStrategy(strategy: Strategy): RiskComponent {
    const level = strategy.riskProfile.liquidityRisk;
    const scoreMap: Record<string, number> = { low: 20, medium: 50, high: 80 };

    return {
      name: 'Liquidity Risk',
      category: 'liquidity',
      level: level === 'low' ? 'low' : level === 'medium' ? 'moderate' : 'high',
      score: scoreMap[level],
      description: `Liquidity risk is ${level}`,
      mitigations: ['Trade in liquid markets', 'Limit position sizes'],
    };
  }

  private async assessSmartContractRiskComponent(protocols: string[]): Promise<RiskComponent> {
    const assessment = await this.assessSmartContractRisk(protocols);

    return {
      name: 'Smart Contract Risk',
      category: 'smart_contract',
      level: assessment.overallRisk,
      score: assessment.score,
      description: `${protocols.length} protocol(s), ${assessment.unauditedCount} unaudited`,
      mitigations: ['Use audited protocols', 'Diversify across protocols', 'Monitor for incidents'],
    };
  }

  private assessOperationalRisk(strategy: Strategy): RiskComponent {
    // Assess based on strategy complexity and configuration
    let score = 30; // Base score

    if (strategy.config.rebalanceInterval && strategy.config.rebalanceInterval < 60) {
      score += 20; // High frequency rebalancing adds risk
    }

    if (!strategy.config.stopLossPercent) {
      score += 15; // No stop loss adds risk
    }

    const level = this.scoreToRiskLevel(score);

    return {
      name: 'Operational Risk',
      category: 'operational',
      level,
      score,
      description: 'Risk from strategy execution and automation',
      mitigations: ['Monitoring', 'Emergency pause', 'Redundancy'],
    };
  }

  private assessProtocolRisk(protocols: string[]): RiskComponent {
    let totalScore = 0;
    for (const protocol of protocols) {
      const risk = this.protocolRiskData.get(protocol);
      totalScore += risk?.score ?? 50;
    }

    const avgScore = protocols.length > 0 ? totalScore / protocols.length : 50;
    const level = this.scoreToRiskLevel(avgScore);

    return {
      name: 'Protocol Risk',
      category: 'protocol',
      level,
      score: avgScore,
      description: `Aggregate risk from ${protocols.length} protocol(s)`,
      mitigations: ['Protocol monitoring', 'Diversification', 'Position limits'],
    };
  }

  private generateWarningsFromRiskProfile(profile: StrategyRiskProfile): RiskWarning[] {
    const warnings: RiskWarning[] = [];

    if (profile.riskLevel === 'extreme') {
      warnings.push({
        id: 'extreme_risk',
        severity: 'danger',
        category: 'market',
        title: 'Extreme Risk Strategy',
        message: 'This strategy has an extreme risk level and may result in significant losses',
        actionRequired: 'Acknowledge risk before proceeding',
        dismissible: false,
      });
    }

    if (profile.maxDrawdown > 30) {
      warnings.push({
        id: 'high_drawdown',
        severity: 'warning',
        category: 'market',
        title: 'High Maximum Drawdown',
        message: `Maximum drawdown of ${profile.maxDrawdown}% may occur`,
        dismissible: true,
      });
    }

    if (profile.smartContractRisk === 'high') {
      warnings.push({
        id: 'sc_risk',
        severity: 'warning',
        category: 'smart_contract',
        title: 'Smart Contract Risk',
        message: 'This strategy uses protocols with elevated smart contract risk',
        dismissible: true,
      });
    }

    if (profile.impermanentLossRisk) {
      warnings.push({
        id: 'il_risk',
        severity: 'caution',
        category: 'protocol',
        title: 'Impermanent Loss',
        message: 'This strategy involves liquidity provision which may result in impermanent loss',
        dismissible: true,
      });
    }

    return warnings;
  }

  private generateRecommendations(components: RiskComponent[], totalScore: number): string[] {
    const recommendations: string[] = [];

    for (const component of components) {
      if (component.score > 60) {
        recommendations.push(`Address ${component.name}: ${component.mitigations?.[0] ?? 'Review and mitigate'}`);
      }
    }

    if (totalScore > 70) {
      recommendations.push('Consider reducing overall exposure due to high aggregate risk');
      recommendations.push('Enable additional safeguards such as stricter stop-loss');
    }

    if (recommendations.length === 0) {
      recommendations.push('Risk profile within acceptable parameters');
    }

    return recommendations;
  }

  private scoreToRiskLevel(score: number): RiskLevel {
    if (score < 20) return 'minimal';
    if (score < 40) return 'low';
    if (score < 60) return 'moderate';
    if (score < 80) return 'high';
    return 'extreme';
  }

  private impactToSeverity(impact: string): 'info' | 'caution' | 'warning' | 'danger' {
    switch (impact) {
      case 'negligible':
        return 'info';
      case 'minor':
        return 'caution';
      case 'moderate':
        return 'warning';
      case 'major':
      case 'catastrophic':
        return 'danger';
      default:
        return 'warning';
    }
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

export interface RiskTransparencyConfig {
  assessmentValidityHours: number;
  maxRiskLevelAllowed: RiskLevel;
  requireWarningsAcknowledgment: boolean;
  capitalCaps: Array<{
    riskLevel: string;
    maxCapitalPercent: number;
    maxAbsoluteCapital: number;
  }>;
  safeguardThresholds: {
    maxDrawdown: number;
    maxConcentration: number;
    minLiquidity: number;
    maxVolatility: number;
  };
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskTransparencyManager(
  config?: Partial<RiskTransparencyConfig>
): DefaultRiskTransparencyManager {
  return new DefaultRiskTransparencyManager(config);
}
