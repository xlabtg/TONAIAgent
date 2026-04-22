/**
 * In-memory KeyRegistry backend.
 *
 * Extracted from the original in-process Map used by AwsKmsAdapter and
 * AzureKeyVaultAdapter.  It deliberately mirrors that historic behaviour
 * so that existing tests pass unchanged.
 *
 * NOT suitable for production: the registry is lost on process restart.
 * A console.warn is emitted when this backend is used and NODE_ENV=production
 * unless NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD=true is set.
 */

import type { KeyRegistry, KeyRegistryEntry } from './key-registry.js';

export class MemoryKeyRegistry implements KeyRegistry {
  private readonly store = new Map<string, KeyRegistryEntry>();

  constructor() {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD !== 'true'
    ) {
      console.warn(
        '[MemoryKeyRegistry] WARNING: Using in-memory key registry in production. ' +
          'Key mappings will be lost on process restart — set NODE_HSM_REGISTRY=postgres ' +
          'or NODE_HSM_REGISTRY=file for durability. ' +
          'Suppress this warning with NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD=true.'
      );
    }
  }

  async put(entry: KeyRegistryEntry): Promise<void> {
    this.store.set(entry.keyId, { ...entry, updatedAt: new Date() });
  }

  async get(keyId: string): Promise<KeyRegistryEntry | null> {
    return this.store.get(keyId) ?? null;
  }

  async list(provider?: string): Promise<KeyRegistryEntry[]> {
    const all = Array.from(this.store.values());
    return provider ? all.filter((e) => e.provider === provider) : all;
  }

  async delete(keyId: string): Promise<void> {
    this.store.delete(keyId);
  }
}
