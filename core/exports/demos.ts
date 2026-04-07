/**
 * Demo & Examples Domain Exports
 *
 * Investor-ready demo flow.
 * Import directly via subpath for tree-shaking:
 *   import { ... } from '@tonaiagent/core/investor-demo'
 */

// Investor-Ready End-to-End Demo Flow (Issue #90)
export * as InvestorDemo from '../../examples/investor-demo';
export {
  InvestorDemoManager,
  createInvestorDemoManager,
  defaultInvestorDemoConfig,
  type InvestorDemoConfig,
  type DemoSession,
  type DemoStep,
  type DemoStepId,
  type DemoSummary,
  type InvestorDemoService,
  type InvestorDemoEvent,
  type InvestorDemoEventCallback,
} from '../../examples/investor-demo';
