/**
 * TONAIAgent - Model Governance Module
 *
 * Manages AI model versioning, evaluation, monitoring, and rollback:
 * - Model version tracking
 * - Performance benchmarking
 * - Automatic rollback on degradation
 * - Provider fallback management
 */

import {
  ModelGovernanceConfig,
  ProviderConfig,
  ModelVersion,
  BenchmarkResult,
  ModelEvaluationResult,
  RollbackTrigger,
  AISafetyEvent,
  AISafetyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface ModelGovernanceManager {
  // Configuration
  configure(config: Partial<ModelGovernanceConfig>): ModelGovernanceConfig;
  getConfig(): ModelGovernanceConfig;

  // Version Management
  registerVersion(version: ModelVersionInput): Promise<ModelVersion>;
  getVersion(versionId: string): ModelVersion | null;
  getActiveVersion(modelId: string): ModelVersion | null;
  listVersions(modelId: string): ModelVersion[];
  activateVersion(versionId: string): Promise<void>;
  deprecateVersion(versionId: string): Promise<void>;
  rollbackToVersion(modelId: string, versionId: string): Promise<RollbackResult>;

  // Evaluation
  evaluateModel(modelId: string, version?: string): Promise<ModelEvaluationResult>;
  runBenchmark(benchmarkId: string, modelId: string): Promise<BenchmarkResult>;
  scheduleBenchmarks(): void;

  // Performance Monitoring
  recordPerformance(modelId: string, metrics: PerformanceInput): void;
  getPerformanceHistory(modelId: string, hours?: number): PerformanceRecord[];
  getPerformanceSummary(modelId: string): PerformanceSummary;
  checkPerformanceThresholds(modelId: string): PerformanceAlert[];

  // Provider Management
  registerProvider(provider: ProviderConfig): void;
  updateProvider(providerId: string, updates: Partial<ProviderConfig>): void;
  getProvider(providerId: string): ProviderConfig | null;
  getProviders(): ProviderConfig[];
  getProviderHealth(providerId: string): ProviderHealth;
  selectProvider(requirements?: ProviderRequirements): ProviderConfig | null;

  // Rollback
  checkRollbackTriggers(modelId: string): RollbackTriggerResult;
  executeRollback(modelId: string, reason: string): Promise<RollbackResult>;

  // Events
  onEvent(callback: AISafetyEventCallback): void;
}

export interface ModelVersionInput {
  modelId: string;
  version: string;
  provider: string;
  deployedBy: string;
  changeNotes: string;
  config: Record<string, unknown>;
}

export interface RollbackResult {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  reason: string;
  timestamp: Date;
}

export interface PerformanceInput {
  accuracy?: number;
  latencyMs: number;
  errorRate?: number;
  costUsd?: number;
  tokenCount?: number;
}

export interface PerformanceRecord {
  timestamp: Date;
  accuracy: number;
  latencyMs: number;
  errorRate: number;
  costPerRequest: number;
  throughput: number;
}

export interface PerformanceSummary {
  modelId: string;
  period: { start: Date; end: Date };
  avgAccuracy: number;
  avgLatencyMs: number;
  avgErrorRate: number;
  totalCostUsd: number;
  totalRequests: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export interface PerformanceAlert {
  type: 'accuracy' | 'latency' | 'error_rate' | 'cost';
  severity: 'warning' | 'critical';
  currentValue: number;
  threshold: number;
  message: string;
}

export interface ProviderHealth {
  providerId: string;
  available: boolean;
  latencyMs: number;
  errorRate: number;
  rateLimit: RateLimitStatus;
  lastCheck: Date;
}

export interface RateLimitStatus {
  current: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
}

export interface ProviderRequirements {
  minPriority?: number;
  maxLatencyMs?: number;
  requiredFeatures?: string[];
  excludeProviders?: string[];
}

export interface RollbackTriggerResult {
  shouldRollback: boolean;
  triggeredBy: RollbackTrigger[];
  recommendation: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_MODEL_GOVERNANCE_CONFIG: ModelGovernanceConfig = {
  enabled: true,
  versioning: {
    trackVersions: true,
    retainVersions: 10,
    requireApprovalForUpdate: false,
    changeLog: true,
  },
  evaluation: {
    enabled: true,
    benchmarks: [
      { id: 'accuracy', name: 'Accuracy Benchmark', type: 'accuracy', expectedScore: 0.9, weight: 0.4 },
      { id: 'latency', name: 'Latency Benchmark', type: 'latency', expectedScore: 500, weight: 0.3 },
      { id: 'safety', name: 'Safety Benchmark', type: 'safety', expectedScore: 0.95, weight: 0.3 },
    ],
    evaluationFrequency: '0 0 * * *', // Daily at midnight
    minAccuracyThreshold: 0.85,
    autoDisable: true,
  },
  performance: {
    enabled: true,
    metrics: [
      { name: 'request_latency', type: 'histogram', description: 'Request latency in ms', labels: ['model', 'provider'] },
      { name: 'request_count', type: 'counter', description: 'Total requests', labels: ['model', 'status'] },
      { name: 'error_rate', type: 'gauge', description: 'Error rate percentage', labels: ['model'] },
    ],
    alertThresholds: {
      latencyMs: 2000,
      errorRate: 0.05,
      accuracy: 0.8,
    },
    aggregationPeriod: '5m',
  },
  rollback: {
    enabled: true,
    autoRollback: true,
    rollbackTriggers: [
      { type: 'error_rate', threshold: 0.1, duration: '5m', action: 'rollback' },
      { type: 'latency', threshold: 5000, duration: '5m', action: 'alert' },
      { type: 'accuracy', threshold: 0.7, duration: '15m', action: 'rollback' },
    ],
    notifyOnRollback: true,
  },
  providers: [],
};

// ============================================================================
// Model Governance Manager Implementation
// ============================================================================

export class DefaultModelGovernanceManager implements ModelGovernanceManager {
  private config: ModelGovernanceConfig;
  private readonly versions = new Map<string, ModelVersion>();
  private readonly versionsByModel = new Map<string, string[]>();
  private readonly activeVersions = new Map<string, string>();
  private readonly performanceHistory = new Map<string, PerformanceRecord[]>();
  private readonly providers = new Map<string, ProviderConfig>();
  private readonly eventCallbacks: AISafetyEventCallback[] = [];
  private versionCounter = 0;

  constructor(config?: Partial<ModelGovernanceConfig>) {
    this.config = { ...DEFAULT_MODEL_GOVERNANCE_CONFIG, ...config };
    this.initializeDefaultProviders();
  }

  // ========== Configuration ==========

  configure(config: Partial<ModelGovernanceConfig>): ModelGovernanceConfig {
    this.config = {
      ...this.config,
      ...config,
      versioning: { ...this.config.versioning, ...config.versioning },
      evaluation: { ...this.config.evaluation, ...config.evaluation },
      performance: { ...this.config.performance, ...config.performance },
      rollback: { ...this.config.rollback, ...config.rollback },
    };
    return this.config;
  }

  getConfig(): ModelGovernanceConfig {
    return { ...this.config };
  }

  // ========== Version Management ==========

  async registerVersion(input: ModelVersionInput): Promise<ModelVersion> {
    const versionId = this.generateVersionId();

    const version: ModelVersion = {
      id: versionId,
      version: input.version,
      modelId: input.modelId,
      provider: input.provider,
      deployedAt: new Date(),
      deployedBy: input.deployedBy,
      status: 'active',
      performance: {
        accuracy: 0,
        latencyMs: 0,
        errorRate: 0,
        costPerRequest: 0,
        throughput: 0,
        sampledAt: new Date(),
      },
      changeNotes: input.changeNotes,
      config: input.config,
    };

    this.versions.set(versionId, version);

    if (!this.versionsByModel.has(input.modelId)) {
      this.versionsByModel.set(input.modelId, []);
    }
    this.versionsByModel.get(input.modelId)!.push(versionId);

    // Set as active if first version
    if (!this.activeVersions.has(input.modelId)) {
      this.activeVersions.set(input.modelId, versionId);
    }

    // Enforce retention limit
    await this.enforceRetentionLimit(input.modelId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'model_update',
      severity: 'low',
      description: `Registered new model version: ${input.modelId}@${input.version}`,
      details: { versionId, modelId: input.modelId, version: input.version },
      metadata: {},
    });

    return version;
  }

  getVersion(versionId: string): ModelVersion | null {
    return this.versions.get(versionId) || null;
  }

  getActiveVersion(modelId: string): ModelVersion | null {
    const activeId = this.activeVersions.get(modelId);
    return activeId ? this.versions.get(activeId) || null : null;
  }

  listVersions(modelId: string): ModelVersion[] {
    const versionIds = this.versionsByModel.get(modelId) || [];
    return versionIds
      .map((id) => this.versions.get(id))
      .filter((v): v is ModelVersion => v !== undefined)
      .sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());
  }

  async activateVersion(versionId: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Deactivate current version
    const currentActiveId = this.activeVersions.get(version.modelId);
    if (currentActiveId) {
      const currentVersion = this.versions.get(currentActiveId);
      if (currentVersion) {
        currentVersion.status = 'deprecated';
      }
    }

    version.status = 'active';
    this.activeVersions.set(version.modelId, versionId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'model_update',
      severity: 'medium',
      description: `Activated model version: ${version.modelId}@${version.version}`,
      details: { versionId, modelId: version.modelId, previousVersion: currentActiveId },
      metadata: {},
    });
  }

  async deprecateVersion(versionId: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (version) {
      version.status = 'deprecated';
    }
  }

  async rollbackToVersion(modelId: string, versionId: string): Promise<RollbackResult> {
    const currentVersion = this.getActiveVersion(modelId);
    const targetVersion = this.versions.get(versionId);

    if (!targetVersion) {
      throw new Error(`Target version not found: ${versionId}`);
    }

    if (targetVersion.modelId !== modelId) {
      throw new Error(`Version ${versionId} does not belong to model ${modelId}`);
    }

    await this.activateVersion(versionId);

    const result: RollbackResult = {
      success: true,
      previousVersion: currentVersion?.version || 'none',
      newVersion: targetVersion.version,
      reason: 'Manual rollback',
      timestamp: new Date(),
    };

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'model_update',
      severity: 'high',
      description: `Rolled back ${modelId} from ${result.previousVersion} to ${result.newVersion}`,
      details: { ...result } as Record<string, unknown>,
      metadata: {},
    });

    return result;
  }

  // ========== Evaluation ==========

  async evaluateModel(modelId: string, version?: string): Promise<ModelEvaluationResult> {
    const targetVersion = version
      ? this.listVersions(modelId).find((v) => v.version === version)
      : this.getActiveVersion(modelId);

    if (!targetVersion) {
      throw new Error(`No version found for model: ${modelId}`);
    }

    const benchmarkResults: BenchmarkResult[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    for (const benchmark of this.config.evaluation.benchmarks) {
      const result = await this.runBenchmark(benchmark.id, modelId);
      benchmarkResults.push(result);
      totalScore += result.score * benchmark.weight;
      totalWeight += benchmark.weight;
    }

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const passed = overallScore >= this.config.evaluation.minAccuracyThreshold;

    const recommendations: string[] = [];
    for (const result of benchmarkResults) {
      if (!result.passed) {
        const benchmark = this.config.evaluation.benchmarks.find((b) => b.id === result.benchmarkId);
        if (benchmark) {
          recommendations.push(`Improve ${benchmark.name}: current ${result.score.toFixed(2)} vs expected ${benchmark.expectedScore}`);
        }
      }
    }

    return {
      modelId,
      version: targetVersion.version,
      evaluatedAt: new Date(),
      overallScore,
      benchmarkResults,
      passed,
      recommendations,
    };
  }

  async runBenchmark(benchmarkId: string, modelId: string): Promise<BenchmarkResult> {
    const benchmark = this.config.evaluation.benchmarks.find((b) => b.id === benchmarkId);
    if (!benchmark) {
      throw new Error(`Benchmark not found: ${benchmarkId}`);
    }

    // Simulate benchmark (in production, would run actual tests)
    const performanceSummary = this.getPerformanceSummary(modelId);
    let score: number;
    let passed: boolean;

    switch (benchmark.type) {
      case 'accuracy':
        score = performanceSummary.avgAccuracy || 0.9;
        passed = score >= benchmark.expectedScore;
        break;
      case 'latency':
        score = performanceSummary.avgLatencyMs || 200;
        passed = score <= benchmark.expectedScore;
        break;
      case 'safety':
        score = 0.95; // Would run safety benchmarks
        passed = score >= benchmark.expectedScore;
        break;
      default:
        score = 0.5;
        passed = false;
    }

    return {
      benchmarkId,
      score,
      passed,
      details: {
        benchmark: benchmark.name,
        expectedScore: benchmark.expectedScore,
        actualScore: score,
      },
    };
  }

  scheduleBenchmarks(): void {
    // In production, would use cron or scheduler
    // For now, benchmarks are run on-demand
  }

  // ========== Performance Monitoring ==========

  recordPerformance(modelId: string, metrics: PerformanceInput): void {
    if (!this.performanceHistory.has(modelId)) {
      this.performanceHistory.set(modelId, []);
    }

    const history = this.performanceHistory.get(modelId)!;
    history.push({
      timestamp: new Date(),
      accuracy: metrics.accuracy ?? 0.9,
      latencyMs: metrics.latencyMs,
      errorRate: metrics.errorRate ?? 0,
      costPerRequest: metrics.costUsd ?? 0,
      throughput: 1,
    });

    // Keep last 1000 records
    if (history.length > 1000) {
      history.shift();
    }

    // Check for alerts
    const alerts = this.checkPerformanceThresholds(modelId);
    for (const alert of alerts) {
      if (alert.severity === 'critical') {
        this.emitEvent({
          id: `event_${Date.now()}`,
          timestamp: new Date(),
          type: 'guardrail_triggered',
          severity: 'high',
          description: alert.message,
          details: { modelId, alert },
          metadata: {},
        });
      }
    }
  }

  getPerformanceHistory(modelId: string, hours: number = 24): PerformanceRecord[] {
    const history = this.performanceHistory.get(modelId) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return history.filter((r) => r.timestamp >= cutoff);
  }

  getPerformanceSummary(modelId: string): PerformanceSummary {
    const history = this.getPerformanceHistory(modelId);

    if (history.length === 0) {
      return {
        modelId,
        period: { start: new Date(), end: new Date() },
        avgAccuracy: 0,
        avgLatencyMs: 0,
        avgErrorRate: 0,
        totalCostUsd: 0,
        totalRequests: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
      };
    }

    const latencies = history.map((r) => r.latencyMs).sort((a, b) => a - b);
    const p50Index = Math.floor(latencies.length * 0.5);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    return {
      modelId,
      period: {
        start: history[0].timestamp,
        end: history[history.length - 1].timestamp,
      },
      avgAccuracy: history.reduce((sum, r) => sum + r.accuracy, 0) / history.length,
      avgLatencyMs: history.reduce((sum, r) => sum + r.latencyMs, 0) / history.length,
      avgErrorRate: history.reduce((sum, r) => sum + r.errorRate, 0) / history.length,
      totalCostUsd: history.reduce((sum, r) => sum + r.costPerRequest, 0),
      totalRequests: history.length,
      p50LatencyMs: latencies[p50Index] || 0,
      p95LatencyMs: latencies[p95Index] || 0,
      p99LatencyMs: latencies[p99Index] || 0,
    };
  }

  checkPerformanceThresholds(modelId: string): PerformanceAlert[] {
    const summary = this.getPerformanceSummary(modelId);
    const alerts: PerformanceAlert[] = [];
    const thresholds = this.config.performance.alertThresholds;

    if (summary.avgLatencyMs > thresholds.latencyMs) {
      alerts.push({
        type: 'latency',
        severity: summary.avgLatencyMs > thresholds.latencyMs * 2 ? 'critical' : 'warning',
        currentValue: summary.avgLatencyMs,
        threshold: thresholds.latencyMs,
        message: `Model ${modelId} latency ${summary.avgLatencyMs.toFixed(0)}ms exceeds threshold ${thresholds.latencyMs}ms`,
      });
    }

    if (summary.avgErrorRate > thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: summary.avgErrorRate > thresholds.errorRate * 2 ? 'critical' : 'warning',
        currentValue: summary.avgErrorRate,
        threshold: thresholds.errorRate,
        message: `Model ${modelId} error rate ${(summary.avgErrorRate * 100).toFixed(1)}% exceeds threshold`,
      });
    }

    if (summary.avgAccuracy < thresholds.accuracy) {
      alerts.push({
        type: 'accuracy',
        severity: summary.avgAccuracy < thresholds.accuracy * 0.9 ? 'critical' : 'warning',
        currentValue: summary.avgAccuracy,
        threshold: thresholds.accuracy,
        message: `Model ${modelId} accuracy ${(summary.avgAccuracy * 100).toFixed(1)}% below threshold`,
      });
    }

    return alerts;
  }

  // ========== Provider Management ==========

  registerProvider(provider: ProviderConfig): void {
    this.providers.set(provider.id, provider);
  }

  updateProvider(providerId: string, updates: Partial<ProviderConfig>): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      this.providers.set(providerId, { ...provider, ...updates });
    }
  }

  getProvider(providerId: string): ProviderConfig | null {
    return this.providers.get(providerId) || null;
  }

  getProviders(): ProviderConfig[] {
    return Array.from(this.providers.values()).sort((a, b) => b.priority - a.priority);
  }

  getProviderHealth(providerId: string): ProviderHealth {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Find rate limit info
    const rateLimitInfo = provider.rateLimits[0] || { type: 'requests_per_minute', limit: 100, current: 0 };

    return {
      providerId,
      available: provider.enabled,
      latencyMs: 200, // Would be actual measurement
      errorRate: 0.01, // Would be calculated from history
      rateLimit: {
        current: rateLimitInfo.current,
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.limit - rateLimitInfo.current,
        resetsAt: new Date(Date.now() + 60000),
      },
      lastCheck: new Date(),
    };
  }

  selectProvider(requirements?: ProviderRequirements): ProviderConfig | null {
    const candidates = this.getProviders().filter((p) => {
      if (!p.enabled) return false;
      if (requirements?.excludeProviders?.includes(p.id)) return false;
      if (requirements?.minPriority && p.priority < requirements.minPriority) return false;
      return true;
    });

    return candidates.length > 0 ? candidates[0] : null;
  }

  // ========== Rollback ==========

  checkRollbackTriggers(modelId: string): RollbackTriggerResult {
    const summary = this.getPerformanceSummary(modelId);
    const triggeredBy: RollbackTrigger[] = [];

    for (const trigger of this.config.rollback.rollbackTriggers) {
      let shouldTrigger = false;

      switch (trigger.type) {
        case 'error_rate':
          shouldTrigger = summary.avgErrorRate > trigger.threshold;
          break;
        case 'latency':
          shouldTrigger = summary.avgLatencyMs > trigger.threshold;
          break;
        case 'accuracy':
          shouldTrigger = summary.avgAccuracy < trigger.threshold;
          break;
      }

      if (shouldTrigger) {
        triggeredBy.push(trigger);
      }
    }

    const shouldRollback =
      this.config.rollback.autoRollback &&
      triggeredBy.some((t) => t.action === 'rollback');

    return {
      shouldRollback,
      triggeredBy,
      recommendation: shouldRollback
        ? 'Automatic rollback recommended due to performance degradation'
        : triggeredBy.length > 0
        ? 'Performance issues detected, monitor closely'
        : 'No issues detected',
    };
  }

  async executeRollback(modelId: string, reason: string): Promise<RollbackResult> {
    const versions = this.listVersions(modelId);
    const currentVersion = this.getActiveVersion(modelId);

    // Find previous stable version
    const previousVersion = versions.find(
      (v) => v.status === 'deprecated' && v.id !== currentVersion?.id
    );

    if (!previousVersion) {
      throw new Error(`No previous version available for rollback: ${modelId}`);
    }

    const result = await this.rollbackToVersion(modelId, previousVersion.id);
    result.reason = reason;

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'model_update',
      severity: 'critical',
      description: `Automatic rollback executed for ${modelId}: ${reason}`,
      details: { ...result } as Record<string, unknown>,
      metadata: {},
    });

    return result;
  }

  // ========== Events ==========

  onEvent(callback: AISafetyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ========== Private Helpers ==========

  private initializeDefaultProviders(): void {
    const defaultProviders: ProviderConfig[] = [
      {
        id: 'groq',
        name: 'Groq',
        type: 'groq',
        priority: 100,
        enabled: true,
        fallbackTo: 'anthropic',
        rateLimits: [
          { type: 'requests_per_minute', limit: 30, current: 0 },
          { type: 'tokens_per_minute', limit: 100000, current: 0 },
        ],
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        type: 'anthropic',
        priority: 90,
        enabled: true,
        fallbackTo: 'openai',
        rateLimits: [
          { type: 'requests_per_minute', limit: 50, current: 0 },
        ],
      },
      {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        priority: 80,
        enabled: true,
        rateLimits: [
          { type: 'requests_per_minute', limit: 60, current: 0 },
        ],
      },
    ];

    for (const provider of defaultProviders) {
      this.providers.set(provider.id, provider);
    }
  }

  private generateVersionId(): string {
    this.versionCounter++;
    return `version_${Date.now()}_${this.versionCounter.toString(36)}`;
  }

  private async enforceRetentionLimit(modelId: string): Promise<void> {
    const versions = this.listVersions(modelId);
    const limit = this.config.versioning.retainVersions;

    if (versions.length > limit) {
      const toRemove = versions.slice(limit);
      for (const version of toRemove) {
        if (version.status !== 'active') {
          this.versions.delete(version.id);
          const modelVersions = this.versionsByModel.get(modelId);
          if (modelVersions) {
            const index = modelVersions.indexOf(version.id);
            if (index > -1) {
              modelVersions.splice(index, 1);
            }
          }
        }
      }
    }
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

export function createModelGovernanceManager(config?: Partial<ModelGovernanceConfig>): DefaultModelGovernanceManager {
  return new DefaultModelGovernanceManager(config);
}
