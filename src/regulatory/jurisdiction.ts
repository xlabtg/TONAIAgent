/**
 * TONAIAgent Regulatory Strategy - Jurisdiction Analyzer
 * Provides comprehensive jurisdiction analysis, comparison, and entity architecture design.
 */

import {
  JurisdictionCode,
  JurisdictionAnalysis,
  JurisdictionComparison,
  JurisdictionRanking,
  EntityArchitecture,
  EntityConfig,
  LicenseRequirement,
  TimelineEstimate,
  CostEstimate,
  TaxFramework,
  JurisdictionRisk,
  TaxOptimization,
  RegulatoryEvent,
  RegulatoryEventCallback,
  RiskLevel,
} from './types';

// ============================================================================
// Jurisdiction Data
// ============================================================================

interface JurisdictionData {
  name: string;
  region: string;
  cryptoFramework: string;
  regulatoryClarity: number;
  cryptoFriendliness: number;
  institutionalAccess: number;
  taxEfficiency: number;
  operationalCost: number;
  bankingAccess: number;
  setupCost: number;
  annualCost: number;
  setupTimeline: string;
  corporateTaxRate: number;
  capitalGainsTax: number;
  vatRate: number;
  requiredLicenses: Partial<LicenseRequirement>[];
  risks: Partial<JurisdictionRisk>[];
}

const JURISDICTION_DATA: Record<JurisdictionCode, JurisdictionData> = {
  // Europe
  CH: {
    name: 'Switzerland',
    region: 'Europe',
    cryptoFramework: 'FINMA DLT Framework',
    regulatoryClarity: 90,
    cryptoFriendliness: 95,
    institutionalAccess: 95,
    taxEfficiency: 75,
    operationalCost: 40,
    bankingAccess: 90,
    setupCost: 150000,
    annualCost: 200000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 14.9,
    capitalGainsTax: 0,
    vatRate: 7.7,
    requiredLicenses: [
      {
        type: 'FINMA_VT',
        name: 'FINMA Virtual Assets License',
        regulator: 'FINMA',
        estimatedTimeline: '6-12 months',
        estimatedCost: 100000,
        capitalRequirement: 300000,
      },
    ],
    risks: [
      { category: 'Cost', level: 'medium' as RiskLevel, description: 'High operational costs' },
      { category: 'Compliance', level: 'medium' as RiskLevel, description: 'Strict AML requirements' },
    ],
  },
  LI: {
    name: 'Liechtenstein',
    region: 'Europe',
    cryptoFramework: 'TVTG (Blockchain Act)',
    regulatoryClarity: 95,
    cryptoFriendliness: 95,
    institutionalAccess: 80,
    taxEfficiency: 80,
    operationalCost: 50,
    bankingAccess: 85,
    setupCost: 100000,
    annualCost: 150000,
    setupTimeline: '4-8 months',
    corporateTaxRate: 12.5,
    capitalGainsTax: 0,
    vatRate: 7.7,
    requiredLicenses: [
      {
        type: 'FMA_TT',
        name: 'FMA TT Service Provider License',
        regulator: 'FMA',
        estimatedTimeline: '4-6 months',
        estimatedCost: 50000,
      },
    ],
    risks: [
      { category: 'Market', level: 'low' as RiskLevel, description: 'Small domestic market' },
    ],
  },
  EE: {
    name: 'Estonia',
    region: 'Europe',
    cryptoFramework: 'EU MiCA + Local VASP',
    regulatoryClarity: 80,
    cryptoFriendliness: 75,
    institutionalAccess: 70,
    taxEfficiency: 85,
    operationalCost: 85,
    bankingAccess: 70,
    setupCost: 30000,
    annualCost: 50000,
    setupTimeline: '2-4 months',
    corporateTaxRate: 20,
    capitalGainsTax: 20,
    vatRate: 20,
    requiredLicenses: [
      {
        type: 'VASP_EE',
        name: 'Estonian VASP License',
        regulator: 'Estonian FIU',
        estimatedTimeline: '2-3 months',
        estimatedCost: 20000,
      },
    ],
    risks: [
      { category: 'Regulatory', level: 'medium' as RiskLevel, description: 'Recent regulatory tightening' },
    ],
  },
  MT: {
    name: 'Malta',
    region: 'Europe',
    cryptoFramework: 'VFA Act + MiCA',
    regulatoryClarity: 85,
    cryptoFriendliness: 85,
    institutionalAccess: 75,
    taxEfficiency: 80,
    operationalCost: 70,
    bankingAccess: 75,
    setupCost: 80000,
    annualCost: 100000,
    setupTimeline: '6-9 months',
    corporateTaxRate: 35,
    capitalGainsTax: 0,
    vatRate: 18,
    requiredLicenses: [
      {
        type: 'VFA_MT',
        name: 'Malta VFA License',
        regulator: 'MFSA',
        estimatedTimeline: '6-9 months',
        estimatedCost: 60000,
      },
    ],
    risks: [
      { category: 'Compliance', level: 'medium' as RiskLevel, description: 'Enhanced due diligence requirements' },
    ],
  },
  LU: {
    name: 'Luxembourg',
    region: 'Europe',
    cryptoFramework: 'CSSF + MiCA',
    regulatoryClarity: 90,
    cryptoFriendliness: 80,
    institutionalAccess: 95,
    taxEfficiency: 75,
    operationalCost: 45,
    bankingAccess: 95,
    setupCost: 200000,
    annualCost: 250000,
    setupTimeline: '9-15 months',
    corporateTaxRate: 24.94,
    capitalGainsTax: 0,
    vatRate: 17,
    requiredLicenses: [
      {
        type: 'CSSF_VASP',
        name: 'CSSF VASP Registration',
        regulator: 'CSSF',
        estimatedTimeline: '6-12 months',
        estimatedCost: 150000,
      },
    ],
    risks: [
      { category: 'Cost', level: 'high' as RiskLevel, description: 'High setup and operational costs' },
    ],
  },
  IE: {
    name: 'Ireland',
    region: 'Europe',
    cryptoFramework: 'CBI + MiCA',
    regulatoryClarity: 85,
    cryptoFriendliness: 80,
    institutionalAccess: 90,
    taxEfficiency: 85,
    operationalCost: 55,
    bankingAccess: 90,
    setupCost: 120000,
    annualCost: 180000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 12.5,
    capitalGainsTax: 33,
    vatRate: 23,
    requiredLicenses: [
      {
        type: 'CBI_VASP',
        name: 'Central Bank VASP Registration',
        regulator: 'CBI',
        estimatedTimeline: '6-9 months',
        estimatedCost: 80000,
      },
    ],
    risks: [
      { category: 'Tax', level: 'medium' as RiskLevel, description: 'High capital gains tax' },
    ],
  },
  DE: {
    name: 'Germany',
    region: 'Europe',
    cryptoFramework: 'BaFin + MiCA',
    regulatoryClarity: 90,
    cryptoFriendliness: 75,
    institutionalAccess: 90,
    taxEfficiency: 60,
    operationalCost: 50,
    bankingAccess: 85,
    setupCost: 150000,
    annualCost: 200000,
    setupTimeline: '9-18 months',
    corporateTaxRate: 30,
    capitalGainsTax: 26.375,
    vatRate: 19,
    requiredLicenses: [
      {
        type: 'BaFin_Crypto',
        name: 'BaFin Crypto Custody License',
        regulator: 'BaFin',
        estimatedTimeline: '12-18 months',
        estimatedCost: 100000,
      },
    ],
    risks: [
      { category: 'Timeline', level: 'high' as RiskLevel, description: 'Long licensing timeline' },
    ],
  },
  FR: {
    name: 'France',
    region: 'Europe',
    cryptoFramework: 'AMF PSAN + MiCA',
    regulatoryClarity: 85,
    cryptoFriendliness: 80,
    institutionalAccess: 85,
    taxEfficiency: 55,
    operationalCost: 50,
    bankingAccess: 85,
    setupCost: 130000,
    annualCost: 180000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 25,
    capitalGainsTax: 30,
    vatRate: 20,
    requiredLicenses: [
      {
        type: 'AMF_PSAN',
        name: 'AMF PSAN Registration',
        regulator: 'AMF',
        estimatedTimeline: '6-9 months',
        estimatedCost: 80000,
      },
    ],
    risks: [
      { category: 'Tax', level: 'medium' as RiskLevel, description: 'High overall tax burden' },
    ],
  },
  NL: {
    name: 'Netherlands',
    region: 'Europe',
    cryptoFramework: 'DNB + MiCA',
    regulatoryClarity: 85,
    cryptoFriendliness: 80,
    institutionalAccess: 85,
    taxEfficiency: 65,
    operationalCost: 55,
    bankingAccess: 85,
    setupCost: 110000,
    annualCost: 160000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 25.8,
    capitalGainsTax: 0,
    vatRate: 21,
    requiredLicenses: [
      {
        type: 'DNB_VASP',
        name: 'DNB VASP Registration',
        regulator: 'DNB',
        estimatedTimeline: '6-9 months',
        estimatedCost: 70000,
      },
    ],
    risks: [
      { category: 'Regulatory', level: 'low' as RiskLevel, description: 'Stable regulatory environment' },
    ],
  },

  // Asia-Pacific
  SG: {
    name: 'Singapore',
    region: 'Asia-Pacific',
    cryptoFramework: 'MAS PSA',
    regulatoryClarity: 95,
    cryptoFriendliness: 90,
    institutionalAccess: 95,
    taxEfficiency: 90,
    operationalCost: 50,
    bankingAccess: 95,
    setupCost: 100000,
    annualCost: 150000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 17,
    capitalGainsTax: 0,
    vatRate: 8,
    requiredLicenses: [
      {
        type: 'MAS_DPT',
        name: 'MAS Digital Payment Token License',
        regulator: 'MAS',
        estimatedTimeline: '6-12 months',
        estimatedCost: 80000,
      },
    ],
    risks: [
      { category: 'Compliance', level: 'medium' as RiskLevel, description: 'Strict compliance requirements' },
    ],
  },
  HK: {
    name: 'Hong Kong',
    region: 'Asia-Pacific',
    cryptoFramework: 'SFC VATP',
    regulatoryClarity: 85,
    cryptoFriendliness: 85,
    institutionalAccess: 90,
    taxEfficiency: 95,
    operationalCost: 45,
    bankingAccess: 90,
    setupCost: 120000,
    annualCost: 180000,
    setupTimeline: '9-15 months',
    corporateTaxRate: 16.5,
    capitalGainsTax: 0,
    vatRate: 0,
    requiredLicenses: [
      {
        type: 'SFC_VATP',
        name: 'SFC VATP License',
        regulator: 'SFC',
        estimatedTimeline: '9-12 months',
        estimatedCost: 100000,
      },
    ],
    risks: [
      { category: 'Geopolitical', level: 'medium' as RiskLevel, description: 'Geopolitical uncertainties' },
    ],
  },
  JP: {
    name: 'Japan',
    region: 'Asia-Pacific',
    cryptoFramework: 'FSA/JFSA',
    regulatoryClarity: 90,
    cryptoFriendliness: 80,
    institutionalAccess: 85,
    taxEfficiency: 55,
    operationalCost: 45,
    bankingAccess: 85,
    setupCost: 200000,
    annualCost: 250000,
    setupTimeline: '12-18 months',
    corporateTaxRate: 30.62,
    capitalGainsTax: 20,
    vatRate: 10,
    requiredLicenses: [
      {
        type: 'FSA_Exchange',
        name: 'FSA Crypto Exchange License',
        regulator: 'FSA',
        estimatedTimeline: '12-18 months',
        estimatedCost: 150000,
      },
    ],
    risks: [
      { category: 'Timeline', level: 'high' as RiskLevel, description: 'Long licensing process' },
    ],
  },
  KR: {
    name: 'South Korea',
    region: 'Asia-Pacific',
    cryptoFramework: 'FSC VASP',
    regulatoryClarity: 80,
    cryptoFriendliness: 75,
    institutionalAccess: 80,
    taxEfficiency: 60,
    operationalCost: 55,
    bankingAccess: 80,
    setupCost: 150000,
    annualCost: 180000,
    setupTimeline: '9-15 months',
    corporateTaxRate: 27.5,
    capitalGainsTax: 22,
    vatRate: 10,
    requiredLicenses: [
      {
        type: 'FSC_VASP',
        name: 'FSC VASP Registration',
        regulator: 'FSC',
        estimatedTimeline: '6-12 months',
        estimatedCost: 100000,
      },
    ],
    risks: [
      { category: 'Regulatory', level: 'medium' as RiskLevel, description: 'Evolving regulations' },
    ],
  },
  AU: {
    name: 'Australia',
    region: 'Asia-Pacific',
    cryptoFramework: 'ASIC/AUSTRAC DCE',
    regulatoryClarity: 85,
    cryptoFriendliness: 80,
    institutionalAccess: 85,
    taxEfficiency: 65,
    operationalCost: 55,
    bankingAccess: 85,
    setupCost: 100000,
    annualCost: 140000,
    setupTimeline: '6-9 months',
    corporateTaxRate: 30,
    capitalGainsTax: 25,
    vatRate: 10,
    requiredLicenses: [
      {
        type: 'AUSTRAC_DCE',
        name: 'AUSTRAC DCE Registration',
        regulator: 'AUSTRAC',
        estimatedTimeline: '3-6 months',
        estimatedCost: 50000,
      },
    ],
    risks: [
      { category: 'Tax', level: 'medium' as RiskLevel, description: 'Complex crypto tax rules' },
    ],
  },
  NZ: {
    name: 'New Zealand',
    region: 'Asia-Pacific',
    cryptoFramework: 'FMA',
    regulatoryClarity: 80,
    cryptoFriendliness: 85,
    institutionalAccess: 75,
    taxEfficiency: 70,
    operationalCost: 65,
    bankingAccess: 80,
    setupCost: 60000,
    annualCost: 80000,
    setupTimeline: '3-6 months',
    corporateTaxRate: 28,
    capitalGainsTax: 0,
    vatRate: 15,
    requiredLicenses: [
      {
        type: 'FMA_FSP',
        name: 'FMA Financial Service Provider',
        regulator: 'FMA',
        estimatedTimeline: '2-4 months',
        estimatedCost: 30000,
      },
    ],
    risks: [
      { category: 'Market', level: 'low' as RiskLevel, description: 'Small domestic market' },
    ],
  },

  // Middle East
  AE: {
    name: 'United Arab Emirates',
    region: 'Middle East',
    cryptoFramework: 'VARA/DFSA',
    regulatoryClarity: 85,
    cryptoFriendliness: 95,
    institutionalAccess: 90,
    taxEfficiency: 100,
    operationalCost: 55,
    bankingAccess: 85,
    setupCost: 150000,
    annualCost: 200000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 9,
    capitalGainsTax: 0,
    vatRate: 5,
    requiredLicenses: [
      {
        type: 'VARA_VASP',
        name: 'VARA VASP License',
        regulator: 'VARA',
        estimatedTimeline: '4-8 months',
        estimatedCost: 100000,
      },
    ],
    risks: [
      { category: 'Regulatory', level: 'low' as RiskLevel, description: 'Evolving but supportive framework' },
    ],
  },
  BH: {
    name: 'Bahrain',
    region: 'Middle East',
    cryptoFramework: 'CBB Crypto Framework',
    regulatoryClarity: 85,
    cryptoFriendliness: 90,
    institutionalAccess: 80,
    taxEfficiency: 100,
    operationalCost: 70,
    bankingAccess: 80,
    setupCost: 80000,
    annualCost: 100000,
    setupTimeline: '4-8 months',
    corporateTaxRate: 0,
    capitalGainsTax: 0,
    vatRate: 10,
    requiredLicenses: [
      {
        type: 'CBB_Crypto',
        name: 'CBB Crypto Asset License',
        regulator: 'CBB',
        estimatedTimeline: '4-6 months',
        estimatedCost: 50000,
      },
    ],
    risks: [
      { category: 'Market', level: 'medium' as RiskLevel, description: 'Small domestic market' },
    ],
  },
  SA: {
    name: 'Saudi Arabia',
    region: 'Middle East',
    cryptoFramework: 'SAMA',
    regulatoryClarity: 60,
    cryptoFriendliness: 50,
    institutionalAccess: 75,
    taxEfficiency: 95,
    operationalCost: 60,
    bankingAccess: 80,
    setupCost: 120000,
    annualCost: 150000,
    setupTimeline: '12-18 months',
    corporateTaxRate: 20,
    capitalGainsTax: 0,
    vatRate: 15,
    requiredLicenses: [
      {
        type: 'SAMA_Fintech',
        name: 'SAMA Fintech License',
        regulator: 'SAMA',
        estimatedTimeline: '12-18 months',
        estimatedCost: 80000,
      },
    ],
    risks: [
      { category: 'Regulatory', level: 'high' as RiskLevel, description: 'Restrictive crypto stance' },
    ],
  },
  QA: {
    name: 'Qatar',
    region: 'Middle East',
    cryptoFramework: 'QFC/QFCRA',
    regulatoryClarity: 70,
    cryptoFriendliness: 60,
    institutionalAccess: 80,
    taxEfficiency: 100,
    operationalCost: 55,
    bankingAccess: 85,
    setupCost: 100000,
    annualCost: 130000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 10,
    capitalGainsTax: 0,
    vatRate: 0,
    requiredLicenses: [
      {
        type: 'QFCRA_License',
        name: 'QFCRA Financial Services',
        regulator: 'QFCRA',
        estimatedTimeline: '6-9 months',
        estimatedCost: 70000,
      },
    ],
    risks: [
      { category: 'Regulatory', level: 'medium' as RiskLevel, description: 'Conservative approach to crypto' },
    ],
  },

  // Americas/Offshore
  US: {
    name: 'United States',
    region: 'Americas',
    cryptoFramework: 'SEC/CFTC/FinCEN',
    regulatoryClarity: 70,
    cryptoFriendliness: 60,
    institutionalAccess: 100,
    taxEfficiency: 50,
    operationalCost: 40,
    bankingAccess: 95,
    setupCost: 500000,
    annualCost: 600000,
    setupTimeline: '12-24 months',
    corporateTaxRate: 21,
    capitalGainsTax: 37,
    vatRate: 0,
    requiredLicenses: [
      {
        type: 'FinCEN_MSB',
        name: 'FinCEN MSB Registration',
        regulator: 'FinCEN',
        estimatedTimeline: '1-2 months',
        estimatedCost: 10000,
      },
      {
        type: 'State_MTL',
        name: 'State Money Transmitter Licenses',
        regulator: 'State Regulators',
        estimatedTimeline: '12-24 months',
        estimatedCost: 400000,
      },
    ],
    risks: [
      { category: 'Regulatory', level: 'high' as RiskLevel, description: 'Complex multi-agency oversight' },
      { category: 'Cost', level: 'high' as RiskLevel, description: 'Very high compliance costs' },
    ],
  },
  CA: {
    name: 'Canada',
    region: 'Americas',
    cryptoFramework: 'CSA/FINTRAC',
    regulatoryClarity: 80,
    cryptoFriendliness: 75,
    institutionalAccess: 85,
    taxEfficiency: 60,
    operationalCost: 55,
    bankingAccess: 85,
    setupCost: 150000,
    annualCost: 180000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 26.5,
    capitalGainsTax: 26.76,
    vatRate: 5,
    requiredLicenses: [
      {
        type: 'FINTRAC_MSB',
        name: 'FINTRAC MSB Registration',
        regulator: 'FINTRAC',
        estimatedTimeline: '2-4 months',
        estimatedCost: 30000,
      },
    ],
    risks: [
      { category: 'Tax', level: 'medium' as RiskLevel, description: 'High capital gains tax' },
    ],
  },
  BM: {
    name: 'Bermuda',
    region: 'Americas',
    cryptoFramework: 'BMA DABA',
    regulatoryClarity: 90,
    cryptoFriendliness: 95,
    institutionalAccess: 85,
    taxEfficiency: 100,
    operationalCost: 45,
    bankingAccess: 75,
    setupCost: 200000,
    annualCost: 250000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 0,
    capitalGainsTax: 0,
    vatRate: 0,
    requiredLicenses: [
      {
        type: 'BMA_DABA',
        name: 'BMA Digital Asset Business License',
        regulator: 'BMA',
        estimatedTimeline: '6-9 months',
        estimatedCost: 150000,
      },
    ],
    risks: [
      { category: 'Banking', level: 'medium' as RiskLevel, description: 'Limited banking options' },
    ],
  },
  KY: {
    name: 'Cayman Islands',
    region: 'Americas',
    cryptoFramework: 'CIMA VASP',
    regulatoryClarity: 85,
    cryptoFriendliness: 90,
    institutionalAccess: 90,
    taxEfficiency: 100,
    operationalCost: 45,
    bankingAccess: 80,
    setupCost: 150000,
    annualCost: 200000,
    setupTimeline: '4-9 months',
    corporateTaxRate: 0,
    capitalGainsTax: 0,
    vatRate: 0,
    requiredLicenses: [
      {
        type: 'CIMA_VASP',
        name: 'CIMA VASP Registration',
        regulator: 'CIMA',
        estimatedTimeline: '4-6 months',
        estimatedCost: 100000,
      },
    ],
    risks: [
      { category: 'Substance', level: 'medium' as RiskLevel, description: 'Economic substance requirements' },
    ],
  },
  VG: {
    name: 'British Virgin Islands',
    region: 'Americas',
    cryptoFramework: 'BVI FSC',
    regulatoryClarity: 75,
    cryptoFriendliness: 85,
    institutionalAccess: 75,
    taxEfficiency: 100,
    operationalCost: 60,
    bankingAccess: 65,
    setupCost: 80000,
    annualCost: 100000,
    setupTimeline: '2-4 months',
    corporateTaxRate: 0,
    capitalGainsTax: 0,
    vatRate: 0,
    requiredLicenses: [
      {
        type: 'FSC_VASP',
        name: 'FSC VASP Registration',
        regulator: 'BVI FSC',
        estimatedTimeline: '2-4 months',
        estimatedCost: 50000,
      },
    ],
    risks: [
      { category: 'Banking', level: 'high' as RiskLevel, description: 'Limited banking access' },
    ],
  },
  BS: {
    name: 'Bahamas',
    region: 'Americas',
    cryptoFramework: 'DARE Act',
    regulatoryClarity: 85,
    cryptoFriendliness: 90,
    institutionalAccess: 80,
    taxEfficiency: 100,
    operationalCost: 55,
    bankingAccess: 75,
    setupCost: 100000,
    annualCost: 130000,
    setupTimeline: '4-8 months',
    corporateTaxRate: 0,
    capitalGainsTax: 0,
    vatRate: 12,
    requiredLicenses: [
      {
        type: 'SCB_DARE',
        name: 'SCB Digital Assets License',
        regulator: 'SCB',
        estimatedTimeline: '4-6 months',
        estimatedCost: 70000,
      },
    ],
    risks: [
      { category: 'Reputation', level: 'medium' as RiskLevel, description: 'FTX collapse impact' },
    ],
  },

  // UK & Crown Dependencies
  GB: {
    name: 'United Kingdom',
    region: 'Europe',
    cryptoFramework: 'FCA',
    regulatoryClarity: 85,
    cryptoFriendliness: 70,
    institutionalAccess: 95,
    taxEfficiency: 65,
    operationalCost: 50,
    bankingAccess: 95,
    setupCost: 180000,
    annualCost: 220000,
    setupTimeline: '12-18 months',
    corporateTaxRate: 25,
    capitalGainsTax: 20,
    vatRate: 20,
    requiredLicenses: [
      {
        type: 'FCA_Crypto',
        name: 'FCA Cryptoasset Registration',
        regulator: 'FCA',
        estimatedTimeline: '12-18 months',
        estimatedCost: 100000,
      },
    ],
    risks: [
      { category: 'Timeline', level: 'high' as RiskLevel, description: 'Long FCA approval times' },
    ],
  },
  GI: {
    name: 'Gibraltar',
    region: 'Europe',
    cryptoFramework: 'DLT Framework',
    regulatoryClarity: 90,
    cryptoFriendliness: 95,
    institutionalAccess: 80,
    taxEfficiency: 85,
    operationalCost: 60,
    bankingAccess: 75,
    setupCost: 100000,
    annualCost: 140000,
    setupTimeline: '6-12 months',
    corporateTaxRate: 12.5,
    capitalGainsTax: 0,
    vatRate: 0,
    requiredLicenses: [
      {
        type: 'GFSC_DLT',
        name: 'GFSC DLT Provider License',
        regulator: 'GFSC',
        estimatedTimeline: '6-9 months',
        estimatedCost: 80000,
      },
    ],
    risks: [
      { category: 'Brexit', level: 'medium' as RiskLevel, description: 'Brexit implications' },
    ],
  },
  JE: {
    name: 'Jersey',
    region: 'Europe',
    cryptoFramework: 'JFSC',
    regulatoryClarity: 85,
    cryptoFriendliness: 85,
    institutionalAccess: 80,
    taxEfficiency: 100,
    operationalCost: 55,
    bankingAccess: 80,
    setupCost: 80000,
    annualCost: 110000,
    setupTimeline: '4-8 months',
    corporateTaxRate: 0,
    capitalGainsTax: 0,
    vatRate: 5,
    requiredLicenses: [
      {
        type: 'JFSC_VASP',
        name: 'JFSC Virtual Asset Service Provider',
        regulator: 'JFSC',
        estimatedTimeline: '4-6 months',
        estimatedCost: 50000,
      },
    ],
    risks: [
      { category: 'Market', level: 'low' as RiskLevel, description: 'Limited to specific services' },
    ],
  },
  GG: {
    name: 'Guernsey',
    region: 'Europe',
    cryptoFramework: 'GFSC',
    regulatoryClarity: 80,
    cryptoFriendliness: 80,
    institutionalAccess: 75,
    taxEfficiency: 100,
    operationalCost: 60,
    bankingAccess: 75,
    setupCost: 70000,
    annualCost: 100000,
    setupTimeline: '4-8 months',
    corporateTaxRate: 0,
    capitalGainsTax: 0,
    vatRate: 0,
    requiredLicenses: [
      {
        type: 'GFSC_GG',
        name: 'GFSC Virtual Asset License',
        regulator: 'GFSC',
        estimatedTimeline: '4-6 months',
        estimatedCost: 40000,
      },
    ],
    risks: [
      { category: 'Market', level: 'low' as RiskLevel, description: 'Small jurisdiction' },
    ],
  },
};

// ============================================================================
// Jurisdiction Analyzer Implementation
// ============================================================================

export interface JurisdictionAnalyzerConfig {
  defaultCurrency?: string;
  includeOffshore?: boolean;
  riskTolerance?: RiskLevel;
}

export interface AnalyzeJurisdictionOptions {
  entityType: string;
  activities: string[];
  targetMarkets?: string[];
  capitalRequirements?: number;
  expectedVolume?: 'low' | 'medium' | 'high';
}

export interface CompareJurisdictionsOptions {
  weights?: {
    regulatoryClarity?: number;
    cryptoFriendliness?: number;
    institutionalAccess?: number;
    taxEfficiency?: number;
    operationalCost?: number;
    bankingAccess?: number;
  };
  activities: string[];
}

export interface DesignEntityArchitectureParams {
  primaryHQ: {
    jurisdiction: JurisdictionCode;
    entityType: string;
    purpose: string;
    capitalRequirement?: number;
  };
  operationalHubs?: {
    jurisdiction: JurisdictionCode;
    entityType: string;
    purpose: string;
    activities: string[];
  }[];
  techSubsidiary?: {
    jurisdiction: JurisdictionCode;
    entityType: string;
    purpose: string;
  };
}

export class JurisdictionAnalyzer {
  private config: Required<JurisdictionAnalyzerConfig>;
  private eventListeners: RegulatoryEventCallback[] = [];

  constructor(config: JurisdictionAnalyzerConfig = {}) {
    this.config = {
      defaultCurrency: config.defaultCurrency ?? 'USD',
      includeOffshore: config.includeOffshore ?? true,
      riskTolerance: config.riskTolerance ?? 'medium',
    };
  }

  async analyzeJurisdiction(
    jurisdiction: JurisdictionCode,
    options: AnalyzeJurisdictionOptions
  ): Promise<JurisdictionAnalysis> {
    const data = JURISDICTION_DATA[jurisdiction];
    if (!data) {
      throw new Error(`Unknown jurisdiction: ${jurisdiction}`);
    }

    const totalScore = this.calculateTotalScore(data);
    const requiredLicenses = this.getRequiredLicenses(jurisdiction, options.activities);
    const timeline = this.estimateTimeline(data, options);
    const costs = this.estimateCosts(data, options);
    const taxFramework = this.getTaxFramework(data);
    const risks = this.assessRisks(data, options);
    const recommendations = this.generateRecommendations(data, options);

    return {
      jurisdiction,
      regulatoryScore: data.regulatoryClarity,
      cryptoFriendlinessScore: data.cryptoFriendliness,
      institutionalAccessScore: data.institutionalAccess,
      taxEfficiencyScore: data.taxEfficiency,
      bankingAccessScore: data.bankingAccess,
      operationalCostScore: data.operationalCost,
      totalScore,
      requiredLicenses,
      estimatedTimeline: timeline,
      estimatedCosts: costs,
      taxFramework,
      risks,
      recommendations,
    };
  }

  async compareJurisdictions(
    jurisdictions: JurisdictionCode[],
    options: CompareJurisdictionsOptions
  ): Promise<JurisdictionComparison> {
    const weights = {
      regulatoryClarity: options.weights?.regulatoryClarity ?? 0.2,
      cryptoFriendliness: options.weights?.cryptoFriendliness ?? 0.2,
      institutionalAccess: options.weights?.institutionalAccess ?? 0.2,
      taxEfficiency: options.weights?.taxEfficiency ?? 0.15,
      operationalCost: options.weights?.operationalCost ?? 0.1,
      bankingAccess: options.weights?.bankingAccess ?? 0.15,
    };

    const rankings: JurisdictionRanking[] = jurisdictions.map((jurisdiction) => {
      const data = JURISDICTION_DATA[jurisdiction];
      if (!data) {
        throw new Error(`Unknown jurisdiction: ${jurisdiction}`);
      }

      const scores = {
        regulatoryClarity: data.regulatoryClarity,
        cryptoFriendliness: data.cryptoFriendliness,
        institutionalAccess: data.institutionalAccess,
        taxEfficiency: data.taxEfficiency,
        operationalCost: data.operationalCost,
        bankingAccess: data.bankingAccess,
      };

      const totalScore =
        scores.regulatoryClarity * weights.regulatoryClarity +
        scores.cryptoFriendliness * weights.cryptoFriendliness +
        scores.institutionalAccess * weights.institutionalAccess +
        scores.taxEfficiency * weights.taxEfficiency +
        scores.operationalCost * weights.operationalCost +
        scores.bankingAccess * weights.bankingAccess;

      const strengths = this.identifyStrengths(data);
      const weaknesses = this.identifyWeaknesses(data);

      return {
        jurisdiction,
        totalScore: Math.round(totalScore * 100) / 100,
        scores,
        strengths,
        weaknesses,
      };
    });

    // Sort by total score descending
    rankings.sort((a, b) => b.totalScore - a.totalScore);

    const optimalChoice = rankings[0].jurisdiction;
    const recommendations = this.generateComparisonRecommendations(rankings, options);

    return {
      jurisdictions,
      rankings,
      recommendations,
      optimalChoice,
      rationale: `${JURISDICTION_DATA[optimalChoice].name} offers the best combination of regulatory clarity, crypto-friendliness, and institutional access for the specified activities.`,
    };
  }

  async designEntityArchitecture(
    params: DesignEntityArchitectureParams
  ): Promise<EntityArchitecture> {
    const primaryHQData = JURISDICTION_DATA[params.primaryHQ.jurisdiction];

    const primaryHQ: EntityConfig = {
      jurisdiction: params.primaryHQ.jurisdiction,
      entityType: params.primaryHQ.entityType as any,
      purpose: params.primaryHQ.purpose,
      activities: [],
      capitalRequirement: params.primaryHQ.capitalRequirement,
      estimatedSetupCost: primaryHQData.setupCost,
      estimatedAnnualCost: primaryHQData.annualCost,
    };

    const operationalHubs: EntityConfig[] = (params.operationalHubs ?? []).map((hub) => {
      const hubData = JURISDICTION_DATA[hub.jurisdiction];
      return {
        jurisdiction: hub.jurisdiction,
        entityType: hub.entityType as any,
        purpose: hub.purpose,
        activities: hub.activities,
        licenses: hubData.requiredLicenses.map((l) => l.type ?? ''),
        estimatedSetupCost: hubData.setupCost,
        estimatedAnnualCost: hubData.annualCost,
      };
    });

    let techSubsidiary: EntityConfig | undefined;
    if (params.techSubsidiary) {
      const techData = JURISDICTION_DATA[params.techSubsidiary.jurisdiction];
      techSubsidiary = {
        jurisdiction: params.techSubsidiary.jurisdiction,
        entityType: params.techSubsidiary.entityType as any,
        purpose: params.techSubsidiary.purpose,
        activities: ['technology_development'],
        estimatedSetupCost: techData.setupCost * 0.5,
        estimatedAnnualCost: techData.annualCost * 0.5,
      };
    }

    const totalEstimatedCost =
      primaryHQ.estimatedSetupCost +
      operationalHubs.reduce((sum, hub) => sum + hub.estimatedSetupCost, 0) +
      (techSubsidiary?.estimatedSetupCost ?? 0);

    const taxOptimization = this.designTaxOptimization(primaryHQ, operationalHubs);

    return {
      primaryHQ,
      operationalHubs,
      techSubsidiary,
      totalEstimatedCost,
      timeline: this.calculateArchitectureTimeline(params),
      taxOptimization,
      recommendations: this.generateArchitectureRecommendations(params),
    };
  }

  getJurisdictionRequirements(jurisdiction: JurisdictionCode): JurisdictionData {
    const data = JURISDICTION_DATA[jurisdiction];
    if (!data) {
      throw new Error(`Unknown jurisdiction: ${jurisdiction}`);
    }
    return data;
  }

  getSupportedJurisdictions(): JurisdictionCode[] {
    return Object.keys(JURISDICTION_DATA) as JurisdictionCode[];
  }

  onEvent(callback: RegulatoryEventCallback): void {
    this.eventListeners.push(callback);
  }

  /** Emit an event to all registered listeners */
  emitEvent(event: RegulatoryEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  private calculateTotalScore(data: JurisdictionData): number {
    return Math.round(
      (data.regulatoryClarity * 0.2 +
        data.cryptoFriendliness * 0.2 +
        data.institutionalAccess * 0.2 +
        data.taxEfficiency * 0.15 +
        data.operationalCost * 0.1 +
        data.bankingAccess * 0.15) *
        100
    ) / 100;
  }

  private getRequiredLicenses(
    jurisdiction: JurisdictionCode,
    activities: string[]
  ): LicenseRequirement[] {
    const data = JURISDICTION_DATA[jurisdiction];
    return data.requiredLicenses.map((license) => ({
      type: license.type ?? '',
      name: license.name ?? '',
      regulator: license.regulator ?? '',
      description: `Required for ${activities.join(', ')} in ${data.name}`,
      requiredFor: activities,
      estimatedTimeline: license.estimatedTimeline ?? '6-12 months',
      estimatedCost: license.estimatedCost ?? 0,
      capitalRequirement: license.capitalRequirement,
      prerequisites: [],
    }));
  }

  private estimateTimeline(
    data: JurisdictionData,
    _options: AnalyzeJurisdictionOptions
  ): TimelineEstimate {
    return {
      entitySetup: '2-4 weeks',
      licenseApplication: '2-4 weeks',
      licenseApproval: data.setupTimeline,
      operationalReadiness: '4-8 weeks',
      totalEstimate: data.setupTimeline,
    };
  }

  private estimateCosts(
    data: JurisdictionData,
    _options: AnalyzeJurisdictionOptions
  ): CostEstimate {
    return {
      entitySetup: Math.round(data.setupCost * 0.2),
      legalFees: Math.round(data.setupCost * 0.3),
      licenseFees: Math.round(data.setupCost * 0.5),
      capitalRequirements: data.requiredLicenses[0]?.capitalRequirement ?? 0,
      ongoingAnnual: data.annualCost,
      currency: this.config.defaultCurrency,
    };
  }

  private getTaxFramework(data: JurisdictionData): TaxFramework {
    return {
      corporateTaxRate: data.corporateTaxRate,
      capitalGainsTax: data.capitalGainsTax,
      vatApplicable: data.vatRate > 0,
      vatRate: data.vatRate,
      cryptoTaxTreatment: data.capitalGainsTax === 0 ? 'Favorable' : 'Standard',
      taxTreaties: [],
      holdingBenefits: data.corporateTaxRate < 15 ? ['Participation exemption potential'] : [],
    };
  }

  private assessRisks(
    data: JurisdictionData,
    _options: AnalyzeJurisdictionOptions
  ): JurisdictionRisk[] {
    return data.risks.map((risk) => ({
      category: risk.category ?? '',
      level: risk.level ?? 'medium',
      description: risk.description ?? '',
      mitigations: ['Engage local counsel', 'Maintain compliance documentation'],
    }));
  }

  private generateRecommendations(
    data: JurisdictionData,
    _options: AnalyzeJurisdictionOptions
  ): string[] {
    const recommendations: string[] = [];

    if (data.regulatoryClarity >= 85) {
      recommendations.push(`${data.name} offers excellent regulatory clarity for crypto operations.`);
    }

    if (data.cryptoFriendliness >= 90) {
      recommendations.push(`${data.name} is highly crypto-friendly with supportive regulations.`);
    }

    if (data.taxEfficiency >= 90) {
      recommendations.push(`Consider ${data.name} for tax efficiency benefits.`);
    }

    if (data.bankingAccess < 80) {
      recommendations.push(`Banking access may be challenging in ${data.name}; consider multi-jurisdiction banking.`);
    }

    return recommendations;
  }

  private identifyStrengths(data: JurisdictionData): string[] {
    const strengths: string[] = [];
    if (data.regulatoryClarity >= 85) strengths.push('Clear regulatory framework');
    if (data.cryptoFriendliness >= 90) strengths.push('Crypto-friendly environment');
    if (data.institutionalAccess >= 90) strengths.push('Strong institutional access');
    if (data.taxEfficiency >= 90) strengths.push('Tax efficient');
    if (data.bankingAccess >= 90) strengths.push('Excellent banking access');
    if (data.operationalCost >= 70) strengths.push('Cost effective operations');
    return strengths;
  }

  private identifyWeaknesses(data: JurisdictionData): string[] {
    const weaknesses: string[] = [];
    if (data.regulatoryClarity < 75) weaknesses.push('Regulatory uncertainty');
    if (data.cryptoFriendliness < 70) weaknesses.push('Limited crypto support');
    if (data.institutionalAccess < 75) weaknesses.push('Limited institutional access');
    if (data.taxEfficiency < 60) weaknesses.push('High tax burden');
    if (data.bankingAccess < 75) weaknesses.push('Challenging banking access');
    if (data.operationalCost < 50) weaknesses.push('High operational costs');
    return weaknesses;
  }

  private generateComparisonRecommendations(
    rankings: JurisdictionRanking[],
    _options: CompareJurisdictionsOptions
  ): string[] {
    const recommendations: string[] = [];
    const top = rankings[0];
    const runner = rankings[1];

    recommendations.push(
      `${JURISDICTION_DATA[top.jurisdiction].name} ranks highest with a score of ${top.totalScore}.`
    );

    if (runner && top.totalScore - runner.totalScore < 5) {
      recommendations.push(
        `${JURISDICTION_DATA[runner.jurisdiction].name} is a close alternative with a score of ${runner.totalScore}.`
      );
    }

    return recommendations;
  }

  private designTaxOptimization(
    primaryHQ: EntityConfig,
    operationalHubs: EntityConfig[]
  ): TaxOptimization {
    const primaryData = JURISDICTION_DATA[primaryHQ.jurisdiction];
    const avgTaxRate =
      operationalHubs.length > 0
        ? operationalHubs.reduce(
            (sum, hub) => sum + JURISDICTION_DATA[hub.jurisdiction].corporateTaxRate,
            primaryData.corporateTaxRate
          ) / (operationalHubs.length + 1)
        : primaryData.corporateTaxRate;

    return {
      effectiveTaxRate: Math.round(avgTaxRate * 100) / 100,
      strategies: [
        'Transfer pricing alignment',
        'IP holding optimization',
        'Substance requirements compliance',
      ],
      risks: ['Transfer pricing audits', 'Substance challenges'],
      compliance: ['OECD BEPS compliance', 'Local substance requirements'],
    };
  }

  private calculateArchitectureTimeline(params: DesignEntityArchitectureParams): string {
    const baseTimeline = JURISDICTION_DATA[params.primaryHQ.jurisdiction].setupTimeline;
    const hubCount = params.operationalHubs?.length ?? 0;

    if (hubCount === 0) return baseTimeline;
    if (hubCount <= 2) return '9-18 months';
    return '12-24 months';
  }

  private generateArchitectureRecommendations(
    params: DesignEntityArchitectureParams
  ): string[] {
    const recommendations: string[] = [];
    const primaryData = JURISDICTION_DATA[params.primaryHQ.jurisdiction];

    recommendations.push(
      `Establish ${primaryData.name} as primary HQ for ${params.primaryHQ.purpose}.`
    );

    if (params.operationalHubs && params.operationalHubs.length > 0) {
      recommendations.push(
        `Set up operational hubs in ${params.operationalHubs.map((h) => JURISDICTION_DATA[h.jurisdiction].name).join(', ')} for regional coverage.`
      );
    }

    if (params.techSubsidiary) {
      recommendations.push(
        `Establish technology subsidiary in ${JURISDICTION_DATA[params.techSubsidiary.jurisdiction].name} for cost efficiency.`
      );
    }

    recommendations.push('Ensure proper transfer pricing documentation.');
    recommendations.push('Maintain economic substance in each jurisdiction.');

    return recommendations;
  }
}

export function createJurisdictionAnalyzer(
  config?: JurisdictionAnalyzerConfig
): JurisdictionAnalyzer {
  return new JurisdictionAnalyzer(config);
}
