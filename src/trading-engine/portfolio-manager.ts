/**
 * TONAIAgent - Portfolio Manager
 *
 * Manages per-agent portfolio balances in memory.
 * Tracks holdings across multiple asset types and provides
 * balance query and update operations for the Trade Executor.
 */

import type {
  Portfolio,
  PortfolioBalance,
  PortfolioManagerInterface,
  TradingEngineEventHandler,
  TradingEngineUnsubscribe,
  TradingEngineEvent,
  TradingEngineEventType,
} from './types';
import { TradingEngineError } from './types';

// ============================================================================
// Default Initial Portfolio
// ============================================================================

/**
 * Default starting balances for a new agent portfolio.
 * Agents start with USD and zero crypto holdings.
 */
export const DEFAULT_INITIAL_BALANCES: PortfolioBalance = {
  USD: 10000,
  BTC: 0,
  ETH: 0,
  TON: 0,
  SOL: 0,
  USDT: 0,
};

// ============================================================================
// Portfolio Manager Implementation
// ============================================================================

/**
 * DefaultPortfolioManager manages per-agent portfolios in memory.
 *
 * Each agent has an isolated portfolio keyed by agentId.
 * Supports initializing new portfolios, reading balances, and applying deltas.
 *
 * @example
 * ```typescript
 * const manager = createPortfolioManager();
 *
 * // Initialize a portfolio for an agent
 * manager.initPortfolio('agent-001', { USD: 10000, BTC: 0 });
 *
 * // Update balance after a BUY
 * manager.updateBalance('agent-001', 'USD', -650);   // spent USD
 * manager.updateBalance('agent-001', 'BTC', 0.01);   // received BTC
 *
 * // Read portfolio
 * const portfolio = manager.getPortfolio('agent-001');
 * console.log(portfolio.balances); // { USD: 9350, BTC: 0.01 }
 * ```
 */
export class DefaultPortfolioManager implements PortfolioManagerInterface {
  private readonly portfolios = new Map<string, Portfolio>();
  private readonly eventHandlers = new Set<TradingEngineEventHandler>();

  // ============================================================================
  // Portfolio Lifecycle
  // ============================================================================

  /**
   * Initialize a portfolio for an agent with the given starting balances.
   * If the agent already has a portfolio, it is returned unchanged.
   *
   * @param agentId - Unique agent identifier
   * @param initialBalances - Starting asset balances
   * @returns The portfolio (newly created or existing)
   */
  initPortfolio(agentId: string, initialBalances: PortfolioBalance = DEFAULT_INITIAL_BALANCES): Portfolio {
    if (this.portfolios.has(agentId)) {
      return this.portfolios.get(agentId)!;
    }

    const portfolio: Portfolio = {
      agentId,
      balances: { ...initialBalances },
      updatedAt: new Date(),
    };

    this.portfolios.set(agentId, portfolio);
    this.emitEvent('portfolio.created', agentId, undefined, { agentId, initialBalances });
    return portfolio;
  }

  /**
   * Get the portfolio for an agent.
   * Throws if the agent has not been initialized.
   *
   * @param agentId - Unique agent identifier
   */
  getPortfolio(agentId: string): Portfolio {
    const portfolio = this.portfolios.get(agentId);
    if (!portfolio) {
      throw new TradingEngineError(
        `Portfolio not found for agent '${agentId}'. Call initPortfolio() first.`,
        'PORTFOLIO_NOT_FOUND',
        { agentId }
      );
    }
    return portfolio;
  }

  /**
   * Check whether an agent has an initialized portfolio.
   */
  hasPortfolio(agentId: string): boolean {
    return this.portfolios.has(agentId);
  }

  // ============================================================================
  // Balance Operations
  // ============================================================================

  /**
   * Apply a delta to an asset balance.
   * Positive delta = increase (e.g. received asset).
   * Negative delta = decrease (e.g. spent asset).
   *
   * After the update, balances are rounded to 8 decimal places to avoid
   * floating-point accumulation errors.
   *
   * @param agentId - Unique agent identifier
   * @param asset - Asset symbol (e.g. "BTC", "USD")
   * @param delta - Amount to add (positive) or subtract (negative)
   */
  updateBalance(agentId: string, asset: string, delta: number): void {
    const portfolio = this.getPortfolio(agentId);
    const current = portfolio.balances[asset] ?? 0;
    const updated = Math.round((current + delta) * 1e8) / 1e8;
    portfolio.balances[asset] = updated;
    portfolio.updatedAt = new Date();

    this.emitEvent('portfolio.updated', agentId, asset, {
      agentId,
      asset,
      delta,
      previous: current,
      current: updated,
    });
  }

  /**
   * Get the balance of a specific asset for an agent.
   * Returns 0 if the agent has no balance in that asset.
   *
   * @param agentId - Unique agent identifier
   * @param asset - Asset symbol
   */
  getBalance(agentId: string, asset: string): number {
    const portfolio = this.getPortfolio(agentId);
    return portfolio.balances[asset] ?? 0;
  }

  /**
   * Snapshot the current balances as a plain object (copy).
   * Useful for recording balanceBefore/balanceAfter in trades.
   */
  snapshotBalances(agentId: string): PortfolioBalance {
    const portfolio = this.getPortfolio(agentId);
    return { ...portfolio.balances };
  }

  /**
   * List all initialized agent IDs.
   */
  listAgentIds(): string[] {
    return Array.from(this.portfolios.keys());
  }

  // ============================================================================
  // Events
  // ============================================================================

  /** Subscribe to portfolio events */
  subscribe(handler: TradingEngineEventHandler): TradingEngineUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private emitEvent(
    type: TradingEngineEventType,
    agentId: string | undefined,
    asset: string | undefined,
    data: Record<string, unknown>
  ): void {
    const event: TradingEngineEvent = {
      id: this.generateId('evt'),
      type,
      timestamp: new Date(),
      agentId,
      asset,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Portfolio Manager instance.
 *
 * @example
 * ```typescript
 * const manager = createPortfolioManager();
 * manager.initPortfolio('agent-001', { USD: 10000, BTC: 0 });
 * ```
 */
export function createPortfolioManager(): DefaultPortfolioManager {
  return new DefaultPortfolioManager();
}
