/**
 * Registry factory — creates the appropriate KeyRegistry backend based on
 * the type string.  Consumers should call buildRegistry() rather than
 * importing concrete backend classes directly.
 */

import { MemoryKeyRegistry } from './memory.js';
import { FileKeyRegistry } from './file.js';
import { PostgresKeyRegistry } from './postgres.js';
import { registryTypeFromEnv, type KeyRegistry, type RegistryType } from './key-registry.js';

export { MemoryKeyRegistry } from './memory.js';
export { FileKeyRegistry } from './file.js';
export { PostgresKeyRegistry } from './postgres.js';
export type { KeyRegistry, KeyRegistryEntry, RegistryType } from './key-registry.js';

/**
 * Build a KeyRegistry instance for the given type.
 * Falls back to environment variable (NODE_HSM_REGISTRY) when type is omitted.
 */
export function buildRegistry(type?: RegistryType): KeyRegistry {
  const resolved: RegistryType = type ?? registryTypeFromEnv();
  switch (resolved) {
    case 'memory':
      return new MemoryKeyRegistry();
    case 'file':
      return new FileKeyRegistry();
    case 'postgres':
      return new PostgresKeyRegistry();
    default: {
      const exhaustive: never = resolved;
      throw new Error(`Unknown registry type: ${exhaustive as string}`);
    }
  }
}
