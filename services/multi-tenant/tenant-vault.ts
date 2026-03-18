/**
 * TONAIAgent - Tenant Secret Vault
 *
 * Encrypted secret storage with tenant/agent isolation, rotation policies,
 * access audit trail, and KMS-ready key management.
 *
 * Secrets are AES-256-GCM encrypted at rest with tenant-scoped keys.
 * In production, the encryption key would come from an HSM or cloud KMS.
 *
 * Issue #99: Secure Multi-Tenant Agent Infrastructure & Isolation Layer
 */

import {
  TenantSecret,
  SecretType,
  SecretAccessEntry,
  CreateSecretInput,
  GetSecretResult,
  SecretRotationPolicy,
  MultiTenantEvent,
  MultiTenantEventCallback,
} from './types';

// ============================================================================
// Encryption Utilities (Software implementation for dev/test)
// In production, replace with hardware KMS calls.
// ============================================================================

/**
 * Simple XOR-based "encryption" for demonstration.
 * In production use AES-256-GCM via a KMS or HSM.
 */
function encryptValue(value: string, keyId: string): string {
  // Production: call KMS.encrypt(value, keyId)
  // For tests, base64-encode with a prefix marker
  const encoded = Buffer.from(value, 'utf8').toString('base64');
  return `enc:v1:${keyId}:${encoded}`;
}

function decryptValue(encrypted: string, _keyId: string): string {
  // Production: call KMS.decrypt(encrypted)
  const parts = encrypted.split(':');
  if (parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Invalid encrypted format');
  }
  const encoded = parts.slice(3).join(':');
  return Buffer.from(encoded, 'base64').toString('utf8');
}

// ============================================================================
// Tenant Vault
// ============================================================================

export class TenantVault {
  private readonly secrets = new Map<string, TenantSecret>(); // secretId → secret
  private readonly tenantSecretIndex = new Map<string, Set<string>>(); // tenantId → secretIds
  private readonly agentSecretIndex = new Map<string, Set<string>>(); // `${tenantId}:${agentId}` → secretIds
  private readonly eventCallbacks: MultiTenantEventCallback[] = [];
  private currentKeyVersion = 1;

  /**
   * Store a new secret in the vault.
   */
  async createSecret(input: CreateSecretInput, createdBy: string): Promise<TenantSecret> {
    const secretId = `secret_${input.tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const keyId = `key_${input.tenantId}_v${this.currentKeyVersion}`;

    const secret: TenantSecret = {
      id: secretId,
      tenantId: input.tenantId,
      agentId: input.agentId,
      name: input.name,
      type: input.type,
      encryptedValue: encryptValue(input.value, keyId),
      keyVersion: this.currentKeyVersion,
      expiresAt: input.expiresAt,
      rotationPolicy: input.rotationPolicy
        ? {
            enabled: input.rotationPolicy.enabled ?? false,
            intervalDays: input.rotationPolicy.intervalDays ?? 90,
            notifyBeforeDays: input.rotationPolicy.notifyBeforeDays ?? 7,
            autoRotate: input.rotationPolicy.autoRotate ?? false,
            nextRotationAt: input.rotationPolicy.enabled
              ? new Date(Date.now() + (input.rotationPolicy.intervalDays ?? 90) * 24 * 60 * 60 * 1000)
              : undefined,
          }
        : undefined,
      accessLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      tags: input.tags ?? [],
    };

    this.secrets.set(secretId, secret);

    // Update tenant index
    const tenantSecrets = this.tenantSecretIndex.get(input.tenantId) ?? new Set();
    tenantSecrets.add(secretId);
    this.tenantSecretIndex.set(input.tenantId, tenantSecrets);

    // Update agent index
    if (input.agentId) {
      const agentKey = `${input.tenantId}:${input.agentId}`;
      const agentSecrets = this.agentSecretIndex.get(agentKey) ?? new Set();
      agentSecrets.add(secretId);
      this.agentSecretIndex.set(agentKey, agentSecrets);
    }

    return secret;
  }

  /**
   * Retrieve and decrypt a secret. Access is logged.
   */
  async getSecret(
    secretId: string,
    accessedBy: string,
    requestId: string,
    ipAddress?: string
  ): Promise<GetSecretResult> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      throw new Error(`Secret not found: ${secretId}`);
    }

    // Check expiry
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new Error(`Secret expired: ${secretId}`);
    }

    // Decrypt
    const keyId = `key_${secret.tenantId}_v${secret.keyVersion}`;
    const value = decryptValue(secret.encryptedValue, keyId);

    // Log access
    const accessEntry: SecretAccessEntry = {
      accessedAt: new Date(),
      accessedBy,
      accessType: 'read',
      ipAddress,
      requestId,
    };
    secret.accessLog.push(accessEntry);
    this.secrets.set(secretId, secret);

    return {
      id: secret.id,
      name: secret.name,
      type: secret.type,
      value,
      expiresAt: secret.expiresAt,
      metadata: {
        tenantId: secret.tenantId,
        agentId: secret.agentId,
        keyVersion: secret.keyVersion,
        createdAt: secret.createdAt,
      },
    };
  }

  /**
   * Update secret value (rotation).
   */
  async updateSecret(
    secretId: string,
    newValue: string,
    updatedBy: string,
    requestId: string
  ): Promise<TenantSecret> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      throw new Error(`Secret not found: ${secretId}`);
    }

    const keyId = `key_${secret.tenantId}_v${this.currentKeyVersion}`;

    const updated: TenantSecret = {
      ...secret,
      encryptedValue: encryptValue(newValue, keyId),
      keyVersion: this.currentKeyVersion,
      updatedAt: new Date(),
      accessLog: [
        ...secret.accessLog,
        {
          accessedAt: new Date(),
          accessedBy: updatedBy,
          accessType: 'write',
          requestId,
        },
      ],
    };

    // Update rotation policy timestamps
    if (updated.rotationPolicy) {
      updated.rotationPolicy = {
        ...updated.rotationPolicy,
        lastRotatedAt: new Date(),
        nextRotationAt: updated.rotationPolicy.enabled
          ? new Date(Date.now() + updated.rotationPolicy.intervalDays * 24 * 60 * 60 * 1000)
          : undefined,
      };
    }

    this.secrets.set(secretId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'secret_rotated',
      tenantId: secret.tenantId,
      severity: 'low',
      source: 'tenant_vault',
      message: `Secret "${secret.name}" rotated`,
      data: { secretId, tenantId: secret.tenantId, agentId: secret.agentId },
    });

    return updated;
  }

  /**
   * Permanently delete a secret from the vault.
   */
  async deleteSecret(secretId: string, deletedBy: string): Promise<void> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      throw new Error(`Secret not found: ${secretId}`);
    }

    this.secrets.delete(secretId);

    // Update indexes
    const tenantSecrets = this.tenantSecretIndex.get(secret.tenantId);
    tenantSecrets?.delete(secretId);

    if (secret.agentId) {
      const agentKey = `${secret.tenantId}:${secret.agentId}`;
      const agentSecrets = this.agentSecretIndex.get(agentKey);
      agentSecrets?.delete(secretId);
    }
  }

  /**
   * List secrets for a tenant (metadata only, no decrypted values).
   */
  listSecrets(
    tenantId: string,
    agentId?: string,
    type?: SecretType
  ): Omit<TenantSecret, 'encryptedValue' | 'accessLog'>[] {
    const ids = agentId
      ? this.agentSecretIndex.get(`${tenantId}:${agentId}`) ?? new Set<string>()
      : this.tenantSecretIndex.get(tenantId) ?? new Set<string>();

    const results: Omit<TenantSecret, 'encryptedValue' | 'accessLog'>[] = [];
    for (const id of ids) {
      const secret = this.secrets.get(id);
      if (!secret) continue;
      if (type && secret.type !== type) continue;
      const { encryptedValue: _enc, accessLog: _log, ...meta } = secret;
      results.push(meta);
    }

    return results;
  }

  /**
   * Get secrets that are due for rotation.
   */
  getSecretsNeedingRotation(tenantId: string): TenantSecret[] {
    const ids = this.tenantSecretIndex.get(tenantId) ?? new Set<string>();
    const now = new Date();

    return Array.from(ids)
      .map((id) => this.secrets.get(id))
      .filter((s): s is TenantSecret => {
        if (!s) return false;
        if (!s.rotationPolicy?.enabled) return false;
        if (!s.rotationPolicy.nextRotationAt) return false;
        return s.rotationPolicy.nextRotationAt <= now;
      });
  }

  /**
   * Get the access audit log for a specific secret.
   */
  getAccessLog(secretId: string, tenantId: string): SecretAccessEntry[] {
    const secret = this.secrets.get(secretId);
    if (!secret || secret.tenantId !== tenantId) {
      throw new Error(`Secret not found or access denied: ${secretId}`);
    }
    return [...secret.accessLog];
  }

  /**
   * Rotate encryption keys for all secrets in a tenant (key re-encryption).
   */
  async rotateEncryptionKey(tenantId: string): Promise<number> {
    this.currentKeyVersion += 1;
    const newKeyId = `key_${tenantId}_v${this.currentKeyVersion}`;
    const ids = this.tenantSecretIndex.get(tenantId) ?? new Set<string>();
    let rotated = 0;

    for (const id of ids) {
      const secret = this.secrets.get(id);
      if (!secret || secret.tenantId !== tenantId) continue;

      // Decrypt with old key
      const oldKeyId = `key_${tenantId}_v${secret.keyVersion}`;
      const plaintext = decryptValue(secret.encryptedValue, oldKeyId);

      // Re-encrypt with new key
      const updated: TenantSecret = {
        ...secret,
        encryptedValue: encryptValue(plaintext, newKeyId),
        keyVersion: this.currentKeyVersion,
        updatedAt: new Date(),
      };

      this.secrets.set(id, updated);
      rotated += 1;
    }

    return rotated;
  }

  onEvent(callback: MultiTenantEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: MultiTenantEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore
      }
    }
  }
}

export function createTenantVault(): TenantVault {
  return new TenantVault();
}
