/**
 * TONAIAgent — Server-Side Trading Mode Enforcement
 *
 * Implements Issue #361: Enforce Simulation / Live Mode Server-Side
 *
 * Simulation vs live is a financial-risk boundary and must be enforced
 * server-side. This module defines the types and validation logic for
 * mode transitions.
 *
 * Rules:
 *   - All agents default to 'simulation' on creation.
 *   - Transition simulation → live requires KYC (standard tier minimum)
 *     and explicit checklist acknowledgements sent as API payload.
 *   - Transition live → simulation is always allowed (safer direction).
 *   - Trade-execution paths must check the server-side tradingMode;
 *     client localStorage is a cache at most.
 */

// ============================================================================
// Core Types
// ============================================================================

/** Server-side trading mode for an agent. */
export type TradingMode = 'simulation' | 'live';

/**
 * Payload required to enable live trading.
 * All three acknowledgements must be true; the server validates each one.
 */
export interface EnableLiveTradingPayload {
  /** User confirms they understand real funds are at risk */
  acknowledgeRealFunds: boolean;
  /** User confirms they have completed the mainnet readiness checklist */
  acknowledgeMainnetChecklist: boolean;
  /** User confirms they accept the risk and have passed KYC */
  acknowledgeRiskAccepted: boolean;
}

/** Result of a trading mode transition attempt. */
export interface TradingModeTransitionResult {
  agentId: string;
  previousMode: TradingMode;
  newMode: TradingMode;
  success: boolean;
  reason?: string;
  auditId: string;
  transitionedAt: Date;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that the enable-live-trading payload contains all required
 * acknowledgements. Returns an error message string if invalid, or null
 * if the payload is acceptable.
 */
export function validateEnableLiveTradingPayload(
  payload: unknown,
): string | null {
  if (!payload || typeof payload !== 'object') {
    return 'Request body must be a JSON object';
  }

  const p = payload as Record<string, unknown>;

  if (p['acknowledgeRealFunds'] !== true) {
    return 'acknowledgeRealFunds must be true — user must confirm real funds are at risk';
  }
  if (p['acknowledgeMainnetChecklist'] !== true) {
    return 'acknowledgeMainnetChecklist must be true — mainnet readiness checklist must be completed';
  }
  if (p['acknowledgeRiskAccepted'] !== true) {
    return 'acknowledgeRiskAccepted must be true — user must explicitly accept the risk';
  }

  return null;
}

// ============================================================================
// Audit ID Generation
// ============================================================================

/** Generate a unique audit trail ID for a mode transition. */
export function generateTransitionAuditId(
  agentId: string,
  userId: string,
  toMode: TradingMode,
): string {
  const ts = Date.now();
  let h = 0x5f3759df;
  const base = `${agentId}::${userId}::${toMode}::${ts}`;
  for (const ch of base) {
    h = ((h * 31 + ch.charCodeAt(0)) >>> 0);
  }
  return `txn_${toMode[0]}_${h.toString(16).padStart(8, '0')}_${ts}`;
}
