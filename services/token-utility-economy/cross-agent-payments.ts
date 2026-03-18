/**
 * TONAIAgent - Cross-Agent Payments
 *
 * Enables agents to pay each other, form economic networks, and build
 * autonomous workflows. Manages payment channels and tracks the
 * overall agent economic network topology.
 */

import {
  AgentPaymentChannel,
  AgentAutonomousWorkflow,
  WorkflowStep,
  AgentEconomicNetwork,
  AgentNetworkNode,
  AgentNetworkEdge,
  CrossAgentPaymentRequest,
  CrossAgentPaymentResult,
  AgentEconomicTransaction,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_PAYMENT_FEE_RATE = 0.001; // 0.1% fee on cross-agent payments

// ============================================================================
// Interfaces
// ============================================================================

export interface CrossAgentPaymentsConfig {
  feeRate?: number;
  maxChannelCapacity?: string;
  maxWorkflowSteps?: number;
}

export interface OpenChannelRequest {
  agentA: string;
  agentB: string;
  capacity: string;
  initialBalanceA: string;
}

export interface CrossAgentPaymentsModule {
  // Payment channels
  openChannel(request: OpenChannelRequest): AgentPaymentChannel;
  getChannel(channelId: string): AgentPaymentChannel | null;
  getAgentChannels(agentId: string): AgentPaymentChannel[];
  closeChannel(channelId: string): { success: boolean; finalBalanceA: string; finalBalanceB: string };

  // Payments
  sendPayment(request: CrossAgentPaymentRequest): CrossAgentPaymentResult;
  getPaymentHistory(agentId: string): AgentEconomicTransaction[];

  // Autonomous workflows
  createWorkflow(
    name: string,
    description: string,
    participatingAgents: string[],
    steps: Omit<WorkflowStep, 'status' | 'executedAt'>[]
  ): AgentAutonomousWorkflow;
  executeWorkflowStep(workflowId: string, stepId: string): WorkflowStep | null;
  completeWorkflow(workflowId: string): AgentAutonomousWorkflow | null;
  getWorkflow(workflowId: string): AgentAutonomousWorkflow | null;
  getAgentWorkflows(agentId: string): AgentAutonomousWorkflow[];

  // Network analytics
  getEconomicNetwork(): AgentEconomicNetwork;

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultCrossAgentPaymentsModule implements CrossAgentPaymentsModule {
  private readonly channels: Map<string, AgentPaymentChannel> = new Map();
  private readonly workflows: Map<string, AgentAutonomousWorkflow> = new Map();
  private readonly paymentHistory: Map<string, AgentEconomicTransaction[]> = new Map();
  private readonly config: Required<CrossAgentPaymentsConfig>;
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  constructor(config: CrossAgentPaymentsConfig = {}) {
    this.config = {
      feeRate: config.feeRate ?? DEFAULT_PAYMENT_FEE_RATE,
      maxChannelCapacity: config.maxChannelCapacity ?? '1000000000000000', // 1M tokens
      maxWorkflowSteps: config.maxWorkflowSteps ?? 50,
    };
  }

  openChannel(request: OpenChannelRequest): AgentPaymentChannel {
    const capacity = BigInt(request.capacity);
    const balanceA = BigInt(request.initialBalanceA);
    const balanceB = capacity - balanceA;

    if (balanceB < BigInt(0)) {
      throw new Error('Initial balance A cannot exceed total capacity');
    }

    const channel: AgentPaymentChannel = {
      id: `ch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      agentA: request.agentA,
      agentB: request.agentB,
      capacity: request.capacity,
      agentABalance: balanceA.toString(),
      agentBBalance: balanceB.toString(),
      status: 'open',
      openedAt: new Date(),
      lastActivityAt: new Date(),
      totalTransactions: 0,
      totalVolume: '0',
    };

    this.channels.set(channel.id, channel);

    this.emitEvent({
      id: channel.id,
      type: 'payment.cross_agent',
      data: { action: 'channel_opened', channelId: channel.id, agentA: request.agentA, agentB: request.agentB, capacity: request.capacity },
      timestamp: new Date(),
    });

    return channel;
  }

  getChannel(channelId: string): AgentPaymentChannel | null {
    return this.channels.get(channelId) ?? null;
  }

  getAgentChannels(agentId: string): AgentPaymentChannel[] {
    return Array.from(this.channels.values()).filter(
      c => c.agentA === agentId || c.agentB === agentId
    );
  }

  closeChannel(channelId: string): { success: boolean; finalBalanceA: string; finalBalanceB: string } {
    const channel = this.channels.get(channelId);
    if (!channel) return { success: false, finalBalanceA: '0', finalBalanceB: '0' };

    const closed: AgentPaymentChannel = { ...channel, status: 'closed' };
    this.channels.set(channelId, closed);

    return { success: true, finalBalanceA: channel.agentABalance, finalBalanceB: channel.agentBBalance };
  }

  sendPayment(request: CrossAgentPaymentRequest): CrossAgentPaymentResult {
    const amount = BigInt(request.amount);
    const fee = (amount * BigInt(Math.floor(this.config.feeRate * 10000))) / BigInt(10000);
    const netAmount = amount - fee;

    // Try to find an existing channel
    const channel = Array.from(this.channels.values()).find(
      c => c.status !== 'closed' && (
        (c.agentA === request.fromAgentId && c.agentB === request.toAgentId) ||
        (c.agentB === request.fromAgentId && c.agentA === request.toAgentId)
      )
    );

    if (channel) {
      const isAgentA = channel.agentA === request.fromAgentId;
      const senderBalance = BigInt(isAgentA ? channel.agentABalance : channel.agentBBalance);

      if (senderBalance < amount) {
        return {
          success: false,
          transactionId: '',
          fromAgentId: request.fromAgentId,
          toAgentId: request.toAgentId ?? '',
          amount: request.amount,
          fee: fee.toString(),
          netAmount: '0',
          timestamp: new Date(),
          reason: 'Insufficient channel balance',
        };
      }

      // Update channel balances
      const updatedChannel: AgentPaymentChannel = {
        ...channel,
        agentABalance: isAgentA
          ? (BigInt(channel.agentABalance) - amount).toString()
          : (BigInt(channel.agentABalance) + netAmount).toString(),
        agentBBalance: isAgentA
          ? (BigInt(channel.agentBBalance) + netAmount).toString()
          : (BigInt(channel.agentBBalance) - amount).toString(),
        status: 'active',
        lastActivityAt: new Date(),
        totalTransactions: channel.totalTransactions + 1,
        totalVolume: (BigInt(channel.totalVolume) + amount).toString(),
      };
      this.channels.set(channel.id, updatedChannel);
    }

    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const tx: AgentEconomicTransaction = {
      id: transactionId,
      fromAgentId: request.fromAgentId,
      toAgentId: request.toAgentId,
      transactionType: 'cross_agent_payment',
      amount: request.amount,
      description: `Cross-agent payment: ${request.purpose}`,
      metadata: request.metadata,
      timestamp: new Date(),
      status: 'completed',
    };

    this.addPaymentHistory(request.fromAgentId, tx);
    if (request.toAgentId) {
      this.addPaymentHistory(request.toAgentId, tx);
    }

    this.emitEvent({
      id: transactionId,
      type: 'payment.cross_agent',
      data: {
        fromAgentId: request.fromAgentId,
        toAgentId: request.toAgentId,
        amount: request.amount,
        fee: fee.toString(),
        purpose: request.purpose,
      },
      agentId: request.fromAgentId,
      timestamp: new Date(),
    });

    return {
      success: true,
      transactionId,
      fromAgentId: request.fromAgentId,
      toAgentId: request.toAgentId ?? '',
      amount: request.amount,
      fee: fee.toString(),
      netAmount: netAmount.toString(),
      timestamp: new Date(),
    };
  }

  getPaymentHistory(agentId: string): AgentEconomicTransaction[] {
    return this.paymentHistory.get(agentId) ?? [];
  }

  createWorkflow(
    name: string,
    description: string,
    participatingAgents: string[],
    steps: Omit<WorkflowStep, 'status' | 'executedAt'>[]
  ): AgentAutonomousWorkflow {
    const workflowSteps: WorkflowStep[] = steps.map(s => ({
      ...s,
      status: 'pending' as const,
    }));

    const totalCost = workflowSteps.reduce((acc, s) => acc + BigInt(s.inputCost), BigInt(0));
    const totalRevenue = workflowSteps.reduce((acc, s) => acc + BigInt(s.outputRevenue), BigInt(0));

    const workflow: AgentAutonomousWorkflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      description,
      participatingAgents,
      steps: workflowSteps,
      status: 'draft',
      totalCost: totalCost.toString(),
      totalRevenue: totalRevenue.toString(),
      createdAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);

    this.emitEvent({
      id: workflow.id,
      type: 'workflow.created',
      data: { workflowId: workflow.id, name, participatingAgents, stepCount: steps.length },
      timestamp: new Date(),
    });

    return workflow;
  }

  executeWorkflowStep(workflowId: string, stepId: string): WorkflowStep | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const stepIdx = workflow.steps.findIndex(s => s.id === stepId);
    if (stepIdx === -1) return null;

    const step = workflow.steps[stepIdx];
    if (step.status !== 'pending') return step;

    // Check dependencies
    const depsComplete = step.dependsOn.every(depId => {
      const depStep = workflow.steps.find(s => s.id === depId);
      return depStep?.status === 'completed';
    });
    if (!depsComplete) return step;

    const updatedStep: WorkflowStep = {
      ...step,
      status: 'completed',
      executedAt: new Date(),
    };

    const updatedSteps = [...workflow.steps];
    updatedSteps[stepIdx] = updatedStep;

    const activeWorkflow: AgentAutonomousWorkflow = {
      ...workflow,
      steps: updatedSteps,
      status: 'active',
      startedAt: workflow.startedAt ?? new Date(),
    };
    this.workflows.set(workflowId, activeWorkflow);

    return updatedStep;
  }

  completeWorkflow(workflowId: string): AgentAutonomousWorkflow | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const allComplete = workflow.steps.every(s => s.status === 'completed' || s.status === 'skipped');
    const completed: AgentAutonomousWorkflow = {
      ...workflow,
      status: allComplete ? 'completed' : 'failed',
      completedAt: new Date(),
    };
    this.workflows.set(workflowId, completed);

    if (allComplete) {
      this.emitEvent({
        id: `wf-complete-${Date.now()}`,
        type: 'workflow.completed',
        data: { workflowId, name: workflow.name, totalRevenue: workflow.totalRevenue },
        timestamp: new Date(),
      });
    }

    return completed;
  }

  getWorkflow(workflowId: string): AgentAutonomousWorkflow | null {
    return this.workflows.get(workflowId) ?? null;
  }

  getAgentWorkflows(agentId: string): AgentAutonomousWorkflow[] {
    return Array.from(this.workflows.values()).filter(
      w => w.participatingAgents.includes(agentId)
    );
  }

  getEconomicNetwork(): AgentEconomicNetwork {
    const allTransactions = Array.from(this.paymentHistory.values()).flat();
    const agentIds = new Set<string>();
    allTransactions.forEach(tx => {
      agentIds.add(tx.fromAgentId);
      if (tx.toAgentId) agentIds.add(tx.toAgentId);
    });

    const nodes: AgentNetworkNode[] = Array.from(agentIds).map(agentId => {
      const incomingTxs = allTransactions.filter(tx => tx.toAgentId === agentId);
      const outgoingTxs = allTransactions.filter(tx => tx.fromAgentId === agentId);

      const dailyVolume = [...incomingTxs, ...outgoingTxs]
        .filter(tx => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 1);
          return tx.timestamp >= cutoff;
        })
        .reduce((acc, tx) => acc + BigInt(tx.amount), BigInt(0));

      const balance = incomingTxs.reduce((acc, tx) => acc + BigInt(tx.amount), BigInt(0)) -
        outgoingTxs.reduce((acc, tx) => acc + BigInt(tx.amount), BigInt(0));

      const connections = this.getAgentChannels(agentId).length;

      return {
        agentId,
        role: incomingTxs.length > outgoingTxs.length ? 'producer' : 'consumer',
        tokenBalance: (balance < BigInt(0) ? BigInt(0) : balance).toString(),
        dailyVolume: dailyVolume.toString(),
        connections,
        reputation: 75, // Default
      } as AgentNetworkNode;
    });

    const edgeMap = new Map<string, AgentNetworkEdge>();
    allTransactions.forEach(tx => {
      if (!tx.toAgentId) return;
      const key = `${tx.fromAgentId}->${tx.toAgentId}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.dailyVolume = (BigInt(existing.dailyVolume) + BigInt(tx.amount)).toString();
        existing.transactionCount++;
      } else {
        edgeMap.set(key, {
          fromAgentId: tx.fromAgentId,
          toAgentId: tx.toAgentId,
          dailyVolume: tx.amount,
          transactionCount: 1,
          relationship: 'service',
        });
      }
    });

    const totalValue = allTransactions.reduce((acc, tx) => acc + BigInt(tx.amount), BigInt(0));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTxs = allTransactions.filter(tx => tx.timestamp >= today);
    const dailyVolume = todayTxs.reduce((acc, tx) => acc + BigInt(tx.amount), BigInt(0));

    // Simple centrality: number of connections normalized
    const centralityScores: Record<string, number> = {};
    for (const node of nodes) {
      centralityScores[node.agentId] = node.connections / Math.max(1, nodes.length - 1);
    }

    return {
      nodes,
      edges: Array.from(edgeMap.values()),
      totalNetworkValue: totalValue.toString(),
      totalDailyVolume: dailyVolume.toString(),
      networkHealth: nodes.length > 0 ? 85 : 0,
      centralityScores,
    };
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private addPaymentHistory(agentId: string, tx: AgentEconomicTransaction): void {
    const existing = this.paymentHistory.get(agentId) ?? [];
    existing.push(tx);
    this.paymentHistory.set(agentId, existing);
  }

  private emitEvent(event: TokenUtilityEconomyEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createCrossAgentPaymentsModule(
  config?: CrossAgentPaymentsConfig
): DefaultCrossAgentPaymentsModule {
  return new DefaultCrossAgentPaymentsModule(config);
}
