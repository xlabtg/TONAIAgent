/**
 * TONAIAgent - Strategy Generation Engine
 *
 * AI-driven generation of candidate strategies using multiple approaches:
 * evolutionary algorithms, parameter optimization, AI rule generation,
 * and template mutation.
 */

import type { StrategySpec, StrategyRiskLevel, RiskControl } from '../../core/strategies/engine';
import type {
  CandidateStrategy,
  GenerationApproach,
  LearningInsights,
} from './types';

// ============================================================================
// Strategy Generation Engine
// ============================================================================

export class StrategyGenerationEngine {
  private candidateCounter = 0;

  /**
   * Generate a batch of candidate strategies using the specified approach
   */
  generateCandidates(
    count: number,
    approach: GenerationApproach,
    cycleId: string,
    insights?: LearningInsights
  ): CandidateStrategy[] {
    const candidates: CandidateStrategy[] = [];

    for (let i = 0; i < count; i++) {
      const candidate = this.generateSingle(approach, cycleId, insights);
      candidates.push(candidate);
    }

    return candidates;
  }

  /**
   * Evolve an existing candidate (for evolutionary approach)
   */
  evolveCandidates(
    parents: CandidateStrategy[],
    cycleId: string
  ): CandidateStrategy[] {
    return parents.map(parent => this.mutateCandidate(parent, cycleId));
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateSingle(
    approach: GenerationApproach,
    cycleId: string,
    insights?: LearningInsights
  ): CandidateStrategy {
    const id = `candidate_${++this.candidateCounter}_${Date.now()}`;
    const riskLevel = this.selectRiskLevel(insights);
    let spec: StrategySpec;

    switch (approach) {
      case 'evolutionary':
        spec = this.generateEvolutionary(riskLevel);
        break;
      case 'parameter_optimization':
        spec = this.generateOptimized(riskLevel);
        break;
      case 'ai_rule_generation':
        spec = this.generateAIRules(riskLevel);
        break;
      case 'template_mutation':
        spec = this.generateFromTemplate(riskLevel);
        break;
      default:
        spec = this.generateFromTemplate(riskLevel);
    }

    return {
      id,
      generationApproach: approach,
      spec,
      riskLevel,
      generatedAt: new Date(),
      status: 'generated',
      cycleId,
      generation: 0,
    };
  }

  private mutateCandidate(parent: CandidateStrategy, cycleId: string): CandidateStrategy {
    const id = `candidate_${++this.candidateCounter}_${Date.now()}`;
    const spec = this.mutateSpec(parent.spec);

    return {
      id,
      generationApproach: 'evolutionary',
      spec,
      riskLevel: parent.riskLevel,
      generatedAt: new Date(),
      status: 'generated',
      cycleId,
      parentId: parent.id,
      generation: parent.generation + 1,
    };
  }

  private selectRiskLevel(insights?: LearningInsights): StrategyRiskLevel {
    if (insights && insights.bestRiskLevels.length > 0) {
      // Use the best-performing risk level from learning insights
      return insights.bestRiskLevels[0].level;
    }

    // Default: random selection weighted toward medium
    const levels: StrategyRiskLevel[] = ['low', 'medium', 'medium', 'high'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private generateEvolutionary(riskLevel: StrategyRiskLevel): StrategySpec {
    // Evolutionary approach: combine components from multiple strategy archetypes
    const stopLossPct = this.riskAwareStopLoss(riskLevel);
    const reservePct = this.riskAwareReserve(riskLevel);
    const allocPct = this.riskAwareAllocation(riskLevel);
    const ts = Date.now();

    return {
      triggers: [
        {
          id: `t_${ts}_1`,
          type: 'indicator',
          name: 'RSI Signal',
          enabled: true,
          config: {
            type: 'indicator',
            indicator: 'rsi',
            token: 'TON',
            operator: 'less_than',
            value: 30 + Math.floor(Math.random() * 10),
            timeframe: '4h',
          },
        },
        {
          id: `t_${ts}_2`,
          type: 'indicator',
          name: 'Momentum Check',
          enabled: true,
          config: {
            type: 'indicator',
            indicator: 'momentum',
            token: 'TON',
            operator: 'greater_than',
            value: 0.03 + Math.random() * 0.05,
            timeframe: '1h',
          },
        },
      ],
      conditions: [
        {
          id: `c_${ts}_1`,
          name: 'Market Volume',
          type: 'market',
          rules: [
            {
              id: `r_${ts}_1`,
              field: "market.volume('TON')",
              operator: 'greater_than',
              value: 50000 + Math.floor(Math.random() * 50000),
              valueType: 'static',
            },
          ],
          required: true,
        },
      ],
      actions: [
        {
          id: `a_${ts}_1`,
          type: 'swap',
          name: 'Buy TON',
          priority: 1,
          config: {
            type: 'swap',
            fromToken: 'USDT',
            toToken: 'TON',
            amount: { type: 'percentage', value: 20 + Math.floor(Math.random() * 20) },
            slippageTolerance: 0.5 + Math.random() * 0.5,
          },
        },
      ],
      riskControls: this.buildRiskControls(riskLevel, stopLossPct),
      parameters: [
        {
          id: `param_${ts}_1`,
          name: 'buy_percentage',
          type: 'number',
          value: allocPct,
          defaultValue: allocPct,
          optimizable: true,
          constraints: { min: 5, max: 40 },
        },
      ],
      capitalAllocation: {
        mode: 'percentage',
        allocatedPercentage: allocPct,
        minCapital: 100,
        reservePercentage: reservePct,
      },
    };
  }

  private generateOptimized(riskLevel: StrategyRiskLevel): StrategySpec {
    // Parameter optimization approach: DCA with tuned parameters
    const dcaIntervals = ['0 */4 * * *', '0 */6 * * *', '0 */8 * * *', '0 0 * * *'];
    const cron = dcaIntervals[Math.floor(Math.random() * dcaIntervals.length)];
    const buyAmount = 50 + Math.floor(Math.random() * 200);
    const stopLossPct = this.riskAwareStopLoss(riskLevel);
    const reservePct = this.riskAwareReserve(riskLevel);
    const allocPct = this.riskAwareAllocation(riskLevel);
    const ts = Date.now();

    return {
      triggers: [
        {
          id: `t_${ts}_1`,
          type: 'schedule',
          name: 'Optimized DCA',
          enabled: true,
          config: { type: 'schedule', cron },
        },
      ],
      conditions: [],
      actions: [
        {
          id: `a_${ts}_1`,
          type: 'swap',
          name: 'DCA Buy',
          priority: 1,
          config: {
            type: 'swap',
            fromToken: 'USDT',
            toToken: 'TON',
            amount: { type: 'fixed', value: buyAmount },
            slippageTolerance: 0.5,
          },
        },
      ],
      riskControls: this.buildRiskControls(riskLevel, stopLossPct),
      parameters: [
        {
          id: `param_${ts}_1`,
          name: 'buy_amount',
          type: 'number',
          value: buyAmount,
          defaultValue: buyAmount,
          optimizable: true,
          constraints: { min: 10, max: 1000 },
        },
      ],
      capitalAllocation: {
        mode: 'percentage',
        allocatedPercentage: allocPct,
        minCapital: 50,
        reservePercentage: reservePct,
      },
    };
  }

  private generateAIRules(riskLevel: StrategyRiskLevel): StrategySpec {
    // AI rule generation: momentum + mean-reversion hybrid
    const stopLossPct = this.riskAwareStopLoss(riskLevel);
    const takeProfitPct = stopLossPct * (2 + Math.random());
    const reservePct = this.riskAwareReserve(riskLevel);
    const allocPct = this.riskAwareAllocation(riskLevel);
    const ts = Date.now();

    return {
      triggers: [
        {
          id: `t_${ts}_1`,
          type: 'indicator',
          name: 'MACD Signal',
          enabled: true,
          config: {
            type: 'indicator',
            indicator: 'macd',
            token: 'TON',
            operator: 'greater_than',
            value: 0,
            timeframe: '1d',
          },
        },
      ],
      conditions: [
        {
          id: `c_${ts}_1`,
          name: 'Trend Confirmation',
          type: 'market',
          rules: [
            {
              id: `r_${ts}_1`,
              field: "market.priceChange('TON', '7d')",
              operator: 'greater_than',
              value: -10,
              valueType: 'static',
            },
          ],
          required: true,
        },
        {
          id: `c_${ts}_2`,
          name: 'Liquidity Check',
          type: 'market',
          rules: [
            {
              id: `r_${ts}_2`,
              field: "market.volume('TON')",
              operator: 'greater_than',
              value: 100000,
              valueType: 'static',
            },
          ],
          required: true,
        },
      ],
      actions: [
        {
          id: `a_${ts}_1`,
          type: 'swap',
          name: 'Momentum Buy',
          priority: 1,
          config: {
            type: 'swap',
            fromToken: 'USDT',
            toToken: 'TON',
            amount: { type: 'percentage', value: 30 },
            slippageTolerance: 1,
          },
        },
        {
          id: `a_${ts}_2`,
          type: 'notify',
          name: 'Trade Notification',
          priority: 2,
          config: {
            type: 'notify',
            channel: 'telegram',
            message: 'AI strategy executed momentum buy',
          },
        },
      ],
      riskControls: [
        ...this.buildRiskControls(riskLevel, stopLossPct),
        {
          id: `rc_${ts}_tp`,
          type: 'take_profit',
          name: 'Take Profit',
          enabled: true,
          config: {
            type: 'take_profit' as const,
            percentage: Math.round(takeProfitPct),
            sellPercentage: 50,
          },
          action: { type: 'reduce' as const, sellPercentage: 50 },
        },
      ],
      parameters: [],
      capitalAllocation: {
        mode: 'percentage',
        allocatedPercentage: allocPct,
        minCapital: 200,
        reservePercentage: reservePct,
      },
    };
  }

  private generateFromTemplate(riskLevel: StrategyRiskLevel): StrategySpec {
    // Template mutation: rebalancing strategy with varied parameters
    const tokens = ['TON', 'USDT', 'SCALE', 'NOT', 'DOGS'];
    const tokenCount = 2 + Math.floor(Math.random() * 3);
    const selectedTokens = tokens.slice(0, tokenCount);
    const baseAlloc = Math.floor(100 / tokenCount);
    const remainder = 100 - baseAlloc * tokenCount;
    const stopLossPct = this.riskAwareStopLoss(riskLevel);
    const reservePct = this.riskAwareReserve(riskLevel);
    const ts = Date.now();

    const targetAllocations = selectedTokens.map((token, i) => ({
      token,
      targetPercentage: baseAlloc + (i === 0 ? remainder : 0),
    }));

    const rebalanceSchedules = ['0 0 * * 0', '0 0 1 * *', '0 0 * * 1,4'];
    const cron = rebalanceSchedules[Math.floor(Math.random() * rebalanceSchedules.length)];

    return {
      triggers: [
        {
          id: `t_${ts}_1`,
          type: 'schedule',
          name: 'Rebalance Schedule',
          enabled: true,
          config: { type: 'schedule', cron },
        },
      ],
      conditions: [],
      actions: [
        {
          id: `a_${ts}_1`,
          type: 'rebalance',
          name: 'Portfolio Rebalance',
          priority: 1,
          config: {
            type: 'rebalance',
            targetAllocations,
            tolerance: 3 + Math.floor(Math.random() * 5),
            maxSlippage: 0.5 + Math.random(),
          },
        },
      ],
      riskControls: this.buildRiskControls(riskLevel, stopLossPct),
      parameters: [],
      capitalAllocation: {
        mode: 'percentage',
        allocatedPercentage: 100,
        minCapital: 500,
        reservePercentage: reservePct,
      },
    };
  }

  private buildRiskControls(riskLevel: StrategyRiskLevel, stopLossPct: number): RiskControl[] {
    const ts = Date.now();
    const controls: RiskControl[] = [
      {
        id: `rc_${ts}_sl`,
        type: 'stop_loss',
        name: 'Stop Loss',
        enabled: true,
        config: { type: 'stop_loss', percentage: stopLossPct },
        action: { type: 'close' },
      },
    ];

    if (riskLevel === 'low' || riskLevel === 'medium') {
      controls.push({
        id: `rc_${ts}_md`,
        type: 'max_drawdown',
        name: 'Max Drawdown',
        enabled: true,
        config: {
          type: 'max_drawdown',
          maxPercentage: riskLevel === 'low' ? 10 : 20,
          timeframe: '1d',
        },
        action: { type: 'pause' },
      });
    }

    return controls;
  }

  private mutateSpec(parent: StrategySpec): StrategySpec {
    const mutated: StrategySpec = JSON.parse(JSON.stringify(parent));

    // Mutate risk controls
    for (const rc of mutated.riskControls) {
      if (rc.config.type === 'stop_loss') {
        const config = rc.config as { type: string; percentage: number };
        config.percentage = Math.max(
          3,
          config.percentage + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3)
        );
      }
    }

    // Mutate capital allocation
    const alloc = mutated.capitalAllocation;
    if (alloc.allocatedPercentage !== undefined) {
      alloc.allocatedPercentage = Math.min(
        80,
        Math.max(5, alloc.allocatedPercentage + (Math.random() > 0.5 ? 5 : -5))
      );
    }

    // Mutate parameters
    for (const param of mutated.parameters) {
      if (param.optimizable && typeof param.value === 'number') {
        const constraints = param.constraints as { min?: number; max?: number } | undefined;
        const delta = (param.value as number) * 0.1 * (Math.random() > 0.5 ? 1 : -1);
        let newValue = (param.value as number) + delta;
        if (constraints?.min !== undefined) newValue = Math.max(constraints.min, newValue);
        if (constraints?.max !== undefined) newValue = Math.min(constraints.max, newValue);
        param.value = Math.round(newValue);
      }
    }

    return mutated;
  }

  private riskAwareStopLoss(riskLevel: StrategyRiskLevel): number {
    const base: Record<StrategyRiskLevel, number> = {
      low: 5,
      medium: 10,
      high: 15,
      critical: 20,
    };
    return base[riskLevel] + Math.floor(Math.random() * 3);
  }

  private riskAwareReserve(riskLevel: StrategyRiskLevel): number {
    const base: Record<StrategyRiskLevel, number> = {
      low: 35,
      medium: 25,
      high: 15,
      critical: 5,
    };
    return base[riskLevel] + Math.floor(Math.random() * 10);
  }

  private riskAwareAllocation(riskLevel: StrategyRiskLevel): number {
    const base: Record<StrategyRiskLevel, number> = {
      low: 10,
      medium: 20,
      high: 30,
      critical: 40,
    };
    return base[riskLevel] + Math.floor(Math.random() * 10);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyGenerationEngine(): StrategyGenerationEngine {
  return new StrategyGenerationEngine();
}
