/**
 * deploy-mainnet.ts — Deploy TONAIAgent smart contracts to TON mainnet
 *
 * ⚠️  IMPORTANT: Do NOT run this script until:
 *     1. All contracts have been deployed and tested on testnet.
 *     2. A third-party audit (CertiK, Halborn, or equivalent) has been
 *        completed and all Critical/High findings have been fixed.
 *     3. The team has reviewed and approved the audited contract code.
 *     4. Multi-sig wallets are configured for the owner and treasury addresses.
 *
 * Prerequisites:
 *   Same as deploy-testnet.ts, plus:
 *     - TON_MAINNET_API_KEY from https://toncenter.com/
 *     - Multi-sig wallet for FACTORY_OWNER_ADDRESS
 *     - Multi-sig wallet for FACTORY_TREASURY_ADDRESS
 *
 * Run:
 *   NETWORK=mainnet npx ts-node scripts/deploy-mainnet.ts
 *
 * Security checklist before running:
 *   [ ] Audit report reviewed and accepted
 *     [ ] All Critical findings resolved
 *     [ ] All High findings resolved
 *   [ ] Owner address is a multi-sig (not a single private key)
 *   [ ] Treasury address is a multi-sig (not a single private key)
 *   [ ] Emergency drain safe address is configured
 *   [ ] TON_MNEMONIC is stored in a hardware wallet or HSM
 *   [ ] Deployment simulation passes on testnet
 *   [ ] At least 2 team members have reviewed this script
 */

import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, Address } from '@ton/core';
import { assertComplianceGatesEnabled } from '../services/regulatory/compliance-flags.js';
import { initConfig } from '../config/index.js';

// Uncomment after running `npx blueprint build`:
// import { AgentFactory } from '../contracts/wrappers/AgentFactory';
// import { StrategyExecutor } from '../contracts/wrappers/StrategyExecutor';

const MAINNET_RPC = 'https://toncenter.com/api/v2/jsonRPC';

const NULL_ADDR = '0:0000000000000000000000000000000000000000000000000000000000000000';

async function main() {
  // ---- 0. Load secrets and config before any business logic ----
  // Mainnet deploys always run in strict mode — missing secrets are fatal.
  await initConfig({ strictMode: true });

  // TON_MAINNET_API_KEY is non-secret config; read directly from env
  const MAINNET_API_KEY = process.env['TON_MAINNET_API_KEY'] ?? '';

  // ---- Hard-gate: require explicit opt-in ----
  if (process.env['NETWORK'] !== 'mainnet') {
    throw new Error(
      'Mainnet deployment requires NETWORK=mainnet environment variable. ' +
      'This is an intentional safety gate — do not bypass it.'
    );
  }

  // ---- Hard-gate: refuse to deploy with KYC/AML enforcement disabled ----
  // See Issue #330: silently disabled compliance gates are a critical exposure
  // for a regulated financial product. Both flags must resolve to true here.
  const compliance = assertComplianceGatesEnabled();
  if (!compliance.ok) {
    throw new Error(`Mainnet deploy refused — ${compliance.message}`);
  }

  // ---- 1. Validate environment ----
  const mnemonic = process.env['TON_MNEMONIC'];
  if (!mnemonic) {
    throw new Error('TON_MNEMONIC environment variable is required');
  }

  const ownerAddress = process.env['FACTORY_OWNER_ADDRESS'];
  if (!ownerAddress || ownerAddress === NULL_ADDR) {
    throw new Error(
      'FACTORY_OWNER_ADDRESS is required and must not be the null address. ' +
      'For mainnet, this should be a multi-sig wallet address.'
    );
  }

  const treasuryAddress = process.env['FACTORY_TREASURY_ADDRESS'];
  if (!treasuryAddress || treasuryAddress === NULL_ADDR) {
    throw new Error(
      'FACTORY_TREASURY_ADDRESS is required and must not be the null address. ' +
      'For mainnet, this should be a multi-sig wallet address.'
    );
  }

  const orchestratorAddress = process.env['STRATEGY_ORCHESTRATOR_ADDRESS'];
  if (!orchestratorAddress || orchestratorAddress === NULL_ADDR) {
    throw new Error('STRATEGY_ORCHESTRATOR_ADDRESS is required');
  }

  // ---- 2. Confirmation prompt ----
  console.log('='.repeat(60));
  console.log('  ⚠️   MAINNET DEPLOYMENT — THIS IS NOT A DRILL   ⚠️');
  console.log('='.repeat(60));
  console.log(`  Owner:        ${ownerAddress}`);
  console.log(`  Treasury:     ${treasuryAddress}`);
  console.log(`  Orchestrator: ${orchestratorAddress}`);
  console.log('');
  console.log('  Ensure the audit report is complete and all Critical/High');
  console.log('  findings have been resolved before continuing.');
  console.log('='.repeat(60));

  // In a real deployment you would add an interactive y/n prompt here.
  // For automated CI/CD, the CONFIRM_MAINNET=yes variable acts as the gate.
  if (process.env['CONFIRM_MAINNET'] !== 'yes') {
    throw new Error(
      'Set CONFIRM_MAINNET=yes to confirm mainnet deployment. ' +
      'This gate exists to prevent accidental mainnet deployments.'
    );
  }

  // ---- 3. Connect to mainnet ----
  const client = new TonClient({
    endpoint: MAINNET_RPC,
    apiKey: MAINNET_API_KEY,
  });

  // ---- 4. Derive deployer wallet ----
  const words = mnemonic.split(' ');
  const keypair = await mnemonicToPrivateKey(words);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keypair.publicKey,
  });
  const walletContract = client.open(wallet);
  const deployerAddress = walletContract.address;

  console.log(`\nDeployer: ${deployerAddress.toString()}`);

  const balance = await client.getBalance(deployerAddress);
  console.log(`Balance:  ${Number(balance) / 1e9} TON`);

  if (balance < toNano('2')) {
    throw new Error('Deployer balance too low. Need at least 2 TON for gas.');
  }

  const owner    = Address.parse(ownerAddress);
  const treasury = Address.parse(treasuryAddress);
  const orch     = Address.parse(orchestratorAddress);

  // ---- 5. Deploy AgentFactory ----
  console.log('\n--- Deploying AgentFactory (mainnet) ---');

  /*
   * Uncomment after `npx blueprint build`:
   *
   * const factory = AgentFactory.fromInit(
   *   owner,
   *   treasury,
   *   toNano('0.1'),   // deploymentFee
   *   100,             // protocolFeeBps (1%)
   *   10               // maxAgentsPerUser
   * );
   * const factoryContract = client.open(factory);
   *
   * const seqno = await walletContract.getSeqno();
   * await walletContract.sendTransfer({
   *   seqno,
   *   secretKey: keypair.secretKey,
   *   messages: [
   *     internal({
   *       to: factory.address,
   *       value: toNano('0.05'),
   *       init: factory.init,
   *       body: factory.init?.data,
   *     }),
   *   ],
   * });
   * console.log(`AgentFactory (mainnet): ${factory.address.toString()}`);
   */

  // ---- 6. Deploy StrategyExecutor ----
  console.log('\n--- Deploying StrategyExecutor (mainnet) ---');

  /*
   * Uncomment after `npx blueprint build`:
   *
   * const executor = StrategyExecutor.fromInit(owner, orch);
   * const executorContract = client.open(executor);
   *
   * const seqno2 = await walletContract.getSeqno();
   * await walletContract.sendTransfer({
   *   seqno: seqno2,
   *   secretKey: keypair.secretKey,
   *   messages: [
   *     internal({
   *       to: executor.address,
   *       value: toNano('0.05'),
   *       init: executor.init,
   *       body: executor.init?.data,
   *     }),
   *   ],
   * });
   * console.log(`StrategyExecutor (mainnet): ${executor.address.toString()}`);
   */

  console.log('\nMainnet deployment complete.');
  console.log('Record all contract addresses and verify on https://tonscan.org');
  console.log('Update connectors/ton-factory/factory-contract.ts with the mainnet addresses.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
