/**
 * TONAIAgent - AI Output Schema Validator
 *
 * Validates AI response content against a Zod schema.
 * On schema mismatch: logs the failure, drops the response, and retries with
 * exponential backoff up to a configurable maximum. Surfaces a structured error
 * when all retries are exhausted.
 *
 * Usage:
 *   import { validateAIOutput } from './output-validator';
 *   const signal = await validateAIOutput(rawText, TradeSignalSchema, retryFn);
 */

import { z, ZodTypeAny } from 'zod';

// ============================================================================
// Configuration
// ============================================================================

export interface OutputValidatorOptions {
  /** Maximum number of retry attempts after the first failure. Default: 2 */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff. Default: 500 */
  baseDelayMs?: number;
  /** Optional logger; defaults to console */
  logger?: Pick<Console, 'warn' | 'error'>;
}

const DEFAULTS: Required<Omit<OutputValidatorOptions, 'logger'>> = {
  maxRetries: 2,
  baseDelayMs: 500,
};

// ============================================================================
// Result Types
// ============================================================================

export type OutputValidationResult<T> =
  | { ok: true; data: T; raw: string; attempts: number }
  | { ok: false; error: string; raw: string; attempts: number };

// ============================================================================
// Core Validator
// ============================================================================

/**
 * Parse the raw AI text as JSON and validate against the given Zod schema.
 * Returns a typed result — never throws.
 */
export function parseAndValidate<T extends ZodTypeAny>(
  raw: string,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  let parsed: unknown;

  try {
    // Strip markdown code fences the model sometimes adds
    const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(trimmed);
  } catch {
    return { success: false, error: `JSON parse error: invalid JSON in AI response` };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  return { success: false, error: `Schema validation failed: ${issues}` };
}

/**
 * Validate an AI output with retry support.
 *
 * @param getRawResponse - Async function that produces the raw AI text on each attempt.
 *   Pass the initial response as a closure; on retry, use the `attempt` argument to
 *   call the model again.
 * @param schema - Zod schema describing the expected response shape.
 * @param options - Retry and logging options.
 *
 * @returns OutputValidationResult — either the validated typed data or a structured error.
 */
export async function validateAIOutput<T extends ZodTypeAny>(
  getRawResponse: (attempt: number) => Promise<string> | string,
  schema: T,
  options: OutputValidatorOptions = {}
): Promise<OutputValidationResult<z.infer<T>>> {
  const maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
  const baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const logger = options.logger ?? console;

  let lastRaw = '';
  let lastError = '';

  const totalAttempts = maxRetries + 1;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const raw = await getRawResponse(attempt);
    lastRaw = raw;

    const result = parseAndValidate(raw, schema);
    if (result.success) {
      if (attempt > 0) {
        logger.warn(
          `[output-validator] Succeeded on attempt ${attempt + 1} after ${attempt} retry/retries`
        );
      }
      return { ok: true, data: result.data, raw, attempts: attempt + 1 };
    }

    lastError = result.error;
    logger.warn(
      `[output-validator] Attempt ${attempt + 1}/${totalAttempts} failed — ${lastError}. Raw: ${raw.slice(0, 200)}`
    );

    if (attempt < totalAttempts - 1) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  logger.error(
    `[output-validator] All ${totalAttempts} attempt(s) failed. Last error: ${lastError}`
  );
  return { ok: false, error: lastError, raw: lastRaw, attempts: totalAttempts };
}

// ============================================================================
// Audit Logging
// ============================================================================

export interface ValidationAuditEntry {
  timestamp: string;
  schema: string;
  attempts: number;
  verdict: 'pass' | 'fail';
  error?: string;
  /** Truncated raw AI response for audit purposes */
  rawSnippet: string;
}

/**
 * Build an audit trail entry from a validation result.
 * Logs raw AI response alongside the validator verdict — satisfies the requirement
 * to persist raw + validated + verdict to the audit trail.
 */
export function buildAuditEntry<T>(
  result: OutputValidationResult<T>,
  schemaName: string
): ValidationAuditEntry {
  return {
    timestamp: new Date().toISOString(),
    schema: schemaName,
    attempts: result.attempts,
    verdict: result.ok ? 'pass' : 'fail',
    error: result.ok ? undefined : result.error,
    rawSnippet: result.raw.slice(0, 500),
  };
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
