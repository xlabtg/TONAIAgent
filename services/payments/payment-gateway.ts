/**
 * TONAIAgent - Payment Gateway
 *
 * Core payment processing infrastructure enabling autonomous payments,
 * scheduled transactions, conditional payments, split payments, and escrow.
 */

import {
  Payment,
  PaymentStatus,
  PaymentType,
  PaymentMethod,
  Currency,
  PaymentParty,
  PaymentFees,
  PaymentAuthorization,
  PaymentSchedule,
  PaymentCondition,
  PaymentSplit,
  ComplianceInfo,
  AuditEvent,
  GatewayConfig,
  PaymentsEvent,
  PaymentsEventCallback,
  Approver,
  ScheduleFrequency,
} from './types';

// ============================================================================
// Payment Gateway Interface
// ============================================================================

export interface PaymentGateway {
  readonly config: GatewayConfig;

  // Payment lifecycle
  createPayment(params: CreatePaymentParams): Promise<Payment>;
  authorizePayment(paymentId: string, approvers?: string[]): Promise<Payment>;
  capturePayment(paymentId: string, amount?: string): Promise<Payment>;
  cancelPayment(paymentId: string, reason?: string): Promise<Payment>;
  refundPayment(paymentId: string, amount?: string, reason?: string): Promise<RefundResult>;

  // Payment queries
  getPayment(paymentId: string): Promise<Payment | null>;
  listPayments(filters: PaymentFilters): Promise<PaymentListResult>;
  getPaymentHistory(paymentId: string): Promise<AuditEvent[]>;

  // Scheduled payments
  schedulePayment(params: SchedulePaymentParams): Promise<Payment>;
  updateSchedule(paymentId: string, schedule: Partial<PaymentSchedule>): Promise<Payment>;
  cancelScheduledPayment(paymentId: string): Promise<Payment>;
  getUpcomingPayments(userId: string, days?: number): Promise<Payment[]>;

  // Conditional payments
  createConditionalPayment(params: ConditionalPaymentParams): Promise<Payment>;
  evaluateConditions(paymentId: string): Promise<ConditionEvaluationResult>;
  triggerConditionalPayment(paymentId: string): Promise<Payment>;

  // Split payments
  createSplitPayment(params: SplitPaymentParams): Promise<Payment>;
  updateSplits(paymentId: string, splits: PaymentSplit[]): Promise<Payment>;

  // Escrow
  createEscrowPayment(params: EscrowPaymentParams): Promise<Payment>;
  releaseEscrow(paymentId: string): Promise<Payment>;
  refundEscrow(paymentId: string): Promise<Payment>;
  disputeEscrow(paymentId: string, reason: string): Promise<DisputeResult>;

  // Authorization
  addApprover(paymentId: string, approverId: string, type: Approver['type']): Promise<Payment>;
  removeApprover(paymentId: string, approverId: string): Promise<Payment>;
  approve(paymentId: string, approverId: string, signature?: string): Promise<Payment>;
  reject(paymentId: string, approverId: string, reason: string): Promise<Payment>;

  // Fees
  calculateFees(amount: string, currency: Currency, method: PaymentMethod): Promise<PaymentFees>;
  estimateTotal(params: EstimateTotalParams): Promise<PaymentEstimate>;

  // Events
  onEvent(callback: PaymentsEventCallback): void;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface CreatePaymentParams {
  type: PaymentType;
  method: PaymentMethod;
  amount: string;
  currency: Currency;
  customToken?: string;
  sender: Partial<PaymentParty>;
  recipient: Partial<PaymentParty>;
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  authorization?: Partial<PaymentAuthorization>;
  schedule?: Partial<PaymentSchedule>;
}

export interface SchedulePaymentParams extends CreatePaymentParams {
  executeAt?: Date;
  frequency?: ScheduleFrequency;
  interval?: number;
  endDate?: Date;
  maxExecutions?: number;
}

export interface ConditionalPaymentParams extends CreatePaymentParams {
  conditions: Omit<PaymentCondition, 'id' | 'status' | 'evaluatedAt'>[];
  autoTrigger?: boolean;
  expiresAt?: Date;
}

export interface SplitPaymentParams extends CreatePaymentParams {
  splits: Omit<PaymentSplit, 'status' | 'transactionId'>[];
}

export interface EscrowPaymentParams extends CreatePaymentParams {
  releaseConditions: Omit<PaymentCondition, 'id' | 'status' | 'evaluatedAt'>[];
  arbitrator?: string;
  timeout: number;
  autoRelease?: boolean;
  disputeWindow?: number;
}

export interface PaymentFilters {
  userId?: string;
  merchantId?: string;
  status?: PaymentStatus | PaymentStatus[];
  type?: PaymentType | PaymentType[];
  method?: PaymentMethod | PaymentMethod[];
  currency?: Currency;
  minAmount?: string;
  maxAmount?: string;
  fromDate?: Date;
  toDate?: Date;
  reference?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface EstimateTotalParams {
  amount: string;
  currency: Currency;
  method: PaymentMethod;
  splits?: { percentage: number }[];
  escrow?: boolean;
}

// ============================================================================
// Result Types
// ============================================================================

export interface PaymentListResult {
  payments: Payment[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface RefundResult {
  payment: Payment;
  refundId: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
  reason?: string;
}

export interface ConditionEvaluationResult {
  paymentId: string;
  conditions: {
    conditionId: string;
    status: 'met' | 'not_met' | 'pending' | 'error';
    currentValue?: unknown;
    evaluatedAt: Date;
    error?: string;
  }[];
  allConditionsMet: boolean;
  canExecute: boolean;
}

export interface DisputeResult {
  payment: Payment;
  disputeId: string;
  status: 'opened' | 'under_review' | 'resolved_buyer' | 'resolved_seller';
  reason: string;
  createdAt: Date;
  resolution?: string;
}

export interface PaymentEstimate {
  amount: string;
  fees: PaymentFees;
  total: string;
  currency: Currency;
  exchangeRate?: string;
  estimatedDelivery?: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultPaymentGateway implements PaymentGateway {
  readonly config: GatewayConfig;

  private payments: Map<string, Payment> = new Map();
  private scheduleTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventCallbacks: PaymentsEventCallback[] = [];

  constructor(config?: Partial<GatewayConfig>) {
    this.config = {
      enabled: true,
      supportedCurrencies: ['TON', 'USDT', 'USDC', 'NOT'],
      supportedMethods: ['ton_wallet', 'jetton', 'stablecoin'],
      defaultCurrency: 'TON',
      networkFeeMultiplier: 1.0,
      platformFeePercent: 0.5,
      escrowEnabled: true,
      maxTransactionAmount: '1000000',
      authorizationTimeout: 3600,
      ...config,
    };
  }

  // ============================================================================
  // Payment Lifecycle
  // ============================================================================

  async createPayment(params: CreatePaymentParams): Promise<Payment> {
    this.validatePaymentParams(params);

    const paymentId = this.generateId('pay');
    const now = new Date();

    const sender: PaymentParty = {
      type: 'user',
      verified: false,
      ...params.sender,
      id: params.sender.id || this.generateId('usr'),
      address: params.sender.address || '',
    };

    const recipient: PaymentParty = {
      type: 'merchant',
      verified: false,
      ...params.recipient,
      id: params.recipient.id || this.generateId('rcp'),
      address: params.recipient.address || '',
    };

    const fees = await this.calculateFees(params.amount, params.currency, params.method);

    const authorization: PaymentAuthorization = {
      type: 'single',
      required: 1,
      collected: 0,
      approvers: [],
      ...params.authorization,
    };

    const schedule: PaymentSchedule | undefined = params.schedule
      ? {
          type: params.schedule.type || 'immediate',
          executionCount: 0,
          ...params.schedule,
        }
      : undefined;

    const payment: Payment = {
      id: paymentId,
      type: params.type,
      status: 'pending',
      method: params.method,
      amount: params.amount,
      currency: params.currency,
      customToken: params.customToken,
      sender,
      recipient,
      description: params.description,
      reference: params.reference,
      metadata: params.metadata || {},
      fees,
      authorization,
      schedule,
      compliance: this.createInitialCompliance(),
      audit: {
        events: [
          this.createAuditEvent('payment_created', sender.id, 'user', { params }),
        ],
      },
      createdAt: now,
      updatedAt: now,
    };

    this.payments.set(paymentId, payment);
    this.emitEvent('payment.created', 'payment', paymentId, 'created', payment);

    return payment;
  }

  async authorizePayment(paymentId: string, approvers?: string[]): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (payment.status !== 'pending') {
      throw new Error(`Cannot authorize payment with status: ${payment.status}`);
    }

    // If approvers provided, process approvals
    if (approvers && approvers.length > 0) {
      for (const approverId of approvers) {
        await this.approve(paymentId, approverId);
      }
      return this.getPaymentOrThrow(paymentId);
    }

    // Check if authorization requirements are met
    if (payment.authorization && payment.authorization.collected >= payment.authorization.required) {
      payment.status = 'authorized';
      payment.updatedAt = new Date();
      this.addAuditEvent(payment, 'payment_authorized', 'system', 'system', {});
      this.emitEvent('payment.authorized', 'payment', paymentId, 'authorized', payment);
    }

    return payment;
  }

  async capturePayment(paymentId: string, amount?: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (payment.status !== 'authorized' && payment.status !== 'pending') {
      throw new Error(`Cannot capture payment with status: ${payment.status}`);
    }

    const captureAmount = amount || payment.amount;

    // Simulate capture
    payment.status = 'captured';
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'payment_captured', 'system', 'system', {
      captureAmount,
      originalAmount: payment.amount,
    });

    // Process to completed
    await this.processPayment(payment);

    return payment;
  }

  async cancelPayment(paymentId: string, reason?: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (['completed', 'refunded', 'cancelled'].includes(payment.status)) {
      throw new Error(`Cannot cancel payment with status: ${payment.status}`);
    }

    payment.status = 'cancelled';
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'payment_cancelled', 'system', 'system', { reason });

    // Cancel any scheduled executions
    if (this.scheduleTimers.has(paymentId)) {
      clearTimeout(this.scheduleTimers.get(paymentId)!);
      this.scheduleTimers.delete(paymentId);
    }

    return payment;
  }

  async refundPayment(paymentId: string, amount?: string, reason?: string): Promise<RefundResult> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (payment.status !== 'completed') {
      throw new Error(`Cannot refund payment with status: ${payment.status}`);
    }

    const refundAmount = amount || payment.amount;
    const isPartialRefund = BigInt(refundAmount) < BigInt(payment.amount);

    payment.status = isPartialRefund ? 'partially_refunded' : 'refunded';
    payment.updatedAt = new Date();

    const refundId = this.generateId('ref');

    this.addAuditEvent(payment, 'payment_refunded', 'system', 'system', {
      refundId,
      refundAmount,
      reason,
      isPartialRefund,
    });

    this.emitEvent('payment.refunded', 'payment', paymentId, 'refunded', { refundId, amount: refundAmount });

    return {
      payment,
      refundId,
      amount: refundAmount,
      status: 'completed',
      reason,
    };
  }

  // ============================================================================
  // Payment Queries
  // ============================================================================

  async getPayment(paymentId: string): Promise<Payment | null> {
    return this.payments.get(paymentId) || null;
  }

  async listPayments(filters: PaymentFilters): Promise<PaymentListResult> {
    let payments = Array.from(this.payments.values());

    // Apply filters
    if (filters.userId) {
      payments = payments.filter(p => p.sender.id === filters.userId || p.recipient.id === filters.userId);
    }
    if (filters.merchantId) {
      payments = payments.filter(p => p.recipient.id === filters.merchantId);
    }
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      payments = payments.filter(p => statuses.includes(p.status));
    }
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      payments = payments.filter(p => types.includes(p.type));
    }
    if (filters.method) {
      const methods = Array.isArray(filters.method) ? filters.method : [filters.method];
      payments = payments.filter(p => methods.includes(p.method));
    }
    if (filters.currency) {
      payments = payments.filter(p => p.currency === filters.currency);
    }
    if (filters.minAmount) {
      payments = payments.filter(p => BigInt(p.amount) >= BigInt(filters.minAmount!));
    }
    if (filters.maxAmount) {
      payments = payments.filter(p => BigInt(p.amount) <= BigInt(filters.maxAmount!));
    }
    if (filters.fromDate) {
      payments = payments.filter(p => p.createdAt >= filters.fromDate!);
    }
    if (filters.toDate) {
      payments = payments.filter(p => p.createdAt <= filters.toDate!);
    }
    if (filters.reference) {
      payments = payments.filter(p => p.reference === filters.reference);
    }

    // Sort
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    payments.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortBy === 'amount') {
        comparison = Number(BigInt(a.amount) - BigInt(b.amount));
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = payments.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const paginatedPayments = payments.slice(offset, offset + limit);

    return {
      payments: paginatedPayments,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : undefined,
    };
  }

  async getPaymentHistory(paymentId: string): Promise<AuditEvent[]> {
    const payment = await this.getPaymentOrThrow(paymentId);
    return payment.audit.events;
  }

  // ============================================================================
  // Scheduled Payments
  // ============================================================================

  async schedulePayment(params: SchedulePaymentParams): Promise<Payment> {
    const payment = await this.createPayment({
      ...params,
      type: params.type || 'scheduled',
      schedule: {
        type: params.frequency ? 'recurring' : 'scheduled',
        executeAt: params.executeAt,
        frequency: params.frequency,
        interval: params.interval || 1,
        startDate: params.executeAt || new Date(),
        endDate: params.endDate,
        maxExecutions: params.maxExecutions,
        executionCount: 0,
      },
    });

    // Calculate next execution
    if (payment.schedule) {
      payment.schedule.nextExecutionAt = this.calculateNextExecution(payment.schedule);
      this.scheduleNextExecution(payment);
    }

    return payment;
  }

  async updateSchedule(paymentId: string, schedule: Partial<PaymentSchedule>): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.schedule) {
      throw new Error('Payment does not have a schedule');
    }

    Object.assign(payment.schedule, schedule);
    payment.schedule.nextExecutionAt = this.calculateNextExecution(payment.schedule);
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'schedule_updated', 'system', 'system', { schedule });

    // Reschedule
    this.cancelScheduledExecution(paymentId);
    this.scheduleNextExecution(payment);

    return payment;
  }

  async cancelScheduledPayment(paymentId: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    this.cancelScheduledExecution(paymentId);

    payment.status = 'cancelled';
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'scheduled_payment_cancelled', 'system', 'system', {});

    return payment;
  }

  async getUpcomingPayments(userId: string, days: number = 30): Promise<Payment[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const payments = Array.from(this.payments.values()).filter(p => {
      if (p.sender.id !== userId) return false;
      if (!p.schedule?.nextExecutionAt) return false;
      if (p.status === 'cancelled' || p.status === 'completed') return false;
      return p.schedule.nextExecutionAt <= cutoff;
    });

    return payments.sort((a, b) => {
      const aNext = a.schedule?.nextExecutionAt?.getTime() || 0;
      const bNext = b.schedule?.nextExecutionAt?.getTime() || 0;
      return aNext - bNext;
    });
  }

  // ============================================================================
  // Conditional Payments
  // ============================================================================

  async createConditionalPayment(params: ConditionalPaymentParams): Promise<Payment> {
    const payment = await this.createPayment({
      ...params,
      type: 'conditional',
    });

    payment.conditions = params.conditions.map(c => ({
      ...c,
      id: this.generateId('cond'),
      status: 'pending',
    }));

    if (params.autoTrigger) {
      // Start monitoring conditions
      this.monitorConditions(payment);
    }

    return payment;
  }

  async evaluateConditions(paymentId: string): Promise<ConditionEvaluationResult> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.conditions || payment.conditions.length === 0) {
      return {
        paymentId,
        conditions: [],
        allConditionsMet: true,
        canExecute: true,
      };
    }

    const now = new Date();
    const evaluatedConditions = payment.conditions.map(condition => {
      const result = this.evaluateCondition(condition);
      condition.status = result.met ? 'met' : 'not_met';
      condition.evaluatedAt = now;

      return {
        conditionId: condition.id,
        status: result.met ? 'met' as const : 'not_met' as const,
        currentValue: result.currentValue,
        evaluatedAt: now,
        error: result.error,
      };
    });

    const allConditionsMet = evaluatedConditions.every(c => c.status === 'met');

    return {
      paymentId,
      conditions: evaluatedConditions,
      allConditionsMet,
      canExecute: allConditionsMet && payment.status === 'pending',
    };
  }

  async triggerConditionalPayment(paymentId: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);
    const evaluation = await this.evaluateConditions(paymentId);

    if (!evaluation.canExecute) {
      throw new Error('Conditions not met or payment not in pending state');
    }

    // Process the payment
    await this.processPayment(payment);

    return payment;
  }

  // ============================================================================
  // Split Payments
  // ============================================================================

  async createSplitPayment(params: SplitPaymentParams): Promise<Payment> {
    this.validateSplits(params.splits, params.amount);

    const payment = await this.createPayment({
      ...params,
      type: 'split',
    });

    payment.splits = params.splits.map(split => ({
      ...split,
      status: 'pending',
    }));

    return payment;
  }

  async updateSplits(paymentId: string, splits: PaymentSplit[]): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (payment.status !== 'pending') {
      throw new Error('Cannot update splits for non-pending payment');
    }

    this.validateSplits(
      splits.map(s => ({ recipientId: s.recipientId, recipientAddress: s.recipientAddress, type: s.type, amount: s.amount, percentage: s.percentage, priority: 0 })),
      payment.amount
    );

    payment.splits = splits;
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'splits_updated', 'system', 'system', { splits });

    return payment;
  }

  // ============================================================================
  // Escrow
  // ============================================================================

  async createEscrowPayment(params: EscrowPaymentParams): Promise<Payment> {
    if (!this.config.escrowEnabled) {
      throw new Error('Escrow payments are not enabled');
    }

    const payment = await this.createPayment({
      ...params,
      type: 'escrow',
    });

    payment.escrow = {
      escrowAddress: this.generateEscrowAddress(),
      releaseConditions: params.releaseConditions.map(c => ({
        ...c,
        id: this.generateId('cond'),
        status: 'pending',
      })),
      arbitrator: params.arbitrator,
      timeout: params.timeout,
      autoRelease: params.autoRelease ?? true,
      disputeWindow: params.disputeWindow || 7 * 24 * 60 * 60 * 1000, // 7 days
      status: 'held',
    };

    // Fund escrow
    payment.status = 'processing';
    await this.fundEscrow(payment);

    return payment;
  }

  async releaseEscrow(paymentId: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.escrow) {
      throw new Error('Payment is not an escrow payment');
    }

    if (payment.escrow.status !== 'held') {
      throw new Error(`Cannot release escrow with status: ${payment.escrow.status}`);
    }

    // Check conditions if they exist
    if (payment.escrow.releaseConditions.length > 0) {
      const evaluation = await this.evaluateConditions(paymentId);
      if (!evaluation.allConditionsMet) {
        throw new Error('Release conditions not met');
      }
    }

    payment.escrow.status = 'released';
    payment.escrow.releasedAt = new Date();
    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'escrow_released', 'system', 'system', {});
    this.emitEvent('payment.completed', 'payment', paymentId, 'completed', payment);

    return payment;
  }

  async refundEscrow(paymentId: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.escrow) {
      throw new Error('Payment is not an escrow payment');
    }

    if (payment.escrow.status !== 'held') {
      throw new Error(`Cannot refund escrow with status: ${payment.escrow.status}`);
    }

    payment.escrow.status = 'refunded';
    payment.status = 'refunded';
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'escrow_refunded', 'system', 'system', {});
    this.emitEvent('payment.refunded', 'payment', paymentId, 'refunded', payment);

    return payment;
  }

  async disputeEscrow(paymentId: string, reason: string): Promise<DisputeResult> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.escrow) {
      throw new Error('Payment is not an escrow payment');
    }

    if (payment.escrow.status !== 'held') {
      throw new Error(`Cannot dispute escrow with status: ${payment.escrow.status}`);
    }

    payment.escrow.status = 'disputed';
    payment.status = 'disputed';
    payment.updatedAt = new Date();

    const disputeId = this.generateId('dsp');

    this.addAuditEvent(payment, 'escrow_disputed', payment.sender.id, 'user', {
      disputeId,
      reason,
    });

    this.emitEvent('payment.disputed', 'payment', paymentId, 'disputed', { disputeId, reason });

    return {
      payment,
      disputeId,
      status: 'opened',
      reason,
      createdAt: new Date(),
    };
  }

  // ============================================================================
  // Authorization
  // ============================================================================

  async addApprover(paymentId: string, approverId: string, type: Approver['type']): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.authorization) {
      payment.authorization = {
        type: 'multi_sig',
        required: 1,
        collected: 0,
        approvers: [],
      };
    }

    payment.authorization.approvers.push({
      id: approverId,
      type,
      status: 'pending',
    });

    payment.updatedAt = new Date();
    this.addAuditEvent(payment, 'approver_added', 'system', 'system', { approverId, type });

    return payment;
  }

  async removeApprover(paymentId: string, approverId: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.authorization) {
      throw new Error('Payment does not have authorization');
    }

    payment.authorization.approvers = payment.authorization.approvers.filter(
      a => a.id !== approverId
    );

    payment.updatedAt = new Date();
    this.addAuditEvent(payment, 'approver_removed', 'system', 'system', { approverId });

    return payment;
  }

  async approve(paymentId: string, approverId: string, signature?: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.authorization) {
      throw new Error('Payment does not have authorization');
    }

    const approver = payment.authorization.approvers.find(a => a.id === approverId);
    if (!approver) {
      // Add approver if not exists
      payment.authorization.approvers.push({
        id: approverId,
        type: 'user',
        status: 'approved',
        signature,
        timestamp: new Date(),
      });
    } else {
      approver.status = 'approved';
      approver.signature = signature;
      approver.timestamp = new Date();
    }

    payment.authorization.collected = payment.authorization.approvers.filter(
      a => a.status === 'approved'
    ).length;

    payment.updatedAt = new Date();
    this.addAuditEvent(payment, 'payment_approved', approverId, 'user', { signature });

    // Check if we have enough approvals
    if (payment.authorization.collected >= payment.authorization.required) {
      await this.authorizePayment(paymentId);
    }

    return payment;
  }

  async reject(paymentId: string, approverId: string, reason: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.authorization) {
      throw new Error('Payment does not have authorization');
    }

    const approver = payment.authorization.approvers.find(a => a.id === approverId);
    if (approver) {
      approver.status = 'rejected';
      approver.reason = reason;
      approver.timestamp = new Date();
    }

    payment.status = 'cancelled';
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'payment_rejected', approverId, 'user', { reason });

    return payment;
  }

  // ============================================================================
  // Fees
  // ============================================================================

  async calculateFees(amount: string, currency: Currency, _method: PaymentMethod): Promise<PaymentFees> {
    const amountBigInt = BigInt(amount);

    // Network fee (simulated)
    const networkFee = BigInt(Math.floor(Number(amountBigInt) * 0.001 * this.config.networkFeeMultiplier));

    // Platform fee
    const platformFee = BigInt(Math.floor(Number(amountBigInt) * this.config.platformFeePercent / 100));

    const totalFee = networkFee + platformFee;

    return {
      network: networkFee.toString(),
      platform: platformFee.toString(),
      total: totalFee.toString(),
      currency,
      paidBy: 'sender',
    };
  }

  async estimateTotal(params: EstimateTotalParams): Promise<PaymentEstimate> {
    const fees = await this.calculateFees(params.amount, params.currency, params.method);
    const total = (BigInt(params.amount) + BigInt(fees.total)).toString();

    return {
      amount: params.amount,
      fees,
      total,
      currency: params.currency,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PaymentsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async getPaymentOrThrow(paymentId: string): Promise<Payment> {
    const payment = await this.getPayment(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }
    return payment;
  }

  private validatePaymentParams(params: CreatePaymentParams): void {
    if (!this.config.supportedCurrencies.includes(params.currency)) {
      throw new Error(`Unsupported currency: ${params.currency}`);
    }
    if (!this.config.supportedMethods.includes(params.method)) {
      throw new Error(`Unsupported payment method: ${params.method}`);
    }
    if (BigInt(params.amount) > BigInt(this.config.maxTransactionAmount)) {
      throw new Error(`Amount exceeds maximum: ${this.config.maxTransactionAmount}`);
    }
    if (BigInt(params.amount) <= 0) {
      throw new Error('Amount must be positive');
    }
  }

  private validateSplits(splits: Omit<PaymentSplit, 'status' | 'transactionId'>[], totalAmount: string): void {
    let totalPercentage = 0;
    let totalFixed = BigInt(0);

    for (const split of splits) {
      if (split.type === 'percentage') {
        totalPercentage += split.percentage || 0;
      } else if (split.type === 'fixed') {
        totalFixed += BigInt(split.amount || '0');
      }
    }

    if (totalPercentage > 100) {
      throw new Error('Split percentages exceed 100%');
    }

    if (totalFixed > BigInt(totalAmount)) {
      throw new Error('Fixed split amounts exceed total');
    }
  }

  private createInitialCompliance(): ComplianceInfo {
    return {
      verified: false,
      level: 'none',
      checks: [],
      riskScore: 0,
      flags: [],
    };
  }

  private createAuditEvent(
    action: string,
    actorId: string,
    actorType: AuditEvent['actorType'],
    details: Record<string, unknown>
  ): AuditEvent {
    return {
      id: this.generateId('evt'),
      timestamp: new Date(),
      action,
      actor: actorId,
      actorType,
      details,
    };
  }

  private addAuditEvent(
    payment: Payment,
    action: string,
    actorId: string,
    actorType: AuditEvent['actorType'],
    details: Record<string, unknown>
  ): void {
    payment.audit.events.push(this.createAuditEvent(action, actorId, actorType, details));
  }

  private async processPayment(payment: Payment): Promise<void> {
    // Simulate payment processing
    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.updatedAt = new Date();

    this.addAuditEvent(payment, 'payment_completed', 'system', 'system', {});
    this.emitEvent('payment.completed', 'payment', payment.id, 'completed', payment);
  }

  private calculateNextExecution(schedule: PaymentSchedule): Date {
    const now = new Date();
    let nextDate: Date;

    if (schedule.type === 'scheduled' && schedule.executeAt) {
      nextDate = new Date(schedule.executeAt);
    } else if (schedule.type === 'recurring' && schedule.frequency) {
      const lastExecution = schedule.lastExecutedAt || schedule.startDate || now;
      nextDate = this.addInterval(new Date(lastExecution), schedule.frequency, schedule.interval || 1);
    } else {
      nextDate = now;
    }

    // Check if we've exceeded max executions
    if (schedule.maxExecutions && schedule.executionCount >= schedule.maxExecutions) {
      return new Date(0); // Past date, won't execute
    }

    // Check if we've passed end date
    if (schedule.endDate && nextDate > schedule.endDate) {
      return new Date(0); // Past date, won't execute
    }

    return nextDate;
  }

  private addInterval(date: Date, frequency: ScheduleFrequency, interval: number): Date {
    const result = new Date(date);

    switch (frequency) {
      case 'minutely':
        result.setMinutes(result.getMinutes() + interval);
        break;
      case 'hourly':
        result.setHours(result.getHours() + interval);
        break;
      case 'daily':
        result.setDate(result.getDate() + interval);
        break;
      case 'weekly':
        result.setDate(result.getDate() + interval * 7);
        break;
      case 'biweekly':
        result.setDate(result.getDate() + interval * 14);
        break;
      case 'monthly':
        result.setMonth(result.getMonth() + interval);
        break;
      case 'quarterly':
        result.setMonth(result.getMonth() + interval * 3);
        break;
      case 'annually':
        result.setFullYear(result.getFullYear() + interval);
        break;
    }

    return result;
  }

  private scheduleNextExecution(payment: Payment): void {
    if (!payment.schedule?.nextExecutionAt) return;

    const delay = payment.schedule.nextExecutionAt.getTime() - Date.now();
    if (delay <= 0) return;

    const timer = setTimeout(async () => {
      await this.executeScheduledPayment(payment);
    }, Math.min(delay, 2147483647)); // Max setTimeout delay

    this.scheduleTimers.set(payment.id, timer);
  }

  private cancelScheduledExecution(paymentId: string): void {
    const timer = this.scheduleTimers.get(paymentId);
    if (timer) {
      clearTimeout(timer);
      this.scheduleTimers.delete(paymentId);
    }
  }

  private async executeScheduledPayment(payment: Payment): Promise<void> {
    if (!payment.schedule) return;

    payment.schedule.lastExecutedAt = new Date();
    payment.schedule.executionCount++;

    await this.processPayment(payment);

    // Schedule next execution for recurring payments
    if (payment.schedule.type === 'recurring') {
      payment.schedule.nextExecutionAt = this.calculateNextExecution(payment.schedule);
      this.scheduleNextExecution(payment);
    }
  }

  private monitorConditions(payment: Payment): void {
    // In a real implementation, this would set up monitoring for the conditions
    // For now, we'll use a simple polling mechanism
    const checkInterval = setInterval(async () => {
      const evaluation = await this.evaluateConditions(payment.id);
      if (evaluation.canExecute) {
        clearInterval(checkInterval);
        await this.triggerConditionalPayment(payment.id);
      }
    }, 60000); // Check every minute
  }

  private evaluateCondition(condition: PaymentCondition): { met: boolean; currentValue?: unknown; error?: string } {
    // Simplified condition evaluation
    // In a real implementation, this would query external data sources, oracles, etc.
    switch (condition.type) {
      case 'time_based':
        const now = new Date();
        const targetTime = new Date(condition.value as string);
        return { met: now >= targetTime, currentValue: now };

      case 'balance_check':
        // Simulated balance check
        return { met: true, currentValue: '1000000' };

      case 'price_threshold':
        // Simulated price check
        return { met: false, currentValue: '100' };

      default:
        return { met: false, error: `Unknown condition type: ${condition.type}` };
    }
  }

  private generateEscrowAddress(): string {
    return `EQ${this.generateId('escrow')}`;
  }

  private async fundEscrow(payment: Payment): Promise<void> {
    // Simulate funding escrow
    this.addAuditEvent(payment, 'escrow_funded', 'system', 'system', {
      escrowAddress: payment.escrow?.escrowAddress,
      amount: payment.amount,
    });
  }

  private emitEvent(
    type: PaymentsEvent['type'],
    resourceType: PaymentsEvent['resourceType'],
    resourceId: string,
    action: string,
    data: unknown
  ): void {
    const event: PaymentsEvent = {
      id: this.generateId('evt'),
      timestamp: new Date(),
      type,
      resourceType,
      resourceId,
      action,
      actor: { type: 'system', id: 'payment-gateway' },
      data,
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPaymentGateway(config?: Partial<GatewayConfig>): DefaultPaymentGateway {
  return new DefaultPaymentGateway(config);
}
