/**
 * TONAIAgent - Multi-Tenant Security Infrastructure Type Definitions
 *
 * Core types for the Secure Multi-Tenant Agent Infrastructure & Isolation Layer.
 * Supports enterprise-grade tenant isolation, RBAC, secret vault, and wallet isolation.
 *
 * Issue #99: Secure Multi-Tenant Agent Infrastructure & Isolation Layer
 */

// ============================================================================
// Tenant Types
// ============================================================================

export type TenantStatus = 'active' | 'suspended' | 'pending' | 'terminated';

export type TenantTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'dao';

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  tier: TenantTier;
  ownerId: string; // The primary admin user ID
  createdAt: Date;
  updatedAt: Date;
  metadata: TenantMetadata;
  limits: TenantLimits;
  settings: TenantSettings;
}

export interface TenantMetadata {
  description?: string;
  website?: string;
  contactEmail?: string;
  industry?: string;
  companySize?: string;
  country?: string;
  tags?: string[];
}

export interface TenantLimits {
  maxAgents: number;
  maxUsers: number;
  maxWallets: number;
  maxSecretsPerAgent: number;
  maxDailyTransactions: number;
  maxMonthlyVolumeTon: number;
  storageQuotaMb: number;
  apiRateLimitPerMinute: number;
}

export interface TenantSettings {
  enforceMfa: boolean;
  allowedCustodyModes: ('non_custodial' | 'smart_contract_wallet' | 'mpc')[];
  ipWhitelist?: string[];
  dataResidencyRegion?: string;
  auditLogRetentionDays: number;
  complianceMode: 'standard' | 'financial' | 'institutional';
}

export interface CreateTenantInput {
  name: string;
  ownerId: string;
  tier?: TenantTier;
  metadata?: Partial<TenantMetadata>;
  settings?: Partial<TenantSettings>;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  agentId?: string;
  sessionId: string;
  roles: RoleName[];
  permissions: Permission[];
  timestamp: Date;
}

// ============================================================================
// RBAC Types
// ============================================================================

export type RoleName =
  | 'admin'
  | 'user'
  | 'developer'
  | 'enterprise'
  | 'dao_operator'
  | 'auditor'
  | 'readonly';

export interface Role {
  name: RoleName;
  displayName: string;
  description: string;
  permissions: Permission[];
  inherits?: RoleName[];
  isSystemRole: boolean;
}

export type ResourceType =
  | 'agent'
  | 'wallet'
  | 'secret'
  | 'strategy'
  | 'transaction'
  | 'user'
  | 'tenant'
  | 'api_key'
  | 'audit_log'
  | 'marketplace'
  | 'dashboard';

export type ActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'approve'
  | 'suspend'
  | 'export'
  | 'manage_permissions';

export interface Permission {
  resource: ResourceType;
  action: ActionType;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'owned_by';
  value: string | string[];
}

export interface RbacPolicy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  roles: RoleName[];
  resources: ResourceType[];
  actions: ActionType[];
  conditions?: PermissionCondition[];
  effect: 'allow' | 'deny';
  priority: number;
  enabled: boolean;
  createdAt: Date;
}

export interface AccessCheckRequest {
  tenantId: string;
  userId: string;
  roles: RoleName[];
  resource: ResourceType;
  action: ActionType;
  resourceId?: string;
  context?: Record<string, unknown>;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  matchedPolicy?: string;
  requiredRoles?: RoleName[];
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  roles: RoleName[];
  assignedAt: Date;
  assignedBy: string;
  status: 'active' | 'suspended' | 'pending';
  lastLoginAt?: Date;
  mfaEnabled: boolean;
}

// ============================================================================
// Isolation Layer Types
// ============================================================================

export type IsolationMode =
  | 'process'      // Separate process per tenant
  | 'container'    // Container isolation
  | 'wasm'         // WASM runtime isolation
  | 'vm'           // VM-level isolation
  | 'sandbox';     // Logical sandbox (default for dev)

export interface TenantSandbox {
  id: string;
  tenantId: string;
  agentId: string;
  mode: IsolationMode;
  status: SandboxStatus;
  resourceLimits: SandboxResourceLimits;
  networkPolicy: NetworkPolicy;
  createdAt: Date;
  lastActivityAt: Date;
  metrics: SandboxMetrics;
}

export type SandboxStatus =
  | 'initializing'
  | 'active'
  | 'paused'
  | 'terminated'
  | 'error';

export interface SandboxResourceLimits {
  maxCpuPercent: number;
  maxMemoryMb: number;
  maxStorageMb: number;
  maxNetworkCallsPerMinute: number;
  maxExecutionTimeMs: number;
  maxConcurrentTasks: number;
}

export interface NetworkPolicy {
  allowedOutboundDomains: string[];
  allowedInboundSources: string[];
  blockPrivateNetworks: boolean;
  blockMetadataEndpoints: boolean;
  rateLimitPerMinute: number;
}

export interface SandboxMetrics {
  cpuUsagePercent: number;
  memoryUsageMb: number;
  storageUsageMb: number;
  networkCallsLastMinute: number;
  activeTasks: number;
  totalTasksExecuted: number;
  lastError?: string;
}

export interface SandboxViolation {
  id: string;
  sandboxId: string;
  tenantId: string;
  agentId: string;
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  metadata: Record<string, unknown>;
}

export type ViolationType =
  | 'resource_limit_exceeded'
  | 'unauthorized_network_access'
  | 'cross_tenant_access'
  | 'secret_leak_attempt'
  | 'privilege_escalation'
  | 'sandbox_escape_attempt';

// ============================================================================
// Secret Vault Types
// ============================================================================

export type SecretType =
  | 'api_key'
  | 'private_key'
  | 'wallet_seed'
  | 'telegram_token'
  | 'ai_provider_key'
  | 'webhook_secret'
  | 'encryption_key'
  | 'oauth_token'
  | 'custom';

export interface TenantSecret {
  id: string;
  tenantId: string;
  agentId?: string; // If scoped to an agent; undefined = tenant-wide
  name: string;
  type: SecretType;
  encryptedValue: string; // AES-256-GCM encrypted
  keyVersion: number;
  expiresAt?: Date;
  rotationPolicy?: SecretRotationPolicy;
  accessLog: SecretAccessEntry[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
}

export interface SecretRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  notifyBeforeDays: number;
  autoRotate: boolean;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
}

export interface SecretAccessEntry {
  accessedAt: Date;
  accessedBy: string; // userId or agentId
  accessType: 'read' | 'write' | 'rotate' | 'delete';
  ipAddress?: string;
  requestId: string;
}

export interface CreateSecretInput {
  tenantId: string;
  agentId?: string;
  name: string;
  type: SecretType;
  value: string; // Plaintext — will be encrypted at rest
  expiresAt?: Date;
  rotationPolicy?: Partial<SecretRotationPolicy>;
  tags?: string[];
}

export interface GetSecretResult {
  id: string;
  name: string;
  type: SecretType;
  value: string; // Decrypted value
  expiresAt?: Date;
  metadata: {
    tenantId: string;
    agentId?: string;
    keyVersion: number;
    createdAt: Date;
  };
}

// ============================================================================
// Wallet Isolation Types
// ============================================================================

export interface IsolatedWallet {
  id: string;
  tenantId: string;
  agentId: string;
  address: string;
  custodyMode: 'non_custodial' | 'smart_contract_wallet' | 'mpc';
  keyId: string;
  status: WalletIsolationStatus;
  limits: WalletIsolationLimits;
  segregationProof: string; // Cryptographic proof of isolation
  createdAt: Date;
  updatedAt: Date;
}

export type WalletIsolationStatus =
  | 'provisioning'
  | 'active'
  | 'frozen'
  | 'revoked'
  | 'migrating';

export interface WalletIsolationLimits {
  maxSingleTransactionTon: number;
  maxDailyVolumeTon: number;
  maxWeeklyVolumeTon: number;
  allowedTokens: string[]; // Token addresses or "TON" for native
  allowedProtocols: string[];
  allowedDestinations: string[]; // Whitelisted addresses
  requireMultiSigAboveTon: number;
}

export interface WalletAuditEntry {
  id: string;
  walletId: string;
  tenantId: string;
  agentId: string;
  eventType: 'created' | 'funded' | 'transaction' | 'frozen' | 'revoked' | 'limit_changed';
  details: Record<string, unknown>;
  timestamp: Date;
  actor: string;
}

// ============================================================================
// Tenant Isolation Report / Compliance
// ============================================================================

export interface TenantIsolationReport {
  tenantId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalAgents: number;
    totalWallets: number;
    totalTransactions: number;
    totalViolations: number;
    isolationBreaches: number;
    secretsRotated: number;
  };
  violations: SandboxViolation[];
  recommendations: string[];
  complianceScore: number; // 0-100
}

// ============================================================================
// Multi-Tenant Manager Types
// ============================================================================

export interface MultiTenantConfig {
  defaultIsolationMode: IsolationMode;
  defaultTenantLimits: TenantLimits;
  defaultTenantSettings: TenantSettings;
  vaultEncryptionKeyId: string;
  enableAuditLogging: boolean;
  enableViolationDetection: boolean;
  maxTenantsPerInstance: number;
}

export interface MultiTenantHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    tenantManager: boolean;
    rbac: boolean;
    isolationLayer: boolean;
    secretVault: boolean;
    walletIsolation: boolean;
  };
  activeTenants: number;
  activeSandboxes: number;
  lastCheck: Date;
  details: Record<string, unknown>;
}

export type MultiTenantEventType =
  | 'tenant_created'
  | 'tenant_suspended'
  | 'tenant_terminated'
  | 'user_role_assigned'
  | 'access_denied'
  | 'sandbox_violation'
  | 'secret_rotated'
  | 'wallet_frozen'
  | 'isolation_breach';

export interface MultiTenantEvent {
  id: string;
  timestamp: Date;
  type: MultiTenantEventType;
  tenantId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
}

export type MultiTenantEventCallback = (event: MultiTenantEvent) => void;
