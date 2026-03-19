/**
 * TONAIAgent - Observability Layer
 *
 * Public exports for the Observability module (Issue #275).
 *
 * The Observability layer provides:
 * - Structured JSON logging with contextual metadata
 * - Metrics collection for trading, agents, marketplace, and system
 *
 * Usage:
 *   import { createLogger, createMetricsCollector } from './observability';
 *
 * Quick Start:
 *   // Logging
 *   const log = createLogger('my-service');
 *   log.info('Trade executed', { agentId: 'agent_001', txHash: '0x...' });
 *
 *   // Metrics
 *   const metrics = createMetricsCollector();
 *   metrics.trading.recordSuccess(120, 5);
 *   const snapshot = metrics.snapshot();
 */

// Logging
export {
  Logger,
  createLogger,
  createTestLogger,
  createMemoryTransport,
  defaultConsoleTransport,
  DEFAULT_LOGGER_CONFIG,
} from './logger';

export type {
  LogLevel,
  LogEvent,
  LogEventMetadata,
  LogTransport,
  LoggerConfig,
} from './logger';

// Metrics
export {
  SimpleCounter,
  SimpleGauge,
  SimpleHistogram,
  TradingMetricsCollector,
  AgentMetricsCollector,
  MarketplaceMetricsCollector,
  SystemMetricsCollector,
  MetricsCollector,
  createMetricsCollector,
} from './metrics';

export type {
  Counter,
  Gauge,
  Histogram,
  TradingMetrics,
  AgentSystemMetrics,
  MarketplaceSystemMetrics,
  SystemMetrics,
  AllMetrics,
} from './metrics';
