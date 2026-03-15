/**
 * ACMS Layer 8 — Inter-Protocol Layer
 *
 * Cross-protocol interoperability for the ACMS:
 * external protocol integration, liquidity passport system,
 * cross-chain position management, and cross-protocol capital allocation.
 * Implements the Inter-Protocol Liquidity Standard (IPLS, Issue #124).
 */

import {
  ProtocolId,
  AgentId,
  FundId,
  AssetId,
  ChainId,
  ExternalProtocol,
  ProtocolType,
  LiquidityPassport,
  CrossChainPosition,
  CrossProtocolAllocation,
  InterProtocolLayerStatus,
  ACMSEvent,
  ACMSEventCallback,
} from './types';

// ============================================================================
// Inter-Protocol Layer Interfaces
// ============================================================================

export interface InterProtocolLayerManager {
  registerProtocol(params: RegisterProtocolParams): ExternalProtocol;
  deactivateProtocol(protocolId: ProtocolId): void;
  syncProtocolData(protocolId: ProtocolId, tvlUsd: number): void;
  getProtocol(protocolId: ProtocolId): ExternalProtocol | undefined;
  listProtocols(filters?: ProtocolFilters): ExternalProtocol[];

  issuePassport(params: IssuePassportParams): LiquidityPassport;
  revokePassport(passportId: string): void;
  addProtocolToPassport(passportId: string, protocolId: ProtocolId): void;
  getPassport(passportId: string): LiquidityPassport | undefined;
  listPassports(agentId?: AgentId): LiquidityPassport[];

  registerCrossChainPosition(params: RegisterPositionParams): CrossChainPosition;
  updateCrossChainPosition(positionId: string, amount: number, valueUsd: number): void;
  getCrossChainPosition(positionId: string): CrossChainPosition | undefined;
  listCrossChainPositions(filters?: PositionFilters): CrossChainPosition[];
  getConsolidatedPortfolioUsd(holderId: AgentId): number;

  initiateAllocation(params: InitiateAllocationParams): CrossProtocolAllocation;
  completeAllocation(allocationId: string): void;
  failAllocation(allocationId: string, reason: string): void;
  getAllocation(allocationId: string): CrossProtocolAllocation | undefined;
  listAllocations(filters?: AllocationFilters): CrossProtocolAllocation[];

  getLayerStatus(): InterProtocolLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface RegisterProtocolParams {
  name: string;
  type: ProtocolType;
  chainId: ChainId;
  tvlUsd: number;
  integrationType: ExternalProtocol['integrationType'];
  adapterVersion: string;
}

export interface ProtocolFilters {
  type?: ProtocolType;
  chainId?: ChainId;
  isActive?: boolean;
  integrationType?: ExternalProtocol['integrationType'];
}

export interface IssuePassportParams {
  fundId: FundId;
  issuedTo: AgentId;
  eligibleProtocols: ProtocolId[];
  maxAllocationUsd: number;
  validForDays: number;
}

export interface RegisterPositionParams {
  holderId: AgentId;
  chainId: ChainId;
  assetId: AssetId;
  amount: number;
  valueUsd: number;
  bridgedFrom?: ChainId;
}

export interface PositionFilters {
  holderId?: AgentId;
  chainId?: ChainId;
  assetId?: AssetId;
}

export interface InitiateAllocationParams {
  fromProtocolId: ProtocolId;
  toProtocolId: ProtocolId;
  assetId: AssetId;
  amount: number;
  purpose: string;
}

export interface AllocationFilters {
  fromProtocolId?: ProtocolId;
  toProtocolId?: ProtocolId;
  status?: CrossProtocolAllocation['status'];
}

// ============================================================================
// Default Inter-Protocol Layer Manager
// ============================================================================

export class DefaultInterProtocolLayerManager implements InterProtocolLayerManager {
  private readonly protocols: Map<ProtocolId, ExternalProtocol> = new Map();
  private readonly passports: Map<string, LiquidityPassport> = new Map();
  private readonly positions: Map<string, CrossChainPosition> = new Map();
  private readonly allocations: Map<string, CrossProtocolAllocation> = new Map();
  private readonly revokedPassports: Set<string> = new Set();
  private readonly failReasons: Map<string, string> = new Map();
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  registerProtocol(params: RegisterProtocolParams): ExternalProtocol {
    const protocol: ExternalProtocol = {
      id: this.generateId('proto'),
      name: params.name,
      type: params.type,
      chainId: params.chainId,
      tvlUsd: params.tvlUsd,
      integrationType: params.integrationType,
      adapterVersion: params.adapterVersion,
      isActive: true,
      lastSyncAt: new Date(),
    };
    this.protocols.set(protocol.id, protocol);
    return protocol;
  }

  deactivateProtocol(protocolId: ProtocolId): void {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) throw new Error(`Protocol ${protocolId} not found`);
    this.protocols.set(protocolId, { ...protocol, isActive: false });
  }

  syncProtocolData(protocolId: ProtocolId, tvlUsd: number): void {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) throw new Error(`Protocol ${protocolId} not found`);
    this.protocols.set(protocolId, { ...protocol, tvlUsd, lastSyncAt: new Date() });
  }

  getProtocol(protocolId: ProtocolId): ExternalProtocol | undefined {
    return this.protocols.get(protocolId);
  }

  listProtocols(filters?: ProtocolFilters): ExternalProtocol[] {
    let result = Array.from(this.protocols.values());
    if (filters?.type) result = result.filter(p => p.type === filters.type);
    if (filters?.chainId) result = result.filter(p => p.chainId === filters.chainId);
    if (filters?.isActive !== undefined) result = result.filter(p => p.isActive === filters.isActive);
    if (filters?.integrationType) result = result.filter(p => p.integrationType === filters.integrationType);
    return result;
  }

  issuePassport(params: IssuePassportParams): LiquidityPassport {
    const passport: LiquidityPassport = {
      id: this.generateId('passport'),
      fundId: params.fundId,
      issuedTo: params.issuedTo,
      eligibleProtocols: params.eligibleProtocols,
      crossChainPositions: [],
      maxAllocationUsd: params.maxAllocationUsd,
      currentAllocationUsd: 0,
      expiresAt: new Date(Date.now() + params.validForDays * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    this.passports.set(passport.id, passport);
    return passport;
  }

  revokePassport(passportId: string): void {
    if (!this.passports.has(passportId)) throw new Error(`Passport ${passportId} not found`);
    this.revokedPassports.add(passportId);
  }

  addProtocolToPassport(passportId: string, protocolId: ProtocolId): void {
    const passport = this.passports.get(passportId);
    if (!passport) throw new Error(`Passport ${passportId} not found`);
    if (!passport.eligibleProtocols.includes(protocolId)) {
      this.passports.set(passportId, {
        ...passport,
        eligibleProtocols: [...passport.eligibleProtocols, protocolId],
      });
    }
  }

  getPassport(passportId: string): LiquidityPassport | undefined {
    return this.passports.get(passportId);
  }

  listPassports(agentId?: AgentId): LiquidityPassport[] {
    const all = Array.from(this.passports.values());
    if (agentId) return all.filter(p => p.issuedTo === agentId);
    return all;
  }

  registerCrossChainPosition(params: RegisterPositionParams): CrossChainPosition {
    const position: CrossChainPosition = {
      id: this.generateId('xchain_pos'),
      holderId: params.holderId,
      chainId: params.chainId,
      assetId: params.assetId,
      amount: params.amount,
      valueUsd: params.valueUsd,
      bridgedFrom: params.bridgedFrom,
      lastSyncAt: new Date(),
    };
    this.positions.set(position.id, position);
    return position;
  }

  updateCrossChainPosition(positionId: string, amount: number, valueUsd: number): void {
    const position = this.positions.get(positionId);
    if (!position) throw new Error(`Position ${positionId} not found`);
    this.positions.set(positionId, { ...position, amount, valueUsd, lastSyncAt: new Date() });
  }

  getCrossChainPosition(positionId: string): CrossChainPosition | undefined {
    return this.positions.get(positionId);
  }

  listCrossChainPositions(filters?: PositionFilters): CrossChainPosition[] {
    let result = Array.from(this.positions.values());
    if (filters?.holderId) result = result.filter(p => p.holderId === filters.holderId);
    if (filters?.chainId) result = result.filter(p => p.chainId === filters.chainId);
    if (filters?.assetId) result = result.filter(p => p.assetId === filters.assetId);
    return result;
  }

  getConsolidatedPortfolioUsd(holderId: AgentId): number {
    return Array.from(this.positions.values())
      .filter(p => p.holderId === holderId)
      .reduce((sum, p) => sum + p.valueUsd, 0);
  }

  initiateAllocation(params: InitiateAllocationParams): CrossProtocolAllocation {
    const allocation: CrossProtocolAllocation = {
      id: this.generateId('xproto_alloc'),
      fromProtocolId: params.fromProtocolId,
      toProtocolId: params.toProtocolId,
      assetId: params.assetId,
      amount: params.amount,
      purpose: params.purpose,
      status: 'pending',
      initiatedAt: new Date(),
    };
    this.allocations.set(allocation.id, allocation);
    this.emitEvent('cross_protocol_allocation', 8, {
      allocationId: allocation.id,
      from: params.fromProtocolId,
      to: params.toProtocolId,
      amount: params.amount,
    });
    return allocation;
  }

  completeAllocation(allocationId: string): void {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) throw new Error(`Allocation ${allocationId} not found`);
    this.allocations.set(allocationId, {
      ...allocation,
      status: 'completed',
      completedAt: new Date(),
    });
  }

  failAllocation(allocationId: string, reason: string): void {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) throw new Error(`Allocation ${allocationId} not found`);
    this.allocations.set(allocationId, { ...allocation, status: 'failed' });
    this.failReasons.set(allocationId, reason);
  }

  getAllocation(allocationId: string): CrossProtocolAllocation | undefined {
    return this.allocations.get(allocationId);
  }

  listAllocations(filters?: AllocationFilters): CrossProtocolAllocation[] {
    let result = Array.from(this.allocations.values());
    if (filters?.fromProtocolId) result = result.filter(a => a.fromProtocolId === filters.fromProtocolId);
    if (filters?.toProtocolId) result = result.filter(a => a.toProtocolId === filters.toProtocolId);
    if (filters?.status) result = result.filter(a => a.status === filters.status);
    return result;
  }

  getLayerStatus(): InterProtocolLayerStatus {
    const protocols = Array.from(this.protocols.values());
    const activeProtocols = protocols.filter(p => p.isActive);
    const passports = Array.from(this.passports.values());
    const activePassports = passports.filter(p => !this.revokedPassports.has(p.id));
    const allocations = Array.from(this.allocations.values());
    const pending = allocations.filter(a => a.status === 'pending' || a.status === 'in_transit');

    return {
      connectedProtocols: protocols.length,
      activeProtocols: activeProtocols.length,
      totalCrossProtocolTvlUsd: activeProtocols.reduce((s, p) => s + p.tvlUsd, 0),
      activePassports: activePassports.length,
      crossChainPositions: this.positions.size,
      pendingAllocations: pending.length,
    };
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: ACMSEvent['type'], layer: ACMSEvent['layer'], data: Record<string, unknown>): void {
    const event: ACMSEvent = { type, layer, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createInterProtocolLayerManager(): DefaultInterProtocolLayerManager {
  return new DefaultInterProtocolLayerManager();
}
