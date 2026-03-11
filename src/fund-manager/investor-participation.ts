/**
 * TONAIAgent - Investor Participation Interface
 *
 * Enables investors to:
 * - Deposit capital into AI-managed funds
 * - Withdraw capital (partial or full)
 * - Track their positions
 * - View fund performance and attribution
 *
 * Participation models:
 * - Open funds: any investor can participate
 * - Private funds: whitelist of approved investors
 * - Institutional funds: accredited investor verification required
 */

import {
  DepositInput,
  DepositResult,
  FundConfig,
  FundManagerError,
  FundManagerEventHandler,
  FundManagerEventType,
  FundManagerUnsubscribe,
  FundPortfolio,
  InvestorPosition,
  WithdrawInput,
  WithdrawResult,
} from './types';

// ============================================================================
// Investor Participation Manager
// ============================================================================

/** Configuration for the InvestorParticipationManager */
export interface InvestorParticipationConfig {
  /** Whether to enforce fund size limits */
  enforceFundSizeLimits: boolean;
  /** Maximum positions per investor (0 = unlimited) */
  maxPositionsPerInvestor: number;
}

const DEFAULT_CONFIG: InvestorParticipationConfig = {
  enforceFundSizeLimits: true,
  maxPositionsPerInvestor: 20,
};

export class InvestorParticipationManager {
  private readonly config: InvestorParticipationConfig;
  /** positionId -> InvestorPosition */
  private readonly positions = new Map<string, InvestorPosition>();
  /** `${fundId}:${investorId}` -> positionId */
  private readonly positionIndex = new Map<string, string>();
  private readonly eventHandlers = new Set<FundManagerEventHandler>();

  constructor(config: Partial<InvestorParticipationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Deposit
  // ============================================================================

  /**
   * Process a capital deposit from an investor into a fund.
   *
   * Creates a new position or adds to an existing one.
   * Issues shares at the current NAV per share.
   */
  deposit(
    input: DepositInput,
    fund: FundConfig,
    portfolio: FundPortfolio
  ): DepositResult {
    // Validate minimum investment
    if (input.amount < fund.minInvestmentAmount) {
      throw new FundManagerError(
        `Deposit amount ${input.amount} is below minimum investment ${fund.minInvestmentAmount}`,
        'MIN_INVESTMENT_NOT_MET',
        { fundId: input.fundId, amount: input.amount.toString(), minimum: fund.minInvestmentAmount.toString() }
      );
    }

    // Validate max fund size
    if (
      this.config.enforceFundSizeLimits &&
      fund.maxFundSize > BigInt(0) &&
      portfolio.totalAum + input.amount > fund.maxFundSize
    ) {
      throw new FundManagerError(
        `Deposit would exceed maximum fund size ${fund.maxFundSize}`,
        'MAX_FUND_SIZE_EXCEEDED',
        { fundId: input.fundId, currentAum: portfolio.totalAum.toString(), maxSize: fund.maxFundSize.toString() }
      );
    }

    const now = new Date();
    const navPerShare = portfolio.navPerShare > BigInt(0) ? portfolio.navPerShare : BigInt(1_000_000_000);

    // Calculate shares to issue (amount / navPerShare, scaled to nanoTON precision)
    const sharesIssued = (input.amount * BigInt(1_000_000_000)) / navPerShare;

    // Check for existing position
    const indexKey = `${input.fundId}:${input.investorId}`;
    const existingPositionId = this.positionIndex.get(indexKey);

    let positionId: string;

    if (existingPositionId) {
      // Add to existing position
      const position = this.positions.get(existingPositionId)!;
      const updated: InvestorPosition = {
        ...position,
        capitalInvested: position.capitalInvested + input.amount,
        currentValue: position.currentValue + input.amount,
        sharesHeld: position.sharesHeld + sharesIssued,
        lastUpdatedAt: now,
      };
      this.positions.set(existingPositionId, updated);
      positionId = existingPositionId;
    } else {
      // Create new position
      positionId = this.generateId('pos');
      const position: InvestorPosition = {
        positionId,
        fundId: input.fundId,
        investorId: input.investorId,
        investorAddress: input.investorAddress,
        capitalInvested: input.amount,
        currentValue: input.amount,
        sharesHeld: sharesIssued,
        entryNavPerShare: navPerShare,
        entryAt: now,
        managementFeesPaid: BigInt(0),
        performanceFeesPaid: BigInt(0),
        isActive: true,
        lastUpdatedAt: now,
      };
      this.positions.set(positionId, position);
      this.positionIndex.set(indexKey, positionId);
    }

    const result: DepositResult = {
      positionId,
      fundId: input.fundId,
      investorId: input.investorId,
      amountDeposited: input.amount,
      sharesIssued,
      navPerShare,
      timestamp: now,
    };

    this.emitEvent('investor.deposited', input.fundId, {
      positionId,
      fundId: input.fundId,
      investorId: input.investorId,
      amountDeposited: input.amount.toString(),
      sharesIssued: sharesIssued.toString(),
    });

    return result;
  }

  // ============================================================================
  // Withdrawal
  // ============================================================================

  /**
   * Process a capital withdrawal from a fund.
   *
   * Redeems shares at the current NAV, calculates realized PnL,
   * and deducts any outstanding fees.
   */
  withdraw(
    input: WithdrawInput,
    fund: FundConfig,
    portfolio: FundPortfolio
  ): WithdrawResult {
    const indexKey = `${input.fundId}:${input.investorId}`;
    const positionId = this.positionIndex.get(indexKey);

    if (!positionId) {
      throw new FundManagerError(
        `No position found for investor ${input.investorId} in fund ${input.fundId}`,
        'POSITION_NOT_FOUND'
      );
    }

    const position = this.positions.get(positionId)!;
    if (!position.isActive) {
      throw new FundManagerError(
        `Position ${positionId} is not active`,
        'POSITION_NOT_FOUND'
      );
    }

    const now = new Date();
    const navPerShare = portfolio.navPerShare > BigInt(0) ? portfolio.navPerShare : BigInt(1_000_000_000);

    // Determine withdrawal amount (0 = full withdrawal)
    const isFullWithdrawal = input.amount === BigInt(0);
    const withdrawAmount = isFullWithdrawal ? position.currentValue : input.amount;

    if (withdrawAmount > position.currentValue) {
      throw new FundManagerError(
        `Withdrawal amount ${withdrawAmount} exceeds position value ${position.currentValue}`,
        'INSUFFICIENT_BALANCE'
      );
    }

    // Calculate shares to redeem
    const totalShares = position.sharesHeld;
    const shareRatio = isFullWithdrawal
      ? BigInt(10000)
      : (withdrawAmount * BigInt(10000)) / position.currentValue;
    const sharesToRedeem = (totalShares * shareRatio) / BigInt(10000);

    // Calculate realized PnL
    const costBasis = (position.capitalInvested * shareRatio) / BigInt(10000);
    const realizedPnl = withdrawAmount > costBasis ? withdrawAmount - costBasis : BigInt(0);

    // Performance fee on profit (simplified: charged at withdrawal)
    const performanceFee = realizedPnl > BigInt(0) && fund.fees.performanceFeePercent > 0
      ? (realizedPnl * BigInt(Math.round(fund.fees.performanceFeePercent * 100))) / BigInt(10000)
      : BigInt(0);

    const amountAfterFees = withdrawAmount - performanceFee;

    // Update position
    if (isFullWithdrawal) {
      const updated: InvestorPosition = {
        ...position,
        currentValue: BigInt(0),
        sharesHeld: BigInt(0),
        capitalInvested: BigInt(0),
        performanceFeesPaid: position.performanceFeesPaid + performanceFee,
        isActive: false,
        lastUpdatedAt: now,
      };
      this.positions.set(positionId, updated);
    } else {
      const updated: InvestorPosition = {
        ...position,
        currentValue: position.currentValue - withdrawAmount,
        sharesHeld: position.sharesHeld - sharesToRedeem,
        capitalInvested: position.capitalInvested - costBasis,
        performanceFeesPaid: position.performanceFeesPaid + performanceFee,
        lastUpdatedAt: now,
      };
      this.positions.set(positionId, updated);
    }

    const result: WithdrawResult = {
      positionId,
      fundId: input.fundId,
      investorId: input.investorId,
      amountWithdrawn: amountAfterFees,
      sharesRedeemed: sharesToRedeem,
      navPerShare,
      realizedPnl,
      feesCharged: performanceFee,
      timestamp: now,
    };

    this.emitEvent('investor.withdrew', input.fundId, {
      positionId,
      fundId: input.fundId,
      investorId: input.investorId,
      amountWithdrawn: amountAfterFees.toString(),
      realizedPnl: realizedPnl.toString(),
      feesCharged: performanceFee.toString(),
    });

    return result;
  }

  // ============================================================================
  // Position Valuation
  // ============================================================================

  /**
   * Update the current value of all positions in a fund based on new NAV.
   */
  updatePositionValues(fundId: string, newNavPerShare: bigint): void {
    for (const position of this.positions.values()) {
      if (position.fundId !== fundId || !position.isActive) continue;

      const currentValue = (position.sharesHeld * newNavPerShare) / BigInt(1_000_000_000);
      const updated: InvestorPosition = {
        ...position,
        currentValue,
        lastUpdatedAt: new Date(),
      };
      this.positions.set(position.positionId, updated);
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  getPosition(positionId: string): InvestorPosition | undefined {
    return this.positions.get(positionId);
  }

  getInvestorPosition(fundId: string, investorId: string): InvestorPosition | undefined {
    const indexKey = `${fundId}:${investorId}`;
    const positionId = this.positionIndex.get(indexKey);
    return positionId ? this.positions.get(positionId) : undefined;
  }

  getActivePositionsForFund(fundId: string): InvestorPosition[] {
    return Array.from(this.positions.values()).filter(
      (p) => p.fundId === fundId && p.isActive
    );
  }

  getInvestorPositions(investorId: string): InvestorPosition[] {
    return Array.from(this.positions.values()).filter((p) => p.investorId === investorId);
  }

  getInvestorCount(fundId: string): number {
    const unique = new Set(
      Array.from(this.positions.values())
        .filter((p) => p.fundId === fundId && p.isActive)
        .map((p) => p.investorId)
    );
    return unique.size;
  }

  getTotalAumForFund(fundId: string): bigint {
    return Array.from(this.positions.values())
      .filter((p) => p.fundId === fundId && p.isActive)
      .reduce((sum, p) => sum + p.currentValue, BigInt(0));
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(handler: FundManagerEventHandler): FundManagerUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private emitEvent(type: FundManagerEventType, fundId: string, data: Record<string, unknown>): void {
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      fundId,
      timestamp: new Date(),
      data,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createInvestorParticipationManager(
  config?: Partial<InvestorParticipationConfig>
): InvestorParticipationManager {
  return new InvestorParticipationManager(config);
}
