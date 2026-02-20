/**
 * TONAIAgent - Hedge Fund Manager
 *
 * Central orchestration component for the autonomous hedge fund,
 * coordinating all specialized agents and managing fund operations.
 */

import {
  FundConfig,
  FundType,
  FundStatus,
  FeeStructure,
  GovernanceConfig,
  AgentConfigurations,
  StrategyAllocation,
  FundRiskConfig,
  RiskAgentConfig,
  HedgeFundEvent,
  HedgeFundEventCallback,
  FundPerformance,
  PerformanceReturns,
  PerformanceAttribution,
  AIDecisionLog,
  FundInvestor,
  InvestmentRequest,
  RedemptionRequest,
} from './types';

import { DefaultPortfolioAgent, createPortfolioAgent, PortfolioAgent } from './portfolio-agent';
import { DefaultExecutionAgent, createExecutionAgent, ExecutionAgent } from './execution-agent';
import { DefaultRiskAgent, createRiskAgent, RiskAgent } from './risk-agent';

// Re-export FundRiskConfig from types for convenience
export type { FundRiskConfig } from './types';

// ============================================================================
// Hedge Fund Manager Interface
// ============================================================================

export interface HedgeFundManager {
  readonly config: FundConfig;
  readonly status: FundStatus;

  // Agents
  readonly portfolio: PortfolioAgent;
  readonly execution: ExecutionAgent;
  readonly risk: RiskAgent;

  // Fund lifecycle
  initialize(config: FundInitConfig): Promise<FundConfig>;
  start(): Promise<void>;
  pause(reason?: string): Promise<void>;
  resume(): Promise<void>;
  stop(reason?: string): Promise<void>;

  // Configuration
  updateConfig(config: Partial<FundConfig>): Promise<void>;
  configurePortfolioAgent(config: PartialPortfolioConfig): Promise<void>;
  configureExecutionAgent(config: PartialExecutionConfig): Promise<void>;
  configureRiskAgent(config: PartialRiskConfig): Promise<void>;

  // Performance
  getPerformance(): FundPerformance;
  getReturns(period: string): PerformanceReturns;
  getAttribution(): PerformanceAttribution;

  // Investors
  processInvestment(request: InvestmentRequest): Promise<InvestmentResult>;
  processRedemption(request: RedemptionRequest): Promise<RedemptionResult>;
  getInvestors(): FundInvestor[];

  // Operations
  triggerRebalance(): Promise<RebalanceOutcome>;
  runRiskCheck(): Promise<RiskCheckOutcome>;
  runStressTests(): Promise<StressTestOutcome>;

  // Transparency
  getDecisionLog(filters?: DecisionLogFilters): AIDecisionLog[];
  explainDecision(decisionId: string): Promise<DecisionExplanation>;

  // Events
  onEvent(callback: HedgeFundEventCallback): void;
}

export interface FundInitConfig {
  name: string;
  type: FundType;
  initialCapital: number;
  currency?: string;
  description?: string;
  fees?: Partial<FeeStructure>;
  governance?: Partial<GovernanceConfig>;
  riskConfig?: Partial<FundRiskConfig>;
  strategyAllocation?: Partial<StrategyAllocation>;
}

export interface PartialPortfolioConfig {
  targetAllocation?: Record<string, number>;
  rebalanceThreshold?: number;
  rebalanceFrequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  constraints?: Partial<{
    maxSingleAsset: number;
    maxSingleStrategy: number;
    maxCorrelation: number;
    minLiquidity: number;
    maxLeverage: number;
    longOnly: boolean;
  }>;
  optimizationMethod?: 'mean_variance' | 'risk_parity' | 'black_litterman' | 'equal_weight';
}

export interface PartialExecutionConfig {
  executionMode?: 'fast' | 'optimal' | 'stealth';
  slippageTolerance?: number;
  gasStrategy?: 'fast' | 'standard' | 'dynamic';
  mevProtection?: boolean;
  preferredDexes?: string[];
  splitThreshold?: number;
}

export interface PartialRiskConfig {
  varConfig?: Partial<{
    confidenceLevel: number;
    timeHorizon: number;
    method: 'historical' | 'parametric' | 'monte_carlo';
    lookbackPeriod: number;
  }>;
  limits?: Partial<{
    maxDrawdown: number;
    maxDailyLoss: number;
    maxLeverage: number;
    maxConcentration: number;
    maxVaR: number;
    minLiquidity: number;
  }>;
  stressTestConfig?: Partial<{
    enabled: boolean;
    scenarios: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
  }>;
}

export interface InvestmentResult {
  success: boolean;
  investorId: string;
  units: number;
  nav: number;
  totalValue: number;
  fees: number;
  lockupEndsAt?: Date;
  error?: string;
}

export interface RedemptionResult {
  success: boolean;
  requestId: string;
  amount: number;
  processDate: Date;
  fees: number;
  error?: string;
}

export interface RebalanceOutcome {
  success: boolean;
  ordersExecuted: number;
  totalTraded: number;
  fees: number;
  newAllocation: Record<string, number>;
  duration: number;
  errors?: string[];
}

export interface RiskCheckOutcome {
  passed: boolean;
  metrics: {
    var99: number;
    drawdown: number;
    leverage: number;
    concentration: number;
  };
  violations: string[];
  warnings: string[];
}

export interface StressTestOutcome {
  scenariosRun: number;
  worstCase: {
    scenario: string;
    loss: number;
    lossPercent: number;
  };
  recommendations: string[];
}

export interface DecisionLogFilters {
  fromDate?: Date;
  toDate?: Date;
  agentRole?: string;
  decisionType?: string;
  limit?: number;
}

export interface DecisionExplanation {
  summary: string;
  factors: { name: string; impact: string; weight: number }[];
  alternativesConsidered: { action: string; reason: string }[];
  confidence: number;
  humanReadable: string;
}

// ============================================================================
// Default Hedge Fund Manager Implementation
// ============================================================================

export class DefaultHedgeFundManager implements HedgeFundManager {
  private _config: FundConfig;
  private _status: FundStatus = 'initializing';

  readonly portfolio: DefaultPortfolioAgent;
  readonly execution: DefaultExecutionAgent;
  readonly risk: DefaultRiskAgent;

  private readonly eventCallbacks: HedgeFundEventCallback[] = [];
  private readonly investors: Map<string, FundInvestor> = new Map();
  private readonly decisionLog: AIDecisionLog[] = [];

  private nav: number = 1.0; // Net Asset Value per unit
  private totalUnits: number = 0;
  private operationInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize with default config
    this._config = this.createDefaultConfig();

    // Create agents
    this.portfolio = createPortfolioAgent();
    this.execution = createExecutionAgent();
    this.risk = createRiskAgent();

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  get config(): FundConfig {
    return { ...this._config };
  }

  get status(): FundStatus {
    return this._status;
  }

  async initialize(initConfig: FundInitConfig): Promise<FundConfig> {
    this.emitEvent('info', 'fund_manager', `Initializing fund: ${initConfig.name}`);

    const fundId = `fund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this._config = {
      id: fundId,
      name: initConfig.name,
      type: initConfig.type,
      status: 'initializing',
      description: initConfig.description,
      capital: {
        initialCapital: initConfig.initialCapital,
        currentAUM: initConfig.initialCapital,
        currency: initConfig.currency || 'USD',
        minInvestment: 10000,
        maxCapacity: undefined,
        lockupPeriodDays: 30,
        redemptionNoticeDays: 7,
      },
      agents: this.createDefaultAgentConfigs(),
      strategyAllocation: this.mergeStrategyAllocation(initConfig.strategyAllocation),
      riskConfig: {
        enabled: true,
        maxDrawdown: 0.15,
        maxDailyLoss: 0.05,
        maxLeverage: 2.0,
        maxConcentration: 0.25,
        emergencyStopEnabled: true,
        ...initConfig.riskConfig,
      },
      fees: {
        managementFeePercent: 1.0,
        performanceFeePercent: 15,
        highWaterMark: true,
        ...initConfig.fees,
      },
      governance: {
        type: 'centralized',
        ...initConfig.governance,
      },
      complianceEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    // Configure agents with fund-specific settings
    await this.configurePortfolioAgent({
      targetAllocation: this._config.strategyAllocation?.allocations?.reduce(
        (acc, item) => ({ ...acc, [item.strategyType]: item.targetPercent }),
        {}
      ),
    });

    await this.configureRiskAgent({
      limits: {
        maxDrawdown: this._config.riskConfig.maxDrawdown,
        maxDailyLoss: this._config.riskConfig.maxDailyLoss,
        maxLeverage: this._config.riskConfig.maxLeverage,
        maxConcentration: this._config.riskConfig.maxConcentration,
      },
    });

    // Initialize fund units
    this.totalUnits = initConfig.initialCapital;
    this.nav = 1.0;

    // Update portfolio state
    this.portfolio.updateState({
      totalValue: initConfig.initialCapital,
      cash: initConfig.initialCapital,
      positions: [],
    });

    this._status = 'initializing';
    this._config.status = 'initializing';

    this.emitEvent('info', 'fund_manager', `Fund initialized: ${this._config.id}`, {
      name: this._config.name,
      type: this._config.type,
      initialCapital: initConfig.initialCapital,
    });

    return { ...this._config };
  }

  async start(): Promise<void> {
    if (this._status === 'active') {
      return;
    }

    this.emitEvent('info', 'fund_manager', 'Starting fund operations');

    this._status = 'active';
    this._config.status = 'active';
    this._config.startedAt = new Date();
    this._config.updatedAt = new Date();

    // Start periodic operations
    this.startOperations();

    this.emitEvent('info', 'fund_manager', 'Fund started', {
      fundId: this._config.id,
      startedAt: this._config.startedAt,
    });
  }

  async pause(reason?: string): Promise<void> {
    if (this._status !== 'active') {
      return;
    }

    this.emitEvent('info', 'fund_manager', `Pausing fund: ${reason || 'Manual pause'}`);

    this._status = 'paused';
    this._config.status = 'paused';
    this._config.updatedAt = new Date();

    // Stop periodic operations
    this.stopOperations();

    this.emitEvent('info', 'fund_manager', 'Fund paused', {
      fundId: this._config.id,
      reason,
    });
  }

  async resume(): Promise<void> {
    if (this._status !== 'paused') {
      return;
    }

    this.emitEvent('info', 'fund_manager', 'Resuming fund operations');

    this._status = 'active';
    this._config.status = 'active';
    this._config.updatedAt = new Date();

    // Restart periodic operations
    this.startOperations();

    this.emitEvent('info', 'fund_manager', 'Fund resumed', {
      fundId: this._config.id,
    });
  }

  async stop(reason?: string): Promise<void> {
    this.emitEvent('info', 'fund_manager', `Stopping fund: ${reason || 'Manual stop'}`);

    this._status = 'closed';
    this._config.status = 'closed';
    this._config.updatedAt = new Date();

    // Stop all operations
    this.stopOperations();

    this.emitEvent('critical', 'fund_manager', 'Fund stopped', {
      fundId: this._config.id,
      reason,
    });
  }

  async updateConfig(config: Partial<FundConfig>): Promise<void> {
    this._config = { ...this._config, ...config, updatedAt: new Date() };
    this.emitEvent('info', 'fund_manager', 'Fund configuration updated');
  }

  async configurePortfolioAgent(config: PartialPortfolioConfig): Promise<void> {
    await this.portfolio.configure({
      targetAllocation: config.targetAllocation,
      rebalanceThreshold: config.rebalanceThreshold,
      rebalanceFrequency: config.rebalanceFrequency,
      constraints: config.constraints as any,
      optimizationMethod: config.optimizationMethod,
    });
  }

  async configureExecutionAgent(config: PartialExecutionConfig): Promise<void> {
    await this.execution.configure({
      executionMode: config.executionMode,
      slippageTolerance: config.slippageTolerance,
      gasStrategy: config.gasStrategy,
      mevProtection: config.mevProtection,
      preferredDexes: config.preferredDexes,
      splitThreshold: config.splitThreshold,
    });
  }

  async configureRiskAgent(config: PartialRiskConfig): Promise<void> {
    const riskConfig: Partial<RiskAgentConfig> = {};
    if (config.varConfig) {
      riskConfig.varConfig = config.varConfig as any;
    }
    if (config.limits) {
      riskConfig.limits = config.limits as any;
    }
    if (config.stressTestConfig) {
      riskConfig.stressTestConfig = config.stressTestConfig as any;
    }
    await this.risk.configure(riskConfig);
  }

  getPerformance(): FundPerformance {
    const portfolioState = this.portfolio.getState();
    const riskMetrics = this.risk.getLatestMetrics() || this.risk.calculateMetrics(
      portfolioState.positions,
      portfolioState.totalValue
    );

    const performance = this.portfolio.getPerformance();

    return {
      fundId: this._config.id,
      timestamp: new Date(),
      aum: portfolioState.totalValue,
      nav: this.nav,
      totalReturn: performance.totalReturn,
      returnSinceInception: performance.totalReturn,
      returns: {
        daily: performance.dailyReturn,
        weekly: performance.weeklyReturn,
        monthly: performance.monthlyReturn,
        quarterly: performance.monthlyReturn * 3, // Approximation
        yearToDate: performance.yearToDateReturn,
        sinceInception: performance.totalReturn,
      },
      riskMetrics,
      strategyPerformance: [],
      topPositions: portfolioState.positions.slice(0, 5),
      attribution: {
        byStrategy: {},
        byAsset: {},
        byFactor: {},
      },
    };
  }

  getReturns(_period: string): PerformanceReturns {
    const performance = this.portfolio.getPerformance();

    return {
      daily: performance.dailyReturn,
      weekly: performance.weeklyReturn,
      monthly: performance.monthlyReturn,
      quarterly: performance.monthlyReturn * 3,
      yearToDate: performance.yearToDateReturn,
      sinceInception: performance.totalReturn,
    };
  }

  getAttribution(): PerformanceAttribution {
    // Simplified attribution
    const positions = this.portfolio.getPositions();
    const byAsset: Record<string, number> = {};

    for (const position of positions) {
      byAsset[position.asset] = position.unrealizedPnLPercent * position.weight;
    }

    return {
      byStrategy: {},
      byAsset,
      byFactor: {},
    };
  }

  async processInvestment(request: InvestmentRequest): Promise<InvestmentResult> {
    const minInvestment = this._config.capital.minInvestment;

    if (request.amount < minInvestment) {
      return {
        success: false,
        investorId: request.investorId,
        units: 0,
        nav: this.nav,
        totalValue: 0,
        fees: 0,
        error: `Minimum investment is ${minInvestment}`,
      };
    }

    // Calculate units to issue
    const units = request.amount / this.nav;
    this.totalUnits += units;

    // Update AUM
    this._config.capital.currentAUM += request.amount;

    // Create or update investor record
    const existingInvestor = this.investors.get(request.investorId);
    const investor: FundInvestor = existingInvestor
      ? {
          ...existingInvestor,
          investmentAmount: existingInvestor.investmentAmount + request.amount,
          units: existingInvestor.units + units,
          currentValue: (existingInvestor.units + units) * this.nav,
        }
      : {
          id: `investor_${Date.now()}`,
          fundId: this._config.id,
          userId: request.investorId,
          investmentAmount: request.amount,
          currentValue: request.amount,
          units,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          investedAt: new Date(),
          lockupEndsAt: new Date(Date.now() + this._config.capital.lockupPeriodDays * 24 * 60 * 60 * 1000),
          metadata: {},
        };

    this.investors.set(request.investorId, investor);

    // Update portfolio cash
    this.portfolio.updateState({
      cash: this.portfolio.getState().cash + request.amount,
      totalValue: this._config.capital.currentAUM,
    });

    this.emitEvent('info', 'fund_manager', `Investment processed: ${request.amount}`, {
      investorId: request.investorId,
      amount: request.amount,
      units,
    });

    return {
      success: true,
      investorId: request.investorId,
      units,
      nav: this.nav,
      totalValue: units * this.nav,
      fees: 0,
      lockupEndsAt: investor.lockupEndsAt,
    };
  }

  async processRedemption(request: RedemptionRequest): Promise<RedemptionResult> {
    const investor = this.investors.get(request.investorId);

    if (!investor) {
      return {
        success: false,
        requestId: request.id,
        amount: 0,
        processDate: new Date(),
        fees: 0,
        error: 'Investor not found',
      };
    }

    // Check lockup
    if (investor.lockupEndsAt && investor.lockupEndsAt > new Date()) {
      return {
        success: false,
        requestId: request.id,
        amount: 0,
        processDate: new Date(),
        fees: 0,
        error: `Lockup period ends ${investor.lockupEndsAt.toISOString()}`,
      };
    }

    const unitsToRedeem = request.units || request.amount / this.nav;
    const redemptionValue = unitsToRedeem * this.nav;

    if (unitsToRedeem > investor.units) {
      return {
        success: false,
        requestId: request.id,
        amount: 0,
        processDate: new Date(),
        fees: 0,
        error: 'Insufficient units',
      };
    }

    // Process redemption
    investor.units -= unitsToRedeem;
    investor.currentValue = investor.units * this.nav;
    this.totalUnits -= unitsToRedeem;
    this._config.capital.currentAUM -= redemptionValue;

    // Update portfolio
    this.portfolio.updateState({
      cash: this.portfolio.getState().cash - redemptionValue,
      totalValue: this._config.capital.currentAUM,
    });

    this.emitEvent('info', 'fund_manager', `Redemption processed: ${redemptionValue}`, {
      investorId: request.investorId,
      units: unitsToRedeem,
      value: redemptionValue,
    });

    return {
      success: true,
      requestId: request.id,
      amount: redemptionValue,
      processDate: new Date(),
      fees: 0,
    };
  }

  getInvestors(): FundInvestor[] {
    return Array.from(this.investors.values());
  }

  async triggerRebalance(): Promise<RebalanceOutcome> {
    this.emitEvent('info', 'fund_manager', 'Manual rebalance triggered');

    const result = await this.portfolio.executeRebalance();

    return {
      success: result.success,
      ordersExecuted: result.ordersExecuted,
      totalTraded: result.totalTraded,
      fees: result.fees,
      newAllocation: result.newAllocation,
      duration: result.duration,
      errors: result.errors,
    };
  }

  async runRiskCheck(): Promise<RiskCheckOutcome> {
    const portfolioState = this.portfolio.getState();
    const metrics = this.risk.calculateMetrics(portfolioState.positions, portfolioState.totalValue);
    const limitCheck = this.risk.checkLimits(metrics);

    return {
      passed: limitCheck.passed,
      metrics: {
        var99: metrics.var99,
        drawdown: metrics.currentDrawdown,
        leverage: metrics.leverage,
        concentration: metrics.concentration,
      },
      violations: limitCheck.violations.map(v => v.message),
      warnings: limitCheck.warnings.map(w => w.message),
    };
  }

  async runStressTests(): Promise<StressTestOutcome> {
    const positions = this.portfolio.getPositions();
    const results = this.risk.runAllStressTests(positions);

    const worstCase = results.reduce(
      (worst, current) =>
        current.portfolioLossPercent > worst.portfolioLossPercent ? current : worst,
      results[0]
    );

    const recommendations = new Set<string>();
    for (const result of results) {
      for (const rec of result.recommendations) {
        recommendations.add(rec);
      }
    }

    return {
      scenariosRun: results.length,
      worstCase: {
        scenario: worstCase?.scenarioName || 'None',
        loss: worstCase?.portfolioLoss || 0,
        lossPercent: worstCase?.portfolioLossPercent || 0,
      },
      recommendations: Array.from(recommendations),
    };
  }

  getDecisionLog(filters?: DecisionLogFilters): AIDecisionLog[] {
    let logs = [...this.decisionLog];

    if (filters) {
      if (filters.fromDate) {
        logs = logs.filter(l => l.timestamp >= filters.fromDate!);
      }
      if (filters.toDate) {
        logs = logs.filter(l => l.timestamp <= filters.toDate!);
      }
      if (filters.agentRole) {
        logs = logs.filter(l => l.agentRole === filters.agentRole);
      }
      if (filters.decisionType) {
        logs = logs.filter(l => l.decisionType === filters.decisionType);
      }
      if (filters.limit) {
        logs = logs.slice(0, filters.limit);
      }
    }

    return logs;
  }

  async explainDecision(decisionId: string): Promise<DecisionExplanation> {
    const decision = this.decisionLog.find(d => d.id === decisionId);

    if (!decision) {
      return {
        summary: 'Decision not found',
        factors: [],
        alternativesConsidered: [],
        confidence: 0,
        humanReadable: 'The requested decision was not found in the log.',
      };
    }

    const factors = decision.reasoning.factors.map(f => ({
      name: f.name,
      impact: f.direction,
      weight: f.weight,
    }));

    const alternatives = decision.reasoning.alternativesConsidered.map(a => ({
      action: a.action,
      reason: a.reason,
    }));

    return {
      summary: decision.reasoning.summary,
      factors,
      alternativesConsidered: alternatives,
      confidence: decision.reasoning.confidence,
      humanReadable: this.generateHumanReadableExplanation(decision),
    };
  }

  onEvent(callback: HedgeFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createDefaultConfig(): FundConfig {
    return {
      id: '',
      name: '',
      type: 'autonomous',
      status: 'initializing',
      capital: {
        initialCapital: 0,
        currentAUM: 0,
        currency: 'USD',
        minInvestment: 10000,
        lockupPeriodDays: 30,
        redemptionNoticeDays: 7,
      },
      agents: this.createDefaultAgentConfigs(),
      strategyAllocation: this.createDefaultStrategyAllocation(),
      riskConfig: {
        enabled: true,
        maxDrawdown: 0.15,
        maxDailyLoss: 0.05,
        maxLeverage: 2.0,
        maxConcentration: 0.25,
        emergencyStopEnabled: true,
      },
      fees: {
        managementFeePercent: 1.0,
        performanceFeePercent: 15,
        highWaterMark: true,
      },
      governance: {
        type: 'centralized',
      },
      complianceEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };
  }

  private createDefaultAgentConfigs(): AgentConfigurations {
    return {
      portfolio: {
        enabled: true,
        targetAllocation: {},
        rebalanceThreshold: 0.05,
        rebalanceFrequency: 'daily',
        constraints: {
          maxSingleAsset: 0.25,
          maxSingleStrategy: 0.35,
          maxCorrelation: 0.70,
          minLiquidity: 0.10,
          maxLeverage: 1.0,
          longOnly: true,
        },
        optimizationMethod: 'mean_variance',
        parameters: {},
      },
      execution: {
        enabled: true,
        executionMode: 'optimal',
        slippageTolerance: 0.005,
        gasStrategy: 'dynamic',
        mevProtection: true,
        preferredDexes: ['dedust', 'stonfi'],
        splitThreshold: 10000,
        parameters: {},
      },
      risk: {
        enabled: true,
        varConfig: {
          confidenceLevel: 0.99,
          timeHorizon: 1,
          method: 'historical',
          lookbackPeriod: 252,
        },
        limits: {
          maxDrawdown: 0.15,
          maxDailyLoss: 0.05,
          maxWeeklyLoss: 0.10,
          maxLeverage: 2.0,
          maxConcentration: 0.25,
          maxVaR: 0.10,
          minLiquidity: 0.10,
        },
        stressTestConfig: {
          enabled: true,
          scenarios: ['financial_crisis_2008', 'covid_crash_2020'],
          frequency: 'daily',
        },
        hedgingConfig: {
          enabled: false,
          strategies: [],
          rehedgeFrequency: 'daily',
          maxHedgeCost: 0.01,
        },
        alertConfig: {
          varBreachPercent: 0.80,
          drawdownWarning: 0.10,
          concentrationWarning: 0.20,
          channels: ['email'],
        },
        parameters: {},
      },
      data: {
        enabled: true,
        dataSources: [],
        updateFrequencyMs: 1000,
        anomalyDetection: true,
        signalGeneration: {
          enabled: true,
          minConfidence: 0.70,
          signalTypes: ['technical', 'momentum'],
          cooldownMs: 60000,
        },
        parameters: {},
      },
      strategy: {
        enabled: true,
        strategyTypes: ['delta_neutral', 'trend_following', 'arbitrage'],
        optimization: {
          method: 'bayesian',
          frequency: 'weekly',
          lookbackPeriod: 90,
          targetMetric: 'sharpe',
        },
        backtesting: {
          enabled: true,
          minSharpe: 1.5,
          maxDrawdown: 0.20,
          minWinRate: 0.45,
          lookbackPeriod: 365,
        },
        liveAdaptation: {
          enabled: true,
          learningRate: 0.01,
          adaptationFrequency: 'daily',
          minDataPoints: 100,
          confidenceThreshold: 0.95,
          rollbackEnabled: true,
        },
        parameters: {},
      },
      research: {
        enabled: true,
        researchTypes: ['market_regime', 'yield_opportunities'],
        sources: [],
        updateFrequency: 'daily',
        parameters: {},
      },
      compliance: {
        enabled: true,
        kycAmlEnabled: true,
        transactionMonitoring: true,
        reportingEnabled: true,
        auditTrailEnabled: true,
        sanctionsScreening: true,
        parameters: {},
      },
      governance: {
        enabled: true,
        proposalCreation: true,
        votingEnabled: true,
        parameterOptimization: true,
        emergencyControls: true,
        parameters: {},
      },
    };
  }

  private createDefaultStrategyAllocation(): StrategyAllocation {
    return {
      allocations: [
        { strategyType: 'delta_neutral', targetPercent: 0.30, currentPercent: 0, minPercent: 0.10, maxPercent: 0.40, enabled: true },
        { strategyType: 'trend_following', targetPercent: 0.25, currentPercent: 0, minPercent: 0.10, maxPercent: 0.35, enabled: true },
        { strategyType: 'arbitrage', targetPercent: 0.20, currentPercent: 0, minPercent: 0.05, maxPercent: 0.30, enabled: true },
        { strategyType: 'yield_farming', targetPercent: 0.15, currentPercent: 0, minPercent: 0.05, maxPercent: 0.25, enabled: true },
      ],
      rebalanceThreshold: 0.05,
    };
  }

  private mergeStrategyAllocation(partial?: Partial<StrategyAllocation>): StrategyAllocation {
    const defaultAllocation = this.createDefaultStrategyAllocation();
    if (!partial) {
      return defaultAllocation;
    }
    return {
      allocations: partial.allocations || defaultAllocation.allocations,
      rebalanceThreshold: partial.rebalanceThreshold ?? defaultAllocation.rebalanceThreshold,
      lastRebalance: partial.lastRebalance,
    };
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: HedgeFundEvent) => {
      event.fundId = this._config.id;
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.portfolio.onEvent(forwardEvent);
    this.execution.onEvent(forwardEvent);
    this.risk.onEvent(forwardEvent);
  }

  private startOperations(): void {
    // Run periodic risk checks and rebalancing
    this.operationInterval = setInterval(async () => {
      if (this._status !== 'active') return;

      try {
        // Run risk check
        const riskCheck = await this.runRiskCheck();

        // Check if rebalance needed
        const rebalanceCheck = this.portfolio.checkRebalanceNeeded();
        if (rebalanceCheck.needed) {
          await this.triggerRebalance();
        }

        // Check for risk violations
        if (!riskCheck.passed) {
          this.emitEvent('warning', 'fund_manager', 'Risk violations detected', {
            violations: riskCheck.violations,
          });

          // Emergency stop if critical
          if (this._config.riskConfig.emergencyStopEnabled) {
            // Check for critical violations
            const drawdown = riskCheck.metrics.drawdown;
            if (drawdown > this._config.riskConfig.maxDrawdown * 1.5) {
              await this.pause('Emergency stop: Critical drawdown breach');
            }
          }
        }
      } catch (error) {
        this.emitEvent('error', 'fund_manager', `Operation error: ${error}`);
      }
    }, 60000); // Every minute
  }

  private stopOperations(): void {
    if (this.operationInterval) {
      clearInterval(this.operationInterval);
      this.operationInterval = undefined;
    }
  }

  private generateHumanReadableExplanation(decision: AIDecisionLog): string {
    const parts: string[] = [];

    parts.push(`Decision: ${decision.decisionType}`);
    parts.push(`Agent: ${decision.agentRole}`);
    parts.push(`Summary: ${decision.reasoning.summary}`);
    parts.push('');
    parts.push('Key Factors:');

    for (const factor of decision.reasoning.factors) {
      parts.push(`  - ${factor.name}: ${factor.value} (${factor.direction}, weight: ${(factor.weight * 100).toFixed(0)}%)`);
    }

    if (decision.reasoning.alternativesConsidered.length > 0) {
      parts.push('');
      parts.push('Alternatives Considered:');
      for (const alt of decision.reasoning.alternativesConsidered) {
        parts.push(`  - ${alt.action}: ${alt.reason}`);
      }
    }

    parts.push('');
    parts.push(`Confidence: ${(decision.reasoning.confidence * 100).toFixed(0)}%`);

    return parts.join('\n');
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: HedgeFundEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fundId: this._config.id,
      type: 'fund_started',
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

export function createHedgeFundManager(): DefaultHedgeFundManager {
  return new DefaultHedgeFundManager();
}
