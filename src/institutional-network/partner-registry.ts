/**
 * TONAIAgent - Institutional Partner Registry
 *
 * Manages the global network of institutional partners including hedge funds,
 * crypto funds, family offices, custodians, banks, OTC desks, infrastructure
 * providers, and fintech companies.
 */

import {
  InstitutionalPartner,
  InstitutionalPartnerType,
  PartnerTier,
  PartnerStatus,
  PartnerProfile,
  PartnerCapabilities,
  RegulatoryStatus,
  IntegrationStatus,
  RelationshipDetails,
  PartnerCompliance,
  PartnerMetrics,
  PartnerContact,
  PartnerAgreement,
  GeographicRegion,
  RegionalPresence,
  InstitutionalNetworkEvent,
  InstitutionalNetworkEventCallback,
  PartnerRegistryConfig,
  PartnerProspect,
  PartnerCriteria,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface PartnerRegistryManager {
  // Partner CRUD
  registerPartner(request: RegisterPartnerRequest): Promise<InstitutionalPartner>;
  getPartner(partnerId: string): Promise<InstitutionalPartner | null>;
  updatePartner(partnerId: string, updates: PartnerUpdates): Promise<InstitutionalPartner>;
  deactivatePartner(partnerId: string, reason: string): Promise<void>;

  // Partner queries
  listPartners(filters?: PartnerFilters): Promise<InstitutionalPartner[]>;
  searchPartners(query: string, filters?: PartnerFilters): Promise<InstitutionalPartner[]>;
  getPartnersByType(type: InstitutionalPartnerType): Promise<InstitutionalPartner[]>;
  getPartnersByRegion(region: GeographicRegion): Promise<InstitutionalPartner[]>;
  getPartnersByTier(tier: PartnerTier): Promise<InstitutionalPartner[]>;

  // Partner status management
  updatePartnerStatus(partnerId: string, status: PartnerStatus, reason?: string): Promise<void>;
  upgradePartnerTier(partnerId: string, newTier: PartnerTier, justification: string): Promise<void>;
  suspendPartner(partnerId: string, reason: string, duration?: number): Promise<void>;
  reinstatePartner(partnerId: string): Promise<void>;

  // Contact management
  addContact(partnerId: string, contact: Omit<PartnerContact, 'id'>): Promise<PartnerContact>;
  updateContact(partnerId: string, contactId: string, updates: Partial<PartnerContact>): Promise<PartnerContact>;
  removeContact(partnerId: string, contactId: string): Promise<void>;
  setPrimaryContact(partnerId: string, contactId: string): Promise<void>;

  // Agreement management
  addAgreement(partnerId: string, agreement: Omit<PartnerAgreement, 'id'>): Promise<PartnerAgreement>;
  updateAgreement(partnerId: string, agreementId: string, updates: Partial<PartnerAgreement>): Promise<PartnerAgreement>;
  terminateAgreement(partnerId: string, agreementId: string, reason: string): Promise<void>;
  getActiveAgreements(partnerId: string): Promise<PartnerAgreement[]>;

  // Regional presence
  addRegionalPresence(partnerId: string, presence: RegionalPresence): Promise<void>;
  updateRegionalPresence(partnerId: string, region: GeographicRegion, updates: Partial<RegionalPresence>): Promise<void>;
  getRegionalPresence(partnerId: string): Promise<RegionalPresence[]>;

  // Compliance management
  updateCompliance(partnerId: string, compliance: Partial<PartnerCompliance>): Promise<void>;
  getExpiringCompliance(daysAhead: number): Promise<PartnerComplianceAlert[]>;
  flagComplianceIssue(partnerId: string, issue: ComplianceIssue): Promise<void>;

  // Integration management
  updateIntegrationStatus(partnerId: string, status: Partial<IntegrationStatus>): Promise<void>;
  getIntegrationHealth(): Promise<IntegrationHealthReport>;

  // Metrics and analytics
  updateMetrics(partnerId: string, metrics: Partial<PartnerMetrics>): Promise<void>;
  getNetworkMetrics(): Promise<NetworkPartnerMetrics>;
  getPartnerPerformance(partnerId: string, period: string): Promise<PartnerPerformanceReport>;
  getTopPartners(metric: string, limit: number): Promise<InstitutionalPartner[]>;

  // Prospect management
  addProspect(prospect: Omit<PartnerProspect, 'id'>): Promise<PartnerProspect>;
  updateProspect(prospectId: string, updates: Partial<PartnerProspect>): Promise<PartnerProspect>;
  convertProspectToPartner(prospectId: string): Promise<InstitutionalPartner>;
  matchPartners(criteria: PartnerCriteria): Promise<PartnerMatchResult[]>;

  // Event handling
  onEvent(callback: InstitutionalNetworkEventCallback): void;

  // Health check
  getHealth(): RegistryHealth;
}

export interface RegisterPartnerRequest {
  name: string;
  legalName: string;
  type: InstitutionalPartnerType;
  tier?: PartnerTier;
  region: GeographicRegion;
  jurisdictions: string[];
  profile: PartnerProfile;
  capabilities: PartnerCapabilities;
  regulatoryStatus?: Partial<RegulatoryStatus>;
  relationship?: Partial<RelationshipDetails>;
  initialContacts?: Omit<PartnerContact, 'id'>[];
  metadata?: Record<string, unknown>;
}

export interface PartnerUpdates {
  name?: string;
  legalName?: string;
  tier?: PartnerTier;
  region?: GeographicRegion;
  jurisdictions?: string[];
  profile?: Partial<PartnerProfile>;
  capabilities?: Partial<PartnerCapabilities>;
  regulatoryStatus?: Partial<RegulatoryStatus>;
  relationship?: Partial<RelationshipDetails>;
  metadata?: Record<string, unknown>;
}

export interface PartnerFilters {
  types?: InstitutionalPartnerType[];
  tiers?: PartnerTier[];
  statuses?: PartnerStatus[];
  regions?: GeographicRegion[];
  jurisdictions?: string[];
  isIntegrated?: boolean;
  hasActiveAgreement?: boolean;
  minVolume?: string;
  minAum?: string;
  capabilities?: (keyof PartnerCapabilities)[];
  riskRating?: ('low' | 'medium' | 'high')[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PartnerComplianceAlert {
  partnerId: string;
  partnerName: string;
  alertType: 'kyc_expiring' | 'sanctions_due' | 'document_expiring' | 'review_due';
  expiresAt: Date;
  daysUntilExpiry: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string;
  requiredAction?: string;
}

export interface IntegrationHealthReport {
  totalIntegrations: number;
  healthyIntegrations: number;
  degradedIntegrations: number;
  downIntegrations: number;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  issues: IntegrationIssue[];
}

export interface IntegrationIssue {
  partnerId: string;
  partnerName: string;
  issue: string;
  severity: 'warning' | 'error' | 'critical';
  since: Date;
}

export interface NetworkPartnerMetrics {
  totalPartners: number;
  activePartners: number;
  partnersByType: Record<InstitutionalPartnerType, number>;
  partnersByTier: Record<PartnerTier, number>;
  partnersByRegion: Record<GeographicRegion, number>;
  partnersByStatus: Record<PartnerStatus, number>;
  totalVolume: string;
  totalAum: string;
  averageSatisfactionScore: number;
  churnRate: number;
  growthRate: number;
  topPartnersByVolume: PartnerSummary[];
  recentOnboardings: PartnerSummary[];
}

export interface PartnerSummary {
  id: string;
  name: string;
  type: InstitutionalPartnerType;
  tier: PartnerTier;
  volume?: string;
  onboardedAt?: Date;
}

export interface PartnerPerformanceReport {
  partnerId: string;
  partnerName: string;
  period: string;
  metrics: {
    totalVolume: string;
    transactionCount: number;
    averageTransactionSize: string;
    uptime: number;
    responseTime: number;
    errorRate: number;
    satisfactionScore: number;
  };
  trends: {
    volumeTrend: 'up' | 'down' | 'stable';
    volumeChange: number;
    activityTrend: 'up' | 'down' | 'stable';
  };
  comparison: {
    vsTierAverage: number;
    vsNetworkAverage: number;
  };
  highlights: string[];
  concerns: string[];
}

export interface PartnerMatchResult {
  partnerId?: string;
  prospectId?: string;
  name: string;
  type: InstitutionalPartnerType;
  matchScore: number;
  matchingCriteria: string[];
  missingCriteria: string[];
  region: GeographicRegion;
  estimatedValue: string;
  recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match';
}

export interface RegistryHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  partnerCount: number;
  lastSyncAt: Date;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultPartnerRegistryManager implements PartnerRegistryManager {
  private partners: Map<string, InstitutionalPartner> = new Map();
  private prospects: Map<string, PartnerProspect> = new Map();
  private regionalPresence: Map<string, RegionalPresence[]> = new Map();
  private eventCallbacks: InstitutionalNetworkEventCallback[] = [];
  private config: PartnerRegistryConfig;
  private lastSyncAt: Date = new Date();

  constructor(config?: Partial<PartnerRegistryConfig>) {
    this.config = {
      enabled: true,
      autoSync: true,
      syncFrequency: '1h',
      validationRules: [],
      notificationSettings: {
        enabled: true,
        channels: ['email', 'webhook'],
        events: ['partner_onboarded', 'partner_status_changed'],
        recipients: [],
      },
      ...config,
    };
  }

  getConfig(): PartnerRegistryConfig {
    return this.config;
  }

  async registerPartner(request: RegisterPartnerRequest): Promise<InstitutionalPartner> {
    const partnerId = this.generateId('partner');

    const partner: InstitutionalPartner = {
      id: partnerId,
      name: request.name,
      legalName: request.legalName,
      type: request.type,
      tier: request.tier || 'standard',
      status: 'prospect',
      region: request.region,
      jurisdictions: request.jurisdictions,
      regulatoryStatus: {
        isRegulated: false,
        licenses: [],
        complianceRating: 'pending',
        restrictions: [],
        ...request.regulatoryStatus,
      },
      profile: request.profile,
      capabilities: request.capabilities,
      integration: {
        isIntegrated: false,
        integrationLevel: 'none',
        apiConnected: false,
        dataFeeds: [],
        liquidityPools: [],
        custodyIntegration: false,
        settlementIntegration: false,
        reportingIntegration: false,
        healthStatus: 'unknown',
      },
      relationship: {
        accountManager: '',
        relationshipStartDate: new Date(),
        revenueTier: 'basic',
        slaLevel: 'standard',
        strategicImportance: 'low',
        ...request.relationship,
      },
      compliance: {
        kycStatus: 'pending',
        amlStatus: 'review_required',
        sanctionsScreening: 'pending',
        riskRating: 'medium',
        dueDiligenceLevel: 'basic',
        requiredDocuments: this.getRequiredDocuments(request.type),
      },
      metrics: {
        totalVolume: '0',
        monthlyVolume: '0',
        averageDailyVolume: '0',
        totalTransactions: 0,
        uptime: 100,
        responseTime: 0,
        lastActivityAt: new Date(),
      },
      contacts: [],
      agreements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata || {},
    };

    // Add initial contacts
    if (request.initialContacts) {
      for (const contactData of request.initialContacts) {
        const contact: PartnerContact = {
          id: this.generateId('contact'),
          ...contactData,
        };
        partner.contacts.push(contact);
      }
    }

    this.partners.set(partnerId, partner);
    this.emitEvent('partner_onboarded', 'partner', partnerId, 'register', { ...partner });

    return partner;
  }

  async getPartner(partnerId: string): Promise<InstitutionalPartner | null> {
    return this.partners.get(partnerId) || null;
  }

  async updatePartner(partnerId: string, updates: PartnerUpdates): Promise<InstitutionalPartner> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const updatedPartner: InstitutionalPartner = {
      ...partner,
      ...updates,
      profile: updates.profile ? { ...partner.profile, ...updates.profile } : partner.profile,
      capabilities: updates.capabilities ? { ...partner.capabilities, ...updates.capabilities } : partner.capabilities,
      regulatoryStatus: updates.regulatoryStatus
        ? { ...partner.regulatoryStatus, ...updates.regulatoryStatus }
        : partner.regulatoryStatus,
      relationship: updates.relationship
        ? { ...partner.relationship, ...updates.relationship }
        : partner.relationship,
      updatedAt: new Date(),
    };

    this.partners.set(partnerId, updatedPartner);
    this.emitEvent('partner_status_changed', 'partner', partnerId, 'update', { updates });

    return updatedPartner;
  }

  async deactivatePartner(partnerId: string, reason: string): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.status = 'churned';
    partner.updatedAt = new Date();
    partner.metadata.deactivationReason = reason;
    partner.metadata.deactivatedAt = new Date();

    this.partners.set(partnerId, partner);
    this.emitEvent('partner_churned', 'partner', partnerId, 'deactivate', { reason });
  }

  async listPartners(filters?: PartnerFilters): Promise<InstitutionalPartner[]> {
    let partners = Array.from(this.partners.values());

    if (filters) {
      if (filters.types?.length) {
        partners = partners.filter((p) => filters.types!.includes(p.type));
      }
      if (filters.tiers?.length) {
        partners = partners.filter((p) => filters.tiers!.includes(p.tier));
      }
      if (filters.statuses?.length) {
        partners = partners.filter((p) => filters.statuses!.includes(p.status));
      }
      if (filters.regions?.length) {
        partners = partners.filter((p) => filters.regions!.includes(p.region));
      }
      if (filters.jurisdictions?.length) {
        partners = partners.filter((p) =>
          p.jurisdictions.some((j) => filters.jurisdictions!.includes(j))
        );
      }
      if (filters.isIntegrated !== undefined) {
        partners = partners.filter((p) => p.integration.isIntegrated === filters.isIntegrated);
      }
      if (filters.hasActiveAgreement) {
        partners = partners.filter((p) =>
          p.agreements.some((a) => a.status === 'active')
        );
      }
      if (filters.capabilities?.length) {
        partners = partners.filter((p) =>
          filters.capabilities!.every((cap) => p.capabilities[cap])
        );
      }
      if (filters.riskRating?.length) {
        partners = partners.filter((p) =>
          filters.riskRating!.includes(p.compliance.riskRating as 'low' | 'medium' | 'high')
        );
      }

      // Sorting
      if (filters.sortBy) {
        partners.sort((a, b) => {
          const aVal = this.getNestedValue(a, filters.sortBy!);
          const bVal = this.getNestedValue(b, filters.sortBy!);
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return aVal > bVal ? order : aVal < bVal ? -order : 0;
        });
      }

      // Pagination
      if (filters.offset !== undefined) {
        partners = partners.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        partners = partners.slice(0, filters.limit);
      }
    }

    return partners;
  }

  async searchPartners(query: string, filters?: PartnerFilters): Promise<InstitutionalPartner[]> {
    const lowerQuery = query.toLowerCase();
    let partners = Array.from(this.partners.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.legalName.toLowerCase().includes(lowerQuery) ||
        p.profile.description.toLowerCase().includes(lowerQuery) ||
        p.profile.specializations.some((s) => s.toLowerCase().includes(lowerQuery))
    );

    if (filters) {
      partners = await this.listPartners({ ...filters });
      partners = partners.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.legalName.toLowerCase().includes(lowerQuery)
      );
    }

    return partners;
  }

  async getPartnersByType(type: InstitutionalPartnerType): Promise<InstitutionalPartner[]> {
    return this.listPartners({ types: [type] });
  }

  async getPartnersByRegion(region: GeographicRegion): Promise<InstitutionalPartner[]> {
    return this.listPartners({ regions: [region] });
  }

  async getPartnersByTier(tier: PartnerTier): Promise<InstitutionalPartner[]> {
    return this.listPartners({ tiers: [tier] });
  }

  async updatePartnerStatus(partnerId: string, status: PartnerStatus, reason?: string): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const previousStatus = partner.status;
    partner.status = status;
    partner.updatedAt = new Date();

    if (reason) {
      partner.metadata.statusChangeReason = reason;
      partner.metadata.statusChangedAt = new Date();
    }

    this.partners.set(partnerId, partner);
    this.emitEvent('partner_status_changed', 'partner', partnerId, 'status_update', {
      previousStatus,
      newStatus: status,
      reason,
    });
  }

  async upgradePartnerTier(partnerId: string, newTier: PartnerTier, justification: string): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const previousTier = partner.tier;
    partner.tier = newTier;
    partner.updatedAt = new Date();
    partner.metadata.tierUpgradeJustification = justification;
    partner.metadata.tierUpgradedAt = new Date();

    this.partners.set(partnerId, partner);
    this.emitEvent('partner_status_changed', 'partner', partnerId, 'tier_upgrade', {
      previousTier,
      newTier,
      justification,
    });
  }

  async suspendPartner(partnerId: string, reason: string, duration?: number): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.status = 'suspended';
    partner.updatedAt = new Date();
    partner.metadata.suspensionReason = reason;
    partner.metadata.suspendedAt = new Date();
    if (duration) {
      partner.metadata.suspensionDuration = duration;
      partner.metadata.suspensionEndsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    }

    this.partners.set(partnerId, partner);
    this.emitEvent('partner_status_changed', 'partner', partnerId, 'suspend', { reason, duration });
  }

  async reinstatePartner(partnerId: string): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.status = 'active';
    partner.updatedAt = new Date();
    delete partner.metadata.suspensionReason;
    delete partner.metadata.suspendedAt;
    delete partner.metadata.suspensionDuration;
    delete partner.metadata.suspensionEndsAt;

    this.partners.set(partnerId, partner);
    this.emitEvent('partner_status_changed', 'partner', partnerId, 'reinstate', {});
  }

  async addContact(partnerId: string, contact: Omit<PartnerContact, 'id'>): Promise<PartnerContact> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const newContact: PartnerContact = {
      id: this.generateId('contact'),
      ...contact,
    };

    partner.contacts.push(newContact);
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);

    return newContact;
  }

  async updateContact(
    partnerId: string,
    contactId: string,
    updates: Partial<PartnerContact>
  ): Promise<PartnerContact> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const contactIndex = partner.contacts.findIndex((c) => c.id === contactId);
    if (contactIndex === -1) {
      throw new Error(`Contact not found: ${contactId}`);
    }

    partner.contacts[contactIndex] = {
      ...partner.contacts[contactIndex],
      ...updates,
    };
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);

    return partner.contacts[contactIndex];
  }

  async removeContact(partnerId: string, contactId: string): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.contacts = partner.contacts.filter((c) => c.id !== contactId);
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);
  }

  async setPrimaryContact(partnerId: string, contactId: string): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.contacts.forEach((c) => {
      c.isPrimary = c.id === contactId;
    });
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);
  }

  async addAgreement(
    partnerId: string,
    agreement: Omit<PartnerAgreement, 'id'>
  ): Promise<PartnerAgreement> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const newAgreement: PartnerAgreement = {
      id: this.generateId('agreement'),
      ...agreement,
    };

    partner.agreements.push(newAgreement);
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);

    return newAgreement;
  }

  async updateAgreement(
    partnerId: string,
    agreementId: string,
    updates: Partial<PartnerAgreement>
  ): Promise<PartnerAgreement> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const agreementIndex = partner.agreements.findIndex((a) => a.id === agreementId);
    if (agreementIndex === -1) {
      throw new Error(`Agreement not found: ${agreementId}`);
    }

    partner.agreements[agreementIndex] = {
      ...partner.agreements[agreementIndex],
      ...updates,
    };
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);

    return partner.agreements[agreementIndex];
  }

  async terminateAgreement(partnerId: string, agreementId: string, reason: string): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const agreementIndex = partner.agreements.findIndex((a) => a.id === agreementId);
    if (agreementIndex === -1) {
      throw new Error(`Agreement not found: ${agreementId}`);
    }

    partner.agreements[agreementIndex].status = 'terminated';
    partner.agreements[agreementIndex].terms.terminationClause = reason;
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);
  }

  async getActiveAgreements(partnerId: string): Promise<PartnerAgreement[]> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    return partner.agreements.filter((a) => a.status === 'active');
  }

  async addRegionalPresence(partnerId: string, presence: RegionalPresence): Promise<void> {
    const existingPresence = this.regionalPresence.get(partnerId) || [];
    const index = existingPresence.findIndex((p) => p.region === presence.region);

    if (index !== -1) {
      existingPresence[index] = presence;
    } else {
      existingPresence.push(presence);
    }

    this.regionalPresence.set(partnerId, existingPresence);
  }

  async updateRegionalPresence(
    partnerId: string,
    region: GeographicRegion,
    updates: Partial<RegionalPresence>
  ): Promise<void> {
    const existingPresence = this.regionalPresence.get(partnerId) || [];
    const index = existingPresence.findIndex((p) => p.region === region);

    if (index === -1) {
      throw new Error(`Regional presence not found for region: ${region}`);
    }

    existingPresence[index] = { ...existingPresence[index], ...updates };
    this.regionalPresence.set(partnerId, existingPresence);
  }

  async getRegionalPresence(partnerId: string): Promise<RegionalPresence[]> {
    return this.regionalPresence.get(partnerId) || [];
  }

  async updateCompliance(partnerId: string, compliance: Partial<PartnerCompliance>): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.compliance = { ...partner.compliance, ...compliance };
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);

    this.emitEvent('compliance_updated', 'partner', partnerId, 'compliance_update', compliance);
  }

  async getExpiringCompliance(daysAhead: number): Promise<PartnerComplianceAlert[]> {
    const alerts: PartnerComplianceAlert[] = [];
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    for (const partner of this.partners.values()) {
      // Check KYC expiry
      if (partner.compliance.kycExpiresAt && partner.compliance.kycExpiresAt <= cutoffDate) {
        const daysUntilExpiry = Math.ceil(
          (partner.compliance.kycExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        alerts.push({
          partnerId: partner.id,
          partnerName: partner.name,
          alertType: 'kyc_expiring',
          expiresAt: partner.compliance.kycExpiresAt,
          daysUntilExpiry,
          severity: daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 30 ? 'high' : 'medium',
        });
      }

      // Check document expiry
      for (const doc of partner.compliance.requiredDocuments) {
        if (doc.expiresAt && doc.expiresAt <= cutoffDate) {
          const daysUntilExpiry = Math.ceil(
            (doc.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          );
          alerts.push({
            partnerId: partner.id,
            partnerName: partner.name,
            alertType: 'document_expiring',
            expiresAt: doc.expiresAt,
            daysUntilExpiry,
            severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
          });
        }
      }
    }

    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  async flagComplianceIssue(partnerId: string, issue: ComplianceIssue): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    if (!partner.metadata.complianceIssues) {
      partner.metadata.complianceIssues = [];
    }
    (partner.metadata.complianceIssues as ComplianceIssue[]).push({
      ...issue,
    });
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);

    this.emitEvent('compliance_alert', 'partner', partnerId, 'compliance_issue', { ...issue });
  }

  async updateIntegrationStatus(partnerId: string, status: Partial<IntegrationStatus>): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const previousStatus = partner.integration.healthStatus;
    partner.integration = { ...partner.integration, ...status };
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);

    if (status.isIntegrated !== undefined) {
      const eventType = status.isIntegrated ? 'integration_connected' : 'integration_disconnected';
      this.emitEvent(eventType, 'integration', partnerId, 'integration_update', status);
    }

    if (status.healthStatus && status.healthStatus !== previousStatus) {
      this.emitEvent('system_alert', 'integration', partnerId, 'health_change', {
        previousStatus,
        newStatus: status.healthStatus,
      });
    }
  }

  async getIntegrationHealth(): Promise<IntegrationHealthReport> {
    let healthy = 0;
    let degraded = 0;
    let down = 0;
    const issues: IntegrationIssue[] = [];

    for (const partner of this.partners.values()) {
      if (!partner.integration.isIntegrated) continue;

      switch (partner.integration.healthStatus) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          issues.push({
            partnerId: partner.id,
            partnerName: partner.name,
            issue: 'Integration degraded',
            severity: 'warning',
            since: partner.integration.lastSyncAt || new Date(),
          });
          break;
        case 'down':
          down++;
          issues.push({
            partnerId: partner.id,
            partnerName: partner.name,
            issue: 'Integration down',
            severity: 'critical',
            since: partner.integration.lastSyncAt || new Date(),
          });
          break;
      }
    }

    const total = healthy + degraded + down;
    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (down > 0) {
      overallHealth = 'critical';
    } else if (degraded > 0) {
      overallHealth = 'degraded';
    }

    return {
      totalIntegrations: total,
      healthyIntegrations: healthy,
      degradedIntegrations: degraded,
      downIntegrations: down,
      overallHealth,
      issues,
    };
  }

  async updateMetrics(partnerId: string, metrics: Partial<PartnerMetrics>): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.metrics = { ...partner.metrics, ...metrics };
    partner.updatedAt = new Date();
    this.partners.set(partnerId, partner);
  }

  async getNetworkMetrics(): Promise<NetworkPartnerMetrics> {
    const partners = Array.from(this.partners.values());

    const partnersByType: Record<InstitutionalPartnerType, number> = {} as any;
    const partnersByTier: Record<PartnerTier, number> = {} as any;
    const partnersByRegion: Record<GeographicRegion, number> = {} as any;
    const partnersByStatus: Record<PartnerStatus, number> = {} as any;

    let totalVolume = BigInt(0);
    let totalAum = BigInt(0);
    let totalSatisfaction = 0;
    let satisfactionCount = 0;

    for (const partner of partners) {
      // Count by type
      partnersByType[partner.type] = (partnersByType[partner.type] || 0) + 1;
      // Count by tier
      partnersByTier[partner.tier] = (partnersByTier[partner.tier] || 0) + 1;
      // Count by region
      partnersByRegion[partner.region] = (partnersByRegion[partner.region] || 0) + 1;
      // Count by status
      partnersByStatus[partner.status] = (partnersByStatus[partner.status] || 0) + 1;

      // Aggregate volume
      try {
        totalVolume += BigInt(partner.metrics.totalVolume.replace(/[^0-9]/g, '') || '0');
      } catch {
        // Ignore parsing errors
      }

      // Aggregate AUM
      if (partner.profile.aum) {
        try {
          totalAum += BigInt(partner.profile.aum.replace(/[^0-9]/g, '') || '0');
        } catch {
          // Ignore parsing errors
        }
      }

      // Satisfaction scores
      if (partner.metrics.satisfactionScore) {
        totalSatisfaction += partner.metrics.satisfactionScore;
        satisfactionCount++;
      }
    }

    const activePartners = partners.filter((p) => p.status === 'active').length;

    // Get top partners by volume
    const sortedByVolume = [...partners]
      .sort((a, b) => {
        const aVol = BigInt(a.metrics.totalVolume.replace(/[^0-9]/g, '') || '0');
        const bVol = BigInt(b.metrics.totalVolume.replace(/[^0-9]/g, '') || '0');
        return aVol > bVol ? -1 : aVol < bVol ? 1 : 0;
      })
      .slice(0, 10);

    // Get recent onboardings
    const recentOnboardings = [...partners]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return {
      totalPartners: partners.length,
      activePartners,
      partnersByType,
      partnersByTier,
      partnersByRegion,
      partnersByStatus,
      totalVolume: totalVolume.toString(),
      totalAum: totalAum.toString(),
      averageSatisfactionScore: satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0,
      churnRate: this.calculateChurnRate(partners),
      growthRate: this.calculateGrowthRate(partners),
      topPartnersByVolume: sortedByVolume.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        tier: p.tier,
        volume: p.metrics.totalVolume,
      })),
      recentOnboardings: recentOnboardings.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        tier: p.tier,
        onboardedAt: p.createdAt,
      })),
    };
  }

  async getPartnerPerformance(partnerId: string, period: string): Promise<PartnerPerformanceReport> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    // Get tier averages for comparison
    const tierPartners = await this.getPartnersByTier(partner.tier);
    const networkPartners = Array.from(this.partners.values());

    const tierAvgVolume = this.calculateAverageVolume(tierPartners);
    const networkAvgVolume = this.calculateAverageVolume(networkPartners);
    const partnerVolume = parseFloat(partner.metrics.totalVolume.replace(/[^0-9.]/g, '') || '0');

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      period,
      metrics: {
        totalVolume: partner.metrics.totalVolume,
        transactionCount: partner.metrics.totalTransactions,
        averageTransactionSize: partner.metrics.averageDailyVolume,
        uptime: partner.metrics.uptime,
        responseTime: partner.metrics.responseTime,
        errorRate: 100 - partner.metrics.uptime,
        satisfactionScore: partner.metrics.satisfactionScore || 0,
      },
      trends: {
        volumeTrend: 'stable', // Would calculate from historical data
        volumeChange: 0,
        activityTrend: 'stable',
      },
      comparison: {
        vsTierAverage: tierAvgVolume > 0 ? ((partnerVolume - tierAvgVolume) / tierAvgVolume) * 100 : 0,
        vsNetworkAverage:
          networkAvgVolume > 0 ? ((partnerVolume - networkAvgVolume) / networkAvgVolume) * 100 : 0,
      },
      highlights: this.generateHighlights(partner),
      concerns: this.generateConcerns(partner),
    };
  }

  async getTopPartners(metric: string, limit: number): Promise<InstitutionalPartner[]> {
    const partners = Array.from(this.partners.values());

    return partners
      .sort((a, b) => {
        const aVal = this.getNestedValue(a, metric);
        const bVal = this.getNestedValue(b, metric);
        return bVal - aVal;
      })
      .slice(0, limit);
  }

  async addProspect(prospect: Omit<PartnerProspect, 'id'>): Promise<PartnerProspect> {
    const newProspect: PartnerProspect = {
      id: this.generateId('prospect'),
      ...prospect,
    };

    this.prospects.set(newProspect.id, newProspect);
    return newProspect;
  }

  async updateProspect(prospectId: string, updates: Partial<PartnerProspect>): Promise<PartnerProspect> {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      throw new Error(`Prospect not found: ${prospectId}`);
    }

    const updatedProspect = { ...prospect, ...updates };
    this.prospects.set(prospectId, updatedProspect);
    return updatedProspect;
  }

  async convertProspectToPartner(prospectId: string): Promise<InstitutionalPartner> {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      throw new Error(`Prospect not found: ${prospectId}`);
    }

    const partner = await this.registerPartner({
      name: prospect.name,
      legalName: prospect.name,
      type: prospect.type,
      region: prospect.region,
      jurisdictions: [],
      profile: {
        description: '',
        website: '',
        headquarters: '',
        foundedYear: new Date().getFullYear(),
        employeeCount: 'unknown',
        specializations: [],
        targetMarkets: [],
        productOfferings: [],
      },
      capabilities: {
        custodyServices: false,
        tradingServices: false,
        liquidityProvision: false,
        primeServices: false,
        otcTrading: false,
        marketMaking: false,
        lending: false,
        staking: false,
        derivativesTrading: false,
        crossBorderPayments: false,
        fiatOnRamp: false,
        fiatOffRamp: false,
        institutionalAccess: false,
        whiteGloveService: false,
        apiAccess: false,
        sdkIntegration: false,
        customSolutions: false,
      },
      metadata: {
        convertedFromProspect: prospectId,
        estimatedValue: prospect.estimatedValue,
      },
    });

    this.prospects.delete(prospectId);
    return partner;
  }

  async matchPartners(criteria: PartnerCriteria): Promise<PartnerMatchResult[]> {
    const results: PartnerMatchResult[] = [];

    // Match against existing partners
    for (const partner of this.partners.values()) {
      const matchResult = this.evaluateMatch(partner, criteria);
      if (matchResult.matchScore > 0.3) {
        results.push({
          partnerId: partner.id,
          name: partner.name,
          type: partner.type,
          region: partner.region,
          ...matchResult,
        });
      }
    }

    // Match against prospects
    for (const prospect of this.prospects.values()) {
      const matchResult = this.evaluateProspectMatch(prospect, criteria);
      if (matchResult.matchScore > 0.3) {
        results.push({
          prospectId: prospect.id,
          name: prospect.name,
          type: prospect.type,
          region: prospect.region,
          ...matchResult,
        });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  onEvent(callback: InstitutionalNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): RegistryHealth {
    const issues: string[] = [];

    // Check for stale data
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - this.lastSyncAt.getTime() > staleThreshold) {
      issues.push('Data sync is overdue');
    }

    // Check integration health
    let downIntegrations = 0;
    for (const partner of this.partners.values()) {
      if (partner.integration.isIntegrated && partner.integration.healthStatus === 'down') {
        downIntegrations++;
      }
    }
    if (downIntegrations > 0) {
      issues.push(`${downIntegrations} integrations are down`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'degraded' : 'unhealthy',
      partnerCount: this.partners.size,
      lastSyncAt: this.lastSyncAt,
      issues,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: InstitutionalNetworkEvent['type'],
    category: InstitutionalNetworkEvent['category'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: InstitutionalNetworkEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      category,
      severity: 'info',
      source: 'partner_registry',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedEntities: [{ type: 'partner', id: sourceId, impact: 'direct' }],
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private getRequiredDocuments(type: InstitutionalPartnerType): PartnerCompliance['requiredDocuments'] {
    const baseDocuments = [
      { type: 'certificate_of_incorporation', name: 'Certificate of Incorporation', required: true, status: 'pending' as const, verified: false },
      { type: 'proof_of_address', name: 'Proof of Address', required: true, status: 'pending' as const, verified: false },
      { type: 'beneficial_ownership', name: 'Beneficial Ownership Declaration', required: true, status: 'pending' as const, verified: false },
    ];

    // Add type-specific documents
    if (['hedge_fund', 'crypto_fund', 'asset_manager'].includes(type)) {
      baseDocuments.push(
        { type: 'fund_registration', name: 'Fund Registration', required: true, status: 'pending' as const, verified: false },
        { type: 'audited_financials', name: 'Audited Financial Statements', required: true, status: 'pending' as const, verified: false }
      );
    }

    if (['bank', 'investment_bank', 'commercial_bank'].includes(type)) {
      baseDocuments.push(
        { type: 'banking_license', name: 'Banking License', required: true, status: 'pending' as const, verified: false }
      );
    }

    if (['custodian'].includes(type)) {
      baseDocuments.push(
        { type: 'custody_license', name: 'Custody License', required: true, status: 'pending' as const, verified: false },
        { type: 'insurance_certificate', name: 'Insurance Certificate', required: true, status: 'pending' as const, verified: false }
      );
    }

    return baseDocuments;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0;
  }

  private calculateChurnRate(partners: InstitutionalPartner[]): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const churnedRecently = partners.filter(
      (p) =>
        p.status === 'churned' &&
        p.metadata.deactivatedAt &&
        new Date(p.metadata.deactivatedAt as string) >= thirtyDaysAgo
    ).length;
    const totalActive = partners.filter((p) => p.status === 'active').length;
    return totalActive > 0 ? (churnedRecently / totalActive) * 100 : 0;
  }

  private calculateGrowthRate(partners: InstitutionalPartner[]): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newRecently = partners.filter((p) => p.createdAt >= thirtyDaysAgo).length;
    const totalBeforeThirtyDays = partners.filter((p) => p.createdAt < thirtyDaysAgo).length;
    return totalBeforeThirtyDays > 0 ? (newRecently / totalBeforeThirtyDays) * 100 : 0;
  }

  private calculateAverageVolume(partners: InstitutionalPartner[]): number {
    if (partners.length === 0) return 0;
    const total = partners.reduce((sum, p) => {
      const vol = parseFloat(p.metrics.totalVolume.replace(/[^0-9.]/g, '') || '0');
      return sum + vol;
    }, 0);
    return total / partners.length;
  }

  private generateHighlights(partner: InstitutionalPartner): string[] {
    const highlights: string[] = [];

    if (partner.metrics.uptime >= 99.9) {
      highlights.push('Excellent uptime (99.9%+)');
    }
    if (partner.tier === 'platinum' || partner.tier === 'gold') {
      highlights.push(`${partner.tier.charAt(0).toUpperCase() + partner.tier.slice(1)} tier partner`);
    }
    if (partner.compliance.kycStatus === 'approved' && partner.compliance.amlStatus === 'compliant') {
      highlights.push('Fully compliant');
    }
    if (partner.integration.integrationLevel === 'full' || partner.integration.integrationLevel === 'advanced') {
      highlights.push('Deep integration');
    }

    return highlights;
  }

  private generateConcerns(partner: InstitutionalPartner): string[] {
    const concerns: string[] = [];

    if (partner.metrics.uptime < 99) {
      concerns.push(`Uptime below threshold (${partner.metrics.uptime}%)`);
    }
    if (partner.compliance.kycStatus === 'expired') {
      concerns.push('KYC expired - renewal required');
    }
    if (partner.compliance.riskRating === 'high') {
      concerns.push('High risk rating');
    }
    if (partner.integration.healthStatus === 'degraded' || partner.integration.healthStatus === 'down') {
      concerns.push(`Integration health: ${partner.integration.healthStatus}`);
    }

    return concerns;
  }

  private evaluateMatch(
    partner: InstitutionalPartner,
    criteria: PartnerCriteria
  ): {
    matchScore: number;
    matchingCriteria: string[];
    missingCriteria: string[];
    estimatedValue: string;
    recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match';
  } {
    const matchingCriteria: string[] = [];
    const missingCriteria: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Check AUM
    if (criteria.minAum) {
      maxScore += 1;
      const partnerAum = parseFloat(partner.profile.aum?.replace(/[^0-9.]/g, '') || '0');
      const minAum = parseFloat(criteria.minAum.replace(/[^0-9.]/g, ''));
      if (partnerAum >= minAum) {
        score += 1;
        matchingCriteria.push('Meets minimum AUM');
      } else {
        missingCriteria.push('Below minimum AUM');
      }
    }

    // Check volume
    if (criteria.minVolume) {
      maxScore += 1;
      const partnerVolume = parseFloat(partner.metrics.totalVolume.replace(/[^0-9.]/g, '') || '0');
      const minVolume = parseFloat(criteria.minVolume.replace(/[^0-9.]/g, ''));
      if (partnerVolume >= minVolume) {
        score += 1;
        matchingCriteria.push('Meets minimum volume');
      } else {
        missingCriteria.push('Below minimum volume');
      }
    }

    // Check capabilities
    if (criteria.requiredCapabilities?.length) {
      for (const cap of criteria.requiredCapabilities) {
        maxScore += 1;
        if (partner.capabilities[cap as keyof PartnerCapabilities]) {
          score += 1;
          matchingCriteria.push(`Has ${cap}`);
        } else {
          missingCriteria.push(`Missing ${cap}`);
        }
      }
    }

    // Check licenses
    if (criteria.requiredLicenses?.length) {
      for (const license of criteria.requiredLicenses) {
        maxScore += 1;
        if (partner.regulatoryStatus.licenses.some((l) => l.type === license && l.status === 'active')) {
          score += 1;
          matchingCriteria.push(`Has ${license} license`);
        } else {
          missingCriteria.push(`Missing ${license} license`);
        }
      }
    }

    // Check regions
    if (criteria.preferredRegions?.length) {
      maxScore += 1;
      if (criteria.preferredRegions.includes(partner.region)) {
        score += 1;
        matchingCriteria.push('In preferred region');
      } else {
        missingCriteria.push('Not in preferred region');
      }
    }

    const matchScore = maxScore > 0 ? score / maxScore : 0;
    let recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match' = 'weak_match';
    if (matchScore >= 0.8) recommendation = 'strong_match';
    else if (matchScore >= 0.6) recommendation = 'good_match';
    else if (matchScore >= 0.4) recommendation = 'partial_match';

    return {
      matchScore,
      matchingCriteria,
      missingCriteria,
      estimatedValue: partner.metrics.totalVolume,
      recommendation,
    };
  }

  private evaluateProspectMatch(
    prospect: PartnerProspect,
    criteria: PartnerCriteria
  ): {
    matchScore: number;
    matchingCriteria: string[];
    missingCriteria: string[];
    estimatedValue: string;
    recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match';
  } {
    const matchingCriteria: string[] = [];
    const missingCriteria: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Check regions
    if (criteria.preferredRegions?.length) {
      maxScore += 1;
      if (criteria.preferredRegions.includes(prospect.region)) {
        score += 1;
        matchingCriteria.push('In preferred region');
      } else {
        missingCriteria.push('Not in preferred region');
      }
    }

    // Prospects have limited information, so we're more lenient
    const matchScore = maxScore > 0 ? score / maxScore : 0.5;
    let recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match' = 'partial_match';
    if (matchScore >= 0.8) recommendation = 'strong_match';
    else if (matchScore >= 0.6) recommendation = 'good_match';
    else if (matchScore >= 0.4) recommendation = 'partial_match';
    else recommendation = 'weak_match';

    return {
      matchScore,
      matchingCriteria,
      missingCriteria,
      estimatedValue: prospect.estimatedValue,
      recommendation,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPartnerRegistryManager(
  config?: Partial<PartnerRegistryConfig>
): DefaultPartnerRegistryManager {
  return new DefaultPartnerRegistryManager(config);
}

// Default export
export default DefaultPartnerRegistryManager;
