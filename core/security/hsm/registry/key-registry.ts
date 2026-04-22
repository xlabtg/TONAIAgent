/**
 * KeyRegistry — persistent mapping from application keyId → provider-specific
 * reference (KMS ARN, Azure key name, etc.).
 *
 * Without persistence, process restarts destroy the mapping and every existing
 * key becomes inaccessible even though the key material remains intact inside
 * the HSM/KMS.  This interface and its backends fix that (issue #343).
 *
 * Backend selection: set the NODE_HSM_REGISTRY environment variable to one of:
 *   postgres  — PostgreSQL table (recommended for production)
 *   file      — JSON file with atomic writes (single-node staging)
 *   memory    — in-process Map (dev/CI only; warns and blocks in production)
 */

export interface KeyRegistryEntry {
  /** Application-level key identifier. */
  keyId: string;
  /** Provider-specific reference (ARN, vault key name, …). */
  providerRef: string;
  /** HSM provider that owns this key ('aws_kms', 'azure_hsm', …). */
  provider: string;
  /** When this entry was first written. */
  createdAt: Date;
  /** Optional: last time the entry was read/updated. */
  updatedAt?: Date;
}

export interface KeyRegistry {
  /** Store a new entry. Overwrites any existing entry for keyId. */
  put(entry: KeyRegistryEntry): Promise<void>;

  /** Retrieve the entry for keyId, or null if not found. */
  get(keyId: string): Promise<KeyRegistryEntry | null>;

  /** List all entries (optionally filtered by provider). */
  list(provider?: string): Promise<KeyRegistryEntry[]>;

  /** Remove the entry for keyId. No-op if it doesn't exist. */
  delete(keyId: string): Promise<void>;
}

/** Factory: create the appropriate registry backend from the given type string. */
export type RegistryType = 'postgres' | 'file' | 'memory';

export function registryTypeFromEnv(): RegistryType {
  const raw = (process.env.NODE_HSM_REGISTRY ?? 'memory').toLowerCase();
  if (raw === 'postgres' || raw === 'file' || raw === 'memory') {
    return raw as RegistryType;
  }
  throw new Error(
    `Unknown NODE_HSM_REGISTRY value '${raw}'. Valid options: postgres | file | memory`
  );
}
