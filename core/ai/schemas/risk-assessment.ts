/**
 * TONAIAgent - AI Response Schema: RiskAssessment
 *
 * Zod schema for the expected response shape of risk assessment AI calls.
 */

import { z } from 'zod';

export const RiskAssessmentSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  riskScore: z.number().min(0).max(10),
  factors: z.array(z.string().max(300)).max(10),
  recommendation: z.enum(['proceed', 'proceed_with_caution', 'reduce_size', 'abort']),
  maxSafeAmountTon: z.number().nonnegative(),
  reasoning: z.string().max(1000),
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
