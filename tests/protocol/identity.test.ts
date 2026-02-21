/**
 * TONAIAgent - Open Agent Protocol Identity Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createIdentityManager,
  DefaultIdentityManager,
  IdentityManager,
} from '../../src/protocol/identity';

describe('Identity Manager', () => {
  let identityManager: IdentityManager;

  beforeEach(() => {
    identityManager = createIdentityManager({
      network: 'ton',
      enableOnChain: false,
      enableCache: true,
    });
  });

  describe('createIdentity', () => {
    it('should create a new agent identity', async () => {
      const identity = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      expect(identity).toBeDefined();
      expect(identity.name).toBe('TestAgent');
      expect(identity.ownership.type).toBe('user');
      expect(identity.ownership.ownerId).toBe('user_123');
      expect(identity.id).toMatch(/^oap:\/\/ton\/user\/user_123\//);
    });

    it('should include owner address if provided', async () => {
      const identity = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
        ownerAddress: 'EQA123...',
      });

      expect(identity.ownership.ownerAddress).toBe('EQA123...');
    });

    it('should include metadata if provided', async () => {
      const identity = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'dao',
        ownerId: 'dao_456',
        metadata: { description: 'A test agent' },
      });

      expect(identity.metadata).toEqual({ description: 'A test agent' });
    });
  });

  describe('getIdentity', () => {
    it('should retrieve an existing identity', async () => {
      const created = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      const retrieved = await identityManager.getIdentity(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.name).toBe('TestAgent');
    });

    it('should return undefined for non-existent identity', async () => {
      const retrieved = await identityManager.getIdentity('oap://ton/user/unknown/agent_xyz');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('updateIdentity', () => {
    it('should update identity name', async () => {
      const created = await identityManager.createIdentity({
        name: 'OldName',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      const updated = await identityManager.updateIdentity({
        agentId: created.id,
        name: 'NewName',
      });

      expect(updated.name).toBe('NewName');
    });

    it('should update identity metadata', async () => {
      const created = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
        metadata: { version: 1 },
      });

      const updated = await identityManager.updateIdentity({
        agentId: created.id,
        metadata: { version: 2, description: 'Updated' },
      });

      expect(updated.metadata).toEqual({ version: 2, description: 'Updated' });
    });

    it('should throw for non-existent identity', async () => {
      await expect(
        identityManager.updateIdentity({
          agentId: 'oap://ton/user/unknown/agent_xyz',
          name: 'NewName',
        })
      ).rejects.toThrow('Identity not found');
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership to new owner', async () => {
      const created = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      const transferred = await identityManager.transferOwnership({
        agentId: created.id,
        newOwnerType: 'dao',
        newOwnerId: 'dao_456',
      });

      expect(transferred.ownership.type).toBe('dao');
      expect(transferred.ownership.ownerId).toBe('dao_456');
      expect(transferred.id).toMatch(/^oap:\/\/ton\/dao\/dao_456\//);
    });
  });

  describe('delegateControl', () => {
    it('should create a delegation', async () => {
      const created = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      const delegation = await identityManager.delegateControl({
        agentId: created.id,
        delegateTo: 'delegate_address',
        permissions: {
          canExecute: true,
          canConfigure: false,
          canView: true,
        },
      });

      expect(delegation).toBeDefined();
      expect(delegation.delegatee).toBe('delegate_address');
      expect(delegation.permissions.canExecute).toBe(true);
      expect(delegation.active).toBe(true);
    });

    it('should add delegatee to identity', async () => {
      const created = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      await identityManager.delegateControl({
        agentId: created.id,
        delegateTo: 'delegate_address',
        permissions: { canExecute: true, canConfigure: false, canView: true },
      });

      const updated = await identityManager.getIdentity(created.id);
      expect(updated!.ownership.delegatedTo).toContain('delegate_address');
    });
  });

  describe('revokeDelegation', () => {
    it('should revoke a delegation', async () => {
      const created = await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      await identityManager.delegateControl({
        agentId: created.id,
        delegateTo: 'delegate_address',
        permissions: { canExecute: true, canConfigure: false, canView: true },
      });

      const revoked = await identityManager.revokeDelegation(created.id, 'delegate_address');
      expect(revoked).toBe(true);

      const delegations = await identityManager.getDelegations(created.id);
      expect(delegations.filter(d => d.active)).toHaveLength(0);
    });
  });

  describe('searchIdentities', () => {
    it('should search by owner', async () => {
      await identityManager.createIdentity({
        name: 'Agent1',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      await identityManager.createIdentity({
        name: 'Agent2',
        ownerType: 'user',
        ownerId: 'user_456',
      });

      const result = await identityManager.searchIdentities({
        ownerId: 'user_123',
      });

      expect(result.identities).toHaveLength(1);
      expect(result.identities[0].ownership.ownerId).toBe('user_123');
    });

    it('should search by name', async () => {
      await identityManager.createIdentity({
        name: 'TradingBot',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      await identityManager.createIdentity({
        name: 'DataCollector',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      const result = await identityManager.searchIdentities({
        nameContains: 'Trading',
      });

      expect(result.identities).toHaveLength(1);
      expect(result.identities[0].name).toBe('TradingBot');
    });
  });

  describe('generateAgentId', () => {
    it('should generate unique IDs', () => {
      const id1 = identityManager.generateAgentId();
      const id2 = identityManager.generateAgentId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^agent_/);
    });
  });

  describe('parseAgentId', () => {
    it('should parse valid agent ID', () => {
      const parsed = identityManager.parseAgentId('oap://ton/user/user_123/agent_abc');

      expect(parsed).not.toBeNull();
      expect(parsed!.network).toBe('ton');
      expect(parsed!.ownerType).toBe('user');
      expect(parsed!.ownerId).toBe('user_123');
      expect(parsed!.agentId).toBe('agent_abc');
    });

    it('should return null for invalid ID', () => {
      const parsed = identityManager.parseAgentId('invalid_id');
      expect(parsed).toBeNull();
    });
  });

  describe('event subscription', () => {
    it('should emit events on identity creation', async () => {
      const events: any[] = [];
      identityManager.subscribe((event) => events.push(event));

      await identityManager.createIdentity({
        name: 'TestAgent',
        ownerType: 'user',
        ownerId: 'user_123',
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('identity.created');
    });
  });
});
