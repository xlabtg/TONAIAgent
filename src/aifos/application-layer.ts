/**
 * TONAIAgent - AIFOS Application Layer
 *
 * The ecosystem that builds on top of the AIFOS kernel and modules without
 * touching the core. Application types include:
 * - AI hedge funds
 * - Institutional vaults
 * - Sovereign allocation nodes
 * - Strategy marketplaces
 * - Retail finance apps
 *
 * Provides SDK capabilities for developers to build AIFOS-native applications.
 *
 * This is Pillar 4 of AIFOS.
 */

import {
  AppId,
  IdentityId,
  ModuleId,
  AppType,
  AIFOSApplication,
  AppSDKCapability,
  AppMarketplaceEntry,
  ApplicationLayerConfig,
  PermissionScope,
  RiskCapLevel,
  AIFOSEvent,
  AIFOSEventCallback,
  AIFOSEventType,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_APP_LAYER_CONFIG: ApplicationLayerConfig = {
  enableAppMarketplace: true,
  requireAppAuditForCapitalAccess: true,
  maxAppsPerDeveloper: 50,
  appCapitalBudgetDefaultUSD: 1_000_000, // $1M default
  sandboxModeEnabled: true,
};

// ============================================================================
// Application Layer Interface
// ============================================================================

export interface ApplicationLayer {
  readonly config: ApplicationLayerConfig;

  // App registration
  registerApp(params: RegisterAppParams): AIFOSApplication;
  getApp(id: AppId): AIFOSApplication | undefined;
  listApps(filters?: AppFilters): AIFOSApplication[];
  updateApp(id: AppId, updates: Partial<AIFOSApplication>): AIFOSApplication;
  suspendApp(id: AppId, reason: string): void;
  activateApp(id: AppId): void;

  // SDK capabilities
  registerSDKCapability(capability: AppSDKCapability): void;
  getSDKCapabilities(moduleId?: ModuleId): AppSDKCapability[];
  listAvailableCapabilities(requiredPermissions: PermissionScope[]): AppSDKCapability[];

  // Marketplace
  listMarketplace(filters?: MarketplaceFilters): AppMarketplaceEntry[];
  publishToMarketplace(appId: AppId, entry: PublishMarketplaceParams): AppMarketplaceEntry;
  featureApp(appId: AppId): void;

  // App budget and permissions
  setAppCapitalBudget(appId: AppId, budgetUSD: number): void;
  setAppRiskBudget(appId: AppId, riskLevel: RiskCapLevel): void;
  validateAppOperation(appId: AppId, requiredPermission: PermissionScope): AppValidationResult;

  // Ecosystem metrics
  getEcosystemMetrics(): EcosystemMetrics;

  // Events
  onEvent(callback: AIFOSEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface RegisterAppParams {
  name: string;
  appType: AppType;
  developer: IdentityId;
  version: string;
  description: string;
  requiredModules?: ModuleId[];
  requiredPermissions?: PermissionScope[];
  capitalBudget?: number;
  riskBudget?: RiskCapLevel;
  jurisdictionScope?: string[];
  metadata?: Record<string, unknown>;
}

export interface AppFilters {
  appType?: AppType;
  developer?: IdentityId;
  status?: AIFOSApplication['status'];
  jurisdictionScope?: string;
}

export interface MarketplaceFilters {
  category?: AppType;
  featured?: boolean;
  minRating?: number;
  pricing?: AppMarketplaceEntry['pricing'];
  tag?: string;
}

export interface PublishMarketplaceParams {
  displayName: string;
  tags: string[];
  pricing: AppMarketplaceEntry['pricing'];
}

export interface AppValidationResult {
  valid: boolean;
  reason?: string;
  permissionGranted?: boolean;
  budgetRemaining?: number;
}

export interface EcosystemMetrics {
  totalApps: number;
  activeApps: number;
  suspendedApps: number;
  appsByType: Record<AppType, number>;
  totalCapitalBudgetAllocated: number;
  marketplaceListings: number;
  featuredApps: number;
  totalDevelopers: number;
}

// ============================================================================
// Default Application Layer Implementation
// ============================================================================

export class DefaultApplicationLayer implements ApplicationLayer {
  readonly config: ApplicationLayerConfig;

  private readonly apps = new Map<AppId, AIFOSApplication>();
  private readonly sdkCapabilities: AppSDKCapability[] = [];
  private readonly marketplaceEntries = new Map<AppId, AppMarketplaceEntry>();
  private readonly capitalBudgets = new Map<AppId, number>();
  private readonly eventCallbacks: AIFOSEventCallback[] = [];
  private appCounter = 0;

  constructor(config?: Partial<ApplicationLayerConfig>) {
    this.config = { ...DEFAULT_APP_LAYER_CONFIG, ...config };
    this.initializeBuiltinSDKCapabilities();
  }

  registerApp(params: RegisterAppParams): AIFOSApplication {
    const id: AppId = `app-${params.appType.replace(/_/g, '-')}-${++this.appCounter}-${Date.now()}`;

    const app: AIFOSApplication = {
      id,
      name: params.name,
      appType: params.appType,
      developer: params.developer,
      version: params.version,
      description: params.description,
      requiredModules: params.requiredModules ?? [],
      requiredPermissions: params.requiredPermissions ?? [],
      capitalBudget: params.capitalBudget ?? this.config.appCapitalBudgetDefaultUSD,
      riskBudget: params.riskBudget ?? 'moderate',
      jurisdictionScope: params.jurisdictionScope ?? ['global'],
      status: this.config.sandboxModeEnabled ? 'registered' : 'active',
      registeredAt: new Date(),
      metadata: params.metadata ?? {},
    };

    this.apps.set(id, app);
    this.capitalBudgets.set(id, app.capitalBudget ?? this.config.appCapitalBudgetDefaultUSD);

    this.emitEvent('app_registered', 'info', 'Applications', `App registered: ${params.name} (${params.appType})`, {
      appId: id,
      appType: params.appType,
      developer: params.developer,
    });

    return { ...app };
  }

  getApp(id: AppId): AIFOSApplication | undefined {
    const a = this.apps.get(id);
    return a ? { ...a } : undefined;
  }

  listApps(filters?: AppFilters): AIFOSApplication[] {
    let list = Array.from(this.apps.values());
    if (filters?.appType) list = list.filter(a => a.appType === filters.appType);
    if (filters?.developer) list = list.filter(a => a.developer === filters.developer);
    if (filters?.status) list = list.filter(a => a.status === filters.status);
    if (filters?.jurisdictionScope) {
      list = list.filter(a =>
        a.jurisdictionScope.includes('global') || a.jurisdictionScope.includes(filters.jurisdictionScope!),
      );
    }
    return list.map(a => ({ ...a }));
  }

  updateApp(id: AppId, updates: Partial<AIFOSApplication>): AIFOSApplication {
    const a = this.apps.get(id);
    if (!a) throw new Error(`App not found: ${id}`);

    const updated = { ...a, ...updates };
    this.apps.set(id, updated);
    return { ...updated };
  }

  suspendApp(id: AppId, reason: string): void {
    const a = this.apps.get(id);
    if (!a) throw new Error(`App not found: ${id}`);

    this.apps.set(id, { ...a, status: 'suspended' });
    this.emitEvent('app_launched', 'warning', 'Applications', `App suspended: ${a.name} (${reason})`, {
      appId: id,
      reason,
    });
  }

  activateApp(id: AppId): void {
    const a = this.apps.get(id);
    if (!a) throw new Error(`App not found: ${id}`);

    this.apps.set(id, { ...a, status: 'active', lastActiveAt: new Date() });
    this.emitEvent('app_launched', 'info', 'Applications', `App activated: ${a.name}`, { appId: id });
  }

  registerSDKCapability(capability: AppSDKCapability): void {
    this.sdkCapabilities.push({ ...capability });
  }

  getSDKCapabilities(moduleId?: ModuleId): AppSDKCapability[] {
    if (moduleId) return this.sdkCapabilities.filter(c => c.moduleId === moduleId).map(c => ({ ...c }));
    return this.sdkCapabilities.map(c => ({ ...c }));
  }

  listAvailableCapabilities(requiredPermissions: PermissionScope[]): AppSDKCapability[] {
    return this.sdkCapabilities
      .filter(c => requiredPermissions.includes(c.requiredPermission))
      .map(c => ({ ...c }));
  }

  listMarketplace(filters?: MarketplaceFilters): AppMarketplaceEntry[] {
    let list = Array.from(this.marketplaceEntries.values());
    if (filters?.category) list = list.filter(e => e.category === filters.category);
    if (filters?.featured !== undefined) list = list.filter(e => e.featured === filters.featured);
    if (filters?.minRating !== undefined) list = list.filter(e => e.rating >= (filters.minRating ?? 0));
    if (filters?.pricing) list = list.filter(e => e.pricing === filters.pricing);
    if (filters?.tag) list = list.filter(e => e.tags.includes(filters.tag!));
    return list.map(e => ({ ...e }));
  }

  publishToMarketplace(appId: AppId, entry: PublishMarketplaceParams): AppMarketplaceEntry {
    const a = this.apps.get(appId);
    if (!a) throw new Error(`App not found: ${appId}`);

    const marketEntry: AppMarketplaceEntry = {
      appId,
      displayName: entry.displayName,
      category: a.appType,
      tags: entry.tags,
      rating: 0,
      installCount: 0,
      monthlyActiveUsers: 0,
      pricing: entry.pricing,
      listedAt: new Date(),
      featured: false,
    };

    this.marketplaceEntries.set(appId, marketEntry);
    this.emitEvent('app_launched', 'info', 'Applications', `App published to marketplace: ${entry.displayName}`, {
      appId,
      category: a.appType,
    });

    return { ...marketEntry };
  }

  featureApp(appId: AppId): void {
    const entry = this.marketplaceEntries.get(appId);
    if (entry) {
      this.marketplaceEntries.set(appId, { ...entry, featured: true });
    }
  }

  setAppCapitalBudget(appId: AppId, budgetUSD: number): void {
    const a = this.apps.get(appId);
    if (!a) throw new Error(`App not found: ${appId}`);

    this.apps.set(appId, { ...a, capitalBudget: budgetUSD });
    this.capitalBudgets.set(appId, budgetUSD);
  }

  setAppRiskBudget(appId: AppId, riskLevel: RiskCapLevel): void {
    const a = this.apps.get(appId);
    if (!a) throw new Error(`App not found: ${appId}`);

    this.apps.set(appId, { ...a, riskBudget: riskLevel });
  }

  validateAppOperation(appId: AppId, requiredPermission: PermissionScope): AppValidationResult {
    const a = this.apps.get(appId);
    if (!a) return { valid: false, reason: `App not found: ${appId}` };
    if (a.status !== 'active') return { valid: false, reason: `App not active: ${a.status}` };

    const hasPermission = a.requiredPermissions.includes(requiredPermission);
    const budget = this.capitalBudgets.get(appId) ?? 0;

    return {
      valid: hasPermission,
      reason: hasPermission ? undefined : `Missing permission: ${requiredPermission}`,
      permissionGranted: hasPermission,
      budgetRemaining: budget,
    };
  }

  getEcosystemMetrics(): EcosystemMetrics {
    const all = Array.from(this.apps.values());
    const byType = {} as Record<AppType, number>;

    for (const a of all) {
      byType[a.appType] = (byType[a.appType] ?? 0) + 1;
    }

    const developers = new Set(all.map(a => a.developer));

    return {
      totalApps: all.length,
      activeApps: all.filter(a => a.status === 'active').length,
      suspendedApps: all.filter(a => a.status === 'suspended').length,
      appsByType: byType,
      totalCapitalBudgetAllocated: all.reduce((sum, a) => sum + (a.capitalBudget ?? 0), 0),
      marketplaceListings: this.marketplaceEntries.size,
      featuredApps: Array.from(this.marketplaceEntries.values()).filter(e => e.featured).length,
      totalDevelopers: developers.size,
    };
  }

  onEvent(callback: AIFOSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private initializeBuiltinSDKCapabilities(): void {
    const builtins: AppSDKCapability[] = [
      {
        capabilityId: 'sdk-capital-read',
        name: 'Capital State Read',
        description: 'Read current capital state from the financial kernel',
        moduleId: 'kernel',
        requiredPermission: 'kernel_read',
        apiEndpoint: '/aifos/kernel/capital',
        schemaVersion: 'v1',
      },
      {
        capabilityId: 'sdk-module-execute',
        name: 'Module Operation Execute',
        description: 'Execute operations on financial modules',
        moduleId: 'modules',
        requiredPermission: 'app_execute',
        apiEndpoint: '/aifos/modules/{moduleId}/execute',
        schemaVersion: 'v1',
      },
      {
        capabilityId: 'sdk-governance-vote',
        name: 'Governance Vote',
        description: 'Cast votes on governance proposals',
        moduleId: 'governance',
        requiredPermission: 'governance_vote',
        apiEndpoint: '/aifos/governance/vote',
        schemaVersion: 'v1',
      },
      {
        capabilityId: 'sdk-compliance-check',
        name: 'Compliance Gate Check',
        description: 'Verify compliance status for operations',
        moduleId: 'compliance',
        requiredPermission: 'compliance_gate',
        apiEndpoint: '/aifos/compliance/check',
        schemaVersion: 'v1',
      },
    ];

    for (const cap of builtins) {
      this.sdkCapabilities.push(cap);
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

export function createApplicationLayer(config?: Partial<ApplicationLayerConfig>): DefaultApplicationLayer {
  return new DefaultApplicationLayer(config);
}

export default DefaultApplicationLayer;
