/**
 * TONAIAgent - AI Response Schema: AnalysisResult
 *
 * Zod schema for the expected response shape of portfolio analysis AI calls.
 */

import { z } from 'zod';

export const AnalysisResultSchema = z.object({
  summary: z.string().max(2000),
  riskScore: z.number().min(0).max(10),
  diversificationScore: z.number().min(0).max(10),
  recommendations: z.array(z.string().max(500)).max(10),
  topHoldings: z
    .array(
      z.object({
        symbol: z.string().min(1).max(20),
        allocationPct: z.number().min(0).max(100),
      })
    )
    .max(20),
  timeframeAnalyzed: z.enum(['1h', '4h', '1d', '1w']),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
