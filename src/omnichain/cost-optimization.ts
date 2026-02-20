/**
 * TONAIAgent - Cost Optimization Layer
 *
 * Optimizes cross-chain transaction costs through intelligent routing,
 * gas estimation, and transaction batching.
 *
 * Features:
 * - Dynamic route optimization
 * - Multi-provider rate comparison
 * - Gas estimation and optimization
 * - Transaction batching
 * - Fee forecasting
 */

import {
  CostOptimizationConfig,
  RouteOption,
  GasEstimate,
  TransactionBatch,
  ChainId,
  OmnichainEvent,
  OmnichainEventCallback,
  ActionResult,
  TransactionPriority,
} from './types';

// ============================================================================
// Cost Optimizer Interface
// ============================================================================

export interface CostOptimizer {
  // Route optimization
  findOptimalRoute(request: RouteRequest): Promise<ActionResult<RouteOption[]>>;
  compareRoutes(routes: RouteOption[]): RouteComparison;

  // Gas optimization
  estimateGas(request: GasEstimateRequest): Promise<ActionResult<GasEstimate>>;
  getGasPrice(chainId: ChainId): Promise<ActionResult<GasPriceInfo>>;
  findOptimalGasPrice(chainId: ChainId): Promise<ActionResult<OptimalGasPrice>>;

  // Transaction batching
  createBatch(transactions: string[]): Promise<ActionResult<TransactionBatch>>;
  addToBatch(batchId: string, transactionId: string): Promise<ActionResult<void>>;
  processBatch(batchId: string): Promise<ActionResult<BatchResult>>;
  getBatch(batchId: string): Promise<ActionResult<TransactionBatch | null>>;
  listBatches(status?: TransactionBatch['status']): Promise<ActionResult<TransactionBatch[]>>;

  // Fee forecasting
  forecastFees(
    sourceChain: ChainId,
    destinationChain: ChainId,
    periods: number
  ): Promise<ActionResult<FeeForecast[]>>;

  // Cost analysis
  analyzeCosts(transactionId: string): Promise<ActionResult<CostAnalysis>>;
  getHistoricalCosts(filters?: CostHistoryFilters): Promise<ActionResult<CostHistoryEntry[]>>;

  // Configuration
  updateConfig(config: Partial<CostOptimizationConfig>): void;
  getConfig(): CostOptimizationConfig;

  // Events
  onEvent(callback: OmnichainEventCallback): void;
}

export interface RouteRequest {
  sourceChain: ChainId;
  destinationChain: ChainId;
  sourceAsset: string;
  destinationAsset: string;
  amount: string;
  priority?: TransactionPriority;
  maxSlippage?: number;
  preferredProviders?: string[];
}

export interface RouteComparison {
  bestRoute: RouteOption;
  alternatives: RouteOption[];
  savingsVsWorst: number;
  savingsVsAverage: number;
  recommendation: string;
}

export interface GasEstimateRequest {
  chainId: ChainId;
  transactionType: 'transfer' | 'swap' | 'bridge' | 'contract_call';
  dataSize?: number;
  priority?: TransactionPriority;
}

export interface GasPriceInfo {
  chainId: ChainId;
  slow: string;
  standard: string;
  fast: string;
  instant: string;
  unit: string;
  baseFee?: string;
  maxPriorityFee?: string;
  timestamp: Date;
}

export interface OptimalGasPrice {
  price: string;
  priority: TransactionPriority;
  estimatedWaitMinutes: number;
  savingsPercent: number;
  recommendation: string;
}

export interface BatchResult {
  batchId: string;
  processedCount: number;
  failedCount: number;
  totalSavingsUsd: number;
  transactions: BatchTransactionResult[];
}

export interface BatchTransactionResult {
  transactionId: string;
  success: boolean;
  savingsUsd?: number;
  error?: string;
}

export interface FeeForecast {
  period: Date;
  estimatedFeeUsd: number;
  estimatedGasPrice: string;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CostAnalysis {
  transactionId: string;
  exchangeFee: number;
  networkFee: number;
  gasCost: number;
  slippageCost: number;
  totalCost: number;
  costPercent: number;
  breakdown: CostBreakdown[];
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percent: number;
  description: string;
}

export interface OptimizationSuggestion {
  type: string;
  description: string;
  potentialSavings: number;
  confidence: number;
}

export interface CostHistoryFilters {
  chainId?: ChainId;
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface CostHistoryEntry {
  timestamp: Date;
  chainId: ChainId;
  averageGasPrice: string;
  averageFeeUsd: number;
  transactionCount: number;
}

export interface CostOptimizerConfig extends Partial<CostOptimizationConfig> {}

// ============================================================================
// Default Cost Optimizer Implementation
// ============================================================================

export class DefaultCostOptimizer implements CostOptimizer {
  private config: CostOptimizationConfig;
  private readonly batches: Map<string, TransactionBatch> = new Map();
  private readonly eventCallbacks: OmnichainEventCallback[] = [];
  private readonly gasPriceCache: Map<ChainId, { price: GasPriceInfo; expiry: number }> = new Map();
  private readonly routeCache: Map<string, { routes: RouteOption[]; expiry: number }> = new Map();
  private readonly costHistory: CostHistoryEntry[] = [];

  constructor(config: CostOptimizerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      optimizeGas: config.optimizeGas ?? true,
      optimizeRouting: config.optimizeRouting ?? true,
      batchTransactions: config.batchTransactions ?? true,
      maxGasPriceGwei: config.maxGasPriceGwei,
      preferredProviders: config.preferredProviders ?? ['changenow'],
      costThresholdUsd: config.costThresholdUsd,
    };
  }

  // ==========================================================================
  // Route Optimization
  // ==========================================================================

  async findOptimalRoute(request: RouteRequest): Promise<ActionResult<RouteOption[]>> {
    const startTime = Date.now();

    try {
      if (!this.config.optimizeRouting) {
        return {
          success: true,
          data: [],
          warnings: ['Route optimization is disabled'],
          executionTime: Date.now() - startTime,
        };
      }

      const cacheKey = this.getRouteCacheKey(request);
      const cached = this.routeCache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return {
          success: true,
          data: cached.routes,
          executionTime: Date.now() - startTime,
        };
      }

      // Generate route options (in production, this would query multiple providers)
      const routes: RouteOption[] = this.generateRouteOptions(request);

      // Score and sort routes
      routes.sort((a, b) => b.score - a.score);

      // Mark the best route
      if (routes.length > 0) {
        routes[0].isRecommended = true;
      }

      // Cache results for 30 seconds
      this.routeCache.set(cacheKey, {
        routes,
        expiry: Date.now() + 30000,
      });

      this.emitEvent('info', 'rate_alert', {
        action: 'routes_found',
        count: routes.length,
        sourceChain: request.sourceChain,
        destinationChain: request.destinationChain,
      });

      return {
        success: true,
        data: routes,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  compareRoutes(routes: RouteOption[]): RouteComparison {
    if (routes.length === 0) {
      return {
        bestRoute: this.createEmptyRoute(),
        alternatives: [],
        savingsVsWorst: 0,
        savingsVsAverage: 0,
        recommendation: 'No routes available',
      };
    }

    const sortedRoutes = [...routes].sort((a, b) => b.score - a.score);
    const bestRoute = sortedRoutes[0];
    const alternatives = sortedRoutes.slice(1);

    const worstFee = Math.max(...routes.map(r => parseFloat(r.estimatedFee)));
    const avgFee =
      routes.reduce((sum, r) => sum + parseFloat(r.estimatedFee), 0) / routes.length;
    const bestFee = parseFloat(bestRoute.estimatedFee);

    const savingsVsWorst = ((worstFee - bestFee) / worstFee) * 100;
    const savingsVsAverage = ((avgFee - bestFee) / avgFee) * 100;

    let recommendation: string;
    if (savingsVsWorst > 20) {
      recommendation = `Best route saves ${savingsVsWorst.toFixed(1)}% compared to worst option`;
    } else if (savingsVsAverage > 10) {
      recommendation = `Best route is ${savingsVsAverage.toFixed(1)}% cheaper than average`;
    } else {
      recommendation = 'All routes have similar costs';
    }

    return {
      bestRoute,
      alternatives,
      savingsVsWorst,
      savingsVsAverage,
      recommendation,
    };
  }

  // ==========================================================================
  // Gas Optimization
  // ==========================================================================

  async estimateGas(request: GasEstimateRequest): Promise<ActionResult<GasEstimate>> {
    const startTime = Date.now();

    try {
      const gasPriceResult = await this.getGasPrice(request.chainId);
      if (!gasPriceResult.success || !gasPriceResult.data) {
        return {
          success: false,
          error: gasPriceResult.error,
          executionTime: Date.now() - startTime,
        };
      }

      const gasPrice = gasPriceResult.data;

      // Estimate gas limit based on transaction type
      const gasLimitEstimates: Record<string, number> = {
        transfer: 21000,
        swap: 150000,
        bridge: 200000,
        contract_call: 100000,
      };

      const gasLimit = gasLimitEstimates[request.transactionType] || 100000;

      // Select gas price based on priority
      let selectedPrice: string;
      let estimatedTime: string;
      let priority: 'slow' | 'normal' | 'fast' = 'normal';

      switch (request.priority) {
        case 'low':
          selectedPrice = gasPrice.slow;
          estimatedTime = '10-30 minutes';
          priority = 'slow';
          break;
        case 'high':
        case 'urgent':
          selectedPrice = gasPrice.fast;
          estimatedTime = '1-2 minutes';
          priority = 'fast';
          break;
        default:
          selectedPrice = gasPrice.standard;
          estimatedTime = '3-5 minutes';
          priority = 'normal';
      }

      // Calculate total cost
      const priceNum = parseFloat(selectedPrice);
      const totalCostNative = (priceNum * gasLimit) / 1e9; // Assuming gwei
      const totalCostUsd = this.estimateUsdValue(request.chainId, totalCostNative);

      const estimate: GasEstimate = {
        chainId: request.chainId,
        gasPrice: selectedPrice,
        gasLimit: String(gasLimit),
        totalCostNative: totalCostNative.toFixed(8),
        totalCostUsd,
        estimatedTime,
        priority,
      };

      return {
        success: true,
        data: estimate,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getGasPrice(chainId: ChainId): Promise<ActionResult<GasPriceInfo>> {
    const startTime = Date.now();

    try {
      // Check cache
      const cached = this.gasPriceCache.get(chainId);
      if (cached && cached.expiry > Date.now()) {
        return {
          success: true,
          data: cached.price,
          executionTime: Date.now() - startTime,
        };
      }

      // Generate simulated gas prices (in production, this would query RPC)
      const basePrice = this.getBaseGasPrice(chainId);
      const gasPrice: GasPriceInfo = {
        chainId,
        slow: (basePrice * 0.8).toFixed(2),
        standard: basePrice.toFixed(2),
        fast: (basePrice * 1.5).toFixed(2),
        instant: (basePrice * 2).toFixed(2),
        unit: 'gwei',
        baseFee: (basePrice * 0.9).toFixed(2),
        maxPriorityFee: (basePrice * 0.1).toFixed(2),
        timestamp: new Date(),
      };

      // Cache for 15 seconds
      this.gasPriceCache.set(chainId, {
        price: gasPrice,
        expiry: Date.now() + 15000,
      });

      return {
        success: true,
        data: gasPrice,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async findOptimalGasPrice(chainId: ChainId): Promise<ActionResult<OptimalGasPrice>> {
    const startTime = Date.now();

    try {
      const gasPriceResult = await this.getGasPrice(chainId);
      if (!gasPriceResult.success || !gasPriceResult.data) {
        return {
          success: false,
          error: gasPriceResult.error,
          executionTime: Date.now() - startTime,
        };
      }

      const gasPrice = gasPriceResult.data;

      // Determine optimal price based on config and current conditions
      let optimalPrice: string;
      let priority: TransactionPriority;
      let estimatedWait: number;
      let savingsPercent: number;
      let recommendation: string;

      // Check if max gas price is configured
      if (this.config.maxGasPriceGwei) {
        const maxPrice = this.config.maxGasPriceGwei;
        const slowPrice = parseFloat(gasPrice.slow);

        if (slowPrice <= maxPrice) {
          optimalPrice = gasPrice.slow;
          priority = 'low';
          estimatedWait = 15;
          savingsPercent = 20;
          recommendation = 'Using slow gas price to stay within budget';
        } else {
          optimalPrice = String(maxPrice);
          priority = 'low';
          estimatedWait = 30;
          savingsPercent = 0;
          recommendation = 'Gas prices exceed maximum - using configured limit';
        }
      } else {
        // Default to standard price
        optimalPrice = gasPrice.standard;
        priority = 'normal';
        estimatedWait = 5;
        savingsPercent = 10;
        recommendation = 'Using standard gas price for balanced speed and cost';
      }

      return {
        success: true,
        data: {
          price: optimalPrice,
          priority,
          estimatedWaitMinutes: estimatedWait,
          savingsPercent,
          recommendation,
        },
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Transaction Batching
  // ==========================================================================

  async createBatch(transactions: string[]): Promise<ActionResult<TransactionBatch>> {
    const startTime = Date.now();

    try {
      if (!this.config.batchTransactions) {
        return {
          success: false,
          error: {
            code: 'POLICY_VIOLATION',
            message: 'Transaction batching is disabled',
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      const batch: TransactionBatch = {
        id: this.generateId(),
        transactions,
        status: 'pending',
        totalCount: transactions.length,
        completedCount: 0,
        failedCount: 0,
        estimatedSavingsUsd: this.estimateBatchSavings(transactions),
        createdAt: new Date(),
      };

      this.batches.set(batch.id, batch);

      this.emitEvent('info', 'transaction_created', {
        batchId: batch.id,
        transactionCount: transactions.length,
        estimatedSavings: batch.estimatedSavingsUsd,
      });

      return {
        success: true,
        data: batch,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async addToBatch(batchId: string, transactionId: string): Promise<ActionResult<void>> {
    const startTime = Date.now();

    try {
      const batch = this.batches.get(batchId);

      if (!batch) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Batch ${batchId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      if (batch.status !== 'pending') {
        return {
          success: false,
          error: {
            code: 'POLICY_VIOLATION',
            message: 'Cannot add to non-pending batch',
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      batch.transactions.push(transactionId);
      batch.totalCount++;
      batch.estimatedSavingsUsd = this.estimateBatchSavings(batch.transactions);

      this.batches.set(batchId, batch);

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async processBatch(batchId: string): Promise<ActionResult<BatchResult>> {
    const startTime = Date.now();

    try {
      const batch = this.batches.get(batchId);

      if (!batch) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Batch ${batchId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      batch.status = 'processing';
      this.batches.set(batchId, batch);

      const results: BatchTransactionResult[] = [];
      let totalSavings = 0;

      // Simulate processing each transaction
      for (const txId of batch.transactions) {
        const success = Math.random() > 0.1; // 90% success rate
        const savings = success ? Math.random() * 5 : 0;

        results.push({
          transactionId: txId,
          success,
          savingsUsd: savings,
          error: success ? undefined : 'Simulated failure',
        });

        if (success) {
          batch.completedCount++;
          totalSavings += savings;
        } else {
          batch.failedCount++;
        }
      }

      batch.status = batch.failedCount > 0 ? 'partial' : 'completed';
      batch.actualSavingsUsd = totalSavings;
      batch.processedAt = new Date();
      this.batches.set(batchId, batch);

      this.emitEvent('info', 'transaction_completed', {
        batchId,
        processedCount: batch.completedCount,
        failedCount: batch.failedCount,
        totalSavings,
      });

      return {
        success: true,
        data: {
          batchId,
          processedCount: batch.completedCount,
          failedCount: batch.failedCount,
          totalSavingsUsd: totalSavings,
          transactions: results,
        },
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getBatch(batchId: string): Promise<ActionResult<TransactionBatch | null>> {
    const startTime = Date.now();

    try {
      const batch = this.batches.get(batchId) || null;

      return {
        success: true,
        data: batch,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async listBatches(
    status?: TransactionBatch['status']
  ): Promise<ActionResult<TransactionBatch[]>> {
    const startTime = Date.now();

    try {
      let batches = Array.from(this.batches.values());

      if (status) {
        batches = batches.filter(b => b.status === status);
      }

      batches.sort(
        (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );

      return {
        success: true,
        data: batches,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Fee Forecasting
  // ==========================================================================

  async forecastFees(
    sourceChain: ChainId,
    destinationChain: ChainId,
    periods: number
  ): Promise<ActionResult<FeeForecast[]>> {
    const startTime = Date.now();

    try {
      const forecasts: FeeForecast[] = [];
      const now = new Date();
      const hourMs = 60 * 60 * 1000;

      const baseGas = this.getBaseGasPrice(sourceChain);
      const baseFee = this.estimateBaseFee(sourceChain, destinationChain);

      for (let i = 0; i < periods; i++) {
        const periodTime = new Date(now.getTime() + i * hourMs);

        // Simulate fee variation based on time of day
        const hour = periodTime.getUTCHours();
        let multiplier = 1.0;

        // Higher fees during peak hours (9-17 UTC)
        if (hour >= 9 && hour <= 17) {
          multiplier = 1.2;
        }
        // Lower fees at night
        if (hour >= 0 && hour <= 6) {
          multiplier = 0.8;
        }

        const estimatedGas = baseGas * multiplier;
        const estimatedFee = baseFee * multiplier;

        // Determine trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (i > 0) {
          const prevFee = forecasts[i - 1].estimatedFeeUsd;
          if (estimatedFee > prevFee * 1.05) {
            trend = 'up';
          } else if (estimatedFee < prevFee * 0.95) {
            trend = 'down';
          }
        }

        forecasts.push({
          period: periodTime,
          estimatedFeeUsd: Math.round(estimatedFee * 100) / 100,
          estimatedGasPrice: estimatedGas.toFixed(2),
          confidence: Math.max(0.5, 0.95 - i * 0.05), // Confidence decreases over time
          trend,
        });
      }

      return {
        success: true,
        data: forecasts,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Cost Analysis
  // ==========================================================================

  async analyzeCosts(transactionId: string): Promise<ActionResult<CostAnalysis>> {
    const startTime = Date.now();

    try {
      // Simulated cost analysis (in production, this would use actual transaction data)
      const exchangeFee = Math.random() * 10;
      const networkFee = Math.random() * 5;
      const gasCost = Math.random() * 3;
      const slippageCost = Math.random() * 2;
      const totalCost = exchangeFee + networkFee + gasCost + slippageCost;

      const breakdown: CostBreakdown[] = [
        {
          category: 'Exchange Fee',
          amount: exchangeFee,
          percent: (exchangeFee / totalCost) * 100,
          description: 'Fee charged by the exchange provider',
        },
        {
          category: 'Network Fee',
          amount: networkFee,
          percent: (networkFee / totalCost) * 100,
          description: 'Blockchain network transaction fee',
        },
        {
          category: 'Gas Cost',
          amount: gasCost,
          percent: (gasCost / totalCost) * 100,
          description: 'Computational cost for transaction execution',
        },
        {
          category: 'Slippage',
          amount: slippageCost,
          percent: (slippageCost / totalCost) * 100,
          description: 'Price movement during transaction execution',
        },
      ];

      const suggestions: OptimizationSuggestion[] = [];

      if (exchangeFee / totalCost > 0.4) {
        suggestions.push({
          type: 'provider_change',
          description: 'Consider using a different exchange provider for lower fees',
          potentialSavings: exchangeFee * 0.2,
          confidence: 0.7,
        });
      }

      if (gasCost / totalCost > 0.3) {
        suggestions.push({
          type: 'timing',
          description: 'Execute during off-peak hours for lower gas costs',
          potentialSavings: gasCost * 0.3,
          confidence: 0.8,
        });
      }

      if (slippageCost / totalCost > 0.15) {
        suggestions.push({
          type: 'split_order',
          description: 'Split large orders into smaller transactions to reduce slippage',
          potentialSavings: slippageCost * 0.4,
          confidence: 0.6,
        });
      }

      const analysis: CostAnalysis = {
        transactionId,
        exchangeFee: Math.round(exchangeFee * 100) / 100,
        networkFee: Math.round(networkFee * 100) / 100,
        gasCost: Math.round(gasCost * 100) / 100,
        slippageCost: Math.round(slippageCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        costPercent: 1.5, // Placeholder
        breakdown,
        optimizationSuggestions: suggestions,
      };

      return {
        success: true,
        data: analysis,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getHistoricalCosts(
    filters?: CostHistoryFilters
  ): Promise<ActionResult<CostHistoryEntry[]>> {
    const startTime = Date.now();

    try {
      let entries = [...this.costHistory];

      if (filters?.chainId) {
        entries = entries.filter(e => e.chainId === filters.chainId);
      }

      if (filters?.since) {
        entries = entries.filter(e => e.timestamp >= filters.since!);
      }

      if (filters?.until) {
        entries = entries.filter(e => e.timestamp <= filters.until!);
      }

      entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      if (filters?.limit) {
        entries = entries.slice(0, filters.limit);
      }

      return {
        success: true,
        data: entries,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  updateConfig(config: Partial<CostOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CostOptimizationConfig {
    return { ...this.config };
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onEvent(callback: OmnichainEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private generateRouteOptions(request: RouteRequest): RouteOption[] {
    const routes: RouteOption[] = [];

    // Generate simulated routes from different providers
    const providers = ['changenow', 'provider_b', 'provider_c'];

    for (const provider of providers) {
      const baseRate = 0.95 + Math.random() * 0.05;
      const baseFee = 0.5 + Math.random() * 2;
      const baseTime = 5 + Math.random() * 20;
      const priceImpact = Math.random() * 1;

      const amount = parseFloat(request.amount);
      const estimatedAmount = (amount * baseRate).toFixed(6);

      // Calculate score based on multiple factors
      const feeScore = 10 - (baseFee / 3) * 10;
      const timeScore = 10 - (baseTime / 30) * 10;
      const impactScore = 10 - priceImpact * 10;
      const score = feeScore * 0.4 + timeScore * 0.3 + impactScore * 0.3;

      const warnings: string[] = [];
      if (priceImpact > 0.5) {
        warnings.push('High price impact detected');
      }
      if (baseTime > 15) {
        warnings.push('Longer execution time expected');
      }

      routes.push({
        id: this.generateId(),
        provider,
        fromChain: request.sourceChain,
        toChain: request.destinationChain,
        fromAsset: request.sourceAsset,
        toAsset: request.destinationAsset,
        estimatedAmount,
        estimatedFee: baseFee.toFixed(2),
        estimatedGas: '0.001',
        estimatedTimeMinutes: Math.round(baseTime),
        priceImpactPercent: Math.round(priceImpact * 100) / 100,
        score: Math.round(score * 10) / 10,
        isRecommended: false,
        warnings,
      });
    }

    return routes;
  }

  private createEmptyRoute(): RouteOption {
    return {
      id: '',
      provider: '',
      fromChain: 'ton',
      toChain: 'eth',
      fromAsset: '',
      toAsset: '',
      estimatedAmount: '0',
      estimatedFee: '0',
      estimatedGas: '0',
      estimatedTimeMinutes: 0,
      priceImpactPercent: 0,
      score: 0,
      isRecommended: false,
      warnings: [],
    };
  }

  private getRouteCacheKey(request: RouteRequest): string {
    return `${request.sourceChain}:${request.destinationChain}:${request.sourceAsset}:${request.destinationAsset}:${request.amount}`;
  }

  private getBaseGasPrice(chainId: ChainId): number {
    const basePrices: Record<string, number> = {
      ton: 0.01,
      eth: 30,
      sol: 0.0001,
      bnb: 5,
      polygon: 50,
      arbitrum: 0.1,
      optimism: 0.01,
    };
    return basePrices[chainId] || 10;
  }

  private estimateBaseFee(sourceChain: ChainId, destinationChain: ChainId): number {
    const baseFee = 1;
    const crossChainMultiplier = sourceChain !== destinationChain ? 2 : 1;
    return baseFee * crossChainMultiplier;
  }

  private estimateUsdValue(chainId: ChainId, amount: number): number {
    const prices: Record<string, number> = {
      ton: 5,
      eth: 2500,
      sol: 100,
      bnb: 300,
      polygon: 1,
      arbitrum: 2500,
      optimism: 2500,
    };
    return amount * (prices[chainId] || 1);
  }

  private estimateBatchSavings(transactions: string[]): number {
    // Estimate 10-20% savings from batching
    const baseGasCost = transactions.length * 2;
    const savingsPercent = 0.1 + Math.random() * 0.1;
    return baseGasCost * savingsPercent;
  }

  private emitEvent(
    severity: OmnichainEvent['severity'],
    type: string,
    data: Record<string, unknown>
  ): void {
    const event: OmnichainEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: type as OmnichainEvent['type'],
      source: 'cost_optimizer',
      severity,
      message: `Cost: ${type}`,
      data,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private handleError(error: unknown, startTime: number): ActionResult<never> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message,
        retryable: false,
      },
      executionTime: Date.now() - startTime,
    };
  }

  private generateId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCostOptimizer(config?: CostOptimizerConfig): DefaultCostOptimizer {
  return new DefaultCostOptimizer(config);
}

export default DefaultCostOptimizer;
