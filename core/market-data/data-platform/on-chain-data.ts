/**
 * TONAIAgent - On-Chain Data Module
 *
 * Aggregates TON blockchain data including transactions, wallets,
 * Jettons, NFTs, DeFi protocols, and governance activity.
 */

import {
  OnChainDataConfig,
  TONTransaction,
  TONWallet,
  JettonBalance,
  JettonInfo,
  NFTCollection,
  NFTItem,
  DeFiProtocol,
  DeFiProtocolType,
  LiquidityPool,
  GovernanceActivity,
  DataPlatformEvent,
  DataPlatformEventCallback,
} from './types';

// Re-export CacheConfig for API consumers
export type { CacheConfig } from './types';

// ============================================================================
// On-Chain Data Service
// ============================================================================

export interface OnChainDataService {
  // Transaction methods
  getTransaction(hash: string): Promise<TONTransaction | undefined>;
  getTransactions(params: TransactionQueryParams): Promise<TransactionResult>;
  getAccountTransactions(address: string, limit?: number): Promise<TONTransaction[]>;

  // Wallet methods
  getWallet(address: string): Promise<TONWallet | undefined>;
  getWalletBalance(address: string): Promise<string>;
  getWalletJettons(address: string): Promise<JettonBalance[]>;
  getWalletNFTs(address: string): Promise<NFTItem[]>;

  // Jetton methods
  getJetton(address: string): Promise<JettonInfo | undefined>;
  getJettonHolders(address: string, limit?: number): Promise<JettonHolder[]>;
  getJettonTransfers(address: string, limit?: number): Promise<JettonTransfer[]>;
  searchJettons(query: string): Promise<JettonInfo[]>;

  // NFT methods
  getCollection(address: string): Promise<NFTCollection | undefined>;
  getCollectionItems(address: string, limit?: number): Promise<NFTItem[]>;
  getNFTItem(address: string): Promise<NFTItem | undefined>;
  searchNFTs(query: string): Promise<NFTItem[]>;

  // DeFi methods
  getDeFiProtocols(): Promise<DeFiProtocol[]>;
  getDeFiProtocol(id: string): Promise<DeFiProtocol | undefined>;
  getLiquidityPools(protocolId?: string): Promise<LiquidityPool[]>;
  getPoolStats(poolId: string): Promise<PoolStats>;

  // Governance methods
  getGovernanceActivity(protocolId: string): Promise<GovernanceActivity[]>;
  getActiveProposals(): Promise<GovernanceActivity[]>;

  // Analytics methods
  getNetworkStats(): Promise<NetworkStats>;
  getTopJettons(limit?: number): Promise<JettonInfo[]>;
  getTopNFTCollections(limit?: number): Promise<NFTCollection[]>;
  getWhaleMovements(minValue: string): Promise<WhaleMovement[]>;

  // Configuration
  configure(config: Partial<OnChainDataConfig>): void;

  // Events
  onEvent(callback: DataPlatformEventCallback): void;
}

// ============================================================================
// Query Types
// ============================================================================

export interface TransactionQueryParams {
  address?: string;
  startTime?: Date;
  endTime?: Date;
  minValue?: string;
  maxValue?: string;
  messageType?: 'internal' | 'external_in' | 'external_out';
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface TransactionResult {
  transactions: TONTransaction[];
  total: number;
  hasMore: boolean;
}

export interface JettonHolder {
  address: string;
  balance: string;
  percentage: number;
  rank: number;
}

export interface JettonTransfer {
  hash: string;
  timestamp: Date;
  from: string;
  to: string;
  amount: string;
  jettonAddress: string;
  comment?: string;
}

export interface PoolStats {
  poolId: string;
  tvl: string;
  volume24h: string;
  volume7d: string;
  fees24h: string;
  apy: number;
  apr: number;
  priceChange24h: number;
  transactions24h: number;
  uniqueUsers24h: number;
}

export interface NetworkStats {
  totalTransactions: number;
  transactions24h: number;
  activeWallets24h: number;
  totalWallets: number;
  totalTVL: string;
  totalVolume24h: string;
  avgBlockTime: number;
  validators: number;
  tps: number;
}

export interface WhaleMovement {
  hash: string;
  timestamp: Date;
  from: string;
  to: string;
  value: string;
  token: string;
  usdValue: number;
  type: 'transfer' | 'exchange_deposit' | 'exchange_withdrawal' | 'defi_interaction';
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultOnChainDataService implements OnChainDataService {
  private config: OnChainDataConfig;
  private readonly cache: Map<string, CachedItem> = new Map();
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  // Mock data stores (in production, these would be replaced with actual blockchain queries)
  private readonly transactions: Map<string, TONTransaction> = new Map();
  private readonly wallets: Map<string, TONWallet> = new Map();
  private readonly jettons: Map<string, JettonInfo> = new Map();
  private readonly collections: Map<string, NFTCollection> = new Map();
  private readonly nftItems: Map<string, NFTItem> = new Map();
  private readonly protocols: Map<string, DeFiProtocol> = new Map();
  private readonly pools: Map<string, LiquidityPool> = new Map();

  constructor(config?: Partial<OnChainDataConfig>) {
    this.config = {
      networks: config?.networks ?? [
        {
          id: 'ton-mainnet',
          name: 'TON Mainnet',
          chainId: '-239',
          rpcEndpoints: ['https://toncenter.com/api/v2'],
          blockTime: 5000,
          confirmations: 1,
        },
      ],
      indexers: config?.indexers ?? [
        { type: 'transactions', batchSize: 100, parallelism: 4 },
        { type: 'events', batchSize: 100, parallelism: 4 },
        { type: 'jetton', batchSize: 50, parallelism: 2 },
        { type: 'nft', batchSize: 50, parallelism: 2 },
      ],
      cacheConfig: config?.cacheConfig ?? {
        enabled: true,
        ttlSeconds: 60,
        maxSize: 10000,
        evictionPolicy: 'lru',
      },
      realtimeEnabled: config?.realtimeEnabled ?? true,
    };

    this.initializeMockData();
  }

  // Transaction Methods
  async getTransaction(hash: string): Promise<TONTransaction | undefined> {
    const cacheKey = `tx:${hash}`;
    const cached = this.getFromCache<TONTransaction>(cacheKey);
    if (cached) return cached;

    const tx = this.transactions.get(hash);
    if (tx) {
      this.setCache(cacheKey, tx);
    }
    return tx;
  }

  async getTransactions(params: TransactionQueryParams): Promise<TransactionResult> {
    let txs = Array.from(this.transactions.values());

    // Apply filters
    if (params.address) {
      txs = txs.filter((tx) => tx.sender === params.address || tx.receiver === params.address);
    }
    if (params.startTime) {
      txs = txs.filter((tx) => tx.timestamp >= params.startTime!);
    }
    if (params.endTime) {
      txs = txs.filter((tx) => tx.timestamp <= params.endTime!);
    }
    if (params.minValue) {
      txs = txs.filter((tx) => BigInt(tx.value) >= BigInt(params.minValue!));
    }
    if (params.success !== undefined) {
      txs = txs.filter((tx) => tx.success === params.success);
    }
    if (params.messageType) {
      txs = txs.filter((tx) => tx.messageType === params.messageType);
    }

    // Sort by timestamp descending
    txs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = txs.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;

    return {
      transactions: txs.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total,
    };
  }

  async getAccountTransactions(address: string, limit = 50): Promise<TONTransaction[]> {
    const result = await this.getTransactions({ address, limit });
    return result.transactions;
  }

  // Wallet Methods
  async getWallet(address: string): Promise<TONWallet | undefined> {
    const cacheKey = `wallet:${address}`;
    const cached = this.getFromCache<TONWallet>(cacheKey);
    if (cached) return cached;

    let wallet = this.wallets.get(address);
    if (!wallet) {
      // Generate mock wallet for any address
      wallet = this.generateMockWallet(address);
      this.wallets.set(address, wallet);
    }

    this.setCache(cacheKey, wallet);
    return wallet;
  }

  async getWalletBalance(address: string): Promise<string> {
    const wallet = await this.getWallet(address);
    return wallet?.balance ?? '0';
  }

  async getWalletJettons(address: string): Promise<JettonBalance[]> {
    const wallet = await this.getWallet(address);
    return wallet?.jettonBalances ?? [];
  }

  async getWalletNFTs(address: string): Promise<NFTItem[]> {
    return Array.from(this.nftItems.values()).filter((nft) => nft.owner === address);
  }

  // Jetton Methods
  async getJetton(address: string): Promise<JettonInfo | undefined> {
    const cacheKey = `jetton:${address}`;
    const cached = this.getFromCache<JettonInfo>(cacheKey);
    if (cached) return cached;

    const jetton = this.jettons.get(address);
    if (jetton) {
      this.setCache(cacheKey, jetton);
    }
    return jetton;
  }

  async getJettonHolders(_address: string, limit = 100): Promise<JettonHolder[]> {
    // Generate mock holders
    const holders: JettonHolder[] = [];
    for (let i = 0; i < Math.min(limit, 50); i++) {
      holders.push({
        address: this.generateMockAddress(),
        balance: String(Math.floor(Math.random() * 1000000) + 1000),
        percentage: Math.random() * (i === 0 ? 20 : 5),
        rank: i + 1,
      });
    }
    return holders;
  }

  async getJettonTransfers(address: string, limit = 100): Promise<JettonTransfer[]> {
    const transfers: JettonTransfer[] = [];
    const now = Date.now();

    for (let i = 0; i < Math.min(limit, 50); i++) {
      transfers.push({
        hash: this.generateMockHash(),
        timestamp: new Date(now - i * 60000),
        from: this.generateMockAddress(),
        to: this.generateMockAddress(),
        amount: String(Math.floor(Math.random() * 10000) + 100),
        jettonAddress: address,
        comment: Math.random() > 0.7 ? 'Transfer' : undefined,
      });
    }

    return transfers;
  }

  async searchJettons(query: string): Promise<JettonInfo[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.jettons.values()).filter(
      (j) =>
        j.symbol.toLowerCase().includes(lowerQuery) ||
        j.name.toLowerCase().includes(lowerQuery)
    );
  }

  // NFT Methods
  async getCollection(address: string): Promise<NFTCollection | undefined> {
    return this.collections.get(address);
  }

  async getCollectionItems(address: string, limit = 50): Promise<NFTItem[]> {
    return Array.from(this.nftItems.values())
      .filter((nft) => nft.collection === address)
      .slice(0, limit);
  }

  async getNFTItem(address: string): Promise<NFTItem | undefined> {
    return this.nftItems.get(address);
  }

  async searchNFTs(query: string): Promise<NFTItem[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.nftItems.values()).filter(
      (nft) =>
        (nft.name?.toLowerCase().includes(lowerQuery) ?? false) ||
        (nft.description?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }

  // DeFi Methods
  async getDeFiProtocols(): Promise<DeFiProtocol[]> {
    return Array.from(this.protocols.values());
  }

  async getDeFiProtocol(id: string): Promise<DeFiProtocol | undefined> {
    return this.protocols.get(id);
  }

  async getLiquidityPools(protocolId?: string): Promise<LiquidityPool[]> {
    let pools = Array.from(this.pools.values());
    if (protocolId) {
      pools = pools.filter((p) => p.protocol === protocolId);
    }
    return pools;
  }

  async getPoolStats(poolId: string): Promise<PoolStats> {
    const pool = this.pools.get(poolId);
    return {
      poolId,
      tvl: pool?.tvl ?? '0',
      volume24h: pool?.volume24h ?? '0',
      volume7d: String(Number(pool?.volume24h ?? 0) * 7),
      fees24h: String(Number(pool?.volume24h ?? 0) * (pool?.fee ?? 0.003)),
      apy: pool?.apy ?? 0,
      apr: (pool?.apy ?? 0) * 0.9,
      priceChange24h: (Math.random() - 0.5) * 10,
      transactions24h: Math.floor(Math.random() * 1000) + 100,
      uniqueUsers24h: Math.floor(Math.random() * 200) + 50,
    };
  }

  // Governance Methods
  async getGovernanceActivity(protocolId: string): Promise<GovernanceActivity[]> {
    const activities: GovernanceActivity[] = [];
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      activities.push({
        protocolId,
        proposalId: `proposal_${i + 1}`,
        title: `Proposal #${i + 1}: Update protocol parameters`,
        status: i === 0 ? 'active' : i === 1 ? 'passed' : 'executed',
        votesFor: String(Math.floor(Math.random() * 10000000)),
        votesAgainst: String(Math.floor(Math.random() * 5000000)),
        quorum: Math.random() * 50 + 30,
        startDate: new Date(now - (7 - i) * 86400000),
        endDate: new Date(now + i * 86400000),
      });
    }

    return activities;
  }

  async getActiveProposals(): Promise<GovernanceActivity[]> {
    const allProposals: GovernanceActivity[] = [];
    for (const protocol of this.protocols.values()) {
      const proposals = await this.getGovernanceActivity(protocol.id);
      allProposals.push(...proposals.filter((p) => p.status === 'active'));
    }
    return allProposals;
  }

  // Analytics Methods
  async getNetworkStats(): Promise<NetworkStats> {
    return {
      totalTransactions: this.transactions.size * 1000,
      transactions24h: Math.floor(Math.random() * 1000000) + 500000,
      activeWallets24h: Math.floor(Math.random() * 100000) + 50000,
      totalWallets: Math.floor(Math.random() * 10000000) + 5000000,
      totalTVL: String(Math.floor(Math.random() * 1000000000) + 500000000),
      totalVolume24h: String(Math.floor(Math.random() * 100000000) + 50000000),
      avgBlockTime: 5000,
      validators: 350,
      tps: Math.floor(Math.random() * 100) + 50,
    };
  }

  async getTopJettons(limit = 20): Promise<JettonInfo[]> {
    return Array.from(this.jettons.values())
      .sort((a, b) => Number(b.volume24h) - Number(a.volume24h))
      .slice(0, limit);
  }

  async getTopNFTCollections(limit = 20): Promise<NFTCollection[]> {
    return Array.from(this.collections.values())
      .sort((a, b) => Number(b.volume24h ?? 0) - Number(a.volume24h ?? 0))
      .slice(0, limit);
  }

  async getWhaleMovements(minValue: string): Promise<WhaleMovement[]> {
    const movements: WhaleMovement[] = [];
    const minValueNum = Number(minValue);
    const now = Date.now();

    for (let i = 0; i < 10; i++) {
      const value = Math.floor(Math.random() * 10000000) + minValueNum;
      movements.push({
        hash: this.generateMockHash(),
        timestamp: new Date(now - i * 3600000),
        from: this.generateMockAddress(),
        to: this.generateMockAddress(),
        value: String(value),
        token: 'TON',
        usdValue: value * 2.5, // Mock price
        type: ['transfer', 'exchange_deposit', 'exchange_withdrawal', 'defi_interaction'][
          Math.floor(Math.random() * 4)
        ] as WhaleMovement['type'],
      });
    }

    return movements;
  }

  configure(config: Partial<OnChainDataConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.cacheConfig?.enabled === false) {
      this.cache.clear();
    }
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeMockData(): void {
    // Initialize some mock jettons
    const jettonData = [
      { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { symbol: 'STON', name: 'STON.fi', decimals: 9 },
      { symbol: 'SCALE', name: 'Scaleton', decimals: 9 },
      { symbol: 'BOLT', name: 'Bolt', decimals: 9 },
    ];

    for (const data of jettonData) {
      const address = this.generateMockAddress();
      this.jettons.set(address, {
        address,
        symbol: data.symbol,
        name: data.name,
        decimals: data.decimals,
        totalSupply: String(Math.floor(Math.random() * 1000000000000)),
        adminAddress: this.generateMockAddress(),
        metadata: {
          description: `${data.name} on TON blockchain`,
        },
        holders: Math.floor(Math.random() * 100000) + 10000,
        transfers24h: Math.floor(Math.random() * 10000) + 1000,
        volume24h: String(Math.floor(Math.random() * 10000000)),
      });
    }

    // Initialize mock DeFi protocols
    const protocolData = [
      { name: 'STON.fi', type: 'dex' as DeFiProtocolType },
      { name: 'DeDust', type: 'dex' as DeFiProtocolType },
      { name: 'Evaa', type: 'lending' as DeFiProtocolType },
      { name: 'bemo', type: 'staking' as DeFiProtocolType },
      { name: 'Tonstakers', type: 'staking' as DeFiProtocolType },
    ];

    for (const data of protocolData) {
      const id = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const tvl = String(Math.floor(Math.random() * 100000000) + 10000000);
      this.protocols.set(id, {
        id,
        name: data.name,
        type: data.type,
        tvl,
        tvlChange24h: (Math.random() - 0.5) * 10,
        volume24h: String(Number(tvl) * (Math.random() * 0.5 + 0.1)),
        fees24h: String(Number(tvl) * 0.001),
        users24h: Math.floor(Math.random() * 5000) + 1000,
        contracts: [this.generateMockAddress()],
        pools: [],
      });

      // Add pools for DEXes
      if (data.type === 'dex') {
        const poolCount = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < poolCount; i++) {
          const poolId = `${id}-pool-${i}`;
          const pool: LiquidityPool = {
            id: poolId,
            protocol: id,
            tokenA: 'TON',
            tokenB: jettonData[i % jettonData.length].symbol,
            reserveA: String(Math.floor(Math.random() * 10000000)),
            reserveB: String(Math.floor(Math.random() * 10000000)),
            tvl: String(Math.floor(Math.random() * 5000000) + 500000),
            volume24h: String(Math.floor(Math.random() * 1000000)),
            apy: Math.random() * 50 + 5,
            fee: 0.003,
          };
          this.pools.set(poolId, pool);
        }
      }
    }

    // Initialize mock NFT collections
    const collectionNames = ['TON Diamonds', 'TON Punks', 'TON Apes', 'TON DNS'];
    for (const name of collectionNames) {
      const address = this.generateMockAddress();
      this.collections.set(address, {
        address,
        name,
        description: `A collection of unique ${name} on TON`,
        image: 'https://example.com/collection.png',
        itemsCount: Math.floor(Math.random() * 10000) + 1000,
        ownersCount: Math.floor(Math.random() * 5000) + 500,
        floorPrice: String(Math.random() * 100 + 1),
        volume24h: String(Math.floor(Math.random() * 100000)),
      });
    }

    // Initialize mock transactions
    for (let i = 0; i < 100; i++) {
      const hash = this.generateMockHash();
      this.transactions.set(hash, {
        hash,
        lt: String(Date.now() * 1000 + i),
        timestamp: new Date(Date.now() - i * 60000),
        sender: this.generateMockAddress(),
        receiver: this.generateMockAddress(),
        value: String(Math.floor(Math.random() * 100000000000)),
        fee: String(Math.floor(Math.random() * 10000000)),
        success: Math.random() > 0.05,
        exitCode: 0,
        messageType: 'internal',
      });
    }
  }

  private generateMockAddress(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'EQ';
    for (let i = 0; i < 46; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateMockHash(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateMockWallet(address: string): TONWallet {
    const jettons = Array.from(this.jettons.values())
      .slice(0, Math.floor(Math.random() * 5))
      .map((j) => ({
        jettonAddress: j.address,
        symbol: j.symbol,
        name: j.name,
        decimals: j.decimals,
        balance: String(Math.floor(Math.random() * 1000000)),
        usdValue: Math.random() * 10000,
      }));

    return {
      address,
      balance: String(Math.floor(Math.random() * 100000000000)),
      seqno: Math.floor(Math.random() * 100),
      lastActivity: new Date(Date.now() - Math.random() * 86400000),
      type: 'v4r2',
      status: 'active',
      jettonBalances: jettons,
      nftCount: Math.floor(Math.random() * 10),
    };
  }

  private getFromCache<T>(key: string): T | undefined {
    if (!this.config.cacheConfig.enabled) return undefined;

    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  private setCache<T>(key: string, value: T): void {
    if (!this.config.cacheConfig.enabled) return;

    // Evict if at max size
    if (this.cache.size >= this.config.cacheConfig.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.config.cacheConfig.ttlSeconds * 1000,
    });
  }

  private emitEvent(
    type: DataPlatformEvent['type'],
    category: DataPlatformEvent['category'],
    data: Record<string, unknown>
  ): void {
    const event: DataPlatformEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      data,
      source: 'on-chain-data-service',
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // Trigger an event when new data is fetched (public interface for testing)
  protected notifyDataFetched(dataType: string, count: number): void {
    this.emitEvent('data_ingested', 'ingestion', { dataType, count });
  }
}

interface CachedItem {
  value: unknown;
  expiresAt: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOnChainDataService(
  config?: Partial<OnChainDataConfig>
): DefaultOnChainDataService {
  return new DefaultOnChainDataService(config);
}
