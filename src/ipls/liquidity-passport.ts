/**
 * TONAIAgent - Liquidity Passport System
 *
 * Implements the on-chain Liquidity Passport system for the IPLS framework.
 * Each passport represents a protocol's capital origin, risk profile,
 * compliance status, and jurisdictional flags — enabling institutional-grade
 * cross-protocol trust and interoperability (Issue #124).
 */

import {
  LiquidityPassport,
  PassportId,
  ProtocolId,
  CapitalOrigin,
  PassportRiskProfile,
  PassportCompliance,
  JurisdictionalFlag,
  CreditHistoryEntry,
  PassportEndorsement,
  ChainId,
  IPLSEvent,
  IPLSEventCallback,
  PassportConfig,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface LiquidityPassportManager {
  // Passport lifecycle
  issuePassport(request: IssuePassportRequest): Promise<LiquidityPassport>;
  getPassport(passportId: PassportId): Promise<LiquidityPassport | null>;
  getPassportByHolder(holderId: ProtocolId): Promise<LiquidityPassport | null>;
  updatePassport(passportId: PassportId, updates: UpdatePassportRequest): Promise<LiquidityPassport>;
  renewPassport(passportId: PassportId): Promise<LiquidityPassport>;
  revokePassport(passportId: PassportId, reason: string): Promise<void>;
  listPassports(filters?: PassportFilters): Promise<LiquidityPassport[]>;

  // Capital origin
  updateCapitalOrigin(passportId: PassportId, origin: Partial<CapitalOrigin>): Promise<void>;
  verifyCapitalOrigin(passportId: PassportId): Promise<VerificationResult>;

  // Risk profile
  updateRiskProfile(passportId: PassportId, profile: Partial<PassportRiskProfile>): Promise<void>;
  recalculateRiskScore(passportId: PassportId): Promise<number>;

  // Compliance
  updateCompliance(passportId: PassportId, compliance: Partial<PassportCompliance>): Promise<void>;
  addJurisdictionalFlag(passportId: PassportId, flag: JurisdictionalFlag): Promise<void>;
  removeJurisdictionalFlag(passportId: PassportId, flag: JurisdictionalFlag): Promise<void>;
  checkCompliance(passportId: PassportId, jurisdiction: string): Promise<ComplianceCheckResult>;

  // Credit history
  addCreditEvent(passportId: PassportId, event: Omit<CreditHistoryEntry, 'id'>): Promise<CreditHistoryEntry>;
  getCreditHistory(passportId: PassportId): Promise<CreditHistoryEntry[]>;
  getCreditScore(passportId: PassportId): Promise<number>;

  // Endorsements
  addEndorsement(passportId: PassportId, endorsement: Omit<PassportEndorsement, 'issuedAt'>): Promise<PassportEndorsement>;
  getEndorsements(passportId: PassportId): Promise<PassportEndorsement[]>;
  revokeEndorsement(passportId: PassportId, endorserId: string): Promise<void>;

  // Validation
  validatePassport(passportId: PassportId): Promise<PassportValidationResult>;
  isEligible(holderId: ProtocolId, requirements: PassportRequirements): Promise<EligibilityResult>;

  // Analytics
  getPassportMetrics(): PassportMetrics;

  // Events
  onEvent(callback: IPLSEventCallback): void;

  // Health
  getHealth(): PassportSystemHealth;
}

export interface IssuePassportRequest {
  holderId: ProtocolId;
  holderName: string;
  capitalOrigin: Partial<CapitalOrigin>;
  riskProfile?: Partial<PassportRiskProfile>;
  compliance?: Partial<PassportCompliance>;
  jurisdictionalFlags?: JurisdictionalFlag[];
}

export interface UpdatePassportRequest {
  holderName?: string;
  capitalOrigin?: Partial<CapitalOrigin>;
  riskProfile?: Partial<PassportRiskProfile>;
  compliance?: Partial<PassportCompliance>;
  jurisdictionalFlags?: JurisdictionalFlag[];
}

export interface PassportFilters {
  holderIds?: ProtocolId[];
  riskTiers?: string[];
  complianceStatuses?: string[];
  isExpired?: boolean;
  isRevoked?: boolean;
  hasFlag?: JurisdictionalFlag;
  minCreditScore?: number;
  limit?: number;
  offset?: number;
}

export interface VerificationResult {
  passportId: PassportId;
  verified: boolean;
  verifiedAt: Date;
  issues: string[];
  proofHash?: string;
}

export interface ComplianceCheckResult {
  passportId: PassportId;
  jurisdiction: string;
  eligible: boolean;
  restrictions: string[];
  requiredActions: string[];
  validUntil: Date;
}

export interface PassportRequirements {
  minCreditScore?: number;
  maxRiskScore?: number;
  requiredKycLevel?: 'basic' | 'enhanced' | 'institutional';
  restrictedFlags?: JurisdictionalFlag[];
  requiredEndorsements?: string[];
  maxExposureUsd?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  passportId?: PassportId;
  failureReasons: string[];
  warningReasons: string[];
  validUntil?: Date;
}

export interface PassportValidationResult {
  valid: boolean;
  passportId: PassportId;
  holderId: ProtocolId;
  isExpired: boolean;
  isRevoked: boolean;
  complianceValid: boolean;
  capitalOriginVerified: boolean;
  errors: string[];
  warnings: string[];
}

export interface PassportMetrics {
  totalPassports: number;
  activePassports: number;
  expiredPassports: number;
  revokedPassports: number;
  avgCreditScore: number;
  avgRiskScore: number;
  byRiskTier: Record<string, number>;
  byComplianceStatus: Record<string, number>;
  lastUpdated: Date;
}

export interface PassportSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalPassports: number;
  activePassports: number;
  expiringSoon: number; // expiring within 30 days
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultLiquidityPassportManager implements LiquidityPassportManager {
  private passports: Map<PassportId, LiquidityPassport> = new Map();
  private holderIndex: Map<ProtocolId, PassportId> = new Map();
  private eventCallbacks: IPLSEventCallback[] = [];
  private config: PassportConfig;

  constructor(config?: Partial<PassportConfig>) {
    this.config = {
      enabled: true,
      expiryDays: 365,
      requireKyc: true,
      requireAml: true,
      autoRenewal: false,
      endorsementRequired: false,
      ...config,
    };
  }

  async issuePassport(request: IssuePassportRequest): Promise<LiquidityPassport> {
    if (this.holderIndex.has(request.holderId)) {
      throw new Error(`Passport already exists for holder: ${request.holderId}`);
    }

    const passportId = this.generateId('passport');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.expiryDays * 24 * 60 * 60 * 1000);

    const passport: LiquidityPassport = {
      id: passportId,
      holderId: request.holderId,
      holderName: request.holderName,
      issuedBy: 'ipls_passport_authority',
      capitalOrigin: {
        primaryChain: 'ton' as ChainId,
        sourceProtocols: [],
        capitalType: 'native',
        originVerified: false,
        totalVerifiedCapital: '0',
        segregatedAssets: false,
        lastVerification: now,
        ...request.capitalOrigin,
      },
      riskProfile: {
        riskTier: 'unrated',
        compositeScore: 50,
        liquidityScore: 50,
        creditScore: 500,
        operationalScore: 50,
        complianceScore: 50,
        historicalDefault: false,
        maxHistoricalDrawdown: 0,
        averageReturnRate: 0,
        scoringModelVersion: '1.0.0',
        lastScored: now,
        ...request.riskProfile,
      },
      complianceStatus: {
        status: 'under_review',
        kycLevel: 'basic',
        kycProvider: 'ipls_kyc',
        kycCompletedAt: now,
        kycExpiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        amlScreened: false,
        amlScreenedAt: now,
        sanctions: false,
        pep: false,
        approvedProducts: [],
        restrictions: [],
        ...request.compliance,
      },
      jurisdictionalFlags: request.jurisdictionalFlags || [],
      creditHistory: [],
      endorsements: [],
      version: 1,
      issuedAt: now,
      updatedAt: now,
      expiresAt,
    };

    this.passports.set(passportId, passport);
    this.holderIndex.set(request.holderId, passportId);

    this.emitEvent('passport_issued', request.holderId, 'issue_passport', {
      passportId,
      holderName: request.holderName,
    });

    return passport;
  }

  async getPassport(passportId: PassportId): Promise<LiquidityPassport | null> {
    return this.passports.get(passportId) || null;
  }

  async getPassportByHolder(holderId: ProtocolId): Promise<LiquidityPassport | null> {
    const passportId = this.holderIndex.get(holderId);
    if (!passportId) return null;
    return this.passports.get(passportId) || null;
  }

  async updatePassport(
    passportId: PassportId,
    updates: UpdatePassportRequest
  ): Promise<LiquidityPassport> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }
    if (passport.revokedAt) {
      throw new Error(`Cannot update revoked passport: ${passportId}`);
    }

    const updated: LiquidityPassport = {
      ...passport,
      holderName: updates.holderName || passport.holderName,
      capitalOrigin: updates.capitalOrigin
        ? { ...passport.capitalOrigin, ...updates.capitalOrigin }
        : passport.capitalOrigin,
      riskProfile: updates.riskProfile
        ? { ...passport.riskProfile, ...updates.riskProfile }
        : passport.riskProfile,
      complianceStatus: updates.compliance
        ? { ...passport.complianceStatus, ...updates.compliance }
        : passport.complianceStatus,
      jurisdictionalFlags: updates.jurisdictionalFlags || passport.jurisdictionalFlags,
      version: passport.version + 1,
      updatedAt: new Date(),
    };

    this.passports.set(passportId, updated);

    this.emitEvent('passport_updated', passport.holderId, 'update_passport', {
      passportId,
      version: updated.version,
    });

    return updated;
  }

  async renewPassport(passportId: PassportId): Promise<LiquidityPassport> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }
    if (passport.revokedAt) {
      throw new Error(`Cannot renew revoked passport: ${passportId}`);
    }

    const now = new Date();
    const newExpiry = new Date(now.getTime() + this.config.expiryDays * 24 * 60 * 60 * 1000);

    const renewed: LiquidityPassport = {
      ...passport,
      version: passport.version + 1,
      updatedAt: now,
      expiresAt: newExpiry,
    };

    this.passports.set(passportId, renewed);

    this.emitEvent('passport_updated', passport.holderId, 'renew_passport', {
      passportId,
      newExpiry,
    });

    return renewed;
  }

  async revokePassport(passportId: PassportId, reason: string): Promise<void> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    passport.revokedAt = new Date();
    passport.revocationReason = reason;
    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);

    this.emitEvent('passport_revoked', passport.holderId, 'revoke_passport', {
      passportId,
      reason,
    });
  }

  async listPassports(filters?: PassportFilters): Promise<LiquidityPassport[]> {
    let passports = Array.from(this.passports.values());

    if (filters) {
      if (filters.holderIds?.length) {
        passports = passports.filter((p) => filters.holderIds!.includes(p.holderId));
      }
      if (filters.riskTiers?.length) {
        passports = passports.filter((p) => filters.riskTiers!.includes(p.riskProfile.riskTier));
      }
      if (filters.complianceStatuses?.length) {
        passports = passports.filter((p) =>
          filters.complianceStatuses!.includes(p.complianceStatus.status)
        );
      }
      if (filters.isExpired !== undefined) {
        const now = new Date();
        passports = passports.filter((p) =>
          filters.isExpired ? p.expiresAt < now : p.expiresAt >= now
        );
      }
      if (filters.isRevoked !== undefined) {
        passports = passports.filter((p) =>
          filters.isRevoked ? !!p.revokedAt : !p.revokedAt
        );
      }
      if (filters.hasFlag) {
        passports = passports.filter((p) => p.jurisdictionalFlags.includes(filters.hasFlag!));
      }
      if (filters.minCreditScore !== undefined) {
        passports = passports.filter(
          (p) => p.riskProfile.creditScore >= filters.minCreditScore!
        );
      }

      if (filters.offset !== undefined) {
        passports = passports.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        passports = passports.slice(0, filters.limit);
      }
    }

    return passports;
  }

  async updateCapitalOrigin(passportId: PassportId, origin: Partial<CapitalOrigin>): Promise<void> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    passport.capitalOrigin = { ...passport.capitalOrigin, ...origin };
    passport.version += 1;
    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);
  }

  async verifyCapitalOrigin(passportId: PassportId): Promise<VerificationResult> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    const issues: string[] = [];

    if (!passport.capitalOrigin.primaryChain) {
      issues.push('Primary chain not specified');
    }
    if (passport.capitalOrigin.sourceProtocols.length === 0) {
      issues.push('No source protocols identified');
    }
    if (!passport.capitalOrigin.totalVerifiedCapital || passport.capitalOrigin.totalVerifiedCapital === '0') {
      issues.push('Verified capital amount is zero');
    }

    const verified = issues.length === 0;

    if (verified) {
      passport.capitalOrigin.originVerified = true;
      passport.capitalOrigin.lastVerification = new Date();
      this.passports.set(passportId, passport);
    }

    return {
      passportId,
      verified,
      verifiedAt: new Date(),
      issues,
      proofHash: verified
        ? `0x${Buffer.from(passportId + Date.now()).toString('hex').substring(0, 64)}`
        : undefined,
    };
  }

  async updateRiskProfile(
    passportId: PassportId,
    profile: Partial<PassportRiskProfile>
  ): Promise<void> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    passport.riskProfile = {
      ...passport.riskProfile,
      ...profile,
      lastScored: new Date(),
    };
    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);
  }

  async recalculateRiskScore(passportId: PassportId): Promise<number> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    const weights = {
      liquidity: 0.3,
      credit: 0.3,
      operational: 0.2,
      compliance: 0.2,
    };

    const creditNormalized = Math.min(100, (passport.riskProfile.creditScore / 850) * 100);
    const defaultPenalty = passport.riskProfile.historicalDefault ? 30 : 0;

    const compositeScore = Math.max(
      0,
      Math.min(
        100,
        passport.riskProfile.liquidityScore * weights.liquidity +
          creditNormalized * weights.credit +
          passport.riskProfile.operationalScore * weights.operational +
          passport.riskProfile.complianceScore * weights.compliance -
          defaultPenalty
      )
    );

    passport.riskProfile.compositeScore = compositeScore;
    passport.riskProfile.lastScored = new Date();

    // Update risk tier based on composite score
    if (compositeScore >= 80) {
      passport.riskProfile.riskTier = 'tier1';
    } else if (compositeScore >= 60) {
      passport.riskProfile.riskTier = 'tier2';
    } else if (compositeScore >= 40) {
      passport.riskProfile.riskTier = 'tier3';
    } else {
      passport.riskProfile.riskTier = 'unrated';
    }

    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);

    return compositeScore;
  }

  async updateCompliance(
    passportId: PassportId,
    compliance: Partial<PassportCompliance>
  ): Promise<void> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    passport.complianceStatus = { ...passport.complianceStatus, ...compliance };
    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);

    this.emitEvent('passport_updated', passport.holderId, 'update_compliance', {
      passportId,
      newStatus: passport.complianceStatus.status,
    });
  }

  async addJurisdictionalFlag(
    passportId: PassportId,
    flag: JurisdictionalFlag
  ): Promise<void> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    if (!passport.jurisdictionalFlags.includes(flag)) {
      passport.jurisdictionalFlags.push(flag);
      passport.updatedAt = new Date();
      this.passports.set(passportId, passport);
    }
  }

  async removeJurisdictionalFlag(
    passportId: PassportId,
    flag: JurisdictionalFlag
  ): Promise<void> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    passport.jurisdictionalFlags = passport.jurisdictionalFlags.filter((f) => f !== flag);
    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);
  }

  async checkCompliance(
    passportId: PassportId,
    jurisdiction: string
  ): Promise<ComplianceCheckResult> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    const restrictions: string[] = [];
    const requiredActions: string[] = [];

    if (passport.complianceStatus.sanctions) {
      restrictions.push('Sanctioned entity — operations prohibited');
    }
    if (passport.jurisdictionalFlags.includes('sanctioned')) {
      restrictions.push('Sanctioned jurisdiction flag detected');
    }
    if (passport.complianceStatus.kycExpiresAt < new Date()) {
      requiredActions.push('KYC renewal required');
    }
    if (!passport.complianceStatus.amlScreened) {
      requiredActions.push('AML screening required');
    }

    const jurisdictionSpecificRules: Record<string, JurisdictionalFlag[]> = {
      US: ['us_person'],
      EU: ['eu_mifid'],
      UK: ['uk_fca'],
      SG: ['sg_mas'],
      CH: ['ch_finma'],
    };

    const restrictedFlags = jurisdictionSpecificRules[jurisdiction.toUpperCase()] || [];
    for (const flag of restrictedFlags) {
      if (passport.jurisdictionalFlags.includes(flag)) {
        requiredActions.push(`${jurisdiction} regulatory requirements apply for flag: ${flag}`);
      }
    }

    return {
      passportId,
      jurisdiction,
      eligible: restrictions.length === 0,
      restrictions,
      requiredActions,
      validUntil: passport.complianceStatus.kycExpiresAt,
    };
  }

  async addCreditEvent(
    passportId: PassportId,
    event: Omit<CreditHistoryEntry, 'id'>
  ): Promise<CreditHistoryEntry> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    const creditEntry: CreditHistoryEntry = {
      ...event,
      id: this.generateId('credit'),
    };

    passport.creditHistory.push(creditEntry);

    // Update default flag if applicable
    if (event.outcome === 'default') {
      passport.riskProfile.historicalDefault = true;
    }

    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);

    // Recalculate credit score
    await this.recalculateCreditScore(passportId);

    return creditEntry;
  }

  async getCreditHistory(passportId: PassportId): Promise<CreditHistoryEntry[]> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    return [...passport.creditHistory].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getCreditScore(passportId: PassportId): Promise<number> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    return passport.riskProfile.creditScore;
  }

  async addEndorsement(
    passportId: PassportId,
    endorsement: Omit<PassportEndorsement, 'issuedAt'>
  ): Promise<PassportEndorsement> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    const fullEndorsement: PassportEndorsement = {
      ...endorsement,
      issuedAt: new Date(),
    };

    // Replace existing endorsement from same endorser
    passport.endorsements = passport.endorsements.filter(
      (e) => e.endorserId !== endorsement.endorserId
    );
    passport.endorsements.push(fullEndorsement);
    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);

    return fullEndorsement;
  }

  async getEndorsements(passportId: PassportId): Promise<PassportEndorsement[]> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    const now = new Date();
    return passport.endorsements.filter((e) => e.validUntil >= now);
  }

  async revokeEndorsement(passportId: PassportId, endorserId: string): Promise<void> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      throw new Error(`Passport not found: ${passportId}`);
    }

    passport.endorsements = passport.endorsements.filter((e) => e.endorserId !== endorserId);
    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);
  }

  async validatePassport(passportId: PassportId): Promise<PassportValidationResult> {
    const passport = this.passports.get(passportId);
    if (!passport) {
      return {
        valid: false,
        passportId,
        holderId: '',
        isExpired: false,
        isRevoked: false,
        complianceValid: false,
        capitalOriginVerified: false,
        errors: ['Passport not found'],
        warnings: [],
      };
    }

    const now = new Date();
    const errors: string[] = [];
    const warnings: string[] = [];

    const isRevoked = !!passport.revokedAt;
    const isExpired = passport.expiresAt < now;

    if (isRevoked) errors.push(`Passport revoked: ${passport.revocationReason}`);
    if (isExpired) errors.push('Passport has expired');

    if (passport.complianceStatus.sanctions) {
      errors.push('Sanctioned entity — passport invalid for operations');
    }
    if (!passport.complianceStatus.amlScreened) {
      warnings.push('AML screening not completed');
    }
    if (passport.complianceStatus.kycExpiresAt < now) {
      errors.push('KYC has expired');
    }

    const expiringThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (!isExpired && passport.expiresAt < expiringThreshold) {
      warnings.push('Passport expiring within 30 days');
    }

    const complianceValid =
      !passport.complianceStatus.sanctions &&
      passport.complianceStatus.kycExpiresAt >= now;

    return {
      valid: errors.length === 0,
      passportId,
      holderId: passport.holderId,
      isExpired,
      isRevoked,
      complianceValid,
      capitalOriginVerified: passport.capitalOrigin.originVerified,
      errors,
      warnings,
    };
  }

  async isEligible(
    holderId: ProtocolId,
    requirements: PassportRequirements
  ): Promise<EligibilityResult> {
    const passport = await this.getPassportByHolder(holderId);
    if (!passport) {
      return {
        eligible: false,
        failureReasons: ['No passport found for holder'],
        warningReasons: [],
      };
    }

    const validation = await this.validatePassport(passport.id);
    if (!validation.valid) {
      return {
        eligible: false,
        passportId: passport.id,
        failureReasons: validation.errors,
        warningReasons: validation.warnings,
      };
    }

    const failures: string[] = [];
    const warnings: string[] = [];

    if (requirements.minCreditScore && passport.riskProfile.creditScore < requirements.minCreditScore) {
      failures.push(`Credit score ${passport.riskProfile.creditScore} below minimum ${requirements.minCreditScore}`);
    }

    if (requirements.maxRiskScore && passport.riskProfile.compositeScore > requirements.maxRiskScore) {
      failures.push(`Risk score ${passport.riskProfile.compositeScore} exceeds maximum ${requirements.maxRiskScore}`);
    }

    if (requirements.requiredKycLevel) {
      const kycLevels = ['basic', 'enhanced', 'institutional'];
      const currentLevel = kycLevels.indexOf(passport.complianceStatus.kycLevel);
      const requiredLevel = kycLevels.indexOf(requirements.requiredKycLevel);
      if (currentLevel < requiredLevel) {
        failures.push(`KYC level ${passport.complianceStatus.kycLevel} insufficient; required ${requirements.requiredKycLevel}`);
      }
    }

    if (requirements.restrictedFlags) {
      for (const flag of requirements.restrictedFlags) {
        if (passport.jurisdictionalFlags.includes(flag)) {
          failures.push(`Restricted jurisdictional flag present: ${flag}`);
        }
      }
    }

    if (requirements.requiredEndorsements) {
      const activeEndorsements = await this.getEndorsements(passport.id);
      const endorserIds = new Set(activeEndorsements.map((e) => e.endorserId));
      for (const required of requirements.requiredEndorsements) {
        if (!endorserIds.has(required)) {
          warnings.push(`Missing endorsement from: ${required}`);
        }
      }
    }

    return {
      eligible: failures.length === 0,
      passportId: passport.id,
      failureReasons: failures,
      warningReasons: warnings,
      validUntil: passport.expiresAt,
    };
  }

  getPassportMetrics(): PassportMetrics {
    const passports = Array.from(this.passports.values());
    const now = new Date();

    const activePassports = passports.filter((p) => !p.revokedAt && p.expiresAt >= now);
    const expiredPassports = passports.filter((p) => !p.revokedAt && p.expiresAt < now);
    const revokedPassports = passports.filter((p) => !!p.revokedAt);

    const avgCredit =
      activePassports.length > 0
        ? activePassports.reduce((sum, p) => sum + p.riskProfile.creditScore, 0) /
          activePassports.length
        : 0;

    const avgRisk =
      activePassports.length > 0
        ? activePassports.reduce((sum, p) => sum + p.riskProfile.compositeScore, 0) /
          activePassports.length
        : 0;

    const byRiskTier: Record<string, number> = {};
    const byComplianceStatus: Record<string, number> = {};

    for (const p of passports) {
      byRiskTier[p.riskProfile.riskTier] = (byRiskTier[p.riskProfile.riskTier] || 0) + 1;
      byComplianceStatus[p.complianceStatus.status] =
        (byComplianceStatus[p.complianceStatus.status] || 0) + 1;
    }

    return {
      totalPassports: passports.length,
      activePassports: activePassports.length,
      expiredPassports: expiredPassports.length,
      revokedPassports: revokedPassports.length,
      avgCreditScore: avgCredit,
      avgRiskScore: avgRisk,
      byRiskTier,
      byComplianceStatus,
      lastUpdated: new Date(),
    };
  }

  onEvent(callback: IPLSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): PassportSystemHealth {
    const passports = Array.from(this.passports.values());
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activePassports = passports.filter((p) => !p.revokedAt && p.expiresAt >= now);
    const expiringSoon = passports.filter(
      (p) => !p.revokedAt && p.expiresAt >= now && p.expiresAt < thirtyDaysFromNow
    );

    const issues: string[] = [];
    if (expiringSoon.length > 0) {
      issues.push(`${expiringSoon.length} passports expiring within 30 days`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      totalPassports: passports.length,
      activePassports: activePassports.length,
      expiringSoon: expiringSoon.length,
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
    type: IPLSEvent['type'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: IPLSEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      severity: 'info',
      source: 'liquidity_passport',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedProtocols: [sourceId],
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

  private async recalculateCreditScore(passportId: PassportId): Promise<void> {
    const passport = this.passports.get(passportId);
    if (!passport) return;

    let score = 600; // base score

    const history = passport.creditHistory;
    const onTimeEvents = history.filter((e) => e.outcome === 'on_time').length;
    const lateEvents = history.filter((e) => e.outcome === 'late').length;
    const defaultEvents = history.filter((e) => e.outcome === 'default').length;
    const earlyRepayEvents = history.filter((e) => e.outcome === 'on_time').length;

    score += onTimeEvents * 10;
    score += earlyRepayEvents * 15;
    score -= lateEvents * 20;
    score -= defaultEvents * 100;

    if (passport.riskProfile.historicalDefault) {
      score = Math.min(score, 550);
    }

    passport.riskProfile.creditScore = Math.max(300, Math.min(850, score));
    passport.updatedAt = new Date();
    this.passports.set(passportId, passport);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLiquidityPassportManager(
  config?: Partial<PassportConfig>
): DefaultLiquidityPassportManager {
  return new DefaultLiquidityPassportManager(config);
}

export default DefaultLiquidityPassportManager;
