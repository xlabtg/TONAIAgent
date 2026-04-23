# TONAIAgent Smart Contracts

This directory contains the on-chain Tact contracts for the TONAIAgent protocol.

## Contract overview

| File | Contract | Responsibility |
|------|----------|----------------|
| `agent-factory.tact` | `AgentFactory` | Deploys and registers `AgentWallet` instances on-chain |
| `agent-wallet.tact` | `AgentWallet` | Non-custodial wallet with per-trade and daily spending limits |
| `strategy-executor.tact` | `StrategyExecutor` | Validates and dispatches AI trading signals |

## Real contracts vs. JS simulation

Two implementations exist side-by-side during the migration period. They must
not be confused:

| | Real on-chain Tact contract | JS simulation (test double) |
|---|---|---|
| **Source** | `contracts/*.tact` | `connectors/ton-factory/factory-contract.ts` |
| **Test wrapper** | `contracts/wrappers/*.ts` (Blueprint-generated) | `tests/fakes/factory-contract.fake.ts` |
| **Used by** | Blueprint sandbox tests, testnet/mainnet | `DefaultTonFactoryService` (temporary) |
| **Behaviour** | Real TON VM execution | Pure in-memory simulation |

Production code **must not** import `tests/fakes/factory-contract.fake`.
This is enforced by the `no-sim-import` ESLint rule. See
`docs/contracts-migration.md` for the migration roadmap.

### Version drift protection

The simulation exports `SIMULATION_VERSION` (integer: `major * 100 + minor`).
A CI test asserts it equals the `self.version` field in `agent-factory.tact`
(currently `100` = v1.0). Bumping the contract version without updating the
constant causes CI to fail.

## Building and testing contracts

Install Blueprint once:

```bash
npm install -D @ton/blueprint @ton/sandbox @ton/test-utils
```

Compile contracts and regenerate TypeScript wrappers:

```bash
npm run contracts:build
# or: npx blueprint build
```

Run Blueprint sandbox tests:

```bash
npx blueprint test
```

Run a single spec:

```bash
npx blueprint test contracts/tests/agent-factory.spec.ts
```

## Directory structure

```
contracts/
  agent-factory.tact       # Factory contract source
  agent-wallet.tact        # Wallet contract source
  strategy-executor.tact   # Strategy executor source
  blueprint.config.ts      # Blueprint configuration
  tact.config.json         # Tact compiler configuration
  wrappers/
    AgentFactory.ts        # Generated TypeScript wrapper
    AgentWallet.ts         # Generated TypeScript wrapper
    StrategyExecutor.ts    # Generated TypeScript wrapper
    README.md              # Wrapper regeneration instructions
  tests/
    agent-factory.spec.ts  # Blueprint sandbox tests
    agent-wallet.spec.ts
    strategy-executor.spec.ts
```

## References

- [Blueprint documentation](https://github.com/ton-org/blueprint)
- [Tact language](https://tact-lang.org/)
- `docs/contracts-migration.md` — migration from JS simulation to on-chain contracts
- `SELF_ASSESSMENT.md` — security self-assessment
- `AUDIT_REPORT_v1.md` — external audit report
