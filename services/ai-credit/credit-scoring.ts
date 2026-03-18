/**
 * TONAIAgent - AI Credit Scoring System
 *
 * AI-powered credit scoring based on wallet activity, DeFi history,
 * portfolio volatility, behavioral patterns, and repayment history.
 * Provides a competitive moat through proprietary scoring algorithms.
 */

import {
  CreditScoringConfig,
  CreditScore,
  CreditGrade,
  CreditScoreFactor,
  CreditFactorCategory,
  CreditScoreHistoryEntry,
  WalletActivityScore,
  DeFiHistoryScore,
  RepaymentHistoryScore,
  CollateralQualityScore,
  PortfolioStabilityScore,
  BehavioralPatternsScore,
  CreditRecommendation,
  CreditEligibility,
  LendingProvider,
  UpdateCreditScoreRequest,
  AICreditEvent,
  AICreditEventCallback,
} from './types';

// ============================================================================
// Credit Scorer Interface
// ============================================================================

export interface CreditScorer {
  readonly config: CreditScoringConfig;

  // Score Calculation
  calculateScore(userId: string): Promise<CreditScore>;
  updateScore(request: UpdateCreditScoreRequest): Promise<CreditScore>;
  getScore(userId: string): Promise<CreditScore | undefined>;
  getScoreHistory(userId: string, days?: number): Promise<CreditScoreHistoryEntry[]>;

  // Factor Analysis
  analyzeWalletActivity(userId: string): Promise<WalletActivityScore>;
  analyzeDeFiHistory(userId: string): Promise<DeFiHistoryScore>;
  analyzeRepaymentHistory(userId: string): Promise<RepaymentHistoryScore>;
  analyzeCollateralQuality(userId: string): Promise<CollateralQualityScore>;
  analyzePortfolioStability(userId: string): Promise<PortfolioStabilityScore>;
  analyzeBehavioralPatterns(userId: string): Promise<BehavioralPatternsScore>;

  // Eligibility
  checkEligibility(userId: string): Promise<CreditEligibility>;
  getRecommendations(userId: string): Promise<CreditRecommendation[]>;

  // AI Enhancement
  enhanceWithAI(score: CreditScore): Promise<CreditScore>;

  // Events
  onEvent(callback: AICreditEventCallback): void;
}

// ============================================================================
// User Data Types (for scoring inputs)
// ============================================================================

export interface UserWalletData {
  userId: string;
  address: string;
  totalTransactions: number;
  avgTransactionValue: number;
  uniqueProtocols: string[];
  firstTransactionDate: Date;
  lastTransactionDate: Date;
  totalVolume: string;
}

export interface UserDeFiData {
  userId: string;
  protocolsUsed: string[];
  totalTVL: string;
  totalYieldEarned: string;
  avgPositionDuration: number; // days
  liquidations: number;
  successfulPositions: number;
}

export interface UserLoanHistory {
  userId: string;
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  latePayments: number;
  onTimePayments: number;
  avgRepaymentDays: number;
}

export interface UserPortfolioData {
  userId: string;
  totalValue: string;
  volatility30d: number;
  maxDrawdown: number;
  diversificationScore: number;
  stablecoinRatio: number;
  blueChipRatio: number;
}

export interface UserBehavioralData {
  userId: string;
  panicSellEvents: number;
  fomoBuyEvents: number;
  avgHoldPeriod: number;
  tradingFrequency: number;
  consistencyScore: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultCreditScorer implements CreditScorer {
  readonly config: CreditScoringConfig;

  private scores: Map<string, CreditScore> = new Map();
  private walletData: Map<string, UserWalletData> = new Map();
  private defiData: Map<string, UserDeFiData> = new Map();
  private loanHistory: Map<string, UserLoanHistory> = new Map();
  private portfolioData: Map<string, UserPortfolioData> = new Map();
  private behavioralData: Map<string, UserBehavioralData> = new Map();
  private eventCallbacks: AICreditEventCallback[] = [];

  constructor(config?: Partial<CreditScoringConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      scoringModel: config?.scoringModel ?? 'ai_powered',
      updateFrequency: config?.updateFrequency ?? 'daily',
      minScoreForBorrowing: config?.minScoreForBorrowing ?? 300,
      factorWeights: config?.factorWeights ?? {
        walletActivity: 0.15,
        defiHistory: 0.20,
        repaymentHistory: 0.30,
        collateralQuality: 0.15,
        portfolioStability: 0.10,
        accountAge: 0.05,
        behavioralPatterns: 0.05,
      },
      aiProvider: config?.aiProvider ?? 'groq',
      aiModelId: config?.aiModelId,
    };
  }

  // ============================================================================
  // Score Calculation
  // ============================================================================

  async calculateScore(userId: string): Promise<CreditScore> {
    // Calculate all factor scores
    const [
      walletActivity,
      defiHistory,
      repaymentHistory,
      collateralQuality,
      portfolioStability,
      behavioralPatterns,
    ] = await Promise.all([
      this.analyzeWalletActivity(userId),
      this.analyzeDeFiHistory(userId),
      this.analyzeRepaymentHistory(userId),
      this.analyzeCollateralQuality(userId),
      this.analyzePortfolioStability(userId),
      this.analyzeBehavioralPatterns(userId),
    ]);

    // Calculate weighted score
    const weights = this.config.factorWeights;
    const rawScore =
      walletActivity.score * weights.walletActivity +
      defiHistory.score * weights.defiHistory +
      repaymentHistory.score * weights.repaymentHistory +
      collateralQuality.score * weights.collateralQuality +
      portfolioStability.score * weights.portfolioStability +
      behavioralPatterns.score * weights.behavioralPatterns;

    // Normalize to 0-1000 scale
    const normalizedScore = Math.round(rawScore * 10);
    const grade = this.scoreToGrade(normalizedScore);

    // Build factor list
    const factors: CreditScoreFactor[] = [
      this.buildFactor('Wallet Activity', 'wallet_activity', walletActivity.score, weights.walletActivity),
      this.buildFactor('DeFi History', 'defi_history', defiHistory.score, weights.defiHistory),
      this.buildFactor('Repayment History', 'repayment_history', repaymentHistory.score, weights.repaymentHistory),
      this.buildFactor('Collateral Quality', 'collateral_quality', collateralQuality.score, weights.collateralQuality),
      this.buildFactor('Portfolio Stability', 'portfolio_stability', portfolioStability.score, weights.portfolioStability),
      this.buildFactor('Behavioral Patterns', 'behavioral_patterns', behavioralPatterns.score, weights.behavioralPatterns),
    ];

    // Get eligibility
    const eligibility = await this.calculateEligibility(normalizedScore, grade);

    // Get recommendations
    const recommendations = this.generateRecommendations(factors, normalizedScore);

    const now = new Date();
    const score: CreditScore = {
      userId,
      score: normalizedScore,
      grade,
      factors,
      history: this.getScoreHistorySync(userId),
      breakdown: {
        walletActivity,
        defiHistory,
        repaymentHistory,
        collateralQuality,
        portfolioStability,
        behavioralPatterns,
      },
      recommendations,
      eligibility,
      lastUpdated: now,
      nextUpdate: new Date(now.getTime() + this.getUpdateInterval()),
    };

    // Apply AI enhancement if enabled
    const enhancedScore = this.config.scoringModel === 'ai_powered'
      ? await this.enhanceWithAI(score)
      : score;

    // Store and track history
    const previousScore = this.scores.get(userId);
    if (previousScore && previousScore.score !== enhancedScore.score) {
      enhancedScore.history.push({
        timestamp: now,
        score: enhancedScore.score,
        grade: enhancedScore.grade,
        changeReason: this.determineChangeReason(previousScore, enhancedScore),
      });
    }

    this.scores.set(userId, enhancedScore);

    // Emit event
    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: now,
      type: 'credit_score_updated',
      category: 'credit',
      userId,
      data: {
        score: enhancedScore.score,
        grade: enhancedScore.grade,
        previousScore: previousScore?.score,
        previousGrade: previousScore?.grade,
      },
      metadata: {},
    });

    return enhancedScore;
  }

  private buildFactor(
    name: string,
    category: CreditFactorCategory,
    score: number,
    weight: number
  ): CreditScoreFactor {
    return {
      name,
      category,
      score,
      maxScore: 100,
      weight,
      trend: 'stable',
      details: `Score: ${score}/100, Weight: ${(weight * 100).toFixed(0)}%`,
    };
  }

  async updateScore(request: UpdateCreditScoreRequest): Promise<CreditScore> {
    return this.calculateScore(request.userId);
  }

  async getScore(userId: string): Promise<CreditScore | undefined> {
    return this.scores.get(userId);
  }

  async getScoreHistory(userId: string, days: number = 30): Promise<CreditScoreHistoryEntry[]> {
    const score = this.scores.get(userId);
    if (!score) return [];

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return score.history.filter((h) => h.timestamp >= cutoffDate);
  }

  private getScoreHistorySync(userId: string): CreditScoreHistoryEntry[] {
    const score = this.scores.get(userId);
    return score?.history ?? [];
  }

  // ============================================================================
  // Factor Analysis
  // ============================================================================

  async analyzeWalletActivity(userId: string): Promise<WalletActivityScore> {
    const data = this.walletData.get(userId) ?? this.generateDefaultWalletData(userId);

    // Score based on transaction count, value, and protocol diversity
    const txCountScore = Math.min(100, data.totalTransactions / 10);
    const avgValueScore = Math.min(100, data.avgTransactionValue / 100);
    const diversityScore = Math.min(100, data.uniqueProtocols.length * 10);

    const score = Math.round((txCountScore + avgValueScore + diversityScore) / 3);

    return {
      score,
      transactionCount: data.totalTransactions,
      avgTransactionValue: data.avgTransactionValue.toFixed(2),
      uniqueProtocols: data.uniqueProtocols.length,
      activityFrequency: this.calculateActivityFrequency(data),
    };
  }

  async analyzeDeFiHistory(userId: string): Promise<DeFiHistoryScore> {
    const data = this.defiData.get(userId) ?? this.generateDefaultDeFiData(userId);

    // Score based on TVL, protocols, yield, and success rate
    const tvlScore = Math.min(100, parseFloat(data.totalTVL) / 1000);
    const protocolScore = Math.min(100, data.protocolsUsed.length * 15);
    const yieldScore = Math.min(100, parseFloat(data.totalYieldEarned) / 100);
    const successRate = data.successfulPositions / Math.max(1, data.successfulPositions + data.liquidations);
    const successScore = successRate * 100;

    const score = Math.round((tvlScore + protocolScore + yieldScore + successScore) / 4);

    return {
      score,
      protocolsUsed: data.protocolsUsed,
      tvlHistory: data.totalTVL,
      liquidityProvided: data.totalTVL,
      yieldEarned: data.totalYieldEarned,
      positionsDuration: `${data.avgPositionDuration} days avg`,
    };
  }

  async analyzeRepaymentHistory(userId: string): Promise<RepaymentHistoryScore> {
    const data = this.loanHistory.get(userId) ?? this.generateDefaultLoanHistory(userId);

    // Score based on repayment performance
    const totalPayments = data.onTimePayments + data.latePayments;
    const onTimeRate = totalPayments > 0 ? data.onTimePayments / totalPayments : 1;
    const defaultRate = data.totalLoans > 0 ? data.defaultedLoans / data.totalLoans : 0;

    const onTimeScore = onTimeRate * 100;
    const noDefaultScore = (1 - defaultRate) * 100;
    const historyLengthScore = Math.min(100, data.completedLoans * 20);

    const score = Math.round((onTimeScore * 0.5 + noDefaultScore * 0.3 + historyLengthScore * 0.2));

    return {
      score,
      totalLoans: data.totalLoans,
      repaidOnTime: data.onTimePayments,
      latePayments: data.latePayments,
      defaults: data.defaultedLoans,
      avgRepaymentTime: `${data.avgRepaymentDays} days`,
    };
  }

  async analyzeCollateralQuality(userId: string): Promise<CollateralQualityScore> {
    const data = this.portfolioData.get(userId) ?? this.generateDefaultPortfolioData(userId);

    // Score based on asset quality and diversity
    const diversityScore = data.diversificationScore * 100;
    const stableScore = data.stablecoinRatio * 50; // Some stables is good
    const blueChipScore = data.blueChipRatio * 100;
    const volatilityScore = Math.max(0, 100 - data.volatility30d * 200);

    const score = Math.round((diversityScore + stableScore + blueChipScore + volatilityScore) / 4);

    return {
      score,
      assetDiversity: data.diversificationScore,
      stablecoinRatio: data.stablecoinRatio,
      blueChipRatio: data.blueChipRatio,
      volatilityScore: volatilityScore / 100,
    };
  }

  async analyzePortfolioStability(userId: string): Promise<PortfolioStabilityScore> {
    const data = this.portfolioData.get(userId) ?? this.generateDefaultPortfolioData(userId);

    // Score based on stability metrics
    const volatilityScore = Math.max(0, 100 - data.volatility30d * 200);
    const drawdownScore = Math.max(0, 100 - data.maxDrawdown * 200);
    const consistencyScore = data.diversificationScore * 100;

    const score = Math.round((volatilityScore + drawdownScore + consistencyScore) / 3);

    return {
      score,
      volatility30d: data.volatility30d,
      maxDrawdown: data.maxDrawdown,
      consistencyScore: data.diversificationScore,
      riskAdjustedReturn: 0.15, // Simulated
    };
  }

  async analyzeBehavioralPatterns(userId: string): Promise<BehavioralPatternsScore> {
    const data = this.behavioralData.get(userId) ?? this.generateDefaultBehavioralData(userId);

    // Score based on behavioral quality
    const panicScore = Math.max(0, 100 - data.panicSellEvents * 20);
    const fomoScore = Math.max(0, 100 - data.fomoBuyEvents * 15);
    const consistencyScore = data.consistencyScore * 100;

    const score = Math.round((panicScore + fomoScore + consistencyScore) / 3);

    return {
      score,
      panicSellRisk: data.panicSellEvents > 3 ? 0.8 : data.panicSellEvents / 5,
      fomoBuyRisk: data.fomoBuyEvents > 5 ? 0.7 : data.fomoBuyEvents / 7,
      consistencyScore: data.consistencyScore,
      decisionQuality: score / 100,
    };
  }

  // ============================================================================
  // Eligibility
  // ============================================================================

  async checkEligibility(userId: string): Promise<CreditEligibility> {
    const score = await this.getScore(userId) ?? await this.calculateScore(userId);
    return this.calculateEligibility(score.score, score.grade);
  }

  private async calculateEligibility(
    score: number,
    grade: CreditGrade
  ): Promise<CreditEligibility> {
    const canBorrow = score >= this.config.minScoreForBorrowing;
    const maxBorrowAmount = this.calculateMaxBorrow(score);
    const availableProviders = this.getAvailableProviders(score);
    const bestRateAvailable = this.getBestRate(score);

    const restrictions: string[] = [];
    const requirements: string[] = [];

    if (!canBorrow) {
      restrictions.push('Score below minimum threshold');
      requirements.push(`Minimum score of ${this.config.minScoreForBorrowing} required`);
    }

    if (grade === 'C' || grade === 'D') {
      restrictions.push('Limited to high-LTV loans only');
      requirements.push('Improve credit score for better terms');
    }

    return {
      canBorrow,
      maxBorrowAmount: maxBorrowAmount.toString(),
      availableProviders,
      bestRateAvailable,
      restrictions: restrictions.length > 0 ? restrictions : undefined,
      requirements: requirements.length > 0 ? requirements : undefined,
    };
  }

  private calculateMaxBorrow(score: number): number {
    // Max borrow scales with credit score
    const baseAmount = 1000;
    const multiplier = Math.pow(score / 300, 2);
    return Math.round(baseAmount * multiplier);
  }

  private getAvailableProviders(score: number): LendingProvider[] {
    const providers: LendingProvider[] = [];

    if (score >= 300) providers.push('coinrabbit');
    if (score >= 400) providers.push('evaa', 'tonlend');
    if (score >= 500) providers.push('aave', 'compound');
    if (score >= 700) providers.push('makerdao');

    return providers;
  }

  private getBestRate(score: number): number {
    // Better scores get better rates
    const baseRate = 0.20;
    const discount = Math.min(0.15, (score / 1000) * 0.15);
    return baseRate - discount;
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  async getRecommendations(userId: string): Promise<CreditRecommendation[]> {
    const score = await this.getScore(userId);
    if (!score) return [];
    return this.generateRecommendations(score.factors, score.score);
  }

  private generateRecommendations(
    factors: CreditScoreFactor[],
    totalScore: number
  ): CreditRecommendation[] {
    const recommendations: CreditRecommendation[] = [];
    let id = 0;

    // Find weakest factors
    const sortedFactors = [...factors].sort((a, b) => a.score - b.score);

    for (const factor of sortedFactors.slice(0, 3)) {
      if (factor.score < 60) {
        recommendations.push({
          id: `rec-${++id}`,
          type: 'improvement',
          title: `Improve ${factor.name}`,
          description: this.getImprovementDescription(factor),
          impact: Math.round((60 - factor.score) * factor.weight * 10),
          difficulty: factor.score < 30 ? 'hard' : 'medium',
          actionable: true,
          action: this.getImprovementAction(factor),
        });
      }
    }

    // Add opportunity recommendations
    if (totalScore >= 600) {
      recommendations.push({
        id: `rec-${++id}`,
        type: 'opportunity',
        title: 'Eligible for Premium Rates',
        description: 'Your credit score qualifies you for lower interest rates',
        impact: 0,
        difficulty: 'easy',
        actionable: true,
        action: 'Apply for a loan to access premium rates',
      });
    }

    if (totalScore >= 400 && totalScore < 600) {
      recommendations.push({
        id: `rec-${++id}`,
        type: 'opportunity',
        title: 'Approaching Premium Tier',
        description: `Increase your score by ${600 - totalScore} points for premium rates`,
        impact: 600 - totalScore,
        difficulty: 'medium',
        actionable: true,
      });
    }

    return recommendations;
  }

  private getImprovementDescription(factor: CreditScoreFactor): string {
    const descriptions: Record<CreditFactorCategory, string> = {
      wallet_activity: 'Increase transaction activity and interact with more protocols',
      defi_history: 'Build DeFi experience through liquidity provision and yield farming',
      repayment_history: 'Maintain perfect repayment record on all loans',
      collateral_quality: 'Diversify collateral with blue-chip assets',
      portfolio_stability: 'Reduce portfolio volatility through diversification',
      account_age: 'Account age will improve naturally over time',
      behavioral_patterns: 'Avoid panic selling and impulsive buying',
      external_signals: 'Maintain positive on-chain reputation',
    };
    return descriptions[factor.category] || 'Continue building positive history';
  }

  private getImprovementAction(factor: CreditScoreFactor): string {
    const actions: Record<CreditFactorCategory, string> = {
      wallet_activity: 'Make regular transactions and explore new protocols',
      defi_history: 'Start with low-risk yield farming positions',
      repayment_history: 'Take a small loan and repay on time',
      collateral_quality: 'Add BTC or ETH to your collateral mix',
      portfolio_stability: 'Allocate 20-30% to stablecoins',
      account_age: 'Continue using the platform regularly',
      behavioral_patterns: 'Set stop-losses and avoid emotional trading',
      external_signals: 'Engage with community and build reputation',
    };
    return actions[factor.category] || 'Continue current behavior';
  }

  // ============================================================================
  // AI Enhancement
  // ============================================================================

  async enhanceWithAI(score: CreditScore): Promise<CreditScore> {
    // In production, this would call an AI provider for enhanced analysis
    // For now, we simulate AI insights

    const aiInsights: string[] = [];

    // Analyze patterns
    if (score.breakdown.behavioralPatterns.panicSellRisk > 0.5) {
      aiInsights.push('High panic sell risk detected - consider setting automated stop-losses');
    }

    if (score.breakdown.repaymentHistory.defaults > 0) {
      aiInsights.push('Previous defaults may limit available options - focus on rebuilding trust');
    }

    if (score.breakdown.collateralQuality.stablecoinRatio > 0.8) {
      aiInsights.push('High stablecoin allocation - consider diversifying for potential upside');
    }

    // Add AI-generated recommendations
    const aiRecommendations: CreditRecommendation[] = aiInsights.map((insight, i) => ({
      id: `ai-rec-${i}`,
      type: 'improvement' as const,
      title: 'AI Insight',
      description: insight,
      impact: 10,
      difficulty: 'medium' as const,
      actionable: true,
    }));

    return {
      ...score,
      recommendations: [...score.recommendations, ...aiRecommendations],
    };
  }

  // ============================================================================
  // Data Management (for simulation/testing)
  // ============================================================================

  setWalletData(userId: string, data: UserWalletData): void {
    this.walletData.set(userId, data);
  }

  setDeFiData(userId: string, data: UserDeFiData): void {
    this.defiData.set(userId, data);
  }

  setLoanHistory(userId: string, data: UserLoanHistory): void {
    this.loanHistory.set(userId, data);
  }

  setPortfolioData(userId: string, data: UserPortfolioData): void {
    this.portfolioData.set(userId, data);
  }

  setBehavioralData(userId: string, data: UserBehavioralData): void {
    this.behavioralData.set(userId, data);
  }

  private generateDefaultWalletData(userId: string): UserWalletData {
    return {
      userId,
      address: '0x' + userId.substring(0, 40),
      totalTransactions: Math.floor(Math.random() * 500) + 50,
      avgTransactionValue: Math.random() * 1000 + 100,
      uniqueProtocols: ['Uniswap', 'STON.fi', 'DeDust'],
      firstTransactionDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      lastTransactionDate: new Date(),
      totalVolume: (Math.random() * 100000 + 10000).toFixed(2),
    };
  }

  private generateDefaultDeFiData(userId: string): UserDeFiData {
    return {
      userId,
      protocolsUsed: ['STON.fi', 'DeDust', 'EVAA'],
      totalTVL: (Math.random() * 50000 + 5000).toFixed(2),
      totalYieldEarned: (Math.random() * 1000 + 100).toFixed(2),
      avgPositionDuration: Math.floor(Math.random() * 30) + 7,
      liquidations: Math.floor(Math.random() * 2),
      successfulPositions: Math.floor(Math.random() * 20) + 5,
    };
  }

  private generateDefaultLoanHistory(userId: string): UserLoanHistory {
    return {
      userId,
      totalLoans: Math.floor(Math.random() * 5),
      activeLoans: Math.floor(Math.random() * 2),
      completedLoans: Math.floor(Math.random() * 3),
      defaultedLoans: 0,
      latePayments: Math.floor(Math.random() * 2),
      onTimePayments: Math.floor(Math.random() * 10) + 5,
      avgRepaymentDays: Math.floor(Math.random() * 30) + 15,
    };
  }

  private generateDefaultPortfolioData(userId: string): UserPortfolioData {
    return {
      userId,
      totalValue: (Math.random() * 100000 + 10000).toFixed(2),
      volatility30d: Math.random() * 0.3 + 0.05,
      maxDrawdown: Math.random() * 0.4 + 0.1,
      diversificationScore: Math.random() * 0.5 + 0.3,
      stablecoinRatio: Math.random() * 0.4 + 0.1,
      blueChipRatio: Math.random() * 0.6 + 0.2,
    };
  }

  private generateDefaultBehavioralData(userId: string): UserBehavioralData {
    return {
      userId,
      panicSellEvents: Math.floor(Math.random() * 3),
      fomoBuyEvents: Math.floor(Math.random() * 4),
      avgHoldPeriod: Math.floor(Math.random() * 60) + 30,
      tradingFrequency: Math.random() * 5 + 1,
      consistencyScore: Math.random() * 0.5 + 0.4,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private scoreToGrade(score: number): CreditGrade {
    if (score >= 850) return 'AAA';
    if (score >= 750) return 'AA';
    if (score >= 650) return 'A';
    if (score >= 550) return 'BBB';
    if (score >= 450) return 'BB';
    if (score >= 350) return 'B';
    if (score >= 250) return 'CCC';
    if (score >= 150) return 'CC';
    if (score >= 50) return 'C';
    return 'D';
  }

  private calculateActivityFrequency(data: UserWalletData): string {
    const daysSinceFirst = Math.ceil(
      (Date.now() - data.firstTransactionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgTxPerDay = data.totalTransactions / daysSinceFirst;

    if (avgTxPerDay >= 5) return 'Very High';
    if (avgTxPerDay >= 1) return 'High';
    if (avgTxPerDay >= 0.5) return 'Medium';
    if (avgTxPerDay >= 0.1) return 'Low';
    return 'Very Low';
  }

  private getUpdateInterval(): number {
    switch (this.config.updateFrequency) {
      case 'real_time':
        return 0;
      case 'hourly':
        return 60 * 60 * 1000;
      case 'daily':
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private determineChangeReason(previous: CreditScore, current: CreditScore): string {
    const diff = current.score - previous.score;
    if (diff > 50) return 'Significant improvement in credit factors';
    if (diff > 0) return 'Minor improvement in credit factors';
    if (diff < -50) return 'Significant decline in credit factors';
    if (diff < 0) return 'Minor decline in credit factors';
    return 'Regular score recalculation';
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

export function createCreditScorer(
  config?: Partial<CreditScoringConfig>
): DefaultCreditScorer {
  return new DefaultCreditScorer(config);
}

export default DefaultCreditScorer;
