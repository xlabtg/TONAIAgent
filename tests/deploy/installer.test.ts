/**
 * TON AI Agent - Installer Tests
 *
 * Tests for the one-click installer and deployment scripts.
 * Validates paths, configuration, and installer logic.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const REPO_ROOT = resolve(__dirname, '../..');

// ── Helper: read a file relative to repo root ──────────────────────────────
function repoFile(relativePath: string): string {
  return resolve(REPO_ROOT, relativePath);
}

function readRepoFile(relativePath: string): string {
  return readFileSync(repoFile(relativePath), 'utf-8');
}

// ── Installer file presence ────────────────────────────────────────────────
describe('Installer: File Presence', () => {
  const installerFiles = [
    'infrastructure/installer/index.php',
    'infrastructure/installer/README.md',
    'infrastructure/installer/lang/en.php',
    'infrastructure/installer/lang/ru.php',
    'infrastructure/installer/lang/zh.php',
    'infrastructure/installer/lang/ar.php',
    'infrastructure/installer/steps/step1.php',
    'infrastructure/installer/steps/step2.php',
    'infrastructure/installer/steps/step3.php',
    'infrastructure/installer/steps/step4.php',
    'infrastructure/installer/steps/step5.php',
    'infrastructure/installer/steps/step6.php',
    'infrastructure/installer/steps/step7.php',
    'infrastructure/installer/steps/step8.php',
    'infrastructure/installer/steps/step9.php',
    'infrastructure/installer/templates/step1.php',
    'infrastructure/installer/templates/step2.php',
    'infrastructure/installer/templates/step3.php',
    'infrastructure/installer/templates/step4.php',
    'infrastructure/installer/templates/step5.php',
    'infrastructure/installer/templates/step6.php',
    'infrastructure/installer/templates/step7.php',
    'infrastructure/installer/templates/step8.php',
    'infrastructure/installer/templates/step9.php',
  ];

  installerFiles.forEach((file) => {
    it(`should have installer file: ${file}`, () => {
      expect(existsSync(repoFile(file))).toBe(true);
    });
  });
});

// ── Deploy scripts ─────────────────────────────────────────────────────────
describe('Deploy Scripts: File Presence', () => {
  const scriptFiles = [
    'infrastructure/scripts/deploy.sh',
    'infrastructure/scripts/health-check.sh',
    'infrastructure/scripts/validate.sh',
    'apps/telegram-miniapp/backend/scripts/deploy-miniapp.sh',
    'apps/telegram-miniapp/backend/scripts/setup-bot.sh',
  ];

  scriptFiles.forEach((file) => {
    it(`should have deploy script: ${file}`, () => {
      expect(existsSync(repoFile(file))).toBe(true);
    });
  });
});

// ── deploy.sh path correctness ─────────────────────────────────────────────
describe('deploy.sh: Path Correctness', () => {
  let deployScript: string;

  beforeAll(() => {
    deployScript = readRepoFile('infrastructure/scripts/deploy.sh');
  });

  it('should reference correct docker path (infrastructure/deploy/docker)', () => {
    expect(deployScript).toContain('infrastructure/deploy/docker');
    expect(deployScript).not.toMatch(/\$PROJECT_ROOT\/deploy\/docker(?!\.)/);
  });

  it('should reference correct AWS terraform path', () => {
    expect(deployScript).toContain('infrastructure/deploy/aws/terraform');
    expect(deployScript).not.toMatch(/\$PROJECT_ROOT\/deploy\/aws/);
  });

  it('should reference correct Kubernetes helm path', () => {
    expect(deployScript).toContain('infrastructure/deploy/kubernetes/helm');
    expect(deployScript).not.toMatch(/\$PROJECT_ROOT\/deploy\/kubernetes/);
  });

  it('should support vercel platform', () => {
    expect(deployScript).toContain('vercel');
  });

  it('should support docker platform', () => {
    expect(deployScript).toContain('docker');
  });

  it('should support aws platform', () => {
    expect(deployScript).toContain('aws');
  });

  it('should support k8s platform', () => {
    expect(deployScript).toContain('k8s');
  });

  it('should support development environment', () => {
    expect(deployScript).toContain('development');
  });

  it('should support production environment', () => {
    expect(deployScript).toContain('production');
  });

  it('should check requirements before deploying', () => {
    expect(deployScript).toContain('check_requirements');
  });
});

// ── Docker Compose path correctness ───────────────────────────────────────
describe('Docker Compose: Dockerfile Path Correctness', () => {
  it('docker-compose.yml should use correct dockerfile path', () => {
    const content = readRepoFile('infrastructure/deploy/docker/docker-compose.yml');
    // After fix: should reference infrastructure/deploy/docker/Dockerfile
    expect(content).toContain('infrastructure/deploy/docker/Dockerfile');
    expect(content).not.toMatch(/dockerfile: deploy\/docker\/Dockerfile(?!\.worker)/);
  });

  it('docker-compose.yml should use correct worker dockerfile path', () => {
    const content = readRepoFile('infrastructure/deploy/docker/docker-compose.yml');
    expect(content).toContain('infrastructure/deploy/docker/Dockerfile.worker');
    expect(content).not.toBe('dockerfile: deploy/docker/Dockerfile.worker');
  });

  it('docker-compose.dev.yml should use correct dockerfile path', () => {
    const content = readRepoFile('infrastructure/deploy/docker/docker-compose.dev.yml');
    expect(content).toContain('infrastructure/deploy/docker/Dockerfile');
    expect(content).not.toMatch(/dockerfile: deploy\/docker\/Dockerfile(?!\.worker)/);
  });
});

// ── Docker Compose structure ───────────────────────────────────────────────
describe('Docker Compose: Structure', () => {
  let composeContent: string;

  beforeAll(() => {
    composeContent = readRepoFile('infrastructure/deploy/docker/docker-compose.yml');
  });

  it('should define app service', () => {
    expect(composeContent).toContain('container_name: tonaiagent-app');
  });

  it('should define worker service', () => {
    expect(composeContent).toContain('container_name: tonaiagent-worker');
  });

  it('should define postgres service', () => {
    expect(composeContent).toContain('container_name: tonaiagent-postgres');
  });

  it('should define redis service', () => {
    expect(composeContent).toContain('container_name: tonaiagent-redis');
  });

  it('should have health checks for app service', () => {
    expect(composeContent).toContain('http://localhost:3000/health');
  });

  it('should use postgres:16 image', () => {
    expect(composeContent).toContain('postgres:16-alpine');
  });

  it('should use redis:7 image', () => {
    expect(composeContent).toContain('redis:7-alpine');
  });
});

// ── Vercel configuration ───────────────────────────────────────────────────
describe('Vercel Configuration', () => {
  let vercelConfig: Record<string, unknown>;

  beforeAll(() => {
    const content = readRepoFile('infrastructure/deploy/vercel/vercel.json');
    vercelConfig = JSON.parse(content);
  });

  it('should have version 2', () => {
    expect(vercelConfig.version).toBe(2);
  });

  it('should have a /health rewrite', () => {
    const rewrites = vercelConfig.rewrites as Array<{ source: string; destination: string }>;
    const healthRewrite = rewrites.find((r) => r.source === '/health');
    expect(healthRewrite).toBeDefined();
    expect(healthRewrite?.destination).toBe('/api/health');
  });

  it('should use nodejs20.x runtime for API functions', () => {
    const functions = vercelConfig.functions as Record<string, { runtime: string; maxDuration: number }>;
    expect(functions['api/**/*.ts'].runtime).toBe('nodejs20.x');
  });

  it('should set security headers', () => {
    const headers = vercelConfig.headers as Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    const globalHeaders = headers.find((h) => h.source === '/(.*)');
    expect(globalHeaders).toBeDefined();
    const headerKeys = globalHeaders!.headers.map((h) => h.key);
    expect(headerKeys).toContain('X-Content-Type-Options');
    expect(headerKeys).toContain('X-Frame-Options');
  });
});

// ── Health check API ───────────────────────────────────────────────────────
describe('Health Check API: Version', () => {
  it('health.ts fallback version should match package.json version', () => {
    const healthTs = readRepoFile('infrastructure/deploy/vercel/api/health.ts');
    const pkg = JSON.parse(readRepoFile('package.json'));

    // Extract the hardcoded fallback version from health.ts
    const match = healthTs.match(/npm_package_version \|\| '([^']+)'/);
    expect(match).not.toBeNull();
    const fallbackVersion = match![1];
    expect(fallbackVersion).toBe(pkg.version);
  });
});

// ── Environment variables in .env.example ─────────────────────────────────
describe('Environment Configuration: .env.example', () => {
  let rootEnvExample: string;
  let dockerEnvExample: string;
  let miniappEnvExample: string;

  beforeAll(() => {
    rootEnvExample = readRepoFile('.env.example');
    dockerEnvExample = readRepoFile('infrastructure/deploy/docker/.env.example');
    miniappEnvExample = readRepoFile('apps/telegram-miniapp/backend/.env.example');
  });

  it('root .env.example should document TELEGRAM_BOT_TOKEN', () => {
    expect(rootEnvExample).toContain('TELEGRAM_BOT_TOKEN');
  });

  it('root .env.example should document GROQ_API_KEY', () => {
    expect(rootEnvExample).toContain('GROQ_API_KEY');
  });

  it('root .env.example should document TON_NETWORK', () => {
    expect(rootEnvExample).toContain('TON_NETWORK');
  });

  it('miniapp .env.example should use current Groq model (llama-3.3)', () => {
    const match = miniappEnvExample.match(/GROQ_MODEL=(\S+)/);
    expect(match).not.toBeNull();
    const model = match![1];
    // Must not use the deprecated llama-3.1-70b-versatile model
    expect(model).not.toBe('llama-3.1-70b-versatile');
    expect(model).toContain('llama-3.3');
  });

  it('docker .env.example should document DB_PASSWORD', () => {
    expect(dockerEnvExample).toContain('DB_PASSWORD');
  });

  it('docker .env.example should document DOMAIN', () => {
    expect(dockerEnvExample).toContain('DOMAIN=');
  });
});

// ── deploy-miniapp.sh modes ────────────────────────────────────────────────
describe('deploy-miniapp.sh: Supported Modes', () => {
  let script: string;

  beforeAll(() => {
    script = readRepoFile('apps/telegram-miniapp/backend/scripts/deploy-miniapp.sh');
  });

  it('should support static mode', () => {
    expect(script).toContain('static');
  });

  it('should support vercel mode', () => {
    expect(script).toContain('vercel');
  });

  it('should support cloudflare mode', () => {
    expect(script).toContain('cloudflare');
  });

  it('should support docker mode', () => {
    expect(script).toContain('docker');
  });

  it('should support php mode', () => {
    expect(script).toContain('php');
  });

  it('should load .env before deploying', () => {
    expect(script).toContain('load_env');
  });

  it('should run bot setup after deployment', () => {
    expect(script).toContain('setup-bot.sh');
  });
});

// ── setup-bot.sh steps ────────────────────────────────────────────────────
describe('setup-bot.sh: Steps', () => {
  let script: string;

  beforeAll(() => {
    script = readRepoFile('apps/telegram-miniapp/backend/scripts/setup-bot.sh');
  });

  it('should validate bot token', () => {
    expect(script).toContain('validate_bot_token');
  });

  it('should register webhook', () => {
    expect(script).toContain('register_webhook');
  });

  it('should verify webhook after registration', () => {
    expect(script).toContain('verify_webhook');
  });

  it('should setup menu button', () => {
    expect(script).toContain('setup_menu_button');
  });

  it('should register bot commands', () => {
    expect(script).toContain('setup_bot_commands');
  });

  it('should require HTTPS for Mini App URL', () => {
    expect(script).toContain('https://');
    expect(script).toContain('HTTPS');
  });

  it('should require curl and jq dependencies', () => {
    expect(script).toContain('curl');
    expect(script).toContain('jq');
  });

  it('should support Telegram Bot API 9.5+ allowed_updates', () => {
    expect(script).toContain('chat_member');
    expect(script).toContain('web_app_data');
  });
});

// ── validate.sh checks ────────────────────────────────────────────────────
describe('validate.sh: Health Checks', () => {
  let script: string;

  beforeAll(() => {
    script = readRepoFile('infrastructure/scripts/validate.sh');
  });

  it('should check health endpoint', () => {
    expect(script).toContain('/health');
  });

  it('should check SSL certificate', () => {
    expect(script).toContain('check_ssl');
  });

  it('should validate Telegram webhook endpoint', () => {
    expect(script).toContain('check_telegram_webhook');
  });

  it('should check response time', () => {
    expect(script).toContain('check_response_time');
  });

  it('should track and report failures', () => {
    expect(script).toContain('FAILURES');
  });

  it('should exit 0 on all passing', () => {
    expect(script).toContain('exit 0');
  });

  it('should exit 1 on failures', () => {
    expect(script).toContain('exit 1');
  });
});

// ── health-check.sh ───────────────────────────────────────────────────────
describe('health-check.sh: Basic Checks', () => {
  let script: string;

  beforeAll(() => {
    script = readRepoFile('infrastructure/scripts/health-check.sh');
  });

  it('should check /health endpoint', () => {
    expect(script).toContain('/health');
  });

  it('should check for healthy status', () => {
    expect(script).toContain('healthy');
  });

  it('should check for degraded status (allowed)', () => {
    expect(script).toContain('degraded');
  });

  it('should exit 0 for healthy/degraded', () => {
    expect(script).toContain('exit 0');
  });

  it('should exit 1 for unhealthy', () => {
    expect(script).toContain('exit 1');
  });

  it('should use jq to parse JSON response', () => {
    expect(script).toContain('jq');
  });
});
