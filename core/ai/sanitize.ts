/**
 * TONAIAgent - Input Sanitization Utilities
 *
 * Provides sanitization for all user-controlled fields before they are passed
 * to AI providers. Sanitization should be applied at the boundary where
 * untrusted data enters the system — not inside the AI providers themselves.
 *
 * Usage:
 *   import { sanitizeUserInput } from './sanitize';
 *   const safe = sanitizeUserInput(userProvidedText);
 */

// ============================================================================
// Configuration
// ============================================================================

export interface SanitizeOptions {
  /** Maximum allowed length. Content beyond this is truncated. Default: 500 */
  maxLength?: number;
  /** Strip HTML tags. Default: true */
  stripHtml?: boolean;
  /** Strip ASCII control characters (0x00–0x1F, 0x7F). Default: true */
  stripControlChars?: boolean;
  /** Strip common prompt-injection markers such as [system] or {{admin}}. Default: true */
  stripInjectionMarkers?: boolean;
}

const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  maxLength: 500,
  stripHtml: true,
  stripControlChars: true,
  stripInjectionMarkers: true,
};

// ============================================================================
// Core Sanitization
// ============================================================================

/**
 * Sanitize a generic user-supplied string.
 *
 * Steps (in order):
 * 1. Enforce max length
 * 2. Strip ASCII control characters
 * 3. Strip HTML tags
 * 4. Remove prompt-injection markers
 */
export function sanitizeUserInput(input: string, options: SanitizeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let s = input;

  // 1. Length limit — do this first to avoid processing huge strings
  if (s.length > opts.maxLength) {
    s = s.slice(0, opts.maxLength);
  }

  // 2. Strip control characters (keeps \t \n \r which are legitimate whitespace)
  if (opts.stripControlChars) {
    // eslint-disable-next-line no-control-regex
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // 3. Strip HTML tags and HTML comments
  if (opts.stripHtml) {
    s = s.replace(/<!--[\s\S]*?-->/g, '');
    s = s.replace(/<[^>]*>/g, '');
  }

  // 4. Remove prompt-injection markers
  if (opts.stripInjectionMarkers) {
    s = removeInjectionMarkers(s);
  }

  return s;
}

/**
 * Sanitize a strategy name.
 * Strategy names are displayed in logs and sometimes included in prompts as
 * structured data — they must never contain instructions.
 * Max 100 characters; only alphanumeric, spaces, hyphens, and underscores allowed.
 */
export function sanitizeStrategyName(name: string): string {
  return name
    .slice(0, 100)
    .replace(/[^a-zA-Z0-9 \-_]/g, '') // whitelist approach
    .trim();
}

/**
 * Sanitize market data text fields.
 * Numeric fields are left as-is (they are numbers, not strings, so no injection
 * risk). Only the asset symbol string needs sanitization.
 */
export function sanitizeMarketData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = sanitizeUserInput(value, { maxLength: 50 });
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else if (value === null || value === undefined) {
      result[key] = value;
    } else {
      // Nested objects are not expected in market data — serialize to be safe
      result[key] = String(value).slice(0, 50);
    }
  }

  return result;
}

/**
 * Sanitize a wallet or contract address.
 * Only hexadecimal characters, colons, and minus signs are allowed (covers both
 * EVM 0x… and TON raw address formats).
 */
export function sanitizeAddress(address: string): string {
  return address
    .slice(0, 128)
    .replace(/[^a-zA-Z0-9:+/=-]/g, '')
    .trim();
}

// ============================================================================
// Injection Marker Removal
// ============================================================================

/**
 * Strip common prompt-injection markers from a string.
 * These markers attempt to override the AI's instruction context.
 */
function removeInjectionMarkers(input: string): string {
  let s = input;

  // [system], [admin], [developer], [INST], [/INST], etc.
  s = s.replace(/\[(?:system|admin|developer|inst|\/inst|user|assistant)\]/gi, '[blocked]');

  // {{system}}, {{admin}}, etc.
  s = s.replace(/\{\{(?:system|admin|developer)\}\}/gi, '[blocked]');

  // Markdown-style fenced code blocks with privileged labels
  s = s.replace(/```(?:system|hidden|secret|admin|developer)[^`]*```/gi, '[blocked]');

  // HTML-style comments that could smuggle instructions
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // Base64 payload attempts (common obfuscation)
  s = s.replace(/base64\s*:\s*[A-Za-z0-9+/=]{20,}/gi, '[blocked]');

  return s;
}
