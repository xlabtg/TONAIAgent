/**
 * AWS KMS adapter — now backed by a persistent KeyRegistry.
 *
 * Previously the keyId → KMS ARN mapping was held in an in-memory Map that
 * was destroyed on process restart.  It now delegates to a KeyRegistry
 * implementation (memory / file / postgres) so the mapping survives restarts.
 * See issue #343 and core/security/hsm/registry/key-registry.ts.
 */

import type { HSMConfig } from '../types.js';
import type { KeyRegistry } from './registry/key-registry.js';
import { buildRegistry } from './registry/index.js';

export interface HSMProviderAdapter {
  generateKeyPair(keyId: string, algorithm: 'ed25519' | 'secp256k1'): Promise<{ publicKey: string }>;
  sign(keyId: string, message: Buffer): Promise<Buffer>;
  getPublicKey(keyId: string): Promise<Buffer | null>;
  deleteKey(keyId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
  supportsAlgorithm(algorithm: 'ed25519' | 'secp256k1'): boolean;
}

async function loadOptionalSdk(
  moduleName: string,
  installHint: string
): Promise<Record<string, unknown>> {
  try {
    const mod = (await (new Function('m', 'return import(m)')(moduleName))) as Record<string, unknown>;
    return mod;
  } catch {
    throw new Error(`${moduleName} is required. Install it with: ${installHint}`);
  }
}

/**
 * AWS KMS adapter.
 *
 * Key type mapping:
 *   ed25519   → ECC_NIST_P256 (blocked by capability guard; see supportsAlgorithm)
 *   secp256k1 → ECC_SECG_P256K1 / ECDSA_SHA_256 (native KMS support)
 */
export class AwsKmsAdapter implements HSMProviderAdapter {
  private readonly registry: KeyRegistry;
  private kmsClient: unknown = null;

  constructor(private readonly config: HSMConfig, registry?: KeyRegistry) {
    this.registry = registry ?? buildRegistry(config.registryType);
  }

  private async loadSdk(): Promise<Record<string, unknown>> {
    return loadOptionalSdk('@aws-sdk/client-kms', 'npm install @aws-sdk/client-kms');
  }

  private async getClient(): Promise<{ send: (cmd: unknown) => Promise<unknown> }> {
    if (this.kmsClient) return this.kmsClient as { send: (cmd: unknown) => Promise<unknown> };

    const sdk = await this.loadSdk();
    const KMSClient = sdk.KMSClient as new (cfg: Record<string, unknown>) => {
      send: (cmd: unknown) => Promise<unknown>;
    };

    const clientConfig: Record<string, unknown> = {
      region: this.config.awsRegion ?? process.env.AWS_REGION ?? 'us-east-1',
    };

    if (this.config.awsKmsEndpoint) clientConfig.endpoint = this.config.awsKmsEndpoint;

    if (this.config.awsAccessKeyId && this.config.awsSecretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey,
        sessionToken: this.config.awsSessionToken,
      };
    }

    this.kmsClient = new KMSClient(clientConfig);
    return this.kmsClient as { send: (cmd: unknown) => Promise<unknown> };
  }

  async generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
    const CreateKeyCommand = sdk.CreateKeyCommand as new (input: Record<string, unknown>) => unknown;
    const GetPublicKeyCommand = sdk.GetPublicKeyCommand as new (
      input: Record<string, unknown>
    ) => unknown;

    const keySpec = algorithm === 'secp256k1' ? 'ECC_SECG_P256K1' : 'ECC_NIST_P256';

    const createResp = (await client.send(
      new CreateKeyCommand({
        KeySpec: keySpec,
        KeyUsage: 'SIGN_VERIFY',
        Description: `TONAIAgent key: ${keyId}`,
        Tags: [
          { TagKey: 'tonaiagent:keyId', TagValue: keyId },
          { TagKey: 'tonaiagent:algorithm', TagValue: algorithm },
        ],
      })
    )) as { KeyMetadata?: { KeyId?: string; Arn?: string } };

    const keyArn = createResp.KeyMetadata?.Arn;
    if (!keyArn) throw new Error(`AWS KMS: failed to create key for keyId=${keyId}`);

    // Persist the ARN atomically before fetching the public key so that a
    // crash between create and public-key-fetch leaves a recoverable entry.
    await this.registry.put({
      keyId,
      providerRef: keyArn,
      provider: 'aws_kms',
      createdAt: new Date(),
    });

    const pubResp = (await client.send(
      new GetPublicKeyCommand({ KeyId: keyArn })
    )) as { PublicKey?: Uint8Array };

    if (!pubResp.PublicKey)
      throw new Error(`AWS KMS: could not retrieve public key for keyId=${keyId}`);

    return { publicKey: Buffer.from(pubResp.PublicKey).toString('hex') };
  }

  async sign(keyId: string, message: Buffer): Promise<Buffer> {
    const entry = await this.registry.get(keyId);
    if (!entry)
      throw new Error(
        `AWS KMS: unknown keyId=${keyId}. Was it generated via this adapter?`
      );

    const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
    const SignCommand = sdk.SignCommand as new (input: Record<string, unknown>) => unknown;

    const resp = (await client.send(
      new SignCommand({
        KeyId: entry.providerRef,
        Message: message,
        MessageType: 'RAW',
        SigningAlgorithm: 'ECDSA_SHA_256',
      })
    )) as { Signature?: Uint8Array };

    if (!resp.Signature) throw new Error(`AWS KMS: signing failed for keyId=${keyId}`);
    return Buffer.from(resp.Signature);
  }

  async getPublicKey(keyId: string): Promise<Buffer | null> {
    const entry = await this.registry.get(keyId);
    if (!entry) return null;

    const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
    const GetPublicKeyCommand = sdk.GetPublicKeyCommand as new (
      input: Record<string, unknown>
    ) => unknown;

    const resp = (await client.send(
      new GetPublicKeyCommand({ KeyId: entry.providerRef })
    )) as { PublicKey?: Uint8Array };

    return resp.PublicKey ? Buffer.from(resp.PublicKey) : null;
  }

  async deleteKey(keyId: string): Promise<void> {
    const entry = await this.registry.get(keyId);
    if (!entry) return;

    const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
    const ScheduleKeyDeletionCommand = sdk.ScheduleKeyDeletionCommand as new (
      input: Record<string, unknown>
    ) => unknown;

    await client.send(
      new ScheduleKeyDeletionCommand({
        KeyId: entry.providerRef,
        PendingWindowInDays: 7,
      })
    );
    await this.registry.delete(keyId);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
      const ListKeysCommand = sdk.ListKeysCommand as new (input: Record<string, unknown>) => unknown;
      await client.send(new ListKeysCommand({ Limit: 1 }));
      return true;
    } catch {
      return false;
    }
  }

  supportsAlgorithm(algorithm: 'ed25519' | 'secp256k1'): boolean {
    return algorithm === 'secp256k1';
  }
}
