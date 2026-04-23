/**
 * Integration tests for checklist-based live-trading gating.
 *
 * Tests the three scenarios from issue #363 acceptance criteria:
 *   1. Missing item → live mode blocked
 *   2. Outdated checklist version → mode downgraded to simulation at next
 *      transition attempt
 *   3. Full acknowledgement of all mandatory items → live mode enabled
 *
 * No external services required — the ChecklistStatusManager operates
 * entirely in memory.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChecklistStatusManager,
  type ChecklistManifest,
} from '../../core/user/checklist-status.js';

// ============================================================================
// Fixture: minimal checklist manifest used by all tests
// ============================================================================

const TEST_MANIFEST_V1: ChecklistManifest = {
  version: '1.0.0',
  generatedFrom: 'docs/mainnet-readiness-checklist.md',
  items: [
    {
      id: 'sec-telegram-2fa',
      title: 'Telegram 2FA enabled',
      description: 'Enable Two-Step Verification in Telegram.',
      category: 'account-security',
      mandatoryForLive: true,
    },
    {
      id: 'wallet-dedicated',
      title: 'Dedicated trading wallet created',
      description: 'Create a separate TON wallet exclusively for agent trading.',
      category: 'wallet',
      mandatoryForLive: true,
    },
    {
      id: 'wallet-test-transaction',
      title: 'Test transaction completed',
      description: 'Send a small test transaction to verify the wallet works.',
      category: 'wallet',
      mandatoryForLive: false, // optional
    },
    {
      id: 'platform-risk-disclosures-read',
      title: 'Risk disclosures read',
      description: 'I have read the full Risk Disclosures document.',
      category: 'platform',
      mandatoryForLive: true,
    },
    {
      id: 'final-ai-loses-money',
      title: 'AI agents can and do lose money',
      description: 'I understand that AI agents can and do lose money.',
      category: 'final-acknowledgment',
      mandatoryForLive: true,
    },
  ],
};

const TEST_MANIFEST_V2: ChecklistManifest = {
  ...TEST_MANIFEST_V1,
  version: '2.0.0',
  items: [
    ...TEST_MANIFEST_V1.items,
    {
      id: 'new-item-v2',
      title: 'New mandatory item added in v2',
      description: 'A new requirement added after the v1 release.',
      category: 'platform',
      mandatoryForLive: true,
    },
  ],
};

const MANDATORY_IDS_V1 = TEST_MANIFEST_V1.items
  .filter(i => i.mandatoryForLive)
  .map(i => i.id);

// ============================================================================
// Helpers
// ============================================================================

function acknowledgeAll(
  manager: ChecklistStatusManager,
  userId: string,
  ids: string[],
): void {
  for (const id of ids) {
    manager.acknowledge(userId, id, { ipAddress: '127.0.0.1' });
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('ChecklistStatusManager', () => {
  let manager: ChecklistStatusManager;
  const userId = 'usr_test_alice';

  beforeEach(() => {
    manager = new ChecklistStatusManager(TEST_MANIFEST_V1);
  });

  // --------------------------------------------------------------------------
  // 1. Missing item → live mode blocked
  // --------------------------------------------------------------------------

  describe('Scenario 1: Missing mandatory item blocks live mode', () => {
    it('blocks live trading when no items have been acknowledged', () => {
      const gate = manager.checkLiveTradingGate(userId);
      expect(gate.allowed).toBe(false);
      if (!gate.allowed) {
        expect(gate.reason).toBe('missing_items');
        expect(gate.missingItemIds).toEqual(expect.arrayContaining(MANDATORY_IDS_V1));
      }
    });

    it('blocks live trading when only some mandatory items are acknowledged', () => {
      // Acknowledge all but the last mandatory item
      const partial = MANDATORY_IDS_V1.slice(0, -1);
      acknowledgeAll(manager, userId, partial);

      const gate = manager.checkLiveTradingGate(userId);
      expect(gate.allowed).toBe(false);
      if (!gate.allowed) {
        expect(gate.reason).toBe('missing_items');
        expect(gate.missingItemIds).toContain(MANDATORY_IDS_V1.at(-1));
      }
    });

    it('acknowledging only the optional item still blocks live trading', () => {
      manager.acknowledge(userId, 'wallet-test-transaction');

      const gate = manager.checkLiveTradingGate(userId);
      expect(gate.allowed).toBe(false);
      if (!gate.allowed) {
        expect(gate.reason).toBe('missing_items');
        expect(gate.missingItemIds).toHaveLength(MANDATORY_IDS_V1.length);
      }
    });

    it('returns the specific missing item IDs so the UI can highlight them', () => {
      manager.acknowledge(userId, 'sec-telegram-2fa');

      const gate = manager.checkLiveTradingGate(userId);
      expect(gate.allowed).toBe(false);
      if (!gate.allowed && gate.reason === 'missing_items') {
        expect(gate.missingItemIds).not.toContain('sec-telegram-2fa');
        expect(gate.missingItemIds).toContain('wallet-dedicated');
        expect(gate.missingItemIds).toContain('platform-risk-disclosures-read');
        expect(gate.missingItemIds).toContain('final-ai-loses-money');
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Outdated version → mode downgraded to simulation at next transition
  // --------------------------------------------------------------------------

  describe('Scenario 2: Outdated checklist version blocks live mode', () => {
    it('blocks live trading and reports version_mismatch after a checklist update', () => {
      // User acknowledges all mandatory items under v1
      acknowledgeAll(manager, userId, MANDATORY_IDS_V1);
      expect(manager.checkLiveTradingGate(userId).allowed).toBe(true);

      // Operator updates the checklist to v2 (adds a new mandatory item)
      manager.reloadManifest(TEST_MANIFEST_V2);

      const gate = manager.checkLiveTradingGate(userId);
      expect(gate.allowed).toBe(false);
      if (!gate.allowed) {
        expect(gate.reason).toBe('version_mismatch');
        if (gate.reason === 'version_mismatch') {
          expect(gate.currentVersion).toBe('2.0.0');
          expect(gate.userVersion).toBe('1.0.0');
        }
      }
    });

    it('requires re-acknowledgement of new mandatory item after version bump', () => {
      acknowledgeAll(manager, userId, MANDATORY_IDS_V1);
      manager.reloadManifest(TEST_MANIFEST_V2);

      // Re-acknowledge ALL items including the new v2 one
      acknowledgeAll(manager, userId, [...MANDATORY_IDS_V1, 'new-item-v2']);

      const gate = manager.checkLiveTradingGate(userId);
      expect(gate.allowed).toBe(true);
    });

    it('still gates even if the user acknowledged the exact same items on v1', () => {
      const allV2Ids = TEST_MANIFEST_V2.items
        .filter(i => i.mandatoryForLive)
        .map(i => i.id);

      // Manager is still on v1, so acknowledging items records v1 version
      acknowledgeAll(manager, userId, allV2Ids.filter(id =>
        TEST_MANIFEST_V1.items.some(i => i.id === id),
      ));

      manager.reloadManifest(TEST_MANIFEST_V2);

      const gate = manager.checkLiveTradingGate(userId);
      // Acknowledged under v1, so should still be blocked (version mismatch or missing)
      expect(gate.allowed).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Full acknowledgement → live mode enabled
  // --------------------------------------------------------------------------

  describe('Scenario 3: Full acknowledgement enables live mode', () => {
    it('allows live trading after all mandatory items are acknowledged', () => {
      acknowledgeAll(manager, userId, MANDATORY_IDS_V1);

      const gate = manager.checkLiveTradingGate(userId);
      expect(gate.allowed).toBe(true);
    });

    it('allows live trading even when optional items are not acknowledged', () => {
      acknowledgeAll(manager, userId, MANDATORY_IDS_V1);
      // 'wallet-test-transaction' is optional and NOT acknowledged

      const gate = manager.checkLiveTradingGate(userId);
      expect(gate.allowed).toBe(true);
    });

    it('reports canEnableLiveTrading=true in getStatus after full acknowledgement', () => {
      acknowledgeAll(manager, userId, MANDATORY_IDS_V1);

      const status = manager.getStatus(userId);
      expect(status.allMandatoryAcknowledged).toBe(true);
      expect(status.canEnableLiveTrading).toBe(true);
    });

    it('tracks acknowledgement timestamps per item', () => {
      const before = new Date();
      manager.acknowledge(userId, 'sec-telegram-2fa', { ipAddress: '10.0.0.1' });
      const after = new Date();

      const status = manager.getStatus(userId);
      const itemStatus = status.items.find(s => s.item.id === 'sec-telegram-2fa');
      expect(itemStatus?.acknowledged).toBe(true);
      expect(itemStatus?.acknowledgedAt).toBeInstanceOf(Date);
      expect(itemStatus?.acknowledgedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(itemStatus?.acknowledgedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // --------------------------------------------------------------------------
  // Audit log
  // --------------------------------------------------------------------------

  describe('Audit log', () => {
    it('records every acknowledgement in the audit log', () => {
      manager.acknowledge(userId, 'sec-telegram-2fa', { ipAddress: '1.2.3.4' });
      manager.acknowledge(userId, 'wallet-dedicated', { ipAddress: '1.2.3.4' });

      const log = manager.getAuditLog(userId);
      expect(log).toHaveLength(2);
      expect(log[0].itemId).toBe('sec-telegram-2fa');
      expect(log[0].userId).toBe(userId);
      expect(log[0].checklistVersion).toBe('1.0.0');
      expect(log[0].ipAddress).toBe('1.2.3.4');
      expect(log[1].itemId).toBe('wallet-dedicated');
    });

    it('filters audit log by userId', () => {
      manager.acknowledge(userId, 'sec-telegram-2fa');
      manager.acknowledge('usr_other', 'sec-telegram-2fa');

      const aliceLog = manager.getAuditLog(userId);
      const otherLog = manager.getAuditLog('usr_other');

      expect(aliceLog).toHaveLength(1);
      expect(otherLog).toHaveLength(1);
    });

    it('assigns unique IDs to each audit record', () => {
      manager.acknowledge(userId, 'sec-telegram-2fa');
      manager.acknowledge(userId, 'wallet-dedicated');

      const log = manager.getAuditLog(userId);
      const ids = log.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // --------------------------------------------------------------------------
  // Error handling
  // --------------------------------------------------------------------------

  describe('Error handling', () => {
    it('throws when acknowledging an unknown item id', () => {
      expect(() => manager.acknowledge(userId, 'nonexistent-item-id')).toThrow(
        /Unknown checklist item/,
      );
    });

    it('getStatus returns all items with acknowledged=false for a new user', () => {
      const status = manager.getStatus('usr_brand_new');
      expect(status.items).toHaveLength(TEST_MANIFEST_V1.items.length);
      expect(status.items.every(i => !i.acknowledged)).toBe(true);
      expect(status.allMandatoryAcknowledged).toBe(false);
      expect(status.canEnableLiveTrading).toBe(false);
    });

    it('re-acknowledging the same item is idempotent (latest record wins)', () => {
      manager.acknowledge(userId, 'sec-telegram-2fa');
      manager.acknowledge(userId, 'sec-telegram-2fa');

      const status = manager.getStatus(userId);
      const item = status.items.find(s => s.item.id === 'sec-telegram-2fa');
      expect(item?.acknowledged).toBe(true);
      // Audit log has two entries (each acknowledgement is tracked)
      const log = manager.getAuditLog(userId);
      expect(log.filter(r => r.itemId === 'sec-telegram-2fa')).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Manifest helpers
  // --------------------------------------------------------------------------

  describe('Manifest access', () => {
    it('exposes the manifest version', () => {
      expect(manager.getVersion()).toBe('1.0.0');
    });

    it('returns only mandatoryForLive items from getMandatoryItems()', () => {
      const mandatory = manager.getMandatoryItems();
      expect(mandatory.every(i => i.mandatoryForLive)).toBe(true);
      expect(mandatory.map(i => i.id)).toEqual(expect.arrayContaining(MANDATORY_IDS_V1));
      expect(mandatory.find(i => i.id === 'wallet-test-transaction')).toBeUndefined();
    });
  });
});
