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
  /**
   * Apply Unicode NFKC normalization and strip zero-width / bidi control
   * characters before other processing. Default: true
   */
  normalizeUnicode?: boolean;
  /**
   * Detect and flag large encoded payloads (base64/base32/hex runs).
   * Runs above the threshold are replaced with [blocked-encoded]. Default: true
   */
  blockEncodedPayloads?: boolean;
  /**
   * Minimum run length (chars) to treat as a suspicious encoded payload.
   * Default: 40
   */
  encodedPayloadThreshold?: number;
}

const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  maxLength: 500,
  stripHtml: true,
  stripControlChars: true,
  stripInjectionMarkers: true,
  normalizeUnicode: true,
  blockEncodedPayloads: true,
  encodedPayloadThreshold: 40,
};

// ============================================================================
// Unicode normalization helpers
// ============================================================================

/**
 * Zero-width and bidirectional control code points that are invisible in most
 * renderers but can be used to hide or reorder injection payloads.
 *
 * Ranges:
 *   U+200B–U+200F  zero-width space, ZWNJ, ZWJ, LRM, RLM
 *   U+2028–U+202F  line/paragraph separators, bidi format chars
 *   U+2060–U+206F  word joiner and other invisible operators
 *   U+FE00–U+FE0F  variation selectors (visual variants, no semantic content)
 *   U+FEFF         BOM / zero-width no-break space
 *   U+061C         Arabic letter mark
 *   U+180E         Mongolian vowel separator
 */
const ZERO_WIDTH_AND_BIDI_RE =
  /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFE00-\uFE0F\uFEFF\u061C\u180E]/gu;

/**
 * Normalize a string for safe downstream processing:
 *   1. NFKC — maps fullwidth/halfwidth, compatibility ligatures, superscripts,
 *      etc. to their canonical ASCII/Latin equivalents.
 *   2. Strip zero-width and bidi control characters that are invisible in UIs
 *      but could smuggle payload fragments past regex detectors.
 */
export function normalizeUnicodeInput(input: string): string {
  return input.normalize('NFKC').replace(ZERO_WIDTH_AND_BIDI_RE, '');
}

// ============================================================================
// Encoded payload detection
// ============================================================================

/**
 * Long continuous base64 runs (standard + URL-safe alphabet).
 * A threshold of 40 chars = ~30 bytes decoded, enough to carry "ignore all
 * previous instructions" but short enough not to false-positive on hashes.
 */
function buildBase64Pattern(threshold: number): RegExp {
  const n = Math.max(8, Math.floor(threshold / 4)) * 4; // multiple of 4
  return new RegExp(`(?:[A-Za-z0-9+/\\-_]{4}){${n / 4},}={0,2}`, 'g');
}

/**
 * Continuous lowercase hex runs — used for hex-encoded payloads.
 * 40 hex chars = 20 bytes.
 */
function buildHexPattern(threshold: number): RegExp {
  return new RegExp(`[0-9a-fA-F]{${threshold},}`, 'g');
}

/**
 * Base32 alphabet runs (RFC 4648 — A-Z + 2-7, case-insensitive).
 * 40 base32 chars = 25 bytes decoded.
 */
function buildBase32Pattern(threshold: number): RegExp {
  return new RegExp(`[A-Z2-7]{${threshold},}={0,6}`, 'gi');
}

function blockEncodedPayloads(input: string, threshold: number): string {
  let s = input;
  s = s.replace(buildBase64Pattern(threshold), '[blocked-encoded]');
  s = s.replace(buildHexPattern(threshold), '[blocked-encoded]');
  s = s.replace(buildBase32Pattern(threshold), '[blocked-encoded]');
  return s;
}

// ============================================================================
// Core Sanitization
// ============================================================================

/**
 * Sanitize a generic user-supplied string.
 *
 * Steps (in order):
 * 1. Enforce max length
 * 2. Unicode NFKC normalization + zero-width/bidi stripping
 * 3. Strip ASCII control characters
 * 4. Strip HTML tags
 * 5. Remove prompt-injection markers
 * 6. Block large encoded payloads (base64/base32/hex)
 */
export function sanitizeUserInput(input: string, options: SanitizeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let s = input;

  // 1. Length limit — do this first to avoid processing huge strings
  if (s.length > opts.maxLength) {
    s = s.slice(0, opts.maxLength);
  }

  // 2. Unicode normalization — map lookalikes to ASCII, strip invisible chars
  if (opts.normalizeUnicode) {
    s = normalizeUnicodeInput(s);
  }

  // 3. Strip control characters (keeps \t \n \r which are legitimate whitespace)
  if (opts.stripControlChars) {
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // 4. Strip HTML tags and HTML comments
  if (opts.stripHtml) {
    s = s.replace(/<!--[\s\S]*?-->/g, '');
    s = s.replace(/<[^>]*>/g, '');
  }

  // 5. Remove prompt-injection markers
  if (opts.stripInjectionMarkers) {
    s = removeInjectionMarkers(s);
  }

  // 6. Block large encoded payloads
  if (opts.blockEncodedPayloads) {
    s = blockEncodedPayloads(s, opts.encodedPayloadThreshold);
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
 *
 * After NFKC normalization the input already has fullwidth/homoglyph variants
 * collapsed, so these patterns work on normalized text.
 */
function removeInjectionMarkers(input: string): string {
  let s = input;

  // [system], [admin], [developer], [INST], [/INST], etc.
  s = s.replace(/\[(?:system|admin|developer|inst|\/inst|user|assistant)\]/gi, '[blocked]');

  // URL-encoded variants: %5Bsystem%5D  (%5B=[  %5D=])
  s = s.replace(
    /%5[Bb](?:system|admin|developer|inst|user|assistant)%5[Dd]/gi,
    '[blocked]',
  );

  // {{system}}, {{admin}}, etc. (and HTML-entity {{ → &#123;&#123;)
  s = s.replace(/\{\{(?:system|admin|developer)\}\}/gi, '[blocked]');
  s = s.replace(/&#123;&#123;(?:system|admin|developer)&#125;&#125;/gi, '[blocked]');

  // Markdown-style fenced code blocks with privileged labels
  s = s.replace(/```(?:system|hidden|secret|admin|developer)[^`]*```/gi, '[blocked]');

  // HTML-style comments that could smuggle instructions
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // Base64 payload attempts (explicit "base64:" prefix)
  s = s.replace(/base64\s*:\s*[A-Za-z0-9+/=]{20,}/gi, '[blocked]');

  // URL-encoded "base64" prefix: base64%3A
  s = s.replace(/base64%3[Aa]\s*[A-Za-z0-9+/=]{20,}/gi, '[blocked]');

  return s;
}
