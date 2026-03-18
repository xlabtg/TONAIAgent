/**
 * TONAIAgent - Conversational AI Interface
 *
 * Users interact with agents via natural language chat.
 * Examples:
 * - "Create a yield strategy"
 * - "Allocate 100 TON to safe strategies"
 * - "Reduce risk in my portfolio"
 *
 * Powered by Groq for fast inference.
 */

import {
  ChatMessage,
  ChatMessageType,
  RichContentBlock,
  QuickReply,
  InlineAction,
  ConversationContext,
  DetectedIntent,
  IntentType,
  IntentEntity,
  UserProfile,
  PortfolioSummary,
  TransactionSummary,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Conversation AI configuration
 */
export interface ConversationConfig {
  /** AI provider */
  provider?: 'groq' | 'anthropic' | 'openai';
  /** Model to use */
  model?: string;
  /** System prompt template */
  systemPrompt?: string;
  /** Max tokens per response */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
  /** Enable intent detection */
  intentDetection?: boolean;
  /** Enable entity extraction */
  entityExtraction?: boolean;
  /** Typing indicator delay (ms) */
  typingDelay?: number;
  /** Max conversation history */
  maxHistoryLength?: number;
  /** Enable context enrichment */
  contextEnrichment?: boolean;
}

/**
 * Default system prompt for the AI assistant
 */
const DEFAULT_SYSTEM_PROMPT = `You are TONAIAgent, a friendly and knowledgeable AI assistant for autonomous finance on the TON blockchain.

Your capabilities include:
- Creating and managing trading strategies
- Portfolio analysis and optimization
- Executing swaps, transfers, and staking
- Setting up price alerts and notifications
- Explaining DeFi concepts in simple terms

Communication style:
- Be concise but helpful
- Use simple language, avoid jargon when possible
- Always confirm high-risk actions before execution
- Provide clear explanations for recommendations
- Use emojis sparingly for friendliness

When users make requests:
1. First understand their intent
2. Ask clarifying questions if needed
3. Explain what you'll do before doing it
4. Provide confirmation and next steps

Safety guidelines:
- Never share sensitive information
- Always warn about risks
- Require confirmation for transactions
- Suggest conservative options for beginners`;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ConversationConfig> = {
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  maxTokens: 1024,
  temperature: 0.7,
  intentDetection: true,
  entityExtraction: true,
  typingDelay: 500,
  maxHistoryLength: 50,
  contextEnrichment: true,
};

// ============================================================================
// Intent Patterns
// ============================================================================

/**
 * Intent patterns for detection
 */
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  create_strategy: [
    /create\s+(?:a\s+)?(?:new\s+)?strategy/i,
    /set\s+up\s+(?:a\s+)?(?:new\s+)?strategy/i,
    /start\s+(?:a\s+)?(?:new\s+)?strategy/i,
    /(?:yield|farming|trading)\s+strategy/i,
  ],
  modify_strategy: [
    /modify\s+(?:my\s+)?strategy/i,
    /change\s+(?:my\s+)?strategy/i,
    /update\s+(?:my\s+)?strategy/i,
    /adjust\s+(?:my\s+)?strategy/i,
  ],
  pause_strategy: [
    /pause\s+(?:my\s+)?strategy/i,
    /stop\s+(?:my\s+)?strategy/i,
    /halt\s+(?:my\s+)?strategy/i,
  ],
  resume_strategy: [
    /resume\s+(?:my\s+)?strategy/i,
    /restart\s+(?:my\s+)?strategy/i,
    /unpause\s+(?:my\s+)?strategy/i,
  ],
  delete_strategy: [
    /delete\s+(?:my\s+)?strategy/i,
    /remove\s+(?:my\s+)?strategy/i,
  ],
  view_portfolio: [
    /(?:show|view|check)\s+(?:my\s+)?portfolio/i,
    /(?:what's|whats)\s+(?:in\s+)?my\s+portfolio/i,
    /my\s+(?:holdings|balances?|assets?)/i,
  ],
  view_performance: [
    /(?:show|view|check)\s+(?:my\s+)?performance/i,
    /how\s+(?:am\s+i|is\s+my\s+portfolio)\s+doing/i,
    /my\s+(?:returns|gains|losses|pnl|p&l)/i,
  ],
  transfer_funds: [
    /(?:send|transfer)\s+\d+/i,
    /(?:send|transfer)\s+(?:some\s+)?(?:ton|tokens?)/i,
  ],
  swap_tokens: [
    /swap\s+\d+/i,
    /swap\s+(?:some\s+)?(?:ton|tokens?)/i,
    /(?:exchange|convert)\s+(?:my\s+)?/i,
    /buy\s+(?:some\s+)?/i,
    /sell\s+(?:some\s+)?/i,
  ],
  stake_tokens: [
    /stake\s+\d+/i,
    /stake\s+(?:some\s+)?(?:ton|tokens?)/i,
    /(?:start|begin)\s+staking/i,
  ],
  unstake_tokens: [
    /unstake\s+\d+/i,
    /unstake\s+(?:some\s+)?(?:ton|tokens?)/i,
    /(?:stop|end)\s+staking/i,
    /withdraw\s+(?:from\s+)?staking/i,
  ],
  set_alert: [
    /(?:set|create)\s+(?:an?\s+)?(?:price\s+)?alert/i,
    /alert\s+me\s+when/i,
    /notify\s+me\s+when/i,
    /let\s+me\s+know\s+when/i,
  ],
  get_help: [
    /(?:help|assist|support)/i,
    /(?:how\s+do\s+i|how\s+to|what\s+is)/i,
    /(?:explain|tell\s+me\s+about)/i,
  ],
  adjust_risk: [
    /(?:reduce|lower|decrease)\s+(?:my\s+)?risk/i,
    /(?:increase|raise)\s+(?:my\s+)?risk/i,
    /(?:make\s+it\s+)?(?:safer|more\s+conservative)/i,
    /(?:make\s+it\s+)?(?:riskier|more\s+aggressive)/i,
  ],
  view_analytics: [
    /(?:show|view|check)\s+(?:my\s+)?analytics/i,
    /(?:show|view|check)\s+(?:my\s+)?stats/i,
    /market\s+(?:data|analysis)/i,
  ],
  unknown: [],
};

/**
 * Entity extraction patterns
 */
const ENTITY_PATTERNS = {
  token: /\b(TON|USDT|USDC|NOT|DOGS|STON|stTON|tsTON)\b/gi,
  amount: /\b(\d+(?:\.\d+)?)\s*(?:TON|USDT|USDC|NOT|DOGS|tokens?)?\b/gi,
  percentage: /\b(\d+(?:\.\d+)?)\s*%/gi,
  time_period: /\b((?:\d+\s+)?(?:day|week|month|year|hour)s?)\b/gi,
  risk_level: /\b(low|medium|high|conservative|moderate|aggressive)\s*(?:risk)?\b/gi,
};

// ============================================================================
// Conversation Manager
// ============================================================================

/**
 * AI response with rich content
 */
export interface AIResponse {
  /** Response ID */
  id: string;
  /** Text content */
  text: string;
  /** Rich content blocks */
  richContent?: RichContentBlock[];
  /** Quick replies */
  quickReplies?: QuickReply[];
  /** Inline actions */
  actions?: InlineAction[];
  /** Detected intent */
  intent?: DetectedIntent;
  /** Suggested command */
  suggestedCommand?: string;
  /** Requires confirmation */
  requiresConfirmation?: boolean;
  /** Processing time (ms) */
  processingTime: number;
}

/**
 * Command execution request
 */
export interface CommandRequest {
  /** Command type */
  type: IntentType;
  /** Parameters */
  params: Record<string, unknown>;
  /** Confirmation received */
  confirmed: boolean;
  /** User message that triggered this */
  triggerMessage: string;
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Success status */
  success: boolean;
  /** Result message */
  message: string;
  /** Result data */
  data?: Record<string, unknown>;
  /** Transaction hash if applicable */
  transactionHash?: string;
  /** Error details if failed */
  error?: string;
}

/**
 * Manages conversational AI interactions
 */
export class ConversationManager {
  private readonly config: Required<ConversationConfig>;
  private readonly conversations: Map<string, Conversation> = new Map();
  private readonly commandHandlers: Map<IntentType, CommandHandler> = new Map();

  constructor(config: Partial<ConversationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultHandlers();
  }

  // ============================================================================
  // Conversation Management
  // ============================================================================

  /**
   * Start a new conversation
   */
  startConversation(userId: string, user: UserProfile): string {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const context: ConversationContext = {
      conversationId,
      user,
      activeStrategies: [],
      variables: {},
    };

    const conversation: Conversation = {
      id: conversationId,
      userId,
      context,
      messages: [],
      createdAt: new Date(),
      lastActivityAt: new Date(),
      pendingCommand: undefined,
    };

    this.conversations.set(conversationId, conversation);

    return conversationId;
  }

  /**
   * Get or create conversation for user
   */
  getOrCreateConversation(userId: string, user: UserProfile): string {
    // Find existing conversation
    for (const [id, conv] of this.conversations) {
      if (conv.userId === userId) {
        conv.lastActivityAt = new Date();
        return id;
      }
    }

    // Create new conversation
    return this.startConversation(userId, user);
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    conversationId: string,
    text: string,
    _attachments?: unknown[]
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      content: text,
      type: 'text',
      timestamp: new Date(),
      status: 'delivered',
    };

    conversation.messages.push(userMessage);
    conversation.lastActivityAt = new Date();

    // Detect intent
    let intent: DetectedIntent | undefined;
    if (this.config.intentDetection) {
      intent = this.detectIntent(text);
      conversation.context.currentIntent = intent;
    }

    // Generate response
    const response = await this.generateResponse(conversation, text, intent);

    // Create agent message
    const agentMessage: ChatMessage = {
      id: response.id,
      sender: 'agent',
      content: response.text,
      richContent: response.richContent,
      type: this.getMessageType(intent),
      quickReplies: response.quickReplies,
      actions: response.actions,
      timestamp: new Date(),
      status: 'delivered',
    };

    conversation.messages.push(agentMessage);

    // Store pending command if confirmation required
    if (response.requiresConfirmation && intent) {
      conversation.pendingCommand = {
        type: intent.type,
        params: this.extractCommandParams(text, intent),
        confirmed: false,
        triggerMessage: text,
      };
    }

    response.processingTime = Date.now() - startTime;
    return response;
  }

  /**
   * Confirm pending command
   */
  async confirmCommand(conversationId: string): Promise<CommandResult> {
    const conversation = this.conversations.get(conversationId);

    if (!conversation || !conversation.pendingCommand) {
      return {
        success: false,
        message: 'No pending command to confirm',
        error: 'NO_PENDING_COMMAND',
      };
    }

    const command = conversation.pendingCommand;
    conversation.pendingCommand = undefined;

    // Execute command
    const handler = this.commandHandlers.get(command.type);
    if (!handler) {
      return {
        success: false,
        message: `No handler for command type: ${command.type}`,
        error: 'NO_HANDLER',
      };
    }

    return handler(command, conversation.context);
  }

  /**
   * Cancel pending command
   */
  cancelCommand(conversationId: string): boolean {
    const conversation = this.conversations.get(conversationId);

    if (!conversation || !conversation.pendingCommand) {
      return false;
    }

    conversation.pendingCommand = undefined;
    return true;
  }

  /**
   * Get conversation history
   */
  getHistory(conversationId: string, limit?: number): ChatMessage[] {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return [];
    }

    const messages = conversation.messages;
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * Update conversation context
   */
  updateContext(
    conversationId: string,
    updates: Partial<ConversationContext>
  ): void {
    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      Object.assign(conversation.context, updates);
    }
  }

  /**
   * Enrich context with portfolio data
   */
  enrichContext(
    conversationId: string,
    portfolio?: PortfolioSummary,
    transactions?: TransactionSummary[]
  ): void {
    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      if (portfolio) {
        conversation.context.portfolioSummary = portfolio;
      }
      if (transactions) {
        conversation.context.recentTransactions = transactions;
      }
    }
  }

  // ============================================================================
  // Intent Detection
  // ============================================================================

  /**
   * Detect user intent from message
   */
  detectIntent(text: string): DetectedIntent {
    let bestMatch: { type: IntentType; confidence: number } = {
      type: 'unknown',
      confidence: 0,
    };

    // Check each intent pattern
    for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          const confidence = this.calculateConfidence(text, pattern);
          if (confidence > bestMatch.confidence) {
            bestMatch = { type: intentType as IntentType, confidence };
          }
        }
      }
    }

    // Extract entities
    const entities = this.extractEntities(text);

    // Determine suggested action
    const suggestedAction = this.getSuggestedAction(bestMatch.type, entities);

    return {
      type: bestMatch.type,
      confidence: bestMatch.confidence,
      entities,
      suggestedAction,
    };
  }

  /**
   * Extract entities from text
   */
  extractEntities(text: string): IntentEntity[] {
    const entities: IntentEntity[] = [];

    // Extract tokens
    const tokenMatches = text.matchAll(ENTITY_PATTERNS.token);
    for (const match of tokenMatches) {
      entities.push({
        type: 'token',
        value: match[1].toUpperCase(),
        confidence: 0.95,
      });
    }

    // Extract amounts
    const amountMatches = text.matchAll(ENTITY_PATTERNS.amount);
    for (const match of amountMatches) {
      entities.push({
        type: 'amount',
        value: parseFloat(match[1]),
        confidence: 0.9,
      });
    }

    // Extract percentages
    const percentMatches = text.matchAll(ENTITY_PATTERNS.percentage);
    for (const match of percentMatches) {
      entities.push({
        type: 'percentage',
        value: parseFloat(match[1]),
        confidence: 0.95,
      });
    }

    // Extract time periods
    const timeMatches = text.matchAll(ENTITY_PATTERNS.time_period);
    for (const match of timeMatches) {
      entities.push({
        type: 'time_period',
        value: match[1],
        confidence: 0.85,
      });
    }

    // Extract risk levels
    const riskMatches = text.matchAll(ENTITY_PATTERNS.risk_level);
    for (const match of riskMatches) {
      entities.push({
        type: 'risk_level',
        value: match[1].toLowerCase(),
        confidence: 0.9,
      });
    }

    return entities;
  }

  // ============================================================================
  // Response Generation
  // ============================================================================

  /**
   * Generate AI response
   */
  private async generateResponse(
    conversation: Conversation,
    userText: string,
    intent?: DetectedIntent
  ): Promise<AIResponse> {
    const responseId = `resp_${Date.now()}`;

    // For high-confidence intents, generate structured response
    if (intent && intent.confidence > 0.7) {
      return this.generateIntentResponse(responseId, conversation, userText, intent);
    }

    // For low-confidence or unknown intents, generate conversational response
    return this.generateConversationalResponse(responseId, conversation, userText);
  }

  /**
   * Generate response for detected intent
   */
  private generateIntentResponse(
    responseId: string,
    conversation: Conversation,
    userText: string,
    intent: DetectedIntent
  ): AIResponse {
    const user = conversation.context.user;
    const entities = intent.entities;

    switch (intent.type) {
      case 'create_strategy':
        return this.createStrategyResponse(responseId, entities, user);

      case 'view_portfolio':
        return this.viewPortfolioResponse(responseId, conversation.context);

      case 'swap_tokens':
        return this.swapTokensResponse(responseId, entities, user);

      case 'stake_tokens':
        return this.stakeTokensResponse(responseId, entities, user);

      case 'transfer_funds':
        return this.transferFundsResponse(responseId, entities, user);

      case 'set_alert':
        return this.setAlertResponse(responseId, entities, user);

      case 'adjust_risk':
        return this.adjustRiskResponse(responseId, entities, user);

      case 'get_help':
        return this.helpResponse(responseId, userText, user);

      default:
        return this.generateConversationalResponse(responseId, conversation, userText);
    }
  }

  /**
   * Generate conversational response
   */
  private generateConversationalResponse(
    responseId: string,
    conversation: Conversation,
    userText: string
  ): AIResponse {
    // In production, this would call the AI provider
    // For now, generate helpful fallback responses

    const user = conversation.context.user;

    // Check for common questions
    if (userText.toLowerCase().includes('hello') || userText.toLowerCase().includes('hi')) {
      return {
        id: responseId,
        text: `Hey ${user.displayName}! How can I help you today? You can ask me to check your portfolio, create strategies, swap tokens, or anything else related to your TON finances.`,
        quickReplies: [
          { id: 'qr1', text: 'Check portfolio', icon: '📊', payload: 'show my portfolio' },
          { id: 'qr2', text: 'Create strategy', icon: '📈', payload: 'create a strategy' },
          { id: 'qr3', text: 'Swap tokens', icon: '🔄', payload: 'swap tokens' },
        ],
        processingTime: 0,
      };
    }

    // Default response
    return {
      id: responseId,
      text: `I understand you're asking about "${userText}". Could you tell me more about what you'd like to do? I can help you with portfolio management, trading strategies, swaps, staking, and more.`,
      quickReplies: [
        { id: 'qr1', text: 'Show portfolio', icon: '📊', payload: 'show my portfolio' },
        { id: 'qr2', text: 'Get help', icon: '❓', payload: 'help' },
      ],
      processingTime: 0,
    };
  }

  // ============================================================================
  // Intent-Specific Responses
  // ============================================================================

  private createStrategyResponse(
    responseId: string,
    entities: IntentEntity[],
    _user: UserProfile
  ): AIResponse {
    const riskLevel = entities.find((e) => e.type === 'risk_level')?.value as string;
    const amount = entities.find((e) => e.type === 'amount')?.value as number;

    let text = "I'd love to help you create a new strategy! Let me understand your goals better.";

    const quickReplies: QuickReply[] = [
      { id: 'qr1', text: 'Yield farming', icon: '🌾', payload: 'yield farming strategy' },
      { id: 'qr2', text: 'DCA', icon: '📅', payload: 'DCA strategy' },
      { id: 'qr3', text: 'Grid trading', icon: '📊', payload: 'grid trading strategy' },
      { id: 'qr4', text: 'Custom', icon: '🛠️', payload: 'custom strategy' },
    ];

    if (riskLevel) {
      text = `Great! You want a ${riskLevel} risk strategy. What type of strategy are you interested in?`;
    }

    if (amount) {
      text += ` I see you want to allocate ${amount} TON.`;
    }

    return {
      id: responseId,
      text,
      quickReplies,
      intent: { type: 'create_strategy', confidence: 0.9, entities },
      processingTime: 0,
    };
  }

  private viewPortfolioResponse(
    responseId: string,
    context: ConversationContext
  ): AIResponse {
    const portfolio = context.portfolioSummary;

    if (!portfolio) {
      return {
        id: responseId,
        text: "I'm fetching your portfolio data. One moment please...",
        richContent: [
          {
            type: 'progress',
            content: { loading: true, message: 'Loading portfolio...' },
          },
        ],
        processingTime: 0,
      };
    }

    const changeEmoji = portfolio.change24h >= 0 ? '📈' : '📉';
    const changeSign = portfolio.change24h >= 0 ? '+' : '';

    return {
      id: responseId,
      text: `Here's your portfolio overview ${changeEmoji}`,
      richContent: [
        {
          type: 'card',
          content: {
            title: 'Portfolio Summary',
            fields: [
              { label: 'Total Value', value: `${portfolio.totalValueTON.toFixed(2)} TON` },
              { label: 'USD Value', value: `$${portfolio.totalValueUSD.toFixed(2)}` },
              { label: '24h Change', value: `${changeSign}${portfolio.change24h.toFixed(2)}%` },
              { label: 'Active Strategies', value: portfolio.activeStrategies.toString() },
            ],
          },
        },
      ],
      quickReplies: [
        { id: 'qr1', text: 'View details', icon: '📋', payload: 'show portfolio details' },
        { id: 'qr2', text: 'Performance', icon: '📊', payload: 'show performance' },
        { id: 'qr3', text: 'Transactions', icon: '📝', payload: 'show recent transactions' },
      ],
      processingTime: 0,
    };
  }

  private swapTokensResponse(
    responseId: string,
    entities: IntentEntity[],
    _user: UserProfile
  ): AIResponse {
    const amount = entities.find((e) => e.type === 'amount')?.value as number;
    const tokens = entities.filter((e) => e.type === 'token').map((e) => e.value as string);

    let text = "I'll help you swap tokens. ";

    if (amount && tokens.length >= 2) {
      text = `You want to swap ${amount} ${tokens[0]} for ${tokens[1]}. Let me get you the best rate.`;
      return {
        id: responseId,
        text,
        richContent: [
          {
            type: 'card',
            content: {
              title: 'Swap Preview',
              fields: [
                { label: 'You send', value: `${amount} ${tokens[0]}` },
                { label: 'You receive', value: `~${(amount * 0.98).toFixed(2)} ${tokens[1]}` },
                { label: 'Rate', value: '1:1 (estimated)' },
                { label: 'Fee', value: '0.3%' },
              ],
            },
          },
        ],
        actions: [
          {
            id: 'confirm',
            text: 'Confirm Swap',
            type: 'primary',
            action: 'confirm_swap',
            requiresConfirmation: true,
          },
          {
            id: 'cancel',
            text: 'Cancel',
            type: 'secondary',
            action: 'cancel',
          },
        ],
        requiresConfirmation: true,
        processingTime: 0,
      };
    }

    if (amount) {
      text += `You want to swap ${amount} tokens. Which tokens would you like to swap?`;
    } else {
      text += 'What tokens would you like to swap and how much?';
    }

    return {
      id: responseId,
      text,
      quickReplies: [
        { id: 'qr1', text: 'TON → USDT', icon: '💵', payload: 'swap TON to USDT' },
        { id: 'qr2', text: 'USDT → TON', icon: '💎', payload: 'swap USDT to TON' },
        { id: 'qr3', text: 'Other', icon: '🔄', payload: 'swap other tokens' },
      ],
      processingTime: 0,
    };
  }

  private stakeTokensResponse(
    responseId: string,
    entities: IntentEntity[],
    _user: UserProfile
  ): AIResponse {
    const amount = entities.find((e) => e.type === 'amount')?.value as number;

    let text = "I'll help you stake your TON for rewards. ";

    if (amount) {
      text = `You want to stake ${amount} TON. Here are the best staking options:`;
      return {
        id: responseId,
        text,
        richContent: [
          {
            type: 'table',
            content: {
              headers: ['Pool', 'APY', 'Lock Period', 'Min Stake'],
              rows: [
                ['TON Whales', '5.2%', 'None', '10 TON'],
                ['Bemo', '5.0%', 'None', '1 TON'],
                ['TON Validators', '4.8%', '24h', '50 TON'],
              ],
            },
          },
        ],
        actions: [
          {
            id: 'stake_whales',
            text: 'Stake with TON Whales',
            type: 'primary',
            action: 'stake_whales',
            requiresConfirmation: true,
          },
          {
            id: 'stake_bemo',
            text: 'Stake with Bemo',
            type: 'secondary',
            action: 'stake_bemo',
            requiresConfirmation: true,
          },
        ],
        requiresConfirmation: true,
        processingTime: 0,
      };
    }

    text += 'How much TON would you like to stake?';

    return {
      id: responseId,
      text,
      quickReplies: [
        { id: 'qr1', text: '10 TON', icon: '💎', payload: 'stake 10 TON' },
        { id: 'qr2', text: '50 TON', icon: '💎', payload: 'stake 50 TON' },
        { id: 'qr3', text: '100 TON', icon: '💎', payload: 'stake 100 TON' },
        { id: 'qr4', text: 'Custom', icon: '✏️', payload: 'stake custom amount' },
      ],
      processingTime: 0,
    };
  }

  private transferFundsResponse(
    responseId: string,
    entities: IntentEntity[],
    _user: UserProfile
  ): AIResponse {
    const amount = entities.find((e) => e.type === 'amount')?.value as number;
    const token = entities.find((e) => e.type === 'token')?.value as string ?? 'TON';

    if (amount) {
      return {
        id: responseId,
        text: `You want to send ${amount} ${token}. Please provide the recipient address or select from your contacts.`,
        quickReplies: [
          { id: 'qr1', text: 'Paste address', icon: '📋', payload: 'enter address' },
          { id: 'qr2', text: 'Contacts', icon: '👥', payload: 'show contacts' },
          { id: 'qr3', text: 'Scan QR', icon: '📷', payload: 'scan qr' },
        ],
        processingTime: 0,
      };
    }

    return {
      id: responseId,
      text: 'How much would you like to send?',
      quickReplies: [
        { id: 'qr1', text: '10 TON', icon: '💎', payload: 'send 10 TON' },
        { id: 'qr2', text: '50 TON', icon: '💎', payload: 'send 50 TON' },
        { id: 'qr3', text: 'Custom', icon: '✏️', payload: 'send custom amount' },
      ],
      processingTime: 0,
    };
  }

  private setAlertResponse(
    responseId: string,
    entities: IntentEntity[],
    _user: UserProfile
  ): AIResponse {
    const token = entities.find((e) => e.type === 'token')?.value as string ?? 'TON';
    const amount = entities.find((e) => e.type === 'amount')?.value as number;

    if (amount) {
      return {
        id: responseId,
        text: `I'll set an alert for when ${token} reaches ${amount}. Should I notify you when it goes above or below this price?`,
        quickReplies: [
          { id: 'qr1', text: 'Above', icon: '📈', payload: `alert ${token} above ${amount}` },
          { id: 'qr2', text: 'Below', icon: '📉', payload: `alert ${token} below ${amount}` },
          { id: 'qr3', text: 'Both', icon: '🔔', payload: `alert ${token} both ${amount}` },
        ],
        processingTime: 0,
      };
    }

    return {
      id: responseId,
      text: `What price would you like me to alert you at for ${token}?`,
      processingTime: 0,
    };
  }

  private adjustRiskResponse(
    responseId: string,
    entities: IntentEntity[],
    _user: UserProfile
  ): AIResponse {
    const riskLevel = entities.find((e) => e.type === 'risk_level')?.value as string;

    if (riskLevel) {
      return {
        id: responseId,
        text: `I'll adjust your portfolio to a ${riskLevel} risk profile. This will rebalance your strategies accordingly.`,
        richContent: [
          {
            type: 'card',
            content: {
              title: 'Risk Adjustment Preview',
              fields: [
                { label: 'Current Risk', value: 'Medium' },
                { label: 'New Risk', value: riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) },
                { label: 'Affected Strategies', value: '3' },
              ],
            },
          },
        ],
        actions: [
          {
            id: 'confirm',
            text: 'Confirm Adjustment',
            type: 'primary',
            action: 'confirm_risk_adjust',
            requiresConfirmation: true,
          },
          {
            id: 'cancel',
            text: 'Cancel',
            type: 'secondary',
            action: 'cancel',
          },
        ],
        requiresConfirmation: true,
        processingTime: 0,
      };
    }

    return {
      id: responseId,
      text: 'What risk level would you prefer?',
      quickReplies: [
        { id: 'qr1', text: 'Conservative', icon: '🛡️', payload: 'set low risk' },
        { id: 'qr2', text: 'Moderate', icon: '⚖️', payload: 'set medium risk' },
        { id: 'qr3', text: 'Aggressive', icon: '🚀', payload: 'set high risk' },
      ],
      processingTime: 0,
    };
  }

  private helpResponse(
    responseId: string,
    query: string,
    user: UserProfile
  ): AIResponse {
    const lowerQuery = query.toLowerCase();

    // Topic-specific help
    if (lowerQuery.includes('strategy')) {
      return {
        id: responseId,
        text: 'Strategies are automated trading plans that execute based on your rules. You can create simple DCA strategies, yield farming setups, or complex multi-step workflows.',
        quickReplies: [
          { id: 'qr1', text: 'Create strategy', icon: '📈', payload: 'create a strategy' },
          { id: 'qr2', text: 'View templates', icon: '📋', payload: 'show strategy templates' },
          { id: 'qr3', text: 'More help', icon: '❓', payload: 'help' },
        ],
        processingTime: 0,
      };
    }

    if (lowerQuery.includes('swap') || lowerQuery.includes('trade')) {
      return {
        id: responseId,
        text: "Swapping lets you exchange one token for another. Just tell me what you want to swap and how much, and I'll find you the best rate.",
        quickReplies: [
          { id: 'qr1', text: 'Swap now', icon: '🔄', payload: 'swap tokens' },
          { id: 'qr2', text: 'More help', icon: '❓', payload: 'help' },
        ],
        processingTime: 0,
      };
    }

    // General help
    return {
      id: responseId,
      text: `Hi ${user.displayName}! I'm your TONAIAgent assistant. Here's what I can help you with:`,
      richContent: [
        {
          type: 'table',
          content: {
            headers: ['Command', 'Description'],
            rows: [
              ['Portfolio', 'View your holdings and performance'],
              ['Strategies', 'Create and manage trading strategies'],
              ['Swap', 'Exchange tokens at the best rates'],
              ['Stake', 'Earn rewards by staking TON'],
              ['Send', 'Transfer tokens to others'],
              ['Alerts', 'Set price notifications'],
            ],
          },
        },
      ],
      quickReplies: [
        { id: 'qr1', text: 'Portfolio', icon: '📊', payload: 'show portfolio' },
        { id: 'qr2', text: 'Strategies', icon: '📈', payload: 'show strategies' },
        { id: 'qr3', text: 'Swap', icon: '🔄', payload: 'swap tokens' },
      ],
      processingTime: 0,
    };
  }

  // ============================================================================
  // Command Handlers
  // ============================================================================

  /**
   * Register a command handler
   */
  registerCommandHandler(intentType: IntentType, handler: CommandHandler): void {
    this.commandHandlers.set(intentType, handler);
  }

  /**
   * Register default command handlers
   */
  private registerDefaultHandlers(): void {
    // Default handlers that return simulated results
    // In production, these would connect to actual services

    this.commandHandlers.set('swap_tokens', async (_command) => ({
      success: true,
      message: 'Swap executed successfully',
      data: { executedAt: new Date().toISOString() },
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    }));

    this.commandHandlers.set('stake_tokens', async (_command) => ({
      success: true,
      message: 'Tokens staked successfully',
      data: { stakedAt: new Date().toISOString() },
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    }));

    this.commandHandlers.set('transfer_funds', async (_command) => ({
      success: true,
      message: 'Transfer completed',
      data: { transferredAt: new Date().toISOString() },
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    }));
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private calculateConfidence(text: string, pattern: RegExp): number {
    const match = text.match(pattern);
    if (!match) return 0;

    // Base confidence on match quality
    const matchLength = match[0].length;
    const textLength = text.length;
    const ratio = matchLength / textLength;

    // Higher confidence for longer, more specific matches
    return Math.min(0.5 + ratio * 0.5, 0.95);
  }

  private getSuggestedAction(intentType: IntentType, _entities: IntentEntity[]): string | undefined {
    const actionMap: Record<IntentType, string | undefined> = {
      create_strategy: 'open_strategy_builder',
      modify_strategy: 'open_strategy_editor',
      pause_strategy: 'pause_strategy',
      resume_strategy: 'resume_strategy',
      delete_strategy: 'delete_strategy',
      view_portfolio: 'open_portfolio',
      view_performance: 'open_analytics',
      transfer_funds: 'open_transfer',
      swap_tokens: 'open_swap',
      stake_tokens: 'open_staking',
      unstake_tokens: 'open_unstaking',
      set_alert: 'create_alert',
      get_help: 'show_help',
      adjust_risk: 'open_risk_settings',
      view_analytics: 'open_analytics',
      unknown: undefined,
    };

    return actionMap[intentType];
  }

  private getMessageType(intent?: DetectedIntent): ChatMessageType {
    if (!intent || intent.type === 'unknown') {
      return 'text';
    }

    const typeMap: Partial<Record<IntentType, ChatMessageType>> = {
      create_strategy: 'strategy_suggestion',
      swap_tokens: 'transaction_request',
      stake_tokens: 'transaction_request',
      transfer_funds: 'transaction_request',
      get_help: 'text',
    };

    return typeMap[intent.type] ?? 'text';
  }

  private extractCommandParams(
    _text: string,
    intent: DetectedIntent
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    for (const entity of intent.entities) {
      params[entity.type] = entity.value;
    }

    return params;
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Internal conversation state
 */
interface Conversation {
  id: string;
  userId: string;
  context: ConversationContext;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivityAt: Date;
  pendingCommand?: CommandRequest;
}

/**
 * Command handler function type
 */
export type CommandHandler = (
  command: CommandRequest,
  context: ConversationContext
) => Promise<CommandResult>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a ConversationManager with default configuration
 */
export function createConversationManager(
  config?: Partial<ConversationConfig>
): ConversationManager {
  return new ConversationManager(config);
}

/**
 * Get default conversation configuration
 */
export function getDefaultConversationConfig(): Required<ConversationConfig> {
  return { ...DEFAULT_CONFIG };
}
