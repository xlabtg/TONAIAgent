/**
 * TONAIAgent - Edge Node Registry
 *
 * Manages the global registry of edge execution nodes across all regions
 * and cloud providers. Provides node discovery, health tracking, capacity
 * management, and lifecycle operations.
 *
 * Issue #100: Global Infrastructure & Edge Deployment
 */

import type {
  EdgeNode,
  EdgeNodeMetrics,
  EdgeNodeFeatures,
  RegionCode,
  GeographicZone,
  CloudProvider,
  NodeStatus,
  DeploymentModel,
  GlobalInfraEvent,
  GlobalInfraEventCallback,
} from './types';

// ============================================================================
// Default Edge Node Features
// ============================================================================

export const DEFAULT_EDGE_FEATURES: EdgeNodeFeatures = {
  aiInference: true,
  streamingData: true,
  localCaching: true,
  onChainListening: true,
  complianceFiltering: true,
  edgeScheduler: true,
};

// ============================================================================
// Built-in Region Definitions
// ============================================================================

export const REGION_ZONE_MAP: Record<RegionCode, GeographicZone> = {
  'us-east-1': 'north_america',
  'us-west-2': 'north_america',
  'eu-west-1': 'europe',
  'eu-central-1': 'europe',
  'ap-southeast-1': 'asia_pacific',
  'ap-northeast-1': 'asia_pacific',
  'me-south-1': 'middle_east',
  'sa-east-1': 'latin_america',
  'af-south-1': 'africa',
  'ap-south-1': 'asia_pacific',
};

export const REGION_COMPLIANCE_MAP: Record<RegionCode, string[]> = {
  'us-east-1': ['fatf', 'ccpa'],
  'us-west-2': ['fatf', 'ccpa'],
  'eu-west-1': ['gdpr', 'mica', 'fatf'],
  'eu-central-1': ['gdpr', 'mica', 'fatf'],
  'ap-southeast-1': ['fatf', 'pdpa'],
  'ap-northeast-1': ['fatf', 'pipeda'],
  'me-south-1': ['fatf'],
  'sa-east-1': ['fatf', 'lgpd'],
  'af-south-1': ['fatf', 'popia'],
  'ap-south-1': ['fatf'],
};

// ============================================================================
// Edge Node Registry
// ============================================================================

export class EdgeNodeRegistry {
  private readonly nodes = new Map<string, EdgeNode>();
  private readonly metricsHistory = new Map<string, EdgeNodeMetrics[]>();
  private readonly eventCallbacks: GlobalInfraEventCallback[] = [];
  private readonly MAX_METRICS_HISTORY = 60; // Keep last 60 snapshots per node

  /**
   * Register a new edge node in the global registry.
   */
  registerNode(input: {
    name: string;
    region: RegionCode;
    provider: CloudProvider;
    deploymentModel: DeploymentModel;
    endpoint: string;
    maxAgents: number;
    capacityUnits: number;
    complianceZones?: string[];
    dataResidencyRegions?: string[];
    featureFlags?: Partial<EdgeNodeFeatures>;
    metadata?: Record<string, unknown>;
  }): EdgeNode {
    const nodeId = `node_${input.region}_${input.provider}_${Date.now()}`;
    const zone = REGION_ZONE_MAP[input.region];
    const defaultCompliance = REGION_COMPLIANCE_MAP[input.region] ?? [];

    const node: EdgeNode = {
      id: nodeId,
      name: input.name,
      region: input.region,
      zone,
      provider: input.provider,
      deploymentModel: input.deploymentModel,
      status: 'provisioning',
      endpoint: input.endpoint,
      latencyMs: 0,
      capacityUnits: input.capacityUnits,
      usedCapacityUnits: 0,
      activeAgents: 0,
      maxAgents: input.maxAgents,
      complianceZones: input.complianceZones ?? defaultCompliance,
      dataResidencyRegions: input.dataResidencyRegions ?? [input.region],
      featureFlags: { ...DEFAULT_EDGE_FEATURES, ...input.featureFlags },
      healthScore: 100,
      lastHeartbeatAt: new Date(),
      createdAt: new Date(),
      metadata: input.metadata ?? {},
    };

    this.nodes.set(nodeId, node);
    this.metricsHistory.set(nodeId, []);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'node_online',
      nodeId,
      region: input.region,
      severity: 'info',
      message: `Edge node ${node.name} registered in ${input.region}`,
      data: { nodeId, region: input.region, provider: input.provider },
    });

    return node;
  }

  /**
   * Transition a node to active status after provisioning completes.
   */
  activateNode(nodeId: string): EdgeNode {
    const node = this.requireNode(nodeId);
    node.status = 'active';
    node.lastHeartbeatAt = new Date();
    return node;
  }

  /**
   * Update a node's status.
   */
  updateNodeStatus(nodeId: string, status: NodeStatus): EdgeNode {
    const node = this.requireNode(nodeId);
    const prevStatus = node.status;
    node.status = status;
    node.lastHeartbeatAt = new Date();

    if (status === 'offline' && prevStatus !== 'offline') {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'node_offline',
        nodeId,
        region: node.region,
        severity: 'error',
        message: `Edge node ${node.name} went offline`,
        data: { nodeId, region: node.region, prevStatus },
      });
    } else if (status === 'degraded' && prevStatus === 'active') {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'node_degraded',
        nodeId,
        region: node.region,
        severity: 'warning',
        message: `Edge node ${node.name} is degraded`,
        data: { nodeId, region: node.region },
      });
    }

    return node;
  }

  /**
   * Record fresh metrics for a node and update derived health score.
   */
  recordMetrics(metrics: EdgeNodeMetrics): void {
    const node = this.requireNode(metrics.nodeId);

    // Update node live fields
    node.latencyMs = metrics.p50LatencyMs;
    node.activeAgents = metrics.activeAgents;
    node.usedCapacityUnits = Math.round(
      (metrics.cpuPercent / 100) * node.capacityUnits
    );
    node.lastHeartbeatAt = metrics.timestamp;

    // Compute health score (0–100)
    node.healthScore = this.computeHealthScore(metrics);

    // Mark degraded if health drops below threshold
    if (node.healthScore < 50 && node.status === 'active') {
      this.updateNodeStatus(metrics.nodeId, 'degraded');
    } else if (node.healthScore >= 70 && node.status === 'degraded') {
      this.updateNodeStatus(metrics.nodeId, 'active');
    }

    // Append to history (bounded)
    const history = this.metricsHistory.get(metrics.nodeId) ?? [];
    history.push(metrics);
    if (history.length > this.MAX_METRICS_HISTORY) {
      history.shift();
    }
    this.metricsHistory.set(metrics.nodeId, history);
  }

  /**
   * Retrieve a node by ID.
   */
  getNode(nodeId: string): EdgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * List nodes, optionally filtered by region, status, or zone.
   */
  listNodes(filter?: {
    region?: RegionCode;
    status?: NodeStatus;
    zone?: GeographicZone;
    provider?: CloudProvider;
    minHealthScore?: number;
  }): EdgeNode[] {
    let nodes = Array.from(this.nodes.values());

    if (filter?.region) {
      nodes = nodes.filter((n) => n.region === filter.region);
    }
    if (filter?.status) {
      nodes = nodes.filter((n) => n.status === filter.status);
    }
    if (filter?.zone) {
      nodes = nodes.filter((n) => n.zone === filter.zone);
    }
    if (filter?.provider) {
      nodes = nodes.filter((n) => n.provider === filter.provider);
    }
    if (filter?.minHealthScore !== undefined) {
      nodes = nodes.filter((n) => n.healthScore >= (filter.minHealthScore ?? 0));
    }

    return nodes;
  }

  /**
   * Get the most recent metrics snapshot for a node.
   */
  getLatestMetrics(nodeId: string): EdgeNodeMetrics | undefined {
    const history = this.metricsHistory.get(nodeId);
    return history && history.length > 0
      ? history[history.length - 1]
      : undefined;
  }

  /**
   * Get metrics history for a node.
   */
  getMetricsHistory(nodeId: string): EdgeNodeMetrics[] {
    return this.metricsHistory.get(nodeId) ?? [];
  }

  /**
   * Deregister a node from the registry.
   */
  deregisterNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    node.status = 'offline';
    this.nodes.delete(nodeId);
    this.metricsHistory.delete(nodeId);
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'node_offline',
      nodeId,
      region: node.region,
      severity: 'info',
      message: `Edge node ${node.name} deregistered`,
      data: { nodeId, region: node.region },
    });
  }

  /**
   * Subscribe to infrastructure events.
   */
  onEvent(callback: GlobalInfraEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private requireNode(nodeId: string): EdgeNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`EdgeNodeRegistry: node not found: ${nodeId}`);
    }
    return node;
  }

  private computeHealthScore(metrics: EdgeNodeMetrics): number {
    let score = 100;

    // Penalize high CPU
    if (metrics.cpuPercent > 90) score -= 30;
    else if (metrics.cpuPercent > 70) score -= 15;
    else if (metrics.cpuPercent > 50) score -= 5;

    // Penalize high memory
    if (metrics.memoryPercent > 90) score -= 20;
    else if (metrics.memoryPercent > 80) score -= 10;

    // Penalize high latency
    if (metrics.p99LatencyMs > 500) score -= 20;
    else if (metrics.p99LatencyMs > 200) score -= 10;
    else if (metrics.p99LatencyMs > 100) score -= 5;

    // Penalize error rate
    if (metrics.errorRate > 0.1) score -= 25;
    else if (metrics.errorRate > 0.05) score -= 10;
    else if (metrics.errorRate > 0.01) score -= 5;

    return Math.max(0, score);
  }

  private emitEvent(event: GlobalInfraEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

export function createEdgeNodeRegistry(): EdgeNodeRegistry {
  return new EdgeNodeRegistry();
}
