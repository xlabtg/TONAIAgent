/**
 * TONAIAgent - Shared Memory Layer
 *
 * Distributed state management and context synchronization for multi-agent coordination.
 * Supports read/write locks, versioning, and conflict detection.
 */

import {
  SharedMemoryEntry,
  SharedMemoryType,
  MemoryScope,
  MemoryLock,
  SharedMemoryStore,
  MultiAgentEvent,
} from '../types';

// ============================================================================
// In-Memory Shared Memory Store
// ============================================================================

export class InMemorySharedMemoryStore implements SharedMemoryStore {
  private entries: Map<string, SharedMemoryEntry> = new Map();
  private locks: Map<string, MemoryLock> = new Map();
  private subscriptions: Map<string, SubscriptionEntry[]> = new Map();
  private eventCallback?: (event: MultiAgentEvent) => void;

  constructor(eventCallback?: (event: MultiAgentEvent) => void) {
    this.eventCallback = eventCallback;

    // Start cleanup interval for expired entries and locks
    setInterval(() => this.cleanup(), 5000);
  }

  async get(key: string): Promise<SharedMemoryEntry | undefined> {
    const entry = this.entries.get(key);

    if (entry && entry.expiresAt && entry.expiresAt < new Date()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry;
  }

  async set(key: string, entry: SharedMemoryEntry): Promise<void> {
    const existing = this.entries.get(key);

    // Check for write lock
    const lock = this.locks.get(key);
    if (lock && lock.type === 'write' && lock.holderId !== entry.ownerId) {
      throw new Error(`Key ${key} is write-locked by ${lock.holderId}`);
    }

    // Increment version
    const newEntry: SharedMemoryEntry = {
      ...entry,
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date(),
    };

    this.entries.set(key, newEntry);

    // Notify subscribers
    this.notifySubscribers(key, newEntry);

    this.emitEvent('memory_updated', {
      key,
      version: newEntry.version,
      ownerId: newEntry.ownerId,
    });
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.entries.has(key);
    this.entries.delete(key);
    this.locks.delete(key);

    if (existed) {
      this.emitEvent('memory_deleted', { key });
    }

    return existed;
  }

  async exists(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== undefined;
  }

  async list(pattern?: string): Promise<SharedMemoryEntry[]> {
    const entries: SharedMemoryEntry[] = [];
    const regex = pattern ? this.patternToRegex(pattern) : null;

    for (const [key, entry] of this.entries) {
      if (!regex || regex.test(key)) {
        // Skip expired entries
        if (entry.expiresAt && entry.expiresAt < new Date()) {
          continue;
        }
        entries.push(entry);
      }
    }

    return entries;
  }

  async acquireLock(
    key: string,
    holderId: string,
    type: 'read' | 'write',
    ttlMs: number
  ): Promise<MemoryLock | null> {
    const existingLock = this.locks.get(key);

    // Check if lock is expired
    if (existingLock && existingLock.expiresAt > new Date()) {
      // Write lock blocks all other locks
      if (existingLock.type === 'write') {
        return null;
      }

      // Read lock blocks write locks
      if (type === 'write') {
        return null;
      }
    }

    const lock: MemoryLock = {
      key,
      holderId,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
      type,
    };

    this.locks.set(key, lock);

    this.emitEvent('lock_acquired', {
      key,
      holderId,
      type,
      expiresAt: lock.expiresAt,
    });

    return lock;
  }

  async releaseLock(key: string, holderId: string): Promise<boolean> {
    const lock = this.locks.get(key);

    if (!lock || lock.holderId !== holderId) {
      return false;
    }

    this.locks.delete(key);

    this.emitEvent('lock_released', {
      key,
      holderId,
    });

    return true;
  }

  subscribe(
    pattern: string,
    callback: (key: string, entry: SharedMemoryEntry) => void
  ): () => void {
    const subscriptions = this.subscriptions.get(pattern) ?? [];
    const subscription: SubscriptionEntry = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      pattern,
      regex: this.patternToRegex(pattern),
      callback,
    };

    subscriptions.push(subscription);
    this.subscriptions.set(pattern, subscriptions);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(pattern) ?? [];
      const index = subs.findIndex((s) => s.id === subscription.id);
      if (index !== -1) {
        subs.splice(index, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(pattern);
        }
      }
    };
  }

  async getVersion(key: string): Promise<number> {
    const entry = await this.get(key);
    return entry?.version ?? 0;
  }

  async compareAndSet(
    key: string,
    expectedVersion: number,
    entry: SharedMemoryEntry
  ): Promise<boolean> {
    const existing = await this.get(key);
    const currentVersion = existing?.version ?? 0;

    if (currentVersion !== expectedVersion) {
      return false;
    }

    await this.set(key, entry);
    return true;
  }

  // ============================================================================
  // Additional Helper Methods
  // ============================================================================

  /**
   * Get all entries by scope
   */
  async getByScope(scope: MemoryScope): Promise<SharedMemoryEntry[]> {
    const entries: SharedMemoryEntry[] = [];

    for (const [, entry] of this.entries) {
      if (entry.scope === scope) {
        if (!entry.expiresAt || entry.expiresAt >= new Date()) {
          entries.push(entry);
        }
      }
    }

    return entries;
  }

  /**
   * Get all entries by type
   */
  async getByType(type: SharedMemoryType): Promise<SharedMemoryEntry[]> {
    const entries: SharedMemoryEntry[] = [];

    for (const [, entry] of this.entries) {
      if (entry.type === type) {
        if (!entry.expiresAt || entry.expiresAt >= new Date()) {
          entries.push(entry);
        }
      }
    }

    return entries;
  }

  /**
   * Get all entries owned by an agent
   */
  async getByOwner(ownerId: string): Promise<SharedMemoryEntry[]> {
    const entries: SharedMemoryEntry[] = [];

    for (const [, entry] of this.entries) {
      if (entry.ownerId === ownerId) {
        if (!entry.expiresAt || entry.expiresAt >= new Date()) {
          entries.push(entry);
        }
      }
    }

    return entries;
  }

  /**
   * Check if an agent has access to an entry
   */
  hasAccess(entry: SharedMemoryEntry, agentId: string): boolean {
    // Owner always has access
    if (entry.ownerId === agentId) {
      return true;
    }

    // Global scope is accessible to all
    if (entry.scope === 'global') {
      return true;
    }

    // Check access list
    if (entry.accessList && entry.accessList.includes(agentId)) {
      return true;
    }

    return false;
  }

  /**
   * Get statistics about the shared memory
   */
  getStats(): SharedMemoryStats {
    let totalEntries = 0;
    let totalLocks = 0;
    let expiredEntries = 0;
    const entriesByScope: Record<string, number> = {};
    const entriesByType: Record<string, number> = {};

    const now = new Date();

    for (const [, entry] of this.entries) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expiredEntries++;
        continue;
      }

      totalEntries++;
      entriesByScope[entry.scope] = (entriesByScope[entry.scope] ?? 0) + 1;
      entriesByType[entry.type] = (entriesByType[entry.type] ?? 0) + 1;
    }

    for (const [, lock] of this.locks) {
      if (lock.expiresAt >= now) {
        totalLocks++;
      }
    }

    return {
      totalEntries,
      totalLocks,
      expiredEntries,
      entriesByScope,
      entriesByType,
      subscriptionCount: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.length,
        0
      ),
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.locks.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private patternToRegex(pattern: string): RegExp {
    // Convert glob-like pattern to regex
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }

  private notifySubscribers(key: string, entry: SharedMemoryEntry): void {
    for (const [, subscriptions] of this.subscriptions) {
      for (const subscription of subscriptions) {
        if (subscription.regex.test(key)) {
          try {
            subscription.callback(key, entry);
          } catch {
            // Ignore callback errors
          }
        }
      }
    }
  }

  private cleanup(): void {
    const now = new Date();

    // Cleanup expired entries
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.entries.delete(key);
      }
    }

    // Cleanup expired locks
    for (const [key, lock] of this.locks) {
      if (lock.expiresAt < now) {
        this.locks.delete(key);
      }
    }
  }

  private emitEvent(
    action: string,
    data: Record<string, unknown>
  ): void {
    if (!this.eventCallback) return;

    this.eventCallback({
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type: 'memory_accessed' as never,
      source: 'shared_memory',
      sourceRole: 'coordinator',
      data: { action, ...data },
      severity: 'debug',
    });
  }
}

// ============================================================================
// Shared Memory Entry Factory
// ============================================================================

export function createSharedMemoryEntry(
  params: CreateSharedMemoryEntryParams
): SharedMemoryEntry {
  return {
    id: params.id ?? `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    key: params.key,
    value: params.value,
    type: params.type,
    scope: params.scope ?? 'global',
    ownerId: params.ownerId,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: params.ttlMs ? new Date(Date.now() + params.ttlMs) : undefined,
    accessList: params.accessList,
    metadata: params.metadata,
  };
}

export interface CreateSharedMemoryEntryParams {
  id?: string;
  key: string;
  value: unknown;
  type: SharedMemoryType;
  scope?: MemoryScope;
  ownerId: string;
  ttlMs?: number;
  accessList?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Types
// ============================================================================

interface SubscriptionEntry {
  id: string;
  pattern: string;
  regex: RegExp;
  callback: (key: string, entry: SharedMemoryEntry) => void;
}

export interface SharedMemoryStats {
  totalEntries: number;
  totalLocks: number;
  expiredEntries: number;
  entriesByScope: Record<string, number>;
  entriesByType: Record<string, number>;
  subscriptionCount: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSharedMemoryStore(
  eventCallback?: (event: MultiAgentEvent) => void
): InMemorySharedMemoryStore {
  return new InMemorySharedMemoryStore(eventCallback);
}
