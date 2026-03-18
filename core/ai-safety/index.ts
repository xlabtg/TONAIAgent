/**
 * TONAIAgent - AI Safety, Alignment & Governance Framework
 *
 * A comprehensive framework ensuring that autonomous agents operate reliably,
 * ethically, and within defined constraints in the TON AI ecosystem.
 *
 * Features:
 * - AI Alignment Layer: Goal validation, strategy consistency, safe execution boundaries
 * - Guardrails & Policy Engine: Strategy validation, transaction policies, risk thresholds
 * - Model Governance: Versioning, evaluation, monitoring, rollback
 * - Monitoring & Anomaly Detection: Real-time behavior analysis, fraud detection
 * - Explainability & Transparency: Decision tracing, reasoning logs
 * - Human Oversight: Manual overrides, emergency controls, approval workflows
 * - Ethics & Risk Framework: Governance guidelines, escalation procedures
 * - Simulation & Stress Testing: Adversarial testing, failure recovery
 * - DAO Governance Integration: Policy voting, safety upgrades
 *
 * @example
 * ```typescript
 * import { createAISafetyManager } from '@tonaiagent/core/ai-safety';
 *
 * const safety = createAISafetyManager({
 *   enabled: true,
 *   alignment: { enabled: true },
 *   guardrails: { enabled: true },
 *   monitoring: { realTime: true },
 *   humanOversight: { enabled: true },
 * });
 *
 * // Register agent goals
 * const goal = await safety.alignment.registerGoal('agent-1', {
 *   type: 'yield_optimization',
 *   description: 'Optimize yield across DeFi protocols',
 *   priority: 1,
 *   constraints: [{ type: 'max_loss', value: 5, strict: true, description: 'Max 5% loss' }],
 *   metrics: [{ name: 'apy', target: 10, weight: 1, direction: 'maximize' }],
 * });
 *
 * // Validate strategy before deployment
 * const validation = await safety.guardrails.validateStrategy({
 *   id: 'strategy-1',
 *   name: 'Yield Farming Strategy',
 *   type: 'yield_farming',
 *   parameters: { leverage: 2, rebalanceThreshold: 5 },
 * });
 *
 * // Monitor agent activity
 * const result = await safety.monitoring.recordActivity('agent-1', {
 *   type: 'trade',
 *   amount: 1000,
 *   currency: 'TON',
 *   timestamp: new Date(),
 * });
 * ```
 */

// Export all types
export * from './types';

// Export Alignment Layer
export {
  DefaultAlignmentManager,
  createAlignmentManager,
  type AlignmentManager,
  type GoalInput,
  type StrategyInput,
  type ExecutionRecord,
  type DriftAnalysis,
  type ActionInput,
  type BoundaryCheckResult,
  type HardLimitViolation,
  type SoftLimitWarning,
  type IntentInput,
  type IntentVerificationResult,
} from './alignment';

// Export Guardrails & Policy Engine
export {
  DefaultGuardrailsManager,
  createGuardrailsManager,
  type GuardrailsManager,
  type StrategyValidationInput,
  type BacktestResults,
  type RiskMetrics,
  type StrategyValidationResult,
  type RuleViolation,
  type RuleWarning,
  type TransactionInput,
  type PolicyEvaluationResult,
  type MatchedPolicy,
  type RiskContext,
  type RiskThresholdResult,
  type ThresholdViolation,
  type ThresholdWarning,
} from './guardrails';

// Export Model Governance
export {
  DefaultModelGovernanceManager,
  createModelGovernanceManager,
  type ModelGovernanceManager,
  type ModelVersionInput,
  type RollbackResult,
  type PerformanceInput,
  type PerformanceRecord,
  type PerformanceSummary,
  type PerformanceAlert,
  type ProviderHealth,
  type RateLimitStatus,
  type ProviderRequirements,
  type RollbackTriggerResult,
} from './model-governance';

// Export Monitoring & Anomaly Detection
export {
  DefaultMonitoringManager,
  createMonitoringManager,
  type MonitoringManager,
  type ActivityRecord,
  type AnomalyCheckResult,
  type AnomalyFilters,
  type AnomalyResolutionInput,
  type AnomalyStatistics,
  type BehaviorComparison,
  type BehaviorDeviation,
  type DetectedPattern,
  type FraudCheckResult,
  type FraudPattern,
  type AlertInput,
  type Alert,
} from './monitoring';

// Export Human Oversight & Control
export {
  DefaultHumanOversightManager,
  createHumanOversightManager,
  type HumanOversightManager,
  type OverrideInput,
  type EmergencyStopInput,
  type AgentState,
  type ApprovalRequestInput,
  type ApprovalInput,
  type ApprovalStatus,
  type DashboardData,
  type DashboardAlert,
  type DashboardMetrics,
  type AgentMetrics,
  type SystemHealth,
  type ComponentHealth,
} from './human-oversight';

// ============================================================================
// Unified AI Safety Manager
// ============================================================================

import { DefaultAlignmentManager, createAlignmentManager } from './alignment';
import { DefaultGuardrailsManager, createGuardrailsManager } from './guardrails';
import { DefaultModelGovernanceManager, createModelGovernanceManager } from './model-governance';
import { DefaultMonitoringManager, createMonitoringManager } from './monitoring';
import { DefaultHumanOversightManager, createHumanOversightManager } from './human-oversight';
import { AISafetyConfig, AISafetyEvent, AISafetyEventCallback } from './types';

/**
 * Unified AI Safety Manager interface providing access to all safety components
 */
export interface AISafetyManager {
  readonly alignment: DefaultAlignmentManager;
  readonly guardrails: DefaultGuardrailsManager;
  readonly modelGovernance: DefaultModelGovernanceManager;
  readonly monitoring: DefaultMonitoringManager;
  readonly humanOversight: DefaultHumanOversightManager;

  // Unified event handling
  onEvent(callback: AISafetyEventCallback): void;

  // Quick checks
  isEnabled(): boolean;
  getSystemStatus(): SystemStatus;

  // Convenience methods
  validateAgentAction(agentId: string, action: AgentActionInput): Promise<ValidationResult>;
  getAgentSafetyScore(agentId: string): Promise<SafetyScore>;
}

export interface SystemStatus {
  enabled: boolean;
  emergencyMode: boolean;
  componentsHealthy: boolean;
  activeAgents: number;
  pendingApprovals: number;
  openAnomalies: number;
}

export interface AgentActionInput {
  type: string;
  parameters: Record<string, unknown>;
  amount?: number;
  destination?: string;
}

export interface ValidationResult {
  allowed: boolean;
  requiresApproval: boolean;
  approvalLevel?: number;
  risks: string[];
  warnings: string[];
  recommendations: string[];
}

export interface SafetyScore {
  overall: number;
  alignment: number;
  behavior: number;
  trust: number;
  components: Record<string, number>;
}

// ============================================================================
// Default AI Safety Manager Implementation
// ============================================================================

export class DefaultAISafetyManager implements AISafetyManager {
  readonly alignment: DefaultAlignmentManager;
  readonly guardrails: DefaultGuardrailsManager;
  readonly modelGovernance: DefaultModelGovernanceManager;
  readonly monitoring: DefaultMonitoringManager;
  readonly humanOversight: DefaultHumanOversightManager;

  private readonly config: AISafetyConfig;
  private readonly eventCallbacks: AISafetyEventCallback[] = [];

  constructor(config?: Partial<AISafetyConfig>) {
    this.config = {
      enabled: true,
      alignment: { enabled: true, goalValidation: {} as any, strategyConsistency: {} as any, boundaryEnforcement: {} as any, intentVerification: {} as any },
      guardrails: { enabled: true, strategyValidation: {} as any, transactionPolicy: {} as any, riskThresholds: {} as any, assetWhitelist: {} as any, protocolWhitelist: {} as any },
      modelGovernance: { enabled: true, versioning: {} as any, evaluation: {} as any, performance: {} as any, rollback: {} as any, providers: [] },
      monitoring: { enabled: true, realTime: true, anomalyDetection: {} as any, behaviorAnalysis: {} as any, alerting: {} as any },
      explainability: { enabled: true, level: 'standard', logging: {} as any, traceability: {} as any, reporting: {} as any },
      humanOversight: { enabled: true, overrides: {} as any, emergencyControls: {} as any, approvalWorkflow: {} as any, dashboard: {} as any },
      ethics: { enabled: true, principles: [], guidelines: [], escalationProcedures: [], complianceStandards: [] },
      simulation: { enabled: true, adversarialTesting: {} as any, stressScenarios: {} as any, failureRecovery: {} as any },
      daoGovernance: { enabled: false, oversight: {} as any, voting: {} as any, upgrades: {} as any, treasury: {} as any },
      ...config,
    };

    // Initialize components
    this.alignment = createAlignmentManager(this.config.alignment);
    this.guardrails = createGuardrailsManager(this.config.guardrails);
    this.modelGovernance = createModelGovernanceManager(this.config.modelGovernance);
    this.monitoring = createMonitoringManager(this.config.monitoring);
    this.humanOversight = createHumanOversightManager(this.config.humanOversight);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  onEvent(callback: AISafetyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getSystemStatus(): SystemStatus {
    const emergencyState = this.humanOversight.getEmergencyState();
    const dashboard = this.humanOversight.getDashboardData();
    const health = this.humanOversight.getSystemHealth();

    return {
      enabled: this.config.enabled,
      emergencyMode: emergencyState.active,
      componentsHealthy: health.overall === 'healthy',
      activeAgents: dashboard.activeAgents,
      pendingApprovals: dashboard.pendingApprovals,
      openAnomalies: this.monitoring.getAnomalyStatistics().open,
    };
  }

  async validateAgentAction(agentId: string, action: AgentActionInput): Promise<ValidationResult> {
    const risks: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let requiresApproval = false;
    let approvalLevel: number | undefined;

    // Check emergency state
    const emergencyState = this.humanOversight.getEmergencyState();
    if (emergencyState.active) {
      return {
        allowed: false,
        requiresApproval: false,
        risks: ['Emergency mode is active - all actions blocked'],
        warnings: [],
        recommendations: ['Wait for emergency mode to be deactivated'],
      };
    }

    // Check agent state
    const agentStates = this.humanOversight.getAgentStates();
    const agentState = agentStates.get(agentId);
    if (agentState?.status === 'paused' || agentState?.status === 'stopped') {
      return {
        allowed: false,
        requiresApproval: false,
        risks: [`Agent is ${agentState.status}`],
        warnings: [],
        recommendations: ['Resume agent before executing actions'],
      };
    }

    // Check boundaries
    const boundaryCheck = await this.alignment.checkBoundaries(agentId, {
      type: action.type,
      parameters: action.parameters,
      estimatedValue: action.amount,
      targetAddress: action.destination,
    });

    if (!boundaryCheck.allowed) {
      for (const violation of boundaryCheck.hardLimitViolations) {
        risks.push(violation.message);
      }
    }

    for (const warning of boundaryCheck.softLimitWarnings) {
      if (warning.level === 'escalate') {
        requiresApproval = true;
        approvalLevel = 2;
      }
      warnings.push(warning.message);
    }

    // Check transaction policy
    if (action.amount !== undefined) {
      const policyResult = await this.guardrails.evaluateTransaction({
        type: action.type as any,
        amount: action.amount,
        currency: 'TON',
        destination: action.destination,
        timestamp: new Date(),
        agentId,
      });

      if (!policyResult.allowed) {
        risks.push(`Transaction blocked by policy`);
      }

      if (policyResult.action === 'require_approval') {
        requiresApproval = true;
        approvalLevel = Math.max(approvalLevel || 1, 2);
      }

      if (policyResult.riskScore > 50) {
        warnings.push(`High risk score: ${policyResult.riskScore}`);
      }
    }

    // Check alignment
    const alignmentScore = await this.alignment.calculateAlignmentScore(agentId);
    if (alignmentScore < 70) {
      warnings.push(`Low alignment score: ${alignmentScore.toFixed(0)}`);
      recommendations.push('Review agent goals and constraints');
    }

    // Check for anomalies
    const anomalies = await this.monitoring.detectAnomalies(agentId);
    if (anomalies.length > 0) {
      warnings.push(`${anomalies.length} open anomalies detected`);
      recommendations.push('Investigate and resolve anomalies before proceeding');
    }

    return {
      allowed: risks.length === 0 && boundaryCheck.allowed,
      requiresApproval,
      approvalLevel,
      risks,
      warnings,
      recommendations,
    };
  }

  async getAgentSafetyScore(agentId: string): Promise<SafetyScore> {
    const alignmentScore = await this.alignment.calculateAlignmentScore(agentId);
    const behaviorProfile = this.monitoring.getBehaviorProfile(agentId);
    const trustScore = this.monitoring.getTrustScore(agentId);

    // Calculate component scores
    const anomalyStats = this.monitoring.getAnomalyStatistics(agentId);
    const anomalyScore = Math.max(0, 100 - anomalyStats.open * 10);

    const overrides = this.humanOversight.getOverrideHistory(agentId, 10);
    const overrideScore = Math.max(0, 100 - overrides.length * 5);

    const components: Record<string, number> = {
      alignment: alignmentScore,
      behavior: behaviorProfile?.trustScore ?? 80,
      anomaly: anomalyScore,
      override: overrideScore,
      trust: trustScore,
    };

    // Calculate overall score
    const weights = { alignment: 0.3, behavior: 0.25, anomaly: 0.2, override: 0.1, trust: 0.15 };
    let overall = 0;
    for (const [key, weight] of Object.entries(weights)) {
      overall += (components[key] || 80) * weight;
    }

    return {
      overall,
      alignment: alignmentScore,
      behavior: behaviorProfile?.trustScore ?? 80,
      trust: trustScore,
      components,
    };
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: AISafetyEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.alignment.onEvent(forwardEvent);
    this.guardrails.onEvent(forwardEvent);
    this.modelGovernance.onEvent(forwardEvent);
    this.monitoring.onEvent(forwardEvent);
    this.humanOversight.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new AI Safety Manager instance
 *
 * @param config - Partial configuration for the safety system
 * @returns A configured AI Safety Manager instance
 *
 * @example
 * ```typescript
 * const safety = createAISafetyManager({
 *   enabled: true,
 *   alignment: { enabled: true },
 *   guardrails: { enabled: true },
 *   monitoring: { realTime: true },
 * });
 * ```
 */
export function createAISafetyManager(config?: Partial<AISafetyConfig>): DefaultAISafetyManager {
  return new DefaultAISafetyManager(config);
}

// Default export
export default DefaultAISafetyManager;
