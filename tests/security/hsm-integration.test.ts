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

  it('generates a P-256 key and retrieves public key', async () => {
    const { publicKey } = await storage.generateKeyPair('ci-azure-test-p256', 'ed25519');
    expect(publicKey).toBeTruthy();
    const retrieved = await storage.getPublicKey('ci-azure-test-p256');
    expect(retrieved).toBe(publicKey);
  });

  it('sign and verify round-trip', async () => {
    const kid = 'ci-azure-test-sign';
    await storage.generateKeyPair(kid, 'ed25519');
    const message = 'Azure Key Vault test message';
    const sig = await storage.sign(kid, message);
    expect(await storage.verify(kid, message, sig)).toBe(true);
  });
});
