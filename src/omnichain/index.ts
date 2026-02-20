/**
 * TONAIAgent - Omnichain Agent Infrastructure
 *
 * Comprehensive cross-chain infrastructure enabling autonomous agents to operate
 * across multiple blockchains while maintaining a TON-first execution environment.
 *
 * Features:
 * - Cross-chain capital movement via ChangeNOW integration
 * - Unified portfolio management across 200+ chains
 * - Cross-chain strategy engine (arbitrage, yield rotation, hedging)
 * - Risk assessment and security controls
 * - Real-time monitoring and observability
 * - Cost optimization with intelligent routing
 *
 * @example
 * ```typescript
 * import { createOmnichainService, OmnichainConfig } from './omnichain';
 *
 * const config: Partial<OmnichainConfig> = {
 *   enabled: true,
 *   primaryChain: 'ton',
 *   changeNow: {
 *     apiKey: process.env.CHANGENOW_API_KEY,
 *   },
 * };
 *
 * const omnichain = createOmnichainService(config);
 *
 * // Get cross-chain portfolio
 * const portfolio = await omnichain.portfolio.getPortfolio('user_123');
 *
 * // Create a cross-chain strategy
 * const strategy = await omnichain.strategy.createStrategy({
 *   name: 'Cross-Chain Arbitrage',
 *   type: 'arbitrage',
 *   userId: 'user_123',
 *   agentId: 'agent_456',
 *   allowedChains: ['ton', 'eth', 'bnb'],
 * });
 *
 * // Execute a swap via ChangeNOW
 * const estimate = await omnichain.exchange.getEstimate('ton', 'eth', '100');
 * ```
 */

// Export all types
export * from './types';

// Export ChangeNOW client
export {
  DefaultChangeNowClient,
  createChangeNowClient,
  type ChangeNowClient,
  type ChangeNowClientConfig,
} from './changenow-client';

// Export Portfolio engine
export {
  DefaultPortfolioEngine,
  createPortfolioEngine,
  type PortfolioEngine,
  type PortfolioEngineConfig,
  type PortfolioSnapshot,
} from './portfolio';

// Export Strategy engine
export {
  DefaultCrossChainStrategyEngine,
  createCrossChainStrategyEngine,
  type CrossChainStrategyEngine,
  type CreateStrategyInput,
  type UpdateStrategyInput,
  type StrategyFilter,
  type TriggeredActions,
  type TriggeredTrigger,
  type PendingAction,
  type TriggerSimulation,
  type SimulatedOutcome,
  type StrategyTemplate,
  type StrategyEngineConfig,
} from './strategy';

// Export Risk engine
export {
  DefaultRiskEngine,
  createRiskEngine,
  type RiskEngine,
  type RiskEngineConfig,
  type PolicyEvaluation,
  type PolicyViolation,
  type RequiredPolicyAction,
  type SlippageRisk,
  type EmergencyScope,
  type RiskAlertFilters,
} from './risk';

// Export Monitoring service
export {
  DefaultMonitoringService,
  createMonitoringService,
  type MonitoringService,
  type MonitoringServiceConfig,
  type EventFilters,
  type TransactionHistoryFilters,
  type TransactionHistoryEntry,
  type StatusTimestamp,
  type CreateAlertInput,
  type AlertEntry,
  type AlertFilters,
  type DashboardData,
  type DashboardSummary,
  type TransactionSummary,
  type ChainStatusEntry,
  type AlertSummary,
  type PerformanceSummary,
} from './monitoring';

// Export Cost optimizer
export {
  DefaultCostOptimizer,
  createCostOptimizer,
  type CostOptimizer,
  type CostOptimizerConfig,
  type RouteRequest,
  type RouteComparison,
  type GasEstimateRequest,
  type GasPriceInfo,
  type OptimalGasPrice,
  type BatchResult,
  type BatchTransactionResult,
  type FeeForecast,
  type CostAnalysis,
  type CostBreakdown,
  type OptimizationSuggestion,
  type CostHistoryFilters,
  type CostHistoryEntry,
} from './cost-optimization';

// ============================================================================
// Unified Omnichain Service
// ============================================================================

import {
  OmnichainConfig,
  OmnichainEvent,
  OmnichainEventCallback,
  ChainId,
} from './types';

import { DefaultChangeNowClient, createChangeNowClient } from './changenow-client';
import { DefaultPortfolioEngine, createPortfolioEngine } from './portfolio';
import { DefaultCrossChainStrategyEngine, createCrossChainStrategyEngine } from './strategy';
import { DefaultRiskEngine, createRiskEngine } from './risk';
import { DefaultMonitoringService, createMonitoringService } from './monitoring';
import { DefaultCostOptimizer, createCostOptimizer } from './cost-optimization';

export interface OmnichainService {
  readonly enabled: boolean;
  readonly primaryChain: ChainId;
  readonly exchange: DefaultChangeNowClient;
  readonly portfolio: DefaultPortfolioEngine;
  readonly strategy: DefaultCrossChainStrategyEngine;
  readonly risk: DefaultRiskEngine;
  readonly monitoring: DefaultMonitoringService;
  readonly costOptimizer: DefaultCostOptimizer;

  // Health check
  getHealth(): Promise<OmnichainHealth>;

  // Events
  onEvent(callback: OmnichainEventCallback): void;
}

export interface OmnichainHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    exchange: boolean;
    portfolio: boolean;
    strategy: boolean;
    risk: boolean;
    monitoring: boolean;
    costOptimizer: boolean;
  };
  chainStatus: Record<ChainId, 'operational' | 'degraded' | 'down'>;
  lastCheck: Date;
  details: Record<string, unknown>;
}

export class DefaultOmnichainService implements OmnichainService {
  readonly enabled: boolean;
  readonly primaryChain: ChainId;
  readonly exchange: DefaultChangeNowClient;
  readonly portfolio: DefaultPortfolioEngine;
  readonly strategy: DefaultCrossChainStrategyEngine;
  readonly risk: DefaultRiskEngine;
  readonly monitoring: DefaultMonitoringService;
  readonly costOptimizer: DefaultCostOptimizer;

  private readonly eventCallbacks: OmnichainEventCallback[] = [];
  private readonly supportedChains: ChainId[];

  constructor(config: Partial<OmnichainConfig> = {}) {
    this.enabled = config.enabled ?? true;
    this.primaryChain = config.primaryChain ?? 'ton';
    this.supportedChains = config.supportedChains ?? [
      'ton',
      'eth',
      'sol',
      'bnb',
      'polygon',
      'arbitrum',
      'optimism',
    ];

    // Initialize ChangeNOW client
    this.exchange = createChangeNowClient(config.changeNow);

    // Initialize Portfolio engine
    this.portfolio = createPortfolioEngine(config.portfolio);

    // Initialize Strategy engine
    this.strategy = createCrossChainStrategyEngine(config.strategy);

    // Initialize Risk engine
    this.risk = createRiskEngine(config.risk);

    // Initialize Monitoring service
    this.monitoring = createMonitoringService(config.monitoring);

    // Initialize Cost optimizer
    this.costOptimizer = createCostOptimizer(config.costOptimization);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<OmnichainHealth> {
    const components = {
      exchange: await this.checkExchangeHealth(),
      portfolio: true, // Always healthy if initialized
      strategy: true,
      risk: true,
      monitoring: true,
      costOptimizer: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: OmnichainHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    // Get chain statuses
    const chainStatus: Record<ChainId, 'operational' | 'degraded' | 'down'> = {};
    for (const chainId of this.supportedChains) {
      const profileResult = await this.risk.getChainRiskProfile(chainId);
      if (profileResult.success && profileResult.data) {
        if (profileResult.data.overallRiskScore <= 3) {
          chainStatus[chainId] = 'operational';
        } else if (profileResult.data.overallRiskScore <= 6) {
          chainStatus[chainId] = 'degraded';
        } else {
          chainStatus[chainId] = 'down';
        }
      } else {
        chainStatus[chainId] = 'degraded';
      }
    }

    return {
      overall,
      components,
      chainStatus,
      lastCheck: new Date(),
      details: {
        enabled: this.enabled,
        primaryChain: this.primaryChain,
        supportedChains: this.supportedChains,
      },
    };
  }

  onEvent(callback: OmnichainEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private async checkExchangeHealth(): Promise<boolean> {
    const result = await this.exchange.checkHealth();
    return result.success && result.data === true;
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: OmnichainEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.exchange.onEvent(forwardEvent);
    this.portfolio.onEvent(forwardEvent);
    this.strategy.onEvent(forwardEvent);
    this.risk.onEvent(forwardEvent);
    this.monitoring.onEvent(forwardEvent);
    this.costOptimizer.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOmnichainService(
  config?: Partial<OmnichainConfig>
): DefaultOmnichainService {
  return new DefaultOmnichainService(config);
}

// Default export
export default DefaultOmnichainService;
