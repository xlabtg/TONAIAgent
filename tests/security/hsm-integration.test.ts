/**
 * TONAIAgent - HSM Integration Tests
 *
 * Tests the HSMKeyStorage class against:
 *   - MockHSMAdapter   (in-process, no external services — always runs in CI)
 *   - AwsKmsAdapter    (skipped unless AWS_KMS_TEST=true + real credentials)
 *   - AzureKeyVaultAdapter (skipped unless AZURE_KV_TEST=true + real credentials)
 *
 * The mock adapter uses real node:crypto operations so that signatures produced
 * here are genuine and verifiable — we are not just testing stub behaviour.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HSMKeyStorage,
  SoftwareKeyStorage,
  createKeyManager,
} from '../../core/security/key-management';
import type { HSMConfig } from '../../core/security/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockHSMConfig(overrides: Partial<HSMConfig> = {}): HSMConfig {
  return {
    provider: 'mock',
    operationTimeout: 5000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock HSM (always runs)
// ---------------------------------------------------------------------------

describe('HSMKeyStorage — MockHSMAdapter', () => {
  let storage: HSMKeyStorage;

  beforeEach(() => {
    storage = new HSMKeyStorage(makeMockHSMConfig());
  });

  it('has storage type "hsm"', () => {
    expect(storage.type).toBe('hsm');
  });

  it('passes healthCheck', async () => {
    expect(await storage.healthCheck()).toBe(true);
  });

  describe('Ed25519 key lifecycle', () => {
    const keyId = 'test-key-ed25519';

    it('generates a key pair and returns a hex public key', async () => {
      const { publicKey } = await storage.generateKeyPair(keyId, 'ed25519');
      expect(publicKey).toBeTruthy();
      expect(publicKey).toMatch(/^[0-9a-f]+$/i);
    });

    it('getPublicKey returns the same public key after generation', async () => {
      const { publicKey } = await storage.generateKeyPair(keyId + '-get', 'ed25519');
      const retrieved = await storage.getPublicKey(keyId + '-get');
      expect(retrieved).toBe(publicKey);
    });

    it('sign returns a non-empty hex signature', async () => {
      await storage.generateKeyPair(keyId + '-sign', 'ed25519');
      const sig = await storage.sign(keyId + '-sign', 'hello TONAIAgent');
      expect(sig).toBeTruthy();
      expect(sig).toMatch(/^[0-9a-f]+$/i);
    });

    it('verify returns true for a valid signature', async () => {
      const kid = keyId + '-verify';
      await storage.generateKeyPair(kid, 'ed25519');
      const message = 'verify me';
      const sig = await storage.sign(kid, message);
      expect(await storage.verify(kid, message, sig)).toBe(true);
    });

    it('verify returns false for a tampered message', async () => {
      const kid = keyId + '-tamper';
      await storage.generateKeyPair(kid, 'ed25519');
      const sig = await storage.sign(kid, 'original');
      expect(await storage.verify(kid, 'tampered', sig)).toBe(false);
    });

    it('verify returns false for a tampered signature', async () => {
      const kid = keyId + '-badsig';
      await storage.generateKeyPair(kid, 'ed25519');
      const sig = await storage.sign(kid, 'original');
      // Flip one byte in the signature
      const sigBuf = Buffer.from(sig, 'hex');
      sigBuf[0] ^= 0xff;
      expect(await storage.verify(kid, 'original', sigBuf.toString('hex'))).toBe(false);
    });

    it('getPublicKey returns null for unknown key', async () => {
      expect(await storage.getPublicKey('nonexistent-key')).toBeNull();
    });

    it('deleteKey removes the key', async () => {
      const kid = keyId + '-delete';
      await storage.generateKeyPair(kid, 'ed25519');
      expect(await storage.getPublicKey(kid)).not.toBeNull();
      await storage.deleteKey(kid);
      expect(await storage.getPublicKey(kid)).toBeNull();
    });
  });

  describe('secp256k1 key lifecycle', () => {
    const keyId = 'test-key-secp256k1';

    it('generates a key pair', async () => {
      const { publicKey } = await storage.generateKeyPair(keyId, 'secp256k1');
      expect(publicKey).toBeTruthy();
      expect(publicKey).toMatch(/^[0-9a-f]+$/i);
    });

    it('sign and verify round-trip', async () => {
      const kid = keyId + '-rt';
      await storage.generateKeyPair(kid, 'secp256k1');
      const message = 'secp256k1 test message';
      const sig = await storage.sign(kid, message);
      expect(await storage.verify(kid, message, sig)).toBe(true);
    });
  });

  describe('multiple independent keys', () => {
    it('two keys produce different public keys', async () => {
      const { publicKey: pk1 } = await storage.generateKeyPair('key-A', 'ed25519');
      const { publicKey: pk2 } = await storage.generateKeyPair('key-B', 'ed25519');
      expect(pk1).not.toBe(pk2);
    });

    it('signature from key-A does not verify against key-B', async () => {
      await storage.generateKeyPair('x-key-A', 'ed25519');
      await storage.generateKeyPair('x-key-B', 'ed25519');
      const sig = await storage.sign('x-key-A', 'cross test');
      // verify uses the stored public key, so 'x-key-B' will load B's public key
      expect(await storage.verify('x-key-B', 'cross test', sig)).toBe(false);
    });
  });

  describe('supportsAlgorithm capability (mock)', () => {
    it('reports Ed25519 support', () => {
      expect(storage.supportsAlgorithm('ed25519')).toBe(true);
    });

    it('reports secp256k1 support', () => {
      expect(storage.supportsAlgorithm('secp256k1')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// HSMKeyStorage — Ed25519 capability check (issue #332)
// ---------------------------------------------------------------------------

describe('HSMKeyStorage — Ed25519 TON-compatibility guard (#332)', () => {
  it('AWS KMS adapter reports Ed25519 unsupported and secp256k1 supported', () => {
    // Construct storage with aws_kms provider but do not call KMS (no network);
    // we are testing the capability metadata only.
    const storage = new HSMKeyStorage({
      provider: 'aws_kms',
      operationTimeout: 5000,
      awsRegion: 'us-east-1',
    });
    expect(storage.supportsAlgorithm('ed25519')).toBe(false);
    expect(storage.supportsAlgorithm('secp256k1')).toBe(true);
  });

  it('Azure Key Vault adapter reports both algorithms unsupported', () => {
    const storage = new HSMKeyStorage({
      provider: 'azure_hsm',
      operationTimeout: 5000,
      azureKeyVaultUrl: 'https://example.vault.azure.net',
    });
    expect(storage.supportsAlgorithm('ed25519')).toBe(false);
    expect(storage.supportsAlgorithm('secp256k1')).toBe(false);
  });

  it('rejects Ed25519 key generation on AWS KMS at the storage layer', async () => {
    const storage = new HSMKeyStorage({
      provider: 'aws_kms',
      operationTimeout: 5000,
      awsRegion: 'us-east-1',
    });
    await expect(storage.generateKeyPair('ton-key', 'ed25519')).rejects.toThrow(
      /does not support algorithm 'ed25519'/
    );
  });

  it('rejects Ed25519 key generation on Azure Key Vault at the storage layer', async () => {
    const storage = new HSMKeyStorage({
      provider: 'azure_hsm',
      operationTimeout: 5000,
      azureKeyVaultUrl: 'https://example.vault.azure.net',
    });
    await expect(storage.generateKeyPair('ton-key', 'ed25519')).rejects.toThrow(
      /does not support algorithm 'ed25519'/
    );
  });

  it('SecureKeyManager refuses to generate Ed25519 keys on AWS KMS without MPC', async () => {
    const manager = createKeyManager({
      storageType: 'hsm',
      hsm: {
        provider: 'aws_kms',
        operationTimeout: 5000,
        awsRegion: 'us-east-1',
      },
    });

    await expect(
      manager.generateKey('user_ton_blocked', 'signing', { algorithm: 'ed25519' })
    ).rejects.toThrow(/does not natively support 'ed25519'/);
  });

  it('SecureKeyManager allows Ed25519 on AWS KMS when mpcEnabled=true', async () => {
    const manager = createKeyManager({
      storageType: 'hsm',
      hsm: {
        provider: 'aws_kms',
        operationTimeout: 5000,
        awsRegion: 'us-east-1',
      },
    });

    // With MPC enabled, HSM is used for auxiliary storage only; the MPC
    // coordinator produces the Ed25519 signature.
    const key = await manager.generateKey('user_ton_mpc', 'signing', {
      algorithm: 'ed25519',
      mpcEnabled: true,
      mpcConfig: {
        threshold: 2,
        totalShares: 3,
        recoveryEnabled: true,
        recoveryThreshold: 2,
        keyDerivationEnabled: true,
      },
    });

    expect(key.algorithm).toBe('ed25519');
    expect(key.status).toBe('active');
  });

  it('SecureKeyManager allows secp256k1 on AWS KMS (auxiliary key path)', async () => {
    const manager = createKeyManager({
      storageType: 'hsm',
      hsm: {
        provider: 'aws_kms',
        operationTimeout: 5000,
        awsRegion: 'us-east-1',
      },
    });

    // We cannot call a real KMS endpoint in CI, so we only assert that the
    // capability check itself does not reject the request. The downstream
    // network call will fail, which is expected — the guard-layer behavior
    // is the subject under test.
    await expect(
      manager.generateKey('user_secp_ok', 'signing', { algorithm: 'secp256k1' })
    ).rejects.not.toThrow(/does not natively support/);
  });

  it('createSigningRequest refuses Ed25519 on HSM without MPC shares', async () => {
    // Use the mock provider for setup, then swap supportsAlgorithm to simulate
    // a non-Ed25519-capable backend. Easier: use an AWS KMS-configured manager
    // but note the key won't actually have been generated (blocked earlier).
    // Instead, test via a manager where the key exists but MPC is absent.
    //
    // Use MockHSM in a way that pretends it can't do Ed25519 by monkey-patching
    // the exposed method. This is purely a unit-level guard verification.
    const manager = createKeyManager({
      storageType: 'hsm',
      hsm: makeMockHSMConfig(),
    });

    const key = await manager.generateKey('user_sig_guard', 'signing', {
      algorithm: 'ed25519',
    });

    // Simulate the backend losing Ed25519 capability (as would be the case if
    // the key were migrated to an AWS-backed store).
    interface ManagerInternals {
      storage: { supportsAlgorithm: (alg: string) => boolean };
    }
    const mgr = manager as unknown as ManagerInternals;
    const original = mgr.storage.supportsAlgorithm;
    mgr.storage.supportsAlgorithm = (alg: string) => alg !== 'ed25519';

    try {
      await expect(
        manager.createSigningRequest(key.id, 'hello', {})
      ).rejects.toThrow(/no MPC shares are configured/);
    } finally {
      mgr.storage.supportsAlgorithm = original;
    }
  });
});

// ---------------------------------------------------------------------------
// HSMKeyStorage — production guard
// ---------------------------------------------------------------------------

describe('HSMKeyStorage — production guard', () => {
  it('throws when provider=mock and NODE_ENV=production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => new HSMKeyStorage(makeMockHSMConfig())).toThrow(
        /mock provider is not allowed in production/
      );
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('allows mock in production when mockAllowProduction=true', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      // Should not throw
      const s = new HSMKeyStorage(makeMockHSMConfig({ mockAllowProduction: true }));
      expect(s.type).toBe('hsm');
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('throws for unsupported providers', () => {
    expect(
      () => new HSMKeyStorage(makeMockHSMConfig({ provider: 'thales_luna' }))
    ).toThrow(/not yet implemented/);

    expect(
      () => new HSMKeyStorage(makeMockHSMConfig({ provider: 'yubihsm' }))
    ).toThrow(/not yet implemented/);
  });
});

// ---------------------------------------------------------------------------
// SecureKeyManager using HSMKeyStorage (mock) — smoke tests
// ---------------------------------------------------------------------------

describe('SecureKeyManager with HSM storage (mock)', () => {
  it('generates, signs, and gets public key via manager', async () => {
    const manager = createKeyManager({
      storageType: 'hsm',
      hsm: makeMockHSMConfig(),
    });

    const keyMeta = await manager.generateKey('user_hsm_test', 'signing');
    expect(keyMeta.storageType).toBe('hsm');
    expect(keyMeta.status).toBe('active');

    const pubKey = await manager.getPublicKey(keyMeta.id);
    expect(pubKey).toBeTruthy();
  });

  it('rotates a key through HSM storage', async () => {
    const manager = createKeyManager({
      storageType: 'hsm',
      hsm: makeMockHSMConfig(),
    });

    const original = await manager.generateKey('user_rotate_hsm', 'signing');
    const rotated = await manager.rotateKey(original.id);

    expect(rotated.version).toBe(original.version + 1);
    expect(rotated.status).toBe('active');

    const oldMeta = await manager.getKeyMetadata(original.id);
    expect(oldMeta?.status).toBe('rotated');
  });

  it('getHealth reports hsmConnected=true when HSM is healthy', async () => {
    const manager = createKeyManager({
      storageType: 'hsm',
      hsm: makeMockHSMConfig(),
    });

    const health = await manager.getHealth();
    expect(health.hsmConnected).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AWS KMS integration (only runs when AWS_KMS_TEST=true)
// ---------------------------------------------------------------------------

const AWS_KMS_TEST = process.env.AWS_KMS_TEST === 'true';

describe.skipIf(!AWS_KMS_TEST)('HSMKeyStorage — AwsKmsAdapter (real KMS)', () => {
  let storage: HSMKeyStorage;

  beforeEach(() => {
    storage = new HSMKeyStorage({
      provider: 'aws_kms',
      operationTimeout: 30000,
      awsRegion: process.env.AWS_REGION ?? 'us-east-1',
    });
  });

  it('healthCheck returns true with valid credentials', async () => {
    expect(await storage.healthCheck()).toBe(true);
  });

  it('generates a secp256k1 key and retrieves public key', async () => {
    const { publicKey } = await storage.generateKeyPair('ci-test-secp256k1', 'secp256k1');
    expect(publicKey).toBeTruthy();
    const retrieved = await storage.getPublicKey('ci-test-secp256k1');
    expect(retrieved).toBe(publicKey);
  });

  it('sign and verify round-trip', async () => {
    const kid = 'ci-test-sign';
    await storage.generateKeyPair(kid, 'secp256k1');
    const message = 'AWS KMS test message';
    const sig = await storage.sign(kid, message);
    expect(await storage.verify(kid, message, sig)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Azure Key Vault integration (only runs when AZURE_KV_TEST=true)
// ---------------------------------------------------------------------------

const AZURE_KV_TEST = process.env.AZURE_KV_TEST === 'true';

describe.skipIf(!AZURE_KV_TEST)('HSMKeyStorage — AzureKeyVaultAdapter (real Key Vault)', () => {
  let storage: HSMKeyStorage;

  beforeEach(() => {
    storage = new HSMKeyStorage({
      provider: 'azure_hsm',
      operationTimeout: 30000,
      azureKeyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
      azureTenantId: process.env.AZURE_TENANT_ID,
      azureClientId: process.env.AZURE_CLIENT_ID,
      azureClientSecret: process.env.AZURE_CLIENT_SECRET,
    });
  });

  it('healthCheck returns true with valid credentials', async () => {
    expect(await storage.healthCheck()).toBe(true);
  });

  // Note: Azure Key Vault does not natively support Ed25519 (the algorithm
  // TON blockchain requires), nor secp256k1. The capability guard added in
  // issue #332 blocks key generation for both algorithms so that the HSM
  // path cannot silently produce TON-incompatible P-256 signatures.
  // TON signing on Azure-hosted infrastructure must go through MPCCoordinator.
  it('rejects Ed25519 key generation (TON-incompatibility guard)', async () => {
    await expect(
      storage.generateKeyPair('ci-azure-reject-ed25519', 'ed25519')
    ).rejects.toThrow(/does not support algorithm 'ed25519'/);
  });

  it('rejects secp256k1 key generation (Azure does not support it natively)', async () => {
    await expect(
      storage.generateKeyPair('ci-azure-reject-secp256k1', 'secp256k1')
    ).rejects.toThrow(/does not support algorithm 'secp256k1'/);
  });
});
