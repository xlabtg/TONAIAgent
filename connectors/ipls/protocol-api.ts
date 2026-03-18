/**
 * TONAIAgent - Protocol-to-Protocol API Layer
 *
 * Implements the standardized Protocol-to-Protocol API Layer for the IPLS
 * framework, providing capital request standards, reporting formats, risk
 * disclosures, and governance hooks for cross-protocol interoperability (Issue #124).
 */

import {
  CapitalRequest,
  ReportingPayload,
  RiskDisclosure,
  GovernanceHook,
  GovernanceVote,
  GovernanceAction,
  ProtocolId,
  IPLSEvent,
  IPLSEventCallback,
  ProtocolApiConfig,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface ProtocolApiManager {
  // Capital request standards
  submitCapitalRequest(request: CapitalRequest): Promise<CapitalRequestResult>;
  getCapitalRequest(requestId: string): Promise<CapitalRequest | null>;
  listCapitalRequests(filters?: CapitalRequestFilters): Promise<CapitalRequest[]>;
  approveCapitalRequest(requestId: string, approver: ProtocolId): Promise<void>;
  rejectCapitalRequest(requestId: string, rejector: ProtocolId, reason: string): Promise<void>;
  cancelCapitalRequest(requestId: string): Promise<void>;

  // Reporting format
  submitReport(payload: ReportingPayload): Promise<ReportSubmissionResult>;
  getReport(reportId: string): Promise<ReportSubmissionResult | null>;
  listReports(filters?: ReportFilters): Promise<ReportSubmissionResult[]>;
  getAggregatedReport(protocolId: ProtocolId, type: string, period: string): Promise<AggregatedReport>;

  // Risk disclosure
  submitRiskDisclosure(disclosure: RiskDisclosure): Promise<RiskDisclosureResult>;
  getRiskDisclosure(disclosureId: string): Promise<RiskDisclosureResult | null>;
  listRiskDisclosures(filters?: DisclosureFilters): Promise<RiskDisclosureResult[]>;
  resolveRiskDisclosure(disclosureId: string, resolution: string): Promise<void>;

  // Governance hooks
  proposeGovernanceAction(proposal: Omit<GovernanceHook, 'id' | 'status' | 'votes' | 'createdAt'>): Promise<GovernanceHook>;
  getGovernanceProposal(proposalId: string): Promise<GovernanceHook | null>;
  listGovernanceProposals(filters?: GovernanceFilters): Promise<GovernanceHook[]>;
  voteOnProposal(proposalId: string, vote: Omit<GovernanceVote, 'timestamp'>): Promise<void>;
  executeProposal(proposalId: string): Promise<GovernanceExecutionResult>;
  cancelProposal(proposalId: string, reason: string): Promise<void>;

  // Protocol registry
  registerProtocol(info: ProtocolRegistration): Promise<RegisteredProtocol>;
  getProtocol(protocolId: ProtocolId): Promise<RegisteredProtocol | null>;
  listProtocols(filters?: ProtocolListFilters): Promise<RegisteredProtocol[]>;
  updateProtocol(protocolId: ProtocolId, updates: Partial<ProtocolRegistration>): Promise<RegisteredProtocol>;
  deregisterProtocol(protocolId: ProtocolId): Promise<void>;

  // API health and analytics
  getApiMetrics(): ApiMetrics;
  getProtocolActivity(protocolId: ProtocolId): Promise<ProtocolActivity>;

  // Events
  onEvent(callback: IPLSEventCallback): void;

  // Health
  getHealth(): ProtocolApiHealth;
}

export interface CapitalRequestResult {
  requestId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'fulfilled';
  submittedAt: Date;
  message: string;
}

export interface CapitalRequestFilters {
  fromProtocol?: ProtocolId;
  toProtocol?: ProtocolId;
  requestTypes?: string[];
  statuses?: string[];
  assets?: string[];
  minAmount?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ReportSubmissionResult {
  reportId: string;
  reporterId: ProtocolId;
  reportType: string;
  submittedAt: Date;
  schemaVersion: string;
  isValid: boolean;
  validationErrors: string[];
  data: Record<string, unknown>;
}

export interface ReportFilters {
  reporterIds?: ProtocolId[];
  reportTypes?: string[];
  fromDate?: Date;
  toDate?: Date;
  isValid?: boolean;
  limit?: number;
  offset?: number;
}

export interface AggregatedReport {
  protocolId: ProtocolId;
  reportType: string;
  period: string;
  dataPoints: number;
  aggregatedData: Record<string, unknown>;
  generatedAt: Date;
}

export interface RiskDisclosureResult {
  id: string;
  disclosure: RiskDisclosure;
  acknowledgedBy: ProtocolId[];
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
}

export interface DisclosureFilters {
  disclosingProtocols?: ProtocolId[];
  types?: string[];
  severities?: string[];
  statuses?: string[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GovernanceFilters {
  proposedBy?: ProtocolId[];
  actions?: GovernanceAction[];
  statuses?: string[];
  targetModules?: string[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GovernanceExecutionResult {
  proposalId: string;
  executed: boolean;
  executedAt: Date;
  result: Record<string, unknown>;
  transactionId?: string;
  error?: string;
}

export interface ProtocolRegistration {
  id: ProtocolId;
  name: string;
  description: string;
  version: string;
  website: string;
  contactEmail: string;
  supportedCapabilities: string[];
  apiEndpoints?: string[];
  webhookUrl?: string;
  tags: string[];
}

export interface RegisteredProtocol extends ProtocolRegistration {
  registeredAt: Date;
  lastActiveAt: Date;
  status: 'active' | 'inactive' | 'suspended';
  totalCapitalRequests: number;
  totalReportsSubmitted: number;
  totalDisclosures: number;
  reputationScore: number;
}

export interface ProtocolListFilters {
  statuses?: string[];
  capabilities?: string[];
  minReputationScore?: number;
  limit?: number;
  offset?: number;
}

export interface ApiMetrics {
  totalProtocols: number;
  activeProtocols: number;
  totalCapitalRequests: number;
  pendingCapitalRequests: number;
  totalReportsSubmitted: number;
  totalDisclosures: number;
  unresolvedDisclosures: number;
  totalGovernanceProposals: number;
  activeGovernanceProposals: number;
  lastUpdated: Date;
}

export interface ProtocolActivity {
  protocolId: ProtocolId;
  period: '24h' | '7d' | '30d';
  capitalRequests: number;
  reportsSubmitted: number;
  disclosures: number;
  governanceVotes: number;
  reputationScore: number;
  lastActivity: Date;
}

export interface ProtocolApiHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  registeredProtocols: number;
  pendingRequests: number;
  unresolvedDisclosures: number;
  activeGovernanceProposals: number;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultProtocolApiManager implements ProtocolApiManager {
  private capitalRequests: Map<string, CapitalRequest & { result: CapitalRequestResult }> = new Map();
  private reports: Map<string, ReportSubmissionResult> = new Map();
  private disclosures: Map<string, RiskDisclosureResult> = new Map();
  private proposals: Map<string, GovernanceHook> = new Map();
  private protocols: Map<ProtocolId, RegisteredProtocol> = new Map();
  private eventCallbacks: IPLSEventCallback[] = [];
  private config: ProtocolApiConfig;

  constructor(config?: Partial<ProtocolApiConfig>) {
    this.config = {
      enabled: true,
      reportingIntervalMs: 86400000,
      governanceEnabled: true,
      maxConcurrentRequests: 100,
      requestTimeoutMs: 30000,
      ...config,
    };
  }

  async submitCapitalRequest(request: CapitalRequest): Promise<CapitalRequestResult> {
    if (!request.fromProtocol || !request.toProtocol) {
      throw new Error('Capital request must specify both fromProtocol and toProtocol');
    }
    if (!request.asset || !request.amount) {
      throw new Error('Capital request must specify asset and amount');
    }

    const amountNum = parseFloat(request.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Capital request amount must be a positive number');
    }

    if (request.expiresAt <= new Date()) {
      throw new Error('Capital request has already expired');
    }

    const result: CapitalRequestResult = {
      requestId: request.id,
      status: 'pending',
      submittedAt: new Date(),
      message: 'Capital request submitted for review',
    };

    this.capitalRequests.set(request.id, { ...request, result });

    const toProtocol = this.protocols.get(request.toProtocol);
    if (toProtocol) {
      toProtocol.totalCapitalRequests++;
      toProtocol.lastActiveAt = new Date();
      this.protocols.set(request.toProtocol, toProtocol);
    }

    this.emitEvent('liquidity_requested', request.fromProtocol, 'submit_capital_request', {
      requestId: request.id,
      toProtocol: request.toProtocol,
      amount: request.amount,
      asset: request.asset,
    });

    return result;
  }

  async getCapitalRequest(requestId: string): Promise<CapitalRequest | null> {
    const entry = this.capitalRequests.get(requestId);
    if (!entry) return null;
    const { result: _result, ...request } = entry;
    void _result;
    return request;
  }

  async listCapitalRequests(filters?: CapitalRequestFilters): Promise<CapitalRequest[]> {
    let requests = Array.from(this.capitalRequests.values()).map(({ result: _r, ...req }) => {
      void _r;
      return req;
    });

    if (filters) {
      if (filters.fromProtocol) {
        requests = requests.filter((r) => r.fromProtocol === filters.fromProtocol);
      }
      if (filters.toProtocol) {
        requests = requests.filter((r) => r.toProtocol === filters.toProtocol);
      }
      if (filters.requestTypes?.length) {
        requests = requests.filter((r) => filters.requestTypes!.includes(r.requestType));
      }
      if (filters.assets?.length) {
        requests = requests.filter((r) => filters.assets!.includes(r.asset));
      }
      if (filters.fromDate) {
        requests = requests.filter((r) => r.createdAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        requests = requests.filter((r) => r.createdAt <= filters.toDate!);
      }

      if (filters.offset !== undefined) {
        requests = requests.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        requests = requests.slice(0, filters.limit);
      }
    }

    return requests;
  }

  async approveCapitalRequest(requestId: string, approver: ProtocolId): Promise<void> {
    const entry = this.capitalRequests.get(requestId);
    if (!entry) {
      throw new Error(`Capital request not found: ${requestId}`);
    }
    if (entry.result.status !== 'pending') {
      throw new Error(`Capital request is not pending: ${entry.result.status}`);
    }

    entry.result.status = 'approved';
    entry.result.message = `Approved by ${approver}`;
    this.capitalRequests.set(requestId, entry);

    this.emitEvent('liquidity_routed', approver, 'approve_capital_request', {
      requestId,
      approver,
    });
  }

  async rejectCapitalRequest(requestId: string, rejector: ProtocolId, reason: string): Promise<void> {
    const entry = this.capitalRequests.get(requestId);
    if (!entry) {
      throw new Error(`Capital request not found: ${requestId}`);
    }
    if (entry.result.status !== 'pending') {
      throw new Error(`Capital request is not pending: ${entry.result.status}`);
    }

    entry.result.status = 'rejected';
    entry.result.message = `Rejected by ${rejector}: ${reason}`;
    this.capitalRequests.set(requestId, entry);
  }

  async cancelCapitalRequest(requestId: string): Promise<void> {
    const entry = this.capitalRequests.get(requestId);
    if (!entry) {
      throw new Error(`Capital request not found: ${requestId}`);
    }
    if (entry.result.status !== 'pending') {
      throw new Error(`Capital request is not pending: ${entry.result.status}`);
    }

    entry.result.status = 'cancelled';
    entry.result.message = 'Cancelled by submitter';
    this.capitalRequests.set(requestId, entry);
  }

  async submitReport(payload: ReportingPayload): Promise<ReportSubmissionResult> {
    const reportId = this.generateId('report');
    const validationErrors = this.validateReport(payload);

    const result: ReportSubmissionResult = {
      reportId,
      reporterId: payload.reporterId,
      reportType: payload.reportType,
      submittedAt: new Date(),
      schemaVersion: payload.schemaVersion,
      isValid: validationErrors.length === 0,
      validationErrors,
      data: payload.data,
    };

    this.reports.set(reportId, result);

    const protocol = this.protocols.get(payload.reporterId);
    if (protocol) {
      protocol.totalReportsSubmitted++;
      protocol.lastActiveAt = new Date();
      this.protocols.set(payload.reporterId, protocol);
    }

    return result;
  }

  async getReport(reportId: string): Promise<ReportSubmissionResult | null> {
    return this.reports.get(reportId) || null;
  }

  async listReports(filters?: ReportFilters): Promise<ReportSubmissionResult[]> {
    let reports = Array.from(this.reports.values());

    if (filters) {
      if (filters.reporterIds?.length) {
        reports = reports.filter((r) => filters.reporterIds!.includes(r.reporterId));
      }
      if (filters.reportTypes?.length) {
        reports = reports.filter((r) => filters.reportTypes!.includes(r.reportType));
      }
      if (filters.isValid !== undefined) {
        reports = reports.filter((r) => r.isValid === filters.isValid);
      }
      if (filters.fromDate) {
        reports = reports.filter((r) => r.submittedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        reports = reports.filter((r) => r.submittedAt <= filters.toDate!);
      }

      if (filters.offset !== undefined) {
        reports = reports.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        reports = reports.slice(0, filters.limit);
      }
    }

    return reports;
  }

  async getAggregatedReport(
    protocolId: ProtocolId,
    type: string,
    period: string
  ): Promise<AggregatedReport> {
    const protocolReports = Array.from(this.reports.values()).filter(
      (r) => r.reporterId === protocolId && r.reportType === type
    );

    const aggregatedData: Record<string, unknown> = {
      reportCount: protocolReports.length,
      validReports: protocolReports.filter((r) => r.isValid).length,
    };

    // Aggregate numeric data fields across reports
    for (const report of protocolReports) {
      for (const [key, value] of Object.entries(report.data)) {
        if (typeof value === 'number') {
          const existing = (aggregatedData[`sum_${key}`] as number) || 0;
          aggregatedData[`sum_${key}`] = existing + value;
        }
      }
    }

    return {
      protocolId,
      reportType: type,
      period,
      dataPoints: protocolReports.length,
      aggregatedData,
      generatedAt: new Date(),
    };
  }

  async submitRiskDisclosure(disclosure: RiskDisclosure): Promise<RiskDisclosureResult> {
    const disclosureId = this.generateId('disclosure');

    const result: RiskDisclosureResult = {
      id: disclosureId,
      disclosure,
      acknowledgedBy: [],
      createdAt: new Date(),
    };

    this.disclosures.set(disclosureId, result);

    const protocol = this.protocols.get(disclosure.disclosingProtocol);
    if (protocol) {
      protocol.totalDisclosures++;
      protocol.lastActiveAt = new Date();
      this.protocols.set(disclosure.disclosingProtocol, protocol);
    }

    if (disclosure.severity === 'critical' || disclosure.severity === 'high') {
      this.emitEvent('risk_alert', disclosure.disclosingProtocol, 'submit_risk_disclosure', {
        disclosureId,
        severity: disclosure.severity,
        disclosureType: disclosure.disclosureType,
      });
    }

    return result;
  }

  async getRiskDisclosure(disclosureId: string): Promise<RiskDisclosureResult | null> {
    return this.disclosures.get(disclosureId) || null;
  }

  async listRiskDisclosures(filters?: DisclosureFilters): Promise<RiskDisclosureResult[]> {
    let disclosures = Array.from(this.disclosures.values());

    if (filters) {
      if (filters.disclosingProtocols?.length) {
        disclosures = disclosures.filter((d) =>
          filters.disclosingProtocols!.includes(d.disclosure.disclosingProtocol)
        );
      }
      if (filters.types?.length) {
        disclosures = disclosures.filter((d) =>
          filters.types!.includes(d.disclosure.disclosureType)
        );
      }
      if (filters.severities?.length) {
        disclosures = disclosures.filter((d) =>
          filters.severities!.includes(d.disclosure.severity)
        );
      }
      if (filters.statuses?.length) {
        disclosures = disclosures.filter((d) =>
          filters.statuses!.includes(d.disclosure.resolutionStatus)
        );
      }
      if (filters.fromDate) {
        disclosures = disclosures.filter((d) => d.createdAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        disclosures = disclosures.filter((d) => d.createdAt <= filters.toDate!);
      }

      if (filters.offset !== undefined) {
        disclosures = disclosures.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        disclosures = disclosures.slice(0, filters.limit);
      }
    }

    return disclosures;
  }

  async resolveRiskDisclosure(disclosureId: string, resolution: string): Promise<void> {
    const disclosure = this.disclosures.get(disclosureId);
    if (!disclosure) {
      throw new Error(`Disclosure not found: ${disclosureId}`);
    }

    disclosure.resolvedAt = new Date();
    disclosure.resolutionNotes = resolution;
    disclosure.disclosure.resolutionStatus = 'resolved';
    this.disclosures.set(disclosureId, disclosure);
  }

  async proposeGovernanceAction(
    proposal: Omit<GovernanceHook, 'id' | 'status' | 'votes' | 'createdAt'>
  ): Promise<GovernanceHook> {
    if (!this.config.governanceEnabled) {
      throw new Error('Governance is disabled');
    }

    const proposalId = this.generateId('proposal');
    const now = new Date();

    const fullProposal: GovernanceHook = {
      ...proposal,
      id: proposalId,
      status: 'proposed',
      votes: [],
      createdAt: now,
    };

    this.proposals.set(proposalId, fullProposal);

    this.emitEvent('governance_proposal', proposal.proposedBy, 'propose_governance_action', {
      proposalId,
      action: proposal.action,
      targetModule: proposal.targetModule,
    });

    return fullProposal;
  }

  async getGovernanceProposal(proposalId: string): Promise<GovernanceHook | null> {
    return this.proposals.get(proposalId) || null;
  }

  async listGovernanceProposals(filters?: GovernanceFilters): Promise<GovernanceHook[]> {
    let proposals = Array.from(this.proposals.values());

    if (filters) {
      if (filters.proposedBy?.length) {
        proposals = proposals.filter((p) => filters.proposedBy!.includes(p.proposedBy));
      }
      if (filters.actions?.length) {
        proposals = proposals.filter((p) => filters.actions!.includes(p.action));
      }
      if (filters.statuses?.length) {
        proposals = proposals.filter((p) => filters.statuses!.includes(p.status));
      }
      if (filters.targetModules?.length) {
        proposals = proposals.filter((p) => filters.targetModules!.includes(p.targetModule));
      }
      if (filters.fromDate) {
        proposals = proposals.filter((p) => p.createdAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        proposals = proposals.filter((p) => p.createdAt <= filters.toDate!);
      }

      if (filters.offset !== undefined) {
        proposals = proposals.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        proposals = proposals.slice(0, filters.limit);
      }
    }

    return proposals;
  }

  async voteOnProposal(
    proposalId: string,
    vote: Omit<GovernanceVote, 'timestamp'>
  ): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    if (proposal.status !== 'voting' && proposal.status !== 'proposed') {
      throw new Error(`Cannot vote on proposal in status: ${proposal.status}`);
    }
    if (new Date() > proposal.votingDeadline) {
      throw new Error('Voting deadline has passed');
    }

    // Replace existing vote from same voter
    proposal.votes = proposal.votes.filter((v) => v.voterId !== vote.voterId);
    proposal.votes.push({ ...vote, timestamp: new Date() });
    proposal.status = 'voting';

    this.proposals.set(proposalId, proposal);
  }

  async executeProposal(proposalId: string): Promise<GovernanceExecutionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (new Date() < proposal.votingDeadline && proposal.status !== 'approved') {
      throw new Error('Voting period has not ended');
    }

    // Tally votes
    const totalWeight = proposal.votes.reduce((sum, v) => sum + v.weight, 0);
    const forWeight = proposal.votes
      .filter((v) => v.vote === 'for')
      .reduce((sum, v) => sum + v.weight, 0);

    const quorumMet = totalWeight >= proposal.quorumRequired;
    const majorityFor = totalWeight > 0 && (forWeight / totalWeight) * 100 >= 50;

    if (!quorumMet) {
      proposal.status = 'expired';
      this.proposals.set(proposalId, proposal);
      return {
        proposalId,
        executed: false,
        executedAt: new Date(),
        result: {},
        error: 'Quorum not met',
      };
    }

    if (!majorityFor) {
      proposal.status = 'rejected';
      this.proposals.set(proposalId, proposal);
      return {
        proposalId,
        executed: false,
        executedAt: new Date(),
        result: { forWeight, totalWeight },
        error: 'Majority not achieved',
      };
    }

    proposal.status = 'executed';
    proposal.executedAt = new Date();
    this.proposals.set(proposalId, proposal);

    this.emitEvent('governance_executed', proposal.proposedBy, 'execute_governance_proposal', {
      proposalId,
      action: proposal.action,
      parameters: proposal.parameters,
    });

    return {
      proposalId,
      executed: true,
      executedAt: proposal.executedAt,
      result: { action: proposal.action, parameters: proposal.parameters },
      transactionId: this.generateId('tx'),
    };
  }

  async cancelProposal(proposalId: string, reason: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    if (proposal.status === 'executed' || proposal.status === 'expired') {
      throw new Error(`Cannot cancel proposal in status: ${proposal.status}`);
    }

    proposal.status = 'rejected';
    this.proposals.set(proposalId, proposal);

    this.emitEvent('governance_proposal', proposal.proposedBy, 'cancel_proposal', {
      proposalId,
      reason,
    });
  }

  async registerProtocol(info: ProtocolRegistration): Promise<RegisteredProtocol> {
    if (this.protocols.has(info.id)) {
      throw new Error(`Protocol already registered: ${info.id}`);
    }

    const now = new Date();
    const registered: RegisteredProtocol = {
      ...info,
      registeredAt: now,
      lastActiveAt: now,
      status: 'active',
      totalCapitalRequests: 0,
      totalReportsSubmitted: 0,
      totalDisclosures: 0,
      reputationScore: 50,
    };

    this.protocols.set(info.id, registered);

    return registered;
  }

  async getProtocol(protocolId: ProtocolId): Promise<RegisteredProtocol | null> {
    return this.protocols.get(protocolId) || null;
  }

  async listProtocols(filters?: ProtocolListFilters): Promise<RegisteredProtocol[]> {
    let protocols = Array.from(this.protocols.values());

    if (filters) {
      if (filters.statuses?.length) {
        protocols = protocols.filter((p) => filters.statuses!.includes(p.status));
      }
      if (filters.capabilities?.length) {
        protocols = protocols.filter((p) =>
          filters.capabilities!.some((c) => p.supportedCapabilities.includes(c))
        );
      }
      if (filters.minReputationScore !== undefined) {
        protocols = protocols.filter((p) => p.reputationScore >= filters.minReputationScore!);
      }

      if (filters.offset !== undefined) {
        protocols = protocols.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        protocols = protocols.slice(0, filters.limit);
      }
    }

    return protocols;
  }

  async updateProtocol(
    protocolId: ProtocolId,
    updates: Partial<ProtocolRegistration>
  ): Promise<RegisteredProtocol> {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) {
      throw new Error(`Protocol not found: ${protocolId}`);
    }

    const updated: RegisteredProtocol = {
      ...protocol,
      ...updates,
      lastActiveAt: new Date(),
    };

    this.protocols.set(protocolId, updated);
    return updated;
  }

  async deregisterProtocol(protocolId: ProtocolId): Promise<void> {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) {
      throw new Error(`Protocol not found: ${protocolId}`);
    }

    protocol.status = 'inactive';
    this.protocols.set(protocolId, protocol);
  }

  getApiMetrics(): ApiMetrics {
    const protocols = Array.from(this.protocols.values());
    const activeProtocols = protocols.filter((p) => p.status === 'active');

    const capitalRequests = Array.from(this.capitalRequests.values());
    const pendingRequests = capitalRequests.filter((r) => r.result.status === 'pending');

    const disclosures = Array.from(this.disclosures.values());
    const unresolvedDisclosures = disclosures.filter((d) => !d.resolvedAt);

    const proposals = Array.from(this.proposals.values());
    const activeProposals = proposals.filter(
      (p) => p.status === 'proposed' || p.status === 'voting'
    );

    return {
      totalProtocols: protocols.length,
      activeProtocols: activeProtocols.length,
      totalCapitalRequests: capitalRequests.length,
      pendingCapitalRequests: pendingRequests.length,
      totalReportsSubmitted: this.reports.size,
      totalDisclosures: disclosures.length,
      unresolvedDisclosures: unresolvedDisclosures.length,
      totalGovernanceProposals: proposals.length,
      activeGovernanceProposals: activeProposals.length,
      lastUpdated: new Date(),
    };
  }

  async getProtocolActivity(protocolId: ProtocolId): Promise<ProtocolActivity> {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) {
      throw new Error(`Protocol not found: ${protocolId}`);
    }

    const capitalRequests = Array.from(this.capitalRequests.values()).filter(
      (r) => r.fromProtocol === protocolId || r.toProtocol === protocolId
    ).length;

    const reports = Array.from(this.reports.values()).filter(
      (r) => r.reporterId === protocolId
    ).length;

    const disclosures = Array.from(this.disclosures.values()).filter(
      (d) => d.disclosure.disclosingProtocol === protocolId
    ).length;

    const votes = Array.from(this.proposals.values()).reduce(
      (sum, p) => sum + p.votes.filter((v) => v.voterId === protocolId).length,
      0
    );

    return {
      protocolId,
      period: '30d',
      capitalRequests,
      reportsSubmitted: reports,
      disclosures,
      governanceVotes: votes,
      reputationScore: protocol.reputationScore,
      lastActivity: protocol.lastActiveAt,
    };
  }

  onEvent(callback: IPLSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): ProtocolApiHealth {
    const protocols = Array.from(this.protocols.values());
    const pendingRequests = Array.from(this.capitalRequests.values()).filter(
      (r) => r.result.status === 'pending'
    ).length;
    const unresolvedDisclosures = Array.from(this.disclosures.values()).filter(
      (d) => !d.resolvedAt
    ).length;
    const activeProposals = Array.from(this.proposals.values()).filter(
      (p) => p.status === 'proposed' || p.status === 'voting'
    ).length;

    const issues: string[] = [];
    const criticalDisclosures = Array.from(this.disclosures.values()).filter(
      (d) => !d.resolvedAt && d.disclosure.severity === 'critical'
    ).length;

    if (criticalDisclosures > 0) {
      issues.push(`${criticalDisclosures} unresolved critical risk disclosures`);
    }

    return {
      status: criticalDisclosures > 0 ? 'degraded' : 'healthy',
      registeredProtocols: protocols.length,
      pendingRequests,
      unresolvedDisclosures,
      activeGovernanceProposals: activeProposals,
      issues,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: IPLSEvent['type'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: IPLSEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      severity: 'info',
      source: 'protocol_api',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedProtocols: [sourceId],
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private validateReport(payload: ReportingPayload): string[] {
    const errors: string[] = [];

    if (!payload.reporterId) {
      errors.push('reporterId is required');
    }
    if (!payload.reportType) {
      errors.push('reportType is required');
    }
    if (!payload.schemaVersion) {
      errors.push('schemaVersion is required');
    }
    if (!payload.period?.from || !payload.period?.to) {
      errors.push('period.from and period.to are required');
    }
    if (payload.period?.from && payload.period?.to && payload.period.from > payload.period.to) {
      errors.push('period.from must be before period.to');
    }
    if (!payload.data || Object.keys(payload.data).length === 0) {
      errors.push('report data cannot be empty');
    }

    return errors;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createProtocolApiManager(
  config?: Partial<ProtocolApiConfig>
): DefaultProtocolApiManager {
  return new DefaultProtocolApiManager(config);
}

export default DefaultProtocolApiManager;
