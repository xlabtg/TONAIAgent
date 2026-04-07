import { defineConfig } from 'tsup';

// Core modules: foundational runtime, AI, agent infrastructure, strategies, trading, market data
const coreEntries = {
  'core/index': 'core/index.ts',
  'core/ai/index': 'core/ai/index.ts',
  'core/ai-safety/index': 'core/ai-safety/index.ts',
  'core/security/index': 'core/security/index.ts',
  'core/plugins/index': 'core/plugins/index.ts',
  'core/multi-agent/index': 'core/multi-agent/index.ts',
  'core/protocol/index': 'core/protocol/index.ts',
  'core/protocol-constitution/index': 'core/protocol-constitution/index.ts',
  'core/risk-engine/index': 'core/risk-engine/index.ts',
  'core/runtime/index': 'core/runtime/index.ts',
  'core/agents/runtime/index': 'core/agents/runtime/index.ts',
  'core/agents/agent-runtime/index': 'core/agents/agent-runtime/index.ts',
  'core/agents/orchestrator/index': 'core/agents/orchestrator/index.ts',
  'core/agents/lifecycle/index': 'core/agents/lifecycle/index.ts',
  'core/strategies/engine/index': 'core/strategies/engine/index.ts',
  'core/strategies/strategy-engine/index': 'core/strategies/strategy-engine/index.ts',
  'core/strategies/marketplace/index': 'core/strategies/marketplace/index.ts',
  'core/strategies/backtesting/index': 'core/strategies/backtesting/index.ts',
  'core/market-data/base/index': 'core/market-data/base/index.ts',
  'core/market-data/data-platform/index': 'core/market-data/data-platform/index.ts',
  'core/portfolio/base/index': 'core/portfolio/base/index.ts',
  'core/portfolio/analytics/index': 'core/portfolio/analytics/index.ts',
  'core/trading/base/index': 'core/trading/base/index.ts',
  'core/trading/engine/index': 'core/trading/engine/index.ts',
  'core/trading/live/index': 'core/trading/live/index.ts',
  'core/agent/memory': 'core/agent/memory.ts',
};

// Extended modules: marketplace, no-code builder, UX, tokenomics, institutional, fund management
const extendedEntries = {
  'extended/marketplace/index': 'extended/marketplace/index.ts',
  'extended/no-code/index': 'extended/no-code/index.ts',
  'extended/mobile-ux/index': 'extended/mobile-ux/index.ts',
  'extended/superapp/index': 'extended/superapp/index.ts',
  'extended/personal-finance/index': 'extended/personal-finance/index.ts',
  'extended/growth/index': 'extended/growth/index.ts',
  'extended/launchpad/index': 'extended/launchpad/index.ts',
  'extended/mvp/index': 'extended/mvp/index.ts',
  'extended/production-miniapp/index': 'extended/production-miniapp/index.ts',
  'extended/tokenomics/index': 'extended/tokenomics/index.ts',
  'extended/institutional/index': 'extended/institutional/index.ts',
  'extended/hedgefund/index': 'extended/hedgefund/index.ts',
  'extended/rwa/index': 'extended/rwa/index.ts',
  'extended/monetary-policy/index': 'extended/monetary-policy/index.ts',
  'extended/fund-manager/index': 'extended/fund-manager/index.ts',
};

// Services: infrastructure, finance, agent services, data streams
const servicesEntries = {
  'services/institutional-network/index': 'services/institutional-network/index.ts',
  'services/omnichain/index': 'services/omnichain/index.ts',
  'services/ecosystem-fund/index': 'services/ecosystem-fund/index.ts',
  'services/token-strategy/index': 'services/token-strategy/index.ts',
  'services/payments/index': 'services/payments/index.ts',
  'services/regulatory/index': 'services/regulatory/index.ts',
  'services/ai-credit/index': 'services/ai-credit/index.ts',
  'services/distributed-scheduler/index': 'services/distributed-scheduler/index.ts',
  'services/multi-tenant/index': 'services/multi-tenant/index.ts',
  'services/global-infrastructure/index': 'services/global-infrastructure/index.ts',
  'services/investment/index': 'services/investment/index.ts',
  'services/token-utility-economy/index': 'services/token-utility-economy/index.ts',
  'services/prime-brokerage/index': 'services/prime-brokerage/index.ts',
  'services/clearing-house/index': 'services/clearing-house/index.ts',
  'services/autonomous-discovery/index': 'services/autonomous-discovery/index.ts',
  'services/reputation/index': 'services/reputation/index.ts',
  'services/monitoring/index': 'services/monitoring/index.ts',
  'services/agent-decision/index': 'services/agent-decision/index.ts',
  'services/agent-decision/autonomous-loop': 'services/agent-decision/autonomous-loop.ts',
  'services/agent-decision/miniapp-ui': 'services/agent-decision/miniapp-ui.ts',
  'services/agent-context/index': 'services/agent-context/index.ts',
  'services/signal-aggregator/index': 'services/signal-aggregator/index.ts',
};

// Connectors: TON, liquidity, cross-chain, signals
const connectorsEntries = {
  'connectors/ton-factory/index': 'connectors/ton-factory/index.ts',
  'connectors/liquidity-network/index': 'connectors/liquidity-network/index.ts',
  'connectors/liquidity-router/index': 'connectors/liquidity-router/index.ts',
  'connectors/cross-chain-liquidity/index': 'connectors/cross-chain-liquidity/index.ts',
  'connectors/ipls/index': 'connectors/ipls/index.ts',
  'connectors/signals/index': 'connectors/signals/index.ts',
};

// Research modules: AGFI, GAEI, ACMS, and other research frameworks
const researchEntries = {
  'research/acms/index': 'research/acms/index.ts',
  'research/agfi/index': 'research/agfi/index.ts',
  'research/agfn/index': 'research/agfn/index.ts',
  'research/gaamp/index': 'research/gaamp/index.ts',
  'research/gaei/index': 'research/gaei/index.ts',
  'research/grif/index': 'research/grif/index.ts',
  'research/sgia/index': 'research/sgia/index.ts',
  'research/aifos/index': 'research/aifos/index.ts',
};

// Packages, apps, and examples
const packagesEntries = {
  'packages/sdk/index': 'packages/sdk/index.ts',
  'apps/mvp-platform/index': 'apps/mvp-platform/index.ts',
  'examples/demo-agent/index': 'examples/demo-agent/index.ts',
  'examples/investor-demo/index': 'examples/investor-demo/index.ts',
};

const sharedConfig = {
  outDir: 'dist',
  format: ['cjs', 'esm'] as ('cjs' | 'esm')[],
};

// Full build: all groups run in sequence via tsup's multi-config support
export default defineConfig([
  // Build group 1: Core modules (runtime, AI, agents, strategies, trading, market data)
  {
    ...sharedConfig,
    entry: coreEntries,
  },
  // Build group 2: Extended modules (marketplace, no-code, UX, tokenomics, institutional)
  {
    ...sharedConfig,
    entry: extendedEntries,
  },
  // Build group 3: Services (infrastructure, finance, agent services, data streams)
  {
    ...sharedConfig,
    entry: servicesEntries,
  },
  // Build group 4: Connectors (TON, liquidity, cross-chain, signals)
  {
    ...sharedConfig,
    entry: connectorsEntries,
  },
  // Build group 5: Research (AGFI, GAEI, ACMS, and other research frameworks)
  {
    ...sharedConfig,
    entry: researchEntries,
  },
  // Build group 6: Packages, apps, and examples
  {
    ...sharedConfig,
    entry: packagesEntries,
  },
]);
