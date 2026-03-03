/**
 * TONAIAgent - Global Infrastructure & Edge Deployment
 *
 * Production-grade global infrastructure enabling millions of users,
 * autonomous agents running 24/7, low-latency execution, regional compliance,
 * and edge intelligence across the global TON AI Agent network.
 *
 * Components:
 * - EdgeNodeRegistry: Global registry of edge execution nodes across all regions
 * - GeoRouter: Latency-aware, compliance-first geo-distributed agent orchestration
 * - ComplianceEngine: Compliance-aware regional deployment (GDPR, MiCA, FATF, etc.)
 * - GlobalScheduler: Timezone-aware, fault-tolerant global distributed scheduler
 * - CostOptimizer: Autonomous cost optimization and savings recommendations
 * - GlobalMonitor: Real-time global observability and health monitoring
 * - EdgeIntelligenceLayer: Edge AI inference, streaming data, and local caching
 * - GlobalInfrastructureManager: Unified entry point coordinating all components
 *
 * Issue #100: Global Infrastructure & Edge Deployment
 *
 * Architecture:
 * ```
 * GlobalInfrastructureManager
 *   ├── EdgeNodeRegistry      — Node lifecycle, health tracking, capacity
 *   ├── GeoRouter             — Smart routing, failover, placement decisions
 *   ├── ComplianceEngine      — Jurisdictional compliance, data residency
 *   ├── GlobalScheduler       — Global cron, timezone-aware, cross-region sync
 *   ├── CostOptimizer         — Spot pricing, workload shifting, recommendations
 *   ├── GlobalMonitor         — Health status, latency, uptime, alerting
 *   └── EdgeIntelligenceLayer — Local ML inference, streaming, caching
 * ```
 *
 * @example
 * ```typescript
 * import {
 *   createGlobalInfrastructureManager,
 * } from '@tonaiagent/core/global-infrastructure';
 *
 * const infra = createGlobalInfrastructureManager();
 * infra.start();
 *
 * // Register a new edge node in Singapore
 * const node = infra.nodeRegistry.registerNode({
 *   name: 'tonai-sgp-01',
 *   region: 'ap-southeast-1',
 *   provider: 'aws',
 *   deploymentModel: 'public_cloud',
 *   endpoint: 'https://sgp-01.tonaiagent.io',
 *   maxAgents: 200,
 *   capacityUnits: 100,
 * });
 *
 * // Place an agent with GDPR compliance requirements
 * const placement = await infra.router.placeAgent({
 *   agentId: 'agent_001',
 *   tenantId: 'tenant_acme',
 *   userCountry: 'DE',
 *   complianceRequirements: ['gdpr'],
 *   maxLatencyMs: 100,
 * });
 *
 * // Schedule a timezone-aware global job
 * const job = infra.scheduler.registerJob({
 *   name: 'Daily Portfolio Rebalance',
 *   agentId: 'agent_001',
 *   tenantId: 'tenant_acme',
 *   trigger: 'timezone_aware',
 *   cronExpression: '@daily',
 *   timezone: 'Europe/Berlin',
 *   targetRegions: ['eu-west-1', 'eu-central-1'],
 * });
 *
 * // Get global health dashboard
 * const health = infra.monitor.computeGlobalHealth();
 * console.log(health.overall, health.globalP95LatencyMs + 'ms');
 *
 * // Run cost optimization
 * const recommendations = infra.costOptimizer.generateRecommendations();
 * console.log('Savings available:', recommendations.map(r => r.estimatedSavingsUsd));
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Region & Node Types
  CloudProvider,
  RegionCode,
  GeographicZone,
  NodeStatus,
  DeploymentModel,
  EdgeNode,
  EdgeNodeFeatures,
  EdgeNodeMetrics,

  // Routing Types
  RoutingStrategy,
  RoutingRule,
  RoutingCondition,
  AgentPlacementRequest,
  AgentPlacementResult,

  // Edge Intelligence Types
  InferenceModel,
  EdgeInferenceTask,
  EdgeCacheConfig,
  StreamingDataConfig,
  StreamingDataSource,

  // Global Scheduler Types
  GlobalJobTrigger,
  GlobalScheduledJob,
  GlobalJobExecution,

  // Compliance Types
  ComplianceFramework,
  RegionalComplianceProfile,
  ComplianceCheckRequest,
  ComplianceCheckResult,

  // Hybrid Cloud Types
  CloudProviderConfig,
  HybridDeploymentConfig,

  // Cost Optimization Types
  ComputePricing,
  CostAllocation,
  CostOptimizationRecommendation,

  // Monitoring Types
  GlobalHealthStatus,
  RegionHealthStatus,
  GlobalMetricsSummary,
  RegionMetrics,

  // Event Types
  GlobalInfraEventType,
  GlobalInfraEvent,
  GlobalInfraEventCallback,

  // Config Types
  GlobalInfrastructureConfig,
} from './types';

// ============================================================================
// Component Exports
// ============================================================================

export {
  EdgeNodeRegistry,
  createEdgeNodeRegistry,
  DEFAULT_EDGE_FEATURES,
  REGION_ZONE_MAP,
  REGION_COMPLIANCE_MAP,
} from './edge-node-registry';

export {
  GeoRouter,
  createGeoRouter,
} from './geo-router';

export {
  ComplianceEngine,
  createComplianceEngine,
  REGIONAL_COMPLIANCE_PROFILES,
} from './compliance-engine';

export {
  GlobalScheduler,
  createGlobalScheduler,
} from './global-scheduler';

export {
  CostOptimizer,
  createCostOptimizer,
  DEFAULT_PRICING,
} from './cost-optimizer';

export {
  GlobalMonitor,
  createGlobalMonitor,
} from './global-monitor';

export {
  EdgeIntelligenceLayer,
  createEdgeIntelligenceLayer,
} from './edge-intelligence';

// ============================================================================
// Global Infrastructure Manager — Unified Entry Point
// ============================================================================

import type { GlobalInfrastructureConfig, GlobalInfraEvent, GlobalInfraEventCallback } from './types';
import type { RegionCode } from './types';
import { EdgeNodeRegistry, createEdgeNodeRegistry } from './edge-node-registry';
import { GeoRouter, createGeoRouter } from './geo-router';
import { ComplianceEngine, createComplianceEngine } from './compliance-engine';
import { GlobalScheduler, createGlobalScheduler } from './global-scheduler';
import { CostOptimizer, createCostOptimizer } from './cost-optimizer';
import { GlobalMonitor, createGlobalMonitor } from './global-monitor';
import { EdgeIntelligenceLayer, createEdgeIntelligenceLayer } from './edge-intelligence';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_GLOBAL_INFRA_CONFIG: GlobalInfrastructureConfig = {
  enabledRegions: [
    'us-east-1',
    'eu-west-1',
    'ap-southeast-1',
    'me-south-1',
    'sa-east-1',
  ],
  defaultRegion: 'us-east-1',
  defaultRoutingStrategy: 'latency_optimized',
  hybrid: {
    providers: [],
    defaultProvider: 'aws',
    failoverEnabled: true,
    autoBalancing: true,
    costOptimizationEnabled: true,
    decentralizedNodesEnabled: false,
    tonNativeNodesEnabled: true,
  },
  costOptimization: {
    enabled: true,
    autoApplyRecommendations: false,
    maxCostIncreasePercent: 10,
    targetSavingsPercent: 20,
  },
  monitoring: {
    healthCheckIntervalMs: 15_000,
    metricsAggregationIntervalMs: 60_000,
    latencyAlertThresholdMs: 100,
    uptimeAlertThresholdPercent: 99.9,
  },
  compliance: {
    enforceDataResidency: true,
    defaultFrameworks: ['fatf'],
    blockNonCompliantPlacements: true,
  },
  edgeIntelligence: {
    enableLocalInference: true,
    enableStreamingData: true,
    enableEdgeCaching: true,
    cacheTtlSeconds: 300,
  },
  scheduler: {
    enableGlobalCron: true,
    enableTimezoneAwareness: true,
    enableCrossRegionSync: true,
    leaderElectionIntervalMs: 30_000,
  },
};

// ============================================================================
// Manager Interface
// ============================================================================

export interface GlobalInfrastructureManagerInterface {
  readonly nodeRegistry: EdgeNodeRegistry;
  readonly router: GeoRouter;
  readonly compliance: ComplianceEngine;
  readonly scheduler: GlobalScheduler;
  readonly costOptimizer: CostOptimizer;
  readonly monitor: GlobalMonitor;
  readonly edgeIntelligence: EdgeIntelligenceLayer;
  start(): void;
  stop(): void;
  onEvent(callback: GlobalInfraEventCallback): void;
}

// ============================================================================
// Manager Class
// ============================================================================

export class GlobalInfrastructureManager implements GlobalInfrastructureManagerInterface {
  readonly nodeRegistry: EdgeNodeRegistry;
  readonly router: GeoRouter;
  readonly compliance: ComplianceEngine;
  readonly scheduler: GlobalScheduler;
  readonly costOptimizer: CostOptimizer;
  readonly monitor: GlobalMonitor;
  readonly edgeIntelligence: EdgeIntelligenceLayer;

  private readonly eventCallbacks: GlobalInfraEventCallback[] = [];
  private running = false;

  constructor(config: Partial<GlobalInfrastructureConfig> = {}) {
    const _cfg = { ...DEFAULT_GLOBAL_INFRA_CONFIG, ...config };

    this.nodeRegistry = createEdgeNodeRegistry();
    this.compliance = createComplianceEngine();
    this.router = createGeoRouter(this.nodeRegistry, this.compliance);
    this.scheduler = createGlobalScheduler(this.nodeRegistry);
    this.costOptimizer = createCostOptimizer(this.nodeRegistry);
    this.monitor = createGlobalMonitor(this.nodeRegistry);
    this.edgeIntelligence = createEdgeIntelligenceLayer(this.nodeRegistry);

    // Wire up event forwarding from all components
    this.nodeRegistry.onEvent((e) => this.forwardEvent(e));
    this.router.onEvent((e) => this.forwardEvent(e));
    this.scheduler.onEvent((e) => this.forwardEvent(e));
    this.costOptimizer.onEvent((e) => this.forwardEvent(e));
    this.monitor.onEvent((e) => this.forwardEvent(e));
    this.edgeIntelligence.onEvent((e) => this.forwardEvent(e));
  }

  /**
   * Start all background loops (monitoring, scheduling).
   */
  start(): void {
    if (this.running) return;
    this.monitor.start();
    this.scheduler.start();
    this.running = true;
  }

  /**
   * Stop all background loops.
   */
  stop(): void {
    if (!this.running) return;
    this.monitor.stop();
    this.scheduler.stop();
    this.running = false;
  }

  /**
   * Subscribe to all global infrastructure events.
   */
  onEvent(callback: GlobalInfraEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private
  // ============================================================================

  private forwardEvent(event: GlobalInfraEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore
      }
    }
  }
}

export function createGlobalInfrastructureManager(
  config?: Partial<GlobalInfrastructureConfig>
): GlobalInfrastructureManager {
  return new GlobalInfrastructureManager(config);
}

export default GlobalInfrastructureManager;
