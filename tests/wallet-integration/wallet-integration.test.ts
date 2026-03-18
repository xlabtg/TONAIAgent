/**
 * TONAIAgent - Wallet Integration & On-Chain Execution Tests
 *
 * Tests covering:
 * - TonConnectAdapter: connect/disconnect, session management, transaction validation
 * - OnChainExecutor: live execution flow, gas estimation, security checks
 * - DEX swap payload builders: DeDust, STON.fi, TONCO
 * - Live mode security validation
 *
 * @see Issue #267 — Real Wallet Integration & On-Chain Execution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTonConnectAdapter,
  DefaultTonConnectAdapter,
  DEFAULT_TON_CONNECT_CONFIG,
  type WalletSession,
  type OnChainTransaction,
  type TonConnectAdapterConfig,
} from '../../connectors/wallets/ton-connect-adapter';
import {
  createOnChainExecutor,
  DefaultOnChainExecutor,
  buildDexSwapPayload,
  estimateSwapGas,
  validateLiveModeRequest,
  type OnChainExecutionRequest,
} from '../../services/execution-engine/on-chain-execution';
import type { ExecutionPlan, DexId } from '../../connectors/liquidity-router/types';

// ============================================================================
// Test Helpers
// ============================================================================

function makeWalletSession(overrides: Partial<WalletSession> = {}): WalletSession {
  return {
    address: 'EQC1234567890abcdef1234567890abcdef12345678',
    walletName: 'Tonkeeper',
    chainId: -239,
    connectedAt: new Date(),
    active: true,
    ...overrides,
  };
}

function makeExecutionPlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    dex: 'stonfi' as DexId,
    pair: 'TON/USDT',
    amountIn: 100,
    expectedOut: 473,
    slippage: '0.5',
    route: {
      type: 'single',
      dex: 'stonfi' as DexId,
      tokenIn: 'USDT',
      tokenOut: 'TON',
      quote: {
        dex: 'stonfi' as DexId,
        poolAddress: 'EQpool1',
        tokenIn: 'USDT',
        tokenOut: 'TON',
        amountIn: '100000000',
        expectedAmountOut: '47300000000',
        executionPrice: 0.473,
        priceImpactPercent: 0.5,
        slippagePercent: 0.5,
        liquidityUsd: 250_000,
        feePercent: 0.3,
        minimumAmountOut: '47063350000',
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
    candidates: [],
    selectionReason: 'Best expected output',
    generatedAt: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

// ============================================================================
// TonConnectAdapter Tests
// ============================================================================

describe('TonConnectAdapter', () => {
  let adapter: DefaultTonConnectAdapter;

  beforeEach(() => {
    adapter = createTonConnectAdapter();
  });

  describe('Configuration', () => {
    it('should use default config when no overrides provided', () => {
      const config = adapter.getConfig();
      expect(config.network).toBe('mainnet');
      expect(config.signTimeoutMs).toBe(120_000);
      expect(config.maxTransactionTon).toBe(10_000);
      expect(config.explorerBaseUrl).toBe('https://tonviewer.com');
    });

    it('should apply config overrides', () => {
      const custom = createTonConnectAdapter({
        network: 'testnet',
        maxTransactionTon: 100,
      });
      const config = custom.getConfig();
      expect(config.network).toBe('testnet');
      expect(config.maxTransactionTon).toBe(100);
      // Non-overridden defaults are preserved
      expect(config.signTimeoutMs).toBe(DEFAULT_TON_CONNECT_CONFIG.signTimeoutMs);
    });
  });

  describe('Session Management', () => {
    it('should start disconnected', () => {
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getAddress()).toBeNull();
      expect(adapter.getSession()).toBeNull();
    });

    it('should allow setting session from external source', () => {
      const session = makeWalletSession();
      adapter.setSession(session);

      expect(adapter.isConnected()).toBe(true);
      expect(adapter.getAddress()).toBe(session.address);
      expect(adapter.getSession()).toMatchObject({
        address: session.address,
        walletName: 'Tonkeeper',
        active: true,
      });
    });

    it('should disconnect and clear session', () => {
      adapter.setSession(makeWalletSession());
      expect(adapter.isConnected()).toBe(true);

      adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getAddress()).toBeNull();
      expect(adapter.getSession()).toBeNull();
    });

    it('should return a copy of session (immutable)', () => {
      const session = makeWalletSession();
      adapter.setSession(session);

      const returned = adapter.getSession();
      expect(returned).not.toBe(session); // different reference
      expect(returned).toMatchObject({
        address: session.address,
        walletName: session.walletName,
      });
    });

    it('should notify listeners on state change', () => {
      const states: Array<WalletSession | null> = [];
      adapter.onStateChange((s) => states.push(s));

      adapter.setSession(makeWalletSession());
      adapter.disconnect();

      expect(states.length).toBe(2);
      expect(states[0]?.active).toBe(true);
      expect(states[1]).toBeNull();
    });

    it('should allow unsubscribing from state changes', () => {
      const states: Array<WalletSession | null> = [];
      const unsub = adapter.onStateChange((s) => states.push(s));

      adapter.setSession(makeWalletSession());
      unsub();
      adapter.disconnect();

      expect(states.length).toBe(1); // Only received the first update
    });
  });

  describe('Transaction Validation', () => {
    beforeEach(() => {
      adapter.setSession(makeWalletSession());
    });

    it('should reject transaction without destination', async () => {
      const tx: OnChainTransaction = { to: '', amount: '1000000000' };
      await expect(adapter.sendTransaction(tx)).rejects.toThrow('destination address is required');
    });

    it('should reject negative amount', async () => {
      const tx: OnChainTransaction = { to: 'EQaddr123', amount: '-1' };
      await expect(adapter.sendTransaction(tx)).rejects.toThrow('non-negative');
    });

    it('should reject amount exceeding max limit', async () => {
      const smallAdapter = createTonConnectAdapter({ maxTransactionTon: 10 });
      smallAdapter.setSession(makeWalletSession());

      const tx: OnChainTransaction = {
        to: 'EQaddr123',
        amount: '20000000000', // 20 TON > 10 TON limit
      };
      await expect(smallAdapter.sendTransaction(tx)).rejects.toThrow('exceeds maximum limit');
    });

    it('should reject transaction when not connected', async () => {
      const disconnected = createTonConnectAdapter();
      const tx: OnChainTransaction = { to: 'EQaddr123', amount: '1000000000' };
      await expect(disconnected.sendTransaction(tx)).rejects.toThrow('No wallet connected');
    });
  });

  describe('Gas Estimation', () => {
    beforeEach(() => {
      adapter.setSession(makeWalletSession());
    });

    it('should estimate lower gas for simple transfer', async () => {
      const tx: OnChainTransaction = { to: 'EQaddr123', amount: '1000000000' };
      const gas = await adapter.estimateGas(tx);
      expect(gas).toBe('50000000'); // 0.05 TON
    });

    it('should estimate higher gas for contract call (with payload)', async () => {
      const tx: OnChainTransaction = {
        to: 'EQaddr123',
        amount: '1000000000',
        payload: 'base64encodedpayload',
      };
      const gas = await adapter.estimateGas(tx);
      expect(gas).toBe('150000000'); // 0.15 TON
    });
  });

  describe('Batch Transaction', () => {
    beforeEach(() => {
      adapter.setSession(makeWalletSession());
    });

    it('should reject empty batch', async () => {
      const result = await adapter.sendBatchTransaction([]);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No transactions provided');
    });

    it('should accept valid batch', async () => {
      const txs: OnChainTransaction[] = [
        { to: 'EQaddr1', amount: '1000000000' },
        { to: 'EQaddr2', amount: '2000000000' },
      ];
      const result = await adapter.sendBatchTransaction(txs);
      expect(result.success).toBe(true);
    });
  });

  describe('Transaction Status', () => {
    it('should return pending status with explorer URL', async () => {
      const status = await adapter.getTransactionStatus('abc123');
      expect(status.status).toBe('pending');
      expect(status.txHash).toBe('abc123');
      expect(status.confirmations).toBe(0);
      expect(status.explorerUrl).toContain('abc123');
    });
  });
});

// ============================================================================
// OnChainExecutor Tests
// ============================================================================

describe('OnChainExecutor', () => {
  let adapter: DefaultTonConnectAdapter;
  let executor: DefaultOnChainExecutor;

  beforeEach(() => {
    adapter = createTonConnectAdapter();
    executor = createOnChainExecutor(adapter);
  });

  describe('Gas Estimation', () => {
    it('should estimate gas for single-hop DeDust swap', () => {
      const plan = makeExecutionPlan({ dex: 'dedust' as DexId });
      const gas = executor.estimateGas(plan);
      expect(gas).toBe('150000000'); // 0.15 TON
    });

    it('should estimate gas for single-hop STON.fi swap', () => {
      const plan = makeExecutionPlan({ dex: 'stonfi' as DexId });
      const gas = executor.estimateGas(plan);
      expect(gas).toBe('200000000'); // 0.20 TON
    });

    it('should estimate gas for single-hop TONCO swap', () => {
      const plan = makeExecutionPlan({ dex: 'tonco' as DexId });
      const gas = executor.estimateGas(plan);
      expect(gas).toBe('250000000'); // 0.25 TON
    });

    it('should double gas for multi-hop swaps', () => {
      const plan = makeExecutionPlan({
        dex: 'stonfi' as DexId,
        route: {
          type: 'multi',
          hops: [
            {
              type: 'single',
              dex: 'stonfi' as DexId,
              tokenIn: 'USDT',
              tokenOut: 'TON',
              quote: makeExecutionPlan().route.type === 'single'
                ? (makeExecutionPlan().route as { quote: import('../../connectors/liquidity-router/types').DexQuote }).quote
                : makeExecutionPlan().route.hops![0].quote,
            },
          ],
          tokenIn: 'USDT',
          tokenOut: 'TON',
          estimatedAmountOut: '47300000000',
          totalSlippagePercent: 1.0,
          totalFeePercent: 0.6,
        },
      });
      const gas = executor.estimateGas(plan);
      expect(gas).toBe('400000000'); // 0.40 TON (doubled)
    });
  });

  describe('executeOnChain', () => {
    it('should fail if wallet is not connected', async () => {
      const session = makeWalletSession();
      const plan = makeExecutionPlan();

      const result = await executor.executeOnChain({
        plan,
        walletSession: session,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('disconnected');
      expect(result.executionMode).toBe('live');
    });

    it('should fail if wallet address changed', async () => {
      adapter.setSession(makeWalletSession({ address: 'EQdifferentAddress12345678901234567890123' }));
      const session = makeWalletSession();
      const plan = makeExecutionPlan();

      const result = await executor.executeOnChain({
        plan,
        walletSession: session,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('mismatch');
    });

    it('should succeed when wallet is connected', async () => {
      const session = makeWalletSession();
      adapter.setSession(session);
      const plan = makeExecutionPlan();

      const result = await executor.executeOnChain({
        plan,
        walletSession: session,
      });

      expect(result.success).toBe(true);
      expect(result.walletAddress).toBe(session.address);
      expect(result.dex).toBe('stonfi');
      expect(result.executionMode).toBe('live');
    });

    it('should reject when gas exceeds max', async () => {
      const session = makeWalletSession();
      adapter.setSession(session);
      const plan = makeExecutionPlan();

      const result = await executor.executeOnChain({
        plan,
        walletSession: session,
        maxGasFee: '1000', // Very low gas limit
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('gas fee');
    });
  });
});

// ============================================================================
// DEX Swap Payload Builder Tests
// ============================================================================

describe('buildDexSwapPayload', () => {
  const walletAddress = 'EQC1234567890abcdef1234567890abcdef12345678';

  it('should build DeDust swap payload', () => {
    const plan = makeExecutionPlan({ dex: 'dedust' as DexId });
    const tx = buildDexSwapPayload(plan, walletAddress);

    expect(tx.to).toBe('EQpool1');
    expect(tx.amount).toBe('100000000000'); // 100 TON in nanoTON
  });

  it('should build STON.fi swap payload', () => {
    const plan = makeExecutionPlan({ dex: 'stonfi' as DexId });
    const tx = buildDexSwapPayload(plan, walletAddress);

    expect(tx.to).toBe('EQpool1');
    expect(tx.amount).toBe('100000000000');
  });

  it('should build TONCO swap payload', () => {
    const plan = makeExecutionPlan({ dex: 'tonco' as DexId });
    const tx = buildDexSwapPayload(plan, walletAddress);

    expect(tx.to).toBe('EQpool1');
    expect(tx.amount).toBe('100000000000');
  });

  it('should throw for unsupported DEX', () => {
    const plan = makeExecutionPlan({ dex: 'unknown' as DexId });
    expect(() => buildDexSwapPayload(plan, walletAddress)).toThrow('Unsupported DEX');
  });
});

// ============================================================================
// estimateSwapGas Tests
// ============================================================================

describe('estimateSwapGas', () => {
  it('should return correct gas for each DEX', () => {
    expect(estimateSwapGas('dedust', false)).toBe('150000000');
    expect(estimateSwapGas('stonfi', false)).toBe('200000000');
    expect(estimateSwapGas('tonco', false)).toBe('250000000');
  });

  it('should double gas for multi-hop', () => {
    expect(estimateSwapGas('dedust', true)).toBe('300000000');
    expect(estimateSwapGas('stonfi', true)).toBe('400000000');
    expect(estimateSwapGas('tonco', true)).toBe('500000000');
  });
});

// ============================================================================
// Live Mode Security Validation Tests
// ============================================================================

describe('validateLiveModeRequest', () => {
  it('should reject when no wallet session', () => {
    const result = validateLiveModeRequest(null, 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('connected');
  });

  it('should reject inactive wallet session', () => {
    const session = makeWalletSession({ active: false });
    const result = validateLiveModeRequest(session, 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('connected');
  });

  it('should reject invalid wallet address', () => {
    const session = makeWalletSession({ address: 'short' });
    const result = validateLiveModeRequest(session, 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid');
  });

  it('should reject zero or negative amount', () => {
    const session = makeWalletSession();
    expect(validateLiveModeRequest(session, 0).allowed).toBe(false);
    expect(validateLiveModeRequest(session, -10).allowed).toBe(false);
  });

  it('should reject amount exceeding max trade size', () => {
    const session = makeWalletSession();
    const result = validateLiveModeRequest(session, 1500, 1000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceeds maximum');
  });

  it('should allow valid live mode request', () => {
    const session = makeWalletSession();
    const result = validateLiveModeRequest(session, 100, 1000);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should use default max trade size of 1000 TON', () => {
    const session = makeWalletSession();
    expect(validateLiveModeRequest(session, 999).allowed).toBe(true);
    expect(validateLiveModeRequest(session, 1001).allowed).toBe(false);
  });
});
