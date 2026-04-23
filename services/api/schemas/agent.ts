/**
 * TONAIAgent - Agent API Zod Schemas
 *
 * Zod validation schemas for all agent-related API request bodies.
 * These schemas are used by the validation middleware to enforce
 * correct input shape, types, and value ranges.
 */

import { z } from 'zod';

// ============================================================================
// Agent Creation Schema
// ============================================================================

/**
 * Schema for POST /api/agents — create a new agent.
 *
 * Uses .strict() so that any unrecognised field (including `isDemoStrategy`)
 * causes a validation error. Demo-strategy privilege is granted only by the
 * server-side strategy registry, never by user-supplied data.
 */
export const CreateAgentSchema = z.object({
  userId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  strategy: z.enum(['trend', 'arbitrage', 'ai_signal']),
  budgetTon: z.number().positive().max(1_000_000),
  riskLevel: z.enum(['low', 'medium', 'high']),
}).strict();

/**
 * Schema for PATCH/PUT /api/agents/:id/configure.
 *
 * Uses .strict() so that `isDemoStrategy` and other server-only fields are
 * rejected when supplied by a client.
 */
export const ConfigureAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  strategy: z.enum(['trend', 'arbitrage', 'ai_signal']).optional(),
  budgetTon: z.number().positive().max(1_000_000).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
}).strict().refine(obj => Object.keys(obj).length > 0, {
  message: 'At least one field must be provided for configuration update',
});

// ============================================================================
// Live Trading Mode Schema
// ============================================================================

/**
 * Schema for POST /agents/:id/enable-live-trading
 *
 * All three acknowledgements must be explicitly true.
 * These correspond to the confirmation checklist shown in the UI modal
 * and are validated server-side to prevent client-side bypass.
 */
export const EnableLiveTradingSchema = z.object({
  /** User confirms real funds will be at risk */
  acknowledgeRealFunds: z.literal(true),
  /** User confirms the mainnet readiness checklist is complete */
  acknowledgeMainnetChecklist: z.literal(true),
  /** User explicitly accepts the financial risk */
  acknowledgeRiskAccepted: z.literal(true),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type ConfigureAgentInput = z.infer<typeof ConfigureAgentSchema>;
export type EnableLiveTradingInput = z.infer<typeof EnableLiveTradingSchema>;
