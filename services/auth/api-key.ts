/**
 * TONAIAgent - API Key Service
 *
 * Secure API key lifecycle management:
 * - Cryptographically random key generation
 * - SHA-256 hash storage (plain text never persisted)
 * - Scope-based access control
 * - Per-key rate limiting
 * - Automatic expiry
 *
 * Issue #271: Multi-User Accounts, RBAC & API Key System
 */

import { createHash, randomBytes } from 'crypto';
import {
  ApiKey,
  ApiKeyScope,
  ApiKeyStatus,
  CreateApiKeyInput,
  CreateApiKeyResult,
  ValidateApiKeyResult,
  User,
} from '../../core/user/types';
import { UserManager } from '../../core/user/user-manager';

// ============================================================================
// Helpers
// ============================================================================

const KEY_PREFIX = 'tonai';
const KEY_BYTES = 32; // 256-bit random key

function generateId(prefix: string): string {
  const random = randomBytes(4).toString('hex');
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}${random}`;
}

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function generateRawKey(): string {
  const bytes = randomBytes(KEY_BYTES).toString('base64url');
  return `${KEY_PREFIX}_${bytes}`;
}

// ============================================================================
// Rate Limiter (in-memory, per key)
// ============================================================================

interface RateWindow {
  count: number;
  windowStart: number; // unix ms
}

class RateLimiter {
  private windows: Map<string, RateWindow> = new Map();

  check(keyId: string, limitPerMinute: number): boolean {
    const now = Date.now();
    const windowMs = 60_000;
    const window = this.windows.get(keyId);

    if (!window || now - window.windowStart >= windowMs) {
      this.windows.set(keyId, { count: 1, windowStart: now });
      return true;
    }

    if (window.count >= limitPerMinute) return false;
    window.count++;
    return true;
  }
}

// ============================================================================
// ApiKeyService
// ============================================================================

export class ApiKeyService {
  private keys: Map<string, ApiKey> = new Map();
  private hashIndex: Map<string, string> = new Map(); // hash -> keyId
  private rateLimiter = new RateLimiter();
  private userManager: UserManager;

  constructor(userManager: UserManager) {
    this.userManager = userManager;
  }

  // --------------------------------------------------------------------------
  // Create
  // --------------------------------------------------------------------------

  createApiKey(input: CreateApiKeyInput): CreateApiKeyResult {
    const user = this.userManager.getUser(input.userId);
    if (!user) throw new Error(`User ${input.userId} not found`);
    if (user.status !== 'active') throw new Error(`User ${input.userId} is not active`);

    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12); // "tonai_" + 6 chars

    const now = new Date();
    const apiKey: ApiKey = {
      id: generateId('key'),
      userId: input.userId,
      name: input.name,
      keyPrefix,
      keyHash,
      scopes: input.scopes,
      status: 'active',
      rateLimit: input.rateLimit ?? 60,
      createdAt: now,
      expiresAt: input.expiresAt,
      usageCount: 0,
    };

    this.keys.set(apiKey.id, apiKey);
    this.hashIndex.set(keyHash, apiKey.id);

    return { apiKey, rawKey };
  }

  // --------------------------------------------------------------------------
  // Validate
  // --------------------------------------------------------------------------

  validateApiKey(rawKey: string, requiredScope?: ApiKeyScope): ValidateApiKeyResult {
    const keyHash = hashKey(rawKey);
    const keyId = this.hashIndex.get(keyHash);
    if (!keyId) return { valid: false, reason: 'invalid_key' };

    const apiKey = this.keys.get(keyId);
    if (!apiKey) return { valid: false, reason: 'invalid_key' };

    // Status check
    if (apiKey.status !== 'active') {
      return { valid: false, reason: `key_${apiKey.status}` };
    }

    // Expiry check
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      apiKey.status = 'expired';
      this.keys.set(keyId, apiKey);
      return { valid: false, reason: 'key_expired' };
    }

    // Scope check
    if (requiredScope && !this.hasScope(apiKey, requiredScope)) {
      return { valid: false, reason: 'insufficient_scope' };
    }

    // Rate limit check
    if (!this.rateLimiter.check(keyId, apiKey.rateLimit)) {
      return { valid: false, reason: 'rate_limited' };
    }

    // Look up user
    const user = this.userManager.getUser(apiKey.userId);
    if (!user || user.status !== 'active') {
      return { valid: false, reason: 'user_not_active' };
    }

    // Update usage stats
    apiKey.lastUsedAt = new Date();
    apiKey.usageCount++;
    this.keys.set(keyId, apiKey);

    return { valid: true, apiKey, user };
  }

  // --------------------------------------------------------------------------
  // Revoke
  // --------------------------------------------------------------------------

  revokeApiKey(keyId: string, actorId: string): ApiKey {
    const apiKey = this.keys.get(keyId);
    if (!apiKey) throw new Error(`API key ${keyId} not found`);

    // Only key owner or admin can revoke
    const actor = this.userManager.getUser(actorId);
    if (!actor) throw new Error(`Actor ${actorId} not found`);
    if (apiKey.userId !== actorId && actor.role !== 'admin') {
      throw new Error('Unauthorized: cannot revoke another user\'s API key');
    }

    apiKey.status = 'revoked';
    this.keys.set(keyId, apiKey);

    return apiKey;
  }

  // --------------------------------------------------------------------------
  // List
  // --------------------------------------------------------------------------

  listApiKeys(userId: string): ApiKey[] {
    return Array.from(this.keys.values()).filter(k => k.userId === userId);
  }

  getApiKey(keyId: string): ApiKey | undefined {
    return this.keys.get(keyId);
  }

  // --------------------------------------------------------------------------
  // Scope Check
  // --------------------------------------------------------------------------

  hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
    if (apiKey.scopes.includes('admin:all')) return true;
    return apiKey.scopes.includes(requiredScope);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createApiKeyService(userManager: UserManager): ApiKeyService {
  return new ApiKeyService(userManager);
}
