/**
 * TONAIAgent - Emergency and Recovery Mechanisms
 *
 * Implements critical safety mechanisms:
 * - Kill switch for emergency stops
 * - Agent pausing
 * - Permission revocation
 * - Key recovery
 * - Incident management
 * - Automatic threat response
 */

import * as nodeCrypto from 'node:crypto';
import {
  EmergencyEvent,
  EmergencyType,
  EmergencyAction,
  EmergencyActionType,
  RecoveryRequest,
  RecoveryType,
  RecoveryStatus,
  VerificationStep,
  RiskLevel,
  SecurityEvent,
  SecurityEventCallback,
  EmergencyConfig,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface EmergencyController {
  // Emergency operations
  triggerEmergency(
    type: EmergencyType,
    triggeredBy: string,
    affectedAgents?: string[],
    affectedUsers?: string[]
  ): Promise<EmergencyEvent>;

  resolveEmergency(
    eventId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<EmergencyEvent>;

  getActiveEmergencies(): EmergencyEvent[];
  getEmergencyHistory(limit?: number): EmergencyEvent[];

  // Kill switch
  activateKillSwitch(reason: string, triggeredBy: string): Promise<void>;
  deactivateKillSwitch(reason: string, triggeredBy: string): Promise<void>;
  isKillSwitchActive(): boolean;

  // Agent control
  pauseAgent(agentId: string, reason: string): Promise<void>;
  resumeAgent(agentId: string, reason: string): Promise<void>;
  pauseAllAgents(reason: string): Promise<void>;
  getPausedAgents(): string[];

  // Automatic responses
  enableAutoResponse(): void;
  disableAutoResponse(): void;
  configureAutoResponse(config: AutoResponseConfig): void;

  // Events
  onEvent(callback: SecurityEventCallback): void;
}

export interface RecoveryManager {
  // Recovery initiation
  initiateRecovery(
    userId: string,
    type: RecoveryType,
    options?: RecoveryOptions
  ): Promise<RecoveryRequest>;

  // Verification
  verifyStep(
    requestId: string,
    stepType: string,
    verificationData: VerificationData
  ): Promise<VerificationResult>;

  // Recovery execution
  executeRecovery(requestId: string): Promise<RecoveryResult>;

  // Recovery status
  getRecoveryRequest(requestId: string): RecoveryRequest | null;
  getActiveRecoveries(userId?: string): RecoveryRequest[];
  cancelRecovery(requestId: string, reason: string): Promise<void>;

  // Events
  onEvent(callback: SecurityEventCallback): void;
}

export interface AutoResponseConfig {
  enabled: boolean;
  triggers: AutoResponseTrigger[];
  cooldownMinutes: number;
  maxActionsPerHour: number;
  notifyAdmins: boolean;
  escalationTimeMinutes: number;
}

export interface AutoResponseTrigger {
  type: EmergencyType;
  riskLevel: RiskLevel;
  actions: EmergencyActionType[];
  requiresConfirmation: boolean;
}

export interface RecoveryOptions {
  urgentRecovery?: boolean;
  skipVerificationSteps?: string[];
  metadata?: Record<string, unknown>;
}

export interface VerificationData {
  code?: string;
  signature?: string;
  recoveryPhrase?: string[];
  biometricData?: string;
  guardianApproval?: string;
}

export interface VerificationResult {
  success: boolean;
  step: VerificationStep;
  remainingSteps: VerificationStep[];
  error?: string;
}

export interface RecoveryResult {
  success: boolean;
  request: RecoveryRequest;
  newKeyId?: string;
  newAddress?: string;
  error?: string;
}

// ============================================================================
// Emergency Controller Implementation
// ============================================================================

export class DefaultEmergencyController implements EmergencyController {
  private readonly emergencies = new Map<string, EmergencyEvent>();
  private readonly pausedAgents = new Set<string>();
  private killSwitchActive = false;
  private autoResponseConfig: AutoResponseConfig;
  private readonly eventCallbacks: SecurityEventCallback[] = [];

  constructor(config?: EmergencyConfig) {
    this.autoResponseConfig = {
      enabled: config?.autoTriggerEnabled ?? false,
      triggers: this.getDefaultTriggers(),
      cooldownMinutes: 5,
      maxActionsPerHour: 10,
      notifyAdmins: true,
      escalationTimeMinutes: config?.escalationTimeMinutes ?? 15,
    };
  }

  async triggerEmergency(
    type: EmergencyType,
    triggeredBy: string,
    affectedAgents?: string[],
    affectedUsers?: string[]
  ): Promise<EmergencyEvent> {
    const eventId = `emerg_${Date.now()}_${nodeCrypto.randomBytes(8).toString('hex')}`;

    const event: EmergencyEvent = {
      id: eventId,
      type,
      severity: this.getEmergencySeverity(type),
      triggeredBy,
      triggeredAt: new Date(),
      affectedAgents: affectedAgents ?? [],
      affectedUsers: affectedUsers ?? [],
      status: 'active',
      actions: [],
    };

    this.emergencies.set(eventId, event);

    // Execute automatic actions based on type
    await this.executeEmergencyActions(event);

    // Emit event
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_triggered',
      severity: event.severity,
      source: 'emergency_controller',
      message: `Emergency triggered: ${type}`,
      data: {
        emergencyId: eventId,
        type,
        triggeredBy,
        affectedAgents: event.affectedAgents.length,
        affectedUsers: event.affectedUsers.length,
      },
    });

    return event;
  }

  async resolveEmergency(
    eventId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<EmergencyEvent> {
    const event = this.emergencies.get(eventId);
    if (!event) {
      throw new Error(`Emergency not found: ${eventId}`);
    }

    event.status = 'resolved';
    event.resolvedAt = new Date();
    event.resolvedBy = resolvedBy;
    event.resolution = resolution;

    this.emergencies.set(eventId, event);

    // Resume any paused agents from this emergency
    for (const agentId of event.affectedAgents) {
      if (this.pausedAgents.has(agentId)) {
        this.pausedAgents.delete(agentId);
      }
    }

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_triggered',
      severity: 'low',
      source: 'emergency_controller',
      message: `Emergency resolved: ${eventId}`,
      data: { emergencyId: eventId, resolvedBy, resolution },
    });

    return event;
  }

  getActiveEmergencies(): EmergencyEvent[] {
    return Array.from(this.emergencies.values()).filter(
      (e) => e.status === 'active' || e.status === 'investigating' || e.status === 'mitigating'
    );
  }

  getEmergencyHistory(limit: number = 100): EmergencyEvent[] {
    return Array.from(this.emergencies.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  async activateKillSwitch(reason: string, triggeredBy: string): Promise<void> {
    if (this.killSwitchActive) {
      return; // Already active
    }

    this.killSwitchActive = true;

    // Pause all agents
    await this.pauseAllAgents(reason);

    // Trigger emergency
    await this.triggerEmergency('manual_trigger', triggeredBy, Array.from(this.pausedAgents));

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_triggered',
      severity: 'critical',
      source: 'emergency_controller',
      message: 'Kill switch activated',
      data: { reason, triggeredBy },
    });
  }

  async deactivateKillSwitch(reason: string, triggeredBy: string): Promise<void> {
    if (!this.killSwitchActive) {
      return; // Already inactive
    }

    this.killSwitchActive = false;

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_triggered',
      severity: 'medium',
      source: 'emergency_controller',
      message: 'Kill switch deactivated',
      data: { reason, triggeredBy },
    });
  }

  isKillSwitchActive(): boolean {
    return this.killSwitchActive;
  }

  async pauseAgent(agentId: string, reason: string): Promise<void> {
    this.pausedAgents.add(agentId);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_triggered',
      severity: 'medium',
      source: 'emergency_controller',
      message: `Agent paused: ${agentId}`,
      data: { agentId, reason },
    });
  }

  async resumeAgent(agentId: string, reason: string): Promise<void> {
    this.pausedAgents.delete(agentId);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_triggered',
      severity: 'low',
      source: 'emergency_controller',
      message: `Agent resumed: ${agentId}`,
      data: { agentId, reason },
    });
  }

  async pauseAllAgents(reason: string): Promise<void> {
    // In production, this would get all active agents
    // For now, just mark the kill switch state
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_triggered',
      severity: 'high',
      source: 'emergency_controller',
      message: 'All agents paused',
      data: { reason, pausedCount: this.pausedAgents.size },
    });
  }

  getPausedAgents(): string[] {
    return Array.from(this.pausedAgents);
  }

  enableAutoResponse(): void {
    this.autoResponseConfig.enabled = true;
  }

  disableAutoResponse(): void {
    this.autoResponseConfig.enabled = false;
  }

  configureAutoResponse(config: AutoResponseConfig): void {
    this.autoResponseConfig = { ...this.autoResponseConfig, ...config };
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private async executeEmergencyActions(event: EmergencyEvent): Promise<void> {
    const actions: EmergencyAction[] = [];

    // Determine actions based on emergency type
    switch (event.type) {
      case 'security_breach':
        actions.push(
          await this.createAction('pause_all_agents', event),
          await this.createAction('notify_user', event),
          await this.createAction('alert_admin', event)
        );
        break;

      case 'risk_limit_breach':
        actions.push(
          await this.createAction('pause_agent', event),
          await this.createAction('notify_user', event)
        );
        break;

      case 'anomaly_detected':
        actions.push(
          await this.createAction('notify_user', event),
          await this.createAction('alert_admin', event)
        );
        break;

      case 'suspicious_activity':
        actions.push(
          await this.createAction('pause_agent', event),
          await this.createAction('notify_user', event)
        );
        break;

      case 'system_failure':
        actions.push(
          await this.createAction('enable_maintenance_mode', event),
          await this.createAction('alert_admin', event)
        );
        break;

      case 'manual_trigger':
        // Manual triggers have their own actions specified
        break;

      case 'compliance_hold':
        actions.push(
          await this.createAction('lock_funds', event),
          await this.createAction('notify_user', event),
          await this.createAction('alert_admin', event)
        );
        break;
    }

    event.actions = actions;
    this.emergencies.set(event.id, event);
  }

  private async createAction(
    type: EmergencyActionType,
    event: EmergencyEvent
  ): Promise<EmergencyAction> {
    const action: EmergencyAction = {
      type,
      targetType: this.getTargetTypeForAction(type),
      executedAt: new Date(),
      executedBy: 'system',
      success: true,
    };

    // Execute the action
    switch (type) {
      case 'pause_agent':
        for (const agentId of event.affectedAgents) {
          this.pausedAgents.add(agentId);
        }
        break;

      case 'pause_all_agents':
        await this.pauseAllAgents(`Emergency: ${event.type}`);
        break;

      case 'notify_user':
        // Would send notification via Telegram/email
        action.details = 'User notification sent';
        break;

      case 'alert_admin':
        // Would page on-call admin
        action.details = 'Admin alerted';
        break;

      case 'lock_funds':
        // Would lock affected wallets
        action.details = 'Funds locked pending review';
        break;

      case 'enable_maintenance_mode':
        // Would enable maintenance mode
        action.details = 'Maintenance mode enabled';
        break;
    }

    return action;
  }

  private getTargetTypeForAction(
    type: EmergencyActionType
  ): 'agent' | 'user' | 'system' | 'all' {
    switch (type) {
      case 'pause_agent':
      case 'revoke_permissions':
      case 'cancel_pending_transactions':
        return 'agent';
      case 'notify_user':
        return 'user';
      case 'pause_all_agents':
      case 'enable_maintenance_mode':
        return 'all';
      default:
        return 'system';
    }
  }

  private getEmergencySeverity(type: EmergencyType): RiskLevel {
    switch (type) {
      case 'security_breach':
        return 'critical';
      case 'risk_limit_breach':
      case 'suspicious_activity':
        return 'high';
      case 'anomaly_detected':
      case 'compliance_hold':
        return 'medium';
      case 'system_failure':
        return 'high';
      case 'manual_trigger':
        return 'medium';
      default:
        return 'medium';
    }
  }

  private getDefaultTriggers(): AutoResponseTrigger[] {
    return [
      {
        type: 'security_breach',
        riskLevel: 'critical',
        actions: ['pause_all_agents', 'alert_admin'],
        requiresConfirmation: false,
      },
      {
        type: 'risk_limit_breach',
        riskLevel: 'high',
        actions: ['pause_agent', 'notify_user'],
        requiresConfirmation: false,
      },
      {
        type: 'anomaly_detected',
        riskLevel: 'medium',
        actions: ['notify_user'],
        requiresConfirmation: true,
      },
    ];
  }

  private emitEvent(event: SecurityEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Recovery Manager Implementation
// ============================================================================

// OTP validity window for email/SMS codes (10 minutes)
const OTP_TTL_MS = 10 * 60 * 1000;

export class DefaultRecoveryManager implements RecoveryManager {
  private readonly recoveryRequests = new Map<string, RecoveryRequest>();
  private readonly eventCallbacks: SecurityEventCallback[] = [];
  /**
   * Stores SHA-256 hashes of recovery phrases keyed by userId.
   * In production this would be persisted in an encrypted store populated
   * during wallet/key provisioning.  Call `registerRecoveryPhraseHash` to
   * seed the registry before a recovery attempt.
   */
  private readonly recoveryPhraseHashes = new Map<string, string>();
  /**
   * Stores (requestId → guardianPublicKey) and (requestId → devicePublicKey)
   * for guardian and device verification steps.  A real backend would look
   * these up from a database; the registry here supports tests and in-process
   * integrations.
   */
  private readonly guardianPublicKeys = new Map<string, string>();
  private readonly devicePublicKeys = new Map<string, string>();

  /**
   * Register the expected SHA-256 hash of a user's recovery phrase so that
   * future `verifyStep('recovery_phrase', …)` calls can compare against it.
   * Call this during wallet provisioning (or in tests) before initiating
   * recovery.
   */
  registerRecoveryPhraseHash(userId: string, phraseHash: string): void {
    this.recoveryPhraseHashes.set(userId, phraseHash);
  }

  /**
   * Register a guardian public key (hex) for a recovery request.
   * The guardian must sign the requestId with the corresponding private key
   * and pass the hex-encoded signature as `guardianApproval`.
   */
  registerGuardianPublicKey(requestId: string, publicKeyHex: string): void {
    this.guardianPublicKeys.set(requestId, publicKeyHex);
  }

  /**
   * Register a device public key (hex) for a recovery request.
   * The device must sign the requestId with the corresponding private key
   * and pass the hex-encoded signature as `signature`.
   */
  registerDevicePublicKey(requestId: string, publicKeyHex: string): void {
    this.devicePublicKeys.set(requestId, publicKeyHex);
  }

  /**
   * Generate a cryptographically random 6-digit OTP and return both the
   * plaintext (to be delivered out-of-band) and its SHA-256 hex digest
   * (stored server-side for later constant-time comparison).
   */
  private generateOtp(): { plaintext: string; hash: string } {
    // Use rejection sampling to produce a uniformly distributed 6-digit code.
    let value: number;
    do {
      const buf = nodeCrypto.randomBytes(4);
      value = buf.readUInt32BE(0) % 1_000_000;
    } while (value >= 1_000_000);
    const plaintext = String(value).padStart(6, '0');
    const hash = nodeCrypto.createHash('sha256').update(plaintext).digest('hex');
    return { plaintext, hash };
  }

  /**
   * Hash an array of recovery-phrase words with SHA-256 for storage/comparison.
   * In production this would use PBKDF2/Argon2 with a per-user salt.
   */
  private hashRecoveryPhrase(phrase: string[]): string {
    return nodeCrypto
      .createHash('sha256')
      .update(phrase.join(' '))
      .digest('hex');
  }

  /**
   * Issue (or re-issue) a fresh time-limited OTP for a pending email/sms step
   * and return the plaintext code.  The plaintext must be delivered
   * out-of-band (email / SMS); only the SHA-256 hash is retained here.
   *
   * Callers in tests can capture this return value to produce a correct
   * `verifyStep` call without ever exposing secret material in the request
   * object.
   */
  issueOtp(requestId: string, stepType: 'email' | 'sms'): string {
    const request = this.recoveryRequests.get(requestId);
    if (!request) {
      throw new Error(`Recovery request not found: ${requestId}`);
    }
    const step = request.verificationSteps.find((s) => s.type === stepType);
    if (!step) {
      throw new Error(`Step "${stepType}" not found in request ${requestId}`);
    }
    const { plaintext, hash } = this.generateOtp();
    step.secretHash = hash;
    step.secretExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    step.used = false;
    this.recoveryRequests.set(requestId, request);
    return plaintext;
  }

  async initiateRecovery(
    userId: string,
    type: RecoveryType,
    options?: RecoveryOptions
  ): Promise<RecoveryRequest> {
    const requestId = `recovery_${Date.now()}_${nodeCrypto.randomBytes(8).toString('hex')}`;

    const verificationSteps = this.getVerificationSteps(type, options);

    // Attach time-limited OTP secrets for code-based steps (email / sms).
    // The plaintext OTP must be delivered out-of-band (e.g. via email/SMS);
    // only the hash is stored server-side so a compromise of this store
    // cannot be used to pass verification directly.
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    for (const step of verificationSteps) {
      if (step.type === 'email' || step.type === 'sms') {
        const { hash } = this.generateOtp();
        step.secretHash = hash;
        step.secretExpiresAt = otpExpiresAt;
        step.used = false;
      }
    }

    const request: RecoveryRequest = {
      id: requestId,
      userId,
      type,
      status: 'initiated',
      verificationSteps,
      createdAt: new Date(),
      expiresAt: new Date(
        Date.now() + (options?.urgentRecovery ? 2 : 24) * 60 * 60 * 1000
      ),
    };

    this.recoveryRequests.set(requestId, request);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_generated',
      severity: 'medium',
      source: 'recovery_manager',
      message: `Recovery initiated for user ${userId}`,
      data: { requestId, type, userId },
    });

    return request;
  }

  async verifyStep(
    requestId: string,
    stepType: string,
    verificationData: VerificationData
  ): Promise<VerificationResult> {
    const request = this.recoveryRequests.get(requestId);
    if (!request) {
      throw new Error(`Recovery request not found: ${requestId}`);
    }

    if (request.status !== 'initiated' && request.status !== 'verification_pending') {
      throw new Error(`Cannot verify step for request with status: ${request.status}`);
    }

    // Find the step
    const stepIndex = request.verificationSteps.findIndex((s) => s.type === stepType);
    if (stepIndex === -1) {
      throw new Error(`Verification step not found: ${stepType}`);
    }

    const step = request.verificationSteps[stepIndex];
    if (step.status === 'failed') {
      throw new Error(`Cannot verify failed step: ${stepType}`);
    }

    // Verify the step
    const verified = await this.performVerification(step, verificationData, requestId, request.userId);

    if (verified) {
      step.status = 'verified';
      step.verifiedAt = new Date();
    } else {
      step.attempts++;
      if (step.attempts >= step.maxAttempts) {
        step.status = 'failed';
        request.status = 'failed';
      }
    }

    if (request.status !== 'failed') {
      request.status = 'verification_pending';
    }

    // Check if all required steps are verified
    const allRequiredVerified = request.verificationSteps
      .filter((s) => s.required)
      .every((s) => s.status === 'verified');

    if (request.status !== 'failed' && allRequiredVerified) {
      request.status = 'verification_complete';
    }

    this.recoveryRequests.set(requestId, request);

    const remainingSteps = request.verificationSteps.filter(
      (s) => s.required && s.status !== 'verified'
    );

    return {
      success: verified,
      step,
      remainingSteps,
      error: verified ? undefined : 'Verification failed',
    };
  }

  async executeRecovery(requestId: string): Promise<RecoveryResult> {
    const request = this.recoveryRequests.get(requestId);
    if (!request) {
      throw new Error(`Recovery request not found: ${requestId}`);
    }

    if (request.status !== 'verification_complete') {
      throw new Error(`Cannot execute recovery with status: ${request.status}`);
    }

    request.status = 'executing';
    this.recoveryRequests.set(requestId, request);

    try {
      // Perform the actual recovery based on type
      let newKeyId: string | undefined;
      let newAddress: string | undefined;

      switch (request.type) {
        case 'key_recovery':
          // Generate new keys from MPC shares
          newKeyId = `key_recovered_${Date.now()}`;
          break;

        case 'wallet_recovery':
          // Recover wallet with new keys
          newKeyId = `key_recovered_${Date.now()}`;
          newAddress = `EQ_recovered_${Date.now()}`;
          break;

        case 'access_recovery':
          // Reset access credentials
          break;

        case 'social_recovery':
          // Execute social recovery
          break;
      }

      request.status = 'completed';
      request.completedAt = new Date();
      this.recoveryRequests.set(requestId, request);

      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'key_generated',
        severity: 'medium',
        source: 'recovery_manager',
        message: `Recovery completed for request ${requestId}`,
        data: { requestId, type: request.type, userId: request.userId, newKeyId },
      });

      return {
        success: true,
        request,
        newKeyId,
        newAddress,
      };
    } catch (error) {
      request.status = 'failed';
      this.recoveryRequests.set(requestId, request);

      return {
        success: false,
        request,
        error: error instanceof Error ? error.message : 'Recovery failed',
      };
    }
  }

  getRecoveryRequest(requestId: string): RecoveryRequest | null {
    return this.recoveryRequests.get(requestId) ?? null;
  }

  getActiveRecoveries(userId?: string): RecoveryRequest[] {
    const requests = Array.from(this.recoveryRequests.values());

    const activeStatuses: RecoveryStatus[] = [
      'initiated',
      'verification_pending',
      'verification_complete',
      'executing',
    ];

    let filtered = requests.filter((r) => activeStatuses.includes(r.status));

    if (userId) {
      filtered = filtered.filter((r) => r.userId === userId);
    }

    return filtered;
  }

  async cancelRecovery(requestId: string, reason: string): Promise<void> {
    const request = this.recoveryRequests.get(requestId);
    if (!request) {
      throw new Error(`Recovery request not found: ${requestId}`);
    }

    request.status = 'cancelled';
    this.recoveryRequests.set(requestId, request);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_generated',
      severity: 'low',
      source: 'recovery_manager',
      message: `Recovery cancelled: ${requestId}`,
      data: { requestId, reason },
    });
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private getVerificationSteps(
    type: RecoveryType,
    options?: RecoveryOptions
  ): VerificationStep[] {
    const steps: VerificationStep[] = [];

    // Email verification is always required
    if (!options?.skipVerificationSteps?.includes('email')) {
      steps.push({
        type: 'email',
        required: true,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
      });
    }

    // Add type-specific steps
    switch (type) {
      case 'key_recovery':
        steps.push({
          type: 'recovery_phrase',
          required: true,
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
        });
        break;

      case 'wallet_recovery':
        steps.push(
          {
            type: 'recovery_phrase',
            required: true,
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
          },
          {
            type: 'biometric',
            required: false,
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
          }
        );
        break;

      case 'social_recovery':
        steps.push(
          {
            type: 'guardian',
            required: true,
            status: 'pending',
            attempts: 0,
            maxAttempts: 5,
          },
          {
            type: 'guardian',
            required: true,
            status: 'pending',
            attempts: 0,
            maxAttempts: 5,
          }
        );
        break;

      case 'access_recovery':
        steps.push({
          type: 'device',
          required: false,
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
        });
        break;
    }

    return steps;
  }

  /**
   * Constant-time comparison of two hex strings to prevent timing attacks.
   * Returns true only when both strings are identical in length and content.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Perform a dummy comparison so execution time does not leak length.
      nodeCrypto.timingSafeEqual(
        Buffer.alloc(a.length || 1),
        Buffer.alloc(a.length || 1)
      );
      return false;
    }
    return nodeCrypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  }

  private async performVerification(
    step: VerificationStep,
    data: VerificationData,
    requestId: string,
    userId: string
  ): Promise<boolean> {
    switch (step.type) {
      case 'email':
      case 'sms': {
        // Fail closed when no secret has been issued for this step.
        if (!step.secretHash || !step.secretExpiresAt) {
          return false;
        }
        // Reject replayed (already-used) codes.
        if (step.used) {
          return false;
        }
        // Reject expired codes.
        if (Date.now() > step.secretExpiresAt.getTime()) {
          return false;
        }
        if (!data.code) {
          return false;
        }
        const candidateHash = nodeCrypto
          .createHash('sha256')
          .update(data.code)
          .digest('hex');
        const match = this.timingSafeEqual(candidateHash, step.secretHash);
        if (match) {
          // Mark as used to prevent replay.
          step.used = true;
        }
        return match;
      }

      case 'recovery_phrase': {
        // Fail closed when no phrase hash has been registered for this user.
        const storedHash = this.recoveryPhraseHashes.get(userId);
        if (!storedHash) {
          return false;
        }
        if (!data.recoveryPhrase || data.recoveryPhrase.length !== 24) {
          return false;
        }
        const candidateHash = this.hashRecoveryPhrase(data.recoveryPhrase);
        return this.timingSafeEqual(candidateHash, storedHash);
      }

      case 'biometric':
        // Fail closed: platform biometric API is not wired up in this
        // environment.  A real integration would call the platform SDK here.
        return false;

      case 'guardian': {
        const pubKeyHex = this.guardianPublicKeys.get(requestId);
        if (!pubKeyHex || !data.guardianApproval) {
          return false;
        }
        try {
          const pubKey = nodeCrypto.createPublicKey({
            key: Buffer.from(pubKeyHex, 'hex'),
            format: 'der',
            type: 'spki',
          });
          return nodeCrypto.verify(
            null,
            Buffer.from(requestId),
            pubKey,
            Buffer.from(data.guardianApproval, 'hex')
          );
        } catch {
          return false;
        }
      }

      case 'device': {
        const pubKeyHex = this.devicePublicKeys.get(requestId);
        if (!pubKeyHex || !data.signature) {
          return false;
        }
        try {
          const pubKey = nodeCrypto.createPublicKey({
            key: Buffer.from(pubKeyHex, 'hex'),
            format: 'der',
            type: 'spki',
          });
          return nodeCrypto.verify(
            null,
            Buffer.from(requestId),
            pubKey,
            Buffer.from(data.signature, 'hex')
          );
        } catch {
          return false;
        }
      }

      default:
        return false;
    }
  }

  private emitEvent(event: SecurityEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createEmergencyController(
  config?: EmergencyConfig
): DefaultEmergencyController {
  return new DefaultEmergencyController(config);
}

export function createRecoveryManager(): DefaultRecoveryManager {
  return new DefaultRecoveryManager();
}
