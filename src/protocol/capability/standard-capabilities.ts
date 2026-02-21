/**
 * TONAIAgent - Open Agent Protocol Standard Capabilities
 *
 * Pre-defined standard capabilities for common operations.
 */

import {
  CapabilityDeclaration,
  CapabilityCategory,
} from '../types';

// ============================================================================
// Trading Capabilities
// ============================================================================

/**
 * Standard swap capability
 */
export const CAPABILITY_TRADING_SWAP: CapabilityDeclaration = {
  id: 'trading.swap',
  name: 'Token Swap',
  category: 'trading',
  description: 'Swap one token for another using DEX aggregation',
  requiredPermissions: ['trading.execute', 'wallet.sign'],
  resourceRequirements: {
    minCapital: 0,
    estimatedFees: 0.1,
  },
  inputSchema: {
    type: 'object',
    properties: {
      tokenIn: { type: 'string', description: 'Input token symbol or address' },
      tokenOut: { type: 'string', description: 'Output token symbol or address' },
      amount: { type: 'number', description: 'Amount to swap' },
      maxSlippage: { type: 'number', description: 'Maximum slippage percentage', default: 0.5 },
      deadline: { type: 'number', description: 'Transaction deadline timestamp' },
    },
    required: ['tokenIn', 'tokenOut', 'amount'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      amountOut: { type: 'number' },
      slippage: { type: 'number' },
      transactionHash: { type: 'string' },
      fees: { type: 'number' },
    },
  },
  riskLevel: 'medium',
  version: '1.0.0',
};

/**
 * Standard limit order capability
 */
export const CAPABILITY_TRADING_LIMIT_ORDER: CapabilityDeclaration = {
  id: 'trading.limit_order',
  name: 'Limit Order',
  category: 'trading',
  description: 'Place a limit order to buy or sell at a specific price',
  requiredPermissions: ['trading.execute', 'wallet.sign'],
  resourceRequirements: {
    minCapital: 0,
    estimatedFees: 0.05,
  },
  inputSchema: {
    type: 'object',
    properties: {
      tokenIn: { type: 'string' },
      tokenOut: { type: 'string' },
      amount: { type: 'number' },
      price: { type: 'number', description: 'Target price' },
      side: { type: 'string', enum: ['buy', 'sell'] },
      expiry: { type: 'number', description: 'Order expiry timestamp' },
    },
    required: ['tokenIn', 'tokenOut', 'amount', 'price', 'side'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      status: { type: 'string' },
      transactionHash: { type: 'string' },
    },
  },
  riskLevel: 'medium',
  version: '1.0.0',
};

// ============================================================================
// Yield Capabilities
// ============================================================================

/**
 * Standard stake capability
 */
export const CAPABILITY_YIELD_STAKE: CapabilityDeclaration = {
  id: 'yield.stake',
  name: 'Stake Tokens',
  category: 'yield',
  description: 'Stake tokens to earn yield',
  requiredPermissions: ['staking.execute', 'wallet.sign'],
  resourceRequirements: {
    minCapital: 1,
    estimatedFees: 0.1,
  },
  inputSchema: {
    type: 'object',
    properties: {
      token: { type: 'string', description: 'Token to stake' },
      amount: { type: 'number', description: 'Amount to stake' },
      validator: { type: 'string', description: 'Validator or pool address' },
      lockPeriod: { type: 'number', description: 'Lock period in seconds' },
    },
    required: ['token', 'amount'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      stakedAmount: { type: 'number' },
      expectedApy: { type: 'number' },
      unlockAt: { type: 'string' },
      transactionHash: { type: 'string' },
    },
  },
  riskLevel: 'low',
  version: '1.0.0',
};

/**
 * Standard unstake capability
 */
export const CAPABILITY_YIELD_UNSTAKE: CapabilityDeclaration = {
  id: 'yield.unstake',
  name: 'Unstake Tokens',
  category: 'yield',
  description: 'Unstake tokens from a staking position',
  requiredPermissions: ['staking.execute', 'wallet.sign'],
  resourceRequirements: {
    estimatedFees: 0.1,
  },
  inputSchema: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      amount: { type: 'number' },
      validator: { type: 'string' },
    },
    required: ['token', 'amount'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      unstakedAmount: { type: 'number' },
      rewards: { type: 'number' },
      transactionHash: { type: 'string' },
    },
  },
  riskLevel: 'low',
  version: '1.0.0',
};

/**
 * Standard harvest capability
 */
export const CAPABILITY_YIELD_HARVEST: CapabilityDeclaration = {
  id: 'yield.harvest',
  name: 'Harvest Rewards',
  category: 'yield',
  description: 'Harvest accumulated staking rewards',
  requiredPermissions: ['staking.execute', 'wallet.sign'],
  resourceRequirements: {
    estimatedFees: 0.05,
  },
  inputSchema: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      validator: { type: 'string' },
    },
    required: ['token'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      harvestedAmount: { type: 'number' },
      token: { type: 'string' },
      transactionHash: { type: 'string' },
    },
  },
  riskLevel: 'low',
  version: '1.0.0',
};

// ============================================================================
// Data Capabilities
// ============================================================================

/**
 * Standard data collection capability
 */
export const CAPABILITY_DATA_COLLECT: CapabilityDeclaration = {
  id: 'data.collect',
  name: 'Collect Market Data',
  category: 'data',
  description: 'Collect market data from various sources',
  requiredPermissions: ['data.read'],
  resourceRequirements: {},
  inputSchema: {
    type: 'object',
    properties: {
      sources: { type: 'array', items: { type: 'string' } },
      assets: { type: 'array', items: { type: 'string' } },
      dataTypes: { type: 'array', items: { type: 'string', enum: ['price', 'volume', 'orderbook', 'trades'] } },
      interval: { type: 'string', enum: ['1m', '5m', '15m', '1h', '4h', '1d'] },
    },
    required: ['assets', 'dataTypes'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      data: { type: 'object' },
      timestamp: { type: 'string' },
      sources: { type: 'array' },
    },
  },
  riskLevel: 'low',
  version: '1.0.0',
};

/**
 * Standard data analysis capability
 */
export const CAPABILITY_DATA_ANALYZE: CapabilityDeclaration = {
  id: 'data.analyze',
  name: 'Analyze Market Data',
  category: 'data',
  description: 'Perform analysis on market data',
  requiredPermissions: ['data.read'],
  resourceRequirements: {},
  inputSchema: {
    type: 'object',
    properties: {
      dataType: { type: 'string', enum: ['price', 'volume', 'sentiment', 'onchain'] },
      assets: { type: 'array', items: { type: 'string' } },
      timeRange: {
        type: 'object',
        properties: {
          start: { type: 'string' },
          end: { type: 'string' },
        },
      },
      depth: { type: 'string', enum: ['basic', 'detailed', 'comprehensive'] },
    },
    required: ['dataType', 'assets'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      results: { type: 'object' },
      confidence: { type: 'number' },
      signals: { type: 'array' },
    },
  },
  riskLevel: 'low',
  version: '1.0.0',
};

// ============================================================================
// Governance Capabilities
// ============================================================================

/**
 * Standard vote capability
 */
export const CAPABILITY_GOVERNANCE_VOTE: CapabilityDeclaration = {
  id: 'governance.vote',
  name: 'Vote on Proposal',
  category: 'governance',
  description: 'Cast a vote on a governance proposal',
  requiredPermissions: ['governance.vote', 'wallet.sign'],
  resourceRequirements: {
    estimatedFees: 0.01,
  },
  inputSchema: {
    type: 'object',
    properties: {
      protocol: { type: 'string' },
      proposalId: { type: 'string' },
      vote: { type: 'string', enum: ['for', 'against', 'abstain'] },
      reason: { type: 'string' },
    },
    required: ['protocol', 'proposalId', 'vote'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      votingPower: { type: 'number' },
      transactionHash: { type: 'string' },
    },
  },
  riskLevel: 'low',
  version: '1.0.0',
};

/**
 * Standard delegate capability
 */
export const CAPABILITY_GOVERNANCE_DELEGATE: CapabilityDeclaration = {
  id: 'governance.delegate',
  name: 'Delegate Voting Power',
  category: 'governance',
  description: 'Delegate voting power to another address',
  requiredPermissions: ['governance.delegate', 'wallet.sign'],
  resourceRequirements: {
    estimatedFees: 0.01,
  },
  inputSchema: {
    type: 'object',
    properties: {
      protocol: { type: 'string' },
      delegateTo: { type: 'string' },
    },
    required: ['protocol', 'delegateTo'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      delegatedPower: { type: 'number' },
      transactionHash: { type: 'string' },
    },
  },
  riskLevel: 'low',
  version: '1.0.0',
};

// ============================================================================
// Treasury Capabilities
// ============================================================================

/**
 * Standard transfer capability
 */
export const CAPABILITY_TREASURY_TRANSFER: CapabilityDeclaration = {
  id: 'treasury.transfer',
  name: 'Transfer Assets',
  category: 'treasury',
  description: 'Transfer assets to another address',
  requiredPermissions: ['transfers.execute', 'wallet.sign'],
  resourceRequirements: {
    estimatedFees: 0.1,
  },
  inputSchema: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      amount: { type: 'number' },
      to: { type: 'string' },
      memo: { type: 'string' },
    },
    required: ['token', 'amount', 'to'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      transactionHash: { type: 'string' },
      fees: { type: 'number' },
    },
  },
  riskLevel: 'high',
  version: '1.0.0',
};

/**
 * Standard rebalance capability
 */
export const CAPABILITY_TREASURY_REBALANCE: CapabilityDeclaration = {
  id: 'treasury.rebalance',
  name: 'Rebalance Portfolio',
  category: 'treasury',
  description: 'Rebalance portfolio to target allocations',
  requiredPermissions: ['trading.execute', 'wallet.sign'],
  resourceRequirements: {
    estimatedFees: 0.5,
  },
  inputSchema: {
    type: 'object',
    properties: {
      targetAllocations: {
        type: 'object',
        description: 'Map of token to target percentage',
      },
      tolerance: { type: 'number', description: 'Rebalance tolerance percentage' },
      maxSlippage: { type: 'number' },
    },
    required: ['targetAllocations'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      trades: { type: 'array' },
      newAllocations: { type: 'object' },
      totalFees: { type: 'number' },
    },
  },
  riskLevel: 'high',
  version: '1.0.0',
};

// ============================================================================
// All Standard Capabilities
// ============================================================================

/**
 * All standard capabilities
 */
export const STANDARD_CAPABILITIES: CapabilityDeclaration[] = [
  // Trading
  CAPABILITY_TRADING_SWAP,
  CAPABILITY_TRADING_LIMIT_ORDER,

  // Yield
  CAPABILITY_YIELD_STAKE,
  CAPABILITY_YIELD_UNSTAKE,
  CAPABILITY_YIELD_HARVEST,

  // Data
  CAPABILITY_DATA_COLLECT,
  CAPABILITY_DATA_ANALYZE,

  // Governance
  CAPABILITY_GOVERNANCE_VOTE,
  CAPABILITY_GOVERNANCE_DELEGATE,

  // Treasury
  CAPABILITY_TREASURY_TRANSFER,
  CAPABILITY_TREASURY_REBALANCE,
];

/**
 * Get standard capability by ID
 */
export function getStandardCapability(id: string): CapabilityDeclaration | undefined {
  return STANDARD_CAPABILITIES.find(c => c.id === id);
}

/**
 * Get standard capabilities by category
 */
export function getStandardCapabilitiesByCategory(
  category: CapabilityCategory
): CapabilityDeclaration[] {
  return STANDARD_CAPABILITIES.filter(c => c.category === category);
}
