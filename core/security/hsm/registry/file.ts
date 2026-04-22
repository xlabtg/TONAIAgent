/**
 * File-backed KeyRegistry.
 *
 * Persists the registry as a JSON file using atomic write (write to a temp
 * file, then rename) so that a crash mid-write cannot corrupt the registry.
 *
 * Suitable for single-node staging deployments.  For multi-node or
 * high-availability set-ups use the Postgres backend instead.
 *
 * Configuration:
 *   NODE_HSM_REGISTRY_FILE — path to the registry JSON file.
 *                            Defaults to ./hsm-key-registry.json
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { KeyRegistry, KeyRegistryEntry } from './key-registry.js';

const DEFAULT_PATH = './hsm-key-registry.json';

export class FileKeyRegistry implements KeyRegistry {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? process.env.NODE_HSM_REGISTRY_FILE ?? DEFAULT_PATH;
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private read(): Record<string, KeyRegistryEntry> {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // Re-hydrate Date fields
      const result: Record<string, KeyRegistryEntry> = {};
      for (const [k, v] of Object.entries(parsed)) {
        const entry = v as Record<string, unknown>;
        result[k] = {
          keyId: entry.keyId as string,
          providerRef: entry.providerRef as string,
          provider: entry.provider as string,
          createdAt: new Date(entry.createdAt as string),
          updatedAt: entry.updatedAt ? new Date(entry.updatedAt as string) : undefined,
        };
      }
      return result;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw err;
    }
  }

  /** Atomic write: write to a temp file then rename so crashes can't corrupt. */
  private write(data: Record<string, KeyRegistryEntry>): void {
    const dir = path.dirname(path.resolve(this.filePath));
    const tmp = path.join(dir, `.hsm-registry-${process.pid}-${Date.now()}.tmp`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  // --------------------------------------------------------------------------
  // KeyRegistry implementation
  // --------------------------------------------------------------------------

  async put(entry: KeyRegistryEntry): Promise<void> {
    const data = this.read();
    data[entry.keyId] = { ...entry, updatedAt: new Date() };
    this.write(data);
  }

  async get(keyId: string): Promise<KeyRegistryEntry | null> {
    const data = this.read();
    return data[keyId] ?? null;
  }

  async list(provider?: string): Promise<KeyRegistryEntry[]> {
    const data = this.read();
    const all = Object.values(data);
    return provider ? all.filter((e) => e.provider === provider) : all;
  }

  async delete(keyId: string): Promise<void> {
    const data = this.read();
    delete data[keyId];
    this.write(data);
  }
}
