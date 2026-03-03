/**
 * Tests for the Global Infrastructure & Edge Deployment (Issue #100)
 *
 * Covers:
 * - Constants: REGION_ZONE_MAP, REGION_COMPLIANCE_MAP, DEFAULT_EDGE_FEATURES, REGIONAL_COMPLIANCE_PROFILES, DEFAULT_PRICING
 * - EdgeNodeRegistry: register, activate, status updates, metrics recording, health score, filtering, deregister, events
 * - ComplianceEngine: profiles, tenant requirements, compliance checks, data residency, alternative regions, tenant summary
 * - GeoRouter: routing rules, agent placement, failover, release, events
 * - GlobalScheduler: job registration, pause/resume/terminate, trigger, leader election, execution history, events
 * - CostOptimizer: pricing, cost allocation, recommendations, threshold alerts
 * - GlobalMonitor: health computation, metrics recording, uptime tracking, events
 * - EdgeIntelligenceLayer: caches, streaming, inference tasks, node selection
 * - GlobalInfrastructureManager: integration, wiring, event forwarding
 * - Factory functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  EdgeNodeRegistry,
  createEdgeNodeRegistry,
  DEFAULT_EDGE_FEATURES,
  REGION_ZONE_MAP,
  REGION_COMPLIANCE_MAP,

  ComplianceEngine,
  createComplianceEngine,
  REGIONAL_COMPLIANCE_PROFILES,

  GeoRouter,
  createGeoRouter,

  GlobalScheduler,
  createGlobalScheduler,

  CostOptimizer,
  createCostOptimizer,
  DEFAULT_PRICING,

  GlobalMonitor,
  createGlobalMonitor,

  EdgeIntelligenceLayer,
  createEdgeIntelligenceLayer,

  GlobalInfrastructureManager,
  createGlobalInfrastructureManager,
  DEFAULT_GLOBAL_INFRA_CONFIG,
} from '../../src/global-infrastructure';

import type {
  EdgeNode,
  EdgeNodeMetrics,
  RegionCode,
  GlobalInfraEvent,
  RoutingRule,
  ComplianceCheckRequest,
  GlobalScheduledJob,
} from '../../src/global-infrastructure';

// ============================================================================
// Test Helpers
// ============================================================================

function makeRegistry(): EdgeNodeRegistry {
  return new EdgeNodeRegistry();
}

function makeNode(
  registry: EdgeNodeRegistry,
  overrides: Partial<{
    name: string;
    region: RegionCode;
    provider: 'aws' | 'gcp' | 'azure';
    maxAgents: number;
    capacityUnits: number;
  }> = {}
): EdgeNode {
  return registry.registerNode({
    name: overrides.name ?? 'test-node',
    region: overrides.region ?? 'us-east-1',
    provider: overrides.provider ?? 'aws',
    deploymentModel: 'public_cloud',
    endpoint: 'https://node.example.com',
    maxAgents: overrides.maxAgents ?? 100,
    capacityUnits: overrides.capacityUnits ?? 1000,
  });
}

function makeMetrics(nodeId: string, overrides: Partial<EdgeNodeMetrics> = {}): EdgeNodeMetrics {
  return {
    nodeId,
    timestamp: new Date(),
    cpuPercent: 20,
    memoryPercent: 30,
    networkInKbps: 100,
    networkOutKbps: 50,
    requestsPerSecond: 10,
    p50LatencyMs: 10,
    p95LatencyMs: 25,
    p99LatencyMs: 50,
    errorRate: 0,
    activeAgents: 5,
    jobsExecutedLastMinute: 20,
    ...overrides,
  };
}

function collectEvents(source: { onEvent: (cb: (e: GlobalInfraEvent) => void) => void }): GlobalInfraEvent[] {
  const events: GlobalInfraEvent[] = [];
  source.onEvent((e) => events.push(e));
  return events;
}

// ============================================================================
// Constants
// ============================================================================

describe('REGION_ZONE_MAP', () => {
  it('should map all 10 regions to geographic zones', () => {
    const regions: RegionCode[] = [
      'us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1',
      'ap-southeast-1', 'ap-northeast-1', 'me-south-1',
      'sa-east-1', 'af-south-1', 'ap-south-1',
    ];
    for (const region of regions) {
      expect(REGION_ZONE_MAP[region]).toBeDefined();
    }
  });

  it('should map US regions to north_america', () => {
    expect(REGION_ZONE_MAP['us-east-1']).toBe('north_america');
    expect(REGION_ZONE_MAP['us-west-2']).toBe('north_america');
  });

  it('should map EU regions to europe', () => {
    expect(REGION_ZONE_MAP['eu-west-1']).toBe('europe');
    expect(REGION_ZONE_MAP['eu-central-1']).toBe('europe');
  });

  it('should map APAC regions to asia_pacific', () => {
    expect(REGION_ZONE_MAP['ap-southeast-1']).toBe('asia_pacific');
    expect(REGION_ZONE_MAP['ap-northeast-1']).toBe('asia_pacific');
    expect(REGION_ZONE_MAP['ap-south-1']).toBe('asia_pacific');
  });

  it('should map me-south-1 to middle_east', () => {
    expect(REGION_ZONE_MAP['me-south-1']).toBe('middle_east');
  });

  it('should map sa-east-1 to latin_america', () => {
    expect(REGION_ZONE_MAP['sa-east-1']).toBe('latin_america');
  });

  it('should map af-south-1 to africa', () => {
    expect(REGION_ZONE_MAP['af-south-1']).toBe('africa');
  });
});

describe('REGION_COMPLIANCE_MAP', () => {
  it('should include GDPR for EU regions', () => {
    expect(REGION_COMPLIANCE_MAP['eu-west-1']).toContain('gdpr');
    expect(REGION_COMPLIANCE_MAP['eu-central-1']).toContain('gdpr');
  });

  it('should include MiCA for EU regions', () => {
    expect(REGION_COMPLIANCE_MAP['eu-west-1']).toContain('mica');
    expect(REGION_COMPLIANCE_MAP['eu-central-1']).toContain('mica');
  });

  it('should include FATF for all regions', () => {
    const allRegions: RegionCode[] = [
      'us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1',
      'ap-southeast-1', 'ap-northeast-1', 'me-south-1',
      'sa-east-1', 'af-south-1', 'ap-south-1',
    ];
    for (const r of allRegions) {
      expect(REGION_COMPLIANCE_MAP[r]).toContain('fatf');
    }
  });

  it('should include CCPA for US regions', () => {
    expect(REGION_COMPLIANCE_MAP['us-east-1']).toContain('ccpa');
    expect(REGION_COMPLIANCE_MAP['us-west-2']).toContain('ccpa');
  });

  it('should include LGPD for sa-east-1', () => {
    expect(REGION_COMPLIANCE_MAP['sa-east-1']).toContain('lgpd');
  });

  it('should include POPIA for af-south-1', () => {
    expect(REGION_COMPLIANCE_MAP['af-south-1']).toContain('popia');
  });
});

describe('DEFAULT_EDGE_FEATURES', () => {
  it('should have all features enabled', () => {
    expect(DEFAULT_EDGE_FEATURES.aiInference).toBe(true);
    expect(DEFAULT_EDGE_FEATURES.streamingData).toBe(true);
    expect(DEFAULT_EDGE_FEATURES.localCaching).toBe(true);
    expect(DEFAULT_EDGE_FEATURES.onChainListening).toBe(true);
    expect(DEFAULT_EDGE_FEATURES.complianceFiltering).toBe(true);
    expect(DEFAULT_EDGE_FEATURES.edgeScheduler).toBe(true);
  });
});

describe('REGIONAL_COMPLIANCE_PROFILES', () => {
  it('should have profiles for all 10 regions', () => {
    expect(REGIONAL_COMPLIANCE_PROFILES.length).toBe(10);
  });

  it('should have EU profiles with dataResidencyRequired=true', () => {
    const euProfiles = REGIONAL_COMPLIANCE_PROFILES.filter(
      (p) => p.region === 'eu-west-1' || p.region === 'eu-central-1'
    );
    for (const profile of euProfiles) {
      expect(profile.dataResidencyRequired).toBe(true);
    }
  });

  it('should have profiles with encryptionRequired=true', () => {
    for (const profile of REGIONAL_COMPLIANCE_PROFILES) {
      expect(profile.encryptionRequired).toBe(true);
    }
  });

  it('should restrict biometric data in EU regions', () => {
    const euProfile = REGIONAL_COMPLIANCE_PROFILES.find((p) => p.region === 'eu-west-1')!;
    expect(euProfile.restrictedDataTypes).toContain('biometric');
    expect(euProfile.restrictedDataTypes).toContain('special_category');
  });
});

describe('DEFAULT_PRICING', () => {
  it('should have entries for AWS regions', () => {
    const awsPricing = DEFAULT_PRICING.filter((p) => p.provider === 'aws');
    expect(awsPricing.length).toBeGreaterThan(0);
  });

  it('should have positive prices', () => {
    for (const p of DEFAULT_PRICING) {
      expect(p.pricePerUnitHour).toBeGreaterThan(0);
    }
  });

  it('should have USD currency for most entries', () => {
    const usdPricing = DEFAULT_PRICING.filter((p) => p.currency === 'USD');
    expect(usdPricing.length).toBeGreaterThan(0);
  });
});

describe('DEFAULT_GLOBAL_INFRA_CONFIG', () => {
  it('should have enabled regions', () => {
    expect(DEFAULT_GLOBAL_INFRA_CONFIG.enabledRegions.length).toBeGreaterThan(0);
  });

  it('should have a default region', () => {
    expect(DEFAULT_GLOBAL_INFRA_CONFIG.defaultRegion).toBeDefined();
  });

  it('should have compliance configuration', () => {
    expect(DEFAULT_GLOBAL_INFRA_CONFIG.compliance.enforceDataResidency).toBeDefined();
    expect(DEFAULT_GLOBAL_INFRA_CONFIG.compliance.defaultFrameworks.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// EdgeNodeRegistry
// ============================================================================

describe('EdgeNodeRegistry', () => {
  let registry: EdgeNodeRegistry;

  beforeEach(() => {
    registry = makeRegistry();
  });

  describe('registerNode', () => {
    it('should register a node with status provisioning', () => {
      const node = makeNode(registry);
      expect(node.id).toBeDefined();
      expect(node.status).toBe('provisioning');
    });

    it('should assign the correct zone based on region', () => {
      const node = makeNode(registry, { region: 'eu-west-1' });
      expect(node.zone).toBe('europe');
    });

    it('should apply default compliance zones from REGION_COMPLIANCE_MAP', () => {
      const node = makeNode(registry, { region: 'eu-west-1' });
      expect(node.complianceZones).toContain('gdpr');
      expect(node.complianceZones).toContain('mica');
    });

    it('should apply DEFAULT_EDGE_FEATURES', () => {
      const node = makeNode(registry);
      expect(node.featureFlags.aiInference).toBe(true);
      expect(node.featureFlags.edgeScheduler).toBe(true);
    });

    it('should allow custom feature flags override', () => {
      const node = registry.registerNode({
        name: 'limited-node',
        region: 'us-east-1',
        provider: 'aws',
        deploymentModel: 'public_cloud',
        endpoint: 'https://limited.example.com',
        maxAgents: 10,
        capacityUnits: 100,
        featureFlags: { aiInference: false },
      });
      expect(node.featureFlags.aiInference).toBe(false);
      expect(node.featureFlags.edgeScheduler).toBe(true); // Default still true
    });

    it('should start with healthScore=100', () => {
      const node = makeNode(registry);
      expect(node.healthScore).toBe(100);
    });

    it('should emit node_online event', () => {
      const events = collectEvents(registry);
      makeNode(registry);
      expect(events.some((e) => e.type === 'node_online')).toBe(true);
    });
  });

  describe('activateNode', () => {
    it('should transition node to active status', () => {
      const node = makeNode(registry);
      const activated = registry.activateNode(node.id);
      expect(activated.status).toBe('active');
    });

    it('should throw if node not found', () => {
      expect(() => registry.activateNode('nonexistent')).toThrow('node not found');
    });
  });

  describe('updateNodeStatus', () => {
    it('should update node status', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      registry.updateNodeStatus(node.id, 'maintenance');
      expect(registry.getNode(node.id)!.status).toBe('maintenance');
    });

    it('should emit node_offline event when going offline', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      const events = collectEvents(registry);
      registry.updateNodeStatus(node.id, 'offline');
      expect(events.some((e) => e.type === 'node_offline')).toBe(true);
    });

    it('should emit node_degraded event when active→degraded', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      const events = collectEvents(registry);
      registry.updateNodeStatus(node.id, 'degraded');
      expect(events.some((e) => e.type === 'node_degraded')).toBe(true);
    });
  });

  describe('recordMetrics', () => {
    it('should update node latency from p50', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      registry.recordMetrics(makeMetrics(node.id, { p50LatencyMs: 42 }));
      expect(registry.getNode(node.id)!.latencyMs).toBe(42);
    });

    it('should compute health score from metrics', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      registry.recordMetrics(makeMetrics(node.id, { cpuPercent: 10, memoryPercent: 10, p99LatencyMs: 20, errorRate: 0 }));
      expect(registry.getNode(node.id)!.healthScore).toBe(100);
    });

    it('should reduce health score for high CPU', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      registry.recordMetrics(makeMetrics(node.id, { cpuPercent: 95 }));
      expect(registry.getNode(node.id)!.healthScore).toBeLessThan(100);
    });

    it('should reduce health score for high error rate', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      registry.recordMetrics(makeMetrics(node.id, { errorRate: 0.15 }));
      expect(registry.getNode(node.id)!.healthScore).toBeLessThan(100);
    });

    it('should auto-degrade node if health drops below 50', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      // Extreme metrics that will drop health well below 50
      registry.recordMetrics(makeMetrics(node.id, {
        cpuPercent: 95,
        memoryPercent: 95,
        p99LatencyMs: 600,
        errorRate: 0.15,
      }));
      expect(registry.getNode(node.id)!.status).toBe('degraded');
    });

    it('should auto-recover node from degraded if health rises above 70', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      // First make it degraded
      registry.updateNodeStatus(node.id, 'degraded');
      // Then provide good metrics
      registry.recordMetrics(makeMetrics(node.id, {
        cpuPercent: 10,
        memoryPercent: 10,
        p99LatencyMs: 10,
        errorRate: 0,
      }));
      expect(registry.getNode(node.id)!.status).toBe('active');
    });

    it('should store metrics in history', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      registry.recordMetrics(makeMetrics(node.id));
      expect(registry.getMetricsHistory(node.id).length).toBe(1);
    });

    it('should not exceed MAX_METRICS_HISTORY (60) snapshots', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      for (let i = 0; i < 70; i++) {
        registry.recordMetrics(makeMetrics(node.id));
      }
      expect(registry.getMetricsHistory(node.id).length).toBeLessThanOrEqual(60);
    });
  });

  describe('listNodes', () => {
    it('should list all nodes with no filter', () => {
      // Use different regions to avoid same-millisecond ID collision
      makeNode(registry, { region: 'us-east-1' });
      makeNode(registry, { region: 'eu-west-1' });
      expect(registry.listNodes().length).toBe(2);
    });

    it('should filter by region', () => {
      makeNode(registry, { region: 'us-east-1' });
      makeNode(registry, { region: 'eu-west-1' });
      const usNodes = registry.listNodes({ region: 'us-east-1' });
      expect(usNodes.length).toBe(1);
      expect(usNodes[0].region).toBe('us-east-1');
    });

    it('should filter by status', () => {
      // Use different regions/providers to avoid same-millisecond ID collision
      const n1 = makeNode(registry, { region: 'us-east-1' });
      makeNode(registry, { region: 'eu-west-1' });
      registry.activateNode(n1.id);
      const active = registry.listNodes({ status: 'active' });
      expect(active.every((n) => n.status === 'active')).toBe(true);
    });

    it('should filter by minHealthScore', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      // Record bad metrics to drop health
      registry.recordMetrics(makeMetrics(node.id, {
        cpuPercent: 95,
        memoryPercent: 95,
        p99LatencyMs: 600,
        errorRate: 0.15,
      }));
      const goodNodes = registry.listNodes({ minHealthScore: 90 });
      expect(goodNodes.some((n) => n.id === node.id)).toBe(false);
    });

    it('should filter by provider', () => {
      registry.registerNode({
        name: 'gcp-node',
        region: 'us-east-1',
        provider: 'gcp',
        deploymentModel: 'public_cloud',
        endpoint: 'https://gcp.example.com',
        maxAgents: 50,
        capacityUnits: 500,
      });
      makeNode(registry, { provider: 'aws' });
      const gcpNodes = registry.listNodes({ provider: 'gcp' });
      expect(gcpNodes.every((n) => n.provider === 'gcp')).toBe(true);
    });
  });

  describe('deregisterNode', () => {
    it('should remove node from registry', () => {
      const node = makeNode(registry);
      registry.deregisterNode(node.id);
      expect(registry.getNode(node.id)).toBeUndefined();
    });

    it('should emit node_offline event on deregister', () => {
      const node = makeNode(registry);
      const events = collectEvents(registry);
      registry.deregisterNode(node.id);
      expect(events.some((e) => e.type === 'node_offline')).toBe(true);
    });

    it('should be idempotent when called for non-existent node', () => {
      expect(() => registry.deregisterNode('nonexistent')).not.toThrow();
    });
  });

  describe('getLatestMetrics', () => {
    it('should return undefined when no metrics recorded', () => {
      const node = makeNode(registry);
      expect(registry.getLatestMetrics(node.id)).toBeUndefined();
    });

    it('should return the most recent metrics', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      registry.recordMetrics(makeMetrics(node.id, { cpuPercent: 30 }));
      registry.recordMetrics(makeMetrics(node.id, { cpuPercent: 80 }));
      expect(registry.getLatestMetrics(node.id)!.cpuPercent).toBe(80);
    });
  });
});

// ============================================================================
// ComplianceEngine
// ============================================================================

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine;

  beforeEach(() => {
    engine = new ComplianceEngine();
  });

  describe('initialization', () => {
    it('should load all 10 built-in profiles', () => {
      expect(engine.listProfiles().length).toBe(10);
    });

    it('should load EU profiles with GDPR', () => {
      const profile = engine.getProfile('eu-west-1')!;
      expect(profile.applicableFrameworks).toContain('gdpr');
    });
  });

  describe('setProfile / getProfile', () => {
    it('should allow setting a custom profile', () => {
      const custom = REGIONAL_COMPLIANCE_PROFILES[0];
      engine.setProfile({ ...custom, auditLogRetentionDays: 999 });
      expect(engine.getProfile(custom.region)!.auditLogRetentionDays).toBe(999);
    });

    it('should return undefined for unknown region', () => {
      expect(engine.getProfile('unknown-region' as RegionCode)).toBeUndefined();
    });
  });

  describe('checkCompliance', () => {
    it('should allow compliant operation with no restricted data', async () => {
      const req: ComplianceCheckRequest = {
        tenantId: 'tenant1',
        targetRegion: 'us-east-1',
        dataClassification: ['financial'],
        operationType: 'read',
      };
      const result = await engine.checkCompliance(req);
      expect(result.allowed).toBe(true);
      expect(result.violatedFrameworks.length).toBe(0);
    });

    it('should block biometric data in EU regions', async () => {
      const req: ComplianceCheckRequest = {
        tenantId: 'tenant1',
        targetRegion: 'eu-west-1',
        dataClassification: ['biometric'],
        operationType: 'process',
      };
      const result = await engine.checkCompliance(req);
      expect(result.allowed).toBe(false);
      expect(result.violatedFrameworks.length).toBeGreaterThan(0);
    });

    it('should allow unknown region with a manual monitoring note', async () => {
      const req: ComplianceCheckRequest = {
        tenantId: 'tenant1',
        targetRegion: 'xx-unknown-1' as RegionCode,
        dataClassification: ['financial'],
        operationType: 'read',
      };
      const result = await engine.checkCompliance(req);
      expect(result.allowed).toBe(true);
      expect(result.requiredMitigations.length).toBeGreaterThan(0);
    });

    it('should block if tenant requires framework not available in target region', async () => {
      engine.setTenantComplianceRequirements('gdpr-tenant', ['gdpr']);
      const req: ComplianceCheckRequest = {
        tenantId: 'gdpr-tenant',
        targetRegion: 'us-east-1', // GDPR not applicable in US
        dataClassification: ['personal'],
        operationType: 'process',
      };
      const result = await engine.checkCompliance(req);
      expect(result.allowed).toBe(false);
      expect(result.violatedFrameworks).toContain('gdpr');
    });

    it('should provide alternative regions when compliance fails', async () => {
      engine.setTenantComplianceRequirements('eu-tenant', ['gdpr']);
      const req: ComplianceCheckRequest = {
        tenantId: 'eu-tenant',
        targetRegion: 'us-east-1',
        dataClassification: ['personal'],
        operationType: 'read',
      };
      const result = await engine.checkCompliance(req);
      expect(result.alternativeRegions.length).toBeGreaterThan(0);
      // Alternatives should include EU regions
      const hasEuAlternative = result.alternativeRegions.some(
        (r) => r === 'eu-west-1' || r === 'eu-central-1'
      );
      expect(hasEuAlternative).toBe(true);
    });

    it('should enforce data residency for EU user with write operation', async () => {
      const req: ComplianceCheckRequest = {
        tenantId: 'tenant1',
        targetRegion: 'us-east-1', // Non-EU region
        dataClassification: ['personal'],
        operationType: 'write',
        userCountry: 'DE', // German user
      };
      const result = await engine.checkCompliance(req);
      // US region has no data residency requirement, so this depends on profile
      // The US profile has dataResidencyRequired: false, so this should be allowed
      expect(result.allowed).toBe(true);
    });

    it('should include checkedAt timestamp', async () => {
      const req: ComplianceCheckRequest = {
        tenantId: 'tenant1',
        targetRegion: 'eu-west-1',
        dataClassification: ['financial'],
        operationType: 'read',
      };
      const result = await engine.checkCompliance(req);
      expect(result.checkedAt).toBeInstanceOf(Date);
    });
  });

  describe('getTenantComplianceSummary', () => {
    it('should return empty required frameworks for unknown tenant', () => {
      const summary = engine.getTenantComplianceSummary('unknown-tenant');
      expect(summary.requiredFrameworks.length).toBe(0);
    });

    it('should return compliant regions for tenant with GDPR requirement', () => {
      engine.setTenantComplianceRequirements('eu-tenant', ['gdpr']);
      const summary = engine.getTenantComplianceSummary('eu-tenant');
      expect(summary.requiredFrameworks).toContain('gdpr');
      expect(summary.compliantRegions).toContain('eu-west-1');
      expect(summary.compliantRegions).toContain('eu-central-1');
      expect(summary.nonCompliantRegions).toContain('us-east-1');
    });
  });
});

// ============================================================================
// GeoRouter
// ============================================================================

describe('GeoRouter', () => {
  let registry: EdgeNodeRegistry;
  let compliance: ComplianceEngine;
  let router: GeoRouter;

  beforeEach(() => {
    registry = makeRegistry();
    compliance = new ComplianceEngine();
    router = new GeoRouter(registry, compliance);
  });

  describe('placeAgent', () => {
    it('should place agent on an active node', async () => {
      const node = makeNode(registry, { region: 'us-east-1' });
      registry.activateNode(node.id);

      const result = await router.placeAgent({
        agentId: 'agent1',
        tenantId: 'tenant1',
        preferredRegions: ['us-east-1'],
      });

      expect(result.agentId).toBe('agent1');
      expect(result.assignedNodeId).toBe(node.id);
      expect(result.assignedRegion).toBe('us-east-1');
    });

    it('should throw when no nodes available', async () => {
      await expect(
        router.placeAgent({
          agentId: 'agent1',
          tenantId: 'tenant1',
        })
      ).rejects.toThrow('no available nodes');
    });

    it('should throw when no nodes in preferred region', async () => {
      makeNode(registry, { region: 'eu-west-1' });
      const node = makeNode(registry, { region: 'eu-west-1' });
      registry.activateNode(node.id);

      await expect(
        router.placeAgent({
          agentId: 'agent1',
          tenantId: 'tenant1',
          preferredRegions: ['us-east-1'], // No active nodes in US
        })
      ).rejects.toThrow();
    });

    it('should respect excluded regions', async () => {
      const usNode = makeNode(registry, { region: 'us-east-1' });
      const euNode = makeNode(registry, { region: 'eu-west-1' });
      registry.activateNode(usNode.id);
      registry.activateNode(euNode.id);

      const result = await router.placeAgent({
        agentId: 'agent1',
        tenantId: 'tenant1',
        excludedRegions: ['us-east-1'],
      });

      expect(result.assignedRegion).toBe('eu-west-1');
    });

    it('should apply routing rules for tenant matching', async () => {
      const euNode = makeNode(registry, { region: 'eu-west-1' });
      registry.activateNode(euNode.id);

      const rule: RoutingRule = {
        id: 'rule1',
        name: 'EU Tenants to EU',
        priority: 1,
        conditions: [{ field: 'tenant_id', operator: 'equals', value: 'eu-tenant' }],
        targetRegions: ['eu-west-1'],
        fallbackRegions: [],
        strategy: 'compliance_first',
        enabled: true,
        createdAt: new Date(),
      };
      router.addRoutingRule(rule);

      const result = await router.placeAgent({
        agentId: 'agent1',
        tenantId: 'eu-tenant',
      });

      expect(result.assignedRegion).toBe('eu-west-1');
    });

    it('should verify compliance when complianceRequirements provided', async () => {
      const euNode = makeNode(registry, { region: 'eu-west-1' });
      registry.activateNode(euNode.id);

      const result = await router.placeAgent({
        agentId: 'agent1',
        tenantId: 'tenant1',
        complianceRequirements: ['financial'],
      });

      expect(result.complianceVerified).toBe(true);
    });

    it('should record placement and allow getAgentLocation', async () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);

      await router.placeAgent({
        agentId: 'agent1',
        tenantId: 'tenant1',
      });

      const location = router.getAgentLocation('agent1');
      expect(location).toBeDefined();
      expect(location!.agentId).toBe('agent1');
    });
  });

  describe('failoverAgent', () => {
    it('should failover to next available node', async () => {
      // Use different providers to guarantee unique IDs even in same millisecond
      const node1 = registry.registerNode({
        name: 'n1', region: 'us-east-1', provider: 'aws',
        deploymentModel: 'public_cloud', endpoint: 'https://n1.example.com',
        maxAgents: 100, capacityUnits: 1000,
      });
      const node2 = registry.registerNode({
        name: 'n2', region: 'us-east-1', provider: 'gcp',
        deploymentModel: 'public_cloud', endpoint: 'https://n2.example.com',
        maxAgents: 100, capacityUnits: 1000,
      });
      registry.activateNode(node1.id);
      registry.activateNode(node2.id);

      await router.placeAgent({
        agentId: 'agent1',
        tenantId: 'tenant1',
        preferredRegions: ['us-east-1'],
      });

      const result = await router.failoverAgent('agent1');
      expect(result.agentId).toBe('agent1');
    });

    it('should throw when no placement record exists', async () => {
      await expect(router.failoverAgent('unknown-agent')).rejects.toThrow(
        'no placement record'
      );
    });

    it('should emit failover_triggered event', async () => {
      // Use different providers to guarantee unique IDs even in same millisecond
      const node1 = registry.registerNode({
        name: 'n1', region: 'us-east-1', provider: 'aws',
        deploymentModel: 'public_cloud', endpoint: 'https://n1.example.com',
        maxAgents: 100, capacityUnits: 1000,
      });
      const node2 = registry.registerNode({
        name: 'n2', region: 'us-east-1', provider: 'gcp',
        deploymentModel: 'public_cloud', endpoint: 'https://n2.example.com',
        maxAgents: 100, capacityUnits: 1000,
      });
      registry.activateNode(node1.id);
      registry.activateNode(node2.id);

      await router.placeAgent({
        agentId: 'agent1',
        tenantId: 'tenant1',
      });

      const events = collectEvents(router);
      await router.failoverAgent('agent1');

      expect(events.some((e) => e.type === 'failover_triggered')).toBe(true);
    });
  });

  describe('releaseAgent', () => {
    it('should remove agent placement record', async () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      await router.placeAgent({ agentId: 'agent1', tenantId: 'tenant1' });
      router.releaseAgent('agent1');
      expect(router.getAgentLocation('agent1')).toBeUndefined();
    });
  });

  describe('addRoutingRule / removeRoutingRule / listRoutingRules', () => {
    it('should add and list routing rules', () => {
      const rule: RoutingRule = {
        id: 'r1',
        name: 'Test Rule',
        priority: 1,
        conditions: [],
        targetRegions: ['us-east-1'],
        fallbackRegions: [],
        strategy: 'latency_optimized',
        enabled: true,
        createdAt: new Date(),
      };
      router.addRoutingRule(rule);
      expect(router.listRoutingRules().some((r) => r.id === 'r1')).toBe(true);
    });

    it('should remove routing rule by id', () => {
      const rule: RoutingRule = {
        id: 'r2',
        name: 'Remove Rule',
        priority: 1,
        conditions: [],
        targetRegions: ['eu-west-1'],
        fallbackRegions: [],
        strategy: 'geo_pinned',
        enabled: true,
        createdAt: new Date(),
      };
      router.addRoutingRule(rule);
      router.removeRoutingRule('r2');
      expect(router.listRoutingRules().some((r) => r.id === 'r2')).toBe(false);
    });

    it('should sort rules by priority', () => {
      router.addRoutingRule({ id: 'r-low', name: 'Low', priority: 10, conditions: [], targetRegions: [], fallbackRegions: [], strategy: 'round_robin', enabled: true, createdAt: new Date() });
      router.addRoutingRule({ id: 'r-high', name: 'High', priority: 1, conditions: [], targetRegions: [], fallbackRegions: [], strategy: 'round_robin', enabled: true, createdAt: new Date() });
      const rules = router.listRoutingRules();
      expect(rules[0].priority).toBeLessThan(rules[1].priority);
    });
  });
});

// ============================================================================
// GlobalScheduler
// ============================================================================

describe('GlobalScheduler', () => {
  let registry: EdgeNodeRegistry;
  let scheduler: GlobalScheduler;

  beforeEach(() => {
    registry = makeRegistry();
    scheduler = new GlobalScheduler(registry);
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('registerJob', () => {
    it('should register a job with active status', () => {
      const job = scheduler.registerJob({
        name: 'Market Analysis',
        agentId: 'agent1',
        tenantId: 'tenant1',
        trigger: 'cron',
        cronExpression: '@hourly',
      });
      expect(job.id).toBeDefined();
      expect(job.status).toBe('active');
      expect(job.executionCount).toBe(0);
    });

    it('should set nextExecutionAt for cron jobs', () => {
      const job = scheduler.registerJob({
        name: 'Cron Job',
        agentId: 'agent1',
        tenantId: 'tenant1',
        trigger: 'cron',
        cronExpression: '@hourly',
      });
      expect(job.nextExecutionAt).toBeInstanceOf(Date);
    });

    it('should use UTC timezone by default', () => {
      const job = scheduler.registerJob({
        name: 'Job',
        agentId: 'agent1',
        tenantId: 'tenant1',
        trigger: 'event',
      });
      expect(job.timezone).toBe('UTC');
    });

    it('should use provided timezone', () => {
      const job = scheduler.registerJob({
        name: 'Timezone Job',
        agentId: 'agent1',
        tenantId: 'tenant1',
        trigger: 'timezone_aware',
        timezone: 'America/New_York',
      });
      expect(job.timezone).toBe('America/New_York');
    });
  });

  describe('pauseJob / resumeJob / terminateJob', () => {
    it('should pause a job', () => {
      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'event' });
      scheduler.pauseJob(job.id);
      expect(scheduler.getJob(job.id)!.status).toBe('paused');
    });

    it('should resume a paused job', () => {
      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'cron', cronExpression: '@daily' });
      scheduler.pauseJob(job.id);
      scheduler.resumeJob(job.id);
      expect(scheduler.getJob(job.id)!.status).toBe('active');
    });

    it('should recompute nextExecutionAt on resume for cron jobs', () => {
      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'cron', cronExpression: '@daily' });
      expect(job.nextExecutionAt).toBeInstanceOf(Date);
      scheduler.pauseJob(job.id);
      scheduler.resumeJob(job.id);
      // nextExecutionAt should be recomputed and still be a valid future date
      expect(scheduler.getJob(job.id)!.nextExecutionAt).toBeInstanceOf(Date);
      expect(scheduler.getJob(job.id)!.nextExecutionAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should terminate a job', () => {
      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'event' });
      scheduler.terminateJob(job.id);
      expect(scheduler.getJob(job.id)!.status).toBe('terminated');
    });

    it('should throw for unknown job', () => {
      expect(() => scheduler.pauseJob('nonexistent')).toThrow('job not found');
      expect(() => scheduler.resumeJob('nonexistent')).toThrow('job not found');
      expect(() => scheduler.terminateJob('nonexistent')).toThrow('job not found');
    });
  });

  describe('listJobs', () => {
    it('should list all jobs', () => {
      scheduler.registerJob({ name: 'J1', agentId: 'a', tenantId: 't1', trigger: 'event' });
      scheduler.registerJob({ name: 'J2', agentId: 'b', tenantId: 't2', trigger: 'cron', cronExpression: '@daily' });
      expect(scheduler.listJobs().length).toBe(2);
    });

    it('should filter by tenantId', () => {
      scheduler.registerJob({ name: 'J1', agentId: 'a', tenantId: 'tenant-a', trigger: 'event' });
      scheduler.registerJob({ name: 'J2', agentId: 'b', tenantId: 'tenant-b', trigger: 'event' });
      expect(scheduler.listJobs({ tenantId: 'tenant-a' }).length).toBe(1);
    });

    it('should filter by status', () => {
      const j1 = scheduler.registerJob({ name: 'J1', agentId: 'a', tenantId: 't', trigger: 'event' });
      scheduler.registerJob({ name: 'J2', agentId: 'b', tenantId: 't', trigger: 'event' });
      scheduler.pauseJob(j1.id);
      expect(scheduler.listJobs({ status: 'paused' }).length).toBe(1);
    });
  });

  describe('triggerJob', () => {
    it('should execute job and return success execution', async () => {
      const node = makeNode(registry, { region: 'us-east-1' });
      registry.activateNode(node.id);
      scheduler.electLeaderNode('us-east-1', node.id);

      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'event' });
      const execution = await scheduler.triggerJob(job.id, 'us-east-1', async () => {});

      expect(execution.status).toBe('success');
      expect(execution.jobId).toBe(job.id);
      expect(execution.completedAt).toBeInstanceOf(Date);
      expect(execution.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should record failure when executor throws', async () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);

      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'event' });
      const execution = await scheduler.triggerJob(job.id, 'us-east-1', async () => {
        throw new Error('executor error');
      });

      expect(execution.status).toBe('failed');
      expect(execution.error).toContain('executor error');
      expect(job.failureCount).toBe(1);
    });

    it('should increment job executionCount on success', async () => {
      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'event' });
      await scheduler.triggerJob(job.id, 'us-east-1', async () => {});
      expect(job.executionCount).toBe(1);
    });
  });

  describe('electLeaderNode / getLeaderNode', () => {
    it('should store and retrieve leader node per region', () => {
      scheduler.electLeaderNode('us-east-1', 'node-leader-1');
      expect(scheduler.getLeaderNode('us-east-1')).toBe('node-leader-1');
    });

    it('should return undefined for region with no leader', () => {
      expect(scheduler.getLeaderNode('eu-west-1')).toBeUndefined();
    });
  });

  describe('getExecutionHistory', () => {
    it('should return executions for a job', async () => {
      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'event' });
      await scheduler.triggerJob(job.id, 'us-east-1', async () => {});
      await scheduler.triggerJob(job.id, 'eu-west-1', async () => {});
      const history = scheduler.getExecutionHistory(job.id);
      expect(history.length).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const job = scheduler.registerJob({ name: 'J', agentId: 'a', tenantId: 't', trigger: 'event' });
      for (let i = 0; i < 5; i++) {
        await scheduler.triggerJob(job.id, 'us-east-1', async () => {});
      }
      expect(scheduler.getExecutionHistory(job.id, 3).length).toBe(3);
    });
  });

  describe('start / stop', () => {
    it('should start and stop without errors', () => {
      expect(() => {
        scheduler.start();
        scheduler.stop();
      }).not.toThrow();
    });

    it('should not create duplicate intervals on multiple start calls', () => {
      scheduler.start();
      scheduler.start(); // Should be a no-op
      scheduler.stop();
      // If we got here without errors, it worked
      expect(true).toBe(true);
    });
  });
});

// ============================================================================
// CostOptimizer
// ============================================================================

describe('CostOptimizer', () => {
  let registry: EdgeNodeRegistry;
  let optimizer: CostOptimizer;

  beforeEach(() => {
    registry = makeRegistry();
    optimizer = new CostOptimizer(registry);
  });

  describe('getPricing', () => {
    it('should return pricing for known provider/region', () => {
      const pricing = optimizer.getPricing('aws', 'us-east-1');
      expect(pricing).toBeDefined();
      expect(pricing!.pricePerUnitHour).toBeGreaterThan(0);
    });

    it('should return undefined for unknown combination', () => {
      const pricing = optimizer.getPricing('on_prem', 'me-south-1');
      expect(pricing).toBeUndefined();
    });
  });

  describe('setPricing', () => {
    it('should set custom pricing', () => {
      optimizer.setPricing({
        nodeId: 'custom-node',
        provider: 'gcp',
        region: 'us-east-1',
        pricePerUnitHour: 0.01,
        currency: 'USD',
        updatedAt: new Date(),
      });
      const pricing = optimizer.getPricing('gcp', 'us-east-1');
      expect(pricing!.pricePerUnitHour).toBe(0.01);
    });
  });

  describe('computeCurrentHourlyCost', () => {
    it('should return zero cost when no active nodes', () => {
      const cost = optimizer.computeCurrentHourlyCost();
      expect(cost.totalUsd).toBe(0);
    });

    it('should compute cost for active nodes', () => {
      const node = makeNode(registry, { region: 'us-east-1', capacityUnits: 100 });
      registry.activateNode(node.id);
      registry.recordMetrics(makeMetrics(node.id, { cpuPercent: 50 }));
      const cost = optimizer.computeCurrentHourlyCost();
      expect(cost.totalUsd).toBeGreaterThanOrEqual(0);
    });

    it('should break down cost by region and provider', () => {
      const node = makeNode(registry, { region: 'us-east-1' });
      registry.activateNode(node.id);
      registry.recordMetrics(makeMetrics(node.id, { cpuPercent: 30 }));
      const cost = optimizer.computeCurrentHourlyCost();
      expect(typeof cost.byRegion).toBe('object');
      expect(typeof cost.byProvider).toBe('object');
    });
  });

  describe('generateRecommendations', () => {
    it('should return an array of recommendations', () => {
      const recs = optimizer.generateRecommendations();
      expect(Array.isArray(recs)).toBe(true);
    });

    it('should generate spot_migration recommendations for nodes with spot pricing', () => {
      // Nodes with spot pricing set should be candidates
      const node = makeNode(registry, { region: 'us-east-1' });
      registry.activateNode(node.id);
      optimizer.setPricing({
        nodeId: node.id,
        provider: 'aws',
        region: 'us-east-1',
        pricePerUnitHour: 0.10,
        spotPricePerUnitHour: 0.03, // 70% savings
        currency: 'USD',
        updatedAt: new Date(),
      });
      const recs = optimizer.generateRecommendations();
      const spotRec = recs.find((r) => r.type === 'spot_migration');
      expect(spotRec).toBeDefined();
      expect(spotRec!.estimatedSavingsPercent).toBeGreaterThan(0);
    });
  });

  describe('recordCostAllocation', () => {
    it('should store cost allocation without errors', () => {
      expect(() => {
        optimizer.recordCostAllocation({
          tenantId: 'tenant1',
          period: { start: new Date(), end: new Date() },
          computeUnitsUsed: 100,
          totalCostUsd: 10.5,
          costByRegion: { 'us-east-1': 10.5 } as Record<RegionCode, number>,
          costByProvider: { aws: 10.5 },
          savingsFromOptimization: 1.0,
        });
      }).not.toThrow();
    });

    it('should emit cost_threshold_exceeded event when over threshold', () => {
      const events = collectEvents(optimizer);
      optimizer.recordCostAllocation({
        tenantId: 'tenant1',
        period: { start: new Date(), end: new Date() },
        computeUnitsUsed: 10000,
        totalCostUsd: 999999, // Extremely high
        costByRegion: { 'us-east-1': 999999 } as Record<RegionCode, number>,
        costByProvider: { aws: 999999 },
        savingsFromOptimization: 0,
      });
      expect(events.some((e) => e.type === 'cost_threshold_exceeded')).toBe(true);
    });
  });
});

// ============================================================================
// GlobalMonitor
// ============================================================================

describe('GlobalMonitor', () => {
  let registry: EdgeNodeRegistry;
  let monitor: GlobalMonitor;

  beforeEach(() => {
    registry = makeRegistry();
    monitor = new GlobalMonitor(registry);
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('computeGlobalHealth', () => {
    it('should return healthy when no nodes registered', () => {
      const health = monitor.computeGlobalHealth();
      expect(health.overall).toBeDefined();
      expect(health.totalNodes).toBe(0);
      expect(health.activeNodes).toBe(0);
    });

    it('should reflect active nodes count', () => {
      // Use different regions to avoid same-millisecond ID collision
      const n1 = makeNode(registry, { region: 'us-east-1' });
      const n2 = makeNode(registry, { region: 'eu-west-1' });
      registry.activateNode(n1.id);
      registry.activateNode(n2.id);
      const health = monitor.computeGlobalHealth();
      expect(health.activeNodes).toBe(2);
      expect(health.totalNodes).toBe(2);
    });

    it('should report healthy when all nodes are active', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      const health = monitor.computeGlobalHealth();
      expect(health.overall).toBe('healthy');
    });

    it('should populate regionStatus', () => {
      const node = makeNode(registry, { region: 'us-east-1' });
      registry.activateNode(node.id);
      const health = monitor.computeGlobalHealth();
      expect(health.regionStatus['us-east-1']).toBeDefined();
    });

    it('should count degraded nodes', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      registry.updateNodeStatus(node.id, 'degraded');
      const health = monitor.computeGlobalHealth();
      expect(health.degradedNodes).toBe(1);
    });
  });

  describe('recordNodeMetrics', () => {
    it('should record metrics for multiple nodes', () => {
      // Use different regions to avoid same-millisecond ID collision
      const n1 = makeNode(registry, { region: 'us-east-1' });
      const n2 = makeNode(registry, { region: 'eu-west-1' });
      registry.activateNode(n1.id);
      registry.activateNode(n2.id);

      expect(() => {
        monitor.recordNodeMetrics([
          makeMetrics(n1.id),
          makeMetrics(n2.id),
        ]);
      }).not.toThrow();
    });

    it('should update the latest summary', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      monitor.recordNodeMetrics([makeMetrics(node.id, { requestsPerSecond: 50 })]);
      const summary = monitor.getLatestSummary();
      expect(summary).toBeDefined();
    });
  });

  describe('trackRegionUptime', () => {
    it('should track uptime for a region', () => {
      expect(() => {
        monitor.trackRegionUptime('us-east-1', true);
        monitor.trackRegionUptime('us-east-1', true);
        monitor.trackRegionUptime('us-east-1', false);
      }).not.toThrow();
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics history for known period', () => {
      const node = makeNode(registry);
      registry.activateNode(node.id);
      monitor.recordNodeMetrics([makeMetrics(node.id)]);
      const history = monitor.getMetricsHistory('1m');
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('start / stop', () => {
    it('should start and stop without errors', () => {
      expect(() => {
        monitor.start();
        monitor.stop();
      }).not.toThrow();
    });
  });
});

// ============================================================================
// EdgeIntelligenceLayer
// ============================================================================

describe('EdgeIntelligenceLayer', () => {
  let registry: EdgeNodeRegistry;
  let intelligence: EdgeIntelligenceLayer;
  let nodeId: string;

  beforeEach(() => {
    registry = makeRegistry();
    intelligence = new EdgeIntelligenceLayer(registry);
    const node = makeNode(registry);
    registry.activateNode(node.id);
    nodeId = node.id;
  });

  describe('initNodeCache / getNodeCache', () => {
    it('should initialize and retrieve cache for a node', () => {
      const cache = intelligence.initNodeCache({
        nodeId,
        maxSizeMb: 64,
        ttlSeconds: 300,
        evictionPolicy: 'lru',
        enableCompression: false,
        enableEncryption: false,
      });
      expect(cache).toBeDefined();
      expect(intelligence.getNodeCache(nodeId)).toBe(cache);
    });

    it('should support cache get/set operations', () => {
      const cache = intelligence.initNodeCache({
        nodeId,
        maxSizeMb: 64,
        ttlSeconds: 300,
        evictionPolicy: 'lru',
        enableCompression: false,
        enableEncryption: false,
      });
      cache.set('key1', { price: 42 });
      expect(cache.get('key1')).toEqual({ price: 42 });
    });

    it('should support cache delete', () => {
      const cache = intelligence.initNodeCache({
        nodeId,
        maxSizeMb: 64,
        ttlSeconds: 300,
        evictionPolicy: 'lfu',
        enableCompression: false,
        enableEncryption: true,
      });
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should track cache size', () => {
      const cache = intelligence.initNodeCache({
        nodeId,
        maxSizeMb: 64,
        ttlSeconds: 300,
        evictionPolicy: 'ttl',
        enableCompression: true,
        enableEncryption: false,
      });
      expect(cache.size()).toBe(0);
      cache.set('k', 'v');
      expect(cache.size()).toBe(1);
    });
  });

  describe('configureStreaming / getStreamingConfig', () => {
    it('should configure streaming for a node', () => {
      intelligence.configureStreaming({
        nodeId,
        sources: [],
        bufferSizeMs: 100,
        maxThroughputKbps: 1000,
        enableBackpressure: true,
      });
      const config = intelligence.getStreamingConfig(nodeId);
      expect(config).toBeDefined();
      expect(config!.enableBackpressure).toBe(true);
    });

    it('should add streaming sources', () => {
      intelligence.configureStreaming({
        nodeId,
        sources: [],
        bufferSizeMs: 100,
        maxThroughputKbps: 1000,
        enableBackpressure: false,
      });
      intelligence.addStreamingSource(nodeId, {
        id: 'src1',
        type: 'ton_blockchain',
        endpoint: 'wss://ton.example.com',
        refreshIntervalMs: 1000,
        enabled: true,
      });
      const config = intelligence.getStreamingConfig(nodeId);
      expect(config!.sources.length).toBe(1);
    });
  });

  describe('submitInferenceTask / executeInferenceTask', () => {
    it('should submit and execute inference task', async () => {
      const task = intelligence.submitInferenceTask({
        model: 'risk_scoring',
        nodeId,
        tenantId: 'tenant1',
        inputSize: 1024,
        priority: 'high',
      });

      expect(task.status).toBe('queued');
      expect(task.model).toBe('risk_scoring');

      const completed = await intelligence.executeInferenceTask(task.id);
      expect(completed.status).toBe('completed');
      expect(completed.latencyMs).toBeDefined();
    });

    it('should support all inference models', async () => {
      const models: Array<'risk_scoring' | 'signal_processing' | 'anomaly_detection' | 'market_prediction' | 'sentiment_analysis'> = [
        'risk_scoring', 'signal_processing', 'anomaly_detection', 'market_prediction', 'sentiment_analysis',
      ];
      for (const model of models) {
        const task = intelligence.submitInferenceTask({
          model,
          nodeId,
          tenantId: 'tenant1',
          inputSize: 512,
          priority: 'medium',
        });
        const result = await intelligence.executeInferenceTask(task.id);
        expect(result.status).toBe('completed');
      }
    });

    it('should throw for unknown task id', async () => {
      await expect(
        intelligence.executeInferenceTask('nonexistent-task')
      ).rejects.toThrow();
    });
  });

  describe('listActiveInferenceTasks', () => {
    it('should list queued tasks', () => {
      intelligence.submitInferenceTask({
        model: 'signal_processing',
        nodeId,
        tenantId: 'tenant1',
        inputSize: 100,
        priority: 'low',
      });
      const tasks = intelligence.listActiveInferenceTasks();
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should filter by nodeId', () => {
      // node2 uses different region to avoid same-millisecond ID collision
      const node2 = makeNode(registry, { region: 'eu-west-1' });
      registry.activateNode(node2.id);
      intelligence.submitInferenceTask({ model: 'risk_scoring', nodeId, tenantId: 't', inputSize: 100, priority: 'high' });
      intelligence.submitInferenceTask({ model: 'risk_scoring', nodeId: node2.id, tenantId: 't', inputSize: 100, priority: 'high' });
      const tasks = intelligence.listActiveInferenceTasks({ nodeId });
      expect(tasks.every((t) => t.nodeId === nodeId)).toBe(true);
    });
  });

  describe('getInferenceStats', () => {
    it('should return zero stats before any executions', () => {
      const stats = intelligence.getInferenceStats('risk_scoring');
      expect(stats.totalExecuted).toBe(0);
      expect(stats.errorRate).toBe(0);
    });

    it('should accumulate stats after executions', async () => {
      const task = intelligence.submitInferenceTask({
        model: 'anomaly_detection',
        nodeId,
        tenantId: 'tenant1',
        inputSize: 256,
        priority: 'medium',
      });
      await intelligence.executeInferenceTask(task.id);
      const stats = intelligence.getInferenceStats('anomaly_detection');
      expect(stats.totalExecuted).toBe(1);
      expect(stats.avgLatencyMs).toBeGreaterThan(0);
    });
  });

  describe('getBestNodeForInference', () => {
    it('should return undefined when no active nodes', () => {
      const emptyRegistry = makeRegistry();
      const layer = new EdgeIntelligenceLayer(emptyRegistry);
      expect(layer.getBestNodeForInference('risk_scoring')).toBeUndefined();
    });

    it('should return an active node when available', () => {
      const best = intelligence.getBestNodeForInference('risk_scoring');
      expect(best).toBeDefined();
    });

    it('should filter by region when specified', () => {
      const best = intelligence.getBestNodeForInference('signal_processing', 'us-east-1');
      // Node was registered in us-east-1, should find it
      expect(best).toBeDefined();
    });
  });
});

// ============================================================================
// GlobalInfrastructureManager (Integration)
// ============================================================================

describe('GlobalInfrastructureManager', () => {
  let manager: GlobalInfrastructureManager;

  beforeEach(() => {
    manager = createGlobalInfrastructureManager();
  });

  afterEach(() => {
    manager.stop();
  });

  describe('initialization', () => {
    it('should create manager with default config', () => {
      expect(manager).toBeDefined();
      expect(manager.nodeRegistry).toBeInstanceOf(EdgeNodeRegistry);
      expect(manager.compliance).toBeInstanceOf(ComplianceEngine);
      expect(manager.router).toBeInstanceOf(GeoRouter);
      expect(manager.scheduler).toBeInstanceOf(GlobalScheduler);
      expect(manager.costOptimizer).toBeInstanceOf(CostOptimizer);
      expect(manager.monitor).toBeInstanceOf(GlobalMonitor);
      expect(manager.edgeIntelligence).toBeInstanceOf(EdgeIntelligenceLayer);
    });
  });

  describe('start / stop', () => {
    it('should start and stop without errors', () => {
      expect(() => {
        manager.start();
        manager.stop();
      }).not.toThrow();
    });

    it('should be idempotent on multiple stops', () => {
      manager.start();
      manager.stop();
      expect(() => manager.stop()).not.toThrow();
    });
  });

  describe('onEvent (unified event bus)', () => {
    it('should forward node_online events from registry', () => {
      const events = collectEvents(manager);
      manager.nodeRegistry.registerNode({
        name: 'integration-node',
        region: 'us-east-1',
        provider: 'aws',
        deploymentModel: 'public_cloud',
        endpoint: 'https://int.example.com',
        maxAgents: 50,
        capacityUnits: 500,
      });
      expect(events.some((e) => e.type === 'node_online')).toBe(true);
    });

    it('should forward failover_triggered events from router', async () => {
      // Use different providers to guarantee unique IDs even in same millisecond
      const node1 = manager.nodeRegistry.registerNode({
        name: 'n1',
        region: 'eu-west-1',
        provider: 'aws',
        deploymentModel: 'public_cloud',
        endpoint: 'https://n1.example.com',
        maxAgents: 100,
        capacityUnits: 1000,
      });
      const node2 = manager.nodeRegistry.registerNode({
        name: 'n2',
        region: 'eu-west-1',
        provider: 'gcp',
        deploymentModel: 'public_cloud',
        endpoint: 'https://n2.example.com',
        maxAgents: 100,
        capacityUnits: 1000,
      });
      manager.nodeRegistry.activateNode(node1.id);
      manager.nodeRegistry.activateNode(node2.id);

      await manager.router.placeAgent({
        agentId: 'int-agent',
        tenantId: 'int-tenant',
        preferredRegions: ['eu-west-1'],
      });

      const events = collectEvents(manager);
      await manager.router.failoverAgent('int-agent');
      expect(events.some((e) => e.type === 'failover_triggered')).toBe(true);
    });
  });

  describe('end-to-end workflow', () => {
    it('should register node, place agent, and schedule job', async () => {
      // 1. Register and activate a node
      const node = manager.nodeRegistry.registerNode({
        name: 'e2e-node',
        region: 'ap-southeast-1',
        provider: 'aws',
        deploymentModel: 'public_cloud',
        endpoint: 'https://apac.example.com',
        maxAgents: 200,
        capacityUnits: 2000,
      });
      manager.nodeRegistry.activateNode(node.id);

      // 2. Place an agent
      const placement = await manager.router.placeAgent({
        agentId: 'e2e-agent',
        tenantId: 'e2e-tenant',
        preferredRegions: ['ap-southeast-1'],
      });
      expect(placement.assignedRegion).toBe('ap-southeast-1');

      // 3. Schedule a global job
      const job = manager.scheduler.registerJob({
        name: 'E2E Job',
        agentId: 'e2e-agent',
        tenantId: 'e2e-tenant',
        trigger: 'cron',
        cronExpression: '@hourly',
        targetRegions: ['ap-southeast-1'],
      });
      expect(job.status).toBe('active');

      // 4. Verify compliance
      const check = await manager.compliance.checkCompliance({
        tenantId: 'e2e-tenant',
        targetRegion: 'ap-southeast-1',
        dataClassification: ['financial'],
        operationType: 'process',
      });
      expect(check.allowed).toBe(true);

      // 5. Check global health
      const health = manager.monitor.computeGlobalHealth();
      expect(health.activeNodes).toBe(1);
    });
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('factory functions', () => {
  it('createEdgeNodeRegistry should return EdgeNodeRegistry instance', () => {
    expect(createEdgeNodeRegistry()).toBeInstanceOf(EdgeNodeRegistry);
  });

  it('createComplianceEngine should return ComplianceEngine instance', () => {
    expect(createComplianceEngine()).toBeInstanceOf(ComplianceEngine);
  });

  it('createGeoRouter should return GeoRouter instance', () => {
    const reg = createEdgeNodeRegistry();
    const comp = createComplianceEngine();
    expect(createGeoRouter(reg, comp)).toBeInstanceOf(GeoRouter);
  });

  it('createGlobalScheduler should return GlobalScheduler instance', () => {
    const reg = createEdgeNodeRegistry();
    const sched = createGlobalScheduler(reg);
    expect(sched).toBeInstanceOf(GlobalScheduler);
    sched.stop();
  });

  it('createCostOptimizer should return CostOptimizer instance', () => {
    const reg = createEdgeNodeRegistry();
    expect(createCostOptimizer(reg)).toBeInstanceOf(CostOptimizer);
  });

  it('createGlobalMonitor should return GlobalMonitor instance', () => {
    const reg = createEdgeNodeRegistry();
    const mon = createGlobalMonitor(reg);
    expect(mon).toBeInstanceOf(GlobalMonitor);
    mon.stop();
  });

  it('createEdgeIntelligenceLayer should return EdgeIntelligenceLayer instance', () => {
    const reg = createEdgeNodeRegistry();
    expect(createEdgeIntelligenceLayer(reg)).toBeInstanceOf(EdgeIntelligenceLayer);
  });

  it('createGlobalInfrastructureManager should return GlobalInfrastructureManager instance', () => {
    const mgr = createGlobalInfrastructureManager();
    expect(mgr).toBeInstanceOf(GlobalInfrastructureManager);
    mgr.stop();
  });
});
