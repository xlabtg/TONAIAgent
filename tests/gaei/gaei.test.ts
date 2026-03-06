/**
 * TONAIAgent - Global Autonomous Economic Infrastructure (GAEI) Tests
 *
 * Comprehensive test suite for all 6 core infrastructure domains of GAEI:
 * 1. Capital Coordination Layer
 * 2. Real Economy Integration Layer
 * 3. AI Economic Orchestration Engine
 * 4. Multi-Layer Monetary Coordination
 * 5. Global Economic Node Architecture
 * 6. Global Economic Stability Dashboard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGAEIManager,
  createCapitalCoordinationLayer,
  createRealEconomyIntegrationLayer,
  createAIEconomicOrchestrationEngine,
  createMonetaryCoordinationLayer,
  createEconomicNodeArchitecture,
  createStabilityDashboardLayer,
} from '../../src/gaei/index';

// ============================================================================
// Capital Coordination Layer Tests
// ============================================================================

describe('CapitalCoordinationLayer', () => {
  let layer: ReturnType<typeof createCapitalCoordinationLayer>;

  beforeEach(() => {
    layer = createCapitalCoordinationLayer();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(layer.config).toBeDefined();
      expect(layer.config.enableMacroModeling).toBe(true);
      expect(layer.config.enableAIOptimization).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createCapitalCoordinationLayer({
        enableMacroModeling: false,
        maxCrossBorderSettlementMinutes: 30,
      });
      expect(custom.config.enableMacroModeling).toBe(false);
      expect(custom.config.maxCrossBorderSettlementMinutes).toBe(30);
    });
  });

  describe('capital flow management', () => {
    it('should initiate a cross-border capital flow', () => {
      const flow = layer.initiateCapitalFlow({
        sourceNodeId: 'sovereign_us_001',
        destinationNodeId: 'institutional_sg_001',
        flowType: 'macro_allocation',
        amount: 500_000_000,
        currency: 'USD',
        sourceJurisdiction: 'US',
        destinationJurisdiction: 'SG',
        allocationPurpose: 'Infrastructure investment',
      });

      expect(flow.id).toBeDefined();
      expect(flow.sourceNodeId).toBe('sovereign_us_001');
      expect(flow.destinationNodeId).toBe('institutional_sg_001');
      expect(flow.amount).toBe(500_000_000);
      expect(flow.status).toBe('pending');
      expect(flow.initiatedAt).toBeInstanceOf(Date);
    });

    it('should list capital flows with filters', () => {
      layer.initiateCapitalFlow({ sourceNodeId: 'n1', destinationNodeId: 'n2', flowType: 'macro_allocation', amount: 1e6, currency: 'USD', sourceJurisdiction: 'US', destinationJurisdiction: 'SG', allocationPurpose: 'Test' });
      layer.initiateCapitalFlow({ sourceNodeId: 'n3', destinationNodeId: 'n4', flowType: 'liquidity_provision', amount: 2e6, currency: 'EUR', sourceJurisdiction: 'DE', destinationJurisdiction: 'FR', allocationPurpose: 'Test' });

      const usFlows = layer.listCapitalFlows({ sourceJurisdiction: 'US' });
      expect(usFlows).toHaveLength(1);

      const allFlows = layer.listCapitalFlows({});
      expect(allFlows).toHaveLength(2);
    });

    it('should settle a capital flow', () => {
      const flow = layer.initiateCapitalFlow({
        sourceNodeId: 'src',
        destinationNodeId: 'dst',
        flowType: 'infrastructure_investment',
        amount: 1_000_000,
        currency: 'USD',
        sourceJurisdiction: 'JP',
        destinationJurisdiction: 'AU',
        allocationPurpose: 'Test',
      });

      const settled = layer.settleCapitalFlow(flow.id);
      expect(settled.status).toBe('settled');
      expect(settled.settledAt).toBeInstanceOf(Date);
    });
  });

  describe('route computation', () => {
    it('should compute optimal route for capital transfer', () => {
      const route = layer.computeOptimalRoute({
        sourceNodeId: 'node_1',
        destinationNodeId: 'node_2',
        amount: 10_000_000,
        optimizeFor: 'efficiency',
      });

      expect(route.routeId).toBeDefined();
      expect(route.sourceNodeId).toBe('node_1');
      expect(route.destinationNodeId).toBe('node_2');
    });
  });

  describe('macro models', () => {
    it('should create and list macro models', () => {
      const model = layer.createMacroModel('Global Infrastructure');
      expect(model.id).toBeDefined();
      expect(model.name).toBe('Global Infrastructure');

      const models = layer.listMacroModels({});
      expect(models).toHaveLength(1);
    });
  });

  describe('layer status', () => {
    it('should return layer status', () => {
      const status = layer.getLayerStatus();
      expect(status.totalCapitalManaged).toBeGreaterThanOrEqual(0);
      expect(status.allocationEfficiencyIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('events', () => {
    it('should emit events on capital flow initiation', () => {
      const events: string[] = [];
      layer.onEvent(e => events.push(e.type));

      layer.initiateCapitalFlow({ sourceNodeId: 'a', destinationNodeId: 'b', flowType: 'macro_allocation', amount: 1e6, currency: 'USD', sourceJurisdiction: 'US', destinationJurisdiction: 'SG', allocationPurpose: 'Test' });

      expect(events).toContain('capital_flow_initiated');
    });
  });
});

// ============================================================================
// Real Economy Integration Layer Tests
// ============================================================================

describe('RealEconomyIntegrationLayer', () => {
  let layer: ReturnType<typeof createRealEconomyIntegrationLayer>;

  beforeEach(() => {
    layer = createRealEconomyIntegrationLayer();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(layer.config).toBeDefined();
      expect(layer.config.enableRWATokenization).toBe(true);
      expect(layer.config.enableCommodityBacking).toBe(true);
      expect(layer.config.enableTradeFinance).toBe(true);
    });
  });

  describe('RWA asset management', () => {
    it('should create a tokenized RWA asset', () => {
      const asset = layer.createRWAAsset({
        name: 'US Treasury 10Y',
        assetType: 'treasury_bond',
        underlyingValue: 100_000_000,
        jurisdiction: 'US',
        custodian: 'State Street',
        tokenize: true,
        chain: 'ton',
      });

      expect(asset.id).toBeDefined();
      expect(asset.tokenizedValue).toBeGreaterThan(0);
    });

    it('should list RWA assets with filters', () => {
      layer.createRWAAsset({ name: 'Bond 1', assetType: 'treasury_bond', underlyingValue: 1e6, jurisdiction: 'US', custodian: 'Custodian A', tokenize: true, chain: 'ton' });
      layer.createRWAAsset({ name: 'Real Estate 1', assetType: 'real_estate', underlyingValue: 5e6, jurisdiction: 'SG', custodian: 'Custodian B', tokenize: true, chain: 'ton' });

      const bonds = layer.listRWAAssets({ assetType: 'treasury_bond' });
      expect(bonds).toHaveLength(1);
    });
  });

  describe('commodity assets', () => {
    it('should create a commodity-backed asset', () => {
      const commodity = layer.createCommodityAsset({
        commodityType: 'gold',
        commodityName: 'LBMA Gold Bar',
        underlyingQuantity: 1000,
        unit: 'oz',
        spotPrice: 2000,
        storageLocation: 'Singapore Freeport',
        custodian: 'Brinks',
        tokenize: true,
        chain: 'ton',
        deliverySupported: true,
      });

      expect(commodity.id).toBeDefined();
    });
  });

  describe('trade finance', () => {
    it('should create a trade finance instrument', () => {
      const instrument = layer.createTradeFinanceInstrument({
        instrumentType: 'letter_of_credit',
        principalAmount: 10_000_000,
        currency: 'USD',
        issuer: 'Bank of America',
        beneficiary: 'Samsung Electronics',
        sourceJurisdiction: 'US',
        destinationJurisdiction: 'KR',
        maturityDate: new Date('2026-12-31'),
        interestRate: 4.5,
        tokenize: true,
        chain: 'ton',
      });

      expect(instrument.id).toBeDefined();
    });
  });

  describe('infrastructure financing', () => {
    it('should create an infrastructure financing project', () => {
      const project = layer.createInfrastructureFinancing({
        projectName: 'Trans-Pacific Digital Corridor',
        projectType: 'digital',
        totalInvestment: 500_000_000,
        jurisdiction: 'SG',
        expectedReturn: 8.5,
        projectDurationYears: 10,
        riskRating: 'A',
        tokenize: true,
        chain: 'ton',
      });

      expect(project.id).toBeDefined();
    });
  });

  describe('supply chain liquidity', () => {
    it('should create a supply chain liquidity facility', () => {
      const facility = layer.createSupplyChainLiquidity({
        facilityName: 'APAC Supply Chain Fund',
        totalCapacity: 50_000_000,
        currency: 'USD',
        anchorBuyer: 'Apple Inc',
        supplierRegions: ['CN', 'TW', 'VN'],
        paymentTermDays: 60,
        discountRate: 3.5,
      });

      expect(facility.id).toBeDefined();
    });
  });
});

// ============================================================================
// AI Economic Orchestration Engine Tests
// ============================================================================

describe('AIEconomicOrchestrationEngine', () => {
  let engine: ReturnType<typeof createAIEconomicOrchestrationEngine>;

  beforeEach(() => {
    engine = createAIEconomicOrchestrationEngine();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(engine.config).toBeDefined();
      expect(engine.config.enableMacroSimulations).toBe(true);
      expect(engine.config.enableLiquidityRebalancing).toBe(true);
    });
  });

  describe('stress simulations', () => {
    it('should run a macro stress simulation', () => {
      const simulation = engine.runStressSimulation({
        scenarioName: 'Global Trade War Escalation',
        scenarioType: 'trade_war',
        shockMagnitude: 25,
        duration: 90,
        affectedRegions: ['US', 'CN', 'EU'],
        affectedSectors: ['Technology', 'Manufacturing'],
      });

      expect(simulation.id).toBeDefined();
      expect(simulation.scenarioName).toBe('Global Trade War Escalation');
      expect(simulation.scenarioType).toBe('trade_war');
      expect(simulation.capitalImpact).toBeGreaterThanOrEqual(0);
      expect(simulation.capitalImpact).toBeLessThanOrEqual(100);
      expect(simulation.contagionProbability).toBeGreaterThanOrEqual(0);
      expect(simulation.contagionProbability).toBeLessThanOrEqual(1);
    });

    it('should run all scenario types', () => {
      const types = ['currency_crisis', 'trade_war', 'liquidity_shock', 'systemic_default', 'geopolitical'] as const;

      for (const scenarioType of types) {
        const sim = engine.runStressSimulation({
          scenarioName: `Test ${scenarioType}`,
          scenarioType,
          shockMagnitude: 20,
        });
        expect(sim.scenarioType).toBe(scenarioType);
        expect(sim.recoveryTimeEstimate).toBeGreaterThan(0);
      }
    });
  });

  describe('liquidity rebalancing', () => {
    it('should propose liquidity rebalancing', () => {
      const proposal = engine.proposeRebalancing({
        targetNodeId: 'node_001',
        currentLiquidity: 100_000_000,
        targetLiquidity: 150_000_000,
        urgency: 'medium',
        rationale: 'Anticipated demand increase',
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.targetNodeId).toBe('node_001');
      expect(proposal.status).toBe('proposed');
    });
  });

  describe('contagion modeling', () => {
    it('should model risk contagion', () => {
      const model = engine.modelContagion({
        sourceNode: 'institutional_hk_001',
        initialExposure: 50_000_000,
      });

      expect(model.id).toBeDefined();
      expect(model.sourceNode).toBe('institutional_hk_001');
      expect(model.systemicRiskScore).toBeGreaterThanOrEqual(0);
      expect(model.systemicRiskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('mitigation actions', () => {
    it('should propose mitigation action', () => {
      const action = engine.proposeMitigation({
        triggerCondition: 'systemic_risk_above_threshold',
        mitigationType: 'liquidity_injection',
        targetMetric: 'system_liquidity_ratio',
        currentValue: 0.4,
        targetValue: 0.6,
        priority: 'high',
      });

      expect(action.id).toBeDefined();
      expect(action.status).toBe('proposed');
    });
  });

  describe('treasury adjustments', () => {
    it('should propose treasury adjustment', () => {
      const adjustment = engine.proposeTreasuryAdjustment({
        adjustmentType: 'reserve_increase',
        amount: 100_000_000,
        rationale: 'Increase buffer for anticipated volatility',
        targetReserveId: 'reserve_001',
      });

      expect(adjustment.id).toBeDefined();
      expect(adjustment.adjustmentType).toBe('reserve_increase');
      expect(adjustment.amount).toBe(100_000_000);
      expect(adjustment.status).toBe('proposed');
    });
  });
});

// ============================================================================
// Monetary Coordination Layer Tests
// ============================================================================

describe('MonetaryCoordinationLayer', () => {
  let layer: ReturnType<typeof createMonetaryCoordinationLayer>;

  beforeEach(() => {
    layer = createMonetaryCoordinationLayer();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(layer.config).toBeDefined();
      expect(layer.config.enableProtocolTokenEconomy).toBe(true);
      expect(layer.config.enableSovereignDigitalAssets).toBe(true);
    });
  });

  describe('monetary layers', () => {
    it('should create a monetary layer', () => {
      const monetaryLayer = layer.createMonetaryLayer({
        name: 'Protocol Token Layer',
        layerType: 'protocol_token',
        totalSupply: 1_000_000_000,
        circulatingSupply: 500_000_000,
        inflationTarget: 0.02,
        stabilityMechanism: 'algorithmic',
      });

      expect(monetaryLayer.id).toBeDefined();
      expect(monetaryLayer.name).toBe('Protocol Token Layer');
      expect(monetaryLayer.layerType).toBe('protocol_token');
      expect(monetaryLayer.totalSupply).toBe(1_000_000_000);
    });

    it('should list monetary layers with filters', () => {
      layer.createMonetaryLayer({ name: 'L1', layerType: 'protocol_token', totalSupply: 1e9, circulatingSupply: 5e8, inflationTarget: 0.02 });
      layer.createMonetaryLayer({ name: 'L2', layerType: 'sovereign_digital', totalSupply: 1e10, circulatingSupply: 8e9, inflationTarget: 0.01 });

      const all = layer.listMonetaryLayers({});
      expect(all).toHaveLength(2);

      const protocolLayers = layer.listMonetaryLayers({ layerType: 'protocol_token' });
      expect(protocolLayers).toHaveLength(1);
    });
  });

  describe('sovereign digital assets', () => {
    it('should create a sovereign digital asset', () => {
      const asset = layer.createSovereignAsset({
        name: 'Digital Singapore Dollar',
        symbol: 'DSGD',
        issuingAuthority: 'Monetary Authority of Singapore',
        jurisdiction: 'SG',
        totalSupply: 10_000_000_000,
        reserves: [
          { assetType: 'SGD', amount: 10_000_000_000, percentOfTotal: 100, custodian: 'MAS', verifiedAt: new Date() },
        ],
        peggingMechanism: 'fiat_peg',
        pegTarget: 'SGD',
        interoperableChains: ['ton', 'ethereum'],
      });

      expect(asset.id).toBeDefined();
      expect(asset.name).toBe('Digital Singapore Dollar');
      expect(asset.symbol).toBe('DSGD');
      expect(asset.issuingAuthority).toBe('Monetary Authority of Singapore');
      expect(asset.peggingMechanism).toBe('fiat_peg');
    });
  });

  describe('treasury reserves', () => {
    it('should create a treasury reserve with assets', () => {
      const reserve = layer.createTreasuryReserve({
        name: 'Protocol Stability Reserve',
        initialValue: 100_000_000,
        assets: [
          { assetType: 'stablecoin', chain: 'ton', value: 50_000_000, percentOfTotal: 50, yieldRate: 0.05 },
          { assetType: 'native_token', chain: 'ton', value: 50_000_000, percentOfTotal: 50, yieldRate: 0.08 },
        ],
        targetAllocation: [
          { category: 'stablecoin', targetPercent: 50, minPercent: 40, maxPercent: 60 },
          { category: 'native_token', targetPercent: 50, minPercent: 40, maxPercent: 60 },
        ],
      });

      expect(reserve.id).toBeDefined();
      expect(reserve.name).toBe('Protocol Stability Reserve');
    });
  });

  describe('cross-chain baskets', () => {
    it('should create a cross-chain asset basket', () => {
      const basket = layer.createCrossChainBasket({
        name: 'APAC Digital Asset Index',
        assets: [
          { assetId: 'TON', chain: 'ton', weight: 0.3, targetWeight: 0.3, value: 30_000_000 },
          { assetId: 'ETH', chain: 'ethereum', weight: 0.3, targetWeight: 0.3, value: 30_000_000 },
          { assetId: 'USDT', chain: 'ton', weight: 0.4, targetWeight: 0.4, value: 40_000_000 },
        ],
        rebalanceFrequency: 'weekly',
        managementFee: 0.5,
        primaryChain: 'ton',
      });

      expect(basket.id).toBeDefined();
      expect(basket.name).toBe('APAC Digital Asset Index');
      expect(basket.assets).toHaveLength(3);
      expect(basket.totalValue).toBe(100_000_000);
    });
  });

  describe('layer status', () => {
    it('should return layer status', () => {
      layer.createMonetaryLayer({ name: 'Test', layerType: 'protocol_token', totalSupply: 1e9, circulatingSupply: 5e8, inflationTarget: 0.02 });

      const status = layer.getLayerStatus();
      expect(status.activeMonetaryLayers).toBeGreaterThanOrEqual(1);
      expect(status.totalMonetarySupply).toBeGreaterThanOrEqual(0);
      expect(status.systemStabilityScore).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Economic Node Architecture Tests
// ============================================================================

describe('EconomicNodeArchitecture', () => {
  let architecture: ReturnType<typeof createEconomicNodeArchitecture>;

  beforeEach(() => {
    architecture = createEconomicNodeArchitecture();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(architecture.config).toBeDefined();
      expect(architecture.config.enableSovereignNodes).toBe(true);
      expect(architecture.config.enableInstitutionalNodes).toBe(true);
      expect(architecture.config.enableAITreasuryNodes).toBe(true);
    });
  });

  describe('sovereign node registration', () => {
    it('should register a sovereign node', () => {
      const node = architecture.registerSovereignNode({
        name: 'Federal Reserve Digital Infrastructure',
        nodeType: 'sovereign_node',
        jurisdiction: 'US',
        parentNetwork: 'AGFN',
        initialCapital: 100_000_000_000,
        sovereignType: 'central_bank',
        countryCode: 'US',
        regulatoryAuthority: 'Federal Reserve System',
        reserveHoldings: 50_000_000_000,
        monetaryPolicyRole: 'Primary monetary authority',
        crossBorderAgreements: ['FX_SWAP_LINE_ECB', 'FX_SWAP_LINE_BOJ'],
      });

      expect(node.id).toBeDefined();
      expect(node.name).toBe('Federal Reserve Digital Infrastructure');
      expect(node.nodeType).toBe('sovereign_node');
      expect(node.jurisdiction).toBe('US');
    });
  });

  describe('institutional node registration', () => {
    it('should register an institutional node', () => {
      const node = architecture.registerInstitutionalNode({
        name: 'APAC Infrastructure Fund',
        nodeType: 'institutional_capital_node',
        jurisdiction: 'SG',
        parentNetwork: 'AGFN',
        initialCapital: 5_000_000_000,
        institutionType: 'pension_fund',
        aum: 50_000_000_000,
        investmentMandate: 'Long-term infrastructure and digital assets',
        riskTolerance: 'moderate',
        redemptionTerms: '90-day notice',
      });

      expect(node.id).toBeDefined();
      expect(node.name).toBe('APAC Infrastructure Fund');
      expect(node.nodeType).toBe('institutional_capital_node');
    });
  });

  describe('trade finance node registration', () => {
    it('should register a trade finance node', () => {
      const node = architecture.registerTradeFinanceNode({
        name: 'Global Trade Finance Hub',
        nodeType: 'trade_finance_node',
        jurisdiction: 'HK',
        parentNetwork: 'AGFN',
        initialCapital: 1_000_000_000,
        tradeFinanceType: 'bank',
        supportedInstruments: ['letter_of_credit', 'bank_guarantee', 'trade_loan'],
        partnerBanks: ['HSBC', 'Standard Chartered'],
        annualVolume: 50_000_000_000,
      });

      expect(node.id).toBeDefined();
      expect(node.name).toBe('Global Trade Finance Hub');
      expect(node.nodeType).toBe('trade_finance_node');
    });
  });

  describe('commodity node registration', () => {
    it('should register a commodity-backed node', () => {
      const node = architecture.registerCommodityNode({
        name: 'Singapore Gold Vault',
        nodeType: 'commodity_backed_node',
        jurisdiction: 'SG',
        parentNetwork: 'AGFN',
        initialCapital: 500_000_000,
        commodityType: 'gold',
        storageLocation: 'Singapore Freeport',
        custodian: 'Brinks',
        verificationFrequency: 'weekly',
        deliveryCapable: true,
      });

      expect(node.id).toBeDefined();
      expect(node.name).toBe('Singapore Gold Vault');
      expect(node.nodeType).toBe('commodity_backed_node');
    });
  });

  describe('AI treasury node registration', () => {
    it('should register an AI treasury node', () => {
      const node = architecture.registerAITreasuryNode({
        name: 'Autonomous Treasury Alpha',
        nodeType: 'ai_treasury_node',
        jurisdiction: 'SG',
        parentNetwork: 'AGFN',
        initialCapital: 1_000_000_000,
        aiModel: 'claude-opus-4-5',
        autonomyLevel: 'semi_autonomous',
        governanceBounds: {
          maxSingleAllocation: 100_000_000,
          maxDailyVolume: 500_000_000,
          maxLeverage: 2.0,
        },
      });

      expect(node.id).toBeDefined();
      expect(node.name).toBe('Autonomous Treasury Alpha');
      expect(node.nodeType).toBe('ai_treasury_node');
    });
  });

  describe('node management', () => {
    it('should list nodes with filters', () => {
      architecture.registerSovereignNode({ name: 'Sov1', nodeType: 'sovereign_node', jurisdiction: 'US', parentNetwork: 'AGFN', initialCapital: 1e10, sovereignType: 'central_bank', countryCode: 'US', regulatoryAuthority: 'Fed', reserveHoldings: 5e9 });
      architecture.registerInstitutionalNode({ name: 'Inst1', nodeType: 'institutional_capital_node', jurisdiction: 'SG', parentNetwork: 'AGFN', initialCapital: 5e9, institutionType: 'hedge_fund', aum: 10e9 });

      const allNodes = architecture.listNodes({});
      expect(allNodes).toHaveLength(2);

      const sovereignNodes = architecture.listNodes({ nodeType: 'sovereign_node' });
      expect(sovereignNodes).toHaveLength(1);

      const sgNodes = architecture.listNodes({ jurisdiction: 'SG' });
      expect(sgNodes).toHaveLength(1);
    });
  });

  describe('node connections', () => {
    it('should connect nodes', () => {
      const node1 = architecture.registerSovereignNode({ name: 'Node1', nodeType: 'sovereign_node', jurisdiction: 'US', parentNetwork: 'AGFN', initialCapital: 1e10, sovereignType: 'central_bank', countryCode: 'US', regulatoryAuthority: 'Fed', reserveHoldings: 5e9 });
      const node2 = architecture.registerInstitutionalNode({ name: 'Node2', nodeType: 'institutional_capital_node', jurisdiction: 'SG', parentNetwork: 'AGFN', initialCapital: 5e9, institutionType: 'pension_fund', aum: 50e9 });

      const connection = architecture.connectNodes({
        sourceNodeId: node1.id,
        targetNodeId: node2.id,
        connectionType: 'capital_flow',
        bandwidth: 10_000_000_000,
      });

      expect(connection.targetNodeId).toBe(node2.id);
      expect(connection.connectionType).toBe('capital_flow');
      expect(connection.status).toBe('active');
    });
  });

  describe('layer status', () => {
    it('should return layer status', () => {
      architecture.registerSovereignNode({ name: 'Test', nodeType: 'sovereign_node', jurisdiction: 'US', parentNetwork: 'AGFN', initialCapital: 1e10, sovereignType: 'central_bank', countryCode: 'US', regulatoryAuthority: 'Fed', reserveHoldings: 5e9 });

      const status = architecture.getLayerStatus();
      expect(status.totalNodes).toBeGreaterThanOrEqual(1);
      expect(status.activeNodes).toBeGreaterThanOrEqual(0);
      expect(status.nodesByType).toBeDefined();
    });
  });
});

// ============================================================================
// Stability Dashboard Tests
// ============================================================================

describe('StabilityDashboardLayer', () => {
  let dashboard: ReturnType<typeof createStabilityDashboardLayer>;

  beforeEach(() => {
    dashboard = createStabilityDashboardLayer();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(dashboard.config).toBeDefined();
      expect(dashboard.config.refreshInterval).toBeGreaterThan(0);
      expect(dashboard.config.publicViewEnabled).toBe(true);
    });
  });

  describe('dashboard generation', () => {
    it('should generate a stability dashboard', () => {
      const result = dashboard.generateDashboard();

      expect(result.overallStabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.overallStabilityScore).toBeLessThanOrEqual(100);
      expect(result.stabilityLevel).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should get latest dashboard', () => {
      dashboard.generateDashboard();

      const latest = dashboard.getLatestDashboard();
      expect(latest).toBeDefined();
      expect(latest!.overallStabilityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('alerts', () => {
    it('should list alerts', () => {
      dashboard.generateDashboard();

      const allAlerts = dashboard.listAlerts({});
      expect(Array.isArray(allAlerts)).toBe(true);
    });
  });
});

// ============================================================================
// Unified GAEI Manager Tests
// ============================================================================

describe('GAEIManager', () => {
  let gaei: ReturnType<typeof createGAEIManager>;

  beforeEach(() => {
    gaei = createGAEIManager();
  });

  it('should initialize all 6 core infrastructure domains', () => {
    expect(gaei.capitalCoordination).toBeDefined();
    expect(gaei.realEconomyIntegration).toBeDefined();
    expect(gaei.aiOrchestration).toBeDefined();
    expect(gaei.monetaryCoordination).toBeDefined();
    expect(gaei.nodeArchitecture).toBeDefined();
    expect(gaei.stabilityDashboard).toBeDefined();
  });

  it('should return system status', () => {
    const status = gaei.getSystemStatus();

    expect(status.version).toBeDefined();
    expect(status.totalCapitalManaged).toBeGreaterThanOrEqual(0);
    expect(status.activeCapitalFlows).toBeGreaterThanOrEqual(0);
    expect(status.totalEconomicNodes).toBeGreaterThanOrEqual(0);
    expect(status.globalStabilityScore).toBeGreaterThanOrEqual(0);
    expect(status.generatedAt).toBeInstanceOf(Date);
  });

  it('should accept custom configuration', () => {
    const customGaei = createGAEIManager({
      capitalCoordination: { enableMacroModeling: false },
      realEconomyIntegration: { enableCommodityBacking: false },
    });

    expect(customGaei.capitalCoordination.config.enableMacroModeling).toBe(false);
    expect(customGaei.realEconomyIntegration.config.enableCommodityBacking).toBe(false);
  });

  it('should forward events from capital coordination', () => {
    const events: string[] = [];
    gaei.onEvent(e => events.push(e.type));

    gaei.capitalCoordination.initiateCapitalFlow({
      sourceNodeId: 'n1', destinationNodeId: 'n2', flowType: 'macro_allocation',
      amount: 1e6, currency: 'USD', sourceJurisdiction: 'US', destinationJurisdiction: 'SG',
      allocationPurpose: 'Test',
    });

    expect(events).toContain('capital_flow_initiated');
  });

  it('should demonstrate full economic coordination flow (demo)', () => {
    // Step 1: Register economic nodes
    const sovereignNode = gaei.nodeArchitecture.registerSovereignNode({
      name: 'Central Bank Digital Hub',
      nodeType: 'sovereign_node',
      jurisdiction: 'SG',
      parentNetwork: 'AGFN',
      initialCapital: 50_000_000_000,
      sovereignType: 'central_bank',
      countryCode: 'SG',
      regulatoryAuthority: 'MAS',
      reserveHoldings: 30_000_000_000,
      monetaryPolicyRole: 'Monetary authority',
    });

    const institutionalNode = gaei.nodeArchitecture.registerInstitutionalNode({
      name: 'APAC Infrastructure Fund',
      nodeType: 'institutional_capital_node',
      jurisdiction: 'SG',
      parentNetwork: 'AGFN',
      initialCapital: 5_000_000_000,
      institutionType: 'pension_fund',
      aum: 50_000_000_000,
      investmentMandate: 'Long-term infrastructure and digital assets',
      riskTolerance: 'moderate',
      redemptionTerms: '90-day notice',
    });

    // Step 2: Connect nodes
    gaei.nodeArchitecture.connectNodes({
      sourceNodeId: sovereignNode.id,
      targetNodeId: institutionalNode.id,
      connectionType: 'capital_flow',
      bandwidth: 10_000_000_000,
    });

    // Step 3: Create infrastructure financing
    const infraProject = gaei.realEconomyIntegration.createInfrastructureFinancing({
      projectName: 'ASEAN Digital Payment Rail',
      projectType: 'digital',
      totalInvestment: 200_000_000,
      jurisdiction: 'SG',
      expectedReturn: 7.5,
      projectDurationYears: 7,
      riskRating: 'AA',
      tokenize: true,
      chain: 'ton',
    });

    // Step 4: Allocate capital to infrastructure
    const flow = gaei.capitalCoordination.initiateCapitalFlow({
      sourceNodeId: institutionalNode.id,
      destinationNodeId: infraProject.id,
      flowType: 'infrastructure_investment',
      amount: 50_000_000,
      currency: 'USD',
      sourceJurisdiction: 'SG',
      destinationJurisdiction: 'SG',
      allocationPurpose: 'Phase 1 infrastructure financing',
    });

    // Step 5: Run stress test
    const stressTest = gaei.aiOrchestration.runStressSimulation({
      scenarioName: 'Regional Liquidity Stress',
      scenarioType: 'currency_crisis',
      shockMagnitude: 15,
    });

    // Step 6: Generate stability dashboard
    const dashboard = gaei.stabilityDashboard.generateDashboard();

    // Step 7: Get system status
    const status = gaei.getSystemStatus();

    // Assertions
    expect(sovereignNode.id).toBeDefined();
    expect(institutionalNode.id).toBeDefined();
    expect(infraProject.id).toBeDefined();
    expect(flow.amount).toBe(50_000_000);
    expect(stressTest.simulatedAt).toBeInstanceOf(Date);
    expect(dashboard.overallStabilityScore).toBeGreaterThanOrEqual(0);
    expect(status.totalEconomicNodes).toBeGreaterThanOrEqual(2);
  });

  it('should demonstrate sovereign digital asset coordination (demo)', () => {
    // Create sovereign digital asset
    const digitalSGD = gaei.monetaryCoordination.createSovereignAsset({
      name: 'Digital Singapore Dollar',
      symbol: 'DSGD',
      issuingAuthority: 'Monetary Authority of Singapore',
      jurisdiction: 'SG',
      totalSupply: 10_000_000_000,
      reserves: [
        { assetType: 'SGD', amount: 10_000_000_000, percentOfTotal: 100, custodian: 'MAS', verifiedAt: new Date() },
      ],
      peggingMechanism: 'fiat_peg',
      pegTarget: 'SGD',
      interoperableChains: ['ton', 'ethereum'],
    });

    // Create cross-chain basket
    const basket = gaei.monetaryCoordination.createCrossChainBasket({
      name: 'APAC CBDC Index',
      assets: [
        { assetId: 'DSGD', chain: 'ton', weight: 0.4, targetWeight: 0.4, value: 40_000_000 },
        { assetId: 'DJPY', chain: 'ton', weight: 0.3, targetWeight: 0.3, value: 30_000_000 },
        { assetId: 'DKRW', chain: 'ethereum', weight: 0.3, targetWeight: 0.3, value: 30_000_000 },
      ],
      rebalanceFrequency: 'weekly',
      managementFee: 0.25,
      primaryChain: 'ton',
    });

    expect(digitalSGD.peggingMechanism).toBe('fiat_peg');
    expect(basket.totalValue).toBe(100_000_000);
    expect(basket.assets).toHaveLength(3);
  });

  it('should demonstrate real economy integration flow (demo)', () => {
    // Create tokenized infrastructure
    const infrastructure = gaei.realEconomyIntegration.createInfrastructureFinancing({
      projectName: 'Trans-Pacific Digital Corridor',
      projectType: 'digital',
      totalInvestment: 500_000_000,
      jurisdiction: 'SG',
      expectedReturn: 8.5,
      projectDurationYears: 10,
      riskRating: 'A',
      tokenize: true,
      chain: 'ton',
    });

    // Create trade finance instrument
    const tradeFinance = gaei.realEconomyIntegration.createTradeFinanceInstrument({
      instrumentType: 'letter_of_credit',
      principalAmount: 10_000_000,
      currency: 'USD',
      issuer: 'Bank of America',
      beneficiary: 'Samsung Electronics',
      sourceJurisdiction: 'US',
      destinationJurisdiction: 'KR',
      maturityDate: new Date('2026-12-31'),
      interestRate: 4.5,
      tokenize: true,
      chain: 'ton',
    });

    // Create commodity-backed asset
    const commodity = gaei.realEconomyIntegration.createCommodityAsset({
      commodityType: 'gold',
      commodityName: 'LBMA Gold Bar',
      underlyingQuantity: 1000,
      unit: 'oz',
      spotPrice: 2000,
      storageLocation: 'Singapore Freeport',
      custodian: 'Brinks',
      tokenize: true,
      chain: 'ton',
      deliverySupported: true,
    });

    expect(infrastructure.id).toBeDefined();
    expect(tradeFinance.id).toBeDefined();
    expect(commodity.id).toBeDefined();
  });
});
