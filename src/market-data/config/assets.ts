/**
 * TONAIAgent - Market Data Asset Configuration
 *
 * Defines the supported assets for the MVP Market Data Layer.
 * Extend this list to add new assets for all providers.
 *
 * MVP assets: BTC, ETH, TON, SOL, USDT
 */

// ============================================================================
// MVP Asset List
// ============================================================================

/**
 * The complete list of asset symbols supported by the Market Data Layer.
 * Used by providers to validate asset requests and build API queries.
 *
 * To add a new asset:
 *   1. Add the symbol here
 *   2. Add its CoinGecko ID to COINGECKO_ASSET_IDS
 *   3. Add its Binance trading pair to BINANCE_SYMBOLS
 */
export const MVP_ASSETS: readonly string[] = ['BTC', 'ETH', 'TON', 'SOL', 'USDT'] as const;

// ============================================================================
// CoinGecko Asset ID Mappings
// ============================================================================

/**
 * Maps uppercase asset symbols to their CoinGecko API coin IDs.
 *
 * Used when constructing CoinGecko API requests.
 * Full list at: https://api.coingecko.com/api/v3/coins/list
 */
export const COINGECKO_ASSET_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  TON: 'the-open-network',
  SOL: 'solana',
  USDT: 'tether',
};

// ============================================================================
// Binance Symbol Mappings
// ============================================================================

/**
 * Maps uppercase asset symbols to their Binance ticker symbols (vs USDT).
 *
 * Used when constructing Binance API requests.
 * Note: USDT is quoted against BUSD on Binance for a valid pair.
 *
 * Full symbols list: GET https://api.binance.com/api/v3/exchangeInfo
 */
export const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  TON: 'TONUSDT',
  SOL: 'SOLUSDT',
  USDT: 'USDTBUSD',
};

// ============================================================================
// Default Price Fallbacks (for testing and simulation)
// ============================================================================

/**
 * Approximate baseline prices used in tests and simulation mode.
 * Not used in production — real prices come from providers.
 */
export const BASELINE_PRICES: Record<string, number> = {
  BTC: 65_000,
  ETH: 3_500,
  TON: 5.25,
  SOL: 175,
  USDT: 1.0,
};
