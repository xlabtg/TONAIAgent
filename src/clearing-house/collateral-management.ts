/**
 * TONAIAgent - Collateral Management System
 *
 * Manages initial margin, maintenance margin, dynamic collateral requirements,
 * volatility-adjusted margin models, and real-time liquidation prevention
 * for clearing participants in the AI-native ecosystem.
 */

import {
  ClearingParticipantId,
  ObligationId,
  CollateralRequirement,
  ClearingCollateralPosition,
  DynamicMarginModel,
  CollateralManagementConfig,
  CollateralTypeConfig,
  CollateralStatus,
  ParticipantMarginAccount,
  ClearingHouseEvent,
  ClearingHouseEventCallback,
} from './types';

// ============================================================================
// Collateral Management Interface
// ============================================================================

export interface PostCollateralParams {
  participantId: ClearingParticipantId;
  assetId: string;
  assetName: string;
  collateralType: string;
  quantity: number;
  marketValue: number;
  heldFor: 'initial_margin' | 'variation_margin' | 'default_fund';
}

export interface CollateralFilters {
  participantId?: ClearingParticipantId;
  status?: CollateralStatus;
  heldFor?: 'initial_margin' | 'variation_margin' | 'default_fund';
}

export interface MarginCallResult {
  participantId: ClearingParticipantId;
  marginCallAmount: number;
  deadline: Date;
  currentCoverage: number;
  requiredCoverage: number;
  atRiskOfLiquidation: boolean;
}

export interface CollateralHealthReport {
  participantId: ClearingParticipantId;
  totalPosted: number;
  totalRequired: number;
  coverageRatio: number;
  excessMargin: number;
  marginCallActive: boolean;
  liquidationRisk: boolean;
  positions: ClearingCollateralPosition[];
}

export interface CollateralManagementSystemStatus {
  totalCollateralPosted: number;
  totalMarginRequired: number;
  systemCoverageRatio: number;
  participantsWithMarginCalls: number;
  participantsAtLiquidationRisk: number;
  generatedAt: Date;
}

export interface CollateralManager {
  readonly config: CollateralManagementConfig;

  // Collateral Posting & Release
  postCollateral(params: PostCollateralParams): ClearingCollateralPosition;
  releaseCollateral(collateralId: string): ClearingCollateralPosition;
  seizeCollateral(collateralId: string, reason: string): ClearingCollateralPosition;
  getCollateralPosition(collateralId: string): ClearingCollateralPosition | undefined;
  listCollateralPositions(filters?: CollateralFilters): ClearingCollateralPosition[];

  // Margin Requirements
  computeMarginRequirement(participantId: ClearingParticipantId, notionalExposure: number): CollateralRequirement;
  getCollateralRequirement(participantId: ClearingParticipantId): CollateralRequirement;
  updateMarginAccount(participantId: ClearingParticipantId, updates: Partial<ParticipantMarginAccount>): ParticipantMarginAccount;
  getMarginAccount(participantId: ClearingParticipantId): ParticipantMarginAccount | undefined;
  issueMarginCall(participantId: ClearingParticipantId): MarginCallResult;
  resolveMarginCall(participantId: ClearingParticipantId): void;
  checkLiquidationRisk(participantId: ClearingParticipantId): boolean;

  // Dynamic Margin Models
  computeDynamicMargin(assetId: string, notionalValue: number, volatility: number, concentration: number): DynamicMarginModel;

  // Variation Margin
  computeVariationMargin(obligationId: ObligationId, currentMarketValue: number, originalNotional: number): number;

  // Analytics
  getCollateralHealth(participantId: ClearingParticipantId): CollateralHealthReport;
  getSystemStatus(): CollateralManagementSystemStatus;

  // Events
  onEvent(callback: ClearingHouseEventCallback): void;
}

// ============================================================================
// Default Collateral Management Config
// ============================================================================

const DEFAULT_COLLATERAL_CONFIG: CollateralManagementConfig = {
  initialMarginPercent: 0.1, // 10% initial margin
  maintenanceMarginPercent: 0.07, // 7% maintenance margin
  variationMarginFrequency: 'realtime',
  collateralTypes: [
    { assetId: 'TON', assetName: 'TON', haircut: 0.2, maxAllocationPercent: 0.5, acceptedForInitialMargin: true, acceptedForVariationMargin: true },
    { assetId: 'USDT', assetName: 'Tether USD', haircut: 0.02, maxAllocationPercent: 0.8, acceptedForInitialMargin: true, acceptedForVariationMargin: true },
    { assetId: 'USDC', assetName: 'USD Coin', haircut: 0.02, maxAllocationPercent: 0.8, acceptedForInitialMargin: true, acceptedForVariationMargin: true },
    { assetId: 'BTC', assetName: 'Bitcoin', haircut: 0.15, maxAllocationPercent: 0.4, acceptedForInitialMargin: true, acceptedForVariationMargin: false },
    { assetId: 'ETH', assetName: 'Ethereum', haircut: 0.15, maxAllocationPercent: 0.4, acceptedForInitialMargin: true, acceptedForVariationMargin: false },
    { assetId: 'RWA', assetName: 'Real World Asset Token', haircut: 0.3, maxAllocationPercent: 0.3, acceptedForInitialMargin: true, acceptedForVariationMargin: false },
  ],
  autoLiquidationEnabled: true,
  autoLiquidationThreshold: 0.5, // 50% margin coverage triggers liquidation
  defaultFundContributionPercent: 0.02, // 2% of initial margin to default fund
};

// ============================================================================
// Default Collateral Manager Implementation
// ============================================================================

export class DefaultCollateralManager implements CollateralManager {
  readonly config: CollateralManagementConfig;

  private readonly collateralPositions: Map<string, ClearingCollateralPosition> = new Map();
  private readonly marginAccounts: Map<ClearingParticipantId, ParticipantMarginAccount> = new Map();
  private readonly collateralRequirements: Map<ClearingParticipantId, CollateralRequirement> = new Map();
  private readonly eventCallbacks: ClearingHouseEventCallback[] = [];

  constructor(config?: Partial<CollateralManagementConfig>) {
    this.config = { ...DEFAULT_COLLATERAL_CONFIG, ...config };
  }

  // ============================================================================
  // Collateral Posting & Release
  // ============================================================================

  postCollateral(params: PostCollateralParams): ClearingCollateralPosition {
    const collateralTypeConfig = this.config.collateralTypes.find(
      ct => ct.assetId === params.assetId || ct.assetId === params.collateralType
    );
    const haircut = collateralTypeConfig?.haircut ?? 0.2;
    const adjustedValue = params.marketValue * (1 - haircut);

    const position: ClearingCollateralPosition = {
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participantId: params.participantId,
      assetId: params.assetId,
      assetName: params.assetName,
      collateralType: params.collateralType,
      quantity: params.quantity,
      marketValue: params.marketValue,
      haircut,
      adjustedValue,
      status: 'posted',
      heldFor: params.heldFor,
      postedAt: new Date(),
      updatedAt: new Date(),
    };

    this.collateralPositions.set(position.id, position);

    // Update margin account
    const account = this.getOrCreateMarginAccount(params.participantId);
    if (params.heldFor === 'initial_margin') {
      account.initialMarginPosted += adjustedValue;
    } else if (params.heldFor === 'variation_margin') {
      account.variationMargin += adjustedValue;
    }
    account.excessMargin = Math.max(0, account.initialMarginPosted - account.initialMarginRequired);
    account.lastUpdated = new Date();
    this.marginAccounts.set(params.participantId, account);

    this.emitEvent('info', 'collateral_management', 'Collateral posted', {
      collateralId: position.id,
      participantId: params.participantId,
      assetId: params.assetId,
      marketValue: params.marketValue,
      adjustedValue,
      heldFor: params.heldFor,
    });

    return position;
  }

  releaseCollateral(collateralId: string): ClearingCollateralPosition {
    const position = this.collateralPositions.get(collateralId);
    if (!position) {
      throw new Error(`Collateral position not found: ${collateralId}`);
    }

    if (position.status === 'seized' || position.status === 'liquidated') {
      throw new Error(`Cannot release collateral in status: ${position.status}`);
    }

    position.status = 'released';
    position.updatedAt = new Date();
    this.collateralPositions.set(collateralId, position);

    // Update margin account
    const account = this.marginAccounts.get(position.participantId);
    if (account) {
      if (position.heldFor === 'initial_margin') {
        account.initialMarginPosted = Math.max(0, account.initialMarginPosted - position.adjustedValue);
      } else if (position.heldFor === 'variation_margin') {
        account.variationMargin = Math.max(0, account.variationMargin - position.adjustedValue);
      }
      account.excessMargin = Math.max(0, account.initialMarginPosted - account.initialMarginRequired);
      account.lastUpdated = new Date();
      this.marginAccounts.set(position.participantId, account);
    }

    this.emitEvent('info', 'collateral_management', 'Collateral released', {
      collateralId,
      participantId: position.participantId,
      adjustedValue: position.adjustedValue,
    });

    return position;
  }

  seizeCollateral(collateralId: string, reason: string): ClearingCollateralPosition {
    const position = this.collateralPositions.get(collateralId);
    if (!position) {
      throw new Error(`Collateral position not found: ${collateralId}`);
    }

    position.status = 'seized';
    position.updatedAt = new Date();
    this.collateralPositions.set(collateralId, position);

    this.emitEvent('warning', 'collateral_management', 'Collateral seized', {
      collateralId,
      participantId: position.participantId,
      adjustedValue: position.adjustedValue,
      reason,
    });

    return position;
  }

  getCollateralPosition(collateralId: string): ClearingCollateralPosition | undefined {
    return this.collateralPositions.get(collateralId);
  }

  listCollateralPositions(filters?: CollateralFilters): ClearingCollateralPosition[] {
    let list = Array.from(this.collateralPositions.values());

    if (filters) {
      if (filters.participantId) {
        list = list.filter(p => p.participantId === filters.participantId);
      }
      if (filters.status) {
        list = list.filter(p => p.status === filters.status);
      }
      if (filters.heldFor) {
        list = list.filter(p => p.heldFor === filters.heldFor);
      }
    }

    return list;
  }

  // ============================================================================
  // Margin Requirements
  // ============================================================================

  computeMarginRequirement(
    participantId: ClearingParticipantId,
    notionalExposure: number
  ): CollateralRequirement {
    const initialMarginRequired = notionalExposure * this.config.initialMarginPercent;
    const maintenanceMarginRequired = notionalExposure * this.config.maintenanceMarginPercent;

    const account = this.marginAccounts.get(participantId);
    const totalPosted = account
      ? account.initialMarginPosted + account.variationMargin
      : 0;
    const totalRequired = initialMarginRequired;
    const shortfall = Math.max(0, totalRequired - totalPosted);
    const surplus = Math.max(0, totalPosted - totalRequired);
    const coverageRatio = totalRequired > 0 ? totalPosted / totalRequired : 1;
    const variationMarginRequired = Math.max(0, notionalExposure * 0.01); // 1% daily variation estimate

    const requirement: CollateralRequirement = {
      participantId,
      initialMarginRequired,
      maintenanceMarginRequired,
      variationMarginRequired,
      totalRequired,
      totalPosted,
      shortfall,
      surplus,
      coverageRatio,
      computedAt: new Date(),
    };

    this.collateralRequirements.set(participantId, requirement);

    // Update margin account
    const accountToUpdate = this.getOrCreateMarginAccount(participantId);
    accountToUpdate.initialMarginRequired = initialMarginRequired;
    accountToUpdate.maintenanceMargin = maintenanceMarginRequired;
    accountToUpdate.excessMargin = surplus;
    this.marginAccounts.set(participantId, accountToUpdate);

    return requirement;
  }

  getCollateralRequirement(participantId: ClearingParticipantId): CollateralRequirement {
    return this.collateralRequirements.get(participantId) ?? {
      participantId,
      initialMarginRequired: 0,
      maintenanceMarginRequired: 0,
      variationMarginRequired: 0,
      totalRequired: 0,
      totalPosted: 0,
      shortfall: 0,
      surplus: 0,
      coverageRatio: 1,
      computedAt: new Date(),
    };
  }

  updateMarginAccount(
    participantId: ClearingParticipantId,
    updates: Partial<ParticipantMarginAccount>
  ): ParticipantMarginAccount {
    const account = this.getOrCreateMarginAccount(participantId);
    const updated = { ...account, ...updates, lastUpdated: new Date() };
    this.marginAccounts.set(participantId, updated);

    if (updated.hasMarginCall) {
      this.emitEvent('warning', 'collateral_management', 'Margin call active', {
        participantId,
        marginCallAmount: updated.marginCallAmount,
      });
    }

    return updated;
  }

  getMarginAccount(participantId: ClearingParticipantId): ParticipantMarginAccount | undefined {
    return this.marginAccounts.get(participantId);
  }

  issueMarginCall(participantId: ClearingParticipantId): MarginCallResult {
    const requirement = this.getCollateralRequirement(participantId);
    const account = this.getOrCreateMarginAccount(participantId);

    const marginCallAmount = requirement.shortfall;
    const deadline = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4-hour window

    account.marginCallAmount = marginCallAmount;
    account.hasMarginCall = marginCallAmount > 0;
    account.marginCallDeadline = marginCallAmount > 0 ? deadline : undefined;
    account.lastUpdated = new Date();
    this.marginAccounts.set(participantId, account);

    const result: MarginCallResult = {
      participantId,
      marginCallAmount,
      deadline,
      currentCoverage: requirement.coverageRatio,
      requiredCoverage: 1.0,
      atRiskOfLiquidation: requirement.coverageRatio < this.config.autoLiquidationThreshold,
    };

    if (marginCallAmount > 0) {
      const severity = result.atRiskOfLiquidation ? 'critical' : 'warning';
      this.emitEvent(severity, 'collateral_management', 'Margin call issued', {
        participantId,
        marginCallAmount,
        deadline: deadline.toISOString(),
        coverageRatio: requirement.coverageRatio,
        atLiquidationRisk: result.atRiskOfLiquidation,
      });
    }

    return result;
  }

  resolveMarginCall(participantId: ClearingParticipantId): void {
    const account = this.marginAccounts.get(participantId);
    if (!account) return;

    account.hasMarginCall = false;
    account.marginCallAmount = 0;
    account.marginCallDeadline = undefined;
    account.lastUpdated = new Date();
    this.marginAccounts.set(participantId, account);

    this.emitEvent('info', 'collateral_management', 'Margin call resolved', {
      participantId,
    });
  }

  checkLiquidationRisk(participantId: ClearingParticipantId): boolean {
    const requirement = this.getCollateralRequirement(participantId);
    return requirement.coverageRatio < this.config.autoLiquidationThreshold;
  }

  // ============================================================================
  // Dynamic Margin Models
  // ============================================================================

  computeDynamicMargin(
    assetId: string,
    notionalValue: number,
    volatility: number,
    concentration: number
  ): DynamicMarginModel {
    const base = this.config.initialMarginPercent;

    // Volatility multiplier: higher volatility = higher margin
    const volatilityMultiplier = 1 + Math.max(0, (volatility - 0.02) / 0.02); // Scales above 2% daily vol

    // Liquidity penalty based on average daily volume estimate
    const avgDailyVolume = notionalValue * 0.1; // Estimate
    const liquidityPenalty = notionalValue > avgDailyVolume * 10 ? 0.02 : 0;

    // Concentration penalty
    const concentrationPenalty = concentration > 0.25 ? (concentration - 0.25) * 0.1 : 0;

    const computedMarginPercent = base * volatilityMultiplier + liquidityPenalty + concentrationPenalty;

    return {
      assetId,
      baseMarginPercent: base,
      volatilityMultiplier,
      liquidityPenalty,
      concentrationPenalty,
      computedMarginPercent: Math.min(computedMarginPercent, 0.5), // Cap at 50%
      modelInputs: {
        recentVolatility: volatility,
        averageDailyVolume: avgDailyVolume,
        positionConcentration: concentration,
      },
      computedAt: new Date(),
    };
  }

  // ============================================================================
  // Variation Margin
  // ============================================================================

  computeVariationMargin(
    obligationId: ObligationId,
    currentMarketValue: number,
    originalNotional: number
  ): number {
    const pnl = currentMarketValue - originalNotional;
    // Variation margin = mark-to-market P&L
    this.emitEvent('info', 'collateral_management', 'Variation margin computed', {
      obligationId,
      currentMarketValue,
      originalNotional,
      variationMargin: pnl,
    });
    return pnl;
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  getCollateralHealth(participantId: ClearingParticipantId): CollateralHealthReport {
    const positions = Array.from(this.collateralPositions.values()).filter(
      p => p.participantId === participantId && p.status === 'posted'
    );
    const requirement = this.getCollateralRequirement(participantId);
    const account = this.marginAccounts.get(participantId);

    return {
      participantId,
      totalPosted: positions.reduce((sum, p) => sum + p.adjustedValue, 0),
      totalRequired: requirement.totalRequired,
      coverageRatio: requirement.coverageRatio,
      excessMargin: requirement.surplus,
      marginCallActive: account?.hasMarginCall ?? false,
      liquidationRisk: this.checkLiquidationRisk(participantId),
      positions,
    };
  }

  getSystemStatus(): CollateralManagementSystemStatus {
    const activePositions = Array.from(this.collateralPositions.values()).filter(
      p => p.status === 'posted' || p.status === 'held'
    );
    const totalPosted = activePositions.reduce((sum, p) => sum + p.adjustedValue, 0);

    const requirements = Array.from(this.collateralRequirements.values());
    const totalRequired = requirements.reduce((sum, r) => sum + r.totalRequired, 0);

    const accounts = Array.from(this.marginAccounts.values());
    const withMarginCalls = accounts.filter(a => a.hasMarginCall).length;

    const participantsAtLiquidationRisk = Array.from(this.collateralRequirements.keys()).filter(
      id => this.checkLiquidationRisk(id)
    ).length;

    return {
      totalCollateralPosted: totalPosted,
      totalMarginRequired: totalRequired,
      systemCoverageRatio: totalRequired > 0 ? totalPosted / totalRequired : 1,
      participantsWithMarginCalls: withMarginCalls,
      participantsAtLiquidationRisk,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: ClearingHouseEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getOrCreateMarginAccount(participantId: ClearingParticipantId): ParticipantMarginAccount {
    if (!this.marginAccounts.has(participantId)) {
      const account: ParticipantMarginAccount = {
        participantId,
        initialMarginRequired: 0,
        initialMarginPosted: 0,
        variationMargin: 0,
        excessMargin: 0,
        marginCallAmount: 0,
        hasMarginCall: false,
        lastUpdated: new Date(),
      };
      this.marginAccounts.set(participantId, account);
      return account;
    }
    return this.marginAccounts.get(participantId)!;
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: ClearingHouseEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'collateral_posted',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

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
// Factory Function
// ============================================================================

export function createCollateralManager(
  config?: Partial<CollateralManagementConfig>
): DefaultCollateralManager {
  return new DefaultCollateralManager(config);
}

// Re-export config type
export type { CollateralTypeConfig };
