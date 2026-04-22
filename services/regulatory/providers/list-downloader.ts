/**
 * Sanctions List Downloader
 *
 * Downloads and parses official sanctions lists for local screening:
 *   - OFAC SDN (US Office of Foreign Assets Control)
 *   - EU Consolidated Sanctions List
 *   - UN Security Council Consolidated List
 *   - UK HM Treasury Consolidated List
 *
 * Stores a versioned, checksummed snapshot in durable storage and alerts
 * when a refresh has not succeeded for more than 48 hours.
 *
 * Usage:
 *   const downloader = createListDownloader({ storagePath: '/data/sanctions' });
 *   await downloader.refreshAll();
 *   const entries = downloader.getEntries('ofac_sdn');
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { SanctionsList, SanctionsMatch } from '../sanctions';

// ============================================================================
// Types
// ============================================================================

export interface ListDownloaderConfig {
  /** Directory for persisted list snapshots. Default: ./data/sanctions */
  storagePath?: string;
  /** Maximum age (ms) before a stale-list alert is fired. Default: 48h */
  staleAlertThresholdMs?: number;
  /** Request timeout per download (ms). Default: 30 000 */
  downloadTimeoutMs?: number;
  /** Callback invoked on stale list alert */
  onStaleAlert?: (list: SanctionsList, lastSuccessAt: Date | null) => void;
}

export interface ListSnapshot {
  list: SanctionsList;
  version: string;      // ISO date string of successful download
  checksum: string;     // SHA-256 hex of raw content
  downloadedAt: Date;
  entryCount: number;
  entries: ParsedEntry[];
}

export interface ParsedEntry {
  address?: string;
  entityName: string;
  entityType: 'individual' | 'entity' | 'vessel' | 'aircraft' | 'crypto_address';
  programs: string[];
  aliases: string[];
  sanctionedSince: Date;
}

interface UrlConfig {
  list: SanctionsList;
  url: string;
  format: 'ofac_csv' | 'eu_xml' | 'un_xml' | 'uk_csv';
}

// ============================================================================
// List Sources
// ============================================================================

const LIST_SOURCES: UrlConfig[] = [
  {
    list: 'ofac_sdn',
    url: 'https://www.treasury.gov/ofac/downloads/sdn.csv',
    format: 'ofac_csv',
  },
  {
    list: 'eu_consolidated',
    url: 'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content',
    format: 'eu_xml',
  },
  {
    list: 'un_security_council',
    url: 'https://scsanctions.un.org/resources/xml/en/consolidated.xml',
    format: 'un_xml',
  },
  {
    list: 'uk_hm_treasury',
    url: 'https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.csv',
    format: 'uk_csv',
  },
];

// ============================================================================
// Parsers
// ============================================================================

function parseOfacCsv(content: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#') || line.startsWith('"Ent_num"')) continue;
    const cols = splitCsvLine(line);
    if (cols.length < 12) continue;

    const name = (cols[1] ?? '').replace(/^"|"$/g, '').trim();
    const type = (cols[2] ?? '').toLowerCase();
    const programs = (cols[10] ?? '').split(';').map((p) => p.trim()).filter(Boolean);
    const dateStr = cols[11] ?? '';

    if (!name) continue;

    const entityType: ParsedEntry['entityType'] =
      type === 'individual' ? 'individual' :
      type === 'vessel' ? 'vessel' :
      type === 'aircraft' ? 'aircraft' :
      'entity';

    const sanctionedSince = dateStr ? new Date(dateStr) : new Date(0);

    entries.push({
      entityName: name,
      entityType,
      programs,
      aliases: [],
      sanctionedSince: isNaN(sanctionedSince.getTime()) ? new Date(0) : sanctionedSince,
    });
  }

  return entries;
}

function parseEuXml(content: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const subjectMatches = content.matchAll(/<sanctionEntity[^>]*>([\s\S]*?)<\/sanctionEntity>/gi);

  for (const match of subjectMatches) {
    const block = match[1] ?? '';

    const nameMatch = block.match(/<wholeName[^>]*>([^<]+)<\/wholeName>/i);
    const name = nameMatch?.[1]?.trim() ?? '';
    if (!name) continue;

    const dateMatch = block.match(/<regulationDate[^>]*>([^<]+)<\/regulationDate>/i);
    const sanctionedSince = dateMatch?.[1] ? new Date(dateMatch[1]) : new Date(0);

    const programMatches = [...block.matchAll(/<regulation[^>]*nameAlias[^>]*>([^<]+)<\/[^>]+>/gi)];
    const programs = programMatches.map((m) => m[1]?.trim() ?? '').filter(Boolean);

    const aliasMatches = [...block.matchAll(/<nameAlias[^>]*wholeName[^>]*>([^<]+)<\/[^>]+>/gi)];
    const aliases = aliasMatches.map((m) => m[1]?.trim() ?? '').filter(Boolean);

    entries.push({
      entityName: name,
      entityType: 'entity',
      programs,
      aliases,
      sanctionedSince: isNaN(sanctionedSince.getTime()) ? new Date(0) : sanctionedSince,
    });
  }

  return entries;
}

function parseUnXml(content: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const individualMatches = content.matchAll(/<INDIVIDUAL>([\s\S]*?)<\/INDIVIDUAL>/gi);
  const entityMatches = content.matchAll(/<ENTITY>([\s\S]*?)<\/ENTITY>/gi);

  function extractName(block: string): string {
    const first = block.match(/<FIRST_NAME>([^<]*)<\/FIRST_NAME>/i)?.[1]?.trim() ?? '';
    const second = block.match(/<SECOND_NAME>([^<]*)<\/SECOND_NAME>/i)?.[1]?.trim() ?? '';
    const third = block.match(/<THIRD_NAME>([^<]*)<\/THIRD_NAME>/i)?.[1]?.trim() ?? '';
    const full = [first, second, third].filter(Boolean).join(' ');
    if (full) return full;
    return block.match(/<NAME>([^<]+)<\/NAME>/i)?.[1]?.trim() ?? '';
  }

  function extractDate(block: string): Date {
    const dateStr = block.match(/<LISTED_ON>([^<]+)<\/LISTED_ON>/i)?.[1]?.trim() ?? '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  for (const m of individualMatches) {
    const block = m[1] ?? '';
    const name = extractName(block);
    if (!name) continue;
    entries.push({
      entityName: name,
      entityType: 'individual',
      programs: [],
      aliases: [],
      sanctionedSince: extractDate(block),
    });
  }

  for (const m of entityMatches) {
    const block = m[1] ?? '';
    const name = extractName(block);
    if (!name) continue;
    entries.push({
      entityName: name,
      entityType: 'entity',
      programs: [],
      aliases: [],
      sanctionedSince: extractDate(block),
    });
  }

  return entries;
}

function parseUkCsv(content: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.trim() || line.startsWith('Name 6')) continue;
    const cols = splitCsvLine(line);
    if (cols.length < 6) continue;

    const name = [cols[0], cols[1], cols[2], cols[3], cols[4], cols[5]]
      .map((c) => c.replace(/^"|"$/g, '').trim())
      .filter(Boolean)
      .join(' ');

    if (!name) continue;

    const groupType = (cols[6] ?? '').toLowerCase().trim().replace(/^"|"$/g, '');
    const entityType: ParsedEntry['entityType'] = groupType === 'individual' ? 'individual' : 'entity';

    const dateStr = (cols[26] ?? '').replace(/^"|"$/g, '').trim();
    const sanctionedSince = dateStr ? new Date(dateStr) : new Date(0);

    entries.push({
      entityName: name,
      entityType,
      programs: [],
      aliases: [],
      sanctionedSince: isNaN(sanctionedSince.getTime()) ? new Date(0) : sanctionedSince,
    });
  }

  return entries;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseContent(content: string, format: UrlConfig['format']): ParsedEntry[] {
  switch (format) {
    case 'ofac_csv': return parseOfacCsv(content);
    case 'eu_xml':   return parseEuXml(content);
    case 'un_xml':   return parseUnXml(content);
    case 'uk_csv':   return parseUkCsv(content);
  }
}

// ============================================================================
// Downloader
// ============================================================================

export class ListDownloader {
  private readonly storagePath: string;
  private readonly staleAlertThresholdMs: number;
  private readonly downloadTimeoutMs: number;
  private readonly onStaleAlert?: (list: SanctionsList, lastSuccessAt: Date | null) => void;

  private snapshots: Map<SanctionsList, ListSnapshot> = new Map();
  private lastSuccessAt: Map<SanctionsList, Date> = new Map();

  constructor(config: ListDownloaderConfig = {}) {
    this.storagePath = config.storagePath ?? path.join(process.cwd(), 'data', 'sanctions');
    this.staleAlertThresholdMs = config.staleAlertThresholdMs ?? 48 * 60 * 60 * 1000;
    this.downloadTimeoutMs = config.downloadTimeoutMs ?? 30_000;
    this.onStaleAlert = config.onStaleAlert;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /** Download and parse all configured lists. */
  async refreshAll(): Promise<{ list: SanctionsList; success: boolean; error?: string }[]> {
    const results = await Promise.allSettled(
      LIST_SOURCES.map((src) => this.refreshList(src))
    );

    return LIST_SOURCES.map((src, i) => {
      const r = results[i];
      if (r && r.status === 'fulfilled') {
        return { list: src.list, success: true };
      }
      const err = r && r.status === 'rejected' ? (r.reason as Error).message : 'unknown';
      return { list: src.list, success: false, error: err };
    });
  }

  /** Refresh a single list. */
  async refreshList(src: UrlConfig): Promise<ListSnapshot> {
    const content = await this.download(src.url);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const entries = parseContent(content, src.format);
    const version = new Date().toISOString();

    const snapshot: ListSnapshot = {
      list: src.list,
      version,
      checksum,
      downloadedAt: new Date(),
      entryCount: entries.length,
      entries,
    };

    this.snapshots.set(src.list, snapshot);
    this.lastSuccessAt.set(src.list, new Date());
    this.persistSnapshot(snapshot);
    return snapshot;
  }

  /** Get all parsed entries for a list. Returns [] if list not loaded. */
  getEntries(list: SanctionsList): ParsedEntry[] {
    return this.snapshots.get(list)?.entries ?? [];
  }

  /** Get the current snapshot metadata for a list. */
  getSnapshot(list: SanctionsList): ListSnapshot | undefined {
    return this.snapshots.get(list);
  }

  /** Load previously persisted snapshots from disk (call on startup). */
  loadFromDisk(): void {
    for (const src of LIST_SOURCES) {
      const filePath = this.snapshotPath(src.list);
      if (!fs.existsSync(filePath)) continue;
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const snapshot = JSON.parse(raw) as ListSnapshot;
        snapshot.downloadedAt = new Date(snapshot.downloadedAt);
        snapshot.entries = snapshot.entries.map((e) => ({
          ...e,
          sanctionedSince: new Date(e.sanctionedSince),
        }));
        this.snapshots.set(src.list, snapshot);
        this.lastSuccessAt.set(src.list, snapshot.downloadedAt);
      } catch {
        // Corrupted snapshot — will be refreshed on next download
      }
    }
  }

  /**
   * Check all lists for staleness and fire the alert callback for any
   * list that has not been successfully refreshed within the threshold.
   */
  checkStaleness(): void {
    const now = Date.now();
    for (const src of LIST_SOURCES) {
      const lastSuccess = this.lastSuccessAt.get(src.list) ?? null;
      const age = lastSuccess ? now - lastSuccess.getTime() : Infinity;
      if (age > this.staleAlertThresholdMs) {
        this.onStaleAlert?.(src.list, lastSuccess);
      }
    }
  }

  /**
   * Convert loaded entries for a given list into SanctionsMatch[] objects
   * suitable for passing to SanctionsScreener.loadSanctionsList().
   */
  toSanctionsEntries(list: SanctionsList): Array<{ address: string; match: SanctionsMatch }> {
    const snapshot = this.snapshots.get(list);
    if (!snapshot) return [];

    return snapshot.entries.map((entry) => ({
      address: entry.address ?? entry.entityName,
      match: {
        list,
        entityName: entry.entityName,
        entityType: entry.entityType,
        matchScore: 100,
        sanctionedSince: entry.sanctionedSince,
        programs: entry.programs,
        aliases: entry.aliases,
      },
    }));
  }

  // ============================================================================
  // Private
  // ============================================================================

  private async download(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.downloadTimeoutMs);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Download failed for ${url}: ${msg}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Download failed for ${url}: HTTP ${response.status}`);
    }

    return response.text();
  }

  private snapshotPath(list: SanctionsList): string {
    return path.join(this.storagePath, `${list}.json`);
  }

  private persistSnapshot(snapshot: ListSnapshot): void {
    try {
      fs.mkdirSync(this.storagePath, { recursive: true });
      fs.writeFileSync(this.snapshotPath(snapshot.list), JSON.stringify(snapshot, null, 2), 'utf8');
    } catch {
      // Non-fatal: in-memory snapshot is still valid
    }
  }
}

export function createListDownloader(config?: ListDownloaderConfig): ListDownloader {
  return new ListDownloader(config);
}
