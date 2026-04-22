/**
 * HSM Key Registry — unit and compliance tests.
 *
 * Each backend (memory, file) passes an identical compliance suite defined
 * by `registryComplianceSuite`, verifying that the KeyRegistry contract is
 * met regardless of the backend.
 *
 * The Postgres backend is tested only when PG_TEST=true is set and
 * NODE_HSM_REGISTRY_PG_URL is configured, because it requires a live database.
 *
 * Integration test: restarting the process is simulated by constructing a
 * fresh FileKeyRegistry instance pointing at the same file and confirming
 * that previously persisted entries are still resolvable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { MemoryKeyRegistry } from '../../core/security/hsm/registry/memory.js';
import { FileKeyRegistry } from '../../core/security/hsm/registry/file.js';
import type { KeyRegistry, KeyRegistryEntry } from '../../core/security/hsm/registry/key-registry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<KeyRegistryEntry> = {}): KeyRegistryEntry {
  return {
    keyId: 'test-key-001',
    providerRef: 'arn:aws:kms:us-east-1:123456789012:key/abcd-1234',
    provider: 'aws_kms',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Compliance suite — runs against any KeyRegistry implementation
// ---------------------------------------------------------------------------

function registryComplianceSuite(
  label: string,
  factory: () => KeyRegistry
): void {
  describe(`KeyRegistry compliance — ${label}`, () => {
    let registry: KeyRegistry;

    beforeEach(() => {
      registry = factory();
    });

    it('put and get round-trip', async () => {
      const entry = makeEntry();
      await registry.put(entry);
      const retrieved = await registry.get(entry.keyId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.keyId).toBe(entry.keyId);
      expect(retrieved!.providerRef).toBe(entry.providerRef);
      expect(retrieved!.provider).toBe(entry.provider);
    });

    it('get returns null for unknown keyId', async () => {
      expect(await registry.get('nonexistent-key')).toBeNull();
    });

    it('put overwrites an existing entry', async () => {
      const original = makeEntry({ providerRef: 'arn:original' });
      await registry.put(original);

      const updated = makeEntry({ providerRef: 'arn:updated' });
      await registry.put(updated);

      const retrieved = await registry.get(original.keyId);
      expect(retrieved!.providerRef).toBe('arn:updated');
    });

    it('list returns all entries when no provider filter', async () => {
      await registry.put(makeEntry({ keyId: 'key-a', provider: 'aws_kms' }));
      await registry.put(makeEntry({ keyId: 'key-b', provider: 'azure_hsm' }));
      const all = await registry.list();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('list filters by provider', async () => {
      await registry.put(makeEntry({ keyId: 'aws-key', provider: 'aws_kms' }));
      await registry.put(makeEntry({ keyId: 'az-key', provider: 'azure_hsm' }));
      const awsKeys = await registry.list('aws_kms');
      const azKeys = await registry.list('azure_hsm');
      expect(awsKeys.every((e) => e.provider === 'aws_kms')).toBe(true);
      expect(azKeys.every((e) => e.provider === 'azure_hsm')).toBe(true);
    });

    it('delete removes an entry', async () => {
      const entry = makeEntry({ keyId: 'to-delete' });
      await registry.put(entry);
      expect(await registry.get(entry.keyId)).not.toBeNull();
      await registry.delete(entry.keyId);
      expect(await registry.get(entry.keyId)).toBeNull();
    });

    it('delete is a no-op for nonexistent keys', async () => {
      await expect(registry.delete('does-not-exist')).resolves.not.toThrow();
    });

    it('list returns empty array when registry is empty', async () => {
      const all = await registry.list();
      expect(all).toEqual([]);
    });

    it('multiple independent entries coexist', async () => {
      await registry.put(makeEntry({ keyId: 'key-1', providerRef: 'ref-1' }));
      await registry.put(makeEntry({ keyId: 'key-2', providerRef: 'ref-2' }));
      await registry.put(makeEntry({ keyId: 'key-3', providerRef: 'ref-3' }));

      expect((await registry.get('key-1'))!.providerRef).toBe('ref-1');
      expect((await registry.get('key-2'))!.providerRef).toBe('ref-2');
      expect((await registry.get('key-3'))!.providerRef).toBe('ref-3');
    });
  });
}

// ---------------------------------------------------------------------------
// Run compliance suite against each backend
// ---------------------------------------------------------------------------

registryComplianceSuite('MemoryKeyRegistry', () => new MemoryKeyRegistry());

describe('FileKeyRegistry compliance', () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsm-reg-test-'));
    tmpFile = path.join(tmpDir, 'registry.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  registryComplianceSuite('FileKeyRegistry', () => new FileKeyRegistry(tmpFile));
});

// ---------------------------------------------------------------------------
// Integration: simulate process restart (FileKeyRegistry)
// ---------------------------------------------------------------------------

describe('FileKeyRegistry — process restart simulation', () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsm-restart-test-'));
    tmpFile = path.join(tmpDir, 'registry.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('keys written by one instance are readable by a second instance on the same file', async () => {
    // Simulate "first process": write a key
    const instance1 = new FileKeyRegistry(tmpFile);
    await instance1.put(makeEntry({ keyId: 'persistent-key', providerRef: 'arn:kms:persisted' }));

    // Simulate "second process" (new instance, same file path)
    const instance2 = new FileKeyRegistry(tmpFile);
    const entry = await instance2.get('persistent-key');

    expect(entry).not.toBeNull();
    expect(entry!.providerRef).toBe('arn:kms:persisted');
  });

  it('delete in first instance is visible to second instance', async () => {
    const instance1 = new FileKeyRegistry(tmpFile);
    await instance1.put(makeEntry({ keyId: 'to-delete' }));

    const instance2 = new FileKeyRegistry(tmpFile);
    await instance2.delete('to-delete');

    const instance3 = new FileKeyRegistry(tmpFile);
    expect(await instance3.get('to-delete')).toBeNull();
  });

  it('multiple keys survive a simulated restart', async () => {
    const writer = new FileKeyRegistry(tmpFile);
    await writer.put(makeEntry({ keyId: 'key-a', providerRef: 'ref-a' }));
    await writer.put(makeEntry({ keyId: 'key-b', providerRef: 'ref-b' }));
    await writer.put(makeEntry({ keyId: 'key-c', providerRef: 'ref-c' }));

    const reader = new FileKeyRegistry(tmpFile);
    expect((await reader.get('key-a'))!.providerRef).toBe('ref-a');
    expect((await reader.get('key-b'))!.providerRef).toBe('ref-b');
    expect((await reader.get('key-c'))!.providerRef).toBe('ref-c');
  });
});

// ---------------------------------------------------------------------------
// MemoryKeyRegistry — production warning behaviour
// ---------------------------------------------------------------------------

describe('MemoryKeyRegistry — production warning', () => {
  it('logs a warning when used in production without override', () => {
    const original = process.env.NODE_ENV;
    const warnSpy: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnSpy.push(String(args[0]));

    process.env.NODE_ENV = 'production';
    delete process.env.NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD;

    try {
      new MemoryKeyRegistry();
      expect(warnSpy.some((msg) => msg.includes('MemoryKeyRegistry'))).toBe(true);
    } finally {
      process.env.NODE_ENV = original;
      console.warn = originalWarn;
    }
  });

  it('suppresses the warning when NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD=true', () => {
    const original = process.env.NODE_ENV;
    const origAllow = process.env.NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD;
    const warnSpy: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnSpy.push(String(args[0]));

    process.env.NODE_ENV = 'production';
    process.env.NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD = 'true';

    try {
      new MemoryKeyRegistry();
      expect(warnSpy.filter((msg) => msg.includes('MemoryKeyRegistry')).length).toBe(0);
    } finally {
      process.env.NODE_ENV = original;
      if (origAllow === undefined) {
        delete process.env.NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD;
      } else {
        process.env.NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD = origAllow;
      }
      console.warn = originalWarn;
    }
  });
});

// ---------------------------------------------------------------------------
// Postgres backend — only when PG_TEST=true
// ---------------------------------------------------------------------------

const PG_TEST = process.env.PG_TEST === 'true';

describe.skipIf(!PG_TEST)('PostgresKeyRegistry compliance', async () => {
  const { PostgresKeyRegistry } = await import(
    '../../core/security/hsm/registry/postgres.js'
  );

  registryComplianceSuite(
    'PostgresKeyRegistry',
    () => new PostgresKeyRegistry()
  );
});
