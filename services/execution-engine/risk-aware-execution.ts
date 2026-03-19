/**
 * TONAIAgent — Risk-Aware Execution Engine
 * Issue #269: Risk Engine Hardening & Capital Protection Layer
 *
 * Wraps the SmartExecutionEngine with a risk gate:
 *   Decision → RiskControlService.evaluate() → SmartExecutionEngine
 *
 * Every execution attempt is evaluated against capital protection rules
 * before being forwarded to the smart execution layer. Rejections are
 * returned with a structured risk reason code and rich metadata.
 *
 * Response shape:
 *   Success: { approved: true, executionResult: SmartExecutionResult, currentDrawdown, riskScore }
 *   Risk rejection: { approved: false, reason: RiskFailureReason, message, currentDrawdown, riskScore }
 *   Execution failure: { approved: true, executionResult: { success: false, ... }, currentDrawdown, riskScore }
 */

import {
  DefaultSmartExecutionEngine,
  createSmartExecutionEngine,
} from './smart-execution';

import type {
  SmartExecutionRequest,
  SmartExecutionResult,
  SmartExecutionEngineConfig,
} from './smart-execution';

import {
  DefaultRiskControlService,
  createRiskControlService,
} from '../risk-control/index';

import type {
  RiskConfig,
  RiskEvaluationRequest,
  PortfolioContext,
  RiskFailureReason,
} from '../risk-control/index';

// ============================================================================
// Risk-Aware Execution Request / Result
// ============================================================================

/**
 * Extends SmartExecutionRequest with portfolio context required for risk evaluation.
 */
export interface RiskAwareExecutionRequest extends SmartExecutionRequest {
  /** Portfolio context for risk evaluation */
  portfolio: PortfolioContext;
  /** Position size as percent of portfolio for risk evaluation */
  positionSizePercent: number;
  /** Slippage in bps for risk evaluation (uses executionSlippage or slippageConfig) */
  slippageBps?: number;
}

/**
 * Result of a risk-aware execution attempt.
 *
 * When `approved: false`, the trade was blocked at the risk layer and
 * `executionResult` is not present.
 *
 * When `approved: true`, the trade was allowed through the risk gate and
 * `executionResult` contains the result from the smart execution engine.
 */
export type RiskAwareExecutionResult =
  | {
      approved: true;
      executionResult: SmartExecutionResult;
      currentDrawdown: number;
      riskScore: number;
    }
  | {
      approved: false;
      reason: RiskFailureReason;
      message: string;
      currentDrawdown: number;
      riskScore: number;
      executionResult?: never;
    };

// ============================================================================
// Risk-Aware Execution Engine Interface
// ============================================================================

export interface RiskAwareExecutionEngine {
  /**
   * Execute a smart order with prior risk gate check.
   * Returns risk rejection or execution result.
   */
  execute(request: RiskAwareExecutionRequest): Promise<RiskAwareExecutionResult>;

  /** Access the underlying smart execution engine. */
  readonly smartEngine: DefaultSmartExecutionEngine;

  /** Access the risk control service. */
  readonly riskControl: DefaultRiskControlService;
}

// ============================================================================
// Default Risk-Aware Execution Engine Implementation
// ============================================================================

export class DefaultRiskAwareExecutionEngine implements RiskAwareExecutionEngine {
  readonly smartEngine: DefaultSmartExecutionEngine;
  readonly riskControl: DefaultRiskControlService;

  constructor(
    executionConfig?: Partial<SmartExecutionEngineConfig>,
    riskConfig?: Partial<RiskConfig>
  ) {
    this.smartEngine = createSmartExecutionEngine(executionConfig);
    this.riskControl = createRiskControlService(riskConfig);
  }

  /**
   * Execution pipeline:
   *   1. Build risk evaluation request from trade + portfolio context
   *   2. Evaluate against RiskControlService
   *   3. If blocked → return risk rejection result
   *   4. If allowed → forward to SmartExecutionEngine
   *   5. Record execution in risk control (for frequency tracking)
   *   6. Return unified result with risk metadata
   */
  async execute(request: RiskAwareExecutionRequest): Promise<RiskAwareExecutionResult> {
    // Step 1: Build risk evaluation request
    const riskRequest: RiskEvaluationRequest = {
      requestId: `risk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      agentId: request.agentId ?? 'unknown',
      action: request.action,
      pair: request.pair,
      positionSizePercent: request.positionSizePercent,
      amountUsd: parseFloat(request.amount),
      slippageBps: request.slippageBps,
    };

    // Step 2: Risk gate
    const riskResult = this.riskControl.evaluate(
      riskRequest,
      request.portfolio
    );

    // Step 3: Blocked by risk
    if (!riskResult.allowed) {
      return {
        approved: false,
        reason: riskResult.reason,
        message: riskResult.message,
        currentDrawdown: riskResult.currentDrawdown,
        riskScore: riskResult.riskScore,
      };
    }

    // Step 4: Forward to smart execution
    const executionResult = await this.smartEngine.execute(request);

    // Step 5: Record execution for frequency tracking
    if (executionResult.success) {
      this.riskControl.recordExecution(riskRequest.agentId);
    }

    // Step 6: Return unified result
    return {
      approved: true,
      executionResult,
      currentDrawdown: riskResult.currentDrawdown,
      riskScore: riskResult.riskScore,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a risk-aware execution engine.
 *
 * @example
 * ```typescript
 * import { createRiskAwareExecutionEngine } from '@tonaiagent/services/execution-engine';
 *
 * const engine = createRiskAwareExecutionEngine(
 *   { simulationMode: true },
 *   { maxDrawdownPercent: 15, maxDailyLossUsd: 500 }
 * );
 *
 * const result = await engine.execute({
 *   pair: 'TON/USDT',
 *   action: 'BUY',
 *   amount: '100',
 *   positionSizePercent: 3,
 *   portfolio: {
 *     totalValueUsd: 10000,
 *     currentDrawdownPercent: 5,
 *     currentExposurePercent: 40,
 *     dailyLossUsd: 50,
 *     peakValueUsd: 10500,
 *   },
 * });
 *
 * if (!result.approved) {
 *   console.log('Blocked:', result.reason);  // e.g. 'RISK_MAX_DRAWDOWN'
 * } else {
 *   console.log('Executed:', result.executionResult.success);
 * }
 * ```
 */
export function createRiskAwareExecutionEngine(
  executionConfig?: Partial<SmartExecutionEngineConfig>,
  riskConfig?: Partial<RiskConfig>
): DefaultRiskAwareExecutionEngine {
  return new DefaultRiskAwareExecutionEngine(executionConfig, riskConfig);
}

export default DefaultRiskAwareExecutionEngine;
