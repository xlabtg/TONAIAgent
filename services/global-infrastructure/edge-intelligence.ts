/**
 * TONAIAgent - Edge Intelligence & Data Layer
 *
 * Moves AI inference, streaming data, and caching closer to users at the
 * edge. Enables faster decision-making for real-time trading, risk monitoring,
 * signal processing, and market prediction without central round-trips.
 *
 * Issue #100: Global Infrastructure & Edge Deployment
 */

import type {
  EdgeInferenceTask,
  EdgeCacheConfig,
  StreamingDataConfig,
  StreamingDataSource,
  InferenceModel,
  RegionCode,
  GlobalInfraEvent,
  GlobalInfraEventCallback,
} from './types';

import type { EdgeNodeRegistry } from './edge-node-registry';

// ============================================================================
// Edge Cache (per-node, in-memory for now)
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

class EdgeCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly config: EdgeCacheConfig;

  constructor(config: EdgeCacheConfig) {
    this.config = config;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlOverrideMs?: number): void {
    const ttlMs = (ttlOverrideMs ?? this.config.ttlSeconds) * 1000;
    this.evictIfNeeded();
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      accessCount: 1,
      lastAccessedAt: Date.now(),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  private evictIfNeeded(): void {
    // Simple LRU eviction when approaching capacity
    if (this.store.size < 10_000) return;

    const entries = Array.from(this.store.entries());
    if (this.config.evictionPolicy === 'lru') {
      entries.sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
    } else if (this.config.evictionPolicy === 'lfu') {
      entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
    }

    // Remove oldest 10%
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.store.delete(entries[i][0]);
    }
  }
}

// ============================================================================
// Edge Intelligence Layer
// ============================================================================

export class EdgeIntelligenceLayer {
  private readonly caches = new Map<string, EdgeCache>(); // nodeId → EdgeCache
  private readonly inferenceTasks = new Map<string, EdgeInferenceTask>();
  private readonly streamingConfigs = new Map<string, StreamingDataConfig>(); // nodeId → config
  private readonly eventCallbacks: GlobalInfraEventCallback[] = [];
  private readonly completedTasks: EdgeInferenceTask[] = [];
  private readonly MAX_TASK_HISTORY = 1_000;

  // Default inference latency targets per model (ms)
  private readonly MODEL_LATENCY_TARGET: Record<InferenceModel, number> = {
    risk_scoring: 50,
    signal_processing: 20,
    anomaly_detection: 100,
    market_prediction: 200,
    sentiment_analysis: 150,
  };

  constructor(private readonly registry: EdgeNodeRegistry) {}

  /**
   * Initialize the cache for an edge node.
   */
  initNodeCache(config: EdgeCacheConfig): EdgeCache {
    const cache = new EdgeCache(config);
    this.caches.set(config.nodeId, cache);
    return cache;
  }

  /**
   * Get the cache for a node.
   */
  getNodeCache(nodeId: string): EdgeCache | undefined {
    return this.caches.get(nodeId);
  }

  /**
   * Configure streaming data for a node.
   */
  configureStreaming(config: StreamingDataConfig): void {
    this.streamingConfigs.set(config.nodeId, config);
  }

  /**
   * Add a streaming data source to a node's config.
   */
  addStreamingSource(nodeId: string, source: StreamingDataSource): void {
    const config = this.streamingConfigs.get(nodeId);
    if (config) {
      const existing = config.sources.findIndex((s) => s.id === source.id);
      if (existing >= 0) {
        config.sources[existing] = source;
      } else {
        config.sources.push(source);
      }
    } else {
      this.streamingConfigs.set(nodeId, {
        nodeId,
        sources: [source],
        bufferSizeMs: 100,
        maxThroughputKbps: 10_000,
        enableBackpressure: true,
      });
    }
  }

  /**
   * Submit an edge inference task.
   */
  submitInferenceTask(input: {
    model: InferenceModel;
    nodeId: string;
    tenantId: string;
    agentId?: string;
    inputSize: number;
    priority?: EdgeInferenceTask['priority'];
  }): EdgeInferenceTask {
    const task: EdgeInferenceTask = {
      id: `inf_${input.nodeId}_${Date.now()}`,
      model: input.model,
      nodeId: input.nodeId,
      tenantId: input.tenantId,
      agentId: input.agentId,
      inputSize: input.inputSize,
      priority: input.priority ?? 'medium',
      status: 'queued',
    };

    this.inferenceTasks.set(task.id, task);
    return task;
  }

  /**
   * Simulate execution of an inference task (marks it as completed with timing).
   * In production this would dispatch to the actual ML inference runtime.
   */
  async executeInferenceTask(taskId: string): Promise<EdgeInferenceTask> {
    const task = this.inferenceTasks.get(taskId);
    if (!task) {
      throw new Error(`EdgeIntelligenceLayer: inference task not found: ${taskId}`);
    }

    task.status = 'running';
    task.startedAt = new Date();

    // Simulate inference latency based on model type and input size
    const targetMs = this.MODEL_LATENCY_TARGET[task.model];
    const sizeOverheadMs = Math.min(50, task.inputSize / 10_000); // 1ms per 10KB
    const simulatedLatencyMs = targetMs + sizeOverheadMs;

    await new Promise<void>((resolve) =>
      setTimeout(resolve, Math.min(simulatedLatencyMs, 10))
    ); // Cap at 10ms in simulation

    task.status = 'completed';
    task.completedAt = new Date();
    task.latencyMs = simulatedLatencyMs;

    // Move to completed history
    this.inferenceTasks.delete(taskId);
    this.completedTasks.push(task);
    if (this.completedTasks.length > this.MAX_TASK_HISTORY) {
      this.completedTasks.shift();
    }

    return task;
  }

  /**
   * Get inference task by ID (from active or completed tasks).
   */
  getInferenceTask(taskId: string): EdgeInferenceTask | undefined {
    return (
      this.inferenceTasks.get(taskId) ??
      this.completedTasks.find((t) => t.id === taskId)
    );
  }

  /**
   * List active inference tasks.
   */
  listActiveInferenceTasks(filter?: {
    nodeId?: string;
    tenantId?: string;
    model?: InferenceModel;
  }): EdgeInferenceTask[] {
    let tasks = Array.from(this.inferenceTasks.values());
    if (filter?.nodeId) tasks = tasks.filter((t) => t.nodeId === filter.nodeId);
    if (filter?.tenantId) tasks = tasks.filter((t) => t.tenantId === filter.tenantId);
    if (filter?.model) tasks = tasks.filter((t) => t.model === filter.model);
    return tasks;
  }

  /**
   * Get inference performance statistics for a model.
   */
  getInferenceStats(model: InferenceModel): {
    totalExecuted: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
  } {
    const tasks = this.completedTasks.filter((t) => t.model === model);
    if (tasks.length === 0) {
      return { totalExecuted: 0, avgLatencyMs: 0, p95LatencyMs: 0, errorRate: 0 };
    }

    const latencies = tasks
      .filter((t) => t.latencyMs !== undefined)
      .map((t) => t.latencyMs!);

    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((s, l) => s + l, 0) / latencies.length;
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Idx] ?? latencies[latencies.length - 1] ?? 0;
    const errorCount = tasks.filter((t) => t.status === 'failed').length;

    return {
      totalExecuted: tasks.length,
      avgLatencyMs: Math.round(avg),
      p95LatencyMs: Math.round(p95),
      errorRate: errorCount / tasks.length,
    };
  }

  /**
   * Get the best node for a given inference model based on current load.
   */
  getBestNodeForInference(
    model: InferenceModel,
    region?: RegionCode
  ): string | undefined {
    const filter = region
      ? { region, status: 'active' as const }
      : { status: 'active' as const };

    const nodes = this.registry
      .listNodes(filter)
      .filter((n) => n.featureFlags.aiInference);

    if (nodes.length === 0) return undefined;

    // Prefer nodes with lower current load
    const scored = nodes.map((n) => ({
      id: n.id,
      score: n.healthScore - (n.usedCapacityUnits / Math.max(1, n.capacityUnits)) * 50,
    }));
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.id;
  }

  /**
   * Get streaming configuration for a node.
   */
  getStreamingConfig(nodeId: string): StreamingDataConfig | undefined {
    return this.streamingConfigs.get(nodeId);
  }

  /**
   * Subscribe to edge intelligence events.
   */
  onEvent(callback: GlobalInfraEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private
  // ============================================================================

  private emitEvent(event: GlobalInfraEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore
      }
    }
  }
}

export function createEdgeIntelligenceLayer(
  registry: EdgeNodeRegistry
): EdgeIntelligenceLayer {
  return new EdgeIntelligenceLayer(registry);
}
