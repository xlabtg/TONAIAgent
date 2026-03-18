/**
 * TONAIAgent - Cost Optimization Engine
 *
 * Autonomous cost optimization for global infrastructure deployments.
 * Analyzes compute pricing, identifies savings opportunities, tracks
 * per-tenant cost allocation, and generates actionable recommendations
 * for spot migration, region shifting, and workload timing.
 *
 * Issue #100: Global Infrastructure & Edge Deployment
 */

import type {
  ComputePricing,
  CostAllocation,
  CostOptimizationRecommendation,
  RegionCode,
  CloudProvider,
  GlobalInfraEvent,
  GlobalInfraEventCallback,
} from './types';

import type { EdgeNodeRegistry } from './edge-node-registry';

// ============================================================================
// Default Pricing Table (USD per compute unit per hour)
// ============================================================================

export const DEFAULT_PRICING: ComputePricing[] = [
  // AWS
  { nodeId: '*', provider: 'aws', region: 'us-east-1',      pricePerUnitHour: 0.048, spotPricePerUnitHour: 0.014, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'us-west-2',      pricePerUnitHour: 0.048, spotPricePerUnitHour: 0.014, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'eu-west-1',      pricePerUnitHour: 0.055, spotPricePerUnitHour: 0.017, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'eu-central-1',   pricePerUnitHour: 0.057, spotPricePerUnitHour: 0.018, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'ap-southeast-1', pricePerUnitHour: 0.060, spotPricePerUnitHour: 0.018, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'ap-northeast-1', pricePerUnitHour: 0.062, spotPricePerUnitHour: 0.019, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'me-south-1',     pricePerUnitHour: 0.070, spotPricePerUnitHour: 0.021, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'sa-east-1',      pricePerUnitHour: 0.068, spotPricePerUnitHour: 0.020, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'af-south-1',     pricePerUnitHour: 0.072, spotPricePerUnitHour: 0.022, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'aws', region: 'ap-south-1',     pricePerUnitHour: 0.058, spotPricePerUnitHour: 0.017, currency: 'USD', updatedAt: new Date('2025-01-01') },
  // GCP
  { nodeId: '*', provider: 'gcp', region: 'us-east-1',      pricePerUnitHour: 0.045, spotPricePerUnitHour: 0.013, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'gcp', region: 'eu-west-1',      pricePerUnitHour: 0.052, spotPricePerUnitHour: 0.016, currency: 'USD', updatedAt: new Date('2025-01-01') },
  // Azure
  { nodeId: '*', provider: 'azure', region: 'us-east-1',    pricePerUnitHour: 0.050, spotPricePerUnitHour: 0.015, currency: 'USD', updatedAt: new Date('2025-01-01') },
  { nodeId: '*', provider: 'azure', region: 'eu-central-1', pricePerUnitHour: 0.055, spotPricePerUnitHour: 0.017, currency: 'USD', updatedAt: new Date('2025-01-01') },
  // TON Native (subsidized)
  { nodeId: '*', provider: 'ton_native', region: 'us-east-1', pricePerUnitHour: 0.030, currency: 'USD', updatedAt: new Date('2025-01-01') },
];

// ============================================================================
// Cost Optimizer
// ============================================================================

export class CostOptimizer {
  private readonly pricingMap = new Map<string, ComputePricing>(); // `${provider}:${region}`
  private readonly costAllocations: CostAllocation[] = [];
  private readonly recommendations: CostOptimizationRecommendation[] = [];
  private readonly eventCallbacks: GlobalInfraEventCallback[] = [];
  private readonly costThresholdUsd: number;

  constructor(
    private readonly registry: EdgeNodeRegistry,
    options?: {
      costThresholdUsd?: number;
    }
  ) {
    this.costThresholdUsd = options?.costThresholdUsd ?? 1000;

    // Load default pricing
    for (const pricing of DEFAULT_PRICING) {
      this.setPricing(pricing);
    }
  }

  /**
   * Set or update pricing for a provider/region combination.
   */
  setPricing(pricing: ComputePricing): void {
    const key = `${pricing.provider}:${pricing.region}`;
    this.pricingMap.set(key, pricing);
  }

  /**
   * Get pricing for a provider/region.
   */
  getPricing(provider: CloudProvider, region: RegionCode): ComputePricing | undefined {
    return this.pricingMap.get(`${provider}:${region}`);
  }

  /**
   * Record a cost allocation for a tenant in the current period.
   */
  recordCostAllocation(allocation: CostAllocation): void {
    this.costAllocations.push(allocation);

    // Alert if cost exceeds threshold
    if (allocation.totalCostUsd >= this.costThresholdUsd) {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'cost_threshold_exceeded',
        tenantId: allocation.tenantId,
        severity: 'warning',
        message:
          `Tenant ${allocation.tenantId} exceeded cost threshold: ` +
          `$${allocation.totalCostUsd.toFixed(2)} >= $${this.costThresholdUsd}`,
        data: { allocation },
      });
    }
  }

  /**
   * Compute current estimated hourly cost for all active nodes.
   */
  computeCurrentHourlyCost(): {
    totalUsd: number;
    byRegion: Partial<Record<RegionCode, number>>;
    byProvider: Partial<Record<CloudProvider, number>>;
  } {
    const nodes = this.registry.listNodes({ status: 'active' });
    let totalUsd = 0;
    const byRegion: Partial<Record<RegionCode, number>> = {};
    const byProvider: Partial<Record<CloudProvider, number>> = {};

    for (const node of nodes) {
      const pricing = this.getPricing(node.provider, node.region);
      if (!pricing) continue;

      const unitsUsed = node.usedCapacityUnits;
      const cost = unitsUsed * pricing.pricePerUnitHour;

      totalUsd += cost;
      byRegion[node.region] = (byRegion[node.region] ?? 0) + cost;
      byProvider[node.provider] = (byProvider[node.provider] ?? 0) + cost;
    }

    return { totalUsd, byRegion, byProvider };
  }

  /**
   * Generate cost optimization recommendations based on current fleet state.
   */
  generateRecommendations(): CostOptimizationRecommendation[] {
    const nodes = this.registry.listNodes({ status: 'active' });
    const newRecommendations: CostOptimizationRecommendation[] = [];

    for (const node of nodes) {
      const pricing = this.getPricing(node.provider, node.region);
      if (!pricing) continue;

      // 1. Spot migration recommendation
      if (
        pricing.spotPricePerUnitHour &&
        pricing.spotPricePerUnitHour < pricing.pricePerUnitHour
      ) {
        const savingsPerUnit =
          pricing.pricePerUnitHour - pricing.spotPricePerUnitHour;
        const totalSavingsUsd = savingsPerUnit * node.usedCapacityUnits;
        const savingsPct = (savingsPerUnit / pricing.pricePerUnitHour) * 100;

        if (savingsPct > 20) {
          newRecommendations.push({
            id: `rec_spot_${node.id}_${Date.now()}`,
            type: 'spot_migration',
            description:
              `Migrate node ${node.name} (${node.region}) to spot/preemptible ` +
              `instances for ~${savingsPct.toFixed(0)}% savings`,
            estimatedSavingsUsd: totalSavingsUsd,
            estimatedSavingsPercent: savingsPct,
            affectedNodes: [node.id],
            implementationRisk: 'medium',
            autoApplicable: false,
            createdAt: new Date(),
          });
        }
      }

      // 2. Scale down recommendation (low utilization)
      const utilizationPct =
        node.capacityUnits > 0
          ? (node.usedCapacityUnits / node.capacityUnits) * 100
          : 0;

      if (utilizationPct < 20 && node.capacityUnits > 10) {
        const wastedUnits = node.capacityUnits - node.usedCapacityUnits;
        const wastedCost =
          wastedUnits * (pricing.pricePerUnitHour ?? 0);

        newRecommendations.push({
          id: `rec_scale_${node.id}_${Date.now()}`,
          type: 'scale_down',
          description:
            `Node ${node.name} (${node.region}) is at ${utilizationPct.toFixed(0)}% utilization. ` +
            `Consider reducing capacity or consolidating with other nodes.`,
          estimatedSavingsUsd: wastedCost,
          estimatedSavingsPercent: 100 - utilizationPct,
          affectedNodes: [node.id],
          implementationRisk: 'low',
          autoApplicable: true,
          createdAt: new Date(),
        });
      }

      // 3. Region shift to cheaper provider
      const cheaperAlternative = this.findCheaperAlternative(
        node.region,
        node.provider,
        pricing.pricePerUnitHour
      );
      if (cheaperAlternative) {
        const savings =
          (pricing.pricePerUnitHour - cheaperAlternative.pricePerUnitHour) *
          node.usedCapacityUnits;
        const savingsPct =
          ((pricing.pricePerUnitHour - cheaperAlternative.pricePerUnitHour) /
            pricing.pricePerUnitHour) *
          100;

        newRecommendations.push({
          id: `rec_region_${node.id}_${Date.now()}`,
          type: 'region_shift',
          description:
            `Shift workloads from ${node.provider}/${node.region} to ` +
            `${cheaperAlternative.provider}/${cheaperAlternative.region} for ` +
            `~${savingsPct.toFixed(0)}% savings`,
          estimatedSavingsUsd: savings,
          estimatedSavingsPercent: savingsPct,
          affectedNodes: [node.id],
          implementationRisk: 'medium',
          autoApplicable: false,
          createdAt: new Date(),
        });
      }
    }

    // Replace old recommendations with new ones
    this.recommendations.length = 0;
    this.recommendations.push(...newRecommendations);

    return [...newRecommendations];
  }

  /**
   * Get current recommendations (without regenerating).
   */
  getRecommendations(): CostOptimizationRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * Get cost allocation history for a tenant.
   */
  getTenantCostHistory(tenantId: string): CostAllocation[] {
    return this.costAllocations.filter((a) => a.tenantId === tenantId);
  }

  /**
   * Get total cost summary across all tenants for a period.
   */
  getTotalCostSummary(period: { start: Date; end: Date }): {
    totalUsd: number;
    tenantCount: number;
    byTenant: Record<string, number>;
  } {
    const relevant = this.costAllocations.filter(
      (a) =>
        a.period.start >= period.start && a.period.end <= period.end
    );

    const byTenant: Record<string, number> = {};
    let totalUsd = 0;
    const tenants = new Set<string>();

    for (const allocation of relevant) {
      byTenant[allocation.tenantId] =
        (byTenant[allocation.tenantId] ?? 0) + allocation.totalCostUsd;
      totalUsd += allocation.totalCostUsd;
      tenants.add(allocation.tenantId);
    }

    return { totalUsd, tenantCount: tenants.size, byTenant };
  }

  /**
   * Subscribe to cost events.
   */
  onEvent(callback: GlobalInfraEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private findCheaperAlternative(
    currentRegion: RegionCode,
    currentProvider: CloudProvider,
    currentPrice: number
  ): (ComputePricing & { provider: CloudProvider; region: RegionCode }) | undefined {
    let cheapest:
      | (ComputePricing & { provider: CloudProvider; region: RegionCode })
      | undefined;

    for (const [key, pricing] of this.pricingMap) {
      const [provider, region] = key.split(':') as [CloudProvider, RegionCode];
      if (provider === currentProvider && region === currentRegion) continue;
      if (region !== currentRegion) continue; // Same region, different provider
      if (pricing.pricePerUnitHour < currentPrice * 0.85) {
        // At least 15% cheaper
        if (!cheapest || pricing.pricePerUnitHour < cheapest.pricePerUnitHour) {
          cheapest = { ...pricing, provider, region };
        }
      }
    }

    return cheapest;
  }

  private emitEvent(event: GlobalInfraEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore
      }
    }
  }
}

export function createCostOptimizer(
  registry: EdgeNodeRegistry,
  options?: { costThresholdUsd?: number }
): CostOptimizer {
  return new CostOptimizer(registry, options);
}
