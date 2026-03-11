/**
 * Risk Engine — Stop-Loss Protection Manager
 * Issue #203: Risk Management Engine
 *
 * Automatic stop-loss enforcement for open positions.
 * When a position hits the stop-loss threshold, the engine forces exit.
 *
 * Features:
 *   - Configurable stop-loss percentage per strategy/agent
 *   - Trailing stop-loss support
 *   - Multiple stop-loss strategies (fixed, trailing, ATR-based)
 *   - Real-time position monitoring
 *   - Automatic exit signal generation
 */

import type {
  RiskEngineEvent,
  RiskEngineEventCallback,
} from './types';

// ============================================================================
// Stop-Loss Types
// ============================================================================

export type StopLossType = 'fixed' | 'trailing' | 'atr_based';

export interface StopLossConfig {
  /** Type of stop-loss */
  type: StopLossType;
  /** Stop-loss percentage (for fixed and trailing) */
  percentageFromEntry: number;
  /** Trailing activation threshold (price must move this % in profit first) */
  trailingActivationPercent?: number;
  /** ATR multiplier (for ATR-based stop-loss) */
  atrMultiplier?: number;
}

export interface Position {
  /** Unique position ID */
  positionId: string;
  /** Agent ID holding the position */
  agentId: string;
  /** Asset symbol */
  asset: string;
  /** Entry price */
  entryPrice: number;
  /** Current amount held */
  amount: number;
  /** Position side (long = positive amount, short = negative) */
  side: 'long' | 'short';
  /** Stop-loss configuration for this position */
  stopLossConfig: StopLossConfig;
  /** Current stop-loss price */
  stopLossPrice: number;
  /** Highest price since entry (for trailing stop) */
  highestPrice: number;
  /** Lowest price since entry (for trailing stop on shorts) */
  lowestPrice: number;
  /** Whether stop-loss has been triggered */
  stopLossTriggered: boolean;
  /** Position opened at */
  openedAt: Date;
  /** Strategy ID (optional) */
  strategyId?: string;
}

export interface StopLossCheck {
  /** Position being checked */
  positionId: string;
  /** Current market price */
  currentPrice: number;
  /** Whether stop-loss was triggered */
  triggered: boolean;
  /** Stop-loss price that was breached */
  stopLossPrice: number;
  /** Loss percentage if triggered */
  lossPercent?: number;
  /** Exit signal generated */
  exitSignal?: StopLossExitSignal;
}

export interface StopLossExitSignal {
  /** Signal ID */
  signalId: string;
  /** Position ID */
  positionId: string;
  /** Agent ID */
  agentId: string;
  /** Asset to sell */
  asset: string;
  /** Amount to sell (full position) */
  amount: number;
  /** Action: SELL for longs, BUY to cover for shorts */
  action: 'SELL' | 'BUY';
  /** Reason for exit */
  reason: string;
  /** Target price (current market price) */
  targetPrice: number;
  /** Urgency level */
  urgency: 'immediate' | 'normal';
  /** Generated at */
  generatedAt: Date;
}

export interface StopLossManagerConfig {
  /** Default stop-loss percentage (default: 5%) */
  defaultStopLossPercent: number;
  /** Default stop-loss type (default: fixed) */
  defaultStopLossType: StopLossType;
  /** Enable trailing stop-loss (default: true) */
  enableTrailingStopLoss: boolean;
  /** Trailing activation threshold (default: 2%) */
  trailingActivationPercent: number;
  /** Default ATR multiplier (default: 2.0) */
  defaultAtrMultiplier: number;
  /** Check interval in milliseconds (default: 1000) */
  checkIntervalMs: number;
}

export const DEFAULT_STOP_LOSS_CONFIG: StopLossManagerConfig = {
  defaultStopLossPercent: 5,
  defaultStopLossType: 'fixed',
  enableTrailingStopLoss: true,
  trailingActivationPercent: 2,
  defaultAtrMultiplier: 2.0,
  checkIntervalMs: 1000,
};

// ============================================================================
// Stop-Loss Manager Interface
// ============================================================================

export interface StopLossManager {
  /** Register a new position for stop-loss monitoring */
  registerPosition(position: Omit<Position, 'stopLossPrice' | 'highestPrice' | 'lowestPrice' | 'stopLossTriggered'>): Position;
  /** Update position with current market price and check stop-loss */
  checkPosition(positionId: string, currentPrice: number): StopLossCheck;
  /** Check all positions against current prices */
  checkAllPositions(prices: Map<string, number>): StopLossCheck[];
  /** Get a position by ID */
  getPosition(positionId: string): Position | undefined;
  /** Get all positions for an agent */
  getAgentPositions(agentId: string): Position[];
  /** Get all active positions */
  getAllPositions(): Position[];
  /** Close a position (remove from monitoring) */
  closePosition(positionId: string): void;
  /** Update stop-loss configuration for a position */
  updateStopLoss(positionId: string, config: Partial<StopLossConfig>): void;
  /** Get configuration */
  getConfig(): StopLossManagerConfig;
  /** Subscribe to stop-loss events */
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Stop-Loss Manager Implementation
// ============================================================================

export class DefaultStopLossManager implements StopLossManager {
  private readonly config: StopLossManagerConfig;
  private readonly positions = new Map<string, Position>();
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];
  private signalCounter = 0;

  constructor(config?: Partial<StopLossManagerConfig>) {
    this.config = { ...DEFAULT_STOP_LOSS_CONFIG, ...config };
  }

  onEvent(callback: RiskEngineEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<RiskEngineEvent, 'timestamp'>): void {
    const fullEvent: RiskEngineEvent = {
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  registerPosition(
    positionInput: Omit<Position, 'stopLossPrice' | 'highestPrice' | 'lowestPrice' | 'stopLossTriggered'>,
  ): Position {
    const stopLossPrice = this.calculateStopLossPrice(
      positionInput.entryPrice,
      positionInput.side,
      positionInput.stopLossConfig,
    );

    const position: Position = {
      ...positionInput,
      stopLossPrice,
      highestPrice: positionInput.entryPrice,
      lowestPrice: positionInput.entryPrice,
      stopLossTriggered: false,
    };

    this.positions.set(position.positionId, position);

    this.emitEvent({
      type: 'exposure_updated',
      payload: {
        event: 'position_registered',
        positionId: position.positionId,
        agentId: position.agentId,
        asset: position.asset,
        entryPrice: position.entryPrice,
        stopLossPrice,
        stopLossPercent: position.stopLossConfig.percentageFromEntry,
      },
    });

    return position;
  }

  checkPosition(positionId: string, currentPrice: number): StopLossCheck {
    const position = this.positions.get(positionId);
    if (!position) {
      return {
        positionId,
        currentPrice,
        triggered: false,
        stopLossPrice: 0,
      };
    }

    // Update highest/lowest price for trailing stop
    if (currentPrice > position.highestPrice) {
      position.highestPrice = currentPrice;
      if (position.stopLossConfig.type === 'trailing' && position.side === 'long') {
        this.updateTrailingStopLoss(position);
      }
    }
    if (currentPrice < position.lowestPrice) {
      position.lowestPrice = currentPrice;
      if (position.stopLossConfig.type === 'trailing' && position.side === 'short') {
        this.updateTrailingStopLoss(position);
      }
    }

    // Check if stop-loss triggered
    const triggered = this.isStopLossTriggered(position, currentPrice);

    let exitSignal: StopLossExitSignal | undefined;
    let lossPercent: number | undefined;

    if (triggered && !position.stopLossTriggered) {
      position.stopLossTriggered = true;
      lossPercent = this.calculateLossPercent(position, currentPrice);
      exitSignal = this.generateExitSignal(position, currentPrice, lossPercent);

      this.emitEvent({
        type: 'risk_response_triggered',
        payload: {
          event: 'stop_loss_triggered',
          positionId: position.positionId,
          agentId: position.agentId,
          asset: position.asset,
          entryPrice: position.entryPrice,
          exitPrice: currentPrice,
          stopLossPrice: position.stopLossPrice,
          lossPercent,
          exitSignal,
        },
      });
    }

    return {
      positionId,
      currentPrice,
      triggered,
      stopLossPrice: position.stopLossPrice,
      lossPercent,
      exitSignal,
    };
  }

  checkAllPositions(prices: Map<string, number>): StopLossCheck[] {
    const results: StopLossCheck[] = [];

    for (const position of this.positions.values()) {
      const price = prices.get(position.asset);
      if (price !== undefined) {
        results.push(this.checkPosition(position.positionId, price));
      }
    }

    return results;
  }

  getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId);
  }

  getAgentPositions(agentId: string): Position[] {
    return Array.from(this.positions.values()).filter(p => p.agentId === agentId);
  }

  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  closePosition(positionId: string): void {
    const position = this.positions.get(positionId);
    if (position) {
      this.positions.delete(positionId);

      this.emitEvent({
        type: 'exposure_updated',
        payload: {
          event: 'position_closed',
          positionId,
          agentId: position.agentId,
          asset: position.asset,
        },
      });
    }
  }

  updateStopLoss(positionId: string, config: Partial<StopLossConfig>): void {
    const position = this.positions.get(positionId);
    if (!position) return;

    position.stopLossConfig = { ...position.stopLossConfig, ...config };
    position.stopLossPrice = this.calculateStopLossPrice(
      position.entryPrice,
      position.side,
      position.stopLossConfig,
    );

    this.emitEvent({
      type: 'exposure_updated',
      payload: {
        event: 'stop_loss_updated',
        positionId,
        newStopLossPrice: position.stopLossPrice,
        config: position.stopLossConfig,
      },
    });
  }

  getConfig(): StopLossManagerConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private calculateStopLossPrice(
    entryPrice: number,
    side: 'long' | 'short',
    config: StopLossConfig,
  ): number {
    const percent = config.percentageFromEntry / 100;

    if (side === 'long') {
      // Long position: stop-loss is below entry
      return entryPrice * (1 - percent);
    } else {
      // Short position: stop-loss is above entry
      return entryPrice * (1 + percent);
    }
  }

  private updateTrailingStopLoss(position: Position): void {
    const config = position.stopLossConfig;
    const activationPercent = (config.trailingActivationPercent ?? this.config.trailingActivationPercent) / 100;
    const stopPercent = config.percentageFromEntry / 100;

    if (position.side === 'long') {
      // For longs, check if price has moved up enough to activate trailing
      const priceGainPercent = (position.highestPrice - position.entryPrice) / position.entryPrice;
      if (priceGainPercent >= activationPercent) {
        const newStopLoss = position.highestPrice * (1 - stopPercent);
        if (newStopLoss > position.stopLossPrice) {
          position.stopLossPrice = newStopLoss;
        }
      }
    } else {
      // For shorts, check if price has moved down enough
      const priceDropPercent = (position.entryPrice - position.lowestPrice) / position.entryPrice;
      if (priceDropPercent >= activationPercent) {
        const newStopLoss = position.lowestPrice * (1 + stopPercent);
        if (newStopLoss < position.stopLossPrice) {
          position.stopLossPrice = newStopLoss;
        }
      }
    }
  }

  private isStopLossTriggered(position: Position, currentPrice: number): boolean {
    if (position.side === 'long') {
      return currentPrice <= position.stopLossPrice;
    } else {
      return currentPrice >= position.stopLossPrice;
    }
  }

  private calculateLossPercent(position: Position, exitPrice: number): number {
    if (position.side === 'long') {
      return ((position.entryPrice - exitPrice) / position.entryPrice) * 100;
    } else {
      return ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
    }
  }

  private generateExitSignal(
    position: Position,
    currentPrice: number,
    lossPercent: number,
  ): StopLossExitSignal {
    return {
      signalId: `sl_${++this.signalCounter}_${Date.now()}`,
      positionId: position.positionId,
      agentId: position.agentId,
      asset: position.asset,
      amount: Math.abs(position.amount),
      action: position.side === 'long' ? 'SELL' : 'BUY',
      reason: `Stop-loss triggered at ${lossPercent.toFixed(2)}% loss (stop price: ${position.stopLossPrice.toFixed(4)})`,
      targetPrice: currentPrice,
      urgency: 'immediate',
      generatedAt: new Date(),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStopLossManager(
  config?: Partial<StopLossManagerConfig>,
): DefaultStopLossManager {
  return new DefaultStopLossManager(config);
}
