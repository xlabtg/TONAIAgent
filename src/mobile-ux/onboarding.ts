/**
 * TONAIAgent - Telegram-Native Onboarding System
 *
 * Provides instant wallet creation, social login, recovery flows,
 * progressive onboarding, and AI-guided setup within Telegram.
 */

import {
  OnboardingConfig,
  OnboardingStep,
  UserProfile,
  UserLevel,
  WalletCreationOptions,
  RecoverySetupOptions,
  RecoveryMethod,
  TrustedContact,
} from './types';

// ============================================================================
// Default Onboarding Flows
// ============================================================================

/**
 * Default onboarding flow for beginners
 */
const BEGINNER_ONBOARDING: OnboardingConfig = {
  id: 'beginner_flow',
  name: 'Getting Started',
  targetLevel: 'beginner',
  maxTimeTarget: 120, // 2 minutes
  allowSkipAll: false,
  aiAssisted: true,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to TONAIAgent',
      description: 'Your autonomous finance assistant on TON',
      type: 'welcome',
      required: true,
      skippable: false,
      estimatedTime: 10,
      config: {
        showFeatures: ['ai_agents', 'yield_farming', 'portfolio_tracking'],
        animationType: 'slide',
      },
    },
    {
      id: 'wallet_create',
      title: 'Create Your Wallet',
      description: 'Set up your secure TON wallet in seconds',
      type: 'wallet_create',
      required: true,
      skippable: false,
      estimatedTime: 30,
      config: {
        defaultMethod: 'social',
        showOptions: ['social', 'new'],
        socialProviders: ['telegram'],
      },
    },
    {
      id: 'recovery_setup',
      title: 'Secure Your Account',
      description: 'Set up recovery options to protect your funds',
      type: 'recovery_setup',
      required: true,
      skippable: true,
      estimatedTime: 45,
      config: {
        recommendedMethod: 'telegram_cloud',
        allowMultiple: true,
      },
    },
    {
      id: 'profile_setup',
      title: 'Personalize Your Experience',
      description: 'Tell us a bit about yourself',
      type: 'profile_setup',
      required: false,
      skippable: true,
      estimatedTime: 20,
      config: {
        fields: ['displayName', 'riskTolerance', 'investmentGoals'],
      },
    },
    {
      id: 'tutorial',
      title: 'Quick Tour',
      description: 'Learn the basics in 30 seconds',
      type: 'tutorial',
      required: false,
      skippable: true,
      estimatedTime: 30,
      config: {
        tutorialType: 'interactive',
        highlights: ['chat_command', 'dashboard', 'strategies'],
      },
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start exploring autonomous finance',
      type: 'complete',
      required: true,
      skippable: false,
      estimatedTime: 5,
      config: {
        showNextSteps: true,
        offerFirstDeposit: true,
      },
    },
  ],
};

/**
 * Advanced user onboarding (shorter flow)
 */
const ADVANCED_ONBOARDING: OnboardingConfig = {
  id: 'advanced_flow',
  name: 'Quick Setup',
  targetLevel: 'advanced',
  maxTimeTarget: 60, // 1 minute
  allowSkipAll: true,
  aiAssisted: false,
  steps: [
    {
      id: 'wallet_import',
      title: 'Connect Wallet',
      description: 'Import your existing TON wallet',
      type: 'wallet_import',
      required: true,
      skippable: false,
      estimatedTime: 20,
      config: {
        methods: ['seed_phrase', 'ton_connect', 'hardware'],
      },
    },
    {
      id: 'recovery_setup',
      title: 'Backup Setup',
      description: 'Configure additional recovery options',
      type: 'recovery_setup',
      required: false,
      skippable: true,
      estimatedTime: 30,
      config: {
        showAdvancedOptions: true,
      },
    },
    {
      id: 'complete',
      title: 'Ready',
      description: 'Your setup is complete',
      type: 'complete',
      required: true,
      skippable: false,
      estimatedTime: 5,
      config: {
        showDashboard: true,
      },
    },
  ],
};

/**
 * Institutional onboarding flow
 */
const INSTITUTIONAL_ONBOARDING: OnboardingConfig = {
  id: 'institutional_flow',
  name: 'Institutional Setup',
  targetLevel: 'institutional',
  maxTimeTarget: 300, // 5 minutes (requires more verification)
  allowSkipAll: false,
  aiAssisted: true,
  steps: [
    {
      id: 'welcome',
      title: 'Institutional Onboarding',
      description: 'Set up your organization on TONAIAgent',
      type: 'welcome',
      required: true,
      skippable: false,
      estimatedTime: 10,
      config: {
        institutionalFeatures: true,
      },
    },
    {
      id: 'profile_setup',
      title: 'Organization Details',
      description: 'Configure your institutional profile',
      type: 'profile_setup',
      required: true,
      skippable: false,
      estimatedTime: 60,
      config: {
        fields: ['organizationName', 'organizationType', 'complianceLevel', 'teamSize'],
        requiresVerification: true,
      },
    },
    {
      id: 'wallet_create',
      title: 'Treasury Setup',
      description: 'Configure multi-signature treasury',
      type: 'wallet_create',
      required: true,
      skippable: false,
      estimatedTime: 90,
      config: {
        multiSig: true,
        requiredSigners: 2,
        defaultMethod: 'mpc',
      },
    },
    {
      id: 'risk_assessment',
      title: 'Risk Parameters',
      description: 'Configure institutional risk controls',
      type: 'risk_assessment',
      required: true,
      skippable: false,
      estimatedTime: 60,
      config: {
        institutionalRisk: true,
        complianceRequired: true,
      },
    },
    {
      id: 'complete',
      title: 'Onboarding Complete',
      description: 'Your institutional account is ready',
      type: 'complete',
      required: true,
      skippable: false,
      estimatedTime: 10,
      config: {
        showComplianceDocs: true,
        scheduleDemo: true,
      },
    },
  ],
};

// ============================================================================
// Onboarding Manager
// ============================================================================

/**
 * Configuration for the OnboardingManager
 */
export interface OnboardingManagerConfig {
  /** Available onboarding flows */
  flows?: OnboardingConfig[];
  /** Enable analytics tracking */
  trackAnalytics?: boolean;
  /** AI assistance enabled */
  aiAssisted?: boolean;
  /** Custom step handlers */
  stepHandlers?: Record<string, OnboardingStepHandler>;
}

/**
 * Step handler function type
 */
export type OnboardingStepHandler = (
  step: OnboardingStep,
  user: UserProfile,
  data: Record<string, unknown>
) => Promise<OnboardingStepResult>;

/**
 * Step result
 */
export interface OnboardingStepResult {
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Data to store */
  data?: Record<string, unknown>;
  /** Skip to specific step */
  skipTo?: string;
  /** Show message to user */
  message?: string;
}

/**
 * Onboarding progress
 */
export interface OnboardingProgress {
  /** Current step index */
  currentStepIndex: number;
  /** Current step */
  currentStep: OnboardingStep;
  /** Total steps */
  totalSteps: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Time spent so far (seconds) */
  timeSpent: number;
  /** Estimated time remaining (seconds) */
  estimatedRemaining: number;
  /** Can go back */
  canGoBack: boolean;
  /** Can skip current */
  canSkip: boolean;
}

/**
 * Wallet creation result
 */
export interface WalletCreationResult {
  /** Success status */
  success: boolean;
  /** Wallet address */
  address?: string;
  /** Public key */
  publicKey?: string;
  /** Recovery method used */
  recoveryMethod?: RecoveryMethod;
  /** Seed phrase (only shown once) */
  seedPhrase?: string[];
  /** Error message */
  error?: string;
}

/**
 * Onboarding completion result
 */
export interface OnboardingCompletionResult {
  /** Success status */
  success: boolean;
  /** User profile */
  user: UserProfile;
  /** Wallet address */
  walletAddress: string;
  /** Time taken (seconds) */
  timeTaken: number;
  /** Steps completed */
  stepsCompleted: string[];
  /** Steps skipped */
  stepsSkipped: string[];
  /** Next recommended action */
  nextAction?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<OnboardingManagerConfig> = {
  flows: [BEGINNER_ONBOARDING, ADVANCED_ONBOARDING, INSTITUTIONAL_ONBOARDING],
  trackAnalytics: true,
  aiAssisted: true,
  stepHandlers: {},
};

/**
 * Manages the Telegram-native onboarding experience
 */
export class OnboardingManager {
  private readonly config: Required<OnboardingManagerConfig>;
  private readonly sessions: Map<string, OnboardingSession> = new Map();
  private readonly completedUsers: Set<string> = new Set();

  constructor(config: Partial<OnboardingManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Flow Management
  // ============================================================================

  /**
   * Get available onboarding flows
   */
  getFlows(): OnboardingConfig[] {
    return this.config.flows;
  }

  /**
   * Get flow by ID
   */
  getFlow(flowId: string): OnboardingConfig | undefined {
    return this.config.flows.find((f) => f.id === flowId);
  }

  /**
   * Get recommended flow for user level
   */
  getRecommendedFlow(userLevel: UserLevel): OnboardingConfig {
    const flow = this.config.flows.find((f) => f.targetLevel === userLevel);
    return flow ?? BEGINNER_ONBOARDING;
  }

  /**
   * Detect user level from Telegram data
   */
  detectUserLevel(telegramData: TelegramInitData): UserLevel {
    // Check for premium users (likely more experienced)
    if (telegramData.user?.is_premium) {
      return 'intermediate';
    }

    // Check account age (approximation based on user ID)
    const userId = parseInt(telegramData.user?.id ?? '0', 10);
    if (userId < 100000000) {
      // Early Telegram users
      return 'intermediate';
    }

    return 'beginner';
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Start onboarding for a user
   */
  async startOnboarding(
    telegramId: string,
    telegramData: TelegramInitData,
    flowId?: string
  ): Promise<OnboardingProgress> {
    // Check if already onboarded
    if (this.completedUsers.has(telegramId)) {
      const session = this.sessions.get(telegramId);
      if (session) {
        return this.getProgress(telegramId)!;
      }
    }

    // Get or detect flow
    const userLevel = this.detectUserLevel(telegramData);
    const flow = flowId ? this.getFlow(flowId) : this.getRecommendedFlow(userLevel);

    if (!flow) {
      throw new Error(`Onboarding flow not found: ${flowId}`);
    }

    // Create user profile
    const user: UserProfile = {
      telegramId,
      displayName: telegramData.user?.first_name ?? 'User',
      username: telegramData.user?.username,
      photoUrl: telegramData.user?.photo_url,
      language: telegramData.user?.language_code ?? 'en',
      level: userLevel,
      preferences: {
        theme: 'system',
        notifications: {
          pushEnabled: true,
          transactions: true,
          priceAlerts: true,
          strategyUpdates: true,
          riskAlerts: true,
          marketing: false,
        },
        dashboardLayout: 'compact',
        displayCurrency: 'USD',
        showFiatValues: true,
        hapticFeedback: true,
        riskWarnings: 'all',
        quickActions: ['swap', 'send', 'receive'],
      },
      onboarding: {
        completed: false,
        currentStep: 0,
        completedSteps: [],
        skippedSteps: [],
        startedAt: new Date(),
        timeSpentSeconds: 0,
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    // Create session
    const session: OnboardingSession = {
      user,
      flow,
      currentStepIndex: 0,
      startTime: Date.now(),
      stepStartTime: Date.now(),
      data: {},
    };

    this.sessions.set(telegramId, session);

    return this.getProgress(telegramId)!;
  }

  /**
   * Get current onboarding progress
   */
  getProgress(telegramId: string): OnboardingProgress | undefined {
    const session = this.sessions.get(telegramId);
    if (!session) return undefined;

    const currentStep = session.flow.steps[session.currentStepIndex];
    const timeSpent = Math.floor((Date.now() - session.startTime) / 1000);
    const remainingSteps = session.flow.steps.slice(session.currentStepIndex);
    const estimatedRemaining = remainingSteps.reduce((acc, step) => acc + step.estimatedTime, 0);

    return {
      currentStepIndex: session.currentStepIndex,
      currentStep,
      totalSteps: session.flow.steps.length,
      progressPercent: Math.round((session.currentStepIndex / session.flow.steps.length) * 100),
      timeSpent,
      estimatedRemaining,
      canGoBack: session.currentStepIndex > 0,
      canSkip: currentStep.skippable,
    };
  }

  /**
   * Complete current step and advance
   */
  async completeStep(
    telegramId: string,
    stepData?: Record<string, unknown>
  ): Promise<OnboardingProgress | OnboardingCompletionResult> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    const currentStep = session.flow.steps[session.currentStepIndex];

    // Execute step handler if exists
    const handler = this.config.stepHandlers[currentStep.type];
    if (handler) {
      const result = await handler(currentStep, session.user, stepData ?? {});
      if (!result.success) {
        throw new Error(result.error ?? 'Step failed');
      }
      if (result.data) {
        Object.assign(session.data, result.data);
      }
    }

    // Mark step as completed
    session.user.onboarding.completedSteps.push(currentStep.id);
    session.user.onboarding.timeSpentSeconds += Math.floor(
      (Date.now() - session.stepStartTime) / 1000
    );

    // Check if this was the last step
    if (session.currentStepIndex >= session.flow.steps.length - 1) {
      return this.completeOnboarding(telegramId);
    }

    // Advance to next step
    session.currentStepIndex++;
    session.stepStartTime = Date.now();
    session.user.onboarding.currentStep = session.currentStepIndex;

    return this.getProgress(telegramId)!;
  }

  /**
   * Skip current step
   */
  async skipStep(telegramId: string): Promise<OnboardingProgress | OnboardingCompletionResult> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    const currentStep = session.flow.steps[session.currentStepIndex];

    if (!currentStep.skippable) {
      throw new Error('Current step cannot be skipped');
    }

    // Mark step as skipped
    session.user.onboarding.skippedSteps.push(currentStep.id);

    // Check if this was the last step
    if (session.currentStepIndex >= session.flow.steps.length - 1) {
      return this.completeOnboarding(telegramId);
    }

    // Advance to next step
    session.currentStepIndex++;
    session.stepStartTime = Date.now();
    session.user.onboarding.currentStep = session.currentStepIndex;

    return this.getProgress(telegramId)!;
  }

  /**
   * Go back to previous step
   */
  goBack(telegramId: string): OnboardingProgress {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    if (session.currentStepIndex === 0) {
      throw new Error('Already at first step');
    }

    session.currentStepIndex--;
    session.stepStartTime = Date.now();
    session.user.onboarding.currentStep = session.currentStepIndex;

    return this.getProgress(telegramId)!;
  }

  /**
   * Complete onboarding
   */
  private async completeOnboarding(telegramId: string): Promise<OnboardingCompletionResult> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    const timeTaken = Math.floor((Date.now() - session.startTime) / 1000);

    // Update user profile
    session.user.onboarding.completed = true;
    session.user.onboarding.completedAt = new Date();
    session.user.onboarding.timeSpentSeconds = timeTaken;

    // Mark as completed
    this.completedUsers.add(telegramId);

    const result: OnboardingCompletionResult = {
      success: true,
      user: session.user,
      walletAddress: (session.data.walletAddress as string) ?? '',
      timeTaken,
      stepsCompleted: session.user.onboarding.completedSteps,
      stepsSkipped: session.user.onboarding.skippedSteps,
      nextAction: 'explore_dashboard',
    };

    // Clean up session
    this.sessions.delete(telegramId);

    return result;
  }

  // ============================================================================
  // Wallet Creation
  // ============================================================================

  /**
   * Create a new wallet
   */
  async createWallet(
    telegramId: string,
    options: WalletCreationOptions
  ): Promise<WalletCreationResult> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    // Simulate wallet creation (actual implementation would use TON SDK)
    const address = this.generateMockAddress();
    const publicKey = this.generateMockPublicKey();

    const result: WalletCreationResult = {
      success: true,
      address,
      publicKey,
      recoveryMethod: options.backupMethod === 'seed_phrase' ? 'seed_phrase' : 'telegram_cloud',
    };

    // Store in session
    session.data.walletAddress = address;
    session.data.publicKey = publicKey;
    session.data.walletMethod = options.method;

    // Generate seed phrase if requested
    if (options.showSeedPhrase && options.method === 'new') {
      result.seedPhrase = this.generateMockSeedPhrase();
    }

    return result;
  }

  /**
   * Import existing wallet
   */
  async importWallet(
    telegramId: string,
    seedPhrase: string[]
  ): Promise<WalletCreationResult> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    // Validate seed phrase format
    if (seedPhrase.length !== 24 && seedPhrase.length !== 12) {
      return {
        success: false,
        error: 'Invalid seed phrase length. Expected 12 or 24 words.',
      };
    }

    // Simulate wallet import
    const address = this.generateMockAddress();
    const publicKey = this.generateMockPublicKey();

    // Store in session
    session.data.walletAddress = address;
    session.data.publicKey = publicKey;
    session.data.walletMethod = 'import';

    return {
      success: true,
      address,
      publicKey,
      recoveryMethod: 'seed_phrase',
    };
  }

  // ============================================================================
  // Recovery Setup
  // ============================================================================

  /**
   * Setup recovery options
   */
  async setupRecovery(
    telegramId: string,
    options: RecoverySetupOptions
  ): Promise<{ success: boolean; configuredMethods: RecoveryMethod[] }> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    const configuredMethods: RecoveryMethod[] = [];

    for (const method of options.methods) {
      // Simulate configuring each recovery method
      configuredMethods.push(method);
    }

    // Store in session
    session.data.recoveryMethods = configuredMethods;
    session.data.trustedContacts = options.trustedContacts;

    return {
      success: true,
      configuredMethods,
    };
  }

  /**
   * Add trusted contact for social recovery
   */
  async addTrustedContact(
    telegramId: string,
    contact: Omit<TrustedContact, 'verified' | 'addedAt'>
  ): Promise<TrustedContact> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    const trustedContact: TrustedContact = {
      ...contact,
      verified: false,
      addedAt: new Date(),
    };

    if (!session.data.trustedContacts) {
      session.data.trustedContacts = [];
    }
    (session.data.trustedContacts as TrustedContact[]).push(trustedContact);

    return trustedContact;
  }

  // ============================================================================
  // AI Assistance
  // ============================================================================

  /**
   * Get AI-generated guidance for current step
   */
  async getAIGuidance(telegramId: string): Promise<AIGuidance> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    const currentStep = session.flow.steps[session.currentStepIndex];

    // Generate contextual guidance based on step type
    const guidance = this.generateGuidanceForStep(currentStep, session.user);

    return guidance;
  }

  /**
   * Answer user question during onboarding
   */
  async answerQuestion(telegramId: string, question: string): Promise<string> {
    const session = this.sessions.get(telegramId);
    if (!session) {
      throw new Error('No active onboarding session');
    }

    // AI would process the question here
    // For now, return contextual help based on keywords
    const currentStep = session.flow.steps[session.currentStepIndex];

    if (question.toLowerCase().includes('wallet')) {
      return 'Your wallet is a secure digital storage for your TON tokens. It\'s protected by cryptographic keys that only you control.';
    }

    if (question.toLowerCase().includes('recovery') || question.toLowerCase().includes('backup')) {
      return 'Recovery options ensure you can always access your funds. We recommend setting up at least two recovery methods for maximum security.';
    }

    if (question.toLowerCase().includes('safe') || question.toLowerCase().includes('secure')) {
      return 'TONAIAgent uses industry-standard security practices including encryption, secure key storage, and multi-factor authentication.';
    }

    return `I'm here to help you with ${currentStep.title}. What specific questions do you have?`;
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get onboarding analytics
   */
  getAnalytics(): OnboardingAnalytics {
    const totalSessions = this.sessions.size + this.completedUsers.size;
    const activeSessions = this.sessions.size;
    const completedSessions = this.completedUsers.size;

    const dropoffRates: Record<string, number> = {};
    const avgTimePerStep: Record<string, number> = {};

    // Calculate metrics from completed users
    // In production, this would query a database

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      completionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
      avgCompletionTime: 90, // seconds
      dropoffRates,
      avgTimePerStep,
      mostSkippedSteps: [],
      errorRates: {},
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateMockAddress(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let address = 'EQ';
    for (let i = 0; i < 46; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return address;
  }

  private generateMockPublicKey(): string {
    const chars = '0123456789abcdef';
    let key = '';
    for (let i = 0; i < 64; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  private generateMockSeedPhrase(): string[] {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
    ];
    return Array.from({ length: 24 }, () => words[Math.floor(Math.random() * words.length)]);
  }

  private generateGuidanceForStep(step: OnboardingStep, user: UserProfile): AIGuidance {
    const guidanceMap: Record<string, AIGuidance> = {
      welcome: {
        title: `Welcome, ${user.displayName}!`,
        message: 'Let me help you get started with autonomous finance on TON. This will only take about 2 minutes.',
        tips: [
          'TONAIAgent helps you manage your digital assets automatically',
          'AI agents can execute trading strategies 24/7',
          'You stay in full control of your funds at all times',
        ],
        encouragement: 'You\'re about to unlock the future of finance!',
      },
      wallet_create: {
        title: 'Creating Your Wallet',
        message: 'Your wallet is your gateway to the TON ecosystem. Let\'s set it up securely.',
        tips: [
          'Your wallet address is like a bank account number - safe to share',
          'Private keys are like your password - never share them',
          'We\'ll help you set up recovery options next',
        ],
        encouragement: 'This is the most important step - take your time!',
      },
      recovery_setup: {
        title: 'Protecting Your Funds',
        message: 'Let\'s make sure you can always access your wallet, even if you lose your device.',
        tips: [
          'Telegram Cloud backup is the easiest option',
          'Seed phrase gives you full control but requires secure storage',
          'Social recovery lets trusted friends help restore access',
        ],
        encouragement: 'Better safe than sorry - recovery setup is worth the extra minute!',
      },
      profile_setup: {
        title: 'Personalizing Your Experience',
        message: 'Help me understand your goals so I can provide better recommendations.',
        tips: [
          'Your risk tolerance affects strategy suggestions',
          'Investment goals help prioritize features',
          'You can always change these settings later',
        ],
        encouragement: 'Almost there! Just a few quick questions.',
      },
      tutorial: {
        title: 'Quick Tour',
        message: 'Let me show you around the key features.',
        tips: [
          'Chat with me anytime for help or to execute commands',
          'The dashboard shows your portfolio at a glance',
          'Explore pre-built strategies or create your own',
        ],
        encouragement: 'You\'re becoming a pro already!',
      },
      complete: {
        title: 'Congratulations!',
        message: 'You\'re all set to start your autonomous finance journey.',
        tips: [
          'Explore the Strategy Marketplace for proven strategies',
          'Start small and increase as you get comfortable',
          'I\'m always here to help - just ask!',
        ],
        encouragement: 'Welcome to the future of finance!',
      },
    };

    return guidanceMap[step.type] ?? {
      title: step.title,
      message: step.description,
      tips: [],
      encouragement: 'You\'re doing great!',
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Telegram init data (from WebApp)
 */
export interface TelegramInitData {
  user?: {
    id: string;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
    is_premium?: boolean;
  };
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
}

/**
 * Internal session tracking
 */
interface OnboardingSession {
  user: UserProfile;
  flow: OnboardingConfig;
  currentStepIndex: number;
  startTime: number;
  stepStartTime: number;
  data: Record<string, unknown>;
}

/**
 * AI guidance content
 */
export interface AIGuidance {
  title: string;
  message: string;
  tips: string[];
  encouragement: string;
}

/**
 * Onboarding analytics
 */
export interface OnboardingAnalytics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  completionRate: number;
  avgCompletionTime: number;
  dropoffRates: Record<string, number>;
  avgTimePerStep: Record<string, number>;
  mostSkippedSteps: string[];
  errorRates: Record<string, number>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an OnboardingManager with default configuration
 */
export function createOnboardingManager(
  config?: Partial<OnboardingManagerConfig>
): OnboardingManager {
  return new OnboardingManager(config);
}

/**
 * Get default onboarding flows
 */
export function getDefaultFlows(): OnboardingConfig[] {
  return [BEGINNER_ONBOARDING, ADVANCED_ONBOARDING, INSTITUTIONAL_ONBOARDING];
}
