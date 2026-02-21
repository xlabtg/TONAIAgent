/**
 * TONAIAgent - Open Agent Protocol Capability Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCapabilityRegistry,
  createCapability,
  CapabilityRegistry,
  STANDARD_CAPABILITIES,
  getStandardCapability,
} from '../../src/protocol/capability';
import { CapabilityExecutor } from '../../src/protocol/capability/types';

describe('Capability Registry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = createCapabilityRegistry({
      enableCache: true,
      validateSchemas: true,
    });
  });

  describe('register', () => {
    it('should register a capability', async () => {
      const cap = createCapability({
        id: 'test.capability',
        name: 'Test Capability',
        category: 'trading',
        description: 'A test capability',
        riskLevel: 'low',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: {} },
        execute: async () => ({ success: true, executionTime: 100 }),
      });

      await registry.register({
        capability: cap.capability,
        executor: cap.executor,
        providerId: 'agent_123',
      });

      expect(registry.has('test.capability')).toBe(true);
    });

    it('should throw on duplicate registration without allowOverwrite', async () => {
      const cap = createCapability({
        id: 'test.capability',
        name: 'Test Capability',
        category: 'trading',
        description: 'A test capability',
        riskLevel: 'low',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: {} },
        execute: async () => ({ success: true, executionTime: 100 }),
      });

      await registry.register({
        capability: cap.capability,
        executor: cap.executor,
        providerId: 'agent_123',
      });

      await expect(
        registry.register({
          capability: cap.capability,
          executor: cap.executor,
          providerId: 'agent_456',
        })
      ).rejects.toThrow('already registered');
    });
  });

  describe('execute', () => {
    it('should execute a registered capability', async () => {
      let executed = false;

      const cap = createCapability({
        id: 'test.execute',
        name: 'Test Execute',
        category: 'trading',
        description: 'Test execution',
        riskLevel: 'low',
        inputSchema: { type: 'object', properties: { value: { type: 'number' } } },
        outputSchema: { type: 'object', properties: { result: { type: 'number' } } },
        execute: async (params) => {
          executed = true;
          return {
            success: true,
            data: { result: (params.value as number) * 2 },
            executionTime: 50,
          };
        },
      });

      await registry.register({
        capability: cap.capability,
        executor: cap.executor,
        providerId: 'agent_123',
      });

      const result = await registry.execute({
        capabilityId: 'test.execute',
        params: { value: 10 },
      });

      expect(executed).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 20 });
    });

    it('should return error for non-existent capability', async () => {
      const result = await registry.execute({
        capabilityId: 'non.existent',
        params: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('estimate', () => {
    it('should estimate execution cost', async () => {
      const cap = createCapability({
        id: 'test.estimate',
        name: 'Test Estimate',
        category: 'trading',
        description: 'Test estimation',
        riskLevel: 'low',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: {} },
        execute: async () => ({ success: true, executionTime: 100 }),
        estimate: async () => ({
          fees: 0.1,
          feeCurrency: 'TON',
          estimatedTime: 2000,
          confidence: 0.95,
        }),
      });

      await registry.register({
        capability: cap.capability,
        executor: cap.executor,
        providerId: 'agent_123',
      });

      const estimate = await registry.estimate({
        capabilityId: 'test.estimate',
        params: {},
      });

      expect(estimate.fees).toBe(0.1);
      expect(estimate.feeCurrency).toBe('TON');
      expect(estimate.estimatedTime).toBe(2000);
    });
  });

  describe('validate', () => {
    it('should validate parameters', async () => {
      const cap = createCapability({
        id: 'test.validate',
        name: 'Test Validate',
        category: 'trading',
        description: 'Test validation',
        riskLevel: 'low',
        inputSchema: {
          type: 'object',
          properties: { required_field: { type: 'string' } },
          required: ['required_field'],
        },
        outputSchema: { type: 'object', properties: {} },
        execute: async () => ({ success: true, executionTime: 100 }),
        validate: async (params) => {
          if (!params.required_field) {
            return {
              valid: false,
              errors: [{ path: 'required_field', message: 'Required', code: 'REQUIRED' }],
              warnings: [],
            };
          }
          return { valid: true, errors: [], warnings: [] };
        },
      });

      await registry.register({
        capability: cap.capability,
        executor: cap.executor,
        providerId: 'agent_123',
      });

      const invalidResult = await registry.validate({
        capabilityId: 'test.validate',
        params: {},
      });

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);

      const validResult = await registry.validate({
        capabilityId: 'test.validate',
        params: { required_field: 'value' },
      });

      expect(validResult.valid).toBe(true);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const capabilities = [
        createCapability({
          id: 'trading.swap',
          name: 'Swap',
          category: 'trading',
          description: 'Token swap',
          riskLevel: 'medium',
          inputSchema: { type: 'object', properties: {} },
          outputSchema: { type: 'object', properties: {} },
          execute: async () => ({ success: true, executionTime: 100 }),
        }),
        createCapability({
          id: 'yield.stake',
          name: 'Stake',
          category: 'yield',
          description: 'Staking',
          riskLevel: 'low',
          inputSchema: { type: 'object', properties: {} },
          outputSchema: { type: 'object', properties: {} },
          execute: async () => ({ success: true, executionTime: 100 }),
        }),
        createCapability({
          id: 'data.analyze',
          name: 'Analyze',
          category: 'data',
          description: 'Data analysis',
          riskLevel: 'low',
          inputSchema: { type: 'object', properties: {} },
          outputSchema: { type: 'object', properties: {} },
          execute: async () => ({ success: true, executionTime: 100 }),
        }),
      ];

      for (const cap of capabilities) {
        await registry.register({
          capability: cap.capability,
          executor: cap.executor,
          providerId: 'agent_123',
        });
      }
    });

    it('should search by category', async () => {
      const result = await registry.search({ category: 'trading' });

      expect(result.capabilities).toHaveLength(1);
      expect(result.capabilities[0].id).toBe('trading.swap');
    });

    it('should search by query', async () => {
      const result = await registry.search({ query: 'stake' });

      expect(result.capabilities).toHaveLength(1);
      expect(result.capabilities[0].id).toBe('yield.stake');
    });

    it('should filter by risk level', async () => {
      const result = await registry.search({ maxRiskLevel: 'low' });

      expect(result.capabilities).toHaveLength(2);
      expect(result.capabilities.every(c => c.riskLevel === 'low')).toBe(true);
    });
  });

  describe('getManifest', () => {
    it('should get capability manifest for agent', async () => {
      const cap = createCapability({
        id: 'test.manifest',
        name: 'Test Manifest',
        category: 'trading',
        description: 'Test manifest',
        riskLevel: 'low',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: {} },
        execute: async () => ({ success: true, executionTime: 100 }),
      });

      await registry.register({
        capability: cap.capability,
        executor: cap.executor,
        providerId: 'agent_123',
      });

      const manifest = await registry.getManifest('agent_123');

      expect(manifest.agentId).toBe('agent_123');
      expect(manifest.capabilities).toHaveLength(1);
      expect(manifest.capabilities[0].id).toBe('test.manifest');
    });
  });

  describe('event subscription', () => {
    it('should emit events on registration', async () => {
      const events: any[] = [];
      registry.subscribe((event) => events.push(event));

      const cap = createCapability({
        id: 'test.events',
        name: 'Test Events',
        category: 'trading',
        description: 'Test events',
        riskLevel: 'low',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: {} },
        execute: async () => ({ success: true, executionTime: 100 }),
      });

      await registry.register({
        capability: cap.capability,
        executor: cap.executor,
        providerId: 'agent_123',
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('capability.registered');
    });
  });
});

describe('Standard Capabilities', () => {
  it('should have standard capabilities defined', () => {
    expect(STANDARD_CAPABILITIES).toBeDefined();
    expect(STANDARD_CAPABILITIES.length).toBeGreaterThan(0);
  });

  it('should get trading.swap capability', () => {
    const cap = getStandardCapability('trading.swap');

    expect(cap).toBeDefined();
    expect(cap!.category).toBe('trading');
    expect(cap!.riskLevel).toBe('medium');
  });

  it('should get yield.stake capability', () => {
    const cap = getStandardCapability('yield.stake');

    expect(cap).toBeDefined();
    expect(cap!.category).toBe('yield');
    expect(cap!.riskLevel).toBe('low');
  });
});
