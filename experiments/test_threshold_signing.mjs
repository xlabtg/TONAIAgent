/**
 * Experiment: Test threshold EdDSA signing using Shamir's Secret Sharing
 * over the ed25519 curve order, using @noble/curves.
 *
 * This validates the core cryptographic approach before integrating it
 * into the production MPCCoordinator.
 */
import {ed25519} from '@noble/curves/ed25519.js';
import {mod, invert} from '@noble/curves/abstract/modular.js';
import {sha512} from '@noble/hashes/sha2.js';

// ed25519 group order
const l = BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989');

function bytesToHex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

function bigintToBytes32LE(n) {
  const buf = new Uint8Array(32);
  let tmp = mod(n, l);
  for (let i = 0; i < 32; i++) { buf[i] = Number(tmp & 0xffn); tmp >>= 8n; }
  return buf;
}

function randomScalar() {
  const bytes = ed25519.utils.randomSecretKey();
  let n = 0n;
  for (let i = 31; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  n = mod(n, l - 1n) + 1n;
  return n;
}

function shamirShare(secret, totalShares, threshold) {
  const coefficients = [mod(secret, l)];
  for (let i = 1; i < threshold; i++) {
    coefficients.push(randomScalar());
  }
  const shares = [];
  for (let i = 1; i <= totalShares; i++) {
    const x = BigInt(i);
    let y = 0n;
    for (let j = 0; j < coefficients.length; j++) {
      y = mod(y + coefficients[j] * mod(x ** BigInt(j), l), l);
    }
    shares.push({ x, y });
  }
  return shares;
}

// Lagrange coefficient for party xi given the set of participant x-coords
function lagrangeCoeff(xi, participantXs) {
  let num = 1n, den = 1n;
  for (const xj of participantXs) {
    if (xj === xi) continue;
    num = mod(num * (0n - xj), l);
    den = mod(den * (xi - xj), l);
  }
  return mod(num * invert(den, l), l);
}

/**
 * Threshold EdDSA signing protocol (simplified FROST-like).
 */
async function thresholdSign(message, keyShares, publicKey, participantIndices) {
  const G = ed25519.Point.BASE;
  const participantXs = participantIndices.map(BigInt);

  // Step 1: Each participant generates a nonce
  const nonces = participantIndices.map(() => randomScalar());

  // Step 2: Each participant computes R_i = r_i * G and aggregates R
  const Ri = nonces.map(r => G.multiply(r));
  let R = Ri[0];
  for (let i = 1; i < Ri.length; i++) R = R.add(Ri[i]);
  const RBytes = R.toBytes();

  // Step 3: Compute challenge hash h = SHA512(R || pubKey || message) mod l
  const msgBytes = typeof message === 'string' ? Buffer.from(message) : message;
  const hashInput = new Uint8Array(RBytes.length + publicKey.length + msgBytes.length);
  hashInput.set(RBytes, 0);
  hashInput.set(publicKey, RBytes.length);
  hashInput.set(msgBytes, RBytes.length + publicKey.length);

  const hBytes = sha512(hashInput);
  let h = 0n;
  for (let i = 63; i >= 0; i--) h = (h << 8n) | BigInt(hBytes[i]);
  h = mod(h, l);

  // Step 4: Each participant computes partial signature
  const partialSigs = participantIndices.map((idx, i) => {
    const lambda = lagrangeCoeff(BigInt(idx), participantXs);
    const shareY = keyShares.find(s => s.x === BigInt(idx)).y;
    return mod(nonces[i] + mod(h * mod(lambda * shareY, l), l), l);
  });

  // Step 5: Aggregate S = sum(partial_s_i) mod l
  let S = 0n;
  for (const ps of partialSigs) S = mod(S + ps, l);

  // Step 6: Encode as standard Ed25519 signature (R || S)
  const sig = new Uint8Array(64);
  sig.set(RBytes, 0);
  sig.set(bigintToBytes32LE(S), 32);

  return sig;
}

async function main() {
  console.log('=== Threshold EdDSA (2-of-3) Signing Test ===\n');

  const sk = ed25519.utils.randomSecretKey();
  const ext = ed25519.utils.getExtendedPublicKey(sk);
  const a = ext.scalar;
  const pubKey = ed25519.getPublicKey(sk);

  console.log('Public key:', bytesToHex(pubKey));

  const shares = shamirShare(a, 3, 2);
  console.log('Generated', shares.length, 'shares with threshold 2');

  const message = Buffer.from('test message for TON blockchain transaction');

  const sig12 = await thresholdSign(message, shares, pubKey, [1, 2]);
  const valid12 = ed25519.verify(sig12, message, pubKey);
  console.log('\nSign with parties {1,2}:', valid12 ? 'VALID' : 'INVALID');

  const sig13 = await thresholdSign(message, shares, pubKey, [1, 3]);
  const valid13 = ed25519.verify(sig13, message, pubKey);
  console.log('Sign with parties {1,3}:', valid13 ? 'VALID' : 'INVALID');

  const sig23 = await thresholdSign(message, shares, pubKey, [2, 3]);
  const valid23 = ed25519.verify(sig23, message, pubKey);
  console.log('Sign with parties {2,3}:', valid23 ? 'VALID' : 'INVALID');

  const wrongMsg = Buffer.from('wrong message');
  const badValid = ed25519.verify(sig12, wrongMsg, pubKey);
  console.log('\nWrong message verify (should be false):', badValid);

  const normalSig = ed25519.sign(message, sk);
  const normalValid = ed25519.verify(normalSig, message, pubKey);
  console.log('Normal ed25519 sig valid:', normalValid);

  const allValid = valid12 && valid13 && valid23 && !badValid && normalValid;
  console.log('\n=== Result:', allValid ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED', '===');
}

main().catch(console.error);
