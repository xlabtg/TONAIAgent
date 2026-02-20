import { validateStrategy } from '../src/no-code/validation';
import { Strategy } from '../src/no-code/types';

const triggerBlock = {
  id: 'trigger1',
  category: 'trigger' as const,
  name: 'Manual Trigger',
  description: 'Test trigger',
  version: '1.0.0',
  config: { type: 'manual' },
  position: { x: 100, y: 100 },
  inputs: [],
  outputs: [{ id: 'out', type: 'output' as const, dataType: 'trigger' as const, label: 'Output', required: true }],
  enabled: true,
};

const actionBlock = {
  id: 'action1',
  category: 'action' as const,
  name: 'Trade Action',
  description: 'Test action',
  version: '1.0.0',
  config: { type: 'swap' },
  position: { x: 300, y: 100 },
  inputs: [{ id: 'in', type: 'input' as const, dataType: 'trigger' as const, label: 'Input', required: true }],
  outputs: [],
  enabled: true,
};

const strategy: Strategy = {
  id: 'test1',
  name: 'Test Strategy',
  description: 'Test',
  category: 'trading',
  version: '1.0.0',
  author: { id: 'user1' },
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'pending',
  blocks: [triggerBlock, actionBlock],
  connections: [{ id: 'conn1', sourceBlockId: 'trigger1', sourceOutputId: 'out', targetBlockId: 'action1', targetInputId: 'in' }],
  riskParams: { maxDrawdown: 10, positionLimit: 1000, dailyLossLimit: 100, requireApproval: false, cooldownPeriod: 0 },
  versionHistory: [],
};

console.log('Testing validation...');

const result = validateStrategy(strategy);
console.log('\nValidation result:');
console.log('Valid:', result.valid);
console.log('Errors:', JSON.stringify(result.errors, null, 2));
console.log('Warnings:', JSON.stringify(result.warnings, null, 2));
console.log('Risk Score:', result.riskScore);
