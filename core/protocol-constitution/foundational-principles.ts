/**
 * TONAIAgent - Protocol Constitution: Foundational Principles (Issue #126)
 *
 * Manages the protocol's core values, economic mission, risk philosophy,
 * and decentralization commitment — the immutable bedrock of the constitution.
 */

import type {
  FoundationalPrinciples,
  ProtocolMission,
  DecentralizationTier,
  ConstitutionEvent,
  ConstitutionEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface FoundationalPrinciplesManager {
  // Read
  getPrinciples(): FoundationalPrinciples;
  getImmutableClauses(): string[];
  getCoreValues(): string[];

  // Validate
  isImmutableClause(clause: string): boolean;
  validateMissionAlignment(proposedMission: ProtocolMission[]): boolean;

  // Update (restricted — requires supermajority)
  updateCoreValues(values: string[], authorizedBy: string): FoundationalPrinciples;
  addImmutableClause(clause: string, authorizedBy: string): FoundationalPrinciples;
  updateDecentralizationCommitment(tier: DecentralizationTier, authorizedBy: string): FoundationalPrinciples;

  // Events
  onEvent(callback: ConstitutionEventCallback): () => void;
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_IMMUTABLE_CLAUSES: string[] = [
  'No single entity shall control more than 33% of total governance voting power',
  'AI systems shall never have unilateral authority over treasury confiscation',
  'AI systems shall never override a valid DAO supermajority vote',
  'Emergency powers shall auto-expire and cannot be made permanent without full constitutional amendment',
  'All on-chain governance actions shall be publicly auditable and transparent',
  'Token holders retain the right to exit the protocol at any time',
  'The insurance reserve minimum shall never fall below 5% of TVL',
];

export const DEFAULT_CORE_VALUES: string[] = [
  'Transparency: All protocol actions are publicly auditable',
  'Decentralization: Progressive elimination of privileged access',
  'Sustainability: Long-term protocol health over short-term gains',
  'Safety: Conservative risk management with AI as advisor, not autocrat',
  'Inclusivity: Governance accessible to all token holders regardless of size',
  'Adaptability: Ability to upgrade while preserving constitutional protections',
];

export const DEFAULT_FOUNDATIONAL_PRINCIPLES: Omit<FoundationalPrinciples, 'id' | 'adoptedAt' | 'ratifiedBy'> = {
  version: '1.0.0',
  purpose: 'Establish a self-governing AI financial protocol on The Open Network that enables autonomous asset management, systemic risk monitoring, and AI-driven monetary policy within transparent, DAO-governed constitutional constraints.',
  economicMission: [
    'autonomous_asset_management',
    'systemic_risk_stability',
    'monetary_policy',
    'liquidity_standard',
    'capital_markets',
  ],
  riskTolerance: 'moderate',
  decentralizationCommitment: 'progressive',
  coreValues: DEFAULT_CORE_VALUES,
  immutableClauses: DEFAULT_IMMUTABLE_CLAUSES,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultFoundationalPrinciplesManager implements FoundationalPrinciplesManager {
  private principles: FoundationalPrinciples;
  private readonly eventCallbacks: ConstitutionEventCallback[] = [];

  constructor(initialPrinciples?: Partial<FoundationalPrinciples>) {
    const now = new Date();
    this.principles = {
      id: this.generateId(),
      ...DEFAULT_FOUNDATIONAL_PRINCIPLES,
      ...initialPrinciples,
      adoptedAt: initialPrinciples?.adoptedAt ?? now,
      ratifiedBy: initialPrinciples?.ratifiedBy ?? [],
    };
  }

  getPrinciples(): FoundationalPrinciples {
    return { ...this.principles };
  }

  getImmutableClauses(): string[] {
    return [...this.principles.immutableClauses];
  }

  getCoreValues(): string[] {
    return [...this.principles.coreValues];
  }

  isImmutableClause(clause: string): boolean {
    return this.principles.immutableClauses.includes(clause);
  }

  validateMissionAlignment(proposedMission: ProtocolMission[]): boolean {
    // All proposed missions must be from the protocol's allowed mission set
    const allowed: ProtocolMission[] = [
      'autonomous_asset_management',
      'systemic_risk_stability',
      'monetary_policy',
      'liquidity_standard',
      'capital_markets',
    ];
    return proposedMission.every(m => allowed.includes(m));
  }

  updateCoreValues(values: string[], authorizedBy: string): FoundationalPrinciples {
    if (!authorizedBy) throw new Error('Authorization required to update core values');
    this.principles = { ...this.principles, coreValues: values };
    this.emit({
      type: 'constitution.amended',
      data: { section: 'foundational_principles', field: 'coreValues', authorizedBy },
      timestamp: new Date(),
    });
    return this.getPrinciples();
  }

  addImmutableClause(clause: string, authorizedBy: string): FoundationalPrinciples {
    if (!authorizedBy) throw new Error('Authorization required to add immutable clause');
    if (this.principles.immutableClauses.includes(clause)) {
      throw new Error(`Clause already exists: "${clause}"`);
    }
    this.principles = {
      ...this.principles,
      immutableClauses: [...this.principles.immutableClauses, clause],
    };
    this.emit({
      type: 'constitution.amended',
      data: { section: 'foundational_principles', field: 'immutableClauses', clause, authorizedBy },
      timestamp: new Date(),
    });
    return this.getPrinciples();
  }

  updateDecentralizationCommitment(tier: DecentralizationTier, authorizedBy: string): FoundationalPrinciples {
    if (!authorizedBy) throw new Error('Authorization required');
    // Can only move to a more decentralized tier, never less
    const tierOrder: DecentralizationTier[] = ['hybrid', 'progressive', 'fully_decentralized'];
    const currentIdx = tierOrder.indexOf(this.principles.decentralizationCommitment);
    const newIdx = tierOrder.indexOf(tier);
    if (newIdx < currentIdx) {
      throw new Error('Decentralization commitment can only be increased, never decreased');
    }
    this.principles = { ...this.principles, decentralizationCommitment: tier };
    this.emit({
      type: 'constitution.amended',
      data: { section: 'foundational_principles', field: 'decentralizationCommitment', tier, authorizedBy },
      timestamp: new Date(),
    });
    return this.getPrinciples();
  }

  onEvent(callback: ConstitutionEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private emit(event: ConstitutionEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createFoundationalPrinciplesManager(
  initialPrinciples?: Partial<FoundationalPrinciples>
): DefaultFoundationalPrinciplesManager {
  return new DefaultFoundationalPrinciplesManager(initialPrinciples);
}
