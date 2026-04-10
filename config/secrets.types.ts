/**
 * TONAIAgent - Secrets Management Types
 *
 * Defines the AppSecrets interface and related types for centralized
 * secrets management supporting AWS Secrets Manager and HashiCorp Vault.
 *
 * In production, secrets are loaded from a secrets manager at startup.
 * In development/testing, secrets fall back to environment variables.
 */

// ============================================================================
// Core Secrets Interface
// ============================================================================

/**
 * All application secrets with their expected types.
 *
 * Mirrors the keys in .env.example — only security-sensitive values
 * belong here. Non-secret configuration (NODE_ENV, PORT, etc.) should
 * remain in environment variables or application config.
 */
export interface AppSecrets {
  // Security
  /** AES encryption key for all stored user keys (32+ chars) */
  KEY_ENCRYPTION_KEY: string;
  /** JWT signing secret for API authentication (32+ chars) */
  JWT_SECRET: string;

  // AI Providers
  /** Groq AI API key (primary provider) */
  GROQ_API_KEY: string;
  /** Anthropic Claude API key (fallback) */
  ANTHROPIC_API_KEY: string;
  /** OpenAI API key (fallback) */
  OPENAI_API_KEY: string;
  /** Google Gemini API key (fallback) */
  GOOGLE_API_KEY: string;
  /** xAI API key (fallback) */
  XAI_API_KEY: string;
  /** OpenRouter API key (multi-provider routing) */
  OPENROUTER_API_KEY: string;

  // Telegram
  /** Telegram Bot token from @BotFather */
  TELEGRAM_BOT_TOKEN: string;
  /** Webhook secret for Telegram signature verification */
  TELEGRAM_WEBHOOK_SECRET: string;

  // Blockchain
  /** TON Center API key for higher rate limits */
  TONCENTER_API_KEY: string;
}

// ============================================================================
// Partial Secrets (for loading scenarios where not all keys are required)
// ============================================================================

/**
 * Partial application secrets — used when only a subset of secrets is needed.
 * All fields are optional to support incremental loading.
 */
export type PartialAppSecrets = Partial<AppSecrets>;

// ============================================================================
// Secret Rotation Metadata
// ============================================================================

/**
 * Metadata about a secret including rotation schedule and access info.
 */
export interface SecretMetadata {
  /** The secret identifier in the secrets manager */
  secretId: string;
  /** When this secret version was created */
  createdAt: Date;
  /** When this secret was last rotated */
  lastRotatedAt: Date | null;
  /** The version identifier (for multi-version support) */
  versionId: string | null;
  /** Whether this secret has a pending rotation */
  rotationPending: boolean;
}

// ============================================================================
// Secrets Manager Configuration
// ============================================================================

/**
 * Configuration for the AWS Secrets Manager backend.
 */
export interface AWSSecretsManagerConfig {
  provider: 'aws';
  /** AWS region (e.g. 'us-east-1') */
  region: string;
  /** Secret ID or ARN in AWS Secrets Manager */
  secretId: string;
  /** Optional: AWS profile to use (for local dev with AWS CLI) */
  profile?: string;
}

/**
 * Configuration for the HashiCorp Vault backend.
 */
export interface VaultConfig {
  provider: 'vault';
  /** Vault server address (e.g. 'https://vault.example.com:8200') */
  endpoint: string;
  /** Vault path where the secrets are stored */
  secretPath: string;
  /** Vault token (or use VAULT_TOKEN env var) */
  token?: string;
}

/**
 * Configuration for the environment variable fallback backend.
 * This is the default for local development.
 */
export interface EnvSecretsConfig {
  provider: 'env';
}

/**
 * Union of all supported secrets backend configurations.
 */
export type SecretsBackendConfig = AWSSecretsManagerConfig | VaultConfig | EnvSecretsConfig;

// ============================================================================
// Secrets Loader Options
// ============================================================================

/**
 * Options for the secrets loader.
 */
export interface SecretsLoaderOptions {
  /** Backend configuration */
  backend: SecretsBackendConfig;
  /** Cache TTL in seconds (default: 300 = 5 minutes) */
  cacheTtlSeconds?: number;
  /** Whether to enable audit logging of secret reads (default: true in prod) */
  auditLog?: boolean;
  /**
   * Whether to throw on missing required secrets.
   * Default: true in production, false in development.
   */
  strictMode?: boolean;
}

// ============================================================================
// Secrets Audit Event
// ============================================================================

/**
 * Emitted each time a secret is read from the cache or backend.
 */
export interface SecretAuditEvent {
  /** Which secret was accessed (key name only, never the value) */
  secretKey: keyof AppSecrets;
  /** Whether the value came from the cache */
  fromCache: boolean;
  /** When the access occurred */
  timestamp: Date;
  /** Caller context (module name, request ID, etc.) */
  context?: string;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Health status of the secrets manager connection.
 */
export interface SecretsHealthStatus {
  /** Whether the secrets backend is reachable */
  healthy: boolean;
  /** The configured backend provider */
  provider: 'aws' | 'vault' | 'env';
  /** Whether secrets are loaded and cached */
  loaded: boolean;
  /** When the secrets were last refreshed */
  lastRefreshedAt: Date | null;
  /** Optional error message if unhealthy */
  error?: string;
}
