/**
 * TONAIAgent - Tenant Isolation Layer
 *
 * Sandbox runtime abstraction providing process/container/WASM-level isolation
 * for agent execution. Enforces resource limits, network policies, and detects
 * cross-tenant access violations.
 *
 * Issue #99: Secure Multi-Tenant Agent Infrastructure & Isolation Layer
 */

import {
  TenantSandbox,
  SandboxStatus,
  SandboxResourceLimits,
  NetworkPolicy,
  SandboxMetrics,
  SandboxViolation,
  ViolationType,
  IsolationMode,
  MultiTenantEvent,
  MultiTenantEventCallback,
} from './types';

// ============================================================================
// Default Resource Limits
// ============================================================================

const DEFAULT_RESOURCE_LIMITS: SandboxResourceLimits = {
  maxCpuPercent: 25,
  maxMemoryMb: 256,
  maxStorageMb: 512,
  maxNetworkCallsPerMinute: 60,
  maxExecutionTimeMs: 30000, // 30 seconds
  maxConcurrentTasks: 5,
};

const DEFAULT_NETWORK_POLICY: NetworkPolicy = {
  allowedOutboundDomains: [
    'tonapi.io',
    'toncenter.com',
    'dedust.io',
    'stonfi.com',
    'getgems.io',
    'api.anthropic.com',
    'api.openai.com',
    'api.groq.com',
  ],
  allowedInboundSources: [],
  blockPrivateNetworks: true,
  blockMetadataEndpoints: true,
  rateLimitPerMinute: 60,
};

// ============================================================================
// Isolation Engine
// ============================================================================

export class IsolationEngine {
  private readonly sandboxes = new Map<string, TenantSandbox>(); // sandboxId → sandbox
  private readonly agentSandboxes = new Map<string, string>(); // `${tenantId}:${agentId}` → sandboxId
  private readonly violations: SandboxViolation[] = [];
  private readonly eventCallbacks: MultiTenantEventCallback[] = [];

  /**
   * Provision a new sandbox for an agent within a tenant.
   */
  async createSandbox(
    tenantId: string,
    agentId: string,
    mode: IsolationMode = 'sandbox',
    resourceOverrides?: Partial<SandboxResourceLimits>,
    networkOverrides?: Partial<NetworkPolicy>
  ): Promise<TenantSandbox> {
    const sandboxId = `sb_${tenantId}_${agentId}_${Date.now()}`;

    const sandbox: TenantSandbox = {
      id: sandboxId,
      tenantId,
      agentId,
      mode,
      status: 'initializing',
      resourceLimits: { ...DEFAULT_RESOURCE_LIMITS, ...resourceOverrides },
      networkPolicy: { ...DEFAULT_NETWORK_POLICY, ...networkOverrides },
      createdAt: new Date(),
      lastActivityAt: new Date(),
      metrics: {
        cpuUsagePercent: 0,
        memoryUsageMb: 0,
        storageUsageMb: 0,
        networkCallsLastMinute: 0,
        activeTasks: 0,
        totalTasksExecuted: 0,
      },
    };

    this.sandboxes.set(sandboxId, sandbox);
    this.agentSandboxes.set(`${tenantId}:${agentId}`, sandboxId);

    // Transition to active
    sandbox.status = 'active';
    this.sandboxes.set(sandboxId, sandbox);

    return sandbox;
  }

  /**
   * Get the sandbox for a given agent within a tenant.
   */
  getSandbox(tenantId: string, agentId: string): TenantSandbox | undefined {
    const key = `${tenantId}:${agentId}`;
    const sandboxId = this.agentSandboxes.get(key);
    return sandboxId ? this.sandboxes.get(sandboxId) : undefined;
  }

  /**
   * Get sandbox by ID.
   */
  getSandboxById(sandboxId: string): TenantSandbox | undefined {
    return this.sandboxes.get(sandboxId);
  }

  /**
   * List all sandboxes for a tenant.
   */
  listSandboxes(tenantId: string, status?: SandboxStatus): TenantSandbox[] {
    const all = Array.from(this.sandboxes.values()).filter((s) => s.tenantId === tenantId);
    return status ? all.filter((s) => s.status === status) : all;
  }

  /**
   * Execute an action within an isolated sandbox context.
   * Enforces resource limits and detects cross-tenant violations.
   */
  async executeInSandbox<T>(
    tenantId: string,
    agentId: string,
    action: () => Promise<T>
  ): Promise<T> {
    const sandbox = this.getSandbox(tenantId, agentId);
    if (!sandbox) {
      throw new Error(`No sandbox found for agent ${agentId} in tenant ${tenantId}`);
    }

    if (sandbox.status !== 'active') {
      throw new Error(`Sandbox is not active: ${sandbox.status}`);
    }

    // Enforce concurrent task limit
    if (sandbox.metrics.activeTasks >= sandbox.resourceLimits.maxConcurrentTasks) {
      this.recordViolation(sandbox, 'resource_limit_exceeded', 'medium', `Concurrent task limit exceeded: ${sandbox.metrics.activeTasks}/${sandbox.resourceLimits.maxConcurrentTasks}`);
      throw new Error(`Resource limit exceeded: max concurrent tasks (${sandbox.resourceLimits.maxConcurrentTasks})`);
    }

    // Track active task
    sandbox.metrics.activeTasks += 1;
    sandbox.lastActivityAt = new Date();

    const startTime = Date.now();
    try {
      // Execute with timeout
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Execution timeout after ${sandbox.resourceLimits.maxExecutionTimeMs}ms`)),
            sandbox.resourceLimits.maxExecutionTimeMs
          )
        ),
      ]);

      sandbox.metrics.totalTasksExecuted += 1;
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      sandbox.metrics.lastError = msg;

      if (msg.includes('timeout')) {
        this.recordViolation(sandbox, 'resource_limit_exceeded', 'high', msg);
      }
      throw error;
    } finally {
      sandbox.metrics.activeTasks = Math.max(0, sandbox.metrics.activeTasks - 1);
      const elapsed = Date.now() - startTime;
      // Simulate CPU usage tracking (in production, use real cgroups/container metrics)
      sandbox.metrics.cpuUsagePercent = Math.min(
        100,
        sandbox.metrics.cpuUsagePercent + elapsed / 1000
      );
    }
  }

  /**
   * Validate a network call against the sandbox's network policy.
   */
  validateNetworkAccess(
    tenantId: string,
    agentId: string,
    targetDomain: string
  ): { allowed: boolean; reason?: string } {
    const sandbox = this.getSandbox(tenantId, agentId);
    if (!sandbox) {
      return { allowed: false, reason: 'No sandbox found for agent' };
    }

    const policy = sandbox.networkPolicy;

    // Block private networks
    if (policy.blockPrivateNetworks && this.isPrivateNetwork(targetDomain)) {
      this.recordViolation(
        sandbox,
        'unauthorized_network_access',
        'high',
        `Attempted access to private network: ${targetDomain}`
      );
      return { allowed: false, reason: `Private network access blocked: ${targetDomain}` };
    }

    // Block metadata endpoints (cloud SSRF prevention)
    if (policy.blockMetadataEndpoints && this.isMetadataEndpoint(targetDomain)) {
      this.recordViolation(
        sandbox,
        'unauthorized_network_access',
        'critical',
        `Attempted access to metadata endpoint: ${targetDomain}`
      );
      return { allowed: false, reason: `Metadata endpoint access blocked: ${targetDomain}` };
    }

    // Check rate limit
    if (sandbox.metrics.networkCallsLastMinute >= policy.rateLimitPerMinute) {
      this.recordViolation(
        sandbox,
        'resource_limit_exceeded',
        'medium',
        `Network rate limit exceeded: ${sandbox.metrics.networkCallsLastMinute}/${policy.rateLimitPerMinute}`
      );
      return { allowed: false, reason: `Network rate limit exceeded` };
    }

    // Check allowed domains
    const isAllowed = policy.allowedOutboundDomains.some((domain) =>
      targetDomain.endsWith(domain) || targetDomain === domain
    );

    if (!isAllowed) {
      this.recordViolation(
        sandbox,
        'unauthorized_network_access',
        'medium',
        `Domain not in allowlist: ${targetDomain}`
      );
      return { allowed: false, reason: `Domain not in allowlist: ${targetDomain}` };
    }

    sandbox.metrics.networkCallsLastMinute += 1;
    return { allowed: true };
  }

  /**
   * Detect cross-tenant access attempts.
   * Returns true if the access is legitimate (same tenant), false if cross-tenant violation.
   */
  validateCrossTenantAccess(
    callerTenantId: string,
    callerAgentId: string,
    targetTenantId: string
  ): boolean {
    if (callerTenantId === targetTenantId) {
      return true; // Same tenant, allowed
    }

    const sandbox = this.getSandbox(callerTenantId, callerAgentId);
    if (sandbox) {
      this.recordViolation(
        sandbox,
        'cross_tenant_access',
        'critical',
        `Cross-tenant access attempt: agent "${callerAgentId}" in tenant "${callerTenantId}" tried to access tenant "${targetTenantId}"`
      );
    }

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'isolation_breach',
      tenantId: callerTenantId,
      severity: 'critical',
      source: 'isolation_engine',
      message: `Cross-tenant access attempt detected`,
      data: {
        callerTenantId,
        callerAgentId,
        targetTenantId,
      },
    });

    return false;
  }

  /**
   * Pause a sandbox, preventing new task execution.
   */
  async pauseSandbox(tenantId: string, agentId: string): Promise<void> {
    const sandbox = this.getSandbox(tenantId, agentId);
    if (!sandbox) {
      throw new Error(`No sandbox found for agent ${agentId} in tenant ${tenantId}`);
    }
    sandbox.status = 'paused';
    this.sandboxes.set(sandbox.id, sandbox);
  }

  /**
   * Resume a paused sandbox.
   */
  async resumeSandbox(tenantId: string, agentId: string): Promise<void> {
    const sandbox = this.getSandbox(tenantId, agentId);
    if (!sandbox) {
      throw new Error(`No sandbox found for agent ${agentId} in tenant ${tenantId}`);
    }
    if (sandbox.status !== 'paused') {
      throw new Error(`Sandbox is not paused: ${sandbox.status}`);
    }
    sandbox.status = 'active';
    this.sandboxes.set(sandbox.id, sandbox);
  }

  /**
   * Terminate a sandbox and clean up its resources.
   */
  async terminateSandbox(tenantId: string, agentId: string): Promise<void> {
    const key = `${tenantId}:${agentId}`;
    const sandboxId = this.agentSandboxes.get(key);
    if (!sandboxId) return;

    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.status = 'terminated';
      this.sandboxes.set(sandboxId, sandbox);
    }

    this.agentSandboxes.delete(key);
  }

  /**
   * Update sandbox metrics (for monitoring integration).
   */
  updateMetrics(
    tenantId: string,
    agentId: string,
    metrics: Partial<SandboxMetrics>
  ): void {
    const sandbox = this.getSandbox(tenantId, agentId);
    if (!sandbox) return;

    sandbox.metrics = { ...sandbox.metrics, ...metrics };
    sandbox.lastActivityAt = new Date();
    this.sandboxes.set(sandbox.id, sandbox);

    // Check for resource violations
    if (
      metrics.cpuUsagePercent !== undefined &&
      metrics.cpuUsagePercent > sandbox.resourceLimits.maxCpuPercent
    ) {
      this.recordViolation(
        sandbox,
        'resource_limit_exceeded',
        'medium',
        `CPU limit exceeded: ${metrics.cpuUsagePercent}% > ${sandbox.resourceLimits.maxCpuPercent}%`
      );
    }

    if (
      metrics.memoryUsageMb !== undefined &&
      metrics.memoryUsageMb > sandbox.resourceLimits.maxMemoryMb
    ) {
      this.recordViolation(
        sandbox,
        'resource_limit_exceeded',
        'high',
        `Memory limit exceeded: ${metrics.memoryUsageMb}MB > ${sandbox.resourceLimits.maxMemoryMb}MB`
      );
    }
  }

  /**
   * Get all violations for a tenant.
   */
  getViolations(tenantId: string, since?: Date): SandboxViolation[] {
    return this.violations.filter(
      (v) => v.tenantId === tenantId && (!since || v.detectedAt >= since)
    );
  }

  /**
   * Get all violations for a specific agent.
   */
  getAgentViolations(tenantId: string, agentId: string): SandboxViolation[] {
    return this.violations.filter((v) => v.tenantId === tenantId && v.agentId === agentId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private recordViolation(
    sandbox: TenantSandbox,
    type: ViolationType,
    severity: SandboxViolation['severity'],
    description: string
  ): void {
    const violation: SandboxViolation = {
      id: `viol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sandboxId: sandbox.id,
      tenantId: sandbox.tenantId,
      agentId: sandbox.agentId,
      type,
      severity,
      description,
      detectedAt: new Date(),
      metadata: {
        metrics: { ...sandbox.metrics },
        resourceLimits: { ...sandbox.resourceLimits },
      },
    };

    this.violations.push(violation);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'sandbox_violation',
      tenantId: sandbox.tenantId,
      severity: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
      source: 'isolation_engine',
      message: `Sandbox violation: ${description}`,
      data: {
        violationId: violation.id,
        sandboxId: sandbox.id,
        agentId: sandbox.agentId,
        type,
        severity,
      },
    });
  }

  private isPrivateNetwork(domain: string): boolean {
    return (
      domain.startsWith('192.168.') ||
      domain.startsWith('10.') ||
      domain.startsWith('172.16.') ||
      domain.startsWith('172.17.') ||
      domain.startsWith('172.18.') ||
      domain.startsWith('172.19.') ||
      domain.startsWith('172.2') ||
      domain.startsWith('172.3') ||
      domain === 'localhost' ||
      domain === '127.0.0.1' ||
      domain === '::1'
    );
  }

  private isMetadataEndpoint(domain: string): boolean {
    // AWS/GCP/Azure metadata endpoints
    return (
      domain === '169.254.169.254' ||
      domain.includes('metadata.google.internal') ||
      domain === '168.63.129.16'
    );
  }

  onEvent(callback: MultiTenantEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: MultiTenantEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore
      }
    }
  }
}

export function createIsolationEngine(): IsolationEngine {
  return new IsolationEngine();
}

export { DEFAULT_RESOURCE_LIMITS, DEFAULT_NETWORK_POLICY };
