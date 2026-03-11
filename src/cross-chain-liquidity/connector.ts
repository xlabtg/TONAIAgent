/**
 * TONAIAgent - Cross-Chain Connector Framework
 *
 * Modular connector architecture enabling AI agents to interact with
 * multiple blockchain networks. Each connector implements a common
 * interface: connect, getLiquidityPools, getTokenPrices, executeSwap,
 * and checkTransactionStatus.
 */

import type {
  SupportedChainId,
  ConnectorConfig,
  ConnectorStatus,
  ChainMetadata,
  LiquidityPool,
  CrossChainToken,
  CrossChainTokenPrice,
  SwapParams,
  SwapResult,
  TransactionDetails,
  TransactionStatus,
} from './types';

// ============================================================================
// Connector Interface
// ============================================================================

/** Common interface that all cross-chain connectors must implement */
export interface CrossChainConnector {
  readonly chainId: SupportedChainId;
  readonly config: ConnectorConfig;

  /** Establish connection to the chain */
  connect(): Promise<ConnectorStatus>;

  /** Disconnect from the chain */
  disconnect(): Promise<void>;

  /** Get current connection status */
  getStatus(): ConnectorStatus;

  /** Get metadata about this chain */
  getChainMetadata(): ChainMetadata;

  /** Fetch available liquidity pools */
  getLiquidityPools(tokenPair?: { tokenA: string; tokenB: string }): Promise<LiquidityPool[]>;

  /** Fetch current token prices */
  getTokenPrices(tokens: string[]): Promise<CrossChainTokenPrice[]>;

  /** Execute a token swap */
  executeSwap(params: SwapParams): Promise<SwapResult>;

  /** Check the status of a submitted transaction */
  checkTransactionStatus(txHash: string): Promise<TransactionDetails>;
}

// ============================================================================
// Chain Metadata Registry
// ============================================================================

const CHAIN_METADATA: Record<string, ChainMetadata> = {
  ton: {
    id: 'ton',
    name: 'TON',
    category: 'ton',
    nativeCurrency: 'TON',
    blockTimeMs: 5000,
    averageGasUsd: 0.01,
    explorerUrl: 'https://tonscan.org',
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    category: 'evm',
    nativeCurrency: 'ETH',
    blockTimeMs: 12000,
    averageGasUsd: 5.0,
    explorerUrl: 'https://etherscan.io',
  },
  bnb: {
    id: 'bnb',
    name: 'BNB Chain',
    category: 'evm',
    nativeCurrency: 'BNB',
    blockTimeMs: 3000,
    averageGasUsd: 0.15,
    explorerUrl: 'https://bscscan.com',
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    category: 'solana',
    nativeCurrency: 'SOL',
    blockTimeMs: 400,
    averageGasUsd: 0.001,
    explorerUrl: 'https://solscan.io',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    category: 'evm',
    nativeCurrency: 'MATIC',
    blockTimeMs: 2000,
    averageGasUsd: 0.05,
    explorerUrl: 'https://polygonscan.com',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    category: 'evm',
    nativeCurrency: 'AVAX',
    blockTimeMs: 2000,
    averageGasUsd: 0.1,
    explorerUrl: 'https://snowtrace.io',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    category: 'evm',
    nativeCurrency: 'ETH',
    blockTimeMs: 250,
    averageGasUsd: 0.5,
    explorerUrl: 'https://arbiscan.io',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    category: 'evm',
    nativeCurrency: 'ETH',
    blockTimeMs: 2000,
    averageGasUsd: 0.3,
    explorerUrl: 'https://optimistic.etherscan.io',
  },
};

// ============================================================================
// Base Connector Implementation
// ============================================================================

/**
 * Abstract base connector providing common functionality.
 * Concrete connectors extend this to add chain-specific logic.
 */
export abstract class BaseChainConnector implements CrossChainConnector {
  readonly chainId: SupportedChainId;
  readonly config: ConnectorConfig;

  protected connectionStatus: ConnectorStatus;
  protected connected = false;

  constructor(config: ConnectorConfig) {
    this.chainId = config.chainId;
    this.config = config;
    this.connectionStatus = {
      chainId: config.chainId,
      status: 'disconnected',
      latencyMs: 0,
    };
  }

  getStatus(): ConnectorStatus {
    return { ...this.connectionStatus };
  }

  getChainMetadata(): ChainMetadata {
    return CHAIN_METADATA[this.chainId] ?? {
      id: this.chainId,
      name: this.chainId,
      category: 'evm',
      nativeCurrency: 'ETH',
      blockTimeMs: 12000,
      averageGasUsd: 1.0,
    };
  }

  async connect(): Promise<ConnectorStatus> {
    if (!this.config.enabled) {
      this.connectionStatus = {
        chainId: this.chainId,
        status: 'disconnected',
        latencyMs: 0,
        lastError: 'Connector is disabled',
      };
      return this.getStatus();
    }

    const start = Date.now();
    try {
      await this.establishConnection();
      this.connected = true;
      this.connectionStatus = {
        chainId: this.chainId,
        status: 'connected',
        latencyMs: Date.now() - start,
        connectedAt: new Date(),
      };
    } catch (err) {
      this.connected = false;
      this.connectionStatus = {
        chainId: this.chainId,
        status: 'error',
        latencyMs: Date.now() - start,
        lastError: err instanceof Error ? err.message : 'Connection failed',
      };
    }

    return this.getStatus();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.connectionStatus = {
      chainId: this.chainId,
      status: 'disconnected',
      latencyMs: 0,
    };
  }

  /** Override in subclasses to perform actual connection */
  protected async establishConnection(): Promise<void> {
    // Simulate connection latency for base class
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  abstract getLiquidityPools(
    tokenPair?: { tokenA: string; tokenB: string }
  ): Promise<LiquidityPool[]>;

  abstract getTokenPrices(tokens: string[]): Promise<CrossChainTokenPrice[]>;

  abstract executeSwap(params: SwapParams): Promise<SwapResult>;

  abstract checkTransactionStatus(txHash: string): Promise<TransactionDetails>;
}

// ============================================================================
// Simulated Chain Connectors
// ============================================================================

/**
 * Simulated connector for testing and development.
 * Returns realistic mock data without real network calls.
 */
export class SimulatedChainConnector extends BaseChainConnector {
  private readonly simulatedPools: Map<string, LiquidityPool[]> = new Map();
  private readonly simulatedPrices: Map<string, number> = new Map([
    ['TON', 3.5],
    ['ETH', 3500],
    ['BNB', 400],
    ['SOL', 150],
    ['USDT', 1.0],
    ['USDC', 1.0],
  ]);

  constructor(config: ConnectorConfig) {
    super(config);
    this.initSimulatedData();
  }

  private initSimulatedData(): void {
    const meta = this.getChainMetadata();
    const nativeToken: CrossChainToken = {
      address: 'native',
      chainId: this.chainId,
      symbol: meta.nativeCurrency,
      name: meta.nativeCurrency,
      decimals: 18,
    };

    const usdtToken: CrossChainToken = {
      address: '0xusdt',
      chainId: this.chainId,
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    };

    const pool: LiquidityPool = {
      id: `${this.chainId}-${meta.nativeCurrency}-USDT`,
      chainId: this.chainId,
      dex: this.chainId === 'ton' ? 'DeDust' :
           this.chainId === 'solana' ? 'Raydium' : 'Uniswap',
      tokenA: nativeToken,
      tokenB: usdtToken,
      reserveA: 1_000_000,
      reserveB: (this.simulatedPrices.get(meta.nativeCurrency) ?? 1) * 1_000_000,
      totalLiquidityUsd: 7_000_000,
      apy: 12.5,
      fee: 0.003,
      updatedAt: new Date(),
    };

    this.simulatedPools.set(`${meta.nativeCurrency}-USDT`, [pool]);
  }

  async getLiquidityPools(
    tokenPair?: { tokenA: string; tokenB: string }
  ): Promise<LiquidityPool[]> {
    if (tokenPair) {
      const key = `${tokenPair.tokenA}-${tokenPair.tokenB}`;
      return this.simulatedPools.get(key) ?? [];
    }

    const all: LiquidityPool[] = [];
    for (const pools of this.simulatedPools.values()) {
      all.push(...pools);
    }
    return all;
  }

  async getTokenPrices(tokens: string[]): Promise<CrossChainTokenPrice[]> {
    return tokens.map(symbol => {
      const price = this.simulatedPrices.get(symbol) ?? 1.0;
      const token: CrossChainToken = {
        address: `0x${symbol.toLowerCase()}`,
        chainId: this.chainId,
        symbol,
        name: symbol,
        decimals: 18,
      };

      return {
        token,
        priceUsd: price * (1 + (Math.random() - 0.5) * 0.02),
        priceChange24h: (Math.random() - 0.5) * 10,
        volume24hUsd: Math.random() * 10_000_000,
        sources: [
          {
            dex: 'SimulatedDex',
            chainId: this.chainId,
            priceUsd: price,
            liquidityUsd: 5_000_000,
          },
        ],
        updatedAt: new Date(),
      };
    });
  }

  async executeSwap(params: SwapParams): Promise<SwapResult> {
    const fromPrice = this.simulatedPrices.get(params.fromToken.symbol) ?? 1.0;
    const toPrice = this.simulatedPrices.get(params.toToken.symbol) ?? 1.0;
    const amountOut = (params.amountIn * fromPrice) / toPrice;
    const priceImpact = params.amountIn / 1_000_000; // Simulated impact

    const txHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
    const meta = this.getChainMetadata();

    return {
      transactionHash: txHash,
      chainId: this.chainId,
      fromToken: params.fromToken,
      toToken: params.toToken,
      amountIn: params.amountIn,
      amountOut: amountOut * (1 - priceImpact),
      gasUsed: 150000,
      gasUsd: meta.averageGasUsd,
      priceImpact,
      executedAt: new Date(),
      status: 'confirmed' as TransactionStatus,
    };
  }

  async checkTransactionStatus(txHash: string): Promise<TransactionDetails> {
    return {
      hash: txHash,
      chainId: this.chainId,
      status: 'confirmed',
      blockNumber: Math.floor(Math.random() * 1_000_000),
      confirmations: 12,
      submittedAt: new Date(Date.now() - 30000),
      confirmedAt: new Date(),
      gasUsed: 150000,
      gasUsd: this.getChainMetadata().averageGasUsd,
    };
  }
}

// ============================================================================
// Connector Registry
// ============================================================================

/** Registry that manages all active chain connectors */
export class CrossChainConnectorRegistry {
  private readonly connectors: Map<SupportedChainId, CrossChainConnector> = new Map();

  /** Register a connector for a chain */
  register(connector: CrossChainConnector): void {
    this.connectors.set(connector.chainId, connector);
  }

  /** Unregister a connector */
  unregister(chainId: SupportedChainId): void {
    this.connectors.delete(chainId);
  }

  /** Get connector for a specific chain */
  get(chainId: SupportedChainId): CrossChainConnector | undefined {
    return this.connectors.get(chainId);
  }

  /** Get all registered connectors */
  getAll(): CrossChainConnector[] {
    return Array.from(this.connectors.values());
  }

  /** Get all connected chains */
  getConnectedChains(): SupportedChainId[] {
    return this.getAll()
      .filter(c => c.getStatus().status === 'connected')
      .map(c => c.chainId);
  }

  /** Connect all registered connectors */
  async connectAll(): Promise<ConnectorStatus[]> {
    const results = await Promise.allSettled(
      this.getAll().map(c => c.connect())
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const connector = this.getAll()[i];
      return {
        chainId: connector.chainId,
        status: 'error' as const,
        latencyMs: 0,
        lastError: r.reason instanceof Error ? r.reason.message : 'Unknown error',
      };
    });
  }

  /** Disconnect all connectors */
  async disconnectAll(): Promise<void> {
    await Promise.allSettled(this.getAll().map(c => c.disconnect()));
  }

  /** Check if a chain is connected */
  isConnected(chainId: SupportedChainId): boolean {
    return this.get(chainId)?.getStatus().status === 'connected';
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a simulated chain connector for testing and development.
 */
export function createSimulatedConnector(
  config: ConnectorConfig
): SimulatedChainConnector {
  return new SimulatedChainConnector(config);
}

/**
 * Create a connector registry from a list of connector configs.
 * Uses simulated connectors by default.
 */
export function createConnectorRegistry(
  configs: ConnectorConfig[],
  connectorFactory?: (config: ConnectorConfig) => CrossChainConnector
): CrossChainConnectorRegistry {
  const registry = new CrossChainConnectorRegistry();
  const factory = connectorFactory ?? createSimulatedConnector;

  for (const config of configs.filter(c => c.enabled)) {
    registry.register(factory(config));
  }

  return registry;
}

export { CHAIN_METADATA };
