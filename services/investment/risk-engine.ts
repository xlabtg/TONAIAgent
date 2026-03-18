/**
 * Risk Management Engine
 *
 * Per-agent risk enforcement for the Autonomous AI Investment Layer.
 * Handles drawdown limits, exposure limits, position sizing, daily thresholds,
 * circuit breakers, and emergency stops. Integrates with the lifecycle orchestrator.
 */

import type {
  AgentRiskProfile,
  RiskLevel,
  CircuitBreakerStatus,
  RiskCheckResult,
  RiskViolation,
  CircuitBreakerEvent,
  EmergencyStopEvent,
  PositionSizingRule,
  InvestmentEvent,
  InvestmentEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface RiskEngine {
  // Profile management
  createRiskProfile(agentId: string, vaultId: string, params?: Partial<AgentRiskProfileParams>): Promise<AgentRiskProfile>;
  getRiskProfile(agentId: string): Promise<AgentRiskProfile | null>;
  updateRiskProfile(agentId: string, params: Partial<AgentRiskProfileParams>): Promise<AgentRiskProfile>;

  // Risk checks
  checkRisk(agentId: string, proposedAction: RiskAction): Promise<RiskCheckResult>;
  runDailyRiskCheck(agentId: string): Promise<RiskCheckResult>;

  // Circuit breakers
  triggerCircuitBreaker(agentId: string, trigger: CircuitBreakerEvent['trigger'], details: string): Promise<CircuitBreakerEvent>;
  resetCircuitBreaker(agentId: string): Promise<CircuitBreakerEvent>;
  getCircuitBreakerStatus(agentId: string): Promise<CircuitBreakerStatus>;
  listCircuitBreakerEvents(agentId: string): Promise<CircuitBreakerEvent[]>;

  // Emergency stops
  triggerEmergencyStop(vaultId: string, triggeredBy: string, reason: string): Promise<EmergencyStopEvent>;
  resolveEmergencyStop(eventId: string): Promise<EmergencyStopEvent>;
  getActiveEmergencyStop(vaultId: string): Promise<EmergencyStopEvent | null>;

  // Drawdown tracking
  recordDrawdown(agentId: string, drawdownPercent: number): Promise<void>;
  recordDailyLoss(agentId: string, lossAmount: number): Promise<void>;

  // Events
  onEvent(callback: InvestmentEventCallback): () => void;
}

export interface AgentRiskProfileParams {
  maxDrawdownLimit: number;
  exposureLimit: number;
  positionSizingRule: PositionSizingRule;
  dailyLossLimit: number;
}

export interface RiskAction {
  type: 'allocate' | 'position_open' | 'rebalance';
  proposedExposurePercent: number; // % of vault
  proposedPositionSizePercent: number; // % of allocation
  confidence?: number; // AI confidence 0-1
}

// ============================================================================
// Configuration
// ============================================================================

export interface RiskEngineConfig {
  defaultMaxDrawdown: number;
  defaultExposureLimit: number;
  defaultDailyLossLimit: number;
  defaultPositionSizingRule: PositionSizingRule;
  circuitBreakerResetHours: number;
}

const DEFAULT_CONFIG: RiskEngineConfig = {
  defaultMaxDrawdown: 20, // 20%
  defaultExposureLimit: 40, // 40% of vault
  defaultDailyLossLimit: 50, // 50 TON
  defaultPositionSizingRule: {
    method: 'risk_parity',
    maxPositionSize: 25,
    minPositionSize: 1,
    confidenceScaling: true,
  },
  circuitBreakerResetHours: 24,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultRiskEngine implements RiskEngine {
  private readonly config: RiskEngineConfig;
  private readonly profiles: Map<string, AgentRiskProfile> = new Map();
  private readonly circuitBreakerEvents: Map<string, CircuitBreakerEvent[]> = new Map();
  private readonly emergencyStops: Map<string, EmergencyStopEvent> = new Map(); // vaultId → active stop
  private readonly eventCallbacks: InvestmentEventCallback[] = [];

  constructor(config: Partial<RiskEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createRiskProfile(
    agentId: string,
    vaultId: string,
    params: Partial<AgentRiskProfileParams> = {}
  ): Promise<AgentRiskProfile> {
    if (this.profiles.has(agentId)) {
      throw new Error(`Risk profile for agent ${agentId} already exists`);
    }

    const profile: AgentRiskProfile = {
      agentId,
      vaultId,
      maxDrawdownLimit: params.maxDrawdownLimit ?? this.config.defaultMaxDrawdown,
      currentDrawdown: 0,
      exposureLimit: params.exposureLimit ?? this.config.defaultExposureLimit,
      currentExposure: 0,
      positionSizingRule: params.positionSizingRule ?? this.config.defaultPositionSizingRule,
      dailyLossLimit: params.dailyLossLimit ?? this.config.defaultDailyLossLimit,
      currentDailyLoss: 0,
      riskLevel: 'low',
      circuitBreakerStatus: 'closed',
      lastRiskCheck: new Date(),
    };

    this.profiles.set(agentId, profile);
    return profile;
  }

  async getRiskProfile(agentId: string): Promise<AgentRiskProfile | null> {
    return this.profiles.get(agentId) ?? null;
  }

  async updateRiskProfile(agentId: string, params: Partial<AgentRiskProfileParams>): Promise<AgentRiskProfile> {
    const profile = this.getProfileOrThrow(agentId);
    const updatedProfile: AgentRiskProfile = {
      ...profile,
      ...params,
      lastRiskCheck: new Date(),
    };
    this.profiles.set(agentId, updatedProfile);
    return updatedProfile;
  }

  async checkRisk(agentId: string, action: RiskAction): Promise<RiskCheckResult> {
    const profile = this.getProfileOrThrow(agentId);
    const violations: RiskViolation[] = [];
    const recommendations: string[] = [];

    // Check circuit breaker
    if (profile.circuitBreakerStatus === 'open') {
      violations.push({
        type: 'circuit_breaker',
        severity: 'critical',
        message: 'Circuit breaker is open — all actions blocked',
        currentValue: 1,
        limitValue: 0,
      });
    }

    // Check drawdown
    if (profile.currentDrawdown >= profile.maxDrawdownLimit) {
      violations.push({
        type: 'drawdown',
        severity: 'critical',
        message: `Drawdown ${profile.currentDrawdown.toFixed(2)}% exceeds limit ${profile.maxDrawdownLimit}%`,
        currentValue: profile.currentDrawdown,
        limitValue: profile.maxDrawdownLimit,
      });
    } else if (profile.currentDrawdown >= profile.maxDrawdownLimit * 0.8) {
      recommendations.push(`Drawdown ${profile.currentDrawdown.toFixed(2)}% is approaching limit (80%+ of limit)`);
    }

    // Check daily loss
    if (profile.currentDailyLoss >= profile.dailyLossLimit) {
      violations.push({
        type: 'daily_loss',
        severity: 'high',
        message: `Daily loss ${profile.currentDailyLoss} TON exceeds limit ${profile.dailyLossLimit} TON`,
        currentValue: profile.currentDailyLoss,
        limitValue: profile.dailyLossLimit,
      });
    }

    // Check exposure
    if (action.proposedExposurePercent > profile.exposureLimit) {
      violations.push({
        type: 'exposure',
        severity: 'high',
        message: `Proposed exposure ${action.proposedExposurePercent}% exceeds limit ${profile.exposureLimit}%`,
        currentValue: action.proposedExposurePercent,
        limitValue: profile.exposureLimit,
      });
    }

    // Check position size
    const effectivePositionSize = action.confidence !== undefined && profile.positionSizingRule.confidenceScaling
      ? action.proposedPositionSizePercent * action.confidence
      : action.proposedPositionSizePercent;

    if (effectivePositionSize > profile.positionSizingRule.maxPositionSize) {
      violations.push({
        type: 'position_size',
        severity: 'medium',
        message: `Position size ${effectivePositionSize.toFixed(2)}% exceeds max ${profile.positionSizingRule.maxPositionSize}%`,
        currentValue: effectivePositionSize,
        limitValue: profile.positionSizingRule.maxPositionSize,
      });
    }

    const riskLevel = this.calculateRiskLevel(violations);
    const passed = violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;

    // Update last risk check
    const updatedProfile: AgentRiskProfile = {
      ...profile,
      riskLevel,
      lastRiskCheck: new Date(),
    };
    this.profiles.set(agentId, updatedProfile);

    const result: RiskCheckResult = {
      passed,
      riskLevel,
      violations,
      recommendations,
      timestamp: new Date(),
    };

    if (!passed) {
      this.emitEvent({
        type: 'risk_check_failed',
        timestamp: result.timestamp,
        data: { agentId, violations, riskLevel },
      });
    }

    return result;
  }

  async runDailyRiskCheck(agentId: string): Promise<RiskCheckResult> {
    // Neutral action to just evaluate current state
    return this.checkRisk(agentId, {
      type: 'rebalance',
      proposedExposurePercent: 0,
      proposedPositionSizePercent: 0,
    });
  }

  async triggerCircuitBreaker(
    agentId: string,
    trigger: CircuitBreakerEvent['trigger'],
    details: string
  ): Promise<CircuitBreakerEvent> {
    const profile = this.getProfileOrThrow(agentId);
    const now = new Date();

    const event: CircuitBreakerEvent = {
      id: this.generateId('cb'),
      agentId,
      vaultId: profile.vaultId,
      trigger,
      status: 'open',
      triggeredAt: now,
      details,
    };

    const events = this.circuitBreakerEvents.get(agentId) ?? [];
    events.push(event);
    this.circuitBreakerEvents.set(agentId, events);

    // Update profile
    const updatedProfile: AgentRiskProfile = {
      ...profile,
      circuitBreakerStatus: 'open',
      riskLevel: 'critical',
    };
    this.profiles.set(agentId, updatedProfile);

    this.emitEvent({
      type: 'circuit_breaker_triggered',
      timestamp: now,
      data: { agentId, vaultId: profile.vaultId, trigger, details },
    });

    return event;
  }

  async resetCircuitBreaker(agentId: string): Promise<CircuitBreakerEvent> {
    const profile = this.getProfileOrThrow(agentId);

    const events = this.circuitBreakerEvents.get(agentId) ?? [];
    const latestEvent = events[events.length - 1];
    if (!latestEvent || latestEvent.status !== 'open') {
      throw new Error(`No open circuit breaker for agent ${agentId}`);
    }

    const now = new Date();
    const updatedEvent: CircuitBreakerEvent = { ...latestEvent, status: 'closed', resetAt: now };
    events[events.length - 1] = updatedEvent;
    this.circuitBreakerEvents.set(agentId, events);

    const updatedProfile: AgentRiskProfile = {
      ...profile,
      circuitBreakerStatus: 'closed',
      currentDailyLoss: 0, // Reset daily loss on manual reset
      riskLevel: this.calculateRiskLevel([]),
    };
    this.profiles.set(agentId, updatedProfile);

    return updatedEvent;
  }

  async getCircuitBreakerStatus(agentId: string): Promise<CircuitBreakerStatus> {
    const profile = this.profiles.get(agentId);
    return profile?.circuitBreakerStatus ?? 'closed';
  }

  async listCircuitBreakerEvents(agentId: string): Promise<CircuitBreakerEvent[]> {
    return this.circuitBreakerEvents.get(agentId) ?? [];
  }

  async triggerEmergencyStop(vaultId: string, triggeredBy: string, reason: string): Promise<EmergencyStopEvent> {
    const now = new Date();

    // Find all agents for this vault
    const affectedAgentIds = Array.from(this.profiles.values())
      .filter(p => p.vaultId === vaultId)
      .map(p => p.agentId);

    const event: EmergencyStopEvent = {
      id: this.generateId('emergency'),
      vaultId,
      triggeredBy,
      reason,
      affectedAgentIds,
      timestamp: now,
      resolved: false,
    };

    this.emergencyStops.set(vaultId, event);

    // Trigger circuit breakers for all affected agents
    for (const agentId of affectedAgentIds) {
      const profile = this.profiles.get(agentId);
      if (profile && profile.circuitBreakerStatus !== 'open') {
        await this.triggerCircuitBreaker(agentId, 'manual', `Emergency stop: ${reason}`);
      }
    }

    this.emitEvent({
      type: 'emergency_stop',
      timestamp: now,
      data: { vaultId, triggeredBy, reason, affectedAgentIds },
    });

    return event;
  }

  async resolveEmergencyStop(eventId: string): Promise<EmergencyStopEvent> {
    // Find the event by id
    let found: EmergencyStopEvent | undefined;
    let vaultId: string | undefined;
    for (const [vid, evt] of this.emergencyStops.entries()) {
      if (evt.id === eventId) {
        found = evt;
        vaultId = vid;
        break;
      }
    }

    if (!found || !vaultId) {
      throw new Error(`Emergency stop event ${eventId} not found`);
    }

    if (found.resolved) {
      throw new Error(`Emergency stop event ${eventId} is already resolved`);
    }

    const resolved: EmergencyStopEvent = { ...found, resolved: true, resolvedAt: new Date() };
    this.emergencyStops.set(vaultId, resolved);
    return resolved;
  }

  async getActiveEmergencyStop(vaultId: string): Promise<EmergencyStopEvent | null> {
    const event = this.emergencyStops.get(vaultId);
    if (!event || event.resolved) return null;
    return event;
  }

  async recordDrawdown(agentId: string, drawdownPercent: number): Promise<void> {
    const profile = this.getProfileOrThrow(agentId);
    const updatedProfile: AgentRiskProfile = {
      ...profile,
      currentDrawdown: drawdownPercent,
      riskLevel: this.calculateRiskLevel(
        drawdownPercent >= profile.maxDrawdownLimit
          ? [{ type: 'drawdown', severity: 'critical', message: '', currentValue: drawdownPercent, limitValue: profile.maxDrawdownLimit }]
          : []
      ),
    };
    this.profiles.set(agentId, updatedProfile);

    // Auto-trigger circuit breaker on limit breach
    if (drawdownPercent >= profile.maxDrawdownLimit && profile.circuitBreakerStatus !== 'open') {
      await this.triggerCircuitBreaker(agentId, 'drawdown', `Drawdown ${drawdownPercent.toFixed(2)}% exceeded limit ${profile.maxDrawdownLimit}%`);
    }
  }

  async recordDailyLoss(agentId: string, lossAmount: number): Promise<void> {
    const profile = this.getProfileOrThrow(agentId);
    const newDailyLoss = profile.currentDailyLoss + lossAmount;
    const updatedProfile: AgentRiskProfile = {
      ...profile,
      currentDailyLoss: newDailyLoss,
    };
    this.profiles.set(agentId, updatedProfile);

    if (newDailyLoss >= profile.dailyLossLimit && profile.circuitBreakerStatus !== 'open') {
      await this.triggerCircuitBreaker(agentId, 'drawdown', `Daily loss ${newDailyLoss} TON exceeded limit ${profile.dailyLossLimit} TON`);
    }
  }

  onEvent(callback: InvestmentEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private getProfileOrThrow(agentId: string): AgentRiskProfile {
    const profile = this.profiles.get(agentId);
    if (!profile) throw new Error(`Risk profile for agent ${agentId} not found`);
    return profile;
  }

  private calculateRiskLevel(violations: RiskViolation[]): RiskLevel {
    if (violations.some(v => v.severity === 'critical')) return 'critical';
    if (violations.some(v => v.severity === 'high')) return 'high';
    if (violations.some(v => v.severity === 'medium')) return 'medium';
    return 'low';
  }

  private emitEvent(event: InvestmentEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Swallow callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // For health checks
  getStats(): { activeProfiles: number } {
    return { activeProfiles: this.profiles.size };
  }
}

export function createRiskEngine(config?: Partial<RiskEngineConfig>): DefaultRiskEngine {
  return new DefaultRiskEngine(config);
}
