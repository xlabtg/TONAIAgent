/**
 * Blueprint configuration for TONAIAgent smart contracts.
 *
 * Documentation: https://github.com/ton-org/blueprint
 */

import { Config } from '@ton/blueprint';

export const config: Config = {
  /**
   * Network configuration.
   * Use 'testnet' during development; switch to 'mainnet' only after audit.
   */
  network: {
    endpoint: process.env.TON_RPC_URL ?? 'https://testnet.toncenter.com/api/v2/jsonRPC',
    type: (process.env.TON_NETWORK as 'testnet' | 'mainnet') ?? 'testnet',
    apiKey: process.env.TON_API_KEY,
  },
};
