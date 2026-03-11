/**
 * TONAIAgent - Agent Plugin System Demo
 *
 * Demonstrates the plugin system capabilities:
 * 1. Creating a plugin manager with core TON plugins
 * 2. Installing a custom technical indicator plugin
 * 3. Running a strategy using plugin-generated analytics
 * 4. Displaying plugin metrics and health
 */

import {
  createPluginManager,
  type PluginManifest,
  type ToolHandler,
  type AIToolContext,
} from '../src/plugins';

// ============================================================================
// Demo Plugin: Technical Indicator
// ============================================================================

/**
 * A simple technical indicator plugin that computes RSI and moving averages.
 * This demonstrates the plugin manifest standard.
 */
const TECHNICAL_INDICATOR_MANIFEST: PluginManifest = {
  id: 'technical-indicators',
  name: 'Technical Indicators Plugin',
  version: '1.0.0',
  description: 'Provides technical analysis indicators (RSI, SMA, EMA) for AI trading agents',
  author: {
    name: 'TONAIAgent Community',
    email: 'plugins@tonaiagent.com',
    url: 'https://github.com/xlabtg/TONAIAgent',
  },
  category: 'analytics',
  trustLevel: 'community',
  keywords: ['technical-analysis', 'indicators', 'trading', 'rsi', 'moving-average'],
  license: 'MIT',
  homepage: 'https://github.com/xlabtg/TONAIAgent',
  permissions: [
    {
      scope: 'ton:read',
      reason: 'Read on-chain price and volume data for technical analysis',
      required: true,
    },
    {
      scope: 'storage:read',
      reason: 'Cache historical price data to avoid redundant API calls',
      required: false,
    },
  ],
  capabilities: {
    tools: [
      {
        name: 'calculate_rsi',
        description:
          'Calculates the Relative Strength Index (RSI) for a given token. ' +
          'RSI ranges from 0 to 100: values below 30 indicate oversold conditions ' +
          '(potential buy signal), values above 70 indicate overbought (potential sell signal).',
        category: 'analytics',
        parameters: {
          type: 'object',
          properties: {
            tokenAddress: {
              type: 'string',
              description: 'TON jetton address to analyze',
            },
            period: {
              type: 'number',
              description: 'RSI period (default: 14)',
              default: 14,
              minimum: 2,
              maximum: 200,
            },
          },
          required: ['tokenAddress'],
        },
        requiredPermissions: ['ton:read'],
        estimatedDurationMs: 500,
        retryable: true,
        maxRetries: 2,
        examples: [
          {
            description: 'Calculate 14-period RSI for USDT',
            input: { tokenAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', period: 14 },
            output: { rsi: 45.7, signal: 'neutral', trend: 'sideways' },
          },
        ],
      },
      {
        name: 'calculate_moving_average',
        description:
          'Calculates Simple Moving Average (SMA) or Exponential Moving Average (EMA) ' +
          'for a token. Used to identify trend direction and support/resistance levels.',
        category: 'analytics',
        parameters: {
          type: 'object',
          properties: {
            tokenAddress: {
              type: 'string',
              description: 'TON jetton address to analyze',
            },
            period: {
              type: 'number',
              description: 'Moving average period',
              default: 20,
              minimum: 2,
              maximum: 500,
            },
            type: {
              type: 'string',
              description: 'Moving average type: SMA (simple) or EMA (exponential)',
              enum: ['SMA', 'EMA'],
              default: 'SMA',
            },
          },
          required: ['tokenAddress'],
        },
        requiredPermissions: ['ton:read'],
        estimatedDurationMs: 300,
        retryable: true,
      },
      {
        name: 'get_market_summary',
        description:
          'Returns a comprehensive market analysis summary including RSI, moving averages, ' +
          'volume trends, and an overall market signal for a token. ' +
          'Use this to get a complete picture before making trading decisions.',
        category: 'analytics',
        parameters: {
          type: 'object',
          properties: {
            tokenAddress: {
              type: 'string',
              description: 'TON jetton address to analyze',
            },
          },
          required: ['tokenAddress'],
        },
        requiredPermissions: ['ton:read'],
        estimatedDurationMs: 800,
        retryable: true,
      },
    ],
  },
  configSchema: {
    type: 'object',
    properties: {
      defaultPeriod: {
        type: 'number',
        description: 'Default period for all indicator calculations',
        default: 14,
      },
      cacheResults: {
        type: 'boolean',
        description: 'Whether to cache indicator results in plugin storage',
        default: true,
      },
    },
  },
};

// ============================================================================
// Plugin Handler Implementations
// ============================================================================

const calculateRsiHandler: ToolHandler = async (params, context) => {
  const { tokenAddress, period = 14 } = params as {
    tokenAddress: string;
    period?: number;
  };

  context.logger.info('Calculating RSI', { tokenAddress, period });

  // In a real plugin, this would fetch historical prices and compute RSI.
  // For demo purposes, we simulate with synthetic data.
  const simulatedRsi = 30 + Math.random() * 45; // Range: 30-75

  let signal: string;
  if (simulatedRsi < 30) signal = 'oversold';
  else if (simulatedRsi > 70) signal = 'overbought';
  else signal = 'neutral';

  const result = {
    tokenAddress,
    period,
    rsi: Math.round(simulatedRsi * 100) / 100,
    signal,
    interpretation:
      signal === 'oversold'
        ? 'Potential buy opportunity — asset may be undervalued'
        : signal === 'overbought'
          ? 'Potential sell signal — asset may be overvalued'
          : 'No strong signal — market is balanced',
    calculatedAt: new Date().toISOString(),
  };

  context.logger.info('RSI calculated', { rsi: result.rsi, signal });
  return result;
};

const calculateMovingAverageHandler: ToolHandler = async (params, context) => {
  const { tokenAddress, period = 20, type = 'SMA' } = params as {
    tokenAddress: string;
    period?: number;
    type?: 'SMA' | 'EMA';
  };

  context.logger.info('Calculating moving average', { tokenAddress, period, type });

  // Simulated price data
  const currentPrice = 1.5 + Math.random() * 2;
  const maValue = currentPrice * (0.95 + Math.random() * 0.1);

  return {
    tokenAddress,
    period,
    type,
    currentPrice: Math.round(currentPrice * 10000) / 10000,
    maValue: Math.round(maValue * 10000) / 10000,
    priceVsMA: currentPrice > maValue ? 'above' : 'below',
    trend: currentPrice > maValue ? 'bullish' : 'bearish',
    calculatedAt: new Date().toISOString(),
  };
};

const getMarketSummaryHandler: ToolHandler = async (params, context) => {
  const { tokenAddress } = params as { tokenAddress: string };

  context.logger.info('Building market summary', { tokenAddress });

  // Simulate fetching multiple indicators
  const rsi = 30 + Math.random() * 45;
  const sma20 = 1.5 + Math.random();
  const currentPrice = sma20 * (0.95 + Math.random() * 0.1);
  const volume24h = 50000 + Math.random() * 200000;

  const rsiSignal = rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral';
  const trendSignal = currentPrice > sma20 ? 'bullish' : 'bearish';

  let overallSignal: string;
  if (rsiSignal === 'oversold' && trendSignal === 'bullish') overallSignal = 'strong_buy';
  else if (rsiSignal === 'overbought' && trendSignal === 'bearish') overallSignal = 'strong_sell';
  else if (trendSignal === 'bullish') overallSignal = 'buy';
  else if (trendSignal === 'bearish') overallSignal = 'sell';
  else overallSignal = 'hold';

  return {
    tokenAddress,
    currentPrice: Math.round(currentPrice * 10000) / 10000,
    indicators: {
      rsi: {
        value: Math.round(rsi * 100) / 100,
        signal: rsiSignal,
      },
      sma20: {
        value: Math.round(sma20 * 10000) / 10000,
        priceVsMA: currentPrice > sma20 ? 'above' : 'below',
      },
    },
    volume24h: Math.round(volume24h),
    trend: trendSignal,
    overallSignal,
    confidence: 0.6 + Math.random() * 0.3,
    generatedAt: new Date().toISOString(),
  };
};

const TECHNICAL_INDICATOR_HANDLERS: Record<string, ToolHandler> = {
  calculate_rsi: calculateRsiHandler,
  calculate_moving_average: calculateMovingAverageHandler,
  get_market_summary: getMarketSummaryHandler,
};

// ============================================================================
// Demo: Example 1 — Core Plugin Usage
// ============================================================================

async function demoCorePlugins() {
  console.log('\n=== Demo 1: Core TON Plugins ===\n');

  // Create manager — automatically installs core plugins (ton-wallet, ton-jettons, ton-nft)
  const manager = createPluginManager();
  await manager.initialize();

  // Display installed plugins
  const plugins = manager.getPlugins();
  console.log(`Installed ${plugins.length} core plugins:`);
  for (const p of plugins) {
    const toolCount = p.manifest.capabilities.tools.length;
    console.log(`  - [${p.manifest.id}] ${p.manifest.name} v${p.manifest.version} (${toolCount} tools)`);
  }

  // Get all AI-compatible tool definitions
  const tools = manager.getAIToolDefinitions();
  console.log(`\nTotal AI tools available: ${tools.length}`);

  // Show system message that would be sent to the AI
  const systemMsg = manager.buildToolsSystemMessage();
  console.log('\nTools system message preview (first 500 chars):');
  console.log(systemMsg.substring(0, 500) + '...');

  // Execute core tools
  const context: AIToolContext = {
    userId: 'demo-user',
    agentId: 'demo-agent',
    sessionId: 'demo-session-1',
    requestId: 'demo-req-1',
    walletAddress: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  };

  console.log('\nExecuting: ton_get_balance');
  const balanceResult = await manager.executeTool(
    'ton_get_balance',
    { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
    context
  );
  console.log('Result:', JSON.stringify(balanceResult.result, null, 2));

  console.log('\nExecuting: ton_validate_address');
  const validateResult = await manager.executeTool(
    'ton_validate_address',
    { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
    context
  );
  console.log('Result:', JSON.stringify(validateResult.result, null, 2));

  await manager.shutdown();
}

// ============================================================================
// Demo: Example 2 — Custom Plugin Installation
// ============================================================================

async function demoCustomPlugin() {
  console.log('\n=== Demo 2: Custom Technical Indicator Plugin ===\n');

  // Create manager without auto-installing core plugins
  const manager = createPluginManager({ autoInstallCore: false });
  await manager.initialize();

  // Install our custom plugin
  console.log('Installing technical-indicators plugin...');
  await manager.installPlugin(
    TECHNICAL_INDICATOR_MANIFEST,
    TECHNICAL_INDICATOR_HANDLERS,
    { activateImmediately: true }
  );

  console.log('Plugin installed and activated!');
  console.log('Available tools:');
  const tools = manager.getAIToolDefinitions();
  for (const tool of tools) {
    console.log(`  - ${tool.function.name}: ${tool.function.description.substring(0, 80)}...`);
  }

  // Execute the technical indicator tools
  const context: AIToolContext = {
    userId: 'trader-agent',
    agentId: 'strategy-agent-001',
    sessionId: 'trading-session-42',
    requestId: 'analysis-req-1',
  };

  const tokenAddress = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

  console.log('\n--- Running Strategy Analysis ---');
  console.log(`Token: ${tokenAddress.substring(0, 10)}...`);

  // Step 1: Get comprehensive market summary
  console.log('\nStep 1: Get market summary');
  const summaryResult = await manager.executeTool(
    'get_market_summary',
    { tokenAddress },
    context
  );
  const summary = summaryResult.result as Record<string, unknown>;
  console.log(`  Current price: ${summary.currentPrice} TON`);
  console.log(`  RSI: ${(summary.indicators as Record<string, unknown> & { rsi: Record<string, unknown> }).rsi.value} (${(summary.indicators as Record<string, unknown> & { rsi: Record<string, unknown> }).rsi.signal})`);
  console.log(`  Trend: ${summary.trend}`);
  console.log(`  Overall signal: ${summary.overallSignal}`);
  console.log(`  Confidence: ${((summary.confidence as number) * 100).toFixed(0)}%`);

  // Step 2: Calculate RSI for confirmation
  console.log('\nStep 2: Calculate RSI (14-period)');
  const rsiResult = await manager.executeTool(
    'calculate_rsi',
    { tokenAddress, period: 14 },
    context
  );
  const rsiData = rsiResult.result as Record<string, unknown>;
  console.log(`  RSI: ${rsiData.rsi}`);
  console.log(`  Signal: ${rsiData.signal}`);
  console.log(`  Interpretation: ${rsiData.interpretation}`);

  // Step 3: Get moving averages for trend confirmation
  console.log('\nStep 3: Calculate EMA (20-period)');
  const emaResult = await manager.executeTool(
    'calculate_moving_average',
    { tokenAddress, period: 20, type: 'EMA' },
    context
  );
  const emaData = emaResult.result as Record<string, unknown>;
  console.log(`  EMA-20: ${emaData.maValue}`);
  console.log(`  Price vs EMA: ${emaData.priceVsMA}`);
  console.log(`  Trend: ${emaData.trend}`);

  // Step 4: Make strategy decision
  console.log('\n--- Strategy Decision ---');
  const overallSignal = summary.overallSignal as string;
  if (overallSignal === 'strong_buy' || overallSignal === 'buy') {
    console.log('✅ RECOMMENDATION: Consider entry position');
    console.log('   Both RSI and trend signals are aligned bullishly');
  } else if (overallSignal === 'strong_sell' || overallSignal === 'sell') {
    console.log('⚠️  RECOMMENDATION: Consider reducing or exiting position');
    console.log('   Both RSI and trend signals indicate bearish conditions');
  } else {
    console.log('⏸  RECOMMENDATION: Hold current position');
    console.log('   No strong directional signals — wait for confirmation');
  }

  await manager.shutdown();
}

// ============================================================================
// Demo: Example 3 — Parallel Tool Execution (AI Function Calling Pattern)
// ============================================================================

async function demoParallelExecution() {
  console.log('\n=== Demo 3: Parallel AI Tool Calls ===\n');

  const manager = createPluginManager();
  await manager.initialize();

  // Install technical indicators alongside core plugins
  await manager.installPlugin(
    TECHNICAL_INDICATOR_MANIFEST,
    TECHNICAL_INDICATOR_HANDLERS,
    { activateImmediately: true }
  );

  const context: AIToolContext = {
    userId: 'portfolio-manager',
    agentId: 'rebalance-agent',
    sessionId: 'rebalance-session-1',
    requestId: 'batch-analysis-1',
  };

  // Simulate AI requesting multiple tool calls in parallel
  // (as if the AI returned: "I need to check balances and indicators simultaneously")
  console.log('Executing 4 tool calls in parallel...\n');

  const startTime = Date.now();
  const results = await manager.executeToolCallsParallel([
    {
      toolCallId: 'call_balance',
      toolName: 'ton_get_balance',
      args: { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
    },
    {
      toolCallId: 'call_validate',
      toolName: 'ton_validate_address',
      args: { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
    },
    {
      toolCallId: 'call_rsi',
      toolName: 'calculate_rsi',
      args: { tokenAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
    },
    {
      toolCallId: 'call_summary',
      toolName: 'get_market_summary',
      args: { tokenAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
    },
  ], context);

  const duration = Date.now() - startTime;
  console.log(`All 4 calls completed in ${duration}ms\n`);

  for (const r of results) {
    console.log(`[${r.toolCallId}] ${r.name}: ${r.success ? '✅ success' : '❌ failed'}`);
  }

  await manager.shutdown();
}

// ============================================================================
// Demo: Example 4 — Plugin Health, Metrics, and Observability
// ============================================================================

async function demoObservability() {
  console.log('\n=== Demo 4: Plugin Health & Metrics ===\n');

  // Subscribe to plugin events before initialization
  const events: string[] = [];
  const manager = createPluginManager({
    onEvent: (event) => {
      events.push(`${event.type} [${event.pluginId}]`);
    },
  });

  await manager.initialize();

  // Install custom plugin too
  await manager.installPlugin(
    TECHNICAL_INDICATOR_MANIFEST,
    TECHNICAL_INDICATOR_HANDLERS,
    { activateImmediately: true }
  );

  // Run some tools to generate metrics
  const context: AIToolContext = {
    userId: 'metrics-test',
    agentId: 'test-agent',
    sessionId: 'metrics-session',
    requestId: 'metrics-req',
  };

  for (let i = 0; i < 5; i++) {
    await manager.executeTool(
      'ton_get_balance',
      { address: `EQ${'0'.repeat(10)}${i}` },
      context
    );
  }

  for (let i = 0; i < 3; i++) {
    await manager.executeTool(
      'calculate_rsi',
      { tokenAddress: `EQ${'0'.repeat(10)}${i}` },
      context
    );
  }

  // Show health summary
  const health = manager.getHealthSummary();
  console.log('Plugin Health Summary:');
  console.log(`  Total plugins: ${health.total}`);
  console.log(`  Active: ${health.active}`);
  console.log(`  Healthy: ${health.healthy}`);
  console.log(`  Degraded: ${health.degraded}`);
  console.log(`  Unhealthy: ${health.unhealthy}`);

  // Show aggregate metrics
  const metrics = manager.getMetrics();
  console.log('\nAggregate Metrics:');
  console.log(`  Total executions: ${metrics.totalExecutions}`);
  console.log(`  Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
  console.log(`  Avg execution time: ${metrics.avgExecutionTimeMs.toFixed(1)}ms`);

  if (metrics.topPlugins.length > 0) {
    console.log('\nTop Plugins by Executions:');
    for (const p of metrics.topPlugins.slice(0, 3)) {
      console.log(`  - ${p.pluginId}: ${p.executions} executions`);
    }
  }

  if (metrics.topTools.length > 0) {
    console.log('\nTop Tools by Executions:');
    for (const t of metrics.topTools.slice(0, 3)) {
      console.log(`  - ${t.toolName}: ${t.executions} executions`);
    }
  }

  // Show runtime stats
  const stats = manager.getRuntimeStats();
  console.log('\nRuntime Stats:');
  console.log(`  Registered handlers: ${stats.registeredHandlers}`);
  console.log(`  Active executions: ${stats.activeExecutions}`);

  // Show events emitted
  console.log('\nPlugin events emitted during session:');
  for (const e of events) {
    console.log(`  - ${e}`);
  }

  await manager.shutdown();
  console.log('\n✅ All plugins deactivated during shutdown');
}

// ============================================================================
// Main Runner
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('  TONAIAgent — Agent Plugin System Demo');
  console.log('='.repeat(60));
  console.log('\nThis demo shows:');
  console.log('  1. Core TON plugins (wallet, jettons, NFT)');
  console.log('  2. Installing a custom technical indicator plugin');
  console.log('  3. Running a trading strategy using plugin analytics');
  console.log('  4. Parallel tool execution (AI function calling pattern)');
  console.log('  5. Health monitoring and metrics observability');

  try {
    await demoCorePlugins();
    await demoCustomPlugin();
    await demoParallelExecution();
    await demoObservability();

    console.log('\n' + '='.repeat(60));
    console.log('  ✅ All demos completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
