/**
 * TONAIAgent - Clearing House Module Tests
 *
 * Comprehensive test suite for the AI-native Clearing House infrastructure
 * including central clearing, netting engine, collateral management,
 * default resolution, settlement layer, and audit module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createClearingHouseManager,
  createCentralClearingManager,
  createNettingEngine,
  createCollateralManager,
  createDefaultResolutionManager,
  createSettlementLayer,
  createClearingAuditModule,
} from '../../services/clearing-house/index';

// ============================================================================
// Central Clearing Manager Tests
// ============================================================================

describe('CentralClearingManager', () => {
  let manager: ReturnType<typeof createCentralClearingManager>;

  beforeEach(() => {
    manager = createCentralClearingManager();
  });

  describe('participant management', () => {
    it('should register a participant', () => {
      const participant = manager.registerParticipant({
        name: 'Alpha AI Fund',
        type: 'ai_fund',
      });

      expect(participant.id).toBeDefined();
      expect(participant.name).toBe('Alpha AI Fund');
      expect(participant.type).toBe('ai_fund');
      expect(participant.isActive).toBe(true);
      expect(participant.defaultStatus).toBe('none');
    });

    it('should register participant with custom tier and credit limit', () => {
      const participant = manager.registerParticipant({
        name: 'Prime Broker Ltd',
        type: 'prime_broker',
        tier: 'low',
        creditLimit: 1_000_000_000,
      });

      expect(participant.tier).toBe('low');
      expect(participant.creditLimit).toBe(1_000_000_000);
    });

    it('should list participants with filters', () => {
      manager.registerParticipant({ name: 'Fund A', type: 'ai_fund' });
      manager.registerParticipant({ name: 'Fund B', type: 'ai_fund' });
      manager.registerParticipant({ name: 'Broker X', type: 'prime_broker' });

      const funds = manager.listParticipants({ type: 'ai_fund' });
      expect(funds.length).toBe(2);

      const brokers = manager.listParticipants({ type: 'prime_broker' });
      expect(brokers.length).toBe(1);
    });

    it('should update participant status', () => {
      const participant = manager.registerParticipant({ name: 'Agent Fund', type: 'ai_fund' });
      const updated = manager.updateParticipantStatus(participant.id, false);

      expect(updated.isActive).toBe(false);
    });

    it('should update participant risk score', () => {
      const participant = manager.registerParticipant({ name: 'High-Risk Fund', type: 'ai_fund' });
      const updated = manager.updateParticipantRisk(participant.id, 80, 'high');

      expect(updated.riskScore).toBe(80);
      expect(updated.tier).toBe('high');
    });

    it('should reject registering trade for inactive participant', () => {
      const buyer = manager.registerParticipant({ name: 'Active Fund', type: 'ai_fund' });
      const seller = manager.registerParticipant({ name: 'Inactive Fund', type: 'ai_fund' });
      manager.updateParticipantStatus(seller.id, false);

      expect(() =>
        manager.registerTrade({
          buyerParticipantId: buyer.id,
          sellerParticipantId: seller.id,
          assetId: 'TON',
          assetName: 'TON',
          assetClass: 'crypto',
          quantity: 100,
          price: 5.0,
        })
      ).toThrow();
    });
  });

  describe('trade registration', () => {
    let buyerId: string;
    let sellerId: string;

    beforeEach(() => {
      const buyer = manager.registerParticipant({ name: 'Fund A', type: 'ai_fund' });
      const seller = manager.registerParticipant({ name: 'Fund B', type: 'ai_fund' });
      buyerId = buyer.id;
      sellerId = seller.id;
    });

    it('should register a trade', () => {
      const trade = manager.registerTrade({
        buyerParticipantId: buyerId,
        sellerParticipantId: sellerId,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });

      expect(trade.id).toBeDefined();
      expect(trade.buyerParticipantId).toBe(buyerId);
      expect(trade.sellerParticipantId).toBe(sellerId);
      expect(trade.notionalValue).toBe(5000);
      expect(trade.status).toBe('registered');
    });

    it('should calculate notional value correctly', () => {
      const trade = manager.registerTrade({
        buyerParticipantId: buyerId,
        sellerParticipantId: sellerId,
        assetId: 'BTC',
        assetName: 'Bitcoin',
        assetClass: 'crypto',
        quantity: 2,
        price: 50000,
      });

      expect(trade.notionalValue).toBe(100000);
    });

    it('should list trades with filters', () => {
      manager.registerTrade({
        buyerParticipantId: buyerId,
        sellerParticipantId: sellerId,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 100,
        price: 5.0,
      });
      manager.registerTrade({
        buyerParticipantId: buyerId,
        sellerParticipantId: sellerId,
        assetId: 'USDT',
        assetName: 'USDT',
        assetClass: 'stablecoin',
        quantity: 10000,
        price: 1.0,
      });

      const tonTrades = manager.listTrades({ assetId: 'TON' });
      expect(tonTrades.length).toBe(1);

      const buyerTrades = manager.listTrades({ buyerParticipantId: buyerId });
      expect(buyerTrades.length).toBe(2);
    });

    it('should cancel a trade', () => {
      const trade = manager.registerTrade({
        buyerParticipantId: buyerId,
        sellerParticipantId: sellerId,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 100,
        price: 5.0,
      });

      const cancelled = manager.cancelTrade(trade.id, 'Market conditions changed');
      expect(cancelled.status).toBe('cancelled');
    });

    it('should update trade status and link obligation', () => {
      const trade = manager.registerTrade({
        buyerParticipantId: buyerId,
        sellerParticipantId: sellerId,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 100,
        price: 5.0,
      });

      const updated = manager.updateTradeStatus(trade.id, 'obligation_set', 'oblig_001');
      expect(updated.status).toBe('obligation_set');
      expect(updated.obligationId).toBe('oblig_001');
    });
  });

  describe('system status', () => {
    it('should return system status', () => {
      const buyer = manager.registerParticipant({ name: 'Fund A', type: 'ai_fund' });
      const seller = manager.registerParticipant({ name: 'Fund B', type: 'ai_fund' });

      manager.registerTrade({
        buyerParticipantId: buyer.id,
        sellerParticipantId: seller.id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });

      const status = manager.getSystemStatus();
      expect(status.totalParticipants).toBe(2);
      expect(status.registeredTrades).toBe(1);
      expect(status.totalNotionalValue).toBe(5000);
    });
  });
});

// ============================================================================
// Netting Engine Tests
// ============================================================================

describe('NettingEngine', () => {
  let clearing: ReturnType<typeof createCentralClearingManager>;
  let engine: ReturnType<typeof createNettingEngine>;
  let fund1Id: string;
  let fund2Id: string;
  let fund3Id: string;

  beforeEach(() => {
    clearing = createCentralClearingManager();
    engine = createNettingEngine({
      strategy: 'multilateral',
      minNettingThreshold: 100,
    });

    fund1Id = clearing.registerParticipant({ name: 'Fund 1', type: 'ai_fund' }).id;
    fund2Id = clearing.registerParticipant({ name: 'Fund 2', type: 'ai_fund' }).id;
    fund3Id = clearing.registerParticipant({ name: 'Fund 3', type: 'ai_fund' }).id;
  });

  describe('bilateral netting', () => {
    it('should run bilateral netting on opposing trades', () => {
      const trade1 = clearing.registerTrade({
        buyerParticipantId: fund1Id,
        sellerParticipantId: fund2Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });
      const trade2 = clearing.registerTrade({
        buyerParticipantId: fund2Id,
        sellerParticipantId: fund1Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 600,
        price: 5.0,
      });

      const run = engine.runBilateralNetting([trade1, trade2]);
      expect(run.strategy).toBe('bilateral');
      expect(run.tradesNetted).toBe(2);
      expect(run.grossExposureBefore).toBe(8000); // 5000 + 3000
      expect(run.netExposureAfter).toBeLessThan(run.grossExposureBefore);
    });
  });

  describe('multilateral netting', () => {
    it('should run multilateral netting on multiple participants', () => {
      const trade1 = clearing.registerTrade({
        buyerParticipantId: fund1Id,
        sellerParticipantId: fund2Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });
      const trade2 = clearing.registerTrade({
        buyerParticipantId: fund2Id,
        sellerParticipantId: fund3Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 500,
        price: 5.0,
      });
      const trade3 = clearing.registerTrade({
        buyerParticipantId: fund3Id,
        sellerParticipantId: fund1Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 800,
        price: 5.0,
      });

      const run = engine.runMultilateralNetting([trade1, trade2, trade3]);
      expect(run.strategy).toBe('multilateral');
      expect(run.tradesNetted).toBe(3);
      expect(run.grossExposureBefore).toBeGreaterThan(0);
      expect(run.capitalFreed).toBeGreaterThanOrEqual(0);
    });

    it('should create obligations after netting', () => {
      const trade = clearing.registerTrade({
        buyerParticipantId: fund1Id,
        sellerParticipantId: fund2Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });

      engine.runMultilateralNetting([trade]);

      const obligations = engine.listObligations();
      expect(obligations.length).toBeGreaterThan(0);
    });
  });

  describe('cross-asset netting', () => {
    it('should net positions across different assets', () => {
      const trade1 = clearing.registerTrade({
        buyerParticipantId: fund1Id,
        sellerParticipantId: fund2Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });
      const trade2 = clearing.registerTrade({
        buyerParticipantId: fund2Id,
        sellerParticipantId: fund1Id,
        assetId: 'USDT',
        assetName: 'Tether',
        assetClass: 'stablecoin',
        quantity: 5000,
        price: 1.0,
      });

      const run = engine.runCrossAssetNetting([trade1, trade2]);
      expect(run.strategy).toBe('cross_asset');
      expect(run.tradesNetted).toBe(2);
    });
  });

  describe('exposure matrix', () => {
    it('should build exposure matrix', () => {
      const trade1 = clearing.registerTrade({
        buyerParticipantId: fund1Id,
        sellerParticipantId: fund2Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });

      const matrices = engine.buildExposureMatrix([trade1]);
      expect(matrices.length).toBeGreaterThan(0);
      expect(matrices[0].assetId).toBe('TON');
      expect(matrices[0].grossLongExposure).toBe(5000);
      expect(matrices[0].grossShortExposure).toBe(5000);
    });

    it('should compute concentration risk', () => {
      const trade = clearing.registerTrade({
        buyerParticipantId: fund1Id,
        sellerParticipantId: fund2Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });

      const reports = engine.getConcentrationRisk([trade]);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].herfindahlIndex).toBeGreaterThanOrEqual(0);
      expect(reports[0].herfindahlIndex).toBeLessThanOrEqual(1);
    });
  });

  describe('obligation management', () => {
    it('should update obligation status', () => {
      const trade = clearing.registerTrade({
        buyerParticipantId: fund1Id,
        sellerParticipantId: fund2Id,
        assetId: 'TON',
        assetName: 'TON',
        assetClass: 'crypto',
        quantity: 1000,
        price: 5.0,
      });

      engine.runMultilateralNetting([trade]);
      const obligations = engine.listObligations();
      expect(obligations.length).toBeGreaterThan(0);

      const updated = engine.updateObligationStatus(obligations[0].id, 'settled');
      expect(updated.status).toBe('settled');
    });
  });
});

// ============================================================================
// Collateral Management Tests
// ============================================================================

describe('CollateralManager', () => {
  let manager: ReturnType<typeof createCollateralManager>;
  let participantId: string;

  beforeEach(() => {
    manager = createCollateralManager({
      initialMarginPercent: 0.1,
      maintenanceMarginPercent: 0.07,
    });
    participantId = 'participant_001';
  });

  describe('collateral posting', () => {
    it('should post collateral', () => {
      const position = manager.postCollateral({
        participantId,
        assetId: 'USDT',
        assetName: 'Tether USD',
        collateralType: 'stablecoin',
        quantity: 10000,
        marketValue: 10000,
        heldFor: 'initial_margin',
      });

      expect(position.id).toBeDefined();
      expect(position.participantId).toBe(participantId);
      expect(position.marketValue).toBe(10000);
      expect(position.status).toBe('posted');
      expect(position.adjustedValue).toBeGreaterThan(0);
      expect(position.adjustedValue).toBeLessThan(position.marketValue);
    });

    it('should apply haircut for TON collateral', () => {
      const position = manager.postCollateral({
        participantId,
        assetId: 'TON',
        assetName: 'TON',
        collateralType: 'TON',
        quantity: 1000,
        marketValue: 5000,
        heldFor: 'initial_margin',
      });

      expect(position.haircut).toBeGreaterThan(0);
      expect(position.adjustedValue).toBe(5000 * (1 - position.haircut));
    });

    it('should list collateral positions with filters', () => {
      manager.postCollateral({
        participantId,
        assetId: 'USDT',
        assetName: 'USDT',
        collateralType: 'stablecoin',
        quantity: 10000,
        marketValue: 10000,
        heldFor: 'initial_margin',
      });
      manager.postCollateral({
        participantId: 'participant_002',
        assetId: 'TON',
        assetName: 'TON',
        collateralType: 'TON',
        quantity: 1000,
        marketValue: 5000,
        heldFor: 'variation_margin',
      });

      const p1Positions = manager.listCollateralPositions({ participantId });
      expect(p1Positions.length).toBe(1);

      const initialMarginPositions = manager.listCollateralPositions({ heldFor: 'initial_margin' });
      expect(initialMarginPositions.length).toBe(1);
    });
  });

  describe('collateral release', () => {
    it('should release collateral', () => {
      const position = manager.postCollateral({
        participantId,
        assetId: 'USDT',
        assetName: 'USDT',
        collateralType: 'stablecoin',
        quantity: 10000,
        marketValue: 10000,
        heldFor: 'initial_margin',
      });

      const released = manager.releaseCollateral(position.id);
      expect(released.status).toBe('released');
    });

    it('should seize collateral', () => {
      const position = manager.postCollateral({
        participantId,
        assetId: 'USDT',
        assetName: 'USDT',
        collateralType: 'stablecoin',
        quantity: 10000,
        marketValue: 10000,
        heldFor: 'initial_margin',
      });

      const seized = manager.seizeCollateral(position.id, 'Margin call failure');
      expect(seized.status).toBe('seized');
    });
  });

  describe('margin requirements', () => {
    it('should compute margin requirements', () => {
      const req = manager.computeMarginRequirement(participantId, 100000);

      expect(req.participantId).toBe(participantId);
      expect(req.initialMarginRequired).toBeCloseTo(10000); // 10% of 100,000
      expect(req.maintenanceMarginRequired).toBeCloseTo(7000); // 7% of 100,000
    });

    it('should issue margin call when coverage is insufficient', () => {
      manager.computeMarginRequirement(participantId, 100000);

      const result = manager.issueMarginCall(participantId);
      expect(result.participantId).toBe(participantId);
      expect(result.marginCallAmount).toBeGreaterThan(0);
    });

    it('should resolve margin call after posting sufficient collateral', () => {
      manager.computeMarginRequirement(participantId, 100000);

      manager.postCollateral({
        participantId,
        assetId: 'USDT',
        assetName: 'USDT',
        collateralType: 'stablecoin',
        quantity: 15000,
        marketValue: 15000,
        heldFor: 'initial_margin',
      });

      manager.resolveMarginCall(participantId);

      const account = manager.getMarginAccount(participantId);
      expect(account?.hasMarginCall).toBe(false);
    });
  });

  describe('dynamic margin', () => {
    it('should compute dynamic margin based on volatility', () => {
      const model = manager.computeDynamicMargin('TON', 100000, 0.05, 0.3);

      expect(model.baseMarginPercent).toBe(0.1);
      expect(model.computedMarginPercent).toBeGreaterThan(model.baseMarginPercent);
    });

    it('should apply concentration penalty for large positions', () => {
      const lowConcentration = manager.computeDynamicMargin('TON', 100000, 0.02, 0.1);
      const highConcentration = manager.computeDynamicMargin('TON', 100000, 0.02, 0.5);

      expect(highConcentration.computedMarginPercent).toBeGreaterThan(
        lowConcentration.computedMarginPercent
      );
    });
  });

  describe('collateral health', () => {
    it('should return collateral health report', () => {
      manager.postCollateral({
        participantId,
        assetId: 'USDT',
        assetName: 'USDT',
        collateralType: 'stablecoin',
        quantity: 10000,
        marketValue: 10000,
        heldFor: 'initial_margin',
      });
      manager.computeMarginRequirement(participantId, 100000);

      const health = manager.getCollateralHealth(participantId);
      expect(health.participantId).toBe(participantId);
      expect(health.totalPosted).toBeGreaterThan(0);
      expect(health.totalRequired).toBeGreaterThan(0);
    });

    it('should return system-wide collateral status', () => {
      manager.postCollateral({
        participantId,
        assetId: 'USDT',
        assetName: 'USDT',
        collateralType: 'stablecoin',
        quantity: 10000,
        marketValue: 10000,
        heldFor: 'initial_margin',
      });

      const status = manager.getSystemStatus();
      expect(status.totalCollateralPosted).toBeGreaterThan(0);
      expect(status.generatedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Default Resolution Tests
// ============================================================================

describe('DefaultResolutionManager', () => {
  let manager: ReturnType<typeof createDefaultResolutionManager>;

  beforeEach(() => {
    manager = createDefaultResolutionManager({
      autoLiquidationEnabled: true,
      insurancePoolEnabled: true,
      defaultFundEnabled: true,
      socializedLossEnabled: true,
    });
  });

  describe('default fund', () => {
    it('should return default fund state', () => {
      const fund = manager.getDefaultFund();
      expect(fund.id).toBeDefined();
      expect(fund.totalCapital).toBeGreaterThan(0);
      expect(fund.availableCapital).toBeGreaterThan(0);
    });

    it('should accept participant contributions', () => {
      const contribution = manager.contributeToDefaultFund('participant_001', 1000000);

      expect(contribution.participantId).toBe('participant_001');
      expect(contribution.amount).toBe(1000000);

      const fund = manager.getDefaultFund();
      expect(fund.availableCapital).toBeGreaterThan(10000000);
    });

    it('should replenish default fund', () => {
      const capitalBefore = manager.getDefaultFund().totalCapital;
      manager.replenishDefaultFund(2000000);
      const fundAfter = manager.getDefaultFund();

      expect(fundAfter.totalCapital).toBe(capitalBefore + 2000000);
    });
  });

  describe('insurance pool', () => {
    it('should return insurance pool state', () => {
      const pool = manager.getInsurancePool();
      expect(pool.id).toBeDefined();
      expect(pool.totalCapital).toBeGreaterThan(0);
    });

    it('should file insurance claim', () => {
      const claim = manager.fileInsuranceClaim({
        eventType: 'default',
        claimantId: 'participant_001',
        requestedAmount: 500000,
      });

      expect(claim.id).toBeDefined();
      expect(claim.claimantId).toBe('participant_001');
      expect(claim.requestedAmount).toBe(500000);
      expect(claim.status).toBe('pending');
    });

    it('should process insurance claim', () => {
      const claim = manager.fileInsuranceClaim({
        eventType: 'default',
        claimantId: 'participant_001',
        requestedAmount: 500000,
      });

      const processed = manager.processInsuranceClaim(claim.id);
      expect(processed.status).toBe('paid');
      expect(processed.paidAmount).toBeGreaterThan(0);
    });
  });

  describe('default events', () => {
    it('should declare a default event', () => {
      const event = manager.declareDefault({
        participantId: 'participant_001',
        participantName: 'Defaulted Fund',
        defaultType: 'margin_call_failure',
        totalDeficit: 2000000,
        affectedTrades: ['trade_001', 'trade_002'],
        affectedObligations: ['oblig_001'],
      });

      expect(event.id).toBeDefined();
      expect(event.participantId).toBe('participant_001');
      expect(event.status).toBe('defaulted');
      expect(event.totalDeficit).toBe(2000000);
    });

    it('should execute auto liquidation', () => {
      const event = manager.declareDefault({
        participantId: 'participant_001',
        participantName: 'Defaulted Fund',
        defaultType: 'payment_failure',
        totalDeficit: 1000000,
        affectedTrades: ['trade_001'],
        affectedObligations: ['oblig_001'],
      });

      const result = manager.executeAutoLiquidation(event.id, 800000);
      expect(result.amountRecovered).toBeGreaterThan(0);
      expect(result.amountRecovered).toBeLessThanOrEqual(1000000);
    });

    it('should draw default fund', () => {
      const event = manager.declareDefault({
        participantId: 'participant_001',
        participantName: 'Defaulted Fund',
        defaultType: 'insolvency',
        totalDeficit: 500000,
        affectedTrades: ['trade_001'],
        affectedObligations: ['oblig_001'],
      });

      const result = manager.drawDefaultFund(event.id, 500000);
      expect(result.amountDrawn).toBeGreaterThan(0);
    });

    it('should activate insurance pool', () => {
      const event = manager.declareDefault({
        participantId: 'participant_001',
        participantName: 'Defaulted Fund',
        defaultType: 'delivery_failure',
        totalDeficit: 300000,
        affectedTrades: ['trade_001'],
        affectedObligations: ['oblig_001'],
      });

      const result = manager.activateInsurance(event.id);
      expect(result.defaultEventId).toBe(event.id);
    });

    it('should socialize loss across participants', () => {
      const event = manager.declareDefault({
        participantId: 'participant_001',
        participantName: 'Defaulted Fund',
        defaultType: 'insolvency',
        totalDeficit: 100000,
        affectedTrades: [],
        affectedObligations: [],
      });

      const result = manager.socializeLoss(event.id, [
        'participant_002',
        'participant_003',
        'participant_004',
      ]);

      expect(result.participantsAffected).toBe(3);
      expect(result.lossPerParticipant).toBeGreaterThan(0);
    });

    it('should resolve a default event', () => {
      const event = manager.declareDefault({
        participantId: 'participant_001',
        participantName: 'Defaulted Fund',
        defaultType: 'margin_call_failure',
        totalDeficit: 50000,
        affectedTrades: [],
        affectedObligations: [],
      });

      manager.executeAutoLiquidation(event.id, 100000);
      const resolved = manager.resolveDefault(event.id);
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Settlement Layer Tests
// ============================================================================

describe('SettlementLayer', () => {
  let layer: ReturnType<typeof createSettlementLayer>;
  let payer: string;
  let receiver: string;

  beforeEach(() => {
    layer = createSettlementLayer({
      defaultMechanism: 'dvp',
      atomicSettlementEnabled: true,
      crossChainEnabled: true,
      rwaSettlementEnabled: true,
    });
    payer = 'participant_payer';
    receiver = 'participant_receiver';
  });

  describe('settlement instructions', () => {
    it('should create a settlement instruction', () => {
      const settlement = layer.createSettlement({
        obligationId: 'oblig_001',
        payerParticipantId: payer,
        receiverParticipantId: receiver,
        assetId: 'TON',
        amount: 5000,
      });

      expect(settlement.id).toBeDefined();
      expect(settlement.payerParticipantId).toBe(payer);
      expect(settlement.receiverParticipantId).toBe(receiver);
      expect(settlement.amount).toBe(5000);
      expect(settlement.status).toBe('scheduled');
    });

    it('should execute a settlement', () => {
      const settlement = layer.createSettlement({
        obligationId: 'oblig_001',
        payerParticipantId: payer,
        receiverParticipantId: receiver,
        assetId: 'TON',
        amount: 5000,
      });

      const executed = layer.executeSettlement(settlement.id);
      expect(['completed', 'failed', 'retry']).toContain(executed.status);
      expect(executed.attempts.length).toBeGreaterThan(0);
    });

    it('should cancel a settlement', () => {
      const settlement = layer.createSettlement({
        obligationId: 'oblig_001',
        payerParticipantId: payer,
        receiverParticipantId: receiver,
        assetId: 'TON',
        amount: 5000,
      });

      const cancelled = layer.cancelSettlement(settlement.id, 'Obligation cancelled');
      expect(cancelled.status).toBe('cancelled');
    });

    it('should confirm a settlement with tx hash', () => {
      const settlement = layer.createSettlement({
        obligationId: 'oblig_001',
        payerParticipantId: payer,
        receiverParticipantId: receiver,
        assetId: 'USDT',
        amount: 10000,
      });

      const txHash = '0x' + 'a'.repeat(64);
      const confirmed = layer.confirmSettlement(settlement.id, txHash);
      expect(confirmed.status).toBe('completed');
      expect(confirmed.txHash).toBe(txHash);
    });

    it('should list settlements with filters', () => {
      layer.createSettlement({
        obligationId: 'oblig_001',
        payerParticipantId: payer,
        receiverParticipantId: receiver,
        assetId: 'TON',
        amount: 5000,
      });
      layer.createSettlement({
        obligationId: 'oblig_002',
        payerParticipantId: 'another_payer',
        receiverParticipantId: receiver,
        assetId: 'USDT',
        amount: 10000,
      });

      const payerSettlements = layer.listSettlements({ payerParticipantId: payer });
      expect(payerSettlements.length).toBe(1);
    });
  });

  describe('atomic settlement', () => {
    it('should create and execute atomic settlement', () => {
      const atomic = layer.createAtomicSettlement({
        legs: [
          {
            createParams: {
              obligationId: 'oblig_001',
              payerParticipantId: payer,
              receiverParticipantId: receiver,
              assetId: 'TON',
              amount: 5000,
            },
          },
          {
            createParams: {
              obligationId: 'oblig_002',
              payerParticipantId: receiver,
              receiverParticipantId: payer,
              assetId: 'USDT',
              amount: 5000,
            },
          },
        ],
        allOrNothing: true,
      });

      expect(atomic.id).toBeDefined();
      expect(atomic.legs.length).toBe(2);

      const executed = layer.executeAtomicSettlement(atomic.id);
      expect(['completed', 'failed']).toContain(executed.status);
    });
  });

  describe('cross-chain settlement', () => {
    it('should create cross-chain settlement', () => {
      const crossChain = layer.createCrossChainSettlement({
        sourceChain: 'ton',
        targetChain: 'ethereum',
        bridgeProtocol: 'LayerZero',
        amount: 10000,
        assetId: 'USDT',
        payerParticipantId: payer,
        receiverParticipantId: receiver,
        obligationId: 'oblig_001',
      });

      expect(crossChain.id).toBeDefined();
      expect(crossChain.sourceChain).toBe('ton');
      expect(crossChain.targetChain).toBe('ethereum');
      expect(crossChain.estimatedBridgeTime).toBeGreaterThan(0);
    });

    it('should execute cross-chain settlement', () => {
      const crossChain = layer.createCrossChainSettlement({
        sourceChain: 'ton',
        targetChain: 'polygon',
        bridgeProtocol: 'Wormhole',
        amount: 5000,
        assetId: 'USDT',
        payerParticipantId: payer,
        receiverParticipantId: receiver,
        obligationId: 'oblig_002',
      });

      const executed = layer.executeCrossChainSettlement(crossChain.id);
      expect(['completed', 'failed', 'in_progress']).toContain(executed.status);
    });
  });

  describe('RWA settlement', () => {
    it('should create RWA settlement', () => {
      const rwa = layer.createRWASettlement({
        rwaAssetId: 'US_TREASURY_2Y_001',
        rwaAssetType: 'bond',
        onChainTokenId: 'rwa_token_001',
        offChainCustodian: 'Fidelity Digital Assets',
        legalSettlementDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });

      expect(rwa.id).toBeDefined();
      expect(rwa.rwaAssetType).toBe('bond');
      expect(rwa.status).toBe('scheduled');
    });

    it('should execute RWA settlement', () => {
      const rwa = layer.createRWASettlement({
        rwaAssetId: 'REAL_ESTATE_001',
        rwaAssetType: 'real_estate',
        onChainTokenId: 'rwa_token_002',
        offChainCustodian: 'Coinbase Custody',
        legalSettlementDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      const executed = layer.executeRWASettlement(rwa.id);
      expect(['completed', 'failed', 'in_progress']).toContain(executed.status);
    });
  });

  describe('metrics', () => {
    it('should return settlement metrics', () => {
      layer.createSettlement({
        obligationId: 'oblig_001',
        payerParticipantId: payer,
        receiverParticipantId: receiver,
        assetId: 'TON',
        amount: 5000,
      });

      const metrics = layer.getSettlementMetrics();
      expect(metrics.totalInstructions).toBeGreaterThan(0);
      expect(metrics.generatedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Clearing Audit Module Tests
// ============================================================================

describe('ClearingAuditModule', () => {
  let module: ReturnType<typeof createClearingAuditModule>;

  beforeEach(() => {
    module = createClearingAuditModule({
      immutableLogging: true,
      signatureEnabled: false,
    });
  });

  describe('audit logging', () => {
    it('should create audit entry', () => {
      const entry = module.createAuditEntry({
        category: 'trade',
        eventType: 'trade_registered',
        actor: 'system',
        actorType: 'system',
        action: 'register_trade',
        resourceType: 'trade',
        resourceId: 'trade_001',
        details: { notionalValue: 5000 },
        outcome: 'success',
      });

      expect(entry.id).toBeDefined();
      expect(entry.category).toBe('trade');
      expect(entry.outcome).toBe('success');
    });

    it('should list audit entries with filters', () => {
      module.createAuditEntry({
        category: 'trade',
        eventType: 'trade_registered',
        actor: 'agent_001',
        actorType: 'ai_agent',
        action: 'register_trade',
        resourceType: 'trade',
        resourceId: 'trade_001',
        outcome: 'success',
      });
      module.createAuditEntry({
        category: 'settlement',
        eventType: 'settlement_completed',
        actor: 'system',
        actorType: 'system',
        action: 'execute_settlement',
        resourceType: 'settlement',
        resourceId: 'settle_001',
        outcome: 'success',
      });

      const tradeEntries = module.listAuditEntries({ category: 'trade' });
      expect(tradeEntries.length).toBe(1);

      const settlementEntries = module.listAuditEntries({ category: 'settlement' });
      expect(settlementEntries.length).toBe(1);
    });

    it('should verify audit integrity', () => {
      const entry = module.createAuditEntry({
        category: 'governance',
        eventType: 'audit_entry_created',
        actor: 'operator',
        actorType: 'operator',
        action: 'configure_system',
        resourceType: 'config',
        resourceId: 'system_config',
        outcome: 'success',
      });

      const isValid = module.verifyAuditIntegrity(entry.id);
      expect(isValid).toBe(true);
    });
  });

  describe('exposure dashboard', () => {
    it('should generate exposure dashboard', () => {
      const dashboard = module.generateExposureDashboard({
        totalParticipants: 10,
        activeParticipants: 8,
        totalTradesRegistered: 100,
        openTradesCount: 25,
        totalNotionalValue: 50_000_000,
        netExposure: 5_000_000,
        grossExposure: 50_000_000,
        pendingSettlements: 10,
        settlementValue: 1_000_000,
        collateralPosted: 8_000_000,
        marginUtilization: 0.6,
        defaultFundSize: 10_000_000,
        insurancePoolSize: 5_000_000,
        participantRiskSummaries: [
          {
            participantId: 'p1',
            participantName: 'Fund Alpha',
            type: 'ai_fund',
            openPositions: 10,
            notionalExposure: 5_000_000,
            marginCoverage: 1.2,
            riskScore: 35,
            defaultStatus: 'none',
          },
        ],
      });

      expect(dashboard.totalParticipants).toBe(10);
      expect(dashboard.compressionRatio).toBe(0.1); // 5M / 50M
      expect(dashboard.participantRiskSummary.length).toBe(1);
    });
  });

  describe('systemic risk', () => {
    it('should compute systemic risk snapshot', () => {
      const snapshot = module.computeSystemicRisk({
        totalNotionalValue: 50_000_000,
        pendingSettlementValue: 5_000_000,
        collateralPosted: 8_000_000,
        totalMarginRequired: 5_000_000,
        participantRiskSummaries: [
          {
            participantId: 'p1',
            participantName: 'Fund Alpha',
            type: 'ai_fund',
            openPositions: 10,
            notionalExposure: 25_000_000,
            marginCoverage: 1.2,
            riskScore: 35,
            defaultStatus: 'none',
          },
        ],
        defaultEventsCount: 0,
      });

      expect(snapshot.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.overallRiskScore).toBeLessThanOrEqual(100);
      expect(['normal', 'stressed', 'crisis']).toContain(snapshot.marketRegime);
    });

    it('should list risk snapshots', () => {
      module.computeSystemicRisk({
        totalNotionalValue: 10_000_000,
        pendingSettlementValue: 1_000_000,
        collateralPosted: 2_000_000,
        totalMarginRequired: 1_000_000,
        participantRiskSummaries: [],
        defaultEventsCount: 0,
      });

      const snapshots = module.listSystemicRiskSnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
    });
  });

  describe('reports', () => {
    it('should generate daily summary report', () => {
      const period = {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000),
        to: new Date(),
      };

      const report = module.generateReport('daily_summary', period);
      expect(report.id).toBeDefined();
      expect(report.reportType).toBe('daily_summary');
      expect(report.period.from).toEqual(period.from);
      expect(report.generatedAt).toBeDefined();
    });

    it('should generate regulatory report', () => {
      const period = {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      };

      const report = module.generateReport('regulatory_report', period);
      expect(report.reportType).toBe('regulatory_report');
    });

    it('should list reports', () => {
      const period = { from: new Date(Date.now() - 86400000), to: new Date() };
      module.generateReport('daily_summary', period);
      module.generateReport('settlement_report', period);

      const allReports = module.listReports();
      expect(allReports.length).toBe(2);

      const summaryReports = module.listReports('daily_summary');
      expect(summaryReports.length).toBe(1);
    });
  });
});

// ============================================================================
// Unified Clearing House Manager Tests
// ============================================================================

describe('ClearingHouseManager (Unified)', () => {
  let ch: ReturnType<typeof createClearingHouseManager>;

  beforeEach(() => {
    ch = createClearingHouseManager();
  });

  it('should initialize all sub-managers', () => {
    expect(ch.clearing).toBeDefined();
    expect(ch.netting).toBeDefined();
    expect(ch.collateral).toBeDefined();
    expect(ch.defaultResolution).toBeDefined();
    expect(ch.settlement).toBeDefined();
    expect(ch.audit).toBeDefined();
  });

  it('should return system status', () => {
    const status = ch.getSystemStatus();
    expect(status.generatedAt).toBeDefined();
    expect(status.participants).toBeGreaterThanOrEqual(0);
  });

  it('should forward events from all sub-managers', () => {
    const events: string[] = [];
    ch.onEvent(event => {
      events.push(event.source);
    });

    // Trigger events from different sub-managers
    ch.clearing.registerParticipant({ name: 'Test Fund', type: 'ai_fund' });
    const participant = ch.clearing.registerParticipant({ name: 'Test Fund 2', type: 'ai_fund' });
    ch.collateral.postCollateral({
      participantId: participant.id,
      assetId: 'USDT',
      assetName: 'USDT',
      collateralType: 'stablecoin',
      quantity: 1000,
      marketValue: 1000,
      heldFor: 'initial_margin',
    });

    expect(events.length).toBeGreaterThan(0);
  });

  it('should run end-to-end clearing flow', () => {
    // 1. Register participants
    const fund1 = ch.clearing.registerParticipant({ name: 'Alpha AI Fund', type: 'ai_fund' });
    const fund2 = ch.clearing.registerParticipant({ name: 'Beta AI Fund', type: 'ai_fund' });

    // 2. Post collateral
    ch.collateral.postCollateral({
      participantId: fund1.id,
      assetId: 'USDT',
      assetName: 'USDT',
      collateralType: 'stablecoin',
      quantity: 50000,
      marketValue: 50000,
      heldFor: 'initial_margin',
    });

    // 3. Register trades
    const trade1 = ch.clearing.registerTrade({
      buyerParticipantId: fund1.id,
      sellerParticipantId: fund2.id,
      assetId: 'TON',
      assetName: 'TON',
      assetClass: 'crypto',
      quantity: 10000,
      price: 5.0,
    });
    const trade2 = ch.clearing.registerTrade({
      buyerParticipantId: fund2.id,
      sellerParticipantId: fund1.id,
      assetId: 'TON',
      assetName: 'TON',
      assetClass: 'crypto',
      quantity: 6000,
      price: 5.0,
    });

    expect(trade1.status).toBe('registered');
    expect(trade2.status).toBe('registered');

    // 4. Run netting
    const allTrades = ch.clearing.listTrades();
    const nettingRun = ch.netting.runMultilateralNetting(allTrades);

    expect(nettingRun.tradesNetted).toBe(2);
    expect(nettingRun.capitalFreed).toBeGreaterThanOrEqual(0);

    // 5. Settle obligations
    const obligations = ch.netting.listObligations();
    expect(obligations.length).toBeGreaterThan(0);

    const settlement = ch.settlement.createSettlement({
      obligationId: obligations[0].id,
      payerParticipantId: fund1.id,
      receiverParticipantId: fund2.id,
      assetId: 'TON',
      amount: obligations[0].netPayable,
    });

    const executed = ch.settlement.executeSettlement(settlement.id);
    expect(['completed', 'failed', 'retry']).toContain(executed.status);

    // 6. Check system status
    const status = ch.getSystemStatus();
    expect(status.registeredTrades).toBe(2);
    expect(status.totalNotionalValue).toBe(80000);
    expect(status.pendingObligations).toBeGreaterThanOrEqual(0);
  });

  it('should run stress simulation: default scenario', () => {
    // Setup participants
    const fundA = ch.clearing.registerParticipant({ name: 'Fund A', type: 'ai_fund' });
    const fundB = ch.clearing.registerParticipant({ name: 'Fund B', type: 'ai_fund' });

    // Register trades
    const trade = ch.clearing.registerTrade({
      buyerParticipantId: fundA.id,
      sellerParticipantId: fundB.id,
      assetId: 'TON',
      assetName: 'TON',
      assetClass: 'crypto',
      quantity: 100000,
      price: 5.0,
    });

    expect(trade.notionalValue).toBe(500000);

    // Compute margin requirement
    const marginReq = ch.collateral.computeMarginRequirement(fundA.id, trade.notionalValue);
    expect(marginReq.initialMarginRequired).toBe(50000);

    // Fund A defaults
    const defaultEvent = ch.defaultResolution.declareDefault({
      participantId: fundA.id,
      participantName: 'Fund A',
      defaultType: 'margin_call_failure',
      totalDeficit: 50000,
      affectedTrades: [trade.id],
      affectedObligations: [],
    });

    // Resolution sequence
    const liquidationResult = ch.defaultResolution.executeAutoLiquidation(
      defaultEvent.id,
      45000 // Collateral value
    );
    expect(liquidationResult.amountRecovered).toBeGreaterThan(0);

    const insuranceResult = ch.defaultResolution.activateInsurance(defaultEvent.id);
    expect(insuranceResult.defaultEventId).toBe(defaultEvent.id);

    // Final system status
    const finalStatus = ch.getSystemStatus();
    expect(finalStatus.defaultEventsTotal).toBe(1);
  });
});
