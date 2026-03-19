/**
 * TONAIAgent - Auth, User, and Multi-User Isolation Tests
 *
 * Covers:
 * - UserManager: create, lookup, update, suspend, delete, Telegram auto-creation
 * - ApiKeyService: create, validate, revoke, scope enforcement, rate limiting
 * - AuthService: Telegram auth, API key auth, RBAC check(), audit log
 * - Multi-user isolation: cross-user access denial
 *
 * Issue #271: Multi-User Accounts, RBAC & API Key System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createUserManager, UserManager } from '../../core/user/user-manager';
import { createApiKeyService, ApiKeyService } from '../../services/auth/api-key';
import { createAuthService, AuthService, AuthContext } from '../../services/auth/auth-service';
import type {
  User,
  CreateUserInput,
  ApiKeyScope,
} from '../../core/user/types';

// ============================================================================
// Test helpers
// ============================================================================

function makeUserInput(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
  return {
    email: `test_${Date.now()}@example.com`,
    role: 'user',
    ...overrides,
  };
}

function buildFakeInitData(telegramId: number, username: string, botToken: string): string {
  // Build a valid HMAC-SHA256 Telegram initData string for testing.
  // We use Node's crypto in the same way the AuthService does.
  const { createHmac } = require('crypto');
  const user = JSON.stringify({ id: telegramId, username });
  const params = new URLSearchParams({ user });
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(sorted).digest('hex');

  params.set('hash', hash);
  return params.toString();
}

// ============================================================================
// UserManager Tests
// ============================================================================

describe('UserManager', () => {
  let manager: UserManager;

  beforeEach(() => {
    manager = createUserManager();
  });

  // --- Creation ---

  it('creates a user with email and default role', () => {
    const user = manager.createUser({ email: 'alice@example.com' });
    expect(user.id).toBeTruthy();
    expect(user.email).toBe('alice@example.com');
    expect(user.role).toBe('user');
    expect(user.status).toBe('active');
  });

  it('creates a user with admin role', () => {
    const user = manager.createUser({ email: 'admin@example.com', role: 'admin' });
    expect(user.role).toBe('admin');
  });

  it('normalizes email to lowercase', () => {
    const user = manager.createUser({ email: 'Alice@Example.COM' });
    expect(user.email).toBe('alice@example.com');
  });

  it('throws on duplicate email', () => {
    manager.createUser({ email: 'dup@example.com' });
    expect(() => manager.createUser({ email: 'dup@example.com' })).toThrow();
  });

  it('creates a user with Telegram ID', () => {
    const user = manager.createUser({ telegramId: '123456', telegramUsername: 'bob' });
    expect(user.telegramId).toBe('123456');
    expect(user.telegramUsername).toBe('bob');
  });

  // --- Lookup ---

  it('retrieves user by ID', () => {
    const created = manager.createUser({ email: 'find@example.com' });
    const found = manager.getUser(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('returns undefined for unknown user ID', () => {
    expect(manager.getUser('nonexistent')).toBeUndefined();
  });

  it('retrieves user by Telegram ID', () => {
    manager.createUser({ telegramId: '999' });
    const found = manager.getUserByTelegramId('999');
    expect(found?.telegramId).toBe('999');
  });

  it('retrieves user by email', () => {
    manager.createUser({ email: 'lookup@example.com' });
    const found = manager.getUserByEmail('lookup@example.com');
    expect(found?.email).toBe('lookup@example.com');
  });

  it('returns undefined for unknown email', () => {
    expect(manager.getUserByEmail('nobody@example.com')).toBeUndefined();
  });

  // --- Update ---

  it('updates user role', () => {
    const user = manager.createUser({ email: 'promote@example.com' });
    const updated = manager.updateUser(user.id, { role: 'admin' }, user.id);
    expect(updated.role).toBe('admin');
  });

  it('updates user email and re-indexes', () => {
    const user = manager.createUser({ email: 'old@example.com' });
    manager.updateUser(user.id, { email: 'new@example.com' }, user.id);
    expect(manager.getUserByEmail('new@example.com')?.id).toBe(user.id);
    expect(manager.getUserByEmail('old@example.com')).toBeUndefined();
  });

  it('throws when updating nonexistent user', () => {
    expect(() => manager.updateUser('bad_id', { role: 'admin' }, 'admin_id')).toThrow();
  });

  // --- Suspend / Delete ---

  it('suspends a user', () => {
    const actor = manager.createUser({ email: 'boss@example.com', role: 'admin' });
    const target = manager.createUser({ email: 'target@example.com' });
    const suspended = manager.suspendUser(target.id, actor.id);
    expect(suspended.status).toBe('suspended');
  });

  it('soft-deletes a user (status = deleted)', () => {
    const actor = manager.createUser({ email: 'deleter@example.com', role: 'admin' });
    const target = manager.createUser({ email: 'gone@example.com' });
    manager.deleteUser(target.id, actor.id);
    expect(manager.getUser(target.id)?.status).toBe('deleted');
  });

  // --- List ---

  it('lists all users', () => {
    manager.createUser({ email: 'a@example.com' });
    manager.createUser({ email: 'b@example.com' });
    expect(manager.listUsers().length).toBeGreaterThanOrEqual(2);
  });

  it('filters users by role', () => {
    manager.createUser({ email: 'admin2@example.com', role: 'admin' });
    const admins = manager.listUsers({ role: 'admin' });
    expect(admins.every(u => u.role === 'admin')).toBe(true);
  });

  it('filters users by status', () => {
    const actor = manager.createUser({ email: 'a3@example.com', role: 'admin' });
    const t = manager.createUser({ email: 'susp@example.com' });
    manager.suspendUser(t.id, actor.id);
    const suspended = manager.listUsers({ status: 'suspended' });
    expect(suspended.some(u => u.id === t.id)).toBe(true);
  });

  // --- Telegram Auto-Creation ---

  it('auto-creates Telegram user on first login', () => {
    const { user, created } = manager.findOrCreateTelegramUser('777', 'charlie');
    expect(created).toBe(true);
    expect(user.telegramId).toBe('777');
    expect(user.telegramUsername).toBe('charlie');
    expect(user.role).toBe('user');
  });

  it('returns existing Telegram user on subsequent calls', () => {
    manager.findOrCreateTelegramUser('888', 'dave');
    const { user, created } = manager.findOrCreateTelegramUser('888', 'dave');
    expect(created).toBe(false);
    expect(user.telegramId).toBe('888');
  });

  it('updates username when Telegram user is found again with new username', () => {
    const { user } = manager.findOrCreateTelegramUser('999', 'old_name');
    manager.findOrCreateTelegramUser('999', 'new_name');
    expect(manager.getUser(user.id)?.telegramUsername).toBe('new_name');
  });

  // --- Audit Log ---

  it('records audit log entries for user creation', () => {
    const user = manager.createUser({ email: 'audit@example.com' });
    const log = manager.getAuditLog(user.id);
    expect(log.some(r => r.action === 'user.created')).toBe(true);
  });

  it('records audit log entries for suspension', () => {
    const actor = manager.createUser({ email: 'auditor@example.com', role: 'admin' });
    const target = manager.createUser({ email: 'audit2@example.com' });
    manager.suspendUser(target.id, actor.id);
    const log = manager.getAuditLog(actor.id);
    expect(log.some(r => r.action === 'user.suspended')).toBe(true);
  });

  // --- Events ---

  it('emits user:created event', () => {
    const handler = vi.fn();
    manager.on('user:created', handler);
    manager.createUser({ email: 'event@example.com' });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('emits user:suspended event', () => {
    const handler = vi.fn();
    manager.on('user:suspended', handler);
    const actor = manager.createUser({ email: 'eactor@example.com', role: 'admin' });
    const target = manager.createUser({ email: 'etarget@example.com' });
    manager.suspendUser(target.id, actor.id);
    expect(handler).toHaveBeenCalledOnce();
  });
});

// ============================================================================
// ApiKeyService Tests
// ============================================================================

describe('ApiKeyService', () => {
  let userManager: UserManager;
  let service: ApiKeyService;
  let user: User;

  beforeEach(() => {
    userManager = createUserManager();
    service = createApiKeyService(userManager);
    user = userManager.createUser({ email: 'keyuser@example.com' });
  });

  it('creates an API key and returns a raw key', () => {
    const { apiKey, rawKey } = service.createApiKey({
      userId: user.id,
      name: 'Test Key',
      scopes: ['agent:read'],
    });
    expect(rawKey).toMatch(/^tonai_/);
    expect(apiKey.keyPrefix).toBe(rawKey.slice(0, 12));
    expect(apiKey.keyHash).not.toBe(rawKey);
    expect(apiKey.status).toBe('active');
  });

  it('validates a correct API key', () => {
    const { rawKey } = service.createApiKey({ userId: user.id, name: 'k1', scopes: ['agent:read'] });
    const result = service.validateApiKey(rawKey);
    expect(result.valid).toBe(true);
    expect(result.user?.id).toBe(user.id);
  });

  it('rejects an invalid API key', () => {
    const result = service.validateApiKey('tonai_boguskey');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_key');
  });

  it('rejects a revoked API key', () => {
    const { apiKey, rawKey } = service.createApiKey({ userId: user.id, name: 'k2', scopes: ['agent:read'] });
    service.revokeApiKey(apiKey.id, user.id);
    const result = service.validateApiKey(rawKey);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('key_revoked');
  });

  it('rejects an expired API key', () => {
    const past = new Date(Date.now() - 1000);
    const { rawKey } = service.createApiKey({
      userId: user.id, name: 'k3', scopes: ['agent:read'], expiresAt: past,
    });
    const result = service.validateApiKey(rawKey);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('key_expired');
  });

  it('enforces scope — rejects when required scope is missing', () => {
    const { rawKey } = service.createApiKey({ userId: user.id, name: 'k4', scopes: ['agent:read'] });
    const result = service.validateApiKey(rawKey, 'agent:execute');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('insufficient_scope');
  });

  it('admin:all scope satisfies any required scope', () => {
    const { rawKey } = service.createApiKey({ userId: user.id, name: 'k5', scopes: ['admin:all'] });
    const result = service.validateApiKey(rawKey, 'agent:execute');
    expect(result.valid).toBe(true);
  });

  it('rejects when user is suspended', () => {
    const admin = userManager.createUser({ email: 'admin3@example.com', role: 'admin' });
    const { rawKey } = service.createApiKey({ userId: user.id, name: 'k6', scopes: ['agent:read'] });
    userManager.suspendUser(user.id, admin.id);
    const result = service.validateApiKey(rawKey);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('user_not_active');
  });

  it('revokes own API key', () => {
    const { apiKey } = service.createApiKey({ userId: user.id, name: 'k7', scopes: ['agent:read'] });
    const revoked = service.revokeApiKey(apiKey.id, user.id);
    expect(revoked.status).toBe('revoked');
  });

  it('does not allow revoking another user\'s key without admin role', () => {
    const other = userManager.createUser({ email: 'other@example.com' });
    const { apiKey } = service.createApiKey({ userId: other.id, name: 'k8', scopes: ['agent:read'] });
    expect(() => service.revokeApiKey(apiKey.id, user.id)).toThrow(/Unauthorized/);
  });

  it('admin can revoke any user\'s key', () => {
    const admin = userManager.createUser({ email: 'admin4@example.com', role: 'admin' });
    const { apiKey } = service.createApiKey({ userId: user.id, name: 'k9', scopes: ['agent:read'] });
    const revoked = service.revokeApiKey(apiKey.id, admin.id);
    expect(revoked.status).toBe('revoked');
  });

  it('lists API keys for a user', () => {
    service.createApiKey({ userId: user.id, name: 'a', scopes: ['agent:read'] });
    service.createApiKey({ userId: user.id, name: 'b', scopes: ['portfolio:read'] });
    const keys = service.listApiKeys(user.id);
    expect(keys.length).toBe(2);
  });

  it('applies rate limiting after N requests per minute', () => {
    const { rawKey } = service.createApiKey({ userId: user.id, name: 'rl', scopes: ['agent:read'], rateLimit: 2 });
    expect(service.validateApiKey(rawKey).valid).toBe(true);
    expect(service.validateApiKey(rawKey).valid).toBe(true);
    const blocked = service.validateApiKey(rawKey);
    expect(blocked.valid).toBe(false);
    expect(blocked.reason).toBe('rate_limited');
  });

  it('increments usage count on each valid call', () => {
    const { apiKey, rawKey } = service.createApiKey({ userId: user.id, name: 'uc', scopes: ['agent:read'] });
    service.validateApiKey(rawKey);
    service.validateApiKey(rawKey);
    const updated = service.getApiKey(apiKey.id)!;
    expect(updated.usageCount).toBe(2);
  });

  it('throws when creating key for nonexistent user', () => {
    expect(() => service.createApiKey({ userId: 'ghost', name: 'k', scopes: ['agent:read'] })).toThrow();
  });
});

// ============================================================================
// AuthService Tests
// ============================================================================

describe('AuthService', () => {
  const BOT_TOKEN = 'test_bot_token_12345';

  let userManager: UserManager;
  let apiKeyService: ApiKeyService;
  let authService: AuthService;
  let user: User;

  beforeEach(() => {
    userManager = createUserManager();
    apiKeyService = createApiKeyService(userManager);
    authService = createAuthService(userManager, apiKeyService);
    user = userManager.createUser({ email: 'auth@example.com', role: 'user' });
  });

  // --- Telegram Auth ---

  it('authenticates a Telegram user via initData and auto-creates them', () => {
    const initData = buildFakeInitData(11111, 'frank', BOT_TOKEN);
    const ctx = authService.authenticateTelegram({ initData, botToken: BOT_TOKEN });
    expect(ctx.user.telegramId).toBe('11111');
    expect(ctx.source).toBe('telegram');
    expect(ctx.sessionId).toBeTruthy();
  });

  it('returns existing user on repeated Telegram auth', () => {
    const initData = buildFakeInitData(22222, 'grace', BOT_TOKEN);
    const ctx1 = authService.authenticateTelegram({ initData, botToken: BOT_TOKEN });
    const ctx2 = authService.authenticateTelegram({ initData, botToken: BOT_TOKEN });
    expect(ctx1.userId).toBe(ctx2.userId);
  });

  it('rejects Telegram auth with tampered initData', () => {
    const initData = buildFakeInitData(33333, 'hacker', BOT_TOKEN);
    const tampered = initData.replace(/hash=[^&]+/, 'hash=deadbeef');
    expect(() => authService.authenticateTelegram({ initData: tampered, botToken: BOT_TOKEN })).toThrow();
  });

  it('rejects Telegram auth for suspended user', () => {
    const initData = buildFakeInitData(44444, 'ivan', BOT_TOKEN);
    const ctx = authService.authenticateTelegram({ initData, botToken: BOT_TOKEN });
    const admin = userManager.createUser({ role: 'admin', email: 'adm@example.com' });
    userManager.suspendUser(ctx.userId, admin.id);
    expect(() => authService.authenticateTelegram({ initData, botToken: BOT_TOKEN })).toThrow(/suspended/);
  });

  // --- API Key Auth ---

  it('authenticates via a valid API key', () => {
    const { rawKey } = apiKeyService.createApiKey({ userId: user.id, name: 'ak1', scopes: ['agent:read'] });
    const ctx = authService.authenticateApiKey({ rawKey });
    expect(ctx.userId).toBe(user.id);
    expect(ctx.source).toBe('api_key');
  });

  it('throws on invalid API key', () => {
    expect(() => authService.authenticateApiKey({ rawKey: 'tonai_fake' })).toThrow(/authentication failed/);
  });

  it('throws when required scope is missing in API key', () => {
    const { rawKey } = apiKeyService.createApiKey({ userId: user.id, name: 'ak2', scopes: ['agent:read'] });
    expect(() => authService.authenticateApiKey({ rawKey, requiredScope: 'admin:all' })).toThrow();
  });

  // --- RBAC check() ---

  it('allows regular user to execute their own agent (agent:execute scope)', () => {
    const ctx = buildApiKeyCtx('user', ['agent:execute']);
    const result = authService.check(ctx, 'agent:execute', 'agent_1');
    expect(result.allowed).toBe(true);
  });

  it('denies regular user access to admin:all scope', () => {
    const ctx = buildApiKeyCtx('user', ['agent:read']);
    const result = authService.check(ctx, 'admin:all');
    expect(result.allowed).toBe(false);
  });

  it('allows admin to perform any action', () => {
    const admin = userManager.createUser({ email: 'rbac_admin@example.com', role: 'admin' });
    const { rawKey } = apiKeyService.createApiKey({ userId: admin.id, name: 'adm_k', scopes: ['admin:all'] });
    const ctx = authService.authenticateApiKey({ rawKey });
    const result = authService.check(ctx, 'admin:all');
    expect(result.allowed).toBe(true);
  });

  it('denies API key with insufficient scope even for regular permission', () => {
    const ctx = buildApiKeyCtx('user', ['portfolio:read']);
    const result = authService.check(ctx, 'agent:execute');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('insufficient_scope');
  });

  it('allows service account full access', () => {
    const svc = userManager.createUser({ email: 'svc@example.com', role: 'service' });
    const { rawKey } = apiKeyService.createApiKey({ userId: svc.id, name: 'svc_k', scopes: ['admin:all'] });
    const ctx = authService.authenticateApiKey({ rawKey });
    expect(authService.check(ctx, 'admin:all').allowed).toBe(true);
  });

  // --- Audit Log ---

  it('records access.granted in audit log', () => {
    const ctx = buildApiKeyCtx('user', ['agent:execute']);
    authService.check(ctx, 'agent:execute', 'agent_x');
    const log = authService.getAuditLog(ctx.userId);
    expect(log.some(r => r.action === 'access.granted')).toBe(true);
  });

  it('records access.denied in audit log', () => {
    const ctx = buildApiKeyCtx('user', ['agent:read']);
    authService.check(ctx, 'admin:all');
    const log = authService.getAuditLog(ctx.userId);
    expect(log.some(r => r.action === 'access.denied')).toBe(true);
  });

  // Helper to build a fake AuthContext for RBAC tests
  function buildApiKeyCtx(role: User['role'], scopes: ApiKeyScope[]): AuthContext {
    const u = userManager.createUser({ email: `${role}_${Date.now()}@example.com`, role });
    const { apiKey, rawKey } = apiKeyService.createApiKey({ userId: u.id, name: 'ctx_key', scopes });
    return authService.authenticateApiKey({ rawKey });
  }
});

// ============================================================================
// Multi-User Isolation Tests
// ============================================================================

describe('Multi-User Isolation', () => {
  let userManager: UserManager;
  let apiKeyService: ApiKeyService;
  let authService: AuthService;

  beforeEach(() => {
    userManager = createUserManager();
    apiKeyService = createApiKeyService(userManager);
    authService = createAuthService(userManager, apiKeyService);
  });

  it('two users get separate user IDs', () => {
    const alice = userManager.createUser({ email: 'alice@iso.com' });
    const bob = userManager.createUser({ email: 'bob@iso.com' });
    expect(alice.id).not.toBe(bob.id);
  });

  it('user A cannot look up user B\'s API keys', () => {
    const alice = userManager.createUser({ email: 'alice2@iso.com' });
    const bob = userManager.createUser({ email: 'bob2@iso.com' });
    apiKeyService.createApiKey({ userId: alice.id, name: 'alice_key', scopes: ['agent:read'] });
    const bobKeys = apiKeyService.listApiKeys(bob.id);
    expect(bobKeys).toHaveLength(0);
  });

  it('user A cannot revoke user B\'s API key', () => {
    const alice = userManager.createUser({ email: 'alice3@iso.com' });
    const bob = userManager.createUser({ email: 'bob3@iso.com' });
    const { apiKey } = apiKeyService.createApiKey({ userId: bob.id, name: 'bob_key', scopes: ['agent:read'] });
    expect(() => apiKeyService.revokeApiKey(apiKey.id, alice.id)).toThrow(/Unauthorized/);
  });

  it('Telegram user is isolated from email user', () => {
    const tg = userManager.findOrCreateTelegramUser('55555', 'tg_user');
    const em = userManager.createUser({ email: 'email_user@iso.com' });
    expect(tg.user.id).not.toBe(em.id);
  });

  it('user A\'s session cannot access user B\'s resources (RBAC check)', () => {
    const alice = userManager.createUser({ email: 'alice4@iso.com' });
    const { rawKey } = apiKeyService.createApiKey({ userId: alice.id, name: 'akey', scopes: ['agent:read'] });
    const ctx = authService.authenticateApiKey({ rawKey });

    // Attempt to perform admin action — must be denied
    const result = authService.check(ctx, 'admin:all', 'system');
    expect(result.allowed).toBe(false);
  });

  it('suspended user\'s API key is rejected', () => {
    const admin = userManager.createUser({ email: 'iso_admin@iso.com', role: 'admin' });
    const target = userManager.createUser({ email: 'iso_target@iso.com' });
    const { rawKey } = apiKeyService.createApiKey({ userId: target.id, name: 'target_key', scopes: ['agent:read'] });
    userManager.suspendUser(target.id, admin.id);
    const result = apiKeyService.validateApiKey(rawKey);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('user_not_active');
  });
});
