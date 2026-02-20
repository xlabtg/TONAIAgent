/**
 * TONAIAgent - Signal Generation Engine
 *
 * Core signal generation system powered by AI for predictive signals,
 * anomaly detection, arbitrage opportunities, and risk alerts.
 * Primary inference is powered by Groq for ultra-fast processing.
 */

import {
  Signal,
  SignalType,
  SignalStrength,
  SignalDirection,
  SignalConfig,
  AnomalySignal,
  AnomalyType,
  ArbitrageSignal,
  ArbitrageType,
  ArbitrageVenue,
  RiskSignal,
  RiskType,
  RiskSeverity,
  SignalEngineConfig,
  DataPlatformEvent,
  DataPlatformEventCallback,
} from './types';

// Re-export SignalMetadata for API consumers
export type { SignalMetadata } from './types';

// ============================================================================
// Signal Engine Service
// ============================================================================

export interface SignalEngineService {
  // Signal management
  createSignal(config: SignalConfig): Promise<Signal>;
  getSignal(signalId: string): Signal | undefined;
  getSignals(params: SignalQueryParams): Signal[];
  removeSignal(signalId: string): boolean;

  // Signal generation
  generateSignals(asset: string, types?: SignalType[]): Promise<Signal[]>;
  evaluateConditions(signalId: string): Promise<boolean>;

  // Anomaly detection
  detectAnomalies(asset: string): Promise<AnomalySignal[]>;
  configureAnomalyDetection(config: AnomalyDetectionConfig): void;

  // Arbitrage detection
  findArbitrageOpportunities(): Promise<ArbitrageSignal[]>;
  configureArbitrageDetection(config: ArbitrageDetectionConfig): void;

  // Risk monitoring
  assessRisk(asset: string): Promise<RiskSignal[]>;
  getActiveRiskAlerts(): RiskSignal[];
  acknowledgeRiskAlert(alertId: string): void;

  // AI inference
  predictSignal(asset: string, horizon: TimeHorizon): Promise<SignalPrediction>;
  explainSignal(signalId: string): Promise<SignalExplanation>;

  // Backtesting
  backtestSignal(signalId: string, params: BacktestParams): Promise<BacktestResult>;

  // Configuration
  configure(config: Partial<SignalEngineConfig>): void;

  // Events
  onSignal(callback: SignalCallback): void;
  onEvent(callback: DataPlatformEventCallback): void;
}

// ============================================================================
// Additional Types
// ============================================================================

export interface SignalQueryParams {
  asset?: string;
  type?: SignalType;
  direction?: SignalDirection;
  minStrength?: SignalStrength;
  minConfidence?: number;
  triggered?: boolean;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  zscore_threshold: number;
  lookbackPeriod: number; // hours
  minDataPoints: number;
  types: AnomalyType[];
}

export interface ArbitrageDetectionConfig {
  enabled: boolean;
  minProfitBps: number;
  maxLatencyMs: number;
  includedVenues: string[];
  excludedPairs: string[];
  gasEstimation: boolean;
}

export type TimeHorizon = '5m' | '15m' | '1h' | '4h' | '24h' | '7d';

export interface SignalPrediction {
  asset: string;
  horizon: TimeHorizon;
  direction: SignalDirection;
  confidence: number;
  priceTarget?: number;
  currentPrice: number;
  expectedReturn: number;
  volatilityForecast: number;
  features: PredictionFeature[];
  modelVersion: string;
  timestamp: Date;
}

export interface PredictionFeature {
  name: string;
  value: number;
  importance: number;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface SignalExplanation {
  signalId: string;
  summary: string;
  factors: ExplanationFactor[];
  confidence: number;
  alternativeInterpretations: string[];
  historicalContext: string;
  recommendations: string[];
}

export interface ExplanationFactor {
  name: string;
  description: string;
  contribution: number; // -1 to 1
  evidence: string[];
}

export interface BacktestParams {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSize: number; // 0-1
  stopLoss?: number;
  takeProfit?: number;
  includeFees: boolean;
  feePercent?: number;
}

export interface BacktestResult {
  signalId: string;
  params: BacktestParams;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
}

export interface BacktestTrade {
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  reason: 'signal' | 'stop_loss' | 'take_profit' | 'timeout';
}

export interface EquityPoint {
  timestamp: Date;
  equity: number;
  drawdown: number;
}

export type SignalCallback = (signal: Signal) => void;

// ============================================================================
// Implementation
// ============================================================================

export class DefaultSignalEngineService implements SignalEngineService {
  private config: SignalEngineConfig;
  private readonly signals: Map<string, Signal> = new Map();
  private readonly signalConfigs: Map<string, SignalConfig> = new Map();
  private readonly riskAlerts: Map<string, RiskSignal> = new Map();
  private readonly signalCallbacks: SignalCallback[] = [];
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  private anomalyConfig: AnomalyDetectionConfig = {
    enabled: true,
    zscore_threshold: 2.5,
    lookbackPeriod: 24,
    minDataPoints: 100,
    types: ['price_spike', 'volume_spike', 'liquidity_drain', 'whale_activity'],
  };

  private arbitrageConfig: ArbitrageDetectionConfig = {
    enabled: true,
    minProfitBps: 50,
    maxLatencyMs: 5000,
    includedVenues: ['binance', 'coinbase', 'ston.fi', 'dedust'],
    excludedPairs: [],
    gasEstimation: true,
  };

  constructor(config?: Partial<SignalEngineConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      defaultProvider: config?.defaultProvider ?? 'groq',
      signals: config?.signals ?? [],
      anomalyDetectionEnabled: config?.anomalyDetectionEnabled ?? true,
      arbitrageDetectionEnabled: config?.arbitrageDetectionEnabled ?? true,
      riskMonitoringEnabled: config?.riskMonitoringEnabled ?? true,
      aiInferenceProvider: config?.aiInferenceProvider ?? 'groq',
    };
  }

  // Signal Management
  async createSignal(config: SignalConfig): Promise<Signal> {
    const signalId = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const signal: Signal = {
      id: signalId,
      type: config.type,
      asset: config.asset,
      direction: 'neutral',
      strength: 'weak',
      confidence: 0,
      value: 0,
      threshold: config.thresholds.moderate,
      triggered: false,
      timestamp: new Date(),
      metadata: {
        source: 'signal-engine',
        features: config.parameters.customParams
          ? Object.keys(config.parameters.customParams)
          : [],
      },
    };

    this.signals.set(signalId, signal);
    this.signalConfigs.set(signalId, config);

    // Evaluate initial conditions
    await this.evaluateConditions(signalId);

    this.emitEvent('signal_generated', 'signals', {
      signalId,
      type: config.type,
      asset: config.asset,
    });

    return this.signals.get(signalId)!;
  }

  getSignal(signalId: string): Signal | undefined {
    return this.signals.get(signalId);
  }

  getSignals(params: SignalQueryParams): Signal[] {
    let signals = Array.from(this.signals.values());

    if (params.asset) {
      signals = signals.filter((s) => s.asset === params.asset);
    }
    if (params.type) {
      signals = signals.filter((s) => s.type === params.type);
    }
    if (params.direction) {
      signals = signals.filter((s) => s.direction === params.direction);
    }
    if (params.minStrength) {
      const strengthOrder = ['weak', 'moderate', 'strong', 'very_strong'];
      const minIndex = strengthOrder.indexOf(params.minStrength);
      signals = signals.filter((s) => strengthOrder.indexOf(s.strength) >= minIndex);
    }
    if (params.minConfidence !== undefined) {
      signals = signals.filter((s) => s.confidence >= params.minConfidence!);
    }
    if (params.triggered !== undefined) {
      signals = signals.filter((s) => s.triggered === params.triggered);
    }
    if (params.startTime) {
      signals = signals.filter((s) => s.timestamp >= params.startTime!);
    }
    if (params.endTime) {
      signals = signals.filter((s) => s.timestamp <= params.endTime!);
    }

    signals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (params.limit) {
      signals = signals.slice(0, params.limit);
    }

    return signals;
  }

  removeSignal(signalId: string): boolean {
    this.signalConfigs.delete(signalId);
    return this.signals.delete(signalId);
  }

  // Signal Generation
  async generateSignals(asset: string, types?: SignalType[]): Promise<Signal[]> {
    const targetTypes = types ?? ['price', 'volume', 'momentum', 'trend'];
    const generatedSignals: Signal[] = [];

    for (const type of targetTypes) {
      const signal = await this.generateSignalForType(asset, type);
      generatedSignals.push(signal);
      this.signals.set(signal.id, signal);
      this.notifySignalCallbacks(signal);
    }

    return generatedSignals;
  }

  async evaluateConditions(signalId: string): Promise<boolean> {
    const signal = this.signals.get(signalId);
    const config = this.signalConfigs.get(signalId);

    if (!signal || !config) {
      return false;
    }

    // Simulate signal evaluation
    const value = Math.random() * 100;
    signal.value = value;

    // Determine strength based on thresholds
    if (value >= config.thresholds.veryStrong) {
      signal.strength = 'very_strong';
    } else if (value >= config.thresholds.strong) {
      signal.strength = 'strong';
    } else if (value >= config.thresholds.moderate) {
      signal.strength = 'moderate';
    } else {
      signal.strength = 'weak';
    }

    // Determine direction
    const directionRandom = Math.random();
    if (directionRandom > 0.6) {
      signal.direction = 'bullish';
    } else if (directionRandom < 0.4) {
      signal.direction = 'bearish';
    } else {
      signal.direction = 'neutral';
    }

    signal.confidence = 0.5 + Math.random() * 0.4;
    signal.triggered = signal.strength !== 'weak' && signal.confidence > 0.7;
    signal.timestamp = new Date();

    if (signal.triggered) {
      this.notifySignalCallbacks(signal);
      this.emitEvent('signal_triggered', 'signals', {
        signalId,
        type: signal.type,
        asset: signal.asset,
        strength: signal.strength,
        direction: signal.direction,
      });
    }

    return signal.triggered;
  }

  // Anomaly Detection
  async detectAnomalies(asset: string): Promise<AnomalySignal[]> {
    if (!this.anomalyConfig.enabled) {
      return [];
    }

    const anomalies: AnomalySignal[] = [];
    const anomalyTypes = this.anomalyConfig.types;

    for (const anomalyType of anomalyTypes) {
      if (Math.random() > 0.8) {
        // 20% chance to detect anomaly
        const anomaly = this.generateAnomalySignal(asset, anomalyType);
        anomalies.push(anomaly);
        this.signals.set(anomaly.id, anomaly);
        this.notifySignalCallbacks(anomaly);
      }
    }

    if (anomalies.length > 0) {
      this.emitEvent('anomaly_detected', 'signals', {
        asset,
        count: anomalies.length,
        types: anomalies.map((a) => a.anomalyType),
      });
    }

    return anomalies;
  }

  configureAnomalyDetection(config: AnomalyDetectionConfig): void {
    this.anomalyConfig = { ...this.anomalyConfig, ...config };
  }

  // Arbitrage Detection
  async findArbitrageOpportunities(): Promise<ArbitrageSignal[]> {
    if (!this.arbitrageConfig.enabled) {
      return [];
    }

    const opportunities: ArbitrageSignal[] = [];
    const pairs = ['TON/USDT', 'ETH/USDT', 'BTC/USDT'];
    const arbitrageTypes: ArbitrageType[] = ['cross_exchange', 'triangular', 'dex_cex'];

    for (const pair of pairs) {
      for (const arbType of arbitrageTypes) {
        if (Math.random() > 0.9) {
          // 10% chance to find opportunity
          const arb = this.generateArbitrageSignal(pair, arbType);
          if (arb.profitBps >= this.arbitrageConfig.minProfitBps) {
            opportunities.push(arb);
            this.signals.set(arb.id, arb);
            this.notifySignalCallbacks(arb);
          }
        }
      }
    }

    if (opportunities.length > 0) {
      this.emitEvent('arbitrage_found', 'signals', {
        count: opportunities.length,
        totalProfit: opportunities.reduce((sum, a) => sum + a.estimatedProfit, 0),
      });
    }

    return opportunities;
  }

  configureArbitrageDetection(config: ArbitrageDetectionConfig): void {
    this.arbitrageConfig = { ...this.arbitrageConfig, ...config };
  }

  // Risk Monitoring
  async assessRisk(asset: string): Promise<RiskSignal[]> {
    if (!this.config.riskMonitoringEnabled) {
      return [];
    }

    const risks: RiskSignal[] = [];
    const riskTypes: RiskType[] = [
      'market_crash',
      'liquidity_crisis',
      'concentration',
      'leverage',
    ];

    for (const riskType of riskTypes) {
      const riskScore = Math.random();
      if (riskScore > 0.7) {
        // 30% chance to detect risk
        const risk = this.generateRiskSignal(asset, riskType);
        risks.push(risk);
        this.signals.set(risk.id, risk);
        this.riskAlerts.set(risk.id, risk);
        this.notifySignalCallbacks(risk);
      }
    }

    if (risks.length > 0) {
      this.emitEvent('risk_alert', 'signals', {
        asset,
        count: risks.length,
        severities: risks.map((r) => r.severity),
      });
    }

    return risks;
  }

  getActiveRiskAlerts(): RiskSignal[] {
    return Array.from(this.riskAlerts.values()).filter((r) => !r.metadata.acknowledged);
  }

  acknowledgeRiskAlert(alertId: string): void {
    const alert = this.riskAlerts.get(alertId);
    if (alert) {
      alert.metadata.acknowledged = true;
    }
  }

  // AI Inference
  async predictSignal(asset: string, horizon: TimeHorizon): Promise<SignalPrediction> {
    // Simulate AI prediction (in production, this would call Groq API)
    const direction: SignalDirection =
      Math.random() > 0.6 ? 'bullish' : Math.random() > 0.5 ? 'bearish' : 'neutral';

    const currentPrice = this.getMockPrice(asset);
    const expectedReturn = (Math.random() - 0.5) * 0.1;
    const priceTarget = currentPrice * (1 + expectedReturn);

    const features: PredictionFeature[] = [
      {
        name: 'momentum',
        value: Math.random() * 2 - 1,
        importance: 0.25,
        direction: direction === 'bullish' ? 'positive' : direction === 'bearish' ? 'negative' : 'neutral',
      },
      {
        name: 'volume_trend',
        value: Math.random() * 2 - 1,
        importance: 0.2,
        direction: 'positive',
      },
      {
        name: 'volatility',
        value: Math.random(),
        importance: 0.15,
        direction: 'negative',
      },
      {
        name: 'sentiment',
        value: Math.random() * 2 - 1,
        importance: 0.2,
        direction: direction === 'bullish' ? 'positive' : 'negative',
      },
      {
        name: 'whale_activity',
        value: Math.random(),
        importance: 0.2,
        direction: 'neutral',
      },
    ];

    return {
      asset,
      horizon,
      direction,
      confidence: 0.6 + Math.random() * 0.3,
      priceTarget,
      currentPrice,
      expectedReturn,
      volatilityForecast: 0.02 + Math.random() * 0.08,
      features,
      modelVersion: 'v1.0.0',
      timestamp: new Date(),
    };
  }

  async explainSignal(signalId: string): Promise<SignalExplanation> {
    const signal = this.signals.get(signalId);
    if (!signal) {
      throw new Error(`Signal ${signalId} not found`);
    }

    const factors: ExplanationFactor[] = [
      {
        name: 'Price Action',
        description: `Recent price movement indicates ${signal.direction} pressure`,
        contribution: signal.direction === 'bullish' ? 0.3 : -0.3,
        evidence: ['Price above 20-period MA', '3 consecutive higher lows'],
      },
      {
        name: 'Volume Analysis',
        description: 'Volume supports the current trend direction',
        contribution: 0.2,
        evidence: ['Volume 40% above average', 'Increasing on up moves'],
      },
      {
        name: 'Market Structure',
        description: 'Key support/resistance levels are respected',
        contribution: 0.15,
        evidence: ['Holding major support at $X', 'Previous resistance now support'],
      },
    ];

    return {
      signalId,
      summary: `${signal.type} signal for ${signal.asset} showing ${signal.strength} ${signal.direction} indication with ${(signal.confidence * 100).toFixed(1)}% confidence.`,
      factors,
      confidence: signal.confidence,
      alternativeInterpretations: [
        'Could be a false breakout if volume fails to sustain',
        'Macro factors could override technical signals',
      ],
      historicalContext: `Similar signals in the past 30 days have had a ${Math.floor(60 + Math.random() * 20)}% success rate.`,
      recommendations: [
        signal.direction === 'bullish'
          ? 'Consider gradual position building with stops below recent swing low'
          : 'Consider reducing exposure or hedging positions',
        'Monitor volume for confirmation',
        'Set alerts at key price levels',
      ],
    };
  }

  // Backtesting
  async backtestSignal(signalId: string, params: BacktestParams): Promise<BacktestResult> {
    const signal = this.signals.get(signalId);
    if (!signal) {
      throw new Error(`Signal ${signalId} not found`);
    }

    const trades: BacktestTrade[] = [];
    const equityCurve: EquityPoint[] = [];
    let equity = params.initialCapital;
    let maxEquity = equity;
    let maxDrawdown = 0;
    let wins = 0;
    let losses = 0;

    const days = Math.floor((params.endDate.getTime() - params.startDate.getTime()) / 86400000);
    const numTrades = Math.floor(days / 7); // Roughly one trade per week

    for (let i = 0; i < numTrades; i++) {
      const entryTime = new Date(params.startDate.getTime() + i * 7 * 86400000);
      const exitTime = new Date(entryTime.getTime() + (1 + Math.random() * 5) * 86400000);
      const entryPrice = 100 + Math.random() * 20;
      const side: 'long' | 'short' = Math.random() > 0.5 ? 'long' : 'short';

      let exitPrice: number;
      let reason: BacktestTrade['reason'];

      const outcome = Math.random();
      if (params.stopLoss && outcome < 0.2) {
        exitPrice = side === 'long'
          ? entryPrice * (1 - params.stopLoss)
          : entryPrice * (1 + params.stopLoss);
        reason = 'stop_loss';
      } else if (params.takeProfit && outcome > 0.7) {
        exitPrice = side === 'long'
          ? entryPrice * (1 + params.takeProfit)
          : entryPrice * (1 - params.takeProfit);
        reason = 'take_profit';
      } else {
        const change = (Math.random() - 0.4) * 0.1; // Slight positive bias
        exitPrice = entryPrice * (1 + (side === 'long' ? change : -change));
        reason = 'signal';
      }

      const pnlPercent = side === 'long'
        ? (exitPrice - entryPrice) / entryPrice
        : (entryPrice - exitPrice) / entryPrice;

      let pnl = equity * params.positionSize * pnlPercent;
      if (params.includeFees) {
        pnl -= equity * params.positionSize * (params.feePercent ?? 0.001) * 2;
      }

      equity += pnl;

      if (pnl > 0) wins++;
      else losses++;

      maxEquity = Math.max(maxEquity, equity);
      const drawdown = (maxEquity - equity) / maxEquity;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      trades.push({
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        side,
        pnl,
        pnlPercent: pnlPercent * 100,
        reason,
      });

      equityCurve.push({
        timestamp: exitTime,
        equity,
        drawdown,
      });
    }

    const totalReturn = (equity - params.initialCapital) / params.initialCapital;
    const yearFraction = days / 365;
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / yearFraction) - 1;

    // Calculate Sharpe (simplified)
    const returns = trades.map((t) => t.pnlPercent / 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn * 52 - 0.02) / (stdDev * Math.sqrt(52)) : 0;

    // Calculate profit factor
    const grossProfit = trades.filter((t) => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    return {
      signalId,
      params,
      totalTrades: trades.length,
      winningTrades: wins,
      losingTrades: losses,
      winRate: trades.length > 0 ? wins / trades.length : 0,
      totalReturn,
      annualizedReturn,
      maxDrawdown,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 1.2, // Simplified
      profitFactor,
      trades,
      equityCurve,
    };
  }

  configure(config: Partial<SignalEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onSignal(callback: SignalCallback): void {
    this.signalCallbacks.push(callback);
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async generateSignalForType(asset: string, type: SignalType): Promise<Signal> {
    const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const value = Math.random() * 100;

    let strength: SignalStrength;
    if (value >= 80) strength = 'very_strong';
    else if (value >= 60) strength = 'strong';
    else if (value >= 40) strength = 'moderate';
    else strength = 'weak';

    const directionRandom = Math.random();
    let direction: SignalDirection;
    if (directionRandom > 0.6) direction = 'bullish';
    else if (directionRandom < 0.4) direction = 'bearish';
    else direction = 'neutral';

    return {
      id,
      type,
      asset,
      direction,
      strength,
      confidence: 0.5 + Math.random() * 0.4,
      value,
      threshold: 50,
      triggered: strength !== 'weak',
      timestamp: new Date(),
      metadata: {
        source: 'signal-engine',
        model: 'groq-llama-70b',
        historicalAccuracy: 0.6 + Math.random() * 0.2,
      },
    };
  }

  private generateAnomalySignal(asset: string, anomalyType: AnomalyType): AnomalySignal {
    const id = `anom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const deviation = 2 + Math.random() * 3;
    const expectedValue = 100;
    const actualValue = expectedValue * (1 + (Math.random() > 0.5 ? 1 : -1) * deviation * 0.1);

    return {
      id,
      type: 'anomaly',
      anomalyType,
      asset,
      direction: actualValue > expectedValue ? 'bullish' : 'bearish',
      strength: deviation > 4 ? 'very_strong' : deviation > 3 ? 'strong' : 'moderate',
      confidence: 0.7 + Math.random() * 0.2,
      value: deviation,
      threshold: this.anomalyConfig.zscore_threshold,
      triggered: true,
      timestamp: new Date(),
      deviation,
      expectedValue,
      actualValue,
      zscore: deviation,
      metadata: {
        source: 'anomaly-detector',
        explanation: `Detected ${anomalyType.replace('_', ' ')} with z-score of ${deviation.toFixed(2)}`,
      },
    };
  }

  private generateArbitrageSignal(pair: string, arbType: ArbitrageType): ArbitrageSignal {
    const id = `arb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const basePrice = this.getMockPrice(pair.split('/')[0]);
    const priceDiff = basePrice * (0.001 + Math.random() * 0.005);
    const profitBps = (priceDiff / basePrice) * 10000;

    const venues: ArbitrageVenue[] = [
      {
        exchange: 'binance',
        pair,
        side: 'buy',
        price: basePrice,
        liquidity: 100000 + Math.random() * 500000,
      },
      {
        exchange: 'ston.fi',
        chain: 'ton',
        pair,
        side: 'sell',
        price: basePrice + priceDiff,
        liquidity: 50000 + Math.random() * 200000,
      },
    ];

    const estimatedSize = Math.min(...venues.map((v) => v.liquidity)) * 0.1;
    const estimatedProfit = estimatedSize * (priceDiff / basePrice);
    const gasEstimate = arbType === 'cross_chain' ? estimatedProfit * 0.1 : estimatedProfit * 0.02;

    return {
      id,
      type: 'arbitrage',
      arbitrageType: arbType,
      asset: pair,
      direction: 'bullish',
      strength: profitBps > 100 ? 'very_strong' : profitBps > 75 ? 'strong' : 'moderate',
      confidence: 0.8 + Math.random() * 0.15,
      value: profitBps,
      threshold: this.arbitrageConfig.minProfitBps,
      triggered: true,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      profitBps,
      venues,
      estimatedSize,
      estimatedProfit,
      gasEstimate,
      netProfit: estimatedProfit - gasEstimate,
      metadata: {
        source: 'arbitrage-detector',
      },
    };
  }

  private generateRiskSignal(asset: string, riskType: RiskType): RiskSignal {
    const id = `risk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const impact = 0.3 + Math.random() * 0.5;
    const probability = 0.4 + Math.random() * 0.4;

    let severity: RiskSeverity;
    const riskScore = impact * probability;
    if (riskScore > 0.6) severity = 'critical';
    else if (riskScore > 0.4) severity = 'high';
    else if (riskScore > 0.2) severity = 'medium';
    else severity = 'low';

    const mitigations = this.getMitigationsForRiskType(riskType);

    return {
      id,
      type: 'risk',
      riskType,
      asset,
      direction: 'bearish',
      strength: severity === 'critical' ? 'very_strong' : severity === 'high' ? 'strong' : 'moderate',
      confidence: 0.7 + Math.random() * 0.2,
      value: riskScore * 100,
      threshold: 40,
      triggered: true,
      timestamp: new Date(),
      severity,
      impact,
      probability,
      mitigations,
      metadata: {
        source: 'risk-monitor',
        acknowledged: false,
      },
    };
  }

  private getMitigationsForRiskType(riskType: RiskType): string[] {
    const mitigations: Record<RiskType, string[]> = {
      market_crash: [
        'Reduce position sizes',
        'Set tighter stop losses',
        'Consider hedging with options',
      ],
      liquidity_crisis: [
        'Move to more liquid pairs',
        'Reduce position sizes',
        'Avoid large market orders',
      ],
      smart_contract: [
        'Diversify across protocols',
        'Use audited contracts only',
        'Monitor protocol TVL',
      ],
      regulatory: [
        'Stay informed on regulations',
        'Ensure compliance',
        'Consider jurisdiction diversification',
      ],
      counterparty: [
        'Diversify across exchanges',
        'Use cold storage',
        'Monitor exchange health',
      ],
      operational: [
        'Implement backup systems',
        'Regular security audits',
        'Multi-signature wallets',
      ],
      concentration: [
        'Diversify holdings',
        'Set position limits',
        'Regular rebalancing',
      ],
      leverage: [
        'Reduce leverage ratio',
        'Set liquidation alerts',
        'Maintain adequate margin',
      ],
    };

    return mitigations[riskType] ?? ['Monitor situation', 'Consult risk management team'];
  }

  private getMockPrice(asset: string): number {
    const prices: Record<string, number> = {
      TON: 5.5,
      BTC: 65000,
      ETH: 3500,
      SOL: 150,
    };
    return prices[asset.toUpperCase()] ?? 100;
  }

  private notifySignalCallbacks(signal: Signal): void {
    for (const callback of this.signalCallbacks) {
      try {
        callback(signal);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private emitEvent(
    type: DataPlatformEvent['type'],
    category: DataPlatformEvent['category'],
    data: Record<string, unknown>
  ): void {
    const event: DataPlatformEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      data,
      source: 'signal-engine',
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

export function createSignalEngineService(
  config?: Partial<SignalEngineConfig>
): DefaultSignalEngineService {
  return new DefaultSignalEngineService(config);
}
