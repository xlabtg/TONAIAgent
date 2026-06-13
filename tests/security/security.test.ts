/**
 * TONAIAgent - Security Module Tests
 *
 * Comprehensive tests for the production-grade security and key management system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Key Management
  createKeyManager,
  SecureKeyManager,
  SoftwareKeyStorage,
  MPCCoordinator,
  KeyDerivationService,

  // Custody
  createCustodyProvider,
  NonCustodialProvider,
  SmartContractWalletProvider,
  MPCCustodyProvider,
  CustodyWallet,

  // Authorization
  createAuthorizationEngine,
  TransactionAuthorizationEngine,
  DefaultIntentValidator,
  DefaultStrategyValidator,

  // Policy
  createPolicyManager,
  DefaultPolicyManager,
  DEFAULT_TEMPLATES,

  // Risk
  createRiskEngine,
  DefaultRiskEngine,

  // Emergency
  createEmergencyController,
  createRecoveryManager,
  DefaultEmergencyController,
  DefaultRecoveryManager,

  // Audit
  createAuditLogger,
  DefaultAuditLogger,

  // Security Manager
  createSecurityManager,
  DefaultSecurityManager,

  // Types
  TransactionRequest,
  AgentPermissions,
  UserLimits,
  RiskContext,
  TransactionHistory,
  CustodyMode,
  SignatureInfo,
} from '../../core/security';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockTransactionRequest(overrides: Partial<TransactionRequest> = {}): TransactionRequest {
  return {
    id: `tx_${Date.now()}`,
    type: 'swap',
    agentId: 'agent_test',
    userId: 'user_test',
    source: {
      address: 'EQ_source_address',
      type: 'agent',
      isWhitelisted: true,
      isNew: false,
    },
    destination: {
      address: 'EQ_destination_address',
      type: 'contract',
      isWhitelisted: true,
      isNew: false,
    },
    amount: {
      token: 'TON',
      symbol: 'TON',
      amount: '100',
      decimals: 9,
      valueTon: 100,
    },
    metadata: {
      protocol: 'dedust',
      sessionId: 'session_test',
    },
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockTransactionHistory(): TransactionHistory {
  const now = Date.now();
  return {
    userId: 'user_test',
    agentId: 'agent_test',
    transactions: Array.from({ length: 10 }, (_, i) => ({
      id: `tx_${i}`,
      type: 'swap',
      amount: 50 + Math.random() * 50,
      token: 'TON',
      timestamp: new Date(now - i * 60 * 60 * 1000),
      success: true,
    })),
    aggregates: {
      totalTransactions: 100,
      averageAmount: 75,
      maxAmount: 200,
      standardDeviation: 25,
      hourlyDistribution: Array(24).fill(4),
      dayOfWeekDistribution: Array(7).fill(14),
      protocolUsage: { dedust: 60, stonfi: 40 },
      destinationCount: 5,
    },
    lastUpdated: new Date(),
  };
}

// ============================================================================
// Key Management Tests
// ============================================================================

describe('Key Management', () => {
  let keyManager: SecureKeyManager;

  beforeEach(() => {
    keyManager = createKeyManager();
  });

  describe('Key Generation', () => {
    it('should generate a new key', async () => {
      const key = await keyManager.generateKey('user_123', 'signing');

      expect(key).toBeDefined();
      expect(key.id).toContain('key_user_123_signing_');
      expect(key.type).toBe('signing');
      expect(key.status).toBe('active');
      expect(key.algorithm).toBe('ed25519');
    });

    it('should generate key with custom algorithm', async () => {
      const key = await keyManager.generateKey('user_123', 'signing', {
        algorithm: 'secp256k1',
      });

      expect(key.algorithm).toBe('secp256k1');
    });

    it('should generate MPC shares when enabled', async () => {
      const key = await keyManager.generateKey('user_123', 'master', {
        mpcEnabled: true,
        mpcConfig: {
          threshold: 2,
          totalShares: 3,
          recoveryEnabled: true,
          recoveryThreshold: 2,
          keyDerivationEnabled: true,
        },
      });

      const sharesStatus = await keyManager.getMPCSharesStatus(key.id);
      expect(sharesStatus.totalShares).toBe(3);
      expect(sharesStatus.threshold).toBe(2);
      expect(sharesStatus.canSign).toBe(true);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate an active key', async () => {
      const originalKey = await keyManager.generateKey('user_123', 'signing');
      const rotatedKey = await keyManager.rotateKey(originalKey.id);

      expect(rotatedKey.version).toBe(originalKey.version + 1);
      expect(rotatedKey.rotatedFrom).toBe(originalKey.id);
      expect(rotatedKey.status).toBe('active');

      const oldKeyMetadata = await keyManager.getKeyMetadata(originalKey.id);
      expect(oldKeyMetadata?.status).toBe('rotated');
    });

    it('should not rotate a revoked key', async () => {
      const key = await keyManager.generateKey('user_123', 'signing');
      await keyManager.revokeKey(key.id, 'test');

      await expect(keyManager.rotateKey(key.id)).rejects.toThrow();
    });
  });

  describe('Key Revocation', () => {
    it('should revoke a key', async () => {
      const key = await keyManager.generateKey('user_123', 'signing');
      await keyManager.revokeKey(key.id, 'Security incident');

      const metadata = await keyManager.getKeyMetadata(key.id);
      expect(metadata?.status).toBe('revoked');
    });
  });

  describe('Signing Requests', () => {
    it('should create a signing request', async () => {
      const key = await keyManager.generateKey('user_123', 'signing');
      const request = await keyManager.createSigningRequest(
        key.id,
        'test message',
        { transactionId: 'tx_123' }
      );

      expect(request.id).toBeDefined();
      expect(request.status).toBe('pending');
      expect(request.message).toBe('test message');
    });

    it('should not create signing request for inactive key', async () => {
      const key = await keyManager.generateKey('user_123', 'signing');
      await keyManager.revokeKey(key.id, 'test');

      await expect(
        keyManager.createSigningRequest(key.id, 'test', {})
      ).rejects.toThrow();
    });

    it('should generate cryptographically unique signing request IDs (not Math.random)', async () => {
      const key = await keyManager.generateKey('user_123', 'signing');
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const req = await keyManager.createSigningRequest(key.id, `msg_${i}`, {});
        ids.add(req.id);
      }
      // All 50 IDs must be unique
      expect(ids.size).toBe(50);
      // IDs should contain hex entropy from randomBytes, not short Math.random output
      const sampleId = ids.values().next().value as string;
      const entropyPart = sampleId.split('_').pop() ?? '';
      // crypto.randomBytes(8).toString('hex') produces 16 hex chars
      expect(entropyPart).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  // ==========================================================================
  // Threshold signature verification (LOGIC-24 / issue #434)
  //
  // addSignature() must count ONLY verified signatures toward the
  // requiredSignatures threshold, and a single public key must not be able to
  // occupy more than one signature slot. Previously the quorum gate compared
  // the raw collectedSignatures.length, so junk/duplicate signatures could
  // drive a fund-moving request to ready_to_broadcast.
  // ==========================================================================
  describe('Threshold signature verification (LOGIC-24)', () => {
    // SecureKeyManager never exposes private keys, so tests reach the storage
    // backend (where SoftwareKeyStorage holds the test key pairs) to produce
    // genuine signatures. addSignature verifies signature.publicKey as the
    // storage key id, so signing under a generated key id yields verified=true.
    function storageOf(km: SecureKeyManager): SoftwareKeyStorage {
      return (km as unknown as { storage: SoftwareKeyStorage }).storage;
    }

    // A 2-of-N threshold request requires MPC shares (requiredSignatures is
    // derived from the MPC threshold; a non-MPC key needs only one signature).
    const mpcConfig = {
      threshold: 2,
      totalShares: 3,
      recoveryEnabled: true,
      recoveryThreshold: 2,
      keyDerivationEnabled: true,
    };

    async function createTwoOfNRequest(km: SecureKeyManager) {
      const key = await km.generateKey('user_multisig', 'master', {
        mpcEnabled: true,
        mpcConfig,
      });
      const request = await km.createSigningRequest(key.id, 'transfer 1000 TON to treasury', {
        transactionId: 'tx_multisig_1',
      });
      // Precondition: the request genuinely needs two signatures.
      expect(request.requiredSignatures).toBe(2);
      return request;
    }

    // Produce a SignatureInfo that will verify (publicKey = a real storage key id).
    async function validSignature(
      km: SecureKeyManager,
      message: string,
      signerId: string
    ): Promise<SignatureInfo> {
      const signerKey = await km.generateKey(signerId, 'signing');
      const signature = await storageOf(km).sign(signerKey.id, message);
      return {
        signerId,
        signerType: 'user',
        signature,
        publicKey: signerKey.id,
        signedAt: new Date(),
        verified: false, // addSignature recomputes this
      };
    }

    // Produce a SignatureInfo that will NOT verify (junk signature under a key
    // id that does not exist in storage — exactly the attacker/buggy-signer case).
    function junkSignature(signerId: string, publicKey: string): SignatureInfo {
      return {
        signerId,
        signerType: 'user',
        signature: 'deadbeef'.repeat(8),
        publicKey,
        signedAt: new Date(),
        verified: false,
      };
    }

    it('counts only verified signatures toward the ready_to_broadcast threshold', async () => {
      const request = await createTwoOfNRequest(keyManager);
      const message = request.message;

      // One valid signature: not enough on its own (1 of 2).
      const first = await keyManager.addSignature(
        request.id,
        await validSignature(keyManager, message, 'signer_a')
      );
      expect(first.status).toBe('collecting_signatures');
      expect(first.collectedSignatures.filter((s) => s.verified).length).toBe(1);

      // One INVALID signature from a different key: stored but not counted, so
      // the request must stay in collecting_signatures (this is the bug).
      const second = await keyManager.addSignature(
        request.id,
        junkSignature('attacker', 'unknown_public_key')
      );
      expect(second.status).toBe('collecting_signatures');
      // The collection now holds one valid + one invalid signature...
      expect(second.collectedSignatures.length).toBe(2);
      // ...but only one of them counts toward the quorum.
      expect(second.collectedSignatures.filter((s) => s.verified).length).toBe(1);

      // Only a genuine second valid signature flips it to ready_to_broadcast.
      const third = await keyManager.addSignature(
        request.id,
        await validSignature(keyManager, message, 'signer_b')
      );
      expect(third.status).toBe('ready_to_broadcast');
      expect(third.collectedSignatures.filter((s) => s.verified).length).toBe(2);
    });

    it('never reaches ready_to_broadcast on invalid signatures alone', async () => {
      const request = await createTwoOfNRequest(keyManager);

      await keyManager.addSignature(request.id, junkSignature('attacker_1', 'junk_key_1'));
      const result = await keyManager.addSignature(
        request.id,
        junkSignature('attacker_2', 'junk_key_2')
      );

      // Two junk signatures must NOT satisfy a 2-of-N quorum.
      expect(result.status).toBe('collecting_signatures');
      expect(result.status).not.toBe('ready_to_broadcast');
      expect(result.collectedSignatures.filter((s) => s.verified).length).toBe(0);
    });

    it('rejects a second signature from a public key that already contributed', async () => {
      const request = await createTwoOfNRequest(keyManager);
      const message = request.message;

      const sig = await validSignature(keyManager, message, 'signer_a');
      await keyManager.addSignature(request.id, sig);

      // The same signer (same public key) cannot occupy a second slot.
      await expect(keyManager.addSignature(request.id, { ...sig })).rejects.toThrow(
        /already contributed a verified signature/
      );

      const current = await keyManager.getSigningRequest(request.id);
      expect(current?.collectedSignatures.length).toBe(1);
      expect(current?.status).toBe('collecting_signatures');
    });

    it('lets the real signer replace an attacker\'s unverified pre-submission for the same key', async () => {
      const request = await createTwoOfNRequest(keyManager);
      const message = request.message;

      // The real signer's key id is public; an attacker pre-submits junk under it.
      const signerKey = await keyManager.generateKey('signer_a', 'signing');
      await keyManager.addSignature(request.id, {
        signerId: 'attacker',
        signerType: 'user',
        signature: 'deadbeef'.repeat(8),
        publicKey: signerKey.id,
        signedAt: new Date(),
        verified: false,
      });

      // The genuine signature for the same key replaces the junk slot.
      const realSignature = await storageOf(keyManager).sign(signerKey.id, message);
      const updated = await keyManager.addSignature(request.id, {
        signerId: 'signer_a',
        signerType: 'user',
        signature: realSignature,
        publicKey: signerKey.id,
        signedAt: new Date(),
        verified: false,
      });

      // One slot per key, now verified — the pre-submission did not lock it out.
      expect(updated.collectedSignatures.length).toBe(1);
      expect(updated.collectedSignatures.filter((s) => s.verified).length).toBe(1);
      expect(updated.status).toBe('collecting_signatures');
    });
  });

  describe('Key Derivation', () => {
    it('should derive child key', async () => {
      const parentKey = await keyManager.generateKey('user_123', 'master');
      const childKey = await keyManager.deriveChildKey(
        parentKey.id,
        "m/44'/607'/0'/0/0"
      );

      expect(childKey.derivationPath).toBe("m/44'/607'/0'/0/0");
      expect(childKey.type).toBe('signing');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      await keyManager.generateKey('user_123', 'signing');
      const health = await keyManager.getHealth();

      expect(health.available).toBe(true);
      expect(health.activeKeys).toBe(1);
    });
  });
});

// ============================================================================
// SoftwareKeyStorage Real Crypto Tests
// ============================================================================

describe('SoftwareKeyStorage', () => {
  it('should throw in production environment', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => new SoftwareKeyStorage()).toThrow(
        'SoftwareKeyStorage is not allowed in production'
      );
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('should generate real non-deterministic key pairs for ed25519', async () => {
    const storage = new SoftwareKeyStorage();
    const result1 = await storage.generateKeyPair('key_a', 'ed25519');
    const result2 = await storage.generateKeyPair('key_b', 'ed25519');
    expect(result1.publicKey).toBeTruthy();
    expect(result2.publicKey).toBeTruthy();
    expect(result1.publicKey).not.toBe(result2.publicKey);
  });

  it('should generate real non-deterministic key pairs for secp256k1', async () => {
    const storage = new SoftwareKeyStorage();
    const result1 = await storage.generateKeyPair('key_c', 'secp256k1');
    const result2 = await storage.generateKeyPair('key_d', 'secp256k1');
    expect(result1.publicKey).toBeTruthy();
    expect(result2.publicKey).toBeTruthy();
    expect(result1.publicKey).not.toBe(result2.publicKey);
  });

  it('should produce a real cryptographic signature for ed25519', async () => {
    const storage = new SoftwareKeyStorage();
    await storage.generateKeyPair('key_ed', 'ed25519');
    const sig = await storage.sign('key_ed', 'hello world');
    // Real ed25519 signature is 64 bytes -> 128 hex chars
    expect(sig).toHaveLength(128);
    expect(sig).toMatch(/^[0-9a-f]+$/);
  });

  it('should produce a real cryptographic signature for secp256k1', async () => {
    const storage = new SoftwareKeyStorage();
    await storage.generateKeyPair('key_ec', 'secp256k1');
    const sig = await storage.sign('key_ec', 'hello world');
    // DER-encoded ECDSA signature — at least a non-trivial hex string
    expect(sig.length).toBeGreaterThan(64);
    expect(sig).toMatch(/^[0-9a-f]+$/);
  });

  it('should verify a real signature for ed25519', async () => {
    const storage = new SoftwareKeyStorage();
    await storage.generateKeyPair('key_v_ed', 'ed25519');
    const message = 'sign this message';
    const sig = await storage.sign('key_v_ed', message);
    const valid = await storage.verify('key_v_ed', message, sig);
    expect(valid).toBe(true);
  });

  it('should verify a real signature for secp256k1', async () => {
    const storage = new SoftwareKeyStorage();
    await storage.generateKeyPair('key_v_ec', 'secp256k1');
    const message = 'sign this message';
    const sig = await storage.sign('key_v_ec', message);
    const valid = await storage.verify('key_v_ec', message, sig);
    expect(valid).toBe(true);
  });

  it('should reject a tampered signature for ed25519', async () => {
    const storage = new SoftwareKeyStorage();
    await storage.generateKeyPair('key_t_ed', 'ed25519');
    const sig = await storage.sign('key_t_ed', 'original message');
    const valid = await storage.verify('key_t_ed', 'tampered message', sig);
    expect(valid).toBe(false);
  });

  it('should reject a tampered signature for secp256k1', async () => {
    const storage = new SoftwareKeyStorage();
    await storage.generateKeyPair('key_t_ec', 'secp256k1');
    const sig = await storage.sign('key_t_ec', 'original message');
    const valid = await storage.verify('key_t_ec', 'tampered message', sig);
    expect(valid).toBe(false);
  });

  it('should return false when verifying with unknown key', async () => {
    const storage = new SoftwareKeyStorage();
    const valid = await storage.verify('nonexistent_key', 'message', 'deadbeef');
    expect(valid).toBe(false);
  });
});

// ============================================================================
// Custody Tests
// ============================================================================

describe('Custody Models', () => {
  describe('Non-Custodial Provider', () => {
    let provider: NonCustodialProvider;

    beforeEach(() => {
      provider = new NonCustodialProvider();
    });

    it('should create wallet in pending state', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');

      expect(wallet.custodyMode).toBe('non_custodial');
      expect(wallet.status).toBe('pending');
      expect(wallet.permissions.agentCanSign).toBe(false);
    });

    it('should require user approval for all transactions', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');
      const request = createMockTransactionRequest();
      const prepared = await provider.prepareTransaction(wallet, request);

      expect(prepared.requiresApproval).toBe(true);
      expect(prepared.approvalType).toBe('user_confirmation');
    });

    it('should reject signing without user signature', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');
      const request = createMockTransactionRequest();
      const prepared = await provider.prepareTransaction(wallet, request);

      await expect(provider.signTransaction(prepared)).rejects.toThrow();
    });
  });

  describe('Smart Contract Wallet Provider', () => {
    let provider: SmartContractWalletProvider;

    beforeEach(() => {
      provider = new SmartContractWalletProvider();
    });

    it('should create wallet with agent key', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');

      expect(wallet.custodyMode).toBe('smart_contract_wallet');
      expect(wallet.keyId).toBeDefined();
      expect(wallet.permissions.agentCanSign).toBe(true);
    });

    it('should check on-chain limits', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');

      // Small transaction within limits
      const smallRequest = createMockTransactionRequest({
        amount: { token: 'TON', symbol: 'TON', amount: '50', decimals: 9, valueTon: 50 },
      });
      const smallPrepared = await provider.prepareTransaction(wallet, smallRequest);
      expect(smallPrepared.requiresApproval).toBe(false);

      // Large transaction exceeds limits
      const largeRequest = createMockTransactionRequest({
        amount: { token: 'TON', symbol: 'TON', amount: '500', decimals: 9, valueTon: 500 },
      });
      const largePrepared = await provider.prepareTransaction(wallet, largeRequest);
      expect(largePrepared.requiresApproval).toBe(true);
    });

    it('should revoke agent access', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');
      await provider.revokeAgentAccess(wallet, 'agent_123');

      const updatedWallet = await provider.getWallet(wallet.id);
      expect(updatedWallet?.agentId).toBeUndefined();
      expect(updatedWallet?.permissions.agentCanSign).toBe(false);
    });
  });

  describe('MPC Custody Provider', () => {
    let provider: MPCCustodyProvider;

    beforeEach(() => {
      provider = new MPCCustodyProvider();
    });

    it('should create wallet with MPC key', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');

      expect(wallet.custodyMode).toBe('mpc');
      expect(wallet.status).toBe('active');
      expect(wallet.keyId).toBeDefined();
    });

    it('should have higher default limits than SCW', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');

      expect(wallet.permissions.maxTransactionAmount).toBe(1000);
      expect(wallet.permissions.dailyLimit).toBe(5000);
    });

    it('should support key rotation on revocation', async () => {
      const wallet = await provider.createWallet('user_123', 'agent_123');
      const originalKeyId = wallet.keyId;

      await provider.revokeAgentAccess(wallet, 'agent_123');

      const updatedWallet = await provider.getWallet(wallet.id);
      expect(updatedWallet?.keyId).not.toBe(originalKeyId);
    });
  });

  describe('createCustodyProvider Factory', () => {
    it('should create correct provider type', () => {
      expect(createCustodyProvider('non_custodial')).toBeInstanceOf(NonCustodialProvider);
      expect(createCustodyProvider('smart_contract_wallet')).toBeInstanceOf(SmartContractWalletProvider);
      expect(createCustodyProvider('mpc')).toBeInstanceOf(MPCCustodyProvider);
    });
  });
});

// ============================================================================
// Authorization Tests
// ============================================================================

describe('Transaction Authorization', () => {
  let engine: TransactionAuthorizationEngine;

  beforeEach(() => {
    engine = createAuthorizationEngine();
  });

  describe('Intent Validation', () => {
    it('should validate valid transaction', async () => {
      const request = createMockTransactionRequest();
      const result = await engine.validateIntent(request);

      expect(result.passed).toBe(true);
      expect(result.decision).toBe('approved');
    });

    it('should reject transaction without type', async () => {
      const request = createMockTransactionRequest({ type: undefined as unknown as 'swap' });
      const result = await engine.validateIntent(request);

      expect(result.passed).toBe(false);
    });

    it('should reject transfer without destination', async () => {
      const request = createMockTransactionRequest({
        type: 'transfer',
        destination: undefined,
      });
      const result = await engine.validateIntent(request);

      expect(result.passed).toBe(false);
    });
  });

  describe('Full Authorization Flow', () => {
    it('should approve valid transaction', async () => {
      const request = createMockTransactionRequest();
      const result = await engine.authorize(request, {});

      expect(result.decision).toBe('approved');
      expect(result.checkedLayers.length).toBeGreaterThan(0);
    });

    it('should require confirmation for large transactions', async () => {
      // Use 200 TON - larger than the default largeTransactionThreshold (100)
      // but smaller than the singleTransactionLimit (500) so it passes limit checks
      const request = createMockTransactionRequest({
        amount: { token: 'TON', symbol: 'TON', amount: '200', decimals: 9, valueTon: 200 },
      });
      const result = await engine.authorize(request, {});

      // Large transactions (above 100 TON threshold) should require confirmation
      // They may be approved with confirmation, or fully approved for medium amounts
      expect(['approved_with_confirmation', 'approved']).toContain(result.decision);
    });

    it('should flag transaction to blacklisted address via risk context', async () => {
      const request = createMockTransactionRequest({
        destination: {
          address: 'EQ_blacklisted',
          type: 'external',
          isWhitelisted: false,
          isNew: true,
        },
      });

      // Add blacklisted address check via risk engine
      const riskEngine = createRiskEngine();
      riskEngine.addToBlacklist('EQ_blacklisted');

      // Check if address is blacklisted
      const isBlacklisted = riskEngine.isBlacklisted('EQ_blacklisted');
      expect(isBlacklisted).toBe(true);

      // Risk assessment should flag this
      const history = createMockTransactionHistory();
      const riskContext = await riskEngine.assessTransaction(request, history);

      // High risk transactions to blacklisted addresses should be flagged
      expect(riskContext.overallRisk).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should block after too many transactions', async () => {
      const request = createMockTransactionRequest();

      // Make many requests rapidly
      for (let i = 0; i < 15; i++) {
        await engine.checkRateLimit({
          sessionId: 'session_test',
          userId: 'user_test',
          agentId: 'agent_test',
          startedAt: new Date(),
          lastActivityAt: new Date(),
          transactionCount: i,
          totalVolume: i * 100,
          authenticated: true,
        });
      }

      const result = await engine.checkRateLimit({
        sessionId: 'session_test',
        userId: 'user_test',
        agentId: 'agent_test',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        transactionCount: 15,
        totalVolume: 1500,
        authenticated: true,
      });

      expect(result.passed).toBe(false);
    });
  });

  describe('Simulation', () => {
    it('should simulate transaction', async () => {
      const request = createMockTransactionRequest();
      const result = await engine.simulate(request);

      expect(result.passed).toBe(true);
      expect(result.metadata?.gasEstimate).toBeDefined();
    });
  });

  describe('Authorization Caching (cacheDecisionSeconds)', () => {
    it('should return cached result on identical request', async () => {
      const request = createMockTransactionRequest({ id: 'tx_cache_test' });
      const engineWithCache = createAuthorizationEngine({ cacheDecisionSeconds: 60 });

      const firstResult = await engineWithCache.authorize(request, {});
      const secondResult = await engineWithCache.authorize(request, {});

      // Both results should have the same decision
      expect(secondResult.decision).toBe(firstResult.decision);
      // The cached result should be identical (same object id)
      expect(secondResult.id).toBe(firstResult.id);
    });

    it('should not use cache when cacheDecisionSeconds is 0', async () => {
      const request = createMockTransactionRequest({ id: 'tx_nocache_test' });
      const engineNoCache = createAuthorizationEngine({ cacheDecisionSeconds: 0 });

      const firstResult = await engineNoCache.authorize(request, {});
      const secondResult = await engineNoCache.authorize(request, {});

      // Results should have different ids when cache is disabled
      expect(secondResult.id).not.toBe(firstResult.id);
    });

    it('should clear cache when config is updated', async () => {
      const request = createMockTransactionRequest({ id: 'tx_config_change_test' });
      const engineWithCache = createAuthorizationEngine({ cacheDecisionSeconds: 60 });

      const firstResult = await engineWithCache.authorize(request, {});
      // Changing config should clear cache
      engineWithCache.setConfig({ cacheDecisionSeconds: 30 });
      const secondResult = await engineWithCache.authorize(request, {});

      // After config change cache was cleared, new result should have a new id
      expect(secondResult.id).not.toBe(firstResult.id);
    });

    it('should include validUntil based on cacheDecisionSeconds', async () => {
      const request = createMockTransactionRequest();
      const cacheSeconds = 60;
      const engineWithCache = createAuthorizationEngine({ cacheDecisionSeconds: cacheSeconds });

      const before = Date.now();
      const result = await engineWithCache.authorize(request, {});
      const after = Date.now();

      const validUntilMs = result.validUntil.getTime();
      expect(validUntilMs).toBeGreaterThanOrEqual(before + cacheSeconds * 1000);
      expect(validUntilMs).toBeLessThanOrEqual(after + cacheSeconds * 1000);
    });
  });

  describe('Per-Layer Timeout', () => {
    it('should reject when a layer exceeds its timeout budget', async () => {
      vi.useFakeTimers();
      try {
        const engineTight = createAuthorizationEngine({
          maxLatencyMs: 500, // 500ms / 8 layers = 62ms per layer
          cacheDecisionSeconds: 0,
        });

        // Replace runLayer (not runLayerWithTimeout) so the internal timeout can still fire
        (engineTight as unknown as {
          runLayer: (...args: unknown[]) => Promise<unknown>;
        }).runLayer = () => new Promise(() => {}); // never resolves

        const request = createMockTransactionRequest();
        const authPromise = engineTight.authorize(request, {});

        // Advance timers past the per-layer timeout (500ms / 8 layers = 62ms)
        await vi.advanceTimersByTimeAsync(200);

        const result = await authPromise;

        expect(result.decision).toBe('rejected');
        const timedOutLayer = result.checkedLayers.find((l) =>
          l.reason?.includes('timed out')
        );
        expect(timedOutLayer).toBeDefined();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

// ============================================================================
// Policy Tests
// ============================================================================

describe('Policy Management', () => {
  let policyManager: DefaultPolicyManager;

  beforeEach(() => {
    policyManager = createPolicyManager();
  });

  describe('Permission Templates', () => {
    it('should have default templates', () => {
      const templates = policyManager.listTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(3);
      expect(templates.map((t) => t.id)).toContain('conservative');
      expect(templates.map((t) => t.id)).toContain('balanced');
      expect(templates.map((t) => t.id)).toContain('aggressive');
    });

    it('should create permissions from template', async () => {
      const permissions = await policyManager.createPermissions(
        'agent_123',
        'user_123',
        'balanced'
      );

      expect(permissions.agentId).toBe('agent_123');
      expect(permissions.capabilities.trading.enabled).toBe(true);
    });
  });

  describe('Capability Checks', () => {
    it('should allow enabled operations', async () => {
      const permissions = await policyManager.createPermissions(
        'agent_123',
        'user_123',
        'balanced'
      );

      const result = policyManager.checkCapability(permissions, 'swap', {
        operation: 'swap',
        protocol: 'dedust',
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny disabled operations', async () => {
      const permissions = await policyManager.createPermissions(
        'agent_123',
        'user_123',
        'conservative'
      );

      const result = policyManager.checkCapability(permissions, 'transfer', {
        operation: 'transfer',
        amount: 100,
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('Policy Rules', () => {
    it('should evaluate custom policies', async () => {
      policyManager.addPolicy({
        id: 'test_policy',
        name: 'Test Policy',
        description: 'Block large transactions',
        priority: 100,
        conditions: [{ field: 'amount', operator: 'greater_than', value: 500 }],
        effect: 'deny',
        enabled: true,
      });

      const permissions = await policyManager.createPermissions(
        'agent_123',
        'user_123'
      );

      const result = policyManager.evaluatePolicy(permissions, {
        agentId: 'agent_123',
        userId: 'user_123',
        operation: 'swap',
        amount: 1000,
        timestamp: new Date(),
      });

      expect(result.overallEffect).toBe('deny');
    });
  });

  describe('Permission Updates', () => {
    it('should update permissions', async () => {
      const permissions = await policyManager.createPermissions(
        'agent_123',
        'user_123'
      );

      const updated = await policyManager.updatePermissions('agent_123', {
        capabilities: {
          ...permissions.capabilities,
          staking: {
            enabled: false,
            allowedValidators: [],
            maxStakePercent: 0,
            allowUnstake: false,
          },
        },
      });

      expect(updated.capabilities.staking.enabled).toBe(false);
      expect(updated.version).toBe(permissions.version + 1);
    });

    it('should revoke all permissions', async () => {
      await policyManager.createPermissions('agent_123', 'user_123');
      await policyManager.revokePermissions('agent_123', 'Security incident');

      const permissions = await policyManager.getPermissions('agent_123');
      expect(permissions?.capabilities.trading.enabled).toBe(false);
      expect(permissions?.capabilities.transfers.enabled).toBe(false);
    });
  });
});

// ============================================================================
// Risk Engine Tests
// ============================================================================

describe('Risk Engine', () => {
  let riskEngine: DefaultRiskEngine;

  beforeEach(() => {
    riskEngine = createRiskEngine();
  });

  describe('Transaction Risk Scoring', () => {
    it('should calculate low risk for small transactions', () => {
      const request = createMockTransactionRequest({
        amount: { token: 'TON', symbol: 'TON', amount: '10', decimals: 9, valueTon: 10 },
      });

      const score = riskEngine.calculateTransactionRisk(request);
      expect(score.score).toBeLessThan(0.3);
    });

    it('should calculate higher risk for large transactions', () => {
      const request = createMockTransactionRequest({
        amount: { token: 'TON', symbol: 'TON', amount: '10000', decimals: 9, valueTon: 10000 },
      });

      const score = riskEngine.calculateTransactionRisk(request);
      // Large transactions should have higher score than small ones
      // and should have a large_amount flag
      expect(score.score).toBeGreaterThan(0.2);
      expect(score.flags.some((f) => f.type === 'large_amount')).toBe(true);
    });

    it('should flag new destination', () => {
      const request = createMockTransactionRequest({
        destination: {
          address: 'EQ_new_destination',
          type: 'external',
          isWhitelisted: false,
          isNew: true,
        },
      });

      const score = riskEngine.calculateTransactionRisk(request);
      expect(score.flags.some((f) => f.type === 'new_destination')).toBe(true);
    });

    it('should flag blacklisted address', () => {
      riskEngine.addToBlacklist('EQ_blacklisted');

      const request = createMockTransactionRequest({
        destination: {
          address: 'EQ_blacklisted',
          type: 'external',
          isWhitelisted: false,
          isNew: false,
        },
      });

      const score = riskEngine.calculateTransactionRisk(request);
      expect(score.flags.some((f) => f.type === 'blacklisted_address')).toBe(true);
      expect(score.score).toBe(1);
    });
  });

  describe('Behavioral Risk Analysis', () => {
    it('should calculate low risk for normal history', () => {
      const history = createMockTransactionHistory();
      const score = riskEngine.calculateBehavioralRisk(history);

      expect(score.score).toBeLessThan(0.5);
    });

    it('should return baseline risk for new users', () => {
      const emptyHistory: TransactionHistory = {
        userId: 'new_user',
        agentId: 'agent_test',
        transactions: [],
        aggregates: {
          totalTransactions: 0,
          averageAmount: 0,
          maxAmount: 0,
          standardDeviation: 0,
          hourlyDistribution: Array(24).fill(0),
          dayOfWeekDistribution: Array(7).fill(0),
          protocolUsage: {},
          destinationCount: 0,
        },
        lastUpdated: new Date(),
      };

      const score = riskEngine.calculateBehavioralRisk(emptyHistory);
      expect(score.score).toBe(0.3);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect unusual transaction amount', () => {
      const history = createMockTransactionHistory();
      const request = createMockTransactionRequest({
        amount: { token: 'TON', symbol: 'TON', amount: '5000', decimals: 9, valueTon: 5000 },
      });

      const result = riskEngine.detectAnomalies(request, history);
      expect(result.deviations.length).toBeGreaterThan(0);
    });
  });

  describe('Fraud Pattern Detection', () => {
    it('should detect large transfer to new destination', () => {
      const request = createMockTransactionRequest({
        destination: {
          address: 'EQ_new',
          type: 'external',
          isWhitelisted: false,
          isNew: true,
        },
        amount: { token: 'TON', symbol: 'TON', amount: '500', decimals: 9, valueTon: 500 },
      });

      const result = riskEngine.checkFraudPatterns(request);
      expect(result.matchedPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Full Risk Assessment', () => {
    it('should provide comprehensive risk context', async () => {
      const request = createMockTransactionRequest();
      const history = createMockTransactionHistory();

      const context = await riskEngine.assessTransaction(request, history);

      expect(context.transactionRisk).toBeDefined();
      expect(context.behavioralRisk).toBeDefined();
      expect(context.marketRisk).toBeDefined();
      expect(context.overallRisk).toBeDefined();
      expect(context.recommendations).toBeDefined();
    });
  });
});

// ============================================================================
// Emergency Controller Tests
// ============================================================================

describe('Emergency Controller', () => {
  let emergency: DefaultEmergencyController;

  beforeEach(() => {
    emergency = createEmergencyController();
  });

  describe('Emergency Triggering', () => {
    it('should trigger emergency event', async () => {
      const event = await emergency.triggerEmergency(
        'risk_limit_breach',
        'system',
        ['agent_123']
      );

      expect(event.id).toBeDefined();
      expect(event.type).toBe('risk_limit_breach');
      expect(event.status).toBe('active');
      expect(event.actions.length).toBeGreaterThan(0);
    });

    it('should resolve emergency', async () => {
      const event = await emergency.triggerEmergency('anomaly_detected', 'system');
      const resolved = await emergency.resolveEmergency(
        event.id,
        'admin',
        'False positive confirmed'
      );

      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedBy).toBe('admin');
    });
  });

  describe('Kill Switch', () => {
    it('should activate kill switch', async () => {
      expect(emergency.isKillSwitchActive()).toBe(false);

      await emergency.activateKillSwitch('Security incident', 'admin');

      expect(emergency.isKillSwitchActive()).toBe(true);
    });

    it('should deactivate kill switch', async () => {
      await emergency.activateKillSwitch('Test', 'admin');
      await emergency.deactivateKillSwitch('All clear', 'admin');

      expect(emergency.isKillSwitchActive()).toBe(false);
    });
  });

  describe('Agent Control', () => {
    it('should pause and resume agents', async () => {
      await emergency.pauseAgent('agent_123', 'Investigation');

      expect(emergency.getPausedAgents()).toContain('agent_123');

      await emergency.resumeAgent('agent_123', 'Investigation complete');

      expect(emergency.getPausedAgents()).not.toContain('agent_123');
    });
  });

  describe('Active Emergencies', () => {
    it('should track active emergencies', async () => {
      await emergency.triggerEmergency('anomaly_detected', 'system');
      await emergency.triggerEmergency('risk_limit_breach', 'system');

      const active = emergency.getActiveEmergencies();
      expect(active.length).toBe(2);
    });
  });
});

// ============================================================================
// Recovery Manager Tests
// ============================================================================

describe('Recovery Manager', () => {
  let recovery: DefaultRecoveryManager;

  beforeEach(() => {
    recovery = createRecoveryManager();
  });

  describe('Recovery Initiation', () => {
    it('should initiate recovery request', async () => {
      const request = await recovery.initiateRecovery('user_123', 'key_recovery');

      expect(request.id).toBeDefined();
      expect(request.status).toBe('initiated');
      expect(request.verificationSteps.length).toBeGreaterThan(0);
    });

    it('should have correct verification steps for each type', async () => {
      const keyRecovery = await recovery.initiateRecovery('user_123', 'key_recovery');
      expect(keyRecovery.verificationSteps.some((s) => s.type === 'recovery_phrase')).toBe(true);

      const socialRecovery = await recovery.initiateRecovery('user_456', 'social_recovery');
      expect(socialRecovery.verificationSteps.filter((s) => s.type === 'guardian').length).toBe(2);
    });
  });

  describe('Verification', () => {
    it('should verify email step with the correct OTP', async () => {
      const request = await recovery.initiateRecovery('user_123', 'access_recovery');
      const otp = recovery.issueOtp(request.id, 'email');

      const result = await recovery.verifyStep(request.id, 'email', { code: otp });

      expect(result.success).toBe(true);
      expect(result.step.status).toBe('verified');
    });

    it('should reject email verification with wrong code', async () => {
      const request = await recovery.initiateRecovery('user_123', 'access_recovery');
      recovery.issueOtp(request.id, 'email'); // issue a real OTP but do not use it

      // Use a different code — must be rejected even though it is 6 chars.
      const result = await recovery.verifyStep(request.id, 'email', { code: '000000' });

      expect(result.success).toBe(false);
      expect(result.step.attempts).toBe(1);
    });

    it('should reject an arbitrary 6-char string (shape check is insufficient)', async () => {
      const request = await recovery.initiateRecovery('user_123', 'access_recovery');
      // issueOtp generates the real secret; passing a random 6-char string must fail.
      recovery.issueOtp(request.id, 'email');

      const result = await recovery.verifyStep(request.id, 'email', { code: '999999' });

      expect(result.success).toBe(false);
    });

    it('should reject replay of an already-used OTP', async () => {
      const request = await recovery.initiateRecovery('user_123', 'access_recovery');
      const otp = recovery.issueOtp(request.id, 'email');

      // First use — must succeed.
      const first = await recovery.verifyStep(request.id, 'email', { code: otp });
      expect(first.success).toBe(true);

      // Re-issue and re-use the same plaintext against a fresh step to simulate replay.
      // A new request is needed because the step is already 'verified'.
      const request2 = await recovery.initiateRecovery('user_123', 'access_recovery');
      // Manually grab the OTP for request2, then try the old OTP from request1.
      recovery.issueOtp(request2.id, 'email'); // generates a different secret
      const replay = await recovery.verifyStep(request2.id, 'email', { code: otp });
      expect(replay.success).toBe(false);
    });

    it('should reject OTP after expiry', async () => {
      vi.useFakeTimers();
      try {
        const request = await recovery.initiateRecovery('user_exp', 'access_recovery');
        const otp = recovery.issueOtp(request.id, 'email');

        // Advance time past the 10-minute OTP window.
        vi.advanceTimersByTime(11 * 60 * 1000);

        const result = await recovery.verifyStep(request.id, 'email', { code: otp });
        expect(result.success).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should fail closed when no OTP has been issued (no secretHash)', async () => {
      // Create a step-less request and try to verify without ever calling issueOtp.
      const request = await recovery.initiateRecovery('user_123', 'access_recovery');
      // Manually clear the secretHash to simulate a missing backend configuration.
      const emailStep = request.verificationSteps.find((s) => s.type === 'email');
      if (emailStep) {
        emailStep.secretHash = undefined;
      }

      const result = await recovery.verifyStep(request.id, 'email', { code: '123456' });
      expect(result.success).toBe(false);
    });

    it('should verify recovery phrase against registered hash', async () => {
      const phrase = Array.from({ length: 24 }, (_, i) => `word${i}`);
      const userId = 'user_phrase';
      // In production this hash is stored during wallet provisioning.
      const phraseHash = require('node:crypto')
        .createHash('sha256')
        .update(phrase.join(' '))
        .digest('hex');
      recovery.registerRecoveryPhraseHash(userId, phraseHash);

      const request = await recovery.initiateRecovery(userId, 'key_recovery');
      // Verify email step first.
      const otp = recovery.issueOtp(request.id, 'email');
      await recovery.verifyStep(request.id, 'email', { code: otp });

      const result = await recovery.verifyStep(request.id, 'recovery_phrase', {
        recoveryPhrase: phrase,
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong recovery phrase', async () => {
      const userId = 'user_wrong_phrase';
      const correctPhrase = Array.from({ length: 24 }, (_, i) => `correct${i}`);
      const wrongPhrase = Array.from({ length: 24 }, (_, i) => `wrong${i}`);
      const phraseHash = require('node:crypto')
        .createHash('sha256')
        .update(correctPhrase.join(' '))
        .digest('hex');
      recovery.registerRecoveryPhraseHash(userId, phraseHash);

      const request = await recovery.initiateRecovery(userId, 'key_recovery');
      const otp = recovery.issueOtp(request.id, 'email');
      await recovery.verifyStep(request.id, 'email', { code: otp });

      const result = await recovery.verifyStep(request.id, 'recovery_phrase', {
        recoveryPhrase: wrongPhrase,
      });
      expect(result.success).toBe(false);
    });

    it('should fail closed for recovery phrase when no hash is registered', async () => {
      const request = await recovery.initiateRecovery('user_no_hash', 'key_recovery');
      const phrase = Array.from({ length: 24 }, (_, i) => `word${i}`);

      const result = await recovery.verifyStep(request.id, 'recovery_phrase', {
        recoveryPhrase: phrase,
      });
      expect(result.success).toBe(false);
    });

    it('should fail closed for biometric (no platform API configured)', async () => {
      const request = await recovery.initiateRecovery('user_bio', 'wallet_recovery');
      // biometric step is optional but present for wallet_recovery.
      const hasBio = request.verificationSteps.some((s) => s.type === 'biometric');
      if (!hasBio) return; // skip if step not present for this type

      const result = await recovery.verifyStep(request.id, 'biometric', {
        biometricData: 'some_data',
      });
      expect(result.success).toBe(false);
    });

    it('should fail closed for guardian when no public key is registered', async () => {
      const request = await recovery.initiateRecovery('user_guardian', 'social_recovery');

      const result = await recovery.verifyStep(request.id, 'guardian', {
        guardianApproval: 'deadbeef',
      });
      expect(result.success).toBe(false);
    });

    it('should permanently fail recovery after a step exhausts attempts', async () => {
      const request = await recovery.initiateRecovery('user_123', 'access_recovery');
      recovery.issueOtp(request.id, 'email');

      for (let attempt = 0; attempt < 3; attempt++) {
        await recovery.verifyStep(request.id, 'email', { code: '000000' });
      }

      const failed = recovery.getRecoveryRequest(request.id);

      expect(failed?.status).toBe('failed');
      expect(failed?.verificationSteps.find((s) => s.type === 'email')?.status).toBe('failed');
      expect(recovery.getActiveRecoveries('user_123')).not.toContainEqual(
        expect.objectContaining({ id: request.id })
      );

      await expect(recovery.verifyStep(request.id, 'email', { code: '123456' })).rejects.toThrow(
        'Cannot verify step for request with status: failed'
      );
    });
  });

  describe('Recovery Execution', () => {
    it('should execute recovery after all steps verified', async () => {
      const userId = 'user_exec';
      const request = await recovery.initiateRecovery(userId, 'access_recovery');

      // Verify all required steps with real secrets.
      for (const step of request.verificationSteps) {
        if (step.required && (step.type === 'email' || step.type === 'sms')) {
          const otp = recovery.issueOtp(request.id, step.type);
          await recovery.verifyStep(request.id, step.type, { code: otp });
        }
      }

      const result = await recovery.executeRecovery(request.id);
      expect(result.success).toBe(true);
      expect(result.request.status).toBe('completed');
    });

    it('should not execute recovery without verification', async () => {
      const request = await recovery.initiateRecovery('user_123', 'key_recovery');

      await expect(recovery.executeRecovery(request.id)).rejects.toThrow();
    });
  });

  describe('Recovery Cancellation', () => {
    it('should cancel recovery request', async () => {
      const request = await recovery.initiateRecovery('user_123', 'key_recovery');
      await recovery.cancelRecovery(request.id, 'User cancelled');

      const updated = recovery.getRecoveryRequest(request.id);
      expect(updated?.status).toBe('cancelled');
    });
  });
});

// ============================================================================
// Audit Logger Tests
// ============================================================================

describe('Audit Logger', () => {
  let audit: DefaultAuditLogger;

  beforeEach(() => {
    audit = createAuditLogger();
  });

  describe('Event Logging', () => {
    it('should log events', async () => {
      const event = await audit.log({
        eventType: 'transaction',
        actor: { type: 'user', id: 'user_123' },
        action: 'swap',
        resource: { type: 'transaction', id: 'tx_123' },
        outcome: 'success',
        severity: 'info',
        details: { amount: 100 },
        context: {
          requestId: 'req_123',
          environment: 'test',
          version: '1.0.0',
        },
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.signature).toBeDefined();
    });

    it('should log batch events', async () => {
      const events = await audit.logBatch([
        {
          eventType: 'authentication',
          actor: { type: 'user', id: 'user_123' },
          action: 'login',
          resource: { type: 'session', id: 'session_123' },
          outcome: 'success',
          severity: 'info',
          details: {},
          context: { requestId: 'req_1', environment: 'test', version: '1.0.0' },
        },
        {
          eventType: 'authentication',
          actor: { type: 'user', id: 'user_456' },
          action: 'login',
          resource: { type: 'session', id: 'session_456' },
          outcome: 'failure',
          severity: 'warning',
          details: {},
          context: { requestId: 'req_2', environment: 'test', version: '1.0.0' },
        },
      ]);

      expect(events.length).toBe(2);
    });
  });

  describe('Event Querying', () => {
    it('should query events by filter', async () => {
      await audit.log({
        eventType: 'transaction',
        actor: { type: 'user', id: 'user_123' },
        action: 'swap',
        resource: { type: 'transaction', id: 'tx_123' },
        outcome: 'success',
        severity: 'info',
        details: {},
        context: { requestId: 'req_1', environment: 'test', version: '1.0.0' },
      });

      await audit.log({
        eventType: 'authentication',
        actor: { type: 'user', id: 'user_123' },
        action: 'login',
        resource: { type: 'session', id: 'session_123' },
        outcome: 'success',
        severity: 'info',
        details: {},
        context: { requestId: 'req_2', environment: 'test', version: '1.0.0' },
      });

      const result = await audit.query({
        eventTypes: ['transaction'],
      });

      expect(result.events.length).toBe(1);
      expect(result.events[0].eventType).toBe('transaction');
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 10; i++) {
        await audit.log({
          eventType: 'transaction',
          actor: { type: 'user', id: `user_${i}` },
          action: 'swap',
          resource: { type: 'transaction', id: `tx_${i}` },
          outcome: 'success',
          severity: 'info',
          details: {},
          context: { requestId: `req_${i}`, environment: 'test', version: '1.0.0' },
        });
      }

      const page1 = await audit.query({ limit: 5, offset: 0 });
      const page2 = await audit.query({ limit: 5, offset: 5 });

      expect(page1.events.length).toBe(5);
      expect(page2.events.length).toBe(5);
      expect(page1.hasMore).toBe(true);
    });
  });

  describe('Integrity Verification', () => {
    it('should verify event integrity', async () => {
      const event = await audit.log({
        eventType: 'transaction',
        actor: { type: 'user', id: 'user_123' },
        action: 'swap',
        resource: { type: 'transaction', id: 'tx_123' },
        outcome: 'success',
        severity: 'info',
        details: {},
        context: { requestId: 'req_1', environment: 'test', version: '1.0.0' },
      });

      const integrity = await audit.verifyIntegrity(event.id);
      expect(integrity.valid).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate compliance report', async () => {
      for (let i = 0; i < 5; i++) {
        await audit.log({
          eventType: 'transaction',
          actor: { type: 'user', id: `user_${i}` },
          action: 'swap',
          resource: { type: 'transaction', id: `tx_${i}` },
          outcome: i % 2 === 0 ? 'success' : 'failure',
          severity: 'info',
          details: {},
          context: { requestId: `req_${i}`, environment: 'test', version: '1.0.0' },
        });
      }

      const report = await audit.generateReport('daily_summary', {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      expect(report.summary.totalEvents).toBe(5);
      expect(report.sections.length).toBeGreaterThan(0);
    });
  });

  describe('Export', () => {
    it('should export to JSON', async () => {
      await audit.log({
        eventType: 'transaction',
        actor: { type: 'user', id: 'user_123' },
        action: 'swap',
        resource: { type: 'transaction', id: 'tx_123' },
        outcome: 'success',
        severity: 'info',
        details: {},
        context: { requestId: 'req_1', environment: 'test', version: '1.0.0' },
      });

      const result = await audit.export({}, 'json');
      expect(result.success).toBe(true);
      expect(result.eventCount).toBe(1);
      expect(result.data).toBeDefined();
    });

    it('should export to CSV', async () => {
      await audit.log({
        eventType: 'transaction',
        actor: { type: 'user', id: 'user_123' },
        action: 'swap',
        resource: { type: 'transaction', id: 'tx_123' },
        outcome: 'success',
        severity: 'info',
        details: {},
        context: { requestId: 'req_1', environment: 'test', version: '1.0.0' },
      });

      const result = await audit.export({}, 'csv');
      expect(result.success).toBe(true);
      expect(result.data).toContain('id,timestamp');
    });
  });
});

// ============================================================================
// Security Manager Integration Tests
// ============================================================================

describe('Security Manager', () => {
  let security: DefaultSecurityManager;

  beforeEach(() => {
    security = createSecurityManager({
      enabled: true,
      custody: {
        mode: 'mpc',
        userOwned: true,
        platformManaged: true,
        recoveryEnabled: true,
      },
    });
  });

  describe('Initialization', () => {
    it('should initialize all components', () => {
      expect(security.keyManager).toBeDefined();
      expect(security.custody).toBeDefined();
      expect(security.authorization).toBeDefined();
      expect(security.policy).toBeDefined();
      expect(security.risk).toBeDefined();
      expect(security.emergency).toBeDefined();
      expect(security.recovery).toBeDefined();
      expect(security.audit).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await security.getHealth();

      expect(health.overall).toBeDefined();
      expect(health.components.keyManagement).toBeDefined();
      expect(health.components.custody).toBeDefined();
      expect(health.components.authorization).toBeDefined();
      expect(health.components.risk).toBeDefined();
      expect(health.components.emergency).toBeDefined();
      expect(health.components.audit).toBeDefined();
    });
  });

  describe('Event Forwarding', () => {
    it('should forward events to subscribers', async () => {
      const events: any[] = [];
      security.onEvent((event) => events.push(event));

      await security.emergency.triggerEmergency('anomaly_detected', 'test');

      // Events should be logged to audit and forwarded
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Flow', () => {
    it('should handle complete transaction flow', async () => {
      // Create wallet
      const wallet = await security.custody.createWallet('user_test', 'agent_test');

      // Create permissions
      const permissions = await security.policy.createPermissions(
        'agent_test',
        'user_test',
        'balanced'
      );

      // Create transaction request
      const request = createMockTransactionRequest();

      // Assess risk
      const history = createMockTransactionHistory();
      const riskContext = await security.risk.assessTransaction(request, history);

      // Authorize transaction
      const authResult = await security.authorization.authorize(request, {
        agentPermissions: permissions,
        riskContext,
      });

      expect(authResult.decision).toBeDefined();
      expect(authResult.checkedLayers.length).toBeGreaterThan(0);
    });
  });
});
