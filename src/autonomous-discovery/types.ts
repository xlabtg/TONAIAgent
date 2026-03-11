/**
 * TONAIAgent - Autonomous Strategy Discovery Engine Types
 *
 * Type definitions for the AI-driven autonomous strategy discovery system
 * that continuously searches for profitable investment approaches.
 */

import type {
  StrategySpec,
  StrategyRiskLevel,
  BacktestResult,
  StrategyPerformance,
} from '../strategy/types';

// ============================================================================
// Discovery Engine Core Types
// ============================================================================

export type DiscoveryStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped';

export type GenerationApproach =
  | 'evolutionary'
  | 'parameter_optimization'
  | 'ai_rule_generation'
  | 'template_mutation';

export type CandidateStatus =
  | 'generated'
  | 'backtesting'
  | 'risk_filtering'
  | 'evaluating'
  | 'passed'
  | 'failed'
  | 'published';

export type RejectionReason =
  | 'excessive_drawdown'
  | 'unstable_returns'
  | 'high_leverage'
  | 'insufficient_roi'
  | 'low_sharpe'
  | 'backtest_error'
  | 'risk_filter_failed';

// ============================================================================
// Discovery Configuration
// ============================================================================

export interface DiscoveryEngineConfig {
  /** Whether the discovery engine is enabled */
  enabled: boolean;
  /** Maximum number of candidate strategies to generate per cycle */
  maxCandidatesPerCycle: number;
  /** Interval between discovery cycles in milliseconds */
  cycleIntervalMs: number;
  /** Strategy generation approaches to use */
  generationApproaches: GenerationApproach[];
  /** Evaluation thresholds that candidates must pass */
  evaluationThresholds: EvaluationThresholds;
  /** Risk filter configuration */
  riskFilter: RiskFilterConfig;
  /** Whether to automatically publish top strategies to marketplace */
  autoPublish: boolean;
  /** Minimum score for auto-publishing */
  publishThreshold: number;
  /** Number of top strategies to keep in the candidate pool */
  elitePoolSize: number;
  /** Whether continuous learning is enabled */
  continuousLearningEnabled: boolean;
}

export interface EvaluationThresholds {
  /** Minimum ROI (percentage) */
  minROI: number;
  /** Minimum Sharpe ratio */
  minSharpe: number;
  /** Maximum drawdown (percentage, positive value) */
  maxDrawdown: number;
  /** Minimum win rate (0-1) */
  minWinRate: number;
  /** Minimum number of simulated trades for statistical significance */
  minTrades: number;
}

export interface RiskFilterConfig {
  /** Maximum allowed drawdown (percentage) */
  maxDrawdownPercent: number;
  /** Maximum leverage ratio */
  maxLeverage: number;
  /** Minimum return stability score (0-1) */
  minStabilityScore: number;
  /** Whether to apply stress-test filters */
  applyStressTest: boolean;
}

// ============================================================================
// Candidate Strategy
// ============================================================================

export interface CandidateStrategy {
  /** Unique candidate identifier */
  id: string;
  /** Generation approach that created this candidate */
  generationApproach: GenerationApproach;
  /** The strategy specification */
  spec: StrategySpec;
  /** Risk level classification */
  riskLevel: StrategyRiskLevel;
  /** Generation timestamp */
  generatedAt: Date;
  /** Current processing status */
  status: CandidateStatus;
  /** Backtest result (available after backtesting) */
  backtestResult?: BacktestResult;
  /** Evaluation score (0-100, available after evaluation) */
  evaluationScore?: number;
  /** Reason for rejection (if status === 'failed') */
  rejectionReason?: RejectionReason;
  /** Discovery cycle that produced this candidate */
  cycleId: string;
  /** Parent strategy ID (for mutations/evolution) */
  parentId?: string;
  /** Generation index (0 = first generation) */
  generation: number;
}

// ============================================================================
// Discovery Cycle
// ============================================================================

export interface DiscoveryCycle {
  /** Cycle identifier */
  id: string;
  /** Cycle start time */
  startedAt: Date;
  /** Cycle end time */
  completedAt?: Date;
  /** Number of candidates generated */
  candidatesGenerated: number;
  /** Number of candidates that passed backtesting */
  backtestsPassed: number;
  /** Number of candidates that passed risk filtering */
  riskFiltersPassed: number;
  /** Number of candidates that passed evaluation */
  evaluationsPassed: number;
  /** Number of strategies published in this cycle */
  published: number;
  /** Best performing candidate in this cycle */
  bestCandidate?: CandidateStrategy;
  /** Cycle summary statistics */
  stats: CycleStats;
}

export interface CycleStats {
  avgEvaluationScore: number;
  avgSharpe: number;
  avgROI: number;
  avgDrawdown: number;
  passRate: number;
}

// ============================================================================
// Marketplace Publishing
// ============================================================================

export interface PublishingResult {
  candidateId: string;
  published: boolean;
  marketplaceStrategyId?: string;
  publishedAt?: Date;
  reason?: string;
}

// ============================================================================
// Continuous Learning
// ============================================================================

export interface LearningRecord {
  /** Record identifier */
  id: string;
  /** Strategy type or template that performed well */
  strategyPattern: string;
  /** Generation approach that was effective */
  effectiveApproach: GenerationApproach;
  /** Performance metrics from successful strategies */
  successMetrics: StrategyPerformance;
  /** Risk levels that consistently performed well */
  optimalRiskLevel: StrategyRiskLevel;
  /** Market conditions during success */
  marketConditions: {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
  };
  /** Timestamp of learning */
  recordedAt: Date;
  /** Number of successful strategies this insight is based on */
  sampleSize: number;
}

export interface LearningInsights {
  /** Most effective generation approaches */
  topApproaches: Array<{ approach: GenerationApproach; successRate: number }>;
  /** Best performing risk levels */
  bestRiskLevels: Array<{ level: StrategyRiskLevel; avgScore: number }>;
  /** Market condition performance map */
  marketConditionInsights: Record<string, { avgScore: number; sampleSize: number }>;
  /** Total learning records available */
  totalRecords: number;
  /** Last updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Engine Health & Statistics
// ============================================================================

export interface DiscoveryEngineHealth {
  status: DiscoveryStatus;
  isHealthy: boolean;
  cyclesCompleted: number;
  totalCandidatesGenerated: number;
  totalStrategiesPublished: number;
  averagePassRate: number;
  lastCycleAt?: Date;
  nextCycleAt?: Date;
}

export interface DiscoveryEngineStats {
  totalCycles: number;
  totalCandidates: number;
  totalPublished: number;
  overallPassRate: number;
  bestEvaluationScore: number;
  avgSharpeAcrossCycles: number;
  learningRecords: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type DiscoveryEventType =
  | 'cycle_started'
  | 'cycle_completed'
  | 'candidate_generated'
  | 'candidate_backtested'
  | 'candidate_risk_filtered'
  | 'candidate_evaluated'
  | 'strategy_published'
  | 'learning_updated'
  | 'engine_started'
  | 'engine_stopped'
  | 'engine_paused';

export interface DiscoveryEvent {
  id: string;
  type: DiscoveryEventType;
  timestamp: Date;
  data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error';
}

export type DiscoveryEventCallback = (event: DiscoveryEvent) => void;
