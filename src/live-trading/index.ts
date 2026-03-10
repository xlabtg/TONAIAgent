/**
 * TONAIAgent - Live Trading Infrastructure
 *
 * Enables AI agents to execute real trades through integrated liquidity venues.
 * The infrastructure supports DEX, CEX, and DeFi protocols, initially optimized
 * for The Open Network (TON) ecosystem.
 *
 * Architecture:
 *   AI Agent → Strategy Engine → Execution Engine → Exchange Connectors → Liquidity Venues
 *
 * Core Components:
 *   1. Exchange Connector Layer  — modular connectors for DEX/CEX/DeFi
 *   2. Order Execution Engine    — routing, slippage control, retries, partial fills
 *   3. Market Data Integration   — price feeds, order books, trade history, volatility
 *   4. Risk Control Module       — pre-execution safety guardrails
 *   5. Portfolio Synchronization — balances, positions, realized/unrealized PnL
 *   6. Secure Key Management     — encrypted credentials, never exposed to agent logic
 *
 * @example
 * ```typescript
 * import { createLiveTradingInfrastructure } from '@tonaiagent/core/live-trading';
 *
 * const lti = createLiveTradingInfrastructure({ simulationMode: true });
 *
 * // Register a simulated exchange connector
 * lti.connectors.register(
 *   lti.connectors.createSimulated({
 *     exchangeId: 'stonfi',
 *     name: 'STON.fi DEX',
 *     type: 'dex',
 *     network: 'ton',
 *     endpoint: 'https://app.ston.fi/api',
 *   })
 * );
 *
 * // Connect all exchanges
 * await lti.connectors.registry.connectAll();
 *
 * // Set risk profile for an agent
 * lti.riskControls.setRiskProfile('agent_001', {
 *   maxPositionSizePercent: 10,
 *   maxDailyLossPercent: 3,
 *   maxTradesPerHour: 5,
 * });
 *
 * // Execute a trade
 * const result = await lti.executionEngine.execute({
 *   id: 'exec_001',
 *   agentId: 'agent_001',
 *   symbol: 'TON/USDT',
 *   side: 'buy',
 *   quantity: 100,
 *   slippageTolerance: 0.5,
 *   executionStrategy: 'direct',
 * });
 *
 * // Track portfolio
 * lti.portfolio.syncFromExecution('agent_001', result);
 * const summary = lti.portfolio.getAgentSummary('agent_001');
 * ```
 */

// Export all types
export * from './types';

// Export connector layer
export {
  BaseExchangeConnector,
  SimulatedExchangeConnector,
  ConnectorRegistry,
  ConnectorError,
  createSimulatedConnector,
  createConnectorRegistry,
  isTerminalOrderStatus,
  type ConnectAllResult,
  type ConnectorRegistryStatus,
} from './connector';

// Export execution engine
export {
  DefaultExecutionEngine,
  ExecutionError,
  createExecutionEngine,
  type ExecutionEngine,
  type ExecutionEngineConfig,
  type ExecutionMetrics,
} from './execution-engine';

// Export market data service
export {
  DefaultMarketDataService,
  createMarketDataService,
  type MarketDataService,
  type MarketDataServiceConfig,
} from './market-data';

// Export risk controls
export {
  DefaultRiskControlsService,
  createRiskControlsService,
  buildRiskProfile,
  type RiskControlsService,
  type AgentRiskStatus,
} from './risk-controls';

// Export portfolio service
export {
  DefaultPortfolioService,
  createPortfolioService,
  type PortfolioService,
  type PortfolioServiceConfig,
  type PortfolioSummary,
} from './portfolio';

// Export key management
export {
  DefaultKeyManagementService,
  KeyManagementError,
  createKeyManagementService,
  type KeyManagementService,
  type StoreCredentialInput,
  type DecryptedCredential,
  type TradingCredentialSummary,
} from './key-management';

// ============================================================================
// Live Trading Infrastructure — Unified Entry Point
// ============================================================================

import {
  LiveTradingConfig,
  LiveTradingHealth,
  LiveTradingMetrics,
  LiveTradingEventCallback,
  LiveTradingEvent,
} from './types';

import {
  ConnectorRegistry,
  SimulatedExchangeConnector,
  createConnectorRegistry,
  createSimulatedConnector,
} from './connector';

import { DefaultExecutionEngine, createExecutionEngine } from './execution-engine';
import { DefaultMarketDataService, createMarketDataService } from './market-data';
import { DefaultRiskControlsService, createRiskControlsService } from './risk-controls';
import { DefaultPortfolioService, createPortfolioService } from './portfolio';
import { DefaultKeyManagementService, createKeyManagementService } from './key-management';
import { ExchangeConnectorConfig } from './types';

const DEFAULT_CONFIG: LiveTradingConfig = {
  enabled: true,
  defaultSlippageTolerance: 0.5,
  defaultOrderType: 'market',
  simulationMode: false,
  marketData: {
    pricePollingIntervalMs: 5000,
    orderBookDepth: 20,
    tradeHistoryWindowMinutes: 60,
    enableCache: true,
    cacheTtlSeconds: 5,
  },
  riskDefaults: {
    maxPositionSizePercent: 20,
    maxStrategyExposurePercent: 50,
    maxSlippageTolerance: 1.0,
    maxDailyLossPercent: 5,
    maxTradesPerHour: 10,
  },
  portfolioSyncIntervalSeconds: 30,
  credentialStore: {
    algorithm: 'aes-256-gcm',
    kdf: 'pbkdf2',
    enableAuditLog: true,
  },
};

export interface LiveTradingInfrastructure {
  readonly config: LiveTradingConfig;
  readonly registry: ConnectorRegistry;
  readonly executionEngine: DefaultExecutionEngine;
  readonly marketData: DefaultMarketDataService;
  readonly riskControls: DefaultRiskControlsService;
  readonly portfolio: DefaultPortfolioService;
  readonly keyManagement: DefaultKeyManagementService;

  /** Create a simulated connector for testing/simulation mode */
  createSimulatedConnector(config: ExchangeConnectorConfig): SimulatedExchangeConnector;

  getHealth(): LiveTradingHealth;
  getMetrics(): LiveTradingMetrics;
  onEvent(callback: LiveTradingEventCallback): void;
}

export class DefaultLiveTradingInfrastructure implements LiveTradingInfrastructure {
  readonly config: LiveTradingConfig;
  readonly registry: ConnectorRegistry;
  readonly executionEngine: DefaultExecutionEngine;
  readonly marketData: DefaultMarketDataService;
  readonly riskControls: DefaultRiskControlsService;
  readonly portfolio: DefaultPortfolioService;
  readonly keyManagement: DefaultKeyManagementService;

  private readonly eventCallbacks: LiveTradingEventCallback[] = [];

  constructor(config: Partial<LiveTradingConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      marketData: { ...DEFAULT_CONFIG.marketData, ...config.marketData },
      riskDefaults: { ...DEFAULT_CONFIG.riskDefaults, ...config.riskDefaults },
      credentialStore: { ...DEFAULT_CONFIG.credentialStore, ...config.credentialStore },
    };

    this.registry = createConnectorRegistry();
    this.executionEngine = createExecutionEngine(this.registry, {
      defaultSlippageTolerance: this.config.defaultSlippageTolerance,
      simulationMode: this.config.simulationMode,
    });
    this.marketData = createMarketDataService(this.config.marketData);
    this.riskControls = createRiskControlsService(this.config.riskDefaults);
    this.portfolio = createPortfolioService();
    this.keyManagement = createKeyManagementService(this.config.credentialStore);

    this.wireEventForwarding();
  }

  createSimulatedConnector(connectorConfig: ExchangeConnectorConfig): SimulatedExchangeConnector {
    return createSimulatedConnector(connectorConfig);
  }

  getHealth(): LiveTradingHealth {
    const registryStatus = this.registry.getStatus();
    const components = {
      exchangeConnectors: registryStatus.total > 0 && registryStatus.errored < registryStatus.total,
      executionEngine: true,
      marketData: true,
      riskControls: true,
      portfolio: true,
      keyManagement: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: LiveTradingHealth['overall'];
    if (healthyCount === totalCount && registryStatus.connected > 0) {
      overall = 'healthy';
    } else if (healthyCount >= Math.ceil(totalCount / 2)) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      connectedExchanges: registryStatus.connected,
      totalExchanges: registryStatus.total,
      lastCheck: new Date(),
    };
  }

  getMetrics(): LiveTradingMetrics {
    const execMetrics = this.executionEngine.getMetrics();
    const registryStatus = this.registry.getStatus();

    return {
      totalExecutions: execMetrics.totalExecutions,
      successfulExecutions: execMetrics.successfulExecutions,
      failedExecutions: execMetrics.failedExecutions,
      totalVolumeTraded: execMetrics.totalVolumeUSD,
      totalFeesPaid: 0, // Would aggregate from portfolio service in production
      activeAgents: this.executionEngine.getActiveExecutions().length,
      connectedExchanges: registryStatus.connected,
      riskViolationsToday: 0, // Would aggregate from risk controls in production
      averageExecutionTimeMs: execMetrics.averageExecutionTimeMs,
      updatedAt: new Date(),
    };
  }

  onEvent(callback: LiveTradingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private wireEventForwarding(): void {
    const forward = (event: LiveTradingEvent) => {
      for (const cb of this.eventCallbacks) {
        try {
          cb(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.registry.onEvent(forward);
    this.executionEngine.onEvent(forward);
    this.marketData.onEvent(forward);
    this.riskControls.onEvent(forward);
    this.portfolio.onEvent(forward);
    this.keyManagement.onEvent(forward);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLiveTradingInfrastructure(
  config?: Partial<LiveTradingConfig>
): DefaultLiveTradingInfrastructure {
  return new DefaultLiveTradingInfrastructure(config);
}

// Default export
export default DefaultLiveTradingInfrastructure;
