/**
 * TONAIAgent - AGFI Interoperability & Global Integration
 *
 * Provides cross-chain message layers, institutional API access, bank/custodian connectors,
 * and RWA custodial mapping. The connective tissue that links AGFI to the broader global
 * financial system — both on-chain and off-chain.
 *
 * This is Pillar 6 of the AI-native Global Financial Infrastructure (AGFI).
 */

import {
  CrossChainMessage,
  InstitutionalAPIEndpoint,
  BankConnector,
  CustodianMapping,
  RWACustodialMapping,
  InstitutionId,
  ChainId,
  JurisdictionCode,
  GlobalIntegrationConfig,
  AGFIEvent,
  AGFIEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_INTEGRATION_CONFIG: GlobalIntegrationConfig = {
  enableCrossChainMessaging: true,
  enableInstitutionalAPIs: true,
  enableBankConnectors: true,
  enableCustodianMapping: true,
  enableRWACustodialMapping: true,
  messagePriorityQueueEnabled: true,
  maxMessageRetries: 3,
  messageTimeoutMs: 30000,
};

// ============================================================================
// Interoperability & Global Integration Interface
// ============================================================================

export interface InteroperabilityGlobalIntegration {
  readonly config: GlobalIntegrationConfig;

  // Cross-Chain Messaging
  sendCrossChainMessage(params: SendMessageParams): CrossChainMessage;
  getMessage(id: string): CrossChainMessage | undefined;
  listMessages(filters?: MessageFilters): CrossChainMessage[];
  acknowledgeMessage(id: string): CrossChainMessage;
  retryMessage(id: string): CrossChainMessage;
  getMessageQueueStatus(): MessageQueueStatus;

  // Institutional API Endpoints
  registerAPIEndpoint(params: RegisterAPIEndpointParams): InstitutionalAPIEndpoint;
  getAPIEndpoint(id: string): InstitutionalAPIEndpoint | undefined;
  listAPIEndpoints(filters?: APIEndpointFilters): InstitutionalAPIEndpoint[];
  checkAPIHealth(id: string): APIHealthResult;
  updateAPIStatus(id: string, status: InstitutionalAPIEndpoint['status'], latencyMs?: number): void;

  // Bank Connectors
  addBankConnector(params: AddBankConnectorParams): BankConnector;
  getBankConnector(id: string): BankConnector | undefined;
  listBankConnectors(filters?: BankConnectorFilters): BankConnector[];
  testBankConnection(id: string): BankConnectionTestResult;
  updateBankConnectorStatus(id: string, status: BankConnector['status']): void;

  // Custodian Mapping
  registerCustodian(params: RegisterCustodianParams): CustodianMapping;
  getCustodian(id: string): CustodianMapping | undefined;
  listCustodians(filters?: CustodianFilters): CustodianMapping[];
  updateCustodianStatus(id: string, status: CustodianMapping['status']): void;

  // RWA Custodial Mapping
  registerRWACustodialMap(params: RegisterRWACustodialParams): RWACustodialMapping;
  getRWACustodialMap(id: string): RWACustodialMapping | undefined;
  listRWACustodialMaps(filters?: RWACustodialFilters): RWACustodialMapping[];
  verifyRWACustody(id: string): RWACustodyVerification;

  // Global Integration Analytics
  getIntegrationSummary(): IntegrationSummary;
  getGlobalConnectivityMap(): GlobalConnectivityMap;

  // Events
  onEvent(callback: AGFIEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface SendMessageParams {
  protocol: CrossChainMessage['protocol'];
  sourceChain: ChainId;
  destinationChain: ChainId;
  messageType: CrossChainMessage['messageType'];
  payload: Record<string, unknown>;
  priority?: CrossChainMessage['priority'];
}

export interface MessageFilters {
  sourceChain?: ChainId;
  destinationChain?: ChainId;
  messageType?: CrossChainMessage['messageType'];
  status?: CrossChainMessage['status'];
  priority?: CrossChainMessage['priority'];
}

export interface MessageQueueStatus {
  queued: number;
  sending: number;
  delivered: number;
  acknowledged: number;
  failed: number;
  avgDeliveryTimeMs: number;
  successRate: number;
  generatedAt: Date;
}

export interface RegisterAPIEndpointParams {
  institutionId: InstitutionId;
  endpointType: InstitutionalAPIEndpoint['endpointType'];
  url: string;
  version?: string;
  capabilities?: string[];
  authMethod?: InstitutionalAPIEndpoint['authMethod'];
  rateLimitPerMinute?: number;
}

export interface APIEndpointFilters {
  institutionId?: InstitutionId;
  endpointType?: InstitutionalAPIEndpoint['endpointType'];
  status?: InstitutionalAPIEndpoint['status'];
}

export interface APIHealthResult {
  endpointId: string;
  isHealthy: boolean;
  latencyMs: number;
  statusCode?: number;
  checkedAt: Date;
  nextCheckAt: Date;
}

export interface AddBankConnectorParams {
  bankName: string;
  bankCountry: JurisdictionCode;
  connectorType: BankConnector['connectorType'];
  supportedCurrencies: string[];
  settlementTime?: number;
  transactionFeeFixed?: number;
  transactionFeePercent?: number;
  maxTransactionAmount?: number;
}

export interface BankConnectorFilters {
  bankCountry?: JurisdictionCode;
  connectorType?: BankConnector['connectorType'];
  status?: BankConnector['status'];
  supportedCurrency?: string;
}

export interface BankConnectionTestResult {
  connectorId: string;
  connectionSuccessful: boolean;
  latencyMs: number;
  testedAt: Date;
  errorMessage?: string;
}

export interface RegisterCustodianParams {
  custodianName: string;
  custodianType: CustodianMapping['custodianType'];
  jurisdictions: JurisdictionCode[];
  supportedAssets: string[];
  supportedChains: ChainId[];
  segregationModel: CustodianMapping['segregationModel'];
  insuranceCoverage?: number;
  apiIntegrated?: boolean;
}

export interface CustodianFilters {
  custodianType?: CustodianMapping['custodianType'];
  status?: CustodianMapping['status'];
  jurisdiction?: JurisdictionCode;
  chain?: ChainId;
  apiIntegrated?: boolean;
}

export interface RegisterRWACustodialParams {
  rwaAssetId: string;
  rwaType: RWACustodialMapping['rwaType'];
  custodian: string;
  legalEntity: string;
  tokenContract: string;
  tokenChain: ChainId;
  underlyingCustodyJurisdiction: JurisdictionCode;
  totalTokenized: number;
  proofOfReserveUrl?: string;
}

export interface RWACustodialFilters {
  rwaType?: RWACustodialMapping['rwaType'];
  custodian?: string;
  tokenChain?: ChainId;
  status?: RWACustodialMapping['status'];
}

export interface RWACustodyVerification {
  mappingId: string;
  verifiedAt: Date;
  isVerified: boolean;
  proofOfReserveValid: boolean;
  tokenizedAmountMatches: boolean;
  custodianConfirmed: boolean;
  details: string;
}

export interface IntegrationSummary {
  crossChainMessages: {
    total: number;
    delivered: number;
    failed: number;
    avgLatencyMs: number;
  };
  institutionalAPIs: {
    registered: number;
    active: number;
    degraded: number;
    offline: number;
  };
  bankConnectors: {
    total: number;
    connected: number;
    jurisdictionsCovered: number;
  };
  custodians: {
    total: number;
    active: number;
    totalInsuranceCoverage: number;
  };
  rwaMappings: {
    total: number;
    active: number;
    totalTokenizedValue: number;
  };
  generatedAt: Date;
}

export interface GlobalConnectivityMap {
  chains: ChainConnectivity[];
  jurisdictions: JurisdictionConnectivity[];
  generatedAt: Date;
}

export interface ChainConnectivity {
  chain: ChainId;
  inboundChannels: number;
  outboundChannels: number;
  connectedBanks: number;
  registeredCustodians: number;
}

export interface JurisdictionConnectivity {
  jurisdiction: JurisdictionCode;
  bankConnectors: number;
  custodians: number;
  rwaMappings: number;
  complianceBridges: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultInteroperabilityGlobalIntegration implements InteroperabilityGlobalIntegration {
  readonly config: GlobalIntegrationConfig;

  private readonly messages = new Map<string, CrossChainMessage>();
  private readonly apiEndpoints = new Map<string, InstitutionalAPIEndpoint>();
  private readonly bankConnectors = new Map<string, BankConnector>();
  private readonly custodians = new Map<string, CustodianMapping>();
  private readonly rwaMappings = new Map<string, RWACustodialMapping>();
  private readonly eventCallbacks: AGFIEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<GlobalIntegrationConfig>) {
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };
  }

  // ============================================================================
  // Cross-Chain Messaging
  // ============================================================================

  sendCrossChainMessage(params: SendMessageParams): CrossChainMessage {
    const message: CrossChainMessage = {
      id: this.generateId('msg'),
      protocol: params.protocol,
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      messageType: params.messageType,
      payload: params.payload,
      priority: params.priority ?? 'standard',
      status: 'queued',
      sentAt: new Date(),
      retryCount: 0,
      maxRetries: this.config.maxMessageRetries,
    };

    this.messages.set(message.id, message);

    // Simulate sending
    message.status = 'sending';

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'interop_message_sent',
      severity: 'info',
      source: 'InteroperabilityGlobalIntegration',
      message: `Cross-chain message sent: ${params.sourceChain} → ${params.destinationChain} (${params.messageType})`,
      data: { messageId: message.id, protocol: params.protocol, messageType: params.messageType },
      timestamp: new Date(),
    });

    return message;
  }

  getMessage(id: string): CrossChainMessage | undefined {
    return this.messages.get(id);
  }

  listMessages(filters?: MessageFilters): CrossChainMessage[] {
    let results = Array.from(this.messages.values());

    if (filters?.sourceChain) results = results.filter(m => m.sourceChain === filters.sourceChain);
    if (filters?.destinationChain) results = results.filter(m => m.destinationChain === filters.destinationChain);
    if (filters?.messageType) results = results.filter(m => m.messageType === filters.messageType);
    if (filters?.status) results = results.filter(m => m.status === filters.status);
    if (filters?.priority) results = results.filter(m => m.priority === filters.priority);

    return results;
  }

  acknowledgeMessage(id: string): CrossChainMessage {
    const message = this.messages.get(id);
    if (!message) throw new Error(`Message not found: ${id}`);

    message.status = 'acknowledged';
    message.acknowledgedAt = new Date();
    if (!message.deliveredAt) message.deliveredAt = new Date();

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'interop_message_received',
      severity: 'info',
      source: 'InteroperabilityGlobalIntegration',
      message: `Cross-chain message acknowledged: ${id}`,
      data: { messageId: id },
      timestamp: new Date(),
    });

    return message;
  }

  retryMessage(id: string): CrossChainMessage {
    const message = this.messages.get(id);
    if (!message) throw new Error(`Message not found: ${id}`);
    if (message.retryCount >= message.maxRetries) {
      throw new Error(`Message has exceeded max retries: ${message.retryCount}`);
    }

    message.retryCount++;
    message.status = 'sending';
    return message;
  }

  getMessageQueueStatus(): MessageQueueStatus {
    const messages = Array.from(this.messages.values());
    const delivered = messages.filter(m => m.status === 'delivered' || m.status === 'acknowledged');
    const deliveryTimes = delivered
      .filter(m => m.deliveredAt)
      .map(m => m.deliveredAt!.getTime() - m.sentAt.getTime());
    const avgLatency = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
      : 0;

    return {
      queued: messages.filter(m => m.status === 'queued').length,
      sending: messages.filter(m => m.status === 'sending').length,
      delivered: messages.filter(m => m.status === 'delivered').length,
      acknowledged: messages.filter(m => m.status === 'acknowledged').length,
      failed: messages.filter(m => m.status === 'failed').length,
      avgDeliveryTimeMs: avgLatency,
      successRate: messages.length > 0
        ? (delivered.length / messages.length) * 100
        : 100,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Institutional API Endpoints
  // ============================================================================

  registerAPIEndpoint(params: RegisterAPIEndpointParams): InstitutionalAPIEndpoint {
    const endpoint: InstitutionalAPIEndpoint = {
      id: this.generateId('api'),
      institutionId: params.institutionId,
      endpointType: params.endpointType,
      url: params.url,
      version: params.version ?? 'v1',
      capabilities: params.capabilities ?? [],
      authMethod: params.authMethod ?? 'api_key',
      rateLimitPerMinute: params.rateLimitPerMinute ?? 60,
      status: 'active',
      latencyMs: 0,
      lastHealthCheck: new Date(),
    };

    this.apiEndpoints.set(endpoint.id, endpoint);
    return endpoint;
  }

  getAPIEndpoint(id: string): InstitutionalAPIEndpoint | undefined {
    return this.apiEndpoints.get(id);
  }

  listAPIEndpoints(filters?: APIEndpointFilters): InstitutionalAPIEndpoint[] {
    let results = Array.from(this.apiEndpoints.values());

    if (filters?.institutionId) results = results.filter(e => e.institutionId === filters.institutionId);
    if (filters?.endpointType) results = results.filter(e => e.endpointType === filters.endpointType);
    if (filters?.status) results = results.filter(e => e.status === filters.status);

    return results;
  }

  checkAPIHealth(id: string): APIHealthResult {
    const endpoint = this.apiEndpoints.get(id);
    if (!endpoint) throw new Error(`API endpoint not found: ${id}`);

    const isHealthy = endpoint.status === 'active';
    const latencyMs = isHealthy ? Math.floor(Math.random() * 100) + 10 : 0;

    endpoint.latencyMs = latencyMs;
    endpoint.lastHealthCheck = new Date();

    return {
      endpointId: id,
      isHealthy,
      latencyMs,
      statusCode: isHealthy ? 200 : 503,
      checkedAt: new Date(),
      nextCheckAt: new Date(Date.now() + 60000),
    };
  }

  updateAPIStatus(id: string, status: InstitutionalAPIEndpoint['status'], latencyMs?: number): void {
    const endpoint = this.apiEndpoints.get(id);
    if (!endpoint) throw new Error(`API endpoint not found: ${id}`);

    endpoint.status = status;
    if (latencyMs !== undefined) endpoint.latencyMs = latencyMs;
    endpoint.lastHealthCheck = new Date();
  }

  // ============================================================================
  // Bank Connectors
  // ============================================================================

  addBankConnector(params: AddBankConnectorParams): BankConnector {
    const connector: BankConnector = {
      id: this.generateId('bank'),
      bankName: params.bankName,
      bankCountry: params.bankCountry,
      connectorType: params.connectorType,
      supportedCurrencies: params.supportedCurrencies,
      settlementTime: params.settlementTime ?? 24,
      status: 'connected',
      transactionFeeFixed: params.transactionFeeFixed ?? 0,
      transactionFeePercent: params.transactionFeePercent ?? 0.001,
      maxTransactionAmount: params.maxTransactionAmount ?? 10_000_000,
    };

    this.bankConnectors.set(connector.id, connector);
    return connector;
  }

  getBankConnector(id: string): BankConnector | undefined {
    return this.bankConnectors.get(id);
  }

  listBankConnectors(filters?: BankConnectorFilters): BankConnector[] {
    let results = Array.from(this.bankConnectors.values());

    if (filters?.bankCountry) results = results.filter(b => b.bankCountry === filters.bankCountry);
    if (filters?.connectorType) results = results.filter(b => b.connectorType === filters.connectorType);
    if (filters?.status) results = results.filter(b => b.status === filters.status);
    if (filters?.supportedCurrency) results = results.filter(b => b.supportedCurrencies.includes(filters.supportedCurrency!));

    return results;
  }

  testBankConnection(id: string): BankConnectionTestResult {
    const connector = this.bankConnectors.get(id);
    if (!connector) throw new Error(`Bank connector not found: ${id}`);

    const success = connector.status === 'connected';
    if (success) connector.lastSuccessfulTransactionAt = new Date();

    return {
      connectorId: id,
      connectionSuccessful: success,
      latencyMs: success ? Math.floor(Math.random() * 200) + 50 : 0,
      testedAt: new Date(),
      errorMessage: success ? undefined : 'Connection failed: Bank connector not in connected state',
    };
  }

  updateBankConnectorStatus(id: string, status: BankConnector['status']): void {
    const connector = this.bankConnectors.get(id);
    if (!connector) throw new Error(`Bank connector not found: ${id}`);
    connector.status = status;
  }

  // ============================================================================
  // Custodian Mapping
  // ============================================================================

  registerCustodian(params: RegisterCustodianParams): CustodianMapping {
    const custodian: CustodianMapping = {
      id: this.generateId('cust'),
      custodianName: params.custodianName,
      custodianType: params.custodianType,
      jurisdictions: params.jurisdictions,
      supportedAssets: params.supportedAssets,
      supportedChains: params.supportedChains,
      segregationModel: params.segregationModel,
      insuranceCoverage: params.insuranceCoverage ?? 0,
      reportingFrequency: 'daily',
      apiIntegrated: params.apiIntegrated ?? false,
      status: 'active',
    };

    this.custodians.set(custodian.id, custodian);
    return custodian;
  }

  getCustodian(id: string): CustodianMapping | undefined {
    return this.custodians.get(id);
  }

  listCustodians(filters?: CustodianFilters): CustodianMapping[] {
    let results = Array.from(this.custodians.values());

    if (filters?.custodianType) results = results.filter(c => c.custodianType === filters.custodianType);
    if (filters?.status) results = results.filter(c => c.status === filters.status);
    if (filters?.jurisdiction) results = results.filter(c => c.jurisdictions.includes(filters.jurisdiction!));
    if (filters?.chain) results = results.filter(c => c.supportedChains.includes(filters.chain!));
    if (filters?.apiIntegrated !== undefined) results = results.filter(c => c.apiIntegrated === filters.apiIntegrated);

    return results;
  }

  updateCustodianStatus(id: string, status: CustodianMapping['status']): void {
    const custodian = this.custodians.get(id);
    if (!custodian) throw new Error(`Custodian not found: ${id}`);
    custodian.status = status;
  }

  // ============================================================================
  // RWA Custodial Mapping
  // ============================================================================

  registerRWACustodialMap(params: RegisterRWACustodialParams): RWACustodialMapping {
    const mapping: RWACustodialMapping = {
      id: this.generateId('rwa'),
      rwaAssetId: params.rwaAssetId,
      rwaType: params.rwaType,
      custodian: params.custodian,
      legalEntity: params.legalEntity,
      tokenContract: params.tokenContract,
      tokenChain: params.tokenChain,
      underlyingCustodyJurisdiction: params.underlyingCustodyJurisdiction,
      totalTokenized: params.totalTokenized,
      proofOfReserveUrl: params.proofOfReserveUrl,
      status: 'active',
    };

    this.rwaMappings.set(mapping.id, mapping);
    return mapping;
  }

  getRWACustodialMap(id: string): RWACustodialMapping | undefined {
    return this.rwaMappings.get(id);
  }

  listRWACustodialMaps(filters?: RWACustodialFilters): RWACustodialMapping[] {
    let results = Array.from(this.rwaMappings.values());

    if (filters?.rwaType) results = results.filter(m => m.rwaType === filters.rwaType);
    if (filters?.custodian) results = results.filter(m => m.custodian === filters.custodian);
    if (filters?.tokenChain) results = results.filter(m => m.tokenChain === filters.tokenChain);
    if (filters?.status) results = results.filter(m => m.status === filters.status);

    return results;
  }

  verifyRWACustody(id: string): RWACustodyVerification {
    const mapping = this.rwaMappings.get(id);
    if (!mapping) throw new Error(`RWA custodial mapping not found: ${id}`);

    const proofValid = !!mapping.proofOfReserveUrl;
    const isVerified = proofValid && mapping.status === 'active';

    mapping.lastVerifiedAt = new Date();

    return {
      mappingId: id,
      verifiedAt: new Date(),
      isVerified,
      proofOfReserveValid: proofValid,
      tokenizedAmountMatches: true, // Would perform actual verification in production
      custodianConfirmed: mapping.status === 'active',
      details: isVerified
        ? `RWA custody verified: ${mapping.rwaAssetId} custodied by ${mapping.custodian}`
        : `Verification incomplete: ${!proofValid ? 'Missing proof of reserve URL' : 'Status not active'}`,
    };
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  getIntegrationSummary(): IntegrationSummary {
    const messages = Array.from(this.messages.values());
    const delivered = messages.filter(m => m.status === 'delivered' || m.status === 'acknowledged');
    const deliveryTimes = delivered
      .filter(m => m.deliveredAt)
      .map(m => m.deliveredAt!.getTime() - m.sentAt.getTime());
    const avgLatency = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
      : 0;

    const endpoints = Array.from(this.apiEndpoints.values());
    const connectors = Array.from(this.bankConnectors.values());
    const custodianList = Array.from(this.custodians.values());
    const rwaList = Array.from(this.rwaMappings.values());

    const jurisdictionSet = new Set(connectors.map(c => c.bankCountry));
    const totalInsurance = custodianList.reduce((sum, c) => sum + c.insuranceCoverage, 0);
    const totalTokenized = rwaList.reduce((sum, m) => sum + m.totalTokenized, 0);

    return {
      crossChainMessages: {
        total: messages.length,
        delivered: delivered.length,
        failed: messages.filter(m => m.status === 'failed').length,
        avgLatencyMs: avgLatency,
      },
      institutionalAPIs: {
        registered: endpoints.length,
        active: endpoints.filter(e => e.status === 'active').length,
        degraded: endpoints.filter(e => e.status === 'degraded').length,
        offline: endpoints.filter(e => e.status === 'offline').length,
      },
      bankConnectors: {
        total: connectors.length,
        connected: connectors.filter(c => c.status === 'connected').length,
        jurisdictionsCovered: jurisdictionSet.size,
      },
      custodians: {
        total: custodianList.length,
        active: custodianList.filter(c => c.status === 'active').length,
        totalInsuranceCoverage: totalInsurance,
      },
      rwaMappings: {
        total: rwaList.length,
        active: rwaList.filter(m => m.status === 'active').length,
        totalTokenizedValue: totalTokenized,
      },
      generatedAt: new Date(),
    };
  }

  getGlobalConnectivityMap(): GlobalConnectivityMap {
    const allChains = new Set<ChainId>();
    const allJurisdictions = new Set<JurisdictionCode>();

    for (const msg of this.messages.values()) {
      allChains.add(msg.sourceChain);
      allChains.add(msg.destinationChain);
    }
    for (const bank of this.bankConnectors.values()) {
      allJurisdictions.add(bank.bankCountry);
    }

    const chains: ChainConnectivity[] = Array.from(allChains).map(chain => {
      const msgs = Array.from(this.messages.values());
      return {
        chain,
        inboundChannels: msgs.filter(m => m.destinationChain === chain).length,
        outboundChannels: msgs.filter(m => m.sourceChain === chain).length,
        connectedBanks: 0,
        registeredCustodians: Array.from(this.custodians.values()).filter(c => c.supportedChains.includes(chain)).length,
      };
    });

    const jurisdictions: JurisdictionConnectivity[] = Array.from(allJurisdictions).map(jurisdiction => ({
      jurisdiction,
      bankConnectors: Array.from(this.bankConnectors.values()).filter(b => b.bankCountry === jurisdiction).length,
      custodians: Array.from(this.custodians.values()).filter(c => c.jurisdictions.includes(jurisdiction)).length,
      rwaMappings: Array.from(this.rwaMappings.values()).filter(m => m.underlyingCustodyJurisdiction === jurisdiction).length,
      complianceBridges: 0, // Would link to governance module
    }));

    return {
      chains,
      jurisdictions,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFIEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createInteroperabilityGlobalIntegration(
  config?: Partial<GlobalIntegrationConfig>
): DefaultInteroperabilityGlobalIntegration {
  return new DefaultInteroperabilityGlobalIntegration(config);
}

export default DefaultInteroperabilityGlobalIntegration;
