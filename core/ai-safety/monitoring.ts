/**
 * TONAIAgent - Monitoring & Anomaly Detection Module
 *
 * Real-time monitoring system for autonomous agents:
 * - Anomaly detection using statistical and behavioral methods
 * - Trading behavior pattern analysis
 * - Risk spike detection
 * - Fraud and manipulation detection
 */

import {
  MonitoringConfig,
  Anomaly,
  AnomalyType,
  AgentBehaviorProfile,
  TradingPattern,
  BehavioralRiskProfile,
  AnomalySummary,
  AlertChannel,
  SafetyLevel,
  AISafetyEvent,
  AISafetyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface MonitoringManager {
  // Configuration
  configure(config: Partial<MonitoringConfig>): MonitoringConfig;
  getConfig(): MonitoringConfig;

  // Anomaly Detection
  recordActivity(agentId: string, activity: ActivityRecord): Promise<AnomalyCheckResult>;
  detectAnomalies(agentId: string): Promise<Anomaly[]>;
  getAnomalies(agentId: string, filters?: AnomalyFilters): Promise<Anomaly[]>;
  resolveAnomaly(anomalyId: string, resolution: AnomalyResolutionInput): Promise<void>;
  getAnomalyStatistics(agentId?: string): AnomalyStatistics;

  // Behavior Analysis
  buildBehaviorProfile(agentId: string): Promise<AgentBehaviorProfile>;
  getBehaviorProfile(agentId: string): AgentBehaviorProfile | null;
  updateBehaviorProfile(agentId: string, activity: ActivityRecord): Promise<void>;
  compareBehavior(agentId: string, activity: ActivityRecord): BehaviorComparison;
  getTrustScore(agentId: string): number;

  // Pattern Detection
  detectPatterns(agentId: string): DetectedPattern[];
  checkFraudPatterns(agentId: string, activity: ActivityRecord): FraudCheckResult;

  // Alerting
  sendAlert(alert: AlertInput): Promise<void>;
  getAlertHistory(agentId?: string, limit?: number): Alert[];
  configureAlertChannel(channel: AlertChannel): void;

  // Events
  onEvent(callback: AISafetyEventCallback): void;
}

export interface ActivityRecord {
  type: 'trade' | 'transfer' | 'stake' | 'withdrawal' | 'other';
  amount: number;
  currency: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AnomalyCheckResult {
  anomalyDetected: boolean;
  anomalies: Anomaly[];
  riskLevel: SafetyLevel;
  recommendation: string;
}

export interface AnomalyFilters {
  types?: AnomalyType[];
  severities?: SafetyLevel[];
  status?: Anomaly['status'][];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface AnomalyResolutionInput {
  resolvedBy: string;
  resolution: 'confirmed_anomaly' | 'false_positive' | 'expected_behavior';
  action: string;
  notes: string;
}

export interface AnomalyStatistics {
  total: number;
  open: number;
  resolved: number;
  falsePositives: number;
  byType: Record<AnomalyType, number>;
  bySeverity: Record<SafetyLevel, number>;
  avgResolutionTimeHours: number;
}

export interface BehaviorComparison {
  withinNormal: boolean;
  deviationScore: number;
  deviations: BehaviorDeviation[];
}

export interface BehaviorDeviation {
  metric: string;
  expected: number;
  actual: number;
  deviation: number;
  severity: SafetyLevel;
}

export interface DetectedPattern {
  type: string;
  confidence: number;
  frequency: number;
  description: string;
  timeRange: { start: Date; end: Date };
}

export interface FraudCheckResult {
  fraudDetected: boolean;
  patterns: FraudPattern[];
  riskScore: number;
  recommendation: string;
}

export interface FraudPattern {
  type: 'rapid_drain' | 'wash_trading' | 'pump_and_dump' | 'layering' | 'spoofing' | 'front_running';
  confidence: number;
  evidence: string[];
  severity: SafetyLevel;
}

export interface AlertInput {
  agentId?: string;
  type: string;
  severity: SafetyLevel;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  agentId?: string;
  type: string;
  severity: SafetyLevel;
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  realTime: true,
  anomalyDetection: {
    enabled: true,
    methods: ['statistical', 'rule_based', 'behavioral'],
    sensitivityLevel: 'medium',
    learningPeriod: 7,
    baselineUpdateFrequency: '1d',
  },
  behaviorAnalysis: {
    enabled: true,
    trackingPeriod: 30,
    metrics: [
      { name: 'trade_frequency', type: 'frequency', aggregation: 'count', window: '1h' },
      { name: 'trade_volume', type: 'volume', aggregation: 'sum', window: '1d' },
      { name: 'avg_trade_size', type: 'volume', aggregation: 'avg', window: '1d' },
      { name: 'risk_exposure', type: 'risk', aggregation: 'max', window: '1h' },
    ],
    profileUpdateFrequency: '1h',
  },
  alerting: {
    enabled: true,
    channels: [],
    escalationPolicy: {
      levels: [
        { level: 1, recipients: [], timeout: 30, actions: ['notify'] },
        { level: 2, recipients: [], timeout: 60, actions: ['notify', 'pause_agent'] },
        { level: 3, recipients: [], timeout: 120, actions: ['notify', 'emergency_stop'] },
      ],
      defaultTimeout: 60,
    },
  },
};

// ============================================================================
// Monitoring Manager Implementation
// ============================================================================

export class DefaultMonitoringManager implements MonitoringManager {
  private config: MonitoringConfig;
  private readonly activityHistory = new Map<string, ActivityRecord[]>();
  private readonly anomalies = new Map<string, Anomaly>();
  private readonly anomaliesByAgent = new Map<string, string[]>();
  private readonly behaviorProfiles = new Map<string, AgentBehaviorProfile>();
  private readonly alerts: Alert[] = [];
  private readonly alertChannels = new Map<string, AlertChannel>();
  private readonly eventCallbacks: AISafetyEventCallback[] = [];
  private anomalyCounter = 0;
  private alertCounter = 0;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
  }

  // ========== Configuration ==========

  configure(config: Partial<MonitoringConfig>): MonitoringConfig {
    this.config = {
      ...this.config,
      ...config,
      anomalyDetection: { ...this.config.anomalyDetection, ...config.anomalyDetection },
      behaviorAnalysis: { ...this.config.behaviorAnalysis, ...config.behaviorAnalysis },
      alerting: { ...this.config.alerting, ...config.alerting },
    };
    return this.config;
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  // ========== Anomaly Detection ==========

  async recordActivity(agentId: string, activity: ActivityRecord): Promise<AnomalyCheckResult> {
    // Store activity
    if (!this.activityHistory.has(agentId)) {
      this.activityHistory.set(agentId, []);
    }
    const history = this.activityHistory.get(agentId)!;
    history.push(activity);

    // Keep last 10000 records
    if (history.length > 10000) {
      history.shift();
    }

    // Update behavior profile
    await this.updateBehaviorProfile(agentId, activity);

    // Check for anomalies
    const anomalies = await this.checkForAnomalies(agentId, activity);

    // Determine risk level
    let riskLevel: SafetyLevel = 'low';
    if (anomalies.some((a) => a.severity === 'critical')) {
      riskLevel = 'critical';
    } else if (anomalies.some((a) => a.severity === 'high')) {
      riskLevel = 'high';
    } else if (anomalies.some((a) => a.severity === 'medium')) {
      riskLevel = 'medium';
    }

    // Send alerts for serious anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        await this.sendAlert({
          agentId,
          type: anomaly.type,
          severity: anomaly.severity,
          title: `Anomaly Detected: ${anomaly.type}`,
          message: anomaly.description,
          metadata: { anomalyId: anomaly.id },
        });
      }
    }

    return {
      anomalyDetected: anomalies.length > 0,
      anomalies,
      riskLevel,
      recommendation: anomalies.length > 0
        ? `Detected ${anomalies.length} anomalies. Review agent behavior.`
        : 'No anomalies detected.',
    };
  }

  async detectAnomalies(agentId: string): Promise<Anomaly[]> {
    const anomalyIds = this.anomaliesByAgent.get(agentId) || [];
    return anomalyIds
      .map((id) => this.anomalies.get(id))
      .filter((a): a is Anomaly => a !== undefined && a.status === 'open');
  }

  async getAnomalies(agentId: string, filters?: AnomalyFilters): Promise<Anomaly[]> {
    const anomalyIds = this.anomaliesByAgent.get(agentId) || [];
    let results = anomalyIds
      .map((id) => this.anomalies.get(id))
      .filter((a): a is Anomaly => a !== undefined);

    if (filters) {
      if (filters.types) {
        results = results.filter((a) => filters.types!.includes(a.type));
      }
      if (filters.severities) {
        results = results.filter((a) => filters.severities!.includes(a.severity));
      }
      if (filters.status) {
        results = results.filter((a) => filters.status!.includes(a.status));
      }
      if (filters.startDate) {
        results = results.filter((a) => a.detectedAt >= filters.startDate!);
      }
      if (filters.endDate) {
        results = results.filter((a) => a.detectedAt <= filters.endDate!);
      }
      if (filters.limit) {
        results = results.slice(0, filters.limit);
      }
    }

    return results.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  async resolveAnomaly(anomalyId: string, resolution: AnomalyResolutionInput): Promise<void> {
    const anomaly = this.anomalies.get(anomalyId);
    if (!anomaly) {
      throw new Error(`Anomaly not found: ${anomalyId}`);
    }

    anomaly.status = 'resolved';
    anomaly.resolution = {
      resolvedBy: resolution.resolvedBy,
      resolvedAt: new Date(),
      resolution: resolution.resolution,
      action: resolution.action,
      notes: resolution.notes,
    };

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'anomaly_detected',
      agentId: anomaly.agentId,
      severity: 'low',
      description: `Anomaly resolved: ${anomaly.type}`,
      details: { anomalyId, resolution },
      metadata: {},
    });
  }

  getAnomalyStatistics(agentId?: string): AnomalyStatistics {
    let anomalies = Array.from(this.anomalies.values());

    if (agentId) {
      anomalies = anomalies.filter((a) => a.agentId === agentId);
    }

    const byType: Record<AnomalyType, number> = {} as Record<AnomalyType, number>;
    const bySeverity: Record<SafetyLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let falsePositives = 0;

    for (const anomaly of anomalies) {
      byType[anomaly.type] = (byType[anomaly.type] || 0) + 1;
      bySeverity[anomaly.severity]++;

      if (anomaly.resolution) {
        resolvedCount++;
        totalResolutionTime +=
          anomaly.resolution.resolvedAt.getTime() - anomaly.detectedAt.getTime();

        if (anomaly.resolution.resolution === 'false_positive') {
          falsePositives++;
        }
      }
    }

    return {
      total: anomalies.length,
      open: anomalies.filter((a) => a.status === 'open').length,
      resolved: resolvedCount,
      falsePositives,
      byType,
      bySeverity,
      avgResolutionTimeHours:
        resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) : 0,
    };
  }

  // ========== Behavior Analysis ==========

  async buildBehaviorProfile(agentId: string): Promise<AgentBehaviorProfile> {
    const history = this.activityHistory.get(agentId) || [];

    // Analyze trading patterns
    const tradingPatterns: TradingPattern[] = [];
    const trades = history.filter((a) => a.type === 'trade');

    if (trades.length > 0) {
      // Calculate average trade size
      const avgSize = trades.reduce((sum, t) => sum + t.amount, 0) / trades.length;

      // Find preferred trading hours
      const hourCounts = new Array(24).fill(0);
      for (const trade of trades) {
        hourCounts[trade.timestamp.getHours()]++;
      }
      const preferredHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .filter((h) => h.count > trades.length / 24)
        .map((h) => `${h.hour}:00`);

      // Find preferred assets
      const assetCounts: Record<string, number> = {};
      for (const trade of trades) {
        assetCounts[trade.currency] = (assetCounts[trade.currency] || 0) + 1;
      }
      const preferredAssets = Object.entries(assetCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([asset]) => asset);

      tradingPatterns.push({
        type: 'general_trading',
        frequency: trades.length / 30, // per day average
        avgSize,
        preferredTimes: preferredHours,
        preferredAssets,
        avgHoldingPeriod: '1d', // Would calculate from actual data
      });
    }

    // Calculate risk profile
    const riskProfile: BehavioralRiskProfile = {
      overallRisk: 'medium',
      riskTolerance: 0.5,
      volatilityPreference: 'medium',
      concentrationTendency: 0.3,
      tradingAggressiveness: 0.4,
    };

    // Build anomaly summary
    const anomalySummary: AnomalySummary[] = [];
    const agentAnomalies = await this.getAnomalies(agentId);
    const anomalyTypes = new Set(agentAnomalies.map((a) => a.type));

    for (const type of anomalyTypes) {
      const typeAnomalies = agentAnomalies.filter((a) => a.type === type);
      anomalySummary.push({
        type,
        count: typeAnomalies.length,
        lastOccurrence: typeAnomalies[0]?.detectedAt || new Date(),
        avgSeverity: 'medium', // Would calculate properly
      });
    }

    const profile: AgentBehaviorProfile = {
      agentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      tradingPatterns,
      riskProfile,
      anomalyHistory: anomalySummary,
      trustScore: this.calculateTrustScore(agentId, anomalySummary),
    };

    this.behaviorProfiles.set(agentId, profile);
    return profile;
  }

  getBehaviorProfile(agentId: string): AgentBehaviorProfile | null {
    return this.behaviorProfiles.get(agentId) || null;
  }

  async updateBehaviorProfile(agentId: string, _activity: ActivityRecord): Promise<void> {
    let profile = this.behaviorProfiles.get(agentId);

    if (!profile) {
      profile = await this.buildBehaviorProfile(agentId);
    }

    // Update profile based on new activity
    profile.updatedAt = new Date();

    // Recalculate trust score
    const stats = this.getAnomalyStatistics(agentId);
    profile.trustScore = 100 - stats.open * 10 - stats.total * 2;
    profile.trustScore = Math.max(0, Math.min(100, profile.trustScore));

    this.behaviorProfiles.set(agentId, profile);
  }

  compareBehavior(agentId: string, activity: ActivityRecord): BehaviorComparison {
    const profile = this.behaviorProfiles.get(agentId);
    const deviations: BehaviorDeviation[] = [];

    if (!profile || profile.tradingPatterns.length === 0) {
      return {
        withinNormal: true,
        deviationScore: 0,
        deviations: [],
      };
    }

    const pattern = profile.tradingPatterns[0];

    // Check trade size deviation
    if (pattern.avgSize > 0) {
      const sizeDeviation = Math.abs(activity.amount - pattern.avgSize) / pattern.avgSize;
      if (sizeDeviation > 0.5) {
        deviations.push({
          metric: 'trade_size',
          expected: pattern.avgSize,
          actual: activity.amount,
          deviation: sizeDeviation,
          severity: sizeDeviation > 1 ? 'high' : 'medium',
        });
      }
    }

    // Check trading time
    const currentHour = `${activity.timestamp.getHours()}:00`;
    if (!pattern.preferredTimes.includes(currentHour)) {
      deviations.push({
        metric: 'trading_time',
        expected: -1, // N/A
        actual: activity.timestamp.getHours(),
        deviation: 1,
        severity: 'low',
      });
    }

    // Check asset preference
    if (!pattern.preferredAssets.includes(activity.currency)) {
      deviations.push({
        metric: 'asset_preference',
        expected: -1, // N/A
        actual: -1,
        deviation: 0.5,
        severity: 'low',
      });
    }

    const deviationScore = deviations.reduce((sum, d) => sum + d.deviation, 0) / Math.max(1, deviations.length);

    return {
      withinNormal: deviations.filter((d) => d.severity === 'high').length === 0,
      deviationScore,
      deviations,
    };
  }

  getTrustScore(agentId: string): number {
    const profile = this.behaviorProfiles.get(agentId);
    return profile?.trustScore ?? 80; // Default trust score for new agents
  }

  // ========== Pattern Detection ==========

  detectPatterns(agentId: string): DetectedPattern[] {
    const history = this.activityHistory.get(agentId) || [];
    const patterns: DetectedPattern[] = [];

    if (history.length < 10) {
      return patterns;
    }

    // Detect frequency patterns
    const hourlyActivity = new Array(24).fill(0);
    for (const activity of history) {
      hourlyActivity[activity.timestamp.getHours()]++;
    }

    const maxHourlyActivity = Math.max(...hourlyActivity);
    const avgHourlyActivity = history.length / 24;

    if (maxHourlyActivity > avgHourlyActivity * 3) {
      const peakHour = hourlyActivity.indexOf(maxHourlyActivity);
      patterns.push({
        type: 'time_clustering',
        confidence: 0.8,
        frequency: maxHourlyActivity,
        description: `High activity concentration at ${peakHour}:00`,
        timeRange: {
          start: history[0].timestamp,
          end: history[history.length - 1].timestamp,
        },
      });
    }

    // Detect volume patterns
    const recentActivities = history.slice(-50);
    const avgVolume = recentActivities.reduce((sum, a) => sum + a.amount, 0) / recentActivities.length;
    const largeTransactions = recentActivities.filter((a) => a.amount > avgVolume * 3);

    if (largeTransactions.length > 5) {
      patterns.push({
        type: 'large_transaction_pattern',
        confidence: 0.7,
        frequency: largeTransactions.length,
        description: 'Multiple large transactions detected',
        timeRange: {
          start: largeTransactions[0].timestamp,
          end: largeTransactions[largeTransactions.length - 1].timestamp,
        },
      });
    }

    return patterns;
  }

  checkFraudPatterns(agentId: string, activity: ActivityRecord): FraudCheckResult {
    const history = this.activityHistory.get(agentId) || [];
    const patterns: FraudPattern[] = [];
    let riskScore = 0;

    // Check for rapid drain
    const recentActivities = history.filter(
      (a) => a.timestamp.getTime() > Date.now() - 60 * 60 * 1000 // Last hour
    );
    const withdrawals = recentActivities.filter((a) => a.type === 'withdrawal');
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    if (withdrawals.length > 5 && totalWithdrawals > 10000) {
      patterns.push({
        type: 'rapid_drain',
        confidence: 0.85,
        evidence: [`${withdrawals.length} withdrawals totaling ${totalWithdrawals} in 1 hour`],
        severity: 'critical',
      });
      riskScore += 40;
    }

    // Check for wash trading
    const trades = history.filter((a) => a.type === 'trade').slice(-100);
    const buyThenSell = trades.filter((t, i) => {
      if (i === 0) return false;
      const prev = trades[i - 1];
      const timeDiff = t.timestamp.getTime() - prev.timestamp.getTime();
      const sameCurrency = t.currency === prev.currency;
      const sameAmount = Math.abs(t.amount - prev.amount) < prev.amount * 0.1;
      return sameCurrency && sameAmount && timeDiff < 60000; // Within 1 minute
    });

    if (buyThenSell.length > 5) {
      patterns.push({
        type: 'wash_trading',
        confidence: 0.7,
        evidence: [`${buyThenSell.length} potential wash trades detected`],
        severity: 'high',
      });
      riskScore += 25;
    }

    // Check current activity for suspicious signs
    if (activity.type === 'withdrawal' && activity.amount > 10000) {
      riskScore += 10;
    }

    return {
      fraudDetected: patterns.length > 0,
      patterns,
      riskScore: Math.min(100, riskScore),
      recommendation: patterns.length > 0
        ? 'Suspicious patterns detected. Consider pausing agent and investigating.'
        : 'No fraud patterns detected.',
    };
  }

  // ========== Alerting ==========

  async sendAlert(alert: AlertInput): Promise<void> {
    const newAlert: Alert = {
      id: this.generateAlertId(),
      agentId: alert.agentId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(newAlert);

    // Send to configured channels
    for (const channel of this.alertChannels.values()) {
      if (channel.enabled && channel.severityFilter.includes(alert.severity)) {
        await this.sendToChannel(channel, newAlert);
      }
    }

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'anomaly_detected',
      agentId: alert.agentId,
      severity: alert.severity,
      description: alert.title,
      details: { ...alert } as Record<string, unknown>,
      metadata: {},
    });
  }

  getAlertHistory(agentId?: string, limit: number = 100): Alert[] {
    let results = this.alerts;

    if (agentId) {
      results = results.filter((a) => a.agentId === agentId);
    }

    return results.slice(-limit).reverse();
  }

  configureAlertChannel(channel: AlertChannel): void {
    this.alertChannels.set(channel.type, channel);
  }

  // ========== Events ==========

  onEvent(callback: AISafetyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ========== Private Helpers ==========

  private async checkForAnomalies(agentId: string, activity: ActivityRecord): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Statistical anomaly detection
    if (this.config.anomalyDetection.methods.includes('statistical')) {
      const statAnomalies = this.detectStatisticalAnomalies(agentId, activity);
      anomalies.push(...statAnomalies);
    }

    // Behavioral anomaly detection
    if (this.config.anomalyDetection.methods.includes('behavioral')) {
      const comparison = this.compareBehavior(agentId, activity);
      if (!comparison.withinNormal) {
        for (const deviation of comparison.deviations.filter((d) => d.severity !== 'low')) {
          const anomaly = this.createAnomaly(agentId, 'pattern_deviation', deviation.severity, {
            metric: deviation.metric,
            expected: deviation.expected,
            actual: deviation.actual,
          });
          anomalies.push(anomaly);
        }
      }
    }

    // Rule-based anomaly detection
    if (this.config.anomalyDetection.methods.includes('rule_based')) {
      const ruleAnomalies = this.detectRuleBasedAnomalies(agentId, activity);
      anomalies.push(...ruleAnomalies);
    }

    // Store anomalies
    for (const anomaly of anomalies) {
      this.anomalies.set(anomaly.id, anomaly);
      if (!this.anomaliesByAgent.has(agentId)) {
        this.anomaliesByAgent.set(agentId, []);
      }
      this.anomaliesByAgent.get(agentId)!.push(anomaly.id);
    }

    return anomalies;
  }

  private detectStatisticalAnomalies(agentId: string, activity: ActivityRecord): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const history = this.activityHistory.get(agentId) || [];

    if (history.length < 20) {
      return anomalies;
    }

    // Calculate statistics
    const amounts = history.map((a) => a.amount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Check for outlier using z-score
    const zScore = Math.abs((activity.amount - mean) / stdDev);
    const threshold = this.config.anomalyDetection.sensitivityLevel === 'high' ? 2
      : this.config.anomalyDetection.sensitivityLevel === 'medium' ? 2.5
      : 3;

    if (zScore > threshold) {
      anomalies.push(this.createAnomaly(agentId, 'trading_volume_spike', zScore > 4 ? 'high' : 'medium', {
        zScore,
        mean,
        stdDev,
        actualValue: activity.amount,
      }));
    }

    return anomalies;
  }

  private detectRuleBasedAnomalies(agentId: string, activity: ActivityRecord): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Large transaction rule
    if (activity.amount > 100000) {
      anomalies.push(this.createAnomaly(agentId, 'trading_volume_spike', 'high', {
        rule: 'large_transaction',
        threshold: 100000,
        actualValue: activity.amount,
      }));
    }

    // Unusual timing rule (outside typical hours)
    const hour = activity.timestamp.getHours();
    if (hour >= 1 && hour <= 5) {
      anomalies.push(this.createAnomaly(agentId, 'unusual_timing', 'low', {
        rule: 'unusual_hours',
        hour,
      }));
    }

    // Rapid activity rule
    const history = this.activityHistory.get(agentId) || [];
    const recentCount = history.filter(
      (a) => a.timestamp.getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
    ).length;

    if (recentCount > 20) {
      anomalies.push(this.createAnomaly(agentId, 'execution_anomaly', 'medium', {
        rule: 'rapid_activity',
        count: recentCount,
        window: '5 minutes',
      }));
    }

    return anomalies;
  }

  private createAnomaly(
    agentId: string,
    type: AnomalyType,
    severity: SafetyLevel,
    evidenceData: Record<string, unknown>
  ): Anomaly {
    return {
      id: this.generateAnomalyId(),
      type,
      severity,
      agentId,
      description: `${type} detected for agent ${agentId}`,
      detectedAt: new Date(),
      evidence: [{
        type: 'data',
        value: evidenceData,
        expectedRange: { min: 0, max: 0 },
        deviation: 0,
        timestamp: new Date(),
      }],
      status: 'open',
    };
  }

  private calculateTrustScore(_agentId: string, anomalySummary: AnomalySummary[]): number {
    let score = 100;

    for (const summary of anomalySummary) {
      score -= summary.count * 5;
      if (summary.avgSeverity === 'high') score -= 10;
      if (summary.avgSeverity === 'critical') score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async sendToChannel(channel: AlertChannel, alert: Alert): Promise<void> {
    // In production, would send to actual channels
    // For now, just log
    console.log(`[${channel.type}] Alert: ${alert.title}`);
  }

  private generateAnomalyId(): string {
    this.anomalyCounter++;
    return `anomaly_${Date.now()}_${this.anomalyCounter.toString(36)}`;
  }

  private generateAlertId(): string {
    this.alertCounter++;
    return `alert_${Date.now()}_${this.alertCounter.toString(36)}`;
  }

  private emitEvent(event: AISafetyEvent): void {
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

export function createMonitoringManager(config?: Partial<MonitoringConfig>): DefaultMonitoringManager {
  return new DefaultMonitoringManager(config);
}
