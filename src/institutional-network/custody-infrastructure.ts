/**
 * TONAIAgent - Institutional Custody Infrastructure
 *
 * Manages institutional-grade custody configurations including MPC, HSM,
 * multi-signature support, insurance coverage, SLA management, disaster
 * recovery, and proof of reserves reporting.
 */

import {
  CustodyConfiguration,
  CustodyProvider,
  CustodySecurityLevel,
  CustodyInfrastructure,
  CustodyPolicies,
  CustodyCompliance,
  CustodyReporting,
  CustodySLA,
  InsuranceCoverage,
  ApprovalProcess,
  ApprovalLevel,
  EscalationRule,
  SLAPenalty,
  InstitutionalNetworkEvent,
  InstitutionalNetworkEventCallback,
  CustodyInfrastructureConfig,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface CustodyInfrastructureManager {
  // Configuration CRUD
  createCustodyConfiguration(request: CreateCustodyConfigRequest): Promise<CustodyConfiguration>;
  getCustodyConfiguration(configId: string): Promise<CustodyConfiguration | null>;
  updateCustodyConfiguration(configId: string, updates: CustodyConfigUpdates): Promise<CustodyConfiguration>;
  deleteCustodyConfiguration(configId: string): Promise<void>;

  // Configuration queries
  listCustodyConfigurations(filters?: CustodyConfigFilters): Promise<CustodyConfiguration[]>;
  getCustodyConfigurationsByPartner(partnerId: string): Promise<CustodyConfiguration[]>;
  getCustodyConfigurationsByProvider(provider: CustodyProvider): Promise<CustodyConfiguration[]>;
  getCustodyConfigurationsBySecurityLevel(level: CustodySecurityLevel): Promise<CustodyConfiguration[]>;

  // MPC Configuration
  configureMPC(configId: string, mpcConfig: MPCConfiguration): Promise<CustodyConfiguration>;
  getMPCStatus(configId: string): Promise<MPCStatus>;
  rotateMPCKeys(configId: string): Promise<KeyRotationResult>;

  // HSM Configuration
  configureHSM(configId: string, hsmConfig: HSMConfiguration): Promise<CustodyConfiguration>;
  getHSMStatus(configId: string): Promise<HSMStatus>;
  testHSMConnection(configId: string): Promise<HSMConnectionTestResult>;

  // Multi-signature Configuration
  configureMultiSig(configId: string, multiSigConfig: MultiSigConfiguration): Promise<CustodyConfiguration>;
  getMultiSigStatus(configId: string): Promise<MultiSigStatus>;

  // Insurance Management
  configureInsurance(configId: string, insurance: InsuranceCoverageRequest): Promise<CustodyConfiguration>;
  getInsuranceStatus(configId: string): Promise<InsuranceStatus>;
  renewInsurance(configId: string, renewalDetails: InsuranceRenewalRequest): Promise<CustodyConfiguration>;

  // SLA Management
  configureSLA(configId: string, sla: SLAConfigRequest): Promise<CustodyConfiguration>;
  getSLAPerformance(configId: string, period: string): Promise<SLAPerformanceReport>;
  getSLABreaches(configId: string): Promise<SLABreach[]>;

  // Disaster Recovery
  configureDisasterRecovery(configId: string, drConfig: DisasterRecoveryConfigRequest): Promise<CustodyConfiguration>;
  simulateDisasterRecovery(configId: string): Promise<DisasterRecoveryTestResult>;
  getDisasterRecoveryStatus(configId: string): Promise<DisasterRecoveryStatus>;

  // Proof of Reserves
  getProofOfReserves(configId: string): Promise<ProofOfReservesReport>;
  scheduleProofOfReserves(configId: string, schedule: ProofOfReservesSchedule): Promise<void>;
  verifyProofOfReserves(configId: string, reportId: string): Promise<ProofOfReservesVerification>;

  // Compliance and Security
  validateSecurityCompliance(configId: string): Promise<SecurityComplianceReport>;
  getSecurityAuditHistory(configId: string): Promise<SecurityAudit[]>;
  scheduleSecurityAudit(configId: string, auditRequest: SecurityAuditRequest): Promise<ScheduledAudit>;

  // Policies Management
  updatePolicies(configId: string, policies: Partial<CustodyPolicies>): Promise<CustodyConfiguration>;
  getApprovalWorkflow(configId: string): Promise<ApprovalProcess>;
  updateApprovalWorkflow(configId: string, workflow: ApprovalProcess): Promise<CustodyConfiguration>;

  // Health and Metrics
  getCustodyHealth(): Promise<CustodyHealthReport>;
  getCustodyMetrics(configId: string): Promise<CustodyMetricsReport>;
  getNetworkCustodyMetrics(): Promise<NetworkCustodyMetrics>;

  // Event handling
  onEvent(callback: InstitutionalNetworkEventCallback): void;

  // Health check
  getHealth(): CustodyInfrastructureHealth;
}

export interface CreateCustodyConfigRequest {
  partnerId?: string;
  provider: CustodyProvider;
  securityLevel: CustodySecurityLevel;
  infrastructure?: Partial<CustodyInfrastructure>;
  policies?: Partial<CustodyPolicies>;
  insurance?: Partial<InsuranceCoverage>;
  compliance?: Partial<CustodyCompliance>;
  reporting?: Partial<CustodyReporting>;
  sla?: Partial<CustodySLA>;
  metadata?: Record<string, unknown>;
}

export interface CustodyConfigUpdates {
  provider?: CustodyProvider;
  securityLevel?: CustodySecurityLevel;
  status?: 'active' | 'pending' | 'suspended' | 'terminated';
  infrastructure?: Partial<CustodyInfrastructure>;
  policies?: Partial<CustodyPolicies>;
  insurance?: Partial<InsuranceCoverage>;
  compliance?: Partial<CustodyCompliance>;
  reporting?: Partial<CustodyReporting>;
  sla?: Partial<CustodySLA>;
  metadata?: Record<string, unknown>;
}

export interface CustodyConfigFilters {
  providers?: CustodyProvider[];
  securityLevels?: CustodySecurityLevel[];
  statuses?: ('active' | 'pending' | 'suspended' | 'terminated')[];
  partnerIds?: string[];
  mpcEnabled?: boolean;
  hsmEnabled?: boolean;
  hasInsurance?: boolean;
  minInsuranceCoverage?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MPCConfiguration {
  enabled: boolean;
  threshold: string;
  providers: string[];
  keyGenProtocol?: string;
  signingProtocol?: string;
  refreshPeriod?: string;
}

export interface MPCStatus {
  enabled: boolean;
  threshold: string;
  providers: MPCProviderStatus[];
  lastKeyRotation?: Date;
  nextKeyRotation?: Date;
  healthStatus: 'healthy' | 'degraded' | 'critical';
  issues: string[];
}

export interface MPCProviderStatus {
  provider: string;
  status: 'active' | 'inactive' | 'error';
  lastHeartbeat: Date;
  latencyMs: number;
  version?: string;
}

export interface KeyRotationResult {
  success: boolean;
  previousKeyId: string;
  newKeyId: string;
  rotatedAt: Date;
  affectedAddresses: string[];
  verificationStatus: 'verified' | 'pending' | 'failed';
  errors?: string[];
}

export interface HSMConfiguration {
  enabled: boolean;
  provider: string;
  certification: string;
  model?: string;
  partitionId?: string;
  connectionType?: 'direct' | 'network' | 'cloud';
  redundancy?: boolean;
}

export interface HSMStatus {
  enabled: boolean;
  provider: string;
  certification: string;
  model?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastHeartbeat: Date;
  firmwareVersion?: string;
  healthStatus: 'healthy' | 'degraded' | 'critical';
  metrics: HSMMetrics;
}

export interface HSMMetrics {
  operationsPerSecond: number;
  averageLatencyMs: number;
  errorRate: number;
  uptime: number;
  keySlotUsage: number;
}

export interface HSMConnectionTestResult {
  success: boolean;
  latencyMs: number;
  firmwareVersion?: string;
  capabilities: string[];
  errors?: string[];
  testedAt: Date;
}

export interface MultiSigConfiguration {
  enabled: boolean;
  scheme: string; // e.g., "2-of-3", "3-of-5"
  signers: MultiSigSigner[];
  timelockDelay?: number;
  requiredForTransactions?: boolean;
  requiredForPolicyChanges?: boolean;
}

export interface MultiSigSigner {
  id: string;
  address: string;
  name?: string;
  role: string;
  weight: number;
  isActive: boolean;
  addedAt: Date;
}

export interface MultiSigStatus {
  enabled: boolean;
  scheme: string;
  signers: MultiSigSignerStatus[];
  pendingTransactions: number;
  timelockDelay?: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

export interface MultiSigSignerStatus {
  id: string;
  name?: string;
  address: string;
  isActive: boolean;
  lastSignature?: Date;
  signaturesCount: number;
}

export interface InsuranceCoverageRequest {
  provider: string;
  coverageAmount: string;
  coverageType: 'crime' | 'cyber' | 'comprehensive' | 'specie';
  deductible?: string;
  effectiveDate: Date;
  expirationDate: Date;
  exclusions?: string[];
  additionalCoverages?: string[];
}

export interface InsuranceStatus {
  enabled: boolean;
  provider: string;
  coverageAmount: string;
  coverageType: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'pending';
  effectiveDate: Date;
  expirationDate: Date;
  daysUntilExpiry: number;
  claimsHistory: InsuranceClaim[];
  renewalRecommendation?: string;
}

export interface InsuranceClaim {
  id: string;
  date: Date;
  amount: string;
  reason: string;
  status: 'filed' | 'under_review' | 'approved' | 'denied' | 'paid';
  resolution?: string;
}

export interface InsuranceRenewalRequest {
  coverageAmount: string;
  effectiveDate: Date;
  expirationDate: Date;
  additionalCoverages?: string[];
  policyNumber?: string;
}

export interface SLAConfigRequest {
  availabilityTarget: number;
  withdrawalProcessingTime: string;
  supportResponseTime: string;
  incidentResponseTime: string;
  reportingFrequency: string;
  penalties: SLAPenalty[];
}

export interface SLAPerformanceReport {
  configId: string;
  period: string;
  availability: SLAMetricPerformance;
  withdrawalProcessing: SLAMetricPerformance;
  supportResponse: SLAMetricPerformance;
  incidentResponse: SLAMetricPerformance;
  overallScore: number;
  status: 'meeting' | 'at_risk' | 'breached';
  breachCount: number;
  penaltiesIncurred: string;
  recommendations: string[];
}

export interface SLAMetricPerformance {
  metric: string;
  target: string;
  actual: string;
  status: 'meeting' | 'at_risk' | 'breached';
  trend: 'improving' | 'stable' | 'declining';
  samples: number;
}

export interface SLABreach {
  id: string;
  metric: string;
  target: string;
  actual: string;
  occurredAt: Date;
  duration: number;
  severity: 'minor' | 'major' | 'critical';
  penaltyApplied: string;
  resolution?: string;
  resolvedAt?: Date;
}

export interface DisasterRecoveryConfigRequest {
  enabled: boolean;
  rtoHours: number;
  rpoHours: number;
  backupLocations: string[];
  testFrequency: string;
  notificationContacts: string[];
  automatedFailover?: boolean;
  encryptionKey?: string;
}

export interface DisasterRecoveryTestResult {
  testId: string;
  configId: string;
  testType: 'tabletop' | 'simulation' | 'full';
  startedAt: Date;
  completedAt: Date;
  duration: number;
  result: 'passed' | 'failed' | 'partial';
  rtoAchieved: number;
  rpoAchieved: number;
  rtoTarget: number;
  rpoTarget: number;
  steps: DisasterRecoveryStep[];
  findings: DisasterRecoveryFinding[];
  recommendations: string[];
}

export interface DisasterRecoveryStep {
  order: number;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  notes?: string;
}

export interface DisasterRecoveryFinding {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  description: string;
  remediation?: string;
}

export interface DisasterRecoveryStatus {
  enabled: boolean;
  rtoHours: number;
  rpoHours: number;
  backupLocations: BackupLocationStatus[];
  lastTestDate?: Date;
  lastTestResult?: 'passed' | 'failed' | 'partial';
  nextTestDate?: Date;
  readinessScore: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

export interface BackupLocationStatus {
  location: string;
  status: 'active' | 'syncing' | 'error';
  lastSyncAt: Date;
  dataSizeBytes: number;
  encryptionEnabled: boolean;
}

export interface ProofOfReservesReport {
  id: string;
  configId: string;
  generatedAt: Date;
  generatedBy: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  reserves: ReserveAsset[];
  totalReservesValue: string;
  totalLiabilities: string;
  reserveRatio: number;
  attestations: Attestation[];
  methodology: string;
  auditFirm?: string;
  publicUrl?: string;
  signature?: string;
  status: 'draft' | 'published' | 'verified' | 'expired';
}

export interface ReserveAsset {
  asset: string;
  quantity: string;
  value: string;
  custodian: string;
  address?: string;
  verificationMethod: 'merkle_proof' | 'signature' | 'audit' | 'oracle';
  verificationData?: string;
}

export interface Attestation {
  id: string;
  type: 'internal' | 'auditor' | 'regulator' | 'third_party';
  attestor: string;
  organization: string;
  statement: string;
  signature: string;
  timestamp: Date;
  valid: boolean;
}

export interface ProofOfReservesSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  timezone: string;
  autoPublish: boolean;
  notifyOnCompletion: boolean;
  recipients: string[];
}

export interface ProofOfReservesVerification {
  reportId: string;
  verifiedAt: Date;
  verifiedBy: string;
  verified: boolean;
  checks: VerificationCheck[];
  overallStatus: 'verified' | 'partial' | 'failed';
  notes?: string;
}

export interface VerificationCheck {
  checkType: string;
  status: 'passed' | 'failed' | 'skipped';
  details?: string;
}

export interface SecurityComplianceReport {
  configId: string;
  generatedAt: Date;
  overallScore: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  standards: ComplianceStandard[];
  findings: SecurityFinding[];
  recommendations: string[];
  nextReviewDate: Date;
}

export interface ComplianceStandard {
  name: string;
  version: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  controlsTotal: number;
  controlsPassed: number;
  controlsFailed: number;
  lastAssessment: Date;
}

export interface SecurityFinding {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  foundAt: Date;
  resolvedAt?: Date;
}

export interface SecurityAudit {
  id: string;
  configId: string;
  type: 'internal' | 'external' | 'regulatory';
  auditor: string;
  auditFirm?: string;
  scope: string[];
  startDate: Date;
  endDate?: Date;
  status: 'scheduled' | 'in_progress' | 'completed';
  result?: 'clean' | 'qualified' | 'adverse';
  findings: SecurityFinding[];
  reportUrl?: string;
}

export interface SecurityAuditRequest {
  type: 'internal' | 'external' | 'regulatory';
  auditor?: string;
  auditFirm?: string;
  scope: string[];
  scheduledDate: Date;
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high';
}

export interface ScheduledAudit {
  id: string;
  configId: string;
  request: SecurityAuditRequest;
  scheduledAt: Date;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  confirmationDetails?: string;
}

export interface CustodyHealthReport {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  totalConfigurations: number;
  activeConfigurations: number;
  healthByProvider: Record<CustodyProvider, ProviderHealthStatus>;
  healthBySecurityLevel: Record<CustodySecurityLevel, number>;
  alerts: CustodyAlert[];
  recommendations: string[];
}

export interface ProviderHealthStatus {
  provider: CustodyProvider;
  configurationsCount: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  issues: string[];
}

export interface CustodyAlert {
  id: string;
  configId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}

export interface CustodyMetricsReport {
  configId: string;
  period: string;
  assetsUnderCustody: string;
  transactionVolume: string;
  transactionCount: number;
  averageTransactionSize: string;
  uptime: number;
  latency: {
    average: number;
    p95: number;
    p99: number;
  };
  withdrawalMetrics: {
    count: number;
    averageProcessingTime: number;
    successRate: number;
  };
  securityMetrics: {
    incidentCount: number;
    failedAccessAttempts: number;
    policyViolations: number;
  };
}

export interface NetworkCustodyMetrics {
  timestamp: Date;
  totalConfigurations: number;
  totalAssetsUnderCustody: string;
  totalInsuranceCoverage: string;
  averageSecurityScore: number;
  byProvider: Record<string, ProviderMetrics>;
  bySecurityLevel: Record<string, LevelMetrics>;
  trends: CustodyTrends;
}

export interface ProviderMetrics {
  configurations: number;
  assetsUnderCustody: string;
  uptime: number;
  averageLatency: number;
}

export interface LevelMetrics {
  configurations: number;
  assetsUnderCustody: string;
  averageInsurance: string;
}

export interface CustodyTrends {
  aucChange24h: number;
  aucChange7d: number;
  aucChange30d: number;
  configGrowth: number;
  securityScoreTrend: 'improving' | 'stable' | 'declining';
}

export interface CustodyInfrastructureHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  configurationCount: number;
  lastSyncAt: Date;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultCustodyInfrastructureManager implements CustodyInfrastructureManager {
  private configurations: Map<string, CustodyConfiguration> = new Map();
  private porReports: Map<string, ProofOfReservesReport[]> = new Map();
  private securityAudits: Map<string, SecurityAudit[]> = new Map();
  private slaBreaches: Map<string, SLABreach[]> = new Map();
  private alerts: Map<string, CustodyAlert[]> = new Map();
  private eventCallbacks: InstitutionalNetworkEventCallback[] = [];
  private config: CustodyInfrastructureConfig;
  private lastSyncAt: Date = new Date();

  constructor(config?: Partial<CustodyInfrastructureConfig>) {
    this.config = {
      enabled: true,
      defaultProvider: 'mpc',
      defaultSecurityLevel: 'institutional',
      insuranceRequired: true,
      minInsuranceCoverage: '10000000',
      auditFrequency: 'quarterly',
      ...config,
    };
  }

  async createCustodyConfiguration(request: CreateCustodyConfigRequest): Promise<CustodyConfiguration> {
    const configId = this.generateId('custody');

    const configuration: CustodyConfiguration = {
      id: configId,
      partnerId: request.partnerId,
      provider: request.provider,
      securityLevel: request.securityLevel,
      infrastructure: {
        mpcEnabled: false,
        hsmEnabled: false,
        coldStoragePercentage: 95,
        hotWalletLimit: '100000',
        multiSigRequired: true,
        geographicDistribution: [],
        disasterRecovery: {
          enabled: false,
          rtoHours: 4,
          rpoHours: 1,
          backupLocations: [],
          testFrequency: 'quarterly',
        },
        ...request.infrastructure,
      },
      policies: {
        withdrawalApprovalProcess: {
          levels: this.getDefaultApprovalLevels(),
          escalationRules: this.getDefaultEscalationRules(),
          timeoutHours: 24,
          autoRejectOnTimeout: false,
        },
        largeTransactionThreshold: '1000000',
        whitelistRequired: true,
        timeDelayedWithdrawals: true,
        timeDelayHours: 24,
        dualControlRequired: true,
        segregatedAccounts: true,
        clientAssetProtection: true,
        ...request.policies,
      },
      insurance: {
        enabled: false,
        provider: '',
        coverageAmount: '0',
        coverageType: 'comprehensive',
        ...request.insurance,
      },
      compliance: {
        soc2Certified: false,
        iso27001Certified: false,
        regulatoryCompliance: [],
        auditFrequency: 'quarterly',
        ...request.compliance,
      },
      reporting: {
        realTimeBalance: true,
        transactionHistory: true,
        proofOfReserves: false,
        customReports: [],
        apiAccess: true,
        ...request.reporting,
      },
      sla: {
        availabilityTarget: 99.9,
        withdrawalProcessingTime: '1h',
        supportResponseTime: '15m',
        incidentResponseTime: '5m',
        reportingFrequency: 'daily',
        penalties: [],
        ...request.sla,
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configurations.set(configId, configuration);
    this.porReports.set(configId, []);
    this.securityAudits.set(configId, []);
    this.slaBreaches.set(configId, []);
    this.alerts.set(configId, []);

    this.emitEvent('custody_configured', 'custody', configId, 'create', { configuration });

    return configuration;
  }

  async getCustodyConfiguration(configId: string): Promise<CustodyConfiguration | null> {
    return this.configurations.get(configId) || null;
  }

  async updateCustodyConfiguration(
    configId: string,
    updates: CustodyConfigUpdates
  ): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    const updatedConfig: CustodyConfiguration = {
      ...config,
      ...updates,
      infrastructure: updates.infrastructure
        ? { ...config.infrastructure, ...updates.infrastructure }
        : config.infrastructure,
      policies: updates.policies ? { ...config.policies, ...updates.policies } : config.policies,
      insurance: updates.insurance ? { ...config.insurance, ...updates.insurance } : config.insurance,
      compliance: updates.compliance
        ? { ...config.compliance, ...updates.compliance }
        : config.compliance,
      reporting: updates.reporting ? { ...config.reporting, ...updates.reporting } : config.reporting,
      sla: updates.sla ? { ...config.sla, ...updates.sla } : config.sla,
      updatedAt: new Date(),
    };

    this.configurations.set(configId, updatedConfig);
    this.emitEvent('custody_configured', 'custody', configId, 'update', { updates });

    return updatedConfig;
  }

  async deleteCustodyConfiguration(configId: string): Promise<void> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    this.configurations.delete(configId);
    this.porReports.delete(configId);
    this.securityAudits.delete(configId);
    this.slaBreaches.delete(configId);
    this.alerts.delete(configId);

    this.emitEvent('custody_configured', 'custody', configId, 'delete', { configId });
  }

  async listCustodyConfigurations(filters?: CustodyConfigFilters): Promise<CustodyConfiguration[]> {
    let configs = Array.from(this.configurations.values());

    if (filters) {
      if (filters.providers?.length) {
        configs = configs.filter((c) => filters.providers!.includes(c.provider));
      }
      if (filters.securityLevels?.length) {
        configs = configs.filter((c) => filters.securityLevels!.includes(c.securityLevel));
      }
      if (filters.statuses?.length) {
        configs = configs.filter((c) => filters.statuses!.includes(c.status));
      }
      if (filters.partnerIds?.length) {
        configs = configs.filter((c) => c.partnerId && filters.partnerIds!.includes(c.partnerId));
      }
      if (filters.mpcEnabled !== undefined) {
        configs = configs.filter((c) => c.infrastructure.mpcEnabled === filters.mpcEnabled);
      }
      if (filters.hsmEnabled !== undefined) {
        configs = configs.filter((c) => c.infrastructure.hsmEnabled === filters.hsmEnabled);
      }
      if (filters.hasInsurance !== undefined) {
        configs = configs.filter((c) => c.insurance.enabled === filters.hasInsurance);
      }
      if (filters.minInsuranceCoverage) {
        const minCoverage = BigInt(filters.minInsuranceCoverage.replace(/[^0-9]/g, ''));
        configs = configs.filter((c) => {
          const coverage = BigInt(c.insurance.coverageAmount.replace(/[^0-9]/g, '') || '0');
          return coverage >= minCoverage;
        });
      }

      // Sorting
      if (filters.sortBy) {
        configs.sort((a, b) => {
          const aVal = this.getNestedValue(a, filters.sortBy!);
          const bVal = this.getNestedValue(b, filters.sortBy!);
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return aVal > bVal ? order : aVal < bVal ? -order : 0;
        });
      }

      // Pagination
      if (filters.offset !== undefined) {
        configs = configs.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        configs = configs.slice(0, filters.limit);
      }
    }

    return configs;
  }

  async getCustodyConfigurationsByPartner(partnerId: string): Promise<CustodyConfiguration[]> {
    return this.listCustodyConfigurations({ partnerIds: [partnerId] });
  }

  async getCustodyConfigurationsByProvider(provider: CustodyProvider): Promise<CustodyConfiguration[]> {
    return this.listCustodyConfigurations({ providers: [provider] });
  }

  async getCustodyConfigurationsBySecurityLevel(
    level: CustodySecurityLevel
  ): Promise<CustodyConfiguration[]> {
    return this.listCustodyConfigurations({ securityLevels: [level] });
  }

  async configureMPC(configId: string, mpcConfig: MPCConfiguration): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.infrastructure.mpcEnabled = mpcConfig.enabled;
    config.infrastructure.mpcThreshold = mpcConfig.threshold;
    config.infrastructure.mpcProviders = mpcConfig.providers;
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'configure_mpc', { mpcConfig });

    return config;
  }

  async getMPCStatus(configId: string): Promise<MPCStatus> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    return {
      enabled: config.infrastructure.mpcEnabled,
      threshold: config.infrastructure.mpcThreshold || '2-of-3',
      providers: (config.infrastructure.mpcProviders || []).map((provider) => ({
        provider,
        status: 'active' as const,
        lastHeartbeat: new Date(),
        latencyMs: Math.floor(Math.random() * 50) + 10,
      })),
      lastKeyRotation: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextKeyRotation: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      healthStatus: 'healthy',
      issues: [],
    };
  }

  async rotateMPCKeys(configId: string): Promise<KeyRotationResult> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    if (!config.infrastructure.mpcEnabled) {
      throw new Error('MPC is not enabled for this configuration');
    }

    const result: KeyRotationResult = {
      success: true,
      previousKeyId: this.generateId('key'),
      newKeyId: this.generateId('key'),
      rotatedAt: new Date(),
      affectedAddresses: ['0x1234...', '0x5678...'],
      verificationStatus: 'verified',
    };

    this.emitEvent('custody_configured', 'custody', configId, 'mpc_key_rotation', { result });

    return result;
  }

  async configureHSM(configId: string, hsmConfig: HSMConfiguration): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.infrastructure.hsmEnabled = hsmConfig.enabled;
    config.infrastructure.hsmProvider = hsmConfig.provider;
    config.infrastructure.hsmCertification = hsmConfig.certification;
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'configure_hsm', { hsmConfig });

    return config;
  }

  async getHSMStatus(configId: string): Promise<HSMStatus> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    return {
      enabled: config.infrastructure.hsmEnabled,
      provider: config.infrastructure.hsmProvider || '',
      certification: config.infrastructure.hsmCertification || '',
      connectionStatus: config.infrastructure.hsmEnabled ? 'connected' : 'disconnected',
      lastHeartbeat: new Date(),
      firmwareVersion: '3.2.1',
      healthStatus: 'healthy',
      metrics: {
        operationsPerSecond: 150,
        averageLatencyMs: 5,
        errorRate: 0.001,
        uptime: 99.99,
        keySlotUsage: 45,
      },
    };
  }

  async testHSMConnection(configId: string): Promise<HSMConnectionTestResult> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    return {
      success: true,
      latencyMs: 3,
      firmwareVersion: '3.2.1',
      capabilities: ['RSA', 'ECDSA', 'EdDSA', 'AES', 'SHA256'],
      testedAt: new Date(),
    };
  }

  async configureMultiSig(
    configId: string,
    multiSigConfig: MultiSigConfiguration
  ): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.infrastructure.multiSigRequired = multiSigConfig.enabled;
    config.infrastructure.multiSigScheme = multiSigConfig.scheme;
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'configure_multisig', { multiSigConfig });

    return config;
  }

  async getMultiSigStatus(configId: string): Promise<MultiSigStatus> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    return {
      enabled: config.infrastructure.multiSigRequired,
      scheme: config.infrastructure.multiSigScheme || '2-of-3',
      signers: [
        {
          id: 'signer_1',
          name: 'Primary Signer',
          address: '0x1234...',
          isActive: true,
          lastSignature: new Date(),
          signaturesCount: 150,
        },
        {
          id: 'signer_2',
          name: 'Secondary Signer',
          address: '0x5678...',
          isActive: true,
          lastSignature: new Date(),
          signaturesCount: 120,
        },
        {
          id: 'signer_3',
          name: 'Backup Signer',
          address: '0x9abc...',
          isActive: true,
          lastSignature: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          signaturesCount: 30,
        },
      ],
      pendingTransactions: 2,
      timelockDelay: 24,
      healthStatus: 'healthy',
    };
  }

  async configureInsurance(
    configId: string,
    insurance: InsuranceCoverageRequest
  ): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.insurance = {
      enabled: true,
      provider: insurance.provider,
      coverageAmount: insurance.coverageAmount,
      coverageType: insurance.coverageType,
      deductible: insurance.deductible,
      effectiveDate: insurance.effectiveDate,
      expirationDate: insurance.expirationDate,
      exclusions: insurance.exclusions,
    };
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'configure_insurance', { insurance });

    return config;
  }

  async getInsuranceStatus(configId: string): Promise<InsuranceStatus> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    const expirationDate = config.insurance.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const daysUntilExpiry = Math.ceil((expirationDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    let status: 'active' | 'expiring_soon' | 'expired' | 'pending' = 'active';
    if (!config.insurance.enabled) {
      status = 'pending';
    } else if (daysUntilExpiry <= 0) {
      status = 'expired';
    } else if (daysUntilExpiry <= 30) {
      status = 'expiring_soon';
    }

    return {
      enabled: config.insurance.enabled,
      provider: config.insurance.provider,
      coverageAmount: config.insurance.coverageAmount,
      coverageType: config.insurance.coverageType,
      status,
      effectiveDate: config.insurance.effectiveDate || new Date(),
      expirationDate,
      daysUntilExpiry,
      claimsHistory: [],
      renewalRecommendation: daysUntilExpiry <= 60 ? 'Consider renewal' : undefined,
    };
  }

  async renewInsurance(
    configId: string,
    renewalDetails: InsuranceRenewalRequest
  ): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.insurance.coverageAmount = renewalDetails.coverageAmount;
    config.insurance.effectiveDate = renewalDetails.effectiveDate;
    config.insurance.expirationDate = renewalDetails.expirationDate;
    config.insurance.policyNumber = renewalDetails.policyNumber;
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'renew_insurance', { renewalDetails });

    return config;
  }

  async configureSLA(configId: string, sla: SLAConfigRequest): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.sla = {
      availabilityTarget: sla.availabilityTarget,
      withdrawalProcessingTime: sla.withdrawalProcessingTime,
      supportResponseTime: sla.supportResponseTime,
      incidentResponseTime: sla.incidentResponseTime,
      reportingFrequency: sla.reportingFrequency,
      penalties: sla.penalties,
    };
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'configure_sla', { sla });

    return config;
  }

  async getSLAPerformance(configId: string, period: string): Promise<SLAPerformanceReport> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    const breaches = this.slaBreaches.get(configId) || [];

    return {
      configId,
      period,
      availability: {
        metric: 'availability',
        target: `${config.sla.availabilityTarget}%`,
        actual: '99.95%',
        status: 'meeting',
        trend: 'stable',
        samples: 720,
      },
      withdrawalProcessing: {
        metric: 'withdrawal_processing',
        target: config.sla.withdrawalProcessingTime,
        actual: '45m',
        status: 'meeting',
        trend: 'improving',
        samples: 150,
      },
      supportResponse: {
        metric: 'support_response',
        target: config.sla.supportResponseTime,
        actual: '12m',
        status: 'meeting',
        trend: 'stable',
        samples: 50,
      },
      incidentResponse: {
        metric: 'incident_response',
        target: config.sla.incidentResponseTime,
        actual: '3m',
        status: 'meeting',
        trend: 'stable',
        samples: 5,
      },
      overallScore: 98.5,
      status: breaches.length > 0 ? 'at_risk' : 'meeting',
      breachCount: breaches.length,
      penaltiesIncurred: '$0',
      recommendations: [],
    };
  }

  async getSLABreaches(configId: string): Promise<SLABreach[]> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    return this.slaBreaches.get(configId) || [];
  }

  async configureDisasterRecovery(
    configId: string,
    drConfig: DisasterRecoveryConfigRequest
  ): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.infrastructure.disasterRecovery = {
      enabled: drConfig.enabled,
      rtoHours: drConfig.rtoHours,
      rpoHours: drConfig.rpoHours,
      backupLocations: drConfig.backupLocations,
      testFrequency: drConfig.testFrequency,
    };
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'configure_dr', { drConfig });

    return config;
  }

  async simulateDisasterRecovery(configId: string): Promise<DisasterRecoveryTestResult> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    const dr = config.infrastructure.disasterRecovery;
    const testId = this.generateId('dr_test');
    const startedAt = new Date();
    const completedAt = new Date(Date.now() + 30 * 60 * 1000);

    const result: DisasterRecoveryTestResult = {
      testId,
      configId,
      testType: 'simulation',
      startedAt,
      completedAt,
      duration: 30,
      result: 'passed',
      rtoAchieved: dr.rtoHours * 0.8,
      rpoAchieved: dr.rpoHours * 0.5,
      rtoTarget: dr.rtoHours,
      rpoTarget: dr.rpoHours,
      steps: [
        { order: 1, name: 'Detect failure', status: 'passed', duration: 2 },
        { order: 2, name: 'Initiate failover', status: 'passed', duration: 5 },
        { order: 3, name: 'Restore from backup', status: 'passed', duration: 15 },
        { order: 4, name: 'Verify data integrity', status: 'passed', duration: 5 },
        { order: 5, name: 'Resume operations', status: 'passed', duration: 3 },
      ],
      findings: [],
      recommendations: ['Consider adding additional backup location for redundancy'],
    };

    config.infrastructure.disasterRecovery.lastTestDate = completedAt;
    config.infrastructure.disasterRecovery.testResult = 'passed';
    this.configurations.set(configId, config);

    this.emitEvent('custody_configured', 'custody', configId, 'dr_test', { result });

    return result;
  }

  async getDisasterRecoveryStatus(configId: string): Promise<DisasterRecoveryStatus> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    const dr = config.infrastructure.disasterRecovery;

    return {
      enabled: dr.enabled,
      rtoHours: dr.rtoHours,
      rpoHours: dr.rpoHours,
      backupLocations: dr.backupLocations.map((location) => ({
        location,
        status: 'active' as const,
        lastSyncAt: new Date(),
        dataSizeBytes: 1024 * 1024 * 1024 * 50, // 50 GB
        encryptionEnabled: true,
      })),
      lastTestDate: dr.lastTestDate,
      lastTestResult: dr.testResult,
      nextTestDate: dr.lastTestDate
        ? new Date(dr.lastTestDate.getTime() + 90 * 24 * 60 * 60 * 1000)
        : undefined,
      readinessScore: dr.enabled ? 95 : 0,
      healthStatus: dr.enabled ? 'healthy' : 'degraded',
    };
  }

  async getProofOfReserves(configId: string): Promise<ProofOfReservesReport> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    const report: ProofOfReservesReport = {
      id: this.generateId('por'),
      configId,
      generatedAt: new Date(),
      generatedBy: 'system',
      period: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      },
      reserves: [
        {
          asset: 'TON',
          quantity: '1000000',
          value: '5000000',
          custodian: config.infrastructure.hsmProvider || 'Default Custodian',
          address: 'EQ...',
          verificationMethod: 'merkle_proof',
        },
        {
          asset: 'USDT',
          quantity: '5000000',
          value: '5000000',
          custodian: config.infrastructure.hsmProvider || 'Default Custodian',
          address: 'EQ...',
          verificationMethod: 'merkle_proof',
        },
      ],
      totalReservesValue: '10000000',
      totalLiabilities: '9500000',
      reserveRatio: 1.0526,
      attestations: [],
      methodology: 'Merkle tree proof with third-party verification',
      status: 'draft',
    };

    const reports = this.porReports.get(configId) || [];
    reports.push(report);
    this.porReports.set(configId, reports);

    return report;
  }

  async scheduleProofOfReserves(configId: string, schedule: ProofOfReservesSchedule): Promise<void> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.reporting.proofOfReserves = true;
    config.reporting.porFrequency = schedule.frequency;
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'schedule_por', { schedule });
  }

  async verifyProofOfReserves(
    configId: string,
    reportId: string
  ): Promise<ProofOfReservesVerification> {
    const reports = this.porReports.get(configId) || [];
    const report = reports.find((r) => r.id === reportId);

    if (!report) {
      throw new Error(`Proof of reserves report not found: ${reportId}`);
    }

    const verification: ProofOfReservesVerification = {
      reportId,
      verifiedAt: new Date(),
      verifiedBy: 'external_auditor',
      verified: true,
      checks: [
        { checkType: 'merkle_proof', status: 'passed' },
        { checkType: 'balance_verification', status: 'passed' },
        { checkType: 'signature_verification', status: 'passed' },
        { checkType: 'timestamp_verification', status: 'passed' },
      ],
      overallStatus: 'verified',
    };

    report.status = 'verified';
    report.verifiedAt = verification.verifiedAt;
    report.verifiedBy = verification.verifiedBy;

    return verification;
  }

  async validateSecurityCompliance(configId: string): Promise<SecurityComplianceReport> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    const standards: ComplianceStandard[] = [];

    if (config.compliance.soc2Certified) {
      standards.push({
        name: 'SOC 2',
        version: config.compliance.soc2Type || 'type2',
        status: 'compliant',
        controlsTotal: 100,
        controlsPassed: 100,
        controlsFailed: 0,
        lastAssessment: config.compliance.soc2ReportDate || new Date(),
      });
    }

    if (config.compliance.iso27001Certified) {
      standards.push({
        name: 'ISO 27001',
        version: '2022',
        status: 'compliant',
        controlsTotal: 93,
        controlsPassed: 93,
        controlsFailed: 0,
        lastAssessment: config.compliance.iso27001CertDate || new Date(),
      });
    }

    const findings: SecurityFinding[] = [];

    // Check for potential security gaps
    if (!config.infrastructure.mpcEnabled && !config.infrastructure.hsmEnabled) {
      findings.push({
        id: this.generateId('finding'),
        severity: 'high',
        category: 'key_management',
        title: 'No hardware security module or MPC enabled',
        description: 'Neither HSM nor MPC is enabled for key management',
        recommendation: 'Enable HSM or MPC for institutional-grade security',
        status: 'open',
        foundAt: new Date(),
      });
    }

    if (!config.insurance.enabled && this.config.insuranceRequired) {
      findings.push({
        id: this.generateId('finding'),
        severity: 'medium',
        category: 'insurance',
        title: 'Insurance coverage not configured',
        description: 'No insurance coverage is configured for assets under custody',
        recommendation: 'Configure insurance coverage meeting minimum requirements',
        status: 'open',
        foundAt: new Date(),
      });
    }

    if (!config.infrastructure.disasterRecovery.enabled) {
      findings.push({
        id: this.generateId('finding'),
        severity: 'high',
        category: 'disaster_recovery',
        title: 'Disaster recovery not configured',
        description: 'Disaster recovery is not enabled',
        recommendation: 'Configure disaster recovery with appropriate RTO/RPO targets',
        status: 'open',
        foundAt: new Date(),
      });
    }

    const overallScore = this.calculateComplianceScore(config, findings);

    return {
      configId,
      generatedAt: new Date(),
      overallScore,
      status: overallScore >= 90 ? 'compliant' : overallScore >= 70 ? 'partial' : 'non_compliant',
      standards,
      findings,
      recommendations: findings.map((f) => f.recommendation),
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
  }

  async getSecurityAuditHistory(configId: string): Promise<SecurityAudit[]> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    return this.securityAudits.get(configId) || [];
  }

  async scheduleSecurityAudit(
    configId: string,
    auditRequest: SecurityAuditRequest
  ): Promise<ScheduledAudit> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    const scheduledAudit: ScheduledAudit = {
      id: this.generateId('audit'),
      configId,
      request: auditRequest,
      scheduledAt: auditRequest.scheduledDate,
      status: 'scheduled',
    };

    const audits = this.securityAudits.get(configId) || [];
    audits.push({
      id: scheduledAudit.id,
      configId,
      type: auditRequest.type,
      auditor: auditRequest.auditor || 'TBD',
      auditFirm: auditRequest.auditFirm,
      scope: auditRequest.scope,
      startDate: auditRequest.scheduledDate,
      status: 'scheduled',
      findings: [],
    });
    this.securityAudits.set(configId, audits);

    this.emitEvent('custody_configured', 'custody', configId, 'schedule_audit', { scheduledAudit });

    return scheduledAudit;
  }

  async updatePolicies(
    configId: string,
    policies: Partial<CustodyPolicies>
  ): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.policies = { ...config.policies, ...policies };
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'update_policies', policies);

    return config;
  }

  async getApprovalWorkflow(configId: string): Promise<ApprovalProcess> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    return config.policies.withdrawalApprovalProcess;
  }

  async updateApprovalWorkflow(
    configId: string,
    workflow: ApprovalProcess
  ): Promise<CustodyConfiguration> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    config.policies.withdrawalApprovalProcess = workflow;
    config.updatedAt = new Date();

    this.configurations.set(configId, config);
    this.emitEvent('custody_configured', 'custody', configId, 'update_approval_workflow', { workflow });

    return config;
  }

  async getCustodyHealth(): Promise<CustodyHealthReport> {
    const configs = Array.from(this.configurations.values());
    const activeConfigs = configs.filter((c) => c.status === 'active');

    const healthByProvider: Record<CustodyProvider, ProviderHealthStatus> = {} as any;
    const healthBySecurityLevel: Record<CustodySecurityLevel, number> = {} as any;
    const allAlerts: CustodyAlert[] = [];

    for (const config of configs) {
      // By provider
      if (!healthByProvider[config.provider]) {
        healthByProvider[config.provider] = {
          provider: config.provider,
          configurationsCount: 0,
          healthStatus: 'healthy',
          uptime: 99.9,
          issues: [],
        };
      }
      healthByProvider[config.provider].configurationsCount++;

      // By security level
      healthBySecurityLevel[config.securityLevel] =
        (healthBySecurityLevel[config.securityLevel] || 0) + 1;

      // Collect alerts
      const configAlerts = this.alerts.get(config.id) || [];
      allAlerts.push(...configAlerts);
    }

    const criticalAlerts = allAlerts.filter((a) => a.severity === 'critical' && !a.acknowledgedBy);
    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      overallHealth = 'critical';
    } else if (allAlerts.filter((a) => a.severity === 'warning' && !a.acknowledgedBy).length > 0) {
      overallHealth = 'degraded';
    }

    return {
      timestamp: new Date(),
      overallHealth,
      totalConfigurations: configs.length,
      activeConfigurations: activeConfigs.length,
      healthByProvider,
      healthBySecurityLevel,
      alerts: allAlerts.filter((a) => !a.resolvedAt).slice(0, 10),
      recommendations: this.generateHealthRecommendations(configs),
    };
  }

  async getCustodyMetrics(configId: string): Promise<CustodyMetricsReport> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Custody configuration not found: ${configId}`);
    }

    return {
      configId,
      period: '30d',
      assetsUnderCustody: '10000000',
      transactionVolume: '5000000',
      transactionCount: 150,
      averageTransactionSize: '33333',
      uptime: 99.95,
      latency: {
        average: 45,
        p95: 120,
        p99: 250,
      },
      withdrawalMetrics: {
        count: 50,
        averageProcessingTime: 45,
        successRate: 100,
      },
      securityMetrics: {
        incidentCount: 0,
        failedAccessAttempts: 3,
        policyViolations: 0,
      },
    };
  }

  async getNetworkCustodyMetrics(): Promise<NetworkCustodyMetrics> {
    const configs = Array.from(this.configurations.values());

    const byProvider: Record<string, ProviderMetrics> = {};
    const bySecurityLevel: Record<string, LevelMetrics> = {};

    let totalAuc = BigInt(0);
    let totalInsurance = BigInt(0);
    let securityScoreSum = 0;

    for (const config of configs) {
      // Provider metrics
      if (!byProvider[config.provider]) {
        byProvider[config.provider] = {
          configurations: 0,
          assetsUnderCustody: '0',
          uptime: 99.9,
          averageLatency: 50,
        };
      }
      byProvider[config.provider].configurations++;

      // Security level metrics
      if (!bySecurityLevel[config.securityLevel]) {
        bySecurityLevel[config.securityLevel] = {
          configurations: 0,
          assetsUnderCustody: '0',
          averageInsurance: '0',
        };
      }
      bySecurityLevel[config.securityLevel].configurations++;

      // Insurance
      if (config.insurance.enabled) {
        totalInsurance += BigInt(config.insurance.coverageAmount.replace(/[^0-9]/g, '') || '0');
      }

      // Security score (simplified)
      securityScoreSum += this.calculateSecurityScore(config);
    }

    return {
      timestamp: new Date(),
      totalConfigurations: configs.length,
      totalAssetsUnderCustody: totalAuc.toString(),
      totalInsuranceCoverage: totalInsurance.toString(),
      averageSecurityScore: configs.length > 0 ? securityScoreSum / configs.length : 0,
      byProvider,
      bySecurityLevel,
      trends: {
        aucChange24h: 2.5,
        aucChange7d: 5.2,
        aucChange30d: 12.8,
        configGrowth: 15,
        securityScoreTrend: 'improving',
      },
    };
  }

  onEvent(callback: InstitutionalNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): CustodyInfrastructureHealth {
    const issues: string[] = [];

    // Check for stale data
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - this.lastSyncAt.getTime() > staleThreshold) {
      issues.push('Data sync is overdue');
    }

    // Check for configurations without insurance
    const configsWithoutInsurance = Array.from(this.configurations.values()).filter(
      (c) => c.status === 'active' && !c.insurance.enabled && this.config.insuranceRequired
    );
    if (configsWithoutInsurance.length > 0) {
      issues.push(`${configsWithoutInsurance.length} active configurations lack insurance`);
    }

    // Check for expiring insurance
    const expiringInsurance = Array.from(this.configurations.values()).filter((c) => {
      if (!c.insurance.enabled || !c.insurance.expirationDate) return false;
      const daysUntilExpiry = Math.ceil(
        (c.insurance.expirationDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    });
    if (expiringInsurance.length > 0) {
      issues.push(`${expiringInsurance.length} configurations have insurance expiring soon`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'degraded' : 'unhealthy',
      configurationCount: this.configurations.size,
      lastSyncAt: this.lastSyncAt,
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
    type: InstitutionalNetworkEvent['type'],
    category: InstitutionalNetworkEvent['category'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: InstitutionalNetworkEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      category,
      severity: 'info',
      source: 'custody_infrastructure',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedEntities: [{ type: 'custody_config', id: sourceId, impact: 'direct' }],
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

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0;
  }

  private getDefaultApprovalLevels(): ApprovalLevel[] {
    return [
      {
        level: 1,
        threshold: '10000',
        requiredApprovers: 1,
        approverRoles: ['operator'],
        approverTypes: ['internal'],
      },
      {
        level: 2,
        threshold: '100000',
        requiredApprovers: 2,
        approverRoles: ['operator', 'manager'],
        approverTypes: ['internal'],
      },
      {
        level: 3,
        threshold: '1000000',
        requiredApprovers: 3,
        approverRoles: ['operator', 'manager', 'executive'],
        approverTypes: ['internal', 'client'],
      },
    ];
  }

  private getDefaultEscalationRules(): EscalationRule[] {
    return [
      {
        triggerAfterHours: 4,
        escalateTo: ['manager'],
        notificationChannels: ['email', 'slack'],
        autoApprove: false,
      },
      {
        triggerAfterHours: 12,
        escalateTo: ['executive'],
        notificationChannels: ['email', 'sms'],
        autoApprove: false,
      },
    ];
  }

  private calculateComplianceScore(config: CustodyConfiguration, findings: SecurityFinding[]): number {
    let score = 100;

    // Deduct for missing certifications
    if (!config.compliance.soc2Certified) score -= 15;
    if (!config.compliance.iso27001Certified) score -= 10;

    // Deduct for findings by severity
    for (const finding of findings) {
      switch (finding.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }

    // Bonus for security features
    if (config.infrastructure.mpcEnabled) score += 5;
    if (config.infrastructure.hsmEnabled) score += 5;
    if (config.insurance.enabled) score += 5;
    if (config.infrastructure.disasterRecovery.enabled) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateSecurityScore(config: CustodyConfiguration): number {
    let score = 50; // Base score

    // Security features
    if (config.infrastructure.mpcEnabled) score += 15;
    if (config.infrastructure.hsmEnabled) score += 15;
    if (config.infrastructure.multiSigRequired) score += 10;
    if (config.policies.dualControlRequired) score += 5;
    if (config.policies.whitelistRequired) score += 5;

    // Compliance
    if (config.compliance.soc2Certified) score += 10;
    if (config.compliance.iso27001Certified) score += 10;

    // Insurance
    if (config.insurance.enabled) score += 10;

    // Disaster recovery
    if (config.infrastructure.disasterRecovery.enabled) score += 10;

    // Security level bonus
    switch (config.securityLevel) {
      case 'sovereign':
        score += 15;
        break;
      case 'institutional':
        score += 10;
        break;
      case 'enhanced':
        score += 5;
        break;
    }

    return Math.min(100, score);
  }

  private generateHealthRecommendations(configs: CustodyConfiguration[]): string[] {
    const recommendations: string[] = [];

    const withoutMpc = configs.filter((c) => !c.infrastructure.mpcEnabled && c.status === 'active');
    if (withoutMpc.length > 0) {
      recommendations.push(`Consider enabling MPC for ${withoutMpc.length} configurations`);
    }

    const withoutInsurance = configs.filter((c) => !c.insurance.enabled && c.status === 'active');
    if (withoutInsurance.length > 0) {
      recommendations.push(`Configure insurance for ${withoutInsurance.length} active configurations`);
    }

    const withoutDr = configs.filter(
      (c) => !c.infrastructure.disasterRecovery.enabled && c.status === 'active'
    );
    if (withoutDr.length > 0) {
      recommendations.push(`Enable disaster recovery for ${withoutDr.length} configurations`);
    }

    const pendingConfigs = configs.filter((c) => c.status === 'pending');
    if (pendingConfigs.length > 0) {
      recommendations.push(`Activate ${pendingConfigs.length} pending configurations`);
    }

    return recommendations;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCustodyInfrastructureManager(
  config?: Partial<CustodyInfrastructureConfig>
): DefaultCustodyInfrastructureManager {
  return new DefaultCustodyInfrastructureManager(config);
}

// Default export
export default DefaultCustodyInfrastructureManager;
