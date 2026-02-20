/**
 * TONAIAgent - Audit Logging and Compliance Layer
 *
 * Implements comprehensive audit trail:
 * - Full transaction logging
 * - Decision traceability
 * - Tamper-proof signatures
 * - Compliance reporting
 * - Data retention policies
 * - Export capabilities
 */

import {
  AuditEvent,
  AuditEventType,
  AuditActor,
  AuditContext,
  AuditConfig,
  SecurityEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface AuditLogger {
  // Logging
  log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'signature'>): Promise<AuditEvent>;
  logBatch(
    events: Array<Omit<AuditEvent, 'id' | 'timestamp' | 'signature'>>
  ): Promise<AuditEvent[]>;

  // Querying
  query(filter: AuditQueryFilter): Promise<AuditQueryResult>;
  getEvent(eventId: string): Promise<AuditEvent | null>;
  getByCorrelationId(correlationId: string): Promise<AuditEvent[]>;

  // Compliance reporting
  generateReport(
    reportType: ReportType,
    dateRange: DateRange,
    options?: ReportOptions
  ): Promise<ComplianceReport>;

  // Export
  export(filter: AuditQueryFilter, format: ExportFormat): Promise<ExportResult>;

  // Integrity
  verifyIntegrity(eventId: string): Promise<IntegrityCheckResult>;
  verifyChain(startDate: Date, endDate: Date): Promise<ChainIntegrityResult>;

  // Configuration
  setConfig(config: Partial<AuditConfig>): void;
  getConfig(): AuditConfig;

  // Events
  onEvent(callback: SecurityEventCallback): void;
}

export interface AuditQueryFilter {
  eventTypes?: AuditEventType[];
  actorTypes?: Array<'user' | 'agent' | 'system' | 'admin'>;
  actorIds?: string[];
  resourceTypes?: string[];
  resourceIds?: string[];
  outcomes?: Array<'success' | 'failure' | 'partial'>;
  severities?: Array<'info' | 'warning' | 'error' | 'critical'>;
  dateRange?: DateRange;
  searchText?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AuditQueryResult {
  events: AuditEvent[];
  totalCount: number;
  hasMore: boolean;
  queryTime: number;
}

export type ReportType =
  | 'daily_summary'
  | 'weekly_summary'
  | 'monthly_summary'
  | 'security_incidents'
  | 'transaction_audit'
  | 'permission_changes'
  | 'compliance_overview';

export interface ReportOptions {
  includeDetails?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'actor' | 'resource';
  filterByAgent?: string[];
  filterByUser?: string[];
}

export interface ComplianceReport {
  id: string;
  type: ReportType;
  generatedAt: Date;
  dateRange: DateRange;
  summary: ReportSummary;
  sections: ReportSection[];
  metadata: Record<string, unknown>;
}

export interface ReportSummary {
  totalEvents: number;
  successfulActions: number;
  failedActions: number;
  securityIncidents: number;
  uniqueActors: number;
  uniqueResources: number;
  highlights: string[];
}

export interface ReportSection {
  title: string;
  description: string;
  data: Record<string, unknown>[];
  charts?: ChartData[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export type ExportFormat = 'json' | 'csv' | 'parquet';

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  eventCount: number;
  filePath?: string;
  data?: string;
  error?: string;
}

export interface IntegrityCheckResult {
  valid: boolean;
  eventId: string;
  expectedSignature: string;
  actualSignature?: string;
  error?: string;
}

export interface ChainIntegrityResult {
  valid: boolean;
  eventsChecked: number;
  invalidEvents: string[];
  gapsDetected: number;
  error?: string;
}

// ============================================================================
// Audit Logger Implementation
// ============================================================================

export class DefaultAuditLogger implements AuditLogger {
  private readonly events = new Map<string, AuditEvent>();
  private readonly eventsByCorrelation = new Map<string, string[]>();
  private readonly config: AuditConfig;
  private readonly eventCallbacks: SecurityEventCallback[] = [];
  private eventCounter = 0;

  constructor(config?: Partial<AuditConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      logLevel: config?.logLevel ?? 'standard',
      retentionDays: config?.retentionDays ?? 365,
      signatureEnabled: config?.signatureEnabled ?? true,
      externalExportEnabled: config?.externalExportEnabled ?? false,
    };
  }

  async log(
    eventData: Omit<AuditEvent, 'id' | 'timestamp' | 'signature'>
  ): Promise<AuditEvent> {
    if (!this.config.enabled) {
      // Return a mock event if logging is disabled
      return { ...eventData, id: 'disabled', timestamp: new Date() };
    }

    const eventId = this.generateEventId();
    const timestamp = new Date();

    const event: AuditEvent = {
      ...eventData,
      id: eventId,
      timestamp,
    };

    // Add tamper-proof signature if enabled
    if (this.config.signatureEnabled) {
      event.signature = this.generateSignature(event);
    }

    // Store event
    this.events.set(eventId, event);

    // Index by correlation ID
    if (event.context.correlationId) {
      const existing = this.eventsByCorrelation.get(event.context.correlationId) ?? [];
      existing.push(eventId);
      this.eventsByCorrelation.set(event.context.correlationId, existing);
    }

    // Cleanup old events based on retention policy
    this.cleanupOldEvents();

    return event;
  }

  async logBatch(
    eventsData: Array<Omit<AuditEvent, 'id' | 'timestamp' | 'signature'>>
  ): Promise<AuditEvent[]> {
    const results: AuditEvent[] = [];
    for (const eventData of eventsData) {
      results.push(await this.log(eventData));
    }
    return results;
  }

  async query(filter: AuditQueryFilter): Promise<AuditQueryResult> {
    const startTime = Date.now();
    let events = Array.from(this.events.values());

    // Apply filters
    if (filter.eventTypes?.length) {
      events = events.filter((e) => filter.eventTypes!.includes(e.eventType));
    }

    if (filter.actorTypes?.length) {
      events = events.filter((e) => filter.actorTypes!.includes(e.actor.type));
    }

    if (filter.actorIds?.length) {
      events = events.filter((e) => filter.actorIds!.includes(e.actor.id));
    }

    if (filter.resourceTypes?.length) {
      events = events.filter((e) => filter.resourceTypes!.includes(e.resource.type));
    }

    if (filter.resourceIds?.length) {
      events = events.filter((e) => filter.resourceIds!.includes(e.resource.id));
    }

    if (filter.outcomes?.length) {
      events = events.filter((e) => filter.outcomes!.includes(e.outcome));
    }

    if (filter.severities?.length) {
      events = events.filter((e) => filter.severities!.includes(e.severity));
    }

    if (filter.dateRange) {
      events = events.filter(
        (e) =>
          e.timestamp >= filter.dateRange!.start && e.timestamp <= filter.dateRange!.end
      );
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      events = events.filter(
        (e) =>
          e.action.toLowerCase().includes(searchLower) ||
          e.resource.type.toLowerCase().includes(searchLower) ||
          e.resource.name?.toLowerCase().includes(searchLower) ||
          JSON.stringify(e.details).toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const sortBy = filter.sortBy ?? 'timestamp';
    const sortOrder = filter.sortOrder ?? 'desc';
    events.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortBy === 'severity') {
        const severityOrder = { info: 0, warning: 1, error: 2, critical: 3 };
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
      } else if (sortBy === 'eventType') {
        comparison = a.eventType.localeCompare(b.eventType);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const totalCount = events.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const paginatedEvents = events.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      totalCount,
      hasMore: offset + limit < totalCount,
      queryTime: Date.now() - startTime,
    };
  }

  async getEvent(eventId: string): Promise<AuditEvent | null> {
    return this.events.get(eventId) ?? null;
  }

  async getByCorrelationId(correlationId: string): Promise<AuditEvent[]> {
    const eventIds = this.eventsByCorrelation.get(correlationId) ?? [];
    return eventIds
      .map((id) => this.events.get(id))
      .filter((e): e is AuditEvent => e !== undefined);
  }

  async generateReport(
    reportType: ReportType,
    dateRange: DateRange,
    options?: ReportOptions
  ): Promise<ComplianceReport> {
    const reportId = `report_${Date.now()}`;
    const events = await this.query({
      dateRange,
      limit: 10000,
    });

    const summary = this.generateSummary(events.events);
    const sections = this.generateReportSections(reportType, events.events, options);

    return {
      id: reportId,
      type: reportType,
      generatedAt: new Date(),
      dateRange,
      summary,
      sections,
      metadata: {
        totalEventsInPeriod: events.totalCount,
        queryTime: events.queryTime,
        options,
      },
    };
  }

  async export(filter: AuditQueryFilter, format: ExportFormat): Promise<ExportResult> {
    const events = await this.query({ ...filter, limit: 100000 });

    try {
      let data: string;

      switch (format) {
        case 'json':
          data = JSON.stringify(events.events, null, 2);
          break;
        case 'csv':
          data = this.eventsToCSV(events.events);
          break;
        case 'parquet':
          // Would use parquet library in production
          data = JSON.stringify(events.events);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      return {
        success: true,
        format,
        eventCount: events.events.length,
        data,
      };
    } catch (error) {
      return {
        success: false,
        format,
        eventCount: 0,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  async verifyIntegrity(eventId: string): Promise<IntegrityCheckResult> {
    const event = this.events.get(eventId);
    if (!event) {
      return {
        valid: false,
        eventId,
        expectedSignature: '',
        error: 'Event not found',
      };
    }

    if (!event.signature) {
      return {
        valid: false,
        eventId,
        expectedSignature: '',
        error: 'Event has no signature',
      };
    }

    const expectedSignature = this.generateSignature(event);

    return {
      valid: event.signature === expectedSignature,
      eventId,
      expectedSignature,
      actualSignature: event.signature,
    };
  }

  async verifyChain(startDate: Date, endDate: Date): Promise<ChainIntegrityResult> {
    const events = await this.query({
      dateRange: { start: startDate, end: endDate },
      sortBy: 'timestamp',
      sortOrder: 'asc',
      limit: 100000,
    });

    const invalidEvents: string[] = [];
    let gapsDetected = 0;

    for (let i = 0; i < events.events.length; i++) {
      const event = events.events[i];

      // Check signature
      if (event.signature) {
        const integrity = await this.verifyIntegrity(event.id);
        if (!integrity.valid) {
          invalidEvents.push(event.id);
        }
      }

      // Check for gaps (more than 24 hours between events)
      if (i > 0) {
        const prevEvent = events.events[i - 1];
        const gap = event.timestamp.getTime() - prevEvent.timestamp.getTime();
        if (gap > 24 * 60 * 60 * 1000) {
          gapsDetected++;
        }
      }
    }

    return {
      valid: invalidEvents.length === 0 && gapsDetected === 0,
      eventsChecked: events.events.length,
      invalidEvents,
      gapsDetected,
    };
  }

  setConfig(config: Partial<AuditConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): AuditConfig {
    return { ...this.config };
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // Helper methods for creating audit events
  static createAuthenticationEvent(
    actor: AuditActor,
    success: boolean,
    method: string,
    context: AuditContext
  ): Omit<AuditEvent, 'id' | 'timestamp' | 'signature'> {
    return {
      eventType: 'authentication',
      actor,
      action: success ? 'login_success' : 'login_failure',
      resource: { type: 'session', id: context.sessionId ?? 'unknown' },
      outcome: success ? 'success' : 'failure',
      severity: success ? 'info' : 'warning',
      details: { method },
      context,
    };
  }

  static createTransactionEvent(
    actor: AuditActor,
    transactionId: string,
    action: string,
    success: boolean,
    details: Record<string, unknown>,
    context: AuditContext
  ): Omit<AuditEvent, 'id' | 'timestamp' | 'signature'> {
    return {
      eventType: 'transaction',
      actor,
      action,
      resource: { type: 'transaction', id: transactionId },
      outcome: success ? 'success' : 'failure',
      severity: success ? 'info' : 'error',
      details,
      context,
    };
  }

  static createPermissionChangeEvent(
    actor: AuditActor,
    agentId: string,
    changeType: string,
    before: unknown,
    after: unknown,
    context: AuditContext
  ): Omit<AuditEvent, 'id' | 'timestamp' | 'signature'> {
    return {
      eventType: 'permission_change',
      actor,
      action: changeType,
      resource: { type: 'agent_permissions', id: agentId },
      outcome: 'success',
      severity: 'warning',
      details: { before, after },
      context,
    };
  }

  static createEmergencyEvent(
    actor: AuditActor,
    emergencyId: string,
    action: string,
    details: Record<string, unknown>,
    context: AuditContext
  ): Omit<AuditEvent, 'id' | 'timestamp' | 'signature'> {
    return {
      eventType: 'emergency_action',
      actor,
      action,
      resource: { type: 'emergency', id: emergencyId },
      outcome: 'success',
      severity: 'critical',
      details,
      context,
    };
  }

  private generateEventId(): string {
    this.eventCounter++;
    return `audit_${Date.now()}_${this.eventCounter.toString(36)}`;
  }

  private generateSignature(event: AuditEvent): string {
    // In production, would use HMAC or asymmetric signature
    const payload = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      actor: event.actor,
      action: event.action,
      resource: event.resource,
      outcome: event.outcome,
    });

    // Simple hash for demonstration
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return `sig_${Math.abs(hash).toString(16)}`;
  }

  private cleanupOldEvents(): void {
    const cutoffDate = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    );

    for (const [eventId, event] of this.events) {
      if (event.timestamp < cutoffDate) {
        this.events.delete(eventId);
      }
    }
  }

  private generateSummary(events: AuditEvent[]): ReportSummary {
    const successfulActions = events.filter((e) => e.outcome === 'success').length;
    const failedActions = events.filter((e) => e.outcome === 'failure').length;
    const securityIncidents = events.filter(
      (e) => e.severity === 'critical' || e.severity === 'error'
    ).length;

    const uniqueActors = new Set(events.map((e) => e.actor.id)).size;
    const uniqueResources = new Set(events.map((e) => e.resource.id)).size;

    const highlights: string[] = [];

    if (failedActions > 0) {
      highlights.push(`${failedActions} failed actions detected`);
    }

    if (securityIncidents > 0) {
      highlights.push(`${securityIncidents} security incidents requiring attention`);
    }

    return {
      totalEvents: events.length,
      successfulActions,
      failedActions,
      securityIncidents,
      uniqueActors,
      uniqueResources,
      highlights,
    };
  }

  private generateReportSections(
    reportType: ReportType,
    events: AuditEvent[],
    _options?: ReportOptions
  ): ReportSection[] {
    const sections: ReportSection[] = [];

    switch (reportType) {
      case 'daily_summary':
      case 'weekly_summary':
      case 'monthly_summary':
        sections.push(this.generateActivitySection(events));
        sections.push(this.generateOutcomesSection(events));
        break;

      case 'security_incidents':
        sections.push(this.generateSecuritySection(events));
        break;

      case 'transaction_audit':
        sections.push(this.generateTransactionSection(events));
        break;

      case 'permission_changes':
        sections.push(this.generatePermissionSection(events));
        break;

      case 'compliance_overview':
        sections.push(this.generateActivitySection(events));
        sections.push(this.generateSecuritySection(events));
        sections.push(this.generatePermissionSection(events));
        break;
    }

    return sections;
  }

  private generateActivitySection(events: AuditEvent[]): ReportSection {
    const byType: Record<string, number> = {};
    for (const event of events) {
      byType[event.eventType] = (byType[event.eventType] ?? 0) + 1;
    }

    return {
      title: 'Activity Overview',
      description: 'Summary of all events by type',
      data: Object.entries(byType).map(([type, count]) => ({ type, count })),
      charts: [
        {
          type: 'bar',
          title: 'Events by Type',
          labels: Object.keys(byType),
          datasets: [
            {
              label: 'Count',
              data: Object.values(byType),
            },
          ],
        },
      ],
    };
  }

  private generateOutcomesSection(events: AuditEvent[]): ReportSection {
    const byOutcome: Record<string, number> = {};
    for (const event of events) {
      byOutcome[event.outcome] = (byOutcome[event.outcome] ?? 0) + 1;
    }

    return {
      title: 'Outcomes Summary',
      description: 'Distribution of action outcomes',
      data: Object.entries(byOutcome).map(([outcome, count]) => ({ outcome, count })),
      charts: [
        {
          type: 'pie',
          title: 'Outcomes Distribution',
          labels: Object.keys(byOutcome),
          datasets: [
            {
              label: 'Count',
              data: Object.values(byOutcome),
            },
          ],
        },
      ],
    };
  }

  private generateSecuritySection(events: AuditEvent[]): ReportSection {
    const securityEvents = events.filter(
      (e) =>
        e.severity === 'critical' ||
        e.severity === 'error' ||
        e.eventType === 'emergency_action'
    );

    return {
      title: 'Security Incidents',
      description: 'Critical and error-level events requiring attention',
      data: securityEvents.map((e) => ({
        timestamp: e.timestamp.toISOString(),
        type: e.eventType,
        action: e.action,
        severity: e.severity,
        actor: e.actor.id,
        resource: e.resource.id,
      })),
    };
  }

  private generateTransactionSection(events: AuditEvent[]): ReportSection {
    const transactionEvents = events.filter((e) => e.eventType === 'transaction');

    return {
      title: 'Transaction Audit',
      description: 'All transaction-related events',
      data: transactionEvents.map((e) => ({
        timestamp: e.timestamp.toISOString(),
        transactionId: e.resource.id,
        action: e.action,
        outcome: e.outcome,
        actor: e.actor.id,
        details: e.details,
      })),
    };
  }

  private generatePermissionSection(events: AuditEvent[]): ReportSection {
    const permissionEvents = events.filter(
      (e) => e.eventType === 'permission_change' || e.eventType === 'authorization'
    );

    return {
      title: 'Permission Changes',
      description: 'All permission and authorization changes',
      data: permissionEvents.map((e) => ({
        timestamp: e.timestamp.toISOString(),
        action: e.action,
        resource: e.resource.id,
        actor: e.actor.id,
        details: e.details,
      })),
    };
  }

  private eventsToCSV(events: AuditEvent[]): string {
    const headers = [
      'id',
      'timestamp',
      'eventType',
      'actor_type',
      'actor_id',
      'action',
      'resource_type',
      'resource_id',
      'outcome',
      'severity',
    ];

    const rows = events.map((e) =>
      [
        e.id,
        e.timestamp.toISOString(),
        e.eventType,
        e.actor.type,
        e.actor.id,
        e.action,
        e.resource.type,
        e.resource.id,
        e.outcome,
        e.severity,
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAuditLogger(config?: Partial<AuditConfig>): DefaultAuditLogger {
  return new DefaultAuditLogger(config);
}
