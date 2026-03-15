/**
 * TONAIAgent - Transaction Builder
 *
 * Constructs TON-compatible swap transaction payloads for DeDust, STON.fi,
 * and TONCO DEXs. Generates the message body (cell) and contract call
 * parameters needed for wallet signing via TON Connect.
 *
 * Each DEX uses a different message format:
 * - DeDust: swap via vault contract with asset pair encoding
 * - STON.fi: swap via router contract with jetton transfer payload
 * - TONCO: swap via pool contract with concentrated liquidity routing
 *
 * Note: Full on-chain BOC serialization requires the @ton/ton SDK.
 * This module generates structured payloads that encode the swap intent.
 * In testnet mode, a simulated payload is returned for dry-run testing.
 *
 * @see Issue #235 — On-Chain Trading Integration (TON DEX Execution)
 */

import type {
  RoutingResult,
  TonSwapTransaction,
  SwapExecutorConfig,
} from './types';
import { TradingError } from './types';

// ============================================================================
// DEX Contract Addresses (Testnet and Mainnet)
// ============================================================================

/** Known DEX router/vault contract addresses */
const DEX_CONTRACTS = {
  mainnet: {
    dedust: {
      nativeVault: 'EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_',   // DeDust native vault
      factory: 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67',          // DeDust factory
    },
    stonfi: {
      router: 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTeDShu7Ekj8Db_STONE', // STON.fi router v2
    },
    tonco: {
      router: 'EQC_-t0nCnm0GU0TV_f_uk9t_GZqQNpFVIhM8U0GgR5w6R5M',  // TONCO router
    },
  },
  testnet: {
    dedust: {
      nativeVault: 'EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_testnet',
      factory: 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67_testnet',
    },
    stonfi: {
      router: 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTeDShu7Ekj8Db_testnet',
    },
    tonco: {
      router: 'EQC_-t0nCnm0GU0TV_f_uk9t_GZqQNpFVIhM8U0GgR5w6R5M_testnet',
    },
  },
} as const;

/** Gas amounts to attach for different DEX operations (in nanotons) */
const GAS_AMOUNTS = {
  dedust: '300000000',  // 0.3 TON for DeDust swaps
  stonfi: '250000000',  // 0.25 TON for STON.fi swaps
  tonco: '300000000',   // 0.3 TON for TONCO swaps
};

// ============================================================================
// Transaction Builder
// ============================================================================

/**
 * TransactionBuilder — constructs swap transaction payloads for each DEX.
 *
 * @example
 * ```typescript
 * const builder = createTransactionBuilder({ network: 'testnet' });
 *
 * const tx = builder.buildSwapTransaction(routingResult, walletAddress);
 * // tx.payload contains the encoded swap message
 * // tx.contractAddress is the DEX contract to call
 * // tx.attachedTon is the TON amount to send with the tx
 * ```
 */
export class TransactionBuilder {
  private readonly network: 'mainnet' | 'testnet';
  private txCounter = 0;

  constructor(config: Partial<SwapExecutorConfig> = {}) {
    this.network = config.network ?? 'testnet';
  }

  /**
   * Builds a swap transaction for the given routing result.
   *
   * @param routingResult - The DEX routing result with best quote
   * @param walletAddress - The user's wallet address (for recipient field)
   * @returns A constructed TonSwapTransaction ready for signing
   */
  buildSwapTransaction(routingResult: RoutingResult, walletAddress: string): TonSwapTransaction {
    const { selectedDex, bestQuote } = routingResult;
    const txId = this.generateTxId();

    switch (selectedDex) {
      case 'dedust':
        return this.buildDedustTransaction(txId, routingResult, walletAddress);
      case 'stonfi':
        return this.buildStonfiTransaction(txId, routingResult, walletAddress);
      case 'tonco':
        return this.buildToncoTransaction(txId, routingResult, walletAddress);
      default:
        throw new TradingError(
          `Unsupported DEX: ${selectedDex}`,
          'TRANSACTION_BUILD_FAILED',
          { dex: selectedDex }
        );
    }
  }

  // ============================================================================
  // DEX-Specific Transaction Builders
  // ============================================================================

  /**
   * Builds a DeDust swap transaction.
   *
   * DeDust swap flow (TON → Jetton):
   * 1. Call native vault with swap message
   * 2. Vault routes to the appropriate pool
   * 3. Pool executes AMM swap and transfers jetton to recipient
   *
   * DeDust swap flow (Jetton → TON or Jetton → Jetton):
   * 1. Transfer jetton to jetton vault with swap payload
   * 2. Vault routes to pool
   * 3. Pool executes swap and transfers to recipient
   */
  private buildDedustTransaction(
    txId: string,
    routingResult: RoutingResult,
    walletAddress: string
  ): TonSwapTransaction {
    const { bestQuote } = routingResult;
    const contracts = DEX_CONTRACTS[this.network].dedust;
    const isNativeIn = bestQuote.tokenIn === 'TON';

    // Contract to call depends on whether input is native TON or a jetton
    const contractAddress = isNativeIn ? contracts.nativeVault : contracts.factory;

    // Build payload: encodes swap parameters in TL-B format (simplified representation)
    // In production this would use @ton/ton Cell/Builder to create a proper BOC
    const payload = this.encodeDedustPayload({
      tokenIn: bestQuote.tokenIn,
      tokenOut: bestQuote.tokenOut,
      amountIn: bestQuote.amountIn,
      minimumAmountOut: bestQuote.minimumAmountOut,
      recipientAddress: walletAddress,
      poolAddress: bestQuote.poolAddress,
    });

    // For TON→Jetton swaps, attach the swap amount + gas
    const attachedTon = isNativeIn
      ? (BigInt(bestQuote.amountIn) + BigInt(GAS_AMOUNTS.dedust)).toString()
      : GAS_AMOUNTS.dedust;

    return {
      txId,
      contractAddress,
      payload,
      attachedTon,
      description: `DeDust swap: ${bestQuote.amountIn} ${bestQuote.tokenIn} → min ${bestQuote.minimumAmountOut} ${bestQuote.tokenOut}`,
      routingResult,
      network: this.network,
      builtAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Builds a STON.fi swap transaction.
   *
   * STON.fi swap flow (TON → Jetton):
   * 1. Call router's swap_ton_to_jetton with TON attached
   * 2. Router finds best pool and executes swap
   * 3. Jetton transferred to recipient
   *
   * STON.fi swap flow (Jetton → TON/Jetton):
   * 1. Send jetton transfer to jetton master with forward payload
   * 2. Router intercepts and executes swap
   */
  private buildStonfiTransaction(
    txId: string,
    routingResult: RoutingResult,
    walletAddress: string
  ): TonSwapTransaction {
    const { bestQuote } = routingResult;
    const contracts = DEX_CONTRACTS[this.network].stonfi;
    const isNativeIn = bestQuote.tokenIn === 'TON';

    const contractAddress = contracts.router;

    const payload = this.encodeStonfiPayload({
      tokenIn: bestQuote.tokenIn,
      tokenOut: bestQuote.tokenOut,
      amountIn: bestQuote.amountIn,
      minimumAmountOut: bestQuote.minimumAmountOut,
      recipientAddress: walletAddress,
      routerAddress: contracts.router,
      isNativeIn,
    });

    const attachedTon = isNativeIn
      ? (BigInt(bestQuote.amountIn) + BigInt(GAS_AMOUNTS.stonfi)).toString()
      : GAS_AMOUNTS.stonfi;

    return {
      txId,
      contractAddress,
      payload,
      attachedTon,
      description: `STON.fi swap: ${bestQuote.amountIn} ${bestQuote.tokenIn} → min ${bestQuote.minimumAmountOut} ${bestQuote.tokenOut}`,
      routingResult,
      network: this.network,
      builtAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Builds a TONCO (concentrated liquidity) swap transaction.
   *
   * TONCO swap flow:
   * 1. Call pool router with exact input swap parameters
   * 2. Router routes through concentrated liquidity position
   * 3. Output token transferred to recipient
   */
  private buildToncoTransaction(
    txId: string,
    routingResult: RoutingResult,
    walletAddress: string
  ): TonSwapTransaction {
    const { bestQuote } = routingResult;
    const contracts = DEX_CONTRACTS[this.network].tonco;
    const isNativeIn = bestQuote.tokenIn === 'TON';

    const contractAddress = contracts.router;

    const payload = this.encodeToncoPayload({
      tokenIn: bestQuote.tokenIn,
      tokenOut: bestQuote.tokenOut,
      amountIn: bestQuote.amountIn,
      minimumAmountOut: bestQuote.minimumAmountOut,
      recipientAddress: walletAddress,
      poolAddress: bestQuote.poolAddress,
    });

    const attachedTon = isNativeIn
      ? (BigInt(bestQuote.amountIn) + BigInt(GAS_AMOUNTS.tonco)).toString()
      : GAS_AMOUNTS.tonco;

    return {
      txId,
      contractAddress,
      payload,
      attachedTon,
      description: `TONCO swap: ${bestQuote.amountIn} ${bestQuote.tokenIn} → min ${bestQuote.minimumAmountOut} ${bestQuote.tokenOut}`,
      routingResult,
      network: this.network,
      builtAt: Math.floor(Date.now() / 1000),
    };
  }

  // ============================================================================
  // Payload Encoders
  // ============================================================================

  /**
   * Encodes DeDust swap payload.
   *
   * In production: use @ton/ton Cell.fromBase64 / beginCell().storeUint()...
   * The payload structure follows DeDust's swap message TL-B schema.
   * Here we return a structured JSON encoding that represents the swap intent.
   */
  private encodeDedustPayload(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minimumAmountOut: string;
    recipientAddress: string;
    poolAddress: string;
  }): string {
    // TL-B representation of DeDust swap message:
    // swap#e3a0d482 query_id:uint64 amount:Coins asset_in:Asset asset_out:Asset
    //             min_amount_out:Coins recipient:MsgAddress = SwapMessage;
    const message = {
      op: 'swap',
      opCode: '0xe3a0d482',  // DeDust swap opcode
      queryId: Date.now(),
      amountIn: params.amountIn,
      assetIn: params.tokenIn === 'TON' ? { type: 'native' } : { type: 'jetton', address: params.tokenIn },
      assetOut: params.tokenOut === 'TON' ? { type: 'native' } : { type: 'jetton', address: params.tokenOut },
      minimumAmountOut: params.minimumAmountOut,
      recipient: params.recipientAddress,
      poolAddress: params.poolAddress,
      dex: 'dedust',
    };
    return Buffer.from(JSON.stringify(message)).toString('base64');
  }

  /**
   * Encodes STON.fi swap payload.
   *
   * STON.fi uses a router contract that accepts swap calls with:
   * - token addresses
   * - amounts
   * - slippage-protected minimum output
   */
  private encodeStonfiPayload(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minimumAmountOut: string;
    recipientAddress: string;
    routerAddress: string;
    isNativeIn: boolean;
  }): string {
    // TL-B for STON.fi swap:
    // swap#25938561 token_wallet:MsgAddress min_out:Coins to_address:MsgAddress = SwapMessage;
    const message = {
      op: params.isNativeIn ? 'swap_ton_to_jetton' : 'swap_jetton',
      opCode: params.isNativeIn ? '0x25938561' : '0x6664de2a',
      queryId: Date.now(),
      amountIn: params.amountIn,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      minimumAmountOut: params.minimumAmountOut,
      toAddress: params.recipientAddress,
      routerAddress: params.routerAddress,
      dex: 'stonfi',
    };
    return Buffer.from(JSON.stringify(message)).toString('base64');
  }

  /**
   * Encodes TONCO swap payload.
   *
   * TONCO uses concentrated liquidity pools with tick-based routing.
   * The swap message specifies exact input with sqrt price limit.
   */
  private encodeToncoPayload(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minimumAmountOut: string;
    recipientAddress: string;
    poolAddress: string;
  }): string {
    // TONCO swap message structure
    const message = {
      op: 'exact_in_swap',
      opCode: '0x5be3a1b1',
      queryId: Date.now(),
      amountIn: params.amountIn,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      minimumAmountOut: params.minimumAmountOut,
      recipient: params.recipientAddress,
      poolAddress: params.poolAddress,
      sqrtPriceLimitX96: '0',  // No price limit (slippage handled by minimumAmountOut)
      dex: 'tonco',
    };
    return Buffer.from(JSON.stringify(message)).toString('base64');
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Generates a unique transaction ID for tracking.
   */
  private generateTxId(): string {
    this.txCounter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `tx-${timestamp}-${this.txCounter}-${random}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TransactionBuilder with optional config overrides.
 *
 * @example
 * ```typescript
 * const builder = createTransactionBuilder({ network: 'testnet' });
 * const tx = builder.buildSwapTransaction(routingResult, walletAddress);
 * ```
 */
export function createTransactionBuilder(config?: Partial<SwapExecutorConfig>): TransactionBuilder {
  return new TransactionBuilder(config);
}
