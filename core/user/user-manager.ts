/**
 * TONAIAgent - User Manager
 *
 * Core module for managing users: creation, lookup, update, and suspension.
 * Supports multi-user isolation with Telegram-native auto-creation flow.
 *
 * Issue #271: Multi-User Accounts, RBAC & API Key System
 */

import {
  User,
  UserRole,
  UserStatus,
  CreateUserInput,
  UpdateUserInput,
  AuditRecord,
  UserEvent,
  UserEventType,
  UserEventCallback,
} from './types';

// ============================================================================
// Helpers
// ============================================================================

function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}${random}`;
}

// ============================================================================
// UserManager Implementation
// ============================================================================

export class UserManager {
  private users: Map<string, User> = new Map();
  private telegramIndex: Map<string, string> = new Map(); // telegramId -> userId
  private emailIndex: Map<string, string> = new Map();    // email -> userId
  private auditLog: AuditRecord[] = [];
  private listeners: Map<UserEventType, UserEventCallback[]> = new Map();

  // --------------------------------------------------------------------------
  // User CRUD
  // --------------------------------------------------------------------------

  createUser(input: CreateUserInput): User {
    // Guard: duplicate Telegram ID
    if (input.telegramId && this.telegramIndex.has(input.telegramId)) {
      const existing = this.users.get(this.telegramIndex.get(input.telegramId)!)!;
      return existing;
    }

    // Guard: duplicate email
    if (input.email) {
      const normalized = input.email.toLowerCase().trim();
      if (this.emailIndex.has(normalized)) {
        throw new Error(`User with email ${normalized} already exists`);
      }
    }

    const now = new Date();
    const user: User = {
      id: generateId('usr'),
      email: input.email ? input.email.toLowerCase().trim() : undefined,
      telegramId: input.telegramId,
      telegramUsername: input.telegramUsername,
      role: input.role ?? 'user',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      metadata: {
        displayName: input.metadata?.displayName,
        avatarUrl: input.metadata?.avatarUrl,
        timezone: input.metadata?.timezone,
        locale: input.metadata?.locale,
        tags: input.metadata?.tags,
      },
    };

    this.users.set(user.id, user);
    if (user.telegramId) this.telegramIndex.set(user.telegramId, user.id);
    if (user.email) this.emailIndex.set(user.email, user.id);

    this.writeAudit(user.id, 'user.created');
    this.emit('user:created', user.id, { userId: user.id, role: user.role });

    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserByTelegramId(telegramId: string): User | undefined {
    const userId = this.telegramIndex.get(telegramId);
    return userId ? this.users.get(userId) : undefined;
  }

  getUserByEmail(email: string): User | undefined {
    const userId = this.emailIndex.get(email.toLowerCase().trim());
    return userId ? this.users.get(userId) : undefined;
  }

  updateUser(userId: string, input: UpdateUserInput, actorId: string): User {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const now = new Date();

    if (input.email !== undefined) {
      const normalized = input.email.toLowerCase().trim();
      // Remove old email index
      if (user.email) this.emailIndex.delete(user.email);
      user.email = normalized;
      this.emailIndex.set(normalized, userId);
    }

    if (input.telegramUsername !== undefined) {
      user.telegramUsername = input.telegramUsername;
    }

    if (input.role !== undefined) {
      user.role = input.role;
    }

    if (input.status !== undefined) {
      user.status = input.status;
    }

    if (input.metadata) {
      user.metadata = { ...user.metadata, ...input.metadata };
    }

    user.updatedAt = now;
    this.users.set(userId, user);

    this.writeAudit(actorId, 'user.updated', 'user', userId);
    this.emit('user:updated', userId, { updatedBy: actorId, changes: Object.keys(input) });

    return user;
  }

  suspendUser(userId: string, actorId: string): User {
    const user = this.updateUser(userId, { status: 'suspended' }, actorId);
    this.writeAudit(actorId, 'user.suspended', 'user', userId);
    this.emit('user:suspended', userId, { suspendedBy: actorId });
    return user;
  }

  deleteUser(userId: string, actorId: string): void {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    // Soft-delete
    user.status = 'deleted';
    user.updatedAt = new Date();
    this.users.set(userId, user);

    this.writeAudit(actorId, 'user.deleted', 'user', userId);
    this.emit('user:deleted', userId, { deletedBy: actorId });
  }

  listUsers(filter?: { role?: UserRole; status?: UserStatus }): User[] {
    const all = Array.from(this.users.values());
    if (!filter) return all;

    return all.filter(u => {
      if (filter.role && u.role !== filter.role) return false;
      if (filter.status && u.status !== filter.status) return false;
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // Telegram Auto-Creation
  // --------------------------------------------------------------------------

  /**
   * Find an existing user by Telegram ID, or auto-create one.
   * This is the primary entry point for Telegram Mini App authentication.
   */
  findOrCreateTelegramUser(telegramId: string, username?: string): { user: User; created: boolean } {
    const existing = this.getUserByTelegramId(telegramId);
    if (existing) {
      // Update username if changed
      if (username && existing.telegramUsername !== username) {
        this.updateUser(existing.id, { telegramUsername: username }, existing.id);
      }
      return { user: this.users.get(existing.id)!, created: false };
    }

    const user = this.createUser({
      telegramId,
      telegramUsername: username,
      role: 'user',
      metadata: { displayName: username },
    });

    return { user, created: true };
  }

  // --------------------------------------------------------------------------
  // Audit Log
  // --------------------------------------------------------------------------

  private writeAudit(
    userId: string,
    action: AuditRecord['action'],
    resource?: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.auditLog.push({
      id: generateId('aud'),
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

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  on(type: UserEventType, callback: UserEventCallback): void {
    const list = this.listeners.get(type) ?? [];
    list.push(callback);
    this.listeners.set(type, list);
  }

  private emit(type: UserEventType, userId: string, payload: Record<string, unknown>): void {
    const event: UserEvent = { type, userId, payload, timestamp: new Date() };
    for (const cb of this.listeners.get(type) ?? []) {
      try { cb(event); } catch { /* ignore listener errors */ }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createUserManager(): UserManager {
  return new UserManager();
}
