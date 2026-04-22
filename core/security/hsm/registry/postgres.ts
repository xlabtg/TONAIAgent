/**
 * PostgreSQL-backed KeyRegistry.
 *
 * Uses the `pg` npm package (peer dependency — install with `npm install pg`).
 * The table is created automatically on first use if it does not exist.
 *
 * Configuration (env vars or constructor options):
 *   NODE_HSM_REGISTRY_PG_URL  — full connection string, e.g.
 *                                postgres://user:pass@host:5432/dbname
 *   NODE_HSM_REGISTRY_PG_TABLE — table name (default: hsm_key_registry)
 *
 * Table schema (created automatically):
 *   CREATE TABLE hsm_key_registry (
 *     key_id      TEXT        PRIMARY KEY,
 *     provider_ref TEXT       NOT NULL,
 *     provider    TEXT        NOT NULL,
 *     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     updated_at  TIMESTAMPTZ
 *   );
 */

import type { KeyRegistry, KeyRegistryEntry } from './key-registry.js';

// Minimal subset of the `pg` Pool/PoolClient interface we actually use.
interface PgPool {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

const DEFAULT_TABLE = 'hsm_key_registry';

export class PostgresKeyRegistry implements KeyRegistry {
  private pool: PgPool | null = null;
  private readonly connectionString: string;
  private readonly table: string;
  private initialized = false;

  constructor(options?: { connectionString?: string; table?: string }) {
    this.connectionString =
      options?.connectionString ??
      process.env.NODE_HSM_REGISTRY_PG_URL ??
      '';

    if (!this.connectionString) {
      throw new Error(
        'PostgresKeyRegistry requires a connection string. ' +
          'Set NODE_HSM_REGISTRY_PG_URL or pass connectionString to the constructor.'
      );
    }

    this.table =
      options?.table ??
      process.env.NODE_HSM_REGISTRY_PG_TABLE ??
      DEFAULT_TABLE;
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private async getPool(): Promise<PgPool> {
    if (this.pool) return this.pool;

    // Optional peer dependency — loaded at runtime so the package can be
    // installed only when the postgres backend is actually used.
    let pg: { Pool: new (config: { connectionString: string }) => PgPool };
    try {
      pg = (await import('pg')) as typeof pg;
    } catch {
      throw new Error(
        'The `pg` package is required for PostgresKeyRegistry. ' +
          'Install it with: npm install pg'
      );
    }

    this.pool = new pg.Pool({ connectionString: this.connectionString });
    return this.pool;
  }

  private async ensureTable(): Promise<void> {
    if (this.initialized) return;
    const pool = await this.getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        key_id       TEXT        PRIMARY KEY,
        provider_ref TEXT        NOT NULL,
        provider     TEXT        NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ
      )
    `);
    this.initialized = true;
  }

  private rowToEntry(row: Record<string, unknown>): KeyRegistryEntry {
    return {
      keyId: row.key_id as string,
      providerRef: row.provider_ref as string,
      provider: row.provider as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // KeyRegistry implementation
  // --------------------------------------------------------------------------

  async put(entry: KeyRegistryEntry): Promise<void> {
    await this.ensureTable();
    const pool = await this.getPool();
    await pool.query(
      `INSERT INTO ${this.table} (key_id, provider_ref, provider, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key_id) DO UPDATE
         SET provider_ref = EXCLUDED.provider_ref,
             provider     = EXCLUDED.provider,
             updated_at   = EXCLUDED.updated_at`,
      [entry.keyId, entry.providerRef, entry.provider, entry.createdAt, new Date()]
    );
  }

  async get(keyId: string): Promise<KeyRegistryEntry | null> {
    await this.ensureTable();
    const pool = await this.getPool();
    const result = await pool.query(
      `SELECT * FROM ${this.table} WHERE key_id = $1`,
      [keyId]
    );
    return result.rows.length > 0 ? this.rowToEntry(result.rows[0]) : null;
  }

  async list(provider?: string): Promise<KeyRegistryEntry[]> {
    await this.ensureTable();
    const pool = await this.getPool();
    const result = provider
      ? await pool.query(`SELECT * FROM ${this.table} WHERE provider = $1`, [provider])
      : await pool.query(`SELECT * FROM ${this.table}`);
    return result.rows.map((r) => this.rowToEntry(r));
  }

  async delete(keyId: string): Promise<void> {
    await this.ensureTable();
    const pool = await this.getPool();
    await pool.query(`DELETE FROM ${this.table} WHERE key_id = $1`, [keyId]);
  }

  /** Release the underlying connection pool (call during graceful shutdown). */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
