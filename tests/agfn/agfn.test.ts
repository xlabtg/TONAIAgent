/**
 * TONAIAgent - Autonomous Global Financial Network (AGFN) Tests
 *
 * Comprehensive test suite for all 6 components of AGFN:
 * 1. Global Node Architecture
 * 2. Cross-Jurisdiction Capital Routing
 * 3. Global Settlement Mesh
 * 4. AI Coordination Layer
 * 5. Multi-Reserve Treasury Network
 * 6. Global Stability Dashboard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAGFNManager,
  createGlobalNodeArchitecture,
  createCrossJurisdictionCapitalRouter,
  createGlobalSettlementMesh,
  createAICoordinationLayer,
  createMultiReserveTreasuryNetwork,
  createGlobalStabilityDashboard,
} from '../../research/agfn/index';

// ============================================================================
// Global Node Architecture Tests
// ============================================================================

describe('GlobalNodeArchitecture', () => {
  let architecture: ReturnType<typeof createGlobalNodeArchitecture>;

  beforeEach(() => {
    architecture = createGlobalNodeArchitecture();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(architecture.config).toBeDefined();
      expect(architecture.config.minTrustScoreForRouting).toBe(60);
      expect(architecture.config.enableAutoSuspend).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createGlobalNodeArchitecture({
        minTrustScoreForRouting: 80,
        maxNodesPerJurisdiction: 100,
      });
      expect(custom.config.minTrustScoreForRouting).toBe(80);
      expect(custom.config.maxNodesPerJurisdiction).toBe(100);
    });
  });

  describe('node management', () => {
    it('should register a sovereign node', () => {
      const node = architecture.registerNode({
        name: 'ECB Primary Node',
        type: 'sovereign',
        jurisdiction: 'EU',
        chain: 'ethereum',
        operatorId: 'ecb_001',
        capacityUSD: 500_000_000_000,
        complianceLevel: 'sovereign',
      });

      expect(node.id).toBeDefined();
      expect(node.name).toBe('ECB Primary Node');
      expect(node.type).toBe('sovereign');
      expect(node.jurisdiction).toBe('EU');
      expect(node.chain).toBe('ethereum');
      expect(node.capacityUSD).toBe(500_000_000_000);
      expect(node.status).toBe('active');
      expect(node.registeredAt).toBeInstanceOf(Date);
    });

    it('should register all node types', () => {
      const types = [
        'sovereign', 'institutional', 'custodian',
        'liquidity', 'clearing', 'ai_computation',
      ] as const;

      for (const type of types) {
        const node = architecture.registerNode({
          name: `Test ${type}`,
          type,
          jurisdiction: 'US',
          chain: 'ton',
          operatorId: `op_${type}`,
          capacityUSD: 1_000_000,
        });
        expect(node.type).toBe(type);
      }
    });

    it('should retrieve a node by id', () => {
      const registered = architecture.registerNode({
        name: 'Test Node',
        type: 'institutional',
        jurisdiction: 'JP',
        chain: 'ton',
        operatorId: 'op_jp_001',
        capacityUSD: 100_000_000,
      });

      const retrieved = architecture.getNode(registered.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(registered.id);
      expect(retrieved!.name).toBe('Test Node');
    });

    it('should return undefined for non-existent node', () => {
      const node = architecture.getNode('nonexistent_id');
      expect(node).toBeUndefined();
    });

    it('should list nodes with filters', () => {
      architecture.registerNode({
        name: 'US Sovereign',
        type: 'sovereign',
        jurisdiction: 'US',
        chain: 'ton',
        operatorId: 'op_us',
        capacityUSD: 1_000_000_000,
      });
      architecture.registerNode({
        name: 'EU Institutional',
        type: 'institutional',
        jurisdiction: 'EU',
        chain: 'ethereum',
        operatorId: 'op_eu',
        capacityUSD: 500_000_000,
      });

      const sovereigns = architecture.listNodes({ type: 'sovereign' });
      expect(sovereigns.length).toBeGreaterThan(0);
      expect(sovereigns.every(n => n.type === 'sovereign')).toBe(true);

      const usNodes = architecture.listNodes({ jurisdiction: 'US' });
      expect(usNodes.length).toBeGreaterThan(0);
      expect(usNodes.every(n => n.jurisdiction === 'US')).toBe(true);
    });

    it('should update a node', () => {
      const node = architecture.registerNode({
        name: 'Old Name',
        type: 'liquidity',
        jurisdiction: 'SG',
        chain: 'ton',
        operatorId: 'op_sg',
        capacityUSD: 50_000_000,
      });

      const updated = architecture.updateNode(node.id, { name: 'New Name', trustScore: 90 });
      expect(updated.name).toBe('New Name');
      expect(updated.trustScore).toBe(90);
      expect(updated.id).toBe(node.id);
    });

    it('should throw when updating non-existent node', () => {
      expect(() => architecture.updateNode('nonexistent', { name: 'x' })).toThrow('Node not found');
    });

    it('should suspend and restore a node', () => {
      const node = architecture.registerNode({
        name: 'Suspendable Node',
        type: 'clearing',
        jurisdiction: 'HK',
        chain: 'ton',
        operatorId: 'op_hk',
        capacityUSD: 200_000_000,
      });

      architecture.suspendNode(node.id, 'Compliance review');
      const suspended = architecture.getNode(node.id);
      expect(suspended!.status).toBe('suspended');

      architecture.restoreNode(node.id);
      const restored = architecture.getNode(node.id);
      expect(restored!.status).toBe('active');
    });
  });

  describe('connectivity', () => {
    it('should connect and disconnect nodes', () => {
      const nodeA = architecture.registerNode({
        name: 'Node A', type: 'liquidity', jurisdiction: 'US',
        chain: 'ton', operatorId: 'op_a', capacityUSD: 100_000_000,
      });
      const nodeB = architecture.registerNode({
        name: 'Node B', type: 'clearing', jurisdiction: 'EU',
        chain: 'ethereum', operatorId: 'op_b', capacityUSD: 100_000_000,
      });

      architecture.connectNodes(nodeA.id, nodeB.id);
      const connected = architecture.getConnectedNodes(nodeA.id);
      expect(connected.some(n => n.id === nodeB.id)).toBe(true);

      architecture.disconnectNodes(nodeA.id, nodeB.id);
      const afterDisconnect = architecture.getConnectedNodes(nodeA.id);
      expect(afterDisconnect.some(n => n.id === nodeB.id)).toBe(false);
    });
  });

  describe('capability management', () => {
    it('should set and retrieve node capabilities', () => {
      const node = architecture.registerNode({
        name: 'Multi-cap Node', type: 'ai_computation', jurisdiction: 'US',
        chain: 'ton', operatorId: 'op_ai', capacityUSD: 50_000_000,
      });

      architecture.setNodeCapabilities(node.id, {
        nodeId: node.id,
        canInitiateCapitalFlows: true,
        canClearTransactions: false,
        canCustodyAssets: false,
        canProvideLiquidity: true,
        canExecuteAI: true,
        maxSingleTransactionUSD: 10_000_000,
        supportedCurrencies: ['USD', 'EUR', 'TON'],
        supportedChains: ['ton', 'ethereum'],
        regulatoryApprovals: ['SEC', 'FCA'],
      });

      const caps = architecture.getNodeCapabilities(node.id);
      expect(caps).toBeDefined();
      expect(caps!.canExecuteAI).toBe(true);
      expect(caps!.supportedCurrencies).toContain('USD');
    });
  });

  describe('network analytics', () => {
    it('should return network topology', () => {
      architecture.registerNode({
        name: 'Node 1', type: 'sovereign', jurisdiction: 'US',
        chain: 'ton', operatorId: 'op1', capacityUSD: 1_000_000_000,
      });
      architecture.registerNode({
        name: 'Node 2', type: 'institutional', jurisdiction: 'EU',
        chain: 'ethereum', operatorId: 'op2', capacityUSD: 500_000_000,
      });

      const topology = architecture.getNetworkTopology();
      expect(topology.totalNodes).toBe(2);
      expect(topology.activeNodes).toBe(2);
      expect(topology.nodesByType).toBeDefined();
    });

    it('should return health report', () => {
      architecture.registerNode({
        name: 'Healthy Node', type: 'liquidity', jurisdiction: 'JP',
        chain: 'ton', operatorId: 'op_jp', capacityUSD: 200_000_000,
      });

      const report = architecture.getNodeHealthReport();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.healthyNodes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('events', () => {
    it('should emit event on node registration', () => {
      const events: unknown[] = [];
      architecture.onEvent(event => events.push(event));

      architecture.registerNode({
        name: 'Event Node', type: 'custodian', jurisdiction: 'CH',
        chain: 'ton', operatorId: 'op_ch', capacityUSD: 300_000_000,
      });

      expect(events.length).toBe(1);
      expect((events[0] as { type: string }).type).toBe('node_registered');
    });

    it('should emit event on node suspension', () => {
      const events: unknown[] = [];
      const node = architecture.registerNode({
        name: 'Suspend Test', type: 'liquidity', jurisdiction: 'US',
        chain: 'ton', operatorId: 'op_sus', capacityUSD: 100_000_000,
      });

      architecture.onEvent(event => events.push(event));
      architecture.suspendNode(node.id, 'Testing');

      expect(events.length).toBe(1);
      expect((events[0] as { type: string }).type).toBe('node_suspended');
    });
  });
});

// ============================================================================
// Cross-Jurisdiction Capital Routing Tests
// ============================================================================

describe('CrossJurisdictionCapitalRouter', () => {
  let router: ReturnType<typeof createCrossJurisdictionCapitalRouter>;

  beforeEach(() => {
    router = createCrossJurisdictionCapitalRouter();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(router.config).toBeDefined();
      expect(router.config.enableComplianceAwareRouting).toBe(true);
      expect(router.config.maxRouteHops).toBe(5);
    });
  });

  describe('route management', () => {
    it('should compute a cross-jurisdiction route', () => {
      const route = router.computeRoute({
        sourceNodeId: 'node_src',
        destinationNodeId: 'node_dst',
        amount: 5_000_000,
        currency: 'USD',
        strategy: 'compliance_first',
      });

      expect(route.id).toBeDefined();
      expect(route.amount).toBe(5_000_000);
      expect(route.currency).toBe('USD');
      expect(route.strategy).toBe('compliance_first');
      expect(route.status).toBe('computed');
      expect(route.hops.length).toBeGreaterThan(0);
      expect(route.computedAt).toBeInstanceOf(Date);
    });

    it('should compute routes with different strategies', () => {
      const strategies = ['lowest_cost', 'fastest_settlement', 'highest_liquidity', 'compliance_first', 'risk_minimized'] as const;

      for (const strategy of strategies) {
        const route = router.computeRoute({
          sourceNodeId: 'src',
          destinationNodeId: 'dst',
          amount: 1_000_000,
          currency: 'EUR',
          strategy,
        });
        expect(route.strategy).toBe(strategy);
      }
    });

    it('should list routes with filters', () => {
      router.computeRoute({ sourceNodeId: 'a', destinationNodeId: 'b', amount: 100_000, currency: 'USD' });
      router.computeRoute({ sourceNodeId: 'c', destinationNodeId: 'd', amount: 200_000, currency: 'EUR' });

      const allRoutes = router.listRoutes();
      expect(allRoutes.length).toBe(2);

      const filtered = router.listRoutes({ minAmount: 150_000 });
      expect(filtered.length).toBe(1);
    });

    it('should approve and execute a route', () => {
      const route = router.computeRoute({
        sourceNodeId: 'src',
        destinationNodeId: 'dst',
        amount: 1_000_000,
        currency: 'USD',
      });

      const approved = router.approveRoute(route.id);
      expect(approved.status).toBe('approved');

      const executed = router.executeRoute(route.id);
      expect(executed.status).toBe('completed');
    });

    it('should cancel a route', () => {
      const route = router.computeRoute({
        sourceNodeId: 'src',
        destinationNodeId: 'dst',
        amount: 500_000,
        currency: 'USD',
      });

      const cancelled = router.cancelRoute(route.id, 'Test cancellation');
      expect(cancelled.status).toBe('failed');
      expect(cancelled.metadata).toHaveProperty('cancellationReason');
    });
  });

  describe('liquidity passport management', () => {
    it('should issue a liquidity passport', () => {
      const passport = router.issueLiquidityPassport({
        issuedTo: 'institution_001',
        jurisdiction: 'US',
        approvedJurisdictions: ['EU', 'UK', 'JP'],
        maxCapitalPerTransferUSD: 10_000_000,
        maxDailyCapitalUSD: 50_000_000,
        validDays: 365,
        kycLevel: 'enhanced',
      });

      expect(passport.id).toBeDefined();
      expect(passport.issuedTo).toBe('institution_001');
      expect(passport.jurisdiction).toBe('US');
      expect(passport.approvedJurisdictions).toContain('EU');
      expect(passport.maxCapitalPerTransferUSD).toBe(10_000_000);
      expect(passport.status).toBe('active');
    });

    it('should validate a liquidity passport', () => {
      const passport = router.issueLiquidityPassport({
        issuedTo: 'fund_001',
        jurisdiction: 'SG',
        approvedJurisdictions: ['AU', 'JP', 'HK'],
        maxCapitalPerTransferUSD: 5_000_000,
        maxDailyCapitalUSD: 20_000_000,
        validDays: 90,
      });

      const valid = router.validateLiquidityPassport(passport.id, 1_000_000, 'JP');
      expect(valid.isValid).toBe(true);
      expect(valid.jurisdictionApproved).toBe(true);

      const invalidJurisdiction = router.validateLiquidityPassport(passport.id, 1_000_000, 'US');
      expect(invalidJurisdiction.isValid).toBe(false);
      expect(invalidJurisdiction.jurisdictionApproved).toBe(false);
    });

    it('should reject validation for invalid passport id', () => {
      const result = router.validateLiquidityPassport('nonexistent', 1_000_000, 'US');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should revoke a liquidity passport', () => {
      const passport = router.issueLiquidityPassport({
        issuedTo: 'revoked_org',
        jurisdiction: 'US',
        approvedJurisdictions: ['EU'],
        maxCapitalPerTransferUSD: 1_000_000,
        maxDailyCapitalUSD: 5_000_000,
        validDays: 30,
      });

      router.revokeLiquidityPassport(passport.id, 'Compliance issue');
      const revoked = router.getLiquidityPassport(passport.id);
      expect(revoked!.status).toBe('revoked');
    });
  });

  describe('compliance', () => {
    it('should run route compliance check', () => {
      const route = router.computeRoute({
        sourceNodeId: 'src',
        destinationNodeId: 'dst',
        amount: 1_000_000,
        currency: 'USD',
      });

      const compliance = router.runRouteComplianceCheck(route.id);
      expect(compliance.routeId).toBe(route.id);
      expect(compliance.overallScore).toBeGreaterThanOrEqual(0);
      expect(compliance.checkedAt).toBeInstanceOf(Date);
    });
  });

  describe('analytics', () => {
    it('should return routing metrics', () => {
      router.computeRoute({ sourceNodeId: 'a', destinationNodeId: 'b', amount: 100_000, currency: 'USD' });

      const metrics = router.getRoutingMetrics();
      expect(metrics.totalRoutesComputed).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('events', () => {
    it('should emit event on route computation', () => {
      const events: unknown[] = [];
      router.onEvent(event => events.push(event));

      router.computeRoute({ sourceNodeId: 'src', destinationNodeId: 'dst', amount: 1_000_000, currency: 'USD' });
      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Global Settlement Mesh Tests
// ============================================================================

describe('GlobalSettlementMesh', () => {
  let mesh: ReturnType<typeof createGlobalSettlementMesh>;

  beforeEach(() => {
    mesh = createGlobalSettlementMesh();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(mesh.config).toBeDefined();
      expect(mesh.config.enableAtomicCrossJurisdictionTransfers).toBe(true);
      expect(mesh.config.enableNettingEngine).toBe(true);
    });
  });

  describe('settlement transactions', () => {
    it('should initiate a settlement', () => {
      const settlement = mesh.initiateSettlement({
        routeId: 'route_001',
        settlementType: 'gross',
        sourceNodeId: 'node_src',
        destinationNodeId: 'node_dst',
        amount: 2_000_000,
        currency: 'USD',
        chain: 'ton',
      });

      expect(settlement.id).toBeDefined();
      expect(settlement.amount).toBe(2_000_000);
      expect(settlement.settlementType).toBe('gross');
      expect(settlement.status).toBe('pending');
      expect(settlement.initiatedAt).toBeInstanceOf(Date);
    });

    it('should finalize a settlement', () => {
      const settlement = mesh.initiateSettlement({
        routeId: 'route_002',
        settlementType: 'atomic',
        sourceNodeId: 'node_a',
        destinationNodeId: 'node_b',
        amount: 500_000,
        currency: 'EUR',
        chain: 'ethereum',
      });

      const finalized = mesh.finalizeSettlement(
        settlement.id,
        '0xabc123def456',
        18_000_000
      );

      expect(finalized.status).toBe('finalized');
      expect(finalized.onChainTxHash).toBe('0xabc123def456');
      expect(finalized.finalizedAt).toBeInstanceOf(Date);
    });

    it('should fail a settlement', () => {
      const settlement = mesh.initiateSettlement({
        routeId: 'route_003',
        settlementType: 'net',
        sourceNodeId: 'n1',
        destinationNodeId: 'n2',
        amount: 100_000,
        currency: 'USD',
        chain: 'ton',
      });

      const failed = mesh.failSettlement(settlement.id, 'Insufficient liquidity');
      expect(failed.status).toBe('failed');
      expect(failed.failureReason).toBe('Insufficient liquidity');
    });

    it('should list settlements with filters', () => {
      mesh.initiateSettlement({
        routeId: 'r1', settlementType: 'gross', sourceNodeId: 'a',
        destinationNodeId: 'b', amount: 100_000, currency: 'USD', chain: 'ton',
      });
      mesh.initiateSettlement({
        routeId: 'r2', settlementType: 'atomic', sourceNodeId: 'c',
        destinationNodeId: 'd', amount: 200_000, currency: 'EUR', chain: 'ethereum',
      });

      const allSettlements = mesh.listSettlements();
      expect(allSettlements.length).toBe(2);

      const grossOnly = mesh.listSettlements({ settlementType: 'gross' });
      expect(grossOnly.every(s => s.settlementType === 'gross')).toBe(true);
    });
  });

  describe('netting engine', () => {
    it('should open and execute a netting cycle', () => {
      const cycle = mesh.openNettingCycle(['node_1', 'node_2', 'node_3']);
      expect(cycle.id).toBeDefined();
      expect(cycle.status).toBe('open');

      const s1 = mesh.initiateSettlement({
        routeId: 'r1', settlementType: 'deferred_net', sourceNodeId: 'node_1',
        destinationNodeId: 'node_2', amount: 1_000_000, currency: 'USD', chain: 'ton',
      });
      const s2 = mesh.initiateSettlement({
        routeId: 'r2', settlementType: 'deferred_net', sourceNodeId: 'node_2',
        destinationNodeId: 'node_1', amount: 600_000, currency: 'USD', chain: 'ton',
      });

      mesh.addTransactionToNettingCycle(cycle.id, s1.id);
      mesh.addTransactionToNettingCycle(cycle.id, s2.id);

      const result = mesh.executeNettingCycle(cycle.id);
      expect(result.grossTransactions).toBe(2);
      expect(result.nettingEfficiency).toBeGreaterThan(0);

      const completedCycle = mesh.getNettingCycle(cycle.id);
      expect(completedCycle!.status).toBe('settled');
    });
  });

  describe('cross-chain finality', () => {
    it('should track cross-chain finality', () => {
      const settlement = mesh.initiateSettlement({
        routeId: 'r_atomic', settlementType: 'atomic', sourceNodeId: 'n1',
        destinationNodeId: 'n2', amount: 300_000, currency: 'USD', chain: 'ton',
      });

      const record = mesh.recordFinalityTracking({
        transactionId: settlement.id,
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        bridgeProtocol: 'LayerZero',
        sourceTxHash: '0xsrc123',
        atomicSwapUsed: false,
      });

      expect(record.id).toBeDefined();
      expect(record.finalityStatus).toBe('pending_source');

      // Update confirmations to reach finality
      const updated = mesh.updateFinalityConfirmations(
        record.id, 6, 6, '0xdst456'
      );
      expect(updated.finalityStatus).toBe('finalized');
      expect(updated.finalizedAt).toBeInstanceOf(Date);
    });
  });

  describe('analytics', () => {
    it('should return settlement metrics', () => {
      const metrics = mesh.getSettlementMetrics();
      expect(metrics.totalSettlements).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should return mesh status', () => {
      const status = mesh.getMeshStatus();
      expect(status.meshHealth).toBeDefined();
      expect(status.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('events', () => {
    it('should emit event on settlement initiation', () => {
      const events: unknown[] = [];
      mesh.onEvent(event => events.push(event));

      mesh.initiateSettlement({
        routeId: 'r_evt', settlementType: 'gross', sourceNodeId: 'a',
        destinationNodeId: 'b', amount: 100_000, currency: 'USD', chain: 'ton',
      });

      expect(events.length).toBe(1);
      expect((events[0] as { type: string }).type).toBe('settlement_initiated');
    });
  });
});

// ============================================================================
// AI Coordination Layer Tests
// ============================================================================

describe('AICoordinationLayer', () => {
  let coordination: ReturnType<typeof createAICoordinationLayer>;

  beforeEach(() => {
    coordination = createAICoordinationLayer();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(coordination.config).toBeDefined();
      expect(coordination.config.enableAutoLiquidityBalancing).toBe(true);
      expect(coordination.config.enableRiskClusterDetection).toBe(true);
    });
  });

  describe('liquidity balancing', () => {
    it('should compute global liquidity balance', () => {
      const snapshots = [
        { nodeId: 'node_1', nodeName: 'Node 1', availableLiquidityUSD: 10_000_000, utilization: 0.3, liquidityGapUSD: 5_000_000 },
        { nodeId: 'node_2', nodeName: 'Node 2', availableLiquidityUSD: 2_000_000, utilization: 0.95, liquidityGapUSD: -3_000_000 },
        { nodeId: 'node_3', nodeName: 'Node 3', availableLiquidityUSD: 8_000_000, utilization: 0.5, liquidityGapUSD: 2_000_000 },
      ];

      const balance = coordination.computeGlobalLiquidityBalance(snapshots);

      expect(balance.id).toBeDefined();
      expect(balance.totalNetworkLiquidityUSD).toBe(20_000_000);
      expect(balance.byNode.length).toBe(3);
      expect(balance.imbalanceScore).toBeGreaterThanOrEqual(0);
      expect(balance.timestamp).toBeInstanceOf(Date);
    });

    it('should retrieve latest liquidity balance', () => {
      const snapshots = [
        { nodeId: 'n1', nodeName: 'N1', availableLiquidityUSD: 5_000_000, utilization: 0.5, liquidityGapUSD: 0 },
      ];

      const computed = coordination.computeGlobalLiquidityBalance(snapshots);
      const latest = coordination.getLatestLiquidityBalance();

      expect(latest).toBeDefined();
      expect(latest!.id).toBe(computed.id);
    });
  });

  describe('risk cluster detection', () => {
    it('should detect concentration risk', () => {
      const clusters = coordination.detectRiskClusters({
        nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11'],
        jurisdictions: ['US', 'EU'],
        chains: ['ton', 'ethereum'],
        sensitivityLevel: 'medium',
      });

      expect(clusters.length).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve a risk cluster', () => {
      const clusters = coordination.detectRiskClusters({
        nodeIds: Array.from({ length: 12 }, (_, i) => `n${i}`),
        jurisdictions: ['US'],
        chains: ['ton'],
        sensitivityLevel: 'high',
      });

      if (clusters.length > 0) {
        const retrieved = coordination.getRiskCluster(clusters[0].id);
        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(clusters[0].id);
      }
    });

    it('should list and resolve risk clusters', () => {
      const clusters = coordination.detectRiskClusters({
        nodeIds: Array.from({ length: 15 }, (_, i) => `node_${i}`),
        jurisdictions: ['JP'],
        chains: ['ton'],
      });

      if (clusters.length > 0) {
        const clusterId = clusters[0].id;
        const resolved = coordination.resolveRiskCluster(clusterId, 'Deployed mitigation measures');
        expect(resolved.status).toBe('resolved');
        expect(resolved.resolvedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('capital reallocation', () => {
    it('should propose and execute capital reallocation', () => {
      const reallocation = coordination.proposeCapitalReallocation({
        trigger: 'Liquidity imbalance detected',
        sourceNodes: ['node_surplus_1', 'node_surplus_2'],
        destinationNodes: ['node_deficit_1'],
        totalCapitalUSD: 5_000_000,
        reason: 'Rebalancing network liquidity',
        requiresGovernanceApproval: false,
      });

      expect(reallocation.id).toBeDefined();
      expect(reallocation.status).toBe('proposed');
      expect(reallocation.totalCapitalMovedUSD).toBe(5_000_000);

      const approved = coordination.approveCapitalReallocation(reallocation.id);
      expect(approved.status).toBe('approved');

      const executed = coordination.executeCapitalReallocation(reallocation.id);
      expect(executed.status).toBe('completed');
    });

    it('should cancel a capital reallocation', () => {
      const reallocation = coordination.proposeCapitalReallocation({
        trigger: 'Test trigger',
        sourceNodes: ['n1'],
        destinationNodes: ['n2'],
        totalCapitalUSD: 1_000_000,
        reason: 'Test',
      });

      const cancelled = coordination.cancelCapitalReallocation(reallocation.id, 'Changed plans');
      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('crisis mitigation', () => {
    it('should create and activate a crisis mitigation plan', () => {
      const plan = coordination.createCrisisMitigationPlan({
        crisisTrigger: 'Major node offline',
        severity: 'severe',
        affectedNodes: ['critical_node_1', 'critical_node_2'],
        estimatedImpactUSD: 100_000_000,
        mitigationSteps: [
          { stepNumber: 1, action: 'Activate backup nodes', targetNodeIds: ['backup_1'], capitalInvolvedUSD: 0 },
          { stepNumber: 2, action: 'Redistribute liquidity', targetNodeIds: ['node_3', 'node_4'], capitalInvolvedUSD: 50_000_000 },
        ],
      });

      expect(plan.id).toBeDefined();
      expect(plan.status).toBe('planning');
      expect(plan.mitigationSteps.length).toBe(2);

      const activated = coordination.activateCrisisMitigationPlan(plan.id);
      expect(activated.status).toBe('active');
    });

    it('should complete mitigation steps and resolve crisis', () => {
      const plan = coordination.createCrisisMitigationPlan({
        crisisTrigger: 'Network partition',
        severity: 'critical',
        affectedNodes: ['n1'],
        estimatedImpactUSD: 50_000_000,
        mitigationSteps: [
          { stepNumber: 1, action: 'Isolate affected segment', targetNodeIds: ['n1'], capitalInvolvedUSD: 0 },
        ],
      });

      coordination.activateCrisisMitigationPlan(plan.id);
      const step = coordination.completeMitigationStep(plan.id, 1, 'Successfully isolated');
      expect(step.completedAt).toBeInstanceOf(Date);
      expect(step.outcome).toBe('Successfully isolated');

      const resolved = coordination.resolveCrisis(plan.id);
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Multi-Reserve Treasury Network Tests
// ============================================================================

describe('MultiReserveTreasuryNetwork', () => {
  let treasury: ReturnType<typeof createMultiReserveTreasuryNetwork>;

  beforeEach(() => {
    treasury = createMultiReserveTreasuryNetwork();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(treasury.config).toBeDefined();
      expect(treasury.config.enableCrossChainReserveManagement).toBe(true);
      expect(treasury.config.minimumReserveRatio).toBe(0.1);
    });
  });

  describe('reserve pool management', () => {
    it('should create a regional reserve pool', () => {
      const pool = treasury.createReservePool({
        name: 'Asia-Pacific Reserve Pool',
        region: 'APAC',
        jurisdictions: ['JP', 'SG', 'HK', 'AU'],
        participatingNodes: ['node_jp_1', 'node_sg_1', 'node_hk_1'],
        targetAllocationUSD: 500_000_000,
      });

      expect(pool.id).toBeDefined();
      expect(pool.name).toBe('Asia-Pacific Reserve Pool');
      expect(pool.region).toBe('APAC');
      expect(pool.jurisdictions).toContain('JP');
      expect(pool.status).toBe('active');
      expect(pool.createdAt).toBeInstanceOf(Date);
    });

    it('should add asset to reserve pool', () => {
      const pool = treasury.createReservePool({
        name: 'EU Reserve', region: 'EU',
        jurisdictions: ['DE', 'FR', 'IT'],
        participatingNodes: ['node_eu'],
        targetAllocationUSD: 200_000_000,
      });

      const updated = treasury.addAssetToPool(pool.id, {
        assetId: 'USDC',
        assetName: 'USD Coin',
        assetClass: 'stablecoin',
        chain: 'ethereum',
        amount: 100_000_000,
        usdValue: 100_000_000,
        targetPercent: 50,
        currentPercent: 0,
        yieldRate: 0.05,
        liquidityDepth: 'high',
      });

      expect(updated.totalValueUSD).toBe(100_000_000);
      expect(updated.assets.length).toBe(1);
    });

    it('should rebalance a reserve pool', () => {
      const pool = treasury.createReservePool({
        name: 'US Reserve', region: 'Americas',
        jurisdictions: ['US', 'CA', 'BR'],
        participatingNodes: ['node_us'],
        targetAllocationUSD: 1_000_000_000,
      });

      treasury.addAssetToPool(pool.id, {
        assetId: 'USDT', assetName: 'Tether', assetClass: 'stablecoin', chain: 'ton',
        amount: 60_000_000, usdValue: 60_000_000, targetPercent: 40, currentPercent: 60,
        yieldRate: 0.04, liquidityDepth: 'high',
      });
      treasury.addAssetToPool(pool.id, {
        assetId: 'TON', assetName: 'Toncoin', assetClass: 'native_crypto', chain: 'ton',
        amount: 40_000_000, usdValue: 40_000_000, targetPercent: 60, currentPercent: 40,
        yieldRate: 0.08, liquidityDepth: 'medium',
      });

      const result = treasury.rebalancePool(pool.id);
      expect(result.poolId).toBe(pool.id);
      expect(result.rebalancedAt).toBeInstanceOf(Date);
      expect(result.assetAdjustments.length).toBe(2);
    });

    it('should list reserve pools with filters', () => {
      treasury.createReservePool({
        name: 'Pool A', region: 'Asia', jurisdictions: ['JP'],
        participatingNodes: ['n1'], targetAllocationUSD: 100_000_000,
      });
      treasury.createReservePool({
        name: 'Pool B', region: 'EU', jurisdictions: ['DE'],
        participatingNodes: ['n2'], targetAllocationUSD: 200_000_000,
      });

      const asiaPools = treasury.listReservePools({ region: 'Asia' });
      expect(asiaPools.length).toBe(1);
      expect(asiaPools[0].region).toBe('Asia');
    });
  });

  describe('treasury vault management', () => {
    it('should create a treasury vault', () => {
      const vault = treasury.createTreasuryVault({
        name: 'Primary Global Vault',
        vaultType: 'primary',
        managingNodeIds: ['node_1', 'node_2', 'node_3'],
        multisigThreshold: 2,
        multisigParticipants: 3,
        crossChainEnabled: true,
        supportedChains: ['ton', 'ethereum', 'polygon'],
      });

      expect(vault.id).toBeDefined();
      expect(vault.name).toBe('Primary Global Vault');
      expect(vault.vaultType).toBe('primary');
      expect(vault.multisigThreshold).toBe(2);
      expect(vault.crossChainEnabled).toBe(true);
      expect(vault.status).toBe('active');
    });

    it('should add asset to vault', () => {
      const vault = treasury.createTreasuryVault({
        name: 'Emergency Vault', vaultType: 'emergency',
        managingNodeIds: ['node_gov'],
        multisigThreshold: 3, multisigParticipants: 5,
      });

      const updated = treasury.addAssetToVault(vault.id, {
        assetId: 'BTC', assetName: 'Bitcoin', assetClass: 'native_crypto',
        chain: 'ethereum', amount: 1000, usdValue: 50_000_000,
        targetPercent: 30, currentPercent: 0, lockupDays: 0,
      });

      expect(updated.totalValueUSD).toBe(50_000_000);
      expect(updated.assets.length).toBe(1);
    });

    it('should lock and unlock a vault', () => {
      const vault = treasury.createTreasuryVault({
        name: 'Lockable Vault', vaultType: 'operational',
        managingNodeIds: ['node_ops'],
        multisigThreshold: 1, multisigParticipants: 2,
      });

      treasury.lockVault(vault.id, 'Emergency security protocol');
      const locked = treasury.getTreasuryVault(vault.id);
      expect(locked!.status).toBe('locked');

      treasury.unlockVault(vault.id);
      const unlocked = treasury.getTreasuryVault(vault.id);
      expect(unlocked!.status).toBe('active');
    });
  });

  describe('cross-chain reserve transfers', () => {
    it('should initiate and complete a reserve transfer', () => {
      const sourcePool = treasury.createReservePool({
        name: 'Source Pool', region: 'Americas',
        jurisdictions: ['US'], participatingNodes: ['n_us'],
        targetAllocationUSD: 100_000_000,
      });
      treasury.updateReservePool(sourcePool.id, {
        totalValueUSD: 50_000_000, availableValueUSD: 50_000_000,
      });

      const destPool = treasury.createReservePool({
        name: 'Dest Pool', region: 'APAC',
        jurisdictions: ['SG'], participatingNodes: ['n_sg'],
        targetAllocationUSD: 100_000_000,
      });

      const transfer = treasury.initiateReserveTransfer({
        sourcePoolId: sourcePool.id,
        destinationPoolId: destPool.id,
        assetId: 'USDC',
        amountUSD: 10_000_000,
        sourceChain: 'ethereum',
        destinationChain: 'ton',
        bridgeProtocol: 'LayerZero',
      });

      expect(transfer.id).toBeDefined();
      expect(transfer.status).toBe('pending');
      expect(transfer.amountUSD).toBe(10_000_000);

      const completed = treasury.completeReserveTransfer(transfer.id);
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('network summary', () => {
    it('should return network reserve summary', () => {
      treasury.createReservePool({
        name: 'Pool 1', region: 'APAC',
        jurisdictions: ['JP'], participatingNodes: ['n1'],
        targetAllocationUSD: 100_000_000,
      });

      const summary = treasury.getNetworkReserveSummary();
      expect(summary.totalPools).toBeGreaterThan(0);
      expect(summary.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('events', () => {
    it('should emit event on reserve pool creation', () => {
      const events: unknown[] = [];
      treasury.onEvent(event => events.push(event));

      treasury.createReservePool({
        name: 'Event Pool', region: 'Global',
        jurisdictions: ['US'], participatingNodes: ['n_global'],
        targetAllocationUSD: 50_000_000,
      });

      expect(events.length).toBe(1);
      expect((events[0] as { type: string }).type).toBe('reserve_pool_created');
    });
  });
});

// ============================================================================
// Global Stability Dashboard Tests
// ============================================================================

describe('GlobalStabilityDashboard', () => {
  let dashboard: ReturnType<typeof createGlobalStabilityDashboard>;

  beforeEach(() => {
    dashboard = createGlobalStabilityDashboard();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(dashboard.config).toBeDefined();
      expect(dashboard.config.enablePublicMetrics).toBe(true);
      expect(dashboard.config.alertOnStabilityBelow).toBe(50);
    });
  });

  describe('snapshot management', () => {
    it('should record a stability snapshot', () => {
      const snapshot = dashboard.recordSnapshot({
        totalNetworkNodes: 50,
        activeNodes: 48,
        networkUptimePercent: 99.5,
        totalGlobalExposureUSD: 10_000_000_000,
        crossBorderExposureUSD: 3_000_000_000,
        concentrationRiskScore: 25,
        regionalCapitalAllocation: [
          { region: 'Americas', jurisdictions: ['US', 'CA'], capitalAllocatedUSD: 4_000_000_000, percentOfTotal: 40, nodeCount: 20, averageLeverageRatio: 2.5, stabilityScore: 85 },
          { region: 'EMEA', jurisdictions: ['EU', 'UK'], capitalAllocatedUSD: 3_000_000_000, percentOfTotal: 30, nodeCount: 15, averageLeverageRatio: 2.0, stabilityScore: 90 },
        ],
        totalLiquidityUSD: 5_000_000_000,
        liquidityDepthScore: 80,
        averageNetworkLeverage: 2.3,
        maxNodeLeverage: 5.0,
        leverageRiskScore: 30,
      });

      expect(snapshot.id).toBeDefined();
      expect(snapshot.stabilityIndex).toBeGreaterThan(0);
      expect(snapshot.stabilityIndicator).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });

    it('should retrieve latest snapshot', () => {
      const recorded = dashboard.recordSnapshot({
        totalNetworkNodes: 10,
        activeNodes: 10,
        networkUptimePercent: 100,
        totalGlobalExposureUSD: 1_000_000_000,
        crossBorderExposureUSD: 300_000_000,
        concentrationRiskScore: 20,
        regionalCapitalAllocation: [],
        totalLiquidityUSD: 500_000_000,
        liquidityDepthScore: 90,
        averageNetworkLeverage: 1.5,
        maxNodeLeverage: 3.0,
        leverageRiskScore: 15,
      });

      const latest = dashboard.getLatestSnapshot();
      expect(latest).toBeDefined();
      expect(latest!.id).toBe(recorded.id);
    });

    it('should filter snapshots by stability indicator', () => {
      dashboard.recordSnapshot({
        totalNetworkNodes: 10, activeNodes: 10, networkUptimePercent: 100,
        totalGlobalExposureUSD: 1_000_000_000, crossBorderExposureUSD: 300_000_000,
        concentrationRiskScore: 10, regionalCapitalAllocation: [],
        totalLiquidityUSD: 500_000_000, liquidityDepthScore: 95,
        averageNetworkLeverage: 1.2, maxNodeLeverage: 2.0, leverageRiskScore: 10,
      });

      const stableSnapshots = dashboard.listSnapshots({ stabilityIndicator: 'stable' });
      expect(stableSnapshots.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('metric history', () => {
    it('should record and retrieve metric history', () => {
      dashboard.recordMetricDataPoint('customMetric', 75);
      dashboard.recordMetricDataPoint('customMetric', 80);
      dashboard.recordMetricDataPoint('customMetric', 78);

      const history = dashboard.getMetricHistory('customMetric');
      expect(history).toBeDefined();
      expect(history!.dataPoints.length).toBe(3);
      expect(history!.metricName).toBe('customMetric');
    });

    it('should list tracked metrics', () => {
      dashboard.recordSnapshot({
        totalNetworkNodes: 5, activeNodes: 5, networkUptimePercent: 100,
        totalGlobalExposureUSD: 500_000_000, crossBorderExposureUSD: 100_000_000,
        concentrationRiskScore: 20, regionalCapitalAllocation: [],
        totalLiquidityUSD: 200_000_000, liquidityDepthScore: 85,
        averageNetworkLeverage: 1.5, maxNodeLeverage: 2.5, leverageRiskScore: 20,
      });

      const metrics = dashboard.listTrackedMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics).toContain('stabilityIndex');
    });
  });

  describe('public metrics', () => {
    it('should return public metrics summary', () => {
      dashboard.recordSnapshot({
        totalNetworkNodes: 20, activeNodes: 19, networkUptimePercent: 98,
        totalGlobalExposureUSD: 2_000_000_000, crossBorderExposureUSD: 600_000_000,
        concentrationRiskScore: 30, regionalCapitalAllocation: [],
        totalLiquidityUSD: 800_000_000, liquidityDepthScore: 75,
        averageNetworkLeverage: 2.0, maxNodeLeverage: 4.0, leverageRiskScore: 25,
      });

      const summary = dashboard.getPublicMetricsSummary();
      expect(summary.stabilityIndex).toBeGreaterThan(0);
      expect(summary.stabilityIndicator).toBeDefined();
      expect(summary.generatedAt).toBeInstanceOf(Date);
    });

    it('should return liquidity depth report', () => {
      dashboard.recordSnapshot({
        totalNetworkNodes: 15, activeNodes: 15, networkUptimePercent: 100,
        totalGlobalExposureUSD: 1_500_000_000, crossBorderExposureUSD: 450_000_000,
        concentrationRiskScore: 25, regionalCapitalAllocation: [],
        totalLiquidityUSD: 700_000_000, liquidityDepthScore: 80,
        liquidityByJurisdiction: [
          { jurisdiction: 'US', totalLiquidityUSD: 300_000_000, liquidityDepth: 'deep', utilizationPercent: 40, netLiquidityFlowUSD: 50_000_000 },
          { jurisdiction: 'EU', totalLiquidityUSD: 250_000_000, liquidityDepth: 'moderate', utilizationPercent: 60, netLiquidityFlowUSD: -10_000_000 },
        ],
        averageNetworkLeverage: 1.8, maxNodeLeverage: 3.5, leverageRiskScore: 20,
      });

      const report = dashboard.getLiquidityDepthReport();
      expect(report.totalLiquidityUSD).toBe(700_000_000);
      expect(report.byJurisdiction.length).toBe(2);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should return stability trend', () => {
      // Record some metrics to build history
      dashboard.recordMetricDataPoint('stabilityIndex', 85);
      dashboard.recordMetricDataPoint('stabilityIndex', 83);
      dashboard.recordMetricDataPoint('stabilityIndex', 87);

      const trend = dashboard.getStabilityTrend(7);
      expect(trend.period).toBe(7);
      expect(trend.trend).toBeDefined();
    });
  });

  describe('alerts', () => {
    it('should create and retrieve alerts for low stability', () => {
      const customDashboard = createGlobalStabilityDashboard({
        alertOnStabilityBelow: 90, // High threshold to ensure alert
      });

      customDashboard.recordSnapshot({
        totalNetworkNodes: 5, activeNodes: 3, networkUptimePercent: 60,
        totalGlobalExposureUSD: 1_000_000_000, crossBorderExposureUSD: 800_000_000,
        concentrationRiskScore: 80, regionalCapitalAllocation: [],
        totalLiquidityUSD: 100_000_000, liquidityDepthScore: 20,
        averageNetworkLeverage: 10.0, maxNodeLeverage: 20.0, leverageRiskScore: 90,
      });

      const activeAlerts = customDashboard.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);
    });

    it('should acknowledge an alert', () => {
      const customDashboard = createGlobalStabilityDashboard({
        alertOnStabilityBelow: 95,
      });

      customDashboard.recordSnapshot({
        totalNetworkNodes: 5, activeNodes: 2, networkUptimePercent: 40,
        totalGlobalExposureUSD: 1_000_000_000, crossBorderExposureUSD: 900_000_000,
        concentrationRiskScore: 90, regionalCapitalAllocation: [],
        totalLiquidityUSD: 50_000_000, liquidityDepthScore: 10,
        averageNetworkLeverage: 15.0, maxNodeLeverage: 25.0, leverageRiskScore: 95,
      });

      const alerts = customDashboard.getActiveAlerts();
      if (alerts.length > 0) {
        const acknowledged = customDashboard.acknowledgeAlert(alerts[0].id);
        expect(acknowledged.status).toBe('acknowledged');
        expect(acknowledged.acknowledgedAt).toBeInstanceOf(Date);
      }
    });
  });
});

// ============================================================================
// AGFN Manager Integration Tests
// ============================================================================

describe('AGFNManager', () => {
  let agfn: ReturnType<typeof createAGFNManager>;

  beforeEach(() => {
    agfn = createAGFNManager();
  });

  describe('initialization', () => {
    it('should create manager with all components', () => {
      expect(agfn.nodeArchitecture).toBeDefined();
      expect(agfn.capitalRouting).toBeDefined();
      expect(agfn.settlementMesh).toBeDefined();
      expect(agfn.aiCoordination).toBeDefined();
      expect(agfn.treasuryNetwork).toBeDefined();
      expect(agfn.stabilityDashboard).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const custom = createAGFNManager({
        globalNodeArchitecture: { minTrustScoreForRouting: 80 },
        globalSettlementMesh: { requiredFinalityConfirmations: 12 },
      });

      expect(custom.nodeArchitecture.config.minTrustScoreForRouting).toBe(80);
      expect(custom.settlementMesh.config.requiredFinalityConfirmations).toBe(12);
    });
  });

  describe('system status', () => {
    it('should return system status with zero values when empty', () => {
      const status = agfn.getSystemStatus();

      expect(status.totalNodes).toBe(0);
      expect(status.activeNodes).toBe(0);
      expect(status.pendingSettlements).toBe(0);
      expect(status.generatedAt).toBeInstanceOf(Date);
    });

    it('should reflect registered nodes in system status', () => {
      agfn.nodeArchitecture.registerNode({
        name: 'Sovereign Node 1', type: 'sovereign', jurisdiction: 'EU',
        chain: 'ethereum', operatorId: 'eu_001', capacityUSD: 1_000_000_000,
      });
      agfn.nodeArchitecture.registerNode({
        name: 'Institutional Node 1', type: 'institutional', jurisdiction: 'US',
        chain: 'ton', operatorId: 'us_001', capacityUSD: 500_000_000,
      });

      const status = agfn.getSystemStatus();
      expect(status.totalNodes).toBe(2);
      expect(status.sovereignNodes).toBe(1);
      expect(status.institutionalNodes).toBe(1);
    });
  });

  describe('events', () => {
    it('should forward events from all components', () => {
      const events: unknown[] = [];
      agfn.onEvent(event => events.push(event));

      // Trigger events in different components
      agfn.nodeArchitecture.registerNode({
        name: 'Event Test Node', type: 'liquidity', jurisdiction: 'US',
        chain: 'ton', operatorId: 'evt_op', capacityUSD: 100_000_000,
      });

      agfn.capitalRouting.computeRoute({
        sourceNodeId: 'n1', destinationNodeId: 'n2',
        amount: 1_000_000, currency: 'USD',
      });

      agfn.settlementMesh.initiateSettlement({
        routeId: 'r1', settlementType: 'gross', sourceNodeId: 'n1',
        destinationNodeId: 'n2', amount: 500_000, currency: 'USD', chain: 'ton',
      });

      expect(events.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('end-to-end scenario', () => {
    it('should complete a full AGFN workflow', () => {
      // 1. Register nodes
      const sovereignNode = agfn.nodeArchitecture.registerNode({
        name: 'ECB Settlement Node',
        type: 'sovereign',
        jurisdiction: 'EU',
        chain: 'ethereum',
        operatorId: 'ecb_main',
        capacityUSD: 100_000_000_000,
        complianceLevel: 'sovereign',
      });

      const institutionalNode = agfn.nodeArchitecture.registerNode({
        name: 'JP Morgan Liquidity Node',
        type: 'institutional',
        jurisdiction: 'US',
        chain: 'ton',
        operatorId: 'jpm_main',
        capacityUSD: 50_000_000_000,
        complianceLevel: 'enhanced',
      });

      expect(sovereignNode.status).toBe('active');
      expect(institutionalNode.status).toBe('active');

      // 2. Issue liquidity passport
      const passport = agfn.capitalRouting.issueLiquidityPassport({
        issuedTo: 'jpm_main',
        jurisdiction: 'US',
        approvedJurisdictions: ['EU', 'UK', 'JP', 'SG'],
        maxCapitalPerTransferUSD: 500_000_000,
        maxDailyCapitalUSD: 2_000_000_000,
        validDays: 365,
        kycLevel: 'enhanced',
      });

      expect(passport.status).toBe('active');

      // 3. Compute capital route
      const route = agfn.capitalRouting.computeRoute({
        sourceNodeId: institutionalNode.id,
        destinationNodeId: sovereignNode.id,
        amount: 50_000_000,
        currency: 'USD',
        strategy: 'compliance_first',
        liquidityPassportId: passport.id,
      });

      expect(route.status).toBe('computed');

      // 4. Execute route
      const executedRoute = agfn.capitalRouting.executeRoute(route.id);
      expect(executedRoute.status).toBe('completed');

      // 5. Create reserve pool
      const reservePool = agfn.treasuryNetwork.createReservePool({
        name: 'EU-US Cross-Atlantic Reserve',
        region: 'Atlantic',
        jurisdictions: ['EU', 'US'],
        participatingNodes: [sovereignNode.id, institutionalNode.id],
        targetAllocationUSD: 200_000_000,
      });

      expect(reservePool.status).toBe('active');

      // 6. Create treasury vault
      const vault = agfn.treasuryNetwork.createTreasuryVault({
        name: 'Institutional Yield Vault',
        vaultType: 'yield',
        managingNodeIds: [sovereignNode.id, institutionalNode.id],
        multisigThreshold: 2,
        multisigParticipants: 2,
        crossChainEnabled: true,
        supportedChains: ['ton', 'ethereum'],
      });

      expect(vault.status).toBe('active');

      // 7. Record stability snapshot
      const snapshot = agfn.stabilityDashboard.recordSnapshot({
        totalNetworkNodes: 2,
        activeNodes: 2,
        networkUptimePercent: 100,
        totalGlobalExposureUSD: 50_000_000,
        crossBorderExposureUSD: 50_000_000,
        concentrationRiskScore: 40,
        regionalCapitalAllocation: [
          {
            region: 'EU', jurisdictions: ['EU'],
            capitalAllocatedUSD: 30_000_000, percentOfTotal: 60,
            nodeCount: 1, averageLeverageRatio: 1.5, stabilityScore: 90,
          },
          {
            region: 'US', jurisdictions: ['US'],
            capitalAllocatedUSD: 20_000_000, percentOfTotal: 40,
            nodeCount: 1, averageLeverageRatio: 2.0, stabilityScore: 85,
          },
        ],
        totalLiquidityUSD: 100_000_000,
        liquidityDepthScore: 85,
        averageNetworkLeverage: 1.75,
        maxNodeLeverage: 2.0,
        leverageRiskScore: 20,
      });

      expect(snapshot.stabilityIndex).toBeGreaterThan(0);

      // 8. Get final system status
      const status = agfn.getSystemStatus();
      expect(status.totalNodes).toBe(2);
      expect(status.sovereignNodes).toBe(1);
      expect(status.institutionalNodes).toBe(1);
      expect(status.totalReservePools).toBe(1);
      expect(status.totalTreasuryVaults).toBe(1);
      expect(status.generatedAt).toBeInstanceOf(Date);
    });
  });
});
