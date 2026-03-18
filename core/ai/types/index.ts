/**
 * TONAIAgent - AI Layer Type Definitions
 *
 * Core types for the multi-provider AI abstraction layer.
 * Supports Groq (primary), Anthropic, OpenAI, Google, xAI, and OpenRouter.
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CompletionRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  user?: string;
  metadata?: Record<string, unknown>;
}

export interface CompletionResponse {
  id: string;
  provider: ProviderType;
  model: string;
  choices: CompletionChoice[];
  usage: UsageInfo;
  latencyMs: number;
  cached?: boolean;
  finishReason: FinishReason;
}

export interface CompletionChoice {
  index: number;
  message: Message;
  finishReason: FinishReason;
}

export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamChunk {
  id: string;
  provider: ProviderType;
  model: string;
  delta: {
    role?: MessageRole;
    content?: string;
    toolCalls?: Partial<ToolCall>[];
  };
  finishReason?: FinishReason;
  usage?: Partial<UsageInfo>;
}

export type StreamCallback = (chunk: StreamChunk) => void;

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderType = 'groq' | 'anthropic' | 'openai' | 'google' | 'xai' | 'openrouter' | 'local';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  enabled?: boolean;
  priority?: number;
  rateLimit?: RateLimitConfig;
  customHeaders?: Record<string, string>;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay?: number;
}

export interface ProviderStatus {
  type: ProviderType;
  available: boolean;
  latencyMs?: number;
  errorRate?: number;
  lastError?: string;
  lastChecked: Date;
  circuitState: CircuitState;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

// ============================================================================
// Model Types
// ============================================================================

export interface ModelInfo {
  id: string;
  provider: ProviderType;
  name: string;
  description?: string;
  contextWindow: number;
  maxOutputTokens?: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  supportedFeatures: ModelFeature[];
  capabilities: ModelCapabilities;
  recommended?: boolean;
  deprecated?: boolean;
}

export type ModelFeature =
  | 'chat'
  | 'completion'
  | 'streaming'
  | 'tool_use'
  | 'vision'
  | 'json_mode'
  | 'code'
  | 'reasoning';

export interface ModelCapabilities {
  speed: 'fast' | 'medium' | 'slow';
  reasoning: 'basic' | 'standard' | 'advanced' | 'expert';
  coding: 'basic' | 'standard' | 'advanced' | 'expert';
  costTier: 'free' | 'low' | 'medium' | 'high' | 'premium';
}

// ============================================================================
// Routing Types
// ============================================================================

export type RoutingMode = 'fast' | 'balanced' | 'quality' | 'cost_optimized' | 'custom';

export interface RoutingConfig {
  mode: RoutingMode;
  primaryProvider?: ProviderType;
  fallbackChain?: ProviderType[];
  taskTypeRouting?: TaskTypeRouting;
  maxLatencyMs?: number;
  maxCostPerRequest?: number;
  preferredModels?: string[];
  excludeModels?: string[];
  requireFeatures?: ModelFeature[];
}

export interface TaskTypeRouting {
  [taskType: string]: {
    preferredProvider?: ProviderType;
    preferredModel?: string;
    fallback?: ProviderType[];
  };
}

export type TaskType =
  | 'general'
  | 'code_generation'
  | 'code_analysis'
  | 'reasoning'
  | 'tool_use'
  | 'conversation'
  | 'summarization'
  | 'translation'
  | 'classification'
  | 'extraction';

export interface RoutingDecision {
  provider: ProviderType;
  model: string;
  reason: string;
  alternatives: Array<{ provider: ProviderType; model: string; score: number }>;
  estimatedLatencyMs: number;
  estimatedCostUsd: number;
}

// ============================================================================
// Memory Types
// ============================================================================

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  createdAt: Date;
  accessedAt: Date;
  importance: number;
  ttlSeconds?: number;
}

export type MemoryType = 'short_term' | 'long_term' | 'episodic' | 'semantic' | 'preference';

export interface MemoryMetadata {
  source?: string;
  tags?: string[];
  relatedIds?: string[];
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface MemoryQuery {
  agentId: string;
  query?: string;
  types?: MemoryType[];
  limit?: number;
  minImportance?: number;
  tags?: string[];
  timeRange?: {
    start?: Date;
    end?: Date;
  };
}

// ============================================================================
// Safety Types
// ============================================================================

export interface SafetyConfig {
  enabled: boolean;
  inputValidation: InputValidationConfig;
  outputValidation: OutputValidationConfig;
  contentFiltering: ContentFilterConfig;
  riskThresholds: RiskThresholds;
}

export interface InputValidationConfig {
  maxLength: number;
  detectPromptInjection: boolean;
  detectJailbreak: boolean;
  sanitizeHtml: boolean;
  blockPatterns?: RegExp[];
}

export interface OutputValidationConfig {
  maxLength: number;
  detectHallucination: boolean;
  detectPii: boolean;
  redactSensitive: boolean;
  requireConfidence?: number;
}

export interface ContentFilterConfig {
  categories: ContentCategory[];
  thresholds: {
    [K in ContentCategory]?: number;
  };
}

export type ContentCategory =
  | 'hate'
  | 'harassment'
  | 'violence'
  | 'sexual'
  | 'self_harm'
  | 'dangerous'
  | 'financial_advice'
  | 'medical_advice'
  | 'legal_advice';

export interface RiskThresholds {
  maxTransactionValueTon: number;
  maxDailyTransactionsTon: number;
  requireConfirmationAbove: number;
  requireMultiSigAbove: number;
}

export interface SafetyCheckResult {
  passed: boolean;
  category?: ContentCategory;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block' | 'escalate';
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Orchestration Types
// ============================================================================

export interface AgentConfig {
  id: string;
  name: string;
  userId: string;
  systemPrompt: string;
  routingConfig: RoutingConfig;
  safetyConfig: SafetyConfig;
  memoryConfig: MemoryConfig;
  tools: ToolDefinition[];
  maxIterations: number;
  timeoutMs: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryConfig {
  enabled: boolean;
  shortTermCapacity: number;
  longTermEnabled: boolean;
  vectorSearch: boolean;
  contextWindowRatio: number;
}

export interface ExecutionContext {
  agentId: string;
  sessionId: string;
  userId: string;
  requestId: string;
  startTime: Date;
  parentContext?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  response: CompletionResponse;
  toolResults?: ToolResult[];
  memoryUpdates?: MemoryEntry[];
  safetyChecks: SafetyCheckResult[];
  metrics: ExecutionMetrics;
  error?: AIError;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  success: boolean;
  latencyMs: number;
  error?: string;
}

export interface ExecutionMetrics {
  totalLatencyMs: number;
  llmLatencyMs: number;
  toolLatencyMs: number;
  memoryLatencyMs: number;
  tokenUsage: UsageInfo;
  iterationCount: number;
  retryCount: number;
  provider: ProviderType;
  model: string;
}

// ============================================================================
// Observability Types
// ============================================================================

export interface AIEvent {
  id: string;
  timestamp: Date;
  type: AIEventType;
  agentId?: string;
  userId?: string;
  sessionId?: string;
  provider?: ProviderType;
  model?: string;
  latencyMs?: number;
  tokenUsage?: UsageInfo;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type AIEventType =
  | 'request_started'
  | 'request_completed'
  | 'request_failed'
  | 'provider_fallback'
  | 'circuit_opened'
  | 'circuit_closed'
  | 'rate_limit_hit'
  | 'safety_violation'
  | 'tool_executed'
  | 'memory_accessed'
  | 'routing_decision';

export interface AIMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  providerStats: Record<ProviderType, ProviderMetrics>;
  periodStart: Date;
  periodEnd: Date;
}

export interface ProviderMetrics {
  requestCount: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
  circuitState: CircuitState;
  errorRate: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly provider?: ProviderType,
    public readonly retryable: boolean = false,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export type AIErrorCode =
  | 'PROVIDER_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_ERROR'
  | 'TIMEOUT'
  | 'CIRCUIT_OPEN'
  | 'NO_AVAILABLE_PROVIDERS'
  | 'SAFETY_VIOLATION'
  | 'TOOL_EXECUTION_ERROR'
  | 'MEMORY_ERROR'
  | 'ROUTING_ERROR'
  | 'UNKNOWN_ERROR';

// ============================================================================
// Configuration Types
// ============================================================================

export interface AILayerConfig {
  providers: Record<ProviderType, ProviderConfig>;
  routing: RoutingConfig;
  safety: SafetyConfig;
  observability: ObservabilityConfig;
  cache?: CacheConfig;
  defaults: DefaultConfig;
}

export interface ObservabilityConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  eventCallback?: (event: AIEvent) => void;
}

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
  strategy: 'lru' | 'lfu';
}

export interface DefaultConfig {
  temperature: number;
  maxTokens: number;
  timeout: number;
  maxRetries: number;
}
