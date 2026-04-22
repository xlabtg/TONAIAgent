/**
 * Compliance Enforcement Flags (Issue #330)
 *
 * Centralised resolution of environment-driven KYC/AML enforcement flags.
 *
 * Both gates default to **enabled** so that any deployment which does not
 * explicitly opt out runs in the safe, mainnet-compliant configuration.
 * Local development and unit tests can opt out by setting the corresponding
 * variable to the literal string `"false"`.
 *
 *   KYC_ENFORCEMENT_ENABLED   — orchestrator gate on agent creation
 *   AML_ENFORCEMENT_ENABLED   — execution engine gate on every trade
 *
 * Any value other than the case-insensitive literal `"false"` resolves to
 * `true`, including the variable being unset. This biases the system toward
 * safe-by-default behaviour for production / mainnet operation.
 */
export const KYC_ENFORCEMENT_ENV_VAR = 'KYC_ENFORCEMENT_ENABLED';
export const AML_ENFORCEMENT_ENV_VAR = 'AML_ENFORCEMENT_ENABLED';

/** Resolve an env-driven boolean flag with a default-on policy. */
function resolveFlag(rawValue: string | undefined): boolean {
  if (rawValue === undefined) return true;
  return rawValue.trim().toLowerCase() !== 'false';
}

/** Resolve KYC enforcement default from `KYC_ENFORCEMENT_ENABLED` (default: true). */
export function isKycEnforcementEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveFlag(env[KYC_ENFORCEMENT_ENV_VAR]);
}

/** Resolve AML enforcement default from `AML_ENFORCEMENT_ENABLED` (default: true). */
export function isAmlEnforcementEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveFlag(env[AML_ENFORCEMENT_ENV_VAR]);
}

/** Result of asserting compliance gates for production / mainnet. */
export interface ComplianceGateAssertion {
  ok: boolean;
  kycEnabled: boolean;
  amlEnabled: boolean;
  message: string;
}

/**
 * Assert that both compliance gates are enabled. Used by the mainnet deploy
 * script and the production startup path to refuse to proceed when either
 * gate has been disabled.
 */
export function assertComplianceGatesEnabled(
  env: NodeJS.ProcessEnv = process.env,
): ComplianceGateAssertion {
  const kycEnabled = isKycEnforcementEnabled(env);
  const amlEnabled = isAmlEnforcementEnabled(env);
  const ok = kycEnabled && amlEnabled;
  const message = ok
    ? 'KYC and AML enforcement gates are enabled.'
    : `Compliance gates must be enabled: ${KYC_ENFORCEMENT_ENV_VAR}=${env[KYC_ENFORCEMENT_ENV_VAR] ?? '<unset>'}, ` +
      `${AML_ENFORCEMENT_ENV_VAR}=${env[AML_ENFORCEMENT_ENV_VAR] ?? '<unset>'}. ` +
      `Both must resolve to true (unset or any value other than the literal "false") for mainnet / production.`;
  return { ok, kycEnabled, amlEnabled, message };
}
