/**
 * Chainalysis KYT (Know Your Transaction) Provider
 *
 * Integrates with the Chainalysis KYT v2 API for on-chain address screening.
 * Docs: https://docs.chainalysis.com/api/kyt/
 *
 * Fail-closed: when the provider is unreachable and enforcement is enabled,
 * this adapter throws so callers can block the trade.
 */

import type { SanctionsMatch, SanctionsList } from '../sanctions';

// ============================================================================
// Types
// ============================================================================

export interface ChainalysisConfig {
  apiKey: string;
  /** Base URL — override for testing. Default: https://api.chainalysis.com */
  baseUrl?: string;
  /** Request timeout in ms. Default: 10 000 */
  timeoutMs?: number;
  /**
   * Numeric risk score (0-100) at or above which an address is blocked even
   * without a sanction/illicit identification. `severe`→100, `high`→85.
   * Default: 85 (blocks `severe` and `high`).
   */
  riskScoreThreshold?: number;
  /**
   * Additional illicit cluster/identification categories that should trigger a
   * block, beyond the built-in sanction + illicit defaults. Matched after
   * normalisation (lower-cased, spaces/hyphens → underscores).
   */
  illicitCategories?: string[];
}

export interface ChainalysisScreeningResult {
  address: string;
  cluster?: {
    name: string;
    category: string;
  };
  identifications: ChainalysisIdentification[];
  riskScore: number; // 0-100
  sanctioned: boolean;
}

interface ChainalysisIdentification {
  category: string;
  name: string;
  description?: string;
}

/** Chainalysis API entity response shape (subset we use) */
interface ChainalysisAddressResponse {
  address: string;
  risk: string;
  cluster?: {
    name: string;
    category: string;
  };
  identifications?: Array<{
    category: string;
    name: string;
    description?: string;
  }>;
}

// ============================================================================
// Risk category to SanctionsList mapping
// ============================================================================

const SANCTIONS_CATEGORY_MAP: Record<string, SanctionsList> = {
  'sanctions': 'ofac_sdn',
  'ofac_sdn': 'ofac_sdn',
  'eu_sanctions': 'eu_consolidated',
  'uk_hmt': 'uk_hm_treasury',
  'un_sanctions': 'un_security_council',
};

/**
 * Non-sanction categories that nevertheless represent illicit activity and must
 * gate the block decision. Chainalysis surfaces these as cluster/identification
 * categories. Keys are stored normalised (lower-cased, spaces/hyphens → `_`).
 */
const DEFAULT_ILLICIT_CATEGORIES: readonly string[] = [
  'terrorist_financing',
  'terrorism',
  'stolen_funds',
  'theft',
  'ransomware',
  'child_abuse_material',
  'child_sexual_abuse_material',
  'csam',
  'darknet_market',
  'dark_market',
  'human_trafficking',
  'scam',
  'fraud_shop',
  'malware',
  'illicit_actor',
  'illicit',
  'mixing',
  'mixer',
];

/** Normalise a category for map/list lookup. */
function normaliseCategory(category: string): string {
  return category.toLowerCase().trim().replace(/[\s-]+/g, '_');
}

function categoryToList(category: string): SanctionsList {
  return SANCTIONS_CATEGORY_MAP[normaliseCategory(category)] ?? 'ofac_sdn';
}

/** True when the category maps to a known sanctions list. */
function isSanctionCategory(category: string): boolean {
  return normaliseCategory(category) in SANCTIONS_CATEGORY_MAP;
}

function riskStringToScore(risk: string): number {
  switch (risk.toLowerCase()) {
    case 'severe': return 100;
    case 'high': return 85;
    case 'medium': return 60;
    case 'low': return 20;
    default: return 0;
  }
}

/** Score assigned to a definitive (sanction/cluster/identification) match. */
const DEFINITIVE_MATCH_SCORE = 100;

// ============================================================================
// Provider
// ============================================================================

export class ChainalysisProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly riskScoreThreshold: number;
  private readonly illicitCategories: Set<string>;

  constructor(config: ChainalysisConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.chainalysis.com').replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.riskScoreThreshold = config.riskScoreThreshold ?? 85;
    // Illicit set = sanction-list keys ∪ built-in illicit defaults ∪ caller extras.
    this.illicitCategories = new Set<string>([
      ...Object.keys(SANCTIONS_CATEGORY_MAP),
      ...DEFAULT_ILLICIT_CATEGORIES,
      ...(config.illicitCategories ?? []).map(normaliseCategory),
    ]);
  }

  /** True when a category is a sanction OR otherwise-illicit category. */
  private isIllicitCategory(category: string): boolean {
    return this.illicitCategories.has(normaliseCategory(category));
  }

  /**
   * Screen a blockchain address via Chainalysis KYT.
   * Throws on network errors so callers can fail-closed.
   */
  async screenAddress(address: string): Promise<ChainalysisScreeningResult> {
    const url = `${this.baseUrl}/api/kyt/v2/users/${encodeURIComponent(address)}/summary`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Token': this.apiKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Chainalysis provider unreachable: ${msg}`);
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 404) {
      // Address not known to Chainalysis — treat as clean
      return {
        address,
        identifications: [],
        riskScore: 0,
        sanctioned: false,
      };
    }

    if (!response.ok) {
      throw new Error(`Chainalysis API error: HTTP ${response.status}`);
    }

    const data: ChainalysisAddressResponse = await response.json() as ChainalysisAddressResponse;
    const riskScore = riskStringToScore(data.risk ?? '');
    const identifications = data.identifications ?? [];

    // Drive the block decision from ALL available signals, not a bare
    // `includes('sanction')` substring:
    //   1. identification categories mapped via the illicit/sanctions list,
    //   2. the cluster category against the same list,
    //   3. a numeric risk score at/above the configured threshold.
    const identificationHit = identifications.some((id) => this.isIllicitCategory(id.category));
    const clusterHit = data.cluster ? this.isIllicitCategory(data.cluster.category) : false;
    const riskHit = riskScore >= this.riskScoreThreshold;
    const sanctioned = identificationHit || clusterHit || riskHit;

    return {
      address: data.address ?? address,
      cluster: data.cluster,
      identifications: identifications.map((id) => ({
        category: id.category,
        name: id.name,
        description: id.description,
      })),
      riskScore,
      sanctioned,
    };
  }

  /**
   * Convert a Chainalysis result to the internal SanctionsMatch[] format.
   *
   * Matches are derived from every blocking signal — illicit/sanctioned
   * identifications (mapped via the category list), an illicit cluster category,
   * and, when nothing else matches, a high numeric risk score — so that a
   * `severe`/`high` risk address or a flagged illicit cluster is not silently
   * passed through just because no identification literally says "sanction".
   */
  toSanctionsMatches(result: ChainalysisScreeningResult): SanctionsMatch[] {
    const matches: SanctionsMatch[] = [];

    // 1. Identifications whose category is in the illicit/sanctions list.
    for (const id of result.identifications) {
      if (!this.isIllicitCategory(id.category)) continue;
      matches.push({
        list: categoryToList(id.category),
        entityName: id.name,
        entityType: 'crypto_address',
        matchScore: isSanctionCategory(id.category)
          ? DEFINITIVE_MATCH_SCORE
          : Math.max(result.riskScore, this.riskScoreThreshold),
        sanctionedSince: new Date(0), // Chainalysis doesn't expose listing date in this endpoint
        programs: [],
        aliases: [],
        notes: id.description ?? `Chainalysis category: ${id.category}`,
      });
    }

    // 2. Illicit cluster category.
    if (result.cluster && this.isIllicitCategory(result.cluster.category)) {
      matches.push({
        list: categoryToList(result.cluster.category),
        entityName: result.cluster.name,
        entityType: 'crypto_address',
        matchScore: isSanctionCategory(result.cluster.category)
          ? DEFINITIVE_MATCH_SCORE
          : Math.max(result.riskScore, this.riskScoreThreshold),
        sanctionedSince: new Date(0),
        programs: [],
        aliases: [],
        notes: `Illicit cluster category: ${result.cluster.category}`,
      });
    }

    // 3. High numeric risk score with no categorical match — still block.
    if (matches.length === 0 && result.riskScore >= this.riskScoreThreshold) {
      matches.push({
        list: 'ofac_sdn',
        entityName: result.address,
        entityType: 'crypto_address',
        matchScore: result.riskScore,
        sanctionedSince: new Date(0),
        programs: [],
        aliases: [],
        notes: `Chainalysis risk score ${result.riskScore} ≥ threshold ${this.riskScoreThreshold}`,
      });
    }

    return matches;
  }
}

export function createChainalysisProvider(config: ChainalysisConfig): ChainalysisProvider {
  return new ChainalysisProvider(config);
}
