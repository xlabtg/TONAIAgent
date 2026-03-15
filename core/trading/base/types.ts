/**
 * TONAIAgent - On-Chain Trading Types (DEX Execution Layer)
 *
 * Type definitions for the on-chain trading module that enables AI agents
 * to execute real swaps on TON DEXs (DeDust, STON.fi, TONCO).
 *
 * Architecture:
 * ```
 *   Strategy Engine
 *         |
 *   DEX Router          ← selects optimal DEX by price/liquidity/slippage
 *         |
 *   Trade Validator     ← risk controls: slippage, position size, allowed pairs
 *         |
 *   Transaction Builder ← constructs TON-compatible swap tx payloads
 *         |
 *   Swap Executor       ← submits tx via TON Connect wallet signing flow
 *         |
 *   On-Chain Trade Tracker ← records tx_hash, dex_used, amounts, timestamp
 * ```
 *
 * @see Issue #235 — On-Chain Trading Integration (TON DEX Execution)
 */

// ============================================================================
// DEX Identifiers
// ============================================================================

/**
 * Supported TON DEX identifiers for on-chain execution.
 */
export type DexName = 'dedust' | 'stonfi' | 'tonco';

// ============================================================================
// Trade Signal Types
// ============================================================================

/**
 * A trading signal from the Strategy Engine, specifying a swap to execute.
 */
export interface OnChainTradeSignal {
  /** Trading pair, e.g. "TON/USDT" */
  pair: string;
  /** Trade direction */
  action: 'BUY' | 'SELL';
  /** Amount of base token to swap (as string for precision) */
  amount: string;
  /** Strategy that produced this signal */
  strategyId: string;
  /** Agent that owns this trade */
  agentId: string;
  /** When this signal was generated */
  generatedAt: Date;
  /** Optional metadata from strategy */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DEX Routing Types
// ============================================================================

/**
 * A price quote from a specific DEX for a given swap.
 */
export interface SwapQuote {
  /** DEX providing this quote */
  dex: DexName;
  /** Token being swapped in */
  tokenIn: string;
  /** Token being received */
  tokenOut: string;
  /** Amount in (in token's smallest unit) */
  amountIn: string;
  /** Expected amount out (in token's smallest unit) */
  expectedAmountOut: string;
  /** Execution price (amountOut / amountIn) */
  executionPrice: number;
  /** Price impact as a percentage (0-100) */
  priceImpactPercent: number;
  /** DEX swap fee as percentage */
  feePercent: number;
  /** Minimum amount out with slippage applied */
  minimumAmountOut: string;
  /** Available liquidity in USD */
  liquidityUsd: number;
  /** Pool address used for routing */
  poolAddress: string;
  /** Timestamp when quote was fetched */
  timestamp: number;
}

/**
 * Result from the DEX router selecting the optimal venue.
 */
export interface RoutingResult {
  /** The selected DEX */
  selectedDex: DexName;
  /** The winning quote */
  bestQuote: SwapQuote;
  /** All quotes fetched (for audit/logging) */
  allQuotes: SwapQuote[];
  /** Reason for DEX selection */
  selectionReason: string;
  /** Timestamp of routing decision */
  routedAt: number;
}

// ============================================================================
// Transaction Builder Types
// ============================================================================

/**
 * A constructed TON transaction payload ready for signing.
 */
export interface TonSwapTransaction {
  /** Unique transaction ID for tracking */
  txId: string;
  /** Target DEX contract address */
  contractAddress: string;
  /** Transaction payload (BOC encoded as hex or base64) */
  payload: string;
  /** Amount of TON to attach (nanotons) */
  attachedTon: string;
  /** Human-readable description */
  description: string;
  /** The routing result this tx was built from */
  routingResult: RoutingResult;
  /** Network: 'mainnet' | 'testnet' */
  network: 'mainnet' | 'testnet';
  /** When this transaction was built */
  builtAt: number;
}

// ============================================================================
// Swap Execution Types
// ============================================================================

/**
 * Status of an on-chain swap execution attempt.
 */
export type SwapExecutionStatus =
  | 'submitted'    // tx submitted to the network
  | 'confirmed'    // tx confirmed on-chain
  | 'failed'       // tx failed or rejected
  | 'rejected'     // rejected before submission (risk/validation)
  | 'simulated';   // testnet simulation only

/**
 * Result of a swap execution attempt.
 */
export interface SwapExecutionResult {
  /** Whether the execution succeeded */
  success: boolean;
  /** Execution status */
  status: SwapExecutionStatus;
  /** On-chain transaction hash (if submitted) */
  txHash?: string;
  /** The transaction that was submitted */
  transaction?: TonSwapTransaction;
  /** The routing result used */
  routingResult?: RoutingResult;
  /** Error message if failed/rejected */
  errorMessage?: string;
  /** Agent ID */
  agentId: string;
  /** When execution was attempted */
  executedAt: Date;
  /** Duration in milliseconds */
  durationMs: number;
}

// ============================================================================
// On-Chain Trade Record Types
// ============================================================================

/**
 * A recorded on-chain trade with full audit trail.
 * Tracks the complete lifecycle from signal to confirmation.
 */
export interface OnChainTradeRecord {
  /** Unique trade identifier */
  tradeId: string;
  /** Agent that executed this trade */
  agentId: string;
  /** Wallet address that signed the transaction */
  walletAddress: string;
  /** Strategy that produced the signal */
  strategyId: string;
  /** DEX used for execution */
  dexUsed: DexName;
  /** Trading pair (e.g. "TON/USDT") */
  pair: string;
  /** Token swapped in */
  tokenIn: string;
  /** Token received */
  tokenOut: string;
  /** Amount of tokenIn (in token units as string) */
  amountIn: string;
  /** Actual amount of tokenOut received */
  amountOut: string;
  /** Execution price */
  executionPrice: number;
  /** Slippage incurred as percentage */
  slippagePercent: number;
  /** On-chain transaction hash */
  txHash: string;
  /** Block number where tx was confirmed */
  blockNumber?: number;
  /** Network: 'mainnet' | 'testnet' */
  network: 'mainnet' | 'testnet';
  /** Trade status */
  status: 'pending' | 'confirmed' | 'failed';
  /** When the trade was executed */
  timestamp: Date;
  /** When the trade was confirmed on-chain */
  confirmedAt?: Date;
  /** Gas/fee paid in nanotons */
  feePaid?: string;
}

// ============================================================================
// Trade Validation Types
// ============================================================================

/**
 * Result of validating a trade against risk controls.
 */
export interface TradeValidationResult {
  /** Whether the trade is valid */
  valid: boolean;
  /** Rejection reason if not valid */
  rejectionReason?: string;
  /** Validation checks performed */
  checks: TradeValidationCheck[];
}

/**
 * A single validation check result.
 */
export interface TradeValidationCheck {
  /** Name of the check */
  name: string;
  /** Whether this check passed */
  passed: boolean;
  /** Details about the check result */
  message: string;
}

// ============================================================================
// Risk Controls Configuration
// ============================================================================

/**
 * Risk control configuration for on-chain trading.
 */
export interface TradingRiskConfig {
  /** Maximum allowed slippage as percentage (e.g., 1.0 = 1%) */
  maxSlippagePercent: number;
  /** Maximum position size as percentage of portfolio (e.g., 20.0 = 20%) */
  maxPositionPercent: number;
  /** Minimum liquidity required on DEX in USD */
  minLiquidityUsd: number;
  /** Maximum price impact allowed as percentage */
  maxPriceImpactPercent: number;
  /** Allowed trading pairs (empty = all pairs allowed) */
  allowedPairs: string[];
  /** Whether testnet mode is active */
  testnetMode: boolean;
}

/**
 * Default risk controls aligned with issue requirements.
 */
export const DEFAULT_RISK_CONFIG: TradingRiskConfig = {
  maxSlippagePercent: 1.0,         // 1% max slippage
  maxPositionPercent: 20.0,        // 20% max position
  minLiquidityUsd: 10_000,         // $10k minimum liquidity
  maxPriceImpactPercent: 3.0,      // 3% max price impact
  allowedPairs: [],                 // all pairs allowed by default
  testnetMode: true,               // testnet-first development
};

// ============================================================================
// DEX Router Configuration
// ============================================================================

/**
 * Configuration for the DEX router.
 */
export interface DexRouterConfig {
  /** DEXs to query for quotes */
  enabledDexes: DexName[];
  /** Slippage tolerance for quote calculations (percentage) */
  slippageTolerance: number;
  /** Quote cache TTL in seconds */
  quoteCacheTtlSeconds: number;
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * Default DEX router configuration.
 */
export const DEFAULT_DEX_ROUTER_CONFIG: DexRouterConfig = {
  enabledDexes: ['dedust', 'stonfi', 'tonco'],
  slippageTolerance: 0.5,
  quoteCacheTtlSeconds: 10,
};

// ============================================================================
// Swap Executor Configuration
// ============================================================================

/**
 * Configuration for the swap executor.
 */
export interface SwapExecutorConfig {
  /** Network to execute on */
  network: 'mainnet' | 'testnet';
  /** Whether to actually submit transactions (false = dry-run) */
  submitTransactions: boolean;
  /** Maximum retries for failed submissions */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelayMs: number;
}

/**
 * Default swap executor configuration (testnet-first).
 */
export const DEFAULT_SWAP_EXECUTOR_CONFIG: SwapExecutorConfig = {
  network: 'testnet',
  submitTransactions: false,   // dry-run by default; set true for live
  maxRetries: 2,
  retryDelayMs: 1000,
};

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by the trading module.
 */
export type TradingEventType =
  | 'trade.signal_received'
  | 'trade.routing_completed'
  | 'trade.validation_passed'
  | 'trade.validation_failed'
  | 'trade.transaction_built'
  | 'trade.submitted'
  | 'trade.confirmed'
  | 'trade.failed'
  | 'trade.rejected';

/**
 * A trading module event.
 */
export interface TradingEvent {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: TradingEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related agent ID */
  agentId?: string;
  /** Related trade ID */
  tradeId?: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type TradingEventHandler = (event: TradingEvent) => void;

/** Unsubscribe function */
export type TradingUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for trading operations.
 */
export type TradingErrorCode =
  | 'ROUTING_FAILED'
  | 'VALIDATION_FAILED'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'SLIPPAGE_EXCEEDED'
  | 'POSITION_LIMIT_EXCEEDED'
  | 'PAIR_NOT_ALLOWED'
  | 'TRANSACTION_BUILD_FAILED'
  | 'SUBMISSION_FAILED'
  | 'WALLET_NOT_CONNECTED'
  | 'NETWORK_ERROR'
  | 'QUOTE_EXPIRED'
  | 'PRICE_IMPACT_TOO_HIGH';

/**
 * Structured error for trading operations.
 */
export class TradingError extends Error {
  constructor(
    message: string,
    public readonly code: TradingErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TradingError';
  }
}

// ============================================================================
// TON Connect Wallet Types (lightweight interface)
// ============================================================================

/**
 * Minimal wallet interface for TON Connect signing.
 * Implementations can be TON Connect 2.0 or any compatible wallet SDK.
 */
export interface TonWalletConnector {
  /** The connected wallet address */
  walletAddress: string;
  /** Whether the wallet is currently connected */
  isConnected: boolean;
  /**
   * Sign and send a transaction.
   * @returns Transaction hash
   */
  sendTransaction(tx: TonSwapTransaction): Promise<string>;
}
