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

/** Schema for POST /api/agents — create a new agent */
export const CreateAgentSchema = z.object({
  userId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  strategy: z.enum(['trend', 'arbitrage', 'ai_signal']),
  budgetTon: z.number().positive().max(1_000_000),
  riskLevel: z.enum(['low', 'medium', 'high']),
});

/** Schema for PATCH/PUT /api/agents/:id/configure */
export const ConfigureAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  strategy: z.enum(['trend', 'arbitrage', 'ai_signal']).optional(),
  budgetTon: z.number().positive().max(1_000_000).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: 'At least one field must be provided for configuration update',
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type ConfigureAgentInput = z.infer<typeof ConfigureAgentSchema>;
