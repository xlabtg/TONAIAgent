/**
 * Sanctions Screening Tests
 *
 * Covers:
 *   Unit  — mocked provider responses (match, no-match, error)
 *   Chaos — simulated provider timeout and 5xx
 *   Integration — real Chainalysis / OpenSanctions call (gated by CI secrets)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createSanctionsScreener,
  SanctionsScreener,
  SanctionsMatch,
} from '../../services/regulatory/sanctions';
import {
  createChainalysisProvider,
  ChainalysisProvider,
} from '../../services/regulatory/providers/chainalysis';
import {
  createOpenSanctionsProvider,
  OpenSanctionsProvider,
} from '../../services/regulatory/providers/opensanctions';
import {
  createListDownloader,
  ListDownloader,
} from '../../services/regulatory/providers/list-downloader';

// ============================================================================
// Helpers
// ============================================================================

const OFAC_MATCH: SanctionsMatch = {
  list: 'ofac_sdn',
  entityName: 'Sanctioned Corp',
  entityType: 'entity',
  matchScore: 100,
  sanctionedSince: new Date('2020-01-01'),
  programs: ['CYBER2'],
  aliases: ['Bad Corp', 'Danger LLC'],
};

const EU_MATCH: SanctionsMatch = {
  list: 'eu_consolidated',
  entityName: 'EU Blocked Entity',
  entityType: 'individual',
  matchScore: 95,
  sanctionedSince: new Date('2021-06-01'),
  programs: ['EU_SANCTIONS'],
  aliases: [],
};

// ============================================================================
// Unit Tests — Internal Provider
// ============================================================================

describe('SanctionsScreener (internal provider)', () => {
  let screener: SanctionsScreener;

  beforeEach(() => {
    screener = createSanctionsScreener({ provider: 'internal', matchThreshold: 85 });
  });

  it('returns no match for a clean address', async () => {
    const result = await screener.screenAddress('EQC_clean_address');
    expect(result.screened).toBe(true);
    expect(result.isMatch).toBe(false);
    expect(result.riskScore).toBe(0);
    expect(result.provider).toBe('internal');
    expect(result.matches).toHaveLength(0);
  });

  it('returns match for a sanctioned address', async () => {
    screener.addSanctionedAddress('EQC_sanctioned', [OFAC_MATCH]);

    const result = await screener.screenAddress('EQC_sanctioned');
    expect(result.isMatch).toBe(true);
    expect(result.riskScore).toBe(100);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].list).toBe('ofac_sdn');
  });

  it('caches results and reuses cached entry', async () => {
    screener.addSanctionedAddress('EQC_cached', [OFAC_MATCH]);

    const first = await screener.screenAddress('EQC_cached');
    const second = await screener.screenAddress('EQC_cached');

    expect(second.cachedAt.getTime()).toBe(first.cachedAt.getTime());
    expect(second.isMatch).toBe(true);
  });

  it('invalidates cache after addSanctionedAddress', async () => {
    const firstResult = await screener.screenAddress('EQC_newaddr');
    expect(firstResult.isMatch).toBe(false);

    screener.addSanctionedAddress('EQC_newaddr', [OFAC_MATCH]);
    const secondResult = await screener.screenAddress('EQC_newaddr');
    expect(secondResult.isMatch).toBe(true);
    expect(secondResult.cachedAt.getTime()).toBeGreaterThanOrEqual(firstResult.cachedAt.getTime());
  });

  it('respects matchThreshold — low-score hit is not a match', async () => {
    const lowScore: SanctionsMatch = { ...OFAC_MATCH, matchScore: 50 };
    screener.addSanctionedAddress('EQC_low_score', [lowScore]);

    const result = await screener.screenAddress('EQC_low_score');
    expect(result.isMatch).toBe(false);
    expect(result.riskScore).toBe(50);
  });

  it('handles multiple lists for the same address', async () => {
    screener.addSanctionedAddress('EQC_multi', [OFAC_MATCH, EU_MATCH]);

    const result = await screener.screenAddress('EQC_multi');
    expect(result.isMatch).toBe(true);
    expect(result.matches).toHaveLength(2);
    expect(result.matches.map((m) => m.list)).toContain('ofac_sdn');
    expect(result.matches.map((m) => m.list)).toContain('eu_consolidated');
  });

  it('removes sanctioned address correctly', async () => {
    screener.addSanctionedAddress('EQC_to_remove', [OFAC_MATCH]);
    expect((await screener.screenAddress('EQC_to_remove')).isMatch).toBe(true);

    screener.removeSanctionedAddress('EQC_to_remove');
    const afterRemoval = await screener.screenAddress('EQC_to_remove');
    expect(afterRemoval.isMatch).toBe(false);
  });

  it('screenEntity finds entity by name', async () => {
    screener.addSanctionedAddress('EQC_entity_addr', [OFAC_MATCH]);

    const result = await screener.screenEntity('Sanctioned Corp');
    expect(result.screened).toBe(true);
    expect(result.isMatch).toBe(true);
    expect(result.provider).toBe('internal');
  });

  it('screenEntity finds entity by alias', async () => {
    screener.addSanctionedAddress('EQC_alias_addr', [OFAC_MATCH]);

    const result = await screener.screenEntity('Bad Corp');
    expect(result.isMatch).toBe(true);
  });

  it('screenEntity returns no match for unknown entity', async () => {
    const result = await screener.screenEntity('Totally Legitimate Business Inc');
    expect(result.isMatch).toBe(false);
    expect(result.riskScore).toBe(0);
  });

  it('loadSanctionsList replaces entries for a given list', async () => {
    screener.addSanctionedAddress('EQC_old', [OFAC_MATCH]);

    screener.loadSanctionsList('ofac_sdn', [
      { address: 'EQC_new', match: OFAC_MATCH },
    ]);

    const oldResult = await screener.screenAddress('EQC_old');
    const newResult = await screener.screenAddress('EQC_new');
    expect(oldResult.isMatch).toBe(false);
    expect(newResult.isMatch).toBe(true);
  });

  it('isSanctionedAddress is a fast synchronous check', () => {
    screener.addSanctionedAddress('EQC_sync', [OFAC_MATCH]);
    expect(screener.isSanctionedAddress('EQC_sync')).toBe(true);
    expect(screener.isSanctionedAddress('EQC_unknown')).toBe(false);
  });

  it('emits aml.transaction_blocked event on match', async () => {
    const events: any[] = [];
    screener.onEvent((e) => events.push(e));
    screener.addSanctionedAddress('EQC_event', [OFAC_MATCH]);

    await screener.screenAddress('EQC_event');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('aml.transaction_blocked');
    expect(events[0].payload.address).toBe('EQC_event');
  });

  it('does not emit event on no-match', async () => {
    const events: any[] = [];
    screener.onEvent((e) => events.push(e));

    await screener.screenAddress('EQC_clean');
    expect(events).toHaveLength(0);
  });

  it('reports metrics correctly', async () => {
    screener.addSanctionedAddress('EQC_m1', [OFAC_MATCH]);
    await screener.screenAddress('EQC_m1');
    await screener.screenAddress('EQC_m2');

    const metrics = screener.getMetrics();
    expect(metrics.totalScreenings).toBe(2);
    expect(metrics.sanctionedAddressCount).toBe(1);
    expect(metrics.checkTotal['internal:match']).toBe(1);
    expect(metrics.checkTotal['internal:no_match']).toBe(1);
  });

  it('caches per listVersion — new version bypasses cache', async () => {
    screener.addSanctionedAddress('EQC_v', [OFAC_MATCH]);
    const r1 = await screener.screenAddress('EQC_v');
    expect(r1.listVersion).toBe('default');

    screener.setListVersion('2024-01-01');
    const r2 = await screener.screenAddress('EQC_v');
    expect(r2.listVersion).toBe('2024-01-01');
    // r2 is fetched fresh (not from r1 cache) because version changed
    expect(r2.cachedAt.getTime()).toBeGreaterThanOrEqual(r1.cachedAt.getTime());
  });
});

// ============================================================================
// Unit Tests — Chainalysis Provider (mocked fetch)
// ============================================================================

describe('SanctionsScreener with Chainalysis provider (mocked)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns match when Chainalysis reports sanctioned address', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          address: 'EQC_sanctioned',
          risk: 'severe',
          identifications: [
            { category: 'sanctions', name: 'Evil Corp' },
          ],
          cluster: { name: 'Evil Cluster', category: 'sanctions' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
    });

    const result = await screener.screenAddress('EQC_sanctioned');
    expect(result.isMatch).toBe(true);
    expect(result.provider).toBe('chainalysis');
    expect(result.riskScore).toBe(100);
    expect(result.providerError).toBeUndefined();
  });

  it('returns no-match for clean address from Chainalysis', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          address: 'EQC_clean',
          risk: 'low',
          identifications: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
    });

    const result = await screener.screenAddress('EQC_clean');
    expect(result.isMatch).toBe(false);
    expect(result.riskScore).toBe(20);
    expect(result.provider).toBe('chainalysis');
  });

  it('returns no-match when Chainalysis returns 404 (unknown address)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 })
    );

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
    });

    const result = await screener.screenAddress('EQC_unknown');
    expect(result.isMatch).toBe(false);
    expect(result.riskScore).toBe(0);
  });

  it('fail-closed: blocks on Chainalysis network error when failClosed=true', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
      failClosed: true,
    });

    const events: any[] = [];
    screener.onEvent((e) => events.push(e));

    const result = await screener.screenAddress('EQC_failclosed');
    expect(result.isMatch).toBe(true);
    expect(result.providerError).toBe(true);
    expect(result.providerErrorMessage).toContain('ECONNREFUSED');
    expect(result.riskScore).toBe(100);
    expect(events.some((e) => e.type === 'aml.transaction_blocked')).toBe(true);
  });

  it('fail-open: falls back to internal list on Chainalysis error when failClosed=false', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('timeout'));

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
      failClosed: false,
    });
    screener.addSanctionedAddress('EQC_fallback', [OFAC_MATCH]);

    const result = await screener.screenAddress('EQC_fallback');
    expect(result.isMatch).toBe(true);
    expect(result.provider).toBe('internal');
    expect(result.providerError).toBeUndefined();
  });

  it('tracks chainalysis metrics for match/no-match/error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ address: 'A', risk: 'severe', identifications: [{ category: 'sanctions', name: 'X' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ address: 'B', risk: 'low', identifications: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    fetchSpy.mockRejectedValueOnce(new Error('timeout'));

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
      failClosed: false,
    });

    await screener.screenAddress('A');
    await screener.screenAddress('B');
    await screener.screenAddress('C');

    const metrics = screener.getMetrics();
    expect(metrics.checkTotal['chainalysis:match']).toBe(1);
    expect(metrics.checkTotal['chainalysis:no_match']).toBe(1);
    expect(metrics.checkTotal['chainalysis:error']).toBe(1);
    expect(metrics.providerCallCount).toBe(3);
    expect(metrics.totalProviderDurationMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Unit Tests — OpenSanctions Provider (mocked fetch)
// ============================================================================

describe('SanctionsScreener with OpenSanctions provider (mocked)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockOpenSanctionsResponse(results: object[]): Response {
    return new Response(
      JSON.stringify({
        responses: {
          q: {
            results,
            total: { value: results.length },
          },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  it('returns entity match from OpenSanctions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockOpenSanctionsResponse([
        {
          id: 'Q123',
          caption: 'Evil Person',
          score: 92,
          datasets: ['us_ofac_sdn'],
          properties: {
            name: ['Evil Person'],
            alias: ['E. Person'],
            program: ['CYBER2'],
            createdAt: ['2020-01-01'],
          },
        },
      ])
    );

    const screener = createSanctionsScreener({
      openSanctions: { apiKey: 'os-key' },
    });

    const result = await screener.screenEntity('Evil Person');
    expect(result.isMatch).toBe(true);
    expect(result.provider).toBe('opensanctions');
    expect(result.matches[0].entityName).toBe('Evil Person');
    expect(result.matches[0].list).toBe('ofac_sdn');
  });

  it('returns no match when OpenSanctions finds nothing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockOpenSanctionsResponse([])
    );

    const screener = createSanctionsScreener({
      openSanctions: { apiKey: 'os-key' },
    });

    const result = await screener.screenEntity('Legitimate Business Ltd');
    expect(result.isMatch).toBe(false);
    expect(result.riskScore).toBe(0);
  });

  it('fail-closed: blocks on OpenSanctions network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

    const screener = createSanctionsScreener({
      openSanctions: { apiKey: 'os-key' },
      failClosed: true,
    });

    const result = await screener.screenEntity('Some Entity');
    expect(result.isMatch).toBe(true);
    expect(result.providerError).toBe(true);
    expect(result.providerErrorMessage).toContain('Connection refused');
  });
});

// ============================================================================
// Chaos Tests — Timeouts and 5xx
// ============================================================================

describe('SanctionsScreener chaos scenarios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles Chainalysis 500 error as provider failure (fail-closed)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 })
    );

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
      failClosed: true,
    });

    const result = await screener.screenAddress('EQC_chaos');
    expect(result.isMatch).toBe(true);
    expect(result.providerError).toBe(true);
    expect(result.providerErrorMessage).toContain('500');
  });

  it('handles Chainalysis 503 error as provider failure (fail-closed)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503 })
    );

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
      failClosed: true,
    });

    const result = await screener.screenAddress('EQC_503');
    expect(result.isMatch).toBe(true);
    expect(result.providerError).toBe(true);
  });

  it('handles simulated provider abort (timeout) gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key', timeoutMs: 1 },
      failClosed: true,
    });

    const result = await screener.screenAddress('EQC_timeout');
    expect(result.isMatch).toBe(true);
    expect(result.providerError).toBe(true);
    expect(result.providerErrorMessage).toContain('aborted');
  });

  it('chaos: fail-open falls back to internal list on 5xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Gateway Timeout', { status: 504 })
    );

    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: 'test-key' },
      failClosed: false,
    });
    screener.addSanctionedAddress('EQC_internal_hit', [OFAC_MATCH]);

    const result = await screener.screenAddress('EQC_internal_hit');
    expect(result.provider).toBe('internal');
    expect(result.isMatch).toBe(true);
  });
});

// ============================================================================
// ListDownloader Unit Tests
// ============================================================================

describe('ListDownloader', () => {
  let downloader: ListDownloader;

  beforeEach(() => {
    downloader = createListDownloader({ storagePath: '/tmp/test-sanctions-dl' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty entries for a list that has not been loaded', () => {
    const entries = downloader.getEntries('ofac_sdn');
    expect(entries).toHaveLength(0);
  });

  it('parses mocked OFAC CSV download', async () => {
    const csvContent = [
      '"Ent_num","SDN_Name","SDN_Type","Program","Title","Call_Sign","Vess_type","Tonnage","GRT","Vess_flag","Vess_owner","Remarks","Add_Num","Address","City/State/Province/Postal Code","Country","Add_Remarks"',
      '"1234","Evil Corp","Entity","CYBER2","","","","","","","","Sanctioned 2020-01-01","","","",""',
    ].join('\n');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(csvContent, { status: 200 })
    );

    const snapshot = await downloader.refreshList({
      list: 'ofac_sdn',
      url: 'https://example.com/sdn.csv',
      format: 'ofac_csv',
    } as any);

    expect(snapshot.list).toBe('ofac_sdn');
    expect(snapshot.entryCount).toBeGreaterThan(0);
    expect(snapshot.checksum).toHaveLength(64); // SHA-256 hex
  });

  it('fires stale alert when list has not been updated within threshold', () => {
    const alerts: any[] = [];
    const dl = createListDownloader({
      staleAlertThresholdMs: 0,
      onStaleAlert: (list, lastSuccessAt) => alerts.push({ list, lastSuccessAt }),
    });

    dl.checkStaleness();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].lastSuccessAt).toBeNull();
  });

  it('toSanctionsEntries converts snapshot to screener-compatible format', async () => {
    // Match the 17-column OFAC CSV format expected by parseOfacCsv
    const cols = (n: number, val = '') => Array(n).fill(`"${val}"`).join(',');
    const header = '"Ent_num","SDN_Name","SDN_Type","Program","Title","Call_Sign","Vess_type","Tonnage","GRT","Vess_flag","Vess_owner","Remarks","Add_Num","Address","City","Country","Add_Remarks"';
    const row = `"1","Blocked Entity","Entity","SDGT","","","","","","","","2020-01-01","","","","",""`;
    const csvContent = [header, row].join('\n');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(csvContent, { status: 200 })
    );

    await downloader.refreshList({
      list: 'ofac_sdn',
      url: 'https://example.com/sdn.csv',
      format: 'ofac_csv',
    } as any);

    const entries = downloader.toSanctionsEntries('ofac_sdn');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].match.list).toBe('ofac_sdn');
    expect(entries[0].match.matchScore).toBe(100);
  });

  it('refreshAll returns results for each list', async () => {
    // Mock 4 successful fetches
    const mockFetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('mock-content', { status: 200 }));

    const results = await downloader.refreshAll();
    expect(results).toHaveLength(4);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('refreshAll reports error for failed downloads', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network failure'));

    const results = await downloader.refreshAll();
    expect(results.every((r) => !r.success)).toBe(true);
    expect(results[0].error).toContain('Network failure');
  });
});

// ============================================================================
// ChainalysisProvider Unit Tests
// ============================================================================

describe('ChainalysisProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps severe risk to score 100', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ address: 'A', risk: 'severe', identifications: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const provider = createChainalysisProvider({ apiKey: 'key' });
    const result = await provider.screenAddress('A');
    expect(result.riskScore).toBe(100);
  });

  it('throws on non-2xx non-404 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Bad Request', { status: 400 })
    );

    const provider = createChainalysisProvider({ apiKey: 'key' });
    await expect(provider.screenAddress('A')).rejects.toThrow('HTTP 400');
  });

  it('throws on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ENOTFOUND'));

    const provider = createChainalysisProvider({ apiKey: 'key' });
    await expect(provider.screenAddress('A')).rejects.toThrow('Chainalysis provider unreachable');
  });

  it('toSanctionsMatches returns empty array for non-sanctioned result', async () => {
    const provider = createChainalysisProvider({ apiKey: 'key' });
    const matches = provider.toSanctionsMatches({
      address: 'A',
      identifications: [{ category: 'exchange', name: 'Binance' }],
      riskScore: 5,
      sanctioned: false,
    });
    expect(matches).toHaveLength(0);
  });
});

// ============================================================================
// OpenSanctionsProvider Unit Tests
// ============================================================================

describe('OpenSanctionsProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filters results below minScore', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          responses: {
            q: {
              results: [
                { id: 'X', caption: 'Low Score Entity', score: 50, datasets: ['us_ofac_sdn'], properties: {} },
              ],
              total: { value: 1 },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const provider = createOpenSanctionsProvider({ apiKey: 'key', minScore: 80 });
    const result = await provider.screenEntity('Low Score Entity');
    expect(result.matches).toHaveLength(0);
    expect(result.hasHit).toBe(false);
  });

  it('throws on OpenSanctions API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );

    const provider = createOpenSanctionsProvider({ apiKey: 'bad-key' });
    await expect(provider.screenEntity('Test')).rejects.toThrow('HTTP 401');
  });
});

// ============================================================================
// Integration Tests — gated by CI secrets
// ============================================================================

const CHAINALYSIS_API_KEY = process.env['CHAINALYSIS_API_KEY'];
const OPENSANCTIONS_API_KEY = process.env['OPENSANCTIONS_API_KEY'];

describe.skipIf(!CHAINALYSIS_API_KEY)('Chainalysis live integration', () => {
  it('screens a known-clean TON address', async () => {
    const screener = createSanctionsScreener({
      provider: 'chainalysis',
      chainalysis: { apiKey: CHAINALYSIS_API_KEY! },
      failClosed: true,
    });

    // Use a well-known TON foundation address — should not be sanctioned
    const result = await screener.screenAddress('EQC62GUBmmfFHmvVEFPFN0i5GIbkIhSPnujBNS5q-0U6GC7a');
    expect(result.screened).toBe(true);
    expect(result.provider).toBe('chainalysis');
    expect(result.providerError).toBeUndefined();
  }, 30_000);
});

describe.skipIf(!OPENSANCTIONS_API_KEY)('OpenSanctions live integration', () => {
  it('screens a known-sanctioned entity name', async () => {
    const provider = createOpenSanctionsProvider({ apiKey: OPENSANCTIONS_API_KEY! });
    const result = await provider.screenEntity('Viktor Bout');
    // Viktor Bout is a well-known sanctioned individual
    expect(result.hasHit).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
  }, 30_000);
});
