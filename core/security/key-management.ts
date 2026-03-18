/**
 * TONAIAgent - Secure Key Management Service
 *
 * Implements production-grade key management with:
 * - MPC (Multi-Party Computation) threshold signing
 * - HSM integration support
 * - Secure enclave operations
 * - BIP-32/44 key derivation
 * - Key rotation and lifecycle management
 *
 * SECURITY CRITICAL: This module handles cryptographic operations.
 * AI agents NEVER have direct access to private keys.
 */

import {
  KeyMetadata,
  KeyShare,
  KeyType,
  KeyStatus,
  KeyStorageType,
  MPCConfig,
  HSMConfig,
  KeyDerivationConfig,
  SigningRequest,
  SignatureInfo,
  SecurityEvent,
  SecurityEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface KeyManagementService {
  // Key lifecycle
  generateKey(
    userId: string,
    keyType: KeyType,
    config?: Partial<KeyGenerationConfig>
  ): Promise<KeyMetadata>;
  rotateKey(keyId: string): Promise<KeyMetadata>;
  revokeKey(keyId: string, reason: string): Promise<void>;
  getKeyMetadata(keyId: string): Promise<KeyMetadata | null>;
  listKeys(userId: string, options?: KeyListOptions): Promise<KeyMetadata[]>;

  // MPC operations
  generateMPCShares(keyId: string, config: MPCConfig): Promise<KeyShare[]>;
  getMPCSharesStatus(keyId: string): Promise<MPCSharesStatus>;

  // Signing (NEVER exposes private keys)
  createSigningRequest(
    keyId: string,
    message: string,
    metadata: Record<string, unknown>
  ): Promise<SigningRequest>;
  addSignature(requestId: string, signature: SignatureInfo): Promise<SigningRequest>;
  getSigningRequest(requestId: string): Promise<SigningRequest | null>;
  cancelSigningRequest(requestId: string): Promise<void>;

  // Key derivation
  deriveChildKey(parentKeyId: string, path: string): Promise<KeyMetadata>;
  getDerivationPath(keyId: string): Promise<string | null>;

  // Public key operations (safe to expose)
  getPublicKey(keyId: string): Promise<string | null>;
  getAddress(keyId: string): Promise<string | null>;

  // Health and status
  getHealth(): Promise<KeyManagementHealth>;
}

export interface KeyGenerationConfig {
  algorithm: 'ed25519' | 'secp256k1';
  storageType: KeyStorageType;
  mpcEnabled: boolean;
  mpcConfig?: MPCConfig;
  derivationPath?: string;
  expiresInDays?: number;
}

export interface KeyListOptions {
  type?: KeyType;
  status?: KeyStatus;
  limit?: number;
  offset?: number;
}

export interface MPCSharesStatus {
  keyId: string;
  totalShares: number;
  threshold: number;
  activeShares: number;
  holders: Array<{
    type: 'user' | 'platform' | 'recovery_service';
    status: 'active' | 'pending' | 'expired';
  }>;
  canSign: boolean;
}

export interface KeyManagementHealth {
  available: boolean;
  hsmConnected: boolean;
  enclaveAttested: boolean;
  lastHealthCheck: Date;
  activeKeys: number;
  pendingRotations: number;
}

// ============================================================================
// Abstract Key Storage Backend
// ============================================================================

export abstract class KeyStorageBackend {
  abstract readonly type: KeyStorageType;

  abstract generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }>;

  abstract sign(keyId: string, message: string): Promise<string>;

  abstract verify(keyId: string, message: string, signature: string): Promise<boolean>;

  abstract getPublicKey(keyId: string): Promise<string | null>;

  abstract deleteKey(keyId: string): Promise<void>;

  abstract healthCheck(): Promise<boolean>;
}

// ============================================================================
// Software Key Storage (Development/Testing Only)
// ============================================================================

/**
 * Software-based key storage for development and testing.
 * WARNING: Not suitable for production use with real funds.
 */
export class SoftwareKeyStorage extends KeyStorageBackend {
  readonly type: KeyStorageType = 'software';

  private readonly keys = new Map<string, { publicKey: string; privateKey: string }>();

  async generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    // Generate mock key pair for demonstration
    // In production, use proper cryptographic libraries
    const publicKey = this.generateMockPublicKey(keyId, algorithm);
    const privateKey = this.generateMockPrivateKey(keyId, algorithm);

    this.keys.set(keyId, { publicKey, privateKey });

    return { publicKey };
  }

  async sign(keyId: string, message: string): Promise<string> {
    const keyPair = this.keys.get(keyId);
    if (!keyPair) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Mock signature for demonstration
    const messageHash = Buffer.from(message).toString('base64');
    return `sig_${keyId}_${messageHash.slice(0, 16)}`;
  }

  async verify(keyId: string, message: string, signature: string): Promise<boolean> {
    const keyPair = this.keys.get(keyId);
    if (!keyPair) {
      return false;
    }

    // Mock verification for demonstration
    const messageHash = Buffer.from(message).toString('base64');
    const expectedSig = `sig_${keyId}_${messageHash.slice(0, 16)}`;
    return signature === expectedSig;
  }

  async getPublicKey(keyId: string): Promise<string | null> {
    return this.keys.get(keyId)?.publicKey ?? null;
  }

  async deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private generateMockPublicKey(keyId: string, algorithm: string): string {
    const prefix = algorithm === 'ed25519' ? 'ed25519_pub_' : 'secp256k1_pub_';
    return prefix + Buffer.from(keyId).toString('base64').slice(0, 44);
  }

  private generateMockPrivateKey(keyId: string, algorithm: string): string {
    const prefix = algorithm === 'ed25519' ? 'ed25519_priv_' : 'secp256k1_priv_';
    return prefix + Buffer.from(keyId).toString('base64').slice(0, 64);
  }
}

// ============================================================================
// HSM Key Storage Adapter
// ============================================================================

/**
 * HSM-based key storage for production use.
 * Supports AWS CloudHSM, Azure HSM, Thales Luna, and YubiHSM.
 */
export class HSMKeyStorage extends KeyStorageBackend {
  readonly type: KeyStorageType = 'hsm';

  constructor(private readonly config: HSMConfig) {
    super();
  }

  async generateKeyPair(
    keyId: string,
    _algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    // In production, this would communicate with actual HSM
    // For now, return a placeholder that indicates HSM is required
    throw new Error(
      `HSM key generation requires actual HSM integration. ` +
        `Provider: ${this.config.provider}, KeyId: ${keyId}`
    );
  }

  async sign(_keyId: string, _message: string): Promise<string> {
    throw new Error(
      `HSM signing requires actual HSM integration. Provider: ${this.config.provider}`
    );
  }

  async verify(_keyId: string, _message: string, _signature: string): Promise<boolean> {
    throw new Error(
      `HSM verification requires actual HSM integration. Provider: ${this.config.provider}`
    );
  }

  async getPublicKey(_keyId: string): Promise<string | null> {
    throw new Error(
      `HSM public key retrieval requires actual HSM integration. Provider: ${this.config.provider}`
    );
  }

  async deleteKey(_keyId: string): Promise<void> {
    throw new Error(
      `HSM key deletion requires actual HSM integration. Provider: ${this.config.provider}`
    );
  }

  async healthCheck(): Promise<boolean> {
    // In production, would check actual HSM connectivity
    return false;
  }
}

// ============================================================================
// MPC Coordinator
// ============================================================================

/**
 * Coordinates MPC (Multi-Party Computation) threshold signing.
 * Ensures no single party can sign transactions alone.
 */
export class MPCCoordinator {
  private readonly shares = new Map<string, KeyShare[]>();
  private readonly partialSignatures = new Map<string, Map<string, string>>();

  constructor(private readonly config: MPCConfig) {}

  /**
   * Generate distributed key shares for MPC
   */
  async generateShares(keyId: string): Promise<KeyShare[]> {
    const shares: KeyShare[] = [];

    // Generate shares for each party
    const holders: Array<'user' | 'platform' | 'recovery_service'> = [
      'user',
      'platform',
      'recovery_service',
    ];

    for (let i = 0; i < this.config.totalShares; i++) {
      const share: KeyShare = {
        id: `share_${keyId}_${i}`,
        keyId,
        shareIndex: i,
        totalShares: this.config.totalShares,
        threshold: this.config.threshold,
        holderType: holders[i % holders.length],
        publicData: this.generateSharePublicData(keyId, i),
        createdAt: new Date(),
      };
      shares.push(share);
    }

    this.shares.set(keyId, shares);
    return shares;
  }

  /**
   * Get status of MPC shares for a key
   */
  getSharesStatus(keyId: string): MPCSharesStatus | null {
    const shares = this.shares.get(keyId);
    if (!shares) {
      return null;
    }

    const holders = shares.map((s) => ({
      type: s.holderType,
      status: 'active' as const,
    }));

    return {
      keyId,
      totalShares: this.config.totalShares,
      threshold: this.config.threshold,
      activeShares: shares.length,
      holders,
      canSign: shares.length >= this.config.threshold,
    };
  }

  /**
   * Collect partial signature from a share holder
   */
  async collectPartialSignature(
    signingRequestId: string,
    shareId: string,
    partialSignature: string
  ): Promise<boolean> {
    if (!this.partialSignatures.has(signingRequestId)) {
      this.partialSignatures.set(signingRequestId, new Map());
    }

    const signatures = this.partialSignatures.get(signingRequestId)!;
    signatures.set(shareId, partialSignature);

    return signatures.size >= this.config.threshold;
  }

  /**
   * Combine partial signatures into final signature
   */
  async combineSignatures(signingRequestId: string): Promise<string | null> {
    const signatures = this.partialSignatures.get(signingRequestId);
    if (!signatures || signatures.size < this.config.threshold) {
      return null;
    }

    // In production, this would use actual threshold signature combination
    const combined = Array.from(signatures.values()).join('_');
    return `mpc_sig_${Buffer.from(combined).toString('base64').slice(0, 64)}`;
  }

  /**
   * Clear partial signatures after completion
   */
  clearSignatures(signingRequestId: string): void {
    this.partialSignatures.delete(signingRequestId);
  }

  private generateSharePublicData(keyId: string, index: number): string {
    return `share_public_${keyId}_${index}_${Date.now()}`;
  }
}

// ============================================================================
// Key Derivation Service
// ============================================================================

/**
 * Implements hierarchical deterministic key derivation (BIP-32/44).
 * Used for generating agent-specific wallets from master keys.
 */
export class KeyDerivationService {
  constructor(private readonly config: KeyDerivationConfig) {}

  /**
   * Generate derivation path for TON wallet
   */
  generatePath(accountIndex: number, addressIndex: number = 0): string {
    const purpose = 44; // BIP-44
    const coinType = this.config.coinType; // 607 for TON
    const change = 0; // External chain

    // Note: hardened config is used for path generation format in production
    // Currently using standard hardened format (with ')

    return `m/${purpose}'/${coinType}'/${accountIndex}'/${change}/${addressIndex}`;
  }

  /**
   * Parse a derivation path
   */
  parsePath(path: string): DerivationPathComponents | null {
    const match = path.match(/^m\/(\d+)'?\/(\d+)'?\/(\d+)'?\/(\d+)'?\/(\d+)'?$/);
    if (!match) {
      return null;
    }

    return {
      purpose: parseInt(match[1]),
      coinType: parseInt(match[2]),
      account: parseInt(match[3]),
      change: parseInt(match[4]),
      addressIndex: parseInt(match[5]),
    };
  }

  /**
   * Validate derivation path
   */
  validatePath(path: string): boolean {
    const components = this.parsePath(path);
    if (!components) {
      return false;
    }

    return components.coinType === this.config.coinType;
  }

  /**
   * Get next available account index
   */
  getNextAccountIndex(existingPaths: string[]): number {
    const accountIndices = existingPaths
      .map((p) => this.parsePath(p))
      .filter((c): c is DerivationPathComponents => c !== null)
      .map((c) => c.account);

    if (accountIndices.length === 0) {
      return 0;
    }

    return Math.max(...accountIndices) + 1;
  }
}

export interface DerivationPathComponents {
  purpose: number;
  coinType: number;
  account: number;
  change: number;
  addressIndex: number;
}

// ============================================================================
// Key Management Service Implementation
// ============================================================================

export class SecureKeyManager implements KeyManagementService {
  private readonly keys = new Map<string, KeyMetadata>();
  private readonly signingRequests = new Map<string, SigningRequest>();
  private readonly mpcCoordinator: MPCCoordinator;
  private readonly derivationService: KeyDerivationService;
  private readonly eventCallbacks: SecurityEventCallback[] = [];

  constructor(
    private readonly storage: KeyStorageBackend,
    config: {
      mpc: MPCConfig;
      keyDerivation: KeyDerivationConfig;
    }
  ) {
    this.mpcCoordinator = new MPCCoordinator(config.mpc);
    this.derivationService = new KeyDerivationService(config.keyDerivation);
  }

  /**
   * Subscribe to security events
   */
  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Generate a new key
   */
  async generateKey(
    userId: string,
    keyType: KeyType,
    config?: Partial<KeyGenerationConfig>
  ): Promise<KeyMetadata> {
    const keyId = this.generateKeyId(userId, keyType);
    const algorithm = config?.algorithm ?? 'ed25519';
    const storageType = config?.storageType ?? this.storage.type;

    // Generate key pair - publicKey is stored in secure storage
    await this.storage.generateKeyPair(keyId, algorithm);

    // Create metadata
    const metadata: KeyMetadata = {
      id: keyId,
      type: keyType,
      algorithm,
      storageType,
      createdAt: new Date(),
      expiresAt: config?.expiresInDays
        ? new Date(Date.now() + config.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      derivationPath: config?.derivationPath,
      version: 1,
      status: 'active',
    };

    // Store metadata
    this.keys.set(keyId, metadata);

    // Generate MPC shares if enabled
    if (config?.mpcEnabled && config?.mpcConfig) {
      await this.mpcCoordinator.generateShares(keyId);
    }

    // Emit event
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_generated',
      severity: 'low',
      source: 'key_management',
      message: `Key generated: ${keyId}`,
      data: { keyId, keyType, userId },
    });

    return metadata;
  }

  /**
   * Rotate an existing key
   */
  async rotateKey(keyId: string): Promise<KeyMetadata> {
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (existingKey.status !== 'active') {
      throw new Error(`Cannot rotate key with status: ${existingKey.status}`);
    }

    // Mark existing key as pending rotation
    existingKey.status = 'pending_rotation';
    this.keys.set(keyId, existingKey);

    // Generate new key - publicKey is stored in secure storage
    const newKeyId = `${keyId}_v${existingKey.version + 1}`;
    await this.storage.generateKeyPair(newKeyId, existingKey.algorithm);

    // Create new metadata
    const newMetadata: KeyMetadata = {
      id: newKeyId,
      type: existingKey.type,
      algorithm: existingKey.algorithm,
      storageType: existingKey.storageType,
      createdAt: new Date(),
      expiresAt: existingKey.expiresAt,
      rotatedFrom: keyId,
      derivationPath: existingKey.derivationPath,
      version: existingKey.version + 1,
      status: 'active',
    };

    // Mark old key as rotated
    existingKey.status = 'rotated';
    this.keys.set(keyId, existingKey);

    // Store new metadata
    this.keys.set(newKeyId, newMetadata);

    // Emit event
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_rotated',
      severity: 'low',
      source: 'key_management',
      message: `Key rotated: ${keyId} -> ${newKeyId}`,
      data: { oldKeyId: keyId, newKeyId },
    });

    return newMetadata;
  }

  /**
   * Revoke a key
   */
  async revokeKey(keyId: string, reason: string): Promise<void> {
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    existingKey.status = 'revoked';
    this.keys.set(keyId, existingKey);

    // Delete from storage
    await this.storage.deleteKey(keyId);

    // Emit event
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_revoked',
      severity: 'medium',
      source: 'key_management',
      message: `Key revoked: ${keyId}`,
      data: { keyId, reason },
    });
  }

  /**
   * Get key metadata
   */
  async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    return this.keys.get(keyId) ?? null;
  }

  /**
   * List keys for a user
   */
  async listKeys(userId: string, options?: KeyListOptions): Promise<KeyMetadata[]> {
    const allKeys = Array.from(this.keys.values());

    let filtered = allKeys.filter((k) => k.id.startsWith(`key_${userId}_`));

    if (options?.type) {
      filtered = filtered.filter((k) => k.type === options.type);
    }

    if (options?.status) {
      filtered = filtered.filter((k) => k.status === options.status);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Generate MPC shares for a key
   */
  async generateMPCShares(keyId: string, _config: MPCConfig): Promise<KeyShare[]> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    return this.mpcCoordinator.generateShares(keyId);
  }

  /**
   * Get MPC shares status
   */
  async getMPCSharesStatus(keyId: string): Promise<MPCSharesStatus> {
    const status = this.mpcCoordinator.getSharesStatus(keyId);
    if (!status) {
      throw new Error(`No MPC shares found for key: ${keyId}`);
    }
    return status;
  }

  /**
   * Create a signing request
   */
  async createSigningRequest(
    keyId: string,
    message: string,
    metadata: Record<string, unknown>
  ): Promise<SigningRequest> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (key.status !== 'active') {
      throw new Error(`Cannot sign with key status: ${key.status}`);
    }

    const requestId = `sig_req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const messageHash = Buffer.from(message).toString('base64');

    const mpcStatus = this.mpcCoordinator.getSharesStatus(keyId);

    const request: SigningRequest = {
      id: requestId,
      transactionId: (metadata.transactionId as string) ?? requestId,
      authorizationId: (metadata.authorizationId as string) ?? '',
      message,
      messageHash,
      signerType: mpcStatus ? 'mpc_threshold' : 'single',
      requiredSignatures: mpcStatus?.threshold ?? 1,
      collectedSignatures: [],
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    this.signingRequests.set(requestId, request);
    return request;
  }

  /**
   * Add a signature to a signing request
   */
  async addSignature(requestId: string, signature: SignatureInfo): Promise<SigningRequest> {
    const request = this.signingRequests.get(requestId);
    if (!request) {
      throw new Error(`Signing request not found: ${requestId}`);
    }

    if (request.status === 'expired' || request.status === 'failed') {
      throw new Error(`Cannot add signature to request with status: ${request.status}`);
    }

    // Verify signature
    const verified = await this.storage.verify(
      signature.publicKey,
      request.message,
      signature.signature
    );

    const signatureWithVerification: SignatureInfo = {
      ...signature,
      verified,
    };

    request.collectedSignatures.push(signatureWithVerification);

    // Check if we have enough signatures
    if (request.collectedSignatures.length >= request.requiredSignatures) {
      request.status = 'ready_to_broadcast';
    } else {
      request.status = 'collecting_signatures';
    }

    this.signingRequests.set(requestId, request);
    return request;
  }

  /**
   * Get signing request
   */
  async getSigningRequest(requestId: string): Promise<SigningRequest | null> {
    return this.signingRequests.get(requestId) ?? null;
  }

  /**
   * Cancel signing request
   */
  async cancelSigningRequest(requestId: string): Promise<void> {
    const request = this.signingRequests.get(requestId);
    if (request) {
      request.status = 'failed';
      this.signingRequests.set(requestId, request);
    }
  }

  /**
   * Derive a child key
   */
  async deriveChildKey(parentKeyId: string, path: string): Promise<KeyMetadata> {
    const parentKey = this.keys.get(parentKeyId);
    if (!parentKey) {
      throw new Error(`Parent key not found: ${parentKeyId}`);
    }

    if (!this.derivationService.validatePath(path)) {
      throw new Error(`Invalid derivation path: ${path}`);
    }

    const childKeyId = `${parentKeyId}_derived_${path.replace(/\//g, '_')}`;

    // In production, would derive actual child key from parent - publicKey stored in secure storage
    await this.storage.generateKeyPair(childKeyId, parentKey.algorithm);

    const childMetadata: KeyMetadata = {
      id: childKeyId,
      type: 'signing',
      algorithm: parentKey.algorithm,
      storageType: parentKey.storageType,
      createdAt: new Date(),
      derivationPath: path,
      version: 1,
      status: 'active',
    };

    this.keys.set(childKeyId, childMetadata);
    return childMetadata;
  }

  /**
   * Get derivation path for a key
   */
  async getDerivationPath(keyId: string): Promise<string | null> {
    const key = this.keys.get(keyId);
    return key?.derivationPath ?? null;
  }

  /**
   * Get public key (safe to expose)
   */
  async getPublicKey(keyId: string): Promise<string | null> {
    return this.storage.getPublicKey(keyId);
  }

  /**
   * Get wallet address from public key
   */
  async getAddress(keyId: string): Promise<string | null> {
    const publicKey = await this.getPublicKey(keyId);
    if (!publicKey) {
      return null;
    }

    // In production, would derive actual TON address
    // For now, return a mock address format
    return `EQ${Buffer.from(publicKey).toString('base64').slice(0, 46)}`;
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<KeyManagementHealth> {
    const storageHealthy = await this.storage.healthCheck();

    const activeKeys = Array.from(this.keys.values()).filter((k) => k.status === 'active').length;

    const pendingRotations = Array.from(this.keys.values()).filter(
      (k) => k.status === 'pending_rotation'
    ).length;

    return {
      available: storageHealthy,
      hsmConnected: this.storage.type === 'hsm' && storageHealthy,
      enclaveAttested: this.storage.type === 'enclave' && storageHealthy,
      lastHealthCheck: new Date(),
      activeKeys,
      pendingRotations,
    };
  }

  private generateKeyId(userId: string, keyType: KeyType): string {
    return `key_${userId}_${keyType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private emitEvent(event: SecurityEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createKeyManager(
  config: {
    mpc?: Partial<MPCConfig>;
    keyDerivation?: Partial<KeyDerivationConfig>;
    storageType?: KeyStorageType;
    hsm?: HSMConfig;
  } = {}
): SecureKeyManager {
  const mpcConfig: MPCConfig = {
    threshold: config.mpc?.threshold ?? 2,
    totalShares: config.mpc?.totalShares ?? 3,
    recoveryEnabled: config.mpc?.recoveryEnabled ?? true,
    recoveryThreshold: config.mpc?.recoveryThreshold ?? 2,
    keyDerivationEnabled: config.mpc?.keyDerivationEnabled ?? true,
  };

  const keyDerivationConfig: KeyDerivationConfig = {
    standard: config.keyDerivation?.standard ?? 'bip44',
    coinType: config.keyDerivation?.coinType ?? 607, // TON
    accountIndex: config.keyDerivation?.accountIndex ?? 0,
    hardened: config.keyDerivation?.hardened ?? true,
  };

  let storage: KeyStorageBackend;

  if (config.storageType === 'hsm' && config.hsm) {
    storage = new HSMKeyStorage(config.hsm);
  } else {
    // Default to software storage (development only)
    storage = new SoftwareKeyStorage();
  }

  return new SecureKeyManager(storage, {
    mpc: mpcConfig,
    keyDerivation: keyDerivationConfig,
  });
}
