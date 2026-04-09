/**
 * TONAIAgent - Authentication Service
 *
 * Unified authentication layer for the multi-user platform:
 * - Telegram Mini App init-data verification
 * - API key authentication with scope enforcement
 * - RBAC permission checks via AuthService.check()
 * - Per-user and per-key rate limiting
 * - Audit logging for every access decision
 *
 * Issue #271: Multi-User Accounts, RBAC & API Key System
 */

import { createHmac } from 'crypto';
import { UserManager } from '../../core/user/user-manager';
import { ApiKeyService } from './api-key';
import {
  User,
  ApiKey,
  ApiKeyScope,
  AuditRecord,
  UserSession,
} from '../../core/user/types';

// ============================================================================
// Auth Types
// ============================================================================

export type AuthSource = 'telegram' | 'api_key';

export interface AuthContext {
  userId: string;
  user: User;
  source: AuthSource;
  apiKey?: ApiKey;
  scopes?: ApiKeyScope[];
  sessionId: string;
}

export interface TelegramAuthInput {
  /** Raw Telegram WebApp.initData string */
  initData: string;
  /** Bot token used to verify the HMAC */
  botToken: string;
}

export interface ApiKeyAuthInput {
  rawKey: string;
  requiredScope?: ApiKeyScope;
}

export interface CheckResult {
  allowed: boolean;
  reason?: string;
}

// ============================================================================
// AuthService
// ============================================================================

export class AuthService {
  private userManager: UserManager;
  private apiKeyService: ApiKeyService;
  private auditLog: AuditRecord[] = [];
  private sessionCounter = 0;

  constructor(userManager: UserManager, apiKeyService: ApiKeyService) {
    this.userManager = userManager;
    this.apiKeyService = apiKeyService;
  }

  // --------------------------------------------------------------------------
  // Telegram Authentication
  // --------------------------------------------------------------------------

  /**
   * Verify Telegram WebApp initData and return (or auto-create) the user.
   * Validation follows the official Telegram WebApp HMAC spec.
   */
  authenticateTelegram(input: TelegramAuthInput): AuthContext {
    const { telegramId, username } = this.verifyTelegramInitData(input.initData, input.botToken);

    const { user } = this.userManager.findOrCreateTelegramUser(telegramId, username);

    if (user.status !== 'active') {
      throw new Error(`User account is ${user.status}`);
    }

    const sessionId = this.createSessionId('telegram');
    this.writeAudit(user.id, 'session.created', 'session', sessionId, { source: 'telegram' });

    return {
      userId: user.id,
      user,
      source: 'telegram',
      scopes: this.scopesForRole(user.role),
      sessionId,
    };
  }

  /**
   * Verify the HMAC-SHA256 signature of Telegram initData.
   * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  private verifyTelegramInitData(initData: string, botToken: string): { telegramId: string; username?: string } {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    if (!receivedHash) throw new Error('Missing hash in Telegram initData');

    // Build check string: sorted key=value pairs (excluding hash), joined by \n
    params.delete('hash');
    const checkString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // Derive secret key: HMAC-SHA256("WebAppData", botToken)
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (expectedHash !== receivedHash) {
      throw new Error('Invalid Telegram initData signature');
    }

    // Validate auth_date freshness — reject tokens older than 1 hour to prevent replay attacks
    const authDateStr = params.get('auth_date');
    if (!authDateStr) throw new Error('Missing auth_date in Telegram initData');
    const authDate = parseInt(authDateStr, 10);
    if (isNaN(authDate)) throw new Error('Invalid auth_date in Telegram initData');
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - authDate > 3600) {
      throw new Error('Telegram initData has expired — auth_date is older than 1 hour');
    }

    // Parse user object from initData
    const userJson = params.get('user');
    if (!userJson) throw new Error('Missing user in Telegram initData');

    let telegramUser: { id: number; username?: string };
    try {
      telegramUser = JSON.parse(decodeURIComponent(userJson));
    } catch {
      throw new Error('Invalid user JSON in Telegram initData');
    }

    if (!telegramUser.id) throw new Error('Missing Telegram user ID');

    return {
      telegramId: String(telegramUser.id),
      username: telegramUser.username,
    };
  }

  // --------------------------------------------------------------------------
  // API Key Authentication
  // --------------------------------------------------------------------------

  authenticateApiKey(input: ApiKeyAuthInput): AuthContext {
    const result = this.apiKeyService.validateApiKey(input.rawKey, input.requiredScope);

    if (!result.valid || !result.apiKey || !result.user) {
      this.writeAudit('unknown', 'access.denied', 'api_key', undefined, { reason: result.reason });
      throw new Error(`API key authentication failed: ${result.reason}`);
    }

    const sessionId = this.createSessionId('api_key');
    this.writeAudit(result.user.id, 'api_key.used', 'api_key', result.apiKey.id, { scope: input.requiredScope });

    return {
      userId: result.user.id,
      user: result.user,
      source: 'api_key',
      apiKey: result.apiKey,
      scopes: result.apiKey.scopes,
      sessionId,
    };
  }

  // --------------------------------------------------------------------------
  // RBAC: check(user, action, resource)
  // --------------------------------------------------------------------------

  /**
   * Central authorization check.
   * Usage: authService.check(ctx, 'agent:execute', agentId)
   */
  check(ctx: AuthContext, action: ApiKeyScope, resourceId?: string): CheckResult {
    const { user } = ctx;

    // Admins can do anything
    if (user.role === 'admin') {
      this.writeAudit(user.id, 'access.granted', action, resourceId);
      return { allowed: true };
    }

    // Service accounts get full programmatic access
    if (user.role === 'service') {
      this.writeAudit(user.id, 'access.granted', action, resourceId);
      return { allowed: true };
    }

    // API key scope check
    if (ctx.source === 'api_key' && ctx.apiKey) {
      if (!this.apiKeyService.hasScope(ctx.apiKey, action)) {
        this.writeAudit(user.id, 'access.denied', action, resourceId, { reason: 'insufficient_scope' });
        return { allowed: false, reason: 'insufficient_scope' };
      }
    }

    // Role-based check for non-admin users
    const allowedScopes = this.scopesForRole(user.role);
    if (!allowedScopes.includes(action) && !allowedScopes.includes('admin:all')) {
      this.writeAudit(user.id, 'access.denied', action, resourceId, { reason: 'role_not_permitted' });
      return { allowed: false, reason: 'role_not_permitted' };
    }

    this.writeAudit(user.id, 'access.granted', action, resourceId);
    return { allowed: true };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private scopesForRole(role: User['role']): ApiKeyScope[] {
    switch (role) {
      case 'admin':
        return ['agent:read', 'agent:execute', 'portfolio:read', 'analytics:read', 'admin:all'];
      case 'service':
        return ['agent:read', 'agent:execute', 'portfolio:read', 'analytics:read', 'admin:all'];
      case 'user':
      default:
        return ['agent:read', 'agent:execute', 'portfolio:read', 'analytics:read'];
    }
  }

  private createSessionId(source: string): string {
    return `sess_${source}_${Date.now().toString(36)}_${(++this.sessionCounter).toString(36)}`;
  }

  private writeAudit(
    userId: string,
    action: AuditRecord['action'],
    resource?: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.auditLog.push({
      id: `aud_${Date.now().toString(36)}`,
      userId,
      action,
      resource,
      resourceId,
      metadata,
      timestamp: new Date(),
    });
  }

  getAuditLog(userId?: string): AuditRecord[] {
    if (!userId) return [...this.auditLog];
    return this.auditLog.filter(r => r.userId === userId);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAuthService(userManager: UserManager, apiKeyService: ApiKeyService): AuthService {
  return new AuthService(userManager, apiKeyService);
}
