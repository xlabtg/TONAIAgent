/**
 * TONAIAgent - Security UX
 *
 * Ensures:
 * - Clear confirmations
 * - Risk warnings
 * - Transparent controls
 * - Biometric authentication
 * - Anti-phishing UX
 */

import {
  ConfirmationConfig,
  BiometricOptions,
  BiometricType,
  SecurityWarning,
  AntiPhishingSettings,
  UserProfile,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Security UX configuration
 */
export interface SecurityUXConfig {
  /** Biometric options */
  biometric?: Partial<BiometricOptions>;
  /** Anti-phishing settings */
  antiPhishing?: Partial<AntiPhishingSettings>;
  /** Session timeout (seconds) */
  sessionTimeout?: number;
  /** Confirmation threshold (in TON) */
  confirmationThreshold?: number;
  /** Show security tips */
  showSecurityTips?: boolean;
  /** Require confirmation for all transactions */
  alwaysConfirm?: boolean;
  /** Risk warning level */
  riskWarningLevel?: 'all' | 'medium_high' | 'high_only' | 'none';
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<SecurityUXConfig> = {
  biometric: {
    availableTypes: ['fingerprint', 'face_id'],
    preferredType: 'fingerprint',
    fallbackToPin: true,
    sessionDuration: 300, // 5 minutes
  },
  antiPhishing: {
    showOnSensitiveActions: true,
    phishingPatterns: [],
  },
  sessionTimeout: 900, // 15 minutes
  confirmationThreshold: 10,
  showSecurityTips: true,
  alwaysConfirm: false,
  riskWarningLevel: 'medium_high',
};

// ============================================================================
// Risk Assessment Rules
// ============================================================================

/**
 * Risk factor
 */
interface RiskFactor {
  id: string;
  name: string;
  description: string;
  weight: number;
  check: (context: TransactionContext) => boolean;
}

const RISK_FACTORS: RiskFactor[] = [
  {
    id: 'high_value',
    name: 'High Value Transaction',
    description: 'Transaction value exceeds your usual amount',
    weight: 30,
    check: (ctx) => ctx.amount > ctx.userAvgTransaction * 5,
  },
  {
    id: 'new_address',
    name: 'New Recipient',
    description: 'You have never sent to this address before',
    weight: 25,
    check: (ctx) => !ctx.knownAddresses.includes(ctx.recipientAddress ?? ''),
  },
  {
    id: 'unknown_contract',
    name: 'Unknown Contract',
    description: 'Interacting with an unverified smart contract',
    weight: 35,
    check: (ctx) => ctx.isContract && !ctx.contractVerified,
  },
  {
    id: 'high_slippage',
    name: 'High Slippage',
    description: 'Slippage tolerance is unusually high',
    weight: 20,
    check: (ctx) => (ctx.slippage ?? 0) > 5,
  },
  {
    id: 'unusual_time',
    name: 'Unusual Time',
    description: 'Transaction at an unusual time for you',
    weight: 10,
    check: (_ctx) => {
      const hour = new Date().getHours();
      return hour < 6 || hour > 23;
    },
  },
  {
    id: 'rapid_transactions',
    name: 'Rapid Transactions',
    description: 'Multiple transactions in short time',
    weight: 15,
    check: (ctx) => ctx.recentTransactionCount > 5,
  },
  {
    id: 'token_approval',
    name: 'Token Approval',
    description: 'Approving unlimited token spending',
    weight: 40,
    check: (ctx) => ctx.isApproval && ctx.approvalAmount === 'unlimited',
  },
];

// ============================================================================
// Security UX Manager
// ============================================================================

/**
 * Transaction context for risk assessment
 */
export interface TransactionContext {
  type: 'swap' | 'transfer' | 'stake' | 'unstake' | 'approval' | 'contract_call';
  amount: number;
  token: string;
  recipientAddress?: string;
  isContract: boolean;
  contractVerified: boolean;
  slippage?: number;
  userAvgTransaction: number;
  knownAddresses: string[];
  recentTransactionCount: number;
  isApproval: boolean;
  approvalAmount?: string | number;
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: TriggeredRiskFactor[];
  requiresConfirmation: boolean;
  requiresBiometric: boolean;
  warnings: SecurityWarning[];
  recommendations: string[];
}

/**
 * Triggered risk factor
 */
export interface TriggeredRiskFactor {
  id: string;
  name: string;
  description: string;
  contribution: number;
}

/**
 * Confirmation result
 */
export interface ConfirmationResult {
  confirmed: boolean;
  method: 'tap' | 'biometric' | 'pin' | 'two_factor';
  timestamp: Date;
  sessionId?: string;
}

/**
 * Authentication result
 */
export interface AuthenticationResult {
  success: boolean;
  method: BiometricType | 'pin' | 'password';
  timestamp: Date;
  error?: string;
}

/**
 * Session info
 */
export interface SecuritySession {
  id: string;
  userId: string;
  startedAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  authMethod: BiometricType | 'pin' | 'password';
  isActive: boolean;
}

/**
 * Manages security UX features
 */
export class SecurityUXManager {
  private readonly config: Required<SecurityUXConfig>;
  private sessions: Map<string, SecuritySession> = new Map();
  private userSecrets: Map<string, UserSecurityData> = new Map();
  // Event handlers set via initialize() and called during operations
  onAuthRequired?: (reason: string) => void;
  onSecurityWarning?: (warning: SecurityWarning) => void;

  constructor(config: Partial<SecurityUXConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      biometric: { ...DEFAULT_CONFIG.biometric, ...config.biometric },
      antiPhishing: { ...DEFAULT_CONFIG.antiPhishing, ...config.antiPhishing },
    };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize with user profile
   */
  initialize(
    user: UserProfile,
    handlers?: {
      onAuthRequired?: (reason: string) => void;
      onSecurityWarning?: (warning: SecurityWarning) => void;
    }
  ): void {
    this.onAuthRequired = handlers?.onAuthRequired;
    this.onSecurityWarning = handlers?.onSecurityWarning;

    // Initialize user security data
    if (!this.userSecrets.has(user.telegramId)) {
      this.userSecrets.set(user.telegramId, {
        userId: user.telegramId,
        knownAddresses: [],
        avgTransactionAmount: 100,
        recentTransactions: [],
        antiPhishingCode: undefined,
      });
    }
  }

  // ============================================================================
  // Risk Assessment
  // ============================================================================

  /**
   * Assess transaction risk
   */
  assessRisk(context: TransactionContext): RiskAssessment {
    const triggeredFactors: TriggeredRiskFactor[] = [];
    let totalScore = 0;

    // Check each risk factor
    for (const factor of RISK_FACTORS) {
      if (factor.check(context)) {
        triggeredFactors.push({
          id: factor.id,
          name: factor.name,
          description: factor.description,
          contribution: factor.weight,
        });
        totalScore += factor.weight;
      }
    }

    // Determine risk level
    let level: RiskAssessment['level'];
    if (totalScore >= 70) {
      level = 'critical';
    } else if (totalScore >= 50) {
      level = 'high';
    } else if (totalScore >= 25) {
      level = 'medium';
    } else {
      level = 'low';
    }

    // Generate warnings
    const warnings = this.generateWarnings(triggeredFactors, context);

    // Generate recommendations
    const recommendations = this.generateRecommendations(triggeredFactors, context);

    // Determine confirmation requirements
    const requiresConfirmation =
      this.config.alwaysConfirm ||
      context.amount > this.config.confirmationThreshold ||
      level !== 'low';

    const requiresBiometric = level === 'critical' || level === 'high';

    return {
      score: Math.min(totalScore, 100),
      level,
      factors: triggeredFactors,
      requiresConfirmation,
      requiresBiometric,
      warnings,
      recommendations,
    };
  }

  /**
   * Generate security warnings
   */
  private generateWarnings(
    factors: TriggeredRiskFactor[],
    _context: TransactionContext
  ): SecurityWarning[] {
    const warnings: SecurityWarning[] = [];

    for (const factor of factors) {
      let type: SecurityWarning['type'] = 'high_risk';
      let severity: SecurityWarning['severity'] = 'medium';

      if (factor.id === 'unknown_contract') {
        type = 'contract_risk';
        severity = 'high';
      } else if (factor.id === 'token_approval') {
        type = 'contract_risk';
        severity = 'critical';
      } else if (factor.id === 'new_address') {
        type = 'unusual_activity';
        severity = 'low';
      }

      // Check warning level config
      if (this.shouldShowWarning(severity)) {
        warnings.push({
          id: `warning_${factor.id}_${Date.now()}`,
          type,
          severity,
          title: factor.name,
          message: factor.description,
          requiresAcknowledgment: severity === 'high' || severity === 'critical',
          canProceed: severity !== 'critical',
        });
      }
    }

    return warnings;
  }

  /**
   * Check if warning should be shown based on config
   */
  private shouldShowWarning(severity: SecurityWarning['severity']): boolean {
    switch (this.config.riskWarningLevel) {
      case 'all':
        return true;
      case 'medium_high':
        return severity !== 'low';
      case 'high_only':
        return severity === 'high' || severity === 'critical';
      case 'none':
        return false;
      default:
        return true;
    }
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(
    factors: TriggeredRiskFactor[],
    _context: TransactionContext
  ): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      switch (factor.id) {
        case 'high_value':
          recommendations.push('Consider splitting into smaller transactions');
          break;
        case 'new_address':
          recommendations.push('Double-check the recipient address');
          recommendations.push('Send a small test amount first');
          break;
        case 'unknown_contract':
          recommendations.push('Verify the contract on a block explorer');
          recommendations.push('Check community reviews of this contract');
          break;
        case 'high_slippage':
          recommendations.push('Lower slippage to reduce potential loss');
          break;
        case 'token_approval':
          recommendations.push('Consider approving only the needed amount');
          recommendations.push('Revoke approval after use');
          break;
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // ============================================================================
  // Confirmation Flow
  // ============================================================================

  /**
   * Get confirmation configuration for transaction
   */
  getConfirmationConfig(
    context: TransactionContext,
    riskAssessment: RiskAssessment
  ): ConfirmationConfig {
    const warnings = riskAssessment.warnings.map((w) => w.message);

    let type: ConfirmationConfig['type'] = 'simple';
    if (riskAssessment.requiresBiometric) {
      type = 'biometric';
    } else if (riskAssessment.level === 'medium') {
      type = 'pin';
    }

    let riskLevel: ConfirmationConfig['riskLevel'] = 'low';
    if (riskAssessment.level === 'critical') {
      riskLevel = 'high';
    } else if (riskAssessment.level === 'high' || riskAssessment.level === 'medium') {
      riskLevel = 'medium';
    }

    return {
      title: this.getConfirmationTitle(context.type),
      message: this.getConfirmationMessage(context),
      type,
      showAmount: true,
      amount: context.amount,
      token: context.token,
      riskLevel,
      warnings,
      confirmText: riskAssessment.level === 'critical' ? 'I Understand the Risks' : 'Confirm',
      cancelText: 'Cancel',
      timeout: riskAssessment.level === 'critical' ? 30 : undefined,
    };
  }

  /**
   * Get confirmation title
   */
  private getConfirmationTitle(type: TransactionContext['type']): string {
    const titles: Record<string, string> = {
      swap: 'Confirm Swap',
      transfer: 'Confirm Transfer',
      stake: 'Confirm Staking',
      unstake: 'Confirm Unstaking',
      approval: 'Approve Token Spending',
      contract_call: 'Confirm Contract Interaction',
    };
    return titles[type] ?? 'Confirm Action';
  }

  /**
   * Get confirmation message
   */
  private getConfirmationMessage(context: TransactionContext): string {
    switch (context.type) {
      case 'swap':
        return `Swap ${context.amount} ${context.token}`;
      case 'transfer':
        return `Send ${context.amount} ${context.token}`;
      case 'stake':
        return `Stake ${context.amount} ${context.token}`;
      case 'unstake':
        return `Unstake ${context.amount} ${context.token}`;
      case 'approval':
        return `Allow spending of your ${context.token}`;
      case 'contract_call':
        return `Interact with smart contract`;
      default:
        return `Confirm transaction of ${context.amount} ${context.token}`;
    }
  }

  /**
   * Process confirmation
   */
  async processConfirmation(
    userId: string,
    method: 'tap' | 'biometric' | 'pin',
    _credentials?: string
  ): Promise<ConfirmationResult> {
    const session = this.getActiveSession(userId);

    if (method === 'biometric') {
      // In production, would verify with device biometric API
      const authResult = await this.authenticateBiometric();
      if (!authResult.success) {
        return {
          confirmed: false,
          method,
          timestamp: new Date(),
        };
      }
    }

    if (method === 'pin') {
      // In production, would verify PIN
      // For now, assume success if session exists
    }

    return {
      confirmed: true,
      method,
      timestamp: new Date(),
      sessionId: session?.id,
    };
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Get available biometric types
   */
  getAvailableBiometricTypes(): BiometricType[] {
    return (this.config.biometric as BiometricOptions).availableTypes ?? ['fingerprint'];
  }

  /**
   * Authenticate with biometric
   */
  async authenticateBiometric(): Promise<AuthenticationResult> {
    // In production, this would call the device's biometric API
    // For now, simulate success

    const method = (this.config.biometric as BiometricOptions).preferredType ?? 'fingerprint';

    return {
      success: true,
      method,
      timestamp: new Date(),
    };
  }

  /**
   * Authenticate with PIN
   */
  async authenticateWithPin(userId: string, pin: string): Promise<AuthenticationResult> {
    // In production, would verify against stored hash
    const userSecurity = this.userSecrets.get(userId);

    if (!userSecurity?.pinHash) {
      return {
        success: false,
        method: 'pin',
        timestamp: new Date(),
        error: 'PIN not set up',
      };
    }

    // Simulate PIN verification
    const isValid = pin.length === 6;

    return {
      success: isValid,
      method: 'pin',
      timestamp: new Date(),
      error: isValid ? undefined : 'Invalid PIN',
    };
  }

  /**
   * Set up PIN
   */
  setupPin(userId: string, pin: string): boolean {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return false;
    }

    const userSecurity = this.userSecrets.get(userId);
    if (!userSecurity) {
      return false;
    }

    // In production, would hash the PIN
    userSecurity.pinHash = `hashed_${pin}`;

    return true;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Create authentication session
   */
  createSession(
    userId: string,
    authMethod: BiometricType | 'pin' | 'password'
  ): SecuritySession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const duration = (this.config.biometric as BiometricOptions).sessionDuration ?? 300;

    const session: SecuritySession = {
      id: sessionId,
      userId,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + duration * 1000),
      lastActivity: new Date(),
      authMethod,
      isActive: true,
    };

    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Get active session for user
   */
  getActiveSession(userId: string): SecuritySession | undefined {
    for (const session of this.sessions.values()) {
      if (
        session.userId === userId &&
        session.isActive &&
        new Date() < session.expiresAt
      ) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Check if session is valid
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return Boolean(session && session.isActive && new Date() < session.expiresAt);
  }

  /**
   * Refresh session
   */
  refreshSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    const duration = (this.config.biometric as BiometricOptions).sessionDuration ?? 300;
    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + duration * 1000);

    return true;
  }

  /**
   * End session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
    }
  }

  /**
   * End all sessions for user
   */
  endAllSessions(userId: string): void {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.isActive = false;
      }
    }
  }

  // ============================================================================
  // Anti-Phishing
  // ============================================================================

  /**
   * Set anti-phishing code
   */
  setAntiPhishingCode(userId: string, code: string): boolean {
    const userSecurity = this.userSecrets.get(userId);
    if (!userSecurity) {
      return false;
    }

    userSecurity.antiPhishingCode = code;
    return true;
  }

  /**
   * Get anti-phishing code for verification
   */
  getAntiPhishingCode(userId: string): string | undefined {
    return this.userSecrets.get(userId)?.antiPhishingCode;
  }

  /**
   * Check URL for phishing
   */
  checkForPhishing(url: string): PhishingCheckResult {
    const patterns = (this.config.antiPhishing as AntiPhishingSettings).phishingPatterns ?? [];
    const lowerUrl = url.toLowerCase();

    // Check against known patterns
    for (const pattern of patterns) {
      if (lowerUrl.includes(pattern.toLowerCase())) {
        return {
          isPhishing: true,
          confidence: 0.9,
          reason: 'URL matches known phishing pattern',
        };
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /ton.*agent.*(?!tonaiagent\.com)/i,
      /telegram.*login/i,
      /wallet.*connect.*(?!tonconnect\.io)/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return {
          isPhishing: true,
          confidence: 0.7,
          reason: 'URL contains suspicious patterns',
        };
      }
    }

    return {
      isPhishing: false,
      confidence: 0.95,
    };
  }

  // ============================================================================
  // Security Tips
  // ============================================================================

  /**
   * Get security tips for user
   */
  getSecurityTips(userId: string): SecurityTip[] {
    if (!this.config.showSecurityTips) {
      return [];
    }

    const tips: SecurityTip[] = [];
    const userSecurity = this.userSecrets.get(userId);

    // Check PIN setup
    if (!userSecurity?.pinHash) {
      tips.push({
        id: 'setup_pin',
        title: 'Set Up a PIN',
        description: 'Add an extra layer of security with a 6-digit PIN',
        action: 'setup_pin',
        priority: 'high',
      });
    }

    // Check anti-phishing code
    if (!userSecurity?.antiPhishingCode) {
      tips.push({
        id: 'anti_phishing',
        title: 'Set Anti-Phishing Code',
        description: "We'll show this code to prove we're real",
        action: 'setup_anti_phishing',
        priority: 'medium',
      });
    }

    // General tips
    tips.push({
      id: 'verify_addresses',
      title: 'Always Verify Addresses',
      description: 'Double-check recipient addresses before sending',
      priority: 'info',
    });

    tips.push({
      id: 'test_transactions',
      title: 'Send Test Amounts First',
      description: 'When sending to new addresses, send a small test first',
      priority: 'info',
    });

    return tips;
  }

  // ============================================================================
  // User Security Data Management
  // ============================================================================

  /**
   * Add known address
   */
  addKnownAddress(userId: string, address: string, _label?: string): void {
    const userSecurity = this.userSecrets.get(userId);
    if (userSecurity && !userSecurity.knownAddresses.includes(address)) {
      userSecurity.knownAddresses.push(address);
    }
  }

  /**
   * Record transaction for risk assessment
   */
  recordTransaction(userId: string, amount: number): void {
    const userSecurity = this.userSecrets.get(userId);
    if (!userSecurity) return;

    userSecurity.recentTransactions.push({
      amount,
      timestamp: new Date(),
    });

    // Keep only last 50 transactions
    if (userSecurity.recentTransactions.length > 50) {
      userSecurity.recentTransactions.shift();
    }

    // Update average
    const total = userSecurity.recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    userSecurity.avgTransactionAmount = total / userSecurity.recentTransactions.length;
  }

  /**
   * Get user security context for risk assessment
   */
  getUserSecurityContext(userId: string): Partial<TransactionContext> {
    const userSecurity = this.userSecrets.get(userId);

    if (!userSecurity) {
      return {
        userAvgTransaction: 100,
        knownAddresses: [],
        recentTransactionCount: 0,
      };
    }

    // Count recent transactions (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = userSecurity.recentTransactions.filter(
      (tx) => tx.timestamp > oneHourAgo
    ).length;

    return {
      userAvgTransaction: userSecurity.avgTransactionAmount,
      knownAddresses: userSecurity.knownAddresses,
      recentTransactionCount: recentCount,
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * User security data (stored internally)
 */
interface UserSecurityData {
  userId: string;
  pinHash?: string;
  antiPhishingCode?: string;
  knownAddresses: string[];
  avgTransactionAmount: number;
  recentTransactions: Array<{ amount: number; timestamp: Date }>;
}

/**
 * Phishing check result
 */
export interface PhishingCheckResult {
  isPhishing: boolean;
  confidence: number;
  reason?: string;
}

/**
 * Security tip
 */
export interface SecurityTip {
  id: string;
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'info';
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a SecurityUXManager
 */
export function createSecurityUXManager(
  config?: Partial<SecurityUXConfig>
): SecurityUXManager {
  return new SecurityUXManager(config);
}

/**
 * Get default security configuration
 */
export function getDefaultSecurityConfig(): Required<SecurityUXConfig> {
  return { ...DEFAULT_CONFIG };
}
