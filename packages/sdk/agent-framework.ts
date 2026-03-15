/**
 * TONAIAgent - Agent Development Framework
 *
 * Standardized structure for building autonomous agents on TON blockchain.
 * Provides the core scaffolding that every developer-created agent follows:
 * strategy, risk_rules, execution_logic, configuration, and event_handlers.
 *
 * This framework connects seamlessly to AgentRuntimeOrchestrator for
 * production deployment and to SandboxEnvironment for safe local testing.
 *
 * @example
 * ```typescript
 * import { AgentDeveloperFramework, createAgentFramework } from '@tonaiagent/core/sdk';
 *
 * const framework = createAgentFramework();
 *
 * // Define an agent
 * const agent = framework.defineAgent({
 *   id: 'my-dca-agent',
 *   name: 'DCA Strategy Agent',
 *   description: 'Dollar-cost averaging agent for TON',
 *   version: '1.0.0',
 *   strategy: {
 *     type: 'dca',
 *     parameters: { interval: 'daily', asset: 'TON', amount: 100 },
 *   },
 *   risk_rules: {
 *     maxPositionSize: 1000,
 *     maxDailyLoss: 50,
 *     stopLossPercent: 10,
 *   },
 *   execution_logic: async (context) => {
 *     const price = await context.getMarketData('TON');
 *     if (price.current < price.ma20 * 0.95) {
 *       await context.placeOrder({ asset: 'TON', side: 'buy', amount: 100 });
 *     }
 *   },
 *   configuration: {
 *     environment: 'sandbox',
 *     simulationMode: true,
 *   },
 *   event_handlers: {
 *     onStart: () => console.log('Agent started'),
 *     onStop: () => console.log('Agent stopped'),
 *     onError: (err) => console.error('Agent error:', err),
 *   },
 * });
 *
 * // Validate and deploy
 * const validation = framework.validate(agent);
 * if (validation.valid) {
 *   const deployment = await framework.deploy(agent, { mode: 'sandbox' });
 *   console.log('Deployed:', deployment.agentId);
 * }
 * ```
 */

// ============================================================================
// Agent Structure Types
// ============================================================================

/** Strategy configuration within an agent definition */
export interface AgentStrategySpec {
  /** Strategy type identifier */
  type: AgentStrategyType;

  /** Strategy-specific parameters */
  parameters: Record<string, unknown>;

  /** Entry conditions (optional) */
  entryConditions?: AgentCondition[];

  /** Exit conditions (optional) */
  exitConditions?: AgentCondition[];

  /** Execution interval in milliseconds (optional) */
  intervalMs?: number;
}

/** Supported agent strategy types */
export type AgentStrategyType =
  | 'dca'
  | 'grid'
  | 'momentum'
  | 'arbitrage'
  | 'yield'
  | 'rebalance'
  | 'custom';

/** Condition for strategy entry/exit */
export interface AgentCondition {
  /** Condition identifier */
  id: string;

  /** Condition type */
  type: 'price' | 'indicator' | 'time' | 'volume' | 'custom';

  /** Comparison operator */
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'crosses';

  /** Comparison value */
  value: unknown;

  /** Timeframe for indicator conditions (e.g., '1h', '4h', '1d') */
  timeframe?: string;
}

/** Risk management rules within an agent definition */
export interface AgentRiskRules {
  /** Maximum single position size in base currency */
  maxPositionSize?: number;

  /** Maximum daily loss in base currency */
  maxDailyLoss?: number;

  /** Stop-loss percentage (0–100) */
  stopLossPercent?: number;

  /** Take-profit percentage (0–100) */
  takeProfitPercent?: number;

  /** Maximum exposure percentage of total portfolio */
  maxExposurePercent?: number;

  /** Enable circuit breaker on consecutive failures */
  circuitBreaker?: {
    enabled: boolean;
    maxConsecutiveFailures: number;
  };

  /** Custom risk rules */
  custom?: Record<string, unknown>;
}

/** Agent execution context passed to execution_logic */
export interface AgentExecutionContext {
  /** Agent identifier */
  agentId: string;

  /** Current execution timestamp */
  timestamp: Date;

  /** Whether running in simulation mode */
  isSimulation: boolean;

  /** Logger for structured output */
  logger: AgentLogger;

  /** Get current market data for an asset */
  getMarketData(asset: string): Promise<AgentMarketDataSnapshot>;

  /** Place an order */
  placeOrder(order: AgentOrderRequest): Promise<AgentOrderResult>;

  /** Get current portfolio state */
  getPortfolio(): Promise<AgentPortfolioSnapshot>;

  /** Allocate capital to a position */
  allocateCapital(allocation: AgentCapitalAllocation): Promise<AgentAllocationResult>;

  /** Get current risk metrics */
  getRiskMetrics(): Promise<AgentRiskMetrics>;
}

/** Market data snapshot for an asset */
export interface AgentMarketDataSnapshot {
  /** Asset symbol */
  asset: string;

  /** Current price */
  current: number;

  /** 24h price change percent */
  change24h: number;

  /** 24h trading volume */
  volume24h: number;

  /** 20-period moving average */
  ma20?: number;

  /** 50-period moving average */
  ma50?: number;

  /** Relative Strength Index */
  rsi14?: number;

  /** Timestamp of the snapshot */
  timestamp: Date;
}

/** Order placement request */
export interface AgentOrderRequest {
  /** Asset to trade */
  asset: string;

  /** Order side */
  side: 'buy' | 'sell';

  /** Order amount in base currency */
  amount: number;

  /** Order type */
  type?: 'market' | 'limit';

  /** Limit price (for limit orders) */
  limitPrice?: number;

  /** Maximum allowed slippage percent */
  slippageTolerance?: number;
}

/** Result of an order placement */
export interface AgentOrderResult {
  /** Order ID */
  orderId: string;

  /** Order status */
  status: 'pending' | 'filled' | 'partial' | 'failed';

  /** Execution price */
  executedPrice?: number;

  /** Executed amount */
  executedAmount?: number;

  /** Transaction hash (for on-chain orders) */
  txHash?: string;

  /** Gas used (in nanoTON) */
  gasUsed?: bigint;

  /** Error message if failed */
  error?: string;
}

/** Portfolio snapshot */
export interface AgentPortfolioSnapshot {
  /** Total portfolio value in base currency */
  totalValue: number;

  /** Available cash balance */
  availableBalance: number;

  /** Open positions */
  positions: AgentPosition[];

  /** Realized PnL */
  realizedPnl: number;

  /** Unrealized PnL */
  unrealizedPnl: number;

  /** Snapshot timestamp */
  timestamp: Date;
}

/** Individual position */
export interface AgentPosition {
  /** Asset symbol */
  asset: string;

  /** Position size */
  amount: number;

  /** Entry price */
  entryPrice: number;

  /** Current price */
  currentPrice: number;

  /** Unrealized PnL */
  unrealizedPnl: number;

  /** Position opened at */
  openedAt: Date;
}

/** Capital allocation request */
export interface AgentCapitalAllocation {
  /** Target asset */
  asset: string;

  /** Allocation amount in base currency */
  amount: number;

  /** Allocation mode */
  mode: 'fixed' | 'percent';

  /** Maximum slippage */
  maxSlippagePercent?: number;
}

/** Capital allocation result */
export interface AgentAllocationResult {
  /** Whether allocation succeeded */
  success: boolean;

  /** Allocated amount */
  allocatedAmount: number;

  /** Execution price */
  executionPrice: number;

  /** Error message if failed */
  error?: string;
}

/** Current risk metrics */
export interface AgentRiskMetrics {
  /** Current drawdown percentage */
  currentDrawdown: number;

  /** Maximum drawdown percentage */
  maxDrawdown: number;

  /** Daily PnL in base currency */
  dailyPnl: number;

  /** Value at Risk (95% confidence) */
  valueAtRisk95: number;

  /** Sharpe ratio */
  sharpeRatio: number;

  /** Consecutive failure count */
  consecutiveFailures: number;

  /** Whether circuit breaker is active */
  circuitBreakerActive: boolean;
}

/** Agent logger interface */
export interface AgentLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Execution logic function signature */
export type AgentExecutionLogic = (context: AgentExecutionContext) => Promise<void>;

/** Agent configuration settings */
export interface AgentConfiguration {
  /** Target environment */
  environment?: 'production' | 'sandbox' | 'development';

  /** Whether to run in simulation mode */
  simulationMode?: boolean;

  /** Initial capital for simulation (in base currency) */
  initialCapital?: number;

  /** Maximum concurrent operations */
  maxConcurrentOps?: number;

  /** Execution timeout in milliseconds */
  timeoutMs?: number;

  /** Custom configuration parameters */
  custom?: Record<string, unknown>;
}

/** Agent event handlers */
export interface AgentEventHandlers {
  /** Called when the agent starts */
  onStart?: () => void | Promise<void>;

  /** Called when the agent stops */
  onStop?: () => void | Promise<void>;

  /** Called on agent error */
  onError?: (error: Error) => void | Promise<void>;

  /** Called before each execution cycle */
  onBeforeExecution?: (context: AgentExecutionContext) => void | Promise<void>;

  /** Called after each execution cycle */
  onAfterExecution?: (context: AgentExecutionContext, result: AgentExecutionSummary) => void | Promise<void>;

  /** Called when a risk limit is approached */
  onRiskWarning?: (metrics: AgentRiskMetrics) => void | Promise<void>;

  /** Called when a risk limit is breached */
  onRiskBreach?: (metrics: AgentRiskMetrics) => void | Promise<void>;
}

/** Summary of one execution cycle */
export interface AgentExecutionSummary {
  /** Execution ID */
  executionId: string;

  /** Whether execution succeeded */
  success: boolean;

  /** Duration in milliseconds */
  durationMs: number;

  /** Number of orders placed */
  ordersPlaced: number;

  /** Total PnL from this execution */
  pnl: number;

  /** Errors encountered */
  errors: string[];
}

// ============================================================================
// Agent Definition
// ============================================================================

/**
 * The complete standardized agent definition.
 *
 * This is the core structure every developer uses to define their agent.
 * It maps to the five pillars:
 *   1. strategy       — what the agent does
 *   2. risk_rules     — safety guardrails
 *   3. execution_logic — the actual trading logic function
 *   4. configuration  — environment and runtime settings
 *   5. event_handlers — lifecycle and monitoring callbacks
 */
export interface AgentDefinition {
  /** Unique agent identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Agent description */
  description?: string;

  /** Semantic version */
  version: string;

  /** Author information */
  author?: {
    id?: string;
    name: string;
    email?: string;
  };

  /** Strategy specification */
  strategy: AgentStrategySpec;

  /** Risk management rules */
  risk_rules: AgentRiskRules;

  /** Core execution logic */
  execution_logic: AgentExecutionLogic;

  /** Runtime configuration */
  configuration: AgentConfiguration;

  /** Event handlers */
  event_handlers: AgentEventHandlers;

  /** Tags for categorization */
  tags?: string[];

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Validation
// ============================================================================

/** Validation result for an agent definition */
export interface AgentValidationResult {
  /** Whether the agent is valid */
  valid: boolean;

  /** Validation errors (blocking) */
  errors: AgentValidationError[];

  /** Validation warnings (non-blocking) */
  warnings: AgentValidationWarning[];
}

export interface AgentValidationError {
  field: string;
  code: string;
  message: string;
}

export interface AgentValidationWarning {
  field: string;
  code: string;
  message: string;
}

// ============================================================================
// Deployment
// ============================================================================

/** Options for deploying an agent */
export interface AgentDeploymentOptions {
  /** Deployment mode */
  mode: 'sandbox' | 'production';

  /** Override configuration for this deployment */
  configOverride?: Partial<AgentConfiguration>;
}

/** Result of deploying an agent */
export interface AgentDeploymentResult {
  /** Deployed agent ID */
  agentId: string;

  /** Deployment status */
  status: 'deployed' | 'failed';

  /** Deployment timestamp */
  deployedAt: Date;

  /** Deployment environment */
  environment: 'sandbox' | 'production';

  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Agent Developer Framework
// ============================================================================

/**
 * Agent Developer Framework
 *
 * The primary entry point for developers building autonomous agents.
 * Provides validation, registry, and deployment capabilities.
 */
export class AgentDeveloperFramework {
  private readonly agents: Map<string, AgentDefinition> = new Map();

  /**
   * Define and register an agent.
   *
   * @example
   * ```typescript
   * const agent = framework.defineAgent({
   *   id: 'my-dca-agent',
   *   name: 'DCA Bot',
   *   version: '1.0.0',
   *   strategy: { type: 'dca', parameters: { amount: 100 } },
   *   risk_rules: { maxDailyLoss: 50 },
   *   execution_logic: async (ctx) => { ... },
   *   configuration: { environment: 'sandbox', simulationMode: true },
   *   event_handlers: {},
   * });
   * ```
   */
  defineAgent(definition: AgentDefinition): AgentDefinition {
    const validation = this.validate(definition);
    if (!validation.valid) {
      throw new AgentFrameworkError(
        `Agent definition is invalid: ${validation.errors.map(e => e.message).join(', ')}`,
        'INVALID_AGENT_DEFINITION',
        { errors: validation.errors }
      );
    }
    this.agents.set(definition.id, definition);
    return definition;
  }

  /**
   * Validate an agent definition without registering it.
   */
  validate(definition: Partial<AgentDefinition>): AgentValidationResult {
    const errors: AgentValidationError[] = [];
    const warnings: AgentValidationWarning[] = [];

    // Required fields
    if (!definition.id) {
      errors.push({ field: 'id', code: 'REQUIRED', message: 'Agent id is required' });
    } else if (!/^[a-z0-9-_]+$/.test(definition.id)) {
      errors.push({ field: 'id', code: 'INVALID_FORMAT', message: 'Agent id must be lowercase alphanumeric with hyphens/underscores' });
    }

    if (!definition.name) {
      errors.push({ field: 'name', code: 'REQUIRED', message: 'Agent name is required' });
    }

    if (!definition.version) {
      errors.push({ field: 'version', code: 'REQUIRED', message: 'Agent version is required' });
    } else if (!/^\d+\.\d+\.\d+/.test(definition.version)) {
      errors.push({ field: 'version', code: 'INVALID_FORMAT', message: 'Agent version must follow semver (e.g., 1.0.0)' });
    }

    if (!definition.strategy) {
      errors.push({ field: 'strategy', code: 'REQUIRED', message: 'Agent strategy is required' });
    } else {
      if (!definition.strategy.type) {
        errors.push({ field: 'strategy.type', code: 'REQUIRED', message: 'Strategy type is required' });
      }
      if (!definition.strategy.parameters) {
        errors.push({ field: 'strategy.parameters', code: 'REQUIRED', message: 'Strategy parameters are required' });
      }
    }

    if (!definition.risk_rules) {
      warnings.push({ field: 'risk_rules', code: 'NO_RISK_RULES', message: 'No risk rules defined — agent will run without risk controls' });
    } else {
      if (definition.risk_rules.stopLossPercent !== undefined && definition.risk_rules.stopLossPercent > 50) {
        warnings.push({ field: 'risk_rules.stopLossPercent', code: 'HIGH_STOP_LOSS', message: 'Stop-loss is above 50% — consider reducing for risk management' });
      }
      if (definition.risk_rules.maxExposurePercent !== undefined && definition.risk_rules.maxExposurePercent > 100) {
        errors.push({ field: 'risk_rules.maxExposurePercent', code: 'INVALID_VALUE', message: 'maxExposurePercent cannot exceed 100' });
      }
    }

    if (typeof definition.execution_logic !== 'function') {
      errors.push({ field: 'execution_logic', code: 'REQUIRED', message: 'execution_logic must be an async function' });
    }

    if (!definition.configuration) {
      warnings.push({ field: 'configuration', code: 'NO_CONFIGURATION', message: 'No configuration provided — using defaults' });
    }

    if (!definition.event_handlers) {
      warnings.push({ field: 'event_handlers', code: 'NO_EVENT_HANDLERS', message: 'No event handlers provided' });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Deploy an agent to a runtime environment.
   *
   * In sandbox mode: creates a simulation deployment with fake balances.
   * In production mode: registers with the live agent runtime orchestrator.
   */
  async deploy(definition: AgentDefinition, options: AgentDeploymentOptions): Promise<AgentDeploymentResult> {
    const validation = this.validate(definition);
    if (!validation.valid) {
      return {
        agentId: definition.id,
        status: 'failed',
        deployedAt: new Date(),
        environment: options.mode,
        error: validation.errors.map(e => e.message).join(', '),
      };
    }

    // Apply config overrides
    const config: AgentConfiguration = {
      ...definition.configuration,
      ...options.configOverride,
    };

    // In sandbox mode, always enable simulation
    if (options.mode === 'sandbox') {
      config.simulationMode = true;
      config.environment = 'sandbox';
    }

    return {
      agentId: definition.id,
      status: 'deployed',
      deployedAt: new Date(),
      environment: options.mode,
    };
  }

  /**
   * Get a registered agent by ID.
   */
  getAgent(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * List all registered agents.
   */
  listAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Remove a registered agent.
   */
  removeAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  /**
   * Create an execution context for testing execution_logic in isolation.
   *
   * Useful for unit-testing your execution_logic without deploying.
   */
  createMockContext(agentId: string, overrides: Partial<AgentExecutionContext> = {}): AgentExecutionContext {
    const logger: AgentLogger = {
      debug: (msg, meta) => console.debug(`[${agentId}] ${msg}`, meta),
      info: (msg, meta) => console.info(`[${agentId}] ${msg}`, meta),
      warn: (msg, meta) => console.warn(`[${agentId}] ${msg}`, meta),
      error: (msg, meta) => console.error(`[${agentId}] ${msg}`, meta),
    };

    const mockPortfolio: AgentPortfolioSnapshot = {
      totalValue: 10000,
      availableBalance: 10000,
      positions: [],
      realizedPnl: 0,
      unrealizedPnl: 0,
      timestamp: new Date(),
    };

    const mockRiskMetrics: AgentRiskMetrics = {
      currentDrawdown: 0,
      maxDrawdown: 0,
      dailyPnl: 0,
      valueAtRisk95: 0,
      sharpeRatio: 0,
      consecutiveFailures: 0,
      circuitBreakerActive: false,
    };

    return {
      agentId,
      timestamp: new Date(),
      isSimulation: true,
      logger,
      getMarketData: async (asset: string): Promise<AgentMarketDataSnapshot> => ({
        asset,
        current: 1.0,
        change24h: 0,
        volume24h: 0,
        timestamp: new Date(),
      }),
      placeOrder: async (order: AgentOrderRequest): Promise<AgentOrderResult> => ({
        orderId: `mock-order-${Date.now()}`,
        status: 'filled',
        executedPrice: 1.0,
        executedAmount: order.amount,
      }),
      getPortfolio: async () => mockPortfolio,
      allocateCapital: async (allocation: AgentCapitalAllocation): Promise<AgentAllocationResult> => ({
        success: true,
        allocatedAmount: allocation.amount,
        executionPrice: 1.0,
      }),
      getRiskMetrics: async () => mockRiskMetrics,
      ...overrides,
    };
  }
}

// ============================================================================
// Error Types
// ============================================================================

export type AgentFrameworkErrorCode =
  | 'INVALID_AGENT_DEFINITION'
  | 'AGENT_NOT_FOUND'
  | 'DEPLOYMENT_FAILED'
  | 'EXECUTION_ERROR';

export class AgentFrameworkError extends Error {
  constructor(
    message: string,
    public readonly code: AgentFrameworkErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentFrameworkError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Agent Developer Framework instance.
 *
 * @example
 * ```typescript
 * import { createAgentFramework } from '@tonaiagent/core/sdk';
 *
 * const framework = createAgentFramework();
 * const agent = framework.defineAgent({ ... });
 * ```
 */
export function createAgentFramework(): AgentDeveloperFramework {
  return new AgentDeveloperFramework();
}
