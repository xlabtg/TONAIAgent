/**
 * TONAIAgent - Rate Limiting Middleware
 *
 * Framework-agnostic in-memory rate limiter based on a sliding-window
 * counter.  Mirrors the semantics of `express-rate-limit` but requires
 * no HTTP framework — it operates directly on IP/user identifiers.
 *
 * Implements Issue #309: API input validation
 */

import type { AgentControlRequest, AgentControlResponse } from '../../../core/agents/control/index.js';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Length of the window in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Key extractor — defaults to IP from headers */
  keyExtractor?: (req: AgentControlRequest) => string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

// ============================================================================
// RateLimiter
// ============================================================================

/**
 * In-memory sliding-window rate limiter.
 *
 * Call `check(req)` on every incoming request.  If the limit has not been
 * exceeded the method returns `null` (pass-through).  If the limit IS
 * exceeded it returns a 429 `AgentControlResponse` that should be sent
 * immediately without further processing.
 */
export class RateLimiter {
  private readonly config: Required<RateLimitConfig>;
  private readonly windows = new Map<string, WindowEntry>();

  constructor(config: RateLimitConfig) {
    this.config = {
      keyExtractor: defaultKeyExtractor,
      ...config,
    };
  }

  /**
   * Check whether the request is within the rate limit.
   * Returns `null` if the request is allowed, or a 429 response if blocked.
   */
  check(req: AgentControlRequest): AgentControlResponse | null {
    const key = this.config.keyExtractor(req);
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now >= entry.resetAt) {
      // Start a new window
      this.windows.set(key, { count: 1, resetAt: now + this.config.windowMs });
      return null;
    }

    entry.count++;

    if (entry.count > this.config.max) {
      const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
      return {
        statusCode: 429,
        body: {
          success: false,
          error: 'Too many requests — please retry later',
          code: 'RATE_LIMIT_EXCEEDED' as const,
          retryAfter: retryAfterSecs,
        },
      };
    }

    return null;
  }

  /** Reset the counter for a specific key (useful in tests). */
  reset(key?: string): void {
    if (key !== undefined) {
      this.windows.delete(key);
    } else {
      this.windows.clear();
    }
  }
}

// ============================================================================
// Default Key Extractor
// ============================================================================

function defaultKeyExtractor(req: AgentControlRequest): string {
  // Respect standard proxy headers first, then fall back to a placeholder
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ??
    req.headers?.['x-real-ip'] ??
    'unknown'
  );
}

// ============================================================================
// Pre-built Rate Limiters
// ============================================================================

/**
 * Standard rate limit: 100 requests per 15-minute window.
 * Suitable for general read endpoints.
 */
export function createStandardRateLimit(): RateLimiter {
  return new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  });
}

/**
 * Trade/mutation rate limit: 10 requests per 1-minute window.
 * Suitable for state-mutating endpoints (start/stop/restart).
 */
export function createTradeRateLimit(): RateLimiter {
  return new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
  });
}
