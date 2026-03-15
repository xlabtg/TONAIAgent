/**
 * Settings manager — persists and restores UserSettings (mode, language,
 * AI API settings, referral code) via a pluggable storage backend.
 */

import {
  UserSettings,
  AppMode,
  SupportedLanguage,
  AISettings,
  AIProvider,
  MiniAppEvent,
  MiniAppEventCallback,
} from './types';

// ============================================================================
// Storage interface
// ============================================================================

export interface SettingsStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** In-memory storage — used by tests and SSR contexts */
export class MemorySettingsStorage implements SettingsStorage {
  private readonly store = new Map<string, string>();

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}

/**
 * localStorage-backed storage (browser only).
 * Accesses localStorage via globalThis to avoid requiring the DOM lib in the
 * TypeScript compilation target (lib: ["ES2022"]).
 */
export class LocalSettingsStorage implements SettingsStorage {
  private get ls(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as Record<string, unknown>)['localStorage'] as { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | undefined;
  }

  get(key: string): string | null {
    try {
      return this.ls?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      this.ls?.setItem(key, value);
    } catch { /* quota exceeded or private browsing */ }
  }

  remove(key: string): void {
    try {
      this.ls?.removeItem(key);
    } catch { /* ignore */ }
  }
}

// ============================================================================
// SettingsManager
// ============================================================================

const STORAGE_KEY = 'tonai_miniapp_settings';

export interface SettingsManagerConfig {
  storage?: SettingsStorage;
  defaults?: Partial<UserSettings>;
}

export class SettingsManager {
  private settings: UserSettings;
  private readonly storage: SettingsStorage;
  private readonly eventCallbacks: MiniAppEventCallback[] = [];

  constructor(config: SettingsManagerConfig = {}) {
    this.storage = config.storage ?? new MemorySettingsStorage();
    this.settings = this.buildDefaults(config.defaults);
    this.load();
  }

  // --------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------

  getSettings(): UserSettings {
    return { ...this.settings };
  }

  getMode(): AppMode {
    return this.settings.mode;
  }

  getLanguage(): SupportedLanguage {
    return this.settings.language;
  }

  getAISettings(): AISettings {
    return { ...this.settings.aiSettings };
  }

  getReferralCode(): string | undefined {
    return this.settings.referralCode;
  }

  // --------------------------------------------------------------------------
  // Write
  // --------------------------------------------------------------------------

  setMode(mode: AppMode): void {
    const prev = this.settings.mode;
    this.settings = { ...this.settings, mode, updatedAt: ts() };
    this.save();
    if (prev !== mode) {
      this.emit({ type: 'mode_changed', payload: { mode }, timestamp: ts() });
    }
  }

  setLanguage(language: SupportedLanguage): void {
    const prev = this.settings.language;
    this.settings = { ...this.settings, language, updatedAt: ts() };
    this.save();
    if (prev !== language) {
      this.emit({ type: 'language_changed', payload: { language }, timestamp: ts() });
    }
  }

  setAISettings(aiSettings: AISettings): void {
    this.settings = { ...this.settings, aiSettings, updatedAt: ts() };
    this.save();
  }

  setReferralCode(referralCode: string): void {
    this.settings = { ...this.settings, referralCode, updatedAt: ts() };
    this.save();
    this.emit({ type: 'referral_detected', payload: { referralCode }, timestamp: ts() });
  }

  saveAll(partial: Partial<UserSettings>): void {
    this.settings = { ...this.settings, ...partial, updatedAt: ts() };
    this.save();
    this.emit({ type: 'settings_saved', payload: partial, timestamp: ts() });
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  private load(): void {
    const raw = this.storage.get(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      this.settings = { ...this.settings, ...parsed };
    } catch { /* corrupt — ignore */ }
  }

  private save(): void {
    this.storage.set(STORAGE_KEY, JSON.stringify(this.settings));
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: MiniAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emit(event: MiniAppEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }

  // --------------------------------------------------------------------------
  // Defaults
  // --------------------------------------------------------------------------

  private buildDefaults(overrides: Partial<UserSettings> = {}): UserSettings {
    const defaultAI: AISettings = {
      provider: 'groq' as AIProvider,
      model: 'llama3-8b-8192',
    };

    return {
      mode: 'demo',
      language: 'en',
      aiSettings: defaultAI,
      updatedAt: ts(),
      ...overrides,
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function ts(): number {
  return Math.floor(Date.now() / 1000);
}

// ============================================================================
// Factory
// ============================================================================

export function createSettingsManager(
  config?: SettingsManagerConfig
): SettingsManager {
  return new SettingsManager(config);
}
