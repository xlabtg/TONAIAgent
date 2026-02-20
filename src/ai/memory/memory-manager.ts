/**
 * TONAIAgent - Memory Manager
 *
 * Manages agent memory including short-term, long-term, episodic,
 * and semantic memory with vector search capabilities.
 */

import {
  MemoryEntry,
  MemoryQuery,
  MemoryType,
  MemoryMetadata,
  MemoryConfig,
  Message,
} from '../types';

// ============================================================================
// Memory Store Interface
// ============================================================================

export interface MemoryStore {
  add(entry: MemoryEntry): Promise<void>;
  get(id: string): Promise<MemoryEntry | null>;
  query(query: MemoryQuery): Promise<MemoryEntry[]>;
  update(id: string, updates: Partial<MemoryEntry>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(agentId: string): Promise<void>;
}

// ============================================================================
// In-Memory Store Implementation
// ============================================================================

export class InMemoryStore implements MemoryStore {
  private readonly entries = new Map<string, MemoryEntry>();

  async add(entry: MemoryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this.entries.get(id) ?? null;
  }

  async query(query: MemoryQuery): Promise<MemoryEntry[]> {
    let results = Array.from(this.entries.values()).filter(
      (entry) => entry.agentId === query.agentId
    );

    // Filter by types
    if (query.types && query.types.length > 0) {
      results = results.filter((entry) => query.types!.includes(entry.type));
    }

    // Filter by importance
    if (query.minImportance !== undefined) {
      results = results.filter((entry) => entry.importance >= query.minImportance!);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((entry) =>
        query.tags!.some((tag) => entry.metadata.tags?.includes(tag))
      );
    }

    // Filter by time range
    if (query.timeRange) {
      if (query.timeRange.start) {
        results = results.filter((entry) => entry.createdAt >= query.timeRange!.start!);
      }
      if (query.timeRange.end) {
        results = results.filter((entry) => entry.createdAt <= query.timeRange!.end!);
      }
    }

    // Sort by importance and recency
    results.sort((a, b) => {
      const importanceDiff = b.importance - a.importance;
      if (importanceDiff !== 0) return importanceDiff;
      return b.accessedAt.getTime() - a.accessedAt.getTime();
    });

    // Apply limit
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async update(id: string, updates: Partial<MemoryEntry>): Promise<void> {
    const entry = this.entries.get(id);
    if (entry) {
      this.entries.set(id, { ...entry, ...updates });
    }
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async clear(agentId: string): Promise<void> {
    for (const [id, entry] of this.entries) {
      if (entry.agentId === agentId) {
        this.entries.delete(id);
      }
    }
  }
}

// ============================================================================
// Simple Vector Store (for semantic search)
// ============================================================================

export class SimpleVectorStore {
  private readonly embeddings = new Map<string, { entry: MemoryEntry; vector: number[] }>();

  async add(entry: MemoryEntry, embedding: number[]): Promise<void> {
    this.embeddings.set(entry.id, { entry, vector: embedding });
  }

  async search(
    queryEmbedding: number[],
    agentId: string,
    limit: number = 10
  ): Promise<Array<{ entry: MemoryEntry; similarity: number }>> {
    const results: Array<{ entry: MemoryEntry; similarity: number }> = [];

    for (const { entry, vector } of this.embeddings.values()) {
      if (entry.agentId !== agentId) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, vector);
      results.push({ entry, similarity });
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.embeddings.delete(id);
  }

  async clear(agentId: string): Promise<void> {
    for (const [id, { entry }] of this.embeddings) {
      if (entry.agentId === agentId) {
        this.embeddings.delete(id);
      }
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// ============================================================================
// Memory Manager
// ============================================================================

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export class MemoryManager {
  private readonly store: MemoryStore;
  private readonly vectorStore: SimpleVectorStore;
  private readonly config: MemoryConfig;
  private embeddingProvider?: EmbeddingProvider;

  // Short-term memory cache (per agent, per session)
  private readonly shortTermCache = new Map<string, Message[]>();

  constructor(config: MemoryConfig, store?: MemoryStore) {
    this.config = config;
    this.store = store ?? new InMemoryStore();
    this.vectorStore = new SimpleVectorStore();
  }

  /**
   * Set the embedding provider for vector search
   */
  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
  }

  /**
   * Add a message to short-term memory
   */
  addToShortTerm(agentId: string, sessionId: string, message: Message): void {
    const key = `${agentId}:${sessionId}`;
    const messages = this.shortTermCache.get(key) ?? [];

    messages.push(message);

    // Enforce capacity limit
    if (messages.length > this.config.shortTermCapacity) {
      messages.shift();
    }

    this.shortTermCache.set(key, messages);
  }

  /**
   * Get short-term memory for a session
   */
  getShortTerm(agentId: string, sessionId: string): Message[] {
    const key = `${agentId}:${sessionId}`;
    return this.shortTermCache.get(key) ?? [];
  }

  /**
   * Clear short-term memory for a session
   */
  clearShortTerm(agentId: string, sessionId: string): void {
    const key = `${agentId}:${sessionId}`;
    this.shortTermCache.delete(key);
  }

  /**
   * Store a memory entry in long-term storage
   */
  async storeLongTerm(
    agentId: string,
    content: string,
    type: MemoryType,
    metadata: MemoryMetadata = {},
    importance: number = 0.5
  ): Promise<MemoryEntry> {
    if (!this.config.longTermEnabled) {
      throw new Error('Long-term memory is not enabled');
    }

    const entry: MemoryEntry = {
      id: this.generateId(),
      agentId,
      type,
      content,
      metadata,
      importance,
      createdAt: new Date(),
      accessedAt: new Date(),
    };

    await this.store.add(entry);

    // Add to vector store if embedding provider is available
    if (this.config.vectorSearch && this.embeddingProvider) {
      const embedding = await this.embeddingProvider.embed(content);
      entry.embedding = embedding;
      await this.vectorStore.add(entry, embedding);
    }

    return entry;
  }

  /**
   * Retrieve memories based on a query
   */
  async retrieve(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results = await this.store.query(query);

    // Update access timestamps
    for (const entry of results) {
      await this.store.update(entry.id, { accessedAt: new Date() });
    }

    return results;
  }

  /**
   * Search memories by semantic similarity
   */
  async semanticSearch(
    agentId: string,
    query: string,
    limit: number = 10
  ): Promise<Array<{ entry: MemoryEntry; similarity: number }>> {
    if (!this.config.vectorSearch || !this.embeddingProvider) {
      return [];
    }

    const queryEmbedding = await this.embeddingProvider.embed(query);
    return this.vectorStore.search(queryEmbedding, agentId, limit);
  }

  /**
   * Update a memory entry
   */
  async update(id: string, updates: Partial<MemoryEntry>): Promise<void> {
    await this.store.update(id, updates);
  }

  /**
   * Delete a memory entry
   */
  async delete(id: string): Promise<void> {
    await this.store.delete(id);
    await this.vectorStore.delete(id);
  }

  /**
   * Clear all memories for an agent
   */
  async clearAgent(agentId: string): Promise<void> {
    await this.store.clear(agentId);
    await this.vectorStore.clear(agentId);

    // Clear short-term cache for all sessions
    for (const key of this.shortTermCache.keys()) {
      if (key.startsWith(`${agentId}:`)) {
        this.shortTermCache.delete(key);
      }
    }
  }

  /**
   * Build context from memory for a completion request
   */
  async buildContext(
    agentId: string,
    sessionId: string,
    currentQuery?: string,
    maxTokens?: number
  ): Promise<Message[]> {
    const contextMessages: Message[] = [];
    const tokenLimit = maxTokens ?? 4000;
    let estimatedTokens = 0;

    // Add short-term memory (recent conversation)
    const shortTerm = this.getShortTerm(agentId, sessionId);
    for (const message of shortTerm) {
      const msgTokens = this.estimateTokens(message.content);
      if (estimatedTokens + msgTokens <= tokenLimit * this.config.contextWindowRatio) {
        contextMessages.push(message);
        estimatedTokens += msgTokens;
      }
    }

    // Add relevant long-term memories if enabled
    if (this.config.longTermEnabled && currentQuery) {
      // Try semantic search first
      let relevantMemories: MemoryEntry[] = [];

      if (this.config.vectorSearch && this.embeddingProvider) {
        const semanticResults = await this.semanticSearch(agentId, currentQuery, 5);
        relevantMemories = semanticResults
          .filter((r) => r.similarity > 0.7)
          .map((r) => r.entry);
      }

      // Fallback to keyword-based retrieval
      if (relevantMemories.length === 0) {
        relevantMemories = await this.retrieve({
          agentId,
          types: ['long_term', 'episodic', 'semantic'],
          limit: 5,
          minImportance: 0.5,
        });
      }

      // Add relevant memories as system context
      for (const memory of relevantMemories) {
        const memoryTokens = this.estimateTokens(memory.content);
        if (estimatedTokens + memoryTokens <= tokenLimit) {
          contextMessages.unshift({
            role: 'system',
            content: `[Memory: ${memory.type}] ${memory.content}`,
          });
          estimatedTokens += memoryTokens;
        }
      }
    }

    // Add user preferences if stored
    const preferences = await this.retrieve({
      agentId,
      types: ['preference'],
      limit: 10,
    });

    for (const pref of preferences) {
      const prefTokens = this.estimateTokens(pref.content);
      if (estimatedTokens + prefTokens <= tokenLimit) {
        contextMessages.unshift({
          role: 'system',
          content: `[User Preference] ${pref.content}`,
        });
        estimatedTokens += prefTokens;
      }
    }

    return contextMessages;
  }

  /**
   * Extract and store important information from a conversation
   */
  async extractAndStore(
    agentId: string,
    messages: Message[],
    metadata: MemoryMetadata = {}
  ): Promise<MemoryEntry[]> {
    const storedEntries: MemoryEntry[] = [];

    // Look for important information to store
    for (const message of messages) {
      if (message.role === 'assistant') {
        // Extract facts and decisions
        const facts = this.extractFacts(message.content);
        for (const fact of facts) {
          const entry = await this.storeLongTerm(
            agentId,
            fact,
            'semantic',
            { ...metadata, source: 'conversation' },
            0.6
          );
          storedEntries.push(entry);
        }
      }

      if (message.role === 'user') {
        // Extract user preferences
        const preferences = this.extractPreferences(message.content);
        for (const pref of preferences) {
          const entry = await this.storeLongTerm(
            agentId,
            pref,
            'preference',
            { ...metadata, source: 'user_statement' },
            0.8
          );
          storedEntries.push(entry);
        }
      }
    }

    return storedEntries;
  }

  private extractFacts(content: string): string[] {
    const facts: string[] = [];

    // Simple heuristics for fact extraction
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();

      // Look for definitive statements
      if (
        lower.includes('is ') ||
        lower.includes('are ') ||
        lower.includes('was ') ||
        lower.includes('will ') ||
        lower.includes('should ')
      ) {
        // Check if it's informative (not a question or uncertain)
        if (
          !lower.includes('?') &&
          !lower.includes('maybe') &&
          !lower.includes('perhaps') &&
          !lower.includes("i'm not sure")
        ) {
          facts.push(sentence.trim());
        }
      }
    }

    return facts.slice(0, 5); // Limit to 5 facts per message
  }

  private extractPreferences(content: string): string[] {
    const preferences: string[] = [];
    // Content is matched against patterns directly

    // Look for preference indicators
    const preferencePatterns = [
      /i (?:prefer|like|want|need|always|never|don't like|hate) .+/gi,
      /please (?:always|never|don't) .+/gi,
      /my (?:preference|style|approach) is .+/gi,
    ];

    for (const pattern of preferencePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        preferences.push(...matches.map((m) => m.trim()));
      }
    }

    return preferences.slice(0, 3); // Limit to 3 preferences per message
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMemoryManager(
  config: Partial<MemoryConfig> = {},
  store?: MemoryStore
): MemoryManager {
  const defaultConfig: MemoryConfig = {
    enabled: true,
    shortTermCapacity: 50,
    longTermEnabled: true,
    vectorSearch: false, // Requires embedding provider
    contextWindowRatio: 0.3,
    ...config,
  };

  return new MemoryManager(defaultConfig, store);
}
