/**
 * hsm-ci-cleanup.ts — Delete test keys created by the HSM nightly CI workflow.
 *
 * Every key created by the real-cloud adapter tests is tagged with:
 *   tonaiagent-ci=true
 *   ttl=24h
 *
 * This script deletes keys whose `tonaiagent-ci` tag is set and that are
 * older than 24 hours, preventing unbounded storage-cost accumulation.
 *
 * Usage (called automatically by hsm-nightly.yml, but can also be run
 * manually from a machine with appropriate AWS / Azure credentials):
 *
 *   npx tsx scripts/hsm-ci-cleanup.ts --provider aws --region us-east-1
 *   npx tsx scripts/hsm-ci-cleanup.ts --provider azure
 *   npx tsx scripts/hsm-ci-cleanup.ts --provider all   # both providers
 *
 * Credentials are read from environment variables or the default SDK credential
 * chain (IAM role, Azure managed identity, etc.).  No secrets should be
 * passed on the command line.
 */

import { parseArgs } from 'node:util';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    provider: { type: 'string', default: 'all' },
    region:   { type: 'string', default: process.env.AWS_REGION ?? 'us-east-1' },
    'dry-run': { type: 'boolean', default: false },
    'max-age-hours': { type: 'string', default: '24' },
  },
  strict: true,
});

const PROVIDER     = args.provider as 'aws' | 'azure' | 'all';
const AWS_REGION   = args.region as string;
const DRY_RUN      = args['dry-run'] as boolean;
const MAX_AGE_MS   = Number(args['max-age-hours']) * 60 * 60 * 1000;
const CI_TAG_KEY   = 'tonaiagent-ci';
const CI_TAG_VALUE = 'true';

if (DRY_RUN) {
  console.log('[dry-run] No keys will actually be deleted.');
}

// ---------------------------------------------------------------------------
// AWS KMS cleanup
// ---------------------------------------------------------------------------

async function cleanupAwsKms(): Promise<void> {
  let KMSClient: any, ListKeysCommand: any, ListResourceTagsCommand: any,
      ScheduleKeyDeletionCommand: any, DescribeKeyCommand: any;

  try {
    ({ KMSClient, ListKeysCommand, ListResourceTagsCommand,
       ScheduleKeyDeletionCommand, DescribeKeyCommand } =
      await import('@aws-sdk/client-kms'));
  } catch {
    console.error(
      'AWS cleanup skipped: @aws-sdk/client-kms is not installed. ' +
      'Run: npm install @aws-sdk/client-kms'
    );
    return;
  }

  const client = new KMSClient({ region: AWS_REGION });
  console.log(`[aws] Scanning KMS keys in ${AWS_REGION} …`);

  // Collect all key IDs
  const keyIds: string[] = [];
  let nextMarker: string | undefined;

  do {
    const resp = await client.send(new ListKeysCommand({ Marker: nextMarker, Limit: 100 }));
    for (const key of resp.Keys ?? []) {
      keyIds.push(key.KeyId!);
    }
    nextMarker = resp.NextMarker;
  } while (nextMarker);

  console.log(`[aws] Found ${keyIds.length} key(s) total; checking tags…`);

  let deleted = 0;
  const now = Date.now();

  for (const keyId of keyIds) {
    // Fetch key metadata to check creation date and state
    let meta: any;
    try {
      const descResp = await client.send(new DescribeKeyCommand({ KeyId: keyId }));
      meta = descResp.KeyMetadata;
    } catch {
      continue; // Key may have already been deleted or be inaccessible
    }

    if (meta.KeyState === 'PendingDeletion' || meta.KeyState === 'Disabled') continue;

    const createdMs = meta.CreationDate instanceof Date
      ? meta.CreationDate.getTime()
      : Number(meta.CreationDate);

    if (now - createdMs < MAX_AGE_MS) continue; // Too recent to clean up

    // Check for the CI tag
    let tagResp: any;
    try {
      tagResp = await client.send(new ListResourceTagsCommand({ KeyId: keyId }));
    } catch {
      continue;
    }

    const tags: Record<string, string> = {};
    for (const t of tagResp.Tags ?? []) {
      tags[t.TagKey] = t.TagValue;
    }

    if (tags[CI_TAG_KEY] !== CI_TAG_VALUE) continue;

    const alias = meta.Description ?? keyId;
    console.log(`[aws] Scheduling deletion: ${alias} (created ${new Date(createdMs).toISOString()})`);

    if (!DRY_RUN) {
      try {
        await client.send(
          new ScheduleKeyDeletionCommand({ KeyId: keyId, PendingWindowInDays: 7 })
        );
        deleted++;
      } catch (err: any) {
        console.error(`[aws] Failed to schedule deletion for ${keyId}: ${err.message}`);
      }
    } else {
      deleted++;
    }
  }

  console.log(`[aws] Scheduled ${deleted} key(s) for deletion in ${AWS_REGION}.`);
}

// ---------------------------------------------------------------------------
// Azure Key Vault cleanup
// ---------------------------------------------------------------------------

async function cleanupAzureKeyVault(): Promise<void> {
  let KeyClient: any, DefaultAzureCredential: any;

  try {
    ({ KeyClient } = await import('@azure/keyvault-keys'));
    ({ DefaultAzureCredential } = await import('@azure/identity'));
  } catch {
    console.error(
      'Azure cleanup skipped: @azure/keyvault-keys / @azure/identity are not installed. ' +
      'Run: npm install @azure/keyvault-keys @azure/identity'
    );
    return;
  }

  const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
  if (!vaultUrl) {
    console.error('[azure] AZURE_KEY_VAULT_URL is not set — skipping Azure cleanup.');
    return;
  }

  console.log(`[azure] Scanning Key Vault at ${vaultUrl} …`);

  const credential = new DefaultAzureCredential();
  const client = new KeyClient(vaultUrl, credential);

  let deleted = 0;
  const now = Date.now();

  for await (const keyProps of client.listPropertiesOfKeys()) {
    // Tags are stored on key properties
    const tags: Record<string, string> = keyProps.tags ?? {};
    if (tags[CI_TAG_KEY] !== CI_TAG_VALUE) continue;

    const createdMs = keyProps.createdOn instanceof Date
      ? keyProps.createdOn.getTime()
      : 0;

    if (now - createdMs < MAX_AGE_MS) continue;

    console.log(
      `[azure] Deleting key: ${keyProps.name} ` +
      `(created ${keyProps.createdOn?.toISOString() ?? 'unknown'})`
    );

    if (!DRY_RUN) {
      try {
        const poller = await client.beginDeleteKey(keyProps.name);
        await poller.pollUntilDone();
        // Purge to free Key Vault quota (soft-delete retention would keep it 90 days)
        await client.purgeDeletedKey(keyProps.name);
        deleted++;
      } catch (err: any) {
        console.error(`[azure] Failed to delete ${keyProps.name}: ${err.message}`);
      }
    } else {
      deleted++;
    }
  }

  console.log(`[azure] Deleted ${deleted} key(s).`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const runAws   = PROVIDER === 'aws'   || PROVIDER === 'all';
  const runAzure = PROVIDER === 'azure' || PROVIDER === 'all';

  const tasks: Promise<void>[] = [];
  if (runAws)   tasks.push(cleanupAwsKms());
  if (runAzure) tasks.push(cleanupAzureKeyVault());

  const results = await Promise.allSettled(tasks);

  let exitCode = 0;
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[cleanup] Unexpected error:', result.reason);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

main();
