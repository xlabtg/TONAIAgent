/**
 * TONAIAgent - AI Financial Assistant
 *
 * AI-powered financial assistant that helps users with portfolio advice,
 * savings planning, goal setting, and financial insights through natural
 * language conversation.
 */

import {
  AIAssistantConfig,
  AIConversation,
  AIMessage,
  ConversationContext,
  ConversationInsight,
  SuggestedAction,
  UserProfile,
  AssistantPersonality,
  MessageIntent,
  MessageEntity,
  PersonalFinanceEvent,
  PersonalFinanceEventCallback,
} from './types';

// ============================================================================
// AI Assistant Manager Interface
// ============================================================================

export interface AIAssistantManager {
  readonly config: AIAssistantConfig;

  // Conversation management
  startConversation(userId: string, context?: Partial<ConversationContext>): Promise<AIConversation>;
  sendMessage(conversationId: string, message: string): Promise<AIAssistantResponse>;
  getConversation(conversationId: string): Promise<AIConversation | null>;
  getConversationHistory(userId: string, limit?: number): Promise<AIConversation[]>;
  endConversation(conversationId: string): Promise<void>;

  // Insights and suggestions
  generateInsights(userId: string, profile: UserProfile): Promise<ConversationInsight[]>;
  suggestActions(userId: string, context: ConversationContext): Promise<SuggestedAction[]>;
  executeAction(actionId: string, userId: string, confirmation: boolean): Promise<ActionExecutionResult>;

  // Intent understanding
  analyzeIntent(message: string): Promise<IntentAnalysis>;
  extractEntities(message: string): Promise<MessageEntity[]>;

  // Configuration
  updateConfig(config: Partial<AIAssistantConfig>): void;

  // Events
  onEvent(callback: PersonalFinanceEventCallback): void;
}

export interface AIAssistantResponse {
  message: AIMessage;
  insights: ConversationInsight[];
  suggestedActions: SuggestedAction[];
  followUpQuestions?: string[];
  confidence: number;
}

export interface ActionExecutionResult {
  success: boolean;
  actionId: string;
  result?: Record<string, unknown>;
  error?: string;
  nextSteps?: string[];
}

export interface IntentAnalysis {
  primaryIntent: MessageIntent;
  secondaryIntents: MessageIntent[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'anxious';
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultAIAssistantManager implements AIAssistantManager {
  private _config: AIAssistantConfig;
  private readonly conversations: Map<string, AIConversation> = new Map();
  private readonly userConversations: Map<string, string[]> = new Map();
  private readonly pendingActions: Map<string, SuggestedAction> = new Map();
  private readonly eventCallbacks: PersonalFinanceEventCallback[] = [];

  constructor(config?: Partial<AIAssistantConfig>) {
    this._config = {
      enabled: true,
      primaryProvider: 'groq',
      personality: 'friendly',
      capabilities: [
        'portfolio_advice',
        'savings_planning',
        'goal_setting',
        'market_insights',
        'risk_assessment',
        'education',
        'behavioral_coaching',
        'transaction_assistance',
      ],
      constraints: {
        maxSuggestionAmount: 10000,
        requireConfirmation: true,
        riskLevelLimit: 'aggressive',
        allowedAssetClasses: ['crypto', 'stablecoins', 'defi_yield', 'liquid_staking', 'lending', 'cash'],
      },
      conversationMemory: true,
      proactiveInsights: true,
      ...config,
    };
  }

  get config(): AIAssistantConfig {
    return this._config;
  }

  async startConversation(
    userId: string,
    context?: Partial<ConversationContext>
  ): Promise<AIConversation> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const conversation: AIConversation = {
      id: conversationId,
      userId,
      messages: [],
      context: {
        currentTopic: context?.currentTopic,
        userSentiment: context?.userSentiment ?? 'neutral',
        urgencyLevel: context?.urgencyLevel ?? 'low',
        relevantGoals: context?.relevantGoals ?? [],
        recentActivity: context?.recentActivity ?? [],
      },
      insights: [],
      actions: [],
      startedAt: new Date(),
      lastMessageAt: new Date(),
    };

    // Add system message with assistant context
    const systemMessage: AIMessage = {
      id: `msg_${Date.now()}_sys`,
      role: 'system',
      content: this.buildSystemPrompt(),
      timestamp: new Date(),
    };
    conversation.messages.push(systemMessage);

    // Add welcome message
    const welcomeMessage: AIMessage = {
      id: `msg_${Date.now()}_welcome`,
      role: 'assistant',
      content: this.generateWelcomeMessage(),
      timestamp: new Date(),
      confidence: 1.0,
    };
    conversation.messages.push(welcomeMessage);

    this.conversations.set(conversationId, conversation);

    // Track user conversations
    const userConvs = this.userConversations.get(userId) ?? [];
    userConvs.push(conversationId);
    this.userConversations.set(userId, userConvs);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'ai_interaction',
      userId,
      action: 'conversation_started',
      resource: 'ai_conversation',
      resourceId: conversationId,
      details: { context },
      metadata: {},
    });

    return conversation;
  }

  async sendMessage(conversationId: string, message: string): Promise<AIAssistantResponse> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Analyze user message
    const intentAnalysis = await this.analyzeIntent(message);
    const entities = await this.extractEntities(message);

    // Add user message
    const userMessage: AIMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: message,
      timestamp: new Date(),
      intent: intentAnalysis.primaryIntent,
      entities,
      confidence: intentAnalysis.confidence,
    };
    conversation.messages.push(userMessage);

    // Update conversation context
    conversation.context.userSentiment = intentAnalysis.sentiment;
    conversation.context.urgencyLevel = intentAnalysis.urgency;
    if (intentAnalysis.primaryIntent.type) {
      conversation.context.currentTopic = intentAnalysis.primaryIntent.type;
    }

    // Generate response based on intent
    const response = await this.generateResponse(conversation, intentAnalysis);

    // Add assistant message
    const assistantMessage: AIMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      confidence: response.confidence,
    };
    conversation.messages.push(assistantMessage);
    conversation.lastMessageAt = new Date();

    // Generate insights if relevant
    const insights = this.generateConversationInsights(conversation, intentAnalysis);
    conversation.insights.push(...insights);

    // Suggest actions based on conversation
    const suggestedActions = this.generateSuggestedActions(conversation, intentAnalysis);
    for (const action of suggestedActions) {
      this.pendingActions.set(action.id, action);
    }
    conversation.actions = suggestedActions;

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'ai_interaction',
      userId: conversation.userId,
      action: 'message_sent',
      resource: 'ai_conversation',
      resourceId: conversationId,
      details: {
        intent: intentAnalysis.primaryIntent.type,
        sentiment: intentAnalysis.sentiment,
        actionsGenerated: suggestedActions.length,
      },
      metadata: {},
    });

    return {
      message: assistantMessage,
      insights,
      suggestedActions,
      followUpQuestions: this.generateFollowUpQuestions(intentAnalysis),
      confidence: response.confidence,
    };
  }

  async getConversation(conversationId: string): Promise<AIConversation | null> {
    return this.conversations.get(conversationId) ?? null;
  }

  async getConversationHistory(userId: string, limit: number = 10): Promise<AIConversation[]> {
    const conversationIds = this.userConversations.get(userId) ?? [];
    const conversations: AIConversation[] = [];

    for (const id of conversationIds.slice(-limit)) {
      const conv = this.conversations.get(id);
      if (conv) {
        conversations.push(conv);
      }
    }

    return conversations;
  }

  async endConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'ai_interaction',
        userId: conversation.userId,
        action: 'conversation_ended',
        resource: 'ai_conversation',
        resourceId: conversationId,
        details: {
          messageCount: conversation.messages.length,
          duration: Date.now() - conversation.startedAt.getTime(),
        },
        metadata: {},
      });
    }
  }

  async generateInsights(_userId: string, profile: UserProfile): Promise<ConversationInsight[]> {
    const insights: ConversationInsight[] = [];

    // Financial health insights
    const savingsRate = (profile.monthlyIncome - profile.monthlyExpenses) / profile.monthlyIncome;
    if (savingsRate < 0.1) {
      insights.push({
        type: 'savings_rate',
        message: 'Your savings rate is below 10%. Consider reviewing your expenses to increase savings.',
        importance: 'high',
        actionable: true,
      });
    } else if (savingsRate >= 0.2) {
      insights.push({
        type: 'savings_rate',
        message: 'Great job! Your savings rate is above 20%. You\'re on track for financial growth.',
        importance: 'medium',
        actionable: false,
      });
    }

    // Net worth insights
    const netWorth = profile.totalAssets - profile.totalLiabilities;
    if (netWorth < 0) {
      insights.push({
        type: 'net_worth',
        message: 'Your liabilities exceed your assets. Focus on debt reduction strategies.',
        importance: 'high',
        actionable: true,
      });
    }

    // Life stage insights
    const lifeStageInsights = this.getLifeStageInsights(profile.lifeStage);
    insights.push(...lifeStageInsights);

    // Risk alignment insights
    const riskInsight = this.getRiskAlignmentInsight(profile);
    if (riskInsight) {
      insights.push(riskInsight);
    }

    return insights;
  }

  async suggestActions(_userId: string, context: ConversationContext): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = [];

    // Emergency fund action
    if (context.urgencyLevel === 'high' && context.userSentiment === 'anxious') {
      actions.push({
        id: `action_${Date.now()}_emergency`,
        type: 'save',
        title: 'Build Emergency Fund',
        description: 'Start building a 3-6 month emergency fund for financial security',
        impact: {
          description: 'Provides financial safety net for unexpected expenses',
          projectedBenefit: undefined,
          riskLevel: 'low',
          timeToImpact: '3-6 months',
        },
        parameters: {
          goalType: 'emergency_fund',
          targetMonths: 3,
        },
        requiresConfirmation: true,
      });
    }

    // Goal-based actions
    for (const goalId of context.relevantGoals) {
      actions.push({
        id: `action_${Date.now()}_goal_${goalId}`,
        type: 'goal_adjust',
        title: 'Review Goal Progress',
        description: `Review and optimize your progress toward your goal`,
        impact: {
          description: 'Ensure you stay on track to meet your financial goals',
          riskLevel: 'low',
          timeToImpact: 'immediate',
        },
        parameters: { goalId },
        requiresConfirmation: false,
      });
    }

    return actions;
  }

  async executeAction(
    actionId: string,
    userId: string,
    confirmation: boolean
  ): Promise<ActionExecutionResult> {
    const action = this.pendingActions.get(actionId);
    if (!action) {
      return {
        success: false,
        actionId,
        error: 'Action not found or expired',
      };
    }

    if (action.requiresConfirmation && !confirmation) {
      return {
        success: false,
        actionId,
        error: 'Action requires confirmation',
        nextSteps: ['Please confirm the action to proceed'],
      };
    }

    // Execute action based on type
    const result = await this.processAction(action, userId);

    // Clean up
    this.pendingActions.delete(actionId);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'ai_interaction',
      userId,
      action: 'action_executed',
      resource: 'suggested_action',
      resourceId: actionId,
      details: {
        actionType: action.type,
        success: result.success,
      },
      metadata: {},
    });

    return result;
  }

  async analyzeIntent(message: string): Promise<IntentAnalysis> {
    const lowerMessage = message.toLowerCase();

    // Primary intent detection
    const primaryIntent = this.detectPrimaryIntent(lowerMessage);

    // Secondary intents
    const secondaryIntents = this.detectSecondaryIntents(lowerMessage, primaryIntent);

    // Sentiment analysis
    const sentiment = this.analyzeSentiment(lowerMessage);

    // Urgency detection
    const urgency = this.detectUrgency(lowerMessage);

    return {
      primaryIntent,
      secondaryIntents,
      sentiment,
      urgency,
      confidence: primaryIntent.confidence,
    };
  }

  async extractEntities(message: string): Promise<MessageEntity[]> {
    const entities: MessageEntity[] = [];

    // Extract monetary amounts
    const amountRegex = /\$?\d+(?:,\d{3})*(?:\.\d{2})?(?:\s*(?:dollars?|usd|ton|usdt))?/gi;
    let match;
    while ((match = amountRegex.exec(message)) !== null) {
      entities.push({
        type: 'amount',
        value: match[0],
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Extract percentages
    const percentRegex = /\d+(?:\.\d+)?%/g;
    while ((match = percentRegex.exec(message)) !== null) {
      entities.push({
        type: 'percentage',
        value: match[0],
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Extract time periods
    const timeRegex = /\d+\s*(?:days?|weeks?|months?|years?)/gi;
    while ((match = timeRegex.exec(message)) !== null) {
      entities.push({
        type: 'time_period',
        value: match[0],
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Extract asset mentions
    const assetKeywords = ['btc', 'bitcoin', 'eth', 'ethereum', 'ton', 'toncoin', 'usdt', 'usdc', 'stablecoin'];
    for (const asset of assetKeywords) {
      const regex = new RegExp(`\\b${asset}\\b`, 'gi');
      while ((match = regex.exec(message)) !== null) {
        entities.push({
          type: 'asset',
          value: match[0],
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    return entities;
  }

  updateConfig(config: Partial<AIAssistantConfig>): void {
    this._config = { ...this._config, ...config };
  }

  onEvent(callback: PersonalFinanceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private buildSystemPrompt(): string {
    const personalityPrompts: Record<AssistantPersonality, string> = {
      friendly: 'You are a friendly and supportive financial assistant. Use encouraging language and celebrate small wins.',
      professional: 'You are a professional financial advisor. Provide clear, actionable advice with data-driven insights.',
      educational: 'You are an educational financial guide. Explain concepts thoroughly and help users learn.',
      concise: 'You are a concise financial assistant. Provide brief, actionable responses.',
    };

    return `${personalityPrompts[this._config.personality]}

You help users with:
${this._config.capabilities.map(c => `- ${c.replace(/_/g, ' ')}`).join('\n')}

Guidelines:
- Always prioritize user's financial wellbeing
- Suggest actions within risk tolerance limits
- Provide clear explanations for recommendations
- Be transparent about limitations and risks
- Never guarantee returns or make unrealistic promises`;
  }

  private generateWelcomeMessage(): string {
    const welcomeMessages: Record<AssistantPersonality, string> = {
      friendly: "Hi there! I'm your AI financial assistant. I'm here to help you grow your savings, make smart investment decisions, and achieve your financial goals. What can I help you with today?",
      professional: "Welcome. I'm your AI financial assistant, ready to help you optimize your financial strategy. How may I assist you today?",
      educational: "Hello! I'm your AI financial guide. I'm here to help you understand and improve your finances. What would you like to learn about or work on today?",
      concise: "Hello. I'm your financial assistant. How can I help?",
    };

    return welcomeMessages[this._config.personality];
  }

  private async generateResponse(
    conversation: AIConversation,
    intentAnalysis: IntentAnalysis
  ): Promise<{ content: string; confidence: number }> {
    const intent = intentAnalysis.primaryIntent;
    let content: string;
    let confidence = 0.85;

    switch (intent.type) {
      case 'savings_inquiry':
        content = this.generateSavingsResponse(intent.parameters);
        break;
      case 'investment_inquiry':
        content = this.generateInvestmentResponse(intent.parameters);
        break;
      case 'risk_assessment':
        content = this.generateRiskResponse(intent.parameters);
        break;
      case 'goal_setting':
        content = this.generateGoalResponse(intent.parameters);
        break;
      case 'market_inquiry':
        content = this.generateMarketResponse(intent.parameters);
        break;
      case 'education':
        content = this.generateEducationalResponse(intent.parameters);
        break;
      case 'anxiety':
        content = this.generateCalmingResponse(intentAnalysis.sentiment);
        confidence = 0.9;
        break;
      default:
        content = this.generateGeneralResponse(conversation.context);
        confidence = 0.7;
    }

    return { content, confidence };
  }

  private detectPrimaryIntent(message: string): MessageIntent {
    const intentPatterns: Array<{ patterns: string[]; type: string; confidence: number }> = [
      {
        patterns: ['save', 'saving', 'savings', 'put aside', 'emergency fund'],
        type: 'savings_inquiry',
        confidence: 0.9,
      },
      {
        patterns: ['invest', 'investing', 'portfolio', 'allocation', 'diversify'],
        type: 'investment_inquiry',
        confidence: 0.9,
      },
      {
        patterns: ['risk', 'safe', 'risky', 'secure', 'volatile'],
        type: 'risk_assessment',
        confidence: 0.85,
      },
      {
        patterns: ['goal', 'target', 'achieve', 'plan for', 'prepare for'],
        type: 'goal_setting',
        confidence: 0.85,
      },
      {
        patterns: ['market', 'price', 'trend', 'bull', 'bear', 'crash'],
        type: 'market_inquiry',
        confidence: 0.8,
      },
      {
        patterns: ['learn', 'understand', 'explain', 'what is', 'how does', 'teach'],
        type: 'education',
        confidence: 0.85,
      },
      {
        patterns: ['worried', 'scared', 'anxious', 'panic', 'fear', 'nervous'],
        type: 'anxiety',
        confidence: 0.9,
      },
    ];

    for (const { patterns, type, confidence } of intentPatterns) {
      if (patterns.some(p => message.includes(p))) {
        return {
          type,
          confidence,
          parameters: this.extractIntentParameters(message, type),
        };
      }
    }

    return {
      type: 'general',
      confidence: 0.5,
      parameters: {},
    };
  }

  private detectSecondaryIntents(message: string, primaryIntent: MessageIntent): MessageIntent[] {
    const secondary: MessageIntent[] = [];

    // Check for compound intents
    if (message.includes('and') || message.includes('also')) {
      const intentKeywords: Record<string, string> = {
        save: 'savings_inquiry',
        invest: 'investment_inquiry',
        risk: 'risk_assessment',
        goal: 'goal_setting',
      };

      for (const [keyword, type] of Object.entries(intentKeywords)) {
        if (message.includes(keyword) && type !== primaryIntent.type) {
          secondary.push({
            type,
            confidence: 0.6,
            parameters: {},
          });
        }
      }
    }

    return secondary;
  }

  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' | 'anxious' {
    const positiveWords = ['happy', 'great', 'good', 'excited', 'wonderful', 'amazing', 'profit', 'gain'];
    const negativeWords = ['bad', 'terrible', 'loss', 'lost', 'down', 'failed', 'mistake'];
    const anxiousWords = ['worried', 'scared', 'anxious', 'panic', 'fear', 'nervous', 'crash', 'collapse'];

    const positiveCount = positiveWords.filter(w => message.includes(w)).length;
    const negativeCount = negativeWords.filter(w => message.includes(w)).length;
    const anxiousCount = anxiousWords.filter(w => message.includes(w)).length;

    if (anxiousCount > 0) return 'anxious';
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectUrgency(message: string): 'low' | 'medium' | 'high' {
    const highUrgencyWords = ['urgent', 'immediately', 'now', 'asap', 'emergency', 'crash', 'quick'];
    const mediumUrgencyWords = ['soon', 'today', 'this week', 'should i'];

    if (highUrgencyWords.some(w => message.includes(w))) return 'high';
    if (mediumUrgencyWords.some(w => message.includes(w))) return 'medium';
    return 'low';
  }

  private extractIntentParameters(message: string, _intentType: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // Extract amounts
    const amountMatch = message.match(/\$?\d+(?:,\d{3})*(?:\.\d{2})?/);
    if (amountMatch) {
      params.amount = parseFloat(amountMatch[0].replace(/[$,]/g, ''));
    }

    // Extract time periods
    const timeMatch = message.match(/(\d+)\s*(days?|weeks?|months?|years?)/i);
    if (timeMatch) {
      params.timePeriod = { value: parseInt(timeMatch[1]), unit: timeMatch[2].toLowerCase() };
    }

    return params;
  }

  private generateSavingsResponse(params: Record<string, unknown>): string {
    const amount = params.amount as number | undefined;
    if (amount) {
      return `Great thinking about saving $${amount.toLocaleString()}! Here are some strategies to help you reach this goal:

1. **Automated savings**: Set up automatic transfers to save consistently
2. **Round-up savings**: Round up your transactions and save the difference
3. **Goal-based allocation**: Assign your savings to specific goals for motivation

Would you like me to help you set up an automated savings plan?`;
    }

    return `Saving money is the foundation of financial health. Here are the key principles:

1. **Pay yourself first**: Save before spending
2. **Emergency fund**: Build 3-6 months of expenses
3. **Goal alignment**: Save with purpose

What savings goal would you like to work on?`;
  }

  private generateInvestmentResponse(_params: Record<string, unknown>): string {
    return `Investment success comes from a well-thought-out strategy. Here are the key considerations:

1. **Diversification**: Spread your investments across different assets
2. **Risk alignment**: Match your portfolio to your risk tolerance
3. **Time horizon**: Long-term thinking typically yields better results
4. **Regular rebalancing**: Keep your allocation on track

Based on your profile, I can suggest a personalized portfolio allocation. Would you like me to analyze your current holdings or create a new investment plan?`;
  }

  private generateRiskResponse(_params: Record<string, unknown>): string {
    return `Understanding and managing risk is crucial for your financial journey. Here's what to consider:

1. **Risk tolerance**: How much volatility can you handle emotionally?
2. **Risk capacity**: How much risk can you afford based on your financial situation?
3. **Time horizon**: Longer horizons can typically handle more risk

I can help you assess your risk profile and ensure your investments align with your comfort level. Would you like to take a quick risk assessment?`;
  }

  private generateGoalResponse(_params: Record<string, unknown>): string {
    return `Setting clear financial goals is essential for success. Let's work on defining your goals:

**Common financial goals:**
- Emergency fund (3-6 months expenses)
- Major purchase (home, car, education)
- Retirement savings
- Wealth building

For each goal, we'll determine:
- Target amount
- Timeline
- Monthly contribution needed
- Investment strategy

What goal would you like to focus on first?`;
  }

  private generateMarketResponse(_params: Record<string, unknown>): string {
    return `Markets can be unpredictable, but staying informed helps you make better decisions. Remember:

1. **Stay calm**: Short-term volatility is normal
2. **Focus on fundamentals**: Quality assets tend to recover
3. **Avoid timing the market**: Time in the market beats timing
4. **Stick to your plan**: Don't let emotions drive decisions

Would you like insights on specific assets or general market conditions?`;
  }

  private generateEducationalResponse(_params: Record<string, unknown>): string {
    return `I'd be happy to help you learn! We have educational content on:

- **Basics**: Budgeting, saving, compound interest
- **Investing**: Portfolios, diversification, risk management
- **Crypto & DeFi**: Blockchain, staking, yield farming
- **Advanced**: Tax planning, retirement strategies

What topic interests you most?`;
  }

  private generateCalmingResponse(_sentiment: string): string {
    return `I understand you're feeling anxious about your finances, and that's completely normal. Here's what I want you to know:

1. **Take a breath**: Making decisions when stressed often leads to regret
2. **Perspective**: Markets have always recovered over the long term
3. **Your plan**: Stick to your investment strategy - it was made for times like these
4. **Focus on control**: Control what you can (savings rate, expenses) and accept what you can't (market movements)

Would you like to review your financial position together? Sometimes seeing the full picture can provide reassurance.`;
  }

  private generateGeneralResponse(_context: ConversationContext): string {
    return `I'm here to help with your financial journey. I can assist you with:

- **Savings**: Set up automated savings plans
- **Investing**: Portfolio advice and optimization
- **Goals**: Create and track financial goals
- **Risk**: Assess and manage your risk exposure
- **Education**: Learn about personal finance topics

What would you like to focus on?`;
  }

  private generateConversationInsights(
    _conversation: AIConversation,
    intentAnalysis: IntentAnalysis
  ): ConversationInsight[] {
    const insights: ConversationInsight[] = [];

    if (intentAnalysis.sentiment === 'anxious') {
      insights.push({
        type: 'emotional_state',
        message: 'User appears anxious about finances - provide reassurance',
        importance: 'high',
        actionable: true,
      });
    }

    if (intentAnalysis.urgency === 'high') {
      insights.push({
        type: 'urgency',
        message: 'User has urgent financial concern - prioritize response',
        importance: 'high',
        actionable: true,
      });
    }

    return insights;
  }

  private generateSuggestedActions(
    _conversation: AIConversation,
    intentAnalysis: IntentAnalysis
  ): SuggestedAction[] {
    const actions: SuggestedAction[] = [];
    const intent = intentAnalysis.primaryIntent;

    if (intent.type === 'savings_inquiry') {
      actions.push({
        id: `action_${Date.now()}_save`,
        type: 'save',
        title: 'Set Up Automated Savings',
        description: 'Create an automated savings rule to build wealth consistently',
        impact: {
          description: 'Consistent saving builds wealth over time through compound growth',
          riskLevel: 'low',
          timeToImpact: 'immediate',
        },
        parameters: {},
        requiresConfirmation: true,
      });
    }

    if (intent.type === 'investment_inquiry') {
      actions.push({
        id: `action_${Date.now()}_invest`,
        type: 'invest',
        title: 'Create Investment Plan',
        description: 'Design a personalized portfolio based on your goals and risk profile',
        impact: {
          description: 'A well-designed portfolio can help you achieve long-term financial goals',
          riskLevel: 'medium',
          timeToImpact: 'long-term',
        },
        parameters: {},
        requiresConfirmation: true,
      });
    }

    if (intent.type === 'goal_setting') {
      actions.push({
        id: `action_${Date.now()}_goal`,
        type: 'goal_create',
        title: 'Create Financial Goal',
        description: 'Set up a new financial goal with tracking and automation',
        impact: {
          description: 'Clear goals increase your likelihood of financial success',
          riskLevel: 'low',
          timeToImpact: 'immediate',
        },
        parameters: {},
        requiresConfirmation: false,
      });
    }

    return actions;
  }

  private generateFollowUpQuestions(intentAnalysis: IntentAnalysis): string[] {
    const questions: string[] = [];
    const intent = intentAnalysis.primaryIntent;

    switch (intent.type) {
      case 'savings_inquiry':
        questions.push(
          'Do you have a specific savings target in mind?',
          'Would you prefer automated or manual savings?'
        );
        break;
      case 'investment_inquiry':
        questions.push(
          'What is your investment time horizon?',
          'How comfortable are you with market volatility?'
        );
        break;
      case 'goal_setting':
        questions.push(
          'When would you like to achieve this goal?',
          'How much can you contribute monthly toward this goal?'
        );
        break;
    }

    return questions;
  }

  private getLifeStageInsights(lifeStage: string): ConversationInsight[] {
    const insights: ConversationInsight[] = [];

    switch (lifeStage) {
      case 'beginner':
        insights.push({
          type: 'life_stage',
          message: 'Focus on building financial literacy and establishing good habits.',
          importance: 'medium',
          actionable: true,
        });
        break;
      case 'early_career':
        insights.push({
          type: 'life_stage',
          message: 'Great time to start investing - time is your biggest advantage.',
          importance: 'medium',
          actionable: true,
        });
        break;
      case 'high_net_worth':
        insights.push({
          type: 'life_stage',
          message: 'Consider wealth preservation strategies and tax optimization.',
          importance: 'medium',
          actionable: true,
        });
        break;
    }

    return insights;
  }

  private getRiskAlignmentInsight(_profile: UserProfile): ConversationInsight | null {
    // Would check actual portfolio vs profile risk tolerance
    return null;
  }

  private async processAction(
    action: SuggestedAction,
    _userId: string
  ): Promise<ActionExecutionResult> {
    // In a real implementation, this would execute the actual action
    // For now, we return a simulated success
    return {
      success: true,
      actionId: action.id,
      result: {
        type: action.type,
        status: 'initiated',
        timestamp: new Date().toISOString(),
      },
      nextSteps: ['Action has been initiated', 'You will receive a confirmation shortly'],
    };
  }

  private emitEvent(event: PersonalFinanceEvent): void {
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

export function createAIAssistantManager(
  config?: Partial<AIAssistantConfig>
): DefaultAIAssistantManager {
  return new DefaultAIAssistantManager(config);
}
