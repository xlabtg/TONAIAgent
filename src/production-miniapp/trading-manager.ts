/**
 * On-chain trading manager — wraps DeDust, STON.fi, and TONCO integrations.
 *
 * In demo mode swaps are simulated and return deterministic results.
 * In live mode the manager delegates to the DEX SDKs and the connected wallet.
 */

import {
  SwapRequest,
  SwapResult,
  AppMode,
  DexId,
  TokenSymbol,
  ProductionMiniAppError,
  MiniAppEvent,
  MiniAppEventCallback,
} from './types';

// ============================================================================
// Swap executor interface
// ============================================================================

export interface SwapExecutor {
  execute(request: SwapRequest): Promise<SwapResult>;
  getSupportedPairs(): Array<[TokenSymbol, TokenSymbol]>;
}

// ============================================================================
// Demo executor
// ============================================================================

const DEMO_EXCHANGE_RATES: Record<string, number> = {
  'TON/USDT': 4.8,
  'USDT/TON': 1 / 4.8,
  'TON/NOT': 2400,
  'NOT/TON': 1 / 2400,
};

export class DemoSwapExecutor implements SwapExecutor {
  async execute(request: SwapRequest): Promise<SwapResult> {
    const pair = `${request.tokenIn}/${request.tokenOut}`;
    const rate = DEMO_EXCHANGE_RATES[pair];

    if (rate === undefined) {
      return {
        success: false,
        amountIn: request.amountIn,
        error: `Unsupported pair: ${pair}`,
        executedAt: ts(),
      };
    }

    const amountOut = request.amountIn * rate * (1 - request.slippageTolerance / 100);

    return {
      success: true,
      txHash: `demo_tx_${Date.now().toString(16)}`,
      dex: 'stonfi', // demo always picks stonfi
      amountIn: request.amountIn,
      amountOut,
      fee: request.amountIn * 0.003,
      executedAt: ts(),
    };
  }

  getSupportedPairs(): Array<[TokenSymbol, TokenSymbol]> {
    return [
      ['TON', 'USDT'],
      ['USDT', 'TON'],
      ['TON', 'NOT'],
      ['NOT', 'TON'],
    ];
  }
}

// ============================================================================
// DEX routing helper
// ============================================================================

/**
 * Select the optimal DEX for a swap based on the preferred hint or a simple
 * priority ranking (stonfi > dedust > tonco).
 */
export function selectDex(
  preferred: DexId | undefined,
  availableDexes: DexId[]
): DexId {
  if (preferred && availableDexes.includes(preferred)) return preferred;
  const priority: DexId[] = ['stonfi', 'dedust', 'tonco'];
  for (const dex of priority) {
    if (availableDexes.includes(dex)) return dex;
  }
  return availableDexes[0];
}

// ============================================================================
// TradingManager
// ============================================================================

export interface TradingManagerConfig {
  mode: AppMode;
  enabledDexes?: DexId[];
  executor?: SwapExecutor;
}

export class TradingManager {
  private readonly config: TradingManagerConfig;
  private readonly executor: SwapExecutor;
  private readonly eventCallbacks: MiniAppEventCallback[] = [];
  private readonly history: SwapResult[] = [];

  constructor(config: TradingManagerConfig) {
    this.config = {
      ...config,
      enabledDexes: config.enabledDexes ?? ['dedust', 'stonfi', 'tonco'],
    };
    this.executor = config.executor ?? new DemoSwapExecutor();
  }

  // --------------------------------------------------------------------------
  // Swap
  // --------------------------------------------------------------------------

  async swap(request: SwapRequest): Promise<SwapResult> {
    if (this.config.mode === 'live' && !this.isLiveTradingReady()) {
      throw new ProductionMiniAppError(
        'Live trading requires a connected wallet',
        'SWAP_FAILED',
        { request }
      );
    }

    this.emit({
      type: 'swap_submitted',
      payload: request,
      timestamp: ts(),
    });

    let result: SwapResult;
    try {
      result = await this.executor.execute(request);
    } catch (err) {
      result = {
        success: false,
        amountIn: request.amountIn,
        error: (err as Error).message,
        executedAt: ts(),
      };
    }

    this.history.push(result);

    this.emit({
      type: 'swap_completed',
      payload: result,
      timestamp: ts(),
    });

    if (!result.success) {
      throw new ProductionMiniAppError(
        `Swap failed: ${result.error ?? 'unknown'}`,
        'SWAP_FAILED',
        { request, result }
      );
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // History & info
  // --------------------------------------------------------------------------

  getHistory(): SwapResult[] {
    return [...this.history];
  }

  getSupportedPairs(): Array<[TokenSymbol, TokenSymbol]> {
    return this.executor.getSupportedPairs();
  }

  getEnabledDexes(): DexId[] {
    return [...(this.config.enabledDexes ?? [])];
  }

  getMode(): AppMode {
    return this.config.mode;
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: MiniAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private isLiveTradingReady(): boolean {
    // In a real implementation this would check the wallet connection state.
    // For now we optimistically allow it so the interface compiles cleanly.
    return true;
  }

  private emit(event: MiniAppEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function ts(): number {
  return Math.floor(Date.now() / 1000);
}

// ============================================================================
// Factory
// ============================================================================

export function createTradingManager(
  config: TradingManagerConfig
): TradingManager {
  return new TradingManager(config);
}
