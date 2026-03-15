// Transitional re-exports — module moved to examples/investor-demo/
// Explicit re-exports maintain backward compatibility for all consumers.

export { InvestorDemoManager, createInvestorDemoManager } from '../../examples/investor-demo/demo';
export {
  executeLandingStep,
  executeAgentCreationStep,
  executeTelegramIntegrationStep,
  executeWalletCreationStep,
  executeStrategyActivationStep,
  executeLiveDashboardStep,
  executeSocialViralStep,
} from '../../examples/investor-demo/steps';
export type {
  InvestorDemoConfig,
  DemoAIProvider,
  DemoStrategy,
  DemoMode,
  DemoPersona,
  DemoStepId,
  DemoStepStatus,
  DemoStep,
  DemoStepResult,
  LandingStepResult,
  AgentCreationResult,
  TelegramIntegrationResult,
  WalletCreationResult,
  StrategyActivationResult,
  LiveDashboardResult,
  SocialViralResult,
  DemoTrade,
  DemoExecutionLogEntry,
  DemoSessionStatus,
  DemoSession,
  DemoSummary,
  InvestorDemoEventType,
  InvestorDemoEvent,
  InvestorDemoEventCallback,
  InvestorDemoService,
} from '../../examples/investor-demo/types';
export { defaultInvestorDemoConfig } from '../../examples/investor-demo/types';

// Fund Investor Demo Flow (Issue #153)
export { FundInvestorDemoManager, createFundInvestorDemoManager } from '../../examples/investor-demo/fund-demo';
export {
  executeStrategyDiscoveryStage,
  executeFundCreationStage,
  executeAgentDeploymentStage,
  executeLiveExecutionStage,
  executePerformanceMonitoringStage,
  executeRebalancingStage,
} from '../../examples/investor-demo/fund-demo-steps';
export type {
  FundInvestorDemoConfig,
  DemoMarketplaceStrategy,
  FundDemoStageId,
  FundDemoStageStatus,
  FundDemoStage,
  FundDemoStageResult,
  StrategyDiscoveryResult,
  FundCreationResult,
  AgentDeploymentResult,
  DeployedStrategyAgent,
  LiveExecutionResult,
  SimulatedTrade,
  SimulatedMarketEvent,
  PerformanceMonitoringResult,
  StrategyPerformanceSnapshot,
  RebalancingResult,
  RebalancingAction,
  FundDemoSessionStatus,
  FundDemoSession,
  FundDemoSummary,
  FundDemoEventType,
  FundDemoEvent,
  FundDemoEventCallback,
  FundInvestorDemoService,
} from '../../examples/investor-demo/fund-demo-types';
export { defaultFundInvestorDemoConfig, DEFAULT_DEMO_STRATEGIES } from '../../examples/investor-demo/fund-demo-types';
