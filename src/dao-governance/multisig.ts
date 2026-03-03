/**
 * TONAIAgent - DAO Multi-Signature Layer (Issue #103)
 *
 * Multi-signature security layer for treasury operations.
 * Supports standard multisig and emergency multisig with timelock.
 */

import type {
  MultiSigConfig,
  MultiSigOperation,
  MultiSigSignature,
  DaoEvent,
  DaoEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface MultiSigManager {
  // Operation management
  createOperation(
    type: MultiSigOperation['type'],
    description: string,
    data: Record<string, unknown>,
    createdBy: string,
    isEmergency?: boolean
  ): MultiSigOperation;

  getOperation(operationId: string): MultiSigOperation | undefined;
  getPendingOperations(): MultiSigOperation[];
  getOperationHistory(limit?: number): MultiSigOperation[];

  // Signing
  sign(operationId: string, signer: string, approved: boolean, signature?: string): MultiSigSignature;
  reject(operationId: string, signer: string, reason: string): boolean;

  // Execution
  canExecute(operationId: string): boolean;
  execute(operationId: string): boolean;

  // Configuration
  getConfig(): MultiSigConfig;
  updateSigners(signers: string[], required: number): void;

  // Events
  onEvent(callback: DaoEventCallback): () => void;
}

// ============================================================================
// Defaults
// ============================================================================

export interface MultiSigManagerConfig {
  multiSigConfig?: Partial<MultiSigConfig>;
  operationExpirySeconds?: number;
}

const DEFAULT_MULTISIG: MultiSigConfig = {
  required: 3,
  signers: [],
  timelockDuration: 172800,     // 2 days
  emergencySigners: [],
  emergencyRequired: 2,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultMultiSigManager implements MultiSigManager {
  private config: MultiSigConfig;
  private readonly operationExpirySeconds: number;
  private readonly operations = new Map<string, MultiSigOperation>();
  private readonly operationHistory: MultiSigOperation[] = [];
  private readonly eventCallbacks: DaoEventCallback[] = [];

  constructor(config: MultiSigManagerConfig = {}) {
    this.config = { ...DEFAULT_MULTISIG, ...(config.multiSigConfig ?? {}) };
    this.operationExpirySeconds = config.operationExpirySeconds ?? 604800;  // 7 days
  }

  // --------------------------------------------------------------------------
  // Operation Management
  // --------------------------------------------------------------------------

  createOperation(
    type: MultiSigOperation['type'],
    description: string,
    data: Record<string, unknown>,
    createdBy: string,
    isEmergency = false
  ): MultiSigOperation {
    const required = isEmergency ? this.config.emergencyRequired : this.config.required;

    const timelockEndsAt = isEmergency
      ? undefined  // No timelock for emergency
      : new Date(Date.now() + this.config.timelockDuration * 1000);

    const operation: MultiSigOperation = {
      id: this.generateId(),
      type,
      description,
      data,
      requiredSignatures: required,
      signatures: [],
      status: 'pending',
      timelockEndsAt,
      createdAt: new Date(),
      createdBy,
      expiresAt: new Date(Date.now() + this.operationExpirySeconds * 1000),
    };

    this.operations.set(operation.id, operation);

    this.emit({
      type: 'multisig.operation_created',
      data: { operationId: operation.id, opType: type, createdBy },
      timestamp: new Date(),
    });

    return operation;
  }

  getOperation(operationId: string): MultiSigOperation | undefined {
    return this.operations.get(operationId);
  }

  getPendingOperations(): MultiSigOperation[] {
    const now = new Date();
    const pending: MultiSigOperation[] = [];

    for (const op of this.operations.values()) {
      if (op.expiresAt < now && op.status === 'pending') {
        op.status = 'expired';
        continue;
      }
      if (op.status === 'pending') pending.push(op);
    }

    return pending.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getOperationHistory(limit = 50): MultiSigOperation[] {
    return this.operationHistory.slice(-limit).reverse();
  }

  // --------------------------------------------------------------------------
  // Signing
  // --------------------------------------------------------------------------

  sign(operationId: string, signer: string, approved: boolean, signature?: string): MultiSigSignature {
    const operation = this.operations.get(operationId);
    if (!operation) throw new Error(`Operation ${operationId} not found`);
    if (operation.status !== 'pending') throw new Error(`Operation ${operationId} is not pending`);
    if (operation.expiresAt < new Date()) throw new Error(`Operation ${operationId} has expired`);

    // Check signer is authorized
    const allSigners = [...this.config.signers, ...this.config.emergencySigners];
    if (!allSigners.includes(signer)) {
      throw new Error(`${signer} is not an authorized signer`);
    }

    // Check no duplicate signature
    const existing = operation.signatures.find(s => s.signer === signer);
    if (existing) throw new Error(`${signer} has already signed operation ${operationId}`);

    const sig: MultiSigSignature = {
      signer,
      signature: signature ?? `sig-${signer}-${Date.now()}`,
      signedAt: new Date(),
      approved,
    };

    operation.signatures.push(sig);

    this.emit({
      type: 'multisig.operation_signed',
      data: { operationId, signer, approved },
      timestamp: new Date(),
    });

    // Check if rejected (any rejection from non-emergency signers = reject)
    const rejections = operation.signatures.filter(s => !s.approved).length;
    if (rejections > 0 && !this.isEmergencyOperation(operation)) {
      operation.status = 'rejected';
      this.finalizeOperation(operation);
    }

    // Check if enough approvals
    const approvals = operation.signatures.filter(s => s.approved).length;
    if (approvals >= operation.requiredSignatures) {
      // Move to approved; execution depends on timelock
      operation.status = 'approved';
    }

    return sig;
  }

  reject(operationId: string, signer: string, reason: string): boolean {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'pending') return false;

    operation.status = 'rejected';
    this.finalizeOperation(operation);
    return true;
  }

  // --------------------------------------------------------------------------
  // Execution
  // --------------------------------------------------------------------------

  canExecute(operationId: string): boolean {
    const operation = this.operations.get(operationId);
    if (!operation) return false;
    if (operation.status !== 'approved') return false;
    if (operation.expiresAt < new Date()) return false;

    // Check timelock
    if (operation.timelockEndsAt && operation.timelockEndsAt > new Date()) return false;

    const approvals = operation.signatures.filter(s => s.approved).length;
    return approvals >= operation.requiredSignatures;
  }

  execute(operationId: string): boolean {
    if (!this.canExecute(operationId)) return false;

    const operation = this.operations.get(operationId)!;
    operation.status = 'executed';
    operation.executedAt = new Date();

    this.finalizeOperation(operation);
    this.emit({ type: 'multisig.operation_executed', data: { operationId }, timestamp: new Date() });

    return true;
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  getConfig(): MultiSigConfig {
    return { ...this.config };
  }

  updateSigners(signers: string[], required: number): void {
    if (required > signers.length) {
      throw new Error(`Required signatures (${required}) cannot exceed number of signers (${signers.length})`);
    }
    this.config.signers = signers;
    this.config.required = required;
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: DaoEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private isEmergencyOperation(operation: MultiSigOperation): boolean {
    return operation.type === 'emergency';
  }

  private finalizeOperation(operation: MultiSigOperation): void {
    this.operations.delete(operation.id);
    this.operationHistory.push(operation);
  }

  private emit(event: DaoEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createMultiSigManager(config?: MultiSigManagerConfig): MultiSigManager {
  return new DefaultMultiSigManager(config);
}
