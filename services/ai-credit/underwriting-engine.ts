/**
 * TONAIAgent - AI Underwriting Engine
 *
 * Adaptive risk models, predictive liquidation analysis, volatility forecasting,
 * and macro-aware credit allocation for intelligent loan underwriting.
 */

import {
  UnderwritingConfig,
  UnderwritingAssessment,
  RiskAssessment,
  RiskLevel,
  RiskFactor,
  VolatilityForecast,
  StressTestResult,
  CreditAnalysis,
  UnderwritingDecision,
  ApprovedTerms,
  CollateralRequirement,
  LoanCovenant,
  AIUnderwritingAnalysis,
  AIRiskFactor,
  ComparableLoan,
  UnderwritingRequest,
  CollateralAsset,
  AICreditEvent,
  AICreditEventCallback,
} from './types';

import { CreditScorer, createCreditScorer } from './credit-scoring';

// ============================================================================
// Underwriting Engine Interface
// ============================================================================

export interface UnderwritingEngine {
  readonly config: UnderwritingConfig;
  readonly creditScorer: CreditScorer;

  // Assessment
  assessLoanRequest(userId: string, request: UnderwritingRequest): Promise<UnderwritingAssessment>;
  getAssessment(assessmentId: string): Promise<UnderwritingAssessment>;
  getUserAssessments(userId: string): Promise<UnderwritingAssessment[]>;

  // Risk Analysis
  analyzeRisk(request: UnderwritingRequest): Promise<RiskAssessment>;
  runStressTests(collateral: CollateralAsset[], loanAmount: string): Promise<StressTestResult[]>;
  forecastVolatility(assets: string[]): Promise<VolatilityForecast>;

  // AI Analysis
  runAIAnalysis(request: UnderwritingRequest, creditScore: number): Promise<AIUnderwritingAnalysis>;

  // Decision Making
  makeDecision(assessment: UnderwritingAssessment): Promise<UnderwritingDecision>;
  calculateTerms(riskLevel: RiskLevel, amount: string): Promise<ApprovedTerms>;

  // Statistics
  getStats(): Promise<UnderwritingStats>;

  // Events
  onEvent(callback: AICreditEventCallback): void;
}

export interface UnderwritingStats {
  totalAssessments: number;
  approvalRate: number;
  avgRiskScore: number;
  avgApprovedAmount: string;
  declineReasons: Record<string, number>;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultUnderwritingEngine implements UnderwritingEngine {
  readonly config: UnderwritingConfig;
  readonly creditScorer: CreditScorer;

  private assessments: Map<string, UnderwritingAssessment> = new Map();
  private historicalLoans: ComparableLoan[] = [];
  private eventCallbacks: AICreditEventCallback[] = [];

  constructor(config?: Partial<UnderwritingConfig>, creditScorer?: CreditScorer) {
    this.config = {
      enabled: config?.enabled ?? true,
      riskModel: config?.riskModel ?? 'moderate',
      maxExposure: config?.maxExposure ?? '1000000',
      diversificationRequired: config?.diversificationRequired ?? true,
      minDiversificationScore: config?.minDiversificationScore ?? 0.3,
      volatilityForecastEnabled: config?.volatilityForecastEnabled ?? true,
      macroAwareEnabled: config?.macroAwareEnabled ?? true,
    };

    this.creditScorer = creditScorer ?? createCreditScorer();

    // Initialize simulated historical loans for comparison
    this.initializeHistoricalData();
  }

  private initializeHistoricalData(): void {
    this.historicalLoans = [
      { id: 'hist-1', similarity: 0.85, outcome: 'repaid', keyMetrics: { ltv: 0.5, score: 650, amount: 10000 } },
      { id: 'hist-2', similarity: 0.82, outcome: 'repaid', keyMetrics: { ltv: 0.6, score: 580, amount: 15000 } },
      { id: 'hist-3', similarity: 0.78, outcome: 'repaid', keyMetrics: { ltv: 0.55, score: 620, amount: 8000 } },
      { id: 'hist-4', similarity: 0.75, outcome: 'defaulted', keyMetrics: { ltv: 0.75, score: 380, amount: 25000 } },
      { id: 'hist-5', similarity: 0.72, outcome: 'active', keyMetrics: { ltv: 0.45, score: 720, amount: 20000 } },
    ];
  }

  // ============================================================================
  // Assessment
  // ============================================================================

  async assessLoanRequest(
    userId: string,
    request: UnderwritingRequest
  ): Promise<UnderwritingAssessment> {
    // Get or calculate credit score
    let creditScore = await this.creditScorer.getScore(userId);
    if (!creditScore) {
      creditScore = await this.creditScorer.calculateScore(userId);
    }

    // Analyze risk
    const riskAssessment = await this.analyzeRisk(request);

    // Credit analysis
    const creditAnalysis: CreditAnalysis = {
      creditScore: creditScore.score,
      creditGrade: creditScore.grade,
      borrowingCapacity: this.calculateBorrowingCapacity(creditScore.score).toString(),
      utilizationRate: this.calculateUtilizationRate(userId, request.requestedAmount),
      recommendations: creditScore.recommendations.map((r) => r.description),
    };

    // AI analysis
    const aiAnalysis = await this.runAIAnalysis(request, creditScore.score);

    // Make decision
    const collateralAssets: CollateralAsset[] = request.collateral.map((c) => ({
      symbol: c.asset,
      name: c.asset,
      amount: c.amount,
      valueUSD: c.amount, // Simplified
      weight: 1 / request.collateral.length,
      volatility: 0.05,
      lockedAt: new Date(),
    }));

    const assessment: UnderwritingAssessment = {
      id: this.generateId('assess'),
      userId,
      requestedAmount: request.requestedAmount,
      requestedAsset: request.requestedAsset,
      collateralOffered: collateralAssets,
      assessment: riskAssessment,
      creditAnalysis,
      decision: { approved: false, validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      aiAnalysis,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    // Make final decision
    assessment.decision = await this.makeDecision(assessment);

    this.assessments.set(assessment.id, assessment);

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'loan_requested',
      category: 'loan',
      userId,
      data: {
        assessmentId: assessment.id,
        requestedAmount: request.requestedAmount,
        approved: assessment.decision.approved,
      },
      metadata: {},
    });

    return assessment;
  }

  async getAssessment(assessmentId: string): Promise<UnderwritingAssessment> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }
    return { ...assessment };
  }

  async getUserAssessments(userId: string): Promise<UnderwritingAssessment[]> {
    return Array.from(this.assessments.values())
      .filter((a) => a.userId === userId)
      .map((a) => ({ ...a }));
  }

  // ============================================================================
  // Risk Analysis
  // ============================================================================

  async analyzeRisk(request: UnderwritingRequest): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];

    // Calculate collateral value
    const collateralValue = this.calculateCollateralValue(request.collateral);
    const requestedAmount = parseFloat(request.requestedAmount);
    const ltv = requestedAmount / collateralValue;

    // LTV Risk
    factors.push(this.assessLTVRisk(ltv));

    // Concentration Risk
    factors.push(this.assessConcentrationRisk(request.collateral));

    // Volatility Risk
    factors.push(this.assessVolatilityRisk(request.collateral));

    // Market Risk
    factors.push(this.assessMarketRisk());

    // Liquidity Risk
    factors.push(this.assessLiquidityRisk(request.collateral));

    // Calculate overall risk score
    const riskScore = this.calculateOverallRiskScore(factors);
    const overallRisk = this.scoreToRiskLevel(riskScore);

    // Run stress tests
    const collateralAssets: CollateralAsset[] = request.collateral.map((c) => ({
      symbol: c.asset,
      name: c.asset,
      amount: c.amount,
      valueUSD: (parseFloat(c.amount) * this.getAssetPrice(c.asset)).toFixed(2),
      weight: 1 / request.collateral.length,
      volatility: 0.05,
      lockedAt: new Date(),
    }));
    const stressTestResults = await this.runStressTests(collateralAssets, request.requestedAmount);

    // Forecast volatility
    const volatilityForecast = await this.forecastVolatility(
      request.collateral.map((c) => c.asset)
    );

    // Calculate liquidation probability
    const liquidationProbability = this.calculateLiquidationProbability(
      ltv,
      volatilityForecast.expectedVolatility
    );

    // Calculate expected loss
    const expectedLoss = (liquidationProbability * requestedAmount * 0.15).toFixed(2); // 15% loss given default

    return {
      overallRisk,
      riskScore,
      factors,
      volatilityForecast,
      liquidationProbability,
      expectedLoss,
      stressTestResults,
    };
  }

  private assessLTVRisk(ltv: number): RiskFactor {
    let severity: RiskLevel;
    let impact: number;

    if (ltv <= 0.4) {
      severity = 'minimal';
      impact = 0.1;
    } else if (ltv <= 0.5) {
      severity = 'low';
      impact = 0.2;
    } else if (ltv <= 0.6) {
      severity = 'moderate';
      impact = 0.4;
    } else if (ltv <= 0.7) {
      severity = 'elevated';
      impact = 0.6;
    } else if (ltv <= 0.8) {
      severity = 'high';
      impact = 0.8;
    } else {
      severity = 'extreme';
      impact = 1.0;
    }

    return {
      name: 'LTV Risk',
      category: 'collateral',
      severity,
      impact,
      description: `Loan-to-Value ratio of ${(ltv * 100).toFixed(1)}%`,
      mitigationPossible: ltv > 0.5,
      mitigation: ltv > 0.5 ? 'Additional collateral can reduce LTV' : undefined,
    };
  }

  private assessConcentrationRisk(collateral: Array<{ asset: string; amount: string }>): RiskFactor {
    if (collateral.length === 1) {
      return {
        name: 'Concentration Risk',
        category: 'diversification',
        severity: 'elevated',
        impact: 0.5,
        description: 'Single asset collateral presents concentration risk',
        mitigationPossible: true,
        mitigation: 'Diversify collateral with multiple assets',
      };
    }

    // Calculate HHI
    const totalValue = collateral.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const hhi = collateral.reduce((sum, c) => {
      const weight = parseFloat(c.amount) / totalValue;
      return sum + Math.pow(weight, 2);
    }, 0);

    const severity: RiskLevel = hhi > 0.5 ? 'moderate' : 'low';
    const impact = hhi;

    return {
      name: 'Concentration Risk',
      category: 'diversification',
      severity,
      impact,
      description: `Collateral diversification score: ${((1 - hhi) * 100).toFixed(0)}%`,
      mitigationPossible: hhi > 0.3,
      mitigation: hhi > 0.3 ? 'Consider adding more diverse assets' : undefined,
    };
  }

  private assessVolatilityRisk(collateral: Array<{ asset: string; amount: string }>): RiskFactor {
    const volatilities: Record<string, number> = {
      BTC: 0.04,
      ETH: 0.05,
      TON: 0.08,
      BNB: 0.05,
      SOL: 0.08,
      USDT: 0.001,
      USDC: 0.001,
    };

    const avgVolatility =
      collateral.reduce((sum, c) => sum + (volatilities[c.asset] ?? 0.1), 0) / collateral.length;

    let severity: RiskLevel;
    if (avgVolatility <= 0.02) {
      severity = 'minimal';
    } else if (avgVolatility <= 0.04) {
      severity = 'low';
    } else if (avgVolatility <= 0.06) {
      severity = 'moderate';
    } else if (avgVolatility <= 0.08) {
      severity = 'elevated';
    } else {
      severity = 'high';
    }

    return {
      name: 'Volatility Risk',
      category: 'market',
      severity,
      impact: avgVolatility * 10,
      description: `Average collateral volatility: ${(avgVolatility * 100).toFixed(1)}%`,
      mitigationPossible: true,
      mitigation: 'Include stablecoins or lower volatility assets',
    };
  }

  private assessMarketRisk(): RiskFactor {
    // Simulate market conditions
    const marketCondition = Math.random(); // 0-1

    let severity: RiskLevel;
    let description: string;

    if (marketCondition > 0.8) {
      severity = 'minimal';
      description = 'Favorable market conditions';
    } else if (marketCondition > 0.6) {
      severity = 'low';
      description = 'Stable market conditions';
    } else if (marketCondition > 0.4) {
      severity = 'moderate';
      description = 'Normal market conditions';
    } else if (marketCondition > 0.2) {
      severity = 'elevated';
      description = 'Elevated market uncertainty';
    } else {
      severity = 'high';
      description = 'Adverse market conditions';
    }

    return {
      name: 'Market Risk',
      category: 'macro',
      severity,
      impact: 1 - marketCondition,
      description,
      mitigationPossible: false,
    };
  }

  private assessLiquidityRisk(collateral: Array<{ asset: string; amount: string }>): RiskFactor {
    const liquidAssets = ['BTC', 'ETH', 'USDT', 'USDC', 'TON'];
    const liquidRatio =
      collateral.filter((c) => liquidAssets.includes(c.asset)).length / collateral.length;

    let severity: RiskLevel;
    if (liquidRatio >= 1) {
      severity = 'minimal';
    } else if (liquidRatio >= 0.8) {
      severity = 'low';
    } else if (liquidRatio >= 0.5) {
      severity = 'moderate';
    } else {
      severity = 'elevated';
    }

    return {
      name: 'Liquidity Risk',
      category: 'market',
      severity,
      impact: 1 - liquidRatio,
      description: `${(liquidRatio * 100).toFixed(0)}% of collateral is highly liquid`,
      mitigationPossible: liquidRatio < 1,
      mitigation: liquidRatio < 1 ? 'Prefer liquid assets as collateral' : undefined,
    };
  }

  private calculateOverallRiskScore(factors: RiskFactor[]): number {
    const weightedSum = factors.reduce((sum, f) => sum + f.impact, 0);
    return Math.min(100, Math.round((weightedSum / factors.length) * 100));
  }

  private scoreToRiskLevel(score: number): RiskLevel {
    if (score <= 15) return 'minimal';
    if (score <= 30) return 'low';
    if (score <= 45) return 'moderate';
    if (score <= 60) return 'elevated';
    if (score <= 80) return 'high';
    return 'extreme';
  }

  async runStressTests(
    collateral: CollateralAsset[],
    loanAmount: string
  ): Promise<StressTestResult[]> {
    const scenarios = [
      { name: 'Market Correction', description: 'General 20% market decline', priceMovement: -0.2 },
      { name: 'Flash Crash', description: 'Sudden 40% price drop', priceMovement: -0.4 },
      { name: 'Black Swan', description: 'Extreme 60% decline', priceMovement: -0.6 },
      { name: 'Crypto Winter', description: '80% prolonged decline', priceMovement: -0.8 },
    ];

    const currentValue = collateral.reduce((sum, c) => sum + parseFloat(c.valueUSD), 0);
    const requestedAmount = parseFloat(loanAmount);

    return scenarios.map((scenario) => {
      const newValue = currentValue * (1 + scenario.priceMovement);
      const resultingLTV = requestedAmount / newValue;
      const liquidationTriggered = resultingLTV >= 0.85;
      const loss = liquidationTriggered ? (requestedAmount * 0.15).toFixed(2) : '0';

      return {
        scenario: scenario.name,
        description: scenario.description,
        priceMovement: scenario.priceMovement,
        resultingLTV,
        liquidationTriggered,
        loss,
      };
    });
  }

  async forecastVolatility(assets: string[]): Promise<VolatilityForecast> {
    const volatilities: Record<string, number> = {
      BTC: 0.04,
      ETH: 0.05,
      TON: 0.08,
      BNB: 0.05,
      SOL: 0.08,
      USDT: 0.001,
      USDC: 0.001,
    };

    const expectedVolatility =
      assets.reduce((sum, asset) => sum + (volatilities[asset] ?? 0.1), 0) / assets.length;

    const confidenceWidth = expectedVolatility * 0.3;

    let volatilityRegime: VolatilityForecast['volatilityRegime'];
    if (expectedVolatility <= 0.02) {
      volatilityRegime = 'low';
    } else if (expectedVolatility <= 0.05) {
      volatilityRegime = 'normal';
    } else if (expectedVolatility <= 0.1) {
      volatilityRegime = 'high';
    } else {
      volatilityRegime = 'extreme';
    }

    return {
      timeHorizon: '30 days',
      expectedVolatility,
      confidenceInterval: {
        low: expectedVolatility - confidenceWidth,
        high: expectedVolatility + confidenceWidth,
      },
      volatilityRegime,
      forecastMethod: 'GARCH with ML enhancement',
    };
  }

  private calculateLiquidationProbability(ltv: number, volatility: number): number {
    // Simple probability model based on LTV and volatility
    // Higher LTV and volatility = higher liquidation probability
    const zScore = (0.85 - ltv) / (volatility * Math.sqrt(30)); // 30-day horizon
    const probability = 1 - this.normalCDF(zScore);
    return Math.min(1, Math.max(0, probability));
  }

  private normalCDF(x: number): number {
    // Approximation of normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  // ============================================================================
  // AI Analysis
  // ============================================================================

  async runAIAnalysis(
    request: UnderwritingRequest,
    creditScore: number
  ): Promise<AIUnderwritingAnalysis> {
    const startTime = Date.now();

    // Simulate AI risk factor analysis
    const riskFactors: AIRiskFactor[] = [
      {
        factor: 'Credit History',
        score: creditScore / 10,
        weight: 0.3,
        assessment: creditScore >= 600 ? 'Positive credit history' : 'Limited credit history',
      },
      {
        factor: 'Collateral Quality',
        score: this.assessCollateralQualityScore(request.collateral),
        weight: 0.25,
        assessment: 'Acceptable collateral composition',
      },
      {
        factor: 'Loan Amount',
        score: this.assessLoanAmountScore(request.requestedAmount),
        weight: 0.2,
        assessment: 'Within acceptable limits',
      },
      {
        factor: 'Purpose Risk',
        score: request.purpose ? 70 : 50,
        weight: 0.15,
        assessment: request.purpose ? 'Clear stated purpose' : 'Purpose not specified',
      },
      {
        factor: 'Market Timing',
        score: 60 + Math.random() * 30,
        weight: 0.1,
        assessment: 'Current market conditions acceptable',
      },
    ];

    // Calculate weighted score
    const totalScore = riskFactors.reduce((sum, f) => sum + f.score * f.weight, 0);

    // Find comparable loans
    const comparableLoans = this.findComparableLoans(request, creditScore);

    // Generate recommendation
    let recommendation: AIUnderwritingAnalysis['recommendation'];
    if (totalScore >= 75 && creditScore >= 650) {
      recommendation = 'approve';
    } else if (totalScore >= 60 && creditScore >= 500) {
      recommendation = 'approve_with_conditions';
    } else if (totalScore >= 45 || creditScore >= 400) {
      recommendation = 'review';
    } else {
      recommendation = 'decline';
    }

    // Generate reasoning
    const reasoning: string[] = [];
    for (const factor of riskFactors) {
      if (factor.score >= 70) {
        reasoning.push(`${factor.factor}: ${factor.assessment} (positive)`);
      } else if (factor.score < 50) {
        reasoning.push(`${factor.factor}: ${factor.assessment} (concern)`);
      }
    }

    // Calculate confidence based on comparable loans outcome
    const successfulComparables = comparableLoans.filter((l) => l.outcome === 'repaid').length;
    const confidence = 0.5 + (successfulComparables / comparableLoans.length) * 0.4;

    return {
      modelId: 'underwriting-ai-v1',
      confidence,
      recommendation,
      reasoning,
      riskFactors,
      comparableLoans,
      processingTime: Date.now() - startTime,
    };
  }

  private assessCollateralQualityScore(collateral: Array<{ asset: string; amount: string }>): number {
    const qualityScores: Record<string, number> = {
      BTC: 90,
      ETH: 85,
      USDT: 95,
      USDC: 95,
      TON: 70,
      BNB: 75,
      SOL: 65,
    };

    const avgScore =
      collateral.reduce((sum, c) => sum + (qualityScores[c.asset] ?? 50), 0) / collateral.length;

    return avgScore;
  }

  private assessLoanAmountScore(amount: string): number {
    const value = parseFloat(amount);
    const maxExposure = parseFloat(this.config.maxExposure);

    // Larger loans relative to max exposure get lower scores
    const ratio = value / maxExposure;
    return Math.max(30, 100 - ratio * 100);
  }

  private findComparableLoans(
    request: UnderwritingRequest,
    creditScore: number
  ): ComparableLoan[] {
    const requestedAmount = parseFloat(request.requestedAmount);

    // Sort by similarity and return top matches
    return this.historicalLoans
      .map((loan) => {
        // Calculate similarity based on metrics
        const scoreDiff = Math.abs(creditScore - loan.keyMetrics.score) / 1000;
        const amountDiff = Math.abs(requestedAmount - loan.keyMetrics.amount) / 50000;
        const similarity = Math.max(0, 1 - scoreDiff - amountDiff);

        return { ...loan, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }

  // ============================================================================
  // Decision Making
  // ============================================================================

  async makeDecision(assessment: UnderwritingAssessment): Promise<UnderwritingDecision> {
    const { assessment: riskAssessment, creditAnalysis } = assessment;

    // Decision criteria
    const riskScore = riskAssessment.riskScore;
    const creditScore = creditAnalysis.creditScore;

    // Check absolute declines
    if (riskAssessment.overallRisk === 'extreme') {
      return {
        approved: false,
        declineReasons: ['Extreme risk level - collateral insufficient'],
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    if (creditScore < 250) {
      return {
        approved: false,
        declineReasons: ['Credit score below minimum threshold'],
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    // Risk model specific thresholds
    const thresholds = this.getRiskModelThresholds();

    if (riskScore > thresholds.maxRiskScore) {
      return {
        approved: false,
        declineReasons: [`Risk score ${riskScore} exceeds threshold ${thresholds.maxRiskScore}`],
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    if (creditScore < thresholds.minCreditScore) {
      return {
        approved: false,
        declineReasons: [`Credit score ${creditScore} below minimum ${thresholds.minCreditScore}`],
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    // Approval with conditions
    const conditions: string[] = [];
    let approvedAmount = parseFloat(assessment.requestedAmount);

    // Reduce amount for higher risk
    if (riskScore > 40) {
      approvedAmount *= 0.8;
      conditions.push('Amount reduced due to risk factors');
    }

    // Require additional collateral for lower scores
    if (creditScore < 500) {
      conditions.push('Additional collateral required');
    }

    // Get terms
    const terms = await this.calculateTerms(
      riskAssessment.overallRisk,
      approvedAmount.toFixed(2)
    );

    return {
      approved: true,
      approvedAmount: approvedAmount.toFixed(2),
      terms,
      conditions: conditions.length > 0 ? conditions : undefined,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  private getRiskModelThresholds(): { maxRiskScore: number; minCreditScore: number } {
    switch (this.config.riskModel) {
      case 'conservative':
        return { maxRiskScore: 35, minCreditScore: 550 };
      case 'aggressive':
        return { maxRiskScore: 65, minCreditScore: 350 };
      case 'moderate':
      default:
        return { maxRiskScore: 50, minCreditScore: 400 };
    }
  }

  async calculateTerms(riskLevel: RiskLevel, amount: string): Promise<ApprovedTerms> {
    // Base interest rate adjusted by risk
    const baseRate = 0.12;
    const riskPremium: Record<RiskLevel, number> = {
      minimal: 0,
      low: 0.02,
      moderate: 0.04,
      elevated: 0.06,
      high: 0.10,
      extreme: 0.15,
    };

    const interestRate = baseRate + riskPremium[riskLevel];

    // Max LTV adjusted by risk
    const maxLTVs: Record<RiskLevel, number> = {
      minimal: 0.75,
      low: 0.70,
      moderate: 0.65,
      elevated: 0.55,
      high: 0.45,
      extreme: 0.35,
    };

    const collateralRequirements: CollateralRequirement[] = [
      {
        minAmount: (parseFloat(amount) / maxLTVs[riskLevel]).toFixed(2),
        acceptedAssets: ['BTC', 'ETH', 'TON', 'USDT', 'USDC'],
        minDiversification: riskLevel === 'minimal' || riskLevel === 'low' ? 0 : 0.3,
        maxConcentration: riskLevel === 'minimal' || riskLevel === 'low' ? 1 : 0.7,
      },
    ];

    const covenants: LoanCovenant[] = [
      {
        type: 'LTV Maintenance',
        description: 'Maintain LTV below threshold',
        threshold: maxLTVs[riskLevel] + 0.05,
        consequence: 'Margin call triggered',
      },
      {
        type: 'Minimum Collateral',
        description: 'Maintain minimum collateral value',
        threshold: parseFloat(amount) * 1.2,
        consequence: 'Additional collateral required',
      },
    ];

    return {
      maxLTV: maxLTVs[riskLevel],
      interestRate,
      collateralRequirements,
      covenants,
    };
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats(): Promise<UnderwritingStats> {
    const allAssessments = Array.from(this.assessments.values());

    const approved = allAssessments.filter((a) => a.decision.approved);
    const approvalRate = allAssessments.length > 0 ? approved.length / allAssessments.length : 0;

    const avgRiskScore =
      allAssessments.length > 0
        ? allAssessments.reduce((sum, a) => sum + a.assessment.riskScore, 0) / allAssessments.length
        : 0;

    const avgApprovedAmount =
      approved.length > 0
        ? (
            approved.reduce(
              (sum, a) => sum + parseFloat(a.decision.approvedAmount ?? '0'),
              0
            ) / approved.length
          ).toFixed(2)
        : '0';

    const declineReasons: Record<string, number> = {};
    for (const assessment of allAssessments) {
      if (!assessment.decision.approved && assessment.decision.declineReasons) {
        for (const reason of assessment.decision.declineReasons) {
          declineReasons[reason] = (declineReasons[reason] ?? 0) + 1;
        }
      }
    }

    return {
      totalAssessments: allAssessments.length,
      approvalRate,
      avgRiskScore,
      avgApprovedAmount,
      declineReasons,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateCollateralValue(collateral: Array<{ asset: string; amount: string }>): number {
    return collateral.reduce((sum, c) => {
      const price = this.getAssetPrice(c.asset);
      return sum + parseFloat(c.amount) * price;
    }, 0);
  }

  private getAssetPrice(asset: string): number {
    const prices: Record<string, number> = {
      BTC: 65000,
      ETH: 3500,
      TON: 6.5,
      USDT: 1,
      USDC: 1,
      BNB: 580,
      SOL: 150,
    };
    return prices[asset] ?? 1;
  }

  private calculateBorrowingCapacity(creditScore: number): number {
    const baseCapacity = 1000;
    const multiplier = Math.pow(creditScore / 300, 2);
    return Math.round(baseCapacity * multiplier);
  }

  private calculateUtilizationRate(_userId: string, requestedAmount: string): number {
    // Simplified - would check existing loans
    const capacity = this.calculateBorrowingCapacity(600);
    return parseFloat(requestedAmount) / capacity;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AICreditEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AICreditEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createUnderwritingEngine(
  config?: Partial<UnderwritingConfig>,
  creditScorer?: CreditScorer
): DefaultUnderwritingEngine {
  return new DefaultUnderwritingEngine(config, creditScorer);
}

export default DefaultUnderwritingEngine;
