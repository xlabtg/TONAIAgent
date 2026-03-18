/**
 * TONAIAgent - TON NFT Tools Plugin
 *
 * NFT operations including:
 * - Collection information
 * - NFT metadata
 * - NFT transfers
 * - Marketplace integration
 * - NFT listing and buying
 */

import {
  PluginManifest,
  ToolCategory,
  PluginTrustLevel,
} from '../types';
import { ToolHandler } from '../runtime';

// ============================================================================
// Plugin Manifest
// ============================================================================

/**
 * TON NFT Plugin Manifest
 */
export const TON_NFT_MANIFEST: PluginManifest = {
  id: 'ton-nft',
  name: 'TON NFT',
  version: '1.0.0',
  description: 'NFT operations including viewing, transferring, and marketplace integration',
  author: {
    name: 'TONAIAgent Team',
    organization: 'TONAIAgent',
  },
  category: 'ton-native',
  trustLevel: 'core' as PluginTrustLevel,
  keywords: ['ton', 'nft', 'collection', 'marketplace', 'transfer'],
  license: 'MIT',
  permissions: [
    {
      scope: 'nft:read',
      reason: 'Read NFT data and metadata',
      required: true,
    },
    {
      scope: 'nft:transfer',
      reason: 'Transfer NFTs between addresses',
      required: true,
    },
    {
      scope: 'ton:sign',
      reason: 'Sign NFT transactions',
      required: true,
    },
  ],
  capabilities: {
    tools: [
      // =======================================================================
      // NFT Information
      // =======================================================================
      {
        name: 'nft_get_info',
        description: 'Get detailed information about a specific NFT including metadata, owner, and collection.',
        category: 'utility' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            nftAddress: {
              type: 'string',
              description: 'NFT item contract address',
            },
          },
          required: ['nftAddress'],
        },
        returns: {
          type: 'object',
          description: 'NFT information',
          properties: {
            address: { type: 'string', description: 'NFT address' },
            collectionAddress: { type: 'string', description: 'Collection address' },
            collectionName: { type: 'string', description: 'Collection name' },
            index: { type: 'number', description: 'NFT index in collection' },
            ownerAddress: { type: 'string', description: 'Current owner address' },
            name: { type: 'string', description: 'NFT name' },
            description: { type: 'string', description: 'NFT description' },
            image: { type: 'string', description: 'NFT image URL' },
            attributes: {
              type: 'array',
              description: 'NFT attributes/traits',
              items: {
                type: 'object',
                properties: {
                  trait_type: { type: 'string', description: 'Trait name' },
                  value: { type: 'string', description: 'Trait value' },
                },
              },
            },
          },
        },
        requiredPermissions: ['nft:read'],
        examples: [
          {
            description: 'Get NFT information',
            input: { nftAddress: 'EQ...nft' },
            output: {
              address: 'EQ...nft',
              collectionAddress: 'EQ...collection',
              collectionName: 'TON Punks',
              index: 42,
              ownerAddress: 'EQ...owner',
              name: 'TON Punk #42',
              description: 'A unique punk on TON',
              image: 'https://example.com/punk42.png',
              attributes: [
                { trait_type: 'Background', value: 'Blue' },
                { trait_type: 'Accessory', value: 'Laser Eyes' },
              ],
            },
          },
        ],
      },

      {
        name: 'nft_get_collection',
        description: 'Get information about an NFT collection.',
        category: 'utility' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            collectionAddress: {
              type: 'string',
              description: 'Collection contract address',
            },
          },
          required: ['collectionAddress'],
        },
        returns: {
          type: 'object',
          description: 'Collection information',
          properties: {
            address: { type: 'string', description: 'Collection address' },
            name: { type: 'string', description: 'Collection name' },
            description: { type: 'string', description: 'Collection description' },
            image: { type: 'string', description: 'Collection image URL' },
            ownerAddress: { type: 'string', description: 'Collection owner/creator' },
            totalSupply: { type: 'number', description: 'Total NFTs in collection' },
            floorPrice: { type: 'string', description: 'Floor price in TON' },
            totalVolume: { type: 'string', description: 'Total trading volume in TON' },
          },
        },
        requiredPermissions: ['nft:read'],
        examples: [
          {
            description: 'Get collection info',
            input: { collectionAddress: 'EQ...collection' },
            output: {
              address: 'EQ...collection',
              name: 'TON Punks',
              description: 'The first punks on TON',
              image: 'https://example.com/collection.png',
              ownerAddress: 'EQ...creator',
              totalSupply: 10000,
              floorPrice: '5.5',
              totalVolume: '125000',
            },
          },
        ],
      },

      // =======================================================================
      // NFT Ownership
      // =======================================================================
      {
        name: 'nft_get_owned',
        description: 'Get all NFTs owned by a wallet address.',
        category: 'wallet' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            walletAddress: {
              type: 'string',
              description: 'Wallet address to check',
            },
            collectionAddress: {
              type: 'string',
              description: 'Optional: filter by specific collection',
            },
            limit: {
              type: 'number',
              description: 'Maximum NFTs to return (default: 50)',
              minimum: 1,
              maximum: 200,
            },
          },
          required: ['walletAddress'],
        },
        returns: {
          type: 'object',
          description: 'Owned NFTs',
          properties: {
            walletAddress: { type: 'string', description: 'Wallet address' },
            totalCount: { type: 'number', description: 'Total NFTs owned' },
            nfts: {
              type: 'array',
              description: 'List of owned NFTs',
              items: {
                type: 'object',
                properties: {
                  address: { type: 'string', description: 'NFT address' },
                  collectionName: { type: 'string', description: 'Collection name' },
                  name: { type: 'string', description: 'NFT name' },
                  image: { type: 'string', description: 'NFT image' },
                  estimatedValue: { type: 'string', description: 'Estimated value in TON' },
                },
              },
            },
            totalEstimatedValue: { type: 'string', description: 'Total estimated value' },
          },
        },
        requiredPermissions: ['nft:read'],
        examples: [
          {
            description: 'Get owned NFTs',
            input: { walletAddress: 'EQ...wallet' },
            output: {
              walletAddress: 'EQ...wallet',
              totalCount: 3,
              nfts: [
                {
                  address: 'EQ...nft1',
                  collectionName: 'TON Punks',
                  name: 'TON Punk #42',
                  image: 'https://example.com/punk42.png',
                  estimatedValue: '10',
                },
              ],
              totalEstimatedValue: '25',
            },
          },
        ],
      },

      // =======================================================================
      // NFT Transfer
      // =======================================================================
      {
        name: 'nft_transfer',
        description: 'Transfer an NFT to another address.',
        category: 'transaction' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            nftAddress: {
              type: 'string',
              description: 'NFT item contract address',
            },
            to: {
              type: 'string',
              description: 'Recipient wallet address',
            },
            forwardAmount: {
              type: 'string',
              description: 'Amount of TON to forward with transfer (default: 0.05)',
            },
            message: {
              type: 'string',
              description: 'Optional message to include with transfer',
            },
          },
          required: ['nftAddress', 'to'],
        },
        returns: {
          type: 'object',
          description: 'Transfer result',
          properties: {
            success: { type: 'boolean', description: 'Whether transfer succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            nftAddress: { type: 'string', description: 'Transferred NFT address' },
            from: { type: 'string', description: 'Previous owner' },
            to: { type: 'string', description: 'New owner' },
            fee: { type: 'string', description: 'Transaction fee in TON' },
          },
        },
        requiredPermissions: ['nft:transfer', 'ton:sign'],
        requiresConfirmation: true,
        estimatedDurationMs: 15000,
        retryable: true,
        maxRetries: 3,
        examples: [
          {
            description: 'Transfer an NFT',
            input: {
              nftAddress: 'EQ...nft',
              to: 'EQ...recipient',
            },
            output: {
              success: true,
              txHash: 'abc123...',
              nftAddress: 'EQ...nft',
              from: 'EQ...sender',
              to: 'EQ...recipient',
              fee: '0.05',
            },
          },
        ],
      },

      // =======================================================================
      // Marketplace Operations
      // =======================================================================
      {
        name: 'nft_list_for_sale',
        description: 'List an NFT for sale on a marketplace.',
        category: 'trading' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            nftAddress: {
              type: 'string',
              description: 'NFT item contract address',
            },
            price: {
              type: 'string',
              description: 'Listing price in TON',
            },
            marketplace: {
              type: 'string',
              description: 'Marketplace to list on (default: getgems)',
              enum: ['getgems', 'fragment', 'ton.diamonds'],
            },
          },
          required: ['nftAddress', 'price'],
        },
        returns: {
          type: 'object',
          description: 'Listing result',
          properties: {
            success: { type: 'boolean', description: 'Whether listing succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            listingUrl: { type: 'string', description: 'URL to view listing' },
            saleContract: { type: 'string', description: 'Sale contract address' },
            price: { type: 'string', description: 'Listing price' },
            marketplaceFee: { type: 'number', description: 'Marketplace fee percentage' },
          },
        },
        requiredPermissions: ['nft:transfer', 'ton:sign'],
        requiresConfirmation: true,
        estimatedDurationMs: 20000,
        examples: [
          {
            description: 'List NFT for 10 TON',
            input: {
              nftAddress: 'EQ...nft',
              price: '10',
              marketplace: 'getgems',
            },
            output: {
              success: true,
              txHash: 'abc123...',
              listingUrl: 'https://getgems.io/nft/EQ...nft',
              saleContract: 'EQ...sale',
              price: '10',
              marketplaceFee: 2.5,
            },
          },
        ],
      },

      {
        name: 'nft_cancel_listing',
        description: 'Cancel an NFT listing and retrieve the NFT.',
        category: 'trading' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            saleContract: {
              type: 'string',
              description: 'Sale contract address from the listing',
            },
          },
          required: ['saleContract'],
        },
        returns: {
          type: 'object',
          description: 'Cancellation result',
          properties: {
            success: { type: 'boolean', description: 'Whether cancellation succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            nftAddress: { type: 'string', description: 'Retrieved NFT address' },
          },
        },
        requiredPermissions: ['nft:transfer', 'ton:sign'],
        requiresConfirmation: true,
        examples: [
          {
            description: 'Cancel NFT listing',
            input: { saleContract: 'EQ...sale' },
            output: {
              success: true,
              txHash: 'abc123...',
              nftAddress: 'EQ...nft',
            },
          },
        ],
      },

      {
        name: 'nft_buy',
        description: 'Buy an NFT that is listed for sale.',
        category: 'trading' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            saleContract: {
              type: 'string',
              description: 'Sale contract address',
            },
            maxPrice: {
              type: 'string',
              description: 'Maximum price willing to pay in TON',
            },
          },
          required: ['saleContract'],
        },
        returns: {
          type: 'object',
          description: 'Purchase result',
          properties: {
            success: { type: 'boolean', description: 'Whether purchase succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            nftAddress: { type: 'string', description: 'Purchased NFT address' },
            price: { type: 'string', description: 'Price paid in TON' },
            fee: { type: 'string', description: 'Transaction fee in TON' },
          },
        },
        requiredPermissions: ['nft:transfer', 'ton:sign', 'wallet:transfer'],
        requiresConfirmation: true,
        estimatedDurationMs: 15000,
        safetyConstraints: {
          maxValuePerExecution: 1000, // Max 1000 TON per purchase
        },
        examples: [
          {
            description: 'Buy an NFT',
            input: {
              saleContract: 'EQ...sale',
              maxPrice: '15',
            },
            output: {
              success: true,
              txHash: 'abc123...',
              nftAddress: 'EQ...nft',
              price: '10',
              fee: '0.1',
            },
          },
        ],
      },

      {
        name: 'nft_search_listings',
        description: 'Search for NFT listings on marketplaces.',
        category: 'trading' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            collectionAddress: {
              type: 'string',
              description: 'Filter by collection address',
            },
            minPrice: {
              type: 'string',
              description: 'Minimum price in TON',
            },
            maxPrice: {
              type: 'string',
              description: 'Maximum price in TON',
            },
            sortBy: {
              type: 'string',
              description: 'Sort order',
              enum: ['price_asc', 'price_desc', 'recent', 'ending_soon'],
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 20)',
              minimum: 1,
              maximum: 100,
            },
          },
        },
        returns: {
          type: 'object',
          description: 'Search results',
          properties: {
            totalResults: { type: 'number', description: 'Total matching listings' },
            listings: {
              type: 'array',
              description: 'NFT listings',
              items: {
                type: 'object',
                properties: {
                  nftAddress: { type: 'string', description: 'NFT address' },
                  saleContract: { type: 'string', description: 'Sale contract' },
                  collectionName: { type: 'string', description: 'Collection name' },
                  name: { type: 'string', description: 'NFT name' },
                  image: { type: 'string', description: 'NFT image' },
                  price: { type: 'string', description: 'Price in TON' },
                  seller: { type: 'string', description: 'Seller address' },
                  marketplace: { type: 'string', description: 'Marketplace name' },
                },
              },
            },
          },
        },
        requiredPermissions: ['nft:read'],
        examples: [
          {
            description: 'Search for NFTs under 10 TON',
            input: {
              collectionAddress: 'EQ...collection',
              maxPrice: '10',
              sortBy: 'price_asc',
            },
            output: {
              totalResults: 42,
              listings: [
                {
                  nftAddress: 'EQ...nft',
                  saleContract: 'EQ...sale',
                  collectionName: 'TON Punks',
                  name: 'TON Punk #123',
                  image: 'https://example.com/punk123.png',
                  price: '5.5',
                  seller: 'EQ...seller',
                  marketplace: 'getgems',
                },
              ],
            },
          },
        ],
      },
    ],
  },
};

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Get NFT info handler
 */
export const getNftInfoHandler: ToolHandler = async (params, context) => {
  const { nftAddress } = params as { nftAddress: string };

  context.logger.info('Getting NFT info', { nftAddress });

  const info = await context.ton.getNftInfo(nftAddress);

  return {
    address: info.address,
    collectionAddress: info.collectionAddress,
    collectionName: 'TON Collection', // In production, fetch from collection
    index: info.index,
    ownerAddress: info.ownerAddress,
    name: info.metadata.name ?? `NFT #${info.index}`,
    description: info.metadata.description,
    image: info.metadata.image,
    attributes: info.metadata.attributes ?? [],
  };
};

/**
 * Get collection handler
 */
export const getCollectionHandler: ToolHandler = async (params, context) => {
  const { collectionAddress } = params as { collectionAddress: string };

  context.logger.info('Getting collection info', { collectionAddress });

  const _state = await context.ton.getContractState(collectionAddress);
  void _state; // Used in production to parse collection metadata

  // In production, parse collection data properly
  return {
    address: collectionAddress,
    name: 'TON Collection',
    description: 'A collection on TON',
    image: 'https://example.com/collection.png',
    ownerAddress: 'EQ...creator',
    totalSupply: 10000,
    floorPrice: '5.5',
    totalVolume: '125000',
  };
};

/**
 * Get owned NFTs handler
 */
export const getOwnedNftsHandler: ToolHandler = async (params, context) => {
  const { walletAddress, collectionAddress: _collectionAddress, limit: _limit = 50 } = params as {
    walletAddress: string;
    collectionAddress?: string;
    limit?: number;
  };
  void _collectionAddress; // Used in production to filter by collection
  void _limit; // Used in production for pagination

  context.logger.info('Getting owned NFTs', { walletAddress });

  // In production, query indexer for owned NFTs
  return {
    walletAddress,
    totalCount: 3,
    nfts: [
      {
        address: 'EQ...nft1',
        collectionName: 'TON Punks',
        name: 'TON Punk #42',
        image: 'https://example.com/punk42.png',
        estimatedValue: '10',
      },
      {
        address: 'EQ...nft2',
        collectionName: 'TON Apes',
        name: 'TON Ape #101',
        image: 'https://example.com/ape101.png',
        estimatedValue: '15',
      },
    ],
    totalEstimatedValue: '25',
  };
};

/**
 * Transfer NFT handler
 */
export const transferNftHandler: ToolHandler = async (params, context) => {
  const { nftAddress, to, forwardAmount = '0.05', message } = params as {
    nftAddress: string;
    to: string;
    forwardAmount?: string;
    message?: string;
  };

  context.logger.info('Transferring NFT', { nftAddress, to });

  const preparedTx = await context.ton.prepareTransaction({
    to: nftAddress,
    value: '100000000', // 0.1 TON for fees
    payload: JSON.stringify({
      op: 'transfer',
      new_owner: to,
      forward_amount: forwardAmount,
      forward_payload: message,
    }),
  });

  const simulation = await context.ton.simulateTransaction(preparedTx);

  if (!simulation.success) {
    throw new Error(`Transfer simulation failed: ${simulation.resultMessage}`);
  }

  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    nftAddress,
    from: 'EQ...sender',
    to,
    fee: '0.05',
    simulated: true,
  };
};

/**
 * List NFT for sale handler
 */
export const listForSaleHandler: ToolHandler = async (params, context) => {
  const { nftAddress, price, marketplace = 'getgems' } = params as {
    nftAddress: string;
    price: string;
    marketplace?: string;
  };

  context.logger.info('Listing NFT for sale', { nftAddress, price, marketplace });

  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    listingUrl: `https://${marketplace}.io/nft/${nftAddress}`,
    saleContract: `EQ...sale_${Date.now()}`,
    price,
    marketplaceFee: 2.5,
    simulated: true,
  };
};

/**
 * Cancel listing handler
 */
export const cancelListingHandler: ToolHandler = async (params, context) => {
  const { saleContract } = params as { saleContract: string };

  context.logger.info('Cancelling NFT listing', { saleContract });

  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    nftAddress: 'EQ...nft',
    simulated: true,
  };
};

/**
 * Buy NFT handler
 */
export const buyNftHandler: ToolHandler = async (params, context) => {
  const { saleContract, maxPrice: _maxPrice } = params as {
    saleContract: string;
    maxPrice?: string;
  };
  void _maxPrice; // Used in production for price validation

  context.logger.info('Buying NFT', { saleContract });

  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    nftAddress: 'EQ...nft',
    price: '10',
    fee: '0.1',
    simulated: true,
  };
};

/**
 * Search listings handler
 */
export const searchListingsHandler: ToolHandler = async (params, context) => {
  const { collectionAddress: _collectionAddr, minPrice: _minPrice, maxPrice: _maxPriceFilter, sortBy = 'price_asc', limit: _listLimit = 20 } = params as {
    collectionAddress?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: string;
    limit?: number;
  };
  void _collectionAddr; // Used in production to filter by collection
  void _minPrice; // Used in production for price filtering
  void _maxPriceFilter; // Used in production for price filtering
  void _listLimit; // Used in production for pagination

  context.logger.info('Searching NFT listings', { sortBy });

  // In production, query marketplace APIs
  return {
    totalResults: 42,
    listings: [
      {
        nftAddress: 'EQ...nft1',
        saleContract: 'EQ...sale1',
        collectionName: 'TON Punks',
        name: 'TON Punk #123',
        image: 'https://example.com/punk123.png',
        price: '5.5',
        seller: 'EQ...seller1',
        marketplace: 'getgems',
      },
      {
        nftAddress: 'EQ...nft2',
        saleContract: 'EQ...sale2',
        collectionName: 'TON Punks',
        name: 'TON Punk #456',
        image: 'https://example.com/punk456.png',
        price: '7.2',
        seller: 'EQ...seller2',
        marketplace: 'getgems',
      },
    ],
  };
};

// ============================================================================
// Handler Map
// ============================================================================

/**
 * Map of tool names to their handlers
 */
export const TON_NFT_HANDLERS: Record<string, ToolHandler> = {
  nft_get_info: getNftInfoHandler,
  nft_get_collection: getCollectionHandler,
  nft_get_owned: getOwnedNftsHandler,
  nft_transfer: transferNftHandler,
  nft_list_for_sale: listForSaleHandler,
  nft_cancel_listing: cancelListingHandler,
  nft_buy: buyNftHandler,
  nft_search_listings: searchListingsHandler,
};
