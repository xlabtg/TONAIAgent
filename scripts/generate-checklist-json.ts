/**
 * Build-time script: generates config/mainnet-checklist.json from
 * docs/mainnet-readiness-checklist.md to keep structured data in sync
 * with the canonical markdown source.
 *
 * Usage:
 *   npx ts-node scripts/generate-checklist-json.ts
 *
 * Item IDs in the JSON must be kept stable — they are stored in the database
 * per-user as acknowledgement records. Renaming an id in the markdown comment
 * counts as a new item and will require re-acknowledgement.
 *
 * Markdown convention used for machine-readable fields:
 *   <!-- id: <id> category: <category> mandatory: true|false -->
 *   - [ ] **Title**
 *     Description text
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CHECKLIST_MD = resolve(ROOT, 'docs', 'mainnet-readiness-checklist.md');
const CHECKLIST_JSON = resolve(ROOT, 'config', 'mainnet-checklist.json');

// ============================================================================
// Types
// ============================================================================

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  mandatoryForLive: boolean;
}

export interface ChecklistManifest {
  version: string;
  generatedFrom: string;
  items: ChecklistItem[];
}

// ============================================================================
// Category mapping derived from markdown section headings
// ============================================================================

const CATEGORY_MAP: Record<string, string> = {
  'Section 1': 'account-security',
  'Section 2': 'wallet',
  'Section 3': 'platform',
  'Section 4': 'simulation',
  'Section 5': 'risk',
  'Section 6': 'monitoring',
  'Section 7': 'compliance',
  'Section 8': 'final-acknowledgment',
};

// ============================================================================
// Parser
// ============================================================================

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function parseChecklist(markdown: string): ChecklistItem[] {
  const lines = markdown.split('\n');
  const items: ChecklistItem[] = [];
  let currentCategory = 'general';

  // IDs for items without an explicit <!-- id: --> annotation are generated
  // from the section + title. Stable IDs require explicit annotations.
  const seenSlugs = new Map<string, number>();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Track section headings to derive category
    const sectionMatch = line.match(/^##\s+(Section\s+\d+)/);
    if (sectionMatch) {
      const sectionKey = Object.keys(CATEGORY_MAP).find(k =>
        sectionMatch[1].startsWith(k),
      );
      if (sectionKey) currentCategory = CATEGORY_MAP[sectionKey];
      i++;
      continue;
    }

    // Metadata annotation (optional): <!-- id: foo category: bar mandatory: true -->
    let explicitId: string | null = null;
    let explicitCategory: string | null = null;
    let explicitMandatory: boolean | null = null;

    const annotationMatch = line.match(
      /<!--\s*id:\s*(\S+)(?:\s+category:\s*(\S+))?(?:\s+mandatory:\s*(true|false))?\s*-->/,
    );
    if (annotationMatch) {
      explicitId = annotationMatch[1];
      explicitCategory = annotationMatch[2] ?? null;
      explicitMandatory = annotationMatch[3] ? annotationMatch[3] === 'true' : null;
      i++;
      continue; // annotation line consumed, next line should be the item
    }

    // Checklist item line: "- [ ] **Title**"
    const itemMatch = line.match(/^-\s+\[\s*\]\s+\*\*(.+?)\*\*/);
    if (itemMatch) {
      const rawTitle = itemMatch[1];

      // Collect description (indented continuation lines)
      const descLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && (lines[j].startsWith('  ') || lines[j].startsWith('\t'))) {
        const trimmed = lines[j].trim();
        if (trimmed.length > 0) descLines.push(trimmed);
        j++;
      }

      const slug = slugify(rawTitle);
      const existingCount = seenSlugs.get(slug) ?? 0;
      seenSlugs.set(slug, existingCount + 1);
      const id = explicitId ?? (existingCount === 0 ? slug : `${slug}-${existingCount}`);

      items.push({
        id,
        title: rawTitle,
        description: descLines.join(' '),
        category: explicitCategory ?? currentCategory,
        // Items in the "compliance" section are operator-level gates, not per-user
        // mandatory items; they default to false unless annotated.
        mandatoryForLive: explicitMandatory ?? (currentCategory !== 'compliance'),
      });

      i = j;
      continue;
    }

    i++;
  }

  return items;
}

// ============================================================================
// Version derivation — bump when items are added/removed/renamed
// ============================================================================

function deriveVersion(items: ChecklistItem[]): string {
  // Simple content hash: count of mandatory items + sorted IDs fingerprint
  const mandatoryIds = items
    .filter(i => i.mandatoryForLive)
    .map(i => i.id)
    .sort()
    .join(',');
  // Short numeric version: <mandatory-count>.<total-count>.0
  const mandatoryCount = items.filter(i => i.mandatoryForLive).length;
  const totalCount = items.length;
  return `${mandatoryCount}.${totalCount}.0`;
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const markdown = readFileSync(CHECKLIST_MD, 'utf8');
  const items = parseChecklist(markdown);

  if (items.length === 0) {
    process.stderr.write('ERROR: No checklist items found — check the markdown format.\n');
    process.exit(1);
  }

  const version = deriveVersion(items);
  const manifest: ChecklistManifest = {
    version,
    generatedFrom: 'docs/mainnet-readiness-checklist.md',
    items,
  };

  writeFileSync(CHECKLIST_JSON, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  process.stdout.write(
    `Generated ${CHECKLIST_JSON} — v${version}, ${items.length} items ` +
    `(${items.filter(i => i.mandatoryForLive).length} mandatory)\n`,
  );
}

main();
