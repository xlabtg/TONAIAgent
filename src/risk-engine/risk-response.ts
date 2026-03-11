/**
 * Risk Engine v1 — Automated Risk Response
 * Issue #154: Risk Engine v1
 *
 * When risk thresholds are breached, the engine triggers automated responses:
 *   - Automatic rebalancing
 *   - Position reduction
 *   - Strategy pause
 *   - Emergency shutdown of agents
 *
 * This protects both investors and the platform.
 */

import type {
  RiskResponseEvent,
  RiskResponseTrigger,
  RiskResponseAction,
  RiskResponseStatus,
  AutomaticRiskResponseConfig,
  RiskScore,
  RiskEngineEvent,
  RiskEngineEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_AUTO_RESPONSE_CONFIG: AutomaticRiskResponseConfig = {
  enableAutoRebalance: true,
  enableAutoReducePosition: true,
  enableAutoPauseStrategy: true,
  enableEmergencyShutdown: true,
  criticalScoreThreshold: 81,
  highScoreThreshold: 61,
  drawdownBreachPercent: 0.20,
};

// ============================================================================
// Risk Response Handler Interface
// ============================================================================

export interface RiskResponseHandler {
  handleRiskScore(entityId: string, entityType: 'agent' | 'strategy' | 'fund', riskScore: RiskScore): RiskResponseEvent | null;
  handleDrawdownBreach(entityId: string, entityType: 'agent' | 'strategy' | 'fund', drawdownPercent: number): RiskResponseEvent | null;
  handleManualOverride(entityId: string, entityType: 'agent' | 'strategy' | 'fund', actions: RiskResponseAction[]): RiskResponseEvent;
  getActiveResponses(): RiskResponseEvent[];
  getResponseHistory(): RiskResponseEvent[];
  completeResponse(responseId: string, success: boolean): void;
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Risk Response Handler Implementation
// ============================================================================

export class DefaultRiskResponseHandler implements RiskResponseHandler {
  private readonly config: AutomaticRiskResponseConfig;
  private readonly activeResponses = new Map<string, RiskResponseEvent>();
  private readonly responseHistory: RiskResponseEvent[] = [];
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];
  private responseCounter = 0;

  constructor(config?: Partial<AutomaticRiskResponseConfig>) {
    this.config = {
      ...DEFAULT_AUTO_RESPONSE_CONFIG,
      ...config,
    };
  }

  onEvent(callback: RiskEngineEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<RiskEngineEvent, 'timestamp'>): void {
    const fullEvent: RiskEngineEvent = {
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  handleRiskScore(
    entityId: string,
    entityType: 'agent' | 'strategy' | 'fund',
    riskScore: RiskScore,
  ): RiskResponseEvent | null {
    const { config } = this;
    const actions: RiskResponseAction[] = [];

    if (riskScore.value >= config.criticalScoreThreshold) {
      // Critical risk → emergency shutdown if enabled
      if (config.enableEmergencyShutdown) {
        actions.push('emergency_shutdown');
      }
      if (config.enableAutoPauseStrategy) {
        actions.push('pause_strategy');
      }
    } else if (riskScore.value >= config.highScoreThreshold) {
      // High risk → pause strategy and reduce position
      if (config.enableAutoPauseStrategy) {
        actions.push('pause_strategy');
      }
      if (config.enableAutoReducePosition) {
        actions.push('reduce_position');
      }
    } else {
      // Low/moderate risk → no automatic response needed
      return null;
    }

    if (actions.length === 0) return null;

    return this.createResponse(
      entityId,
      entityType,
      'limit_exceeded',
      actions,
      `Risk score ${riskScore.value}/100 (${riskScore.category}): ${riskScore.explanation}`,
    );
  }

  handleDrawdownBreach(
    entityId: string,
    entityType: 'agent' | 'strategy' | 'fund',
    drawdownPercent: number,
  ): RiskResponseEvent | null {
    if (drawdownPercent < this.config.drawdownBreachPercent) {
      return null;
    }

    const { config } = this;
    const actions: RiskResponseAction[] = [];

    if (config.enableAutoReducePosition) {
      actions.push('reduce_position');
    }
    if (config.enableAutoRebalance) {
      actions.push('rebalance');
    }

    if (actions.length === 0) return null;

    return this.createResponse(
      entityId,
      entityType,
      'drawdown_breach',
      actions,
      `Drawdown ${(drawdownPercent * 100).toFixed(2)}% exceeds threshold of ${(config.drawdownBreachPercent * 100).toFixed(2)}%.`,
    );
  }

  handleManualOverride(
    entityId: string,
    entityType: 'agent' | 'strategy' | 'fund',
    actions: RiskResponseAction[],
  ): RiskResponseEvent {
    return this.createResponse(
      entityId,
      entityType,
      'manual_override',
      actions,
      `Manual risk response override triggered for ${entityType} ${entityId}.`,
    );
  }

  getActiveResponses(): RiskResponseEvent[] {
    return Array.from(this.activeResponses.values());
  }

  getResponseHistory(): RiskResponseEvent[] {
    return [...this.responseHistory];
  }

  completeResponse(responseId: string, success: boolean): void {
    const response = this.activeResponses.get(responseId);
    if (!response) return;

    const status: RiskResponseStatus = success ? 'completed' : 'failed';
    const completed: RiskResponseEvent = {
      ...response,
      status,
      completedAt: new Date(),
    };

    this.activeResponses.delete(responseId);
    this.responseHistory.push(completed);

    this.emitEvent({
      type: 'risk_response_completed',
      payload: {
        responseId,
        entityId: completed.entityId,
        entityType: completed.entityType,
        actions: completed.actions,
        success,
      },
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createResponse(
    entityId: string,
    entityType: 'agent' | 'strategy' | 'fund',
    trigger: RiskResponseTrigger,
    actions: RiskResponseAction[],
    message: string,
  ): RiskResponseEvent {
    const id = `resp_${++this.responseCounter}_${Date.now()}`;
    const response: RiskResponseEvent = {
      id,
      trigger,
      entityId,
      entityType,
      actions,
      status: 'pending',
      triggeredAt: new Date(),
      message,
    };

    this.activeResponses.set(id, response);

    this.emitEvent({
      type: 'risk_response_triggered',
      payload: {
        responseId: id,
        entityId,
        entityType,
        trigger,
        actions,
        message,
      },
    });

    return response;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskResponseHandler(
  config?: Partial<AutomaticRiskResponseConfig>,
): DefaultRiskResponseHandler {
  return new DefaultRiskResponseHandler(config);
}
