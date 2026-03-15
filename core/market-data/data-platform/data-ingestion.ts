/**
 * TONAIAgent - Data Ingestion Module
 *
 * Scalable data pipelines supporting streaming and batch processing
 * for real-time analytics and historical data storage.
 */

import {
  DataSource,
  DataSourceConfig,
  DataSourceStatus,
  DataSourceType,
  DataPipeline,
  DataPipelineConfig,
  PipelineStatus,
  PipelineMetrics,
  DataProcessor,
  DataSink,
  DataSinkConfig,
  ErrorHandlingStrategy,
  DataPlatformEvent,
  DataPlatformEventCallback,
  RetryPolicy,
} from './types';

// Re-export PipelineMode from types for API consumers
export type { PipelineMode } from './types';

// ============================================================================
// Data Source Manager
// ============================================================================

export interface DataSourceManager {
  registerSource(config: DataSourceConfig): Promise<DataSource>;
  removeSource(sourceId: string): Promise<boolean>;
  getSource(sourceId: string): DataSource | undefined;
  listSources(type?: DataSourceType): DataSource[];
  updateSourceStatus(sourceId: string, status: DataSourceStatus): void;
  checkHealth(sourceId: string): Promise<HealthCheckResult>;
  onEvent(callback: DataPlatformEventCallback): void;
}

export interface HealthCheckResult {
  sourceId: string;
  healthy: boolean;
  latencyMs: number;
  errorMessage?: string;
  lastCheck: Date;
}

export class DefaultDataSourceManager implements DataSourceManager {
  private readonly sources: Map<string, DataSource> = new Map();
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  async registerSource(config: DataSourceConfig): Promise<DataSource> {
    const source: DataSource = {
      id: config.id,
      name: config.id,
      type: config.type,
      provider: config.provider,
      endpoint: config.endpoint,
      status: 'inactive',
      latencyMs: 0,
      reliability: 100,
      lastUpdate: new Date(),
      metadata: {},
    };

    this.sources.set(config.id, source);

    // Perform initial health check
    const health = await this.checkHealth(config.id);
    source.status = health.healthy ? 'active' : 'error';
    source.latencyMs = health.latencyMs;

    this.emitEvent('data_ingested', 'ingestion', {
      action: 'source_registered',
      sourceId: config.id,
      type: config.type,
    });

    return source;
  }

  async removeSource(sourceId: string): Promise<boolean> {
    const removed = this.sources.delete(sourceId);
    if (removed) {
      this.emitEvent('data_ingested', 'ingestion', {
        action: 'source_removed',
        sourceId,
      });
    }
    return removed;
  }

  getSource(sourceId: string): DataSource | undefined {
    return this.sources.get(sourceId);
  }

  listSources(type?: DataSourceType): DataSource[] {
    const sources = Array.from(this.sources.values());
    if (type) {
      return sources.filter((s) => s.type === type);
    }
    return sources;
  }

  updateSourceStatus(sourceId: string, status: DataSourceStatus): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.status = status;
      source.lastUpdate = new Date();
    }
  }

  async checkHealth(sourceId: string): Promise<HealthCheckResult> {
    const source = this.sources.get(sourceId);

    if (!source) {
      return {
        sourceId,
        healthy: false,
        latencyMs: 0,
        errorMessage: 'Source not found',
        lastCheck: new Date(),
      };
    }

    // Simulate health check with mock latency
    // In production, this would make actual network requests
    const mockLatency = Math.random() * 100 + 10;
    const isHealthy = Math.random() > 0.1; // 90% chance healthy

    return {
      sourceId,
      healthy: isHealthy,
      latencyMs: mockLatency,
      errorMessage: isHealthy ? undefined : 'Connection timeout',
      lastCheck: new Date(),
    };
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(
    type: DataPlatformEvent['type'],
    category: DataPlatformEvent['category'],
    data: Record<string, unknown>
  ): void {
    const event: DataPlatformEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      data,
      source: 'data-source-manager',
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Data Pipeline Manager
// ============================================================================

export interface DataPipelineManager {
  createPipeline(config: DataPipelineConfig): Promise<DataPipeline>;
  startPipeline(pipelineId: string): Promise<void>;
  stopPipeline(pipelineId: string): Promise<void>;
  pausePipeline(pipelineId: string): Promise<void>;
  resumePipeline(pipelineId: string): Promise<void>;
  getPipeline(pipelineId: string): DataPipeline | undefined;
  listPipelines(status?: PipelineStatus): DataPipeline[];
  getMetrics(pipelineId: string): PipelineMetrics | undefined;
  addProcessor(pipelineId: string, processor: DataProcessor): Promise<void>;
  removeProcessor(pipelineId: string, processorId: string): Promise<void>;
  addSink(pipelineId: string, sink: DataSinkConfig): Promise<void>;
  removeSink(pipelineId: string, sinkId: string): Promise<void>;
  onEvent(callback: DataPlatformEventCallback): void;
}

export class DefaultDataPipelineManager implements DataPipelineManager {
  private readonly pipelines: Map<string, DataPipeline> = new Map();
  private readonly pipelineIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];
  private readonly sourceManager: DataSourceManager;

  constructor(sourceManager: DataSourceManager) {
    this.sourceManager = sourceManager;
  }

  async createPipeline(config: DataPipelineConfig): Promise<DataPipeline> {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Initialize sinks from config
    const sinks: DataSink[] = config.sinks.map((sinkConfig, index) => ({
      id: `sink_${index}_${Date.now()}`,
      name: `Sink ${index + 1}`,
      type: sinkConfig.type,
      status: 'inactive',
      config: sinkConfig,
    }));

    const pipeline: DataPipeline = {
      id: pipelineId,
      name: config.name,
      mode: config.mode,
      status: 'stopped',
      sources: config.sources.map((s) => s.id),
      processors: config.processors,
      sinks,
      metrics: {
        recordsProcessed: 0,
        recordsFailed: 0,
        bytesProcessed: 0,
        avgLatencyMs: 0,
        throughputPerSecond: 0,
        errorRate: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Register sources
    for (const sourceConfig of config.sources) {
      await this.sourceManager.registerSource(sourceConfig);
    }

    this.pipelines.set(pipelineId, pipeline);

    this.emitEvent('data_processed', 'processing', {
      action: 'pipeline_created',
      pipelineId,
      name: config.name,
      mode: config.mode,
    });

    return pipeline;
  }

  async startPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    if (pipeline.status === 'running') {
      return; // Already running
    }

    pipeline.status = 'running';
    pipeline.updatedAt = new Date();

    // Update sink statuses
    for (const sink of pipeline.sinks) {
      sink.status = 'active';
    }

    // Start processing based on mode
    if (pipeline.mode === 'streaming' || pipeline.mode === 'hybrid') {
      this.startStreamingPipeline(pipeline);
    }

    if (pipeline.mode === 'batch' || pipeline.mode === 'hybrid') {
      this.startBatchPipeline(pipeline);
    }

    this.emitEvent('data_processed', 'processing', {
      action: 'pipeline_started',
      pipelineId,
    });
  }

  async stopPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    pipeline.status = 'stopped';
    pipeline.updatedAt = new Date();

    // Stop any running intervals
    const interval = this.pipelineIntervals.get(pipelineId);
    if (interval) {
      clearInterval(interval);
      this.pipelineIntervals.delete(pipelineId);
    }

    // Update sink statuses
    for (const sink of pipeline.sinks) {
      sink.status = 'inactive';
    }

    this.emitEvent('data_processed', 'processing', {
      action: 'pipeline_stopped',
      pipelineId,
    });
  }

  async pausePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    pipeline.status = 'paused';
    pipeline.updatedAt = new Date();

    // Stop any running intervals but keep state
    const interval = this.pipelineIntervals.get(pipelineId);
    if (interval) {
      clearInterval(interval);
      this.pipelineIntervals.delete(pipelineId);
    }

    this.emitEvent('data_processed', 'processing', {
      action: 'pipeline_paused',
      pipelineId,
    });
  }

  async resumePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    if (pipeline.status !== 'paused') {
      throw new Error(`Pipeline ${pipelineId} is not paused`);
    }

    await this.startPipeline(pipelineId);

    this.emitEvent('data_processed', 'processing', {
      action: 'pipeline_resumed',
      pipelineId,
    });
  }

  getPipeline(pipelineId: string): DataPipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  listPipelines(status?: PipelineStatus): DataPipeline[] {
    const pipelines = Array.from(this.pipelines.values());
    if (status) {
      return pipelines.filter((p) => p.status === status);
    }
    return pipelines;
  }

  getMetrics(pipelineId: string): PipelineMetrics | undefined {
    const pipeline = this.pipelines.get(pipelineId);
    return pipeline?.metrics;
  }

  async addProcessor(pipelineId: string, processor: DataProcessor): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    pipeline.processors.push(processor);
    pipeline.updatedAt = new Date();
  }

  async removeProcessor(pipelineId: string, processorId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    pipeline.processors = pipeline.processors.filter((p) => p.id !== processorId);
    pipeline.updatedAt = new Date();
  }

  async addSink(pipelineId: string, sinkConfig: DataSinkConfig): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const sink: DataSink = {
      id: `sink_${Date.now()}`,
      name: `Sink ${pipeline.sinks.length + 1}`,
      type: sinkConfig.type,
      status: pipeline.status === 'running' ? 'active' : 'inactive',
      config: sinkConfig,
    };

    pipeline.sinks.push(sink);
    pipeline.updatedAt = new Date();
  }

  async removeSink(pipelineId: string, sinkId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    pipeline.sinks = pipeline.sinks.filter((s) => s.id !== sinkId);
    pipeline.updatedAt = new Date();
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private startStreamingPipeline(pipeline: DataPipeline): void {
    // Simulate streaming with interval-based updates
    const interval = setInterval(() => {
      this.processStreamingBatch(pipeline);
    }, 1000); // Process every second

    this.pipelineIntervals.set(pipeline.id, interval);
  }

  private startBatchPipeline(pipeline: DataPipeline): void {
    // For batch mode, we use longer intervals
    const interval = setInterval(() => {
      this.processBatch(pipeline);
    }, 60000); // Process every minute

    // Run initial batch
    this.processBatch(pipeline);

    this.pipelineIntervals.set(pipeline.id, interval);
  }

  private processStreamingBatch(pipeline: DataPipeline): void {
    if (pipeline.status !== 'running') return;

    const startTime = Date.now();

    // Simulate processing
    const recordCount = Math.floor(Math.random() * 100) + 10;
    const bytesProcessed = recordCount * 256; // Assume 256 bytes per record
    const failedCount = Math.floor(Math.random() * 3);

    // Update metrics
    pipeline.metrics.recordsProcessed += recordCount;
    pipeline.metrics.recordsFailed += failedCount;
    pipeline.metrics.bytesProcessed += bytesProcessed;
    pipeline.metrics.lastProcessedAt = new Date();

    const latency = Date.now() - startTime;
    pipeline.metrics.avgLatencyMs =
      (pipeline.metrics.avgLatencyMs * 0.9) + (latency * 0.1);
    pipeline.metrics.throughputPerSecond = recordCount;
    pipeline.metrics.errorRate =
      pipeline.metrics.recordsFailed / pipeline.metrics.recordsProcessed;

    this.emitEvent('data_ingested', 'ingestion', {
      pipelineId: pipeline.id,
      recordsProcessed: recordCount,
      latencyMs: latency,
    });
  }

  private processBatch(pipeline: DataPipeline): void {
    if (pipeline.status !== 'running') return;

    const startTime = Date.now();

    // Simulate larger batch processing
    const recordCount = Math.floor(Math.random() * 10000) + 1000;
    const bytesProcessed = recordCount * 512;
    const failedCount = Math.floor(Math.random() * 10);

    // Update metrics
    pipeline.metrics.recordsProcessed += recordCount;
    pipeline.metrics.recordsFailed += failedCount;
    pipeline.metrics.bytesProcessed += bytesProcessed;
    pipeline.metrics.lastProcessedAt = new Date();

    const latency = Date.now() - startTime;
    pipeline.metrics.avgLatencyMs =
      (pipeline.metrics.avgLatencyMs * 0.9) + (latency * 0.1);
    pipeline.metrics.throughputPerSecond = recordCount / 60;
    pipeline.metrics.errorRate =
      pipeline.metrics.recordsFailed / pipeline.metrics.recordsProcessed;

    // Generate checkpoint
    pipeline.metrics.checkpointId = `checkpoint_${Date.now()}`;

    this.emitEvent('data_processed', 'processing', {
      pipelineId: pipeline.id,
      recordsProcessed: recordCount,
      checkpointId: pipeline.metrics.checkpointId,
    });
  }

  private emitEvent(
    type: DataPlatformEvent['type'],
    category: DataPlatformEvent['category'],
    data: Record<string, unknown>
  ): void {
    const event: DataPlatformEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      data,
      source: 'data-pipeline-manager',
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Batch Processor
// ============================================================================

export interface BatchProcessor {
  processBatch<T>(
    records: T[],
    processor: (record: T) => Promise<T | null>,
    options?: BatchProcessorOptions
  ): Promise<BatchProcessResult<T>>;
}

export interface BatchProcessorOptions {
  batchSize: number;
  parallelism: number;
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandlingStrategy;
}

export interface BatchProcessResult<T> {
  processed: T[];
  failed: FailedRecord<T>[];
  totalRecords: number;
  successCount: number;
  failureCount: number;
  durationMs: number;
}

export interface FailedRecord<T> {
  record: T;
  error: string;
  retries: number;
}

export class DefaultBatchProcessor implements BatchProcessor {
  async processBatch<T>(
    records: T[],
    processor: (record: T) => Promise<T | null>,
    options: BatchProcessorOptions = {
      batchSize: 100,
      parallelism: 4,
      retryPolicy: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      },
      errorHandling: {
        onError: 'skip',
        maxRetries: 3,
        alertThreshold: 10,
      },
    }
  ): Promise<BatchProcessResult<T>> {
    const startTime = Date.now();
    const processed: T[] = [];
    const failed: FailedRecord<T>[] = [];

    // Process in batches
    for (let i = 0; i < records.length; i += options.batchSize) {
      const batch = records.slice(i, i + options.batchSize);

      // Process batch with parallelism
      const chunks: T[][] = [];
      const chunkSize = Math.ceil(batch.length / options.parallelism);

      for (let j = 0; j < batch.length; j += chunkSize) {
        chunks.push(batch.slice(j, j + chunkSize));
      }

      const chunkResults = await Promise.all(
        chunks.map((chunk) => this.processChunk(chunk, processor, options))
      );

      for (const result of chunkResults) {
        processed.push(...result.processed);
        failed.push(...result.failed);
      }
    }

    return {
      processed,
      failed,
      totalRecords: records.length,
      successCount: processed.length,
      failureCount: failed.length,
      durationMs: Date.now() - startTime,
    };
  }

  private async processChunk<T>(
    chunk: T[],
    processor: (record: T) => Promise<T | null>,
    options: BatchProcessorOptions
  ): Promise<{ processed: T[]; failed: FailedRecord<T>[] }> {
    const processed: T[] = [];
    const failed: FailedRecord<T>[] = [];

    for (const record of chunk) {
      let result: T | null = null;
      let lastError = '';
      let retries = 0;

      while (retries <= options.retryPolicy.maxRetries) {
        try {
          result = await processor(record);
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          retries++;

          if (retries <= options.retryPolicy.maxRetries) {
            const delay = Math.min(
              options.retryPolicy.initialDelayMs *
                Math.pow(options.retryPolicy.backoffMultiplier, retries - 1),
              options.retryPolicy.maxDelayMs
            );
            await this.delay(delay);
          }
        }
      }

      if (result !== null) {
        processed.push(result);
      } else if (options.errorHandling.onError !== 'skip') {
        failed.push({
          record,
          error: lastError,
          retries,
        });
      }
    }

    return { processed, failed };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Stream Processor
// ============================================================================

export interface StreamProcessor {
  subscribe<T>(
    source: string,
    handler: StreamHandler<T>,
    options?: StreamProcessorOptions
  ): StreamSubscription;
  unsubscribe(subscriptionId: string): void;
  getActiveSubscriptions(): StreamSubscription[];
}

export interface StreamHandler<T> {
  onRecord: (record: T) => Promise<void>;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export interface StreamProcessorOptions {
  bufferSize: number;
  flushInterval: number; // ms
  backpressure: 'drop' | 'block' | 'buffer';
  windowConfig?: WindowConfig;
}

export interface WindowConfig {
  type: 'tumbling' | 'sliding' | 'session';
  duration: number; // ms
  slideInterval?: number; // for sliding windows
  sessionGap?: number; // for session windows
}

export interface StreamSubscription {
  id: string;
  source: string;
  status: 'active' | 'paused' | 'stopped';
  metrics: StreamMetrics;
  createdAt: Date;
}

export interface StreamMetrics {
  recordsReceived: number;
  recordsProcessed: number;
  recordsDropped: number;
  errors: number;
  avgLatencyMs: number;
  backpressureEvents: number;
}

export class DefaultStreamProcessor implements StreamProcessor {
  private readonly subscriptions: Map<string, StreamSubscriptionInternal<unknown>> = new Map();
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  subscribe<T>(
    source: string,
    handler: StreamHandler<T>,
    options: StreamProcessorOptions = {
      bufferSize: 1000,
      flushInterval: 100,
      backpressure: 'buffer',
    }
  ): StreamSubscription {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const subscription: StreamSubscriptionInternal<T> = {
      id: subscriptionId,
      source,
      handler,
      options,
      status: 'active',
      buffer: [],
      metrics: {
        recordsReceived: 0,
        recordsProcessed: 0,
        recordsDropped: 0,
        errors: 0,
        avgLatencyMs: 0,
        backpressureEvents: 0,
      },
      createdAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, subscription as StreamSubscriptionInternal<unknown>);

    // Start flush interval
    subscription.flushInterval = setInterval(() => {
      this.flushBuffer(subscription);
    }, options.flushInterval);

    return {
      id: subscriptionId,
      source,
      status: 'active',
      metrics: subscription.metrics,
      createdAt: subscription.createdAt,
    };
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.status = 'stopped';
      if (subscription.flushInterval) {
        clearInterval(subscription.flushInterval);
      }
      // Flush remaining buffer
      this.flushBuffer(subscription);
      this.subscriptions.delete(subscriptionId);
    }
  }

  getActiveSubscriptions(): StreamSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter((s) => s.status === 'active')
      .map((s) => ({
        id: s.id,
        source: s.source,
        status: s.status,
        metrics: s.metrics,
        createdAt: s.createdAt,
      }));
  }

  // Method to push records to a subscription (for testing/integration)
  pushRecord<T>(subscriptionId: string, record: T): void {
    const subscription = this.subscriptions.get(subscriptionId) as
      StreamSubscriptionInternal<T> | undefined;
    if (!subscription || subscription.status !== 'active') {
      return;
    }

    subscription.metrics.recordsReceived++;

    if (subscription.buffer.length >= subscription.options.bufferSize) {
      switch (subscription.options.backpressure) {
        case 'drop':
          subscription.metrics.recordsDropped++;
          return;
        case 'buffer':
          subscription.metrics.backpressureEvents++;
          // Allow buffer to grow
          break;
        case 'block':
          subscription.metrics.backpressureEvents++;
          // In real implementation, this would block
          this.flushBuffer(subscription);
          break;
      }
    }

    subscription.buffer.push(record);
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private async flushBuffer<T>(subscription: StreamSubscriptionInternal<T>): Promise<void> {
    if (subscription.buffer.length === 0) return;

    const records = [...subscription.buffer];
    subscription.buffer = [];

    for (const record of records) {
      const startTime = Date.now();
      try {
        await subscription.handler.onRecord(record);
        subscription.metrics.recordsProcessed++;
        const latency = Date.now() - startTime;
        subscription.metrics.avgLatencyMs =
          (subscription.metrics.avgLatencyMs * 0.9) + (latency * 0.1);
      } catch (err) {
        subscription.metrics.errors++;
        if (subscription.handler.onError) {
          subscription.handler.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }
  }
}

interface StreamSubscriptionInternal<T> {
  id: string;
  source: string;
  handler: StreamHandler<T>;
  options: StreamProcessorOptions;
  status: 'active' | 'paused' | 'stopped';
  buffer: T[];
  metrics: StreamMetrics;
  createdAt: Date;
  flushInterval?: NodeJS.Timeout;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createDataSourceManager(): DefaultDataSourceManager {
  return new DefaultDataSourceManager();
}

export function createDataPipelineManager(
  sourceManager?: DataSourceManager
): DefaultDataPipelineManager {
  return new DefaultDataPipelineManager(sourceManager ?? createDataSourceManager());
}

export function createBatchProcessor(): DefaultBatchProcessor {
  return new DefaultBatchProcessor();
}

export function createStreamProcessor(): DefaultStreamProcessor {
  return new DefaultStreamProcessor();
}
