/**
 * TONAIAgent - Multi-Tenant Infrastructure Tests
 *
 * Comprehensive tests for the Secure Multi-Tenant Agent Infrastructure &
 * Isolation Layer (Issue #99).
 *
 * Covers:
 * - Tenant lifecycle management
 * - RBAC with role inheritance
 * - Sandbox isolation and violation detection
 * - Secret vault with encryption and rotation
 * - Wallet isolation per agent
 * - End-to-end multi-tenant flows
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Manager
  createMultiTenantManager,
  MultiTenantManager,

  // Components
  createTenantManager,
  TenantManager,
  createRbacManager,
  RbacManager,
  createIsolationEngine,
  IsolationEngine,
  createTenantVault,
  TenantVault,
  createWalletIsolationManager,
  WalletIsolationManager,

  // Constants
  TIER_LIMITS,
  SYSTEM_ROLES,
  DEFAULT_RESOURCE_LIMITS,
  DEFAULT_WALLET_LIMITS,

  // Types
  Tenant,
  TenantContext,
  RoleName,
  IsolatedWallet,
} from '../../services/multi-tenant';

// ============================================================================
// Tenant Manager Tests
// ============================================================================

describe('TenantManager', () => {
  let manager: TenantManager;

  beforeEach(() => {
    manager = createTenantManager();
  });

  describe('Tenant Provisioning', () => {
    it('should create a tenant with default free tier', async () => {
      const tenant = await manager.createTenant({
        name: 'Acme Corp',
        ownerId: 'user_alice',
      });

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Acme Corp');
      expect(tenant.tier).toBe('free');
      expect(tenant.status).toBe('active');
      expect(tenant.ownerId).toBe('user_alice');
    });

    it('should create a tenant with enterprise tier and correct limits', async () => {
      const tenant = await manager.createTenant({
        name: 'Enterprise Inc',
        ownerId: 'user_admin',
        tier: 'enterprise',
      });

      expect(tenant.tier).toBe('enterprise');
      expect(tenant.limits.maxAgents).toBe(TIER_LIMITS.enterprise.maxAgents);
      expect(tenant.limits.maxUsers).toBe(TIER_LIMITS.enterprise.maxUsers);
    });

    it('should auto-assign owner as admin', async () => {
      const tenant = await manager.createTenant({
        name: 'Test Org',
        ownerId: 'user_owner',
      });

      const roles = manager.getUserRoles(tenant.id, 'user_owner');
      expect(roles).toContain('admin');
    });

    it('should apply custom metadata', async () => {
      const tenant = await manager.createTenant({
        name: 'FinTech Ltd',
        ownerId: 'user_ceo',
        metadata: {
          industry: 'finance',
          country: 'US',
          contactEmail: 'admin@fintech.com',
        },
      });

      expect(tenant.metadata.industry).toBe('finance');
      expect(tenant.metadata.country).toBe('US');
      expect(tenant.metadata.contactEmail).toBe('admin@fintech.com');
    });
  });

  describe('Tenant Retrieval', () => {
    it('should retrieve a tenant by ID', async () => {
      const created = await manager.createTenant({ name: 'Test', ownerId: 'user_1' });
      const retrieved = manager.getTenant(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent tenant', () => {
      expect(manager.getTenant('nonexistent_id')).toBeUndefined();
    });

    it('should list active tenants', async () => {
      await manager.createTenant({ name: 'Active 1', ownerId: 'u1' });
      await manager.createTenant({ name: 'Active 2', ownerId: 'u2' });
      const t3 = await manager.createTenant({ name: 'To Suspend', ownerId: 'u3' });
      await manager.suspendTenant(t3.id, 'Testing');

      const active = manager.listTenants('active');
      expect(active.length).toBe(2);
      expect(active.every((t) => t.status === 'active')).toBe(true);
    });
  });

  describe('Tenant Status Transitions', () => {
    it('should suspend an active tenant', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      const suspended = await manager.suspendTenant(tenant.id, 'Violation detected');

      expect(suspended.status).toBe('suspended');
    });

    it('should resume a suspended tenant', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      await manager.suspendTenant(tenant.id, 'Testing');
      const resumed = await manager.resumeTenant(tenant.id);

      expect(resumed.status).toBe('active');
    });

    it('should not resume a non-suspended tenant', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      await expect(manager.resumeTenant(tenant.id)).rejects.toThrow();
    });

    it('should terminate a tenant', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      const terminated = await manager.terminateTenant(tenant.id, 'Account closed');

      expect(terminated.status).toBe('terminated');
    });

    it('should not suspend a terminated tenant', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      await manager.terminateTenant(tenant.id, 'Closed');
      await expect(manager.suspendTenant(tenant.id, 'Testing')).rejects.toThrow();
    });
  });

  describe('Tier Management', () => {
    it('should upgrade tier with new limits', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1', tier: 'free' });
      const upgraded = await manager.changeTier(tenant.id, 'professional');

      expect(upgraded.tier).toBe('professional');
      expect(upgraded.limits.maxAgents).toBe(TIER_LIMITS.professional.maxAgents);
    });
  });

  describe('User Role Management', () => {
    it('should assign a role to a user', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      await manager.assignUserRole(tenant.id, 'user_bob', 'developer', 'u1');

      const roles = manager.getUserRoles(tenant.id, 'user_bob');
      expect(roles).toContain('developer');
    });

    it('should remove a role from a user', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      await manager.assignUserRole(tenant.id, 'user_bob', 'developer', 'u1');
      await manager.removeUserRole(tenant.id, 'user_bob', 'developer');

      const roles = manager.getUserRoles(tenant.id, 'user_bob');
      expect(roles).not.toContain('developer');
    });

    it('should not assign duplicate roles', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      await manager.assignUserRole(tenant.id, 'user_bob', 'developer', 'u1');
      await manager.assignUserRole(tenant.id, 'user_bob', 'developer', 'u1'); // duplicate

      const roles = manager.getUserRoles(tenant.id, 'user_bob');
      expect(roles.filter((r) => r === 'developer').length).toBe(1);
    });

    it('should build correct context for user', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      await manager.assignUserRole(tenant.id, 'user_bob', 'developer', 'u1');

      const ctx = manager.buildContext(tenant.id, 'user_bob', 'session_123');
      expect(ctx.tenantId).toBe(tenant.id);
      expect(ctx.userId).toBe('user_bob');
      expect(ctx.roles).toContain('developer');
    });
  });

  describe('Tenant Access Verification', () => {
    it('should allow access for active tenant', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      const result = manager.verifyTenantAccess(tenant.id);
      expect(result.allowed).toBe(true);
    });

    it('should deny access for suspended tenant', async () => {
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      await manager.suspendTenant(tenant.id, 'Test');
      const result = manager.verifyTenantAccess(tenant.id);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('suspended');
    });

    it('should deny access for non-existent tenant', () => {
      const result = manager.verifyTenantAccess('nonexistent');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit event on tenant creation', async () => {
      const events: any[] = [];
      manager.onEvent((e) => events.push(e));

      await manager.createTenant({ name: 'EventTest', ownerId: 'u1' });

      const created = events.find((e) => e.type === 'tenant_created');
      expect(created).toBeDefined();
      expect(created.message).toContain('EventTest');
    });

    it('should emit event on tenant suspension', async () => {
      const events: any[] = [];
      const tenant = await manager.createTenant({ name: 'Test', ownerId: 'u1' });
      manager.onEvent((e) => events.push(e));
      await manager.suspendTenant(tenant.id, 'Violation');

      expect(events.some((e) => e.type === 'tenant_suspended')).toBe(true);
    });
  });
});

// ============================================================================
// RBAC Tests
// ============================================================================

describe('RbacManager', () => {
  let rbac: RbacManager;

  beforeEach(() => {
    rbac = createRbacManager();
  });

  describe('System Roles', () => {
    it('should have all required system roles', () => {
      const roles = rbac.listRoles();
      const roleNames = roles.map((r) => r.name);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('user');
      expect(roleNames).toContain('developer');
      expect(roleNames).toContain('enterprise');
      expect(roleNames).toContain('dao_operator');
      expect(roleNames).toContain('auditor');
      expect(roleNames).toContain('readonly');
    });

    it('should get a role by name', () => {
      const admin = rbac.getRole('admin');
      expect(admin.name).toBe('admin');
      expect(admin.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Resolution', () => {
    it('should resolve permissions for admin role', () => {
      const perms = rbac.resolvePermissions(['admin']);
      const resources = perms.map((p) => p.resource);
      expect(resources).toContain('agent');
      expect(resources).toContain('wallet');
      expect(resources).toContain('secret');
    });

    it('should resolve inherited permissions for developer', () => {
      // Developer inherits from user
      const perms = rbac.resolvePermissions(['developer']);
      // Should have api_key permissions (developer-specific)
      expect(perms.some((p) => p.resource === 'api_key' && p.action === 'create')).toBe(true);
    });

    it('should not duplicate permissions from inheritance', () => {
      const perms = rbac.resolvePermissions(['developer']);
      const keys = perms.map((p) => `${p.resource}:${p.action}`);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('should resolve permissions for multiple roles', () => {
      const perms = rbac.resolvePermissions(['auditor', 'readonly']);
      expect(perms.some((p) => p.resource === 'audit_log' && p.action === 'read')).toBe(true);
      expect(perms.some((p) => p.resource === 'dashboard' && p.action === 'read')).toBe(true);
    });
  });

  describe('Permission Checks', () => {
    it('should allow admin full access', () => {
      expect(rbac.hasPermission(['admin'], 'agent', 'create')).toBe(true);
      expect(rbac.hasPermission(['admin'], 'secret', 'delete')).toBe(true);
      expect(rbac.hasPermission(['admin'], 'tenant', 'update')).toBe(true);
    });

    it('should allow user to create agents', () => {
      expect(rbac.hasPermission(['user'], 'agent', 'create')).toBe(true);
    });

    it('should deny user from deleting wallets', () => {
      expect(rbac.hasPermission(['user'], 'wallet', 'delete')).toBe(false);
    });

    it('should allow readonly role to read agents but not create', () => {
      expect(rbac.hasPermission(['readonly'], 'agent', 'read')).toBe(true);
      expect(rbac.hasPermission(['readonly'], 'agent', 'create')).toBe(false);
    });

    it('should allow auditor to read and export audit logs', () => {
      expect(rbac.hasPermission(['auditor'], 'audit_log', 'read')).toBe(true);
      expect(rbac.hasPermission(['auditor'], 'audit_log', 'export')).toBe(true);
      expect(rbac.hasPermission(['auditor'], 'agent', 'create')).toBe(false);
    });
  });

  describe('Access Check', () => {
    it('should allow access for user with correct role', () => {
      const result = rbac.checkAccess({
        tenantId: 'tenant_1',
        userId: 'user_bob',
        roles: ['user'],
        resource: 'agent',
        action: 'create',
      });
      expect(result.allowed).toBe(true);
    });

    it('should deny access without permission', () => {
      const result = rbac.checkAccess({
        tenantId: 'tenant_1',
        userId: 'user_bob',
        roles: ['readonly'],
        resource: 'secret',
        action: 'delete',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Insufficient permissions');
    });

    it('should deny access based on custom policy', () => {
      rbac.addPolicy({
        id: 'policy_deny_dev_delete',
        tenantId: 'tenant_1',
        name: 'Block developer delete',
        description: 'Prevent developers from deleting agents',
        roles: ['developer'],
        resources: ['agent'],
        actions: ['delete'],
        effect: 'deny',
        priority: 100,
        enabled: true,
        createdAt: new Date(),
      });

      const result = rbac.checkAccess({
        tenantId: 'tenant_1',
        userId: 'user_dev',
        roles: ['developer'],
        resource: 'agent',
        action: 'delete',
      });
      expect(result.allowed).toBe(false);
      expect(result.matchedPolicy).toBe('policy_deny_dev_delete');
    });

    it('should allow via custom policy', () => {
      rbac.addPolicy({
        id: 'policy_allow_readonly_delete',
        tenantId: 'tenant_1',
        name: 'Allow special readonly to delete old strategies',
        description: 'Custom allow policy',
        roles: ['readonly'],
        resources: ['strategy'],
        actions: ['delete'],
        effect: 'allow',
        priority: 50,
        enabled: true,
        createdAt: new Date(),
      });

      const result = rbac.checkAccess({
        tenantId: 'tenant_1',
        userId: 'user_readonly',
        roles: ['readonly'],
        resource: 'strategy',
        action: 'delete',
      });
      expect(result.allowed).toBe(true);
    });

    it('should list policies for a tenant', () => {
      rbac.addPolicy({
        id: 'p1',
        tenantId: 'tenant_2',
        name: 'P1',
        description: '',
        roles: ['user'],
        resources: ['agent'],
        actions: ['delete'],
        effect: 'deny',
        priority: 10,
        enabled: true,
        createdAt: new Date(),
      });

      const policies = rbac.listPolicies('tenant_2');
      expect(policies.length).toBe(1);
      expect(policies[0].id).toBe('p1');
    });

    it('should remove a policy', () => {
      rbac.addPolicy({
        id: 'p_remove',
        tenantId: 'tenant_3',
        name: 'To Remove',
        description: '',
        roles: ['user'],
        resources: ['agent'],
        actions: ['create'],
        effect: 'deny',
        priority: 10,
        enabled: true,
        createdAt: new Date(),
      });

      const removed = rbac.removePolicy('tenant_3', 'p_remove');
      expect(removed).toBe(true);
      expect(rbac.listPolicies('tenant_3').length).toBe(0);
    });
  });

  describe('Context Enrichment', () => {
    it('should enrich context with resolved permissions', () => {
      const ctx: TenantContext = {
        tenantId: 'tenant_1',
        userId: 'user_1',
        sessionId: 'session_1',
        roles: ['developer'],
        permissions: [],
        timestamp: new Date(),
      };

      const enriched = rbac.enrichContext(ctx);
      expect(enriched.permissions.length).toBeGreaterThan(0);
      expect(enriched.permissions.some((p) => p.resource === 'api_key' && p.action === 'create')).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit access_denied event', () => {
      const events: any[] = [];
      rbac.onEvent((e) => events.push(e));

      rbac.checkAccess({
        tenantId: 'tenant_1',
        userId: 'user_limited',
        roles: ['readonly'],
        resource: 'secret',
        action: 'delete',
      });

      expect(events.some((e) => e.type === 'access_denied')).toBe(true);
    });
  });
});

// ============================================================================
// Isolation Engine Tests
// ============================================================================

describe('IsolationEngine', () => {
  let engine: IsolationEngine;

  beforeEach(() => {
    engine = createIsolationEngine();
  });

  describe('Sandbox Provisioning', () => {
    it('should create a sandbox for an agent', async () => {
      const sandbox = await engine.createSandbox('tenant_1', 'agent_1');

      expect(sandbox.id).toBeDefined();
      expect(sandbox.tenantId).toBe('tenant_1');
      expect(sandbox.agentId).toBe('agent_1');
      expect(sandbox.status).toBe('active');
    });

    it('should apply default resource limits', async () => {
      const sandbox = await engine.createSandbox('tenant_1', 'agent_1');

      expect(sandbox.resourceLimits.maxCpuPercent).toBe(DEFAULT_RESOURCE_LIMITS.maxCpuPercent);
      expect(sandbox.resourceLimits.maxMemoryMb).toBe(DEFAULT_RESOURCE_LIMITS.maxMemoryMb);
    });

    it('should accept resource limit overrides', async () => {
      const sandbox = await engine.createSandbox('tenant_1', 'agent_2', 'sandbox', {
        maxMemoryMb: 512,
        maxConcurrentTasks: 10,
      });

      expect(sandbox.resourceLimits.maxMemoryMb).toBe(512);
      expect(sandbox.resourceLimits.maxConcurrentTasks).toBe(10);
    });

    it('should retrieve sandbox by agent', async () => {
      await engine.createSandbox('tenant_1', 'agent_3');
      const retrieved = engine.getSandbox('tenant_1', 'agent_3');

      expect(retrieved).toBeDefined();
      expect(retrieved?.agentId).toBe('agent_3');
    });

    it('should list sandboxes for a tenant', async () => {
      await engine.createSandbox('tenant_X', 'agent_A');
      await engine.createSandbox('tenant_X', 'agent_B');
      await engine.createSandbox('tenant_Y', 'agent_C');

      const tenantXSandboxes = engine.listSandboxes('tenant_X');
      expect(tenantXSandboxes.length).toBe(2);
    });
  });

  describe('Sandbox Execution', () => {
    it('should execute an action within sandbox context', async () => {
      await engine.createSandbox('tenant_1', 'agent_exec');
      const result = await engine.executeInSandbox('tenant_1', 'agent_exec', async () => {
        return 42;
      });
      expect(result).toBe(42);
    });

    it('should track task execution count', async () => {
      await engine.createSandbox('tenant_1', 'agent_track');
      await engine.executeInSandbox('tenant_1', 'agent_track', async () => 'done');
      await engine.executeInSandbox('tenant_1', 'agent_track', async () => 'done2');

      const sandbox = engine.getSandbox('tenant_1', 'agent_track');
      expect(sandbox?.metrics.totalTasksExecuted).toBe(2);
    });

    it('should throw if no sandbox exists for agent', async () => {
      await expect(
        engine.executeInSandbox('tenant_1', 'nonexistent_agent', async () => 'test')
      ).rejects.toThrow('No sandbox found');
    });
  });

  describe('Network Policy Validation', () => {
    it('should allow access to whitelisted domains', async () => {
      await engine.createSandbox('tenant_1', 'agent_net');
      const result = engine.validateNetworkAccess('tenant_1', 'agent_net', 'tonapi.io');
      expect(result.allowed).toBe(true);
    });

    it('should block non-whitelisted domains', async () => {
      await engine.createSandbox('tenant_1', 'agent_net2');
      const result = engine.validateNetworkAccess('tenant_1', 'agent_net2', 'evil.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('allowlist');
    });

    it('should block private network access', async () => {
      await engine.createSandbox('tenant_1', 'agent_net3');
      const result = engine.validateNetworkAccess('tenant_1', 'agent_net3', '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Private');
    });

    it('should block localhost access', async () => {
      await engine.createSandbox('tenant_1', 'agent_localhost');
      const result = engine.validateNetworkAccess('tenant_1', 'agent_localhost', 'localhost');
      expect(result.allowed).toBe(false);
    });

    it('should block metadata endpoint access (SSRF prevention)', async () => {
      await engine.createSandbox('tenant_1', 'agent_ssrf');
      const result = engine.validateNetworkAccess('tenant_1', 'agent_ssrf', '169.254.169.254');
      expect(result.allowed).toBe(false);
    });

    it('should record violation for blocked network access', async () => {
      await engine.createSandbox('tenant_1', 'agent_viol');
      engine.validateNetworkAccess('tenant_1', 'agent_viol', 'evil.com');

      const violations = engine.getViolations('tenant_1');
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('unauthorized_network_access');
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should allow same-tenant access', () => {
      const allowed = engine.validateCrossTenantAccess('tenant_A', 'agent_1', 'tenant_A');
      expect(allowed).toBe(true);
    });

    it('should block cross-tenant access', async () => {
      await engine.createSandbox('tenant_A', 'agent_1');
      const allowed = engine.validateCrossTenantAccess('tenant_A', 'agent_1', 'tenant_B');
      expect(allowed).toBe(false);
    });

    it('should record critical violation for cross-tenant attempt', async () => {
      await engine.createSandbox('tenant_A', 'agent_1');
      engine.validateCrossTenantAccess('tenant_A', 'agent_1', 'tenant_B');

      const violations = engine.getViolations('tenant_A');
      const crossTenantViolation = violations.find((v) => v.type === 'cross_tenant_access');
      expect(crossTenantViolation).toBeDefined();
      expect(crossTenantViolation?.severity).toBe('critical');
    });
  });

  describe('Sandbox Control', () => {
    it('should pause and resume a sandbox', async () => {
      await engine.createSandbox('tenant_1', 'agent_ctrl');
      await engine.pauseSandbox('tenant_1', 'agent_ctrl');

      const paused = engine.getSandbox('tenant_1', 'agent_ctrl');
      expect(paused?.status).toBe('paused');

      await engine.resumeSandbox('tenant_1', 'agent_ctrl');
      const resumed = engine.getSandbox('tenant_1', 'agent_ctrl');
      expect(resumed?.status).toBe('active');
    });

    it('should block execution on paused sandbox', async () => {
      await engine.createSandbox('tenant_1', 'agent_paused');
      await engine.pauseSandbox('tenant_1', 'agent_paused');

      await expect(
        engine.executeInSandbox('tenant_1', 'agent_paused', async () => 'test')
      ).rejects.toThrow('not active');
    });

    it('should terminate a sandbox', async () => {
      await engine.createSandbox('tenant_1', 'agent_term');
      await engine.terminateSandbox('tenant_1', 'agent_term');

      const terminated = engine.getSandbox('tenant_1', 'agent_term');
      // After termination, removed from agentSandboxes map
      expect(terminated).toBeUndefined();
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should update sandbox metrics', async () => {
      await engine.createSandbox('tenant_1', 'agent_metrics');
      engine.updateMetrics('tenant_1', 'agent_metrics', {
        cpuUsagePercent: 15,
        memoryUsageMb: 128,
      });

      const sandbox = engine.getSandbox('tenant_1', 'agent_metrics');
      expect(sandbox?.metrics.cpuUsagePercent).toBe(15);
      expect(sandbox?.metrics.memoryUsageMb).toBe(128);
    });

    it('should record violation when memory limit exceeded', async () => {
      await engine.createSandbox('tenant_1', 'agent_mem', 'sandbox', {
        maxMemoryMb: 100,
      });

      engine.updateMetrics('tenant_1', 'agent_mem', { memoryUsageMb: 200 });

      const violations = engine.getAgentViolations('tenant_1', 'agent_mem');
      expect(violations.some((v) => v.type === 'resource_limit_exceeded')).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit sandbox_violation event', async () => {
      const events: any[] = [];
      engine.onEvent((e) => events.push(e));

      await engine.createSandbox('tenant_ev', 'agent_ev');
      engine.validateNetworkAccess('tenant_ev', 'agent_ev', 'malicious.io');

      expect(events.some((e) => e.type === 'sandbox_violation')).toBe(true);
    });

    it('should emit isolation_breach on cross-tenant access', async () => {
      const events: any[] = [];
      engine.onEvent((e) => events.push(e));

      await engine.createSandbox('tenant_ev2', 'agent_ev2');
      engine.validateCrossTenantAccess('tenant_ev2', 'agent_ev2', 'tenant_other');

      expect(events.some((e) => e.type === 'isolation_breach')).toBe(true);
    });
  });
});

// ============================================================================
// Tenant Vault Tests
// ============================================================================

describe('TenantVault', () => {
  let vault: TenantVault;

  beforeEach(() => {
    vault = createTenantVault();
  });

  describe('Secret Storage', () => {
    it('should store and retrieve a secret', async () => {
      const secret = await vault.createSecret(
        {
          tenantId: 'tenant_1',
          name: 'TELEGRAM_TOKEN',
          type: 'telegram_token',
          value: 'bot123456:ABCdef',
        },
        'user_admin'
      );

      expect(secret.id).toBeDefined();
      expect(secret.name).toBe('TELEGRAM_TOKEN');
      expect(secret.type).toBe('telegram_token');
      // Value should be encrypted at rest
      expect(secret.encryptedValue).not.toBe('bot123456:ABCdef');
    });

    it('should decrypt secret on retrieval', async () => {
      const secret = await vault.createSecret(
        {
          tenantId: 'tenant_1',
          name: 'API_KEY',
          type: 'api_key',
          value: 'sk-super-secret-key',
        },
        'user_admin'
      );

      const retrieved = await vault.getSecret(secret.id, 'user_admin', 'req_123');
      expect(retrieved.value).toBe('sk-super-secret-key');
    });

    it('should log access on retrieval', async () => {
      const secret = await vault.createSecret(
        {
          tenantId: 'tenant_1',
          name: 'MY_KEY',
          type: 'api_key',
          value: 'value123',
        },
        'user_admin'
      );

      await vault.getSecret(secret.id, 'agent_001', 'req_abc');
      await vault.getSecret(secret.id, 'agent_001', 'req_def');

      const log = vault.getAccessLog(secret.id, 'tenant_1');
      expect(log.length).toBe(2);
      expect(log[0].accessedBy).toBe('agent_001');
    });

    it('should support agent-scoped secrets', async () => {
      await vault.createSecret(
        {
          tenantId: 'tenant_1',
          agentId: 'agent_001',
          name: 'AGENT_KEY',
          type: 'ai_provider_key',
          value: 'gsk_agent_key',
        },
        'user_admin'
      );

      await vault.createSecret(
        {
          tenantId: 'tenant_1',
          agentId: 'agent_002',
          name: 'OTHER_KEY',
          type: 'ai_provider_key',
          value: 'gsk_other_key',
        },
        'user_admin'
      );

      const agent1Secrets = vault.listSecrets('tenant_1', 'agent_001');
      const agent2Secrets = vault.listSecrets('tenant_1', 'agent_002');

      expect(agent1Secrets.length).toBe(1);
      expect(agent1Secrets[0].name).toBe('AGENT_KEY');
      expect(agent2Secrets.length).toBe(1);
    });
  });

  describe('Secret Listing', () => {
    it('should list secrets by tenant without encrypted values', async () => {
      await vault.createSecret({ tenantId: 't1', name: 'S1', type: 'api_key', value: 'v1' }, 'admin');
      await vault.createSecret({ tenantId: 't1', name: 'S2', type: 'telegram_token', value: 'v2' }, 'admin');

      const secrets = vault.listSecrets('t1');
      expect(secrets.length).toBe(2);
      // Ensure no encrypted value is exposed
      for (const s of secrets) {
        expect((s as any).encryptedValue).toBeUndefined();
      }
    });

    it('should filter secrets by type', async () => {
      await vault.createSecret({ tenantId: 't1', name: 'A', type: 'api_key', value: 'v1' }, 'admin');
      await vault.createSecret({ tenantId: 't1', name: 'B', type: 'telegram_token', value: 'v2' }, 'admin');

      const apiKeys = vault.listSecrets('t1', undefined, 'api_key');
      expect(apiKeys.length).toBe(1);
      expect(apiKeys[0].name).toBe('A');
    });
  });

  describe('Secret Rotation', () => {
    it('should update secret value (rotation)', async () => {
      const secret = await vault.createSecret(
        { tenantId: 't1', name: 'ROTATING_KEY', type: 'api_key', value: 'old_value' },
        'admin'
      );

      await vault.updateSecret(secret.id, 'new_value', 'admin', 'req_rotate');
      const retrieved = await vault.getSecret(secret.id, 'admin', 'req_read');

      expect(retrieved.value).toBe('new_value');
    });

    it('should detect secrets due for rotation', async () => {
      const secret = await vault.createSecret(
        {
          tenantId: 't1',
          name: 'KEY_WITH_ROTATION',
          type: 'api_key',
          value: 'my_key',
          rotationPolicy: {
            enabled: true,
            intervalDays: 1,
            notifyBeforeDays: 0,
            autoRotate: false,
          },
        },
        'admin'
      );

      // Manually set next rotation to past
      const storedSecret = vault['secrets'].get(secret.id)!;
      storedSecret.rotationPolicy!.nextRotationAt = new Date(Date.now() - 1000);
      vault['secrets'].set(secret.id, storedSecret);

      const due = vault.getSecretsNeedingRotation('t1');
      expect(due.length).toBeGreaterThan(0);
      expect(due[0].name).toBe('KEY_WITH_ROTATION');
    });
  });

  describe('Secret Deletion', () => {
    it('should delete a secret', async () => {
      const secret = await vault.createSecret(
        { tenantId: 't1', name: 'TO_DELETE', type: 'api_key', value: 'to_del' },
        'admin'
      );

      await vault.deleteSecret(secret.id, 'admin');

      await expect(vault.getSecret(secret.id, 'admin', 'req')).rejects.toThrow('Secret not found');
    });
  });

  describe('Key Rotation', () => {
    it('should re-encrypt all tenant secrets with new key', async () => {
      await vault.createSecret({ tenantId: 't_rekey', name: 'S1', type: 'api_key', value: 'value1' }, 'admin');
      await vault.createSecret({ tenantId: 't_rekey', name: 'S2', type: 'api_key', value: 'value2' }, 'admin');

      const rotated = await vault.rotateEncryptionKey('t_rekey');
      expect(rotated).toBe(2);

      // Verify secrets are still readable after key rotation
      const secrets = vault.listSecrets('t_rekey');
      for (const s of secrets) {
        const retrieved = await vault.getSecret(s.id, 'admin', 'req');
        expect(['value1', 'value2']).toContain(retrieved.value);
      }
    });
  });

  describe('Events', () => {
    it('should emit secret_rotated event', async () => {
      const events: any[] = [];
      vault.onEvent((e) => events.push(e));

      const secret = await vault.createSecret(
        { tenantId: 't1', name: 'EVT_KEY', type: 'api_key', value: 'old' },
        'admin'
      );
      await vault.updateSecret(secret.id, 'new', 'admin', 'req');

      expect(events.some((e) => e.type === 'secret_rotated')).toBe(true);
    });
  });
});

// ============================================================================
// Wallet Isolation Tests
// ============================================================================

describe('WalletIsolationManager', () => {
  let walletManager: WalletIsolationManager;

  beforeEach(() => {
    walletManager = createWalletIsolationManager();
  });

  describe('Wallet Provisioning', () => {
    it('should provision a unique wallet per agent', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_w1');

      expect(wallet.id).toBeDefined();
      expect(wallet.tenantId).toBe('tenant_1');
      expect(wallet.agentId).toBe('agent_w1');
      expect(wallet.address).toBeDefined();
      expect(wallet.status).toBe('active');
    });

    it('should apply MPC custody mode by default', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_mpc');
      expect(wallet.custodyMode).toBe('mpc');
    });

    it('should support different custody modes', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_scw', 'smart_contract_wallet');
      expect(wallet.custodyMode).toBe('smart_contract_wallet');
    });

    it('should not allow two wallets for the same agent', async () => {
      await walletManager.provisionWallet('tenant_1', 'agent_dup');
      await expect(
        walletManager.provisionWallet('tenant_1', 'agent_dup')
      ).rejects.toThrow('already has a wallet');
    });

    it('should generate valid segregation proof', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_proof');
      expect(walletManager.verifySegregationProof(wallet)).toBe(true);
    });

    it('should accept limit overrides', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_limits', 'mpc', {
        maxSingleTransactionTon: 50,
        maxDailyVolumeTon: 500,
      });

      expect(wallet.limits.maxSingleTransactionTon).toBe(50);
      expect(wallet.limits.maxDailyVolumeTon).toBe(500);
    });
  });

  describe('Transaction Validation', () => {
    it('should allow valid transaction within limits', async () => {
      await walletManager.provisionWallet('tenant_1', 'agent_tx');
      const result = walletManager.validateTransaction('tenant_1', 'agent_tx', 50, 'EQ_dest');

      expect(result.allowed).toBe(true);
    });

    it('should reject transaction exceeding single limit', async () => {
      await walletManager.provisionWallet('tenant_1', 'agent_tx_limit');
      const result = walletManager.validateTransaction(
        'tenant_1',
        'agent_tx_limit',
        DEFAULT_WALLET_LIMITS.maxSingleTransactionTon + 1,
        'EQ_dest'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Single transaction limit');
    });

    it('should flag transaction requiring multi-sig', async () => {
      await walletManager.provisionWallet('tenant_1', 'agent_ms', 'mpc', {
        requireMultiSigAboveTon: 10,
        maxSingleTransactionTon: 1000,
      });

      const result = walletManager.validateTransaction('tenant_1', 'agent_ms', 50, 'EQ_dest');
      expect(result.allowed).toBe(true);
      expect(result.requiresMultiSig).toBe(true);
    });

    it('should reject unknown protocol', async () => {
      await walletManager.provisionWallet('tenant_1', 'agent_proto');
      const result = walletManager.validateTransaction(
        'tenant_1',
        'agent_proto',
        10,
        'EQ_dest',
        'unknown_dex'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Protocol not in allowlist');
    });

    it('should reject transaction from frozen wallet', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_frozen_tx');
      await walletManager.freezeWallet(wallet.id, 'Security hold', 'admin');

      const result = walletManager.validateTransaction('tenant_1', 'agent_frozen_tx', 10, 'EQ_dest');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('frozen');
    });
  });

  describe('Wallet Control', () => {
    it('should freeze and unfreeze a wallet', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_freeze');
      await walletManager.freezeWallet(wallet.id, 'Investigation', 'admin');

      const frozen = walletManager.getWalletById(wallet.id);
      expect(frozen?.status).toBe('frozen');

      await walletManager.unfreezeWallet(wallet.id, 'Cleared', 'admin');
      const unfrozen = walletManager.getWalletById(wallet.id);
      expect(unfrozen?.status).toBe('active');
    });

    it('should revoke a wallet permanently', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_revoke');
      await walletManager.revokeWallet(wallet.id, 'Agent terminated', 'admin');

      const revoked = walletManager.getWalletById(wallet.id);
      expect(revoked?.status).toBe('revoked');
    });

    it('should update wallet limits', async () => {
      const wallet = await walletManager.provisionWallet('tenant_1', 'agent_updlim');
      const updated = await walletManager.updateLimits(
        wallet.id,
        { maxSingleTransactionTon: 200 },
        'admin'
      );
      expect(updated.limits.maxSingleTransactionTon).toBe(200);
    });
  });

  describe('Tenant Wallet Listing', () => {
    it('should list all wallets for a tenant', async () => {
      await walletManager.provisionWallet('tenant_list', 'agent_1');
      await walletManager.provisionWallet('tenant_list', 'agent_2');
      await walletManager.provisionWallet('tenant_other', 'agent_3');

      const wallets = walletManager.listTenantWallets('tenant_list');
      expect(wallets.length).toBe(2);
      expect(wallets.every((w) => w.tenantId === 'tenant_list')).toBe(true);
    });

    it('should filter wallets by status', async () => {
      const w1 = await walletManager.provisionWallet('tenant_st', 'agent_st1');
      await walletManager.provisionWallet('tenant_st', 'agent_st2');
      await walletManager.freezeWallet(w1.id, 'Test', 'admin');

      const activeWallets = walletManager.listTenantWallets('tenant_st', 'active');
      const frozenWallets = walletManager.listTenantWallets('tenant_st', 'frozen');

      expect(activeWallets.length).toBe(1);
      expect(frozenWallets.length).toBe(1);
    });
  });

  describe('Audit Log', () => {
    it('should record audit entry on provisioning', async () => {
      const wallet = await walletManager.provisionWallet('tenant_aud', 'agent_aud');
      const log = walletManager.getAuditLog(wallet.id, 'tenant_aud');

      expect(log.length).toBeGreaterThan(0);
      expect(log[0].eventType).toBe('created');
    });

    it('should record audit entry on freeze', async () => {
      const wallet = await walletManager.provisionWallet('tenant_aud2', 'agent_aud2');
      await walletManager.freezeWallet(wallet.id, 'Test', 'admin');

      const log = walletManager.getAuditLog(wallet.id, 'tenant_aud2');
      expect(log.some((e) => e.eventType === 'frozen')).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit wallet_frozen event', async () => {
      const events: any[] = [];
      walletManager.onEvent((e) => events.push(e));

      const wallet = await walletManager.provisionWallet('tenant_ev', 'agent_ev');
      await walletManager.freezeWallet(wallet.id, 'Security hold', 'admin');

      expect(events.some((e) => e.type === 'wallet_frozen')).toBe(true);
    });
  });
});

// ============================================================================
// Multi-Tenant Manager Integration Tests
// ============================================================================

describe('MultiTenantManager', () => {
  let manager: MultiTenantManager;

  beforeEach(() => {
    manager = createMultiTenantManager();
  });

  describe('Initialization', () => {
    it('should initialize all components', () => {
      expect(manager.tenantManager).toBeDefined();
      expect(manager.rbac).toBeDefined();
      expect(manager.isolation).toBeDefined();
      expect(manager.vault).toBeDefined();
      expect(manager.walletIsolation).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await manager.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.components.tenantManager).toBe(true);
      expect(health.components.rbac).toBe(true);
      expect(health.components.isolationLayer).toBe(true);
      expect(health.components.secretVault).toBe(true);
      expect(health.components.walletIsolation).toBe(true);
    });

    it('should track active tenants in health', async () => {
      await manager.tenantManager.createTenant({ name: 'T1', ownerId: 'u1' });
      await manager.tenantManager.createTenant({ name: 'T2', ownerId: 'u2' });

      const health = await manager.getHealth();
      expect(health.activeTenants).toBe(2);
    });
  });

  describe('Event Forwarding', () => {
    it('should forward events from all components', async () => {
      const events: any[] = [];
      manager.onEvent((e) => events.push(e));

      // Trigger events from different components
      const tenant = await manager.tenantManager.createTenant({ name: 'T1', ownerId: 'u1' });
      await manager.tenantManager.suspendTenant(tenant.id, 'Test');

      manager.rbac.checkAccess({
        tenantId: tenant.id,
        userId: 'u2',
        roles: ['readonly'],
        resource: 'secret',
        action: 'delete',
      });

      // Events from tenantManager and rbac should be forwarded
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Multi-Tenant Flow', () => {
    it('should provision full tenant infrastructure', async () => {
      // 1. Create tenant
      const tenant = await manager.tenantManager.createTenant({
        name: 'FinTech DAO',
        ownerId: 'user_cto',
        tier: 'enterprise',
      });

      // 2. Assign roles
      await manager.tenantManager.assignUserRole(tenant.id, 'user_dev', 'developer', 'user_cto');
      await manager.tenantManager.assignUserRole(tenant.id, 'user_auditor', 'auditor', 'user_cto');

      // 3. Create sandbox for agent
      const sandbox = await manager.isolation.createSandbox(tenant.id, 'agent_main');
      expect(sandbox.status).toBe('active');

      // 4. Store secrets
      const secret = await manager.vault.createSecret(
        {
          tenantId: tenant.id,
          agentId: 'agent_main',
          name: 'GROQ_API_KEY',
          type: 'ai_provider_key',
          value: 'gsk_prod_key_123',
        },
        'user_cto'
      );
      expect(secret.id).toBeDefined();

      // 5. Provision isolated wallet
      const wallet = await manager.walletIsolation.provisionWallet(tenant.id, 'agent_main');
      expect(wallet.status).toBe('active');
      expect(manager.walletIsolation.verifySegregationProof(wallet)).toBe(true);

      // 6. Verify RBAC
      const devAccess = manager.rbac.checkAccess({
        tenantId: tenant.id,
        userId: 'user_dev',
        roles: ['developer'],
        resource: 'agent',
        action: 'create',
      });
      expect(devAccess.allowed).toBe(true);

      const auditorWriteAccess = manager.rbac.checkAccess({
        tenantId: tenant.id,
        userId: 'user_auditor',
        roles: ['auditor'],
        resource: 'agent',
        action: 'create',
      });
      expect(auditorWriteAccess.allowed).toBe(false);

      // 7. Validate cross-tenant isolation
      const crossTenant = manager.isolation.validateCrossTenantAccess(tenant.id, 'agent_main', 'other_tenant_id');
      expect(crossTenant).toBe(false);

      // 8. Validate transaction limits
      const txResult = manager.walletIsolation.validateTransaction(tenant.id, 'agent_main', 50, 'EQ_dest');
      expect(txResult.allowed).toBe(true);
    });

    it('should handle tenant suspension with isolation enforcement', async () => {
      const events: any[] = [];
      manager.onEvent((e) => events.push(e));

      const tenant = await manager.tenantManager.createTenant({ name: 'Suspended Corp', ownerId: 'u1' });

      // Suspend tenant
      await manager.tenantManager.suspendTenant(tenant.id, 'Compliance violation');

      // Verify access denied
      const access = manager.tenantManager.verifyTenantAccess(tenant.id);
      expect(access.allowed).toBe(false);

      // Verify suspension event was emitted
      expect(events.some((e) => e.type === 'tenant_suspended')).toBe(true);
    });

    it('should support zero cross-tenant data leakage', async () => {
      // Create two isolated tenants
      const tenantA = await manager.tenantManager.createTenant({ name: 'Tenant A', ownerId: 'uA' });
      const tenantB = await manager.tenantManager.createTenant({ name: 'Tenant B', ownerId: 'uB' });

      // Store secrets in each tenant
      await manager.vault.createSecret(
        { tenantId: tenantA.id, name: 'SECRET_A', type: 'api_key', value: 'value_a' },
        'uA'
      );
      await manager.vault.createSecret(
        { tenantId: tenantB.id, name: 'SECRET_B', type: 'api_key', value: 'value_b' },
        'uB'
      );

      // Ensure tenant A secrets don't leak to tenant B
      const tenantASecrets = manager.vault.listSecrets(tenantA.id);
      const tenantBSecrets = manager.vault.listSecrets(tenantB.id);

      expect(tenantASecrets.length).toBe(1);
      expect(tenantBSecrets.length).toBe(1);
      expect(tenantASecrets[0].name).toBe('SECRET_A');
      expect(tenantBSecrets[0].name).toBe('SECRET_B');

      // Wallets are also isolated per tenant
      await manager.walletIsolation.provisionWallet(tenantA.id, 'agent_A');
      await manager.walletIsolation.provisionWallet(tenantB.id, 'agent_B');

      const aWallets = manager.walletIsolation.listTenantWallets(tenantA.id);
      const bWallets = manager.walletIsolation.listTenantWallets(tenantB.id);

      expect(aWallets.length).toBe(1);
      expect(bWallets.length).toBe(1);
      expect(aWallets[0].tenantId).toBe(tenantA.id);
      expect(bWallets[0].tenantId).toBe(tenantB.id);
    });
  });
});
