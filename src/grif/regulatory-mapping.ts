/**
 * TONAIAgent - GRIF Regulatory Mapping Matrix
 *
 * Provides a matrix of regulatory requirements per jurisdiction covering:
 * - Securities classification
 * - Custody requirements
 * - Capital reserve standards
 * - Reporting obligations
 * - KYC/AML obligations
 *
 * Regions: EU, US, MENA, Asia-Pacific
 *
 * This is Component 2 of the Global Regulatory Integration Framework (GRIF).
 */

import {
  GRIFJurisdictionCode,
  GRIFRegionCode,
  RegulatoryMapping,
  SecuritiesClassification,
  CustodyRequirement,
  CapitalReserveStandard,
  ReportingObligation,
  KycAmlObligation,
} from './types';

// ============================================================================
// Static Regulatory Mapping Data
// ============================================================================

const REGULATORY_MAPPINGS: Record<GRIFJurisdictionCode, Omit<RegulatoryMapping, 'lastUpdated'>> = {
  // ─── Europe ───────────────────────────────────────────────────────────────
  CH: {
    jurisdiction: 'CH',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['FINMA Guidance 2019', 'DLT Act 2021'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: true,
      segregationRequired: true,
      insuranceRequired: false,
      minimumCapital: 300_000,
      approvedCustodianTypes: ['bank', 'finma_licensed_custodian'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 8,
      liquidityBufferPercent: 10,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'FINMA CAO',
    },
    reportingObligations: [
      { type: 'AML_SUSPICIOUS_ACTIVITY', frequency: 'real_time', regulator: 'FINMA', thresholdAmount: 15_000 },
      { type: 'ANNUAL_FINANCIAL_REPORT', frequency: 'annually', regulator: 'FINMA', format: 'XBRL' },
      { type: 'QUARTERLY_RISK_REPORT', frequency: 'quarterly', regulator: 'FINMA' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 10,
    },
  },
  DE: {
    jurisdiction: 'DE',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['MiCA', 'BaFin Crypto Guidelines 2022', 'EU MiFID II'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: true,
      minimumCapital: 750_000,
      approvedCustodianTypes: ['bafin_licensed_custodian', 'eu_licensed_bank'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 10,
      liquidityBufferPercent: 15,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'EU CRD IV / Basel III',
    },
    reportingObligations: [
      { type: 'AML_REPORT', frequency: 'real_time', regulator: 'BaFin', thresholdAmount: 10_000 },
      { type: 'MiCA_QUARTERLY', frequency: 'quarterly', regulator: 'BaFin', format: 'XBRL' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  FR: {
    jurisdiction: 'FR',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['MiCA', 'PACTE Law 2019', 'AMF Doctrine'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: true,
      minimumCapital: 500_000,
      approvedCustodianTypes: ['amf_licensed_custodian', 'eu_credit_institution'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 10,
      liquidityBufferPercent: 12,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'EU CRD IV',
    },
    reportingObligations: [
      { type: 'AMF_PERIODIC_REPORT', frequency: 'quarterly', regulator: 'AMF', format: 'PDF' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  NL: {
    jurisdiction: 'NL',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['MiCA', 'AFM Guidelines', 'DNB Crypto Policy'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      minimumCapital: 350_000,
      approvedCustodianTypes: ['dnb_registered_custodian'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 8,
      liquidityBufferPercent: 10,
      stressTestFrequency: 'annually',
      regulatoryFramework: 'EU CRD IV',
    },
    reportingObligations: [
      { type: 'AFM_ANNUAL', frequency: 'annually', regulator: 'AFM' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  IE: {
    jurisdiction: 'IE',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['MiCA', 'CBI Crypto Asset Service Provider Regime'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: false,
      selfCustodyAllowed: true,
      segregationRequired: true,
      insuranceRequired: false,
      approvedCustodianTypes: ['cbi_registered_entity'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 8,
      liquidityBufferPercent: 10,
      stressTestFrequency: 'annually',
      regulatoryFramework: 'EU CRD IV',
    },
    reportingObligations: [
      { type: 'CBI_ANNUAL', frequency: 'annually', regulator: 'Central Bank of Ireland' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  LU: {
    jurisdiction: 'LU',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['MiCA', 'CSSF Circular 20/747'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      minimumCapital: 730_000,
      approvedCustodianTypes: ['cssf_licensed_custodian'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 8,
      liquidityBufferPercent: 10,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'EU CRD IV',
    },
    reportingObligations: [
      { type: 'CSSF_QUARTERLY', frequency: 'quarterly', regulator: 'CSSF' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  MT: {
    jurisdiction: 'MT',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'utility',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['MiCA', 'MFSA VFA Act 2018'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: false,
      selfCustodyAllowed: true,
      segregationRequired: true,
      insuranceRequired: false,
      approvedCustodianTypes: ['mfsa_registered'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 6,
      liquidityBufferPercent: 8,
      stressTestFrequency: 'annually',
      regulatoryFramework: 'MFSA Capital Requirements',
    },
    reportingObligations: [
      { type: 'MFSA_ANNUAL', frequency: 'annually', regulator: 'MFSA' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'basic',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: false,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  EE: {
    jurisdiction: 'EE',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'utility',
      tokenizedRWA: 'pending',
      applicableRegulations: ['MiCA', 'Estonian AML Act'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: false,
      selfCustodyAllowed: true,
      segregationRequired: false,
      insuranceRequired: false,
      approvedCustodianTypes: ['fiu_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 5,
      liquidityBufferPercent: 5,
      stressTestFrequency: 'annually',
      regulatoryFramework: 'EU CRD IV',
    },
    reportingObligations: [
      { type: 'FIU_ANNUAL', frequency: 'annually', regulator: 'FIU Estonia' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'basic',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: false,
      uboDisclosureRequired: false,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  LI: {
    jurisdiction: 'LI',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['TVTG (Blockchain Act)', 'FMA Guidelines'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: true,
      segregationRequired: true,
      insuranceRequired: false,
      minimumCapital: 100_000,
      approvedCustodianTypes: ['fma_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 8,
      liquidityBufferPercent: 10,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'FMA Capital Rules',
    },
    reportingObligations: [
      { type: 'FMA_ANNUAL', frequency: 'annually', regulator: 'FMA Liechtenstein' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 10,
    },
  },
  GB: {
    jurisdiction: 'GB',
    region: 'EU',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['FCA Crypto Asset Registration', 'UK Financial Services Act 2021'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: true,
      minimumCapital: 730_000,
      approvedCustodianTypes: ['fca_authorized'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 10,
      liquidityBufferPercent: 15,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'PRA Capital Framework',
    },
    reportingObligations: [
      { type: 'FCA_ANNUAL', frequency: 'annually', regulator: 'FCA', format: 'XBRL' },
      { type: 'AML_STR', frequency: 'real_time', regulator: 'NCA', thresholdAmount: 10_000 },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  // ─── Americas ─────────────────────────────────────────────────────────────
  US: {
    jurisdiction: 'US',
    region: 'US',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['Howey Test', 'SEC Digital Asset Guidance', 'BSA', 'FinCEN Rules'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: true,
      minimumCapital: 10_000_000,
      approvedCustodianTypes: ['qualified_custodian', 'federally_chartered_bank'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 12,
      liquidityBufferPercent: 20,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'Basel III / US Dodd-Frank',
    },
    reportingObligations: [
      { type: 'SAR', frequency: 'real_time', regulator: 'FinCEN', thresholdAmount: 10_000 },
      { type: 'CTR', frequency: 'daily', regulator: 'FinCEN', thresholdAmount: 10_000 },
      { type: 'SEC_ANNUAL', frequency: 'annually', regulator: 'SEC', format: 'XBRL' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'institutional',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  CA: {
    jurisdiction: 'CA',
    region: 'US',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['CSA Staff Notice 21-327', 'FINTRAC Rules'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: true,
      minimumCapital: 5_000_000,
      approvedCustodianTypes: ['osfi_regulated', 'provincial_sec_registrant'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 10,
      liquidityBufferPercent: 15,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'OSFI Capital Adequacy',
    },
    reportingObligations: [
      { type: 'FINTRAC_STR', frequency: 'real_time', regulator: 'FINTRAC', thresholdAmount: 10_000 },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  BM: {
    jurisdiction: 'BM',
    region: 'US',
    securitiesClassification: {
      digitalAssetsAs: 'utility',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['Bermuda DABA 2018', 'BMA Digital Asset Guidelines'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: false,
      selfCustodyAllowed: true,
      segregationRequired: true,
      insuranceRequired: false,
      approvedCustodianTypes: ['bma_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 6,
      liquidityBufferPercent: 8,
      stressTestFrequency: 'annually',
      regulatoryFramework: 'BMA Capital Requirements',
    },
    reportingObligations: [
      { type: 'BMA_ANNUAL', frequency: 'annually', regulator: 'BMA' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'basic',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: false,
      uboDisclosureRequired: false,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 6,
    },
  },
  KY: {
    jurisdiction: 'KY',
    region: 'US',
    securitiesClassification: {
      digitalAssetsAs: 'utility',
      tokenizedRWA: 'pending',
      applicableRegulations: ['VASP Act 2020', 'CIMA Guidelines'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: false,
      selfCustodyAllowed: true,
      segregationRequired: false,
      insuranceRequired: false,
      approvedCustodianTypes: ['cima_registered'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 5,
      liquidityBufferPercent: 5,
      stressTestFrequency: 'annually',
      regulatoryFramework: 'CIMA Capital Rules',
    },
    reportingObligations: [
      { type: 'CIMA_ANNUAL', frequency: 'annually', regulator: 'CIMA' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'basic',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: false,
      uboDisclosureRequired: false,
      transactionMonitoringRequired: false,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  // ─── Middle East ──────────────────────────────────────────────────────────
  AE: {
    jurisdiction: 'AE',
    region: 'MENA',
    securitiesClassification: {
      digitalAssetsAs: 'utility',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['VARA Virtual Assets Regulation', 'DFSA Crypto Token Rules'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      minimumCapital: 2_000_000,
      approvedCustodianTypes: ['vara_licensed', 'dfsa_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 8,
      liquidityBufferPercent: 10,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'CBUAE Capital Adequacy',
    },
    reportingObligations: [
      { type: 'VARA_QUARTERLY', frequency: 'quarterly', regulator: 'VARA' },
      { type: 'AML_STR', frequency: 'real_time', regulator: 'CBUAE', thresholdAmount: 55_000 },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 8,
    },
  },
  BH: {
    jurisdiction: 'BH',
    region: 'MENA',
    securitiesClassification: {
      digitalAssetsAs: 'utility',
      tokenizedRWA: 'pending',
      applicableRegulations: ['CBB Crypto-Asset Module'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      approvedCustodianTypes: ['cbb_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 8,
      liquidityBufferPercent: 8,
      stressTestFrequency: 'annually',
      regulatoryFramework: 'CBB Capital Adequacy',
    },
    reportingObligations: [
      { type: 'CBB_QUARTERLY', frequency: 'quarterly', regulator: 'CBB' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: false,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 7,
    },
  },
  SA: {
    jurisdiction: 'SA',
    region: 'MENA',
    securitiesClassification: {
      digitalAssetsAs: 'unclassified',
      tokenizedRWA: 'pending',
      applicableRegulations: ['SAMA Digital Payments Strategy', 'CMA Fintech Lab'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      approvedCustodianTypes: ['sama_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 10,
      liquidityBufferPercent: 12,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'SAMA Basel III',
    },
    reportingObligations: [
      { type: 'SAMA_QUARTERLY', frequency: 'quarterly', regulator: 'SAMA' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 10,
    },
  },
  QA: {
    jurisdiction: 'QA',
    region: 'MENA',
    securitiesClassification: {
      digitalAssetsAs: 'unclassified',
      tokenizedRWA: 'pending',
      applicableRegulations: ['QFC Digital Assets Framework'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      approvedCustodianTypes: ['qfcra_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 10,
      liquidityBufferPercent: 10,
      stressTestFrequency: 'annually',
      regulatoryFramework: 'QCB Capital Framework',
    },
    reportingObligations: [
      { type: 'QFCRA_ANNUAL', frequency: 'annually', regulator: 'QFCRA' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: false,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 7,
    },
  },
  // ─── Asia-Pacific ─────────────────────────────────────────────────────────
  SG: {
    jurisdiction: 'SG',
    region: 'APAC',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['MAS PS Act', 'MAS Digital Token Service Guidelines'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      minimumCapital: 3_000_000,
      approvedCustodianTypes: ['mas_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 10,
      liquidityBufferPercent: 15,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'MAS Capital Requirements',
    },
    reportingObligations: [
      { type: 'MAS_QUARTERLY', frequency: 'quarterly', regulator: 'MAS' },
      { type: 'AML_STR', frequency: 'real_time', regulator: 'CAD', thresholdAmount: 20_000 },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
  HK: {
    jurisdiction: 'HK',
    region: 'APAC',
    securitiesClassification: {
      digitalAssetsAs: 'securities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['SFC Virtual Asset Policy', 'AMLO Amendment'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      minimumCapital: 5_000_000,
      approvedCustodianTypes: ['sfc_licensed_vasp', 'hkma_authorized'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 12,
      liquidityBufferPercent: 15,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'HKMA Capital Rules',
    },
    reportingObligations: [
      { type: 'SFC_QUARTERLY', frequency: 'quarterly', regulator: 'SFC' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 6,
    },
  },
  JP: {
    jurisdiction: 'JP',
    region: 'APAC',
    securitiesClassification: {
      digitalAssetsAs: 'currency',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['FSA Crypto Asset Act', 'Act on Settlement of Funds'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: true,
      minimumCapital: 10_000_000,
      approvedCustodianTypes: ['fsa_licensed_caexch'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 15,
      liquidityBufferPercent: 20,
      stressTestFrequency: 'monthly',
      regulatoryFramework: 'FSA Capital Requirements',
    },
    reportingObligations: [
      { type: 'FSA_MONTHLY', frequency: 'monthly', regulator: 'FSA', format: 'XML' },
      { type: 'AML_STR', frequency: 'real_time', regulator: 'JAFIC', thresholdAmount: 3_000_000 },
    ],
    kycAmlObligations: {
      kycTierRequired: 'institutional',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 7,
    },
  },
  AU: {
    jurisdiction: 'AU',
    region: 'APAC',
    securitiesClassification: {
      digitalAssetsAs: 'commodities',
      tokenizedRWA: 'regulated',
      applicableRegulations: ['ASIC Digital Asset Policy', 'AUSTRAC AML/CTF Rules'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: false,
      selfCustodyAllowed: true,
      segregationRequired: false,
      insuranceRequired: false,
      approvedCustodianTypes: ['austrac_registered', 'asic_licensed'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 8,
      liquidityBufferPercent: 10,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'APRA Capital Standards',
    },
    reportingObligations: [
      { type: 'AUSTRAC_ANNUAL', frequency: 'annually', regulator: 'AUSTRAC' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: false,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 7,
    },
  },
  KR: {
    jurisdiction: 'KR',
    region: 'APAC',
    securitiesClassification: {
      digitalAssetsAs: 'commodities',
      tokenizedRWA: 'pending',
      applicableRegulations: ['VASP Act (FIPA Amendment)', 'FSC Guidelines'],
    },
    custodyRequirements: {
      requiresLicensedCustodian: true,
      selfCustodyAllowed: false,
      segregationRequired: true,
      insuranceRequired: false,
      minimumCapital: 1_500_000,
      approvedCustodianTypes: ['fsc_registered_vasp'],
    },
    capitalReserveStandards: {
      minimumReserveRatio: 10,
      liquidityBufferPercent: 12,
      stressTestFrequency: 'quarterly',
      regulatoryFramework: 'FSC Capital Rules',
    },
    reportingObligations: [
      { type: 'FSC_QUARTERLY', frequency: 'quarterly', regulator: 'FSC' },
    ],
    kycAmlObligations: {
      kycTierRequired: 'enhanced',
      amlScreeningRequired: true,
      sanctionsScreeningRequired: true,
      pepScreeningRequired: true,
      uboDisclosureRequired: true,
      transactionMonitoringRequired: true,
      sarFilingRequired: true,
      recordRetentionYears: 5,
    },
  },
};

// ============================================================================
// Regulatory Mapping Manager
// ============================================================================

export interface RegulatoryMappingConfig {
  enabled?: boolean;
  enableAutoUpdate?: boolean;
}

export class RegulatoryMappingMatrix {
  private readonly _config: RegulatoryMappingConfig;
  private customMappings: Map<GRIFJurisdictionCode, RegulatoryMapping> = new Map();

  get config(): RegulatoryMappingConfig {
    return this._config;
  }

  constructor(config: RegulatoryMappingConfig = {}) {
    this._config = { enabled: true, enableAutoUpdate: false, ...config };
  }

  /**
   * Get the full regulatory mapping for a jurisdiction.
   */
  getMapping(jurisdiction: GRIFJurisdictionCode): RegulatoryMapping {
    const custom = this.customMappings.get(jurisdiction);
    if (custom) return custom;

    const base = REGULATORY_MAPPINGS[jurisdiction];
    if (!base) {
      throw new Error(`No regulatory mapping found for jurisdiction: ${jurisdiction}`);
    }
    return { ...base, lastUpdated: new Date('2025-01-01') };
  }

  /**
   * List all available mappings.
   */
  listMappings(region?: GRIFRegionCode): RegulatoryMapping[] {
    const jurisdictions = Object.keys(REGULATORY_MAPPINGS) as GRIFJurisdictionCode[];
    const mappings = jurisdictions.map((j) => this.getMapping(j));
    if (region) return mappings.filter((m) => m.region === region);
    return mappings;
  }

  /**
   * Add or override a mapping for a jurisdiction.
   */
  setCustomMapping(jurisdiction: GRIFJurisdictionCode, mapping: RegulatoryMapping): void {
    this.customMappings.set(jurisdiction, mapping);
  }

  /**
   * Compare KYC/AML obligations across jurisdictions.
   */
  compareKycAml(jurisdictions: GRIFJurisdictionCode[]): Record<string, KycAmlObligation> {
    const result: Record<string, KycAmlObligation> = {};
    for (const j of jurisdictions) {
      result[j] = this.getMapping(j).kycAmlObligations;
    }
    return result;
  }

  /**
   * Find the most permissive jurisdictions for a given activity set.
   */
  findPermissiveJurisdictions(criteria: {
    region?: GRIFRegionCode;
    selfCustodyAllowed?: boolean;
    maxKycTier?: 'basic' | 'enhanced' | 'institutional';
    minCapitalReserveRatio?: number;
  }): GRIFJurisdictionCode[] {
    const all = this.listMappings(criteria.region);
    const kycTierRank: Record<string, number> = { basic: 1, enhanced: 2, institutional: 3 };
    const maxTierRank = criteria.maxKycTier ? kycTierRank[criteria.maxKycTier] : 3;

    return all
      .filter((m) => {
        if (criteria.selfCustodyAllowed && !m.custodyRequirements.selfCustodyAllowed) return false;
        if (kycTierRank[m.kycAmlObligations.kycTierRequired] > maxTierRank) return false;
        if (
          criteria.minCapitalReserveRatio !== undefined &&
          m.capitalReserveStandards.minimumReserveRatio < criteria.minCapitalReserveRatio
        )
          return false;
        return true;
      })
      .map((m) => m.jurisdiction);
  }

  /**
   * Get all supported jurisdictions.
   */
  getSupportedJurisdictions(): GRIFJurisdictionCode[] {
    return Object.keys(REGULATORY_MAPPINGS) as GRIFJurisdictionCode[];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRegulatoryMappingMatrix(
  config?: RegulatoryMappingConfig
): RegulatoryMappingMatrix {
  return new RegulatoryMappingMatrix(config);
}
