/**
 * TONAIAgent - Sanctions Screening Service
 *
 * Provides address and entity screening against major sanctions lists:
 *   - OFAC SDN (US Office of Foreign Assets Control Specially Designated Nationals)
 *   - EU Consolidated Sanctions List
 *   - UN Security Council Sanctions List
 *   - UK HM Treasury Consolidated List
 *
 * Designed for integration with external services (Chainalysis, ComplyAdvantage,
 * Elliptic) while providing a complete in-memory implementation for testing
 * and development environments.
 *
 * Results are cached for 24 hours per the industry standard — addresses are
 * rarely removed from sanctions lists.
 */

import { RegulatoryEventCallback, RegulatoryEvent, RegulatoryEventType } from './types';

// ============================================================================
// Types
// ============================================================================

export type SanctionsList = 'ofac_sdn' | 'eu_consolidated' | 'un_security_council' | 'uk_hm_treasury';

export type SanctionsEntityType = 'individual' | 'entity' | 'vessel' | 'aircraft' | 'crypto_address';

export interface SanctionsMatch {
  list: SanctionsList;
  entityName: string;
  entityType: SanctionsEntityType;
  matchScore: number; // 0-100
  sanctionedSince: Date;
  programs: string[];
  aliases: string[];
  notes?: string;
}

export interface SanctionsScreeningResult {
  address: string;
  screened: boolean;
  isMatch: boolean;
  matches: SanctionsMatch[];
  riskScore: number; // 0-100
  cachedAt: Date;
  cacheExpiresAt: Date;
  provider: 'internal' | 'chainalysis' | 'complyadvantage' | 'elliptic';
}

export interface EntitySanctionsResult {
  entityName: string;
  isMatch: boolean;
  matches: SanctionsMatch[];
  riskScore: number;
  screened: boolean;
  screenedAt: Date;
}

export interface SanctionsScreenerConfig {
  /** Lists to screen against */
  lists?: SanctionsList[];
  /** Cache duration in milliseconds (default: 24 hours) */
  cacheDurationMs?: number;
  /** External provider to use when available */
  provider?: 'internal' | 'chainalysis' | 'complyadvantage' | 'elliptic';
  /** Minimum match score to consider a hit (0-100) */
  matchThreshold?: number;
}

const DEFAULT_CONFIG: Required<SanctionsScreenerConfig> = {
  lists: ['ofac_sdn', 'eu_consolidated', 'un_security_council', 'uk_hm_treasury'],
  cacheDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  provider: 'internal',
  matchThreshold: 85,
};

// ============================================================================
// SanctionsScreener Implementation
// ============================================================================

/**
 * SanctionsScreener — screens blockchain addresses and entities against
 * major international sanctions lists.
 *
 * In production, wire up the `screenAddress` and `screenEntity` methods
 * to call your chosen provider (Chainalysis KYT, ComplyAdvantage, Elliptic).
 * The in-memory blocklist handles both demo/test environments and manual
 * additions from compliance staff.
 *
 * @example
 * ```typescript
 * const screener = createSanctionsScreener();
 *
 * // Pre-load known-bad addresses (e.g. from OFAC download)
 * screener.addSanctionedAddress('EQC...', [{
 *   list: 'ofac_sdn', entityName: 'Sanctioned Entity', entityType: 'crypto_address',
 *   matchScore: 100, sanctionedSince: new Date('2022-01-01'), programs: ['CYBER2'], aliases: []
 * }]);
 *
 * const result = await screener.screenAddress('EQC...');
 * if (result.isMatch) {
 *   throw new Error('Transaction to sanctioned address blocked');
 * }
 * ```
 */
export class SanctionsScreener {
  private readonly config: Required<SanctionsScreenerConfig>;
  private readonly addressCache: Map<string, SanctionsScreeningResult> = new Map();
  private readonly sanctionedAddresses: Map<string, SanctionsMatch[]> = new Map();
  private readonly eventListeners: RegulatoryEventCallback[] = [];
  private screeningCounter = 0;

  constructor(config: SanctionsScreenerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Address Screening
  // ============================================================================

  /**
   * Screen a blockchain address against all configured sanctions lists.
   * Results are cached for 24 hours.
   */
  async screenAddress(address: string): Promise<SanctionsScreeningResult> {
    const normalised = address.trim();

    // Check cache first
    const cached = this.addressCache.get(normalised);
    if (cached && cached.cacheExpiresAt > new Date()) {
      return cached;
    }

    const matches = this.sanctionedAddresses.get(normalised) ?? [];
    const isMatch = matches.some((m) => m.matchScore >= this.config.matchThreshold);
    const riskScore = matches.length > 0 ? Math.max(...matches.map((m) => m.matchScore)) : 0;

    const now = new Date();
    const result: SanctionsScreeningResult = {
      address: normalised,
      screened: true,
      isMatch,
      matches,
      riskScore,
      cachedAt: now,
      cacheExpiresAt: new Date(now.getTime() + this.config.cacheDurationMs),
      provider: this.config.provider,
    };

    this.addressCache.set(normalised, result);
    this.screeningCounter++;

    if (isMatch) {
      this.emitEvent({
        type: 'aml.transaction_blocked',
        timestamp: now,
        payload: {
          address: normalised,
          matchCount: matches.length,
          riskScore,
          lists: matches.map((m) => m.list),
        },
        source: 'sanctions-screener',
      });
    }

    return result;
  }

  /**
   * Screen an entity (person or organisation) by name against sanctions lists.
   */
  async screenEntity(entityName: string): Promise<EntitySanctionsResult> {
    const normalised = entityName.trim().toLowerCase();

    const matches: SanctionsMatch[] = [];
    for (const matchList of this.sanctionedAddresses.values()) {
      for (const match of matchList) {
        const nameLower = match.entityName.toLowerCase();
        const aliasMatch = match.aliases.some((a) => a.toLowerCase().includes(normalised) || normalised.includes(a.toLowerCase()));
        if (nameLower.includes(normalised) || normalised.includes(nameLower) || aliasMatch) {
          matches.push(match);
        }
      }
    }

    const isMatch = matches.some((m) => m.matchScore >= this.config.matchThreshold);
    const riskScore = matches.length > 0 ? Math.max(...matches.map((m) => m.matchScore)) : 0;

    return {
      entityName,
      isMatch,
      matches,
      riskScore,
      screened: true,
      screenedAt: new Date(),
    };
  }

  // ============================================================================
  // Sanctions List Management (Manual / Batch)
  // ============================================================================

  /**
   * Add a sanctioned address to the internal list.
   * Used for loading OFAC/EU/UN/UK list downloads or manual compliance additions.
   */
  addSanctionedAddress(address: string, matches: SanctionsMatch[]): void {
    const normalised = address.trim();
    const existing = this.sanctionedAddresses.get(normalised) ?? [];
    this.sanctionedAddresses.set(normalised, [...existing, ...matches]);
    // Invalidate any cached result for this address
    this.addressCache.delete(normalised);
  }

  /**
   * Remove an address from the sanctions list (e.g. after successful delisting).
   */
  removeSanctionedAddress(address: string): void {
    const normalised = address.trim();
    this.sanctionedAddresses.delete(normalised);
    this.addressCache.delete(normalised);
  }

  /**
   * Bulk-load a sanctions list. Clears and replaces entries for the specified list.
   */
  loadSanctionsList(list: SanctionsList, entries: Array<{ address: string; match: SanctionsMatch }>): void {
    // Remove existing entries for this list
    for (const [addr, matches] of this.sanctionedAddresses.entries()) {
      const filtered = matches.filter((m) => m.list !== list);
      if (filtered.length === 0) {
        this.sanctionedAddresses.delete(addr);
      } else {
        this.sanctionedAddresses.set(addr, filtered);
      }
      this.addressCache.delete(addr);
    }

    // Add new entries
    for (const entry of entries) {
      this.addSanctionedAddress(entry.address, [{ ...entry.match, list }]);
    }

    this.emitEvent({
      type: 'kyc.screening_completed',
      timestamp: new Date(),
      payload: { list, entriesLoaded: entries.length },
      source: 'sanctions-screener',
    });
  }

  /**
   * Check if an address is known to be sanctioned (fast path, no cache lookup).
   */
  isSanctionedAddress(address: string): boolean {
    const normalised = address.trim();
    const matches = this.sanctionedAddresses.get(normalised) ?? [];
    return matches.some((m) => m.matchScore >= this.config.matchThreshold);
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  getMetrics(): { totalScreenings: number; sanctionedAddressCount: number; cachedResults: number } {
    return {
      totalScreenings: this.screeningCounter,
      sanctionedAddressCount: this.sanctionedAddresses.size,
      cachedResults: this.addressCache.size,
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(callback: RegulatoryEventCallback): void {
    this.eventListeners.push(callback);
  }

  private emitEvent(event: Omit<RegulatoryEvent, 'correlationId'> & { type: RegulatoryEventType }): void {
    this.eventListeners.forEach((listener) => listener(event as RegulatoryEvent));
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSanctionsScreener(config?: SanctionsScreenerConfig): SanctionsScreener {
  return new SanctionsScreener(config);
}
