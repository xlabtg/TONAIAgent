/**
 * TONAIAgent - Strategy Marketplace Publishing Integration
 *
 * Publishes top-performing discovered strategies to the marketplace,
 * integrating with the existing MarketplaceService.
 */

import type { CandidateStrategy, PublishingResult } from './types';

// ============================================================================
// Marketplace Publishing Interface
// ============================================================================

/**
 * Minimal interface for marketplace publishing.
 * Compatible with the full DefaultMarketplaceService from the marketplace module.
 */
export interface MarketplacePublisher {
  publishStrategy(spec: PublishStrategySpec): Promise<{ id: string }>;
}

export interface PublishStrategySpec {
  name: string;
  description: string;
  category: string;
  riskLevel: string;
  definition: unknown;
  metadata: Record<string, unknown>;
  autoApprove?: boolean;
}

// ============================================================================
// Strategy Publisher
// ============================================================================

export class StrategyPublisher {
  constructor(
    private readonly marketplace?: MarketplacePublisher,
    private readonly publishThreshold: number = 70
  ) {}

  /**
   * Attempt to publish a candidate strategy to the marketplace.
   * Only publishes if the candidate's evaluation score meets the threshold.
   */
  async publishCandidate(candidate: CandidateStrategy): Promise<PublishingResult> {
    if (candidate.status !== 'passed') {
      return {
        candidateId: candidate.id,
        published: false,
        reason: 'Candidate has not passed evaluation',
      };
    }

    const score = candidate.evaluationScore ?? 0;
    if (score < this.publishThreshold) {
      return {
        candidateId: candidate.id,
        published: false,
        reason: `Score ${score} below publish threshold ${this.publishThreshold}`,
      };
    }

    if (!this.marketplace) {
      // No marketplace configured: record as "published" with simulated ID
      return {
        candidateId: candidate.id,
        published: true,
        marketplaceStrategyId: `sim_strategy_${candidate.id}`,
        publishedAt: new Date(),
        reason: 'Simulated publish (no marketplace configured)',
      };
    }

    try {
      const perf = candidate.backtestResult?.performance;
      const result = await this.marketplace.publishStrategy({
        name: `AI Discovery: ${candidate.generationApproach} (Score: ${score})`,
        description: this.buildDescription(candidate),
        category: this.inferCategory(candidate),
        riskLevel: candidate.riskLevel,
        definition: candidate.spec,
        metadata: {
          discoverySource: 'autonomous_discovery_engine',
          generationApproach: candidate.generationApproach,
          cycleId: candidate.cycleId,
          evaluationScore: score,
          backtestTotalReturn: perf?.metrics.totalReturn,
          backtestSharpe: perf?.metrics.sharpeRatio,
          backtestMaxDrawdown: perf?.metrics.maxDrawdown,
          backtestWinRate: perf?.trades.winRate,
          generation: candidate.generation,
          parentId: candidate.parentId,
        },
        autoApprove: false,
      });

      return {
        candidateId: candidate.id,
        published: true,
        marketplaceStrategyId: result.id,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        candidateId: candidate.id,
        published: false,
        reason: error instanceof Error ? error.message : 'Unknown publish error',
      };
    }
  }

  /**
   * Publish a batch of candidates, returning all publishing results
   */
  async publishBatch(candidates: CandidateStrategy[]): Promise<PublishingResult[]> {
    const results: PublishingResult[] = [];
    for (const candidate of candidates) {
      const result = await this.publishCandidate(candidate);
      results.push(result);
    }
    return results;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildDescription(candidate: CandidateStrategy): string {
    const perf = candidate.backtestResult?.performance;
    const parts = [
      `Autonomously discovered strategy using ${candidate.generationApproach} approach.`,
      `Risk level: ${candidate.riskLevel}.`,
    ];

    if (perf) {
      parts.push(
        `Backtest results (90 days): Return ${perf.metrics.totalReturn.toFixed(2)}%, ` +
        `Sharpe ${perf.metrics.sharpeRatio.toFixed(2)}, ` +
        `Max drawdown ${Math.abs(perf.metrics.maxDrawdown).toFixed(2)}%, ` +
        `Win rate ${(perf.trades.winRate * 100).toFixed(1)}%.`
      );
    }

    if (candidate.generation > 0) {
      parts.push(`Generation ${candidate.generation} evolved from parent strategy.`);
    }

    return parts.join(' ');
  }

  private inferCategory(candidate: CandidateStrategy): string {
    const actionTypes = new Set(candidate.spec.actions.map(a => a.type));
    const triggerTypes = new Set(candidate.spec.triggers.map(t => t.config.type));

    if (actionTypes.has('rebalance')) return 'portfolio_management';
    if (triggerTypes.has('schedule') && actionTypes.has('swap')) return 'dca';
    if (triggerTypes.has('indicator')) return 'technical_trading';
    return 'automated_trading';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyPublisher(
  marketplace?: MarketplacePublisher,
  publishThreshold?: number
): StrategyPublisher {
  return new StrategyPublisher(marketplace, publishThreshold);
}
