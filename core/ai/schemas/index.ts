/**
 * TONAIAgent - AI Response Schemas
 *
 * Zod schemas for validating AI response shapes.
 * One schema per AI call type, used by the output validator.
 */

export { TradeSignalSchema } from './strategy-signal';
export type { TradeSignal } from './strategy-signal';

export { AnalysisResultSchema } from './analysis-result';
export type { AnalysisResult } from './analysis-result';

export { RiskAssessmentSchema } from './risk-assessment';
export type { RiskAssessment } from './risk-assessment';
