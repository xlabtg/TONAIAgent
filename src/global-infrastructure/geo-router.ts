/**
 * TONAIAgent - Geo-Distributed Agent Orchestration & Smart Router
 *
 * Provides latency-aware, compliance-first, cost-optimized routing for agent
 * placement decisions. Supports dynamic failover, region pinning, and
 * workload scheduling across the global edge fleet.
 *
 * Issue #100: Global Infrastructure & Edge Deployment
 */

import type {
  AgentPlacementRequest,
  AgentPlacementResult,
  EdgeNode,
  RegionCode,
  RoutingRule,
  RoutingStrategy,
  GlobalInfraEvent,
  GlobalInfraEventCallback,
} from './types';

import type { EdgeNodeRegistry } from './edge-node-registry';
import type { ComplianceEngine } from './compliance-engine';

// ============================================================================
// Agent Location Tracker
// ============================================================================

interface AgentLocation {
  agentId: string;
  nodeId: string;
  region: RegionCode;
  assignedAt: Date;
  failoverNodeIds: string[];
}

// ============================================================================
// Geo Router
// ============================================================================

export class GeoRouter {
  private readonly agentLocations = new Map<string, AgentLocation>();
  private readonly routingRules: RoutingRule[] = [];
  private readonly eventCallbacks: GlobalInfraEventCallback[] = [];

  constructor(
    private readonly registry: EdgeNodeRegistry,
    private readonly compliance: ComplianceEngine,
  ) {}

  /**
   * Add or update a routing rule.
   */
  addRoutingRule(rule: RoutingRule): void {
    const existing = this.routingRules.findIndex((r) => r.id === rule.id);
    if (existing >= 0) {
      this.routingRules[existing] = rule;
    } else {
      this.routingRules.push(rule);
      // Keep sorted by priority (ascending — lower = higher priority)
      this.routingRules.sort((a, b) => a.priority - b.priority);
    }
  }

  /**
   * Remove a routing rule.
   */
  removeRoutingRule(ruleId: string): void {
    const idx = this.routingRules.findIndex((r) => r.id === ruleId);
    if (idx >= 0) this.routingRules.splice(idx, 1);
  }

  /**
   * Place an agent on the optimal edge node given the request constraints.
   */
  async placeAgent(request: AgentPlacementRequest): Promise<AgentPlacementResult> {
    // 1. Apply routing rules to determine candidate regions
    const candidateRegions = this.resolveRegions(request);

    // 2. Filter candidate nodes
    let candidates = this.registry.listNodes({ status: 'active' });
    if (candidateRegions.length > 0) {
      candidates = candidates.filter((n) => candidateRegions.includes(n.region));
    }

    // 3. Exclude explicitly excluded regions
    if (request.excludedRegions && request.excludedRegions.length > 0) {
      candidates = candidates.filter(
        (n) => !request.excludedRegions!.includes(n.region)
      );
    }

    // 4. Filter by minimum health score
    if (request.minHealthScore !== undefined) {
      candidates = candidates.filter(
        (n) => n.healthScore >= (request.minHealthScore ?? 0)
      );
    }

    // 5. Filter by max latency
    if (request.maxLatencyMs !== undefined) {
      candidates = candidates.filter(
        (n) => n.latencyMs <= (request.maxLatencyMs ?? Infinity)
      );
    }

    // 6. Filter by capacity
    candidates = candidates.filter(
      (n) => n.activeAgents < n.maxAgents &&
              n.usedCapacityUnits < n.capacityUnits
    );

    // 7. Compliance check
    const complianceVerified = await this.checkComplianceForCandidates(
      candidates,
      request
    );
    if (complianceVerified.length === 0 && candidates.length > 0) {
      // Compliance blocked all candidates — return preferred region fallback
      throw new Error(
        `GeoRouter: no compliant nodes available for agent ${request.agentId} ` +
        `in candidate regions [${candidateRegions.join(', ')}]`
      );
    }
    candidates = complianceVerified.length > 0 ? complianceVerified : candidates;

    if (candidates.length === 0) {
      throw new Error(
        `GeoRouter: no available nodes for agent ${request.agentId}`
      );
    }

    // 8. Score and select best node
    const scored = this.scoreAndRankNodes(candidates, request);
    const primary = scored[0];

    // 9. Build failover list (up to 3 alternatives)
    const failoverNodes = scored
      .slice(1, 4)
      .map((n) => n.id);

    // 10. Record placement
    const location: AgentLocation = {
      agentId: request.agentId,
      nodeId: primary.id,
      region: primary.region,
      assignedAt: new Date(),
      failoverNodeIds: failoverNodes,
    };
    this.agentLocations.set(request.agentId, location);

    const result: AgentPlacementResult = {
      agentId: request.agentId,
      assignedNodeId: primary.id,
      assignedRegion: primary.region,
      assignedZone: primary.zone,
      estimatedLatencyMs: primary.latencyMs,
      placementReason: this.buildPlacementReason(primary, request),
      failoverNodeIds: failoverNodes,
      complianceVerified: complianceVerified.length > 0,
      placedAt: new Date(),
    };

    return result;
  }

  /**
   * Trigger failover for an agent — migrate to next best available node.
   */
  async failoverAgent(agentId: string): Promise<AgentPlacementResult> {
    const location = this.agentLocations.get(agentId);
    if (!location) {
      throw new Error(`GeoRouter: no placement record for agent ${agentId}`);
    }

    // Try each failover node
    for (const failoverNodeId of location.failoverNodeIds) {
      const node = this.registry.getNode(failoverNodeId);
      if (node && node.status === 'active' && node.activeAgents < node.maxAgents) {
        const newLocation: AgentLocation = {
          agentId,
          nodeId: failoverNodeId,
          region: node.region,
          assignedAt: new Date(),
          failoverNodeIds: location.failoverNodeIds.filter((id) => id !== failoverNodeId),
        };
        this.agentLocations.set(agentId, newLocation);

        this.emitEvent({
          id: `evt_${Date.now()}`,
          timestamp: new Date(),
          type: 'failover_triggered',
          nodeId: failoverNodeId,
          region: node.region,
          agentId,
          severity: 'warning',
          message: `Agent ${agentId} failed over from ${location.nodeId} to ${failoverNodeId}`,
          data: { from: location.nodeId, to: failoverNodeId },
        });

        return {
          agentId,
          assignedNodeId: failoverNodeId,
          assignedRegion: node.region,
          assignedZone: node.zone,
          estimatedLatencyMs: node.latencyMs,
          placementReason: `Failover from ${location.region} to ${node.region}`,
          failoverNodeIds: newLocation.failoverNodeIds,
          complianceVerified: false,
          placedAt: new Date(),
        };
      }
    }

    throw new Error(
      `GeoRouter: all failover nodes exhausted for agent ${agentId}`
    );
  }

  /**
   * Get the current placement for an agent.
   */
  getAgentLocation(agentId: string): AgentLocation | undefined {
    return this.agentLocations.get(agentId);
  }

  /**
   * Release an agent's placement record.
   */
  releaseAgent(agentId: string): void {
    this.agentLocations.delete(agentId);
  }

  /**
   * List all active routing rules.
   */
  listRoutingRules(): RoutingRule[] {
    return [...this.routingRules];
  }

  /**
   * Subscribe to routing events.
   */
  onEvent(callback: GlobalInfraEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private resolveRegions(request: AgentPlacementRequest): RegionCode[] {
    // Start with explicit preferences
    if (request.preferredRegions && request.preferredRegions.length > 0) {
      return request.preferredRegions;
    }

    // Apply routing rules
    for (const rule of this.routingRules) {
      if (!rule.enabled) continue;
      if (this.matchesRoutingRule(rule, request)) {
        return rule.targetRegions;
      }
    }

    // No specific constraints — return all active regions
    return [];
  }

  private matchesRoutingRule(rule: RoutingRule, request: AgentPlacementRequest): boolean {
    return rule.conditions.every((condition) => {
      const value = this.extractConditionValue(condition.field, request);
      if (value === undefined) return false;
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value as string);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(value as string);
        case 'contains':
          return typeof condition.value === 'string' &&
                 typeof value === 'string' &&
                 value.includes(condition.value);
        default:
          return false;
      }
    });
  }

  private extractConditionValue(
    field: string,
    request: AgentPlacementRequest
  ): string | undefined {
    switch (field) {
      case 'tenant_id':
        return request.tenantId;
      case 'user_country':
        return request.userCountry;
      default:
        return undefined;
    }
  }

  private async checkComplianceForCandidates(
    candidates: EdgeNode[],
    request: AgentPlacementRequest
  ): Promise<EdgeNode[]> {
    if (!request.complianceRequirements || request.complianceRequirements.length === 0) {
      return candidates;
    }

    const compliant: EdgeNode[] = [];
    for (const node of candidates) {
      const result = await this.compliance.checkCompliance({
        tenantId: request.tenantId,
        agentId: request.agentId,
        targetRegion: node.region,
        dataClassification: request.complianceRequirements ?? [],
        operationType: 'process',
        userCountry: request.userCountry,
      });
      if (result.allowed) {
        compliant.push(node);
      }
    }
    return compliant;
  }

  private scoreAndRankNodes(nodes: EdgeNode[], request: AgentPlacementRequest): EdgeNode[] {
    const scored = nodes.map((node) => ({
      node,
      score: this.scoreNode(node, request),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.node);
  }

  private scoreNode(node: EdgeNode, request: AgentPlacementRequest): number {
    let score = node.healthScore; // Base: 0–100

    // Latency bonus (lower = better)
    const maxExpectedLatency = request.maxLatencyMs ?? 500;
    const latencyScore = Math.max(0, 1 - node.latencyMs / maxExpectedLatency) * 30;
    score += latencyScore;

    // Capacity bonus
    const availableCapacity = 1 - node.usedCapacityUnits / Math.max(1, node.capacityUnits);
    score += availableCapacity * 20;

    // Preferred region bonus
    if (request.preferredRegions?.includes(node.region)) {
      score += 25;
    }

    return score;
  }

  private buildPlacementReason(node: EdgeNode, request: AgentPlacementRequest): string {
    const parts: string[] = [];
    if (request.preferredRegions?.includes(node.region)) {
      parts.push('preferred region');
    }
    parts.push(`health=${node.healthScore}`);
    parts.push(`latency=${node.latencyMs}ms`);
    return `Placed in ${node.region} (${parts.join(', ')})`;
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

export function createGeoRouter(
  registry: EdgeNodeRegistry,
  compliance: ComplianceEngine
): GeoRouter {
  return new GeoRouter(registry, compliance);
}
