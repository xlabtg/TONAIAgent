/**
 * TONAIAgent - TON Wallet Tools Plugin
 *
 * Core TON wallet operations including:
 * - Balance checking
 * - Transaction sending
 * - Multi-sig support
 * - Transaction history
 * - Account information
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
 * TON Wallet Plugin Manifest
 */
export const TON_WALLET_MANIFEST: PluginManifest = {
  id: 'ton-wallet',
  name: 'TON Wallet',
  version: '1.0.0',
  description: 'Core TON wallet operations including transfers, balance checks, and transaction management',
  author: {
    name: 'TONAIAgent Team',
    organization: 'TONAIAgent',
  },
  category: 'ton-native',
  trustLevel: 'core' as PluginTrustLevel,
  keywords: ['ton', 'wallet', 'transfer', 'balance', 'transaction'],
  license: 'MIT',
  permissions: [
    {
      scope: 'ton:read',
      reason: 'Read blockchain data and account information',
      required: true,
    },
    {
      scope: 'ton:write',
      reason: 'Send transactions to the blockchain',
      required: true,
    },
    {
      scope: 'ton:sign',
      reason: 'Sign transactions with wallet keys',
      required: true,
    },
    {
      scope: 'wallet:read',
      reason: 'Read wallet balances and history',
      required: true,
    },
    {
      scope: 'wallet:transfer',
      reason: 'Transfer TON between addresses',
      required: true,
    },
  ],
  capabilities: {
    tools: [
      // =======================================================================
      // Balance Operations
      // =======================================================================
      {
        name: 'ton_get_balance',
        description: 'Get the TON balance of a wallet address. Returns balance in TON (not nanotons).',
        category: 'wallet' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'TON wallet address to check balance for',
              pattern: '^(EQ|UQ|0:)[a-zA-Z0-9_-]+$',
            },
          },
          required: ['address'],
        },
        returns: {
          type: 'object',
          description: 'Balance information',
          properties: {
            address: { type: 'string', description: 'Wallet address' },
            balance: { type: 'string', description: 'Balance in TON' },
            balanceNano: { type: 'string', description: 'Balance in nanotons' },
          },
        },
        requiredPermissions: ['wallet:read'],
        examples: [
          {
            description: 'Get balance of a wallet',
            input: { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
            output: {
              address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
              balance: '100.5',
              balanceNano: '100500000000',
            },
          },
        ],
      },

      // =======================================================================
      // Transfer Operations
      // =======================================================================
      {
        name: 'ton_transfer',
        description: 'Transfer TON from the agent wallet to another address. Specify amount in TON.',
        category: 'transaction' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient TON address',
              pattern: '^(EQ|UQ|0:)[a-zA-Z0-9_-]+$',
            },
            amount: {
              type: 'string',
              description: 'Amount to transfer in TON (e.g., "1.5")',
            },
            message: {
              type: 'string',
              description: 'Optional text comment to include with the transaction',
              maxLength: 256,
            },
            bounce: {
              type: 'boolean',
              description: 'Whether to use bounce mode (default: true for contracts, false for wallets)',
            },
          },
          required: ['to', 'amount'],
        },
        returns: {
          type: 'object',
          description: 'Transfer result',
          properties: {
            success: { type: 'boolean', description: 'Whether transfer succeeded' },
            txHash: { type: 'string', description: 'Transaction hash' },
            fee: { type: 'string', description: 'Transaction fee in TON' },
            timestamp: { type: 'number', description: 'Transaction timestamp' },
          },
        },
        requiredPermissions: ['wallet:transfer', 'ton:sign'],
        requiresConfirmation: true,
        estimatedDurationMs: 10000,
        retryable: true,
        maxRetries: 3,
        safetyConstraints: {
          maxValuePerExecution: 1000, // Max 1000 TON per transaction
          requireMultiSigAbove: 100, // Require multi-sig for > 100 TON
        },
        examples: [
          {
            description: 'Send 1 TON to an address with a message',
            input: {
              to: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
              amount: '1.0',
              message: 'Payment for services',
            },
            output: {
              success: true,
              txHash: 'abc123...',
              fee: '0.005',
              timestamp: 1708444800,
            },
          },
        ],
      },

      {
        name: 'ton_batch_transfer',
        description: 'Transfer TON to multiple recipients in a single transaction. More efficient than individual transfers.',
        category: 'transaction' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            transfers: {
              type: 'array',
              description: 'List of transfers to execute',
              items: {
                type: 'object',
                properties: {
                  to: { type: 'string', description: 'Recipient address' },
                  amount: { type: 'string', description: 'Amount in TON' },
                  message: { type: 'string', description: 'Optional message' },
                },
              },
            },
          },
          required: ['transfers'],
        },
        returns: {
          type: 'object',
          description: 'Batch transfer result',
          properties: {
            success: { type: 'boolean', description: 'Whether all transfers succeeded' },
            results: {
              type: 'array',
              description: 'Results for each transfer',
              items: {
                type: 'object',
                properties: {
                  to: { type: 'string', description: 'Recipient' },
                  success: { type: 'boolean', description: 'Transfer success' },
                  txHash: { type: 'string', description: 'Transaction hash' },
                },
              },
            },
            totalFee: { type: 'string', description: 'Total fees paid' },
          },
        },
        requiredPermissions: ['wallet:transfer', 'ton:sign'],
        requiresConfirmation: true,
        estimatedDurationMs: 15000,
        safetyConstraints: {
          maxValuePerExecution: 5000,
          requireMultiSigAbove: 500,
        },
        examples: [
          {
            description: 'Send TON to multiple recipients',
            input: {
              transfers: [
                { to: 'EQ...1', amount: '1.0', message: 'Payment 1' },
                { to: 'EQ...2', amount: '2.0', message: 'Payment 2' },
              ],
            },
            output: {
              success: true,
              results: [
                { to: 'EQ...1', success: true, txHash: 'abc...' },
                { to: 'EQ...2', success: true, txHash: 'def...' },
              ],
              totalFee: '0.01',
            },
          },
        ],
      },

      // =======================================================================
      // Account Information
      // =======================================================================
      {
        name: 'ton_get_account_info',
        description: 'Get detailed information about a TON account including status, code, and data.',
        category: 'wallet' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'TON address to get info for',
            },
          },
          required: ['address'],
        },
        returns: {
          type: 'object',
          description: 'Account information',
          properties: {
            address: { type: 'string', description: 'Account address' },
            status: { type: 'string', description: 'Account status (active, frozen, uninit)' },
            balance: { type: 'string', description: 'Balance in TON' },
            lastTransactionLt: { type: 'string', description: 'Last transaction logical time' },
            isContract: { type: 'boolean', description: 'Whether address is a contract' },
          },
        },
        requiredPermissions: ['ton:read'],
        examples: [
          {
            description: 'Get account information',
            input: { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
            output: {
              address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
              status: 'active',
              balance: '100.5',
              lastTransactionLt: '12345678',
              isContract: false,
            },
          },
        ],
      },

      // =======================================================================
      // Transaction History
      // =======================================================================
      {
        name: 'ton_get_transactions',
        description: 'Get transaction history for a TON address.',
        category: 'wallet' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'TON address to get transactions for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of transactions to return (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
            },
            beforeLt: {
              type: 'string',
              description: 'Get transactions before this logical time (for pagination)',
            },
          },
          required: ['address'],
        },
        returns: {
          type: 'object',
          description: 'Transaction list',
          properties: {
            address: { type: 'string', description: 'Queried address' },
            transactions: {
              type: 'array',
              description: 'List of transactions',
              items: {
                type: 'object',
                properties: {
                  hash: { type: 'string', description: 'Transaction hash' },
                  lt: { type: 'string', description: 'Logical time' },
                  timestamp: { type: 'number', description: 'Unix timestamp' },
                  from: { type: 'string', description: 'Sender address' },
                  to: { type: 'string', description: 'Recipient address' },
                  value: { type: 'string', description: 'Value in TON' },
                  fee: { type: 'string', description: 'Fee in TON' },
                  status: { type: 'string', description: 'Transaction status' },
                  message: { type: 'string', description: 'Message if present' },
                },
              },
            },
            hasMore: { type: 'boolean', description: 'Whether more transactions exist' },
          },
        },
        requiredPermissions: ['wallet:read'],
        examples: [
          {
            description: 'Get recent transactions',
            input: { address: 'EQ...', limit: 10 },
            output: {
              address: 'EQ...',
              transactions: [
                {
                  hash: 'abc...',
                  lt: '12345678',
                  timestamp: 1708444800,
                  from: 'EQ...sender',
                  to: 'EQ...',
                  value: '10.0',
                  fee: '0.005',
                  status: 'success',
                  message: 'Payment',
                },
              ],
              hasMore: true,
            },
          },
        ],
      },

      // =======================================================================
      // Transaction Simulation
      // =======================================================================
      {
        name: 'ton_simulate_transaction',
        description: 'Simulate a transaction without actually sending it. Useful for estimating fees and checking if transaction will succeed.',
        category: 'transaction' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient address',
            },
            amount: {
              type: 'string',
              description: 'Amount in TON',
            },
            payload: {
              type: 'string',
              description: 'Optional transaction payload (base64 encoded BOC)',
            },
          },
          required: ['to', 'amount'],
        },
        returns: {
          type: 'object',
          description: 'Simulation result',
          properties: {
            success: { type: 'boolean', description: 'Whether transaction would succeed' },
            estimatedFee: { type: 'string', description: 'Estimated fee in TON' },
            gasUsed: { type: 'string', description: 'Estimated gas usage' },
            exitCode: { type: 'number', description: 'Expected exit code' },
            message: { type: 'string', description: 'Result message' },
          },
        },
        requiredPermissions: ['ton:read'],
        examples: [
          {
            description: 'Simulate a transfer',
            input: { to: 'EQ...', amount: '1.0' },
            output: {
              success: true,
              estimatedFee: '0.005',
              gasUsed: '10000',
              exitCode: 0,
              message: 'Transaction would succeed',
            },
          },
        ],
      },

      // =======================================================================
      // Address Utilities
      // =======================================================================
      {
        name: 'ton_validate_address',
        description: 'Validate a TON address format and get its normalized forms.',
        category: 'utility' as ToolCategory,
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Address to validate',
            },
          },
          required: ['address'],
        },
        returns: {
          type: 'object',
          description: 'Validation result',
          properties: {
            valid: { type: 'boolean', description: 'Whether address is valid' },
            bounceable: { type: 'string', description: 'Bounceable address form' },
            nonBounceable: { type: 'string', description: 'Non-bounceable address form' },
            raw: { type: 'string', description: 'Raw address form' },
            isTestnet: { type: 'boolean', description: 'Whether address is for testnet' },
          },
        },
        requiredPermissions: [],
        examples: [
          {
            description: 'Validate a wallet address',
            input: { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
            output: {
              valid: true,
              bounceable: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
              nonBounceable: 'UQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0Xgqb_',
              raw: '0:6f5bc6798860649c9df00433926a4cd92e597ddda8a60436458b20bd1782019c',
              isTestnet: false,
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
 * Get balance handler
 */
export const getBalanceHandler: ToolHandler = async (params, context) => {
  const { address } = params as { address: string };

  context.logger.info('Getting balance', { address });

  const balanceNano = await context.ton.getBalance(address);
  const balanceTon = (BigInt(balanceNano) / BigInt(1000000000)).toString();
  const remainder = BigInt(balanceNano) % BigInt(1000000000);
  const decimals = remainder.toString().padStart(9, '0');

  return {
    address,
    balance: `${balanceTon}.${decimals}`,
    balanceNano,
  };
};

/**
 * Transfer handler
 */
export const transferHandler: ToolHandler = async (params, context) => {
  const { to, amount, message } = params as {
    to: string;
    amount: string;
    message?: string;
  };

  context.logger.info('Initiating transfer', { to, amount });

  // Convert amount to nanotons
  const [whole, decimal = '0'] = amount.split('.');
  const nanoAmount = BigInt(whole) * BigInt(1000000000) +
    BigInt(decimal.padEnd(9, '0').slice(0, 9));

  // Prepare transaction
  const preparedTx = await context.ton.prepareTransaction({
    to,
    value: nanoAmount.toString(),
    payload: message,
  });

  // Simulate first
  const simulation = await context.ton.simulateTransaction(preparedTx);

  if (!simulation.success) {
    throw new Error(`Transaction simulation failed: ${simulation.resultMessage}`);
  }

  // In production, this would sign and broadcast the transaction
  // For now, return simulated success
  return {
    success: true,
    txHash: `0x${Date.now().toString(16)}`,
    fee: (BigInt(preparedTx.estimatedFee) / BigInt(1000000000)).toString(),
    timestamp: Math.floor(Date.now() / 1000),
    simulated: true, // Indicates this is a simulated response
  };
};

/**
 * Get account info handler
 */
export const getAccountInfoHandler: ToolHandler = async (params, context) => {
  const { address } = params as { address: string };

  context.logger.info('Getting account info', { address });

  const accountInfo = await context.ton.getAccountInfo(address);
  const balanceTon = (BigInt(accountInfo.balance) / BigInt(1000000000)).toString();

  return {
    address: accountInfo.address,
    status: accountInfo.status,
    balance: balanceTon,
    lastTransactionLt: accountInfo.lastTransactionLt,
    isContract: !!accountInfo.code,
  };
};

/**
 * Get transactions handler
 */
export const getTransactionsHandler: ToolHandler = async (params, context) => {
  const { address, limit = 20 } = params as {
    address: string;
    limit?: number;
    beforeLt?: string;
  };

  context.logger.info('Getting transactions', { address, limit });

  const transactions = await context.ton.getTransactions(address, limit);

  return {
    address,
    transactions: transactions.map((tx) => ({
      hash: tx.hash,
      lt: tx.lt,
      timestamp: tx.timestamp,
      from: tx.from,
      to: tx.to,
      value: (BigInt(tx.value) / BigInt(1000000000)).toString(),
      fee: (BigInt(tx.fee) / BigInt(1000000000)).toString(),
      status: tx.status,
      message: tx.message,
    })),
    hasMore: transactions.length === limit,
  };
};

/**
 * Simulate transaction handler
 */
export const simulateTransactionHandler: ToolHandler = async (params, context) => {
  const { to, amount, payload } = params as {
    to: string;
    amount: string;
    payload?: string;
  };

  context.logger.info('Simulating transaction', { to, amount });

  const [whole, decimal = '0'] = amount.split('.');
  const nanoAmount = BigInt(whole) * BigInt(1000000000) +
    BigInt(decimal.padEnd(9, '0').slice(0, 9));

  const preparedTx = await context.ton.prepareTransaction({
    to,
    value: nanoAmount.toString(),
    payload,
  });

  const simulation = await context.ton.simulateTransaction(preparedTx);

  return {
    success: simulation.success,
    estimatedFee: (BigInt(preparedTx.estimatedFee) / BigInt(1000000000)).toString(),
    gasUsed: simulation.gasUsed,
    exitCode: simulation.exitCode,
    message: simulation.resultMessage ?? (simulation.success ? 'Transaction would succeed' : 'Transaction would fail'),
  };
};

/**
 * Validate address handler
 */
export const validateAddressHandler: ToolHandler = async (params, context) => {
  const { address } = params as { address: string };

  context.logger.debug('Validating address', { address });

  // Simple validation - in production use proper TON address parsing
  const isValid = /^(EQ|UQ|0:)[a-zA-Z0-9_-]+$/.test(address) && address.length >= 48;

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid address format',
    };
  }

  // Determine address type
  const isTestnet = address.includes('test'); // Simplified check

  return {
    valid: true,
    bounceable: address.startsWith('EQ') ? address : `EQ${address.slice(2)}`,
    nonBounceable: address.startsWith('UQ') ? address : `UQ${address.slice(2)}`,
    raw: `0:${address.slice(2).toLowerCase()}`,
    isTestnet,
  };
};

/**
 * Batch transfer handler
 */
export const batchTransferHandler: ToolHandler = async (params, context) => {
  const { transfers } = params as {
    transfers: Array<{ to: string; amount: string; message?: string }>;
  };

  context.logger.info('Initiating batch transfer', { count: transfers.length });

  const results = [];
  let totalFee = BigInt(0);

  for (const transfer of transfers) {
    try {
      const [whole, decimal = '0'] = transfer.amount.split('.');
      const nanoAmount = BigInt(whole) * BigInt(1000000000) +
        BigInt(decimal.padEnd(9, '0').slice(0, 9));

      const preparedTx = await context.ton.prepareTransaction({
        to: transfer.to,
        value: nanoAmount.toString(),
        payload: transfer.message,
      });

      totalFee += BigInt(preparedTx.estimatedFee);

      results.push({
        to: transfer.to,
        success: true,
        txHash: `0x${Date.now().toString(16)}${results.length}`,
      });
    } catch (error) {
      results.push({
        to: transfer.to,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: results.every((r) => r.success),
    results,
    totalFee: (totalFee / BigInt(1000000000)).toString(),
    simulated: true,
  };
};

// ============================================================================
// Handler Map
// ============================================================================

/**
 * Map of tool names to their handlers
 */
export const TON_WALLET_HANDLERS: Record<string, ToolHandler> = {
  ton_get_balance: getBalanceHandler,
  ton_transfer: transferHandler,
  ton_batch_transfer: batchTransferHandler,
  ton_get_account_info: getAccountInfoHandler,
  ton_get_transactions: getTransactionsHandler,
  ton_simulate_transaction: simulateTransactionHandler,
  ton_validate_address: validateAddressHandler,
};
