/**
 * TONAIAgent - AIFOS Financial Modules
 *
 * Plug-in module registry for the AI-native Financial Operating System.
 * Each module:
 * - Has a defined API contract
 * - Is upgradeable
 * - Operates within constitutional limits set by the kernel
 *
 * Built-in module types:
 * - Asset module (RWA, crypto)
 * - Liquidity module
 * - Clearing module
 * - Treasury module
 * - Compliance module
 * - Sovereign gateway module
 *
 * This is Pillar 2 of AIFOS.
 */

import {
  ModuleId,
  ModuleType,
  ModuleStatus,
  FinancialModuleManifest,
  ModuleAPIContract,
  ModuleExecutionResult,
  ModuleConstitutionalLimit,
  FinancialModulesConfig,
  PermissionScope,
  AIFOSEvent,
  AIFOSEventCallback,
  AIFOSEventType,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_MODULES_CONFIG: FinancialModulesConfig = {
  enableHotReload: true,
  enforceConstitutionalLimits: true,
  maxConcurrentModuleOperations: 100,
  moduleTimeoutMs: 30_000,
  enableModuleAuditLog: true,
};

// ============================================================================
// Financial Modules Interface
// ============================================================================

export interface FinancialModules {
  readonly config: FinancialModulesConfig;

  // Module registry
  registerModule(manifest: RegisterModuleParams): FinancialModuleManifest;
  getModule(id: ModuleId): FinancialModuleManifest | undefined;
  listModules(filters?: ModuleFilters): FinancialModuleManifest[];
  upgradeModule(id: ModuleId, newVersion: string, changes: Record<string, unknown>): FinancialModuleManifest;
  suspendModule(id: ModuleId, reason: string): void;
  resumeModule(id: ModuleId): void;

  // API contracts
  registerAPIContract(contract: ModuleAPIContract): void;
  getAPIContract(moduleId: ModuleId): ModuleAPIContract | undefined;
  validateAPICall(moduleId: ModuleId, endpoint: string, callerId: string): APIValidationResult;

  // Execution
  executeModuleOperation(params: ExecuteOperationParams): ModuleExecutionResult;
  getModuleHealth(id: ModuleId): ModuleHealthReport;
  getModulesHealth(): ModulesHealthSummary;

  // Constitutional limits
  enforceConstitutionalLimits(moduleId: ModuleId, operation: string, value: number): LimitCheckResult;
  getConstitutionalLimits(moduleId: ModuleId): ModuleConstitutionalLimit[];

  // Events
  onEvent(callback: AIFOSEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface RegisterModuleParams {
  name: string;
  version: string;
  moduleType: ModuleType;
  description: string;
  apiVersion: string;
  requiredPermissions?: PermissionScope[];
  constitutionalLimits?: ModuleConstitutionalLimit[];
  dependencies?: ModuleId[];
  upgradeable?: boolean;
  author: string;
  metadata?: Record<string, unknown>;
}

export interface ModuleFilters {
  moduleType?: ModuleType;
  status?: ModuleStatus;
  author?: string;
  apiVersion?: string;
}

export interface APIValidationResult {
  valid: boolean;
  reason?: string;
  requiredPermission?: PermissionScope;
  rateLimitRemaining?: number;
}

export interface ExecuteOperationParams {
  moduleId: ModuleId;
  operation: string;
  parameters: Record<string, unknown>;
  callerId: string;
  timeout?: number;
}

export interface ModuleHealthReport {
  moduleId: ModuleId;
  status: ModuleStatus;
  operationsLastHour: number;
  errorRate: number;         // 0-1
  avgLatencyMs: number;
  constitutionalBreaches: number;
  lastOperationAt?: Date;
  checkedAt: Date;
}

export interface ModulesHealthSummary {
  totalModules: number;
  activeModules: number;
  suspendedModules: number;
  errorModules: number;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  checkedAt: Date;
}

export interface LimitCheckResult {
  withinLimits: boolean;
  violatedLimit?: ModuleConstitutionalLimit;
  enforcement?: 'hard' | 'soft';
  reason?: string;
}

// ============================================================================
// Built-in Module Definitions
// ============================================================================

const BUILTIN_MODULES: RegisterModuleParams[] = [
  {
    name: 'Asset Module',
    version: '1.0.0',
    moduleType: 'asset',
    description: 'Manages RWA and crypto asset registration, custody mapping, and valuation',
    apiVersion: 'v1',
    requiredPermissions: ['capital_allocate'],
    constitutionalLimits: [
      {
        limitType: 'capital_cap',
        value: 5_000_000_000_000,
        enforcement: 'hard',
        description: 'Max total asset value managed: $5T',
      },
    ],
    upgradeable: true,
    author: 'TONAIAgent Core',
  },
  {
    name: 'Liquidity Module',
    version: '1.0.0',
    moduleType: 'liquidity',
    description: 'Cross-chain liquidity routing, pool management, and corridor operations',
    apiVersion: 'v1',
    requiredPermissions: ['capital_allocate', 'module_deploy'],
    constitutionalLimits: [
      {
        limitType: 'rate_limit',
        value: 1000,
        enforcement: 'hard',
        description: 'Max liquidity operations per minute',
      },
    ],
    upgradeable: true,
    author: 'TONAIAgent Core',
  },
  {
    name: 'Clearing Module',
    version: '1.0.0',
    moduleType: 'clearing',
    description: 'Institutional clearing and settlement, netting, and margin management',
    apiVersion: 'v1',
    requiredPermissions: ['capital_allocate', 'governance_vote'],
    constitutionalLimits: [
      {
        limitType: 'capital_cap',
        value: 1_000_000_000_000,
        enforcement: 'hard',
        description: 'Max daily clearing volume: $1T',
      },
    ],
    upgradeable: true,
    author: 'TONAIAgent Core',
  },
  {
    name: 'Treasury Module',
    version: '1.0.0',
    moduleType: 'treasury',
    description: 'Multi-asset reserve management, yield optimization, and stabilization',
    apiVersion: 'v1',
    requiredPermissions: ['capital_allocate', 'governance_propose'],
    constitutionalLimits: [
      {
        limitType: 'risk_cap',
        value: 'moderate',
        enforcement: 'hard',
        description: 'Treasury risk cap: moderate',
      },
    ],
    upgradeable: true,
    author: 'TONAIAgent Core',
  },
  {
    name: 'Compliance Module',
    version: '1.0.0',
    moduleType: 'compliance',
    description: 'KYC/AML, jurisdiction rules, regulatory reporting, and sanctions screening',
    apiVersion: 'v1',
    requiredPermissions: ['compliance_gate'],
    constitutionalLimits: [],
    upgradeable: true,
    author: 'TONAIAgent Core',
  },
  {
    name: 'Sovereign Gateway Module',
    version: '1.0.0',
    moduleType: 'sovereign_gateway',
    description: 'Sovereign wealth fund and central bank onboarding, due diligence, and integration',
    apiVersion: 'v1',
    requiredPermissions: ['compliance_gate', 'governance_vote'],
    constitutionalLimits: [
      {
        limitType: 'jurisdiction_restriction',
        value: 'OFAC_sanctioned',
        enforcement: 'hard',
        description: 'No operations with OFAC-sanctioned entities',
      },
    ],
    upgradeable: true,
    author: 'TONAIAgent Core',
  },
];

// ============================================================================
// Default Financial Modules Implementation
// ============================================================================

export class DefaultFinancialModules implements FinancialModules {
  readonly config: FinancialModulesConfig;

  private readonly modules = new Map<ModuleId, FinancialModuleManifest>();
  private readonly apiContracts = new Map<ModuleId, ModuleAPIContract>();
  private readonly operationCounts = new Map<ModuleId, number>();
  private readonly eventCallbacks: AIFOSEventCallback[] = [];
  private moduleCounter = 0;

  constructor(config?: Partial<FinancialModulesConfig>) {
    this.config = { ...DEFAULT_MODULES_CONFIG, ...config };
    this.initializeBuiltinModules();
  }

  registerModule(params: RegisterModuleParams): FinancialModuleManifest {
    const id: ModuleId = `module-${params.moduleType}-${++this.moduleCounter}-${Date.now()}`;

    const manifest: FinancialModuleManifest = {
      id,
      name: params.name,
      version: params.version,
      moduleType: params.moduleType,
      description: params.description,
      apiVersion: params.apiVersion,
      requiredPermissions: params.requiredPermissions ?? [],
      constitutionalLimits: params.constitutionalLimits ?? [],
      dependencies: params.dependencies ?? [],
      upgradeable: params.upgradeable ?? true,
      author: params.author,
      registeredAt: new Date(),
      status: 'active',
      metadata: params.metadata ?? {},
    };

    this.modules.set(id, manifest);
    this.operationCounts.set(id, 0);

    this.emitEvent('module_loaded', 'info', 'Modules', `Module registered: ${params.name} v${params.version}`, {
      moduleId: id,
      moduleType: params.moduleType,
    });

    return { ...manifest };
  }

  getModule(id: ModuleId): FinancialModuleManifest | undefined {
    const m = this.modules.get(id);
    return m ? { ...m } : undefined;
  }

  listModules(filters?: ModuleFilters): FinancialModuleManifest[] {
    let list = Array.from(this.modules.values());

    if (filters?.moduleType) {
      list = list.filter(m => m.moduleType === filters.moduleType);
    }
    if (filters?.status) {
      list = list.filter(m => m.status === filters.status);
    }
    if (filters?.author) {
      list = list.filter(m => m.author === filters.author);
    }
    if (filters?.apiVersion) {
      list = list.filter(m => m.apiVersion === filters.apiVersion);
    }

    return list.map(m => ({ ...m }));
  }

  upgradeModule(id: ModuleId, newVersion: string, _changes: Record<string, unknown>): FinancialModuleManifest {
    const m = this.modules.get(id);
    if (!m) throw new Error(`Module not found: ${id}`);
    if (!m.upgradeable) throw new Error(`Module is not upgradeable: ${id}`);

    const updated: FinancialModuleManifest = {
      ...m,
      version: newVersion,
      lastUpgradedAt: new Date(),
    };

    this.modules.set(id, updated);
    this.emitEvent('module_upgraded', 'info', 'Modules', `Module upgraded: ${m.name} → v${newVersion}`, {
      moduleId: id,
      previousVersion: m.version,
      newVersion,
    });

    return { ...updated };
  }

  suspendModule(id: ModuleId, reason: string): void {
    const m = this.modules.get(id);
    if (!m) throw new Error(`Module not found: ${id}`);

    this.modules.set(id, { ...m, status: 'suspended' });
    this.emitEvent('module_suspended', 'warning', 'Modules', `Module suspended: ${m.name} (${reason})`, {
      moduleId: id,
      reason,
    });
  }

  resumeModule(id: ModuleId): void {
    const m = this.modules.get(id);
    if (!m) throw new Error(`Module not found: ${id}`);

    this.modules.set(id, { ...m, status: 'active' });
    this.emitEvent('module_loaded', 'info', 'Modules', `Module resumed: ${m.name}`, { moduleId: id });
  }

  registerAPIContract(contract: ModuleAPIContract): void {
    this.apiContracts.set(contract.moduleId, contract);
  }

  getAPIContract(moduleId: ModuleId): ModuleAPIContract | undefined {
    return this.apiContracts.get(moduleId);
  }

  validateAPICall(moduleId: ModuleId, endpoint: string, _callerId: string): APIValidationResult {
    const m = this.modules.get(moduleId);
    if (!m) return { valid: false, reason: `Module not found: ${moduleId}` };
    if (m.status !== 'active') return { valid: false, reason: `Module not active: ${m.status}` };

    const contract = this.apiContracts.get(moduleId);
    if (contract) {
      const ep = contract.endpoints.find(e => e.name === endpoint);
      if (!ep) return { valid: false, reason: `Endpoint not found: ${endpoint}` };
      return { valid: true, requiredPermission: ep.requiresPermission, rateLimitRemaining: ep.rateLimitPerMinute };
    }

    return { valid: true };
  }

  executeModuleOperation(params: ExecuteOperationParams): ModuleExecutionResult {
    const m = this.modules.get(params.moduleId);
    const start = Date.now();

    if (!m || m.status !== 'active') {
      return {
        moduleId: params.moduleId,
        operation: params.operation,
        success: false,
        error: m ? `Module not active: ${m.status}` : `Module not found: ${params.moduleId}`,
        durationMs: Date.now() - start,
        executedAt: new Date(),
      };
    }

    // Increment operation counter
    this.operationCounts.set(params.moduleId, (this.operationCounts.get(params.moduleId) ?? 0) + 1);

    return {
      moduleId: params.moduleId,
      operation: params.operation,
      success: true,
      output: { acknowledged: true, moduleId: params.moduleId, operation: params.operation },
      durationMs: Date.now() - start,
      executedAt: new Date(),
    };
  }

  getModuleHealth(id: ModuleId): ModuleHealthReport {
    const m = this.modules.get(id);
    return {
      moduleId: id,
      status: m?.status ?? 'error',
      operationsLastHour: this.operationCounts.get(id) ?? 0,
      errorRate: m?.status === 'error' ? 1 : 0,
      avgLatencyMs: 25,
      constitutionalBreaches: 0,
      checkedAt: new Date(),
    };
  }

  getModulesHealth(): ModulesHealthSummary {
    const all = Array.from(this.modules.values());
    const active = all.filter(m => m.status === 'active').length;
    const suspended = all.filter(m => m.status === 'suspended').length;
    const errors = all.filter(m => m.status === 'error').length;

    return {
      totalModules: all.length,
      activeModules: active,
      suspendedModules: suspended,
      errorModules: errors,
      overallHealth: errors > 0 ? 'critical' : suspended > 0 ? 'degraded' : 'healthy',
      checkedAt: new Date(),
    };
  }

  enforceConstitutionalLimits(moduleId: ModuleId, _operation: string, value: number): LimitCheckResult {
    if (!this.config.enforceConstitutionalLimits) return { withinLimits: true };

    const m = this.modules.get(moduleId);
    if (!m) return { withinLimits: false, reason: `Module not found: ${moduleId}` };

    for (const limit of m.constitutionalLimits) {
      if (limit.limitType === 'capital_cap' && typeof limit.value === 'number' && value > limit.value) {
        return {
          withinLimits: false,
          violatedLimit: limit,
          enforcement: limit.enforcement,
          reason: limit.description,
        };
      }
    }

    return { withinLimits: true };
  }

  getConstitutionalLimits(moduleId: ModuleId): ModuleConstitutionalLimit[] {
    return this.modules.get(moduleId)?.constitutionalLimits ?? [];
  }

  onEvent(callback: AIFOSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private initializeBuiltinModules(): void {
    for (const def of BUILTIN_MODULES) {
      this.registerModule(def);
    }
  }

  private emitEvent(
    type: AIFOSEventType,
    severity: AIFOSEvent['severity'],
    source: string,
    message: string,
    data: Record<string, unknown>,
  ): void {
    const event: AIFOSEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFinancialModules(config?: Partial<FinancialModulesConfig>): DefaultFinancialModules {
  return new DefaultFinancialModules(config);
}

export default DefaultFinancialModules;
