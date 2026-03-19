/**
 * TONAIAgent - Structured Logging System
 *
 * Production-grade JSON logger with contextual metadata support.
 * Implements Issue #275: Observability, Monitoring & Production Readiness
 *
 * Features:
 * - JSON-structured log output (production-ready)
 * - Contextual metadata: userId, agentId, strategyId, txHash
 * - Log levels: debug, info, warn, error
 * - Async-safe (synchronous, no I/O blocking)
 * - Pluggable transport (default: console)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Log level values in ascending severity order.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log event — the canonical shape written to output.
 */
export interface LogEvent {
  /** Severity level */
  level: LogLevel;
  /** Originating service/module name */
  service: string;
  /** Human-readable message */
  message: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Optional contextual metadata */
  metadata?: LogEventMetadata;
}

/**
 * Contextual metadata attached to a log event.
 */
export interface LogEventMetadata {
  /** User performing the action */
  userId?: string;
  /** Agent involved */
  agentId?: string;
  /** Strategy being executed */
  strategyId?: string;
  /** On-chain transaction hash (if applicable) */
  txHash?: string;
  /** Any additional key-value pairs */
  [key: string]: unknown;
}

/**
 * A transport receives serialised log events for output.
 */
export type LogTransport = (event: LogEvent) => void;

/**
 * Configuration for the Logger.
 */
export interface LoggerConfig {
  /** Minimum level to emit (e.g. 'info' suppresses 'debug') */
  minLevel: LogLevel;
  /** Whether to output pretty-printed JSON (development) or compact JSON (production) */
  pretty: boolean;
  /** Custom transport; defaults to console.log */
  transport?: LogTransport;
}

/** Numeric ordering of levels for threshold comparison */
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Default logger configuration */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  minLevel: 'info',
  pretty: false,
};

// ============================================================================
// Logger
// ============================================================================

/**
 * Structured JSON logger.
 *
 * @example
 * ```typescript
 * const logger = createLogger('execution-engine');
 * logger.info('Trade executed', { agentId: 'agent_001', txHash: '0xabc...' });
 * logger.error('Trade failed', { agentId: 'agent_001', reason: 'slippage' });
 * ```
 */
export class Logger {
  private readonly service: string;
  private readonly config: LoggerConfig;
  private readonly transport: LogTransport;
  private contextMetadata: LogEventMetadata;

  constructor(service: string, config?: Partial<LoggerConfig>) {
    this.service = service;
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    this.transport = this.config.transport ?? defaultConsoleTransport;
    this.contextMetadata = {};
  }

  // --------------------------------------------------------------------------
  // Log methods
  // --------------------------------------------------------------------------

  /** Emit a debug-level event */
  debug(message: string, metadata?: LogEventMetadata): void {
    this.emit('debug', message, metadata);
  }

  /** Emit an info-level event */
  info(message: string, metadata?: LogEventMetadata): void {
    this.emit('info', message, metadata);
  }

  /** Emit a warn-level event */
  warn(message: string, metadata?: LogEventMetadata): void {
    this.emit('warn', message, metadata);
  }

  /** Emit an error-level event */
  error(message: string, metadata?: LogEventMetadata): void {
    this.emit('error', message, metadata);
  }

  // --------------------------------------------------------------------------
  // Context helpers
  // --------------------------------------------------------------------------

  /**
   * Return a child logger with persistent context metadata.
   * Useful for request-scoped logging (e.g. per-agent).
   *
   * @example
   * ```typescript
   * const agentLogger = logger.withContext({ agentId: 'agent_001', userId: 'user_42' });
   * agentLogger.info('Strategy started', { strategyId: 'dca_001' });
   * // => { level: 'info', service: '...', agentId: 'agent_001', userId: 'user_42', strategyId: 'dca_001', ... }
   * ```
   */
  withContext(metadata: LogEventMetadata): Logger {
    const child = new Logger(this.service, this.config);
    child.contextMetadata = { ...this.contextMetadata, ...metadata };
    return child;
  }

  /**
   * Attach context to this logger instance (mutates in place).
   */
  setContext(metadata: LogEventMetadata): void {
    this.contextMetadata = { ...this.contextMetadata, ...metadata };
  }

  /**
   * Clear the context metadata.
   */
  clearContext(): void {
    this.contextMetadata = {};
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private emit(level: LogLevel, message: string, metadata?: LogEventMetadata): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.config.minLevel]) {
      return;
    }

    const merged: LogEventMetadata | undefined =
      Object.keys(this.contextMetadata).length > 0 || metadata
        ? { ...this.contextMetadata, ...metadata }
        : undefined;

    const event: LogEvent = {
      level,
      service: this.service,
      message,
      timestamp: new Date().toISOString(),
      ...(merged !== undefined ? { metadata: merged } : {}),
    };

    this.transport(event);
  }
}

// ============================================================================
// Default transport
// ============================================================================

/**
 * Default transport: writes compact or pretty JSON to stdout via console.log.
 */
export function defaultConsoleTransport(event: LogEvent): void {
  const line = JSON.stringify(event);
  // Use console.error for warn/error so they appear on stderr
  if (event.level === 'warn' || event.level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

/**
 * In-memory transport — captures events for testing.
 */
export function createMemoryTransport(): { transport: LogTransport; events: LogEvent[] } {
  const events: LogEvent[] = [];
  const transport: LogTransport = (event) => events.push(event);
  return { transport, events };
}

// ============================================================================
// Factory functions
// ============================================================================

/**
 * Create a Logger for the given service.
 *
 * @example
 * ```typescript
 * const log = createLogger('risk-engine');
 * log.warn('High drawdown detected', { agentId: 'agent_001', drawdown: -8.5 });
 * ```
 */
export function createLogger(service: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(service, config);
}

/**
 * Create a Logger that captures output to an in-memory array (useful in tests).
 */
export function createTestLogger(service: string): { logger: Logger; events: LogEvent[] } {
  const { transport, events } = createMemoryTransport();
  const logger = new Logger(service, { minLevel: 'debug', pretty: false, transport });
  return { logger, events };
}
