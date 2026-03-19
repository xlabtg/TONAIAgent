/**
 * TONAIAgent - Authentication & Authorization Service
 *
 * Unified auth layer for the multi-user platform:
 * - Telegram Mini App authentication via HMAC-SHA256 initData verification
 * - API key creation, validation, and revocation
 * - RBAC permission enforcement via AuthService.check()
 * - Audit logging for all access decisions
 *
 * Issue #271: Multi-User Accounts, RBAC & API Key System
 *
 * @example
 * ```typescript
 * import { createAuthService, createApiKeyService } from '@tonaiagent/services/auth';
 * import { createUserManager } from '@tonaiagent/core/user';
 *
 * const userManager = createUserManager();
 * const apiKeyService = createApiKeyService(userManager);
 * const authService = createAuthService(userManager, apiKeyService);
 *
 * // Telegram auth — auto-creates user on first login
 * const ctx = authService.authenticateTelegram({ initData, botToken });
 *
 * // API key auth
 * const ctx = authService.authenticateApiKey({ rawKey: 'tonai_...', requiredScope: 'agent:execute' });
 *
 * // RBAC check
 * const { allowed } = authService.check(ctx, 'agent:execute', agentId);
 * if (!allowed) throw new Error('Forbidden');
 * ```
 */

export type { AuthContext, AuthSource, TelegramAuthInput, ApiKeyAuthInput, CheckResult } from './auth-service';
export { AuthService, createAuthService } from './auth-service';
export { ApiKeyService, createApiKeyService } from './api-key';
