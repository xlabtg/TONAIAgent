/**
 * TONAIAgent - Security Layer
 *
 * Production-grade security and key management system for autonomous agents.
 *
 * Features:
 * - Secure key management (MPC, HSM, Key Derivation)
 * - Multiple custody models (Non-Custodial, Smart Contract Wallet, MPC)
 * - Multi-layer transaction authorization
 * - Policy and permission framework
 * - Risk and fraud detection
 * - Emergency and recovery mechanisms
 * - Comprehensive audit logging
 *
 * @example
 * ```typescript
 * import {
 *   createSecurityManager,
 *   SecurityConfig,
 *   CustodyMode,
 * } from './security';
 *
 * const config: SecurityConfig = {
 *   enabled: true,
 *   custody: {
 *     mode: 'mpc',
 *     userOwned: true,
 *     platformManaged: true,
 *     recoveryEnabled: true,
 *   },
 * };
 *
 * const security = createSecurityManager(config);
 *
 * // Create wallet
 * const wallet = await security.custody.createWallet(userId, agentId);
 *
 * // Authorize transaction
 * const auth = await security.authorization.authorize(request, context);
 *
 * // Check risk
 * const risk = await security.risk.assessTransaction(request, history);
 * ```
 */

// Export all types
export * from './types';

// Export key management
export {
  SecureKeyManager,
  SoftwareKeyStorage,
  HSMKeyStorage,
  MPCCoordinator,
  KeyDerivationService,
  createKeyManager,
  type KeyManagementService,
  type KeyStorageBackend,
  type KeyGenerationConfig,
  type KeyListOptions,
  type MPCSharesStatus,
  type KeyManagementHealth,
  type DerivationPathComponents,
} from './key-management';

// Export custody providers
export {
  NonCustodialProvider,
  SmartContractWalletProvider,
  MPCCustodyProvider,
  createCustodyProvider,
  type CustodyProvider,
  type CustodyWallet,
  type WalletPermissions,
  type PreparedTransaction,
  type TransactionSimulation,
  type TransactionApproval,
  type SignedTransaction,
  type RecoverySession,
  type CustodyHealth,
  type WalletStatus,
} from './custody';

// Export authorization engine
export {
  TransactionAuthorizationEngine,
  DefaultIntentValidator,
  DefaultStrategyValidator,
  DefaultTransactionSimulator,
  createAuthorizationEngine,
  type AuthorizationEngine,
  type IntentValidator,
  type IntentValidationResult,
  type StrategyValidator,
  type StrategyValidationResult,
  type StrategyDefinition,
  type TransactionSimulator,
  type SimulationResult,
} from './authorization';

// Export policy manager
export {
  DefaultPolicyManager,
  DEFAULT_TEMPLATES,
  createPolicyManager,
  type PolicyManager,
  type CapabilityContext,
  type CapabilityCheckResult,
  type PolicyRule,
  type PolicyCondition,
  type PolicyOperator,
  type PolicyAction,
  type PolicyContext,
  type PolicyEvaluationResult,
  type PermissionTemplate,
} from './policy';

// Export risk engine
export {
  DefaultRiskEngine,
  createRiskEngine,
  type RiskEngine,
  type TransactionHistory,
  type HistoricalTransaction,
  type HistoricalAggregates,
  type AnomalyResult,
  type FraudCheckResult,
  type FraudPattern,
} from './risk';

// Export emergency controller and recovery manager
export {
  DefaultEmergencyController,
  DefaultRecoveryManager,
  createEmergencyController,
  createRecoveryManager,
  type EmergencyController,
  type RecoveryManager,
  type AutoResponseConfig,
  type AutoResponseTrigger,
  type RecoveryOptions,
  type VerificationData,
  type VerificationResult,
  type RecoveryResult,
} from './emergency';

// Export audit logger
export {
  DefaultAuditLogger,
  createAuditLogger,
  type AuditLogger,
  type AuditQueryFilter,
  type DateRange,
  type AuditQueryResult,
  type ReportType,
  type ReportOptions,
  type ComplianceReport,
  type ReportSummary,
  type ReportSection,
  type ChartData,
  type ExportFormat,
  type ExportResult,
  type IntegrityCheckResult,
  type ChainIntegrityResult,
} from './audit';

// ============================================================================
// Security Manager - Unified Entry Point
// ============================================================================

import {
  SecurityConfig,
  SecurityEvent,
  SecurityEventCallback,
} from './types';

import { SecureKeyManager, createKeyManager } from './key-management';
import { CustodyProvider, createCustodyProvider } from './custody';
import { TransactionAuthorizationEngine, createAuthorizationEngine } from './authorization';
import { DefaultPolicyManager, createPolicyManager } from './policy';
import { DefaultRiskEngine, createRiskEngine } from './risk';
import { DefaultEmergencyController, DefaultRecoveryManager, createEmergencyController, createRecoveryManager } from './emergency';
import { DefaultAuditLogger, createAuditLogger } from './audit';

export interface SecurityManager {
  readonly enabled: boolean;
  readonly keyManager: SecureKeyManager;
  readonly custody: CustodyProvider;
  readonly authorization: TransactionAuthorizationEngine;
  readonly policy: DefaultPolicyManager;
  readonly risk: DefaultRiskEngine;
  readonly emergency: DefaultEmergencyController;
  readonly recovery: DefaultRecoveryManager;
  readonly audit: DefaultAuditLogger;

  // Health check
  getHealth(): Promise<SecurityHealth>;

  // Events
  onEvent(callback: SecurityEventCallback): void;
}

export interface SecurityHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    keyManagement: boolean;
    custody: boolean;
    authorization: boolean;
    risk: boolean;
    emergency: boolean;
    audit: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export class DefaultSecurityManager implements SecurityManager {
  readonly enabled: boolean;
  readonly keyManager: SecureKeyManager;
  readonly custody: CustodyProvider;
  readonly authorization: TransactionAuthorizationEngine;
  readonly policy: DefaultPolicyManager;
  readonly risk: DefaultRiskEngine;
  readonly emergency: DefaultEmergencyController;
  readonly recovery: DefaultRecoveryManager;
  readonly audit: DefaultAuditLogger;

  private readonly eventCallbacks: SecurityEventCallback[] = [];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.enabled = config.enabled ?? true;

    // Initialize key manager
    this.keyManager = createKeyManager({
      mpc: config.mpc,
      keyDerivation: config.keyDerivation,
    });

    // Initialize custody provider
    const custodyMode = config.custody?.mode ?? 'mpc';
    this.custody = createCustodyProvider(custodyMode);

    // Initialize authorization engine
    this.authorization = createAuthorizationEngine(config.authorization);

    // Initialize policy manager
    this.policy = createPolicyManager();

    // Initialize risk engine
    this.risk = createRiskEngine(config.risk);

    // Initialize emergency controller
    this.emergency = createEmergencyController(config.emergency);

    // Initialize recovery manager
    this.recovery = createRecoveryManager();

    // Initialize audit logger
    this.audit = createAuditLogger(config.audit);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<SecurityHealth> {
    const keyHealth = await this.keyManager.getHealth();
    const custodyHealth = await this.custody.getHealth();

    const components = {
      keyManagement: keyHealth.available,
      custody: custodyHealth.available,
      authorization: true, // Always available
      risk: this.risk.getConfig().enabled,
      emergency: !this.emergency.isKillSwitchActive(),
      audit: this.audit.getConfig().enabled,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: SecurityHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      lastCheck: new Date(),
      details: {
        activeKeys: keyHealth.activeKeys,
        activeWallets: custodyHealth.activeWalletsCount,
        killSwitchActive: this.emergency.isKillSwitchActive(),
        activeEmergencies: this.emergency.getActiveEmergencies().length,
      },
    };
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: SecurityEvent) => {
      // Log to audit
      this.audit.log({
        eventType: 'system_event',
        actor: { type: 'system', id: 'security_manager' },
        action: event.type,
        resource: { type: 'security', id: event.source },
        outcome: 'success',
        severity: event.severity === 'critical' ? 'critical' : event.severity === 'high' ? 'error' : 'info',
        details: event.data,
        context: {
          requestId: event.id,
          environment: 'production',
          version: '1.0.0',
        },
      });

      // Forward to subscribers
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.keyManager.onEvent(forwardEvent);
    if ('onEvent' in this.custody) {
      (this.custody as { onEvent: (cb: SecurityEventCallback) => void }).onEvent(forwardEvent);
    }
    this.authorization.onEvent(forwardEvent);
    this.policy.onEvent(forwardEvent);
    this.risk.onEvent(forwardEvent);
    this.emergency.onEvent(forwardEvent);
    this.recovery.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSecurityManager(
  config?: Partial<SecurityConfig>
): DefaultSecurityManager {
  return new DefaultSecurityManager(config);
}

// Default export
export default DefaultSecurityManager;
