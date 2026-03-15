/**
 * TONAIAgent - Market Replay Engine
 *
 * Sequential replay of historical market data with event-driven strategy
 * execution and realistic timing simulation.
 *
 * Flow: Historical Data → Market Replay Engine → Strategy Agent → Simulated Trades
 */

import {
  AssetSymbol,
  DataGranularity,
  OHLCVCandle,
  ReplayConfig,
  ReplayEvent,
  ReplayEventCallback,
  ReplayEventType,
  ReplayState,
  ReplayStatus,
  SessionId,
} from './types';
import { HistoricalDataManager, granularityToMs } from './historical-data';

// ============================================================================
// Replay Session
// ============================================================================

/**
 * Represents a single market replay session.
 * Maintains state and drives the sequential candle playback.
 */
export class MarketReplaySession {
  private readonly state: ReplayState;
  private readonly eventCallbacks: ReplayEventCallback[] = [];
  private allCandles: Map<number, OHLCVCandle[]> = new Map();
  private sortedTimestamps: number[] = [];
  private currentIndex: number = 0;
  private cancelled: boolean = false;

  constructor(
    private readonly sessionId: SessionId,
    private readonly config: ReplayConfig,
    private readonly dataManager: HistoricalDataManager
  ) {
    this.state = {
      sessionId,
      currentTime: config.startDate,
      startTime: config.startDate,
      endTime: config.endDate,
      status: 'idle',
      processedCandles: 0,
      totalCandles: 0,
      progressPercent: 0,
    };
  }

  /**
   * Subscribe to replay events (candle_closed, price_updated, etc.)
   */
  onEvent(callback: ReplayEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Get the current replay state
   */
  getState(): Readonly<ReplayState> {
    return this.state;
  }

  /**
   * Initialize the session by loading historical data
   */
  async initialize(): Promise<void> {
    const data = await this.dataManager.loadCandles(
      this.config.assets,
      this.config.startDate,
      this.config.endDate,
      this.config.granularity
    );

    // Group candles by timestamp for efficient lookup
    const timestampSet = new Set<number>();
    for (const [_asset, candles] of data) {
      for (const candle of candles) {
        const ts = candle.timestamp.getTime();
        timestampSet.add(ts);

        const existing = this.allCandles.get(ts) ?? [];
        existing.push(candle);
        this.allCandles.set(ts, existing);
      }
    }

    this.sortedTimestamps = Array.from(timestampSet).sort((a, b) => a - b);
    this.state.totalCandles = this.sortedTimestamps.length;
  }

  /**
   * Run the full replay, calling the onCandle handler for each time step.
   * The handler receives all asset candles for that timestamp.
   */
  async run(
    onCandle: (
      timestamp: Date,
      candles: OHLCVCandle[],
      currentPrices: Map<AssetSymbol, number>
    ) => void | Promise<void>
  ): Promise<void> {
    this.state.status = 'running';
    this.emitEvent('session_started', {
      sessionId: this.sessionId,
      totalCandles: this.state.totalCandles,
      assets: this.config.assets,
    });

    // Track current prices across time steps
    const currentPrices = new Map<AssetSymbol, number>();

    try {
      for (this.currentIndex = 0; this.currentIndex < this.sortedTimestamps.length; this.currentIndex++) {
        if (this.cancelled) {
          this.state.status = 'cancelled';
          this.emitEvent('session_cancelled', { sessionId: this.sessionId });
          return;
        }

        const ts = this.sortedTimestamps[this.currentIndex];
        const timestamp = new Date(ts);
        const candles = this.allCandles.get(ts) ?? [];

        // Update current prices
        for (const candle of candles) {
          currentPrices.set(candle.asset, candle.close);
        }

        // Update state
        this.state.currentTime = timestamp;
        this.state.processedCandles = this.currentIndex + 1;
        this.state.progressPercent = Math.round(
          ((this.currentIndex + 1) / this.state.totalCandles) * 100
        );

        // Emit candle event
        this.emitEvent('candle_closed', {
          timestamp: timestamp.toISOString(),
          candles: candles.map((c) => ({
            asset: c.asset,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          })),
          currentPrices: Object.fromEntries(currentPrices),
        });

        // Call strategy handler
        await onCandle(timestamp, candles, new Map(currentPrices));

        // Apply replay speed delay
        await this.applySpeedDelay();
      }

      this.state.status = 'completed';
      this.emitEvent('session_completed', {
        sessionId: this.sessionId,
        processedCandles: this.state.processedCandles,
        finalTime: this.state.currentTime.toISOString(),
      });
    } catch (error) {
      this.state.status = 'error';
      throw error;
    }
  }

  /**
   * Cancel the replay session
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Pause is handled externally via the cancelled flag + resume logic
   */
  pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
      this.emitEvent('session_paused', { sessionId: this.sessionId });
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async applySpeedDelay(): Promise<void> {
    const { speed } = this.config;

    if (speed === 'instant' || speed === 'fast') {
      return; // No delay for fast/instant modes
    }

    if (speed === 'realtime') {
      // Wait the actual duration of one candle
      const intervalMs = granularityToMs(this.config.granularity);
      await this.delay(Math.min(intervalMs, 1000)); // Cap at 1s for usability
      return;
    }

    if (typeof speed === 'number' && speed > 0) {
      await this.delay(speed);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private emitEvent(type: ReplayEventType, data: Record<string, unknown>): void {
    const event: ReplayEvent = {
      id: `replay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sessionId: this.sessionId,
      timestamp: new Date(),
      type,
      data,
    };

    for (const callback of this.eventCallbacks) {
      try {
        const result = callback(event);
        if (result instanceof Promise) {
          result.catch(() => {
            // Ignore async callback errors
          });
        }
      } catch {
        // Ignore synchronous callback errors
      }
    }
  }
}

// ============================================================================
// Market Replay Engine
// ============================================================================

/**
 * Manages multiple replay sessions and provides a high-level API
 * for orchestrating historical market data replay.
 */
export class MarketReplayEngine {
  private readonly sessions = new Map<SessionId, MarketReplaySession>();
  private readonly eventCallbacks: ReplayEventCallback[] = [];

  constructor(
    private readonly dataManager: HistoricalDataManager
  ) {}

  /**
   * Create a new replay session
   */
  createSession(config: ReplayConfig): MarketReplaySession {
    const sessionId = this.generateSessionId();
    const session = new MarketReplaySession(sessionId, config, this.dataManager);

    // Forward session events to engine listeners
    session.onEvent((event) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore errors
        }
      }
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: SessionId): MarketReplaySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Cancel all active sessions
   */
  cancelAll(): void {
    for (const session of this.sessions.values()) {
      const state = session.getState();
      if (state.status === 'running' || state.status === 'paused') {
        session.cancel();
      }
    }
  }

  /**
   * Get status of all sessions
   */
  getAllSessionStates(): ReplayState[] {
    return Array.from(this.sessions.values()).map((s) => s.getState());
  }

  /**
   * Subscribe to all replay events
   */
  onEvent(callback: ReplayEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Utility: get the primary granularity for a date range given a target candle count
   */
  static recommendGranularity(
    start: Date,
    end: Date,
    targetCandleCount: number = 500
  ): DataGranularity {
    const durationMs = end.getTime() - start.getTime();
    const granularities: DataGranularity[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

    for (const g of granularities) {
      const candleCount = durationMs / granularityToMs(g);
      if (candleCount <= targetCandleCount) {
        return g;
      }
    }

    return '1w';
  }

  /**
   * Utility: check if two date ranges overlap
   */
  static dateRangesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1.getTime() <= end2.getTime() && end1.getTime() >= start2.getTime();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateSessionId(): SessionId {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMarketReplayEngine(
  dataManager: HistoricalDataManager
): MarketReplayEngine {
  return new MarketReplayEngine(dataManager);
}
