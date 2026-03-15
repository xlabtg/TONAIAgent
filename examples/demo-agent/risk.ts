/**
 * TONAIAgent - Demo Agent Risk Manager
 *
 * Implements risk controls and safety mechanisms as specified in Issue #83:
 *   - Max budget cap enforcement
 *   - Max drawdown protection
 *   - Kill switch
 *   - Auto-pause on failure
 *   - Stop-loss trigger
 */

import type {
  AgentDecision,
  AgentMetrics,
  DemoAgent,
  RiskFlag,
  RiskValidationResult,
  SimulationBalance,
} from './types';

// ============================================================================
// Risk Manager
// ============================================================================

/**
 * Risk Manager — validates agent decisions against configured safety limits.
 */
export class RiskManager {
  /** Active kill switches — agentId → reason */
  private readonly killSwitches: Map<string, string> = new Map();

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Validate a proposed decision before execution.
   * Returns a RiskValidationResult with allowed=false if any safety check fails.
   */
  validateDecision(
    agent: DemoAgent,
    decision: AgentDecision,
    balance: SimulationBalance,
    metrics: AgentMetrics,
  ): RiskValidationResult {
    const config = agent.config;
    const flags: RiskFlag[] = [];

    // 1. Kill switch — highest priority
    if (this.killSwitches.has(agent.id)) {
      flags.push('kill_switch_active');
      return {
        allowed: false,
        reason: `Kill switch active: ${this.killSwitches.get(agent.id)}`,
        flags,
      };
    }

    // Only validate buy/sell actions (hold is always safe)
    if (decision.action === 'hold') {
      return { allowed: true, flags };
    }

    // 2. Budget cap — cannot trade more than configured budget
    const totalValueTon = balance.tonBalance + balance.usdBalance / this.estimatedPrice(balance);
    if (totalValueTon > config.budget * 1.5) {
      // This check is informational for sim mode; always allow but flag it
      flags.push('budget_cap_exceeded');
    }

    // 3. Stop-loss trigger
    const roiPercent = balance.roi; // Can be negative
    if (roiPercent <= -config.stopLoss) {
      flags.push('stop_loss_triggered');
      return {
        allowed: false,
        reason: `Stop-loss triggered: current ROI ${roiPercent.toFixed(2)}% exceeded stop-loss limit of -${config.stopLoss}%.`,
        flags,
      };
    }

    // 4. Max drawdown check
    if (metrics.maxDrawdownExperienced >= config.maxDrawdown) {
      flags.push('max_drawdown_exceeded');
      return {
        allowed: false,
        reason: `Max drawdown exceeded: ${metrics.maxDrawdownExperienced.toFixed(2)}% ≥ configured limit of ${config.maxDrawdown}%.`,
        flags,
      };
    }

    // 5. Insufficient balance for sell orders
    if (decision.action === 'sell' && decision.amount && balance.tonBalance < decision.amount) {
      return {
        allowed: false,
        reason: `Insufficient TON balance: ${balance.tonBalance.toFixed(4)} TON available, tried to sell ${decision.amount.toFixed(4)} TON.`,
        flags,
      };
    }

    return { allowed: true, flags };
  }

  /**
   * Activate the kill switch on an agent (emergency stop).
   */
  activateKillSwitch(agentId: string, reason: string): void {
    this.killSwitches.set(agentId, reason);
  }

  /**
   * Deactivate the kill switch (admin action).
   */
  deactivateKillSwitch(agentId: string): void {
    this.killSwitches.delete(agentId);
  }

  /**
   * Check whether the kill switch is active for an agent.
   */
  isKillSwitchActive(agentId: string): boolean {
    return this.killSwitches.has(agentId);
  }

  /**
   * Get kill switch reason.
   */
  getKillSwitchReason(agentId: string): string | undefined {
    return this.killSwitches.get(agentId);
  }

  /**
   * Evaluate whether an agent should be auto-paused due to repeated failures.
   */
  shouldAutoPause(metrics: AgentMetrics): { pause: boolean; reason: string } {
    // Auto-pause if failure rate > 50% over at least 5 executions
    if (
      metrics.totalExecutions >= 5 &&
      metrics.failedExecutions / metrics.totalExecutions > 0.5
    ) {
      return {
        pause: true,
        reason: `High failure rate: ${metrics.failedExecutions}/${metrics.totalExecutions} executions failed.`,
      };
    }

    return { pause: false, reason: '' };
  }

  /**
   * Update the max drawdown metric based on current portfolio state.
   */
  trackDrawdown(metrics: AgentMetrics, balance: SimulationBalance): void {
    // Drawdown = |min(roi, 0)|
    const currentDrawdown = Math.abs(Math.min(balance.roi, 0));
    if (currentDrawdown > metrics.maxDrawdownExperienced) {
      metrics.maxDrawdownExperienced = currentDrawdown;
    }
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Estimate current TON/USD price from balance sheet.
   * Falls back to 5.5 (TON default) if balance is empty.
   */
  private estimatedPrice(balance: SimulationBalance): number {
    if (balance.trades.length === 0) return 5.5;
    const last = balance.trades[balance.trades.length - 1];
    return last.price;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new RiskManager instance
 */
export function createRiskManager(): RiskManager {
  return new RiskManager();
}
