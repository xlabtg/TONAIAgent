/**
 * TONAIAgent - MPC Threshold Signing Tests
 *
 * Tests for the real threshold EdDSA (TSS) implementation using
 * Shamir's Secret Sharing over the ed25519 group order.
 *
 * Covers:
 * - DKG (Distributed Key Generation): share generation and public key derivation
 * - Threshold signing: all t-of-n combinations
 * - Signature validity: verified against @noble/curves ed25519
 * - Replay protection: session nonce uniqueness
 * - Error paths: insufficient shares, duplicate partial sigs, unknown sessions
 * - Integration with SecureKeyManager / SoftwareKeyStorage pipeline
 * - MPCCoordinatorV2 (FROST with binding factors): basic correctness check
 *
 * For full attack-resistance tests see: tests/security/mpc-attacks.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import {
  MPCCoordinator,
  createKeyManager,
  SecureKeyManager,
} from '../../core/security/key-management';
import { MPCCoordinatorV2 } from '../../core/security/mpc/coordinator.js';
import type { MPCConfig } from '../../core/security/types';

// ============================================================================
// Test Helpers
// ============================================================================

function make2of3Config(): MPCConfig {
  return {
    threshold: 2,
    totalShares: 3,
    recoveryEnabled: true,
    recoveryThreshold: 2,
    keyDerivationEnabled: true,
  };
}

function make3of5Config(): MPCConfig {
  return {
    threshold: 3,
    totalShares: 5,
    recoveryEnabled: true,
    recoveryThreshold: 3,
    keyDerivationEnabled: true,
  };
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

/** Return all combinations of size k from an array. */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map((c) => [first, ...c]),
    ...combinations(rest, k),
  ];
}

// ============================================================================
// MPCCoordinator Unit Tests
// ============================================================================

describe('MPCCoordinator', () => {
  let coordinator: MPCCoordinator;
  const keyId = 'test_key_001';

  beforeEach(() => {
    coordinator = new MPCCoordinator(make2of3Config());
  });

  // --------------------------------------------------------------------------
  // DKG — Share Generation
  // --------------------------------------------------------------------------

  describe('DKG: generateShares', () => {
    it('should generate the correct number of shares', async () => {
      const shares = await coordinator.generateShares(keyId);
      expect(shares).toHaveLength(3);
    });

    it('should assign 1-based share indices matching Shamir x-coordinates', async () => {
      const shares = await coordinator.generateShares(keyId);
      const indices = shares.map((s) => s.shareIndex);
      expect(indices).toEqual([1, 2, 3]);
    });

    it('should set the correct holderTypes in order', async () => {
      const shares = await coordinator.generateShares(keyId);
      expect(shares[0].holderType).toBe('user');
      expect(shares[1].holderType).toBe('platform');
      expect(shares[2].holderType).toBe('recovery_service');
    });

    it('should store threshold and totalShares on each share', async () => {
      const shares = await coordinator.generateShares(keyId);
      for (const share of shares) {
        expect(share.threshold).toBe(2);
        expect(share.totalShares).toBe(3);
      }
    });

    it('should derive and store a public key for the key', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId);
      expect(pubKeyHex).toBeDefined();
      expect(pubKeyHex).toHaveLength(64); // 32 bytes hex
    });

    it('should produce a valid ed25519 public key', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;
      // ed25519 public keys are 32 bytes; verify length and byte validity
      expect(pubKeyHex).toMatch(/^[0-9a-f]{64}$/i);
      const pubKeyBytes = hexToBytes(pubKeyHex);
      // @noble/curves validates the point when verifying — we'll test via signing
      expect(pubKeyBytes).toHaveLength(32);
    });

    it('should produce unique public keys for different keyIds', async () => {
      await coordinator.generateShares('key_a');
      await coordinator.generateShares('key_b');
      const pkA = coordinator.getPublicKey('key_a');
      const pkB = coordinator.getPublicKey('key_b');
      expect(pkA).not.toBe(pkB);
    });

    it('should store public commitment points on each share (publicData)', async () => {
      const shares = await coordinator.generateShares(keyId);
      for (const share of shares) {
        expect(share.publicData).toBeTruthy();
        // publicData is the share commitment shareIndex*G encoded as 32-byte hex
        expect(share.publicData).toMatch(/^[0-9a-f]+$/i);
      }
    });
  });

  // --------------------------------------------------------------------------
  // getSharesStatus
  // --------------------------------------------------------------------------

  describe('getSharesStatus', () => {
    it('should return null before generateShares is called', () => {
      const status = coordinator.getSharesStatus('nonexistent_key');
      expect(status).toBeNull();
    });

    it('should return correct status after generateShares', async () => {
      await coordinator.generateShares(keyId);
      const status = coordinator.getSharesStatus(keyId);
      expect(status).not.toBeNull();
      expect(status!.totalShares).toBe(3);
      expect(status!.threshold).toBe(2);
      expect(status!.activeShares).toBe(3);
      expect(status!.canSign).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // thresholdSign — Correctness
  // --------------------------------------------------------------------------

  describe('thresholdSign: signature validity', () => {
    const message = Buffer.from('Sign this TON transaction');

    it('should produce a 64-byte (128 hex chars) signature', async () => {
      await coordinator.generateShares(keyId);
      const sig = await coordinator.thresholdSign(keyId, message);
      expect(sig).toHaveLength(128);
    });

    it('should produce a valid Ed25519 signature verifiable by @noble/curves', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;
      const sig = await coordinator.thresholdSign(keyId, message);

      const valid = ed25519.verify(
        hexToBytes(sig),
        new Uint8Array(message),
        hexToBytes(pubKeyHex)
      );
      expect(valid).toBe(true);
    });

    it('should produce a valid signature for a different message', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;
      const msg2 = Buffer.from('Another message');
      const sig = await coordinator.thresholdSign(keyId, msg2);

      const valid = ed25519.verify(
        hexToBytes(sig),
        new Uint8Array(msg2),
        hexToBytes(pubKeyHex)
      );
      expect(valid).toBe(true);
    });

    it('should fail verification against a wrong message', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;
      const sig = await coordinator.thresholdSign(keyId, message);
      const wrongMsg = Buffer.from('Wrong message');

      const valid = ed25519.verify(
        hexToBytes(sig),
        new Uint8Array(wrongMsg),
        hexToBytes(pubKeyHex)
      );
      expect(valid).toBe(false);
    });

    it('should fail verification against a wrong public key', async () => {
      await coordinator.generateShares(keyId);
      await coordinator.generateShares('other_key');
      const wrongPubKeyHex = coordinator.getPublicKey('other_key')!;
      const sig = await coordinator.thresholdSign(keyId, message);

      const valid = ed25519.verify(
        hexToBytes(sig),
        new Uint8Array(message),
        hexToBytes(wrongPubKeyHex)
      );
      expect(valid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // thresholdSign — All t-of-n combinations
  // --------------------------------------------------------------------------

  describe('thresholdSign: 2-of-3 participant combinations', () => {
    it('should produce valid signatures for all 3 combinations of 2 parties', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;
      const message = Buffer.from('TON threshold signing test');

      const allCombinations = combinations([1, 2, 3], 2);
      expect(allCombinations).toHaveLength(3);

      for (const participantIndices of allCombinations) {
        const requestId = `req_${participantIndices.join('_')}`;
        const session = await coordinator.openSigningSession(keyId, requestId, participantIndices);

        for (const idx of session.participantIndices) {
          const shareId = `share_${keyId}_${idx}`;
          await coordinator.computeAndCollectPartialSignature(
            requestId,
            shareId,
            message,
            pubKeyHex
          );
        }

        const sig = await coordinator.combineSignatures(requestId);
        coordinator.clearSignatures(requestId);

        expect(sig).not.toBeNull();
        const valid = ed25519.verify(
          hexToBytes(sig!),
          new Uint8Array(message),
          hexToBytes(pubKeyHex)
        );
        expect(valid).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // thresholdSign — 3-of-5 threshold
  // --------------------------------------------------------------------------

  describe('thresholdSign: 3-of-5', () => {
    let coordinator35: MPCCoordinator;
    const keyId35 = 'key_3of5';

    beforeEach(async () => {
      coordinator35 = new MPCCoordinator(make3of5Config());
      await coordinator35.generateShares(keyId35);
    });

    it('should generate 5 shares', () => {
      const status = coordinator35.getSharesStatus(keyId35);
      expect(status!.totalShares).toBe(5);
      expect(status!.threshold).toBe(3);
    });

    it('should sign successfully with any 3-of-5 parties', async () => {
      const pubKeyHex = coordinator35.getPublicKey(keyId35)!;
      const message = Buffer.from('3-of-5 threshold test');

      // Test a sample of combinations (all 10 would be thorough; we test 4 representative ones)
      const selectedCombinations = [
        [1, 2, 3],
        [1, 2, 4],
        [2, 4, 5],
        [1, 3, 5],
      ];

      for (const participantIndices of selectedCombinations) {
        const requestId = `req35_${participantIndices.join('_')}`;
        const session = await coordinator35.openSigningSession(keyId35, requestId, participantIndices);

        for (const idx of session.participantIndices) {
          const shareId = `share_${keyId35}_${idx}`;
          await coordinator35.computeAndCollectPartialSignature(
            requestId,
            shareId,
            message,
            pubKeyHex
          );
        }

        const sig = await coordinator35.combineSignatures(requestId);
        coordinator35.clearSignatures(requestId);

        expect(sig).not.toBeNull();
        const valid = ed25519.verify(
          hexToBytes(sig!),
          new Uint8Array(message),
          hexToBytes(pubKeyHex)
        );
        expect(valid).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Replay Protection
  // --------------------------------------------------------------------------

  describe('Replay protection', () => {
    it('should assign unique session nonces to each signing session', async () => {
      await coordinator.generateShares(keyId);
      const session1 = await coordinator.openSigningSession(keyId, 'req_1');
      // Clear to allow opening another session
      coordinator.clearSignatures('req_1');
      const session2 = await coordinator.openSigningSession(keyId, 'req_2');
      coordinator.clearSignatures('req_2');

      expect(session1.sessionNonce).not.toBe(session2.sessionNonce);
    });

    it('should reject opening a session that is already open', async () => {
      await coordinator.generateShares(keyId);
      await coordinator.openSigningSession(keyId, 'req_dup');

      await expect(coordinator.openSigningSession(keyId, 'req_dup')).rejects.toThrow(
        /already open/
      );

      coordinator.clearSignatures('req_dup');
    });

    it('should allow re-opening a session after clearSignatures', async () => {
      await coordinator.generateShares(keyId);
      await coordinator.openSigningSession(keyId, 'req_reuse');
      coordinator.clearSignatures('req_reuse');

      // Should not throw
      await expect(coordinator.openSigningSession(keyId, 'req_reuse')).resolves.toBeTruthy();
      coordinator.clearSignatures('req_reuse');
    });
  });

  // --------------------------------------------------------------------------
  // Error Paths
  // --------------------------------------------------------------------------

  describe('Error paths', () => {
    it('should throw when computing partial sig for an unknown session', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;

      await expect(
        coordinator.computeAndCollectPartialSignature(
          'nonexistent_session',
          `share_${keyId}_1`,
          Buffer.from('msg'),
          pubKeyHex
        )
      ).rejects.toThrow(/No active signing session/);
    });

    it('should throw when share is not a participant in the session', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;

      // Open session with parties 1 and 2 only
      await coordinator.openSigningSession(keyId, 'req_wrong_share', [1, 2]);

      await expect(
        coordinator.computeAndCollectPartialSignature(
          'req_wrong_share',
          `share_${keyId}_3`, // party 3 is not participating
          Buffer.from('msg'),
          pubKeyHex
        )
      ).rejects.toThrow(/not a participant/);

      coordinator.clearSignatures('req_wrong_share');
    });

    it('should throw when adding duplicate partial signature for same share', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;

      await coordinator.openSigningSession(keyId, 'req_dup_sig', [1, 2]);

      await coordinator.computeAndCollectPartialSignature(
        'req_dup_sig',
        `share_${keyId}_1`,
        Buffer.from('msg'),
        pubKeyHex
      );

      await expect(
        coordinator.computeAndCollectPartialSignature(
          'req_dup_sig',
          `share_${keyId}_1`, // same share again
          Buffer.from('msg'),
          pubKeyHex
        )
      ).rejects.toThrow(/already collected/);

      coordinator.clearSignatures('req_dup_sig');
    });

    it('should return null from combineSignatures when threshold not met', async () => {
      await coordinator.generateShares(keyId);
      const pubKeyHex = coordinator.getPublicKey(keyId)!;

      await coordinator.openSigningSession(keyId, 'req_incomplete', [1, 2]);

      // Only one partial sig (threshold = 2)
      await coordinator.computeAndCollectPartialSignature(
        'req_incomplete',
        `share_${keyId}_1`,
        Buffer.from('msg'),
        pubKeyHex
      );

      const sig = await coordinator.combineSignatures('req_incomplete');
      expect(sig).toBeNull();

      coordinator.clearSignatures('req_incomplete');
    });

    it('should throw when opening a session for an unknown keyId', async () => {
      await expect(
        coordinator.openSigningSession('nonexistent_key', 'req_x')
      ).rejects.toThrow(/No Shamir shares found/);
    });

    it('should throw when thresholdSign is called before generateShares', async () => {
      await expect(
        coordinator.thresholdSign('no_such_key', Buffer.from('msg'))
      ).rejects.toThrow(/Public key not found/);
    });
  });

  // --------------------------------------------------------------------------
  // verifyThresholdSignature
  // --------------------------------------------------------------------------

  describe('verifyThresholdSignature', () => {
    it('should verify a valid threshold signature', async () => {
      await coordinator.generateShares(keyId);
      const message = Buffer.from('verify me');
      const sig = await coordinator.thresholdSign(keyId, message);

      const valid = coordinator.verifyThresholdSignature(keyId, message, sig);
      expect(valid).toBe(true);
    });

    it('should reject a tampered signature', async () => {
      await coordinator.generateShares(keyId);
      const message = Buffer.from('verify me');
      const sig = await coordinator.thresholdSign(keyId, message);

      // Flip one byte in the middle of the signature
      const sigBytes = Buffer.from(sig, 'hex');
      sigBytes[32] ^= 0xff;
      const tamperedSig = sigBytes.toString('hex');

      const valid = coordinator.verifyThresholdSignature(keyId, message, tamperedSig);
      expect(valid).toBe(false);
    });

    it('should return false for an unknown keyId', () => {
      const valid = coordinator.verifyThresholdSignature('unknown_key', Buffer.from('msg'), 'a'.repeat(128));
      expect(valid).toBe(false);
    });
  });
});

// ============================================================================
// Integration: SecureKeyManager + MPCCoordinator
// ============================================================================

describe('SecureKeyManager: MPC key generation and signing', () => {
  let keyManager: SecureKeyManager;

  beforeEach(() => {
    keyManager = createKeyManager({
      mpc: { threshold: 2, totalShares: 3 },
    });
  });

  it('should generate MPC shares via generateMPCShares', async () => {
    const key = await keyManager.generateKey('user_mpc', 'master');
    const shares = await keyManager.generateMPCShares(key.id, {
      threshold: 2,
      totalShares: 3,
      recoveryEnabled: true,
      recoveryThreshold: 2,
      keyDerivationEnabled: true,
    });

    expect(shares).toHaveLength(3);
    expect(shares[0].holderType).toBe('user');
    expect(shares[1].holderType).toBe('platform');
    expect(shares[2].holderType).toBe('recovery_service');
  });

  it('should report MPC status correctly after share generation', async () => {
    const key = await keyManager.generateKey('user_mpc2', 'master');
    await keyManager.generateMPCShares(key.id, {
      threshold: 2,
      totalShares: 3,
      recoveryEnabled: true,
      recoveryThreshold: 2,
      keyDerivationEnabled: true,
    });

    const status = await keyManager.getMPCSharesStatus(key.id);
    expect(status.totalShares).toBe(3);
    expect(status.threshold).toBe(2);
    expect(status.canSign).toBe(true);
  });
});

// ============================================================================
// Cryptographic Property Tests
// ============================================================================

describe('Threshold EdDSA cryptographic properties', () => {
  it('should produce different signatures for the same message (non-deterministic nonces)', async () => {
    const coordinator = new MPCCoordinator(make2of3Config());
    const keyId = 'prop_key';
    await coordinator.generateShares(keyId);
    const message = Buffer.from('same message');

    const sig1 = await coordinator.thresholdSign(keyId, message, 'req_p1');
    const sig2 = await coordinator.thresholdSign(keyId, message, 'req_p2');

    // With fresh random nonces, R will differ between sessions
    expect(sig1).not.toBe(sig2);
  });

  it('should produce valid signatures for binary message data', async () => {
    const coordinator = new MPCCoordinator(make2of3Config());
    const keyId = 'binary_key';
    await coordinator.generateShares(keyId);
    const pubKeyHex = coordinator.getPublicKey(keyId)!;

    // Simulate a TON transaction payload
    const binaryMsg = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03]);
    const sig = await coordinator.thresholdSign(keyId, binaryMsg);

    const valid = ed25519.verify(
      hexToBytes(sig),
      binaryMsg,
      hexToBytes(pubKeyHex)
    );
    expect(valid).toBe(true);
  });

  it('should produce valid signatures for empty message', async () => {
    const coordinator = new MPCCoordinator(make2of3Config());
    const keyId = 'empty_msg_key';
    await coordinator.generateShares(keyId);
    const pubKeyHex = coordinator.getPublicKey(keyId)!;

    const emptyMsg = new Uint8Array(0);
    const sig = await coordinator.thresholdSign(keyId, emptyMsg);

    const valid = ed25519.verify(hexToBytes(sig), emptyMsg, hexToBytes(pubKeyHex));
    expect(valid).toBe(true);
  });

  it('should produce consistent public key between DKG runs on different keyIds', async () => {
    const coordinator = new MPCCoordinator(make2of3Config());
    const results: string[] = [];

    for (let i = 0; i < 5; i++) {
      const kid = `consistency_key_${i}`;
      await coordinator.generateShares(kid);
      const pk = coordinator.getPublicKey(kid)!;
      results.push(pk);
    }

    // All public keys should be distinct (fresh key material each time)
    const unique = new Set(results);
    expect(unique.size).toBe(5);
  });
});

// ============================================================================
// MPCCoordinatorV2 — Basic correctness (FROST with binding factors)
// Full attack-resistance tests: tests/security/mpc-attacks.test.ts
// ============================================================================

describe('MPCCoordinatorV2: basic correctness', () => {
  const keyId = 'v2_basic_key';

  it('should generate shares and produce a valid Ed25519 signature', async () => {
    const coord = new MPCCoordinatorV2(make2of3Config());
    await coord.generateShares(keyId);
    const pubKeyHex = coord.getPublicKey(keyId)!;
    expect(pubKeyHex).toHaveLength(64);

    const message = Buffer.from('MPCCoordinatorV2 test');
    const sig = await coord.thresholdSign(keyId, message, 'v2_req_1');

    expect(sig).toHaveLength(128); // 64-byte Ed25519 signature
    const valid = ed25519.verify(
      new Uint8Array(Buffer.from(sig, 'hex')),
      new Uint8Array(message),
      new Uint8Array(Buffer.from(pubKeyHex, 'hex'))
    );
    expect(valid).toBe(true);
  });

  it('should verify using verifyThresholdSignature helper', async () => {
    const coord = new MPCCoordinatorV2(make2of3Config());
    await coord.generateShares(keyId + '_verify');
    const message = Buffer.from('verify v2');

    const sig = await coord.thresholdSign(keyId + '_verify', message, 'v2_verify_req');
    expect(coord.verifyThresholdSignature(keyId + '_verify', message, sig)).toBe(true);
  });

  it('should produce different signatures for same message (fresh nonces)', async () => {
    const coord = new MPCCoordinatorV2(make2of3Config());
    await coord.generateShares(keyId + '_fresh');
    const message = Buffer.from('same message v2');

    const sig1 = await coord.thresholdSign(keyId + '_fresh', message, 'v2_fresh_1');
    const sig2 = await coord.thresholdSign(keyId + '_fresh', message, 'v2_fresh_2');

    // R bytes (first 32 bytes / 64 hex chars) must differ across sessions
    expect(sig1.slice(0, 64)).not.toBe(sig2.slice(0, 64));
  });
});
