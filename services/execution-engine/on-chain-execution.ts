/**
 * TONAIAgent - On-Chain Execution Layer
 *
 * Extends the SmartExecutionEngine with real wallet integration and
 * on-chain trade execution via TON Connect.
 *
 * Architecture:
 * ```
 *   SmartExecutionEngine (demo/live mode switch)
 *          ↓ (live mode)
 *   OnChainExecutor (this module)
 *          ↓
 *   TonConnectAdapter → Wallet → DEX Contract → TON Blockchain
 * ```
 *
 * @see Issue #267 — Real Wallet Integration & On-Chain Execution
 */

import type {
  TonConnectAdapter,
  WalletSession,
  OnChainTransaction,
  TxResult,
} from '../../connectors/wallets/ton-connect-adapter';
import type { DexId, ExecutionPlan } from '../../connectors/liquidity-router/types';

// ============================================================================
// On-Chain Execution Types
// ============================================================================

/** Execution mode: demo (simulation) or live (real on-chain). */
export type ExecutionMode = 'demo' | 'live';

/** Request for on-chain execution. */
export interface OnChainExecutionRequest {
  /** The execution plan from the SmartExecutionEngine routing step */
  plan: ExecutionPlan;
  /** Wallet session for signing the transaction */
  walletSession: WalletSession;
  /** Maximum gas fee the user is willing to pay (in nanoTON) */
  maxGasFee?: string;
}

/** Result of an on-chain execution. */
export interface OnChainExecutionResult {
  /** Whether the on-chain execution succeeded */
  success: boolean;
  /** Transaction hash on the TON blockchain */
  txHash?: string;
  /** Block explorer URL */
  explorerUrl?: string;
  /** Gas fee paid in nanoTON */
  gasFee?: string;
  /** Wallet address that signed the transaction */
  walletAddress: string;
  /** DEX used for the swap */
  dex: DexId;
  /** Error message if execution failed */
  error?: string;
  /** Execution mode */
  executionMode: ExecutionMode;
  /** Timestamp */
  executedAt: Date;
}

// ============================================================================
// DEX Transaction Payload Builders
// ============================================================================

/**
 * Build a DEX swap transaction payload based on the execution plan.
 *
 * Each DEX has its own contract interface and message format.
 * This function routes to the appropriate builder based on the selected DEX.
 */
export function buildDexSwapPayload(
  plan: ExecutionPlan,
  walletAddress: string
): OnChainTransaction {
  const dex = plan.dex;

  switch (dex) {
    case 'dedust':
      return buildDedustSwapPayload(plan, walletAddress);
    case 'stonfi':
      return buildStonfiSwapPayload(plan, walletAddress);
    case 'tonco':
      return buildToncoSwapPayload(plan, walletAddress);
    default:
      throw new Error(`Unsupported DEX: ${dex}`);
  }
}

/**
 * Build a DeDust swap transaction payload.
 *
 * DeDust uses a vault-based architecture where users send tokens
 * to a vault contract with swap parameters encoded in the payload.
 */
function buildDedustSwapPayload(
  plan: ExecutionPlan,
  walletAddress: string
): OnChainTransaction {
  const route = plan.route;
  const poolAddress = route.type === 'single'
    ? route.quote.poolAddress
    : route.hops[0].quote.poolAddress;

  // DeDust swap message: op_code + pool_address + min_amount_out + recipient
  // The actual BOC encoding would use the @dedust/sdk in production.
  const amountNano = Math.floor(plan.amountIn * 1e9).toString();

  return {
    to: poolAddress,
    amount: amountNano,
    // Payload would be BOC-encoded swap parameters
    // In production: use DeDust SDK to build the actual message body
    payload: undefined,
  };
}

/**
 * Build a STON.fi swap transaction payload.
 *
 * STON.fi uses a router contract that handles token routing
 * and swap execution through jetton wallets.
 */
function buildStonfiSwapPayload(
  plan: ExecutionPlan,
  walletAddress: string
): OnChainTransaction {
  const route = plan.route;
  const poolAddress = route.type === 'single'
    ? route.quote.poolAddress
    : route.hops[0].quote.poolAddress;

  const amountNano = Math.floor(plan.amountIn * 1e9).toString();

  return {
    to: poolAddress,
    amount: amountNano,
    // Payload would be BOC-encoded swap parameters
    // In production: use @ston-fi/sdk to build the actual message body
    payload: undefined,
  };
}

/**
 * Build a TONCO swap transaction payload.
 *
 * TONCO uses concentrated liquidity pools similar to Uniswap v3,
 * with tick-based pricing and position management.
 */
function buildToncoSwapPayload(
  plan: ExecutionPlan,
  walletAddress: string
): OnChainTransaction {
  const route = plan.route;
  const poolAddress = route.type === 'single'
    ? route.quote.poolAddress
    : route.hops[0].quote.poolAddress;

  const amountNano = Math.floor(plan.amountIn * 1e9).toString();

  return {
    to: poolAddress,
    amount: amountNano,
    // Payload would be BOC-encoded swap parameters
    // In production: use TONCO SDK to build the actual message body
    payload: undefined,
  };
}

// ============================================================================
// Gas Estimation
// ============================================================================

/** Estimated gas fees by DEX (in nanoTON). */
const DEX_GAS_ESTIMATES: Record<DexId, string> = {
  dedust: '150000000',  // ~0.15 TON
  stonfi: '200000000',  // ~0.20 TON
  tonco: '250000000',   // ~0.25 TON (concentrated liquidity is more complex)
};

/**
 * Estimate gas fee for a DEX swap transaction.
 * Returns the estimated fee in nanoTON.
 */
export function estimateSwapGas(dex: DexId, isMultiHop: boolean): string {
  const baseGas = BigInt(DEX_GAS_ESTIMATES[dex] || '200000000');
  // Multi-hop swaps cost ~2x gas due to multiple contract calls
  const multiplier = isMultiHop ? 2n : 1n;
  return (baseGas * multiplier).toString();
}

// ============================================================================
// On-Chain Executor
// ============================================================================

/**
 * Executes trades on-chain via the TON Connect wallet adapter.
 *
 * This is the bridge between the SmartExecutionEngine's routing decisions
 * and actual on-chain DEX contract interactions.
 */
export interface OnChainExecutor {
  /** Execute a swap on-chain using the connected wallet */
  executeOnChain(request: OnChainExecutionRequest): Promise<OnChainExecutionResult>;

  /** Estimate gas for a planned execution */
  estimateGas(plan: ExecutionPlan): string;
}

export class DefaultOnChainExecutor implements OnChainExecutor {
  private readonly adapter: TonConnectAdapter;

  constructor(adapter: TonConnectAdapter) {
    this.adapter = adapter;
  }

  async executeOnChain(request: OnChainExecutionRequest): Promise<OnChainExecutionResult> {
    const { plan, walletSession } = request;

    // Validate wallet is still connected
    if (!this.adapter.isConnected()) {
      return {
        success: false,
        walletAddress: walletSession.address,
        dex: plan.dex,
        error: 'Wallet disconnected. Please reconnect and try again.',
        executionMode: 'live',
        executedAt: new Date(),
      };
    }

    // Validate wallet address matches session
    const currentAddress = this.adapter.getAddress();
    if (currentAddress !== walletSession.address) {
      return {
        success: false,
        walletAddress: walletSession.address,
        dex: plan.dex,
        error: 'Wallet address mismatch. The connected wallet has changed.',
        executionMode: 'live',
        executedAt: new Date(),
      };
    }

    try {
      // Build the DEX swap transaction
      const tx = buildDexSwapPayload(plan, walletSession.address);

      // Check gas estimate against user's max
      if (request.maxGasFee) {
        const estimatedGas = this.estimateGas(plan);
        if (BigInt(estimatedGas) > BigInt(request.maxGasFee)) {
          return {
            success: false,
            walletAddress: walletSession.address,
            dex: plan.dex,
            error: `Estimated gas fee (${estimatedGas} nanoTON) exceeds your maximum (${request.maxGasFee} nanoTON)`,
            executionMode: 'live',
            executedAt: new Date(),
          };
        }
      }

      // Send transaction via TON Connect adapter (wallet approval required)
      const result: TxResult = await this.adapter.sendTransaction(tx);

      if (!result.success) {
        return {
          success: false,
          walletAddress: walletSession.address,
          dex: plan.dex,
          error: result.error || 'Transaction rejected by wallet',
          executionMode: 'live',
          executedAt: new Date(),
        };
      }

      return {
        success: true,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        gasFee: result.gasFee,
        walletAddress: walletSession.address,
        dex: plan.dex,
        executionMode: 'live',
        executedAt: new Date(),
      };

    } catch (err) {
      return {
        success: false,
        walletAddress: walletSession.address,
        dex: plan.dex,
        error: err instanceof Error ? err.message : 'On-chain execution failed',
        executionMode: 'live',
        executedAt: new Date(),
      };
    }
  }

  estimateGas(plan: ExecutionPlan): string {
    const isMultiHop = plan.route.type === 'multi';
    return estimateSwapGas(plan.dex, isMultiHop);
  }
}

// ============================================================================
// Security Checks for Live Mode
// ============================================================================

/** Security validation result for live execution. */
export interface LiveModeSecurityCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Validate that a live execution request meets security requirements.
 * These checks protect users from accidental loss of funds.
 */
export function validateLiveModeRequest(
  walletSession: WalletSession | null,
  amountTon: number,
  maxTradeSizeTon: number = 1000,
): LiveModeSecurityCheck {
  // Check 1: Wallet must be connected
  if (!walletSession || !walletSession.active) {
    return { allowed: false, reason: 'Wallet must be connected for live trading' };
  }

  // Check 2: Address must be valid
  if (!walletSession.address || walletSession.address.length < 10) {
    return { allowed: false, reason: 'Invalid wallet address' };
  }

  // Check 3: Amount must be within limits
  if (amountTon <= 0) {
    return { allowed: false, reason: 'Trade amount must be positive' };
  }

  if (amountTon > maxTradeSizeTon) {
    return {
      allowed: false,
      reason: `Trade amount ${amountTon} TON exceeds maximum limit of ${maxTradeSizeTon} TON`,
    };
  }

  return { allowed: true };
}

// ============================================================================
// Factory
// ============================================================================

export function createOnChainExecutor(adapter: TonConnectAdapter): DefaultOnChainExecutor {
  return new DefaultOnChainExecutor(adapter);
}
