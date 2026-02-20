/**
 * TONAIAgent - AI-Assisted Evaluation
 *
 * AI-powered evaluation for grant applications, investments, and incubation applications.
 * Powered by Groq for fast inference.
 */

import {
  AIEvaluationConfig,
  EvaluationCriterion,
  AIEvaluationRequest,
  AIEvaluationResult,
  CriteriaScore,
  EcosystemFundEventCallback,
} from './types';

// ============================================================================
// AI Evaluation Manager Interface
// ============================================================================

export interface AIEvaluationManager {
  readonly config: AIEvaluationConfig;

  // Evaluation operations
  evaluate(request: AIEvaluationRequest): Promise<AIEvaluationResult>;
  getEvaluation(evaluationId: string): Promise<AIEvaluationResult>;
  getEvaluations(filter?: EvaluationFilter): Promise<AIEvaluationResult[]>;

  // Criteria management
  getCriteria(type: 'grant' | 'investment' | 'incubation' | 'incentive'): EvaluationCriterion[];
  setCriteria(
    type: 'grant' | 'investment' | 'incubation' | 'incentive',
    criteria: EvaluationCriterion[]
  ): void;

  // Batch operations
  evaluateBatch(requests: AIEvaluationRequest[]): Promise<AIEvaluationResult[]>;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface EvaluationFilter {
  type?: 'grant' | 'investment' | 'incubation' | 'incentive';
  applicationId?: string;
  minScore?: number;
  maxScore?: number;
  recommendation?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Default Criteria
// ============================================================================

const DEFAULT_GRANT_CRITERIA: EvaluationCriterion[] = [
  {
    name: 'Problem Relevance',
    weight: 0.2,
    description: 'How relevant is the problem to the TON ecosystem?',
    rubric: [
      { score: 1, description: 'Not relevant to TON' },
      { score: 3, description: 'Somewhat relevant' },
      { score: 5, description: 'Highly relevant and impactful' },
    ],
  },
  {
    name: 'Solution Quality',
    weight: 0.25,
    description: 'How well-designed and feasible is the proposed solution?',
    rubric: [
      { score: 1, description: 'Poorly designed or infeasible' },
      { score: 3, description: 'Reasonable approach' },
      { score: 5, description: 'Excellent, innovative solution' },
    ],
  },
  {
    name: 'Team Capability',
    weight: 0.2,
    description: 'Does the team have the skills to execute?',
    rubric: [
      { score: 1, description: 'Inexperienced team' },
      { score: 3, description: 'Some relevant experience' },
      { score: 5, description: 'Highly experienced team' },
    ],
  },
  {
    name: 'Budget Reasonableness',
    weight: 0.15,
    description: 'Is the budget reasonable for the proposed work?',
    rubric: [
      { score: 1, description: 'Budget significantly over/under' },
      { score: 3, description: 'Budget somewhat reasonable' },
      { score: 5, description: 'Well-justified budget' },
    ],
  },
  {
    name: 'Ecosystem Impact',
    weight: 0.2,
    description: 'What is the potential impact on the ecosystem?',
    rubric: [
      { score: 1, description: 'Limited impact' },
      { score: 3, description: 'Moderate impact' },
      { score: 5, description: 'Transformative impact' },
    ],
  },
];

const DEFAULT_INVESTMENT_CRITERIA: EvaluationCriterion[] = [
  {
    name: 'Market Opportunity',
    weight: 0.2,
    description: 'Size and growth potential of the target market',
    rubric: [
      { score: 1, description: 'Small or declining market' },
      { score: 3, description: 'Moderate market opportunity' },
      { score: 5, description: 'Large, fast-growing market' },
    ],
  },
  {
    name: 'Product/Technology',
    weight: 0.25,
    description: 'Quality and differentiation of the product',
    rubric: [
      { score: 1, description: 'No clear differentiation' },
      { score: 3, description: 'Some competitive advantages' },
      { score: 5, description: 'Strong moat and innovation' },
    ],
  },
  {
    name: 'Team',
    weight: 0.2,
    description: 'Founder and team quality',
    rubric: [
      { score: 1, description: 'Weak team' },
      { score: 3, description: 'Competent team' },
      { score: 5, description: 'Exceptional team' },
    ],
  },
  {
    name: 'Traction',
    weight: 0.15,
    description: 'Current traction and momentum',
    rubric: [
      { score: 1, description: 'No traction' },
      { score: 3, description: 'Early traction' },
      { score: 5, description: 'Strong, accelerating traction' },
    ],
  },
  {
    name: 'Strategic Fit',
    weight: 0.2,
    description: 'Alignment with fund thesis and ecosystem',
    rubric: [
      { score: 1, description: 'Poor strategic fit' },
      { score: 3, description: 'Moderate fit' },
      { score: 5, description: 'Perfect strategic fit' },
    ],
  },
];

const DEFAULT_INCUBATION_CRITERIA: EvaluationCriterion[] = [
  {
    name: 'Idea Quality',
    weight: 0.2,
    description: 'Originality and potential of the idea',
    rubric: [
      { score: 1, description: 'Generic idea' },
      { score: 3, description: 'Good idea' },
      { score: 5, description: 'Exceptional, innovative idea' },
    ],
  },
  {
    name: 'Founder Coachability',
    weight: 0.25,
    description: 'Willingness to learn and adapt',
    rubric: [
      { score: 1, description: 'Resistant to feedback' },
      { score: 3, description: 'Open to feedback' },
      { score: 5, description: 'Highly coachable' },
    ],
  },
  {
    name: 'Execution Ability',
    weight: 0.2,
    description: 'Ability to execute quickly',
    rubric: [
      { score: 1, description: 'Slow execution' },
      { score: 3, description: 'Average execution' },
      { score: 5, description: 'Rapid execution' },
    ],
  },
  {
    name: 'Technical Depth',
    weight: 0.15,
    description: 'Technical expertise of the team',
    rubric: [
      { score: 1, description: 'Limited technical ability' },
      { score: 3, description: 'Competent' },
      { score: 5, description: 'Deep technical expertise' },
    ],
  },
  {
    name: 'Commitment',
    weight: 0.2,
    description: 'Full-time commitment and dedication',
    rubric: [
      { score: 1, description: 'Part-time or uncertain' },
      { score: 3, description: 'Committed' },
      { score: 5, description: 'All-in, full commitment' },
    ],
  },
];

const DEFAULT_INCENTIVE_CRITERIA: EvaluationCriterion[] = [
  {
    name: 'Technical Quality',
    weight: 0.3,
    description: 'Quality of the technical implementation',
    rubric: [
      { score: 1, description: 'Poor implementation' },
      { score: 3, description: 'Adequate implementation' },
      { score: 5, description: 'Excellent implementation' },
    ],
  },
  {
    name: 'User Impact',
    weight: 0.25,
    description: 'Expected impact on users',
    rubric: [
      { score: 1, description: 'Limited user benefit' },
      { score: 3, description: 'Moderate benefit' },
      { score: 5, description: 'High user impact' },
    ],
  },
  {
    name: 'Integration Depth',
    weight: 0.25,
    description: 'Depth of integration with ecosystem',
    rubric: [
      { score: 1, description: 'Surface integration' },
      { score: 3, description: 'Standard integration' },
      { score: 5, description: 'Deep integration' },
    ],
  },
  {
    name: 'Maintainability',
    weight: 0.2,
    description: 'Long-term maintainability',
    rubric: [
      { score: 1, description: 'Difficult to maintain' },
      { score: 3, description: 'Maintainable' },
      { score: 5, description: 'Highly maintainable' },
    ],
  },
];

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultAIEvaluationManager implements AIEvaluationManager {
  readonly config: AIEvaluationConfig;

  private evaluations: Map<string, AIEvaluationResult> = new Map();
  private criteriaByType: Map<string, EvaluationCriterion[]> = new Map();
  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<AIEvaluationConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      provider: config.provider ?? 'groq',
      modelId: config.modelId ?? 'llama-3.3-70b-versatile',
      evaluationCriteria: config.evaluationCriteria ?? [],
      autoReject: config.autoReject ?? false,
      autoRejectThreshold: config.autoRejectThreshold ?? 25,
      humanReviewRequired: config.humanReviewRequired ?? true,
    };

    // Initialize default criteria
    this.criteriaByType.set('grant', DEFAULT_GRANT_CRITERIA);
    this.criteriaByType.set('investment', DEFAULT_INVESTMENT_CRITERIA);
    this.criteriaByType.set('incubation', DEFAULT_INCUBATION_CRITERIA);
    this.criteriaByType.set('incentive', DEFAULT_INCENTIVE_CRITERIA);
  }

  // ============================================================================
  // Evaluation Operations
  // ============================================================================

  async evaluate(request: AIEvaluationRequest): Promise<AIEvaluationResult> {
    const startTime = Date.now();
    const criteria = this.getCriteria(request.type);

    // In production, this would call Groq API
    // For now, we simulate AI evaluation
    const criteriaScores = this.simulateEvaluation(criteria, request);
    const overallScore = this.calculateOverallScore(criteriaScores, criteria);

    const result: AIEvaluationResult = {
      id: this.generateId('evaluation'),
      applicationId: request.applicationId,
      type: request.type,
      overallScore,
      recommendation: this.determineRecommendation(overallScore),
      criteriaScores,
      strengths: this.identifyStrengths(criteriaScores),
      weaknesses: this.identifyWeaknesses(criteriaScores),
      risks: this.identifyRisks(criteriaScores, request),
      questions: this.generateQuestions(criteriaScores, request),
      summary: this.generateSummary(overallScore, criteriaScores, request),
      confidence: this.calculateConfidence(criteriaScores),
      modelId: this.config.modelId,
      evaluatedAt: new Date(),
      processingTime: Date.now() - startTime,
    };

    this.evaluations.set(result.id, result);

    return result;
  }

  async getEvaluation(evaluationId: string): Promise<AIEvaluationResult> {
    const evaluation = this.evaluations.get(evaluationId);
    if (!evaluation) {
      throw new Error(`Evaluation not found: ${evaluationId}`);
    }
    return { ...evaluation };
  }

  async getEvaluations(filter?: EvaluationFilter): Promise<AIEvaluationResult[]> {
    let evaluations = Array.from(this.evaluations.values());

    if (filter) {
      if (filter.type) {
        evaluations = evaluations.filter((e) => e.type === filter.type);
      }
      if (filter.applicationId) {
        evaluations = evaluations.filter((e) => e.applicationId === filter.applicationId);
      }
      if (filter.minScore !== undefined) {
        evaluations = evaluations.filter((e) => e.overallScore >= filter.minScore!);
      }
      if (filter.maxScore !== undefined) {
        evaluations = evaluations.filter((e) => e.overallScore <= filter.maxScore!);
      }
      if (filter.recommendation) {
        evaluations = evaluations.filter((e) => e.recommendation === filter.recommendation);
      }
      if (filter.fromDate) {
        evaluations = evaluations.filter((e) => e.evaluatedAt >= filter.fromDate!);
      }
      if (filter.toDate) {
        evaluations = evaluations.filter((e) => e.evaluatedAt <= filter.toDate!);
      }
      if (filter.offset) {
        evaluations = evaluations.slice(filter.offset);
      }
      if (filter.limit) {
        evaluations = evaluations.slice(0, filter.limit);
      }
    }

    return evaluations;
  }

  // ============================================================================
  // Criteria Management
  // ============================================================================

  getCriteria(type: 'grant' | 'investment' | 'incubation' | 'incentive'): EvaluationCriterion[] {
    return this.criteriaByType.get(type) ?? [];
  }

  setCriteria(
    type: 'grant' | 'investment' | 'incubation' | 'incentive',
    criteria: EvaluationCriterion[]
  ): void {
    this.criteriaByType.set(type, criteria);
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async evaluateBatch(requests: AIEvaluationRequest[]): Promise<AIEvaluationResult[]> {
    const results: AIEvaluationResult[] = [];
    for (const request of requests) {
      const result = await this.evaluate(request);
      results.push(result);
    }
    return results;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: EcosystemFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods - Evaluation Logic
  // ============================================================================

  private simulateEvaluation(
    criteria: EvaluationCriterion[],
    request: AIEvaluationRequest
  ): CriteriaScore[] {
    // Simulate AI evaluation with randomized but realistic scores
    // In production, this would use actual LLM inference

    return criteria.map((criterion) => {
      // Generate a score between 2 and 5 (biased toward middle-high)
      const baseScore = 2.5 + Math.random() * 2.5;
      const score = Math.round(baseScore * 10) / 10;

      // Generate reasoning based on criterion
      const reasoning = this.generateReasoning(criterion, score, request);

      return {
        criterion: criterion.name,
        score,
        maxScore: 5,
        reasoning,
      };
    });
  }

  private generateReasoning(
    criterion: EvaluationCriterion,
    score: number,
    request: AIEvaluationRequest
  ): string {
    const level = score >= 4 ? 'strong' : score >= 3 ? 'adequate' : 'needs improvement';
    // applicationData can be used for more detailed reasoning in production
    const _applicationData = request.applicationData as Record<string, unknown>;
    void _applicationData; // Suppress unused warning (used in production with actual AI)

    // Generate context-aware reasoning
    if (criterion.name.includes('Team')) {
      return `The team demonstrates ${level} capability. Key factors include experience level and domain expertise.`;
    }
    if (criterion.name.includes('Technical') || criterion.name.includes('Technology')) {
      return `Technical approach is ${level}. The proposed solution shows reasonable architectural considerations.`;
    }
    if (criterion.name.includes('Market') || criterion.name.includes('Impact')) {
      return `Market/impact potential is ${level}. The target segment shows viable opportunity.`;
    }
    if (criterion.name.includes('Budget') || criterion.name.includes('Financial')) {
      return `Financial planning is ${level}. Budget allocation appears ${score >= 3.5 ? 'well-justified' : 'requiring clarification'}.`;
    }

    return `Evaluation for ${criterion.name}: The application demonstrates ${level} qualities in this area.`;
  }

  private calculateOverallScore(
    scores: CriteriaScore[],
    criteria: EvaluationCriterion[]
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < scores.length; i++) {
      const weight = criteria[i]?.weight ?? 0.2;
      weightedSum += (scores[i].score / scores[i].maxScore) * 100 * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  private determineRecommendation(
    score: number
  ): 'strongly_approve' | 'approve' | 'consider' | 'reject' | 'strongly_reject' {
    if (score >= 85) return 'strongly_approve';
    if (score >= 70) return 'approve';
    if (score >= 50) return 'consider';
    if (score >= 30) return 'reject';
    return 'strongly_reject';
  }

  private identifyStrengths(scores: CriteriaScore[]): string[] {
    return scores
      .filter((s) => s.score >= 4)
      .map((s) => `Strong ${s.criterion.toLowerCase()}: ${s.reasoning.split('.')[0]}`);
  }

  private identifyWeaknesses(scores: CriteriaScore[]): string[] {
    return scores
      .filter((s) => s.score < 3)
      .map((s) => `Weak ${s.criterion.toLowerCase()}: Needs improvement in this area`);
  }

  private identifyRisks(
    scores: CriteriaScore[],
    _request: AIEvaluationRequest
  ): string[] {
    const risks: string[] = [];

    const lowScores = scores.filter((s) => s.score < 2.5);
    if (lowScores.length > 0) {
      risks.push(
        `Multiple criteria below threshold: ${lowScores.map((s) => s.criterion).join(', ')}`
      );
    }

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    if (avgScore < 3) {
      risks.push('Overall evaluation indicates high risk');
    }

    return risks;
  }

  private generateQuestions(
    scores: CriteriaScore[],
    _request: AIEvaluationRequest
  ): string[] {
    const questions: string[] = [];

    // Generate questions for low-scoring areas
    for (const score of scores) {
      if (score.score < 3) {
        questions.push(`Can you provide more details about your ${score.criterion.toLowerCase()}?`);
      }
    }

    // Add general follow-up questions
    if (questions.length === 0) {
      questions.push('What is your primary competitive advantage?');
      questions.push('How do you plan to scale adoption?');
    }

    return questions.slice(0, 5); // Max 5 questions
  }

  private generateSummary(
    overallScore: number,
    scores: CriteriaScore[],
    request: AIEvaluationRequest
  ): string {
    const recommendation = this.determineRecommendation(overallScore);
    const strengths = scores.filter((s) => s.score >= 4).length;
    const weaknesses = scores.filter((s) => s.score < 3).length;

    let summary = `This ${request.type} application received an overall score of ${overallScore}/100. `;

    if (recommendation === 'strongly_approve' || recommendation === 'approve') {
      summary += `The application demonstrates strong potential with ${strengths} high-scoring areas. `;
    } else if (recommendation === 'consider') {
      summary += `The application shows mixed results and requires careful consideration. `;
    } else {
      summary += `The application has significant weaknesses in ${weaknesses} areas. `;
    }

    summary += `Recommendation: ${recommendation.replace('_', ' ')}.`;

    return summary;
  }

  private calculateConfidence(scores: CriteriaScore[]): number {
    // Higher confidence when scores are consistent
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s.score - avgScore, 2), 0) /
      scores.length;

    // Lower variance = higher confidence
    const confidence = Math.max(0.5, 1 - variance / 5);
    return Math.round(confidence * 100) / 100;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAIEvaluationManager(
  config?: Partial<AIEvaluationConfig>
): DefaultAIEvaluationManager {
  return new DefaultAIEvaluationManager(config);
}
