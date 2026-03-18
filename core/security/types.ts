/**
 * TONAIAgent - Security Layer Type Definitions
 *
 * Core types for the production-grade security and key management system.
 * Supports custody models, transaction authorization, and compliance.
 */

// ============================================================================
// Custody Model Types
// ============================================================================

export type CustodyMode = 'non_custodial' | 'smart_contract_wallet' | 'mpc';

export interface CustodyConfig {
  mode: CustodyMode;
  userOwned: boolean;
  platformManaged: boolean;
  recoveryEnabled: boolean;
}

// ============================================================================
// Key Management Types
// ============================================================================

export type KeyType = 'master' | 'signing' | 'encryption' | 'recovery' | 'session';
export type KeyStorageType = 'hsm' | 'enclave' | 'mpc' | 'software' | 'hardware_wallet';

export interface KeyMetadata {
  id: string;
  type: KeyType;
  algorithm: 'ed25519' | 'secp256k1';
  storageType: KeyStorageType;
  createdAt: Date;
  expiresAt?: Date;
  rotatedFrom?: string;
  derivationPath?: string;
  version: number;
  status: KeyStatus;
}

export type KeyStatus = 'active' | 'pending_rotation' | 'rotated' | 'revoked' | 'expired';

export interface KeyShare {
  id: string;
  keyId: string;
  shareIndex: number;
  totalShares: number;
  threshold: number;
  holderType: 'user' | 'platform' | 'recovery_service';
  encryptedShare?: string; // Never contains actual key material in plaintext
  publicData: string;
  createdAt: Date;
}

export interface MPCConfig {
  threshold: number; // Number of shares required to sign (e.g., 2)
  totalShares: number; // Total number of shares (e.g., 3)
  recoveryEnabled: boolean;
  recoveryThreshold: number;
  keyDerivationEnabled: boolean;
}

export interface HSMConfig {
  provider: 'aws_cloudhsm' | 'azure_hsm' | 'thales_luna' | 'yubihsm';
  endpoint?: string;
  clusterId?: string;
  keyLabel?: string;
  operationTimeout: number;
}

export interface SecureEnclaveConfig {
  provider: 'aws_nitro' | 'azure_sgx' | 'intel_sgx';
  attestationEnabled: boolean;
  measurementRequired: boolean;
}

export interface KeyDerivationConfig {
  standard: 'bip32' | 'bip44' | 'slip0010';
  coinType: number; // 607 for TON
  accountIndex: number;
  hardened: boolean;
}

// ============================================================================
// Transaction Authorization Types
// ============================================================================

export interface TransactionRequest {
  id: string;
  type: TransactionType;
  agentId: string;
  userId: string;
  source: WalletInfo;
  destination?: WalletInfo;
  amount?: TokenAmount;
  data?: TransactionData;
  metadata: TransactionMetadata;
  createdAt: Date;
  expiresAt?: Date;
}

export type TransactionType =
  | 'transfer'
  | 'swap'
  | 'stake'
  | 'unstake'
  | 'provide_liquidity'
  | 'remove_liquidity'
  | 'nft_transfer'
  | 'contract_call'
  | 'deploy'
  | 'other';

export interface WalletInfo {
  address: string;
  type: 'user' | 'agent' | 'contract' | 'external';
  isWhitelisted: boolean;
  isNew: boolean;
  tonDns?: string;
}

export interface TokenAmount {
  token: string; // Token address or "TON"
  symbol: string;
  amount: string; // BigInt as string
  decimals: number;
  valueUsd?: number;
  valueTon?: number;
}

export interface TransactionData {
  payload?: string; // Base64 encoded payload
  stateInit?: string;
  jettonAmount?: string;
  forwardPayload?: string;
}

export interface TransactionMetadata {
  protocol?: string; // "dedust", "stonfi", etc.
  operation?: string;
  strategyId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
}

// ============================================================================
// Authorization Pipeline Types
// ============================================================================

export interface AuthorizationContext {
  transactionRequest: TransactionRequest;
  agentPermissions: AgentPermissions;
  userLimits: UserLimits;
  sessionContext: SessionContext;
  riskContext: RiskContext;
}

export interface AuthorizationResult {
  id: string;
  transactionId: string;
  decision: AuthorizationDecision;
  checkedLayers: AuthorizationLayerResult[];
  overallRisk: RiskLevel;
  requiredActions: RequiredAction[];
  validUntil: Date;
  signature?: string;
  metadata: Record<string, unknown>;
}

export type AuthorizationDecision =
  | 'approved'
  | 'approved_with_confirmation'
  | 'pending_review'
  | 'pending_multisig'
  | 'rejected'
  | 'expired';

export interface AuthorizationLayerResult {
  layer: AuthorizationLayer;
  passed: boolean;
  decision: AuthorizationDecision;
  reason?: string;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

export type AuthorizationLayer =
  | 'intent_validation'
  | 'strategy_validation'
  | 'risk_engine'
  | 'policy_engine'
  | 'limit_check'
  | 'rate_limit'
  | 'anomaly_detection'
  | 'simulation';

export interface RequiredAction {
  type: RequiredActionType;
  priority: 'immediate' | 'normal' | 'low';
  description: string;
  metadata?: Record<string, unknown>;
}

export type RequiredActionType =
  | 'user_confirmation'
  | 'multi_sig'
  | 'two_factor'
  | 'email_verification'
  | 'manual_review'
  | 'cooldown_wait';

// ============================================================================
// Policy and Permission Types
// ============================================================================

export interface AgentPermissions {
  agentId: string;
  userId: string;
  capabilities: CapabilitySet;
  accessControl: AccessControl;
  sessionLimits: SessionLimits;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface CapabilitySet {
  trading: TradingCapability;
  transfers: TransferCapability;
  staking: StakingCapability;
  nft: NftCapability;
  governance: GovernanceCapability;
}

export interface TradingCapability {
  enabled: boolean;
  allowedOperations: ('swap' | 'limit_order' | 'market_order')[];
  maxSlippagePercent: number;
  allowedProtocols: string[];
}

export interface TransferCapability {
  enabled: boolean;
  whitelistOnly: boolean;
  allowedDestinations: string[];
  maxSingleTransfer: number; // in TON
}

export interface StakingCapability {
  enabled: boolean;
  allowedValidators: string[];
  maxStakePercent: number; // Percentage of portfolio
  allowUnstake: boolean;
}

export interface NftCapability {
  enabled: boolean;
  allowedOperations: ('transfer' | 'list' | 'buy' | 'mint')[];
  allowedCollections: string[];
}

export interface GovernanceCapability {
  enabled: boolean;
  allowedOperations: ('vote' | 'delegate' | 'propose')[];
  allowedDaos: string[];
}

export interface AccessControl {
  allowedTokens: TokenAccess[];
  allowedProtocols: ProtocolAccess[];
  timeRestrictions: TimeRestrictions;
}

export interface TokenAccess {
  symbol: string;
  address?: string;
  maxAmount: number; // in token units
  dailyLimit?: number;
  weeklyLimit?: number;
}

export interface ProtocolAccess {
  name: string;
  address?: string;
  allowedOperations: string[];
  riskTier: 'low' | 'medium' | 'high';
}

export interface TimeRestrictions {
  tradingHours?: string; // "00:00-23:59" for 24/7
  timezone?: string;
  blackoutPeriods?: BlackoutPeriod[];
}

export interface BlackoutPeriod {
  start: Date;
  end: Date;
  reason: string;
}

export interface SessionLimits {
  maxTradesPerSession: number;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  requireReauthAfter?: number; // Minutes
}

export interface UserLimits {
  userId: string;
  dailyTransactionLimit: number; // in TON
  weeklyTransactionLimit: number;
  monthlyTransactionLimit: number;
  singleTransactionLimit: number;
  largeTransactionThreshold: number;
  usedToday: number;
  usedThisWeek: number;
  usedThisMonth: number;
  lastReset: Date;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  agentId: string;
  startedAt: Date;
  lastActivityAt: Date;
  transactionCount: number;
  totalVolume: number;
  deviceInfo?: DeviceInfo;
  authenticated: boolean;
  authenticationMethod?: AuthMethod;
}

export type AuthMethod = 'telegram' | 'wallet_connect' | 'web3_signature' | 'api_key';

export interface DeviceInfo {
  id: string;
  type: 'mobile' | 'desktop' | 'web' | 'api';
  platform?: string;
  lastSeen: Date;
  isTrusted: boolean;
}

// ============================================================================
// Risk Assessment Types
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskContext {
  transactionRisk: TransactionRiskScore;
  behavioralRisk: BehavioralRiskScore;
  marketRisk: MarketRiskScore;
  overallRisk: RiskLevel;
  recommendations: RiskRecommendation[];
}

export interface TransactionRiskScore {
  score: number; // 0-1
  factors: RiskFactor[];
  flags: RiskFlag[];
}

export interface BehavioralRiskScore {
  score: number;
  anomalyScore: number;
  deviationFromNormal: number;
  recentActivityScore: number;
}

export interface MarketRiskScore {
  score: number;
  volatilityScore: number;
  liquidityScore: number;
  priceImpactEstimate: number;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
  description: string;
}

export interface RiskFlag {
  type: RiskFlagType;
  severity: RiskLevel;
  description: string;
  metadata?: Record<string, unknown>;
}

export type RiskFlagType =
  | 'new_destination'
  | 'large_amount'
  | 'unusual_time'
  | 'velocity_spike'
  | 'unknown_protocol'
  | 'high_slippage'
  | 'suspicious_pattern'
  | 'blacklisted_address';

export interface RiskRecommendation {
  action: string;
  reason: string;
  priority: 'required' | 'suggested' | 'optional';
}

// ============================================================================
// Signing Types
// ============================================================================

export interface SigningRequest {
  id: string;
  transactionId: string;
  authorizationId: string;
  message: string; // Base64 encoded message to sign
  messageHash: string;
  signerType: SignerType;
  requiredSignatures: number;
  collectedSignatures: SignatureInfo[];
  status: SigningStatus;
  createdAt: Date;
  expiresAt: Date;
}

export type SignerType = 'single' | 'multi_sig' | 'mpc_threshold';

export interface SignatureInfo {
  signerId: string;
  signerType: 'user' | 'platform' | 'recovery';
  signature: string; // Base64 encoded
  publicKey: string;
  signedAt: Date;
  verified: boolean;
}

export type SigningStatus =
  | 'pending'
  | 'collecting_signatures'
  | 'ready_to_broadcast'
  | 'broadcast'
  | 'confirmed'
  | 'failed'
  | 'expired';

// ============================================================================
// Emergency Types
// ============================================================================

export interface EmergencyEvent {
  id: string;
  type: EmergencyType;
  severity: RiskLevel;
  triggeredBy: string;
  triggeredAt: Date;
  affectedAgents: string[];
  affectedUsers: string[];
  status: EmergencyStatus;
  actions: EmergencyAction[];
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export type EmergencyType =
  | 'security_breach'
  | 'anomaly_detected'
  | 'risk_limit_breach'
  | 'system_failure'
  | 'suspicious_activity'
  | 'manual_trigger'
  | 'compliance_hold';

export type EmergencyStatus = 'active' | 'investigating' | 'mitigating' | 'resolved' | 'false_alarm';

export interface EmergencyAction {
  type: EmergencyActionType;
  targetType: 'agent' | 'user' | 'system' | 'all';
  targetId?: string;
  executedAt: Date;
  executedBy: string;
  success: boolean;
  details?: string;
}

export type EmergencyActionType =
  | 'pause_agent'
  | 'pause_all_agents'
  | 'revoke_permissions'
  | 'lock_funds'
  | 'cancel_pending_transactions'
  | 'notify_user'
  | 'alert_admin'
  | 'enable_maintenance_mode';

// ============================================================================
// Recovery Types
// ============================================================================

export interface RecoveryRequest {
  id: string;
  userId: string;
  type: RecoveryType;
  status: RecoveryStatus;
  verificationSteps: VerificationStep[];
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export type RecoveryType =
  | 'key_recovery'
  | 'access_recovery'
  | 'wallet_recovery'
  | 'social_recovery';

export type RecoveryStatus =
  | 'initiated'
  | 'verification_pending'
  | 'verification_complete'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface VerificationStep {
  type: 'email' | 'sms' | 'guardian' | 'recovery_phrase' | 'biometric' | 'device';
  status: 'pending' | 'verified' | 'failed';
  required: boolean;
  verifiedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  actor: AuditActor;
  action: string;
  resource: AuditResource;
  outcome: 'success' | 'failure' | 'partial';
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, unknown>;
  context: AuditContext;
  signature?: string; // Tamper-proof signature
}

export type AuditEventType =
  | 'authentication'
  | 'authorization'
  | 'transaction'
  | 'key_operation'
  | 'permission_change'
  | 'emergency_action'
  | 'recovery'
  | 'admin_action'
  | 'system_event';

export interface AuditActor {
  type: 'user' | 'agent' | 'system' | 'admin';
  id: string;
  name?: string;
  ipAddress?: string;
  deviceId?: string;
}

export interface AuditResource {
  type: string;
  id: string;
  name?: string;
}

export interface AuditContext {
  requestId: string;
  sessionId?: string;
  correlationId?: string;
  parentEventId?: string;
  environment: string;
  version: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SecurityConfig {
  enabled: boolean;
  custody: CustodyConfig;
  mpc: MPCConfig;
  hsm?: HSMConfig;
  enclave?: SecureEnclaveConfig;
  keyDerivation: KeyDerivationConfig;
  authorization: AuthorizationConfig;
  risk: RiskConfig;
  emergency: EmergencyConfig;
  audit: AuditConfig;
}

export interface AuthorizationConfig {
  enabledLayers: AuthorizationLayer[];
  simulationRequired: boolean;
  maxLatencyMs: number;
  cacheDecisionSeconds: number;
  requireMultiSigAbove: number; // TON amount
}

export interface RiskConfig {
  enabled: boolean;
  mlModelEnabled: boolean;
  behavioralAnalysisEnabled: boolean;
  thresholds: SecurityRiskThresholds;
  velocityLimits: VelocityLimits;
}

export interface SecurityRiskThresholds {
  lowRiskMax: number;
  mediumRiskMax: number;
  highRiskMax: number;
  autoBlockAbove: number;
}

export interface VelocityLimits {
  maxTransactionsPerMinute: number;
  maxTransactionsPerHour: number;
  maxTransactionsPerDay: number;
  unusualVolumeMultiplier: number;
}

export interface EmergencyConfig {
  killSwitchEnabled: boolean;
  autoTriggerEnabled: boolean;
  notificationChannels: string[];
  escalationTimeMinutes: number;
}

export interface AuditConfig {
  enabled: boolean;
  logLevel: 'minimal' | 'standard' | 'verbose';
  retentionDays: number;
  signatureEnabled: boolean;
  externalExportEnabled: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: RiskLevel;
  source: string;
  message: string;
  data: Record<string, unknown>;
}

export type SecurityEventType =
  | 'key_generated'
  | 'key_rotated'
  | 'key_revoked'
  | 'transaction_authorized'
  | 'transaction_rejected'
  | 'risk_alert'
  | 'emergency_triggered'
  | 'permission_changed'
  | 'audit_logged';

export type SecurityEventCallback = (event: SecurityEvent) => void;
