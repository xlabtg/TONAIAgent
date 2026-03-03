/**
 * TONAIAgent - Global Infrastructure & Edge Deployment Type Definitions
 *
 * Core types for the Global Infrastructure & Edge Deployment layer.
 * Supports global edge runtime, geo-distributed orchestration, edge intelligence,
 * hybrid cloud deployment, compliance-aware regional routing, and cost optimization.
 *
 * Issue #100: Global Infrastructure & Edge Deployment
 */

// ============================================================================
// Region & Geo Types
// ============================================================================

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'ton_native' | 'on_prem';

export type RegionCode =
  | 'us-east-1'
  | 'us-west-2'
  | 'eu-west-1'
  | 'eu-central-1'
  | 'ap-southeast-1'
  | 'ap-northeast-1'
  | 'me-south-1'
  | 'sa-east-1'
  | 'af-south-1'
  | 'ap-south-1';

export type GeographicZone =
  | 'north_america'
  | 'europe'
  | 'asia_pacific'
  | 'middle_east'
  | 'latin_america'
  | 'africa';

export type NodeStatus =
  | 'provisioning'
  | 'active'
  | 'degraded'
  | 'maintenance'
  | 'offline';

export type DeploymentModel =
  | 'public_cloud'
  | 'private_cloud'
  | 'on_prem'
  | 'hybrid'
  | 'decentralized';

// ============================================================================
// Edge Node Types
// ============================================================================

export interface EdgeNode {
  id: string;
  name: string;
  region: RegionCode;
  zone: GeographicZone;
  provider: CloudProvider;
  deploymentModel: DeploymentModel;
  status: NodeStatus;
  endpoint: string;
  latencyMs: number;                // Current measured latency (ms)
  capacityUnits: number;            // Available compute units
  usedCapacityUnits: number;        // Currently used compute units
  activeAgents: number;
  maxAgents: number;
  complianceZones: string[];        // E.g. ['gdpr', 'mica', 'fatf']
  dataResidencyRegions: string[];   // Allowed data storage regions (ISO 3166)
  featureFlags: EdgeNodeFeatures;
  healthScore: number;              // 0–100
  lastHeartbeatAt: Date;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface EdgeNodeFeatures {
  aiInference: boolean;
  streamingData: boolean;
  localCaching: boolean;
  onChainListening: boolean;
  complianceFiltering: boolean;
  edgeScheduler: boolean;
}

export interface EdgeNodeMetrics {
  nodeId: string;
  timestamp: Date;
  cpuPercent: number;
  memoryPercent: number;
  networkInKbps: number;
  networkOutKbps: number;
  requestsPerSecond: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;               // 0.0 – 1.0
  activeAgents: number;
  jobsExecutedLastMinute: number;
}

// ============================================================================
// Geo-Routing & Orchestration Types
// ============================================================================

export type RoutingStrategy =
  | 'latency_optimized'
  | 'cost_optimized'
  | 'compliance_first'
  | 'availability_first'
  | 'round_robin'
  | 'geo_pinned';

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;               // Lower = higher priority
  conditions: RoutingCondition[];
  targetRegions: RegionCode[];
  fallbackRegions: RegionCode[];
  strategy: RoutingStrategy;
  enabled: boolean;
  createdAt: Date;
}

export interface RoutingCondition {
  field: 'tenant_id' | 'user_country' | 'data_classification' | 'compliance_zone' | 'agent_type';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains';
  value: string | string[];
}

export interface AgentPlacementRequest {
  agentId: string;
  tenantId: string;
  userId?: string;
  userCountry?: string;           // ISO 3166-1 alpha-2
  complianceRequirements?: string[];
  dataResidencyRequirements?: string[];
  preferredRegions?: RegionCode[];
  excludedRegions?: RegionCode[];
  minHealthScore?: number;
  maxLatencyMs?: number;
}

export interface AgentPlacementResult {
  agentId: string;
  assignedNodeId: string;
  assignedRegion: RegionCode;
  assignedZone: GeographicZone;
  estimatedLatencyMs: number;
  placementReason: string;
  failoverNodeIds: string[];
  complianceVerified: boolean;
  placedAt: Date;
}

// ============================================================================
// Edge Intelligence & Data Layer
// ============================================================================

export type InferenceModel =
  | 'risk_scoring'
  | 'signal_processing'
  | 'anomaly_detection'
  | 'market_prediction'
  | 'sentiment_analysis';

export interface EdgeInferenceTask {
  id: string;
  model: InferenceModel;
  nodeId: string;
  tenantId: string;
  agentId?: string;
  inputSize: number;              // bytes
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  latencyMs?: number;
  error?: string;
}

export interface EdgeCacheConfig {
  nodeId: string;
  maxSizeMb: number;
  ttlSeconds: number;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
  enableCompression: boolean;
  enableEncryption: boolean;
}

export interface StreamingDataConfig {
  nodeId: string;
  sources: StreamingDataSource[];
  bufferSizeMs: number;
  maxThroughputKbps: number;
  enableBackpressure: boolean;
}

export interface StreamingDataSource {
  id: string;
  type: 'ton_blockchain' | 'market_feed' | 'news_feed' | 'social_signals' | 'custom';
  endpoint: string;
  refreshIntervalMs: number;
  enabled: boolean;
}

// ============================================================================
// Global Scheduler Extension Types
// ============================================================================

export type GlobalJobTrigger =
  | 'cron'
  | 'event'
  | 'market_condition'
  | 'on_chain'
  | 'timezone_aware'
  | 'cross_region_sync';

export interface GlobalScheduledJob {
  id: string;
  name: string;
  agentId: string;
  tenantId: string;
  trigger: GlobalJobTrigger;
  cronExpression?: string;
  timezone?: string;              // IANA timezone (e.g. "America/New_York")
  targetRegions: RegionCode[];    // Which regions should run this job
  exclusiveExecution: boolean;    // Only one region executes at a time
  status: 'active' | 'paused' | 'terminated';
  lastExecutedRegion?: RegionCode;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  executionCount: number;
  failureCount: number;
  createdAt: Date;
}

export interface GlobalJobExecution {
  id: string;
  jobId: string;
  nodeId: string;
  region: RegionCode;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'success' | 'failed' | 'skipped';
  durationMs?: number;
  error?: string;
}

// ============================================================================
// Compliance-Aware Infrastructure Types
// ============================================================================

export type ComplianceFramework =
  | 'gdpr'          // EU General Data Protection Regulation
  | 'mica'          // EU Markets in Crypto-Assets Regulation
  | 'fatf'          // Financial Action Task Force
  | 'ccpa'          // California Consumer Privacy Act
  | 'pdpa'          // Personal Data Protection Act (Singapore/Thailand)
  | 'lgpd'          // Lei Geral de Proteção de Dados (Brazil)
  | 'pipeda'        // Canada
  | 'popia'         // South Africa
  | 'custom';

export interface RegionalComplianceProfile {
  region: RegionCode;
  zone: GeographicZone;
  applicableFrameworks: ComplianceFramework[];
  dataResidencyRequired: boolean;
  allowedDataTypes: string[];
  restrictedDataTypes: string[];
  encryptionRequired: boolean;
  auditLogRetentionDays: number;
  reportingRequirements: string[];
  lastUpdated: Date;
}

export interface ComplianceCheckRequest {
  tenantId: string;
  agentId?: string;
  targetRegion: RegionCode;
  dataClassification: string[];
  operationType: 'read' | 'write' | 'process' | 'transfer';
  userCountry?: string;
}

export interface ComplianceCheckResult {
  allowed: boolean;
  region: RegionCode;
  violatedFrameworks: ComplianceFramework[];
  requiredMitigations: string[];
  alternativeRegions: RegionCode[];
  checkedAt: Date;
}

// ============================================================================
// Hybrid Cloud Deployment Types
// ============================================================================

export interface CloudProviderConfig {
  provider: CloudProvider;
  regions: RegionCode[];
  credentials?: Record<string, string>;   // Encrypted/reference only
  features: string[];
  enabled: boolean;
  priority: number;                       // For failover ordering
  costPerComputeUnit: number;             // USD per unit per hour
}

export interface HybridDeploymentConfig {
  providers: CloudProviderConfig[];
  defaultProvider: CloudProvider;
  failoverEnabled: boolean;
  autoBalancing: boolean;
  costOptimizationEnabled: boolean;
  decentralizedNodesEnabled: boolean;
  tonNativeNodesEnabled: boolean;
}

// ============================================================================
// Cost Optimization Engine Types
// ============================================================================

export interface ComputePricing {
  nodeId: string;
  provider: CloudProvider;
  region: RegionCode;
  pricePerUnitHour: number;               // USD
  spotPricePerUnitHour?: number;          // USD (if spot/preemptible available)
  reservedPricePerUnitHour?: number;      // USD (if reserved capacity available)
  currency: 'USD' | 'EUR' | 'TON';
  updatedAt: Date;
}

export interface CostAllocation {
  tenantId: string;
  period: { start: Date; end: Date };
  computeUnitsUsed: number;
  totalCostUsd: number;
  costByRegion: Record<RegionCode, number>;
  costByProvider: Partial<Record<CloudProvider, number>>;
  savingsFromOptimization: number;
}

export interface CostOptimizationRecommendation {
  id: string;
  type: 'spot_migration' | 'region_shift' | 'scale_down' | 'reserved_capacity' | 'workload_timing';
  description: string;
  estimatedSavingsUsd: number;
  estimatedSavingsPercent: number;
  affectedNodes: string[];
  implementationRisk: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
  createdAt: Date;
}

// ============================================================================
// Global Monitoring & Observability Types
// ============================================================================

export interface GlobalHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical' | 'partial_outage';
  totalNodes: number;
  activeNodes: number;
  degradedNodes: number;
  offlineNodes: number;
  globalP95LatencyMs: number;
  globalUptimePercent: number;
  totalActiveAgents: number;
  regionStatus: Partial<Record<RegionCode, RegionHealthStatus>>;
  lastUpdated: Date;
}

export interface RegionHealthStatus {
  region: RegionCode;
  zone: GeographicZone;
  status: 'healthy' | 'degraded' | 'offline';
  nodeCount: number;
  activeNodeCount: number;
  p95LatencyMs: number;
  activeAgents: number;
  uptimePercent: number;
  lastCheckedAt: Date;
}

export interface GlobalMetricsSummary {
  timestamp: Date;
  period: '1m' | '5m' | '15m' | '1h' | '24h';
  totalRequests: number;
  totalJobsExecuted: number;
  globalErrorRate: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  byRegion: Partial<Record<RegionCode, RegionMetrics>>;
}

export interface RegionMetrics {
  region: RegionCode;
  requests: number;
  jobsExecuted: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  activeAgents: number;
  computeUnitsUsed: number;
}

// ============================================================================
// Infrastructure Event Types
// ============================================================================

export type GlobalInfraEventType =
  | 'node_online'
  | 'node_offline'
  | 'node_degraded'
  | 'failover_triggered'
  | 'agent_migrated'
  | 'region_overloaded'
  | 'compliance_violation'
  | 'cost_threshold_exceeded'
  | 'scaling_event'
  | 'health_check_failed';

export interface GlobalInfraEvent {
  id: string;
  timestamp: Date;
  type: GlobalInfraEventType;
  nodeId?: string;
  region?: RegionCode;
  tenantId?: string;
  agentId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data: Record<string, unknown>;
}

export type GlobalInfraEventCallback = (event: GlobalInfraEvent) => void;

// ============================================================================
// Global Infrastructure Configuration
// ============================================================================

export interface GlobalInfrastructureConfig {
  enabledRegions: RegionCode[];
  defaultRegion: RegionCode;
  defaultRoutingStrategy: RoutingStrategy;
  hybrid: HybridDeploymentConfig;
  costOptimization: {
    enabled: boolean;
    autoApplyRecommendations: boolean;
    maxCostIncreasePercent: number;
    targetSavingsPercent: number;
  };
  monitoring: {
    healthCheckIntervalMs: number;
    metricsAggregationIntervalMs: number;
    latencyAlertThresholdMs: number;
    uptimeAlertThresholdPercent: number;
  };
  compliance: {
    enforceDataResidency: boolean;
    defaultFrameworks: ComplianceFramework[];
    blockNonCompliantPlacements: boolean;
  };
  edgeIntelligence: {
    enableLocalInference: boolean;
    enableStreamingData: boolean;
    enableEdgeCaching: boolean;
    cacheTtlSeconds: number;
  };
  scheduler: {
    enableGlobalCron: boolean;
    enableTimezoneAwareness: boolean;
    enableCrossRegionSync: boolean;
    leaderElectionIntervalMs: number;
  };
}
