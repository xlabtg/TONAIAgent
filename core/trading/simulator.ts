/**
 * TONAIAgent - Transaction Simulator
 *
 * Shared transaction simulation utility used by custody providers.
 * Provides type-aware gas estimates and protocol-specific adjustments
 * instead of the previously hardcoded flat 50,000 estimate.
 */

import { TransactionRequest, TransactionSimulation } from '../security/types';

// Gas estimates per transaction type (in gas units)
const GAS_ESTIMATES: Record<string, number> = {
  transfer: 25000,
  nft_transfer: 30000,
  swap: 80000,
  provide_liquidity: 100000,
  remove_liquidity: 90000,
  stake: 60000,
  unstake: 65000,
  contract_call: 70000,
  deploy: 150000,
  other: 50000,
};

// Protocol-specific gas multipliers
const PROTOCOL_MULTIPLIERS: Record<string, number> = {
  dedust: 1.1,
  stonfi: 1.05,
};

/**
 * Estimates gas for a given transaction type and optional protocol.
 */
export function estimateGas(type: string, protocol?: string): number {
  const base = GAS_ESTIMATES[type] ?? GAS_ESTIMATES['other'];
  const multiplier = protocol ? (PROTOCOL_MULTIPLIERS[protocol] ?? 1.0) : 1.0;
  return Math.round(base * multiplier);
}

/**
 * Simulates a transaction and returns estimated gas, balance changes, and any
 * warnings or errors. Replaces the identical private simulateTransaction()
 * methods that existed in SmartContractWalletProvider and MPCCustodyProvider.
 */
export function simulateTransaction(
  request: TransactionRequest,
  protocol?: string
): TransactionSimulation {
  const gasEstimate = estimateGas(request.type, protocol ?? request.metadata?.protocol);

  return {
    success: true,
    gasEstimate,
    balanceChanges: request.amount
      ? [
          {
            token: request.amount.symbol,
            amount: request.amount.amount,
            direction: 'out',
          },
        ]
      : [],
    warnings: [],
    errors: [],
  };
}
