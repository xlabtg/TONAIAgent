# Autonomous Capital Markets Stack (ACMS)

**Issue:** [#125](https://github.com/xlabtg/TONAIAgent/issues/125)
**Module:** `@tonaiagent/core/acms`
**Version:** v1.0 (introduced in v2.18.0)

## Overview

The Autonomous Capital Markets Stack (ACMS) is a vertically integrated, AI-native capital markets infrastructure built on The Open Network (TON). It formalizes the entire infrastructure established across issues #108 and #119–#124 into a unified, programmable, AI-coordinated system.

ACMS replaces the fragmented traditional capital markets structure:

| ACMS Layer | Replaces |
|---|---|
| Asset Layer (L1) + Agent/Fund Layer (L2) | BlackRock / Asset Managers |
| Liquidity Layer (L3) | NASDAQ / Liquidity Venues |
| Prime Brokerage Layer (L4) | Goldman Sachs / Prime Brokers |
| Clearing & Settlement Layer (L5) | DTCC / Central Counterparties |
| Risk & Stability Layer (L6) | Basel Committee / Risk Regulation |
| Monetary & Treasury Layer (L7) | Federal Reserve / Central Banks |
| Inter-Protocol Layer (L8) | SWIFT / BIS Cross-border Infrastructure |
| Governance Layer (L9) | SEC / CFTC / Protocol DAO |

## Architecture

```
Users / Institutions
        ↓
AI Funds & Agents (Layer 2)
        ↓
Prime Brokerage (Layer 4)
        ↓
Liquidity Network (Layer 3)
        ↓
Clearing House (Layer 5)
        ↓
Risk & Stability Engine (Layer 6)
        ↓
Treasury & Monetary Policy (Layer 7)
        ↓
Inter-Protocol Layer (Layer 8)
        ↓
Global Capital Coordination (Layer 9: Governance)
```

## Stack Layers

### Layer 1 — Asset Layer
**File:** `src/acms/asset-layer.ts`

Manages all assets in the ACMS:
- **Crypto assets** — Native tokens, jettons, governance tokens
- **RWA tokenization** — Real-world assets tokenized on-chain
- **Tokenized funds** — AI-managed fund shares with NAV tracking
- **Structured products** — Principal-protected notes, yield products

Key capabilities:
- `issueAsset()` — Issue new assets with on-chain metadata
- `createTokenizedFund()` — Deploy tokenized fund shares (ERC-4626 style)
- `createStructuredProduct()` — Issue structured products with maturity and yield parameters
- `updatePrice()` — Real-time price and market cap updates
- `getLayerStatus()` — Asset Layer metrics

### Layer 2 — Agent & Fund Layer
**File:** `src/acms/agent-fund-layer.ts`

Manages autonomous AI agents and funds:
- **AI hedge funds** — Multi-agent managed funds with NAV tracking
- **Strategy agents** — Specialized execution agents (arbitrage, yield, grid)
- **Treasury agents** — Protocol treasury management bots
- **DAO funds** — Governance-managed capital pools

Key capabilities:
- `deployAgent()` — Deploy new AI agents with allocation and leverage limits
- `createFund()` — Create AI-managed fund with target returns
- `addAgentToFund()` — Assign agents to funds
- `updateFundNAV()` — Update fund NAV and performance metrics
- `suspendAgent()` / `resumeAgent()` — Agent lifecycle controls

### Layer 3 — Liquidity Layer
**File:** `src/acms/liquidity-layer.ts`

Deep institutional liquidity infrastructure:
- **On-chain DEX aggregation** — Multi-DEX routing
- **OTC desk integration** — Institutional over-the-counter execution
- **Internal liquidity pools** — Agent-to-agent capital sharing
- **Cross-chain bridges** — Multi-chain liquidity routing

Key capabilities:
- `registerSource()` — Register liquidity sources (DEX, OTC, bridge)
- `createPool()` — Create internal liquidity pools
- `routeOrder()` — Smart order routing with TVL-weighted splits
- `executeRoute()` — Execute a routed order

Smart Order Routing algorithm:
1. Filters active sources by preference and chain
2. Splits order by TVL weight across top 3 sources
3. Applies slippage model based on order size relative to TVL
4. Returns route with segments, expected slippage, and fees

### Layer 4 — Prime Brokerage Layer
**File:** `src/acms/prime-brokerage-layer.ts`

Institutional prime brokerage services:
- **Capital pools** — Multi-fund capital aggregation
- **Margin accounts** — Per-agent margin and leverage management
- **Collateral management** — Haircut-adjusted collateral deposits
- **Net exposure** — Cross-strategy exposure netting

Key capabilities:
- `createCapitalPool()` — Create institutional capital pool
- `allocateFundToPool()` — Allocate fund capital with leverage
- `createMarginAccount()` — Open margin account for agent
- `updateMarginAccount()` — Update equity, margin, leverage
- `issueMarginCall()` — Issue margin call with 24-hour deadline
- `depositCollateral()` / `withdrawCollateral()` — Collateral lifecycle

Margin call levels:
- Warning: 60% utilization
- Margin call: 80% utilization
- Liquidation: 95% utilization

### Layer 5 — Clearing & Settlement Layer
**File:** `src/acms/clearing-settlement-layer.ts`

AI-native clearing house and settlement:
- **Multilateral netting** — Gross-to-net position compression
- **Collateral pools** — Per-participant collateral with haircuts
- **Settlement** — T+2 default, configurable settlement methods
- **Default resolution** — 2-step: collateral → insurance fund

Key capabilities:
- `submitTrade()` — Submit trade for clearing (DVP/RVP/FOP)
- `processNetting()` — Compute net positions for a participant
- `settleEntry()` — Mark entry as settled
- `createCollateralPool()` — Create collateral pool with haircut
- `resolveDefault()` — Automated default resolution plan
- `getInsuranceFundBalance()` — Check insurance fund health

Settlement methods: `dvp` (Delivery vs Payment), `rvp`, `fop`, `free_of_payment`, `internal_netting`

### Layer 6 — Risk & Stability Layer
**File:** `src/acms/risk-stability-layer.ts`

Systemic risk monitoring and stability management:
- **Stability Index** — Composite 0-100 score from 5 sub-scores
- **Leverage Governor** — System-wide leverage limits with auto-deleverage
- **Circuit breakers** — Configurable trigger/halt/reset mechanism
- **Insurance fund** — Protocol and premium-funded coverage
- **Stress testing** — Configurable market stress scenarios

Key capabilities:
- `computeStabilityIndex()` — Weighted composite stability score
- `registerCircuitBreaker()` — Register trigger/halt breaker
- `triggerCircuitBreaker()` — Evaluate and potentially trigger breaker
- `runStressTest()` — Run market stress scenario
- `getInsuranceFund()` — View insurance fund state

Stability Index composition (weights):
- Liquidity: 25%
- Leverage: 25%
- Collateralization: 20%
- Concentration: 15%
- Volatility: 15%

Risk levels: `low` (≥70) · `medium` (≥50) · `high` (≥30) · `critical` (<30)

### Layer 7 — Monetary & Treasury Layer
**File:** `src/acms/monetary-treasury-layer.ts`

AI-driven monetary policy and treasury:
- **Monetary policies** — Configurable emission/reserve/collateralization
- **Emission schedules** — Epoch-based token emission with decay
- **Treasury allocations** — Governance-approved capital allocation

Key capabilities:
- `createMonetaryPolicy()` — Define monetary policy parameters
- `executeMonetaryAction()` — Execute policy action (emission_increase, buyback, burn, etc.)
- `createEmissionSchedule()` — Epoch-based emission with decay rate
- `advanceEpoch()` — Progress emission schedule
- `allocateTreasury()` — Allocate treasury capital by purpose
- `spendTreasuryAllocation()` — Record spending against allocation

Monetary actions: `emission_increase`, `emission_decrease`, `emission_halt`, `buyback`, `burn`, `liquidity_injection`, `liquidity_withdrawal`

### Layer 8 — Inter-Protocol Layer
**File:** `src/acms/inter-protocol-layer.ts`

Cross-protocol interoperability (IPLS — Inter-Protocol Liquidity Standard):
- **Protocol registry** — External DeFi, bridge, oracle protocol connections
- **Liquidity passport** — Per-agent cross-protocol allocation authorization
- **Cross-chain positions** — Unified multi-chain position tracking
- **Cross-protocol allocations** — Capital routing between protocols

Key capabilities:
- `registerProtocol()` — Register external protocol adapter
- `issuePassport()` — Issue cross-protocol liquidity passport
- `registerCrossChainPosition()` — Track cross-chain positions
- `getConsolidatedPortfolioUsd()` — Aggregate portfolio across chains
- `initiateAllocation()` → `completeAllocation()` — Cross-protocol capital flow

Protocol types: `defi_lending`, `dex`, `derivatives`, `bridge`, `oracle`, `insurance`, `real_world_asset`, `ai_fund`

Integration types: `read_only`, `bidirectional`, `liquidity_sharing`

### Layer 9 — Governance Layer
**File:** `src/acms/governance-layer.ts`

DAO governance and parameter management:
- **Proposals** — Multi-type governance proposals with voting periods
- **Voting** — Voting power-weighted on-chain votes
- **Parameter registry** — Layer-by-layer parameter management
- **Emergency overrides** — Fast-path for critical situations

Key capabilities:
- `createProposal()` — Create governance proposal
- `castVote()` — Cast vote with voting power
- `finalizeProposal()` — Check quorum and determine pass/fail
- `executeProposal()` — Mark proposal as executed
- `registerParameter()` — Add parameter to governance registry
- `updateParameter()` — Update parameter via passed proposal
- `activateEmergencyOverride()` — Activate emergency action
- `resolveEmergencyOverride()` — Resolve emergency

Proposal types: `parameter_change`, `protocol_upgrade`, `emergency_action`, `treasury_allocation`, `agent_suspension`, `circuit_breaker_reset`, `new_asset_listing`

## Unified ACMS Manager

The `DefaultACMSManager` composes all 9 layers and provides:
- Direct access to each layer via named properties
- Event forwarding across all layers via a single `onEvent()` handler
- System-wide `getStackStatus()` providing metrics from all layers

```typescript
import { createACMSManager } from '@tonaiagent/core/acms';

const acms = createACMSManager({
  networkId: 'ton-mainnet',
  environment: 'mainnet',
  stabilityIndexTarget: 80,
  maxSystemLeverage: 10,
});

// Access any layer
acms.assetLayer
acms.agentFundLayer
acms.liquidityLayer
acms.primeBrokerageLayer
acms.clearingSettlementLayer
acms.riskStabilityLayer
acms.monetaryTreasuryLayer
acms.interProtocolLayer
acms.governanceLayer

// Full stack status
const status = acms.getStackStatus();

// Subscribe to all ACMS events
acms.onEvent(event => {
  console.log(`[Layer ${event.layer}] ${event.type}:`, event.data);
});
```

## Configuration

```typescript
interface ACMSConfig {
  networkId: string;                  // 'ton-mainnet' | 'ton-testnet'
  environment: 'mainnet' | 'testnet' | 'sandbox';
  governanceThreshold?: number;       // Min quorum (0-1), default: 0.51
  stabilityIndexTarget?: number;      // Target stability score (0-100), default: 80
  maxSystemLeverage?: number;         // Max system leverage, default: 10
  emergencyShutdownEnabled?: boolean; // default: true
  crossProtocolEnabled?: boolean;     // default: true
  monetaryPolicyAuto?: boolean;       // Autonomous monetary policy, default: false
}
```

## Events

All events are typed `ACMSEvent` with `type`, `layer`, `timestamp`, and `data` fields:

| Event Type | Layer | Description |
|---|---|---|
| `asset_issued` | 1 | New asset issued |
| `agent_deployed` | 2 | New AI agent deployed |
| `fund_created` | 2 | New AI fund created |
| `liquidity_routed` | 3 | Order routed through liquidity sources |
| `trade_cleared` | 5 | Trade submitted for clearing |
| `position_settled` | 5 | Position settled |
| `risk_alert` | 4/6 | Risk threshold breach |
| `circuit_breaker_triggered` | 6 | Circuit breaker fired |
| `monetary_policy_updated` | 7 | Policy action executed |
| `cross_protocol_allocation` | 8 | Cross-protocol capital movement |
| `governance_proposal_passed` | 9 | Proposal voted through |
| `emergency_override_activated` | 9 | Emergency action activated |
| `stability_index_updated` | 6 | Stability index recomputed |

## Demo Scenario

The full end-to-end ACMS demo flow:

1. **Issue assets** (L1) — Crypto + tokenized fund
2. **Deploy fund & agents** (L2) — AI hedge fund with strategy agents
3. **Set up liquidity** (L3) — Register DEX + OTC sources, route TWAP order
4. **Prime brokerage** (L4) — Capital pool allocation + margin accounts
5. **Clear & settle** (L5) — Submit trade → netting → settlement
6. **Risk monitoring** (L6) — Compute Stability Index + circuit breakers
7. **Monetary policy** (L7) — Policy creation + emission control
8. **Cross-protocol** (L8) — Protocol registration + liquidity passport
9. **Governance** (L9) — Proposal → vote → finalize → execute

See `tests/acms/acms.test.ts` for the full end-to-end test scenario.

## Roadmap

- **MVP Phase** — ACMS v1 core stack (current)
- **Institutional Phase** — Integration with live liquidity-network, clearing-house, gaamp, IPLS modules (Issues #119–#124)
- **Global Protocol Phase** — Protocol Constitution (#126), AGFI (#127), Sovereign-Grade Alignment (#128), Regulatory Integration (#129)
