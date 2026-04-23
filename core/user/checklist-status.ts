/**
 * TONAIAgent - Checklist Status Manager
 *
 * Tracks per-user acknowledgements of mainnet readiness checklist items.
 * Gates the simulation → live trading transition behind full mandatory-item
 * completion, and re-requires acknowledgement when the checklist version
 * changes (e.g. a new mandatory item is added).
 *
 * Audit log entry shape: { userId, itemId, version, timestamp, ip }
 *
 * Issue #363: Gate Live Trading on Mainnet Readiness Checklist Completion
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ============================================================================
// Types
// ============================================================================

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  mandatoryForLive: boolean;
}

export interface ChecklistManifest {
  version: string;
  generatedFrom: string;
  items: ChecklistItem[];
}

export interface AcknowledgementRecord {
  id: string;
  userId: string;
  itemId: string;
  checklistVersion: string;
  acknowledgedAt: Date;
  ipAddress?: string;
}

export interface UserChecklistStatus {
  userId: string;
  checklistVersion: string;
  items: Array<{
    item: ChecklistItem;
    acknowledged: boolean;
    acknowledgedAt?: Date;
  }>;
  allMandatoryAcknowledged: boolean;
  canEnableLiveTrading: boolean;
}

export type ChecklistGateResult =
  | { allowed: true }
  | { allowed: false; reason: 'missing_items'; missingItemIds: string[] }
  | { allowed: false; reason: 'version_mismatch'; currentVersion: string; userVersion: string };

// ============================================================================
// Helpers
// ============================================================================

function getRoot(): string {
  return process.cwd();
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}${random}`;
}

// ============================================================================
// ChecklistStatusManager
// ============================================================================

export class ChecklistStatusManager {
  private manifest: ChecklistManifest;
  // userId → Map<itemId → AcknowledgementRecord>
  private acknowledgements: Map<string, Map<string, AcknowledgementRecord>> = new Map();
  private auditLog: AcknowledgementRecord[] = [];

  constructor(manifestOrPath?: ChecklistManifest | string) {
    if (typeof manifestOrPath === 'object' && manifestOrPath !== null) {
      this.manifest = manifestOrPath;
    } else {
      const path =
        typeof manifestOrPath === 'string'
          ? manifestOrPath
          : resolve(getRoot(), 'config', 'mainnet-checklist.json');
      const raw = readFileSync(path, 'utf8');
      this.manifest = JSON.parse(raw) as ChecklistManifest;
    }
  }

  // --------------------------------------------------------------------------
  // Manifest access
  // --------------------------------------------------------------------------

  getManifest(): Readonly<ChecklistManifest> {
    return this.manifest;
  }

  getVersion(): string {
    return this.manifest.version;
  }

  getMandatoryItems(): ChecklistItem[] {
    return this.manifest.items.filter(i => i.mandatoryForLive);
  }

  // --------------------------------------------------------------------------
  // Acknowledge an item
  // --------------------------------------------------------------------------

  acknowledge(
    userId: string,
    itemId: string,
    options: { ipAddress?: string } = {},
  ): AcknowledgementRecord {
    const item = this.manifest.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Unknown checklist item: ${itemId}`);
    }

    const userMap = this.acknowledgements.get(userId) ?? new Map<string, AcknowledgementRecord>();

    const record: AcknowledgementRecord = {
      id: generateId('ack'),
      userId,
      itemId,
      checklistVersion: this.manifest.version,
      acknowledgedAt: new Date(),
      ipAddress: options.ipAddress,
    };

    userMap.set(itemId, record);
    this.acknowledgements.set(userId, userMap);
    this.auditLog.push(record);

    return record;
  }

  // --------------------------------------------------------------------------
  // Query user's checklist status
  // --------------------------------------------------------------------------

  getStatus(userId: string): UserChecklistStatus {
    const userMap = this.acknowledgements.get(userId) ?? new Map<string, AcknowledgementRecord>();

    // Only acknowledgements for the current version count
    const currentVersionAcks = new Map<string, AcknowledgementRecord>();
    for (const [itemId, rec] of userMap) {
      if (rec.checklistVersion === this.manifest.version) {
        currentVersionAcks.set(itemId, rec);
      }
    }

    const itemStatuses = this.manifest.items.map(item => {
      const ack = currentVersionAcks.get(item.id);
      return {
        item,
        acknowledged: ack !== undefined,
        acknowledgedAt: ack?.acknowledgedAt,
      };
    });

    const mandatoryItems = itemStatuses.filter(s => s.item.mandatoryForLive);
    const allMandatoryAcknowledged = mandatoryItems.every(s => s.acknowledged);

    return {
      userId,
      checklistVersion: this.manifest.version,
      items: itemStatuses,
      allMandatoryAcknowledged,
      canEnableLiveTrading: allMandatoryAcknowledged,
    };
  }

  // --------------------------------------------------------------------------
  // Gate: is the user allowed to transition to live trading?
  // --------------------------------------------------------------------------

  checkLiveTradingGate(userId: string): ChecklistGateResult {
    const userMap = this.acknowledgements.get(userId) ?? new Map<string, AcknowledgementRecord>();

    // Check whether the user has any acknowledgements at all and whether
    // they are on an outdated version
    const userVersions = new Set<string>();
    for (const rec of userMap.values()) {
      userVersions.add(rec.checklistVersion);
    }

    if (userVersions.size > 0 && !userVersions.has(this.manifest.version)) {
      // User has acknowledged items, but all on an older version
      const userVersion = [...userVersions].sort().at(-1) ?? 'unknown';
      return {
        allowed: false,
        reason: 'version_mismatch',
        currentVersion: this.manifest.version,
        userVersion,
      };
    }

    // Check that every mandatory item is acknowledged on the current version
    const currentVersionAcks = new Map<string, AcknowledgementRecord>();
    for (const [itemId, rec] of userMap) {
      if (rec.checklistVersion === this.manifest.version) {
        currentVersionAcks.set(itemId, rec);
      }
    }

    const missingItemIds = this.getMandatoryItems()
      .filter(item => !currentVersionAcks.has(item.id))
      .map(item => item.id);

    if (missingItemIds.length > 0) {
      return { allowed: false, reason: 'missing_items', missingItemIds };
    }

    return { allowed: true };
  }

  // --------------------------------------------------------------------------
  // Invalidate a user's acknowledgements when checklist version changes
  //
  // Call this when the manifest is hot-reloaded or the user attempts a
  // simulation → live transition after an update: acknowledgements made under
  // the old version will no longer satisfy checkLiveTradingGate().
  // --------------------------------------------------------------------------

  reloadManifest(newManifest: ChecklistManifest): void {
    this.manifest = newManifest;
    // Existing acknowledgement records are preserved — they simply won't match
    // the new version string and checkLiveTradingGate() will return version_mismatch.
  }

  // --------------------------------------------------------------------------
  // Audit log access
  // --------------------------------------------------------------------------

  getAuditLog(userId?: string): AcknowledgementRecord[] {
    if (!userId) return [...this.auditLog];
    return this.auditLog.filter(r => r.userId === userId);
  }
}

// ============================================================================
// Singleton factory
// ============================================================================

let _instance: ChecklistStatusManager | undefined;

export function getChecklistStatusManager(): ChecklistStatusManager {
  if (!_instance) {
    _instance = new ChecklistStatusManager();
  }
  return _instance;
}

export function createChecklistStatusManager(
  manifestOrPath?: ChecklistManifest | string,
): ChecklistStatusManager {
  return new ChecklistStatusManager(manifestOrPath);
}
