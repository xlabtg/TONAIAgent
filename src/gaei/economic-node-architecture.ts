/**
 * TONAIAgent - GAEI Global Economic Node Architecture
 *
 * Defines economic nodes coordinated through AIFOS kernel and AGFN network:
 * - Sovereign nodes
 * - Institutional capital nodes
 * - Trade-finance nodes
 * - Commodity-backed nodes
 * - AI treasury nodes
 */

import {
  EconomicNodeId,
  JurisdictionCode,
  EconomicNodeType,
  EconomicNode,
  NodeConnection,
  NodeCapability,
  NodeRiskProfile,
  SovereignNode,
  InstitutionalCapitalNode,
  TradeFinanceNode,
  CommodityBackedNode,
  AITreasuryNode,
  AIPerformanceMetrics,
  NodeArchitectureConfig,
  GAEIEvent,
  GAEIEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface RegisterNodeParams {
  name: string;
  nodeType: EconomicNodeType;
  jurisdiction: JurisdictionCode;
  parentNetwork: string;
  initialCapital: number;
  capabilities?: NodeCapability[];
  metadata?: Record<string, unknown>;
}

export interface RegisterSovereignNodeParams extends RegisterNodeParams {
  nodeType: 'sovereign_node';
  sovereignType: SovereignNode['sovereignType'];
  countryCode: string;
  regulatoryAuthority: string;
  reserveHoldings: number;
  monetaryPolicyRole: string;
  crossBorderAgreements?: string[];
}

export interface RegisterInstitutionalNodeParams extends RegisterNodeParams {
  nodeType: 'institutional_capital_node';
  institutionType: InstitutionalCapitalNode['institutionType'];
  aum: number;
  investmentMandate: string;
  riskTolerance: InstitutionalCapitalNode['riskTolerance'];
  redemptionTerms: string;
}

export interface RegisterTradeFinanceNodeParams extends RegisterNodeParams {
  nodeType: 'trade_finance_node';
  tradeRoutes: string[];
  financedVolume: number;
  insuranceCoverage: number;
  partnerBanks?: string[];
}

export interface RegisterCommodityNodeParams extends RegisterNodeParams {
  nodeType: 'commodity_backed_node';
  commodityTypes: string[];
  totalReserves: number;
  storageLocations: string[];
  verificationPartner: string;
  deliveryNetwork?: string[];
}

export interface RegisterAITreasuryNodeParams extends RegisterNodeParams {
  nodeType: 'ai_treasury_node';
  aiModel: string;
  autonomyLevel: AITreasuryNode['autonomyLevel'];
  governanceBounds: Record<string, number>;
}

export interface NodeFilters {
  nodeType?: EconomicNodeType;
  jurisdiction?: JurisdictionCode;
  complianceStatus?: EconomicNode['complianceStatus'];
  operationalStatus?: EconomicNode['operationalStatus'];
  parentNetwork?: string;
}

export interface ConnectNodesParams {
  sourceNodeId: EconomicNodeId;
  targetNodeId: EconomicNodeId;
  connectionType: NodeConnection['connectionType'];
  bandwidth?: number;
}

export interface NodeArchitectureLayerStatus {
  totalNodes: number;
  activeNodes: number;
  nodesByType: Record<EconomicNodeType, number>;
  totalCapitalManaged: number;
  totalConnections: number;
  averageRiskScore: number;
  complianceRate: number;
}

export interface EconomicNodeArchitecture {
  // Generic Node Management
  registerNode(params: RegisterNodeParams): EconomicNode;
  getNode(nodeId: EconomicNodeId): EconomicNode | undefined;
  listNodes(filters?: NodeFilters): EconomicNode[];
  updateNode(nodeId: EconomicNodeId, updates: Partial<EconomicNode>): EconomicNode;
  deactivateNode(nodeId: EconomicNodeId, reason: string): EconomicNode;

  // Specialized Node Registration
  registerSovereignNode(params: RegisterSovereignNodeParams): SovereignNode;
  registerInstitutionalNode(params: RegisterInstitutionalNodeParams): InstitutionalCapitalNode;
  registerTradeFinanceNode(params: RegisterTradeFinanceNodeParams): TradeFinanceNode;
  registerCommodityNode(params: RegisterCommodityNodeParams): CommodityBackedNode;
  registerAITreasuryNode(params: RegisterAITreasuryNodeParams): AITreasuryNode;

  // Node Connections
  connectNodes(params: ConnectNodesParams): NodeConnection;
  disconnectNodes(sourceNodeId: EconomicNodeId, targetNodeId: EconomicNodeId): void;
  listNodeConnections(nodeId: EconomicNodeId): NodeConnection[];

  // Risk Assessment
  assessNodeRisk(nodeId: EconomicNodeId): NodeRiskProfile;
  updateNodeRiskProfile(nodeId: EconomicNodeId, riskProfile: Partial<NodeRiskProfile>): NodeRiskProfile;

  // Capital Management
  allocateCapital(nodeId: EconomicNodeId, amount: number): EconomicNode;
  deployCapital(nodeId: EconomicNodeId, amount: number, purpose: string): EconomicNode;

  // Layer Status & Events
  getLayerStatus(): NodeArchitectureLayerStatus;
  onEvent(callback: GAEIEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultEconomicNodeArchitecture implements EconomicNodeArchitecture {
  private readonly nodes: Map<EconomicNodeId, EconomicNode> = new Map();
  private readonly sovereignNodes: Map<EconomicNodeId, SovereignNode> = new Map();
  private readonly institutionalNodes: Map<EconomicNodeId, InstitutionalCapitalNode> = new Map();
  private readonly tradeFinanceNodes: Map<EconomicNodeId, TradeFinanceNode> = new Map();
  private readonly commodityNodes: Map<EconomicNodeId, CommodityBackedNode> = new Map();
  private readonly aiTreasuryNodes: Map<EconomicNodeId, AITreasuryNode> = new Map();
  private readonly eventCallbacks: GAEIEventCallback[] = [];
  private readonly config: NodeArchitectureConfig;

  constructor(config?: Partial<NodeArchitectureConfig>) {
    this.config = {
      enableSovereignNodes: true,
      enableInstitutionalNodes: true,
      enableTradeFinanceNodes: true,
      enableCommodityNodes: true,
      enableAITreasuryNodes: true,
      maxNodesPerNetwork: 1000,
      minCapitalPerNode: 100000,
      ...config,
    };
  }

  // ============================================================================
  // Generic Node Management
  // ============================================================================

  registerNode(params: RegisterNodeParams): EconomicNode {
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const node: EconomicNode = {
      id: nodeId,
      name: params.name,
      nodeType: params.nodeType,
      jurisdiction: params.jurisdiction,
      parentNetwork: params.parentNetwork,
      capitalManaged: params.initialCapital,
      capitalDeployed: 0,
      capitalAvailable: params.initialCapital,
      connections: [],
      capabilities: params.capabilities ?? this.getDefaultCapabilities(params.nodeType),
      riskProfile: this.createDefaultRiskProfile(),
      complianceStatus: 'pending_review',
      operationalStatus: 'active',
      registeredAt: new Date(),
      lastActivityAt: new Date(),
      metadata: params.metadata ?? {},
    };

    this.nodes.set(nodeId, node);
    this.emitEvent('node_registered', 'info', `Economic node ${nodeId} registered`, { node });

    return node;
  }

  getNode(nodeId: EconomicNodeId): EconomicNode | undefined {
    // Check all node maps
    return (
      this.nodes.get(nodeId) ??
      this.sovereignNodes.get(nodeId) ??
      this.institutionalNodes.get(nodeId) ??
      this.tradeFinanceNodes.get(nodeId) ??
      this.commodityNodes.get(nodeId) ??
      this.aiTreasuryNodes.get(nodeId)
    );
  }

  listNodes(filters?: NodeFilters): EconomicNode[] {
    let allNodes: EconomicNode[] = [
      ...Array.from(this.nodes.values()),
      ...Array.from(this.sovereignNodes.values()),
      ...Array.from(this.institutionalNodes.values()),
      ...Array.from(this.tradeFinanceNodes.values()),
      ...Array.from(this.commodityNodes.values()),
      ...Array.from(this.aiTreasuryNodes.values()),
    ];

    if (filters) {
      if (filters.nodeType) {
        allNodes = allNodes.filter((n) => n.nodeType === filters.nodeType);
      }
      if (filters.jurisdiction) {
        allNodes = allNodes.filter((n) => n.jurisdiction === filters.jurisdiction);
      }
      if (filters.complianceStatus) {
        allNodes = allNodes.filter((n) => n.complianceStatus === filters.complianceStatus);
      }
      if (filters.operationalStatus) {
        allNodes = allNodes.filter((n) => n.operationalStatus === filters.operationalStatus);
      }
      if (filters.parentNetwork) {
        allNodes = allNodes.filter((n) => n.parentNetwork === filters.parentNetwork);
      }
    }

    return allNodes;
  }

  updateNode(nodeId: EconomicNodeId, updates: Partial<EconomicNode>): EconomicNode {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const updatedNode = { ...node, ...updates, lastActivityAt: new Date() };
    this.updateNodeInMap(nodeId, updatedNode);
    this.emitEvent('node_updated', 'info', `Node ${nodeId} updated`, { node: updatedNode });

    return updatedNode;
  }

  deactivateNode(nodeId: EconomicNodeId, reason: string): EconomicNode {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const deactivatedNode = {
      ...node,
      operationalStatus: 'offline' as const,
      metadata: { ...node.metadata, deactivationReason: reason, deactivatedAt: new Date() },
      lastActivityAt: new Date(),
    };

    this.updateNodeInMap(nodeId, deactivatedNode);
    return deactivatedNode;
  }

  // ============================================================================
  // Specialized Node Registration
  // ============================================================================

  registerSovereignNode(params: RegisterSovereignNodeParams): SovereignNode {
    if (!this.config.enableSovereignNodes) {
      throw new Error('Sovereign nodes are not enabled');
    }

    const nodeId = `sovereign_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const node: SovereignNode = {
      id: nodeId,
      name: params.name,
      nodeType: 'sovereign_node',
      jurisdiction: params.jurisdiction,
      parentNetwork: params.parentNetwork,
      capitalManaged: params.initialCapital,
      capitalDeployed: 0,
      capitalAvailable: params.initialCapital,
      connections: [],
      capabilities: params.capabilities ?? this.getDefaultCapabilities('sovereign_node'),
      riskProfile: this.createDefaultRiskProfile(),
      complianceStatus: 'compliant',
      operationalStatus: 'active',
      registeredAt: new Date(),
      lastActivityAt: new Date(),
      metadata: params.metadata ?? {},
      sovereignType: params.sovereignType,
      countryCode: params.countryCode,
      regulatoryAuthority: params.regulatoryAuthority,
      reserveHoldings: params.reserveHoldings,
      monetaryPolicyRole: params.monetaryPolicyRole,
      crossBorderAgreements: params.crossBorderAgreements ?? [],
    };

    this.sovereignNodes.set(nodeId, node);
    this.emitEvent('node_registered', 'info', `Sovereign node ${nodeId} registered`, { node });

    return node;
  }

  registerInstitutionalNode(params: RegisterInstitutionalNodeParams): InstitutionalCapitalNode {
    if (!this.config.enableInstitutionalNodes) {
      throw new Error('Institutional nodes are not enabled');
    }

    const nodeId = `institutional_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const node: InstitutionalCapitalNode = {
      id: nodeId,
      name: params.name,
      nodeType: 'institutional_capital_node',
      jurisdiction: params.jurisdiction,
      parentNetwork: params.parentNetwork,
      capitalManaged: params.initialCapital,
      capitalDeployed: 0,
      capitalAvailable: params.initialCapital,
      connections: [],
      capabilities: params.capabilities ?? this.getDefaultCapabilities('institutional_capital_node'),
      riskProfile: this.createDefaultRiskProfile(),
      complianceStatus: 'pending_review',
      operationalStatus: 'active',
      registeredAt: new Date(),
      lastActivityAt: new Date(),
      metadata: params.metadata ?? {},
      institutionType: params.institutionType,
      aum: params.aum,
      investmentMandate: params.investmentMandate,
      riskTolerance: params.riskTolerance,
      redemptionTerms: params.redemptionTerms,
    };

    this.institutionalNodes.set(nodeId, node);
    this.emitEvent('node_registered', 'info', `Institutional node ${nodeId} registered`, { node });

    return node;
  }

  registerTradeFinanceNode(params: RegisterTradeFinanceNodeParams): TradeFinanceNode {
    if (!this.config.enableTradeFinanceNodes) {
      throw new Error('Trade finance nodes are not enabled');
    }

    const nodeId = `tradefinance_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const node: TradeFinanceNode = {
      id: nodeId,
      name: params.name,
      nodeType: 'trade_finance_node',
      jurisdiction: params.jurisdiction,
      parentNetwork: params.parentNetwork,
      capitalManaged: params.initialCapital,
      capitalDeployed: 0,
      capitalAvailable: params.initialCapital,
      connections: [],
      capabilities: params.capabilities ?? this.getDefaultCapabilities('trade_finance_node'),
      riskProfile: this.createDefaultRiskProfile(),
      complianceStatus: 'pending_review',
      operationalStatus: 'active',
      registeredAt: new Date(),
      lastActivityAt: new Date(),
      metadata: params.metadata ?? {},
      tradeRoutes: params.tradeRoutes,
      financedVolume: params.financedVolume,
      defaultRate: 0,
      insuranceCoverage: params.insuranceCoverage,
      partnerBanks: params.partnerBanks ?? [],
    };

    this.tradeFinanceNodes.set(nodeId, node);
    this.emitEvent('node_registered', 'info', `Trade finance node ${nodeId} registered`, { node });

    return node;
  }

  registerCommodityNode(params: RegisterCommodityNodeParams): CommodityBackedNode {
    if (!this.config.enableCommodityNodes) {
      throw new Error('Commodity nodes are not enabled');
    }

    const nodeId = `commodity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const node: CommodityBackedNode = {
      id: nodeId,
      name: params.name,
      nodeType: 'commodity_backed_node',
      jurisdiction: params.jurisdiction,
      parentNetwork: params.parentNetwork,
      capitalManaged: params.initialCapital,
      capitalDeployed: 0,
      capitalAvailable: params.initialCapital,
      connections: [],
      capabilities: params.capabilities ?? this.getDefaultCapabilities('commodity_backed_node'),
      riskProfile: this.createDefaultRiskProfile(),
      complianceStatus: 'pending_review',
      operationalStatus: 'active',
      registeredAt: new Date(),
      lastActivityAt: new Date(),
      metadata: params.metadata ?? {},
      commodityTypes: params.commodityTypes,
      totalReserves: params.totalReserves,
      storageLocations: params.storageLocations,
      verificationPartner: params.verificationPartner,
      deliveryNetwork: params.deliveryNetwork ?? [],
    };

    this.commodityNodes.set(nodeId, node);
    this.emitEvent('node_registered', 'info', `Commodity node ${nodeId} registered`, { node });

    return node;
  }

  registerAITreasuryNode(params: RegisterAITreasuryNodeParams): AITreasuryNode {
    if (!this.config.enableAITreasuryNodes) {
      throw new Error('AI treasury nodes are not enabled');
    }

    const nodeId = `aitreasury_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const node: AITreasuryNode = {
      id: nodeId,
      name: params.name,
      nodeType: 'ai_treasury_node',
      jurisdiction: params.jurisdiction,
      parentNetwork: params.parentNetwork,
      capitalManaged: params.initialCapital,
      capitalDeployed: 0,
      capitalAvailable: params.initialCapital,
      connections: [],
      capabilities: params.capabilities ?? this.getDefaultCapabilities('ai_treasury_node'),
      riskProfile: this.createDefaultRiskProfile(),
      complianceStatus: 'pending_review',
      operationalStatus: 'active',
      registeredAt: new Date(),
      lastActivityAt: new Date(),
      metadata: params.metadata ?? {},
      aiModel: params.aiModel,
      autonomyLevel: params.autonomyLevel,
      governanceBounds: params.governanceBounds,
      performanceMetrics: this.createDefaultAIPerformanceMetrics(),
    };

    this.aiTreasuryNodes.set(nodeId, node);
    this.emitEvent('node_registered', 'info', `AI treasury node ${nodeId} registered`, { node });

    return node;
  }

  // ============================================================================
  // Node Connections
  // ============================================================================

  connectNodes(params: ConnectNodesParams): NodeConnection {
    const sourceNode = this.getNode(params.sourceNodeId);
    const targetNode = this.getNode(params.targetNodeId);

    if (!sourceNode) {
      throw new Error(`Source node ${params.sourceNodeId} not found`);
    }
    if (!targetNode) {
      throw new Error(`Target node ${params.targetNodeId} not found`);
    }

    const connection: NodeConnection = {
      targetNodeId: params.targetNodeId,
      connectionType: params.connectionType,
      bandwidth: params.bandwidth ?? 1000000, // Default 1M capacity
      latency: 50, // Default 50ms
      status: 'active',
    };

    const updatedConnections = [...sourceNode.connections, connection];
    this.updateNode(params.sourceNodeId, { connections: updatedConnections });

    return connection;
  }

  disconnectNodes(sourceNodeId: EconomicNodeId, targetNodeId: EconomicNodeId): void {
    const sourceNode = this.getNode(sourceNodeId);
    if (!sourceNode) {
      throw new Error(`Source node ${sourceNodeId} not found`);
    }

    const updatedConnections = sourceNode.connections.filter((c) => c.targetNodeId !== targetNodeId);
    this.updateNode(sourceNodeId, { connections: updatedConnections });
  }

  listNodeConnections(nodeId: EconomicNodeId): NodeConnection[] {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    return node.connections;
  }

  // ============================================================================
  // Risk Assessment
  // ============================================================================

  assessNodeRisk(nodeId: EconomicNodeId): NodeRiskProfile {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Compute risk scores based on node properties
    const capitalRatio = node.capitalDeployed / node.capitalManaged;
    const connectionCount = node.connections.length;

    const riskProfile: NodeRiskProfile = {
      creditRisk: Math.min(100, capitalRatio * 100),
      liquidityRisk: Math.min(100, 100 - (node.capitalAvailable / node.capitalManaged) * 100),
      operationalRisk: connectionCount > 10 ? 40 : 20,
      complianceRisk: node.complianceStatus === 'compliant' ? 10 : 50,
      counterpartyRisk: Math.min(100, connectionCount * 5),
      overallRiskScore: 0,
      riskTier: 'low',
      lastAssessedAt: new Date(),
    };

    // Compute overall risk score
    riskProfile.overallRiskScore = Math.round(
      (riskProfile.creditRisk +
        riskProfile.liquidityRisk +
        riskProfile.operationalRisk +
        riskProfile.complianceRisk +
        riskProfile.counterpartyRisk) /
        5
    );

    // Assign risk tier
    if (riskProfile.overallRiskScore < 25) {
      riskProfile.riskTier = 'low';
    } else if (riskProfile.overallRiskScore < 50) {
      riskProfile.riskTier = 'medium';
    } else if (riskProfile.overallRiskScore < 75) {
      riskProfile.riskTier = 'high';
    } else {
      riskProfile.riskTier = 'critical';
    }

    // Update node with new risk profile
    this.updateNode(nodeId, { riskProfile });

    return riskProfile;
  }

  updateNodeRiskProfile(nodeId: EconomicNodeId, riskProfile: Partial<NodeRiskProfile>): NodeRiskProfile {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const updatedRiskProfile: NodeRiskProfile = {
      ...node.riskProfile,
      ...riskProfile,
      lastAssessedAt: new Date(),
    };

    this.updateNode(nodeId, { riskProfile: updatedRiskProfile });
    return updatedRiskProfile;
  }

  // ============================================================================
  // Capital Management
  // ============================================================================

  allocateCapital(nodeId: EconomicNodeId, amount: number): EconomicNode {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const updatedNode = this.updateNode(nodeId, {
      capitalManaged: node.capitalManaged + amount,
      capitalAvailable: node.capitalAvailable + amount,
    });

    return updatedNode;
  }

  deployCapital(nodeId: EconomicNodeId, amount: number, purpose: string): EconomicNode {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    if (amount > node.capitalAvailable) {
      throw new Error(`Insufficient capital available. Requested: ${amount}, Available: ${node.capitalAvailable}`);
    }

    const updatedNode = this.updateNode(nodeId, {
      capitalDeployed: node.capitalDeployed + amount,
      capitalAvailable: node.capitalAvailable - amount,
      metadata: {
        ...node.metadata,
        lastDeployment: { amount, purpose, timestamp: new Date() },
      },
    });

    return updatedNode;
  }

  // ============================================================================
  // Layer Status & Events
  // ============================================================================

  getLayerStatus(): NodeArchitectureLayerStatus {
    const allNodes = this.listNodes();
    const activeNodes = allNodes.filter((n) => n.operationalStatus === 'active');
    const compliantNodes = allNodes.filter((n) => n.complianceStatus === 'compliant');

    const nodesByType: Record<EconomicNodeType, number> = {
      sovereign_node: 0,
      institutional_capital_node: 0,
      trade_finance_node: 0,
      commodity_backed_node: 0,
      ai_treasury_node: 0,
      central_bank_node: 0,
      infrastructure_finance_node: 0,
      production_node: 0,
      supply_chain_node: 0,
    };

    for (const node of allNodes) {
      nodesByType[node.nodeType]++;
    }

    const totalConnections = allNodes.reduce((sum, n) => sum + n.connections.length, 0);
    const avgRiskScore =
      allNodes.length > 0
        ? allNodes.reduce((sum, n) => sum + n.riskProfile.overallRiskScore, 0) / allNodes.length
        : 0;

    return {
      totalNodes: allNodes.length,
      activeNodes: activeNodes.length,
      nodesByType,
      totalCapitalManaged: allNodes.reduce((sum, n) => sum + n.capitalManaged, 0),
      totalConnections,
      averageRiskScore: Math.round(avgRiskScore),
      complianceRate: allNodes.length > 0 ? (compliantNodes.length / allNodes.length) * 100 : 0,
    };
  }

  onEvent(callback: GAEIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getDefaultCapabilities(nodeType: EconomicNodeType): NodeCapability[] {
    const defaultCapabilities: Record<EconomicNodeType, NodeCapability[]> = {
      sovereign_node: [
        { capability: 'monetary_policy', enabled: true },
        { capability: 'cross_border_settlement', enabled: true },
        { capability: 'reserve_management', enabled: true },
      ],
      institutional_capital_node: [
        { capability: 'capital_allocation', enabled: true },
        { capability: 'risk_management', enabled: true },
        { capability: 'reporting', enabled: true },
      ],
      trade_finance_node: [
        { capability: 'trade_settlement', enabled: true },
        { capability: 'letter_of_credit', enabled: true },
        { capability: 'supply_chain_finance', enabled: true },
      ],
      commodity_backed_node: [
        { capability: 'commodity_custody', enabled: true },
        { capability: 'tokenization', enabled: true },
        { capability: 'delivery', enabled: true },
      ],
      ai_treasury_node: [
        { capability: 'autonomous_allocation', enabled: true },
        { capability: 'risk_modeling', enabled: true },
        { capability: 'rebalancing', enabled: true },
      ],
      central_bank_node: [
        { capability: 'monetary_policy', enabled: true },
        { capability: 'currency_issuance', enabled: true },
      ],
      infrastructure_finance_node: [
        { capability: 'project_finance', enabled: true },
        { capability: 'bond_issuance', enabled: true },
      ],
      production_node: [
        { capability: 'production_tracking', enabled: true },
        { capability: 'inventory_management', enabled: true },
      ],
      supply_chain_node: [
        { capability: 'logistics', enabled: true },
        { capability: 'invoice_financing', enabled: true },
      ],
    };

    return defaultCapabilities[nodeType] ?? [];
  }

  private createDefaultRiskProfile(): NodeRiskProfile {
    return {
      creditRisk: 20,
      liquidityRisk: 20,
      operationalRisk: 20,
      complianceRisk: 20,
      counterpartyRisk: 20,
      overallRiskScore: 20,
      riskTier: 'low',
      lastAssessedAt: new Date(),
    };
  }

  private createDefaultAIPerformanceMetrics(): AIPerformanceMetrics {
    return {
      sharpeRatio: 0,
      maxDrawdown: 0,
      annualizedReturn: 0,
      riskAdjustedReturn: 0,
      decisionAccuracy: 0.8, // 80% initial accuracy
      responseTime: 100, // 100ms
    };
  }

  private updateNodeInMap(nodeId: EconomicNodeId, node: EconomicNode): void {
    // Update in the appropriate map based on node type
    switch (node.nodeType) {
      case 'sovereign_node':
        this.sovereignNodes.set(nodeId, node as SovereignNode);
        break;
      case 'institutional_capital_node':
        this.institutionalNodes.set(nodeId, node as InstitutionalCapitalNode);
        break;
      case 'trade_finance_node':
        this.tradeFinanceNodes.set(nodeId, node as TradeFinanceNode);
        break;
      case 'commodity_backed_node':
        this.commodityNodes.set(nodeId, node as CommodityBackedNode);
        break;
      case 'ai_treasury_node':
        this.aiTreasuryNodes.set(nodeId, node as AITreasuryNode);
        break;
      default:
        this.nodes.set(nodeId, node);
    }
  }

  private emitEvent(
    type: GAEIEvent['type'],
    severity: GAEIEvent['severity'],
    message: string,
    data: Record<string, unknown>
  ): void {
    const event: GAEIEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      severity,
      source: 'economic_node_architecture',
      message,
      data,
      timestamp: new Date(),
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEconomicNodeArchitecture(
  config?: Partial<NodeArchitectureConfig>
): DefaultEconomicNodeArchitecture {
  return new DefaultEconomicNodeArchitecture(config);
}
