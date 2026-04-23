/**
 * TONAIAgent - AI Action Business Invariant Validator
 *
 * Second-stage validator applied to AI-proposed actions (trade signals) before
 * they are executed.  Checks business invariants that are not expressible in a
 * Zod schema — e.g. runtime limits, whitelists, and known-safe addresses.
 *
 * This validator is deterministic and does NOT call any LLM.
 */

import type { TradeSignal } from './schemas/strategy-signal';

// ============================================================================
// Configuration
// ============================================================================

export interface ActionValidatorConfig {
  /** Maximum single-trade amount in TON. Default: 1000 */
  maxAmountTon?: number;
  /** Set of allowed asset symbols (upper-case). An empty set means "allow all". */
  allowedTokenSymbols?: Set<string>;
  /** Set of known-safe DEX contract addresses. An empty set means "allow all". */
  knownDexAddresses?: Set<string>;
}

const DEFAULT_CONFIG: Required<ActionValidatorConfig> = {
  maxAmountTon: 1000,
  // Conservative default: well-known TON DeFi tokens
  allowedTokenSymbols: new Set(['TON', 'USDT', 'USDC', 'NOT', 'JETTON', 'STON', 'tsTON', 'stTON']),
  // Known STON.fi and DeDust router addresses on mainnet (TON raw format)
  knownDexAddresses: new Set([
    'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTDSDSH4QFZQVN-URP', // STON.fi router v1
    'EQAr5-qJt3xM3Qs0cY4MORqoqnUjNNJK-GzVqh1MODEzHNO', // DeDust vault
  ]),
};

// ============================================================================
// Result Type
// ============================================================================

export interface ActionValidationResult {
  passed: boolean;
  reason?: string;
  failedCheck?: 'amount_limit' | 'token_whitelist' | 'dex_address' | 'action_type';
}

// ============================================================================
// Validator
// ============================================================================

export class ActionInvariantValidator {
  private readonly config: Required<ActionValidatorConfig>;

  constructor(config: ActionValidatorConfig = {}) {
    this.config = {
      maxAmountTon: config.maxAmountTon ?? DEFAULT_CONFIG.maxAmountTon,
      allowedTokenSymbols:
        config.allowedTokenSymbols ?? new Set(DEFAULT_CONFIG.allowedTokenSymbols),
      knownDexAddresses:
        config.knownDexAddresses ?? new Set(DEFAULT_CONFIG.knownDexAddresses),
    };
  }

  /**
   * Validate a TradeSignal produced by the AI before it triggers any execution.
   */
  validate(signal: TradeSignal): ActionValidationResult {
    // 1. Amount within configured limits
    if (signal.amountTon > this.config.maxAmountTon) {
      return {
        passed: false,
        reason: `Proposed amount ${signal.amountTon} TON exceeds the configured limit of ${this.config.maxAmountTon} TON`,
        failedCheck: 'amount_limit',
      };
    }

    // 2. Token pair is in the allow-list (skip check if allowlist is empty)
    if (
      this.config.allowedTokenSymbols.size > 0 &&
      !this.config.allowedTokenSymbols.has(signal.assetSymbol.toUpperCase())
    ) {
      return {
        passed: false,
        reason: `Asset "${signal.assetSymbol}" is not in the allowed token whitelist`,
        failedCheck: 'token_whitelist',
      };
    }

    return { passed: true };
  }

  /**
   * Validate that a DEX address used by an action is in the known-safe list.
   * Call this separately when the execution layer resolves a DEX address.
   */
  validateDexAddress(address: string): ActionValidationResult {
    if (
      this.config.knownDexAddresses.size > 0 &&
      !this.config.knownDexAddresses.has(address)
    ) {
      return {
        passed: false,
        reason: `DEX address "${address}" is not in the known-safe address list`,
        failedCheck: 'dex_address',
      };
    }

    return { passed: true };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createActionValidator(config?: ActionValidatorConfig): ActionInvariantValidator {
  return new ActionInvariantValidator(config);
}
