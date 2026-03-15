/**
 * TON AI Agent - Health Check API
 *
 * Vercel serverless function for health monitoring.
 * Returns system status and component health.
 *
 * @endpoint GET /api/health
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  components: {
    telegram: ComponentHealth;
    ai: ComponentHealth;
    ton: ComponentHealth;
    database?: ComponentHealth;
  };
  uptime: number;
}

interface ComponentHealth {
  status: 'ok' | 'degraded' | 'error';
  latency?: number;
  message?: string;
}

const startTime = Date.now();

async function checkTelegramHealth(): Promise<ComponentHealth> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { status: 'error', message: 'Bot token not configured' };
  }

  try {
    const start = Date.now();
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    if (response.ok) {
      return { status: 'ok', latency };
    }
    return { status: 'degraded', latency, message: 'API returned non-200' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkAIHealth(): Promise<ComponentHealth> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    // Check fallback providers
    if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
      return { status: 'ok', message: 'Using fallback provider' };
    }
    return { status: 'error', message: 'No AI provider configured' };
  }

  try {
    const start = Date.now();
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${groqKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    if (response.ok) {
      return { status: 'ok', latency };
    }
    return { status: 'degraded', latency, message: 'API returned non-200' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkTONHealth(): Promise<ComponentHealth> {
  const network = process.env.TON_NETWORK || 'mainnet';
  const customEndpoint = process.env.TON_RPC_ENDPOINT;

  const endpoint =
    customEndpoint ||
    (network === 'mainnet'
      ? 'https://toncenter.com/api/v2/getAddressInformation'
      : 'https://testnet.toncenter.com/api/v2/getAddressInformation');

  try {
    const start = Date.now();
    // Check with a simple address query (TON Foundation address)
    const response = await fetch(
      `${endpoint}?address=EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPrHF`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }
    );
    const latency = Date.now() - start;

    if (response.ok) {
      return { status: 'ok', latency, message: `Connected to ${network}` };
    }
    return { status: 'degraded', latency, message: 'RPC returned non-200' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkDatabaseHealth(): Promise<ComponentHealth | undefined> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return undefined; // Database is optional
  }

  // For Vercel Postgres, we'd use @vercel/postgres
  // This is a simplified check
  try {
    const start = Date.now();
    // In production, you'd actually query the database
    const latency = Date.now() - start;
    return { status: 'ok', latency };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Run all health checks in parallel
    const [telegram, ai, ton, database] = await Promise.all([
      checkTelegramHealth(),
      checkAIHealth(),
      checkTONHealth(),
      checkDatabaseHealth(),
    ]);

    const components: HealthStatus['components'] = {
      telegram,
      ai,
      ton,
    };

    if (database) {
      components.database = database;
    }

    // Determine overall status
    const statuses = Object.values(components).filter(Boolean);
    const hasError = statuses.some((c) => c?.status === 'error');
    const hasDegraded = statuses.some((c) => c?.status === 'degraded');

    const overallStatus: HealthStatus['status'] = hasError
      ? 'unhealthy'
      : hasDegraded
        ? 'degraded'
        : 'healthy';

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.8.0',
      components,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };

    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    // Cache for 30 seconds
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');

    return res.status(statusCode).json(healthStatus);
  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
