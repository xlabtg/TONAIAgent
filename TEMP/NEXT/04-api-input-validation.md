# Task: Implement Comprehensive API Input Validation

**Priority:** HIGH  
**Effort:** ~1 week  
**Related Issue:** #304

## Problem

The API layer (`services/api/`) lacks centralized input validation, rate limiting, and sanitization. `services/api/index.ts` is a minimal stub re-exporting from control module with no validation middleware documented.

## Acceptance Criteria

- [ ] Add schema validation middleware using `zod` for all API endpoints
- [ ] Enforce request body size limits (prevent memory exhaustion)
- [ ] Add rate limiting per user/IP using `express-rate-limit` or equivalent
- [ ] Add CSRF token validation for state-mutating endpoints
- [ ] Sanitize all string inputs to prevent XSS
- [ ] Validate Content-Type headers
- [ ] Add request timeout middleware
- [ ] Log rejected requests with reason (but not request body to avoid sensitive data logging)

## Implementation

### 1. Schema Validation Middleware

```typescript
// services/api/middleware/validate.ts
import { z } from 'zod';

export const CreateAgentSchema = z.object({
  userId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  strategy: z.enum(['trend', 'arbitrage', 'ai_signal']),
  budgetTon: z.number().positive().max(1_000_000),
  riskLevel: z.enum(['low', 'medium', 'high']),
});
```

### 2. Rate Limiting

```typescript
// services/api/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const tradeRateLimit = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,  // Max 10 trade actions per minute
});
```

### 3. Request Size Limits

```typescript
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
```

## Files to Create/Modify

- `services/api/middleware/validate.ts` — zod schema validation
- `services/api/middleware/rate-limit.ts` — rate limiting
- `services/api/middleware/security-headers.ts` — helmet.js integration
- `services/api/schemas/` — zod schemas per endpoint group
- `services/api/index.ts` — wire up middleware
- `tests/api/validation.test.ts` — validation tests

## Dependencies to Add

```json
{
  "zod": "^3.22.0",
  "express-rate-limit": "^7.0.0",
  "helmet": "^7.0.0"
}
```
