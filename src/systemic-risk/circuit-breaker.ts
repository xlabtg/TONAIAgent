/**
 * Circuit Breaker System
 * Automatic triggers for extreme volatility, liquidity evaporation, oracle
 * failures, and large liquidation waves.  Actions: leverage freeze, partial
 * trading halt, margin requirement increase, emergency governance trigger.
 */

import {
  type CircuitBreakerTriggerType,
  type CircuitBreakerAction,
  type CircuitBreakerStatus,
  type CircuitBreakerRule,
  type CircuitBreakerEvent,
  type CircuitBreakerState,
  type CircuitBreakerConfig,
  type SystemicRiskEvent,
  type SystemicRiskEventCallback,
} from './types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TriggerInput {
  type: CircuitBreakerTriggerType;
  value: number;      // the metric value that crossed a threshold
  message?: string;
}

export interface CircuitBreakerSystem {
  getState(): CircuitBreakerState;
  evaluate(input: TriggerInput): CircuitBreakerEvent | null;
  manualTrigger(actions: CircuitBreakerAction[], message: string): CircuitBreakerEvent;
  resolve(eventId: string): void;
  resolveAll(): void;
  isActionActive(action: CircuitBreakerAction): boolean;
  isTradingHalted(): boolean;
  isLeverageFrozen(): boolean;
  getHistory(): CircuitBreakerEvent[];
  addRule(rule: CircuitBreakerRule): void;
  disableRule(ruleId: string): void;
  enableRule(ruleId: string): void;
  onEvent(callback: SystemicRiskEventCallback): void;
}

// ─── Default Rules ────────────────────────────────────────────────────────────

export const DEFAULT_CIRCUIT_BREAKER_RULES: CircuitBreakerRule[] = [
  {
    id: 'cb-extreme-volatility',
    name: 'Extreme Volatility Trigger',
    triggerType: 'extreme_volatility',
    threshold: 0.50,  // 50% volatility index
    actions: ['leverage_freeze', 'margin_requirement_increase'],
    cooldownMs: 30 * 60 * 1000,  // 30 min
    enabled: true,
  },
  {
    id: 'cb-liquidity-evaporation',
    name: 'Liquidity Evaporation Trigger',
    triggerType: 'liquidity_evaporation',
    threshold: 0.30,  // liquidity below 30% of normal
    actions: ['partial_trading_halt', 'margin_requirement_increase'],
    cooldownMs: 60 * 60 * 1000,  // 1 hour
    enabled: true,
  },
  {
    id: 'cb-oracle-failure',
    name: 'Oracle Failure Trigger',
    triggerType: 'oracle_failure',
    threshold: 1,    // any oracle failure (count >= 1)
    actions: ['full_trading_halt'],
    cooldownMs: 5 * 60 * 1000,  // 5 min
    enabled: true,
  },
  {
    id: 'cb-large-liquidation-wave',
    name: 'Large Liquidation Wave Trigger',
    triggerType: 'large_liquidation_wave',
    threshold: 5,    // 5 or more simultaneous liquidations
    actions: ['leverage_freeze', 'partial_trading_halt', 'emergency_governance_trigger'],
    cooldownMs: 2 * 60 * 60 * 1000,  // 2 hours
    enabled: true,
  },
  {
    id: 'cb-cascade-risk',
    name: 'Cascade Risk Trigger',
    triggerType: 'cascade_risk',
    threshold: 0.70,  // cascade risk score > 70%
    actions: ['leverage_freeze', 'emergency_governance_trigger'],
    cooldownMs: 60 * 60 * 1000,  // 1 hour
    enabled: true,
  },
  {
    id: 'cb-insurance-depleted',
    name: 'Insurance Fund Depleted Trigger',
    triggerType: 'insurance_fund_depleted',
    threshold: 0.10,  // coverage ratio below 10%
    actions: ['leverage_freeze', 'partial_trading_halt', 'emergency_governance_trigger'],
    cooldownMs: 4 * 60 * 60 * 1000,  // 4 hours
    enabled: true,
  },
];

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  rules: DEFAULT_CIRCUIT_BREAKER_RULES,
  autoResolveMs: 2 * 60 * 60 * 1000,  // auto-resolve after 2 hours
  governanceNotificationEnabled: true,
};

// ─── Implementation ───────────────────────────────────────────────────────────

export class DefaultCircuitBreakerSystem implements CircuitBreakerSystem {
  private readonly config: CircuitBreakerConfig;
  private rules: Map<string, CircuitBreakerRule> = new Map();
  private activeEvents: Map<string, CircuitBreakerEvent> = new Map();
  private history: CircuitBreakerEvent[] = [];
  private eventCallbacks: SystemicRiskEventCallback[] = [];
  private eventIdCounter = 0;
  private lastTriggerByRule: Map<string, number> = new Map();

  constructor(config?: Partial<CircuitBreakerConfig>) {
    const merged: CircuitBreakerConfig = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...config,
      rules: config?.rules ?? DEFAULT_CIRCUIT_BREAKER_RULES,
    };
    this.config = merged;

    for (const rule of this.config.rules) {
      this.rules.set(rule.id, { ...rule });
    }
  }

  getState(): CircuitBreakerState {
    const activeList = Array.from(this.activeEvents.values());
    const currentRestrictions = this.collectActiveRestrictions(activeList);
    const tradingHalted = currentRestrictions.includes('full_trading_halt') ||
      currentRestrictions.includes('partial_trading_halt');
    const leverageFrozen = currentRestrictions.includes('leverage_freeze');
    const triggeredTimes = this.history.map(e => e.triggeredAt);
    const resolvedTimes = this.history.filter(e => e.resolvedAt).map(e => e.resolvedAt!);

    return {
      status: this.deriveStatus(activeList),
      activeEvents: activeList,
      history: [...this.history],
      currentRestrictions,
      tradingHalted,
      leverageFrozen,
      lastTriggered: triggeredTimes.length > 0 ? Math.max(...triggeredTimes) : undefined,
      lastResolved: resolvedTimes.length > 0 ? Math.max(...resolvedTimes) : undefined,
    };
  }

  evaluate(input: TriggerInput): CircuitBreakerEvent | null {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (rule.triggerType !== input.type) continue;
      if (input.value < rule.threshold) continue;

      // Cooldown check
      const lastTrigger = this.lastTriggerByRule.get(rule.id);
      if (lastTrigger && Date.now() - lastTrigger < rule.cooldownMs) continue;

      const cbEvent = this.createEvent(rule, input.value, input.message);
      this.activeEvents.set(cbEvent.id, cbEvent);
      this.history.push(cbEvent);
      this.lastTriggerByRule.set(rule.id, Date.now());

      this.emit({ type: 'circuit_breaker_triggered', timestamp: Date.now(), payload: cbEvent });
      return cbEvent;
    }
    return null;
  }

  manualTrigger(actions: CircuitBreakerAction[], message: string): CircuitBreakerEvent {
    const cbEvent: CircuitBreakerEvent = {
      id: `cb-${++this.eventIdCounter}`,
      ruleId: 'manual',
      triggerType: 'manual_trigger',
      actions,
      triggeredAt: Date.now(),
      status: 'triggered',
      triggerValue: 1,
      threshold: 1,
      message,
    };
    this.activeEvents.set(cbEvent.id, cbEvent);
    this.history.push(cbEvent);
    this.emit({ type: 'circuit_breaker_triggered', timestamp: Date.now(), payload: cbEvent });
    return cbEvent;
  }

  resolve(eventId: string): void {
    const event = this.activeEvents.get(eventId);
    if (!event) return;

    const resolved: CircuitBreakerEvent = { ...event, status: 'cooldown', resolvedAt: Date.now() };
    this.activeEvents.delete(eventId);

    // Update history entry
    const idx = this.history.findIndex(e => e.id === eventId);
    if (idx >= 0) this.history[idx] = resolved;

    this.emit({ type: 'circuit_breaker_resolved', timestamp: Date.now(), payload: resolved });
  }

  resolveAll(): void {
    for (const eventId of Array.from(this.activeEvents.keys())) {
      this.resolve(eventId);
    }
  }

  isActionActive(action: CircuitBreakerAction): boolean {
    return this.collectActiveRestrictions(Array.from(this.activeEvents.values())).includes(action);
  }

  isTradingHalted(): boolean {
    return this.isActionActive('full_trading_halt') || this.isActionActive('partial_trading_halt');
  }

  isLeverageFrozen(): boolean {
    return this.isActionActive('leverage_freeze');
  }

  getHistory(): CircuitBreakerEvent[] {
    return [...this.history];
  }

  addRule(rule: CircuitBreakerRule): void {
    this.rules.set(rule.id, { ...rule });
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) this.rules.set(ruleId, { ...rule, enabled: false });
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) this.rules.set(ruleId, { ...rule, enabled: true });
  }

  onEvent(callback: SystemicRiskEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private createEvent(
    rule: CircuitBreakerRule,
    triggerValue: number,
    customMessage?: string,
  ): CircuitBreakerEvent {
    return {
      id: `cb-${++this.eventIdCounter}`,
      ruleId: rule.id,
      triggerType: rule.triggerType,
      actions: [...rule.actions],
      triggeredAt: Date.now(),
      status: 'triggered',
      triggerValue,
      threshold: rule.threshold,
      message: customMessage ?? `${rule.name}: value ${triggerValue} exceeded threshold ${rule.threshold}`,
    };
  }

  private collectActiveRestrictions(activeList: CircuitBreakerEvent[]): CircuitBreakerAction[] {
    const set = new Set<CircuitBreakerAction>();
    for (const event of activeList) {
      for (const action of event.actions) {
        set.add(action);
      }
    }
    return Array.from(set);
  }

  private deriveStatus(activeList: CircuitBreakerEvent[]): CircuitBreakerStatus {
    if (activeList.length === 0) return 'inactive';
    if (activeList.some(e => e.status === 'triggered')) return 'triggered';
    return 'monitoring';
  }

  private emit(event: SystemicRiskEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
}

export function createCircuitBreakerSystem(
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreakerSystem {
  return new DefaultCircuitBreakerSystem(config);
}
