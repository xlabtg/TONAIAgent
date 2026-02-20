/**
 * TONAIAgent - AI Alignment Layer
 *
 * Ensures that agents respect user-defined goals, follow risk constraints,
 * avoid unintended behavior, and remain transparent and auditable.
 *
 * Features:
 * - Goal validation and conflict detection
 * - Strategy consistency checks
 * - Safe execution boundaries
 * - Intent verification
 */

import {
  AlignmentConfig,
  AgentGoal,
  GoalConstraint,
  GoalValidationResult,
  AlignmentIssue,
  StrategyConsistencyResult,
  StrategyDeviation,
  HardLimit,
  SoftLimit,
  AgentIntent,
  IntentRiskAssessment,
  RiskFactor,
  AlignmentScore,
  AISafetyEvent,
  AISafetyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface AlignmentManager {
  // Configuration
  configure(config: Partial<AlignmentConfig>): AlignmentConfig;
  getConfig(): AlignmentConfig;

  // Goal Management
  registerGoal(agentId: string, goal: GoalInput): Promise<AgentGoal>;
  validateGoal(goal: AgentGoal): Promise<GoalValidationResult>;
  validateGoals(goals: AgentGoal[]): Promise<GoalValidationResult>;
  getGoals(agentId: string): Promise<AgentGoal[]>;
  updateGoal(goalId: string, updates: Partial<GoalInput>): Promise<AgentGoal>;
  removeGoal(goalId: string): Promise<void>;

  // Strategy Consistency
  checkConsistency(agentId: string, strategy: StrategyInput): Promise<StrategyConsistencyResult>;
  recordStrategyExecution(agentId: string, execution: ExecutionRecord): Promise<void>;
  detectDrift(agentId: string): Promise<DriftAnalysis>;

  // Boundary Enforcement
  checkBoundaries(agentId: string, action: ActionInput): Promise<BoundaryCheckResult>;
  registerHardLimit(limit: HardLimit): void;
  registerSoftLimit(limit: SoftLimit): void;
  getLimits(scope?: 'agent' | 'user' | 'global'): { hard: HardLimit[]; soft: SoftLimit[] };

  // Intent Verification
  verifyIntent(intent: AgentIntent): Promise<IntentVerificationResult>;
  registerIntent(agentId: string, intent: IntentInput): Promise<AgentIntent>;
  getIntentHistory(agentId: string, limit?: number): Promise<AgentIntent[]>;

  // Scoring
  calculateAlignmentScore(agentId: string): Promise<AlignmentScore>;

  // Events
  onEvent(callback: AISafetyEventCallback): void;
}

export interface GoalInput {
  type: AgentGoal['type'];
  description: string;
  priority: number;
  constraints: GoalConstraint[];
  metrics: Array<{
    name: string;
    target: number;
    weight: number;
    direction: 'maximize' | 'minimize' | 'target';
  }>;
  validUntil?: Date;
}

export interface StrategyInput {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  expectedBehavior: string;
}

export interface ExecutionRecord {
  strategyId: string;
  action: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
  timestamp: Date;
}

export interface DriftAnalysis {
  driftDetected: boolean;
  driftMagnitude: number;
  driftDirection: string;
  affectedStrategies: string[];
  recommendation: string;
}

export interface ActionInput {
  type: string;
  parameters: Record<string, unknown>;
  estimatedValue?: number;
  targetAddress?: string;
}

export interface BoundaryCheckResult {
  allowed: boolean;
  hardLimitViolations: HardLimitViolation[];
  softLimitWarnings: SoftLimitWarning[];
  recommendation: string;
}

export interface HardLimitViolation {
  limit: HardLimit;
  currentValue: number;
  message: string;
}

export interface SoftLimitWarning {
  limit: SoftLimit;
  currentValue: number;
  level: 'warning' | 'escalate' | 'block';
  message: string;
}

export interface IntentInput {
  action: string;
  parameters: Record<string, unknown>;
  reasoning: string;
  expectedReturn: number;
  expectedRisk: number;
  timeHorizon: string;
  assumptions: string[];
}

export interface IntentVerificationResult {
  verified: boolean;
  alignmentScore: AlignmentScore;
  riskAssessment: IntentRiskAssessment;
  issues: string[];
  requiresApproval: boolean;
  approvalLevel: 'auto' | 'user' | 'admin' | 'committee';
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_ALIGNMENT_CONFIG: AlignmentConfig = {
  enabled: true,
  goalValidation: {
    requireExplicitGoals: true,
    maxGoalComplexity: 10,
    allowedGoalTypes: [
      'profit_maximization',
      'risk_minimization',
      'yield_optimization',
      'portfolio_rebalancing',
      'staking',
    ],
    conflictResolution: 'prioritize_safety',
    validationThreshold: 0.7,
  },
  strategyConsistency: {
    requireConsistencyCheck: true,
    maxStrategyDeviation: 20,
    driftDetection: true,
    driftThreshold: 15,
  },
  boundaryEnforcement: {
    enabled: true,
    hardLimits: [],
    softLimits: [],
    defaultAction: 'block',
  },
  intentVerification: {
    enabled: true,
    requireIntentDeclaration: true,
    verifyBeforeExecution: true,
    logAllIntents: true,
  },
};

// ============================================================================
// Alignment Manager Implementation
// ============================================================================

export class DefaultAlignmentManager implements AlignmentManager {
  private config: AlignmentConfig;
  private readonly goals = new Map<string, AgentGoal>();
  private readonly goalsByAgent = new Map<string, Set<string>>();
  private readonly executionHistory = new Map<string, ExecutionRecord[]>();
  private readonly intents = new Map<string, AgentIntent>();
  private readonly intentsByAgent = new Map<string, string[]>();
  private readonly hardLimits: HardLimit[] = [];
  private readonly softLimits: SoftLimit[] = [];
  private readonly eventCallbacks: AISafetyEventCallback[] = [];
  private goalCounter = 0;
  private intentCounter = 0;

  constructor(config?: Partial<AlignmentConfig>) {
    this.config = {
      ...DEFAULT_ALIGNMENT_CONFIG,
      ...config,
      goalValidation: { ...DEFAULT_ALIGNMENT_CONFIG.goalValidation, ...config?.goalValidation },
      strategyConsistency: { ...DEFAULT_ALIGNMENT_CONFIG.strategyConsistency, ...config?.strategyConsistency },
      boundaryEnforcement: { ...DEFAULT_ALIGNMENT_CONFIG.boundaryEnforcement, ...config?.boundaryEnforcement },
      intentVerification: { ...DEFAULT_ALIGNMENT_CONFIG.intentVerification, ...config?.intentVerification },
    };
    this.initializeDefaultLimits();
  }

  // ========== Configuration ==========

  configure(config: Partial<AlignmentConfig>): AlignmentConfig {
    this.config = {
      ...this.config,
      ...config,
      goalValidation: { ...this.config.goalValidation, ...config.goalValidation },
      strategyConsistency: { ...this.config.strategyConsistency, ...config.strategyConsistency },
      boundaryEnforcement: { ...this.config.boundaryEnforcement, ...config.boundaryEnforcement },
      intentVerification: { ...this.config.intentVerification, ...config.intentVerification },
    };
    return this.config;
  }

  getConfig(): AlignmentConfig {
    return { ...this.config };
  }

  // ========== Goal Management ==========

  async registerGoal(agentId: string, input: GoalInput): Promise<AgentGoal> {
    const goal: AgentGoal = {
      id: this.generateGoalId(),
      type: input.type,
      description: input.description,
      priority: input.priority,
      constraints: input.constraints,
      metrics: input.metrics.map((m) => ({ ...m, current: 0 })),
      validUntil: input.validUntil,
      createdBy: agentId,
      createdAt: new Date(),
      status: 'active',
    };

    // Validate goal before registering
    const existingGoals = await this.getGoals(agentId);
    const validation = await this.validateGoals([...existingGoals, goal]);

    // Check for high-severity issues
    const highSeverityIssues = validation.issues.filter((i) => i.severity === 'high' || i.severity === 'critical');
    if (highSeverityIssues.length > 0) {
      throw new Error(`Goal validation failed: ${highSeverityIssues.map((i) => i.description).join(', ')}`);
    }

    if (!validation.valid && validation.alignmentScore < this.config.goalValidation.validationThreshold * 100) {
      throw new Error(`Goal validation failed: ${validation.issues.map((i) => i.description).join(', ')}`);
    }

    this.goals.set(goal.id, goal);

    if (!this.goalsByAgent.has(agentId)) {
      this.goalsByAgent.set(agentId, new Set());
    }
    this.goalsByAgent.get(agentId)!.add(goal.id);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'goal_validation',
      agentId,
      severity: 'low',
      description: `Registered new goal: ${goal.description}`,
      details: { goalId: goal.id, type: goal.type },
      metadata: {},
    });

    return goal;
  }

  async validateGoal(goal: AgentGoal): Promise<GoalValidationResult> {
    return this.validateGoals([goal]);
  }

  async validateGoals(goals: AgentGoal[]): Promise<GoalValidationResult> {
    const issues: AlignmentIssue[] = [];
    const conflictingGoals: string[] = [];
    const suggestions: string[] = [];

    // Check if goal types are allowed
    const allowedGoalTypes = this.config.goalValidation.allowedGoalTypes || [];
    for (const goal of goals) {
      if (allowedGoalTypes.length > 0 && !allowedGoalTypes.includes(goal.type)) {
        issues.push({
          severity: 'high',
          type: 'constraint_violation',
          description: `Goal type '${goal.type}' is not allowed`,
          affectedGoals: [goal.id],
          recommendation: `Use one of: ${allowedGoalTypes.join(', ')}`,
        });
      }

      // Check constraint validity
      for (const constraint of goal.constraints) {
        if (constraint.strict && constraint.value === undefined) {
          issues.push({
            severity: 'medium',
            type: 'constraint_violation',
            description: `Strict constraint '${constraint.type}' has no value`,
            affectedGoals: [goal.id],
            recommendation: 'Set a value for strict constraints',
          });
        }
      }
    }

    // Check for conflicting goals (medium severity allows registration with warning)
    for (let i = 0; i < goals.length; i++) {
      for (let j = i + 1; j < goals.length; j++) {
        const conflict = this.detectGoalConflict(goals[i], goals[j]);
        if (conflict) {
          conflictingGoals.push(goals[i].id, goals[j].id);
          issues.push({
            severity: 'medium',
            type: 'goal_conflict',
            description: `Goals '${goals[i].description}' and '${goals[j].description}' conflict: ${conflict}`,
            affectedGoals: [goals[i].id, goals[j].id],
            recommendation: 'Adjust goal priorities or constraints to resolve conflict',
          });
        }
      }
    }

    // Check complexity
    if (goals.length > this.config.goalValidation.maxGoalComplexity) {
      issues.push({
        severity: 'medium',
        type: 'risk_exposure',
        description: `Too many active goals (${goals.length} > ${this.config.goalValidation.maxGoalComplexity})`,
        affectedGoals: goals.map((g) => g.id),
        recommendation: 'Reduce the number of active goals for better agent focus',
      });
      suggestions.push('Consider consolidating similar goals');
    }

    // Calculate alignment score
    const alignmentScore = this.calculateGoalAlignmentScore(goals, issues);

    return {
      valid: issues.filter((i) => i.severity === 'high' || i.severity === 'critical').length === 0,
      alignmentScore,
      issues,
      suggestions,
      conflictingGoals: [...new Set(conflictingGoals)],
    };
  }

  async getGoals(agentId: string): Promise<AgentGoal[]> {
    const goalIds = this.goalsByAgent.get(agentId);
    if (!goalIds) return [];

    return Array.from(goalIds)
      .map((id) => this.goals.get(id))
      .filter((g): g is AgentGoal => g !== undefined && g.status === 'active');
  }

  async updateGoal(goalId: string, updates: Partial<GoalInput>): Promise<AgentGoal> {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const updatedGoal: AgentGoal = {
      ...goal,
      ...updates,
      metrics: updates.metrics
        ? updates.metrics.map((m) => ({ ...m, current: 0 }))
        : goal.metrics,
    };

    this.goals.set(goalId, updatedGoal);
    return updatedGoal;
  }

  async removeGoal(goalId: string): Promise<void> {
    const goal = this.goals.get(goalId);
    if (goal) {
      goal.status = 'completed';
      this.goals.set(goalId, goal);
    }
  }

  // ========== Strategy Consistency ==========

  async checkConsistency(agentId: string, strategy: StrategyInput): Promise<StrategyConsistencyResult> {
    const history = this.executionHistory.get(agentId) || [];
    const strategyHistory = history.filter((h) => h.strategyId === strategy.id);
    const deviations: StrategyDeviation[] = [];

    // Analyze execution patterns
    if (strategyHistory.length > 0) {
      const recentExecutions = strategyHistory.slice(-10);
      const avgValues = this.calculateAverageValues(recentExecutions);

      // Check for parameter deviations
      for (const [key, value] of Object.entries(strategy.parameters)) {
        const numValue = typeof value === 'number' ? value : null;
        const avgValue = avgValues[key];

        if (numValue !== null && avgValue !== undefined) {
          const deviationPercent = Math.abs((numValue - avgValue) / avgValue) * 100;

          if (deviationPercent > this.config.strategyConsistency.maxStrategyDeviation) {
            deviations.push({
              strategy: strategy.id,
              expectedBehavior: `Parameter ${key} near ${avgValue.toFixed(2)}`,
              actualBehavior: `Parameter ${key} is ${numValue}`,
              deviationPercent,
              severity: deviationPercent > 50 ? 'high' : 'medium',
              timestamp: new Date(),
            });
          }
        }
      }
    }

    // Check for drift
    const driftResult = await this.detectDrift(agentId);

    const consistencyScore = Math.max(
      0,
      100 - deviations.reduce((sum, d) => sum + d.deviationPercent / 10, 0)
    );

    return {
      consistent: deviations.length === 0 && !driftResult.driftDetected,
      consistencyScore,
      deviations,
      driftDetected: driftResult.driftDetected,
      driftMagnitude: driftResult.driftMagnitude,
    };
  }

  async recordStrategyExecution(agentId: string, execution: ExecutionRecord): Promise<void> {
    if (!this.executionHistory.has(agentId)) {
      this.executionHistory.set(agentId, []);
    }

    const history = this.executionHistory.get(agentId)!;
    history.push(execution);

    // Keep only last 1000 executions
    if (history.length > 1000) {
      history.shift();
    }
  }

  async detectDrift(agentId: string): Promise<DriftAnalysis> {
    if (!this.config.strategyConsistency.driftDetection) {
      return {
        driftDetected: false,
        driftMagnitude: 0,
        driftDirection: 'none',
        affectedStrategies: [],
        recommendation: 'Drift detection is disabled',
      };
    }

    const history = this.executionHistory.get(agentId) || [];
    if (history.length < 20) {
      return {
        driftDetected: false,
        driftMagnitude: 0,
        driftDirection: 'none',
        affectedStrategies: [],
        recommendation: 'Insufficient data for drift detection',
      };
    }

    // Compare first half vs second half of history
    const midpoint = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, midpoint);
    const secondHalf = history.slice(midpoint);

    const firstAvg = this.calculateAverageValues(firstHalf);
    const secondAvg = this.calculateAverageValues(secondHalf);

    let maxDrift = 0;
    const affectedStrategies = new Set<string>();

    for (const key of Object.keys(firstAvg)) {
      if (secondAvg[key] !== undefined) {
        const drift = Math.abs((secondAvg[key] - firstAvg[key]) / firstAvg[key]) * 100;
        if (drift > maxDrift) {
          maxDrift = drift;
        }
        if (drift > this.config.strategyConsistency.driftThreshold) {
          // Find affected strategies
          secondHalf.forEach((e) => affectedStrategies.add(e.strategyId));
        }
      }
    }

    const driftDetected = maxDrift > this.config.strategyConsistency.driftThreshold;

    if (driftDetected) {
      this.emitEvent({
        id: `event_${Date.now()}`,
        timestamp: new Date(),
        type: 'alignment_check',
        agentId,
        severity: maxDrift > 30 ? 'high' : 'medium',
        description: `Strategy drift detected: ${maxDrift.toFixed(2)}%`,
        details: { driftMagnitude: maxDrift, affectedStrategies: [...affectedStrategies] },
        metadata: {},
      });
    }

    return {
      driftDetected,
      driftMagnitude: maxDrift,
      driftDirection: maxDrift > 0 ? 'increasing' : 'stable',
      affectedStrategies: [...affectedStrategies],
      recommendation: driftDetected
        ? 'Review strategy parameters and consider recalibration'
        : 'Strategy execution is within normal bounds',
    };
  }

  // ========== Boundary Enforcement ==========

  checkBoundaries(agentId: string, action: ActionInput): Promise<BoundaryCheckResult> {
    const hardViolations: HardLimitViolation[] = [];
    const softWarnings: SoftLimitWarning[] = [];

    // Check hard limits
    for (const limit of this.hardLimits) {
      if (limit.scope === 'agent' || limit.scope === 'global') {
        const violation = this.checkHardLimit(limit, action);
        if (violation) {
          hardViolations.push(violation);
        }
      }
    }

    // Check soft limits
    for (const limit of this.softLimits) {
      const warning = this.checkSoftLimit(limit, action);
      if (warning) {
        softWarnings.push(warning);
      }
    }

    const allowed = hardViolations.length === 0;

    if (!allowed) {
      this.emitEvent({
        id: `event_${Date.now()}`,
        timestamp: new Date(),
        type: 'guardrail_triggered',
        agentId,
        severity: 'high',
        description: `Boundary violation: ${hardViolations.map((v) => v.message).join(', ')}`,
        details: { action, violations: hardViolations },
        metadata: {},
      });
    }

    return Promise.resolve({
      allowed,
      hardLimitViolations: hardViolations,
      softLimitWarnings: softWarnings,
      recommendation: allowed
        ? softWarnings.length > 0
          ? 'Action allowed with warnings'
          : 'Action allowed'
        : 'Action blocked due to hard limit violations',
    });
  }

  registerHardLimit(limit: HardLimit): void {
    this.hardLimits.push(limit);
  }

  registerSoftLimit(limit: SoftLimit): void {
    this.softLimits.push(limit);
  }

  getLimits(scope?: 'agent' | 'user' | 'global'): { hard: HardLimit[]; soft: SoftLimit[] } {
    return {
      hard: scope ? this.hardLimits.filter((l) => l.scope === scope) : this.hardLimits,
      soft: this.softLimits,
    };
  }

  // ========== Intent Verification ==========

  async verifyIntent(intent: AgentIntent): Promise<IntentVerificationResult> {
    const issues: string[] = [];
    let alignmentScore: AlignmentScore = 100;

    // Check intent reasoning
    if (!intent.reasoning || intent.reasoning.length < 10) {
      issues.push('Insufficient reasoning provided');
      alignmentScore -= 20;
    }

    // Check expected outcome validity
    if (intent.expectedOutcome.successProbability < 0.1) {
      issues.push('Success probability is very low');
      alignmentScore -= 15;
    }

    if (intent.expectedOutcome.expectedRisk > 50) {
      issues.push('Expected risk is high');
      alignmentScore -= 10;
    }

    // Assess risk
    const riskAssessment = this.assessIntentRisk(intent);

    // Determine approval level
    let approvalLevel: 'auto' | 'user' | 'admin' | 'committee' = 'auto';
    if (riskAssessment.riskScore > 80) {
      approvalLevel = 'committee';
    } else if (riskAssessment.riskScore > 60) {
      approvalLevel = 'admin';
    } else if (riskAssessment.riskScore > 40) {
      approvalLevel = 'user';
    }

    const verified = issues.length === 0 && alignmentScore >= 70;

    return {
      verified,
      alignmentScore,
      riskAssessment,
      issues,
      requiresApproval: approvalLevel !== 'auto',
      approvalLevel,
    };
  }

  async registerIntent(agentId: string, input: IntentInput): Promise<AgentIntent> {
    const intent: AgentIntent = {
      id: this.generateIntentId(),
      agentId,
      action: input.action,
      parameters: input.parameters,
      reasoning: input.reasoning,
      expectedOutcome: {
        successProbability: 0.7,
        expectedReturn: input.expectedReturn,
        expectedRisk: input.expectedRisk,
        timeHorizon: input.timeHorizon,
        assumptions: input.assumptions,
      },
      riskAssessment: this.assessIntentRisk({
        id: '',
        agentId,
        action: input.action,
        parameters: input.parameters,
        reasoning: input.reasoning,
        expectedOutcome: {
          successProbability: 0.7,
          expectedReturn: input.expectedReturn,
          expectedRisk: input.expectedRisk,
          timeHorizon: input.timeHorizon,
          assumptions: input.assumptions,
        },
        riskAssessment: { riskScore: 0, riskFactors: [], mitigations: [], requiresApproval: false, approvalLevel: 'auto' },
        timestamp: new Date(),
        status: 'pending',
      }),
      timestamp: new Date(),
      status: 'pending',
    };

    // Verify intent
    if (this.config.intentVerification.verifyBeforeExecution) {
      const verification = await this.verifyIntent(intent);
      intent.status = verification.verified ? 'verified' : 'rejected';
      intent.riskAssessment = verification.riskAssessment;
    }

    this.intents.set(intent.id, intent);

    if (!this.intentsByAgent.has(agentId)) {
      this.intentsByAgent.set(agentId, []);
    }
    this.intentsByAgent.get(agentId)!.push(intent.id);

    return intent;
  }

  async getIntentHistory(agentId: string, limit: number = 100): Promise<AgentIntent[]> {
    const intentIds = this.intentsByAgent.get(agentId) || [];
    return intentIds
      .slice(-limit)
      .map((id) => this.intents.get(id))
      .filter((i): i is AgentIntent => i !== undefined)
      .reverse();
  }

  // ========== Scoring ==========

  async calculateAlignmentScore(agentId: string): Promise<AlignmentScore> {
    let score = 100;

    // Factor in goal alignment
    const goals = await this.getGoals(agentId);
    const goalValidation = await this.validateGoals(goals);
    score = (score + goalValidation.alignmentScore) / 2;

    // Factor in drift
    const drift = await this.detectDrift(agentId);
    if (drift.driftDetected) {
      score -= Math.min(20, drift.driftMagnitude / 2);
    }

    // Factor in intent history
    const intents = await this.getIntentHistory(agentId, 10);
    const verifiedIntents = intents.filter((i) => i.status === 'verified').length;
    const intentRatio = intents.length > 0 ? verifiedIntents / intents.length : 1;
    score *= intentRatio;

    return Math.max(0, Math.min(100, score));
  }

  // ========== Events ==========

  onEvent(callback: AISafetyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ========== Private Helpers ==========

  private initializeDefaultLimits(): void {
    // Default hard limits
    this.hardLimits.push(
      {
        id: 'max_transaction',
        name: 'Max Transaction Value',
        type: 'transaction_value',
        value: 10000,
        currency: 'TON',
        scope: 'global',
      },
      {
        id: 'max_daily_volume',
        name: 'Max Daily Volume',
        type: 'daily_volume',
        value: 50000,
        currency: 'TON',
        scope: 'global',
      },
      {
        id: 'max_position_size',
        name: 'Max Position Size',
        type: 'position_size',
        value: 25,
        scope: 'global',
      },
      {
        id: 'max_leverage',
        name: 'Max Leverage',
        type: 'leverage',
        value: 5,
        scope: 'global',
      }
    );

    // Default soft limits
    this.softLimits.push(
      {
        id: 'transaction_warning',
        name: 'Transaction Size Warning',
        type: 'transaction_value',
        warningThreshold: 1000,
        escalateThreshold: 5000,
        blockThreshold: 10000,
      },
      {
        id: 'concentration_warning',
        name: 'Concentration Warning',
        type: 'concentration',
        warningThreshold: 15,
        escalateThreshold: 20,
        blockThreshold: 25,
      }
    );
  }

  private generateGoalId(): string {
    this.goalCounter++;
    return `goal_${Date.now()}_${this.goalCounter.toString(36)}`;
  }

  private generateIntentId(): string {
    this.intentCounter++;
    return `intent_${Date.now()}_${this.intentCounter.toString(36)}`;
  }

  private detectGoalConflict(goal1: AgentGoal, goal2: AgentGoal): string | null {
    // Check for opposing goal types
    const conflictingPairs: [string, string][] = [
      ['profit_maximization', 'risk_minimization'],
      ['yield_optimization', 'liquidity_provision'],
    ];

    for (const [type1, type2] of conflictingPairs) {
      if (
        (goal1.type === type1 && goal2.type === type2) ||
        (goal1.type === type2 && goal2.type === type1)
      ) {
        if (goal1.priority === goal2.priority) {
          return `Equal priority conflicts between ${type1} and ${type2}`;
        }
      }
    }

    // Check for constraint conflicts
    for (const c1 of goal1.constraints) {
      for (const c2 of goal2.constraints) {
        if (c1.type === c2.type && c1.strict && c2.strict) {
          if (c1.value !== c2.value) {
            return `Conflicting strict constraints on ${c1.type}`;
          }
        }
      }
    }

    return null;
  }

  private calculateGoalAlignmentScore(goals: AgentGoal[], issues: AlignmentIssue[]): AlignmentScore {
    let score = 100;

    // Deduct for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Bonus for well-defined goals
    for (const goal of goals) {
      if (goal.constraints.length >= 2) score += 2;
      if (goal.metrics.length >= 2) score += 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateAverageValues(executions: ExecutionRecord[]): Record<string, number> {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    for (const exec of executions) {
      for (const [key, value] of Object.entries(exec.parameters)) {
        if (typeof value === 'number') {
          sums[key] = (sums[key] || 0) + value;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    const averages: Record<string, number> = {};
    for (const key of Object.keys(sums)) {
      averages[key] = sums[key] / counts[key];
    }

    return averages;
  }

  private checkHardLimit(limit: HardLimit, action: ActionInput): HardLimitViolation | null {
    const value = action.estimatedValue || 0;

    switch (limit.type) {
      case 'transaction_value':
        if (value > limit.value) {
          return {
            limit,
            currentValue: value,
            message: `Transaction value ${value} exceeds limit ${limit.value}`,
          };
        }
        break;
      case 'position_size':
      case 'concentration':
        // Would check portfolio context
        break;
      case 'leverage':
        // Would check leverage context
        break;
    }

    return null;
  }

  private checkSoftLimit(limit: SoftLimit, action: ActionInput): SoftLimitWarning | null {
    const value = action.estimatedValue || 0;

    if (limit.type === 'transaction_value') {
      if (value >= limit.blockThreshold) {
        return {
          limit,
          currentValue: value,
          level: 'block',
          message: `Transaction value ${value} exceeds block threshold ${limit.blockThreshold}`,
        };
      }
      if (value >= limit.escalateThreshold) {
        return {
          limit,
          currentValue: value,
          level: 'escalate',
          message: `Transaction value ${value} exceeds escalation threshold ${limit.escalateThreshold}`,
        };
      }
      if (value >= limit.warningThreshold) {
        return {
          limit,
          currentValue: value,
          level: 'warning',
          message: `Transaction value ${value} exceeds warning threshold ${limit.warningThreshold}`,
        };
      }
    }

    return null;
  }

  private assessIntentRisk(intent: AgentIntent): IntentRiskAssessment {
    const riskFactors: RiskFactor[] = [];
    let totalRiskScore = 0;

    // Market risk
    const marketRisk = intent.expectedOutcome.expectedRisk * 0.5;
    if (marketRisk > 0) {
      riskFactors.push({
        name: 'Market Risk',
        score: marketRisk,
        weight: 0.3,
        description: 'Risk from market movements',
        category: 'market',
      });
      totalRiskScore += marketRisk * 0.3;
    }

    // Execution risk based on action type
    const highRiskActions = ['swap', 'leverage', 'arbitrage'];
    const executionRisk = highRiskActions.includes(intent.action) ? 40 : 20;
    riskFactors.push({
      name: 'Execution Risk',
      score: executionRisk,
      weight: 0.25,
      description: 'Risk from trade execution',
      category: 'execution',
    });
    totalRiskScore += executionRisk * 0.25;

    // Success probability risk
    const probabilityRisk = (1 - intent.expectedOutcome.successProbability) * 100;
    riskFactors.push({
      name: 'Probability Risk',
      score: probabilityRisk,
      weight: 0.25,
      description: 'Risk from success uncertainty',
      category: 'operational',
    });
    totalRiskScore += probabilityRisk * 0.25;

    // Time horizon risk
    const timeRisk = intent.expectedOutcome.timeHorizon.includes('hour') ? 30 : 15;
    riskFactors.push({
      name: 'Time Horizon Risk',
      score: timeRisk,
      weight: 0.2,
      description: 'Risk from time constraints',
      category: 'operational',
    });
    totalRiskScore += timeRisk * 0.2;

    // Generate mitigations
    const mitigations: string[] = [];
    if (totalRiskScore > 50) {
      mitigations.push('Consider reducing position size');
      mitigations.push('Set stop-loss orders');
    }
    if (totalRiskScore > 30) {
      mitigations.push('Monitor position closely');
    }

    return {
      riskScore: Math.min(100, totalRiskScore),
      riskFactors,
      mitigations,
      requiresApproval: totalRiskScore > 40,
      approvalLevel: totalRiskScore > 80 ? 'committee' : totalRiskScore > 60 ? 'admin' : totalRiskScore > 40 ? 'user' : 'auto',
    };
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

export function createAlignmentManager(config?: Partial<AlignmentConfig>): DefaultAlignmentManager {
  return new DefaultAlignmentManager(config);
}
