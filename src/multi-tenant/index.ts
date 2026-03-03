/**
 * TONAIAgent - Multi-Tenant Security Infrastructure & Isolation Layer
 *
 * Barrel export for the Secure Multi-Tenant Agent Infrastructure module.
 *
 * Components:
 * - TenantManager: Tenant lifecycle management (create, suspend, terminate)
 * - RbacManager: Role-Based Access Control with tenant-scoped policies
 * - IsolationEngine: Sandbox runtime isolation with resource limits & violation detection
 * - TenantVault: Encrypted secret storage with rotation policies
 * - WalletIsolationManager: Per-agent isolated TON wallets with segregation proofs
 * - MultiTenantManager: Unified entry point coordinating all components
 *
 * Issue #99: Secure Multi-Tenant Agent Infrastructure & Isolation Layer
 *
 * @example
 * ```typescript
 * import {
 *   createMultiTenantManager,
 *   MultiTenantConfig,
 * } from '@tonaiagent/core/multi-tenant';
 *
 * const manager = createMultiTenantManager();
 *
 * // Provision a tenant
 * const tenant = await manager.tenantManager.createTenant({
 *   name: 'Acme Corp',
 *   ownerId: 'user_alice',
 *   tier: 'enterprise',
 * });
 *
 * // Assign RBAC roles
 * await manager.tenantManager.assignUserRole(tenant.id, 'user_bob', 'developer', 'user_alice');
 *
 * // Check access
 * const access = manager.rbac.checkAccess({
 *   tenantId: tenant.id,
 *   userId: 'user_bob',
 *   roles: ['developer'],
 *   resource: 'agent',
 *   action: 'create',
 * });
 *
 * // Create isolated sandbox
 * const sandbox = await manager.isolation.createSandbox(tenant.id, 'agent_001');
 *
 * // Store a secret
 * const secret = await manager.vault.createSecret({
 *   tenantId: tenant.id,
 *   agentId: 'agent_001',
 *   name: 'TELEGRAM_BOT_TOKEN',
 *   type: 'telegram_token',
 *   value: 'bot123456:ABC...',
 * }, 'user_alice');
 *
 * // Provision isolated wallet
 * const wallet = await manager.walletIsolation.provisionWallet(tenant.id, 'agent_001');
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Tenant types
  Tenant,
  TenantStatus,
  TenantTier,
  TenantLimits,
  TenantSettings,
  TenantMetadata,
  TenantContext,
  CreateTenantInput,
  TenantUser,

  // RBAC types
  Role,
  RoleName,
  Permission,
  ResourceType,
  ActionType,
  RbacPolicy,
  AccessCheckRequest,
  AccessCheckResult,
  PermissionCondition,

  // Isolation types
  TenantSandbox,
  SandboxStatus,
  SandboxResourceLimits,
  NetworkPolicy,
  SandboxMetrics,
  SandboxViolation,
  ViolationType,
  IsolationMode,

  // Vault types
  TenantSecret,
  SecretType,
  SecretAccessEntry,
  CreateSecretInput,
  GetSecretResult,
  SecretRotationPolicy,

  // Wallet isolation types
  IsolatedWallet,
  WalletIsolationStatus,
  WalletIsolationLimits,
  WalletAuditEntry,

  // Manager types
  MultiTenantConfig,
  MultiTenantHealth,
  MultiTenantEvent,
  MultiTenantEventType,
  MultiTenantEventCallback,
  TenantIsolationReport,
} from './types';

// ============================================================================
// Component Exports
// ============================================================================

export {
  TenantManager,
  createTenantManager,
  TIER_LIMITS,
  DEFAULT_SETTINGS,
} from './tenant-manager';

export {
  RbacManager,
  createRbacManager,
  SYSTEM_ROLES,
} from './rbac';

export {
  IsolationEngine,
  createIsolationEngine,
  DEFAULT_RESOURCE_LIMITS,
  DEFAULT_NETWORK_POLICY,
} from './isolation';

export {
  TenantVault,
  createTenantVault,
} from './tenant-vault';

export {
  WalletIsolationManager,
  createWalletIsolationManager,
  DEFAULT_WALLET_LIMITS,
} from './wallet-isolation';

// ============================================================================
// Multi-Tenant Manager — Unified Entry Point
// ============================================================================

import { MultiTenantConfig, MultiTenantHealth, MultiTenantEvent, MultiTenantEventCallback, IsolationMode, TenantLimits, TenantSettings } from './types';
import { TenantManager, createTenantManager } from './tenant-manager';
import { RbacManager, createRbacManager } from './rbac';
import { IsolationEngine, createIsolationEngine } from './isolation';
import { TenantVault, createTenantVault } from './tenant-vault';
import { WalletIsolationManager, createWalletIsolationManager } from './wallet-isolation';

const DEFAULT_CONFIG: MultiTenantConfig = {
  defaultIsolationMode: 'sandbox' as IsolationMode,
  defaultTenantLimits: {
    maxAgents: 5,
    maxUsers: 10,
    maxWallets: 10,
    maxSecretsPerAgent: 20,
    maxDailyTransactions: 100,
    maxMonthlyVolumeTon: 10000,
    storageQuotaMb: 1024,
    apiRateLimitPerMinute: 120,
  } as TenantLimits,
  defaultTenantSettings: {
    enforceMfa: false,
    allowedCustodyModes: ['non_custodial', 'smart_contract_wallet', 'mpc'],
    auditLogRetentionDays: 90,
    complianceMode: 'standard',
  } as TenantSettings,
  vaultEncryptionKeyId: 'default_vault_key',
  enableAuditLogging: true,
  enableViolationDetection: true,
  maxTenantsPerInstance: 10000,
};

export interface MultiTenantManagerInterface {
  readonly tenantManager: TenantManager;
  readonly rbac: RbacManager;
  readonly isolation: IsolationEngine;
  readonly vault: TenantVault;
  readonly walletIsolation: WalletIsolationManager;
  getHealth(): Promise<MultiTenantHealth>;
  onEvent(callback: MultiTenantEventCallback): void;
}

export class MultiTenantManager implements MultiTenantManagerInterface {
  readonly tenantManager: TenantManager;
  readonly rbac: RbacManager;
  readonly isolation: IsolationEngine;
  readonly vault: TenantVault;
  readonly walletIsolation: WalletIsolationManager;

  private readonly eventCallbacks: MultiTenantEventCallback[] = [];

  constructor(_config: Partial<MultiTenantConfig> = {}) {
    this.tenantManager = createTenantManager();
    this.rbac = createRbacManager();
    this.isolation = createIsolationEngine();
    this.vault = createTenantVault();
    this.walletIsolation = createWalletIsolationManager();

    // Wire up event forwarding from all components
    this.tenantManager.onEvent((e) => this.forwardEvent(e));
    this.rbac.onEvent((e) => this.forwardEvent(e));
    this.isolation.onEvent((e) => this.forwardEvent(e));
    this.vault.onEvent((e) => this.forwardEvent(e));
    this.walletIsolation.onEvent((e) => this.forwardEvent(e));
  }

  async getHealth(): Promise<MultiTenantHealth> {
    const activeTenants = this.tenantManager.listTenants('active').length;
    const activeSandboxes = Array.from(
      { length: 0 } // Will count via list
    ).length;

    // Count active sandboxes across all tenants
    let totalActiveSandboxes = 0;
    for (const tenant of this.tenantManager.listTenants()) {
      totalActiveSandboxes += this.isolation.listSandboxes(tenant.id, 'active').length;
    }

    const components = {
      tenantManager: true,
      rbac: true,
      isolationLayer: true,
      secretVault: true,
      walletIsolation: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    return {
      overall: healthyCount === totalCount ? 'healthy' : healthyCount >= totalCount / 2 ? 'degraded' : 'unhealthy',
      components,
      activeTenants,
      activeSandboxes: totalActiveSandboxes,
      lastCheck: new Date(),
      details: {
        totalTenants: this.tenantManager.listTenants().length,
        activeTenants,
        activeSandboxes: totalActiveSandboxes,
      },
    };
  }

  onEvent(callback: MultiTenantEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private forwardEvent(event: MultiTenantEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore
      }
    }
  }
}

export function createMultiTenantManager(
  config?: Partial<MultiTenantConfig>
): MultiTenantManager {
  return new MultiTenantManager({ ...DEFAULT_CONFIG, ...config });
}

export { DEFAULT_CONFIG as DEFAULT_MULTI_TENANT_CONFIG };

export default MultiTenantManager;
