/**
 * TONAIAgent - Secrets Loader
 *
 * Centralized secrets management supporting:
 * - AWS Secrets Manager (recommended for cloud deployments)
 * - HashiCorp Vault (for self-hosted deployments)
 * - Environment variables (local development fallback only)
 *
 * Features:
 * - In-memory caching with configurable TTL to reduce API calls
 * - Audit log for all secret reads (key names only, never values)
 * - Health check endpoint for readiness probes
 * - Secret rotation support via version IDs
 * - Secrets are never logged, stringified, or included in errors
 *
 * SECURITY: This module must NEVER log or expose secret values.
 * Only secret key names are safe to include in logs or errors.
 *
 * @example
 * ```typescript
 * // In production (AWS):
 * const loader = createSecretsLoader({
 *   backend: { provider: 'aws', region: 'us-east-1', secretId: 'tonaiagent/prod/secrets' },
 * });
 * await loader.load();
 * const key = await loader.get('KEY_ENCRYPTION_KEY');
 *
 * // In development:
 * const loader = createSecretsLoader({ backend: { provider: 'env' } });
 * await loader.load();
 * ```
 */

import type {
  AppSecrets,
  PartialAppSecrets,
  SecretAuditEvent,
  SecretsHealthStatus,
  SecretsLoaderOptions,
  SecretsBackendConfig,
  AWSSecretsManagerConfig,
  VaultConfig,
} from './secrets.types';

// Re-export types for consumers
export type {
  AppSecrets,
  PartialAppSecrets,
  SecretAuditEvent,
  SecretsHealthStatus,
  SecretsLoaderOptions,
  SecretsBackendConfig,
  AWSSecretsManagerConfig,
  VaultConfig,
} from './secrets.types';

// ============================================================================
// Audit Logger
// ============================================================================

type AuditCallback = (event: SecretAuditEvent) => void;

// ============================================================================
// Secrets Cache
// ============================================================================

interface CacheEntry {
  secrets: PartialAppSecrets;
  loadedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// Backend Loaders
// ============================================================================

/**
 * Load secrets from environment variables.
 * This is the development fallback — not suitable for production.
 */
function loadFromEnv(): PartialAppSecrets {
  return {
    KEY_ENCRYPTION_KEY: process.env['KEY_ENCRYPTION_KEY'],
    JWT_SECRET: process.env['JWT_SECRET'],
    GROQ_API_KEY: process.env['GROQ_API_KEY'],
    ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'],
    OPENAI_API_KEY: process.env['OPENAI_API_KEY'],
    GOOGLE_API_KEY: process.env['GOOGLE_API_KEY'] ?? process.env['GEMINI_API_KEY'],
    XAI_API_KEY: process.env['XAI_API_KEY'],
    OPENROUTER_API_KEY: process.env['OPENROUTER_API_KEY'],
    TELEGRAM_BOT_TOKEN: process.env['TELEGRAM_BOT_TOKEN'],
    TELEGRAM_WEBHOOK_SECRET: process.env['TELEGRAM_WEBHOOK_SECRET'],
    TONCENTER_API_KEY: process.env['TONCENTER_API_KEY'],
  };
}

/**
 * Load secrets from AWS Secrets Manager.
 *
 * Requires @aws-sdk/client-secrets-manager to be installed.
 * Uses IAM roles when running on AWS (recommended) or the configured profile for local dev.
 */
async function loadFromAWS(config: AWSSecretsManagerConfig): Promise<PartialAppSecrets> {
  // Dynamic import so that the AWS SDK is only required when using AWS backend
  let SecretsManagerClient: new (opts: Record<string, unknown>) => {
    send: (cmd: unknown) => Promise<{ SecretString?: string }>;
  };
  let GetSecretValueCommand: new (opts: Record<string, unknown>) => unknown;

  try {
    const mod: Record<string, unknown> = await import('@aws-sdk/client-secrets-manager' as string);
    SecretsManagerClient = mod['SecretsManagerClient'] as typeof SecretsManagerClient;
    GetSecretValueCommand = mod['GetSecretValueCommand'] as typeof GetSecretValueCommand;
  } catch {
    throw new Error(
      'AWS Secrets Manager backend requires @aws-sdk/client-secrets-manager. ' +
        'Install it with: npm install @aws-sdk/client-secrets-manager'
    );
  }

  const clientOptions: Record<string, unknown> = { region: config.region };
  if (config.profile) {
    // Use AWS named profile (for local dev with AWS CLI configured)
    try {
      const credsMod: Record<string, unknown> = await import('@aws-sdk/credential-providers' as string);
      const fromIni = credsMod['fromIni'] as ((opts: { profile: string }) => unknown) | undefined;
      if (fromIni) {
        clientOptions['credentials'] = fromIni({ profile: config.profile });
      }
    } catch {
      // If credential-providers is not installed, proceed without explicit profile;
      // the SDK will use default credential chain (env vars / instance profile / IAM role)
    }
  }

  const client = new SecretsManagerClient(clientOptions);

  const command = new GetSecretValueCommand({ SecretId: config.secretId });
  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error(
      `AWS Secrets Manager returned empty SecretString for secret: ${config.secretId}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.SecretString);
  } catch {
    throw new Error(
      `Failed to parse secret JSON from AWS Secrets Manager (secretId: ${config.secretId}). ` +
        'Ensure the secret is stored as a JSON object.'
    );
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(
      `AWS Secrets Manager secret must be a JSON object (secretId: ${config.secretId}).`
    );
  }

  return parsed as PartialAppSecrets;
}

/**
 * Load secrets from HashiCorp Vault.
 *
 * Requires node-vault to be installed.
 * Uses VAULT_TOKEN env var or the token provided in config.
 */
async function loadFromVault(config: VaultConfig): Promise<PartialAppSecrets> {
  let vault: (opts: Record<string, unknown>) => {
    read: (path: string) => Promise<{ data: Record<string, unknown> }>;
  };

  try {
    const mod: Record<string, unknown> = await import('node-vault' as string);
    vault = (mod['default'] ?? mod) as typeof vault;
  } catch {
    throw new Error(
      'HashiCorp Vault backend requires node-vault. ' +
        'Install it with: npm install node-vault'
    );
  }

  const token = config.token ?? process.env['VAULT_TOKEN'];
  if (!token) {
    throw new Error(
      'HashiCorp Vault backend requires a token. ' +
        'Set VAULT_TOKEN environment variable or provide token in VaultConfig.'
    );
  }

  const client = vault({
    apiVersion: 'v1',
    endpoint: config.endpoint,
    token,
  });

  const result = await client.read(config.secretPath);

  if (!result?.data || typeof result.data !== 'object') {
    throw new Error(
      `HashiCorp Vault returned empty or invalid data at path: ${config.secretPath}`
    );
  }

  return result.data as PartialAppSecrets;
}

// ============================================================================
// Secrets Loader
// ============================================================================

/**
 * SecretsLoader handles loading, caching, and accessing application secrets.
 *
 * It is designed to be instantiated once at application startup via
 * `createSecretsLoader()` and then passed through dependency injection.
 */
export class SecretsLoader {
  private cache: CacheEntry | null = null;
  private readonly cacheTtlMs: number;
  private readonly auditLog: boolean;
  private readonly strictMode: boolean;
  private readonly backend: SecretsBackendConfig;
  private readonly auditCallbacks: AuditCallback[] = [];
  private loadError: string | null = null;

  constructor(options: SecretsLoaderOptions) {
    this.backend = options.backend;
    this.cacheTtlMs = (options.cacheTtlSeconds ?? 300) * 1000;
    this.auditLog = options.auditLog ?? process.env['NODE_ENV'] === 'production';
    this.strictMode =
      options.strictMode ?? process.env['NODE_ENV'] === 'production';
  }

  /**
   * Load all secrets from the configured backend and populate the cache.
   * Call this once at application startup before any calls to `get()`.
   *
   * Throws if the backend is unreachable and strictMode is enabled.
   * In non-strict mode, falls back to empty secrets (individual `get()` calls
   * will return undefined for missing values).
   */
  async load(): Promise<void> {
    this.loadError = null;

    try {
      const secrets = await this.fetchFromBackend();
      const now = new Date();

      this.cache = {
        secrets,
        loadedAt: now,
        expiresAt: new Date(now.getTime() + this.cacheTtlMs),
      };

      const keyCount = Object.values(secrets).filter((v) => v !== undefined && v !== '').length;
      const auditRegistered = this.auditCallbacks.length > 0;
      console.info(
        `[SecretsLoader] secrets loaded via ${this.backend.provider}, ${keyCount} keys, audit callback registered: ${auditRegistered}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.loadError = message;

      if (this.strictMode) {
        throw new Error(`[SecretsLoader] Failed to load secrets: ${message}`);
      }

      // In non-strict (dev) mode: log warning and continue with empty cache
      console.warn(
        `[SecretsLoader] Warning: could not load secrets from backend (${this.backend.provider}): ${message}. ` +
          'Continuing with empty secrets — ensure .env is populated for local development.'
      );

      this.cache = {
        secrets: {},
        loadedAt: new Date(),
        expiresAt: new Date(Date.now() + this.cacheTtlMs),
      };
    }
  }

  /**
   * Get a single secret value by key.
   *
   * Automatically refreshes from the backend if the cache has expired.
   * Emits an audit event on every access.
   *
   * @param key - The secret key to retrieve
   * @param context - Optional caller context for audit logging
   * @returns The secret value, or undefined if not set
   */
  async get<K extends keyof AppSecrets>(
    key: K,
    context?: string
  ): Promise<AppSecrets[K] | undefined> {
    await this.ensureFresh();

    const value = this.cache?.secrets[key] as AppSecrets[K] | undefined;

    this.emitAudit({
      secretKey: key,
      fromCache: true,
      timestamp: new Date(),
      context,
    });

    return value;
  }

  /**
   * Get a secret value, throwing if it is missing or empty.
   *
   * Use this for required secrets where the absence should halt startup.
   *
   * @param key - The secret key to retrieve
   * @param context - Optional caller context for audit logging
   */
  async getRequired<K extends keyof AppSecrets>(
    key: K,
    context?: string
  ): Promise<AppSecrets[K]> {
    const value = await this.get(key, context);

    if (value === undefined || value === '') {
      throw new Error(
        `[SecretsLoader] Required secret '${key}' is not set. ` +
          `Backend: ${this.backend.provider}. ` +
          (this.backend.provider === 'env'
            ? `Set ${key} in your .env file.`
            : `Ensure the secret exists in your ${this.backend.provider} backend.`)
      );
    }

    return value;
  }

  /**
   * Get all loaded secrets as a snapshot.
   *
   * WARNING: Handle the returned object with care — it contains sensitive values.
   * Do not log, serialize to disk, or include in error messages.
   *
   * @internal — Used by the config loader to inject secrets into services.
   */
  async getAll(): Promise<PartialAppSecrets> {
    await this.ensureFresh();
    return { ...this.cache!.secrets };
  }

  /**
   * Force a refresh of the secrets cache from the backend.
   * Use this to pick up rotated secrets without restarting the process.
   */
  async refresh(): Promise<void> {
    this.cache = null;
    await this.load();
  }

  /**
   * Register an audit event callback.
   * Called on every secret access with the key name and metadata (never the value).
   */
  onAudit(callback: AuditCallback): () => void {
    this.auditCallbacks.push(callback);
    return () => {
      const idx = this.auditCallbacks.indexOf(callback);
      if (idx >= 0) this.auditCallbacks.splice(idx, 1);
    };
  }

  /**
   * Get the health status of the secrets backend.
   * Used in readiness probes.
   */
  getHealth(): SecretsHealthStatus {
    const provider = this.backend.provider;

    if (this.loadError) {
      return {
        healthy: false,
        provider,
        loaded: false,
        lastRefreshedAt: null,
        error: this.loadError,
      };
    }

    if (!this.cache) {
      return {
        healthy: false,
        provider,
        loaded: false,
        lastRefreshedAt: null,
        error: 'Secrets not yet loaded. Call loader.load() at startup.',
      };
    }

    return {
      healthy: true,
      provider,
      loaded: true,
      lastRefreshedAt: this.cache.loadedAt,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async ensureFresh(): Promise<void> {
    const now = Date.now();

    if (!this.cache || now >= this.cache.expiresAt.getTime()) {
      await this.load();
    }
  }

  private async fetchFromBackend(): Promise<PartialAppSecrets> {
    switch (this.backend.provider) {
      case 'env':
        return loadFromEnv();

      case 'aws':
        return loadFromAWS(this.backend);

      case 'vault':
        return loadFromVault(this.backend);

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = this.backend;
        throw new Error(
          `[SecretsLoader] Unknown secrets backend provider: ${(_exhaustive as { provider: string }).provider}`
        );
      }
    }
  }

  private emitAudit(event: SecretAuditEvent): void {
    if (!this.auditLog) return;

    for (const callback of this.auditCallbacks) {
      try {
        callback(event);
      } catch {
        // Audit callbacks must not crash the caller
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a SecretsLoader with the given options.
 *
 * The backend is auto-detected from environment variables if not specified:
 * - `SECRETS_BACKEND=aws` → AWS Secrets Manager (requires AWS_REGION, SECRETS_ID)
 * - `SECRETS_BACKEND=vault` → HashiCorp Vault (requires VAULT_ADDR, VAULT_SECRET_PATH)
 * - Default → environment variables (local development)
 *
 * @example
 * ```typescript
 * // Auto-detect backend from environment
 * const loader = createSecretsLoader();
 * await loader.load();
 *
 * // Explicit AWS configuration
 * const loader = createSecretsLoader({
 *   backend: {
 *     provider: 'aws',
 *     region: 'us-east-1',
 *     secretId: 'tonaiagent/prod/secrets',
 *   },
 * });
 * await loader.load();
 * ```
 */
export function createSecretsLoader(options?: Partial<SecretsLoaderOptions>): SecretsLoader {
  const backend = options?.backend ?? detectBackendFromEnv();

  return new SecretsLoader({
    backend,
    cacheTtlSeconds: options?.cacheTtlSeconds,
    auditLog: options?.auditLog,
    strictMode: options?.strictMode,
  });
}

/**
 * Auto-detect the secrets backend from environment variables.
 *
 * Checks SECRETS_BACKEND env var:
 *   - 'aws'   → AWS Secrets Manager (requires AWS_REGION + SECRETS_ID)
 *   - 'vault' → HashiCorp Vault (requires VAULT_ADDR + VAULT_SECRET_PATH)
 *   - (none)  → Environment variable fallback (development default)
 */
function detectBackendFromEnv(): SecretsBackendConfig {
  const backendType = process.env['SECRETS_BACKEND'];

  if (backendType === 'aws') {
    const region = process.env['AWS_REGION'];
    const secretId = process.env['SECRETS_ID'] ?? `tonaiagent/${process.env['NODE_ENV'] ?? 'development'}/secrets`;

    if (!region) {
      throw new Error(
        '[SecretsLoader] SECRETS_BACKEND=aws requires AWS_REGION to be set.'
      );
    }

    return {
      provider: 'aws',
      region,
      secretId,
      profile: process.env['AWS_PROFILE'],
    };
  }

  if (backendType === 'vault') {
    const endpoint = process.env['VAULT_ADDR'];
    const secretPath = process.env['VAULT_SECRET_PATH'] ?? 'secret/tonaiagent';

    if (!endpoint) {
      throw new Error(
        '[SecretsLoader] SECRETS_BACKEND=vault requires VAULT_ADDR to be set.'
      );
    }

    return {
      provider: 'vault',
      endpoint,
      secretPath,
      token: process.env['VAULT_TOKEN'],
    };
  }

  // Default: environment variable fallback (local dev)
  return { provider: 'env' };
}

// ============================================================================
// Singleton Instance (Application-Level)
// ============================================================================

/**
 * Application-level singleton SecretsLoader instance.
 *
 * Initialize this once at startup with `initSecrets()` before accessing
 * secrets anywhere in the application.
 *
 * @example
 * ```typescript
 * // At application startup (e.g. main.ts):
 * await initSecrets();
 *
 * // Anywhere in the application:
 * const key = await secrets.get('KEY_ENCRYPTION_KEY');
 * ```
 */
export let secrets: SecretsLoader;

/**
 * Initialize the application-level secrets singleton.
 *
 * Call this once at startup before using `secrets.get()` anywhere.
 * Throws if required secrets are unavailable in strict (production) mode.
 */
export async function initSecrets(options?: Partial<SecretsLoaderOptions>): Promise<SecretsLoader> {
  secrets = createSecretsLoader(options);
  await secrets.load();
  return secrets;
}
