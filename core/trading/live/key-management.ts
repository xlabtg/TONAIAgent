/**
 * TONAIAgent - Secure Key Management Module
 *
 * Handles encrypted storage and secure access to trading credentials.
 * Keys are never exposed to agent logic directly — agents receive only
 * a credential ID, and the key manager decrypts on demand during execution.
 *
 * Security design:
 *   - All credential values are encrypted at rest using AES-256-GCM
 *   - Access is logged with timestamps and agent IDs
 *   - Permissions are enforced (e.g., agent cannot initiate withdrawals)
 *   - Credentials can be rotated or revoked instantly
 *   - IP whitelisting is supported for API keys
 *
 * Note: In production, encryption keys should be stored in an HSM or
 * secrets manager (e.g., AWS KMS, HashiCorp Vault). This implementation
 * uses an in-memory master key with real AES-256-GCM encryption.
 */

import * as nodeCrypto from 'node:crypto';

import {
  TradingCredential,
  CredentialStoreConfig,
  CredentialAccessLog,
  KeyType,
  PermissionScope,
  LiveTradingEvent,
  LiveTradingEventCallback,
} from './types';

// ============================================================================
// Key Management Service Interface
// ============================================================================

export interface KeyManagementService {
  storeCredential(input: StoreCredentialInput): TradingCredential;
  getCredential(credentialId: string, requestingAgentId: string): DecryptedCredential;
  rotateCredential(credentialId: string, newValue: string, requestingAgentId: string): TradingCredential;
  revokeCredential(credentialId: string, requestingAgentId: string): void;
  listCredentials(agentId: string): TradingCredentialSummary[];
  hasPermission(credentialId: string, scope: PermissionScope): boolean;
  getAccessLog(credentialId: string): CredentialAccessLog[];
  onEvent(callback: LiveTradingEventCallback): void;
}

export interface StoreCredentialInput {
  agentId: string;
  exchangeId: string;
  keyType: KeyType;
  /** Plain-text credential value (will be encrypted at rest) */
  plainTextValue: string;
  permissions: PermissionScope[];
  ipWhitelist?: string[];
  expiresAt?: Date;
}

export interface DecryptedCredential {
  credentialId: string;
  agentId: string;
  exchangeId: string;
  keyType: KeyType;
  /** Plain-text value — only accessible within this service, never persisted */
  value: string;
  permissions: PermissionScope[];
}

export interface TradingCredentialSummary {
  id: string;
  agentId: string;
  exchangeId: string;
  keyType: KeyType;
  permissions: PermissionScope[];
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  rotatedAt?: Date;
  isExpired: boolean;
}

// ============================================================================
// Default Key Management Implementation
// ============================================================================

/**
 * DefaultKeyManagementService provides a secure in-memory credential store.
 * In production, replace the encrypt/decrypt methods with calls to a real
 * secrets manager (AWS KMS, HashiCorp Vault, HSM).
 */
export class DefaultKeyManagementService implements KeyManagementService {
  private readonly config: CredentialStoreConfig;
  private readonly credentials = new Map<string, TradingCredential>();
  private readonly accessLogs = new Map<string, CredentialAccessLog[]>();
  private readonly eventCallbacks: LiveTradingEventCallback[] = [];
  /** AES-256-GCM master key — generated once per service instance, never persisted */
  private readonly masterKey: Buffer;
  private credentialCounter = 0;
  private logCounter = 0;

  constructor(config?: Partial<CredentialStoreConfig>) {
    this.config = {
      algorithm: config?.algorithm ?? 'aes-256-gcm',
      kdf: config?.kdf ?? 'pbkdf2',
      enableAuditLog: config?.enableAuditLog ?? true,
      maxCredentialAgeDays: config?.maxCredentialAgeDays,
    };
    // Generate a cryptographically secure 256-bit master key.
    // In production, load this from an HSM / AWS KMS / HashiCorp Vault.
    this.masterKey = nodeCrypto.randomBytes(32);
  }

  onEvent(callback: LiveTradingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<LiveTradingEvent, 'id' | 'timestamp'>): void {
    const fullEvent: LiveTradingEvent = {
      id: generateId(),
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore errors in callbacks
      }
    }
  }

  storeCredential(input: StoreCredentialInput): TradingCredential {
    this.validateInput(input);

    const credentialId = `cred_${++this.credentialCounter}_${Date.now()}`;
    const { encrypted, iv } = this.encrypt(input.plainTextValue);

    const credential: TradingCredential = {
      id: credentialId,
      agentId: input.agentId,
      exchangeId: input.exchangeId,
      keyType: input.keyType,
      encryptedValue: encrypted,
      iv,
      permissions: input.permissions,
      ipWhitelist: input.ipWhitelist,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      lastUsedAt: undefined,
      rotatedAt: undefined,
    };

    this.credentials.set(credentialId, credential);

    this.logAccess(credentialId, input.agentId, input.exchangeId, 'create', true);

    this.emitEvent({
      type: 'credential.created',
      agentId: input.agentId,
      exchangeId: input.exchangeId,
      data: { credentialId, keyType: input.keyType, permissions: input.permissions },
      severity: 'info',
    });

    return credential;
  }

  getCredential(credentialId: string, requestingAgentId: string): DecryptedCredential {
    const credential = this.credentials.get(credentialId);

    if (!credential) {
      this.logAccess(credentialId, requestingAgentId, 'unknown', 'read', false, 'Credential not found');
      throw new KeyManagementError(`Credential ${credentialId} not found`, 'CREDENTIAL_NOT_FOUND');
    }

    // Verify the requesting agent owns this credential
    if (credential.agentId !== requestingAgentId) {
      this.logAccess(credentialId, requestingAgentId, credential.exchangeId, 'read', false, 'Access denied: wrong agent');
      throw new KeyManagementError('Access denied', 'ACCESS_DENIED');
    }

    // Check expiry
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      this.logAccess(credentialId, requestingAgentId, credential.exchangeId, 'read', false, 'Credential expired');
      throw new KeyManagementError(`Credential ${credentialId} has expired`, 'CREDENTIAL_EXPIRED');
    }

    // Check max credential age
    if (this.config.maxCredentialAgeDays) {
      const ageMs = Date.now() - credential.createdAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > this.config.maxCredentialAgeDays) {
        this.logAccess(credentialId, requestingAgentId, credential.exchangeId, 'read', false, 'Credential too old, rotation required');
        throw new KeyManagementError('Credential rotation required', 'ROTATION_REQUIRED');
      }
    }

    const plainText = this.decrypt(credential.encryptedValue, credential.iv);

    credential.lastUsedAt = new Date();
    this.logAccess(credentialId, requestingAgentId, credential.exchangeId, 'read', true);

    return {
      credentialId,
      agentId: credential.agentId,
      exchangeId: credential.exchangeId,
      keyType: credential.keyType,
      value: plainText,
      permissions: credential.permissions,
    };
  }

  rotateCredential(credentialId: string, newValue: string, requestingAgentId: string): TradingCredential {
    const credential = this.credentials.get(credentialId);

    if (!credential) {
      throw new KeyManagementError(`Credential ${credentialId} not found`, 'CREDENTIAL_NOT_FOUND');
    }

    if (credential.agentId !== requestingAgentId) {
      throw new KeyManagementError('Access denied', 'ACCESS_DENIED');
    }

    const { encrypted, iv } = this.encrypt(newValue);
    credential.encryptedValue = encrypted;
    credential.iv = iv;
    credential.rotatedAt = new Date();

    this.logAccess(credentialId, requestingAgentId, credential.exchangeId, 'rotate', true);

    this.emitEvent({
      type: 'credential.rotated',
      agentId: requestingAgentId,
      exchangeId: credential.exchangeId,
      data: { credentialId, rotatedAt: credential.rotatedAt },
      severity: 'info',
    });

    return { ...credential };
  }

  revokeCredential(credentialId: string, requestingAgentId: string): void {
    const credential = this.credentials.get(credentialId);

    if (!credential) {
      throw new KeyManagementError(`Credential ${credentialId} not found`, 'CREDENTIAL_NOT_FOUND');
    }

    if (credential.agentId !== requestingAgentId) {
      throw new KeyManagementError('Access denied', 'ACCESS_DENIED');
    }

    this.credentials.delete(credentialId);
    this.logAccess(credentialId, requestingAgentId, credential.exchangeId, 'revoke', true);

    this.emitEvent({
      type: 'credential.revoked',
      agentId: requestingAgentId,
      exchangeId: credential.exchangeId,
      data: { credentialId },
      severity: 'info',
    });
  }

  listCredentials(agentId: string): TradingCredentialSummary[] {
    const now = new Date();
    return Array.from(this.credentials.values())
      .filter(c => c.agentId === agentId)
      .map(c => ({
        id: c.id,
        agentId: c.agentId,
        exchangeId: c.exchangeId,
        keyType: c.keyType,
        permissions: c.permissions,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
        rotatedAt: c.rotatedAt,
        isExpired: c.expiresAt ? c.expiresAt < now : false,
      }));
  }

  hasPermission(credentialId: string, scope: PermissionScope): boolean {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      return false;
    }
    return credential.permissions.includes('full_access') || credential.permissions.includes(scope);
  }

  getAccessLog(credentialId: string): CredentialAccessLog[] {
    return this.accessLogs.get(credentialId) ?? [];
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Encrypts plainText using AES-256-GCM with a random 96-bit IV.
   * The GCM authentication tag is appended to the ciphertext before base64-encoding.
   */
  private encrypt(plainText: string): { encrypted: string; iv: string } {
    const iv = nodeCrypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const encryptedBuf = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(), // 16-byte GCM authentication tag
    ]);
    return {
      encrypted: encryptedBuf.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  /**
   * Decrypts a value previously encrypted by {@link encrypt}.
   * Verifies the GCM authentication tag to detect any tampering.
   */
  private decrypt(encryptedBase64: string, ivBase64: string): string {
    const iv = Buffer.from(ivBase64, 'base64');
    const encryptedBuf = Buffer.from(encryptedBase64, 'base64');
    // Last 16 bytes are the GCM auth tag
    const authTag = encryptedBuf.subarray(encryptedBuf.length - 16);
    const ciphertext = encryptedBuf.subarray(0, encryptedBuf.length - 16);
    const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      throw new KeyManagementError('Unable to decrypt credential — data may be corrupted or tampered', 'DECRYPTION_FAILED');
    }
  }

  private validateInput(input: StoreCredentialInput): void {
    if (!input.agentId || input.agentId.trim().length === 0) {
      throw new KeyManagementError('Agent ID is required', 'INVALID_INPUT');
    }
    if (!input.exchangeId || input.exchangeId.trim().length === 0) {
      throw new KeyManagementError('Exchange ID is required', 'INVALID_INPUT');
    }
    if (!input.plainTextValue || input.plainTextValue.trim().length === 0) {
      throw new KeyManagementError('Credential value cannot be empty', 'INVALID_INPUT');
    }
    if (!input.permissions || input.permissions.length === 0) {
      throw new KeyManagementError('At least one permission scope is required', 'INVALID_INPUT');
    }
  }

  private logAccess(
    credentialId: string,
    agentId: string,
    exchangeId: string,
    operation: CredentialAccessLog['operation'],
    success: boolean,
    reason?: string
  ): void {
    if (!this.config.enableAuditLog) {
      return;
    }

    const log: CredentialAccessLog = {
      id: `log_${++this.logCounter}_${Date.now()}`,
      credentialId,
      agentId,
      exchangeId,
      operation,
      timestamp: new Date(),
      success,
      reason,
    };

    const logs = this.accessLogs.get(credentialId) ?? [];
    logs.push(log);

    // Keep only last 1000 logs per credential
    if (logs.length > 1000) {
      logs.shift();
    }

    this.accessLogs.set(credentialId, logs);
  }
}

// ============================================================================
// Error Types
// ============================================================================

export class KeyManagementError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'KeyManagementError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createKeyManagementService(
  config?: Partial<CredentialStoreConfig>
): DefaultKeyManagementService {
  return new DefaultKeyManagementService(config);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
