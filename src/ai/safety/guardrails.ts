/**
 * TONAIAgent - Safety Guardrails
 *
 * Implements comprehensive safety checks including:
 * - Prompt injection detection
 * - Content filtering
 * - Risk validation for financial operations
 * - PII detection and redaction
 */

import {
  SafetyConfig,
  SafetyCheckResult,
  ContentCategory,
  CompletionRequest,
  CompletionResponse,
  InputValidationConfig,
  OutputValidationConfig,
  ContentFilterConfig,
  RiskThresholds,
} from '../types';

// ============================================================================
// Pattern Definitions
// ============================================================================

const PROMPT_INJECTION_PATTERNS = [
  /ignore (?:all )?(?:previous|above|prior) (?:instructions|prompts|rules)/i,
  /disregard (?:all )?(?:previous|above|prior)/i,
  /forget (?:everything|all|what) (?:i|you|we|you were|i was) (?:said|told|instructed)/i,
  /forget everything.*(?:told|said|instructed) (?:before|earlier|previously)/i,
  /you are now (?:a|an|the)/i,
  /pretend (?:you are|to be)/i,
  /act as if you (?:are|were)/i,
  /from now on[,]? (?:you|ignore|forget)/i,
  /new (?:instructions|rules|persona)/i,
  /\[(?:system|admin|developer)\]/i,
  /\{\{(?:system|admin)\}\}/i,
  /```(?:system|hidden|secret)/i,
  /<!--.*(?:instruction|ignore).*-->/i,
  /base64\s*:/i,
  /eval\s*\(/i,
  /execute\s+(?:command|code|script)/i,
];

const JAILBREAK_PATTERNS = [
  /dan (?:mode|prompt)/i,
  /developer mode/i,
  /bypass (?:safety|filter|restriction)/i,
  /unlock (?:mode|restriction)/i,
  /remove (?:all )?(?:restriction|filter|safety|constraint|ethical)/i,
  /disable (?:ethics|safety|filter)/i,
  /no (?:moral|ethical) (?:constraint|limit)/i,
  /hypothetically[,]? (?:if|assume)/i,
  /for (?:educational|research) purposes only/i,
  /pretend (?:this is|we are) (?:fiction|a game|roleplay)/i,
];

const DANGEROUS_CONTENT_PATTERNS: Record<ContentCategory, RegExp[]> = {
  hate: [
    /\b(?:kill|murder|exterminate) (?:all )?(?:members? of )?(?:that )?(?:jews?|muslims?|christians?|blacks?|whites?|asians?|gays?|ethnic group)/i,
    /(?:racial|ethnic) (?:cleansing|genocide)/i,
  ],
  harassment: [
    /\b(?:stalk|harass|threaten|intimidate) (?:them|her|him|you)/i,
    /(?:dox|doxx|expose) (?:personal|private) information/i,
  ],
  violence: [
    /(?:how to|instructions (?:for|to)) (?:make|build|create) (?:a )?(?:bomb|explosive|weapon)/i,
    /(?:detailed|step.?by.?step) (?:guide|instructions) (?:to|for) (?:make|build|kill|attack|harm)/i,
    /detailed instructions to make a bomb/i,
  ],
  sexual: [
    /(?:explicit|graphic) (?:sexual|pornographic) (?:content|material)/i,
  ],
  self_harm: [
    /(?:how to|ways to|methods? (?:to|for)) (?:kill|hurt|harm) (?:yourself|myself|oneself)/i,
    /(?:suicide|self.?harm) (?:method|technique|instruction)/i,
  ],
  dangerous: [
    /(?:how to|instructions for) (?:hack|break into|exploit) (?:system|network|account)/i,
    /(?:malware|ransomware|virus) (?:code|creation|development)/i,
    /(?:synthesize|synthesizing|manufacture|produce) (?:drug|poison|dangerous|chemical weapon)s?/i,
    /instructions for (?:synthesizing|creating|making) (?:dangerous )?(?:chemical )?weapons?/i,
  ],
  financial_advice: [
    /(?:guaranteed|100%|sure) (?:profit|return|gain)/i,
    /(?:invest|put) (?:all|everything) (?:in|into)/i,
    /(?:can't|cannot|won't) lose/i,
  ],
  medical_advice: [
    /(?:stop|don't) (?:taking|using) (?:your )?(?:medication|medicine|prescription)/i,
    /(?:cure|treat|heal) (?:cancer|diabetes|aids|hiv) with/i,
  ],
  legal_advice: [
    /(?:this is|here's) (?:legal|legally) (?:binding|valid)/i,
    /(?:i|we) guarantee (?:this|you) (?:will|won't) (?:win|lose)/i,
  ],
};

const PII_PATTERNS = [
  { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
  { type: 'phone', pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { type: 'ssn', pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g },
  { type: 'credit_card', pattern: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g },
  { type: 'ip_address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { type: 'api_key', pattern: /\b(?:sk-|pk-|api[_-]?key[_-]?)[a-zA-Z0-9]{20,}\b/gi },
  { type: 'private_key', pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/gi },
  { type: 'wallet_address', pattern: /\b(?:0x[a-fA-F0-9]{40}|EQ[a-zA-Z0-9_-]{46})\b/g },
];

// ============================================================================
// Input Validator
// ============================================================================

export class InputValidator {
  constructor(private readonly config: InputValidationConfig) {}

  validate(input: string): SafetyCheckResult {
    // Check length
    if (input.length > this.config.maxLength) {
      return {
        passed: false,
        reason: `Input exceeds maximum length of ${this.config.maxLength} characters`,
        severity: 'medium',
        action: 'block',
      };
    }

    // Check for prompt injection
    if (this.config.detectPromptInjection) {
      const injectionCheck = this.detectPromptInjection(input);
      if (!injectionCheck.passed) {
        return injectionCheck;
      }
    }

    // Check for jailbreak attempts
    if (this.config.detectJailbreak) {
      const jailbreakCheck = this.detectJailbreak(input);
      if (!jailbreakCheck.passed) {
        return jailbreakCheck;
      }
    }

    // Check blocked patterns
    if (this.config.blockPatterns) {
      for (const pattern of this.config.blockPatterns) {
        if (pattern.test(input)) {
          return {
            passed: false,
            reason: 'Input matches blocked pattern',
            severity: 'high',
            action: 'block',
          };
        }
      }
    }

    return {
      passed: true,
      severity: 'low',
      action: 'allow',
    };
  }

  validateRequest(request: CompletionRequest): SafetyCheckResult {
    for (const message of request.messages) {
      const result = this.validate(message.content);
      if (!result.passed) {
        return {
          ...result,
          metadata: { messageRole: message.role },
        };
      }
    }

    return {
      passed: true,
      severity: 'low',
      action: 'allow',
    };
  }

  sanitize(input: string): string {
    let sanitized = input;

    // Remove HTML if configured
    if (this.config.sanitizeHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove potential injection markers
    sanitized = sanitized.replace(/\[system\]/gi, '[blocked]');
    sanitized = sanitized.replace(/\[admin\]/gi, '[blocked]');
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

    return sanitized;
  }

  private detectPromptInjection(input: string): SafetyCheckResult {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return {
          passed: false,
          reason: 'Potential prompt injection detected',
          severity: 'high',
          action: 'block',
          metadata: { pattern: pattern.source },
        };
      }
    }

    return { passed: true, severity: 'low', action: 'allow' };
  }

  private detectJailbreak(input: string): SafetyCheckResult {
    for (const pattern of JAILBREAK_PATTERNS) {
      if (pattern.test(input)) {
        return {
          passed: false,
          reason: 'Potential jailbreak attempt detected',
          severity: 'high',
          action: 'block',
          metadata: { pattern: pattern.source },
        };
      }
    }

    return { passed: true, severity: 'low', action: 'allow' };
  }
}

// ============================================================================
// Output Validator
// ============================================================================

export class OutputValidator {
  constructor(private readonly config: OutputValidationConfig) {}

  validate(output: string): SafetyCheckResult {
    // Check length
    if (output.length > this.config.maxLength) {
      return {
        passed: false,
        reason: `Output exceeds maximum length of ${this.config.maxLength} characters`,
        severity: 'low',
        action: 'warn',
      };
    }

    // Check for PII
    if (this.config.detectPii) {
      const piiCheck = this.detectPii(output);
      if (!piiCheck.passed) {
        return piiCheck;
      }
    }

    return {
      passed: true,
      severity: 'low',
      action: 'allow',
    };
  }

  validateResponse(response: CompletionResponse): SafetyCheckResult {
    for (const choice of response.choices) {
      const result = this.validate(choice.message.content);
      if (!result.passed) {
        return result;
      }
    }

    return {
      passed: true,
      severity: 'low',
      action: 'allow',
    };
  }

  redactSensitive(output: string): string {
    if (!this.config.redactSensitive) {
      return output;
    }

    let redacted = output;

    for (const { type, pattern } of PII_PATTERNS) {
      redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
    }

    return redacted;
  }

  private detectPii(output: string): SafetyCheckResult {
    for (const { type, pattern } of PII_PATTERNS) {
      const matches = output.match(pattern);
      if (matches && matches.length > 0) {
        return {
          passed: false,
          reason: `Potential ${type} detected in output`,
          severity: 'medium',
          action: this.config.redactSensitive ? 'warn' : 'block',
          metadata: { piiType: type, count: matches.length },
        };
      }
    }

    return { passed: true, severity: 'low', action: 'allow' };
  }
}

// ============================================================================
// Content Filter
// ============================================================================

export class ContentFilter {
  constructor(private readonly config: ContentFilterConfig) {}

  filter(content: string): SafetyCheckResult {
    for (const category of this.config.categories) {
      const patterns = DANGEROUS_CONTENT_PATTERNS[category];
      if (!patterns) continue;

      // Threshold used for confidence-based filtering (reserved for future ML integration)
      void (this.config.thresholds[category] ?? 0.5);

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return {
            passed: false,
            category,
            reason: `Content violates ${category} policy`,
            severity: 'critical',
            action: 'block',
            metadata: { category, pattern: pattern.source },
          };
        }
      }
    }

    return {
      passed: true,
      severity: 'low',
      action: 'allow',
    };
  }
}

// ============================================================================
// Risk Validator (for financial operations)
// ============================================================================

export interface TransactionContext {
  valueTon: number;
  dailyTotalTon: number;
  destinationAddress?: string;
  isNewDestination?: boolean;
  transactionType: 'transfer' | 'swap' | 'stake' | 'unstake' | 'other';
}

export class RiskValidator {
  constructor(private readonly thresholds: RiskThresholds) {}

  validateTransaction(context: TransactionContext): SafetyCheckResult {
    // Check single transaction limit
    if (context.valueTon > this.thresholds.maxTransactionValueTon) {
      return {
        passed: false,
        reason: `Transaction value ${context.valueTon} TON exceeds maximum ${this.thresholds.maxTransactionValueTon} TON`,
        severity: 'high',
        action: 'block',
        metadata: { limit: 'single_transaction', value: context.valueTon },
      };
    }

    // Check daily limit
    if (context.dailyTotalTon + context.valueTon > this.thresholds.maxDailyTransactionsTon) {
      return {
        passed: false,
        reason: `Transaction would exceed daily limit of ${this.thresholds.maxDailyTransactionsTon} TON`,
        severity: 'high',
        action: 'block',
        metadata: { limit: 'daily', projected: context.dailyTotalTon + context.valueTon },
      };
    }

    // Additional risk for new destinations (check first as it's more specific)
    if (context.isNewDestination && context.valueTon > 100) {
      return {
        passed: true,
        reason: 'Large transfer to new destination requires confirmation',
        severity: 'medium',
        action: 'escalate',
        metadata: { newDestination: true },
      };
    }

    // Check if confirmation required
    if (context.valueTon > this.thresholds.requireConfirmationAbove) {
      return {
        passed: true,
        reason: `Transaction requires confirmation (value: ${context.valueTon} TON)`,
        severity: 'medium',
        action: 'escalate',
        metadata: { requireConfirmation: true },
      };
    }

    // Check if multi-sig required
    if (context.valueTon > this.thresholds.requireMultiSigAbove) {
      return {
        passed: true,
        reason: `Transaction requires multi-signature (value: ${context.valueTon} TON)`,
        severity: 'high',
        action: 'escalate',
        metadata: { requireMultiSig: true },
      };
    }

    return {
      passed: true,
      severity: 'low',
      action: 'allow',
    };
  }
}

// ============================================================================
// Safety Manager
// ============================================================================

export class SafetyManager {
  private readonly inputValidator: InputValidator;
  private readonly outputValidator: OutputValidator;
  private readonly contentFilter: ContentFilter;
  private readonly riskValidator: RiskValidator;
  private readonly enabled: boolean;

  constructor(config: SafetyConfig) {
    this.enabled = config.enabled;
    this.inputValidator = new InputValidator(config.inputValidation);
    this.outputValidator = new OutputValidator(config.outputValidation);
    this.contentFilter = new ContentFilter(config.contentFiltering);
    this.riskValidator = new RiskValidator(config.riskThresholds);
  }

  /**
   * Validate an incoming request
   */
  validateRequest(request: CompletionRequest): SafetyCheckResult[] {
    if (!this.enabled) {
      return [{ passed: true, severity: 'low', action: 'allow' }];
    }

    const results: SafetyCheckResult[] = [];

    // Input validation
    results.push(this.inputValidator.validateRequest(request));

    // Content filtering on input
    for (const message of request.messages) {
      results.push(this.contentFilter.filter(message.content));
    }

    return results;
  }

  /**
   * Validate an outgoing response
   */
  validateResponse(response: CompletionResponse): SafetyCheckResult[] {
    if (!this.enabled) {
      return [{ passed: true, severity: 'low', action: 'allow' }];
    }

    const results: SafetyCheckResult[] = [];

    // Output validation
    results.push(this.outputValidator.validateResponse(response));

    // Content filtering on output
    for (const choice of response.choices) {
      results.push(this.contentFilter.filter(choice.message.content));
    }

    return results;
  }

  /**
   * Validate a financial transaction
   */
  validateTransaction(context: TransactionContext): SafetyCheckResult {
    if (!this.enabled) {
      return { passed: true, severity: 'low', action: 'allow' };
    }

    return this.riskValidator.validateTransaction(context);
  }

  /**
   * Sanitize input content
   */
  sanitizeInput(input: string): string {
    return this.inputValidator.sanitize(input);
  }

  /**
   * Redact sensitive information from output
   */
  redactOutput(output: string): string {
    return this.outputValidator.redactSensitive(output);
  }

  /**
   * Check if all results pass safety checks
   */
  allPassed(results: SafetyCheckResult[]): boolean {
    return results.every((r) => r.passed && r.action !== 'block');
  }

  /**
   * Get the most severe result from a list
   */
  getMostSevere(results: SafetyCheckResult[]): SafetyCheckResult | null {
    const severityOrder: Record<SafetyCheckResult['severity'], number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const failed = results.filter((r) => !r.passed);
    if (failed.length === 0) return null;

    return failed.reduce((most, current) =>
      severityOrder[current.severity] > severityOrder[most.severity] ? current : most
    );
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSafetyManager(config?: Partial<SafetyConfig>): SafetyManager {
  const defaultConfig: SafetyConfig = {
    enabled: true,
    inputValidation: {
      maxLength: 100000,
      detectPromptInjection: true,
      detectJailbreak: true,
      sanitizeHtml: true,
    },
    outputValidation: {
      maxLength: 100000,
      detectHallucination: false, // Requires additional logic
      detectPii: true,
      redactSensitive: true,
    },
    contentFiltering: {
      categories: [
        'hate',
        'harassment',
        'violence',
        'self_harm',
        'dangerous',
        'financial_advice',
      ],
      thresholds: {},
    },
    riskThresholds: {
      maxTransactionValueTon: 1000,
      maxDailyTransactionsTon: 5000,
      requireConfirmationAbove: 100,
      requireMultiSigAbove: 1000,
    },
    ...config,
  };

  return new SafetyManager(defaultConfig);
}
