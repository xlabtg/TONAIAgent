/**
 * TONAIAgent - AIFOS Interoperability Layer
 *
 * Extends the OS to the broader financial ecosystem.
 * Extends IPLS and global routing capabilities.
 *
 * Provides:
 * - Cross-chain abstraction
 * - External API integration
 * - Protocol-to-protocol compatibility
 *
 * This is Pillar 6 of AIFOS.
 */

import {
  InteropChannel,
  ExternalAPIIntegration,
  ProtocolBridge,
  InteropProtocol,
  InteropLayerConfig,
  AIFOSEvent,
  AIFOSEventCallback,
  AIFOSEventType,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_INTEROP_CONFIG: InteropLayerConfig = {
  enableCrossChainAbstraction: true,
  enableExternalAPIIntegration: true,
  enableProtocolBridges: true,
  maxChannelLatencyMs: 5000,
  messageRetryMax: 3,
  messageTimeoutMs: 30_000,
  enableInteropAuditLog: true,
};

// ============================================================================
// Interoperability Layer Interface
// ============================================================================

export interface InteroperabilityLayer {
  readonly config: InteropLayerConfig;

  // Interop channels
  openChannel(params: OpenChannelParams): InteropChannel;
  getChannel(id: string): InteropChannel | undefined;
  listChannels(filters?: ChannelFilters): InteropChannel[];
  closeChannel(id: string, reason: string): void;
  testChannelHealth(id: string): ChannelHealthResult;

  // External API integrations
  registerExternalAPI(params: RegisterAPIParams): ExternalAPIIntegration;
  getExternalAPI(id: string): ExternalAPIIntegration | undefined;
  listExternalAPIs(filters?: APIFilters): ExternalAPIIntegration[];
  updateAPIStatus(id: string, status: ExternalAPIIntegration['healthStatus']): void;
  callExternalAPI(apiId: string, endpoint: string, payload: Record<string, unknown>): ExternalAPICallResult;

  // Protocol bridges
  registerProtocolBridge(params: RegisterBridgeParams): ProtocolBridge;
  getProtocolBridge(id: string): ProtocolBridge | undefined;
  listProtocolBridges(filters?: BridgeFilters): ProtocolBridge[];
  translateMessage(params: TranslateMessageParams): TranslateMessageResult;

  // Cross-chain abstraction
  routeCrossChain(params: CrossChainRouteParams): CrossChainRouteResult;
  getSupportedChains(): string[];
  getChainConnectivity(chain: string): ChainConnectivityReport;

  // Interop metrics
  getInteropSummary(): InteropSummary;

  // Events
  onEvent(callback: AIFOSEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface OpenChannelParams {
  name: string;
  protocol: InteropProtocol;
  sourceEndpoint: string;
  destinationEndpoint: string;
  sourceChain?: string;
  destinationChain?: string;
  direction?: InteropChannel['direction'];
  encryptionEnabled?: boolean;
  authMethod?: InteropChannel['authMethod'];
}

export interface ChannelFilters {
  protocol?: InteropProtocol;
  status?: InteropChannel['status'];
  sourceChain?: string;
  destinationChain?: string;
  direction?: InteropChannel['direction'];
}

export interface ChannelHealthResult {
  channelId: string;
  healthy: boolean;
  latencyMs: number;
  errorRate: number;
  lastSuccessAt?: Date;
  checkedAt: Date;
}

export interface RegisterAPIParams {
  name: string;
  provider: string;
  integrationCategory: ExternalAPIIntegration['integrationCategory'];
  baseUrl: string;
  version: string;
  authMethod: string;
  rateLimitPerMinute?: number;
}

export interface APIFilters {
  integrationCategory?: ExternalAPIIntegration['integrationCategory'];
  healthStatus?: ExternalAPIIntegration['healthStatus'];
  provider?: string;
}

export interface ExternalAPICallResult {
  apiId: string;
  endpoint: string;
  success: boolean;
  statusCode?: number;
  responseData?: unknown;
  latencyMs: number;
  calledAt: Date;
}

export interface RegisterBridgeParams {
  bridgeName: string;
  sourceProtocol: string;
  targetProtocol: string;
  supportedAssets?: string[];
  supportedChains?: string[];
  translationCapabilities?: string[];
  securityModel?: ProtocolBridge['securityModel'];
}

export interface BridgeFilters {
  sourceProtocol?: string;
  targetProtocol?: string;
  status?: ProtocolBridge['status'];
}

export interface TranslateMessageParams {
  bridgeId: string;
  message: Record<string, unknown>;
  sourceFormat: string;
  targetFormat: string;
}

export interface TranslateMessageResult {
  success: boolean;
  translatedMessage?: Record<string, unknown>;
  error?: string;
  bridgeId: string;
  translatedAt: Date;
}

export interface CrossChainRouteParams {
  sourceChain: string;
  destinationChain: string;
  asset: string;
  amount: number;
  priority?: 'speed' | 'cost' | 'security';
}

export interface CrossChainRouteResult {
  success: boolean;
  routeId: string;
  hops: RouteHop[];
  estimatedFeeUSD: number;
  estimatedLatencyMs: number;
  selectedChannels: string[];
  computedAt: Date;
}

export interface RouteHop {
  fromChain: string;
  toChain: string;
  channelId: string;
  protocol: InteropProtocol;
  estimatedFeeUSD: number;
  estimatedLatencyMs: number;
}

export interface ChainConnectivityReport {
  chain: string;
  connectedChains: string[];
  activeChannels: number;
  protocolBridges: number;
  averageLatencyMs: number;
  healthStatus: 'healthy' | 'degraded' | 'offline';
  checkedAt: Date;
}

export interface InteropSummary {
  totalChannels: number;
  activeChannels: number;
  registeredAPIs: number;
  healthyAPIs: number;
  protocolBridges: number;
  activeProtocolBridges: number;
  supportedChains: number;
  totalCrossChainRoutes: number;
}

// ============================================================================
// Default Interoperability Layer Implementation
// ============================================================================

export class DefaultInteroperabilityLayer implements InteroperabilityLayer {
  readonly config: InteropLayerConfig;

  private readonly channels = new Map<string, InteropChannel>();
  private readonly externalAPIs = new Map<string, ExternalAPIIntegration>();
  private readonly protocolBridges = new Map<string, ProtocolBridge>();
  private readonly eventCallbacks: AIFOSEventCallback[] = [];
  private readonly crossChainRoutes: CrossChainRouteResult[] = [];

  private channelCounter = 0;
  private apiCounter = 0;
  private bridgeCounter = 0;
  private routeCounter = 0;

  constructor(config?: Partial<InteropLayerConfig>) {
    this.config = { ...DEFAULT_INTEROP_CONFIG, ...config };
    this.initializeBuiltinChannels();
  }

  openChannel(params: OpenChannelParams): InteropChannel {
    const id = `channel-${++this.channelCounter}-${Date.now()}`;

    const channel: InteropChannel = {
      id,
      name: params.name,
      protocol: params.protocol,
      sourceEndpoint: params.sourceEndpoint,
      destinationEndpoint: params.destinationEndpoint,
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      direction: params.direction ?? 'bidirectional',
      encryptionEnabled: params.encryptionEnabled ?? true,
      authMethod: params.authMethod ?? 'api_key',
      status: 'active',
      latencyMs: 50,
      throughputPerSecond: 1000,
      openedAt: new Date(),
    };

    this.channels.set(id, channel);

    this.emitEvent('interop_channel_opened', 'info', 'Interoperability',
      `Channel opened: ${params.name} (${params.protocol})`, {
        channelId: id,
        protocol: params.protocol,
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
      });

    return { ...channel };
  }

  getChannel(id: string): InteropChannel | undefined {
    const c = this.channels.get(id);
    return c ? { ...c } : undefined;
  }

  listChannels(filters?: ChannelFilters): InteropChannel[] {
    let list = Array.from(this.channels.values());

    if (filters?.protocol) list = list.filter(c => c.protocol === filters.protocol);
    if (filters?.status) list = list.filter(c => c.status === filters.status);
    if (filters?.sourceChain) list = list.filter(c => c.sourceChain === filters.sourceChain);
    if (filters?.destinationChain) list = list.filter(c => c.destinationChain === filters.destinationChain);
    if (filters?.direction) list = list.filter(c => c.direction === filters.direction);

    return list.map(c => ({ ...c }));
  }

  closeChannel(id: string, reason: string): void {
    const c = this.channels.get(id);
    if (!c) throw new Error(`Channel not found: ${id}`);

    this.channels.set(id, { ...c, status: 'offline' });
    this.emitEvent('interop_message_sent', 'info', 'Interoperability', `Channel closed: ${c.name} (${reason})`, {
      channelId: id,
      reason,
    });
  }

  testChannelHealth(id: string): ChannelHealthResult {
    const c = this.channels.get(id);
    if (!c) throw new Error(`Channel not found: ${id}`);

    const healthy = c.status === 'active';
    return {
      channelId: id,
      healthy,
      latencyMs: healthy ? c.latencyMs : 0,
      errorRate: c.status === 'degraded' ? 0.3 : c.status === 'offline' ? 1 : 0,
      lastSuccessAt: healthy ? new Date() : undefined,
      checkedAt: new Date(),
    };
  }

  registerExternalAPI(params: RegisterAPIParams): ExternalAPIIntegration {
    const id = `api-${++this.apiCounter}-${Date.now()}`;

    const api: ExternalAPIIntegration = {
      id,
      name: params.name,
      provider: params.provider,
      integrationCategory: params.integrationCategory,
      baseUrl: params.baseUrl,
      version: params.version,
      authMethod: params.authMethod,
      rateLimitPerMinute: params.rateLimitPerMinute ?? 100,
      healthStatus: 'healthy',
      lastHealthCheckAt: new Date(),
      registeredAt: new Date(),
    };

    this.externalAPIs.set(id, api);
    return { ...api };
  }

  getExternalAPI(id: string): ExternalAPIIntegration | undefined {
    const a = this.externalAPIs.get(id);
    return a ? { ...a } : undefined;
  }

  listExternalAPIs(filters?: APIFilters): ExternalAPIIntegration[] {
    let list = Array.from(this.externalAPIs.values());

    if (filters?.integrationCategory) list = list.filter(a => a.integrationCategory === filters.integrationCategory);
    if (filters?.healthStatus) list = list.filter(a => a.healthStatus === filters.healthStatus);
    if (filters?.provider) list = list.filter(a => a.provider === filters.provider);

    return list.map(a => ({ ...a }));
  }

  updateAPIStatus(id: string, status: ExternalAPIIntegration['healthStatus']): void {
    const a = this.externalAPIs.get(id);
    if (!a) throw new Error(`API not found: ${id}`);

    this.externalAPIs.set(id, { ...a, healthStatus: status, lastHealthCheckAt: new Date() });
  }

  callExternalAPI(apiId: string, endpoint: string, _payload: Record<string, unknown>): ExternalAPICallResult {
    const api = this.externalAPIs.get(apiId);
    const start = Date.now();

    if (!api || api.healthStatus === 'offline') {
      return {
        apiId,
        endpoint,
        success: false,
        latencyMs: Date.now() - start,
        calledAt: new Date(),
      };
    }

    return {
      apiId,
      endpoint,
      success: true,
      statusCode: 200,
      responseData: { acknowledged: true, apiId, endpoint },
      latencyMs: Date.now() - start,
      calledAt: new Date(),
    };
  }

  registerProtocolBridge(params: RegisterBridgeParams): ProtocolBridge {
    const id = `bridge-${++this.bridgeCounter}-${Date.now()}`;

    const bridge: ProtocolBridge = {
      id,
      bridgeName: params.bridgeName,
      sourceProtocol: params.sourceProtocol,
      targetProtocol: params.targetProtocol,
      supportedAssets: params.supportedAssets ?? [],
      supportedChains: params.supportedChains ?? [],
      translationCapabilities: params.translationCapabilities ?? [],
      securityModel: params.securityModel ?? 'multi_sig',
      auditStatus: 'unaudited',
      status: 'active',
      registeredAt: new Date(),
    };

    this.protocolBridges.set(id, bridge);
    return { ...bridge };
  }

  getProtocolBridge(id: string): ProtocolBridge | undefined {
    const b = this.protocolBridges.get(id);
    return b ? { ...b } : undefined;
  }

  listProtocolBridges(filters?: BridgeFilters): ProtocolBridge[] {
    let list = Array.from(this.protocolBridges.values());

    if (filters?.sourceProtocol) list = list.filter(b => b.sourceProtocol === filters.sourceProtocol);
    if (filters?.targetProtocol) list = list.filter(b => b.targetProtocol === filters.targetProtocol);
    if (filters?.status) list = list.filter(b => b.status === filters.status);

    return list.map(b => ({ ...b }));
  }

  translateMessage(params: TranslateMessageParams): TranslateMessageResult {
    const bridge = this.protocolBridges.get(params.bridgeId);

    if (!bridge || bridge.status !== 'active') {
      return {
        success: false,
        error: bridge ? `Bridge not active: ${bridge.status}` : `Bridge not found: ${params.bridgeId}`,
        bridgeId: params.bridgeId,
        translatedAt: new Date(),
      };
    }

    const hasCapability = bridge.translationCapabilities.includes(
      `${params.sourceFormat}_to_${params.targetFormat}`,
    );

    if (!hasCapability && bridge.translationCapabilities.length > 0) {
      return {
        success: false,
        error: `Translation not supported: ${params.sourceFormat} → ${params.targetFormat}`,
        bridgeId: params.bridgeId,
        translatedAt: new Date(),
      };
    }

    // Simulate translation (field mapping)
    const translated = { ...params.message, _translatedBy: bridge.bridgeName, _targetFormat: params.targetFormat };

    return {
      success: true,
      translatedMessage: translated,
      bridgeId: params.bridgeId,
      translatedAt: new Date(),
    };
  }

  routeCrossChain(params: CrossChainRouteParams): CrossChainRouteResult {
    const routeId = `route-${++this.routeCounter}-${Date.now()}`;

    // Find channels matching source/destination
    const relevantChannels = Array.from(this.channels.values()).filter(
      c => c.status === 'active' &&
        (c.sourceChain === params.sourceChain || c.destinationChain === params.destinationChain),
    );

    const hops: RouteHop[] = [];

    if (relevantChannels.length > 0) {
      const ch = relevantChannels[0];
      hops.push({
        fromChain: params.sourceChain,
        toChain: params.destinationChain,
        channelId: ch.id,
        protocol: ch.protocol,
        estimatedFeeUSD: params.amount * 0.001, // 0.1% fee
        estimatedLatencyMs: ch.latencyMs,
      });
    }

    const result: CrossChainRouteResult = {
      success: hops.length > 0,
      routeId,
      hops,
      estimatedFeeUSD: hops.reduce((sum, h) => sum + h.estimatedFeeUSD, 0),
      estimatedLatencyMs: hops.reduce((sum, h) => sum + h.estimatedLatencyMs, 0),
      selectedChannels: hops.map(h => h.channelId),
      computedAt: new Date(),
    };

    this.crossChainRoutes.push(result);

    if (result.success) {
      this.emitEvent('interop_message_sent', 'info', 'Interoperability',
        `Cross-chain route computed: ${params.sourceChain} → ${params.destinationChain}`, {
          routeId,
          hops: hops.length,
          estimatedFeeUSD: result.estimatedFeeUSD,
        });
    }

    return result;
  }

  getSupportedChains(): string[] {
    const chains = new Set<string>();
    for (const c of this.channels.values()) {
      if (c.sourceChain) chains.add(c.sourceChain);
      if (c.destinationChain) chains.add(c.destinationChain);
    }
    return Array.from(chains);
  }

  getChainConnectivity(chain: string): ChainConnectivityReport {
    const chainChannels = Array.from(this.channels.values()).filter(
      c => c.sourceChain === chain || c.destinationChain === chain,
    );
    const active = chainChannels.filter(c => c.status === 'active');
    const connectedChains = new Set<string>();

    for (const c of chainChannels) {
      if (c.sourceChain && c.sourceChain !== chain) connectedChains.add(c.sourceChain);
      if (c.destinationChain && c.destinationChain !== chain) connectedChains.add(c.destinationChain);
    }

    const bridgeCount = Array.from(this.protocolBridges.values()).filter(
      b => b.supportedChains.includes(chain),
    ).length;

    const avgLatency = active.length > 0
      ? active.reduce((sum, c) => sum + c.latencyMs, 0) / active.length
      : 0;

    return {
      chain,
      connectedChains: Array.from(connectedChains),
      activeChannels: active.length,
      protocolBridges: bridgeCount,
      averageLatencyMs: avgLatency,
      healthStatus: active.length > 0 ? 'healthy' : chainChannels.length > 0 ? 'degraded' : 'offline',
      checkedAt: new Date(),
    };
  }

  getInteropSummary(): InteropSummary {
    const channels = Array.from(this.channels.values());
    const apis = Array.from(this.externalAPIs.values());
    const bridges = Array.from(this.protocolBridges.values());

    return {
      totalChannels: channels.length,
      activeChannels: channels.filter(c => c.status === 'active').length,
      registeredAPIs: apis.length,
      healthyAPIs: apis.filter(a => a.healthStatus === 'healthy').length,
      protocolBridges: bridges.length,
      activeProtocolBridges: bridges.filter(b => b.status === 'active').length,
      supportedChains: this.getSupportedChains().length,
      totalCrossChainRoutes: this.crossChainRoutes.length,
    };
  }

  onEvent(callback: AIFOSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private initializeBuiltinChannels(): void {
    if (!this.config.enableCrossChainAbstraction) return;

    // TON ↔ Ethereum channel
    this.openChannel({
      name: 'TON-ETH Institutional',
      protocol: 'cross_chain_message',
      sourceEndpoint: 'ton://mainnet',
      destinationEndpoint: 'ethereum://mainnet',
      sourceChain: 'ton',
      destinationChain: 'ethereum',
      direction: 'bidirectional',
      encryptionEnabled: true,
    });

    // SWIFT gateway channel
    if (this.config.enableExternalAPIIntegration) {
      this.openChannel({
        name: 'SWIFT Gateway',
        protocol: 'swift_gateway',
        sourceEndpoint: 'aifos://internal',
        destinationEndpoint: 'swift://gpi',
        direction: 'bidirectional',
        encryptionEnabled: true,
        authMethod: 'mtls',
      });
    }

    // Register ISO 20022 bridge
    if (this.config.enableProtocolBridges) {
      this.registerProtocolBridge({
        bridgeName: 'ISO 20022 Bridge',
        sourceProtocol: 'on_chain_tx',
        targetProtocol: 'iso20022',
        supportedAssets: ['USDT', 'USDC', 'TON'],
        supportedChains: ['ton', 'ethereum'],
        translationCapabilities: ['on_chain_tx_to_iso20022', 'iso20022_to_on_chain_tx'],
        securityModel: 'multi_sig',
      });
    }
  }

  private emitEvent(
    type: AIFOSEventType,
    severity: AIFOSEvent['severity'],
    source: string,
    message: string,
    data: Record<string, unknown>,
  ): void {
    const event: AIFOSEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createInteroperabilityLayer(config?: Partial<InteropLayerConfig>): DefaultInteroperabilityLayer {
  return new DefaultInteroperabilityLayer(config);
}

export default DefaultInteroperabilityLayer;
