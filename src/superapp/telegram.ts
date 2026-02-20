/**
 * TONAIAgent - Telegram Integration Module
 *
 * Deep integration with Telegram including bot interface, Mini App,
 * notifications, and seamless onboarding.
 *
 * Features:
 * - Telegram bot command handling
 * - Mini App initialization and context
 * - User authentication via Telegram
 * - Inline buttons and keyboards
 * - Deep linking support
 */

import type {
  TelegramIntegration,
  MiniAppContext,
  TelegramInitData,
  TelegramThemeParams,
  BotCommand,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface TelegramConfig {
  botToken?: string;
  miniAppUrl: string;
  webhookUrl?: string;
  commands: BotCommand[];
  supportedLanguages: string[];
  defaultLanguage: string;
}

// ============================================================================
// Input Types
// ============================================================================

export interface LinkTelegramInput {
  userId: string;
  telegramUserId: number;
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
}

export interface InitMiniAppInput {
  userId: string;
  initData: TelegramInitData;
  themeParams: TelegramThemeParams;
  colorScheme: 'light' | 'dark';
  platform: 'android' | 'ios' | 'web' | 'macos' | 'windows';
  version: string;
  startParam?: string;
}

export interface SendMessageInput {
  chatId: number;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyMarkup?: InlineKeyboard | ReplyKeyboard;
  disableNotification?: boolean;
}

export interface InlineKeyboard {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
  login_url?: { url: string };
}

export interface ReplyKeyboard {
  keyboard: KeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
}

export interface KeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  web_app?: { url: string };
}

export interface CommandContext {
  userId: string;
  chatId: number;
  command: string;
  args: string[];
  messageId: number;
  isPrivate: boolean;
}

export type CommandHandler = (context: CommandContext) => Promise<string | null>;

// ============================================================================
// Telegram Manager Interface
// ============================================================================

export interface TelegramManager {
  // User linking
  linkUser(input: LinkTelegramInput): Promise<TelegramIntegration>;
  unlinkUser(userId: string): Promise<void>;
  getIntegration(userId: string): Promise<TelegramIntegration | null>;
  getIntegrationByTelegramId(telegramUserId: number): Promise<TelegramIntegration | null>;
  isLinked(userId: string): Promise<boolean>;

  // Mini App
  initMiniApp(input: InitMiniAppInput): Promise<MiniAppContext>;
  validateInitData(initDataString: string): Promise<boolean>;
  getMiniAppContext(userId: string): Promise<MiniAppContext | null>;
  closeMiniApp(userId: string): Promise<void>;

  // Messaging (simulated without actual bot)
  sendMessage(input: SendMessageInput): Promise<string>;
  editMessage(chatId: number, messageId: number, text: string): Promise<void>;
  deleteMessage(chatId: number, messageId: number): Promise<void>;
  answerCallback(callbackQueryId: string, text?: string): Promise<void>;

  // Commands
  registerCommand(command: BotCommand, handler: CommandHandler): void;
  unregisterCommand(command: string): void;
  handleCommand(context: CommandContext): Promise<string | null>;
  getCommands(): BotCommand[];

  // Deep linking
  generateDeepLink(path: string, params?: Record<string, string>): string;
  parseDeepLink(startParam: string): { path: string; params: Record<string, string> };

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultTelegramManager implements TelegramManager {
  private readonly config: TelegramConfig;
  private readonly integrations = new Map<string, TelegramIntegration>();
  private readonly telegramIdToUserId = new Map<number, string>();
  private readonly miniAppContexts = new Map<string, MiniAppContext>();
  private readonly commandHandlers = new Map<string, CommandHandler>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<TelegramConfig> = {}) {
    this.config = {
      botToken: config.botToken,
      miniAppUrl: config.miniAppUrl ?? 'https://t.me/TONAIAgentBot/app',
      webhookUrl: config.webhookUrl,
      commands: config.commands ?? this.getDefaultCommands(),
      supportedLanguages: config.supportedLanguages ?? ['en', 'ru', 'zh'],
      defaultLanguage: config.defaultLanguage ?? 'en',
    };

    // Register default commands
    for (const cmd of this.config.commands) {
      this.registerCommand(cmd, this.getDefaultHandler(cmd.command));
    }
  }

  // ============================================================================
  // User Linking
  // ============================================================================

  async linkUser(input: LinkTelegramInput): Promise<TelegramIntegration> {
    // Check if telegram account is already linked to another user
    const existingUserId = this.telegramIdToUserId.get(input.telegramUserId);
    if (existingUserId && existingUserId !== input.userId) {
      throw new Error('Telegram account is already linked to another user');
    }

    const integration: TelegramIntegration = {
      userId: input.userId,
      telegramUserId: input.telegramUserId,
      chatId: input.chatId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      languageCode: input.languageCode ?? this.config.defaultLanguage,
      verified: true,
      linkedAt: new Date(),
      lastInteractionAt: new Date(),
      miniAppOpened: false,
      botInteractions: 0,
    };

    this.integrations.set(input.userId, integration);
    this.telegramIdToUserId.set(input.telegramUserId, input.userId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'wallet_connected',
      severity: 'info',
      source: 'telegram',
      userId: input.userId,
      message: 'Telegram account linked',
      data: { telegramUserId: input.telegramUserId, username: input.username },
    });

    return integration;
  }

  async unlinkUser(userId: string): Promise<void> {
    const integration = this.integrations.get(userId);
    if (integration) {
      this.telegramIdToUserId.delete(integration.telegramUserId);
      this.integrations.delete(userId);
      this.miniAppContexts.delete(userId);
    }
  }

  async getIntegration(userId: string): Promise<TelegramIntegration | null> {
    return this.integrations.get(userId) ?? null;
  }

  async getIntegrationByTelegramId(telegramUserId: number): Promise<TelegramIntegration | null> {
    const userId = this.telegramIdToUserId.get(telegramUserId);
    if (!userId) return null;
    return this.integrations.get(userId) ?? null;
  }

  async isLinked(userId: string): Promise<boolean> {
    return this.integrations.has(userId);
  }

  // ============================================================================
  // Mini App
  // ============================================================================

  async initMiniApp(input: InitMiniAppInput): Promise<MiniAppContext> {
    const context: MiniAppContext = {
      userId: input.userId,
      telegramUserId: input.initData.user.id,
      startParam: input.startParam,
      initData: input.initData,
      themeParams: input.themeParams,
      colorScheme: input.colorScheme,
      platform: input.platform,
      version: input.version,
    };

    this.miniAppContexts.set(input.userId, context);

    // Update integration
    const integration = this.integrations.get(input.userId);
    if (integration) {
      integration.miniAppOpened = true;
      integration.lastInteractionAt = new Date();
      this.integrations.set(input.userId, integration);
    }

    return context;
  }

  async validateInitData(initDataString: string): Promise<boolean> {
    // In production, validate using HMAC-SHA-256
    // For now, perform basic validation
    try {
      const params = new URLSearchParams(initDataString);
      const hash = params.get('hash');
      const authDate = params.get('auth_date');

      if (!hash || !authDate) return false;

      // Check if auth_date is not too old (5 minutes)
      const authTimestamp = parseInt(authDate, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authTimestamp > 300) return false;

      return true;
    } catch {
      return false;
    }
  }

  async getMiniAppContext(userId: string): Promise<MiniAppContext | null> {
    return this.miniAppContexts.get(userId) ?? null;
  }

  async closeMiniApp(userId: string): Promise<void> {
    this.miniAppContexts.delete(userId);
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  async sendMessage(input: SendMessageInput): Promise<string> {
    // In production, this would call the Telegram Bot API
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    // Log the message that would be sent
    console.log(`[Telegram] Sending message to ${input.chatId}: ${input.text}`);

    return messageId;
  }

  async editMessage(_chatId: number, messageId: number, text: string): Promise<void> {
    console.log(`[Telegram] Editing message ${messageId}: ${text}`);
  }

  async deleteMessage(_chatId: number, messageId: number): Promise<void> {
    console.log(`[Telegram] Deleting message ${messageId}`);
  }

  async answerCallback(callbackQueryId: string, text?: string): Promise<void> {
    console.log(`[Telegram] Answering callback ${callbackQueryId}: ${text ?? ''}`);
  }

  // ============================================================================
  // Commands
  // ============================================================================

  registerCommand(command: BotCommand, handler: CommandHandler): void {
    this.commandHandlers.set(command.command, handler);
  }

  unregisterCommand(command: string): void {
    this.commandHandlers.delete(command);
  }

  async handleCommand(context: CommandContext): Promise<string | null> {
    const handler = this.commandHandlers.get(context.command);
    if (!handler) {
      return `Unknown command: ${context.command}. Use /help to see available commands.`;
    }

    // Update interaction count
    const integration = this.integrations.get(context.userId);
    if (integration) {
      integration.botInteractions++;
      integration.lastInteractionAt = new Date();
      this.integrations.set(context.userId, integration);
    }

    return handler(context);
  }

  getCommands(): BotCommand[] {
    return [...this.config.commands];
  }

  // ============================================================================
  // Deep Linking
  // ============================================================================

  generateDeepLink(path: string, params?: Record<string, string>): string {
    const startParam = this.encodeDeepLink(path, params);
    return `${this.config.miniAppUrl}?startapp=${startParam}`;
  }

  parseDeepLink(startParam: string): { path: string; params: Record<string, string> } {
    try {
      const decoded = Buffer.from(startParam, 'base64').toString('utf-8');
      const [path, paramsStr] = decoded.split('?');
      const params: Record<string, string> = {};

      if (paramsStr) {
        const searchParams = new URLSearchParams(paramsStr);
        searchParams.forEach((value, key) => {
          params[key] = value;
        });
      }

      return { path: path ?? '', params };
    } catch {
      return { path: '', params: {} };
    }
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getDefaultCommands(): BotCommand[] {
    return [
      {
        command: 'start',
        description: 'Start the bot and open the app',
        handler: 'handleStart',
        requiresAuth: false,
        adminOnly: false,
      },
      {
        command: 'help',
        description: 'Show help message',
        handler: 'handleHelp',
        requiresAuth: false,
        adminOnly: false,
      },
      {
        command: 'wallet',
        description: 'View your wallet',
        handler: 'handleWallet',
        requiresAuth: true,
        adminOnly: false,
      },
      {
        command: 'agents',
        description: 'View your AI agents',
        handler: 'handleAgents',
        requiresAuth: true,
        adminOnly: false,
      },
      {
        command: 'portfolio',
        description: 'View your portfolio',
        handler: 'handlePortfolio',
        requiresAuth: true,
        adminOnly: false,
      },
      {
        command: 'alerts',
        description: 'View your alerts',
        handler: 'handleAlerts',
        requiresAuth: true,
        adminOnly: false,
      },
      {
        command: 'settings',
        description: 'Manage settings',
        handler: 'handleSettings',
        requiresAuth: true,
        adminOnly: false,
      },
    ];
  }

  private getDefaultHandler(command: string): CommandHandler {
    const handlers: Record<string, CommandHandler> = {
      start: async (_ctx) => {
        return `Welcome to TONAIAgent! 🤖\n\nI'm your AI-powered financial assistant on TON blockchain.\n\nOpen the app to get started: ${this.config.miniAppUrl}`;
      },
      help: async (_ctx) => {
        const commandList = this.config.commands
          .map((cmd) => `/${cmd.command} - ${cmd.description}`)
          .join('\n');
        return `Available commands:\n\n${commandList}\n\nOpen the app for full features: ${this.config.miniAppUrl}`;
      },
      wallet: async (_ctx) => {
        return `View your wallet in the app:\n${this.generateDeepLink('/wallet')}`;
      },
      agents: async (_ctx) => {
        return `Manage your AI agents in the app:\n${this.generateDeepLink('/agents')}`;
      },
      portfolio: async (_ctx) => {
        return `View your portfolio in the app:\n${this.generateDeepLink('/portfolio')}`;
      },
      alerts: async (_ctx) => {
        return `View your alerts in the app:\n${this.generateDeepLink('/alerts')}`;
      },
      settings: async (_ctx) => {
        return `Manage your settings in the app:\n${this.generateDeepLink('/settings')}`;
      },
    };

    return handlers[command] ?? (async () => `Command /${command} is not implemented yet.`);
  }

  private encodeDeepLink(path: string, params?: Record<string, string>): string {
    let url = path;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url = `${path}?${searchParams.toString()}`;
    }
    return Buffer.from(url).toString('base64').replace(/=/g, '');
  }

  private emitEvent(event: SuperAppEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTelegramManager(config?: Partial<TelegramConfig>): DefaultTelegramManager {
  return new DefaultTelegramManager(config);
}

export default DefaultTelegramManager;
