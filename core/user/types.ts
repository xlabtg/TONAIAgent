/**
 * TONAIAgent - User Model & Management Types
 *
 * Core type definitions for the multi-user system including user profiles,
 * API keys, sessions, and audit records.
 *
 * Issue #271: Multi-User Accounts, RBAC & API Key System
 */

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'user' | 'admin' | 'service';

export type UserStatus = 'active' | 'suspended' | 'pending' | 'deleted';

export interface User {
  id: string;
  email?: string;
  telegramId?: string;
  telegramUsername?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  metadata: UserMetadata;
}

export interface UserMetadata {
  displayName?: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
  tags?: string[];
}

export interface CreateUserInput {
  email?: string;
  telegramId?: string;
  telegramUsername?: string;
  role?: UserRole;
  metadata?: Partial<UserMetadata>;
}

export interface UpdateUserInput {
  email?: string;
  telegramUsername?: string;
  role?: UserRole;
  status?: UserStatus;
  metadata?: Partial<UserMetadata>;
}

// ============================================================================
// API Key Types
// ============================================================================

export type ApiKeyScope =
  | 'agent:read'
  | 'agent:execute'
  | 'portfolio:read'
  | 'analytics:read'
  | 'admin:all';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;   // First 8 chars of the key for display (e.g. "tonai_ab")
  keyHash: string;     // SHA-256 hash — never stored in plain text
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  rateLimit: number;   // requests per minute
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
}

export interface CreateApiKeyInput {
  userId: string;
  name: string;
  scopes: ApiKeyScope[];
  rateLimit?: number;
  expiresAt?: Date;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  rawKey: string; // The plain-text key — shown once, never stored
}

export interface ValidateApiKeyResult {
  valid: boolean;
  apiKey?: ApiKey;
  user?: User;
  reason?: string;
}

// ============================================================================
// Session Types
// ============================================================================

export interface UserSession {
  id: string;
  userId: string;
  source: 'telegram' | 'api_key' | 'web';
  apiKeyId?: string;
  telegramInitData?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.suspended'
  | 'user.deleted'
  | 'api_key.created'
  | 'api_key.used'
  | 'api_key.revoked'
  | 'session.created'
  | 'session.expired'
  | 'access.granted'
  | 'access.denied'
  | 'agent.execute'
  | 'portfolio.read'
  | 'analytics.read';

export interface AuditRecord {
  id: string;
  userId: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  apiKeyId?: string;
}

// ============================================================================
// User Manager Events
// ============================================================================

export type UserEventType =
  | 'user:created'
  | 'user:updated'
  | 'user:suspended'
  | 'user:deleted'
  | 'api_key:created'
  | 'api_key:revoked'
  | 'access:denied';

export interface UserEvent {
  type: UserEventType;
  userId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export type UserEventCallback = (event: UserEvent) => void;
