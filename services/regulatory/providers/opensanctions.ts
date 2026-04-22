/**
 * OpenSanctions Provider
 *
 * Integrates with the OpenSanctions API for name/entity screening against
 * OFAC SDN, EU Consolidated, UN Security Council, and UK HMT lists.
 * Docs: https://www.opensanctions.org/docs/api/
 *
 * Fail-closed: throws on provider unreachability so callers can block trades.
 */

import type { SanctionsMatch, SanctionsList } from '../sanctions';

// ============================================================================
// Types
// ============================================================================

export interface OpenSanctionsConfig {
  apiKey: string;
  /** Base URL. Default: https://api.opensanctions.org */
  baseUrl?: string;
  /** Request timeout in ms. Default: 10 000 */
  timeoutMs?: number;
  /** Minimum match score (0-100) to include in results. Default: 70 */
  minScore?: number;
}

export interface OpenSanctionsMatch {
  id: string;
  name: string;
  score: number;
  datasets: string[];
  properties: {
    name?: string[];
    alias?: string[];
    country?: string[];
    program?: string[];
    topics?: string[];
    createdAt?: string[];
  };
}

export interface OpenSanctionsResult {
  query: string;
  matches: OpenSanctionsMatch[];
  hasHit: boolean;
}

/** OpenSanctions API response shape */
interface OpenSanctionsApiResponse {
  results: Array<{
    id: string;
    caption: string;
    score: number;
    datasets: string[];
    properties: Record<string, string[]>;
  }>;
  total: { value: number };
}

// ============================================================================
// Dataset → SanctionsList mapping
// ============================================================================

const DATASET_TO_LIST: Record<string, SanctionsList> = {
  'us_ofac_sdn': 'ofac_sdn',
  'us_ofac_cons': 'ofac_sdn',
  'eu_fsf': 'eu_consolidated',
  'un_sc_sanctions': 'un_security_council',
  'gb_hmt_sanctions': 'uk_hm_treasury',
};

function datasetToList(dataset: string): SanctionsList {
  for (const [prefix, list] of Object.entries(DATASET_TO_LIST)) {
    if (dataset.startsWith(prefix)) return list;
  }
  return 'ofac_sdn';
}

// ============================================================================
// Provider
// ============================================================================

export class OpenSanctionsProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly minScore: number;

  constructor(config: OpenSanctionsConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.opensanctions.org').replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.minScore = config.minScore ?? 70;
  }

  /**
   * Search for an entity by name against all sanctions datasets.
   * Throws on network errors so callers can fail-closed.
   */
  async screenEntity(entityName: string): Promise<OpenSanctionsResult> {
    const url = `${this.baseUrl}/match/sanctions/`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const body = JSON.stringify({
      queries: {
        q: {
          schema: 'Thing',
          properties: { name: [entityName] },
        },
      },
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`OpenSanctions provider unreachable: ${msg}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`OpenSanctions API error: HTTP ${response.status}`);
    }

    const data = await response.json() as { responses: { q: OpenSanctionsApiResponse } };
    const results = data.responses?.q?.results ?? [];

    const matches: OpenSanctionsMatch[] = results
      .filter((r) => r.score >= this.minScore)
      .map((r) => ({
        id: r.id,
        name: r.caption,
        score: r.score,
        datasets: r.datasets,
        properties: {
          name: r.properties['name'],
          alias: r.properties['alias'],
          country: r.properties['country'],
          program: r.properties['program'],
          topics: r.properties['topics'],
          createdAt: r.properties['createdAt'],
        },
      }));

    return {
      query: entityName,
      matches,
      hasHit: matches.length > 0,
    };
  }

  /**
   * Convert OpenSanctions matches to internal SanctionsMatch[] format.
   */
  toSanctionsMatches(result: OpenSanctionsResult): SanctionsMatch[] {
    return result.matches.map((match) => {
      const primaryDataset = match.datasets[0] ?? '';
      const list = datasetToList(primaryDataset);

      const createdAtStr = match.properties.createdAt?.[0];
      const sanctionedSince = createdAtStr ? new Date(createdAtStr) : new Date(0);

      return {
        list,
        entityName: match.name,
        entityType: 'individual' as const,
        matchScore: Math.round(match.score),
        sanctionedSince,
        programs: match.properties.program ?? [],
        aliases: match.properties.alias ?? [],
      };
    });
  }
}

export function createOpenSanctionsProvider(config: OpenSanctionsConfig): OpenSanctionsProvider {
  return new OpenSanctionsProvider(config);
}
