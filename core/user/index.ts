/**
 * TONAIAgent - User Module
 *
 * Multi-user management: user profiles, Telegram-native auto-creation,
 * and audit trail for all user lifecycle events.
 *
 * Issue #271: Multi-User Accounts, RBAC & API Key System
 *
 * @example
 * ```typescript
 * import { createUserManager } from '@tonaiagent/core/user';
 *
 * const userManager = createUserManager();
 *
 * // Auto-create or find a Telegram user
 * const { user, created } = userManager.findOrCreateTelegramUser('123456789', 'alice');
 *
 * // Create a user with email
 * const adminUser = userManager.createUser({
 *   email: 'admin@example.com',
 *   role: 'admin',
 * });
 *
 * // Suspend a user
 * userManager.suspendUser(user.id, adminUser.id);
 * ```
 */

export type {
  User,
  UserRole,
  UserStatus,
  UserMetadata,
  CreateUserInput,
  UpdateUserInput,
  ApiKey,
  ApiKeyScope,
  ApiKeyStatus,
  CreateApiKeyInput,
  CreateApiKeyResult,
  ValidateApiKeyResult,
  UserSession,
  AuditRecord,
  AuditAction,
  UserEvent,
  UserEventType,
  UserEventCallback,
} from './types';

export { UserManager, createUserManager } from './user-manager';
