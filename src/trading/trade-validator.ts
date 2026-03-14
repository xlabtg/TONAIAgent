/**
 * TONAIAgent - Trade Validator
 *
 * Risk controls for on-chain trading. Validates trade signals and swap quotes
 * against configurable limits before allowing execution:
 * - Max slippage (1% default)
 * - Max position size (20% default)
 * - Minimum DEX liquidity
 * - Maximum price impact
 * - Allowed trading pairs whitelist
 *
 * @see Issue #235 — On-Chain Trading Integration (TON DEX Execution)
 */

import type {
  OnChainTradeSignal,
  SwapQuote,
  TradingRiskConfig,
  TradeValidationResult,
  TradeValidationCheck,
} from './types';
import { DEFAULT_RISK_CONFIG } from './types';

// ============================================================================
// Trade Validator
// ============================================================================

/**
 * TradeValidator — validates trade signals and swap quotes against risk limits.
 *
 * @example
 * ```typescript
 * const validator = createTradeValidator({
 *   maxSlippagePercent: 1.0,
 *   maxPositionPercent: 20.0,
 *   allowedPairs: ['TON/USDT', 'TON/USDC'],
 * });
 *
 * const result = validator.validateSignal(signal);
 * if (!result.valid) {
 *   console.log('Trade rejected:', result.rejectionReason);
 * }
 *
 * const quoteResult = validator.validateQuote(quote);
 * ```
 */
export class TradeValidator {
  private readonly config: TradingRiskConfig;

  constructor(config: Partial<TradingRiskConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  /**
   * Returns the current risk configuration.
   */
  getConfig(): TradingRiskConfig {
    return { ...this.config };
  }

  /**
   * Validates a trade signal from the strategy engine.
   * Checks pair whitelist and basic signal validity.
   */
  validateSignal(signal: OnChainTradeSignal): TradeValidationResult {
    const checks: TradeValidationCheck[] = [];

    // Check 1: Valid action
    const validAction = signal.action === 'BUY' || signal.action === 'SELL';
    checks.push({
      name: 'valid_action',
      passed: validAction,
      message: validAction
        ? `Action '${signal.action}' is valid`
        : `Invalid action '${signal.action}': must be BUY or SELL`,
    });

    // Check 2: Valid amount
    const amount = parseFloat(signal.amount);
    const validAmount = !isNaN(amount) && amount > 0;
    checks.push({
      name: 'valid_amount',
      passed: validAmount,
      message: validAmount
        ? `Amount ${signal.amount} is valid`
        : `Invalid amount '${signal.amount}': must be a positive number`,
    });

    // Check 3: Valid pair format
    const pairParts = signal.pair.split('/');
    const validPair = pairParts.length === 2 && pairParts[0].length > 0 && pairParts[1].length > 0;
    checks.push({
      name: 'valid_pair_format',
      passed: validPair,
      message: validPair
        ? `Pair '${signal.pair}' has valid format`
        : `Invalid pair format '${signal.pair}': expected 'BASE/QUOTE' (e.g., 'TON/USDT')`,
    });

    // Check 4: Pair whitelist (if configured)
    const pairAllowed =
      this.config.allowedPairs.length === 0 ||
      this.config.allowedPairs.includes(signal.pair);
    checks.push({
      name: 'pair_allowed',
      passed: pairAllowed,
      message: pairAllowed
        ? `Pair '${signal.pair}' is allowed`
        : `Pair '${signal.pair}' is not in the allowed pairs list: [${this.config.allowedPairs.join(', ')}]`,
    });

    // Check 5: Agent ID present
    const hasAgentId = typeof signal.agentId === 'string' && signal.agentId.length > 0;
    checks.push({
      name: 'agent_id_present',
      passed: hasAgentId,
      message: hasAgentId
        ? `Agent ID '${signal.agentId}' is present`
        : 'Agent ID is missing or empty',
    });

    const failedCheck = checks.find(c => !c.passed);
    return {
      valid: !failedCheck,
      rejectionReason: failedCheck?.message,
      checks,
    };
  }

  /**
   * Validates a swap quote against risk controls.
   * Checks slippage, liquidity, and price impact.
   */
  validateQuote(quote: SwapQuote): TradeValidationResult {
    const checks: TradeValidationCheck[] = [];

    // Check 1: Slippage within limit
    const slippagePct = this.calculateSlippage(quote);
    const slippageOk = slippagePct <= this.config.maxSlippagePercent;
    checks.push({
      name: 'slippage_within_limit',
      passed: slippageOk,
      message: slippageOk
        ? `Slippage ${slippagePct.toFixed(3)}% is within limit of ${this.config.maxSlippagePercent}%`
        : `Slippage ${slippagePct.toFixed(3)}% exceeds maximum of ${this.config.maxSlippagePercent}%`,
    });

    // Check 2: Sufficient liquidity
    const liquidityOk = quote.liquidityUsd >= this.config.minLiquidityUsd;
    checks.push({
      name: 'sufficient_liquidity',
      passed: liquidityOk,
      message: liquidityOk
        ? `Liquidity $${quote.liquidityUsd.toFixed(2)} meets minimum $${this.config.minLiquidityUsd}`
        : `Liquidity $${quote.liquidityUsd.toFixed(2)} is below minimum $${this.config.minLiquidityUsd}`,
    });

    // Check 3: Price impact within limit
    const impactOk = quote.priceImpactPercent <= this.config.maxPriceImpactPercent;
    checks.push({
      name: 'price_impact_within_limit',
      passed: impactOk,
      message: impactOk
        ? `Price impact ${quote.priceImpactPercent.toFixed(3)}% is within limit of ${this.config.maxPriceImpactPercent}%`
        : `Price impact ${quote.priceImpactPercent.toFixed(3)}% exceeds maximum of ${this.config.maxPriceImpactPercent}%`,
    });

    // Check 4: Quote is not expired (older than 60s is stale)
    const ageSeconds = (Date.now() / 1000) - quote.timestamp;
    const notExpired = ageSeconds <= 60;
    checks.push({
      name: 'quote_not_expired',
      passed: notExpired,
      message: notExpired
        ? `Quote age ${ageSeconds.toFixed(1)}s is within 60s freshness window`
        : `Quote expired (age: ${ageSeconds.toFixed(1)}s, limit: 60s)`,
    });

    // Check 5: Expected output is positive
    const expectedOut = parseFloat(quote.expectedAmountOut);
    const positiveOutput = !isNaN(expectedOut) && expectedOut > 0;
    checks.push({
      name: 'positive_expected_output',
      passed: positiveOutput,
      message: positiveOutput
        ? `Expected output ${quote.expectedAmountOut} is positive`
        : `Expected output '${quote.expectedAmountOut}' is not a positive number`,
    });

    const failedCheck = checks.find(c => !c.passed);
    return {
      valid: !failedCheck,
      rejectionReason: failedCheck?.message,
      checks,
    };
  }

  /**
   * Validates that a trade amount does not exceed the position limit
   * relative to the portfolio value.
   *
   * @param tradeValueUsd - Value of the trade in USD
   * @param portfolioValueUsd - Total portfolio value in USD
   */
  validatePositionSize(tradeValueUsd: number, portfolioValueUsd: number): TradeValidationResult {
    const checks: TradeValidationCheck[] = [];

    if (portfolioValueUsd <= 0) {
      checks.push({
        name: 'portfolio_value_positive',
        passed: false,
        message: 'Portfolio value must be greater than zero for position size check',
      });
      return { valid: false, rejectionReason: checks[0].message, checks };
    }

    const positionPct = (tradeValueUsd / portfolioValueUsd) * 100;
    const withinLimit = positionPct <= this.config.maxPositionPercent;
    checks.push({
      name: 'position_size_within_limit',
      passed: withinLimit,
      message: withinLimit
        ? `Position size ${positionPct.toFixed(2)}% is within limit of ${this.config.maxPositionPercent}%`
        : `Position size ${positionPct.toFixed(2)}% exceeds maximum of ${this.config.maxPositionPercent}% of portfolio ($${portfolioValueUsd.toFixed(2)})`,
    });

    const failedCheck = checks.find(c => !c.passed);
    return {
      valid: !failedCheck,
      rejectionReason: failedCheck?.message,
      checks,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Calculates the effective slippage from a quote.
   * Slippage = (executionPrice - marketPrice) / marketPrice * 100
   * Approximated as (amountIn / expectedAmountOut) vs (amountIn / minimumAmountOut)
   */
  private calculateSlippage(quote: SwapQuote): number {
    const expected = parseFloat(quote.expectedAmountOut);
    const minimum = parseFloat(quote.minimumAmountOut);

    if (expected <= 0) return 100;
    if (minimum >= expected) return 0;

    return ((expected - minimum) / expected) * 100;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TradeValidator with optional risk config overrides.
 *
 * @example
 * ```typescript
 * const validator = createTradeValidator({
 *   maxSlippagePercent: 0.5,
 *   allowedPairs: ['TON/USDT'],
 *   testnetMode: true,
 * });
 * ```
 */
export function createTradeValidator(config?: Partial<TradingRiskConfig>): TradeValidator {
  return new TradeValidator(config);
}
