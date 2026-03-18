/**
 * TONAIAgent - TON Smart Contract Factory Module
 *
 * TON-native Smart Contract Factory system for autonomous AI agents.
 *
 * Features:
 * - Factory Contract: Deploy Agent Wallet and Strategy Contracts
 *   with deterministic address generation, version control, upgrade patterns
 * - Agent Wallet Architecture: Non-Custodial, MPC, Smart Contract wallet modes
 * - Strategy Execution: Hybrid off-chain orchestration + on-chain logic
 * - On-Chain Registry: Track agents with performance metrics and audit trails
 * - Fee & Revenue: Performance fees, protocol fees, marketplace commissions,
 *   referral rewards, and treasury routing
 * - Security: Role-based access, emergency pause, multi-sig upgrades,
 *   reentrancy protection, gas protection
 * - TON Integrations: Jettons, NFTs, DEX swaps, liquidity, staking, DAO voting,
 *   TON DNS, TON Storage, DeFi protocols
 * - Backend Integration: Deployment transactions, Telegram user mapping,
 *   contract event monitoring
 *
 * @example
 * ```typescript
 * import { createTonFactoryService } from '@tonaiagent/core/ton-factory';
 *
 * const factory = createTonFactoryService({
 *   network: 'testnet',
 *   factory: {
 *     owner: 'EQD...',
 *     treasury: 'EQD...',
 *   },
 * });
 *
 * // Deploy an agent wallet
 * const result = await factory.factory.deployAgent({
 *   ownerId: 'telegram_user_123',
 *   ownerAddress: 'EQD...',
 *   walletMode: 'smart-contract',
 *   scWalletConfig: {
 *     txSpendingLimit: BigInt(1_000_000_000), // 1 TON
 *     dailySpendingLimit: BigInt(5_000_000_000), // 5 TON
 *     whitelistedAddresses: [],
 *     allowedTxTypes: ['transfer', 'swap', 'stake'],
 *     requireMultiSigAbove: BigInt(10_000_000_000), // 10 TON
 *   },
 * });
 *
 * // Register in on-chain registry
 * factory.registry.registerAgent(
 *   result.agentId,
 *   'EQD_owner...',
 *   result.contractAddress,
 *   {},
 *   { telegramUserId: 'telegram_user_123' }
 * );
 *
 * // Create and execute a strategy
 * const strategy = factory.executor.createStrategy({
 *   agentId: result.agentId,
 *   strategyType: 'dca',
 *   params: { interval: 'daily', amount: BigInt(100_000_000) },
 *   version: '1.0.0',
 *   riskLevel: 'low',
 *   maxGasBudget: BigInt(50_000_000),
 * });
 * await factory.executor.startStrategy(strategy.strategyId);
 * const execResult = await factory.executor.executeStrategy(
 *   strategy.strategyId,
 *   BigInt(1_000_000_000)
 * );
 * ```
 */

// ============================================================================
// Core Type Exports
// ============================================================================

export * from './types';

// ============================================================================
// Factory Contract
// ============================================================================

export {
  FactoryContractManager,
  createFactoryContractManager,
  deriveContractAddress,
  buildDeploymentTransaction,
  DEFAULT_FACTORY_CONFIG,
} from './factory-contract';

// ============================================================================
// Agent Wallet
// ============================================================================

export {
  NonCustodialProvider,
  MPCProvider,
  SmartContractWalletProvider,
  AgentWalletManager,
  createAgentWalletManager,
} from './agent-wallet';

// ============================================================================
// Strategy Executor
// ============================================================================

export {
  StrategyExecutor,
  createStrategyExecutor,
} from './strategy-executor';

// ============================================================================
// On-Chain Registry
// ============================================================================

export {
  AgentRegistry,
  createAgentRegistry,
} from './registry';

// ============================================================================
// Fee Manager
// ============================================================================

export {
  FeeManager,
  createFeeManager,
  DEFAULT_FEE_CONFIG,
  type CreatorBalance,
} from './fee-manager';

// ============================================================================
// TonFactory Service - Unified Entry Point
// ============================================================================

import type {
  TonFactoryConfig,
  TonFactoryEvent,
  TonFactoryEventHandler,
  Unsubscribe,
  FactoryConfig,
  FeeConfig,
} from './types';

import { FactoryContractManager, DEFAULT_FACTORY_CONFIG } from './factory-contract';
import { AgentWalletManager } from './agent-wallet';
import { StrategyExecutor } from './strategy-executor';
import { AgentRegistry } from './registry';
import { FeeManager, DEFAULT_FEE_CONFIG } from './fee-manager';

// ============================================================================
// Default Configuration
// ============================================================================

export const defaultTonFactoryConfig: TonFactoryConfig = {
  enabled: true,
  network: 'testnet',
  factory: DEFAULT_FACTORY_CONFIG,
  fees: DEFAULT_FEE_CONFIG,
  enableOnChain: false,
  maxConcurrentExecutions: 5,
  registryCleanupIntervalHours: 24,
};

// ============================================================================
// Service Interface
// ============================================================================

export interface TonFactoryHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    factory: boolean;
    wallets: boolean;
    executor: boolean;
    registry: boolean;
    fees: boolean;
  };
  stats: {
    totalAgents: number;
    activeAgents: number;
    totalStrategies: number;
    totalFeesPending: bigint;
  };
  lastCheck: Date;
}

export interface TonFactoryService {
  /** Whether the module is enabled */
  readonly enabled: boolean;
  /** Factory Contract manager */
  readonly factory: FactoryContractManager;
  /** Agent Wallet manager */
  readonly wallets: AgentWalletManager;
  /** Strategy Executor */
  readonly executor: StrategyExecutor;
  /** On-chain Registry */
  readonly registry: AgentRegistry;
  /** Fee Manager */
  readonly fees: FeeManager;

  /** Get service health */
  getHealth(): Promise<TonFactoryHealth>;

  /** Subscribe to all events */
  subscribe(handler: TonFactoryEventHandler): Unsubscribe;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class DefaultTonFactoryService implements TonFactoryService {
  readonly enabled: boolean;
  readonly factory: FactoryContractManager;
  readonly wallets: AgentWalletManager;
  readonly executor: StrategyExecutor;
  readonly registry: AgentRegistry;
  readonly fees: FeeManager;

  private readonly config: TonFactoryConfig;
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();

  constructor(config: Partial<TonFactoryConfig> = {}) {
    this.config = {
      ...defaultTonFactoryConfig,
      ...config,
      factory: { ...DEFAULT_FACTORY_CONFIG, ...config.factory } as FactoryConfig,
      fees: { ...DEFAULT_FEE_CONFIG, ...config.fees } as FeeConfig,
    };

    this.enabled = this.config.enabled;

    // Initialize all components
    this.factory = new FactoryContractManager(this.config.factory);
    this.wallets = new AgentWalletManager();
    this.executor = new StrategyExecutor();
    this.registry = new AgentRegistry();
    this.fees = new FeeManager(this.config.fees);

    // Wire up event forwarding from all components
    this.setupEventForwarding();
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async getHealth(): Promise<TonFactoryHealth> {
    const factoryStats = this.factory.getStats();
    const activeAgents = this.registry.getActiveCount();
    const pendingFees = this.fees.getTotalPendingFees();
    const activeStrategies = this.executor.getStrategiesByStatus('running').length;

    const components = {
      factory: this.enabled && this.config.factory.acceptingDeployments,
      wallets: this.enabled,
      executor: this.enabled,
      registry: this.enabled,
      fees: this.enabled,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: TonFactoryHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= Math.floor(totalCount / 2)) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      stats: {
        totalAgents: factoryStats.totalAgentsDeployed,
        activeAgents,
        totalStrategies: factoryStats.totalStrategiesDeployed + activeStrategies,
        totalFeesPending: pendingFees,
      },
      lastCheck: new Date(),
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: TonFactoryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore
      }
    }
  }

  private setupEventForwarding(): void {
    const forward = (event: TonFactoryEvent) => this.emitEvent(event);

    this.factory.subscribe(forward);
    this.wallets.subscribe(forward);
    this.executor.subscribe(forward);
    this.registry.subscribe(forward);
    this.fees.subscribe(forward);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TON Factory Service instance.
 *
 * @example
 * ```typescript
 * const factory = createTonFactoryService({
 *   network: 'testnet',
 *   factory: { owner: 'EQD...', treasury: 'EQD...' },
 * });
 * ```
 */
export function createTonFactoryService(
  config?: Partial<TonFactoryConfig>
): DefaultTonFactoryService {
  return new DefaultTonFactoryService(config);
}

export default DefaultTonFactoryService;
