/**
 * TONAIAgent - Schema Validation Middleware
 *
 * Framework-agnostic request body validation using Zod.
 * Validates incoming request bodies against a given Zod schema and
 * returns a structured 400 response on failure without exposing the
 * raw body in error logs.
 *
 * Implements Issue #309: API input validation
 */

import { z } from 'zod';
import type { AgentControlRequest, AgentControlResponse } from '../../../core/agents/control/index.js';

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationSuccess<T> {
  ok: true;
  data: T;
}

export interface ValidationFailure {
  ok: false;
  response: AgentControlResponse;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ============================================================================
// Middleware
// ============================================================================

/**
 * Validate the body of an API request against a Zod schema.
 *
 * On success, returns `{ ok: true, data }` with the parsed (typed) body.
 * On failure, returns `{ ok: false, response }` with a 400 error response.
 * The rejection is logged with the validation errors (but NOT the raw body
 * to avoid leaking sensitive data).
 */
export function validateBody<TSchema extends z.ZodTypeAny>(
  req: AgentControlRequest,
  schema: TSchema,
): ValidationResult<z.infer<TSchema>> {
  const result = schema.safeParse(req.body);

  if (result.success) {
    return { ok: true, data: result.data as z.infer<TSchema> };
  }

  const issues = result.error.issues.map(i => ({
    path: i.path.join('.'),
    message: i.message,
  }));

  return {
    ok: false,
    response: {
      statusCode: 400,
      body: {
        success: false,
        error: 'Request body validation failed',
        code: 'VALIDATION_ERROR' as const,
        details: issues,
      },
    },
  };
}

/**
 * Validate Content-Type header for POST/PUT/PATCH requests that carry a body.
 * Returns a 415 response when the header is absent or not JSON.
 */
export function validateContentType(req: AgentControlRequest): AgentControlResponse | null {
  const bodyMethods = new Set(['POST', 'PUT', 'PATCH']);
  if (!bodyMethods.has(req.method)) return null;

  const contentType = req.headers?.['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    return {
      statusCode: 415,
      body: {
        success: false,
        error: 'Content-Type must be application/json',
        code: 'UNSUPPORTED_MEDIA_TYPE' as const,
      },
    };
  }

  return null;
}

/**
 * Sanitize a string to remove characters that could enable XSS attacks.
 * Strips script/style blocks (including their content), remaining HTML tags,
 * null bytes, and encodes residual angle brackets.
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/\0/g, '')                                      // remove null bytes
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')   // strip script/style with content
    .replace(/<[^>]*>/g, '')                                 // strip remaining HTML tags
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Recursively sanitize all string values in an object.
 * Safe to call on parsed/validated request bodies.
 */
export function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  return obj;
}
