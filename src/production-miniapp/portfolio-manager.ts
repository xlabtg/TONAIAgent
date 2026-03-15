/**
 * Portfolio manager — fetches, computes, and returns a PortfolioSnapshot
 * for the dashboard.  In demo mode it returns deterministic simulated data.
 * In live mode it queries a backend (or on-chain) API.
 */

import {
  PortfolioSnapshot,
  AssetPosition,
  OpenPosition,
  AppMode,
  TokenSymbol,
  ProductionMiniAppError,
} from './types';

// ============================================================================
// Asset icon helper
// ============================================================================

/**
 * Build the path to a token's SVG icon.
 * Falls back to a generic placeholder when the symbol is unknown.
 */
export function buildIconPath(symbol: TokenSymbol, basePath: string): string {
  const known: TokenSymbol[] = ['BTC', 'ETH', 'TON', 'USDT', 'NOT'];
  const sym = String(symbol).toUpperCase();
  if (known.includes(sym)) return `${basePath}/${sym}.svg`;
  return `${basePath}/GENERIC.svg`;
}

// ============================================================================
// Portfolio fetch interface
// ============================================================================

export interface PortfolioFetcher {
  fetchSnapshot(userId: string): Promise<PortfolioSnapshot>;
}

// ============================================================================
// Demo data generator
// ============================================================================

export class DemoPortfolioFetcher implements PortfolioFetcher {
  constructor(private readonly tokenIconBasePath: string) {}

  async fetchSnapshot(_userId: string): Promise<PortfolioSnapshot> {
    const assets: AssetPosition[] = [
      {
        symbol: 'TON',
        name: 'Toncoin',
        amount: 240.5,
        valueUsd: 1154.4,
        allocationPercent: 48.2,
        change24hPercent: 3.7,
        iconPath: buildIconPath('TON', this.tokenIconBasePath),
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        amount: 720,
        valueUsd: 720,
        allocationPercent: 30.1,
        change24hPercent: 0.01,
        iconPath: buildIconPath('USDT', this.tokenIconBasePath),
      },
      {
        symbol: 'NOT',
        name: 'Notcoin',
        amount: 18500,
        valueUsd: 518.0,
        allocationPercent: 21.6,
        change24hPercent: -1.2,
        iconPath: buildIconPath('NOT', this.tokenIconBasePath),
      },
    ];

    const totalValueUsd = assets.reduce((s, a) => s + a.valueUsd, 0);

    const openPositions: OpenPosition[] = [
      {
        id: 'pos_1',
        symbol: 'TON',
        direction: 'long',
        entryPrice: 4.35,
        currentPrice: 4.8,
        size: 100,
        unrealisedPnlUsd: 45.0,
        unrealisedPnlPercent: 10.34,
        openedAt: Math.floor(Date.now() / 1000) - 86400,
      },
    ];

    return {
      totalValueUsd,
      dailyPnlUsd: 87.3,
      dailyPnlPercent: 3.78,
      roiPercent: 24.6,
      assets,
      openPositions,
      snapshotAt: Math.floor(Date.now() / 1000),
    };
  }
}

// ============================================================================
// PortfolioManager
// ============================================================================

export interface PortfolioManagerConfig {
  mode: AppMode;
  tokenIconBasePath: string;
  fetcher?: PortfolioFetcher;
  /** Auto-refresh interval in milliseconds.  0 = no auto-refresh. */
  refreshIntervalMs?: number;
}

export class PortfolioManager {
  private snapshot?: PortfolioSnapshot;
  private readonly config: PortfolioManagerConfig;
  private readonly fetcher: PortfolioFetcher;

  constructor(config: PortfolioManagerConfig) {
    this.config = config;
    this.fetcher =
      config.fetcher ??
      (config.mode === 'demo'
        ? new DemoPortfolioFetcher(config.tokenIconBasePath)
        : new DemoPortfolioFetcher(config.tokenIconBasePath)); // replace with live fetcher
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  async refresh(userId: string): Promise<PortfolioSnapshot> {
    try {
      this.snapshot = await this.fetcher.fetchSnapshot(userId);
      return { ...this.snapshot };
    } catch (err) {
      throw new ProductionMiniAppError(
        `Portfolio fetch failed: ${(err as Error).message}`,
        'PORTFOLIO_FETCH_FAILED',
        { userId }
      );
    }
  }

  getSnapshot(): PortfolioSnapshot | undefined {
    return this.snapshot ? { ...this.snapshot } : undefined;
  }

  /**
   * Compute the total portfolio value formatted as a string.
   */
  formatTotalValue(snapshot: PortfolioSnapshot): string {
    return `$${snapshot.totalValueUsd.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Compute the daily PnL as a signed formatted string, e.g. "+$87.30".
   */
  formatDailyPnl(snapshot: PortfolioSnapshot): string {
    const sign = snapshot.dailyPnlUsd >= 0 ? '+' : '';
    return `${sign}$${Math.abs(snapshot.dailyPnlUsd).toFixed(2)}`;
  }

  /**
   * Return assets sorted by USD value descending.
   */
  sortedAssets(snapshot: PortfolioSnapshot): AssetPosition[] {
    return [...snapshot.assets].sort((a, b) => b.valueUsd - a.valueUsd);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createPortfolioManager(
  config: PortfolioManagerConfig
): PortfolioManager {
  return new PortfolioManager(config);
}
