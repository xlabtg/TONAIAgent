/**
 * TONAIAgent - Configuration Entry Point
 *
 * Central configuration module. Integrates secrets from the secrets manager
 * with non-secret application configuration.
 *
 * Usage at application startup:
 * ```typescript
 * import { initConfig, appConfig } from './config';
 *
 * // Initialize once at startup
 * await initConfig();
 *
 * // Access non-secret config anywhere (synchronous)
 * const port = appConfig.port;
 *
 * // Access secrets anywhere (async, with audit trail)
 * const key = await appConfig.secrets.getRequired('KEY_ENCRYPTION_KEY');
 * ```
 */

export { SecretsLoader, createSecretsLoader, initSecrets, secrets } from './secrets';
export type {
  AppSecrets,
  PartialAppSecrets,
  SecretAuditEvent,
  SecretsHealthStatus,
  SecretsLoaderOptions,
  SecretsBackendConfig,
  AWSSecretsManagerConfig,
  VaultConfig,
  EnvSecretsConfig,
} from './secrets.types';

import { createSecretsLoader, SecretsLoader } from './secrets';
import type { SecretsLoaderOptions } from './secrets.types';

// ============================================================================
// Non-Secret Application Configuration
// ============================================================================

/**
 * Non-sensitive application configuration loaded directly from environment vars.
 * These values are NOT secrets and do not belong in the secrets manager.
 */
export interface AppConfig {
  /** Node environment (development | production | test) */
  nodeEnv: 'development' | 'production' | 'test';
  /** HTTP server port */
  port: number;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** TON network (mainnet | testnet) */
  tonNetwork: 'mainnet' | 'testnet';
  /** Custom TON RPC endpoint (optional) */
  tonRpcEndpoint: string | undefined;
  /** Telegram Mini App URL */
  telegramMiniAppUrl: string | undefined;
  /** Database URL (optional, required in production) */
  databaseUrl: string | undefined;
  /** Redis URL (optional, required in production) */
  redisUrl: string | undefined;
  /** Sentry DSN for error tracking */
  sentryDsn: string | undefined;
  /** MPC threshold (number of shares required to sign) */
  mpcThreshold: number;
  /** MPC total parties */
  mpcTotalParties: number;
  /** Enable extended (post-MVP) modules */
  enableExtended: boolean;
  /** Loaded secrets manager — use this to access sensitive values */
  secrets: SecretsLoader;
}

// ============================================================================
// Config Singleton
// ============================================================================

/**
 * Application configuration singleton.
 * Set by `initConfig()` — access after initialization only.
 */
export let appConfig: AppConfig;

/**
 * Initialize the application configuration.
 *
 * Loads non-secret config from environment variables and initializes
 * the secrets loader from the configured backend (AWS, Vault, or env fallback).
 *
 * Must be called once at application startup before accessing `appConfig`.
 *
 * @example
 * ```typescript
 * // main.ts
 * import { initConfig, appConfig } from './config';
 *
 * await initConfig();
 * console.log(`Starting on port ${appConfig.port}`);
 * const encKey = await appConfig.secrets.getRequired('KEY_ENCRYPTION_KEY');
 * ```
 */
export async function initConfig(
  secretsOptions?: Partial<SecretsLoaderOptions>
): Promise<AppConfig> {
  const secretsLoader = createSecretsLoader(secretsOptions);
  await secretsLoader.load();

  appConfig = buildAppConfig(secretsLoader);
  return appConfig;
}

/**
 * Build an AppConfig from the current environment and a loaded SecretsLoader.
 * Exported for testing purposes.
 */
export function buildAppConfig(secretsLoader: SecretsLoader): AppConfig {
  const nodeEnv = (process.env['NODE_ENV'] ?? 'development') as AppConfig['nodeEnv'];
  const logLevel = (process.env['LOG_LEVEL'] ?? 'info') as AppConfig['logLevel'];

  return {
    nodeEnv,
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    logLevel,
    tonNetwork: (process.env['TON_NETWORK'] ?? 'testnet') as AppConfig['tonNetwork'],
    tonRpcEndpoint: process.env['TON_RPC_ENDPOINT'] || undefined,
    telegramMiniAppUrl: process.env['TELEGRAM_MINI_APP_URL'] || undefined,
    databaseUrl: process.env['DATABASE_URL'] || undefined,
    redisUrl: process.env['REDIS_URL'] || undefined,
    sentryDsn: process.env['SENTRY_DSN'] || undefined,
    mpcThreshold: parseInt(process.env['MPC_THRESHOLD'] ?? '2', 10),
    mpcTotalParties: parseInt(process.env['MPC_TOTAL_PARTIES'] ?? '3', 10),
    enableExtended: process.env['ENABLE_EXTENDED'] === 'true',
    secrets: secretsLoader,
  };
}
