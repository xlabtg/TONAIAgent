/**
 * TONAIAgent - AGFN Global Node Architecture
 *
 * Manages the distributed node network of the Autonomous Global Financial Network.
 * Supports sovereign nodes, institutional nodes, custodian nodes, liquidity nodes,
 * clearing nodes, and AI computation nodes spanning multiple jurisdictions and chains.
 *
 * This is Component 1 of the Autonomous Global Financial Network (AGFN).
 */

import {
  NetworkNode,
  NodeCapabilityProfile,
  NodeId,
  NodeType,
  NodeStatus,
  JurisdictionCode,
  ChainId,
  GlobalNodeConfig,
  AGFNEvent,
  AGFNEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_GLOBAL_NODE_CONFIG: GlobalNodeConfig = {
  maxNodesPerJurisdiction: 50,
  minTrustScoreForRouting: 60,
  heartbeatIntervalMs: 30_000, // 30 seconds
  nodeTimeoutMs: 120_000, // 2 minutes
  enableAutoSuspend: true,
  minUptimeForActive: 0.95, // 95% uptime required
};

// ============================================================================
// Global Node Architecture Interface
// ============================================================================

export interface GlobalNodeArchitecture {
  readonly config: GlobalNodeConfig;

  // Node Management
  registerNode(params: RegisterNodeParams): NetworkNode;
  getNode(id: NodeId): NetworkNode | undefined;
  listNodes(filters?: NodeFilters): NetworkNode[];
  updateNode(id: NodeId, updates: Partial<NetworkNode>): NetworkNode;
  suspendNode(id: NodeId, reason: string): void;
  restoreNode(id: NodeId): void;
  deregisterNode(id: NodeId): void;

  // Capability Management
  setNodeCapabilities(nodeId: NodeId, capabilities: NodeCapabilityProfile): void;
  getNodeCapabilities(nodeId: NodeId): NodeCapabilityProfile | undefined;

  // Connectivity
  connectNodes(nodeAId: NodeId, nodeBId: NodeId): void;
  disconnectNodes(nodeAId: NodeId, nodeBId: NodeId): void;
  getConnectedNodes(nodeId: NodeId): NetworkNode[];

  // Network Analytics
  getNetworkTopology(): NetworkTopology;
  getJurisdictionNodeSummary(jurisdiction: JurisdictionCode): JurisdictionNodeSummary;
  getNodeHealthReport(): NodeHealthReport;

  // Events
  onEvent(callback: AGFNEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface RegisterNodeParams {
  name: string;
  type: NodeType;
  jurisdiction: JurisdictionCode;
  chain: ChainId;
  operatorId: string;
  capacityUSD: number;
  complianceLevel?: NetworkNode['complianceLevel'];
  supportedSettlementTypes?: NetworkNode['supportedSettlementTypes'];
  metadata?: Record<string, unknown>;
}

export interface NodeFilters {
  type?: NodeType;
  status?: NodeStatus;
  jurisdiction?: JurisdictionCode;
  chain?: ChainId;
  minTrustScore?: number;
  minCapacityUSD?: number;
  complianceLevel?: NetworkNode['complianceLevel'];
}

export interface NetworkTopology {
  totalNodes: number;
  activeNodes: number;
  nodesByType: Record<NodeType, number>;
  nodesByJurisdiction: Record<JurisdictionCode, number>;
  nodesByChain: Record<ChainId, number>;
  totalConnections: number;
  averageConnectivity: number; // Average connections per node
  networkDiameter: number; // Max shortest path between any two nodes
}

export interface JurisdictionNodeSummary {
  jurisdiction: JurisdictionCode;
  totalNodes: number;
  activeNodes: number;
  totalCapacityUSD: number;
  availableCapacityUSD: number;
  averageTrustScore: number;
  nodesByType: Record<NodeType, number>;
  topNodes: Array<{ nodeId: NodeId; name: string; trustScore: number }>;
}

export interface NodeHealthReport {
  generatedAt: Date;
  healthyNodes: number;
  warningNodes: number;
  criticalNodes: number;
  offlineNodes: number;
  averageUptime: number;
  averageTrustScore: number;
  nodeIssues: NodeHealthIssue[];
}

export interface NodeHealthIssue {
  nodeId: NodeId;
  nodeName: string;
  issue: string;
  severity: 'warning' | 'critical';
  detectedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGlobalNodeArchitecture implements GlobalNodeArchitecture {
  readonly config: GlobalNodeConfig;

  private readonly nodes = new Map<NodeId, NetworkNode>();
  private readonly capabilities = new Map<NodeId, NodeCapabilityProfile>();
  private readonly eventCallbacks: AGFNEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<GlobalNodeConfig>) {
    this.config = { ...DEFAULT_GLOBAL_NODE_CONFIG, ...config };
  }

  // ============================================================================
  // Node Management
  // ============================================================================

  registerNode(params: RegisterNodeParams): NetworkNode {
    const node: NetworkNode = {
      id: this.generateId('node'),
      name: params.name,
      type: params.type,
      jurisdiction: params.jurisdiction,
      chain: params.chain,
      operatorId: params.operatorId,
      capacityUSD: params.capacityUSD,
      availableCapacityUSD: params.capacityUSD,
      utilizationRate: 0,
      latencyMs: 50, // Default low latency
      uptime: 1.0,
      trustScore: 70, // Default moderate trust score
      complianceLevel: params.complianceLevel ?? 'standard',
      supportedSettlementTypes: params.supportedSettlementTypes ?? ['gross', 'net'],
      connectedNodes: [],
      status: 'active',
      registeredAt: new Date(),
      lastHeartbeatAt: new Date(),
      metadata: params.metadata ?? {},
    };

    this.nodes.set(node.id, node);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'node_registered',
      severity: 'info',
      source: 'GlobalNodeArchitecture',
      message: `Node registered: ${node.name} (${node.type}) in ${node.jurisdiction}`,
      data: { nodeId: node.id, name: node.name, type: node.type, jurisdiction: node.jurisdiction },
      timestamp: new Date(),
    });

    return node;
  }

  getNode(id: NodeId): NetworkNode | undefined {
    return this.nodes.get(id);
  }

  listNodes(filters?: NodeFilters): NetworkNode[] {
    let results = Array.from(this.nodes.values());

    if (filters?.type) results = results.filter(n => n.type === filters.type);
    if (filters?.status) results = results.filter(n => n.status === filters.status);
    if (filters?.jurisdiction) results = results.filter(n => n.jurisdiction === filters.jurisdiction);
    if (filters?.chain) results = results.filter(n => n.chain === filters.chain);
    if (filters?.minTrustScore !== undefined) results = results.filter(n => n.trustScore >= filters.minTrustScore!);
    if (filters?.minCapacityUSD !== undefined) results = results.filter(n => n.capacityUSD >= filters.minCapacityUSD!);
    if (filters?.complianceLevel) results = results.filter(n => n.complianceLevel === filters.complianceLevel);

    return results;
  }

  updateNode(id: NodeId, updates: Partial<NetworkNode>): NetworkNode {
    const existing = this.nodes.get(id);
    if (!existing) throw new Error(`Node not found: ${id}`);

    const updated = { ...existing, ...updates, id, lastHeartbeatAt: new Date() };
    this.nodes.set(id, updated);
    return updated;
  }

  suspendNode(id: NodeId, reason: string): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);

    node.status = 'suspended';
    node.lastHeartbeatAt = new Date();

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'node_suspended',
      severity: 'warning',
      source: 'GlobalNodeArchitecture',
      message: `Node suspended: ${node.name}. Reason: ${reason}`,
      data: { nodeId: id, name: node.name, reason },
      timestamp: new Date(),
    });
  }

  restoreNode(id: NodeId): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    if (node.status !== 'suspended' && node.status !== 'restricted') {
      throw new Error(`Cannot restore node with status: ${node.status}`);
    }

    node.status = 'active';
    node.lastHeartbeatAt = new Date();

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'node_restored',
      severity: 'info',
      source: 'GlobalNodeArchitecture',
      message: `Node restored: ${node.name}`,
      data: { nodeId: id, name: node.name },
      timestamp: new Date(),
    });
  }

  deregisterNode(id: NodeId): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);

    // Remove from connected nodes lists
    for (const connectedId of node.connectedNodes) {
      const connectedNode = this.nodes.get(connectedId);
      if (connectedNode) {
        connectedNode.connectedNodes = connectedNode.connectedNodes.filter(nid => nid !== id);
      }
    }

    this.nodes.delete(id);
    this.capabilities.delete(id);
  }

  // ============================================================================
  // Capability Management
  // ============================================================================

  setNodeCapabilities(nodeId: NodeId, capabilities: NodeCapabilityProfile): void {
    if (!this.nodes.has(nodeId)) throw new Error(`Node not found: ${nodeId}`);
    this.capabilities.set(nodeId, { ...capabilities, nodeId });
  }

  getNodeCapabilities(nodeId: NodeId): NodeCapabilityProfile | undefined {
    return this.capabilities.get(nodeId);
  }

  // ============================================================================
  // Connectivity
  // ============================================================================

  connectNodes(nodeAId: NodeId, nodeBId: NodeId): void {
    const nodeA = this.nodes.get(nodeAId);
    const nodeB = this.nodes.get(nodeBId);

    if (!nodeA) throw new Error(`Node not found: ${nodeAId}`);
    if (!nodeB) throw new Error(`Node not found: ${nodeBId}`);

    if (!nodeA.connectedNodes.includes(nodeBId)) {
      nodeA.connectedNodes.push(nodeBId);
    }
    if (!nodeB.connectedNodes.includes(nodeAId)) {
      nodeB.connectedNodes.push(nodeAId);
    }
  }

  disconnectNodes(nodeAId: NodeId, nodeBId: NodeId): void {
    const nodeA = this.nodes.get(nodeAId);
    const nodeB = this.nodes.get(nodeBId);

    if (nodeA) {
      nodeA.connectedNodes = nodeA.connectedNodes.filter(id => id !== nodeBId);
    }
    if (nodeB) {
      nodeB.connectedNodes = nodeB.connectedNodes.filter(id => id !== nodeAId);
    }
  }

  getConnectedNodes(nodeId: NodeId): NetworkNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    return node.connectedNodes
      .map(id => this.nodes.get(id))
      .filter((n): n is NetworkNode => n !== undefined);
  }

  // ============================================================================
  // Network Analytics
  // ============================================================================

  getNetworkTopology(): NetworkTopology {
    const allNodes = Array.from(this.nodes.values());
    const activeNodes = allNodes.filter(n => n.status === 'active');

    const nodesByType = {} as Record<NodeType, number>;
    const nodesByJurisdiction = {} as Record<JurisdictionCode, number>;
    const nodesByChain = {} as Record<ChainId, number>;

    for (const node of allNodes) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
      nodesByJurisdiction[node.jurisdiction] = (nodesByJurisdiction[node.jurisdiction] ?? 0) + 1;
      nodesByChain[node.chain] = (nodesByChain[node.chain] ?? 0) + 1;
    }

    const totalConnections = allNodes.reduce((sum, n) => sum + n.connectedNodes.length, 0) / 2;
    const averageConnectivity = allNodes.length > 0 ? (totalConnections * 2) / allNodes.length : 0;

    return {
      totalNodes: allNodes.length,
      activeNodes: activeNodes.length,
      nodesByType,
      nodesByJurisdiction,
      nodesByChain,
      totalConnections,
      averageConnectivity,
      networkDiameter: allNodes.length > 0 ? Math.ceil(Math.log2(allNodes.length + 1)) : 0,
    };
  }

  getJurisdictionNodeSummary(jurisdiction: JurisdictionCode): JurisdictionNodeSummary {
    const jurisdictionNodes = this.listNodes({ jurisdiction });
    const activeNodes = jurisdictionNodes.filter(n => n.status === 'active');

    const totalCapacityUSD = jurisdictionNodes.reduce((sum, n) => sum + n.capacityUSD, 0);
    const availableCapacityUSD = jurisdictionNodes.reduce((sum, n) => sum + n.availableCapacityUSD, 0);
    const averageTrustScore = jurisdictionNodes.length > 0
      ? jurisdictionNodes.reduce((sum, n) => sum + n.trustScore, 0) / jurisdictionNodes.length
      : 0;

    const nodesByType = {} as Record<NodeType, number>;
    for (const node of jurisdictionNodes) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
    }

    const topNodes = jurisdictionNodes
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 5)
      .map(n => ({ nodeId: n.id, name: n.name, trustScore: n.trustScore }));

    return {
      jurisdiction,
      totalNodes: jurisdictionNodes.length,
      activeNodes: activeNodes.length,
      totalCapacityUSD,
      availableCapacityUSD,
      averageTrustScore,
      nodesByType,
      topNodes,
    };
  }

  getNodeHealthReport(): NodeHealthReport {
    const allNodes = Array.from(this.nodes.values());
    const issues: NodeHealthIssue[] = [];

    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let offlineCount = 0;

    for (const node of allNodes) {
      if (node.status === 'offline') {
        offlineCount++;
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          issue: 'Node is offline',
          severity: 'critical',
          detectedAt: new Date(),
        });
      } else if (node.status === 'suspended' || node.status === 'restricted') {
        criticalCount++;
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          issue: `Node status: ${node.status}`,
          severity: 'critical',
          detectedAt: new Date(),
        });
      } else if (node.uptime < this.config.minUptimeForActive) {
        warningCount++;
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          issue: `Low uptime: ${(node.uptime * 100).toFixed(1)}%`,
          severity: 'warning',
          detectedAt: new Date(),
        });
      } else if (node.trustScore < this.config.minTrustScoreForRouting) {
        warningCount++;
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          issue: `Low trust score: ${node.trustScore}`,
          severity: 'warning',
          detectedAt: new Date(),
        });
      } else {
        healthyCount++;
      }
    }

    const totalUptime = allNodes.length > 0
      ? allNodes.reduce((sum, n) => sum + n.uptime, 0) / allNodes.length
      : 1;
    const totalTrustScore = allNodes.length > 0
      ? allNodes.reduce((sum, n) => sum + n.trustScore, 0) / allNodes.length
      : 0;

    return {
      generatedAt: new Date(),
      healthyNodes: healthyCount,
      warningNodes: warningCount,
      criticalNodes: criticalCount,
      offlineNodes: offlineCount,
      averageUptime: totalUptime,
      averageTrustScore: totalTrustScore,
      nodeIssues: issues,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFNEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFNEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGlobalNodeArchitecture(
  config?: Partial<GlobalNodeConfig>
): DefaultGlobalNodeArchitecture {
  return new DefaultGlobalNodeArchitecture(config);
}

export default DefaultGlobalNodeArchitecture;
