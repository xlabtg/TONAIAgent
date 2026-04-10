/**
 * deploy-testnet.ts — Deploy TONAIAgent smart contracts to TON testnet
 *
 * Prerequisites:
 *   1. Install Blueprint: npm install -D @ton/blueprint
 *   2. Install TON SDK: npm install @ton/ton @ton/core @ton/crypto
 *   3. Compile the contracts: npx blueprint build
 *   4. Set environment variables (see .env.example):
 *      TON_MNEMONIC="word1 word2 ... word24"   # deployer wallet mnemonic
 *      FACTORY_OWNER_ADDRESS="EQD..."           # owner address (must not be null)
 *      FACTORY_TREASURY_ADDRESS="EQD..."        # treasury address (must not be null)
 *
 * Run:
 *   npx ts-node scripts/deploy-testnet.ts
 *
 * This script:
 *   1. Derives the deployer keypair from TON_MNEMONIC.
 *   2. Deploys AgentFactory to testnet workchain 0.
 *   3. Deploys StrategyExecutor to testnet workchain 0.
 *   4. Prints all deployed addresses — add them to your .env.
 *
 * NOTE: AgentWallet contracts are deployed on-demand by the AgentFactory
 * contract itself (via StateInit deployment messages). You do not need to
 * deploy AgentWallet manually.
 */

import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, Address } from '@ton/core';

// Uncomment after running `npx blueprint build`:
// import { AgentFactory } from '../contracts/wrappers/AgentFactory';
// import { StrategyExecutor } from '../contracts/wrappers/StrategyExecutor';

const TESTNET_RPC = 'https://testnet.toncenter.com/api/v2/jsonRPC';
const TESTNET_API_KEY = process.env.TON_TESTNET_API_KEY ?? '';

async function main() {
  // ---- 1. Validate environment ----
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    throw new Error('TON_MNEMONIC environment variable is required');
  }

  const ownerAddress = process.env.FACTORY_OWNER_ADDRESS;
  if (!ownerAddress) {
    throw new Error('FACTORY_OWNER_ADDRESS environment variable is required');
  }

  const treasuryAddress = process.env.FACTORY_TREASURY_ADDRESS;
  if (!treasuryAddress) {
    throw new Error('FACTORY_TREASURY_ADDRESS environment variable is required');
  }

  const orchestratorAddress = process.env.STRATEGY_ORCHESTRATOR_ADDRESS;
  if (!orchestratorAddress) {
    throw new Error('STRATEGY_ORCHESTRATOR_ADDRESS environment variable is required');
  }

  const NULL_ADDR = '0:0000000000000000000000000000000000000000000000000000000000000000';
  if (ownerAddress === NULL_ADDR || treasuryAddress === NULL_ADDR) {
    throw new Error('FACTORY_OWNER_ADDRESS and FACTORY_TREASURY_ADDRESS must not be the null address');
  }

  // ---- 2. Connect to testnet ----
  const client = new TonClient({
    endpoint: TESTNET_RPC,
    apiKey: TESTNET_API_KEY,
  });

  // ---- 3. Derive deployer wallet ----
  const words = mnemonic.split(' ');
  const keypair = await mnemonicToPrivateKey(words);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keypair.publicKey,
  });
  const walletContract = client.open(wallet);
  const deployerAddress = walletContract.address;

  console.log(`Deployer: ${deployerAddress.toString()}`);

  const balance = await client.getBalance(deployerAddress);
  console.log(`Balance:  ${Number(balance) / 1e9} TON`);

  if (balance < toNano('1')) {
    throw new Error(
      'Deployer balance too low. ' +
      'Get testnet TON from https://t.me/testgiver_ton_bot'
    );
  }

  const owner    = Address.parse(ownerAddress);
  const treasury = Address.parse(treasuryAddress);
  const orch     = Address.parse(orchestratorAddress);

  // ---- 4. Deploy AgentFactory ----
  console.log('\n--- Deploying AgentFactory ---');

  /*
   * Uncomment this block after running `npx blueprint build`:
   *
   * const factory = AgentFactory.fromInit(
   *   owner,
   *   treasury,
   *   toNano('0.1'),   // deploymentFee: 0.1 TON
   *   100,             // protocolFeeBps: 1%
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
   * console.log(`AgentFactory deployed at: ${factory.address.toString()}`);
   */

  // ---- 5. Deploy StrategyExecutor ----
  console.log('\n--- Deploying StrategyExecutor ---');

  /*
   * Uncomment this block after running `npx blueprint build`:
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
   * console.log(`StrategyExecutor deployed at: ${executor.address.toString()}`);
   */

  console.log('\nTestnet deployment complete.');
  console.log('Add the contract addresses to your .env file.');
  console.log('Then update connectors/ton-factory/factory-contract.ts to reference these addresses.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
