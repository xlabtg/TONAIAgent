/**
 * TONAIAgent — Signal Aggregator Service (Issue #265)
 *
 * Collects signals from all registered signal connectors, normalises
 * them, combines sources per asset, and computes a final weighted score.
 *
 * Architecture:
 *   External APIs
 *     ↓
 *   Signal Connectors  (connectors/signals/)
 *     ↓
 *   SignalAggregator   (this module)
 *     ↓
 *   AggregatedSignal   { externalSignalScore, sentimentLevel, … }
 *     ↓
 *   Agent Context      (services/agent-context/)
 *     ↓
 *   Decision Engine    (services/agent-decision/)
 *
 * Weighting formula (Issue #265, Step 6):
 *   finalScore = internalConfidence × 0.6 + externalSignal × 0.4
 *
 * The aggregator itself computes `externalSignal` from N connectors
 * using a confidence-weighted average across signal types:
 *   externalSignal = Σ(score_i × confidence_i) / Σ(confidence_i)
 */

import type { ExternalSignal, SignalConnector } from '../../connectors/signals/index';

// ============================================================================
// Aggregated Output Types
// ============================================================================

/**
 * Sentiment level derived from the aggregated external signal score.
 *
 * - `positive`  — score > +0.15
 * - `negative`  — score < -0.15
 * - `neutral`   — score in [-0.15, +0.15]
 */
export type SentimentLevel = 'positive' | 'negative' | 'neutral';

/**
 * Per-asset aggregated signal result.
 */
export interface AggregatedSignal {
  /** Asset identifier. */
  asset: string;
  /**
   * Combined external signal score [-1, +1].
   * Computed as a confidence-weighted average across all connectors.
   */
  externalSignalScore: number;
  /**
   * Bucketed sentiment level derived from externalSignalScore.
   */
  sentimentLevel: SentimentLevel;
  /**
   * Aggregate confidence in the combined score [0, 1].
   * Reflects average confidence across contributing signals.
   */
  aggregatedConfidence: number;
  /**
   * Number of individual signals that contributed to this result.
   */
  signalCount: number;
  /**
   * Breakdown of per-type scores for diagnostic purposes.
   */
  breakdown: Partial<Record<ExternalSignal['type'], { score: number; confidence: number }>>;
  /** ISO timestamp when the aggregation was computed. */
  computedAt: string;
}

/**
 * Final blended score combining internal agent confidence with the
 * external signal.
 *
 * Formula: finalScore = internalConfidence × 0.6 + externalSignal × 0.4
 *
 * The result is clamped to [0, 1] by treating internalConfidence as-is
 * [0..1] and mapping externalSignalScore [-1..+1] → [0..1]:
 *   externalNorm = (externalSignalScore + 1) / 2
 *   finalScore   = internalConfidence × 0.6 + externalNorm × 0.4
 */
export interface BlendedScore {
  /** Input internal confidence [0, 1]. */
  internalConfidence: number;
  /** Input external signal score [-1, +1]. */
  externalSignalScore: number;
  /**
   * Blended final score [0, 1].
   *
   * Uses the weighting formula from Issue #265 Step 6.
   */
  finalScore: number;
}

// ============================================================================
// Aggregator Configuration
// ============================================================================

/**
 * Configuration options for the SignalAggregator.
 */
export interface SignalAggregatorConfig {
  /**
   * How long (ms) to cache aggregated signals before refreshing.
   * Default: 60_000 (1 minute)
   */
  cacheTtlMs?: number;
  /**
   * Minimum confidence threshold — signals below this are excluded.
   * Default: 0.05
   */
  minConfidence?: number;
  /**
   * Per-type weights for the aggregation.  Allows boosting or reducing
   * specific signal types.  Weights are relative (do not need to sum to 1).
   * Default: all types weighted equally at 1.0.
   */
  typeWeights?: Partial<Record<ExternalSignal['type'], number>>;
  /**
   * Whether to log aggregation diagnostics to console.
   * Default: false
   */
  verbose?: boolean;
}

// ============================================================================
// Signal Aggregator
// ============================================================================

/**
 * Aggregates signals from multiple connectors into a single per-asset score.
 *
 * Usage:
 * ```ts
 * const aggregator = new SignalAggregator([
 *   new NewsSignalConnector(),
 *   new SentimentSignalConnector(),
 *   new MomentumSignalConnector(),
 *   new OnChainSignalConnector(),
 * ]);
 *
 * const signals = await aggregator.aggregate(['TON', 'BTC']);
 * const tonScore = signals.get('TON');
 * // tonScore.externalSignalScore  → [-1, +1]
 * // tonScore.sentimentLevel       → 'positive' | 'neutral' | 'negative'
 * ```
 */
export class SignalAggregator {
  private readonly connectors: SignalConnector[];
  private readonly config: Required<SignalAggregatorConfig>;

  /** Cache: assetKey → { result, expiry } */
  private readonly cache = new Map<string, { result: AggregatedSignal; expiry: number }>();

  constructor(connectors: SignalConnector[] = [], config: SignalAggregatorConfig = {}) {
    this.connectors = connectors;
    this.config = {
      cacheTtlMs: config.cacheTtlMs ?? 60_000,
      minConfidence: config.minConfidence ?? 0.05,
      typeWeights: config.typeWeights ?? {},
      verbose: config.verbose ?? false,
    };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Fetch and aggregate signals for the given assets.
   *
   * Results are cached for `cacheTtlMs` milliseconds.  Pass `force: true`
   * to bypass the cache.
   *
   * @param assets - asset identifiers (e.g. ["TON", "BTC"])
   * @param force  - bypass cache and fetch fresh signals
   */
  async aggregate(assets: string[], force = false): Promise<Map<string, AggregatedSignal>> {
    const now = Date.now();
    const result = new Map<string, AggregatedSignal>();

    const assetsToFetch: string[] = [];
    for (const asset of assets) {
      const key = asset.toUpperCase();
      const cached = this.cache.get(key);
      if (!force && cached && cached.expiry > now) {
        result.set(key, cached.result);
      } else {
        assetsToFetch.push(key);
      }
    }

    if (assetsToFetch.length === 0) {
      return result;
    }

    // Fetch from all connectors in parallel
    const allSignals: ExternalSignal[] = [];
    await Promise.allSettled(
      this.connectors.map(async connector => {
        try {
          const signals = await connector.fetchSignals(assetsToFetch);
          allSignals.push(...signals);
        } catch (err) {
          if (this.config.verbose) {
            console.warn(`[SignalAggregator] connector "${connector.name}" error:`, err);
          }
        }
      }),
    );

    // Group signals by asset
    const byAsset = new Map<string, ExternalSignal[]>();
    for (const signal of allSignals) {
      const key = signal.asset.toUpperCase();
      if (!byAsset.has(key)) byAsset.set(key, []);
      byAsset.get(key)!.push(signal);
    }

    // Aggregate per asset
    for (const asset of assetsToFetch) {
      const signals = byAsset.get(asset) ?? [];
      const aggregated = this._aggregateForAsset(asset, signals);

      // Store in cache
      this.cache.set(asset, { result: aggregated, expiry: now + this.config.cacheTtlMs });
      result.set(asset, aggregated);
    }

    return result;
  }

  /**
   * Aggregate signals for a single asset.
   *
   * @param asset   - asset identifier
   * @param force   - bypass cache
   */
  async aggregateOne(asset: string, force = false): Promise<AggregatedSignal> {
    const results = await this.aggregate([asset], force);
    return results.get(asset.toUpperCase()) ?? this._emptySignal(asset.toUpperCase());
  }

  /**
   * Compute the blended final score for an agent decision.
   *
   * Formula (Issue #265, Step 6):
   *   finalScore = internalConfidence × 0.6 + externalNorm × 0.4
   *
   * Where: externalNorm = (externalSignalScore + 1) / 2  [maps [-1,+1] → [0,1]]
   *
   * @param internalConfidence - agent's internal confidence [0, 1]
   * @param externalSignalScore - aggregated external signal [-1, +1]
   */
  static blendScores(internalConfidence: number, externalSignalScore: number): BlendedScore {
    const externalNorm = (externalSignalScore + 1) / 2; // [-1,+1] → [0,1]
    const finalScore = internalConfidence * 0.6 + externalNorm * 0.4;
    return {
      internalConfidence: Math.max(0, Math.min(1, internalConfidence)),
      externalSignalScore: Math.max(-1, Math.min(1, externalSignalScore)),
      finalScore: Math.max(0, Math.min(1, finalScore)),
    };
  }

  /**
   * Invalidate the cache for specific assets (or all if no assets given).
   */
  invalidateCache(assets?: string[]): void {
    if (!assets) {
      this.cache.clear();
      return;
    }
    for (const asset of assets) {
      this.cache.delete(asset.toUpperCase());
    }
  }

  // --------------------------------------------------------------------------
  // Internal Aggregation Logic
  // --------------------------------------------------------------------------

  private _aggregateForAsset(asset: string, signals: ExternalSignal[]): AggregatedSignal {
    const computedAt = new Date().toISOString();

    // Filter out low-confidence signals
    const valid = signals.filter(s => s.confidence >= this.config.minConfidence);

    if (valid.length === 0) {
      return this._emptySignal(asset, computedAt);
    }

    // Confidence-weighted average per type
    const byType = new Map<ExternalSignal['type'], ExternalSignal[]>();
    for (const signal of valid) {
      if (!byType.has(signal.type)) byType.set(signal.type, []);
      byType.get(signal.type)!.push(signal);
    }

    // Collapse each type to a single (score, confidence) pair
    const typeResults: Array<{ score: number; confidence: number; weight: number }> = [];
    const breakdown: Partial<Record<ExternalSignal['type'], { score: number; confidence: number }>> = {};

    for (const [type, typeSignals] of byType.entries()) {
      const weightedScore = this._confidenceWeightedAverage(typeSignals);
      const avgConfidence = typeSignals.reduce((s, sig) => s + sig.confidence, 0) / typeSignals.length;
      const typeWeight = this.config.typeWeights[type] ?? 1.0;

      breakdown[type] = { score: weightedScore, confidence: avgConfidence };
      typeResults.push({ score: weightedScore, confidence: avgConfidence, weight: typeWeight });
    }

    // Final aggregation across types (weighted by confidence × typeWeight)
    let weightedSum = 0;
    let weightTotal = 0;
    for (const { score, confidence, weight } of typeResults) {
      const w = confidence * weight;
      weightedSum += score * w;
      weightTotal += w;
    }

    const externalSignalScore = weightTotal > 0
      ? Math.max(-1, Math.min(1, weightedSum / weightTotal))
      : 0;

    const aggregatedConfidence = weightTotal > 0
      ? Math.min(1, typeResults.reduce((s, r) => s + r.confidence * r.weight, 0) / typeResults.length)
      : 0;

    const sentimentLevel = this._toSentimentLevel(externalSignalScore);

    if (this.config.verbose) {
      console.log(`[SignalAggregator] ${asset}: score=${externalSignalScore.toFixed(3)}, sentiment=${sentimentLevel}, confidence=${aggregatedConfidence.toFixed(3)}`);
    }

    return {
      asset,
      externalSignalScore,
      sentimentLevel,
      aggregatedConfidence,
      signalCount: valid.length,
      breakdown,
      computedAt,
    };
  }

  /**
   * Compute a confidence-weighted average score for a set of signals.
   */
  private _confidenceWeightedAverage(signals: ExternalSignal[]): number {
    let weightedSum = 0;
    let weightTotal = 0;
    for (const signal of signals) {
      weightedSum += signal.score * signal.confidence;
      weightTotal += signal.confidence;
    }
    return weightTotal > 0 ? weightedSum / weightTotal : 0;
  }

  /**
   * Convert a numeric score to a SentimentLevel bucket.
   *
   * Thresholds:
   *   score > +0.15 → positive
   *   score < -0.15 → negative
   *   otherwise     → neutral
   */
  private _toSentimentLevel(score: number): SentimentLevel {
    if (score > 0.15) return 'positive';
    if (score < -0.15) return 'negative';
    return 'neutral';
  }

  private _emptySignal(asset: string, computedAt = new Date().toISOString()): AggregatedSignal {
    return {
      asset,
      externalSignalScore: 0,
      sentimentLevel: 'neutral',
      aggregatedConfidence: 0,
      signalCount: 0,
      breakdown: {},
      computedAt,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new SignalAggregator with a given set of connectors.
 */
export function createSignalAggregator(
  connectors: SignalConnector[] = [],
  config?: SignalAggregatorConfig,
): SignalAggregator {
  return new SignalAggregator(connectors, config);
}

/** Singleton aggregator for convenience (no connectors by default). */
export const signalAggregator = new SignalAggregator();

export default signalAggregator;
