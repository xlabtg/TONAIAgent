/**
 * TONAIAgent - AI Response Schema: TradeSignal
 *
 * Zod schema for the expected response shape of strategy (trade signal) AI calls.
 * The model is instructed (in prompt-builder.ts) to return valid JSON matching this schema.
 */

import { z } from 'zod';

export const TradeSignalSchema = z.object({
  action: z.enum(['buy', 'sell', 'hold', 'stake', 'unstake']),
  assetSymbol: z.string().min(1).max(20),
  amountTon: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(1000),
  riskLevel: z.enum(['low', 'medium', 'high']),
  expiresInSeconds: z.number().int().positive().max(86400).optional(),
});

export type TradeSignal = z.infer<typeof TradeSignalSchema>;
