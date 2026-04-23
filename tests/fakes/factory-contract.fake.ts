/**
 * TEST DOUBLE — JS Simulation of the TON Factory Contract
 *
 * This module re-exports the in-process JS simulation of the on-chain
 * AgentFactory Tact contract from `connectors/ton-factory/factory-contract.ts`.
 * It exists here so that tests can make their intent explicit: importing from
 * `tests/fakes/factory-contract.fake` signals "I am using the simulation, not
 * a real on-chain contract".
 *
 * This file MUST NOT be imported from production code (enforced by the
 * `no-sim-import` ESLint rule). See `docs/contracts-migration.md` for the
 * plan to replace the simulation with Blueprint-sandboxed contract calls.
 *
 * The `SIMULATION_VERSION` constant encodes the Tact contract version as
 * `major * 100 + minor`. Tests should assert it matches the Tact source so
 * that ABI drift between the fake and the real contract is caught immediately.
 */
export {
  SIMULATION_VERSION,
  FactoryContractManager,
  createFactoryContractManager,
  deriveContractAddress,
  buildDeploymentTransaction,
  DEFAULT_FACTORY_CONFIG,
} from '../../connectors/ton-factory/factory-contract';
