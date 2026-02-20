/**
 * TONAIAgent - Mobile Performance Optimization
 *
 * Optimizes for:
 * - Fast loading
 * - Low bandwidth
 * - Smooth animations
 * - Offline-friendly features
 */

import {
  PerformanceMetrics,
  LazyLoadConfig,
  DeviceInfo,
} from './types';

// Browser API type declarations for Node.js compatibility
declare class Image {
  src: string;
  onload: (() => void) | null;
  onerror: ((error: unknown) => void) | null;
}

// Minimal Element type for IntersectionObserver API
type ElementRef = unknown;

interface IntersectionObserverEntry {
  isIntersecting: boolean;
  target: ElementRef;
}

interface IntersectionObserverInit {
  threshold?: number | number[];
  rootMargin?: string;
}

interface IntersectionObserver {
  observe: (target: ElementRef) => void;
  unobserve: (target: ElementRef) => void;
  disconnect: () => void;
  root: ElementRef | null;
  rootMargin: string;
  thresholds: number[];
  takeRecords: () => IntersectionObserverEntry[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Performance manager configuration
 */
export interface PerformanceManagerConfig {
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Enable lazy loading */
  lazyLoading?: Partial<LazyLoadConfig>;
  /** Image optimization settings */
  imageOptimization?: ImageOptimizationConfig;
  /** Network optimization settings */
  networkOptimization?: NetworkOptimizationConfig;
  /** Animation settings */
  animationSettings?: AnimationSettings;
  /** Memory management settings */
  memoryManagement?: MemoryManagementConfig;
  /** Offline settings */
  offlineSettings?: OfflineSettings;
}

/**
 * Image optimization configuration
 */
export interface ImageOptimizationConfig {
  /** Enable image optimization */
  enabled: boolean;
  /** Max width for images */
  maxWidth: number;
  /** Quality (0-100) */
  quality: number;
  /** Use WebP format */
  useWebP: boolean;
  /** Lazy load images */
  lazyLoad: boolean;
  /** Placeholder type */
  placeholder: 'blur' | 'skeleton' | 'none';
}

/**
 * Network optimization configuration
 */
export interface NetworkOptimizationConfig {
  /** Enable request batching */
  batchRequests: boolean;
  /** Batch window (ms) */
  batchWindow: number;
  /** Enable request deduplication */
  deduplicateRequests: boolean;
  /** Cache API responses */
  cacheResponses: boolean;
  /** Response cache duration (seconds) */
  cacheDuration: number;
  /** Retry failed requests */
  retryFailed: boolean;
  /** Max retries */
  maxRetries: number;
  /** Compression enabled */
  compression: boolean;
}

/**
 * Animation settings
 */
export interface AnimationSettings {
  /** Enable animations */
  enabled: boolean;
  /** Reduce motion for accessibility */
  reduceMotion: boolean;
  /** Default duration (ms) */
  defaultDuration: number;
  /** Default easing */
  defaultEasing: string;
  /** Max concurrent animations */
  maxConcurrent: number;
}

/**
 * Memory management configuration
 */
export interface MemoryManagementConfig {
  /** Enable memory monitoring */
  enabled: boolean;
  /** Memory warning threshold (MB) */
  warningThreshold: number;
  /** Memory critical threshold (MB) */
  criticalThreshold: number;
  /** Auto cleanup enabled */
  autoCleanup: boolean;
  /** Cleanup interval (ms) */
  cleanupInterval: number;
}

/**
 * Offline settings
 */
export interface OfflineSettings {
  /** Enable offline mode */
  enabled: boolean;
  /** Auto sync when online */
  autoSync: boolean;
  /** Sync interval (ms) */
  syncInterval: number;
  /** Max offline storage (MB) */
  maxStorage: number;
  /** Priority data to cache */
  priorityData: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<PerformanceManagerConfig> = {
  enableMonitoring: true,
  lazyLoading: {
    enabled: true,
    threshold: 0.1,
    rootMargin: '100px',
    placeholder: 'skeleton',
  },
  imageOptimization: {
    enabled: true,
    maxWidth: 1024,
    quality: 80,
    useWebP: true,
    lazyLoad: true,
    placeholder: 'blur',
  },
  networkOptimization: {
    batchRequests: true,
    batchWindow: 50,
    deduplicateRequests: true,
    cacheResponses: true,
    cacheDuration: 300,
    retryFailed: true,
    maxRetries: 3,
    compression: true,
  },
  animationSettings: {
    enabled: true,
    reduceMotion: false,
    defaultDuration: 200,
    defaultEasing: 'ease-out',
    maxConcurrent: 10,
  },
  memoryManagement: {
    enabled: true,
    warningThreshold: 100,
    criticalThreshold: 200,
    autoCleanup: true,
    cleanupInterval: 60000,
  },
  offlineSettings: {
    enabled: true,
    autoSync: true,
    syncInterval: 30000,
    maxStorage: 50,
    priorityData: ['portfolio', 'strategies', 'settings'],
  },
};

// ============================================================================
// Performance Manager
// ============================================================================

/**
 * Performance snapshot
 */
export interface PerformanceSnapshot {
  /** Timestamp */
  timestamp: Date;
  /** Metrics */
  metrics: PerformanceMetrics;
  /** Network status */
  networkStatus: NetworkStatus;
  /** Memory status */
  memoryStatus: MemoryStatus;
  /** Device info */
  device?: DeviceInfo;
}

/**
 * Network status
 */
export interface NetworkStatus {
  /** Is online */
  online: boolean;
  /** Connection type */
  type: 'wifi' | '4g' | '3g' | '2g' | 'slow' | 'offline';
  /** Effective bandwidth (Mbps) */
  effectiveBandwidth: number;
  /** Latency (ms) */
  latency: number;
  /** Save data mode */
  saveData: boolean;
}

/**
 * Memory status
 */
export interface MemoryStatus {
  /** Used memory (MB) */
  used: number;
  /** Total available (MB) */
  total: number;
  /** Usage percentage */
  percentage: number;
  /** Status */
  status: 'normal' | 'warning' | 'critical';
}

/**
 * Resource loading priority
 */
export type ResourcePriority = 'critical' | 'high' | 'medium' | 'low' | 'idle';

/**
 * Manages mobile performance optimization
 */
export class PerformanceManager {
  private readonly config: Required<PerformanceManagerConfig>;
  private readonly metrics: PerformanceMetrics;
  private readonly pendingRequests: Map<string, Promise<unknown>> = new Map();
  private readonly requestBatch: BatchedRequest[] = [];
  private batchTimer?: ReturnType<typeof setTimeout>;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private networkStatus: NetworkStatus;
  private onPerformanceWarning?: (warning: PerformanceWarning) => void;

  constructor(config: Partial<PerformanceManagerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      lazyLoading: { ...DEFAULT_CONFIG.lazyLoading, ...config.lazyLoading },
      imageOptimization: { ...DEFAULT_CONFIG.imageOptimization, ...config.imageOptimization },
      networkOptimization: { ...DEFAULT_CONFIG.networkOptimization, ...config.networkOptimization },
      animationSettings: { ...DEFAULT_CONFIG.animationSettings, ...config.animationSettings },
      memoryManagement: { ...DEFAULT_CONFIG.memoryManagement, ...config.memoryManagement },
      offlineSettings: { ...DEFAULT_CONFIG.offlineSettings, ...config.offlineSettings },
    };

    this.metrics = {
      tti: 0,
      fcp: 0,
      lcp: 0,
      cls: 0,
      fid: 0,
      tbt: 0,
      apiLatency: {},
      memoryUsage: 0,
    };

    this.networkStatus = {
      online: true,
      type: 'wifi',
      effectiveBandwidth: 10,
      latency: 50,
      saveData: false,
    };

    // Start memory cleanup if enabled
    if (this.config.memoryManagement.autoCleanup) {
      this.startMemoryCleanup();
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize performance monitoring
   */
  initialize(device?: DeviceInfo): void {
    // Detect network conditions
    this.detectNetworkConditions();

    // Adjust settings based on device
    if (device) {
      this.optimizeForDevice(device);
    }

    // Start performance monitoring
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * Set warning handler
   */
  setWarningHandler(handler: (warning: PerformanceWarning) => void): void {
    this.onPerformanceWarning = handler;
  }

  /**
   * Stop performance manager
   */
  stop(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  // ============================================================================
  // Network Optimization
  // ============================================================================

  /**
   * Make an optimized API request
   */
  async request<T>(
    url: string,
    options?: RequestOptions
  ): Promise<T> {
    const priority = options?.priority ?? 'medium';
    const cacheKey = options?.cacheKey ?? url;

    // Check for deduplication
    if (this.config.networkOptimization.deduplicateRequests) {
      const pending = this.pendingRequests.get(cacheKey);
      if (pending) {
        return pending as Promise<T>;
      }
    }

    // Check cache
    if (this.config.networkOptimization.cacheResponses && !options?.skipCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Add to batch if batching enabled
    if (this.config.networkOptimization.batchRequests && priority !== 'critical') {
      return this.addToBatch<T>(url, options);
    }

    // Make direct request
    return this.executeRequest<T>(url, options, cacheKey);
  }

  /**
   * Add request to batch
   */
  private addToBatch<T>(url: string, options?: RequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestBatch.push({
        url,
        options,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      // Set batch timer if not set
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.config.networkOptimization.batchWindow);
      }
    });
  }

  /**
   * Process batched requests
   */
  private async processBatch(): Promise<void> {
    this.batchTimer = undefined;
    const batch = [...this.requestBatch];
    this.requestBatch.length = 0;

    // Execute all requests in parallel
    await Promise.all(
      batch.map(async ({ url, options, resolve, reject }) => {
        try {
          const result = await this.executeRequest(url, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      })
    );
  }

  /**
   * Execute a single request
   */
  private async executeRequest<T>(
    url: string,
    options?: RequestOptions,
    cacheKey?: string
  ): Promise<T> {
    const startTime = Date.now();
    const key = cacheKey ?? url;

    const requestPromise = this.doFetch<T>(url, options);

    // Track pending request
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;

      // Record latency
      this.metrics.apiLatency[url] = Date.now() - startTime;

      // Cache result
      if (this.config.networkOptimization.cacheResponses) {
        this.setInCache(key, result);
      }

      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Perform actual fetch
   */
  private async doFetch<T>(_url: string, _options?: RequestOptions): Promise<T> {
    let retries = 0;
    const maxRetries = this.config.networkOptimization.maxRetries;

    while (true) {
      try {
        // In production, this would be actual fetch
        // Simulating for now
        await this.simulateNetworkDelay();

        // Simulate response
        return {} as T;
      } catch (error) {
        if (!this.config.networkOptimization.retryFailed || retries >= maxRetries) {
          throw error;
        }
        retries++;
        await this.delay(Math.pow(2, retries) * 100); // Exponential backoff
      }
    }
  }

  // ============================================================================
  // Image Optimization
  // ============================================================================

  /**
   * Get optimized image URL
   */
  getOptimizedImageUrl(originalUrl: string, options?: ImageOptions): string {
    if (!this.config.imageOptimization.enabled) {
      return originalUrl;
    }

    const params: string[] = [];

    // Width
    const width = options?.width ?? this.config.imageOptimization.maxWidth;
    params.push(`w=${width}`);

    // Quality
    const quality = options?.quality ?? this.config.imageOptimization.quality;
    params.push(`q=${quality}`);

    // Format
    if (this.config.imageOptimization.useWebP) {
      params.push('f=webp');
    }

    // In production, this would transform the URL for an image CDN
    // For now, return with query params
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}${params.join('&')}`;
  }

  /**
   * Preload image
   */
  preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Preload images in batch
   */
  async preloadImages(urls: string[]): Promise<void> {
    const optimizedUrls = urls.map((url) => this.getOptimizedImageUrl(url));
    await Promise.all(optimizedUrls.map((url) => this.preloadImage(url)));
  }

  // ============================================================================
  // Lazy Loading
  // ============================================================================

  /**
   * Create intersection observer for lazy loading
   */
  createLazyLoadObserver(_callback: (entries: IntersectionObserverEntry[]) => void): IntersectionObserver | undefined {
    if (!this.config.lazyLoading?.enabled) {
      return undefined;
    }

    const options: IntersectionObserverInit = {
      threshold: this.config.lazyLoading.threshold ?? 0.1,
      rootMargin: this.config.lazyLoading.rootMargin ?? '100px',
    };

    // In a browser environment, this would create a real observer
    // For now, return a mock
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {},
      root: null,
      rootMargin: options.rootMargin ?? '',
      thresholds: [options.threshold as number],
      takeRecords: () => [],
    };
  }

  /**
   * Check if element should load
   */
  shouldLoad(priority: ResourcePriority): boolean {
    // Critical always loads
    if (priority === 'critical') return true;

    // Check network conditions
    if (this.networkStatus.saveData && priority === 'low') {
      return false;
    }

    if (this.networkStatus.type === 'slow' && priority === 'idle') {
      return false;
    }

    return true;
  }

  // ============================================================================
  // Animation Management
  // ============================================================================

  /**
   * Get animation configuration
   */
  getAnimationConfig(): AnimationConfig {
    const settings = this.config.animationSettings;

    if (!settings.enabled || settings.reduceMotion) {
      return {
        duration: 0,
        easing: 'linear',
        enabled: false,
      };
    }

    return {
      duration: settings.defaultDuration,
      easing: settings.defaultEasing,
      enabled: true,
    };
  }

  /**
   * Check if animations should be reduced
   */
  shouldReduceMotion(): boolean {
    return (
      this.config.animationSettings.reduceMotion ||
      this.networkStatus.saveData ||
      this.getMemoryStatus().status === 'critical'
    );
  }

  // ============================================================================
  // Memory Management
  // ============================================================================

  /**
   * Get current memory status
   */
  getMemoryStatus(): MemoryStatus {
    // In production, this would query actual memory usage
    const used = this.metrics.memoryUsage;
    const total = 256; // Simulated total
    const percentage = (used / total) * 100;

    let status: MemoryStatus['status'] = 'normal';
    if (used >= this.config.memoryManagement.criticalThreshold) {
      status = 'critical';
    } else if (used >= this.config.memoryManagement.warningThreshold) {
      status = 'warning';
    }

    return { used, total, percentage, status };
  }

  /**
   * Request memory cleanup
   */
  requestCleanup(aggressive: boolean = false): void {
    // Clear caches
    this.clearCache();

    // In production, would also:
    // - Clear image caches
    // - Dispose of unused resources
    // - Request garbage collection if available

    if (aggressive) {
      // More aggressive cleanup for critical situations
      this.pendingRequests.clear();
    }

    // Emit event
    if (this.onPerformanceWarning) {
      this.onPerformanceWarning({
        type: 'memory_cleanup',
        message: 'Memory cleanup performed',
        severity: aggressive ? 'warning' : 'info',
      });
    }
  }

  /**
   * Start memory cleanup interval
   */
  private startMemoryCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const status = this.getMemoryStatus();

      if (status.status === 'critical') {
        this.requestCleanup(true);
      } else if (status.status === 'warning') {
        this.requestCleanup(false);
      }
    }, this.config.memoryManagement.cleanupInterval);
  }

  // ============================================================================
  // Offline Support
  // ============================================================================

  /**
   * Check if offline mode is available
   */
  isOfflineAvailable(): boolean {
    return this.config.offlineSettings.enabled;
  }

  /**
   * Get offline status
   */
  getOfflineStatus(): OfflineStatus {
    return {
      enabled: this.config.offlineSettings.enabled,
      online: this.networkStatus.online,
      lastSync: new Date(), // Would be tracked in production
      pendingSync: 0, // Would track pending changes
      storageUsed: 0, // Would track actual storage
      storageLimit: this.config.offlineSettings.maxStorage,
    };
  }

  /**
   * Queue data for offline sync
   */
  queueForSync(key: string, data: unknown): void {
    if (!this.config.offlineSettings.enabled) return;

    // In production, would store in IndexedDB
    this.setInCache(`sync_${key}`, { data, queuedAt: new Date() });
  }

  /**
   * Sync offline data
   */
  async syncOfflineData(): Promise<SyncResult> {
    if (!this.config.offlineSettings.enabled || !this.networkStatus.online) {
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    // In production, would process queued items
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  // ============================================================================
  // Performance Monitoring
  // ============================================================================

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance snapshot
   */
  getSnapshot(): PerformanceSnapshot {
    return {
      timestamp: new Date(),
      metrics: this.getMetrics(),
      networkStatus: { ...this.networkStatus },
      memoryStatus: this.getMemoryStatus(),
    };
  }

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number): void {
    (this.metrics as unknown as Record<string, unknown>)[name] = value;
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // In production, would set up Performance Observer
    // and monitor Core Web Vitals
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private detectNetworkConditions(): void {
    // In production, would use Network Information API
    // For now, default to good conditions
    this.networkStatus = {
      online: true,
      type: 'wifi',
      effectiveBandwidth: 10,
      latency: 50,
      saveData: false,
    };
  }

  private optimizeForDevice(device: DeviceInfo): void {
    // Adjust settings based on device capabilities
    if (device.lowBandwidth) {
      this.config.imageOptimization.quality = 60;
      this.config.imageOptimization.maxWidth = 512;
      this.networkStatus.saveData = true;
    }

    if (!device.supportsHaptic) {
      // Disable haptic-related features
    }

    // Reduce animations on lower-end devices
    if (device.networkType === '2g' || device.networkType === '3g') {
      this.config.animationSettings.enabled = false;
    }
  }

  // Simple in-memory cache for demo
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  private getFromCache<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
    return undefined;
  }

  private setInCache(key: string, data: unknown): void {
    const duration = this.config.networkOptimization.cacheDuration * 1000;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + duration,
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private async simulateNetworkDelay(): Promise<void> {
    const delay = this.networkStatus.latency + Math.random() * 50;
    await this.delay(delay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Request options
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  priority?: ResourcePriority;
  cacheKey?: string;
  skipCache?: boolean;
  timeout?: number;
}

/**
 * Image options
 */
export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Animation config result
 */
export interface AnimationConfig {
  duration: number;
  easing: string;
  enabled: boolean;
}

/**
 * Offline status
 */
export interface OfflineStatus {
  enabled: boolean;
  online: boolean;
  lastSync: Date;
  pendingSync: number;
  storageUsed: number;
  storageLimit: number;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Performance warning
 */
export interface PerformanceWarning {
  type: 'memory_cleanup' | 'slow_network' | 'high_latency' | 'memory_critical';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Batched request internal type
 */
interface BatchedRequest {
  url: string;
  options?: RequestOptions;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a PerformanceManager
 */
export function createPerformanceManager(
  config?: Partial<PerformanceManagerConfig>
): PerformanceManager {
  return new PerformanceManager(config);
}

/**
 * Get default performance configuration
 */
export function getDefaultPerformanceConfig(): Required<PerformanceManagerConfig> {
  return { ...DEFAULT_CONFIG };
}
