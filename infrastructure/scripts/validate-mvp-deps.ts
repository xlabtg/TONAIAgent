/**
 * MVP Dependency Boundary Validator
 *
 * Enforces the rule from Issue #247:
 *   MVP modules MUST NOT import from extended/ or research/
 *
 * MVP modules are located under:
 *   - apps/telegram-miniapp
 *   - apps/mvp-platform
 *   - core/agents
 *   - core/strategies
 *   - core/trading
 *   - core/portfolio
 *   - core/market-data
 *   - core/risk-engine
 *   - core/ai
 *   - services/api
 *   - services/execution-engine
 *   - services/scheduler
 *   - connectors/dex
 *   - connectors/wallets
 *   - connectors/market-data
 *   - packages/sdk
 *   - packages/shared-types
 *   - packages/utils
 *
 * Non-MVP modules are located under:
 *   - extended/
 *   - research/
 *
 * Run via: npx ts-node infrastructure/scripts/validate-mvp-deps.ts
 * Or:      npm run validate:mvp
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

// Directories that are part of the MVP — must not depend on extended/ or research/
const MVP_DIRS = [
  'apps/telegram-miniapp',
  'apps/mvp-platform',
  'core/agents',
  'core/strategies',
  'core/trading',
  'core/portfolio',
  'core/market-data',
  'core/risk-engine',
  'core/ai',
  'services/api',
  'services/execution-engine',
  'services/scheduler',
  'connectors/dex',
  'connectors/wallets',
  'connectors/market-data',
  'packages/sdk',
  'packages/shared-types',
  'packages/utils',
];

// Patterns that must not appear in MVP module imports
const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"].*\/extended\//,
  /from\s+['"].*\/research\//,
  /require\(['"].*\/extended\//,
  /require\(['"].*\/research\//,
];

interface Violation {
  file: string;
  line: number;
  content: string;
  pattern: string;
}

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(full);
    }
  }
  return files;
}

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: path.relative(ROOT, filePath),
          line: i + 1,
          content: line.trim(),
          pattern: pattern.toString(),
        });
      }
    }
  }
  return violations;
}

function validate(): void {
  const allViolations: Violation[] = [];

  for (const mvpDir of MVP_DIRS) {
    const absDir = path.join(ROOT, mvpDir);
    const files = collectTsFiles(absDir);
    for (const file of files) {
      const violations = checkFile(file);
      allViolations.push(...violations);
    }
  }

  if (allViolations.length === 0) {
    console.log('✅ MVP dependency boundary check passed — no violations found.');
    console.log(`   Checked ${MVP_DIRS.length} MVP module directories.`);
    process.exit(0);
  } else {
    console.error('❌ MVP dependency boundary violations found!\n');
    console.error(
      'MVP modules MUST NOT import from extended/ or research/.\n' +
        'Move these imports to non-MVP modules or use feature flags.\n'
    );
    for (const v of allViolations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    ${v.content}\n`);
    }
    console.error(`Total violations: ${allViolations.length}`);
    process.exit(1);
  }
}

validate();
