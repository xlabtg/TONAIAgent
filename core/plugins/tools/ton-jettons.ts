/**
 * TONAIAgent - TON Jettons (Tokens) Plugin
 *
 * Jetton operations including:
 * - Balance checking
 * - Token transfers
 * - Token swaps
 * - Token information
 * - Staking operations
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
 * TON Jettons Plugin Manifest
 */
export const TON_JETTONS_MANIFEST: PluginManifest = {
  id: 'ton-jettons',
  name: 'TON Jettons',
  version: '1.0.0',
  description: 'Jetton (token) operations including transfers, swaps, staking, and liquidity provision',
  author: {
    name: 'TONAIAgent Team',
    organization: 'TONAIAgent',
  },
  category: 'ton-native',
  trustLevel: 'core' as PluginTrustLevel,
  keywords: ['ton', 'jetton', 'token', 'swap', 'defi', 'staking'],
  license: 'MIT',
  permissions: [
    {
      scope: 'jettons:read',
      reason: 'Read jetton balances and information',
      required: true,
    },
    {
      scope: 'jettons:transfer',
      reason: 'Transfer jettons between addresses',
      required: true,
    },
    {
      scope: 'jettons:swap',
      reason: 'Swap jettons on DEXes',
      required: true,
    },
    {
      scope: 'defi:stake',
      reason: 'Stake jettons for rewards',
      required: false,
    },
    {
      scope: 'defi:liquidity',
      reason: 'Provide liquidity to pools',
      required: false,
    },
    {
      scope: 'ton:sign',
      reason: 'Sign transactions',
      required: true,
    },
  ],
  capabilities: {
    tools: [
      // =======================================================================
      // Jetton Information
      // =======================================================================
      {
        name: 'jetton_get_info',
        description: 'Get information about a jetton (token) including name, symbol, supply, and metadata.',
        category: 'wallet' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            jettonAddress: {
              type: 'string',
              description: 'Jetton master contract address',
            },
          },
          required: ['jettonAddress'],
        },
        returns: {
          type: 'object',
          description: 'Jetton information',
          properties: {
            address: { type: 'string', description: 'Jetton master address' },
            name: { type: 'string', description: 'Token name' },
            symbol: { type: 'string', description: 'Token symbol' },
            decimals: { type: 'number', description: 'Token decimals' },
            totalSupply: { type: 'string', description: 'Total supply' },
            mintable: { type: 'boolean', description: 'Whether new tokens can be minted' },
            description: { type: 'string', description: 'Token description' },
            image: { type: 'string', description: 'Token image URL' },
          },
        },
        requiredPermissions: ['jettons:read'],
        examples: [
          {
            description: 'Get USDT jetton info',
            input: { jettonAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
            output: {
              address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
              name: 'Tether USD',
              symbol: 'USDT',
              decimals: 6,
              totalSupply: '1000000000000000',
              mintable: true,
              description: 'Tether USD on TON',
            },
          },
        ],
      },

      {
        name: 'jetton_get_balance',
        description: 'Get the jetton (token) balance for a wallet address.',
        category: 'wallet' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            walletAddress: {
              type: 'string',
              description: 'Wallet address to check balance for',
            },
            jettonAddress: {
              type: 'string',
              description: 'Jetton master contract address',
            },
          },
          required: ['walletAddress', 'jettonAddress'],
        },
        returns: {
          type: 'object',
          description: 'Jetton balance',
          properties: {
            walletAddress: { type: 'string', description: 'Wallet address' },
            jettonAddress: { type: 'string', description: 'Jetton address' },
            balance: { type: 'string', description: 'Balance in token units' },
            balanceRaw: { type: 'string', description: 'Raw balance (smallest unit)' },
            symbol: { type: 'string', description: 'Token symbol' },
            decimals: { type: 'number', description: 'Token decimals' },
          },
        },
        requiredPermissions: ['jettons:read'],
        examples: [
          {
            description: 'Get USDT balance',
            input: {
              walletAddress: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
              jettonAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
            },
            output: {
              walletAddress: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
              jettonAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
              balance: '100.5',
              balanceRaw: '100500000',
              symbol: 'USDT',
              decimals: 6,
            },
          },
        ],
      },

      // =======================================================================
      // Jetton Transfers
      // =======================================================================
      {
        name: 'jetton_transfer',
        description: 'Transfer jettons (tokens) to another address.',
        category: 'transaction' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            jettonAddress: {
              type: 'string',
              description: 'Jetton master contract address',
            },
            to: {
              type: 'string',
              description: 'Recipient wallet address',
            },
            amount: {
              type: 'string',
              description: 'Amount to transfer in token units (e.g., "100.5")',
            },
            message: {
              type: 'string',
              description: 'Optional forward message',
              maxLength: 256,
            },
          },
          required: ['jettonAddress', 'to', 'amount'],
        },
        returns: {
          type: 'object',
          description: 'Transfer result',
          properties: {
            success: { type: 'boolean', description: 'Whether transfer succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            fee: { type: 'string', description: 'Transaction fee in TON' },
            jettonAmount: { type: 'string', description: 'Amount transferred' },
          },
        },
        requiredPermissions: ['jettons:transfer', 'ton:sign'],
        requiresConfirmation: true,
        estimatedDurationMs: 15000,
        retryable: true,
        maxRetries: 3,
        safetyConstraints: {
          maxValuePerExecution: 100000, // Max 100k tokens per transaction
        },
        examples: [
          {
            description: 'Send 100 USDT',
            input: {
              jettonAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
              to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
              amount: '100',
            },
            output: {
              success: true,
              txHash: 'abc123...',
              fee: '0.05',
              jettonAmount: '100',
            },
          },
        ],
      },

      // =======================================================================
      // Token Swaps
      // =======================================================================
      {
        name: 'jetton_swap',
        description: 'Swap one token for another using DEX aggregation. Finds the best route across multiple DEXes.',
        category: 'defi' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            fromToken: {
              type: 'string',
              description: 'Address of token to sell (use "TON" for native TON)',
            },
            toToken: {
              type: 'string',
              description: 'Address of token to buy (use "TON" for native TON)',
            },
            amount: {
              type: 'string',
              description: 'Amount to swap in source token units',
            },
            slippageTolerance: {
              type: 'number',
              description: 'Maximum acceptable slippage as percentage (default: 1)',
              minimum: 0.1,
              maximum: 50,
            },
            deadline: {
              type: 'number',
              description: 'Transaction deadline in seconds from now (default: 300)',
              minimum: 30,
              maximum: 3600,
            },
          },
          required: ['fromToken', 'toToken', 'amount'],
        },
        returns: {
          type: 'object',
          description: 'Swap result',
          properties: {
            success: { type: 'boolean', description: 'Whether swap succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            amountIn: { type: 'string', description: 'Amount of source token spent' },
            amountOut: { type: 'string', description: 'Amount of destination token received' },
            priceImpact: { type: 'number', description: 'Price impact percentage' },
            route: {
              type: 'array',
              description: 'Swap route taken',
              items: {
                type: 'object',
                properties: {
                  dex: { type: 'string', description: 'DEX name' },
                  poolAddress: { type: 'string', description: 'Pool address' },
                },
              },
            },
            fee: { type: 'string', description: 'Network fee in TON' },
          },
        },
        requiredPermissions: ['jettons:swap', 'ton:sign'],
        requiresConfirmation: true,
        estimatedDurationMs: 20000,
        retryable: false,
        safetyConstraints: {
          maxValuePerExecution: 10000, // Max $10k equivalent per swap
        },
        examples: [
          {
            description: 'Swap 100 USDT for TON',
            input: {
              fromToken: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
              toToken: 'TON',
              amount: '100',
              slippageTolerance: 1,
            },
            output: {
              success: true,
              txHash: 'abc123...',
              amountIn: '100',
              amountOut: '45.5',
              priceImpact: 0.12,
              route: [{ dex: 'STON.fi', poolAddress: 'EQ...' }],
              fee: '0.1',
            },
          },
        ],
      },

      {
        name: 'jetton_get_swap_quote',
        description: 'Get a quote for a token swap without executing it. Useful for price comparison.',
        category: 'defi' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            fromToken: {
              type: 'string',
              description: 'Address of token to sell (use "TON" for native TON)',
            },
            toToken: {
              type: 'string',
              description: 'Address of token to buy (use "TON" for native TON)',
            },
            amount: {
              type: 'string',
              description: 'Amount to swap in source token units',
            },
          },
          required: ['fromToken', 'toToken', 'amount'],
        },
        returns: {
          type: 'object',
          description: 'Swap quote',
          properties: {
            fromToken: { type: 'string', description: 'Source token' },
            toToken: { type: 'string', description: 'Destination token' },
            amountIn: { type: 'string', description: 'Input amount' },
            amountOut: { type: 'string', description: 'Expected output amount' },
            exchangeRate: { type: 'string', description: 'Exchange rate' },
            priceImpact: { type: 'number', description: 'Price impact percentage' },
            routes: {
              type: 'array',
              description: 'Available routes',
              items: {
                type: 'object',
                properties: {
                  dex: { type: 'string', description: 'DEX name' },
                  amountOut: { type: 'string', description: 'Output amount via this route' },
                },
              },
            },
            validUntil: { type: 'number', description: 'Quote validity timestamp' },
          },
        },
        requiredPermissions: ['jettons:read'],
        examples: [
          {
            description: 'Get quote for USDT to TON swap',
            input: {
              fromToken: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
              toToken: 'TON',
              amount: '100',
            },
            output: {
              fromToken: 'USDT',
              toToken: 'TON',
              amountIn: '100',
              amountOut: '45.5',
              exchangeRate: '0.455',
              priceImpact: 0.12,
              routes: [
                { dex: 'STON.fi', amountOut: '45.5' },
                { dex: 'DeDust', amountOut: '45.3' },
              ],
              validUntil: 1708445100,
            },
          },
        ],
      },

      // =======================================================================
      // Staking
      // =======================================================================
      {
        name: 'jetton_stake',
        description: 'Stake tokens in a staking pool to earn rewards.',
        category: 'defi' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            poolAddress: {
              type: 'string',
              description: 'Staking pool contract address',
            },
            amount: {
              type: 'string',
              description: 'Amount to stake in token units',
            },
            lockPeriod: {
              type: 'number',
              description: 'Lock period in days (if applicable)',
              minimum: 0,
            },
          },
          required: ['poolAddress', 'amount'],
        },
        returns: {
          type: 'object',
          description: 'Staking result',
          properties: {
            success: { type: 'boolean', description: 'Whether staking succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            stakedAmount: { type: 'string', description: 'Amount staked' },
            expectedApy: { type: 'number', description: 'Expected APY percentage' },
            unlockDate: { type: 'number', description: 'Unlock timestamp if locked' },
          },
        },
        requiredPermissions: ['defi:stake', 'ton:sign'],
        requiresConfirmation: true,
        estimatedDurationMs: 15000,
        examples: [
          {
            description: 'Stake 1000 tokens',
            input: {
              poolAddress: 'EQ...staking_pool',
              amount: '1000',
              lockPeriod: 30,
            },
            output: {
              success: true,
              txHash: 'abc123...',
              stakedAmount: '1000',
              expectedApy: 12.5,
              unlockDate: 1711123200,
            },
          },
        ],
      },

      {
        name: 'jetton_unstake',
        description: 'Unstake tokens from a staking pool.',
        category: 'defi' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            poolAddress: {
              type: 'string',
              description: 'Staking pool contract address',
            },
            amount: {
              type: 'string',
              description: 'Amount to unstake (use "all" for full unstake)',
            },
          },
          required: ['poolAddress'],
        },
        returns: {
          type: 'object',
          description: 'Unstaking result',
          properties: {
            success: { type: 'boolean', description: 'Whether unstaking succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            unstakedAmount: { type: 'string', description: 'Amount unstaked' },
            rewardsClaimed: { type: 'string', description: 'Rewards claimed' },
            pendingUnstake: { type: 'boolean', description: 'Whether unstake is pending' },
            availableAt: { type: 'number', description: 'When tokens will be available' },
          },
        },
        requiredPermissions: ['defi:stake', 'ton:sign'],
        requiresConfirmation: true,
        estimatedDurationMs: 15000,
        examples: [
          {
            description: 'Unstake all tokens',
            input: {
              poolAddress: 'EQ...staking_pool',
              amount: 'all',
            },
            output: {
              success: true,
              txHash: 'abc123...',
              unstakedAmount: '1000',
              rewardsClaimed: '25',
              pendingUnstake: false,
            },
          },
        ],
      },

      {
        name: 'jetton_get_staking_info',
        description: 'Get staking information for a wallet in a specific pool.',
        category: 'defi' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            poolAddress: {
              type: 'string',
              description: 'Staking pool contract address',
            },
            walletAddress: {
              type: 'string',
              description: 'Wallet address to check',
            },
          },
          required: ['poolAddress', 'walletAddress'],
        },
        returns: {
          type: 'object',
          description: 'Staking information',
          properties: {
            stakedBalance: { type: 'string', description: 'Amount currently staked' },
            pendingRewards: { type: 'string', description: 'Pending rewards to claim' },
            totalRewardsClaimed: { type: 'string', description: 'Total rewards claimed' },
            stakingApy: { type: 'number', description: 'Current APY' },
            lockEndTime: { type: 'number', description: 'Lock end timestamp if locked' },
            poolTvl: { type: 'string', description: 'Total pool TVL' },
          },
        },
        requiredPermissions: ['defi:stake'],
        examples: [
          {
            description: 'Get staking info',
            input: {
              poolAddress: 'EQ...staking_pool',
              walletAddress: 'EQ...wallet',
            },
            output: {
              stakedBalance: '1000',
              pendingRewards: '5.5',
              totalRewardsClaimed: '25',
              stakingApy: 12.5,
              poolTvl: '5000000',
            },
          },
        ],
      },

      // =======================================================================
      // Portfolio
      // =======================================================================
      {
        name: 'jetton_get_portfolio',
        description: 'Get all jetton balances for a wallet address.',
        category: 'wallet' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            walletAddress: {
              type: 'string',
              description: 'Wallet address to check',
            },
            includeZeroBalances: {
              type: 'boolean',
              description: 'Include tokens with zero balance (default: false)',
            },
          },
          required: ['walletAddress'],
        },
        returns: {
          type: 'object',
          description: 'Portfolio information',
          properties: {
            walletAddress: { type: 'string', description: 'Wallet address' },
            totalValueUsd: { type: 'string', description: 'Total portfolio value in USD' },
            tokens: {
              type: 'array',
              description: 'Token holdings',
              items: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Token symbol' },
                  name: { type: 'string', description: 'Token name' },
                  address: { type: 'string', description: 'Token address' },
                  balance: { type: 'string', description: 'Balance' },
                  valueUsd: { type: 'string', description: 'Value in USD' },
                  priceUsd: { type: 'string', description: 'Token price in USD' },
                  change24h: { type: 'number', description: '24h price change %' },
                },
              },
            },
          },
        },
        requiredPermissions: ['jettons:read'],
        examples: [
          {
            description: 'Get wallet token portfolio',
            input: { walletAddress: 'EQ...wallet' },
            output: {
              walletAddress: 'EQ...wallet',
              totalValueUsd: '1523.45',
              tokens: [
                {
                  symbol: 'USDT',
                  name: 'Tether USD',
                  address: 'EQ...',
                  balance: '1000',
                  valueUsd: '1000',
                  priceUsd: '1.00',
                  change24h: 0.01,
                },
                {
                  symbol: 'TON',
                  name: 'Toncoin',
                  address: 'native',
                  balance: '100',
                  valueUsd: '523.45',
                  priceUsd: '5.2345',
                  change24h: 2.5,
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
 * Get jetton info handler
 */
export const getJettonInfoHandler: ToolHandler = async (params, context) => {
  const { jettonAddress } = params as { jettonAddress: string };

  context.logger.info('Getting jetton info', { jettonAddress });

  const info = await context.ton.getJettonInfo(jettonAddress);

  return {
    address: info.address,
    name: info.name,
    symbol: info.symbol,
    decimals: info.decimals,
    totalSupply: info.totalSupply,
    mintable: info.mintable,
    description: info.metadata?.description,
    image: info.metadata?.image,
  };
};

/**
 * Get jetton balance handler
 */
export const getJettonBalanceHandler: ToolHandler = async (params, context) => {
  const { walletAddress, jettonAddress } = params as {
    walletAddress: string;
    jettonAddress: string;
  };

  context.logger.info('Getting jetton balance', { walletAddress, jettonAddress });

  const [info, balanceRaw] = await Promise.all([
    context.ton.getJettonInfo(jettonAddress),
    context.ton.getJettonBalance(walletAddress, jettonAddress),
  ]);

  const divisor = BigInt(10 ** info.decimals);
  const balance = (BigInt(balanceRaw) / divisor).toString();

  return {
    walletAddress,
    jettonAddress,
    balance,
    balanceRaw,
    symbol: info.symbol,
    decimals: info.decimals,
  };
};

/**
 * Transfer jetton handler
 */
export const transferJettonHandler: ToolHandler = async (params, context) => {
  const { jettonAddress, to, amount, message } = params as {
    jettonAddress: string;
    to: string;
    amount: string;
    message?: string;
  };

  context.logger.info('Initiating jetton transfer', { jettonAddress, to, amount });

  // Get jetton info for decimals
  const info = await context.ton.getJettonInfo(jettonAddress);

  // Convert to raw amount
  const [whole, decimal = '0'] = amount.split('.');
  const multiplier = BigInt(10 ** info.decimals);
  const rawAmount = BigInt(whole) * multiplier +
    BigInt(decimal.padEnd(info.decimals, '0').slice(0, info.decimals));

  // Prepare and simulate transaction (simplified)
  const preparedTx = await context.ton.prepareTransaction({
    to: jettonAddress,
    value: '50000000', // 0.05 TON for fees
    payload: JSON.stringify({
      op: 'transfer',
      destination: to,
      amount: rawAmount.toString(),
      forwardPayload: message,
    }),
  });

  const simulation = await context.ton.simulateTransaction(preparedTx);

  if (!simulation.success) {
    throw new Error(`Transaction simulation failed: ${simulation.resultMessage}`);
  }

  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    fee: '0.05',
    jettonAmount: amount,
    simulated: true,
  };
};

/**
 * Swap handler
 */
export const swapHandler: ToolHandler = async (params, context) => {
  const { fromToken, toToken, amount, slippageTolerance: _slippageTolerance = 1 } = params as {
    fromToken: string;
    toToken: string;
    amount: string;
    slippageTolerance?: number;
  };
  void _slippageTolerance; // Used in production for DEX price calculations

  context.logger.info('Initiating swap', { fromToken, toToken, amount });

  // In production, this would call DEX aggregator APIs
  // Simulated response for demonstration
  const simulatedRate = 0.455; // Example: 1 USDT = 0.455 TON
  const amountOut = (parseFloat(amount) * simulatedRate).toFixed(4);

  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    amountIn: amount,
    amountOut,
    priceImpact: 0.12,
    route: [
      { dex: 'STON.fi', poolAddress: 'EQ...pool' },
    ],
    fee: '0.1',
    simulated: true,
  };
};

/**
 * Get swap quote handler
 */
export const getSwapQuoteHandler: ToolHandler = async (params, context) => {
  const { fromToken, toToken, amount } = params as {
    fromToken: string;
    toToken: string;
    amount: string;
  };

  context.logger.info('Getting swap quote', { fromToken, toToken, amount });

  // Simulated quote
  const simulatedRate = 0.455;
  const amountOut = (parseFloat(amount) * simulatedRate).toFixed(4);

  return {
    fromToken: fromToken === 'TON' ? 'TON' : 'TOKEN',
    toToken: toToken === 'TON' ? 'TON' : 'TOKEN',
    amountIn: amount,
    amountOut,
    exchangeRate: simulatedRate.toString(),
    priceImpact: 0.12,
    routes: [
      { dex: 'STON.fi', amountOut },
      { dex: 'DeDust', amountOut: (parseFloat(amountOut) * 0.995).toFixed(4) },
    ],
    validUntil: Math.floor(Date.now() / 1000) + 300,
  };
};

/**
 * Stake handler
 */
export const stakeHandler: ToolHandler = async (params, context) => {
  const { poolAddress, amount, lockPeriod } = params as {
    poolAddress: string;
    amount: string;
    lockPeriod?: number;
  };

  context.logger.info('Staking tokens', { poolAddress, amount, lockPeriod });

  const unlockDate = lockPeriod
    ? Math.floor(Date.now() / 1000) + lockPeriod * 24 * 60 * 60
    : undefined;

  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    stakedAmount: amount,
    expectedApy: 12.5,
    unlockDate,
    simulated: true,
  };
};

/**
 * Unstake handler
 */
export const unstakeHandler: ToolHandler = async (params, context) => {
  const { poolAddress, amount } = params as {
    poolAddress: string;
    amount?: string;
  };

  context.logger.info('Unstaking tokens', { poolAddress, amount });

  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    unstakedAmount: amount ?? '1000',
    rewardsClaimed: '25',
    pendingUnstake: false,
    simulated: true,
  };
};

/**
 * Get staking info handler
 */
export const getStakingInfoHandler: ToolHandler = async (params, context) => {
  const { poolAddress, walletAddress } = params as {
    poolAddress: string;
    walletAddress: string;
  };

  context.logger.info('Getting staking info', { poolAddress, walletAddress });

  return {
    stakedBalance: '1000',
    pendingRewards: '5.5',
    totalRewardsClaimed: '25',
    stakingApy: 12.5,
    poolTvl: '5000000',
  };
};

/**
 * Get portfolio handler
 */
export const getPortfolioHandler: ToolHandler = async (params, context) => {
  const { walletAddress, includeZeroBalances: _includeZeroBalances = false } = params as {
    walletAddress: string;
    includeZeroBalances?: boolean;
  };
  void _includeZeroBalances; // Used in production to filter zero-balance tokens

  context.logger.info('Getting portfolio', { walletAddress });

  // In production, would fetch all token balances
  return {
    walletAddress,
    totalValueUsd: '1523.45',
    tokens: [
      {
        symbol: 'TON',
        name: 'Toncoin',
        address: 'native',
        balance: '100',
        valueUsd: '523.45',
        priceUsd: '5.2345',
        change24h: 2.5,
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        balance: '1000',
        valueUsd: '1000',
        priceUsd: '1.00',
        change24h: 0.01,
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
export const TON_JETTONS_HANDLERS: Record<string, ToolHandler> = {
  jetton_get_info: getJettonInfoHandler,
  jetton_get_balance: getJettonBalanceHandler,
  jetton_transfer: transferJettonHandler,
  jetton_swap: swapHandler,
  jetton_get_swap_quote: getSwapQuoteHandler,
  jetton_stake: stakeHandler,
  jetton_unstake: unstakeHandler,
  jetton_get_staking_info: getStakingInfoHandler,
  jetton_get_portfolio: getPortfolioHandler,
};
