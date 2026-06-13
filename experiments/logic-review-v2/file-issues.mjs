#!/usr/bin/env node
/**
 * Files one GitHub issue per LOGIC-NN finding doc onto xlabtg/TONAIAgent and
 * records the resulting issue number into TEMP/logic-review-v2/issues.json so
 * generate.mjs can write the links back into the docs/README/report.
 *
 * The audit account has pull-only access, so labels can't be attached; the
 * severity/area/stage are already embedded as text in each issue body.
 *
 * Idempotent: skips any LOGIC-NN already present in issues.json.
 *
 * Usage:
 *   node experiments/logic-review-v2/file-issues.mjs          # file all not-yet-filed
 *   node experiments/logic-review-v2/file-issues.mjs 23 24    # file only these IDs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(ROOT, 'TEMP', 'logic-review-v2');
const REPO = 'xlabtg/TONAIAgent';
const MAP = join(DIR, 'issues.json');

const filed = existsSync(MAP) ? JSON.parse(readFileSync(MAP, 'utf8')) : {};
const onlyIds = process.argv.slice(2).map((s) => parseInt(s, 10)).filter(Boolean);

const docs = readdirSync(DIR)
  .filter((f) => /^LOGIC-\d+-.*\.md$/.test(f))
  .map((f) => ({ f, id: parseInt(f.match(/^LOGIC-(\d+)/)[1], 10) }))
  .sort((a, b) => a.id - b.id);

const FOOTER = `

---
<sub>Filed as part of the v2.43.0 logic re-audit (Issue #431). Companion report: \`AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW_v2.md\`; full finding doc with acceptance criteria: \`TEMP/logic-review-v2/\` on branch \`issue-431-c0be08c13d26\`. The audit account has pull-only access, so suggested labels are listed in the body rather than attached.</sub>`;

for (const { f, id } of docs) {
  if (onlyIds.length && !onlyIds.includes(id)) continue;
  if (filed[String(id)]) { console.log(`LOGIC-${id}: already filed as #${filed[String(id)]}, skipping`); continue; }

  const raw = readFileSync(join(DIR, f), 'utf8');
  const nl = raw.indexOf('\n');
  const title = raw.slice(0, nl).replace(/^#\s+/, '').trim();
  const body = raw.slice(nl + 1).trimStart() + FOOTER;

  try {
    const out = execFileSync('gh', [
      'issue', 'create', '--repo', REPO,
      '--title', title,
      '--body', body,
    ], { encoding: 'utf8' });
    const url = out.trim().split('\n').pop();
    const num = parseInt(url.match(/\/issues\/(\d+)/)?.[1] ?? '0', 10);
    filed[String(id)] = num;
    writeFileSync(MAP, JSON.stringify(filed, null, 2) + '\n');
    console.log(`LOGIC-${id}: filed #${num}  ${url}`);
  } catch (err) {
    console.error(`LOGIC-${id}: FAILED — ${err.stderr || err.message}`);
    break; // stop on first failure so we can diagnose without spamming
  }
}

console.log(`\nFiled so far: ${Object.keys(filed).length}/${docs.length}`);
