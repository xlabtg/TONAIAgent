/**
 * TONAIAgent - Core Tools
 *
 * Export all built-in TON-native tools and plugins.
 */

// TON Wallet Tools
export {
  TON_WALLET_MANIFEST,
  TON_WALLET_HANDLERS,
  getBalanceHandler,
  transferHandler,
  batchTransferHandler,
  getAccountInfoHandler,
  getTransactionsHandler,
  simulateTransactionHandler,
  validateAddressHandler,
} from './ton-wallet';

// TON Jettons (Tokens) Tools
export {
  TON_JETTONS_MANIFEST,
  TON_JETTONS_HANDLERS,
  getJettonInfoHandler,
  getJettonBalanceHandler,
  transferJettonHandler,
  swapHandler,
  getSwapQuoteHandler,
  stakeHandler,
  unstakeHandler,
  getStakingInfoHandler,
  getPortfolioHandler,
} from './ton-jettons';

// TON NFT Tools
export {
  TON_NFT_MANIFEST,
  TON_NFT_HANDLERS,
  getNftInfoHandler,
  getCollectionHandler,
  getOwnedNftsHandler,
  transferNftHandler,
  listForSaleHandler,
  cancelListingHandler,
  buyNftHandler,
  searchListingsHandler,
} from './ton-nft';

// ============================================================================
// All Core Manifests
// ============================================================================

import { TON_WALLET_MANIFEST, TON_WALLET_HANDLERS } from './ton-wallet';
import { TON_JETTONS_MANIFEST, TON_JETTONS_HANDLERS } from './ton-jettons';
import { TON_NFT_MANIFEST, TON_NFT_HANDLERS } from './ton-nft';
import { PluginManifest } from '../types';
import { ToolHandler } from '../runtime';

/**
 * All core plugin manifests
 */
export const CORE_PLUGIN_MANIFESTS: PluginManifest[] = [
  TON_WALLET_MANIFEST,
  TON_JETTONS_MANIFEST,
  TON_NFT_MANIFEST,
];

/**
 * All core handlers mapped by plugin ID
 */
export const CORE_PLUGIN_HANDLERS: Record<string, Record<string, ToolHandler>> = {
  'ton-wallet': TON_WALLET_HANDLERS,
  'ton-jettons': TON_JETTONS_HANDLERS,
  'ton-nft': TON_NFT_HANDLERS,
};

/**
 * Get all core tools as a flat list
 */
export function getCoreTools(): Array<{
  pluginId: string;
  toolName: string;
  tool: PluginManifest['capabilities']['tools'][0];
}> {
  const tools: Array<{
    pluginId: string;
    toolName: string;
    tool: PluginManifest['capabilities']['tools'][0];
  }> = [];

  for (const manifest of CORE_PLUGIN_MANIFESTS) {
    for (const tool of manifest.capabilities.tools) {
      tools.push({
        pluginId: manifest.id,
        toolName: tool.name,
        tool,
      });
    }
  }

  return tools;
}

/**
 * Get a handler by plugin ID and tool name
 */
export function getHandler(
  pluginId: string,
  toolName: string
): ToolHandler | undefined {
  return CORE_PLUGIN_HANDLERS[pluginId]?.[toolName];
}
