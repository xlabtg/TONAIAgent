/**
 * TONAIAgent - Security and Governance Module
 *
 * Provides data validation, manipulation detection, access control,
 * and comprehensive audit logging for the data platform.
 */

import {
  SecurityConfig,
  DataValidationResult,
  ValidationError,
  ValidationWarning,
  ManipulationAlert,
  ManipulationType,
  Evidence,
  AccessPolicy,
  AccessCondition,
  AuditLogEntry,
  DataPlatformEvent,
  DataPlatformEventCallback,
} from './types';

// ============================================================================
// Security and Governance Service
// ============================================================================

export interface SecurityGovernanceService {
  // Data validation
  validateData(data: unknown, schema?: ValidationSchema): DataValidationResult;
  validatePrice(price: PriceData, historicalData?: PriceData[]): DataValidationResult;
  validateTransaction(tx: TransactionData): DataValidationResult;

  // Manipulation detection
  detectManipulation(params: ManipulationDetectionParams): Promise<ManipulationAlert[]>;
  getActiveAlerts(): ManipulationAlert[];
  acknowledgeAlert(alertId: string): void;
  reportSuspiciousActivity(params: SuspiciousActivityReport): Promise<ManipulationAlert>;

  // Access control
  createPolicy(policy: AccessPolicy): void;
  updatePolicy(policyId: string, updates: Partial<AccessPolicy>): void;
  deletePolicy(policyId: string): void;
  getPolicy(policyId: string): AccessPolicy | undefined;
  listPolicies(resource?: string): AccessPolicy[];
  checkAccess(params: AccessCheckParams): AccessCheckResult;

  // Audit logging
  logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry;
  getAuditLogs(params: AuditLogQuery): AuditLogEntry[];
  exportAuditLogs(params: AuditLogQuery, format: 'json' | 'csv'): string;

  // Configuration
  configure(config: Partial<SecurityConfig>): void;

  // Events
  onEvent(callback: DataPlatformEventCallback): void;
}

// ============================================================================
// Additional Types
// ============================================================================

export interface ValidationSchema {
  name: string;
  fields: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'timestamp';
    required: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
  }[];
}

export interface PriceData {
  asset: string;
  price: number;
  timestamp: Date;
  source: string;
  volume?: number;
}

export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: Date;
  type?: string;
}

export interface ManipulationDetectionParams {
  asset: string;
  dataType: 'price' | 'volume' | 'transaction';
  lookbackPeriod?: number; // hours
  sensitivity?: 'low' | 'medium' | 'high';
}

export interface SuspiciousActivityReport {
  type: ManipulationType;
  asset: string;
  description: string;
  evidence: Evidence[];
  reportedBy: string;
}

export interface AccessCheckParams {
  principal: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  context?: Record<string, unknown>;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  matchedPolicy?: string;
  conditions?: AccessCondition[];
}

export interface AuditLogQuery {
  startTime?: Date;
  endTime?: Date;
  principal?: string;
  resource?: string;
  action?: string;
  outcome?: 'success' | 'failure' | 'denied';
  limit?: number;
  offset?: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultSecurityGovernanceService implements SecurityGovernanceService {
  private config: SecurityConfig;
  private readonly policies: Map<string, AccessPolicy> = new Map();
  private readonly alerts: Map<string, ManipulationAlert> = new Map();
  private readonly auditLogs: AuditLogEntry[] = [];
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      validationEnabled: config?.validationEnabled ?? true,
      manipulationDetectionEnabled: config?.manipulationDetectionEnabled ?? true,
      accessControlEnabled: config?.accessControlEnabled ?? true,
      encryptionEnabled: config?.encryptionEnabled ?? true,
      auditLoggingEnabled: config?.auditLoggingEnabled ?? true,
    };

    this.initializeDefaultPolicies();
  }

  // Data Validation
  validateData(data: unknown, schema?: ValidationSchema): DataValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!this.config.validationEnabled) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        timestamp: new Date(),
        source: 'validation-service',
      };
    }

    if (data === null || data === undefined) {
      errors.push({
        field: 'data',
        code: 'NULL_DATA',
        message: 'Data cannot be null or undefined',
        severity: 'error',
      });
      return {
        valid: false,
        errors,
        warnings,
        timestamp: new Date(),
        source: 'validation-service',
      };
    }

    if (schema && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;

      for (const field of schema.fields) {
        const value = dataObj[field.name];

        // Check required
        if (field.required && (value === undefined || value === null)) {
          errors.push({
            field: field.name,
            code: 'REQUIRED_FIELD',
            message: `${field.name} is required`,
            severity: 'error',
          });
          continue;
        }

        if (value === undefined || value === null) continue;

        // Check type
        const actualType = typeof value;
        if (field.type === 'array' && !Array.isArray(value)) {
          errors.push({
            field: field.name,
            code: 'TYPE_MISMATCH',
            message: `${field.name} should be an array`,
            severity: 'error',
          });
        } else if (field.type === 'timestamp' && !(value instanceof Date) && typeof value !== 'string') {
          errors.push({
            field: field.name,
            code: 'TYPE_MISMATCH',
            message: `${field.name} should be a timestamp`,
            severity: 'error',
          });
        } else if (field.type !== 'array' && field.type !== 'timestamp' && actualType !== field.type) {
          errors.push({
            field: field.name,
            code: 'TYPE_MISMATCH',
            message: `${field.name} should be ${field.type}, got ${actualType}`,
            severity: 'error',
          });
        }

        // Check numeric constraints
        if (field.type === 'number' && typeof value === 'number') {
          if (field.min !== undefined && value < field.min) {
            errors.push({
              field: field.name,
              code: 'MIN_VALUE',
              message: `${field.name} should be at least ${field.min}`,
              severity: 'error',
            });
          }
          if (field.max !== undefined && value > field.max) {
            errors.push({
              field: field.name,
              code: 'MAX_VALUE',
              message: `${field.name} should be at most ${field.max}`,
              severity: 'error',
            });
          }
        }

        // Check enum
        if (field.enum && !field.enum.includes(value)) {
          errors.push({
            field: field.name,
            code: 'INVALID_ENUM',
            message: `${field.name} must be one of: ${field.enum.join(', ')}`,
            severity: 'error',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
      source: 'validation-service',
    };
  }

  validatePrice(price: PriceData, historicalData?: PriceData[]): DataValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (price.price <= 0) {
      errors.push({
        field: 'price',
        code: 'INVALID_PRICE',
        message: 'Price must be positive',
        severity: 'error',
      });
    }

    if (!price.source) {
      warnings.push({
        field: 'source',
        code: 'MISSING_SOURCE',
        message: 'Price source is missing',
      });
    }

    // Check for anomalies against historical data
    if (historicalData && historicalData.length > 0) {
      const avgPrice = historicalData.reduce((sum, p) => sum + p.price, 0) / historicalData.length;
      const deviation = Math.abs(price.price - avgPrice) / avgPrice;

      if (deviation > 0.5) {
        errors.push({
          field: 'price',
          code: 'ANOMALOUS_PRICE',
          message: `Price deviates ${(deviation * 100).toFixed(1)}% from historical average`,
          severity: 'critical',
        });
      } else if (deviation > 0.2) {
        warnings.push({
          field: 'price',
          code: 'UNUSUAL_PRICE',
          message: `Price deviates ${(deviation * 100).toFixed(1)}% from historical average`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
      source: 'price-validation',
    };
  }

  validateTransaction(tx: TransactionData): DataValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!tx.hash || tx.hash.length < 32) {
      errors.push({
        field: 'hash',
        code: 'INVALID_HASH',
        message: 'Transaction hash is invalid',
        severity: 'error',
      });
    }

    if (!tx.from || !tx.to) {
      errors.push({
        field: tx.from ? 'to' : 'from',
        code: 'MISSING_ADDRESS',
        message: 'Transaction addresses are required',
        severity: 'error',
      });
    }

    const value = BigInt(tx.value || '0');
    if (value < 0n) {
      errors.push({
        field: 'value',
        code: 'NEGATIVE_VALUE',
        message: 'Transaction value cannot be negative',
        severity: 'error',
      });
    }

    // Check for suspicious patterns
    if (tx.from === tx.to) {
      warnings.push({
        field: 'addresses',
        code: 'SELF_TRANSFER',
        message: 'Transaction is a self-transfer',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
      source: 'transaction-validation',
    };
  }

  // Manipulation Detection
  async detectManipulation(params: ManipulationDetectionParams): Promise<ManipulationAlert[]> {
    if (!this.config.manipulationDetectionEnabled) {
      return [];
    }

    const detectedAlerts: ManipulationAlert[] = [];
    const manipulationTypes: ManipulationType[] = [
      'wash_trading',
      'spoofing',
      'pump_dump',
      'front_running',
    ];

    // Simulate detection based on sensitivity
    const detectionProbability =
      params.sensitivity === 'high' ? 0.3 :
        params.sensitivity === 'medium' ? 0.15 :
          0.05;

    for (const type of manipulationTypes) {
      if (Math.random() < detectionProbability) {
        const alert = this.createManipulationAlert(params.asset, type);
        this.alerts.set(alert.id, alert);
        detectedAlerts.push(alert);

        this.emitEvent('manipulation_detected', 'security', {
          alertId: alert.id,
          type,
          asset: params.asset,
        });
      }
    }

    return detectedAlerts;
  }

  getActiveAlerts(): ManipulationAlert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.acknowledged);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  async reportSuspiciousActivity(params: SuspiciousActivityReport): Promise<ManipulationAlert> {
    const alert: ManipulationAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: params.type,
      severity: 'high',
      asset: params.asset,
      description: params.description,
      evidence: params.evidence,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.set(alert.id, alert);

    this.emitEvent('manipulation_detected', 'security', {
      alertId: alert.id,
      type: params.type,
      asset: params.asset,
      reportedBy: params.reportedBy,
    });

    return alert;
  }

  // Access Control
  createPolicy(policy: AccessPolicy): void {
    this.policies.set(policy.id, policy);

    this.logAction({
      action: 'create_policy',
      resource: `policy:${policy.id}`,
      principal: 'system',
      outcome: 'success',
      details: { policyName: policy.name },
    });
  }

  updatePolicy(policyId: string, updates: Partial<AccessPolicy>): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      Object.assign(policy, updates);

      this.logAction({
        action: 'update_policy',
        resource: `policy:${policyId}`,
        principal: 'system',
        outcome: 'success',
        details: { updates },
      });
    }
  }

  deletePolicy(policyId: string): void {
    this.policies.delete(policyId);

    this.logAction({
      action: 'delete_policy',
      resource: `policy:${policyId}`,
      principal: 'system',
      outcome: 'success',
      details: {},
    });
  }

  getPolicy(policyId: string): AccessPolicy | undefined {
    return this.policies.get(policyId);
  }

  listPolicies(resource?: string): AccessPolicy[] {
    let policies = Array.from(this.policies.values());
    if (resource) {
      policies = policies.filter((p) => p.resource === resource || p.resource === '*');
    }
    return policies;
  }

  checkAccess(params: AccessCheckParams): AccessCheckResult {
    if (!this.config.accessControlEnabled) {
      return {
        allowed: true,
        reason: 'Access control is disabled',
      };
    }

    // Find matching policies
    const matchingPolicies = this.listPolicies(params.resource).filter(
      (p) =>
        (p.principals.includes(params.principal) || p.principals.includes('*')) &&
        (p.action === params.action || p.action === 'admin')
    );

    if (matchingPolicies.length === 0) {
      this.logAction({
        action: params.action,
        resource: params.resource,
        principal: params.principal,
        outcome: 'denied',
        details: { reason: 'No matching policy' },
      });

      return {
        allowed: false,
        reason: 'No matching access policy',
      };
    }

    // Check conditions
    for (const policy of matchingPolicies) {
      if (!policy.conditions || policy.conditions.length === 0) {
        this.logAction({
          action: params.action,
          resource: params.resource,
          principal: params.principal,
          outcome: 'success',
          details: { matchedPolicy: policy.id },
        });

        return {
          allowed: true,
          reason: 'Access granted by policy',
          matchedPolicy: policy.id,
        };
      }

      // Evaluate conditions
      const conditionsMet = policy.conditions.every((condition) =>
        this.evaluateCondition(condition, params.context ?? {})
      );

      if (conditionsMet) {
        this.logAction({
          action: params.action,
          resource: params.resource,
          principal: params.principal,
          outcome: 'success',
          details: { matchedPolicy: policy.id },
        });

        return {
          allowed: true,
          reason: 'Access granted by policy with conditions',
          matchedPolicy: policy.id,
          conditions: policy.conditions,
        };
      }
    }

    this.logAction({
      action: params.action,
      resource: params.resource,
      principal: params.principal,
      outcome: 'denied',
      details: { reason: 'Conditions not met' },
    });

    return {
      allowed: false,
      reason: 'Access policy conditions not met',
    };
  }

  // Audit Logging
  logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    if (!this.config.auditLoggingEnabled) {
      return { ...entry, id: '', timestamp: new Date() };
    }

    const logEntry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      ...entry,
    };

    this.auditLogs.push(logEntry);

    // Keep only last 10000 entries
    if (this.auditLogs.length > 10000) {
      this.auditLogs.shift();
    }

    return logEntry;
  }

  getAuditLogs(params: AuditLogQuery): AuditLogEntry[] {
    let logs = [...this.auditLogs];

    if (params.startTime) {
      logs = logs.filter((l) => l.timestamp >= params.startTime!);
    }
    if (params.endTime) {
      logs = logs.filter((l) => l.timestamp <= params.endTime!);
    }
    if (params.principal) {
      logs = logs.filter((l) => l.principal === params.principal);
    }
    if (params.resource) {
      logs = logs.filter((l) => l.resource.includes(params.resource!));
    }
    if (params.action) {
      logs = logs.filter((l) => l.action === params.action);
    }
    if (params.outcome) {
      logs = logs.filter((l) => l.outcome === params.outcome);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;

    return logs.slice(offset, offset + limit);
  }

  exportAuditLogs(params: AuditLogQuery, format: 'json' | 'csv'): string {
    const logs = this.getAuditLogs(params);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = ['id', 'timestamp', 'action', 'resource', 'principal', 'outcome', 'ipAddress'];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.action,
      log.resource,
      log.principal,
      log.outcome,
      log.ipAddress ?? '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  configure(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeDefaultPolicies(): void {
    const defaultPolicies: AccessPolicy[] = [
      {
        id: 'admin-full-access',
        name: 'Admin Full Access',
        resource: '*',
        action: 'admin',
        principals: ['admin'],
      },
      {
        id: 'user-read-signals',
        name: 'User Read Signals',
        resource: 'signals',
        action: 'read',
        principals: ['*'],
      },
      {
        id: 'user-read-market-data',
        name: 'User Read Market Data',
        resource: 'market-data',
        action: 'read',
        principals: ['*'],
      },
    ];

    for (const policy of defaultPolicies) {
      this.policies.set(policy.id, policy);
    }
  }

  private createManipulationAlert(asset: string, type: ManipulationType): ManipulationAlert {
    const severityMap: Record<ManipulationType, ManipulationAlert['severity']> = {
      wash_trading: 'medium',
      spoofing: 'high',
      pump_dump: 'critical',
      front_running: 'high',
      data_poisoning: 'critical',
      oracle_manipulation: 'critical',
    };

    const descriptionMap: Record<ManipulationType, string> = {
      wash_trading: 'Detected potential wash trading activity with circular transactions',
      spoofing: 'Large orders placed and cancelled rapidly to manipulate prices',
      pump_dump: 'Coordinated buying followed by rapid selling detected',
      front_running: 'Suspicious transactions appearing before large orders',
      data_poisoning: 'Abnormal data patterns suggesting manipulation of data feeds',
      oracle_manipulation: 'Price oracle showing deviations from market consensus',
    };

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      severity: severityMap[type],
      asset,
      description: descriptionMap[type],
      evidence: [
        {
          type: 'statistical',
          data: { zscore: 3 + Math.random() * 2, anomalyScore: 0.8 + Math.random() * 0.15 },
          confidence: 0.7 + Math.random() * 0.2,
        },
      ],
      timestamp: new Date(),
      acknowledged: false,
    };
  }

  private evaluateCondition(condition: AccessCondition, context: Record<string, unknown>): boolean {
    const contextValue = context[condition.type];

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'contains':
        return typeof contextValue === 'string' && contextValue.includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'between':
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          const [min, max] = condition.value as number[];
          return typeof contextValue === 'number' && contextValue >= min && contextValue <= max;
        }
        return false;
      default:
        return false;
    }
  }

  private emitEvent(
    type: DataPlatformEvent['type'],
    category: DataPlatformEvent['category'],
    data: Record<string, unknown>
  ): void {
    const event: DataPlatformEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      data,
      source: 'security-governance',
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

export function createSecurityGovernanceService(
  config?: Partial<SecurityConfig>
): DefaultSecurityGovernanceService {
  return new DefaultSecurityGovernanceService(config);
}
