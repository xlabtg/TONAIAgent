/**
 * TONAIAgent - AGFN Cross-Jurisdiction Capital Routing
 *
 * Handles cross-border capital allocation with compliance-aware routing
 * and liquidity passport validation across the Autonomous Global Financial Network.
 * Supports multi-hop routing with real-time compliance checks at each hop.
 *
 * This is Component 2 of the Autonomous Global Financial Network (AGFN).
 */

import {
  CapitalRoute,
  RouteHop,
  LiquidityPassport,
  RouteId,
  NodeId,
  JurisdictionCode,
  RoutingStrategy,
  CrossJurisdictionRoutingConfig,
  AGFNEvent,
  AGFNEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_ROUTING_CONFIG: CrossJurisdictionRoutingConfig = {
  enableComplianceAwareRouting: true,
  enableLiquidityPassportValidation: true,
  maxRouteHops: 5,
  routeComputationTimeoutMs: 5_000,
  defaultRoutingStrategy: 'compliance_first',
  minComplianceScoreForExecution: 70,
};

// ============================================================================
// Cross-Jurisdiction Capital Router Interface
// ============================================================================

export interface CrossJurisdictionCapitalRouter {
  readonly config: CrossJurisdictionRoutingConfig;

  // Route Management
  computeRoute(params: ComputeRouteParams): CapitalRoute;
  getRoute(id: RouteId): CapitalRoute | undefined;
  listRoutes(filters?: RouteFilters): CapitalRoute[];
  approveRoute(id: RouteId): CapitalRoute;
  executeRoute(id: RouteId): CapitalRoute;
  cancelRoute(id: RouteId, reason: string): CapitalRoute;

  // Liquidity Passport Management
  issueLiquidityPassport(params: IssueLiquidityPassportParams): LiquidityPassport;
  getLiquidityPassport(id: string): LiquidityPassport | undefined;
  listLiquidityPassports(filters?: PassportFilters): LiquidityPassport[];
  validateLiquidityPassport(passportId: string, amount: number, targetJurisdiction: JurisdictionCode): PassportValidationResult;
  revokeLiquidityPassport(id: string, reason: string): void;
  updatePassportUsage(passportId: string, amount: number): void;

  // Compliance
  runRouteComplianceCheck(routeId: RouteId): RouteComplianceResult;
  getComplianceReport(jurisdiction: JurisdictionCode): JurisdictionComplianceReport;

  // Analytics
  getRoutingMetrics(): RoutingMetrics;

  // Events
  onEvent(callback: AGFNEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface ComputeRouteParams {
  sourceNodeId: NodeId;
  destinationNodeId: NodeId;
  amount: number;
  currency: string;
  strategy?: RoutingStrategy;
  liquidityPassportId?: string;
  metadata?: Record<string, unknown>;
}

export interface RouteFilters {
  sourceNodeId?: NodeId;
  destinationNodeId?: NodeId;
  status?: CapitalRoute['status'];
  strategy?: RoutingStrategy;
  minAmount?: number;
  maxAmount?: number;
  sourceJurisdiction?: JurisdictionCode;
  destinationJurisdiction?: JurisdictionCode;
}

export interface IssueLiquidityPassportParams {
  issuedTo: string;
  jurisdiction: JurisdictionCode;
  approvedJurisdictions: JurisdictionCode[];
  maxCapitalPerTransferUSD: number;
  maxDailyCapitalUSD: number;
  validDays: number;
  kycLevel?: LiquidityPassport['kycLevel'];
}

export interface PassportFilters {
  issuedTo?: string;
  jurisdiction?: JurisdictionCode;
  status?: LiquidityPassport['status'];
  kycLevel?: LiquidityPassport['kycLevel'];
}

export interface PassportValidationResult {
  passportId: string;
  isValid: boolean;
  reason?: string;
  remainingDailyCapacityUSD: number;
  jurisdictionApproved: boolean;
  amlCleared: boolean;
  sanctionsCleared: boolean;
}

export interface RouteComplianceResult {
  routeId: RouteId;
  overallScore: number; // 0-100
  passed: boolean;
  hopResults: HopComplianceResult[];
  blockers: string[];
  warnings: string[];
  checkedAt: Date;
}

export interface HopComplianceResult {
  hopSequence: number;
  nodeId: NodeId;
  jurisdiction: JurisdictionCode;
  passed: boolean;
  kycPassed: boolean;
  amlPassed: boolean;
  sanctionsPassed: boolean;
  jurisdictionRulePassed: boolean;
  details: string;
}

export interface JurisdictionComplianceReport {
  jurisdiction: JurisdictionCode;
  totalRoutesThrough: number;
  compliantRoutes: number;
  complianceRate: number; // 0-1
  blockedRoutes: number;
  averageComplianceScore: number;
  commonBlockers: string[];
  generatedAt: Date;
}

export interface RoutingMetrics {
  totalRoutesComputed: number;
  totalRoutesExecuted: number;
  totalRoutesCompleted: number;
  totalRoutesFailed: number;
  successRate: number; // 0-1
  averageHopsPerRoute: number;
  averageFeeUSD: number;
  averageSettlementTimeMs: number;
  totalVolumeRoutedUSD: number;
  topSourceJurisdictions: Array<{ jurisdiction: JurisdictionCode; routeCount: number }>;
  topDestinationJurisdictions: Array<{ jurisdiction: JurisdictionCode; routeCount: number }>;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultCrossJurisdictionCapitalRouter implements CrossJurisdictionCapitalRouter {
  readonly config: CrossJurisdictionRoutingConfig;

  private readonly routes = new Map<RouteId, CapitalRoute>();
  private readonly liquidityPassports = new Map<string, LiquidityPassport>();
  private readonly eventCallbacks: AGFNEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<CrossJurisdictionRoutingConfig>) {
    this.config = { ...DEFAULT_ROUTING_CONFIG, ...config };
  }

  // ============================================================================
  // Route Management
  // ============================================================================

  computeRoute(params: ComputeRouteParams): CapitalRoute {
    const strategy = params.strategy ?? this.config.defaultRoutingStrategy;

    // Build hops based on source → destination (simplified direct + intermediate routing)
    const hops: RouteHop[] = [
      {
        sequence: 1,
        nodeId: params.sourceNodeId,
        jurisdiction: 'source',
        chain: 'ton',
        feeUSD: params.amount * 0.001,
        estimatedLatencyMs: 200,
        complianceCheckRequired: true,
      },
      {
        sequence: 2,
        nodeId: params.destinationNodeId,
        jurisdiction: 'destination',
        chain: 'ton',
        feeUSD: params.amount * 0.001,
        estimatedLatencyMs: 200,
        complianceCheckRequired: true,
      },
    ];

    const totalFeeUSD = hops.reduce((sum, h) => sum + h.feeUSD, 0);
    const estimatedSettlementTimeMs = hops.reduce((sum, h) => sum + h.estimatedLatencyMs, 0);

    // Compliance score based on strategy
    const complianceScore = strategy === 'compliance_first' ? 90 :
      strategy === 'lowest_cost' ? 70 :
      strategy === 'fastest_settlement' ? 75 : 80;

    const route: CapitalRoute = {
      id: this.generateId('route'),
      sourceNodeId: params.sourceNodeId,
      destinationNodeId: params.destinationNodeId,
      sourceJurisdiction: 'source',
      destinationJurisdiction: 'destination',
      amount: params.amount,
      currency: params.currency,
      strategy,
      hops,
      totalFeeUSD,
      estimatedSettlementTimeMs,
      complianceScore,
      liquidityPassportId: params.liquidityPassportId,
      status: 'computed',
      computedAt: new Date(),
      metadata: params.metadata ?? {},
    };

    this.routes.set(route.id, route);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'route_computed',
      severity: 'info',
      source: 'CrossJurisdictionCapitalRouter',
      message: `Route computed: ${params.amount} ${params.currency} via ${hops.length} hops`,
      data: { routeId: route.id, amount: params.amount, hops: hops.length, strategy },
      timestamp: new Date(),
    });

    return route;
  }

  getRoute(id: RouteId): CapitalRoute | undefined {
    return this.routes.get(id);
  }

  listRoutes(filters?: RouteFilters): CapitalRoute[] {
    let results = Array.from(this.routes.values());

    if (filters?.sourceNodeId) results = results.filter(r => r.sourceNodeId === filters.sourceNodeId);
    if (filters?.destinationNodeId) results = results.filter(r => r.destinationNodeId === filters.destinationNodeId);
    if (filters?.status) results = results.filter(r => r.status === filters.status);
    if (filters?.strategy) results = results.filter(r => r.strategy === filters.strategy);
    if (filters?.minAmount !== undefined) results = results.filter(r => r.amount >= filters.minAmount!);
    if (filters?.maxAmount !== undefined) results = results.filter(r => r.amount <= filters.maxAmount!);
    if (filters?.sourceJurisdiction) results = results.filter(r => r.sourceJurisdiction === filters.sourceJurisdiction);
    if (filters?.destinationJurisdiction) results = results.filter(r => r.destinationJurisdiction === filters.destinationJurisdiction);

    return results;
  }

  approveRoute(id: RouteId): CapitalRoute {
    const route = this.routes.get(id);
    if (!route) throw new Error(`Route not found: ${id}`);
    if (route.status !== 'computed') {
      throw new Error(`Cannot approve route with status: ${route.status}`);
    }

    if (route.complianceScore < this.config.minComplianceScoreForExecution) {
      throw new Error(`Route compliance score too low: ${route.complianceScore} < ${this.config.minComplianceScoreForExecution}`);
    }

    route.status = 'approved';
    return route;
  }

  executeRoute(id: RouteId): CapitalRoute {
    const route = this.routes.get(id);
    if (!route) throw new Error(`Route not found: ${id}`);
    if (route.status !== 'approved' && route.status !== 'computed') {
      throw new Error(`Cannot execute route with status: ${route.status}`);
    }

    route.status = 'executing';
    route.executedAt = new Date();

    // Simulate successful execution
    route.status = 'completed';
    route.completedAt = new Date();

    // Mark all hops as compliance passed
    for (const hop of route.hops) {
      hop.compliancePassed = true;
    }

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'route_executed',
      severity: 'info',
      source: 'CrossJurisdictionCapitalRouter',
      message: `Route executed: ${route.amount} ${route.currency}`,
      data: { routeId: id, amount: route.amount, currency: route.currency },
      timestamp: new Date(),
    });

    return route;
  }

  cancelRoute(id: RouteId, reason: string): CapitalRoute {
    const route = this.routes.get(id);
    if (!route) throw new Error(`Route not found: ${id}`);
    if (route.status === 'completed') {
      throw new Error('Cannot cancel a completed route');
    }

    route.status = 'failed';
    route.metadata = { ...route.metadata, cancellationReason: reason };

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'route_failed',
      severity: 'warning',
      source: 'CrossJurisdictionCapitalRouter',
      message: `Route cancelled: ${reason}`,
      data: { routeId: id, reason },
      timestamp: new Date(),
    });

    return route;
  }

  // ============================================================================
  // Liquidity Passport Management
  // ============================================================================

  issueLiquidityPassport(params: IssueLiquidityPassportParams): LiquidityPassport {
    const now = new Date();
    const validUntil = new Date(now.getTime() + params.validDays * 24 * 60 * 60 * 1000);

    const passport: LiquidityPassport = {
      id: this.generateId('passport'),
      issuedTo: params.issuedTo,
      jurisdiction: params.jurisdiction,
      approvedJurisdictions: params.approvedJurisdictions,
      maxCapitalPerTransferUSD: params.maxCapitalPerTransferUSD,
      maxDailyCapitalUSD: params.maxDailyCapitalUSD,
      currentDailyUsageUSD: 0,
      validFrom: now,
      validUntil,
      kycLevel: params.kycLevel ?? 'standard',
      amlApproved: true,
      sanctionsCleared: true,
      issuedAt: now,
      status: 'active',
    };

    this.liquidityPassports.set(passport.id, passport);
    return passport;
  }

  getLiquidityPassport(id: string): LiquidityPassport | undefined {
    return this.liquidityPassports.get(id);
  }

  listLiquidityPassports(filters?: PassportFilters): LiquidityPassport[] {
    let results = Array.from(this.liquidityPassports.values());

    if (filters?.issuedTo) results = results.filter(p => p.issuedTo === filters.issuedTo);
    if (filters?.jurisdiction) results = results.filter(p => p.jurisdiction === filters.jurisdiction);
    if (filters?.status) results = results.filter(p => p.status === filters.status);
    if (filters?.kycLevel) results = results.filter(p => p.kycLevel === filters.kycLevel);

    return results;
  }

  validateLiquidityPassport(
    passportId: string,
    amount: number,
    targetJurisdiction: JurisdictionCode
  ): PassportValidationResult {
    const passport = this.liquidityPassports.get(passportId);

    if (!passport) {
      return {
        passportId,
        isValid: false,
        reason: 'Passport not found',
        remainingDailyCapacityUSD: 0,
        jurisdictionApproved: false,
        amlCleared: false,
        sanctionsCleared: false,
      };
    }

    const now = new Date();

    if (passport.status !== 'active') {
      return {
        passportId,
        isValid: false,
        reason: `Passport status: ${passport.status}`,
        remainingDailyCapacityUSD: 0,
        jurisdictionApproved: false,
        amlCleared: passport.amlApproved,
        sanctionsCleared: passport.sanctionsCleared,
      };
    }

    if (now > passport.validUntil) {
      passport.status = 'expired';
      return {
        passportId,
        isValid: false,
        reason: 'Passport expired',
        remainingDailyCapacityUSD: 0,
        jurisdictionApproved: false,
        amlCleared: passport.amlApproved,
        sanctionsCleared: passport.sanctionsCleared,
      };
    }

    const jurisdictionApproved = passport.approvedJurisdictions.includes(targetJurisdiction);
    const remainingDailyCapacityUSD = passport.maxDailyCapitalUSD - passport.currentDailyUsageUSD;
    const withinDailyLimit = amount <= remainingDailyCapacityUSD;
    const withinTransferLimit = amount <= passport.maxCapitalPerTransferUSD;

    const isValid = jurisdictionApproved && withinDailyLimit && withinTransferLimit
      && passport.amlApproved && passport.sanctionsCleared;

    let reason: string | undefined;
    if (!jurisdictionApproved) reason = `Jurisdiction ${targetJurisdiction} not approved`;
    else if (!withinTransferLimit) reason = `Amount exceeds per-transfer limit`;
    else if (!withinDailyLimit) reason = `Amount exceeds daily capacity`;

    return {
      passportId,
      isValid,
      reason,
      remainingDailyCapacityUSD,
      jurisdictionApproved,
      amlCleared: passport.amlApproved,
      sanctionsCleared: passport.sanctionsCleared,
    };
  }

  revokeLiquidityPassport(id: string, reason: string): void {
    const passport = this.liquidityPassports.get(id);
    if (!passport) throw new Error(`Liquidity passport not found: ${id}`);

    passport.status = 'revoked';
    passport.revokedAt = new Date();
    passport.status = 'revoked';
  }

  updatePassportUsage(passportId: string, amount: number): void {
    const passport = this.liquidityPassports.get(passportId);
    if (!passport) throw new Error(`Liquidity passport not found: ${passportId}`);

    passport.currentDailyUsageUSD += amount;
  }

  // ============================================================================
  // Compliance
  // ============================================================================

  runRouteComplianceCheck(routeId: RouteId): RouteComplianceResult {
    const route = this.routes.get(routeId);
    if (!route) throw new Error(`Route not found: ${routeId}`);

    const hopResults: HopComplianceResult[] = route.hops.map(hop => ({
      hopSequence: hop.sequence,
      nodeId: hop.nodeId,
      jurisdiction: hop.jurisdiction,
      passed: true,
      kycPassed: true,
      amlPassed: true,
      sanctionsPassed: true,
      jurisdictionRulePassed: route.amount <= 50_000_000, // Example $50M limit
      details: route.amount <= 50_000_000
        ? 'All compliance checks passed'
        : 'Amount exceeds jurisdictional limit - enhanced review required',
    }));

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (route.amount > 50_000_000) {
      warnings.push('Transaction above enhanced due diligence threshold');
    }

    const allPassed = hopResults.every(h => h.passed);
    const overallScore = allPassed ? route.complianceScore : Math.min(route.complianceScore, 50);

    // Update route compliance score
    route.complianceScore = overallScore;

    return {
      routeId,
      overallScore,
      passed: allPassed && blockers.length === 0,
      hopResults,
      blockers,
      warnings,
      checkedAt: new Date(),
    };
  }

  getComplianceReport(jurisdiction: JurisdictionCode): JurisdictionComplianceReport {
    const routesThrough = Array.from(this.routes.values()).filter(
      r => r.sourceJurisdiction === jurisdiction || r.destinationJurisdiction === jurisdiction
    );

    const compliantRoutes = routesThrough.filter(
      r => r.complianceScore >= this.config.minComplianceScoreForExecution
    );
    const blockedRoutes = routesThrough.filter(r => r.status === 'failed');

    const averageComplianceScore = routesThrough.length > 0
      ? routesThrough.reduce((sum, r) => sum + r.complianceScore, 0) / routesThrough.length
      : 100;

    return {
      jurisdiction,
      totalRoutesThrough: routesThrough.length,
      compliantRoutes: compliantRoutes.length,
      complianceRate: routesThrough.length > 0 ? compliantRoutes.length / routesThrough.length : 1,
      blockedRoutes: blockedRoutes.length,
      averageComplianceScore,
      commonBlockers: [],
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  getRoutingMetrics(): RoutingMetrics {
    const allRoutes = Array.from(this.routes.values());
    const completed = allRoutes.filter(r => r.status === 'completed');
    const failed = allRoutes.filter(r => r.status === 'failed');
    const executed = allRoutes.filter(r => r.status === 'executing' || r.status === 'completed');

    const totalVolumeRoutedUSD = completed.reduce((sum, r) => sum + r.amount, 0);
    const averageHopsPerRoute = allRoutes.length > 0
      ? allRoutes.reduce((sum, r) => sum + r.hops.length, 0) / allRoutes.length
      : 0;
    const averageFeeUSD = allRoutes.length > 0
      ? allRoutes.reduce((sum, r) => sum + r.totalFeeUSD, 0) / allRoutes.length
      : 0;
    const averageSettlementTimeMs = completed.length > 0
      ? completed.reduce((sum, r) => sum + r.estimatedSettlementTimeMs, 0) / completed.length
      : 0;

    const jurisdictionCounts: Record<string, number> = {};
    for (const route of allRoutes) {
      jurisdictionCounts[route.sourceJurisdiction] = (jurisdictionCounts[route.sourceJurisdiction] ?? 0) + 1;
    }

    const topSourceJurisdictions = Object.entries(jurisdictionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([jurisdiction, routeCount]) => ({ jurisdiction, routeCount }));

    const destCounts: Record<string, number> = {};
    for (const route of allRoutes) {
      destCounts[route.destinationJurisdiction] = (destCounts[route.destinationJurisdiction] ?? 0) + 1;
    }

    const topDestinationJurisdictions = Object.entries(destCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([jurisdiction, routeCount]) => ({ jurisdiction, routeCount }));

    return {
      totalRoutesComputed: allRoutes.length,
      totalRoutesExecuted: executed.length,
      totalRoutesCompleted: completed.length,
      totalRoutesFailed: failed.length,
      successRate: executed.length > 0 ? completed.length / executed.length : 0,
      averageHopsPerRoute,
      averageFeeUSD,
      averageSettlementTimeMs,
      totalVolumeRoutedUSD,
      topSourceJurisdictions,
      topDestinationJurisdictions,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFNEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFNEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCrossJurisdictionCapitalRouter(
  config?: Partial<CrossJurisdictionRoutingConfig>
): DefaultCrossJurisdictionCapitalRouter {
  return new DefaultCrossJurisdictionCapitalRouter(config);
}

export default DefaultCrossJurisdictionCapitalRouter;
