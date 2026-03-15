/**
 * TONAIAgent - Demo Agent Strategy Implementations
 *
 * Four demo strategies as specified in Issue #83:
 *   1. DCA (Dollar-Cost Averaging)
 *   2. Yield Simulation
 *   3. Grid Strategy (Simplified)
 *   4. Arbitrage (Simulation Mode Only)
 *
 * All strategies return an AgentDecision for the execution engine to act on.
 */

import type { AgentConfig, AgentDecision, MarketData, SimulationBalance, DemoStrategyType } from './types';

// ============================================================================
// Strategy Interface
// ============================================================================

/**
 * Shared strategy context passed to each strategy
 */
export interface StrategyContext {
  config: AgentConfig;
  market: MarketData;
  balance: SimulationBalance;
  executionCount: number;
}

/**
 * Strategy function signature — pure, deterministic (minus AI reasoning)
 */
export type StrategyFn = (ctx: StrategyContext) => AgentDecision;

// ============================================================================
// 1. DCA Strategy — Dollar-Cost Averaging
// ============================================================================

/**
 * Dollar-Cost Averaging strategy.
 *
 * Buys a fixed amount of TON at each execution interval regardless of price,
 * averaging the entry cost over time. Ideal for low-risk, passive investors.
 */
export function dcaStrategy(ctx: StrategyContext): AgentDecision {
  const { config, market, balance } = ctx;

  // Determine amount to deploy per interval based on budget and risk
  const riskMultiplier = { low: 0.05, medium: 0.1, high: 0.2 }[config.riskLevel];
  const buyAmountTon = config.budget * riskMultiplier;

  // Stop buying if we've exhausted the TON budget (already deployed it all)
  if (balance.tonBalance < buyAmountTon) {
    return {
      action: 'hold',
      symbol: market.symbol,
      reasoning: `DCA: insufficient TON balance (${balance.tonBalance.toFixed(4)} TON). Budget fully deployed. Holding current position.`,
      confidence: 0.95,
      decidedAt: new Date(),
    };
  }

  return {
    action: 'buy',
    symbol: market.symbol,
    amount: buyAmountTon,
    reasoning: `DCA: deploying ${buyAmountTon.toFixed(4)} ${market.symbol} at $${market.price.toFixed(2)} to average cost over time.`,
    confidence: 0.9,
    decidedAt: new Date(),
  };
}

// ============================================================================
// 2. Yield Simulation Strategy
// ============================================================================

/**
 * Yield simulation strategy.
 *
 * Simulates depositing TON into a liquidity pool/staking protocol and
 * periodically compounding yield. No actual on-chain transactions in simulation mode.
 */
export function yieldStrategy(ctx: StrategyContext): AgentDecision {
  const { config, market, balance, executionCount } = ctx;

  // Yield APY simulation: 8-25% depending on risk level
  const baseApyByRisk = { low: 0.08, medium: 0.14, high: 0.25 }[config.riskLevel];

  // Add some market-driven variation
  const marketBoost = market.liquidity * 0.05;
  const effectiveApy = baseApyByRisk + marketBoost;

  // Compound yield per execution interval (fraction of yearly APY)
  const intervalsPerYear = (365 * 24 * 60 * 60 * 1000) / config.executionIntervalMs;
  const yieldPerInterval = effectiveApy / intervalsPerYear;
  const yieldAmount = balance.tonBalance * yieldPerInterval;

  // First execution: "deposit" full balance
  if (executionCount === 0) {
    return {
      action: 'buy',
      symbol: market.symbol,
      amount: balance.tonBalance * 0.95, // Keep 5% liquid
      reasoning: `Yield: depositing ${(balance.tonBalance * 0.95).toFixed(4)} ${market.symbol} into simulated staking pool at ${(effectiveApy * 100).toFixed(1)}% APY.`,
      confidence: 0.92,
      decidedAt: new Date(),
    };
  }

  // Subsequent executions: compound yield
  if (yieldAmount > 0.001) {
    return {
      action: 'buy',
      symbol: market.symbol,
      amount: yieldAmount,
      reasoning: `Yield: compounding ${yieldAmount.toFixed(6)} ${market.symbol} yield at ${(effectiveApy * 100).toFixed(1)}% APY (interval yield).`,
      confidence: 0.88,
      decidedAt: new Date(),
    };
  }

  return {
    action: 'hold',
    symbol: market.symbol,
    reasoning: `Yield: holding deposited position. Accumulated yield too small to compound (${yieldAmount.toFixed(8)} ${market.symbol}).`,
    confidence: 0.85,
    decidedAt: new Date(),
  };
}

// ============================================================================
// 3. Grid Strategy (Simplified)
// ============================================================================

/**
 * Grid strategy state (persisted between calls via closure or injected)
 */
export interface GridState {
  /** Base price when grid was set up */
  basePrice: number;
  /** Grid spacing percentage */
  gridSpacing: number;
  /** Number of grid levels above and below */
  gridLevels: number;
  /** Current grid position (0 = at base) */
  gridPosition: number;
}

/** Default grid spacing by risk level */
const GRID_SPACING_BY_RISK = { low: 0.02, medium: 0.05, high: 0.10 };

/**
 * Simplified Grid strategy.
 *
 * Sets a price grid around an initial base price and automatically buys
 * when price drops to a lower grid level and sells when it rises.
 */
export function gridStrategy(ctx: StrategyContext, state?: GridState): { decision: AgentDecision; newState: GridState } {
  const { config, market, balance } = ctx;

  const gridSpacing = GRID_SPACING_BY_RISK[config.riskLevel];
  const gridLevels = 5;

  // Initialize or restore grid state
  const currentState: GridState = state ?? {
    basePrice: market.price,
    gridSpacing,
    gridLevels,
    gridPosition: 0,
  };

  const basePrice = currentState.basePrice;
  const spacing = currentState.gridSpacing;

  // Determine which grid level the current price is at
  const priceChange = (market.price - basePrice) / basePrice;
  const targetGridPosition = Math.round(priceChange / spacing);
  const clampedPosition = Math.max(-gridLevels, Math.min(gridLevels, targetGridPosition));

  const positionDiff = clampedPosition - currentState.gridPosition;

  // Calculate trade size per grid level
  const tradeSizeTon = (config.budget * 0.1) / market.price; // 10% of budget per level

  let decision: AgentDecision;

  if (positionDiff < 0 && balance.usdBalance > tradeSizeTon * market.price) {
    // Price dropped — buy
    const buyAmount = Math.abs(positionDiff) * tradeSizeTon;
    decision = {
      action: 'buy',
      symbol: market.symbol,
      amount: buyAmount,
      reasoning: `Grid: price dropped ${(priceChange * 100).toFixed(1)}% to level ${clampedPosition}. Buying ${buyAmount.toFixed(4)} ${market.symbol} at grid low.`,
      confidence: 0.82,
      decidedAt: new Date(),
    };
  } else if (positionDiff > 0 && balance.tonBalance > tradeSizeTon) {
    // Price rose — sell
    const sellAmount = Math.abs(positionDiff) * tradeSizeTon;
    decision = {
      action: 'sell',
      symbol: market.symbol,
      amount: sellAmount,
      reasoning: `Grid: price rose ${(priceChange * 100).toFixed(1)}% to level ${clampedPosition}. Selling ${sellAmount.toFixed(4)} ${market.symbol} at grid high.`,
      confidence: 0.82,
      decidedAt: new Date(),
    };
  } else {
    decision = {
      action: 'hold',
      symbol: market.symbol,
      reasoning: `Grid: price within level ${clampedPosition} (${(priceChange * 100).toFixed(2)}% from base). No grid trigger.`,
      confidence: 0.78,
      decidedAt: new Date(),
    };
  }

  const newState: GridState = {
    ...currentState,
    gridPosition: clampedPosition,
  };

  return { decision, newState };
}

// ============================================================================
// 4. Arbitrage Strategy (Simulation Mode Only)
// ============================================================================

/**
 * Arbitrage strategy.
 *
 * Simulates cross-DEX arbitrage opportunities on TON. In simulation mode only —
 * never executes real transactions. Looks for spread between bid/ask
 * as a proxy for inter-DEX price discrepancy.
 */
export function arbitrageStrategy(ctx: StrategyContext): AgentDecision {
  const { config, market, balance } = ctx;

  // Simulate a secondary market price with a random spread
  const spreadMultiplier = 1 + (Math.random() * 0.02 - 0.005); // ±1% around base
  const secondaryPrice = market.price * spreadMultiplier;
  const priceDiff = secondaryPrice - market.price;
  const spreadPercent = Math.abs(priceDiff) / market.price;

  // Minimum spread threshold to make arbitrage profitable after fees
  const minSpreadThreshold = { low: 0.008, medium: 0.005, high: 0.003 }[config.riskLevel];

  if (spreadPercent < minSpreadThreshold) {
    return {
      action: 'hold',
      symbol: market.symbol,
      reasoning: `Arbitrage: spread ${(spreadPercent * 100).toFixed(3)}% is below threshold ${(minSpreadThreshold * 100).toFixed(3)}%. No profitable opportunity.`,
      confidence: 0.75,
      decidedAt: new Date(),
    };
  }

  // Determine trade direction (buy cheap, sell expensive)
  const isOpportunity = secondaryPrice > market.price; // primary cheaper
  const tradeAmountTon = Math.min(
    balance.tonBalance * 0.5,
    config.budget * 0.25 / market.price,
  );

  if (tradeAmountTon < 0.01) {
    return {
      action: 'hold',
      symbol: market.symbol,
      reasoning: 'Arbitrage: insufficient TON balance to execute arbitrage trade.',
      confidence: 0.7,
      decidedAt: new Date(),
    };
  }

  const expectedProfitUsd = tradeAmountTon * market.price * spreadPercent * 0.7; // 70% capture after slippage

  if (isOpportunity) {
    return {
      action: 'buy',
      symbol: market.symbol,
      amount: tradeAmountTon,
      reasoning: `Arbitrage [SIM]: ${(spreadPercent * 100).toFixed(3)}% spread detected. Buying ${tradeAmountTon.toFixed(4)} ${market.symbol} on primary market (cheaper). Expected profit: $${expectedProfitUsd.toFixed(4)}.`,
      confidence: 0.7 + spreadPercent * 5,
      decidedAt: new Date(),
    };
  } else {
    return {
      action: 'sell',
      symbol: market.symbol,
      amount: tradeAmountTon,
      reasoning: `Arbitrage [SIM]: ${(spreadPercent * 100).toFixed(3)}% spread detected. Selling ${tradeAmountTon.toFixed(4)} ${market.symbol} on primary market (more expensive). Expected profit: $${expectedProfitUsd.toFixed(4)}.`,
      confidence: 0.7 + spreadPercent * 5,
      decidedAt: new Date(),
    };
  }
}

// ============================================================================
// Strategy Registry
// ============================================================================

/**
 * Get the strategy function for a given strategy type
 */
export function getStrategy(type: DemoStrategyType): StrategyFn {
  switch (type) {
    case 'dca':
      return dcaStrategy;
    case 'yield':
      return yieldStrategy;
    case 'grid':
      // Grid strategy wraps to match the StrategyFn signature (state managed externally)
      return (ctx: StrategyContext) => gridStrategy(ctx).decision;
    case 'arbitrage':
      return arbitrageStrategy;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown strategy type: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Strategy metadata for display
 */
export const STRATEGY_METADATA: Record<DemoStrategyType, {
  name: string;
  description: string;
  riskProfile: string;
  minBudget: number;
}> = {
  dca: {
    name: 'Dollar-Cost Averaging',
    description: 'Periodically buys a fixed amount of TON to average entry price over time.',
    riskProfile: 'Conservative — suitable for all risk levels',
    minBudget: 10,
  },
  yield: {
    name: 'Yield Simulation',
    description: 'Simulates staking TON in a liquidity pool and compounds yield over time.',
    riskProfile: 'Moderate — requires stable market conditions',
    minBudget: 50,
  },
  grid: {
    name: 'Grid Strategy',
    description: 'Places buy/sell orders at fixed price intervals to profit from volatility.',
    riskProfile: 'Moderate to High — works best in ranging markets',
    minBudget: 100,
  },
  arbitrage: {
    name: 'Cross-DEX Arbitrage (Simulation)',
    description: 'Exploits price discrepancies between DEXes. Simulation mode only.',
    riskProfile: 'High — time-sensitive, requires fast execution',
    minBudget: 200,
  },
};
