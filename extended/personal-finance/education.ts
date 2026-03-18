/**
 * TONAIAgent - Financial Education Module
 *
 * Interactive financial education with learning modules, quizzes, simulations,
 * and gamification to help users build financial literacy.
 */

import {
  EducationModule,
  EducationCategory,
  QuizQuestion,
  Simulation,
  SimulationParameters,
  UserEducationProgress,
  Badge,
  Certificate,
  EducationConfig,
  PersonalFinanceEvent,
  PersonalFinanceEventCallback,
} from './types';

// ============================================================================
// Education Manager Interface
// ============================================================================

export interface EducationManager {
  readonly config: EducationConfig;

  // Module management
  getModules(category?: EducationCategory): Promise<EducationModule[]>;
  getModule(moduleId: string): Promise<EducationModule | null>;
  getRecommendedModules(userId: string): Promise<EducationModule[]>;

  // Learning progress
  startModule(userId: string, moduleId: string): Promise<LearningSession>;
  completeLesson(userId: string, moduleId: string, lessonId: string): Promise<LessonCompletion>;
  getUserProgress(userId: string): Promise<UserEducationProgress>;
  updateProgress(userId: string, updates: ProgressUpdate): Promise<UserEducationProgress>;

  // Quizzes
  startQuiz(userId: string, moduleId: string, quizId: string): Promise<QuizSession>;
  submitQuizAnswer(sessionId: string, questionId: string, answer: string | number): Promise<AnswerResult>;
  completeQuiz(sessionId: string): Promise<QuizResult>;
  getQuizHistory(userId: string): Promise<QuizHistoryEntry[]>;

  // Simulations
  startSimulation(userId: string, simulationId: string): Promise<SimulationSession>;
  executeSimulationAction(sessionId: string, action: SimulationAction): Promise<SimulationState>;
  completeSimulation(sessionId: string): Promise<SimulationResult>;

  // Gamification
  awardBadge(userId: string, badgeId: string): Promise<Badge>;
  awardCertificate(userId: string, moduleId: string, score: number): Promise<Certificate>;
  getLeaderboard(category?: string, limit?: number): Promise<LeaderboardEntry[]>;
  getAchievements(userId: string): Promise<Achievement[]>;

  // Learning paths
  createLearningPath(userId: string, goals: string[]): Promise<LearningPath>;
  getLearningPath(userId: string): Promise<LearningPath | null>;
  updateLearningPath(userId: string, path: Partial<LearningPath>): Promise<LearningPath>;

  // Configuration
  updateConfig(config: Partial<EducationConfig>): void;

  // Events
  onEvent(callback: PersonalFinanceEventCallback): void;
}

export interface LearningSession {
  id: string;
  userId: string;
  moduleId: string;
  startedAt: Date;
  currentLesson: number;
  completedLessons: string[];
  progress: number;
}

export interface LessonCompletion {
  lessonId: string;
  completedAt: Date;
  timeSpent: number;
  pointsEarned: number;
  nextLesson?: string;
}

export interface ProgressUpdate {
  completedModules?: string[];
  completedLessons?: string[];
  points?: number;
  badges?: string[];
  certificates?: string[];
}

export interface QuizSession {
  id: string;
  userId: string;
  moduleId: string;
  quizId: string;
  startedAt: Date;
  questions: QuizQuestion[];
  currentQuestion: number;
  answers: Map<string, string | number>;
  timeRemaining?: number;
}

export interface AnswerResult {
  correct: boolean;
  explanation: string;
  pointsEarned: number;
}

export interface QuizResult {
  sessionId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passed: boolean;
  timeSpent: number;
  pointsEarned: number;
  certificateAwarded?: Certificate;
}

export interface QuizHistoryEntry {
  quizId: string;
  moduleId: string;
  completedAt: Date;
  score: number;
  passed: boolean;
}

export interface SimulationSession {
  id: string;
  userId: string;
  simulationId: string;
  startedAt: Date;
  parameters: SimulationParameters;
  state: SimulationState;
  actions: SimulationAction[];
}

export interface SimulationState {
  currentDay: number;
  totalDays: number;
  portfolioValue: number;
  cash: number;
  holdings: SimulationHolding[];
  marketCondition: string;
  events: SimulationEvent[];
  performance: SimulationPerformance;
}

export interface SimulationHolding {
  asset: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
}

export interface SimulationEvent {
  day: number;
  type: string;
  description: string;
  impact?: number;
}

export interface SimulationPerformance {
  totalReturn: number;
  returnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: number;
}

export interface SimulationAction {
  type: 'buy' | 'sell' | 'hold' | 'rebalance';
  asset?: string;
  amount?: number;
  reason?: string;
}

export interface SimulationResult {
  sessionId: string;
  simulationId: string;
  finalValue: number;
  totalReturn: number;
  returnPercent: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  learningPoints: string[];
  pointsEarned: number;
  badgeAwarded?: Badge;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  points: number;
  badges: number;
  streak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  earned: boolean;
  earnedAt?: Date;
  progress?: number;
  requirement?: number;
}

export interface LearningPath {
  id: string;
  userId: string;
  name: string;
  goals: string[];
  modules: PathModule[];
  currentModule: number;
  progress: number;
  estimatedCompletion: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PathModule {
  moduleId: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultEducationManager implements EducationManager {
  private _config: EducationConfig;
  private readonly modules: Map<string, EducationModule> = new Map();
  private readonly userProgress: Map<string, UserEducationProgress> = new Map();
  private readonly learningSessions: Map<string, LearningSession> = new Map();
  private readonly quizSessions: Map<string, QuizSession> = new Map();
  private readonly simulationSessions: Map<string, SimulationSession> = new Map();
  private readonly learningPaths: Map<string, LearningPath> = new Map();
  private readonly eventCallbacks: PersonalFinanceEventCallback[] = [];

  constructor(config?: Partial<EducationConfig>) {
    this._config = {
      enabled: true,
      adaptiveLearning: true,
      gamificationEnabled: true,
      simulationsEnabled: true,
      ...config,
    };

    // Initialize default modules
    this.initializeDefaultModules();
  }

  get config(): EducationConfig {
    return this._config;
  }

  async getModules(category?: EducationCategory): Promise<EducationModule[]> {
    const allModules = Array.from(this.modules.values());
    if (category) {
      return allModules.filter(m => m.category === category);
    }
    return allModules;
  }

  async getModule(moduleId: string): Promise<EducationModule | null> {
    return this.modules.get(moduleId) ?? null;
  }

  async getRecommendedModules(userId: string): Promise<EducationModule[]> {
    const progress = this.userProgress.get(userId);
    const completedIds = progress?.completedModules ?? [];

    // Get modules not completed, sorted by difficulty
    const allModules = Array.from(this.modules.values());
    const incomplete = allModules.filter(m => !completedIds.includes(m.id));

    // Sort by difficulty and prerequisites
    incomplete.sort((a, b) => {
      const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });

    // Return top recommendations
    return incomplete.slice(0, 5);
  }

  async startModule(userId: string, moduleId: string): Promise<LearningSession> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const sessionId = `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const session: LearningSession = {
      id: sessionId,
      userId,
      moduleId,
      startedAt: new Date(),
      currentLesson: 0,
      completedLessons: [],
      progress: 0,
    };

    this.learningSessions.set(sessionId, session);

    // Update user progress
    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = this.initializeProgress(userId);
    }
    progress.currentModule = moduleId;
    this.userProgress.set(userId, progress);

    return session;
  }

  async completeLesson(
    userId: string,
    moduleId: string,
    lessonId: string
  ): Promise<LessonCompletion> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const lesson = module.lessons.find(l => l.id === lessonId);
    if (!lesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }

    const pointsEarned = this._config.gamificationEnabled ? 10 : 0;

    // Update user progress
    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = this.initializeProgress(userId);
    }

    progress.totalPoints += pointsEarned;
    progress.streak += 1;
    progress.lastActivityDate = new Date();
    this.userProgress.set(userId, progress);

    // Find next lesson
    const currentIndex = module.lessons.findIndex(l => l.id === lessonId);
    const nextLesson = module.lessons[currentIndex + 1];

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'education_completed',
      userId,
      action: 'lesson_completed',
      resource: 'education_lesson',
      resourceId: lessonId,
      details: { moduleId, pointsEarned },
      metadata: {},
    });

    return {
      lessonId,
      completedAt: new Date(),
      timeSpent: lesson.duration * 60, // Convert minutes to seconds
      pointsEarned,
      nextLesson: nextLesson?.id,
    };
  }

  async getUserProgress(userId: string): Promise<UserEducationProgress> {
    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = this.initializeProgress(userId);
      this.userProgress.set(userId, progress);
    }
    return progress;
  }

  async updateProgress(userId: string, updates: ProgressUpdate): Promise<UserEducationProgress> {
    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = this.initializeProgress(userId);
    }

    if (updates.completedModules) {
      progress.completedModules.push(...updates.completedModules);
    }
    if (updates.points) {
      progress.totalPoints += updates.points;
    }
    if (updates.badges) {
      for (const badgeId of updates.badges) {
        const badge = this.createBadge(badgeId);
        progress.badges.push(badge);
      }
    }

    progress.lastActivityDate = new Date();
    this.userProgress.set(userId, progress);

    return progress;
  }

  async startQuiz(userId: string, moduleId: string, quizId: string): Promise<QuizSession> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const quiz = module.quizzes.find(q => q.id === quizId);
    if (!quiz) {
      throw new Error(`Quiz not found: ${quizId}`);
    }

    const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const session: QuizSession = {
      id: sessionId,
      userId,
      moduleId,
      quizId,
      startedAt: new Date(),
      questions: [...quiz.questions],
      currentQuestion: 0,
      answers: new Map(),
      timeRemaining: quiz.timeLimit,
    };

    this.quizSessions.set(sessionId, session);

    return session;
  }

  async submitQuizAnswer(
    sessionId: string,
    questionId: string,
    answer: string | number
  ): Promise<AnswerResult> {
    const session = this.quizSessions.get(sessionId);
    if (!session) {
      throw new Error(`Quiz session not found: ${sessionId}`);
    }

    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error(`Question not found: ${questionId}`);
    }

    session.answers.set(questionId, answer);
    session.currentQuestion += 1;

    const correct = String(answer) === String(question.correctAnswer);
    const pointsEarned = correct && this._config.gamificationEnabled ? 5 : 0;

    return {
      correct,
      explanation: question.explanation,
      pointsEarned,
    };
  }

  async completeQuiz(sessionId: string): Promise<QuizResult> {
    const session = this.quizSessions.get(sessionId);
    if (!session) {
      throw new Error(`Quiz session not found: ${sessionId}`);
    }

    let correctAnswers = 0;
    for (const question of session.questions) {
      const answer = session.answers.get(question.id);
      if (String(answer) === String(question.correctAnswer)) {
        correctAnswers += 1;
      }
    }

    const score = (correctAnswers / session.questions.length) * 100;
    const module = this.modules.get(session.moduleId);
    const quiz = module?.quizzes.find(q => q.id === session.quizId);
    const passed = score >= (quiz?.passingScore ?? 70);

    const timeSpent = (Date.now() - session.startedAt.getTime()) / 1000;
    const pointsEarned = this._config.gamificationEnabled ? Math.round(score / 2) : 0;

    // Update user progress
    let progress = this.userProgress.get(session.userId);
    if (!progress) {
      progress = this.initializeProgress(session.userId);
    }
    progress.totalPoints += pointsEarned;
    this.userProgress.set(session.userId, progress);

    // Award certificate if passed
    let certificate: Certificate | undefined;
    if (passed) {
      certificate = await this.awardCertificate(session.userId, session.moduleId, score);
    }

    // Clean up session
    this.quizSessions.delete(sessionId);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'education_completed',
      userId: session.userId,
      action: 'quiz_completed',
      resource: 'education_quiz',
      resourceId: session.quizId,
      details: { score, passed, pointsEarned },
      metadata: {},
    });

    return {
      sessionId,
      quizId: session.quizId,
      score,
      totalQuestions: session.questions.length,
      correctAnswers,
      passed,
      timeSpent,
      pointsEarned,
      certificateAwarded: certificate,
    };
  }

  async getQuizHistory(_userId: string): Promise<QuizHistoryEntry[]> {
    // Would fetch from database
    return [];
  }

  async startSimulation(userId: string, simulationId: string): Promise<SimulationSession> {
    // Find simulation across all modules
    let simulation: Simulation | undefined;
    for (const module of this.modules.values()) {
      simulation = module.simulations.find(s => s.id === simulationId);
      if (simulation) break;
    }

    if (!simulation) {
      throw new Error(`Simulation not found: ${simulationId}`);
    }

    const sessionId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const session: SimulationSession = {
      id: sessionId,
      userId,
      simulationId,
      startedAt: new Date(),
      parameters: simulation.parameters,
      state: this.initializeSimulationState(simulation.parameters),
      actions: [],
    };

    this.simulationSessions.set(sessionId, session);

    return session;
  }

  async executeSimulationAction(
    sessionId: string,
    action: SimulationAction
  ): Promise<SimulationState> {
    const session = this.simulationSessions.get(sessionId);
    if (!session) {
      throw new Error(`Simulation session not found: ${sessionId}`);
    }

    session.actions.push(action);

    // Process action
    const state = session.state;
    if (action.type === 'buy' && action.asset && action.amount) {
      const price = this.getSimulatedPrice(action.asset, state.currentDay);
      const quantity = action.amount / price;
      state.cash -= action.amount;

      const existing = state.holdings.find(h => h.asset === action.asset);
      if (existing) {
        const totalQuantity = existing.quantity + quantity;
        existing.averageCost = ((existing.quantity * existing.averageCost) + action.amount) / totalQuantity;
        existing.quantity = totalQuantity;
        existing.currentPrice = price;
      } else {
        state.holdings.push({
          asset: action.asset,
          quantity,
          averageCost: price,
          currentPrice: price,
        });
      }
    } else if (action.type === 'sell' && action.asset && action.amount) {
      const holding = state.holdings.find(h => h.asset === action.asset);
      if (holding && holding.quantity * holding.currentPrice >= action.amount) {
        const price = holding.currentPrice;
        const quantity = action.amount / price;
        holding.quantity -= quantity;
        state.cash += action.amount;
      }
    }

    // Advance day
    state.currentDay += 1;

    // Update prices
    for (const holding of state.holdings) {
      holding.currentPrice = this.getSimulatedPrice(holding.asset, state.currentDay);
    }

    // Calculate portfolio value
    state.portfolioValue = state.cash + state.holdings.reduce(
      (sum, h) => sum + h.quantity * h.currentPrice, 0
    );

    // Update performance
    state.performance.totalReturn = state.portfolioValue - session.parameters.initialCapital;
    state.performance.returnPercent = (state.performance.totalReturn / session.parameters.initialCapital) * 100;
    state.performance.trades = session.actions.filter(a => a.type === 'buy' || a.type === 'sell').length;

    return state;
  }

  async completeSimulation(sessionId: string): Promise<SimulationResult> {
    const session = this.simulationSessions.get(sessionId);
    if (!session) {
      throw new Error(`Simulation session not found: ${sessionId}`);
    }

    const finalValue = session.state.portfolioValue;
    const totalReturn = finalValue - session.parameters.initialCapital;
    const returnPercent = (totalReturn / session.parameters.initialCapital) * 100;

    // Determine grade
    let grade: SimulationResult['grade'];
    if (returnPercent >= 20) grade = 'A';
    else if (returnPercent >= 10) grade = 'B';
    else if (returnPercent >= 0) grade = 'C';
    else if (returnPercent >= -10) grade = 'D';
    else grade = 'F';

    // Generate learning points
    const learningPoints: string[] = [];
    if (session.actions.filter(a => a.type === 'buy' || a.type === 'sell').length > session.state.totalDays / 2) {
      learningPoints.push('You traded frequently - consider a buy-and-hold strategy for better results');
    }
    if (returnPercent > 0) {
      learningPoints.push('You generated positive returns - keep learning and refining your strategy');
    }
    if (session.state.holdings.length < 3) {
      learningPoints.push('Consider diversifying across more assets to reduce risk');
    }

    const pointsEarned = this._config.gamificationEnabled
      ? Math.max(0, Math.round(returnPercent + 20))
      : 0;

    // Clean up session
    this.simulationSessions.delete(sessionId);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'education_completed',
      userId: session.userId,
      action: 'simulation_completed',
      resource: 'education_simulation',
      resourceId: session.simulationId,
      details: { finalValue, returnPercent, grade },
      metadata: {},
    });

    return {
      sessionId,
      simulationId: session.simulationId,
      finalValue,
      totalReturn,
      returnPercent,
      grade,
      learningPoints,
      pointsEarned,
    };
  }

  async awardBadge(userId: string, badgeId: string): Promise<Badge> {
    const badge = this.createBadge(badgeId);

    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = this.initializeProgress(userId);
    }

    progress.badges.push(badge);
    this.userProgress.set(userId, progress);

    return badge;
  }

  async awardCertificate(userId: string, moduleId: string, score: number): Promise<Certificate> {
    const module = this.modules.get(moduleId);
    const certificate: Certificate = {
      id: `cert_${Date.now()}`,
      moduleId,
      title: module?.title ?? moduleId,
      issuedAt: new Date(),
      score,
    };

    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = this.initializeProgress(userId);
    }

    progress.certificates.push(certificate);
    if (!progress.completedModules.includes(moduleId)) {
      progress.completedModules.push(moduleId);
    }
    this.userProgress.set(userId, progress);

    return certificate;
  }

  async getLeaderboard(_category?: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const entries: LeaderboardEntry[] = [];

    for (const [userId, progress] of this.userProgress) {
      entries.push({
        rank: 0, // Will be calculated
        userId,
        username: `User_${userId.slice(-4)}`,
        points: progress.totalPoints,
        badges: progress.badges.length,
        streak: progress.streak,
      });
    }

    // Sort by points
    entries.sort((a, b) => b.points - a.points);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries.slice(0, limit);
  }

  async getAchievements(userId: string): Promise<Achievement[]> {
    const progress = this.userProgress.get(userId);
    const achievements: Achievement[] = [
      {
        id: 'first_lesson',
        name: 'First Steps',
        description: 'Complete your first lesson',
        category: 'learning',
        earned: (progress?.completedModules.length ?? 0) > 0,
        earnedAt: progress?.lastActivityDate,
      },
      {
        id: 'quiz_master',
        name: 'Quiz Master',
        description: 'Complete 5 quizzes',
        category: 'quizzes',
        earned: (progress?.certificates.length ?? 0) >= 5,
        progress: progress?.certificates.length ?? 0,
        requirement: 5,
      },
      {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        category: 'streaks',
        earned: (progress?.streak ?? 0) >= 7,
        progress: progress?.streak ?? 0,
        requirement: 7,
      },
      {
        id: 'point_collector',
        name: 'Point Collector',
        description: 'Earn 1000 points',
        category: 'points',
        earned: (progress?.totalPoints ?? 0) >= 1000,
        progress: progress?.totalPoints ?? 0,
        requirement: 1000,
      },
    ];

    return achievements;
  }

  async createLearningPath(userId: string, goals: string[]): Promise<LearningPath> {
    const pathId = `path_${Date.now()}`;

    // Select modules based on goals
    const selectedModules: PathModule[] = [];
    const allModules = Array.from(this.modules.values());

    for (const goal of goals) {
      const matching = allModules.filter(m =>
        m.title.toLowerCase().includes(goal.toLowerCase()) ||
        m.description.toLowerCase().includes(goal.toLowerCase())
      );
      for (const module of matching) {
        if (!selectedModules.find(sm => sm.moduleId === module.id)) {
          selectedModules.push({
            moduleId: module.id,
            order: selectedModules.length,
            status: 'pending',
          });
        }
      }
    }

    // If no specific matches, add beginner modules
    if (selectedModules.length === 0) {
      const beginnerModules = allModules.filter(m => m.difficulty === 'beginner');
      for (const module of beginnerModules) {
        selectedModules.push({
          moduleId: module.id,
          order: selectedModules.length,
          status: 'pending',
        });
      }
    }

    const path: LearningPath = {
      id: pathId,
      userId,
      name: `Personal Learning Path`,
      goals,
      modules: selectedModules,
      currentModule: 0,
      progress: 0,
      estimatedCompletion: new Date(Date.now() + selectedModules.length * 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.learningPaths.set(userId, path);

    return path;
  }

  async getLearningPath(userId: string): Promise<LearningPath | null> {
    return this.learningPaths.get(userId) ?? null;
  }

  async updateLearningPath(userId: string, updates: Partial<LearningPath>): Promise<LearningPath> {
    const path = this.learningPaths.get(userId);
    if (!path) {
      throw new Error(`Learning path not found for user: ${userId}`);
    }

    Object.assign(path, updates);
    path.updatedAt = new Date();
    this.learningPaths.set(userId, path);

    return path;
  }

  updateConfig(config: Partial<EducationConfig>): void {
    this._config = { ...this._config, ...config };
  }

  onEvent(callback: PersonalFinanceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializeDefaultModules(): void {
    const basicsModule: EducationModule = {
      id: 'mod_basics',
      title: 'Financial Basics',
      description: 'Learn the fundamentals of personal finance',
      category: 'basics',
      difficulty: 'beginner',
      duration: 60,
      lessons: [
        {
          id: 'les_budgeting',
          title: 'Budgeting 101',
          content: 'Learn how to create and maintain a budget that works for you.',
          format: 'text',
          duration: 15,
          keyTakeaways: ['Track income and expenses', 'Use the 50/30/20 rule', 'Review monthly'],
          resources: [],
        },
        {
          id: 'les_saving',
          title: 'The Power of Saving',
          content: 'Understand why saving is crucial and how to make it automatic.',
          format: 'text',
          duration: 15,
          keyTakeaways: ['Pay yourself first', 'Build emergency fund', 'Automate savings'],
          resources: [],
        },
        {
          id: 'les_compound',
          title: 'Compound Interest Magic',
          content: 'Discover how compound interest can grow your wealth over time.',
          format: 'text',
          duration: 15,
          keyTakeaways: ['Time is your friend', 'Start early', 'Reinvest returns'],
          resources: [],
        },
      ],
      quizzes: [
        {
          id: 'quiz_basics',
          title: 'Basics Quiz',
          questions: [
            {
              id: 'q1',
              question: 'What percentage of income should you ideally save according to the 50/30/20 rule?',
              type: 'multiple_choice',
              options: ['10%', '20%', '30%', '50%'],
              correctAnswer: '20%',
              explanation: 'The 50/30/20 rule suggests saving 20% of income.',
            },
            {
              id: 'q2',
              question: 'How many months of expenses should an emergency fund cover?',
              type: 'multiple_choice',
              options: ['1-2 months', '3-6 months', '12+ months', 'No specific amount'],
              correctAnswer: '3-6 months',
              explanation: 'Most experts recommend 3-6 months of expenses.',
            },
          ],
          passingScore: 70,
          timeLimit: 600,
        },
      ],
      simulations: [],
      prerequisites: [],
      rewards: [
        { type: 'badge', value: 'basics_complete', condition: 'Complete all lessons' },
        { type: 'points', value: 100, condition: 'Pass the quiz' },
      ],
    };

    const investingModule: EducationModule = {
      id: 'mod_investing',
      title: 'Introduction to Investing',
      description: 'Learn the basics of investing and building a portfolio',
      category: 'investing',
      difficulty: 'beginner',
      duration: 90,
      lessons: [
        {
          id: 'les_invest_basics',
          title: 'Why Invest?',
          content: 'Understand the importance of investing for long-term wealth building.',
          format: 'text',
          duration: 20,
          keyTakeaways: ['Beat inflation', 'Passive income', 'Long-term growth'],
          resources: [],
        },
        {
          id: 'les_risk',
          title: 'Understanding Risk',
          content: 'Learn about different types of investment risk and how to manage them.',
          format: 'text',
          duration: 25,
          keyTakeaways: ['Risk vs return', 'Diversification', 'Time horizon matters'],
          resources: [],
        },
        {
          id: 'les_portfolio',
          title: 'Building a Portfolio',
          content: 'Learn how to construct a diversified investment portfolio.',
          format: 'text',
          duration: 25,
          keyTakeaways: ['Asset allocation', 'Rebalancing', 'Dollar cost averaging'],
          resources: [],
        },
      ],
      quizzes: [
        {
          id: 'quiz_investing',
          title: 'Investing Basics Quiz',
          questions: [
            {
              id: 'q1',
              question: 'What is diversification?',
              type: 'multiple_choice',
              options: [
                'Putting all money in one asset',
                'Spreading investments across different assets',
                'Only investing in stocks',
                'Timing the market',
              ],
              correctAnswer: 'Spreading investments across different assets',
              explanation: 'Diversification spreads risk across different investments.',
            },
          ],
          passingScore: 70,
          timeLimit: 600,
        },
      ],
      simulations: [
        {
          id: 'sim_portfolio',
          title: 'Portfolio Building Simulation',
          description: 'Practice building and managing a portfolio',
          type: 'portfolio',
          parameters: {
            initialCapital: 10000,
            duration: '30 days',
            marketConditions: 'random',
            availableAssets: ['BTC', 'ETH', 'TON', 'USDT'],
          },
          learningObjectives: ['Understand asset allocation', 'Practice rebalancing', 'Manage risk'],
        },
      ],
      prerequisites: ['mod_basics'],
      rewards: [
        { type: 'badge', value: 'investor_basics', condition: 'Complete all lessons' },
        { type: 'certificate', value: 'Investing Basics', condition: 'Pass quiz with 80%+' },
      ],
    };

    const cryptoModule: EducationModule = {
      id: 'mod_crypto',
      title: 'Crypto and DeFi Fundamentals',
      description: 'Learn about cryptocurrency and decentralized finance',
      category: 'crypto',
      difficulty: 'intermediate',
      duration: 120,
      lessons: [
        {
          id: 'les_blockchain',
          title: 'What is Blockchain?',
          content: 'Understanding the technology behind cryptocurrencies.',
          format: 'text',
          duration: 30,
          keyTakeaways: ['Decentralization', 'Immutability', 'Consensus mechanisms'],
          resources: [],
        },
        {
          id: 'les_defi',
          title: 'Introduction to DeFi',
          content: 'Explore decentralized finance and its opportunities.',
          format: 'text',
          duration: 30,
          keyTakeaways: ['DEXs', 'Yield farming', 'Liquidity pools'],
          resources: [],
        },
        {
          id: 'les_ton',
          title: 'The Open Network (TON)',
          content: 'Learn about the TON blockchain ecosystem.',
          format: 'text',
          duration: 30,
          keyTakeaways: ['TON architecture', 'Jettons', 'TON wallets'],
          resources: [],
        },
      ],
      quizzes: [
        {
          id: 'quiz_crypto',
          title: 'Crypto Fundamentals Quiz',
          questions: [
            {
              id: 'q1',
              question: 'What does DeFi stand for?',
              type: 'multiple_choice',
              options: ['Digital Finance', 'Decentralized Finance', 'Defined Finance', 'Deferred Finance'],
              correctAnswer: 'Decentralized Finance',
              explanation: 'DeFi stands for Decentralized Finance.',
            },
          ],
          passingScore: 70,
          timeLimit: 600,
        },
      ],
      simulations: [],
      prerequisites: ['mod_investing'],
      rewards: [
        { type: 'badge', value: 'crypto_fundamentals', condition: 'Complete all lessons' },
      ],
    };

    const behavioralModule: EducationModule = {
      id: 'mod_behavioral',
      title: 'Behavioral Finance',
      description: 'Understand the psychology of investing',
      category: 'behavioral_finance',
      difficulty: 'intermediate',
      duration: 90,
      lessons: [
        {
          id: 'les_biases',
          title: 'Common Investing Biases',
          content: 'Learn about psychological biases that affect financial decisions.',
          format: 'text',
          duration: 30,
          keyTakeaways: ['Loss aversion', 'Confirmation bias', 'Overconfidence'],
          resources: [],
        },
        {
          id: 'les_emotions',
          title: 'Emotions and Money',
          content: 'Understand how emotions influence financial decisions.',
          format: 'text',
          duration: 30,
          keyTakeaways: ['Fear and greed cycle', 'FOMO', 'Panic selling'],
          resources: [],
        },
      ],
      quizzes: [],
      simulations: [],
      prerequisites: [],
      rewards: [
        { type: 'badge', value: 'behavioral_aware', condition: 'Complete all lessons' },
      ],
    };

    this.modules.set(basicsModule.id, basicsModule);
    this.modules.set(investingModule.id, investingModule);
    this.modules.set(cryptoModule.id, cryptoModule);
    this.modules.set(behavioralModule.id, behavioralModule);
  }

  private initializeProgress(userId: string): UserEducationProgress {
    return {
      userId,
      completedModules: [],
      currentModule: undefined,
      totalPoints: 0,
      badges: [],
      certificates: [],
      literacyScore: 0,
      streak: 0,
      lastActivityDate: new Date(),
    };
  }

  private initializeSimulationState(params: SimulationParameters): SimulationState {
    return {
      currentDay: 0,
      totalDays: parseInt(params.duration) || 30,
      portfolioValue: params.initialCapital,
      cash: params.initialCapital,
      holdings: [],
      marketCondition: params.marketConditions,
      events: [],
      performance: {
        totalReturn: 0,
        returnPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        trades: 0,
      },
    };
  }

  private getSimulatedPrice(asset: string, day: number): number {
    // Simple price simulation with some randomness
    const basePrices: Record<string, number> = {
      BTC: 50000,
      ETH: 3000,
      TON: 5,
      USDT: 1,
    };

    const basePrice = basePrices[asset] ?? 100;
    const volatility = asset === 'USDT' ? 0.001 : 0.05;
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatility;
    const trendFactor = 1 + (day / 100) * (Math.random() - 0.3) * 0.1;

    return basePrice * randomFactor * trendFactor;
  }

  private createBadge(badgeId: string): Badge {
    const badgeInfo: Record<string, { name: string; description: string; category: string }> = {
      basics_complete: { name: 'Financial Foundations', description: 'Completed basics module', category: 'learning' },
      investor_basics: { name: 'Beginner Investor', description: 'Completed investing basics', category: 'learning' },
      crypto_fundamentals: { name: 'Crypto Explorer', description: 'Learned crypto fundamentals', category: 'crypto' },
      behavioral_aware: { name: 'Mind Over Money', description: 'Learned behavioral finance', category: 'psychology' },
      first_quiz: { name: 'Quiz Taker', description: 'Completed first quiz', category: 'quizzes' },
      first_simulation: { name: 'Simulator', description: 'Completed first simulation', category: 'simulations' },
    };

    const info = badgeInfo[badgeId] ?? { name: badgeId, description: 'Achievement unlocked', category: 'general' };

    return {
      id: badgeId,
      name: info.name,
      description: info.description,
      earnedAt: new Date(),
      category: info.category,
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

export function createEducationManager(
  config?: Partial<EducationConfig>
): DefaultEducationManager {
  return new DefaultEducationManager(config);
}
