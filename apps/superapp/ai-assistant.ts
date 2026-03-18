/**
 * TONAIAgent - AI Assistant Module
 *
 * Embedded AI assistant powered by Groq for portfolio advice, strategy suggestions,
 * risk guidance, and automation.
 *
 * Features:
 * - Conversational AI interface
 * - Portfolio analysis and advice
 * - Strategy recommendations
 * - Risk assessment guidance
 * - Agent management assistance
 * - Market insights
 */

import type {
  AIAssistant,
  AIAssistantContext,
  AIAssistantCapability,
  AIMessage,
  AIAction,
  AIAssistantPreferences,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface AIAssistantConfig {
  enabled: boolean;
  defaultProvider: 'groq' | 'anthropic' | 'openai';
  maxConversationHistory: number;
  capabilities: AIAssistantCapability[];
  autoSuggestionsEnabled: boolean;
  proactiveAlertsEnabled: boolean;
  responseTimeout: number;
  defaultPreferences: AIAssistantPreferences;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateSessionInput {
  userId: string;
  context?: Partial<AIAssistantContext>;
  preferences?: Partial<AIAssistantPreferences>;
}

export interface SendMessageInput {
  sessionId: string;
  content: string;
  context?: Record<string, unknown>;
}

export interface AnalyzePortfolioInput {
  userId: string;
  sessionId: string;
  portfolioData: PortfolioData;
  focusAreas?: ('risk' | 'diversification' | 'performance' | 'opportunities')[];
}

export interface PortfolioData {
  totalValue: number;
  assets: { symbol: string; value: number; percentage: number }[];
  performance: { daily: number; weekly: number; monthly: number };
  risk: { volatility: number; drawdown: number; var95: number };
}

export interface SuggestStrategyInput {
  userId: string;
  sessionId: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  goals?: string[];
  capital?: number;
  preferences?: string[];
}

// ============================================================================
// AI Assistant Manager Interface
// ============================================================================

export interface AIAssistantManager {
  // Sessions
  createSession(input: CreateSessionInput): Promise<AIAssistant>;
  getSession(sessionId: string): Promise<AIAssistant | null>;
  endSession(sessionId: string): Promise<void>;
  clearHistory(sessionId: string): Promise<void>;

  // Messaging
  sendMessage(input: SendMessageInput): Promise<AIMessage>;
  getHistory(sessionId: string, limit?: number): Promise<AIMessage[]>;

  // Capabilities
  analyzePortfolio(input: AnalyzePortfolioInput): Promise<AIMessage>;
  suggestStrategies(input: SuggestStrategyInput): Promise<AIMessage>;
  explainRisk(sessionId: string, riskData: Record<string, unknown>): Promise<AIMessage>;
  helpWithAgent(sessionId: string, agentId: string, issue: string): Promise<AIMessage>;
  getMarketInsights(sessionId: string, assets?: string[]): Promise<AIMessage>;

  // Preferences
  updatePreferences(sessionId: string, preferences: Partial<AIAssistantPreferences>): Promise<void>;
  getPreferences(sessionId: string): Promise<AIAssistantPreferences>;

  // Actions
  executeAction(sessionId: string, actionId: string): Promise<AIMessage>;
  getSuggestedActions(sessionId: string): Promise<AIAction[]>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultAIAssistantManager implements AIAssistantManager {
  private readonly config: AIAssistantConfig;
  private readonly sessions = new Map<string, AIAssistant>();
  private readonly userSessions = new Map<string, string>();
  private readonly pendingActions = new Map<string, AIAction[]>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<AIAssistantConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      defaultProvider: config.defaultProvider ?? 'groq',
      maxConversationHistory: config.maxConversationHistory ?? 50,
      capabilities: config.capabilities ?? [
        'portfolio_advice',
        'strategy_suggestions',
        'risk_guidance',
        'market_analysis',
        'agent_management',
        'educational_content',
      ],
      autoSuggestionsEnabled: config.autoSuggestionsEnabled ?? true,
      proactiveAlertsEnabled: config.proactiveAlertsEnabled ?? true,
      responseTimeout: config.responseTimeout ?? 30000,
      defaultPreferences: config.defaultPreferences ?? {
        personalityStyle: 'professional',
        riskTolerance: 'moderate',
        detailLevel: 'intermediate',
        autoSuggestions: true,
        proactiveAlerts: true,
      },
    };
  }

  // ============================================================================
  // Sessions
  // ============================================================================

  async createSession(input: CreateSessionInput): Promise<AIAssistant> {
    // Check if user already has a session
    const existingSessionId = this.userSessions.get(input.userId);
    if (existingSessionId) {
      const existing = this.sessions.get(existingSessionId);
      if (existing) {
        return existing;
      }
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const session: AIAssistant = {
      userId: input.userId,
      sessionId,
      context: {
        currentWallet: input.context?.currentWallet,
        currentAgent: input.context?.currentAgent,
        currentStrategy: input.context?.currentStrategy,
        recentActivity: input.context?.recentActivity ?? [],
        portfolioSummary: input.context?.portfolioSummary,
      },
      capabilities: this.config.capabilities,
      conversationHistory: [
        {
          id: `msg_${Date.now()}`,
          role: 'system',
          content: this.getSystemPrompt(input.preferences),
          timestamp: new Date(),
        },
        {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: this.getWelcomeMessage(input.preferences),
          timestamp: new Date(),
          metadata: {
            suggestions: this.getInitialSuggestions(),
          },
        },
      ],
      preferences: {
        ...this.config.defaultPreferences,
        ...input.preferences,
      },
    };

    this.sessions.set(sessionId, session);
    this.userSessions.set(input.userId, sessionId);

    return session;
  }

  async getSession(sessionId: string): Promise<AIAssistant | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.userSessions.delete(session.userId);
      this.sessions.delete(sessionId);
      this.pendingActions.delete(sessionId);
    }
  }

  async clearHistory(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Keep system message, add new welcome
      session.conversationHistory = [
        session.conversationHistory[0],
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: 'History cleared. How can I help you?',
          timestamp: new Date(),
        },
      ];
      this.sessions.set(sessionId, session);
    }
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  async sendMessage(input: SendMessageInput): Promise<AIMessage> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message
    const userMessage: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.content,
      timestamp: new Date(),
    };
    session.conversationHistory.push(userMessage);

    // Update context if provided
    if (input.context) {
      session.context = { ...session.context, ...input.context };
    }

    // Generate response
    const response = await this.generateResponse(session, input.content);

    // Add assistant response
    session.conversationHistory.push(response);

    // Trim history if needed
    while (session.conversationHistory.length > this.config.maxConversationHistory) {
      session.conversationHistory.splice(1, 1); // Keep system message
    }

    this.sessions.set(input.sessionId, session);
    return response;
  }

  async getHistory(sessionId: string, limit = 20): Promise<AIMessage[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return session.conversationHistory
      .filter((m) => m.role !== 'system')
      .slice(-limit);
  }

  // ============================================================================
  // Capabilities
  // ============================================================================

  async analyzePortfolio(input: AnalyzePortfolioInput): Promise<AIMessage> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const analysis = this.generatePortfolioAnalysis(input.portfolioData, input.focusAreas);

    const message: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: analysis.content,
      timestamp: new Date(),
      metadata: {
        intent: 'portfolio_analysis',
        confidence: 0.95,
        suggestions: analysis.suggestions,
        actions: analysis.actions,
        sources: [
          { type: 'portfolio', reference: 'current_portfolio', confidence: 1.0 },
        ],
      },
    };

    session.conversationHistory.push(message);
    this.sessions.set(input.sessionId, session);
    this.pendingActions.set(input.sessionId, analysis.actions);

    return message;
  }

  async suggestStrategies(input: SuggestStrategyInput): Promise<AIMessage> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const suggestions = this.generateStrategySuggestions(input);

    const message: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: suggestions.content,
      timestamp: new Date(),
      metadata: {
        intent: 'strategy_suggestion',
        confidence: 0.9,
        suggestions: suggestions.nextSteps,
        actions: suggestions.actions,
        sources: [
          { type: 'strategy', reference: 'marketplace', confidence: 0.85 },
        ],
      },
    };

    session.conversationHistory.push(message);
    this.sessions.set(input.sessionId, session);
    this.pendingActions.set(input.sessionId, suggestions.actions);

    return message;
  }

  async explainRisk(sessionId: string, riskData: Record<string, unknown>): Promise<AIMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const explanation = this.generateRiskExplanation(riskData);

    const message: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: explanation,
      timestamp: new Date(),
      metadata: {
        intent: 'risk_explanation',
        confidence: 0.92,
        sources: [
          { type: 'portfolio', reference: 'risk_metrics', confidence: 1.0 },
        ],
      },
    };

    session.conversationHistory.push(message);
    this.sessions.set(sessionId, session);

    return message;
  }

  async helpWithAgent(sessionId: string, agentId: string, issue: string): Promise<AIMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const help = this.generateAgentHelp(agentId, issue);

    const message: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: help.content,
      timestamp: new Date(),
      metadata: {
        intent: 'agent_help',
        confidence: 0.88,
        actions: help.actions,
        sources: [
          { type: 'documentation', reference: 'agent_docs', confidence: 0.9 },
        ],
      },
    };

    session.conversationHistory.push(message);
    session.context.currentAgent = agentId;
    this.sessions.set(sessionId, session);
    this.pendingActions.set(sessionId, help.actions);

    return message;
  }

  async getMarketInsights(sessionId: string, assets?: string[]): Promise<AIMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const insights = this.generateMarketInsights(assets);

    const message: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: insights,
      timestamp: new Date(),
      metadata: {
        intent: 'market_insights',
        confidence: 0.85,
        sources: [
          { type: 'market_data', reference: 'price_feeds', confidence: 0.95 },
        ],
      },
    };

    session.conversationHistory.push(message);
    this.sessions.set(sessionId, session);

    return message;
  }

  // ============================================================================
  // Preferences
  // ============================================================================

  async updatePreferences(
    sessionId: string,
    preferences: Partial<AIAssistantPreferences>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.preferences = { ...session.preferences, ...preferences };
    this.sessions.set(sessionId, session);
  }

  async getPreferences(sessionId: string): Promise<AIAssistantPreferences> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session.preferences;
  }

  // ============================================================================
  // Actions
  // ============================================================================

  async executeAction(sessionId: string, actionId: string): Promise<AIMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const actions = this.pendingActions.get(sessionId) ?? [];
    const action = actions.find((a) => a.type === actionId);

    if (!action) {
      throw new Error('Action not found');
    }

    // Simulate action execution
    const result = `Action "${action.label}" executed successfully.`;

    const message: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: result,
      timestamp: new Date(),
      metadata: {
        intent: 'action_result',
        confidence: 1.0,
      },
    };

    session.conversationHistory.push(message);
    this.sessions.set(sessionId, session);

    // Clear the executed action
    this.pendingActions.set(
      sessionId,
      actions.filter((a) => a.type !== actionId)
    );

    return message;
  }

  async getSuggestedActions(sessionId: string): Promise<AIAction[]> {
    return this.pendingActions.get(sessionId) ?? [];
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

  private getSystemPrompt(preferences?: Partial<AIAssistantPreferences>): string {
    const style = preferences?.personalityStyle ?? 'professional';
    const detail = preferences?.detailLevel ?? 'intermediate';

    return `You are TONAIAgent's embedded AI assistant, helping users manage their autonomous finance portfolio on TON blockchain.

Style: ${style}
Detail Level: ${detail}

Your capabilities:
- Portfolio analysis and advice
- Strategy recommendations
- Risk assessment and guidance
- Agent management assistance
- Market insights and education

Always be helpful, accurate, and focused on the user's financial goals. Never provide specific financial advice without appropriate disclaimers.`;
  }

  private getWelcomeMessage(preferences?: Partial<AIAssistantPreferences>): string {
    const style = preferences?.personalityStyle ?? 'professional';

    if (style === 'friendly') {
      return `Hey there! 👋 I'm your AI assistant for TONAIAgent. I'm here to help you navigate your autonomous finance journey on TON!

How can I help you today? I can analyze your portfolio, suggest strategies, explain risks, or help with your AI agents.`;
    } else if (style === 'concise') {
      return `Welcome. I can help with portfolio analysis, strategies, risk guidance, and agent management. What do you need?`;
    } else {
      return `Welcome to TONAIAgent's AI Assistant. I'm here to help you make informed decisions about your autonomous finance portfolio.

I can assist you with:
• Portfolio analysis and optimization
• Strategy recommendations
• Risk assessment and guidance
• AI agent management
• Market insights

How may I assist you today?`;
    }
  }

  private getInitialSuggestions(): string[] {
    return [
      'Analyze my portfolio',
      'Suggest strategies for me',
      'Explain my current risks',
      'Help me set up an agent',
      'What are the market trends?',
    ];
  }

  private async generateResponse(session: AIAssistant, userInput: string): Promise<AIMessage> {
    // In production, this would call the AI provider (Groq, Anthropic, etc.)
    // For now, we'll use pattern matching for common queries

    const input = userInput.toLowerCase();
    let content: string;
    let intent: string | undefined;
    let suggestions: string[] | undefined;
    let actions: AIAction[] | undefined;

    if (input.includes('portfolio') && (input.includes('analyze') || input.includes('review'))) {
      content = `I'd be happy to analyze your portfolio! To provide the best insights, I'll need to look at your current holdings.

Based on your portfolio data, here's what I see:
• **Total Value**: Your portfolio is performing within expected parameters
• **Diversification**: Consider reviewing your asset allocation
• **Risk Level**: Currently at a moderate risk level

Would you like me to dive deeper into any specific area?`;
      intent = 'portfolio_analysis';
      suggestions = ['Deep dive into risk', 'Suggest rebalancing', 'Compare to benchmarks'];
      actions = [
        { type: 'view_portfolio', label: 'View Full Portfolio', data: {}, requiresConfirmation: false },
        { type: 'generate_report', label: 'Generate Report', data: {}, requiresConfirmation: false },
      ];
    } else if (input.includes('strategy') || input.includes('recommend')) {
      content = `Let me suggest some strategies based on your profile!

Here are a few options that might work well:

1. **TON Yield Optimizer** - Low risk, steady returns through DeFi yield farming
2. **DeFi Arbitrage Hunter** - Medium risk, captures price inefficiencies
3. **Multi-Protocol Balancer** - Medium risk, spreads capital across protocols

Would you like details on any of these strategies?`;
      intent = 'strategy_suggestion';
      suggestions = ['Tell me more about #1', 'What are the risks?', 'Deploy a strategy'];
      actions = [
        { type: 'view_marketplace', label: 'Browse Marketplace', data: {}, requiresConfirmation: false },
      ];
    } else if (input.includes('risk')) {
      content = `Let me explain your current risk exposure:

**Current Risk Assessment:**
• Overall Risk Level: Moderate
• Portfolio Volatility: 18.5%
• Value at Risk (95%): 5.2%
• Max Drawdown Risk: 12%

The main risk factors are:
1. Market concentration in TON ecosystem
2. Smart contract exposure in DeFi protocols
3. Liquidity risk in smaller positions

Would you like suggestions to reduce risk?`;
      intent = 'risk_explanation';
      suggestions = ['How to reduce risk?', 'What is VaR?', 'Set risk alerts'];
    } else if (input.includes('agent')) {
      content = `I can help you with your AI agents! Here's what I can do:

• Set up a new agent
• Troubleshoot existing agents
• Optimize agent parameters
• Explain agent behavior

What would you like help with?`;
      intent = 'agent_help';
      suggestions = ['Create new agent', 'Check agent status', 'Optimize parameters'];
      actions = [
        { type: 'view_agents', label: 'View Agents', data: {}, requiresConfirmation: false },
        { type: 'create_agent', label: 'Create Agent', data: {}, requiresConfirmation: true },
      ];
    } else if (input.includes('market') || input.includes('trend')) {
      content = `Here are the latest market insights for TON ecosystem:

**Market Overview:**
• TON: Showing positive momentum (+2.5% 24h)
• DeFi TVL: Growing steadily
• Network Activity: Above average

**Opportunities:**
• Yield farming rates remain attractive
• New protocols launching on TON
• Cross-chain bridges gaining adoption

Want me to elaborate on any of these points?`;
      intent = 'market_insights';
      suggestions = ['TON price analysis', 'Best yield opportunities', 'Upcoming events'];
    } else if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      content = session.preferences.personalityStyle === 'friendly'
        ? `Hey! 👋 Great to hear from you! How can I help you today?`
        : `Hello! How can I assist you with your portfolio today?`;
      suggestions = this.getInitialSuggestions();
    } else {
      content = `I understand you're asking about "${userInput}".

I can help you with:
• Portfolio analysis and advice
• Strategy recommendations
• Risk assessment
• Agent management
• Market insights

Could you tell me more about what you'd like to know?`;
      suggestions = this.getInitialSuggestions();
    }

    const message: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata: {
        intent,
        confidence: 0.85,
        suggestions,
        actions,
      },
    };

    if (actions) {
      this.pendingActions.set(session.sessionId, actions);
    }

    return message;
  }

  private generatePortfolioAnalysis(
    data: PortfolioData,
    focusAreas?: string[]
  ): { content: string; suggestions: string[]; actions: AIAction[] } {
    const areas = focusAreas ?? ['risk', 'diversification', 'performance'];
    let content = `**Portfolio Analysis Report**\n\n`;

    content += `**Overview:**\n`;
    content += `• Total Value: $${data.totalValue.toLocaleString()}\n`;
    content += `• Assets: ${data.assets.length} positions\n\n`;

    if (areas.includes('performance')) {
      content += `**Performance:**\n`;
      content += `• Daily: ${data.performance.daily >= 0 ? '+' : ''}${data.performance.daily.toFixed(2)}%\n`;
      content += `• Weekly: ${data.performance.weekly >= 0 ? '+' : ''}${data.performance.weekly.toFixed(2)}%\n`;
      content += `• Monthly: ${data.performance.monthly >= 0 ? '+' : ''}${data.performance.monthly.toFixed(2)}%\n\n`;
    }

    if (areas.includes('risk')) {
      content += `**Risk Metrics:**\n`;
      content += `• Volatility: ${data.risk.volatility.toFixed(1)}%\n`;
      content += `• Current Drawdown: ${data.risk.drawdown.toFixed(1)}%\n`;
      content += `• VaR (95%): ${data.risk.var95.toFixed(1)}%\n\n`;
    }

    if (areas.includes('diversification')) {
      const topAsset = data.assets[0];
      content += `**Diversification:**\n`;
      content += `• Top holding: ${topAsset?.symbol ?? 'N/A'} (${topAsset?.percentage.toFixed(1) ?? 0}%)\n`;
      content += `• Concentration: ${topAsset && topAsset.percentage > 40 ? 'High' : 'Moderate'}\n\n`;
    }

    return {
      content,
      suggestions: ['Suggest rebalancing', 'Compare to benchmark', 'Set risk alerts'],
      actions: [
        { type: 'rebalance', label: 'Rebalance Portfolio', data: {}, requiresConfirmation: true },
        { type: 'export_report', label: 'Export Report', data: {}, requiresConfirmation: false },
      ],
    };
  }

  private generateStrategySuggestions(
    input: SuggestStrategyInput
  ): { content: string; nextSteps: string[]; actions: AIAction[] } {
    const riskStrategies = {
      conservative: [
        { name: 'Stable Yield', desc: 'Low-risk stablecoin farming', apy: '8-12%' },
        { name: 'TON Staking Plus', desc: 'Enhanced staking rewards', apy: '5-8%' },
      ],
      moderate: [
        { name: 'DeFi Balanced', desc: 'Diversified DeFi exposure', apy: '15-25%' },
        { name: 'Yield Optimizer', desc: 'Auto-compounding strategies', apy: '12-20%' },
      ],
      aggressive: [
        { name: 'Arbitrage Hunter', desc: 'High-frequency price arbitrage', apy: '30-50%' },
        { name: 'Leverage Optimizer', desc: 'Leveraged yield farming', apy: '40-80%' },
      ],
    };

    const strategies = riskStrategies[input.riskTolerance];

    let content = `**Strategy Recommendations**\n\n`;
    content += `Based on your ${input.riskTolerance} risk tolerance`;
    if (input.capital) {
      content += ` and $${input.capital.toLocaleString()} capital`;
    }
    content += `:\n\n`;

    strategies.forEach((s, i) => {
      content += `${i + 1}. **${s.name}**\n`;
      content += `   ${s.desc}\n`;
      content += `   Expected APY: ${s.apy}\n\n`;
    });

    return {
      content,
      nextSteps: ['View strategy details', 'Backtest strategy', 'Deploy strategy'],
      actions: [
        { type: 'view_strategy', label: 'View Details', data: { strategy: strategies[0].name }, requiresConfirmation: false },
        { type: 'deploy_strategy', label: 'Deploy Strategy', data: {}, requiresConfirmation: true },
      ],
    };
  }

  private generateRiskExplanation(riskData: Record<string, unknown>): string {
    const volatility = (riskData.volatility as number) ?? 15;
    const drawdown = (riskData.drawdown as number) ?? 5;
    const var95 = (riskData.var95 as number) ?? 3;

    let explanation = `**Understanding Your Risk Exposure**\n\n`;

    explanation += `**Volatility (${volatility.toFixed(1)}%):**\n`;
    explanation += `This measures how much your portfolio value fluctuates. `;
    explanation += volatility > 20
      ? `Your volatility is high - expect significant daily swings.\n\n`
      : volatility > 10
      ? `Your volatility is moderate - normal market conditions.\n\n`
      : `Your volatility is low - relatively stable portfolio.\n\n`;

    explanation += `**Drawdown (${drawdown.toFixed(1)}%):**\n`;
    explanation += `This is how much your portfolio has declined from its peak. `;
    explanation += drawdown > 10
      ? `Consider reviewing positions to limit further losses.\n\n`
      : `This is within normal range.\n\n`;

    explanation += `**Value at Risk 95% ($${var95.toFixed(2)}%):**\n`;
    explanation += `There's a 5% chance you could lose ${var95.toFixed(1)}% or more in a day under normal market conditions.\n`;

    return explanation;
  }

  private generateAgentHelp(
    agentId: string,
    issue: string
  ): { content: string; actions: AIAction[] } {
    let content = `**Agent Support: ${agentId}**\n\n`;

    if (issue.toLowerCase().includes('not working') || issue.toLowerCase().includes('error')) {
      content += `I see you're having issues with your agent. Here are some troubleshooting steps:\n\n`;
      content += `1. **Check agent status** - Verify it's running and not paused\n`;
      content += `2. **Review error logs** - Look for specific error messages\n`;
      content += `3. **Check capital** - Ensure sufficient funds are allocated\n`;
      content += `4. **Verify permissions** - Agent needs proper wallet access\n\n`;
      content += `Would you like me to run diagnostics on this agent?`;
    } else if (issue.toLowerCase().includes('optimize') || issue.toLowerCase().includes('improve')) {
      content += `Here are ways to optimize your agent's performance:\n\n`;
      content += `1. **Adjust risk parameters** - Fine-tune for market conditions\n`;
      content += `2. **Review capital allocation** - Consider increasing capital for larger positions\n`;
      content += `3. **Update strategy version** - Check for newer strategy releases\n`;
      content += `4. **Enable automations** - Set up auto-rebalancing\n`;
    } else {
      content += `I'm here to help with your agent! Here's what I can assist with:\n\n`;
      content += `• Troubleshooting issues\n`;
      content += `• Optimizing performance\n`;
      content += `• Adjusting parameters\n`;
      content += `• Understanding behavior\n\n`;
      content += `What specific help do you need?`;
    }

    return {
      content,
      actions: [
        { type: 'view_agent', label: 'View Agent', data: { agentId }, requiresConfirmation: false },
        { type: 'run_diagnostics', label: 'Run Diagnostics', data: { agentId }, requiresConfirmation: false },
        { type: 'pause_agent', label: 'Pause Agent', data: { agentId }, requiresConfirmation: true },
      ],
    };
  }

  private generateMarketInsights(assets?: string[]): string {
    let content = `**Market Insights**\n\n`;

    content += `**TON Ecosystem Overview:**\n`;
    content += `• TON price: $5.12 (+2.3% 24h)\n`;
    content += `• Total DeFi TVL: $890M\n`;
    content += `• 24h Volume: $145M\n\n`;

    content += `**Top Opportunities:**\n`;
    content += `1. DeDust pools showing above-average yields\n`;
    content += `2. STON.fi liquidity incentives active\n`;
    content += `3. New TON staking derivatives launching\n\n`;

    if (assets && assets.length > 0) {
      content += `**Assets You Asked About:**\n`;
      for (const asset of assets) {
        content += `• ${asset}: Looking stable, consider holding\n`;
      }
      content += `\n`;
    }

    content += `**Risk Factors to Watch:**\n`;
    content += `• Market-wide correlation remains high\n`;
    content += `• Smart contract upgrades scheduled this week\n`;

    return content;
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

export default DefaultAIAssistantManager;
