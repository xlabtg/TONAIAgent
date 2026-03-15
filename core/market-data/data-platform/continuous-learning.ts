/**
 * TONAIAgent - Continuous Learning Module
 *
 * Enables agents to improve through feedback loops, reinforcement learning,
 * and performance tracking.
 */

import {
  ContinuousLearningConfig,
  ModelPerformance,
  ModelType,
  ModelMetrics,
  TrainingRun,
  FeedbackRecord,
  AgentLearningState,
  DataPlatformEvent,
  DataPlatformEventCallback,
} from './types';

// ============================================================================
// Continuous Learning Service
// ============================================================================

export interface ContinuousLearningService {
  // Model management
  registerModel(params: RegisterModelParams): Promise<ModelPerformance>;
  getModel(modelId: string): ModelPerformance | undefined;
  listModels(type?: ModelType): ModelPerformance[];
  updateModelMetrics(modelId: string, metrics: Partial<ModelMetrics>): void;

  // Training
  scheduleTraining(modelId: string, params?: TrainingParams): Promise<TrainingRun>;
  cancelTraining(runId: string): Promise<void>;
  getTrainingRun(runId: string): TrainingRun | undefined;
  getTrainingHistory(modelId: string): TrainingRun[];

  // Feedback
  recordFeedback(feedback: RecordFeedbackParams): Promise<FeedbackRecord>;
  getFeedback(signalId: string): FeedbackRecord[];
  processFeedbackBatch(modelId: string): Promise<FeedbackProcessingResult>;

  // Agent learning
  getAgentState(agentId: string): AgentLearningState | undefined;
  updateAgentState(agentId: string, updates: Partial<AgentLearningState>): void;
  getAgentPerformanceTrend(agentId: string): PerformanceTrend;

  // Model improvement
  evaluateModel(modelId: string): Promise<ModelEvaluation>;
  suggestRetraining(modelId: string): Promise<RetrainingSuggestion>;
  compareModels(modelIds: string[]): Promise<ModelComparison>;

  // Configuration
  configure(config: Partial<ContinuousLearningConfig>): void;

  // Events
  onEvent(callback: DataPlatformEventCallback): void;
}

// ============================================================================
// Additional Types
// ============================================================================

export interface RegisterModelParams {
  name: string;
  type: ModelType;
  version: string;
  initialMetrics?: Partial<ModelMetrics>;
}

export interface TrainingParams {
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  validationSplit?: number;
  earlyStoppingPatience?: number;
}

export interface RecordFeedbackParams {
  signalId: string;
  modelId?: string;
  type: 'outcome' | 'user' | 'system';
  outcome: 'correct' | 'incorrect' | 'partial';
  expectedValue?: number;
  actualValue?: number;
  profit?: number;
  userRating?: number;
  comments?: string;
}

export interface FeedbackProcessingResult {
  modelId: string;
  feedbackProcessed: number;
  metricsUpdated: boolean;
  retrainingTriggered: boolean;
  improvements: Record<string, number>;
}

export interface PerformanceTrend {
  agentId: string;
  trend: 'improving' | 'stable' | 'declining';
  recentAccuracy: number;
  historicalAccuracy: number;
  changePercent: number;
  dataPoints: TrendDataPoint[];
}

export interface TrendDataPoint {
  timestamp: Date;
  accuracy: number;
  profit: number;
  signalsProcessed: number;
}

export interface ModelEvaluation {
  modelId: string;
  currentMetrics: ModelMetrics;
  benchmarkComparison: BenchmarkResult[];
  weaknesses: string[];
  strengths: string[];
  overallScore: number;
  recommendations: string[];
}

export interface BenchmarkResult {
  benchmarkName: string;
  modelScore: number;
  benchmarkScore: number;
  delta: number;
  status: 'above' | 'below' | 'equal';
}

export interface RetrainingSuggestion {
  modelId: string;
  shouldRetrain: boolean;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  suggestedParams: TrainingParams;
  expectedImprovement: number;
  dataRequirements: DataRequirements;
}

export interface DataRequirements {
  minSamples: number;
  currentSamples: number;
  samplesNeeded: number;
  dataQuality: 'low' | 'medium' | 'high';
}

export interface ModelComparison {
  models: ModelPerformance[];
  rankings: ModelRanking[];
  recommendations: string[];
  bestModel: string;
}

export interface ModelRanking {
  modelId: string;
  rank: number;
  score: number;
  strengths: string[];
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultContinuousLearningService implements ContinuousLearningService {
  private config: ContinuousLearningConfig;
  private readonly models: Map<string, ModelPerformance> = new Map();
  private readonly trainingRuns: Map<string, TrainingRun> = new Map();
  private readonly feedback: Map<string, FeedbackRecord[]> = new Map();
  private readonly agentStates: Map<string, AgentLearningState> = new Map();
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  constructor(config?: Partial<ContinuousLearningConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      feedbackLoopEnabled: config?.feedbackLoopEnabled ?? true,
      retrainingFrequency: config?.retrainingFrequency ?? 24,
      minSamplesForUpdate: config?.minSamplesForUpdate ?? 100,
      performanceThreshold: config?.performanceThreshold ?? 0.7,
    };

    this.initializeMockModels();
  }

  // Model Management
  async registerModel(params: RegisterModelParams): Promise<ModelPerformance> {
    const modelId = `model_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const model: ModelPerformance = {
      modelId,
      name: params.name,
      version: params.version,
      type: params.type,
      metrics: {
        accuracy: params.initialMetrics?.accuracy ?? 0.5,
        precision: params.initialMetrics?.precision ?? 0.5,
        recall: params.initialMetrics?.recall ?? 0.5,
        f1Score: params.initialMetrics?.f1Score ?? 0.5,
        ...(params.initialMetrics ?? {}),
      },
      trainingHistory: [],
      lastTrainedAt: new Date(),
    };

    this.models.set(modelId, model);

    this.emitEvent('model_updated', 'learning', {
      action: 'model_registered',
      modelId,
      name: params.name,
      type: params.type,
    });

    return model;
  }

  getModel(modelId: string): ModelPerformance | undefined {
    return this.models.get(modelId);
  }

  listModels(type?: ModelType): ModelPerformance[] {
    let models = Array.from(this.models.values());
    if (type) {
      models = models.filter((m) => m.type === type);
    }
    return models;
  }

  updateModelMetrics(modelId: string, metrics: Partial<ModelMetrics>): void {
    const model = this.models.get(modelId);
    if (model) {
      model.metrics = { ...model.metrics, ...metrics };
    }
  }

  // Training
  async scheduleTraining(modelId: string, params?: TrainingParams): Promise<TrainingRun> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const run: TrainingRun = {
      id: runId,
      modelId,
      status: 'pending',
      startedAt: new Date(),
      samplesUsed: 0,
      epochsCompleted: 0,
      metrics: { ...model.metrics },
      improvements: {},
    };

    this.trainingRuns.set(runId, run);

    // Simulate training start
    setTimeout(() => this.runTraining(runId, params ?? {}), 100);

    this.emitEvent('model_updated', 'learning', {
      action: 'training_scheduled',
      runId,
      modelId,
    });

    return run;
  }

  async cancelTraining(runId: string): Promise<void> {
    const run = this.trainingRuns.get(runId);
    if (run && run.status === 'running') {
      run.status = 'failed';
      run.completedAt = new Date();
    }
  }

  getTrainingRun(runId: string): TrainingRun | undefined {
    return this.trainingRuns.get(runId);
  }

  getTrainingHistory(modelId: string): TrainingRun[] {
    return Array.from(this.trainingRuns.values())
      .filter((r) => r.modelId === modelId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  // Feedback
  async recordFeedback(params: RecordFeedbackParams): Promise<FeedbackRecord> {
    const id = `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const record: FeedbackRecord = {
      id,
      signalId: params.signalId,
      modelId: params.modelId,
      type: params.type,
      outcome: params.outcome,
      expectedValue: params.expectedValue,
      actualValue: params.actualValue,
      profit: params.profit,
      userRating: params.userRating,
      comments: params.comments,
      timestamp: new Date(),
    };

    const existing = this.feedback.get(params.signalId) ?? [];
    existing.push(record);
    this.feedback.set(params.signalId, existing);

    // Update agent state if applicable
    if (params.modelId) {
      this.updateModelFromFeedback(params.modelId, record);
    }

    return record;
  }

  getFeedback(signalId: string): FeedbackRecord[] {
    return this.feedback.get(signalId) ?? [];
  }

  async processFeedbackBatch(modelId: string): Promise<FeedbackProcessingResult> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Collect all feedback for this model
    const allFeedback: FeedbackRecord[] = [];
    for (const records of this.feedback.values()) {
      allFeedback.push(...records.filter((r) => r.modelId === modelId));
    }

    // Calculate improvements
    const correct = allFeedback.filter((f) => f.outcome === 'correct').length;
    const total = allFeedback.length;
    const newAccuracy = total > 0 ? correct / total : model.metrics.accuracy;

    const improvements: Record<string, number> = {
      accuracy: newAccuracy - model.metrics.accuracy,
    };

    // Update model metrics
    model.metrics.accuracy = newAccuracy;

    // Check if retraining is needed
    const retrainingTriggered = newAccuracy < this.config.performanceThreshold &&
      total >= this.config.minSamplesForUpdate;

    if (retrainingTriggered) {
      await this.scheduleTraining(modelId);
    }

    return {
      modelId,
      feedbackProcessed: allFeedback.length,
      metricsUpdated: true,
      retrainingTriggered,
      improvements,
    };
  }

  // Agent Learning
  getAgentState(agentId: string): AgentLearningState | undefined {
    return this.agentStates.get(agentId);
  }

  updateAgentState(agentId: string, updates: Partial<AgentLearningState>): void {
    const existing = this.agentStates.get(agentId) ?? {
      agentId,
      signalsProcessed: 0,
      correctPredictions: 0,
      totalProfit: 0,
      performanceTrend: 'stable' as const,
      modelVersions: {},
    };

    const updated: AgentLearningState = {
      ...existing,
      ...updates,
    };

    // Calculate trend
    const accuracy = updated.signalsProcessed > 0
      ? updated.correctPredictions / updated.signalsProcessed
      : 0;

    if (accuracy > 0.7) {
      updated.performanceTrend = 'improving';
    } else if (accuracy < 0.5) {
      updated.performanceTrend = 'declining';
    } else {
      updated.performanceTrend = 'stable';
    }

    this.agentStates.set(agentId, updated);
  }

  getAgentPerformanceTrend(agentId: string): PerformanceTrend {
    const state = this.agentStates.get(agentId);

    const recentAccuracy = state
      ? state.correctPredictions / Math.max(1, state.signalsProcessed)
      : 0.5;

    const historicalAccuracy = 0.6; // Would be calculated from historical data
    const changePercent = ((recentAccuracy - historicalAccuracy) / historicalAccuracy) * 100;

    // Generate mock data points
    const dataPoints: TrendDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      dataPoints.push({
        timestamp: new Date(Date.now() - i * 86400000),
        accuracy: 0.5 + Math.random() * 0.3,
        profit: (Math.random() - 0.3) * 1000,
        signalsProcessed: Math.floor(Math.random() * 50) + 10,
      });
    }

    return {
      agentId,
      trend: state?.performanceTrend ?? 'stable',
      recentAccuracy,
      historicalAccuracy,
      changePercent,
      dataPoints,
    };
  }

  // Model Improvement
  async evaluateModel(modelId: string): Promise<ModelEvaluation> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const benchmarks: BenchmarkResult[] = [
      {
        benchmarkName: 'Industry Average',
        modelScore: model.metrics.accuracy,
        benchmarkScore: 0.65,
        delta: model.metrics.accuracy - 0.65,
        status: model.metrics.accuracy > 0.65 ? 'above' : 'below',
      },
      {
        benchmarkName: 'Top Performers',
        modelScore: model.metrics.sharpeRatio ?? 1,
        benchmarkScore: 1.5,
        delta: (model.metrics.sharpeRatio ?? 1) - 1.5,
        status: (model.metrics.sharpeRatio ?? 1) > 1.5 ? 'above' : 'below',
      },
    ];

    const overallScore = (model.metrics.accuracy + model.metrics.precision + model.metrics.recall + model.metrics.f1Score) / 4 * 100;

    return {
      modelId,
      currentMetrics: model.metrics,
      benchmarkComparison: benchmarks,
      weaknesses: [
        model.metrics.recall < 0.6 ? 'Low recall - missing positive cases' : '',
        model.metrics.precision < 0.6 ? 'Low precision - too many false positives' : '',
      ].filter(Boolean),
      strengths: [
        model.metrics.accuracy > 0.7 ? 'High overall accuracy' : '',
        model.metrics.f1Score > 0.7 ? 'Good balance of precision and recall' : '',
      ].filter(Boolean),
      overallScore,
      recommendations: [
        'Collect more training data for edge cases',
        'Consider ensemble approach for improved stability',
        'Tune hyperparameters based on validation performance',
      ],
    };
  }

  async suggestRetraining(modelId: string): Promise<RetrainingSuggestion> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const evaluation = await this.evaluateModel(modelId);
    const shouldRetrain = evaluation.overallScore < this.config.performanceThreshold * 100;

    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (evaluation.overallScore < 40) priority = 'critical';
    else if (evaluation.overallScore < 55) priority = 'high';
    else if (evaluation.overallScore < 70) priority = 'medium';

    return {
      modelId,
      shouldRetrain,
      reason: shouldRetrain
        ? `Model performance (${evaluation.overallScore.toFixed(1)}%) below threshold (${this.config.performanceThreshold * 100}%)`
        : 'Model performing above threshold',
      priority,
      suggestedParams: {
        epochs: 100,
        batchSize: 32,
        learningRate: 0.001,
        validationSplit: 0.2,
        earlyStoppingPatience: 10,
      },
      expectedImprovement: shouldRetrain ? 0.05 + Math.random() * 0.1 : 0,
      dataRequirements: {
        minSamples: this.config.minSamplesForUpdate,
        currentSamples: Math.floor(Math.random() * 200),
        samplesNeeded: Math.max(0, this.config.minSamplesForUpdate - Math.floor(Math.random() * 200)),
        dataQuality: 'medium',
      },
    };
  }

  async compareModels(modelIds: string[]): Promise<ModelComparison> {
    const models = modelIds.map((id) => this.models.get(id)).filter((m): m is ModelPerformance => m !== undefined);

    const rankings: ModelRanking[] = models
      .map((m) => ({
        modelId: m.modelId,
        score: (m.metrics.accuracy + m.metrics.f1Score) / 2,
        strengths: [],
      }))
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({
        ...r,
        rank: i + 1,
        strengths: r.score > 0.7 ? ['High accuracy', 'Consistent performance'] : ['Room for improvement'],
      }));

    return {
      models,
      rankings,
      recommendations: [
        'Consider using the top-ranked model for production',
        'Lower-ranked models may be useful for ensemble approaches',
        'Monitor all models for performance degradation',
      ],
      bestModel: rankings[0]?.modelId ?? '',
    };
  }

  configure(config: Partial<ContinuousLearningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeMockModels(): void {
    const mockModels: RegisterModelParams[] = [
      { name: 'Signal Generator v1', type: 'signal_generator', version: '1.0.0' },
      { name: 'Anomaly Detector v1', type: 'anomaly_detector', version: '1.0.0' },
      { name: 'Price Predictor v1', type: 'price_predictor', version: '1.0.0' },
      { name: 'Risk Assessor v1', type: 'risk_assessor', version: '1.0.0' },
    ];

    for (const mock of mockModels) {
      const modelId = `model_${Math.random().toString(36).slice(2, 9)}`;
      this.models.set(modelId, {
        modelId,
        name: mock.name,
        version: mock.version,
        type: mock.type,
        metrics: {
          accuracy: 0.6 + Math.random() * 0.3,
          precision: 0.6 + Math.random() * 0.3,
          recall: 0.6 + Math.random() * 0.3,
          f1Score: 0.6 + Math.random() * 0.3,
          sharpeRatio: 0.5 + Math.random() * 1.5,
        },
        trainingHistory: [],
        lastTrainedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
      });
    }
  }

  private async runTraining(runId: string, params: TrainingParams): Promise<void> {
    const run = this.trainingRuns.get(runId);
    if (!run) return;

    run.status = 'running';
    const epochs = params.epochs ?? 10;

    // Simulate training
    for (let i = 0; i < epochs; i++) {
      if (run.status !== 'running') break;

      run.epochsCompleted = i + 1;
      run.samplesUsed += Math.floor(Math.random() * 1000);

      // Simulate small improvements
      run.metrics.accuracy = Math.min(0.95, run.metrics.accuracy + Math.random() * 0.02);
      run.metrics.precision = Math.min(0.95, run.metrics.precision + Math.random() * 0.02);
      run.metrics.recall = Math.min(0.95, run.metrics.recall + Math.random() * 0.02);
      run.metrics.f1Score = Math.min(0.95, run.metrics.f1Score + Math.random() * 0.02);
    }

    run.status = 'completed';
    run.completedAt = new Date();

    // Calculate improvements
    const model = this.models.get(run.modelId);
    if (model) {
      run.improvements = {
        accuracy: run.metrics.accuracy - model.metrics.accuracy,
        precision: run.metrics.precision - model.metrics.precision,
        recall: run.metrics.recall - model.metrics.recall,
        f1Score: run.metrics.f1Score - model.metrics.f1Score,
      };

      // Update model with new metrics
      model.metrics = { ...run.metrics };
      model.lastTrainedAt = new Date();
      model.trainingHistory.push(run);
    }

    this.emitEvent('model_updated', 'learning', {
      action: 'training_completed',
      runId,
      modelId: run.modelId,
      improvements: run.improvements,
    });
  }

  private updateModelFromFeedback(modelId: string, feedback: FeedbackRecord): void {
    const model = this.models.get(modelId);
    if (!model) return;

    // Simple exponential moving average update
    const alpha = 0.1;
    const feedbackScore = feedback.outcome === 'correct' ? 1 : feedback.outcome === 'partial' ? 0.5 : 0;

    model.metrics.accuracy = model.metrics.accuracy * (1 - alpha) + feedbackScore * alpha;
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
      source: 'continuous-learning',
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

export function createContinuousLearningService(
  config?: Partial<ContinuousLearningConfig>
): DefaultContinuousLearningService {
  return new DefaultContinuousLearningService(config);
}
