/**
 * TONAIAgent - Conflict Resolution
 *
 * Handles resource contention, contradictory signals, and race conditions
 * in multi-agent coordination.
 */

import {
  Conflict,
  ConflictType,
  ConflictResolution,
  ConflictAction,
  ConflictResolver,
  ConflictContext,
  ResolutionStrategy,
  MultiAgentEvent,
} from '../types';

// ============================================================================
// Default Conflict Resolver Implementation
// ============================================================================

export class DefaultConflictResolver implements ConflictResolver {
  private activeConflicts: Map<string, Conflict> = new Map();
  private conflictHistory: Conflict[] = [];
  private strategies: Map<ConflictType, ResolutionStrategy> = new Map();
  private eventCallback?: (event: MultiAgentEvent) => void;
  private maxHistorySize: number;

  constructor(options?: ConflictResolverOptions) {
    this.eventCallback = options?.eventCallback;
    this.maxHistorySize = options?.maxHistorySize ?? 1000;

    // Set default strategies
    this.strategies.set('resource_contention', 'priority_based');
    this.strategies.set('capital_contention', 'priority_based');
    this.strategies.set('position_conflict', 'master_override');
    this.strategies.set('execution_race', 'first_come_first_served');
    this.strategies.set('signal_contradiction', 'consensus');
    this.strategies.set('priority_dispute', 'weighted_random');
  }

  async detect(context: ConflictContext): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Check for resource contention
    const resourceConflicts = this.detectResourceContention(context);
    conflicts.push(...resourceConflicts);

    // Check for capital contention
    const capitalConflicts = this.detectCapitalContention(context);
    conflicts.push(...capitalConflicts);

    // Check for execution races
    const raceConflicts = this.detectExecutionRaces(context);
    conflicts.push(...raceConflicts);

    // Register detected conflicts
    for (const conflict of conflicts) {
      this.activeConflicts.set(conflict.id, conflict);

      this.emitEvent('conflict_detected', {
        conflictId: conflict.id,
        type: conflict.type,
        parties: conflict.parties,
        severity: conflict.severity,
      });
    }

    return conflicts;
  }

  async resolve(conflict: Conflict): Promise<ConflictResolution> {
    if (conflict.status === 'resolved') {
      throw new Error(`Conflict ${conflict.id} is already resolved`);
    }

    conflict.status = 'analyzing';

    const strategy = this.strategies.get(conflict.type) ?? 'priority_based';
    let resolution: ConflictResolution;

    switch (strategy) {
      case 'priority_based':
        resolution = this.resolvePriorityBased(conflict);
        break;
      case 'first_come_first_served':
        resolution = this.resolveFirstComeFirstServed(conflict);
        break;
      case 'master_override':
        resolution = this.resolveMasterOverride(conflict);
        break;
      case 'consensus':
        resolution = await this.resolveConsensus(conflict);
        break;
      case 'weighted_random':
        resolution = this.resolveWeightedRandom(conflict);
        break;
      case 'rollback':
        resolution = this.resolveRollback(conflict);
        break;
      default:
        resolution = this.resolvePriorityBased(conflict);
    }

    conflict.status = 'resolved';
    conflict.resolvedAt = new Date();
    conflict.resolution = resolution;

    // Move to history
    this.conflictHistory.push(conflict);
    this.activeConflicts.delete(conflict.id);

    // Trim history
    if (this.conflictHistory.length > this.maxHistorySize) {
      this.conflictHistory = this.conflictHistory.slice(-this.maxHistorySize);
    }

    this.emitEvent('conflict_resolved', {
      conflictId: conflict.id,
      type: conflict.type,
      strategy,
      winner: resolution.winner,
      actions: resolution.actions.length,
    });

    return resolution;
  }

  getActiveConflicts(): Conflict[] {
    return Array.from(this.activeConflicts.values());
  }

  getResolutionHistory(limit?: number): Conflict[] {
    const history = this.conflictHistory.filter((c) => c.status === 'resolved');
    return limit ? history.slice(-limit) : history;
  }

  registerStrategy(type: ConflictType, strategy: ResolutionStrategy): void {
    this.strategies.set(type, strategy);
  }

  // ============================================================================
  // Detection Methods
  // ============================================================================

  private detectResourceContention(context: ConflictContext): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const [resource, agents] of context.sharedResources) {
      if (agents.length > 1) {
        // Check if multiple agents are trying to modify the same resource
        const activeOperations = context.pendingOperations.filter(
          (op) => op.status === 'executing'
        );

        const conflictingAgents = new Set<string>();
        for (const op of activeOperations) {
          // Check if operation involves this resource
          // This is simplified - real implementation would check operation details
          if (agents.includes(op.operationId.split('_')[0])) {
            conflictingAgents.add(op.operationId.split('_')[0]);
          }
        }

        if (conflictingAgents.size > 1) {
          conflicts.push(this.createConflict({
            type: 'resource_contention',
            parties: Array.from(conflictingAgents),
            resource,
            description: `Multiple agents competing for resource: ${resource}`,
            severity: 'medium',
          }));
        }
      }
    }

    return conflicts;
  }

  private detectCapitalContention(context: ConflictContext): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check for overlapping capital requests
    const agentAllocations = new Map<string, number>();

    for (const allocation of context.capitalAllocations) {
      const current = agentAllocations.get(allocation.agentId) ?? 0;
      agentAllocations.set(allocation.agentId, current + allocation.amount);
    }

    // If multiple agents have significant allocations and are executing, check for contention
    const significantAllocations = Array.from(agentAllocations.entries())
      .filter(([, amount]) => amount > 1000);

    if (significantAllocations.length > 2) {
      // Check if they're all trying to execute simultaneously
      const executingAgents = context.agents
        .filter((a) => a.status === 'executing')
        .map((a) => a.agentId);

      const conflictingAgents = significantAllocations
        .filter(([agentId]) => executingAgents.includes(agentId))
        .map(([agentId]) => agentId);

      if (conflictingAgents.length > 1) {
        conflicts.push(this.createConflict({
          type: 'capital_contention',
          parties: conflictingAgents,
          resource: 'capital_pool',
          description: 'Multiple agents competing for capital simultaneously',
          severity: 'high',
        }));
      }
    }

    return conflicts;
  }

  private detectExecutionRaces(context: ConflictContext): Conflict[] {
    const conflicts: Conflict[] = [];

    // Find operations targeting the same market/position
    const operationsByTarget = new Map<string, string[]>();

    for (const op of context.pendingOperations) {
      if (op.status === 'executing' || op.status === 'pending') {
        const target = op.type; // Simplified - would normally extract target from operation details
        const ops = operationsByTarget.get(target) ?? [];
        ops.push(op.operationId);
        operationsByTarget.set(target, ops);
      }
    }

    for (const [target, operations] of operationsByTarget) {
      if (operations.length > 1) {
        // Get the agents for these operations
        const agentIds = operations.map((op) => op.split('_')[0]);
        const uniqueAgents = [...new Set(agentIds)];

        if (uniqueAgents.length > 1) {
          conflicts.push(this.createConflict({
            type: 'execution_race',
            parties: uniqueAgents,
            resource: target,
            description: `Race condition detected for target: ${target}`,
            severity: 'high',
          }));
        }
      }
    }

    return conflicts;
  }

  // ============================================================================
  // Resolution Strategies
  // ============================================================================

  private resolvePriorityBased(conflict: Conflict): ConflictResolution {
    // Winner is the first party (assumed to have highest priority)
    // In real implementation, would look up actual priorities
    const winner = conflict.parties[0];
    const actions: ConflictAction[] = [];

    for (const party of conflict.parties) {
      if (party === winner) {
        actions.push({ agentId: party, action: 'proceed' });
      } else {
        actions.push({ agentId: party, action: 'wait' });
      }
    }

    return {
      strategy: 'priority_based',
      winner,
      actions,
      reasoning: `Agent ${winner} has highest priority for resource ${conflict.resource}`,
      resolvedBy: 'system',
    };
  }

  private resolveFirstComeFirstServed(conflict: Conflict): ConflictResolution {
    // First party in the list (earliest to arrive) wins
    const winner = conflict.parties[0];
    const actions: ConflictAction[] = [];

    for (let i = 0; i < conflict.parties.length; i++) {
      const party = conflict.parties[i];
      if (i === 0) {
        actions.push({ agentId: party, action: 'proceed' });
      } else {
        actions.push({ agentId: party, action: 'wait' });
      }
    }

    return {
      strategy: 'first_come_first_served',
      winner,
      actions,
      reasoning: `Agent ${winner} arrived first`,
      resolvedBy: 'system',
    };
  }

  private resolveMasterOverride(conflict: Conflict): ConflictResolution {
    // Master/coordinator agent wins
    // For now, assume first party is the master
    const winner = conflict.parties[0];
    const actions: ConflictAction[] = [];

    for (const party of conflict.parties) {
      if (party === winner) {
        actions.push({ agentId: party, action: 'proceed' });
      } else {
        actions.push({ agentId: party, action: 'cancel' });
      }
    }

    return {
      strategy: 'master_override',
      winner,
      actions,
      reasoning: `Master agent ${winner} takes control`,
      resolvedBy: 'master',
    };
  }

  private async resolveConsensus(conflict: Conflict): Promise<ConflictResolution> {
    // Require majority agreement
    // For now, simulate by picking randomly
    const winner = conflict.parties[Math.floor(Math.random() * conflict.parties.length)];
    const actions: ConflictAction[] = [];

    for (const party of conflict.parties) {
      if (party === winner) {
        actions.push({ agentId: party, action: 'proceed' });
      } else {
        actions.push({
          agentId: party,
          action: 'modify',
          parameters: { reduceAmount: 0.5 },
        });
      }
    }

    return {
      strategy: 'consensus',
      winner,
      actions,
      reasoning: `Consensus reached: Agent ${winner} proceeds with modifications to others`,
      resolvedBy: 'consensus',
    };
  }

  private resolveWeightedRandom(conflict: Conflict): ConflictResolution {
    // Random selection weighted by some factor
    // For now, use simple random
    const winner = conflict.parties[Math.floor(Math.random() * conflict.parties.length)];
    const actions: ConflictAction[] = [];

    for (const party of conflict.parties) {
      if (party === winner) {
        actions.push({ agentId: party, action: 'proceed' });
      } else {
        actions.push({ agentId: party, action: 'wait' });
      }
    }

    return {
      strategy: 'weighted_random',
      winner,
      actions,
      reasoning: `Random selection chose agent ${winner}`,
      resolvedBy: 'system',
    };
  }

  private resolveRollback(conflict: Conflict): ConflictResolution {
    // All parties rollback
    const actions: ConflictAction[] = conflict.parties.map((party) => ({
      agentId: party,
      action: 'rollback' as const,
    }));

    return {
      strategy: 'rollback',
      winner: undefined,
      actions,
      reasoning: 'All parties rolled back to consistent state',
      resolvedBy: 'system',
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createConflict(params: CreateConflictParams): Conflict {
    return {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: params.type,
      parties: params.parties,
      resource: params.resource,
      description: params.description,
      severity: params.severity,
      status: 'detected',
      detectedAt: new Date(),
      metadata: params.metadata,
    };
  }

  getStats(): ConflictResolverStats {
    const history = this.conflictHistory;
    const active = this.getActiveConflicts();

    const byType: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const conflict of history) {
      byType[conflict.type] = (byType[conflict.type] ?? 0) + 1;
      bySeverity[conflict.severity] = (bySeverity[conflict.severity] ?? 0) + 1;

      if (conflict.resolution) {
        byStrategy[conflict.resolution.strategy] =
          (byStrategy[conflict.resolution.strategy] ?? 0) + 1;
      }
    }

    let totalResolutionTime = 0;
    let resolutionTimeCount = 0;

    for (const conflict of history) {
      if (conflict.resolvedAt && conflict.detectedAt) {
        totalResolutionTime += conflict.resolvedAt.getTime() - conflict.detectedAt.getTime();
        resolutionTimeCount++;
      }
    }

    return {
      totalConflicts: history.length,
      activeConflicts: active.length,
      resolvedConflicts: history.filter((c) => c.status === 'resolved').length,
      escalatedConflicts: history.filter((c) => c.status === 'escalated').length,
      byType,
      byStrategy,
      bySeverity,
      averageResolutionTimeMs: resolutionTimeCount > 0
        ? totalResolutionTime / resolutionTimeCount
        : 0,
    };
  }

  private emitEvent(
    type: string,
    data: Record<string, unknown>
  ): void {
    if (!this.eventCallback) return;

    this.eventCallback({
      id: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type: type as never,
      source: 'conflict_resolver',
      sourceRole: 'coordinator',
      data,
      severity: 'info',
    });
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ConflictResolverOptions {
  eventCallback?: (event: MultiAgentEvent) => void;
  maxHistorySize?: number;
}

interface CreateConflictParams {
  type: ConflictType;
  parties: string[];
  resource: string;
  description: string;
  severity: Conflict['severity'];
  metadata?: Record<string, unknown>;
}

export interface ConflictResolverStats {
  totalConflicts: number;
  activeConflicts: number;
  resolvedConflicts: number;
  escalatedConflicts: number;
  byType: Record<string, number>;
  byStrategy: Record<string, number>;
  bySeverity: Record<string, number>;
  averageResolutionTimeMs: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createConflictResolver(
  options?: ConflictResolverOptions
): DefaultConflictResolver {
  return new DefaultConflictResolver(options);
}
