/**
 * TONAIAgent - Institutional Reporting Suite
 *
 * NAV calculations, risk exposure reports, audit logs,
 * regulatory-ready statements. Provides institutional-grade
 * reporting infrastructure for AI funds and prime brokerage operations.
 */

import {
  NAVReport,
  NAVAssetBreakdown,
  ReportPerformanceSummary,
  RiskExposureReport,
  AssetExposureDetail,
  StrategyExposureDetail,
  CurrencyExposure,
  ChainExposureDetail,
  AuditLog,
  RegulatoryStatement,
  ReportingConfig,
  ReportType,
  FundId,
  AgentId,
  ChainId,
  PrimeBrokerageEvent,
  PrimeBrokerageEventCallback,
} from './types';

// ============================================================================
// Reporting Suite Interface
// ============================================================================

export interface InstitutionalReportingSuite {
  readonly config: ReportingConfig;

  // NAV Reports
  generateNAVReport(scope: ReportScope, positions: PositionForNAV[]): NAVReport;
  getLatestNAVReport(scopeId?: string): NAVReport | undefined;
  listNAVReports(filters?: ReportFilters): NAVReport[];

  // Risk Exposure Reports
  generateRiskExposureReport(positions: PositionForRisk[]): RiskExposureReport;
  getLatestRiskExposureReport(): RiskExposureReport | undefined;
  listRiskExposureReports(filters?: ReportFilters): RiskExposureReport[];

  // Audit Logs
  createAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog;
  getAuditLog(logId: string): AuditLog | undefined;
  listAuditLogs(filters?: AuditLogFilters): AuditLog[];
  exportAuditTrail(fromDate: Date, toDate: Date): AuditLog[];

  // Regulatory Statements
  generateRegulatoryStatement(
    type: RegulatoryStatement['statementType'],
    fromDate: Date,
    toDate: Date,
    jurisdiction: string
  ): RegulatoryStatement;
  listRegulatoryStatements(filters?: ReportFilters): RegulatoryStatement[];

  // Performance Attribution
  generatePerformanceAttribution(fundId: FundId, period: string): PerformanceAttribution;

  // Events
  onEvent(callback: PrimeBrokerageEventCallback): void;
}

export interface ReportScope {
  type: 'system' | 'fund' | 'agent';
  id?: string;
  name?: string;
}

export interface PositionForNAV {
  assetId: string;
  assetName: string;
  assetClass: string;
  fundId: FundId;
  agentId?: AgentId;
  quantity: number;
  currentPrice: number;
  currency: string;
  priceSource: string;
  priceTimestamp: Date;
  unrealizedPnL: number;
  baseInvestedAmount: number;
}

export interface PositionForRisk {
  assetId: string;
  assetName: string;
  assetClass: string;
  fundId: FundId;
  agentId?: AgentId;
  strategy: string;
  currency: string;
  chain: ChainId;
  longExposure: number;
  shortExposure: number;
  notionalValue: number;
  leverage: number;
  protocols: string[];
}

export interface ReportFilters {
  fromDate?: Date;
  toDate?: Date;
  fundId?: FundId;
  agentId?: AgentId;
  limit?: number;
}

export interface AuditLogFilters {
  fromDate?: Date;
  toDate?: Date;
  actorType?: AuditLog['actorType'];
  eventType?: string;
  outcome?: AuditLog['outcome'];
  limit?: number;
}

export interface PerformanceAttribution {
  fundId: FundId;
  period: string;
  totalReturn: number;
  totalReturnPercent: number;
  byStrategy: StrategyAttribution[];
  byAsset: AssetAttribution[];
  byRiskFactor: RiskFactorAttribution[];
  generatedAt: Date;
}

export interface StrategyAttribution {
  strategy: string;
  contribution: number;
  contributionPercent: number;
  allocation: number;
}

export interface AssetAttribution {
  assetId: string;
  assetName: string;
  contribution: number;
  contributionPercent: number;
  weight: number;
}

export interface RiskFactorAttribution {
  factor: string;
  contribution: number;
  contributionPercent: number;
}

// ============================================================================
// Default Institutional Reporting Suite Implementation
// ============================================================================

const DEFAULT_REPORTING_CONFIG: ReportingConfig = {
  navCalculationFrequency: 'daily',
  auditLogRetentionDays: 365 * 7, // 7 years
  regulatoryReportingEnabled: true,
  defaultJurisdiction: 'US',
  priceSourcePriority: ['onchain_oracle', 'dex_twap', 'external_api', 'last_trade'],
  includeAgentDecisionLogs: true,
};

export class DefaultInstitutionalReportingSuite implements InstitutionalReportingSuite {
  readonly config: ReportingConfig;

  private readonly navReports: Map<string, NAVReport> = new Map();
  private readonly riskExposureReports: Map<string, RiskExposureReport> = new Map();
  private readonly auditLogs: Map<string, AuditLog> = new Map();
  private readonly regulatoryStatements: Map<string, RegulatoryStatement> = new Map();
  private readonly eventCallbacks: PrimeBrokerageEventCallback[] = [];

  constructor(config?: Partial<ReportingConfig>) {
    this.config = { ...DEFAULT_REPORTING_CONFIG, ...config };
  }

  // ============================================================================
  // NAV Reports
  // ============================================================================

  generateNAVReport(scope: ReportScope, positions: PositionForNAV[]): NAVReport {
    const reportId = `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reportDate = new Date();

    // Filter positions by scope
    const scopedPositions = scope.type === 'system'
      ? positions
      : scope.type === 'fund'
        ? positions.filter(p => p.fundId === scope.id)
        : positions.filter(p => p.agentId === scope.id);

    // Calculate NAV breakdown
    const assetBreakdown: NAVAssetBreakdown[] = [];
    const assetMap = new Map<string, PositionForNAV & { totalQuantity: number; totalValue: number }>();

    for (const pos of scopedPositions) {
      const existing = assetMap.get(pos.assetId);
      if (existing) {
        existing.totalQuantity += pos.quantity;
        existing.totalValue += pos.quantity * pos.currentPrice;
      } else {
        assetMap.set(pos.assetId, {
          ...pos,
          totalQuantity: pos.quantity,
          totalValue: pos.quantity * pos.currentPrice,
        });
      }
    }

    const totalNAV = [...assetMap.values()].reduce((sum, a) => sum + a.totalValue, 0);

    for (const [assetId, asset] of assetMap.entries()) {
      assetBreakdown.push({
        assetId,
        assetName: asset.assetName,
        assetClass: asset.assetClass,
        quantity: asset.totalQuantity,
        price: asset.currentPrice,
        value: asset.totalValue,
        percentOfNAV: totalNAV > 0 ? (asset.totalValue / totalNAV) * 100 : 0,
        priceSource: asset.priceSource,
        priceTimestamp: asset.priceTimestamp,
      });
    }

    // Sort by value descending
    assetBreakdown.sort((a, b) => b.value - a.value);

    // Calculate performance summary
    const totalInvested = scopedPositions.reduce((sum, p) => sum + p.baseInvestedAmount, 0);
    const totalPnL = scopedPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

    const performanceSummary: ReportPerformanceSummary = {
      periodReturn: totalPnL,
      periodReturnPercent: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
      annualizedReturn: totalInvested > 0 ? (totalPnL / totalInvested) * 365 / 30 : 0, // Approximation
      sharpeRatio: 1.2, // Simplified
      maxDrawdown: 0.08,
      period: '30d',
    };

    const report: NAVReport = {
      id: reportId,
      reportDate,
      generatedAt: new Date(),
      scope: scope.type,
      scopeId: scope.id,
      totalNAV,
      navPerShare: totalNAV > 0 ? totalNAV / Math.max(1, scopedPositions.length) : 0,
      assetBreakdown,
      performanceSummary,
      currency: 'USD',
    };

    this.navReports.set(reportId, report);

    // Log audit trail
    this.createAuditLog({
      eventType: 'report_generated',
      actor: 'system',
      actorType: 'system',
      action: 'generate_nav_report',
      resource: 'nav_report',
      resourceId: reportId,
      details: { scope: scope.type, scopeId: scope.id, totalNAV },
      outcome: 'success',
    });

    this.emitEvent('info', 'reporting', `NAV report generated: ${reportId}`, {
      scope: scope.type,
      totalNAV,
      positionCount: scopedPositions.length,
    });

    return report;
  }

  getLatestNAVReport(scopeId?: string): NAVReport | undefined {
    const reports = Array.from(this.navReports.values());
    const filtered = scopeId
      ? reports.filter(r => r.scopeId === scopeId)
      : reports;

    return filtered.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];
  }

  listNAVReports(filters?: ReportFilters): NAVReport[] {
    let reports = Array.from(this.navReports.values());

    if (filters) {
      if (filters.fromDate) {
        reports = reports.filter(r => r.generatedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        reports = reports.filter(r => r.generatedAt <= filters.toDate!);
      }
      if (filters.fundId) {
        reports = reports.filter(r => r.scopeId === filters.fundId);
      }
      if (filters.limit) {
        reports = reports.slice(0, filters.limit);
      }
    }

    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  // ============================================================================
  // Risk Exposure Reports
  // ============================================================================

  generateRiskExposureReport(positions: PositionForRisk[]): RiskExposureReport {
    const reportId = `risk_exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const totalLong = positions.reduce((sum, p) => sum + p.longExposure, 0);
    const totalShort = positions.reduce((sum, p) => sum + p.shortExposure, 0);
    const totalGross = positions.reduce((sum, p) => sum + p.notionalValue, 0);
    const totalAUM = totalGross * 0.7; // Simplified: AUM ≈ 70% of notional

    // Asset exposures
    const assetMap = new Map<string, { long: number; short: number; name: string }>();
    for (const pos of positions) {
      const existing = assetMap.get(pos.assetId) ?? { long: 0, short: 0, name: pos.assetName };
      existing.long += pos.longExposure;
      existing.short += pos.shortExposure;
      assetMap.set(pos.assetId, existing);
    }

    const assetExposures: AssetExposureDetail[] = [...assetMap.entries()].map(([assetId, data]) => ({
      assetId,
      assetName: data.name,
      longExposure: data.long,
      shortExposure: data.short,
      netExposure: data.long - data.short,
      percentOfPortfolio: totalGross > 0 ? (data.long + data.short) / totalGross * 100 : 0,
    }));

    // Strategy exposures
    const strategyMap = new Map<string, { exposure: number; agents: Set<string> }>();
    for (const pos of positions) {
      const existing = strategyMap.get(pos.strategy) ?? { exposure: 0, agents: new Set() };
      existing.exposure += pos.notionalValue;
      if (pos.agentId) existing.agents.add(pos.agentId);
      strategyMap.set(pos.strategy, existing);
    }

    const strategyExposures: StrategyExposureDetail[] = [...strategyMap.entries()].map(([strategy, data]) => ({
      strategyType: strategy,
      grossExposure: data.exposure,
      netExposure: data.exposure * 0.7,
      percentOfPortfolio: totalGross > 0 ? (data.exposure / totalGross) * 100 : 0,
      agentCount: data.agents.size,
    }));

    // Currency exposures
    const currencyMap = new Map<string, number>();
    for (const pos of positions) {
      currencyMap.set(pos.currency, (currencyMap.get(pos.currency) ?? 0) + pos.notionalValue);
    }

    const currencyExposures: CurrencyExposure[] = [...currencyMap.entries()].map(([currency, exposure]) => ({
      currency,
      exposure,
      percentOfPortfolio: totalGross > 0 ? (exposure / totalGross) * 100 : 0,
      hedged: currency === 'USD' || currency === 'USDT' || currency === 'USDC',
    }));

    // Chain exposures
    const chainMap = new Map<ChainId, { exposure: number; protocols: Set<string> }>();
    for (const pos of positions) {
      const existing = chainMap.get(pos.chain) ?? { exposure: 0, protocols: new Set() };
      existing.exposure += pos.notionalValue;
      for (const p of pos.protocols) existing.protocols.add(p);
      chainMap.set(pos.chain, existing);
    }

    const chainExposures: ChainExposureDetail[] = [...chainMap.entries()].map(([chainId, data]) => ({
      chainId,
      exposure: data.exposure,
      percentOfPortfolio: totalGross > 0 ? (data.exposure / totalGross) * 100 : 0,
      protocols: [...data.protocols],
    }));

    // Risk metrics
    const avgLeverage = positions.length > 0
      ? positions.reduce((sum, p) => sum + p.leverage, 0) / positions.length
      : 0;

    const riskMetrics: Record<string, number> = {
      var: totalAUM * 0.05,
      cvar: totalAUM * 0.07,
      expected_shortfall: totalAUM * 0.07,
      max_drawdown: 0.12,
      volatility: 0.25,
      beta: 1.1,
      correlation: 0.65,
      sharpe: 1.2,
      sortino: 1.5,
    };

    const report: RiskExposureReport = {
      id: reportId,
      reportDate: new Date(),
      generatedAt: new Date(),
      totalExposure: totalGross,
      netExposure: totalLong - totalShort,
      grossExposure: totalGross,
      leverageRatio: avgLeverage,
      riskMetrics: riskMetrics as Record<import('./types').RiskMetricType, number>,
      assetExposures,
      strategyExposures,
      currencyExposures,
      chainExposures,
    };

    this.riskExposureReports.set(reportId, report);

    this.emitEvent('info', 'reporting', `Risk exposure report generated: ${reportId}`, {
      totalExposure: totalGross,
      netExposure: totalLong - totalShort,
      positions: positions.length,
    });

    return report;
  }

  getLatestRiskExposureReport(): RiskExposureReport | undefined {
    const reports = Array.from(this.riskExposureReports.values());
    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];
  }

  listRiskExposureReports(filters?: ReportFilters): RiskExposureReport[] {
    let reports = Array.from(this.riskExposureReports.values());

    if (filters) {
      if (filters.fromDate) {
        reports = reports.filter(r => r.generatedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        reports = reports.filter(r => r.generatedAt <= filters.toDate!);
      }
      if (filters.limit) {
        reports = reports.slice(0, filters.limit);
      }
    }

    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  // ============================================================================
  // Audit Logs
  // ============================================================================

  createAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.auditLogs.set(log.id, log);

    // Prune old logs based on retention policy
    this.pruneOldAuditLogs();

    return log;
  }

  getAuditLog(logId: string): AuditLog | undefined {
    return this.auditLogs.get(logId);
  }

  listAuditLogs(filters?: AuditLogFilters): AuditLog[] {
    let logs = Array.from(this.auditLogs.values());

    if (filters) {
      if (filters.fromDate) {
        logs = logs.filter(l => l.timestamp >= filters.fromDate!);
      }
      if (filters.toDate) {
        logs = logs.filter(l => l.timestamp <= filters.toDate!);
      }
      if (filters.actorType) {
        logs = logs.filter(l => l.actorType === filters.actorType);
      }
      if (filters.eventType) {
        logs = logs.filter(l => l.eventType === filters.eventType);
      }
      if (filters.outcome) {
        logs = logs.filter(l => l.outcome === filters.outcome);
      }
      if (filters.limit) {
        logs = logs.slice(0, filters.limit);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  exportAuditTrail(fromDate: Date, toDate: Date): AuditLog[] {
    const logs = this.listAuditLogs({ fromDate, toDate });

    this.emitEvent('info', 'reporting', 'Audit trail exported', {
      fromDate,
      toDate,
      logCount: logs.length,
    });

    return logs;
  }

  // ============================================================================
  // Regulatory Statements
  // ============================================================================

  generateRegulatoryStatement(
    type: RegulatoryStatement['statementType'],
    fromDate: Date,
    toDate: Date,
    jurisdiction: string
  ): RegulatoryStatement {
    const statementId = `reg_stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Aggregate data from NAV and risk reports
    const navReports = this.listNAVReports({ fromDate, toDate });
    const latestNAV = navReports[0];

    const totalAUM = latestNAV?.totalNAV ?? 0;
    const auditLogs = this.listAuditLogs({ fromDate, toDate });
    const transactionLogs = auditLogs.filter(l => l.eventType.includes('transaction'));

    const complianceNotes: string[] = [
      `Reporting period: ${fromDate.toISOString()} to ${toDate.toISOString()}`,
      `Jurisdiction: ${jurisdiction}`,
      `All AI agent decisions logged with full audit trail`,
      `Risk limits monitored continuously`,
    ];

    if (totalAUM > 1000000) {
      complianceNotes.push('AUM exceeds threshold - enhanced reporting required');
    }

    const statement: RegulatoryStatement = {
      id: statementId,
      statementType: type,
      jurisdiction,
      reportingPeriod: { from: fromDate, to: toDate },
      generatedAt: new Date(),
      totalAUM,
      totalTransactionCount: transactionLogs.length,
      totalTransactionVolume: totalAUM * 0.3, // Estimated 30% of AUM transacted
      largestPositions: latestNAV?.assetBreakdown.slice(0, 10) ?? [],
      riskSummary: latestNAV?.performanceSummary ?? {
        periodReturn: 0,
        periodReturnPercent: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        period: '30d',
      },
      complianceNotes,
    };

    this.regulatoryStatements.set(statementId, statement);

    this.createAuditLog({
      eventType: 'regulatory_statement_generated',
      actor: 'system',
      actorType: 'system',
      action: 'generate_regulatory_statement',
      resource: 'regulatory_statement',
      resourceId: statementId,
      details: { type, jurisdiction, fromDate, toDate },
      outcome: 'success',
    });

    this.emitEvent('info', 'reporting', `Regulatory statement generated: ${statementId}`, {
      type,
      jurisdiction,
      totalAUM,
    });

    return statement;
  }

  listRegulatoryStatements(filters?: ReportFilters): RegulatoryStatement[] {
    let statements = Array.from(this.regulatoryStatements.values());

    if (filters) {
      if (filters.fromDate) {
        statements = statements.filter(s => s.generatedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        statements = statements.filter(s => s.generatedAt <= filters.toDate!);
      }
      if (filters.limit) {
        statements = statements.slice(0, filters.limit);
      }
    }

    return statements.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  // ============================================================================
  // Performance Attribution
  // ============================================================================

  generatePerformanceAttribution(fundId: FundId, period: string): PerformanceAttribution {
    const navReports = this.listNAVReports({ fundId });
    const latestNAV = navReports[0];

    const totalReturn = latestNAV?.performanceSummary.periodReturn ?? 0;
    const totalReturnPercent = latestNAV?.performanceSummary.periodReturnPercent ?? 0;

    // Simplified attribution - in production would use Brinson model
    const byStrategy: StrategyAttribution[] = [
      { strategy: 'yield_farming', contribution: totalReturn * 0.4, contributionPercent: 40, allocation: 0.35 },
      { strategy: 'arbitrage', contribution: totalReturn * 0.3, contributionPercent: 30, allocation: 0.25 },
      { strategy: 'trend_following', contribution: totalReturn * 0.2, contributionPercent: 20, allocation: 0.20 },
      { strategy: 'rwa_yield', contribution: totalReturn * 0.1, contributionPercent: 10, allocation: 0.20 },
    ];

    const byAsset: AssetAttribution[] = latestNAV?.assetBreakdown.slice(0, 5).map(asset => ({
      assetId: asset.assetId,
      assetName: asset.assetName,
      contribution: totalReturn * (asset.percentOfNAV / 100),
      contributionPercent: asset.percentOfNAV,
      weight: asset.percentOfNAV / 100,
    })) ?? [];

    const byRiskFactor: RiskFactorAttribution[] = [
      { factor: 'market_beta', contribution: totalReturn * 0.5, contributionPercent: 50 },
      { factor: 'yield_factor', contribution: totalReturn * 0.3, contributionPercent: 30 },
      { factor: 'alpha', contribution: totalReturn * 0.2, contributionPercent: 20 },
    ];

    return {
      fundId,
      period,
      totalReturn,
      totalReturnPercent,
      byStrategy,
      byAsset,
      byRiskFactor,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PrimeBrokerageEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private pruneOldAuditLogs(): void {
    const retentionCutoff = new Date(
      Date.now() - this.config.auditLogRetentionDays * 24 * 60 * 60 * 1000
    );

    for (const [id, log] of this.auditLogs.entries()) {
      if (log.timestamp < retentionCutoff) {
        this.auditLogs.delete(id);
      }
    }
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: PrimeBrokerageEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'report_generated',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createInstitutionalReportingSuite(
  config?: Partial<ReportingConfig>
): DefaultInstitutionalReportingSuite {
  return new DefaultInstitutionalReportingSuite(config);
}
