/**
 * TONAIAgent - Risk and Fraud Detection Engine
 *
 * Implements comprehensive risk assessment:
 * - Transaction risk scoring
 * - Behavioral analysis
 * - Anomaly detection
 * - Fraud pattern recognition
 * - Real-time alerts
 * - ML-based risk models
 */

import {
  TransactionRequest,
  RiskContext,
  RiskLevel,
  TransactionRiskScore,
  BehavioralRiskScore,
  MarketRiskScore,
  RiskFactor,
  RiskFlag,
  RiskRecommendation,
  RiskConfig,
  SecurityRiskThresholds,
  SecurityEvent,
  SecurityEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface RiskEngine {
  // Risk assessment
  assessTransaction(
    request: TransactionRequest,
    history: TransactionHistory
  ): Promise<RiskContext>;

  // Individual risk components
  calculateTransactionRisk(request: TransactionRequest): TransactionRiskScore;
  calculateBehavioralRisk(history: TransactionHistory): BehavioralRiskScore;
  calculateMarketRisk(request: TransactionRequest): Promise<MarketRiskScore>;

  // Anomaly detection
  detectAnomalies(request: TransactionRequest, history: TransactionHistory): AnomalyResult;

  // Fraud detection
  checkFraudPatterns(request: TransactionRequest): FraudCheckResult;

  // Configuration
  setConfig(config: Partial<RiskConfig>): void;
  getConfig(): RiskConfig;

  // Events
  onEvent(callback: SecurityEventCallback): void;
}

export interface TransactionHistory {
  userId: string;
  agentId: string;
  transactions: HistoricalTransaction[];
  aggregates: HistoricalAggregates;
  lastUpdated: Date;
}

export interface HistoricalTransaction {
  id: string;
  type: string;
  amount: number;
  token: string;
  destination?: string;
  timestamp: Date;
  success: boolean;
  riskScore?: number;
}

export interface HistoricalAggregates {
  totalTransactions: number;
  averageAmount: number;
  maxAmount: number;
  standardDeviation: number;
  hourlyDistribution: number[]; // 24 hours
  dayOfWeekDistribution: number[]; // 7 days
  protocolUsage: Record<string, number>;
  destinationCount: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  anomalyScore: number;
  anomalyType?: string;
  deviations: Array<{
    metric: string;
    expected: number;
    actual: number;
    deviationFactor: number;
  }>;
}

export interface FraudCheckResult {
  fraudDetected: boolean;
  fraudScore: number;
  matchedPatterns: FraudPattern[];
  recommendations: string[];
}

export interface FraudPattern {
  id: string;
  name: string;
  severity: RiskLevel;
  description: string;
  matchedIndicators: string[];
}

// ============================================================================
// Risk Scoring Weights
// ============================================================================

const RISK_WEIGHTS = {
  amount: 0.25,
  destination: 0.20,
  velocity: 0.15,
  behavioral: 0.15,
  market: 0.10,
  protocol: 0.10,
  time: 0.05,
};

const RISK_THRESHOLDS: SecurityRiskThresholds = {
  lowRiskMax: 0.3,
  mediumRiskMax: 0.6,
  highRiskMax: 0.8,
  autoBlockAbove: 0.9,
};

// ============================================================================
// Fraud Patterns Database
// ============================================================================

const FRAUD_PATTERNS: FraudPattern[] = [
  {
    id: 'rapid_drain',
    name: 'Rapid Wallet Drain',
    severity: 'critical',
    description: 'Multiple large transactions in quick succession attempting to drain wallet',
    matchedIndicators: [],
  },
  {
    id: 'new_dest_large',
    name: 'Large Transfer to New Destination',
    severity: 'high',
    description: 'Significant transfer to previously unknown address',
    matchedIndicators: [],
  },
  {
    id: 'unusual_time',
    name: 'Unusual Trading Time',
    severity: 'medium',
    description: 'Trading activity at unusual hours for this user',
    matchedIndicators: [],
  },
  {
    id: 'split_transfers',
    name: 'Split Transfers',
    severity: 'high',
    description: 'Multiple small transfers that appear to be splitting a larger amount',
    matchedIndicators: [],
  },
  {
    id: 'dust_collection',
    name: 'Dust Collection Attack',
    severity: 'medium',
    description: 'Receiving many small amounts followed by a large transfer',
    matchedIndicators: [],
  },
  {
    id: 'sandwich_attack',
    name: 'Sandwich Attack Indicator',
    severity: 'high',
    description: 'Transaction pattern indicates possible sandwich attack',
    matchedIndicators: [],
  },
];

// ============================================================================
// Risk Engine Implementation
// ============================================================================

export class DefaultRiskEngine implements RiskEngine {
  private config: RiskConfig;
  private readonly eventCallbacks: SecurityEventCallback[] = [];
  private readonly blacklistedAddresses = new Set<string>();

  constructor(config?: Partial<RiskConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      mlModelEnabled: config?.mlModelEnabled ?? false, // Requires actual ML model
      behavioralAnalysisEnabled: config?.behavioralAnalysisEnabled ?? true,
      thresholds: config?.thresholds ?? RISK_THRESHOLDS,
      velocityLimits: config?.velocityLimits ?? {
        maxTransactionsPerMinute: 5,
        maxTransactionsPerHour: 20,
        maxTransactionsPerDay: 100,
        unusualVolumeMultiplier: 3,
      },
    };
  }

  async assessTransaction(
    request: TransactionRequest,
    history: TransactionHistory
  ): Promise<RiskContext> {
    // Calculate individual risk scores
    const transactionRisk = this.calculateTransactionRisk(request);
    const behavioralRisk = this.config.behavioralAnalysisEnabled
      ? this.calculateBehavioralRisk(history)
      : this.getDefaultBehavioralRisk();
    const marketRisk = await this.calculateMarketRisk(request);

    // Detect anomalies
    const anomalyResult = this.detectAnomalies(request, history);
    if (anomalyResult.isAnomaly) {
      behavioralRisk.anomalyScore = anomalyResult.anomalyScore;
      transactionRisk.flags.push({
        type: 'suspicious_pattern',
        severity: anomalyResult.anomalyScore > 0.7 ? 'high' : 'medium',
        description: `Anomaly detected: ${anomalyResult.anomalyType}`,
      });
    }

    // Check fraud patterns
    const fraudResult = this.checkFraudPatterns(request);
    if (fraudResult.fraudDetected) {
      for (const pattern of fraudResult.matchedPatterns) {
        transactionRisk.flags.push({
          type: 'suspicious_pattern',
          severity: pattern.severity,
          description: pattern.description,
        });
      }
    }

    // Calculate overall risk
    const overallScore = this.calculateOverallRisk(
      transactionRisk.score,
      behavioralRisk.score,
      marketRisk.score
    );
    const overallRisk = this.scoreToRiskLevel(overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      transactionRisk,
      behavioralRisk,
      marketRisk,
      overallRisk
    );

    const riskContext: RiskContext = {
      transactionRisk,
      behavioralRisk,
      marketRisk,
      overallRisk,
      recommendations,
    };

    // Emit alert if high risk
    if (overallRisk === 'high' || overallRisk === 'critical') {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'risk_alert',
        severity: overallRisk,
        source: 'risk_engine',
        message: `High risk transaction detected: ${request.id}`,
        data: {
          transactionId: request.id,
          overallScore,
          riskLevel: overallRisk,
          flags: transactionRisk.flags,
        },
      });
    }

    return riskContext;
  }

  calculateTransactionRisk(request: TransactionRequest): TransactionRiskScore {
    const factors: RiskFactor[] = [];
    const flags: RiskFlag[] = [];
    let totalScore = 0;

    // Amount risk
    const amountRisk = this.calculateAmountRisk(request);
    factors.push({
      name: 'amount',
      weight: RISK_WEIGHTS.amount,
      value: amountRisk,
      contribution: amountRisk * RISK_WEIGHTS.amount,
      description: `Transaction amount risk: ${request.amount?.valueTon ?? 0} TON`,
    });
    totalScore += amountRisk * RISK_WEIGHTS.amount;

    if (request.amount?.valueTon && request.amount.valueTon > 1000) {
      flags.push({
        type: 'large_amount',
        severity: request.amount.valueTon > 5000 ? 'high' : 'medium',
        description: `Large transaction: ${request.amount.valueTon} TON`,
      });
    }

    // Destination risk
    const destRisk = this.calculateDestinationRisk(request);
    factors.push({
      name: 'destination',
      weight: RISK_WEIGHTS.destination,
      value: destRisk,
      contribution: destRisk * RISK_WEIGHTS.destination,
      description: 'Destination address risk assessment',
    });
    totalScore += destRisk * RISK_WEIGHTS.destination;

    if (request.destination?.isNew) {
      flags.push({
        type: 'new_destination',
        severity: 'medium',
        description: 'First transfer to this destination',
      });
    }

    if (request.destination && this.blacklistedAddresses.has(request.destination.address)) {
      flags.push({
        type: 'blacklisted_address',
        severity: 'critical',
        description: 'Destination is on blacklist',
      });
      totalScore = 1.0; // Maximum risk
    }

    // Protocol risk
    const protocolRisk = this.calculateProtocolRisk(request);
    factors.push({
      name: 'protocol',
      weight: RISK_WEIGHTS.protocol,
      value: protocolRisk,
      contribution: protocolRisk * RISK_WEIGHTS.protocol,
      description: `Protocol risk: ${request.metadata?.protocol ?? 'direct'}`,
    });
    totalScore += protocolRisk * RISK_WEIGHTS.protocol;

    if (protocolRisk > 0.7) {
      flags.push({
        type: 'unknown_protocol',
        severity: 'medium',
        description: `Unknown or high-risk protocol: ${request.metadata?.protocol}`,
      });
    }

    // Time-based risk
    const timeRisk = this.calculateTimeRisk(request);
    factors.push({
      name: 'time',
      weight: RISK_WEIGHTS.time,
      value: timeRisk,
      contribution: timeRisk * RISK_WEIGHTS.time,
      description: 'Time-based risk assessment',
    });
    totalScore += timeRisk * RISK_WEIGHTS.time;

    if (timeRisk > 0.5) {
      flags.push({
        type: 'unusual_time',
        severity: 'low',
        description: 'Transaction at unusual time',
      });
    }

    return {
      score: Math.min(1, totalScore),
      factors,
      flags,
    };
  }

  calculateBehavioralRisk(history: TransactionHistory): BehavioralRiskScore {
    if (!history.transactions || history.transactions.length === 0) {
      // New user with no history - moderate baseline risk
      return {
        score: 0.3,
        anomalyScore: 0.2,
        deviationFromNormal: 0,
        recentActivityScore: 0.3,
      };
    }

    // Calculate recent activity score
    const recentTxs = history.transactions.filter(
      (tx) => Date.now() - tx.timestamp.getTime() < 24 * 60 * 60 * 1000
    );
    const recentActivityScore = Math.min(1, recentTxs.length / 50);

    // Calculate deviation from normal
    const avgAmount = history.aggregates.averageAmount;
    const stdDev = history.aggregates.standardDeviation;
    const recentAvg =
      recentTxs.reduce((sum, tx) => sum + tx.amount, 0) / Math.max(1, recentTxs.length);
    const deviationFromNormal = stdDev > 0 ? Math.abs(recentAvg - avgAmount) / stdDev : 0;

    // Calculate anomaly score based on deviation
    const anomalyScore = Math.min(1, deviationFromNormal / 3);

    // Overall behavioral risk
    const score = (anomalyScore + recentActivityScore) / 2;

    return {
      score: Math.min(1, score),
      anomalyScore,
      deviationFromNormal,
      recentActivityScore,
    };
  }

  async calculateMarketRisk(request: TransactionRequest): Promise<MarketRiskScore> {
    // In production, this would fetch real market data
    // For now, provide reasonable estimates

    const valueTon = request.amount?.valueTon ?? 0;

    // Volatility risk (would come from price oracle)
    const volatilityScore = 0.3; // Moderate volatility assumption

    // Liquidity risk (would come from DEX data)
    const liquidityScore = valueTon > 10000 ? 0.7 : valueTon > 1000 ? 0.4 : 0.1;

    // Price impact estimate
    const priceImpactEstimate = valueTon > 10000 ? 0.05 : valueTon > 1000 ? 0.01 : 0.001;

    const score = (volatilityScore + liquidityScore) / 2;

    return {
      score: Math.min(1, score),
      volatilityScore,
      liquidityScore,
      priceImpactEstimate,
    };
  }

  detectAnomalies(
    request: TransactionRequest,
    history: TransactionHistory
  ): AnomalyResult {
    const deviations: AnomalyResult['deviations'] = [];
    let maxDeviation = 0;
    let anomalyType: string | undefined;

    if (!history.transactions || history.transactions.length < 5) {
      // Not enough history for reliable anomaly detection
      return {
        isAnomaly: false,
        anomalyScore: 0,
        deviations: [],
      };
    }

    // Check amount deviation
    const amount = request.amount?.valueTon ?? 0;
    const avgAmount = history.aggregates.averageAmount;
    const stdDev = history.aggregates.standardDeviation;

    if (stdDev > 0) {
      const amountDeviation = Math.abs(amount - avgAmount) / stdDev;
      deviations.push({
        metric: 'amount',
        expected: avgAmount,
        actual: amount,
        deviationFactor: amountDeviation,
      });

      if (amountDeviation > maxDeviation) {
        maxDeviation = amountDeviation;
        anomalyType = 'unusual_amount';
      }
    }

    // Check time pattern deviation
    const hour = new Date().getHours();
    const hourlyFreq = history.aggregates.hourlyDistribution[hour] ?? 0;
    const avgHourlyFreq =
      history.aggregates.hourlyDistribution.reduce((a, b) => a + b, 0) / 24;

    if (avgHourlyFreq > 0) {
      const timeDeviation = Math.abs(hourlyFreq - avgHourlyFreq) / avgHourlyFreq;
      deviations.push({
        metric: 'time_of_day',
        expected: avgHourlyFreq,
        actual: hourlyFreq,
        deviationFactor: timeDeviation,
      });

      if (timeDeviation > maxDeviation && hourlyFreq < avgHourlyFreq * 0.1) {
        maxDeviation = timeDeviation;
        anomalyType = 'unusual_time';
      }
    }

    // Check velocity deviation
    const recentCount = history.transactions.filter(
      (tx) => Date.now() - tx.timestamp.getTime() < 60 * 60 * 1000
    ).length;
    const avgHourlyCount = history.aggregates.totalTransactions / 168; // Assume 1 week history

    if (avgHourlyCount > 0) {
      const velocityDeviation = recentCount / avgHourlyCount;
      if (velocityDeviation > this.config.velocityLimits.unusualVolumeMultiplier) {
        deviations.push({
          metric: 'velocity',
          expected: avgHourlyCount,
          actual: recentCount,
          deviationFactor: velocityDeviation,
        });

        if (velocityDeviation > maxDeviation) {
          maxDeviation = velocityDeviation;
          anomalyType = 'velocity_spike';
        }
      }
    }

    const anomalyScore = Math.min(1, maxDeviation / 3);
    const isAnomaly = anomalyScore > 0.5;

    return {
      isAnomaly,
      anomalyScore,
      anomalyType,
      deviations,
    };
  }

  checkFraudPatterns(request: TransactionRequest): FraudCheckResult {
    const matchedPatterns: FraudPattern[] = [];
    const recommendations: string[] = [];
    let fraudScore = 0;

    // Check: Large transfer to new destination
    if (
      request.destination?.isNew &&
      request.amount?.valueTon &&
      request.amount.valueTon > 100
    ) {
      const pattern = { ...FRAUD_PATTERNS.find((p) => p.id === 'new_dest_large')! };
      pattern.matchedIndicators = ['new_destination', 'large_amount'];
      matchedPatterns.push(pattern);
      fraudScore += 0.4;
      recommendations.push('Verify destination address before proceeding');
    }

    // Check: Blacklisted destination
    if (request.destination && this.blacklistedAddresses.has(request.destination.address)) {
      fraudScore = 1.0;
      recommendations.push('Transaction blocked: destination is blacklisted');
    }

    // Check: Unusual trading time
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 5) {
      const pattern = { ...FRAUD_PATTERNS.find((p) => p.id === 'unusual_time')! };
      pattern.matchedIndicators = ['late_night_activity'];
      matchedPatterns.push(pattern);
      fraudScore += 0.1;
    }

    return {
      fraudDetected: fraudScore > 0.5,
      fraudScore: Math.min(1, fraudScore),
      matchedPatterns,
      recommendations,
    };
  }

  setConfig(config: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RiskConfig {
    return { ...this.config };
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // Additional methods for managing blacklist
  addToBlacklist(address: string): void {
    this.blacklistedAddresses.add(address);
  }

  removeFromBlacklist(address: string): void {
    this.blacklistedAddresses.delete(address);
  }

  isBlacklisted(address: string): boolean {
    return this.blacklistedAddresses.has(address);
  }

  private calculateAmountRisk(request: TransactionRequest): number {
    const valueTon = request.amount?.valueTon ?? 0;

    if (valueTon <= 10) return 0.1;
    if (valueTon <= 100) return 0.2;
    if (valueTon <= 500) return 0.4;
    if (valueTon <= 1000) return 0.6;
    if (valueTon <= 5000) return 0.8;
    return 0.95;
  }

  private calculateDestinationRisk(request: TransactionRequest): number {
    if (!request.destination) return 0.1;

    let risk = 0.1;

    if (request.destination.isNew) {
      risk += 0.3;
    }

    if (request.destination.type === 'external') {
      risk += 0.2;
    }

    if (!request.destination.isWhitelisted) {
      risk += 0.1;
    }

    return Math.min(1, risk);
  }

  private calculateProtocolRisk(request: TransactionRequest): number {
    const protocol = request.metadata?.protocol as string | undefined;

    // Known safe protocols
    const safeProtocols = ['dedust', 'stonfi', 'evaa'];
    if (protocol && safeProtocols.includes(protocol)) {
      return 0.1;
    }

    // Direct transfers
    if (!protocol || protocol === 'direct') {
      return 0.2;
    }

    // Unknown protocols
    return 0.6;
  }

  private calculateTimeRisk(_request: TransactionRequest): number {
    const hour = new Date().getHours();

    // Higher risk during late night hours
    if (hour >= 2 && hour <= 5) {
      return 0.4;
    }

    // Slightly elevated during early morning
    if (hour >= 0 && hour < 2) {
      return 0.2;
    }

    return 0.1;
  }

  private calculateOverallRisk(
    transactionScore: number,
    behavioralScore: number,
    marketScore: number
  ): number {
    // Weighted combination
    return (
      transactionScore * 0.5 +
      behavioralScore * 0.3 +
      marketScore * 0.2
    );
  }

  private scoreToRiskLevel(score: number): RiskLevel {
    if (score <= this.config.thresholds.lowRiskMax) return 'low';
    if (score <= this.config.thresholds.mediumRiskMax) return 'medium';
    if (score <= this.config.thresholds.highRiskMax) return 'high';
    return 'critical';
  }

  private generateRecommendations(
    transactionRisk: TransactionRiskScore,
    behavioralRisk: BehavioralRiskScore,
    marketRisk: MarketRiskScore,
    overallRisk: RiskLevel
  ): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];

    // Amount-based recommendations
    if (transactionRisk.flags.some((f) => f.type === 'large_amount')) {
      recommendations.push({
        action: 'Consider splitting into smaller transactions',
        reason: 'Large transaction detected',
        priority: 'suggested',
      });
    }

    // Destination-based recommendations
    if (transactionRisk.flags.some((f) => f.type === 'new_destination')) {
      recommendations.push({
        action: 'Verify destination address is correct',
        reason: 'First transfer to this address',
        priority: 'required',
      });
    }

    // Behavioral recommendations
    if (behavioralRisk.anomalyScore > 0.5) {
      recommendations.push({
        action: 'Review recent activity patterns',
        reason: 'Unusual activity detected',
        priority: 'suggested',
      });
    }

    // Market recommendations
    if (marketRisk.priceImpactEstimate > 0.01) {
      recommendations.push({
        action: 'Consider using limit orders to reduce slippage',
        reason: `Estimated price impact: ${(marketRisk.priceImpactEstimate * 100).toFixed(2)}%`,
        priority: 'suggested',
      });
    }

    // Overall risk recommendations
    if (overallRisk === 'high' || overallRisk === 'critical') {
      recommendations.push({
        action: 'Manual review required before proceeding',
        reason: `Overall risk level: ${overallRisk}`,
        priority: 'required',
      });
    }

    return recommendations;
  }

  private getDefaultBehavioralRisk(): BehavioralRiskScore {
    return {
      score: 0.2,
      anomalyScore: 0,
      deviationFromNormal: 0,
      recentActivityScore: 0.2,
    };
  }

  private emitEvent(event: SecurityEvent): void {
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

export function createRiskEngine(config?: Partial<RiskConfig>): DefaultRiskEngine {
  return new DefaultRiskEngine(config);
}
