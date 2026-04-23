/**
 * TONAIAgent - AI Output Content Filter
 *
 * Filters AI responses before they are rendered in the UI or passed to downstream
 * systems.  Responsibilities:
 *
 * 1. Strip HTML — allow-list only <b>, <i>, <code> tags.
 * 2. Strip prompt-injection markers (mirrors input sanitization in sanitize.ts).
 * 3. Detect and redact suspicious patterns: credentials, long base64 blobs,
 *    internal/private hostnames.
 *
 * This filter is deterministic and does NOT call any LLM.
 */

// ============================================================================
// Configuration
// ============================================================================

export interface OutputFilterOptions {
  /** Strip all HTML except the allow-listed safe tags. Default: true */
  stripHtml?: boolean;
  /** Strip prompt-injection marker tokens from output. Default: true */
  stripInjectionMarkers?: boolean;
  /** Redact suspicious credential / secret patterns. Default: true */
  redactSuspiciousPatterns?: boolean;
  /** Optional logger; defaults to console */
  logger?: Pick<Console, 'warn'>;
}

const DEFAULTS: Required<Omit<OutputFilterOptions, 'logger'>> = {
  stripHtml: true,
  stripInjectionMarkers: true,
  redactSuspiciousPatterns: true,
};

// ============================================================================
// Patterns
// ============================================================================

/**
 * Tags whose open/close forms are safe to keep in UI output.
 * Everything else is stripped.
 */
const SAFE_HTML_TAG_PATTERN = /^\/?(b|i|code)$/i;

/**
 * Suspicious patterns that may indicate credential leakage or injection
 * in model output.  Each entry also appears in the detection-only list so
 * callers can report findings without necessarily modifying the text.
 */
const SUSPICIOUS_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  // OpenAI / Anthropic / generic API keys
  {
    name: 'openai_key',
    pattern: /\bsk-[A-Za-z0-9]{20,}\b/g,
    replacement: '[REDACTED_API_KEY]',
  },
  // AWS access keys (AKIA + exactly 16 uppercase alphanumeric chars)
  {
    name: 'aws_access_key',
    pattern: /\bAKIA[0-9A-Z]{16}(?![0-9A-Z])/g,
    replacement: '[REDACTED_API_KEY]',
  },
  // Generic "api_key", "apiKey", "api-key" assignments
  {
    name: 'generic_api_key',
    pattern: /\b(?:api[_\-]?key|apikey)\s*[:=]\s*["']?[A-Za-z0-9\-_.]{16,}["']?/gi,
    replacement: '[REDACTED_API_KEY]',
  },
  // Private key PEM headers
  {
    name: 'pem_private_key',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    replacement: '[REDACTED_PRIVATE_KEY]',
  },
  // Long base64 blobs (>= 60 chars of continuous base64) — common obfuscation carrier
  {
    name: 'long_base64',
    pattern: /(?:[A-Za-z0-9+/]{4}){15,}={0,2}/g,
    replacement: '[REDACTED_BASE64]',
  },
  // Internal / RFC-1918 / link-local hostnames in URLs
  {
    name: 'internal_hostname',
    pattern:
      /https?:\/\/(?:localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+)[^\s]*/gi,
    replacement: '[REDACTED_INTERNAL_URL]',
  },
];

/** Injection marker tokens that should not appear in model output. */
const INJECTION_MARKER_PATTERNS: RegExp[] = [
  /\[(?:system|admin|developer|inst|\/inst|user|assistant)\]/gi,
  /\{\{(?:system|admin|developer)\}\}/gi,
  /```(?:system|hidden|secret|admin|developer)[^`]*```/gi,
  // HTML comments used to smuggle instructions
  /<!--[\s\S]*?-->/g,
];

// ============================================================================
// Filter Result
// ============================================================================

export interface FilterResult {
  /** Filtered text safe for rendering / downstream use */
  filtered: string;
  /** True when one or more suspicious patterns were found and redacted */
  hadSuspiciousContent: boolean;
  /** Names of the suspicious pattern types that were matched */
  detectedPatterns: string[];
  /** True when injection markers were stripped */
  hadInjectionMarkers: boolean;
}

// ============================================================================
// Main Filter Function
// ============================================================================

/**
 * Filter an AI response string before it is rendered in the UI or used downstream.
 *
 * Returns a FilterResult with the cleaned text and a report of what was found.
 */
export function filterAIOutput(text: string, options: OutputFilterOptions = {}): FilterResult {
  const opts = { ...DEFAULTS, ...options };
  const logger = options.logger ?? console;

  let result = text;
  let hadInjectionMarkers = false;
  let hadSuspiciousContent = false;
  const detectedPatterns: string[] = [];

  // 1. Strip HTML — keep only safe tags
  if (opts.stripHtml) {
    result = stripUnsafeHtml(result);
  }

  // 2. Strip injection markers
  if (opts.stripInjectionMarkers) {
    const before = result;
    for (const pattern of INJECTION_MARKER_PATTERNS) {
      result = result.replace(pattern, '[blocked]');
    }
    if (result !== before) {
      hadInjectionMarkers = true;
      logger.warn('[output-filter] Injection markers stripped from AI output');
    }
  }

  // 3. Redact suspicious patterns
  if (opts.redactSuspiciousPatterns) {
    for (const { name, pattern, replacement } of SUSPICIOUS_PATTERNS) {
      if (pattern.test(result)) {
        detectedPatterns.push(name);
        hadSuspiciousContent = true;
        logger.warn(`[output-filter] Suspicious pattern "${name}" detected and redacted in AI output`);
      }
      // Reset lastIndex on global regexes before replacing
      pattern.lastIndex = 0;
      result = result.replace(pattern, replacement);
    }
  }

  return { filtered: result, hadSuspiciousContent, detectedPatterns, hadInjectionMarkers };
}

// ============================================================================
// HTML Stripping
// ============================================================================

/**
 * Remove all HTML tags except the explicitly allow-listed safe ones.
 * Safe tags: <b>, </b>, <i>, </i>, <code>, </code>
 *
 * Entire content of dangerous elements (script, style, iframe, object, embed)
 * is removed — not just their tags — to prevent XSS via text content.
 */
function stripUnsafeHtml(text: string): string {
  // Strip HTML comments first
  let result = text.replace(/<!--[\s\S]*?-->/g, '');

  // Strip entire dangerous element content (tags + inner text)
  result = result.replace(
    /<(script|style|iframe|object|embed|form|input|button|textarea|select|noscript)[^>]*>[\s\S]*?<\/\1>/gi,
    ''
  );
  // Also strip self-closing and unclosed dangerous tags
  result = result.replace(
    /<(script|style|iframe|object|embed|form|input|button|textarea|select|noscript)[^>]*\/?>/gi,
    ''
  );

  // Replace each tag: keep it if it's safe, otherwise remove it
  result = result.replace(/<([^>]+)>/g, (_match, tagContent: string) => {
    const tagName = tagContent.trim().split(/\s/)[0];
    if (SAFE_HTML_TAG_PATTERN.test(tagName)) {
      // Reconstruct a safe, attribute-free version of the tag
      const isClose = tagName.startsWith('/');
      const baseName = isClose ? tagName.slice(1) : tagName;
      return isClose ? `</${baseName}>` : `<${baseName}>`;
    }
    return '';
  });

  return result;
}

// ============================================================================
// Convenience: detect without redacting (for audit/logging)
// ============================================================================

export interface SuspiciousPatternMatch {
  name: string;
  count: number;
}

/**
 * Detect suspicious patterns in text without modifying it.
 * Useful for building audit entries before the filter is applied.
 */
export function detectSuspiciousPatterns(text: string): SuspiciousPatternMatch[] {
  const matches: SuspiciousPatternMatch[] = [];

  for (const { name, pattern } of SUSPICIOUS_PATTERNS) {
    pattern.lastIndex = 0;
    const found = text.match(pattern);
    if (found) {
      matches.push({ name, count: found.length });
    }
  }

  return matches;
}
