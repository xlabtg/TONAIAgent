/**
 * Azure Key Vault adapter — now backed by a persistent KeyRegistry.
 *
 * Previously the keyId → Azure key name mapping was held in an in-memory Map
 * that was destroyed on process restart.  See issue #343.
 */

import * as nodeCrypto from 'node:crypto';
import type { HSMConfig } from '../types.js';
import type { KeyRegistry } from './registry/key-registry.js';
import { buildRegistry } from './registry/index.js';
import type { HSMProviderAdapter } from './aws-kms.js';

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
 * Azure Key Vault adapter.
 *
 * Ed25519 and secp256k1 are not natively supported; both are blocked by the
 * capability guard.  See supportsAlgorithm().
 */
export class AzureKeyVaultAdapter implements HSMProviderAdapter {
  private readonly registry: KeyRegistry;
  private cryptoClientFactory: unknown = null;
  private keyClientInstance: unknown = null;

  constructor(private readonly config: HSMConfig, registry?: KeyRegistry) {
    this.registry = registry ?? buildRegistry(config.registryType);
  }

  private toAzureKeyName(keyId: string): string {
    return keyId.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 127);
  }

  private async getClients(): Promise<{
    keyClient: {
      createKey: (...args: unknown[]) => Promise<unknown>;
      deleteKey: (name: string) => Promise<unknown>;
      listPropertiesOfKeys: () => AsyncIterable<unknown>;
    };
    cryptoClient: (keyName: string) => {
      sign: (alg: string, digest: Uint8Array) => Promise<{ result: Uint8Array }>;
      getKey: () => Promise<{ key?: { x?: Uint8Array; y?: Uint8Array } }>;
    };
  }> {
    if (this.cryptoClientFactory && this.keyClientInstance) {
      return {
        keyClient: this.keyClientInstance as never,
        cryptoClient: this.cryptoClientFactory as never,
      };
    }

    const [kvSdk, identitySdk] = await Promise.all([
      loadOptionalSdk(
        '@azure/keyvault-keys',
        'npm install @azure/keyvault-keys @azure/identity'
      ),
      loadOptionalSdk('@azure/identity', 'npm install @azure/keyvault-keys @azure/identity'),
    ]);

    const KeyClient = kvSdk.KeyClient as new (url: string, credential: unknown) => unknown;
    const CryptographyClient = kvSdk.CryptographyClient as new (
      url: string,
      credential: unknown
    ) => unknown;
    const ClientSecretCredential = identitySdk.ClientSecretCredential as new (
      tenant: string,
      client: string,
      secret: string
    ) => unknown;
    const DefaultAzureCredential = identitySdk.DefaultAzureCredential as new () => unknown;

    const vaultUrl = this.config.azureKeyVaultUrl ?? process.env.AZURE_KEY_VAULT_URL;
    if (!vaultUrl) throw new Error('Azure Key Vault: azureKeyVaultUrl is required');

    const credential =
      this.config.azureTenantId && this.config.azureClientId && this.config.azureClientSecret
        ? new ClientSecretCredential(
            this.config.azureTenantId,
            this.config.azureClientId,
            this.config.azureClientSecret
          )
        : new DefaultAzureCredential();

    this.keyClientInstance = new KeyClient(vaultUrl, credential);
    this.cryptoClientFactory = (keyName: string) =>
      new CryptographyClient(`${vaultUrl}/keys/${keyName}`, credential);

    return {
      keyClient: this.keyClientInstance as never,
      cryptoClient: this.cryptoClientFactory as never,
    };
  }

  async generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    const { keyClient } = await this.getClients();
    const azureName = this.toAzureKeyName(keyId);
    const crv = algorithm === 'secp256k1' ? 'P-256K' : 'P-256';

    const key = (await (
      keyClient as {
        createKey: (
          name: string,
          type: string,
          opts: Record<string, unknown>
        ) => Promise<{ key?: { x?: Uint8Array; y?: Uint8Array } }>;
      }
    ).createKey(azureName, 'EC', { curve: crv })) as {
      key?: { x?: Uint8Array; y?: Uint8Array };
    };

    // Persist the name before reading coords so a crash mid-call is recoverable.
    await this.registry.put({
      keyId,
      providerRef: azureName,
      provider: 'azure_hsm',
      createdAt: new Date(),
    });

    const x = key.key?.x;
    const y = key.key?.y;
    if (!x || !y)
      throw new Error(
        `Azure Key Vault: could not retrieve public key coords for ${keyId}`
      );

    const uncompressed = Buffer.concat([Buffer.from([0x04]), Buffer.from(x), Buffer.from(y)]);
    return { publicKey: uncompressed.toString('hex') };
  }

  async sign(keyId: string, message: Buffer): Promise<Buffer> {
    const entry = await this.registry.get(keyId);
    if (!entry) throw new Error(`Azure Key Vault: unknown keyId=${keyId}`);

    const { cryptoClient } = await this.getClients();
    const client = (
      cryptoClient as (name: string) => {
        sign: (alg: string, digest: Uint8Array) => Promise<{ result: Uint8Array }>;
      }
    )(entry.providerRef);

    const digest = nodeCrypto.createHash('SHA256').update(message).digest();
    const result = await client.sign('ES256', digest);
    return Buffer.from(result.result);
  }

  async getPublicKey(keyId: string): Promise<Buffer | null> {
    const entry = await this.registry.get(keyId);
    if (!entry) return null;

    const { cryptoClient } = await this.getClients();
    const client = (
      cryptoClient as (name: string) => {
        getKey: () => Promise<{ key?: { x?: Uint8Array; y?: Uint8Array } }>;
      }
    )(entry.providerRef);

    const key = await client.getKey();
    const x = key.key?.x;
    const y = key.key?.y;
    if (!x || !y) return null;

    return Buffer.concat([Buffer.from([0x04]), Buffer.from(x), Buffer.from(y)]);
  }

  async deleteKey(keyId: string): Promise<void> {
    const entry = await this.registry.get(keyId);
    if (!entry) return;

    const { keyClient } = await this.getClients();
    await (keyClient as { deleteKey: (name: string) => Promise<void> }).deleteKey(
      entry.providerRef
    );
    await this.registry.delete(keyId);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { keyClient } = await this.getClients();
      const iter = (
        keyClient as { listPropertiesOfKeys: () => AsyncIterable<unknown> }
      ).listPropertiesOfKeys();
      for await (const _item of iter) {
        break;
      }
      return true;
    } catch {
      return false;
    }
  }

  supportsAlgorithm(_algorithm: 'ed25519' | 'secp256k1'): boolean {
    return false;
  }
}
