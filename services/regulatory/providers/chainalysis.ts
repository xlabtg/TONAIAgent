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

function categoryToList(category: string): SanctionsList {
  const key = category.toLowerCase().replace(/[\s-]/g, '_');
  return SANCTIONS_CATEGORY_MAP[key] ?? 'ofac_sdn';
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

// ============================================================================
// Provider
// ============================================================================

export class ChainalysisProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ChainalysisConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.chainalysis.com').replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs ?? 10_000;
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
    const sanctioned = identifications.some((id) =>
      id.category.toLowerCase().includes('sanction')
    );

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
   */
  toSanctionsMatches(result: ChainalysisScreeningResult): SanctionsMatch[] {
    return result.identifications
      .filter((id) => id.category.toLowerCase().includes('sanction'))
      .map((id) => ({
        list: categoryToList(id.category),
        entityName: id.name,
        entityType: 'crypto_address' as const,
        matchScore: result.riskScore,
        sanctionedSince: new Date(0), // Chainalysis doesn't expose listing date in this endpoint
        programs: [],
        aliases: [],
        notes: id.description,
      }));
  }
}

export function createChainalysisProvider(config: ChainalysisConfig): ChainalysisProvider {
  return new ChainalysisProvider(config);
}
