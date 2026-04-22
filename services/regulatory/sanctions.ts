/**
 * TONAIAgent - Sanctions Screening Service
 *
 * Provides address and entity screening against major sanctions lists:
 *   - OFAC SDN (US Office of Foreign Assets Control Specially Designated Nationals)
 *   - EU Consolidated Sanctions List
 *   - UN Security Council Sanctions List
 *   - UK HM Treasury Consolidated List
 *
 * Primary on-chain screening: Chainalysis KYT
 * Name/entity screening:      OpenSanctions
 * Fallback:                   Internal in-memory list (pre-loaded via ListDownloader)
 *
 * Fail-closed policy: when a live provider is configured and unreachable, the
 * screener blocks (returns isMatch=true with a provider-error flag) instead of
 * silently passing the address through.
 *
 * Results are cached per (address, listVersion) for 24 hours.
 */

import { RegulatoryEventCallback, RegulatoryEvent, RegulatoryEventType } from './types';
import {
  ChainalysisProvider,
  ChainalysisConfig,
  createChainalysisProvider,
} from './providers/chainalysis';
import {
  OpenSanctionsProvider,
  OpenSanctionsConfig,
  createOpenSanctionsProvider,
} from './providers/opensanctions';

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
  provider: 'internal' | 'chainalysis' | 'complyadvantage' | 'elliptic' | 'opensanctions';
  /** True when the result is a fail-closed block due to a provider error */
  providerError?: boolean;
  /** Populated when providerError is true */
  providerErrorMessage?: string;
  /** The list version this result was cached against */
  listVersion?: string;
}

export interface EntitySanctionsResult {
  entityName: string;
  isMatch: boolean;
  matches: SanctionsMatch[];
  riskScore: number;
  screened: boolean;
  screenedAt: Date;
  provider: 'internal' | 'opensanctions';
  providerError?: boolean;
  providerErrorMessage?: string;
}

// ============================================================================
// Metrics
// ============================================================================

export interface SanctionsMetrics {
  totalScreenings: number;
  sanctionedAddressCount: number;
  cachedResults: number;
  /** Counters by provider and result (match|no_match|error) */
  checkTotal: Record<string, number>;
  /** Total duration in ms across all live provider calls */
  totalProviderDurationMs: number;
  /** Number of live provider calls */
  providerCallCount: number;
}

// ============================================================================
// Config
// ============================================================================

export interface SanctionsScreenerConfig {
  /** Lists to screen against */
  lists?: SanctionsList[];
  /** Cache duration in milliseconds (default: 24 hours) */
  cacheDurationMs?: number;
  /** External provider to use when available */
  provider?: 'internal' | 'chainalysis' | 'complyadvantage' | 'elliptic';
  /** Minimum match score to consider a hit (0-100) */
  matchThreshold?: number;
  /**
   * When true and a live provider is configured but unreachable, the screener
   * blocks (isMatch=true, providerError=true) rather than silently passing.
   * Default: true
   */
  failClosed?: boolean;
  /** Chainalysis KYT provider config. Required when provider='chainalysis'. */
  chainalysis?: ChainalysisConfig;
  /** OpenSanctions provider config for entity name screening. */
  openSanctions?: OpenSanctionsConfig;
  /** A string identifying the current list data version (e.g. ISO date). Used for cache keying. */
  listVersion?: string;
}

const DEFAULT_CONFIG: Required<Omit<SanctionsScreenerConfig, 'chainalysis' | 'openSanctions'>> = {
  lists: ['ofac_sdn', 'eu_consolidated', 'un_security_council', 'uk_hm_treasury'],
  cacheDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  provider: 'internal',
  matchThreshold: 85,
  failClosed: true,
  listVersion: 'default',
};

// ============================================================================
// SanctionsScreener Implementation
// ============================================================================

/**
 * SanctionsScreener — screens blockchain addresses and entities against
 * major international sanctions lists.
 *
 * Provider hierarchy:
 *   1. Chainalysis KYT (if configured) — for address screening
 *   2. OpenSanctions (if configured) — for entity name screening
 *   3. Internal in-memory list — fallback / pre-loaded list data
 *
 * @example
 * ```typescript
 * // Production: Chainalysis + OpenSanctions
 * const screener = createSanctionsScreener({
 *   provider: 'chainalysis',
 *   chainalysis: { apiKey: secrets.get('CHAINALYSIS_API_KEY') },
 *   openSanctions: { apiKey: secrets.get('OPENSANCTIONS_API_KEY') },
 *   failClosed: true,
 * });
 *
 * const result = await screener.screenAddress('EQC...');
 * if (result.isMatch) throw new Error('Sanctioned address blocked');
 *
 * // Development: internal list only
 * const screener = createSanctionsScreener({ provider: 'internal' });
 * screener.addSanctionedAddress('EQC...', [{ list: 'ofac_sdn', ... }]);
 * ```
 */
export class SanctionsScreener {
  private readonly config: Required<Omit<SanctionsScreenerConfig, 'chainalysis' | 'openSanctions'>>;
  private readonly chainalysis?: ChainalysisProvider;
  private readonly openSanctions?: OpenSanctionsProvider;

  /** Cache key: `${address}::${listVersion}` → result */
  private readonly addressCache: Map<string, SanctionsScreeningResult> = new Map();
  private readonly sanctionedAddresses: Map<string, SanctionsMatch[]> = new Map();
  private readonly eventListeners: RegulatoryEventCallback[] = [];

  private readonly metrics: SanctionsMetrics = {
    totalScreenings: 0,
    sanctionedAddressCount: 0,
    cachedResults: 0,
    checkTotal: {},
    totalProviderDurationMs: 0,
    providerCallCount: 0,
  };

  constructor(config: SanctionsScreenerConfig = {}) {
    this.config = {
      lists: config.lists ?? DEFAULT_CONFIG.lists,
      cacheDurationMs: config.cacheDurationMs ?? DEFAULT_CONFIG.cacheDurationMs,
      provider: config.provider ?? DEFAULT_CONFIG.provider,
      matchThreshold: config.matchThreshold ?? DEFAULT_CONFIG.matchThreshold,
      failClosed: config.failClosed ?? DEFAULT_CONFIG.failClosed,
      listVersion: config.listVersion ?? DEFAULT_CONFIG.listVersion,
    };

    if (config.chainalysis) {
      this.chainalysis = createChainalysisProvider(config.chainalysis);
    }
    if (config.openSanctions) {
      this.openSanctions = createOpenSanctionsProvider(config.openSanctions);
    }
  }

  // ============================================================================
  // Address Screening
  // ============================================================================

  /**
   * Screen a blockchain address against all configured sanctions lists.
   *
   * Provider precedence:
   *   1. Chainalysis KYT (if apiKey configured)
   *   2. Internal in-memory list
   *
   * Results are cached per (address, listVersion) for cacheDurationMs.
   */
  async screenAddress(address: string): Promise<SanctionsScreeningResult> {
    const normalised = address.trim();
    const cacheKey = `${normalised}::${this.config.listVersion}`;

    const cached = this.addressCache.get(cacheKey);
    if (cached && cached.cacheExpiresAt > new Date()) {
      this.incrementMetric('cached_hit', 'cached');
      return cached;
    }

    let result: SanctionsScreeningResult;

    if (this.chainalysis) {
      result = await this.screenAddressViaChainalysis(normalised);
    } else {
      result = this.screenAddressInternal(normalised);
    }

    this.addressCache.set(cacheKey, result);
    this.metrics.totalScreenings++;
    this.metrics.sanctionedAddressCount = this.sanctionedAddresses.size;
    this.metrics.cachedResults = this.addressCache.size;

    if (result.isMatch && !result.providerError) {
      this.emitMatchEvent(normalised, result);
    }

    return result;
  }

  /**
   * Screen an entity (person or organisation) by name against sanctions lists.
   *
   * Provider precedence:
   *   1. OpenSanctions (if apiKey configured)
   *   2. Internal in-memory entity name search
   */
  async screenEntity(entityName: string): Promise<EntitySanctionsResult> {
    if (this.openSanctions) {
      return this.screenEntityViaOpenSanctions(entityName);
    }
    return this.screenEntityInternal(entityName);
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
    this.invalidateAddressCache(normalised);
  }

  /**
   * Remove an address from the sanctions list (e.g. after successful delisting).
   */
  removeSanctionedAddress(address: string): void {
    const normalised = address.trim();
    this.sanctionedAddresses.delete(normalised);
    this.invalidateAddressCache(normalised);
  }

  /**
   * Bulk-load a sanctions list. Clears and replaces entries for the specified list.
   */
  loadSanctionsList(list: SanctionsList, entries: Array<{ address: string; match: SanctionsMatch }>): void {
    for (const [addr, matches] of this.sanctionedAddresses.entries()) {
      const filtered = matches.filter((m) => m.list !== list);
      if (filtered.length === 0) {
        this.sanctionedAddresses.delete(addr);
      } else {
        this.sanctionedAddresses.set(addr, filtered);
      }
      this.invalidateAddressCache(addr);
    }

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

  /**
   * Update the list version string. All existing address cache entries become
   * stale (they will be re-screened on next access).
   */
  setListVersion(version: string): void {
    (this.config as { listVersion: string }).listVersion = version;
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  getMetrics(): SanctionsMetrics {
    return { ...this.metrics, checkTotal: { ...this.metrics.checkTotal } };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(callback: RegulatoryEventCallback): void {
    this.eventListeners.push(callback);
  }

  // ============================================================================
  // Private — Provider Calls
  // ============================================================================

  private async screenAddressViaChainalysis(address: string): Promise<SanctionsScreeningResult> {
    const now = new Date();
    const start = Date.now();

    try {
      const chainalysisResult = await this.chainalysis!.screenAddress(address);
      const durationMs = Date.now() - start;
      this.metrics.totalProviderDurationMs += durationMs;
      this.metrics.providerCallCount++;

      const matches = this.chainalysis!.toSanctionsMatches(chainalysisResult);
      const isMatch = chainalysisResult.sanctioned &&
        matches.some((m) => m.matchScore >= this.config.matchThreshold);
      const riskScore = chainalysisResult.riskScore;

      const result: SanctionsScreeningResult = {
        address,
        screened: true,
        isMatch,
        matches,
        riskScore,
        cachedAt: now,
        cacheExpiresAt: new Date(now.getTime() + this.config.cacheDurationMs),
        provider: 'chainalysis',
        listVersion: this.config.listVersion,
      };

      this.incrementMetric('chainalysis', isMatch ? 'match' : 'no_match');
      return result;

    } catch (err) {
      const durationMs = Date.now() - start;
      this.metrics.totalProviderDurationMs += durationMs;
      this.metrics.providerCallCount++;
      this.incrementMetric('chainalysis', 'error');

      const message = err instanceof Error ? err.message : String(err);

      if (this.config.failClosed) {
        // Block the trade — provider unavailable, fail-closed
        const result: SanctionsScreeningResult = {
          address,
          screened: false,
          isMatch: true,
          matches: [],
          riskScore: 100,
          cachedAt: now,
          // Don't cache error results for long — retry quickly
          cacheExpiresAt: new Date(now.getTime() + 60_000),
          provider: 'chainalysis',
          providerError: true,
          providerErrorMessage: message,
          listVersion: this.config.listVersion,
        };

        this.emitEvent({
          type: 'aml.transaction_blocked',
          timestamp: now,
          payload: { address, reason: 'provider_error', provider: 'chainalysis', error: message },
          source: 'sanctions-screener',
        });

        return result;
      }

      // Fail-open fallback: use internal list
      return this.screenAddressInternal(address);
    }
  }

  private screenAddressInternal(address: string): SanctionsScreeningResult {
    const now = new Date();
    const matches = this.sanctionedAddresses.get(address) ?? [];
    const isMatch = matches.some((m) => m.matchScore >= this.config.matchThreshold);
    const riskScore = matches.length > 0 ? Math.max(...matches.map((m) => m.matchScore)) : 0;

    this.incrementMetric('internal', isMatch ? 'match' : 'no_match');

    return {
      address,
      screened: true,
      isMatch,
      matches,
      riskScore,
      cachedAt: now,
      cacheExpiresAt: new Date(now.getTime() + this.config.cacheDurationMs),
      provider: 'internal',
      listVersion: this.config.listVersion,
    };
  }

  private async screenEntityViaOpenSanctions(entityName: string): Promise<EntitySanctionsResult> {
    const now = new Date();
    const start = Date.now();

    try {
      const osResult = await this.openSanctions!.screenEntity(entityName);
      const durationMs = Date.now() - start;
      this.metrics.totalProviderDurationMs += durationMs;
      this.metrics.providerCallCount++;

      const matches = this.openSanctions!.toSanctionsMatches(osResult);
      const isMatch = osResult.hasHit && matches.some((m) => m.matchScore >= this.config.matchThreshold);
      const riskScore = matches.length > 0 ? Math.max(...matches.map((m) => m.matchScore)) : 0;

      this.incrementMetric('opensanctions', isMatch ? 'match' : 'no_match');

      if (isMatch) {
        this.emitEvent({
          type: 'aml.transaction_flagged',
          timestamp: now,
          payload: {
            entityName,
            matchCount: matches.length,
            riskScore,
            lists: [...new Set(matches.map((m) => m.list))],
            provider: 'opensanctions',
          },
          source: 'sanctions-screener',
        });
      }

      return {
        entityName,
        isMatch,
        matches,
        riskScore,
        screened: true,
        screenedAt: now,
        provider: 'opensanctions',
      };

    } catch (err) {
      const durationMs = Date.now() - start;
      this.metrics.totalProviderDurationMs += durationMs;
      this.metrics.providerCallCount++;
      this.incrementMetric('opensanctions', 'error');

      const message = err instanceof Error ? err.message : String(err);

      if (this.config.failClosed) {
        return {
          entityName,
          isMatch: true,
          matches: [],
          riskScore: 100,
          screened: false,
          screenedAt: now,
          provider: 'opensanctions',
          providerError: true,
          providerErrorMessage: message,
        };
      }

      return this.screenEntityInternal(entityName);
    }
  }

  private screenEntityInternal(entityName: string): EntitySanctionsResult {
    const normalised = entityName.trim().toLowerCase();
    const matches: SanctionsMatch[] = [];

    for (const matchList of this.sanctionedAddresses.values()) {
      for (const match of matchList) {
        const nameLower = match.entityName.toLowerCase();
        const aliasMatch = match.aliases.some(
          (a) => a.toLowerCase().includes(normalised) || normalised.includes(a.toLowerCase())
        );
        if (nameLower.includes(normalised) || normalised.includes(nameLower) || aliasMatch) {
          matches.push(match);
        }
      }
    }

    const isMatch = matches.some((m) => m.matchScore >= this.config.matchThreshold);
    const riskScore = matches.length > 0 ? Math.max(...matches.map((m) => m.matchScore)) : 0;

    this.incrementMetric('internal', isMatch ? 'match' : 'no_match');

    return {
      entityName,
      isMatch,
      matches,
      riskScore,
      screened: true,
      screenedAt: new Date(),
      provider: 'internal',
    };
  }

  // ============================================================================
  // Private — Helpers
  // ============================================================================

  private invalidateAddressCache(address: string): void {
    for (const key of this.addressCache.keys()) {
      if (key.startsWith(`${address}::`)) {
        this.addressCache.delete(key);
      }
    }
  }

  private incrementMetric(provider: string, result: 'match' | 'no_match' | 'error' | 'cached'): void {
    const key = `${provider}:${result}`;
    this.metrics.checkTotal[key] = (this.metrics.checkTotal[key] ?? 0) + 1;
  }

  private emitMatchEvent(address: string, result: SanctionsScreeningResult): void {
    this.emitEvent({
      type: 'aml.transaction_blocked',
      timestamp: new Date(),
      payload: {
        address,
        matchCount: result.matches.length,
        riskScore: result.riskScore,
        lists: result.matches.map((m) => m.list),
        provider: result.provider,
      },
      source: 'sanctions-screener',
    });
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
