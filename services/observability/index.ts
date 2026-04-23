/**
 * TONAIAgent - Observability Layer
 *
 * Public exports for the Observability module (Issue #275, #313).
 *
 * The Observability layer provides:
 * - Structured JSON logging with contextual metadata
 * - Metrics collection for trading, agents, marketplace, and system
 * - Circuit breaker: auto-pause all agents if thresholds are breached (Issue #313)
 * - Multi-channel alerting: console, Telegram, PagerDuty, OpsGenie, webhook (Issue #313)
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
 *
 *   // Circuit breaker (Issue #313)
 *   const cb = createCircuitBreaker(emergencyController);
 *   cb.onTrip(event => log.warn('Circuit tripped', event));
 *   await cb.checkAndTrip(currentMetrics);
 *
 *   // Multi-channel alerting (Issue #313)
 *   const alerting = createAlertingManager({
 *     telegram: { botToken: '...', chatId: '-100...' },
 *   });
 *   await alerting.send(alertEvent);
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

// Circuit Breaker (Issue #313, #359)
export {
  TradingCircuitBreaker,
  createCircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_THRESHOLDS,
} from './circuit-breaker';

export type {
  CircuitBreakerMetrics,
  CircuitBreakerThresholds,
  TripSeverity,
  TripReason,
  CircuitTripEvent,
  TripHandler,
  TripUnsubscribe,
} from './circuit-breaker';

// Breaker State Persistence (Issue #359)
export { MemoryStateStore } from './breaker-state-store';
export { RedisStateStore, createRedisStateStore } from './breaker-state-redis';

export type {
  BreakerState,
  BreakerTransition,
  BreakerStateStore,
  BreakerStateHandler,
  BreakerStateUnsubscribe,
} from './breaker-state-store';

export type { RedisClient as BreakerRedisClient } from './breaker-state-redis';

// Multi-Channel Alerting (Issue #313)
export {
  AlertingManager,
  createAlertingManager,
} from './alerting';

export type {
  TelegramConfig,
  PagerDutyConfig,
  OpsGenieConfig,
  WebhookConfig,
  AlertingConfig,
  ChannelDeliveryResult,
  AlertDeliveryResult,
} from './alerting';
