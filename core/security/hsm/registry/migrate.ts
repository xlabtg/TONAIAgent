/**
 * Migration utility: import existing in-memory key mappings from a JSON file.
 *
 * If you were running with the old in-memory registry and want to migrate to
 * the file or postgres backend, export your mappings to a JSON file and run
 * this script to import them.
 *
 * JSON file format:
 * {
 *   "entries": [
 *     { "keyId": "my-key", "providerRef": "arn:aws:kms:...", "provider": "aws_kms" },
 *     ...
 *   ]
 * }
 *
 * Usage:
 *   NODE_HSM_REGISTRY=postgres NODE_HSM_REGISTRY_PG_URL=postgres://... \
 *     node -e "require('./migrate').migrateFromJsonFile('./backup.json')"
 *
 * Or from TypeScript:
 *   import { migrateFromJsonFile } from './migrate';
 *   await migrateFromJsonFile('./backup.json');
 */

import * as fs from 'node:fs';
import { buildRegistry } from './index.js';
import type { KeyRegistryEntry, RegistryType } from './key-registry.js';

interface MigrationInput {
  entries: Array<{
    keyId: string;
    providerRef: string;
    provider: string;
    createdAt?: string;
  }>;
}

/**
 * Read a JSON file containing key registry entries and import them into the
 * configured registry backend.
 *
 * @param filePath       Path to the JSON file (see format above).
 * @param registryType   Target registry type; defaults to NODE_HSM_REGISTRY env var.
 * @returns              Number of entries imported.
 */
export async function migrateFromJsonFile(
  filePath: string,
  registryType?: RegistryType
): Promise<number> {
  const raw = fs.readFileSync(filePath, 'utf8');
  const input = JSON.parse(raw) as MigrationInput;

  if (!Array.isArray(input.entries)) {
    throw new Error(`Migration file must contain an "entries" array. Got: ${JSON.stringify(Object.keys(input))}`);
  }

  const registry = buildRegistry(registryType);
  let count = 0;

  for (const item of input.entries) {
    if (!item.keyId || !item.providerRef || !item.provider) {
      console.warn(`[migrate] Skipping invalid entry: ${JSON.stringify(item)}`);
      continue;
    }

    const entry: KeyRegistryEntry = {
      keyId: item.keyId,
      providerRef: item.providerRef,
      provider: item.provider,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    };

    await registry.put(entry);
    count++;
    console.log(`[migrate] Imported: ${item.keyId} → ${item.providerRef}`);
  }

  console.log(`[migrate] Done. ${count} entries imported.`);
  return count;
}
