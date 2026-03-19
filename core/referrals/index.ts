/**
 * TONAIAgent — Core Referral System (Issue #277)
 *
 * Implements the foundational referral infrastructure:
 *   - Referral model and code management
 *   - generateReferralCode(userId)
 *   - trackReferral(code, refereeId)
 *   - activateReferral(referralId)
 *   - Abuse prevention (self-referral guard, duplicate guard, IP/device detection)
 *   - Rate limiting
 *
 * Architecture:
 *   User → generateReferralCode → share link
 *     ↓
 *   New user clicks → trackReferral(code, refereeId)
 *     ↓
 *   First trade → activateReferral(referralId) → rewards engine
 */

// ============================================================================
// Types
// ============================================================================

export type ReferralStatus = 'pending' | 'active' | 'rewarded' | 'expired' | 'rejected';

export interface Referral {
  /** Unique referral ID */
  id: string;
  /** User who created the referral code */
  referrerUserId: string;
  /** User who used the referral code */
  referredUserId: string;
  /** The referral code used */
  code: string;
  /** Referral creation timestamp */
  createdAt: string;
  /** Referral activation timestamp (first qualifying action) */
  activatedAt?: string;
  /** Reward distribution timestamp */
  rewardedAt?: string;
  /** Current lifecycle status */
  status: ReferralStatus;
  /** Optional metadata (source IP hash, device fingerprint hash) */
  metadata?: ReferralEntryMetadata;
}

export interface ReferralEntryMetadata {
  /** Hashed IP address for abuse detection (never store raw IP) */
  ipHash?: string;
  /** Hashed device fingerprint for abuse detection */
  deviceHash?: string;
  /** UTM source or channel attribution */
  source?: string;
}

export interface ReferralCode {
  /** The short alphanumeric code */
  code: string;
  /** Owner user ID */
  ownerId: string;
  /** Whether the code is currently accepting new referrals */
  active: boolean;
  /** Code creation timestamp */
  createdAt: string;
  /** Optional expiry */
  expiresAt?: string;
  /** Times this code has been used */
  useCount: number;
  /** Max uses (0 = unlimited) */
  maxUses: number;
}

export interface ReferralStats {
  /** Total referrals created by this user */
  totalReferrals: number;
  /** Referrals that reached 'active' status */
  activeReferrals: number;
  /** Referrals that were fully rewarded */
  rewardedReferrals: number;
  /** Pending referrals awaiting activation */
  pendingReferrals: number;
  /** Conversion rate: active / total (0–100) */
  conversionRate: number;
}

// ============================================================================
// ReferralStore — in-memory persistence (swap for DB in production)
// ============================================================================

class ReferralStore {
  private codes = new Map<string, ReferralCode>();
  private referrals = new Map<string, Referral>();
  /** Maps userId → referral code string */
  private userCodes = new Map<string, string>();
  /** Maps referredUserId → referralId (one referral per user) */
  private refereeIndex = new Map<string, string>();
  /** Rate limit counters: userId → count in current window */
  private rateLimits = new Map<string, number>();
  /** IP hash → Set of userIds seen from that IP */
  private ipIndex = new Map<string, Set<string>>();

  saveCode(code: ReferralCode): void {
    this.codes.set(code.code, code);
    this.userCodes.set(code.ownerId, code.code);
  }

  getCode(code: string): ReferralCode | undefined {
    return this.codes.get(code);
  }

  getCodeByUserId(userId: string): ReferralCode | undefined {
    const code = this.userCodes.get(userId);
    return code ? this.codes.get(code) : undefined;
  }

  saveReferral(referral: Referral): void {
    this.referrals.set(referral.id, referral);
    this.refereeIndex.set(referral.referredUserId, referral.id);
  }

  getReferral(id: string): Referral | undefined {
    return this.referrals.get(id);
  }

  getReferralByReferee(refereeId: string): Referral | undefined {
    const id = this.refereeIndex.get(refereeId);
    return id ? this.referrals.get(id) : undefined;
  }

  getReferralsByReferrer(referrerId: string): Referral[] {
    return Array.from(this.referrals.values()).filter(
      r => r.referrerUserId === referrerId,
    );
  }

  getRateLimit(userId: string): number {
    return this.rateLimits.get(userId) ?? 0;
  }

  incrementRateLimit(userId: string): void {
    this.rateLimits.set(userId, this.getRateLimit(userId) + 1);
  }

  recordIpUser(ipHash: string, userId: string): void {
    const set = this.ipIndex.get(ipHash) ?? new Set<string>();
    set.add(userId);
    this.ipIndex.set(ipHash, set);
  }

  getUsersFromIp(ipHash: string): Set<string> {
    return this.ipIndex.get(ipHash) ?? new Set<string>();
  }
}

// ============================================================================
// ReferralSystem
// ============================================================================

export interface ReferralSystemConfig {
  /** Characters used when generating codes */
  codeAlphabet: string;
  /** Code length */
  codeLength: number;
  /** Max referrals a single user can create in a window */
  maxReferralsPerUser: number;
  /** Max users from same IP hash before flagging abuse */
  maxUsersPerIp: number;
  /** Code expiry in days (0 = no expiry) */
  codeExpiryDays: number;
}

const DEFAULT_CONFIG: ReferralSystemConfig = {
  codeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  codeLength: 8,
  maxReferralsPerUser: 50,
  maxUsersPerIp: 5,
  codeExpiryDays: 0,
};

export class ReferralSystem {
  private readonly store: ReferralStore;
  readonly config: ReferralSystemConfig;

  constructor(config: Partial<ReferralSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.store = new ReferralStore();
  }

  // --------------------------------------------------------------------------
  // Code management
  // --------------------------------------------------------------------------

  /**
   * Generate (or retrieve existing) referral code for a user.
   *
   * Idempotent: calling twice for the same userId returns the same code.
   */
  generateReferralCode(userId: string): ReferralCode {
    const existing = this.store.getCodeByUserId(userId);
    if (existing && existing.active) {
      return existing;
    }

    const code = this._generateCode();
    const now = new Date().toISOString();

    const referralCode: ReferralCode = {
      code,
      ownerId: userId,
      active: true,
      createdAt: now,
      useCount: 0,
      maxUses: 0,
      ...(this.config.codeExpiryDays > 0 && {
        expiresAt: new Date(
          Date.now() + this.config.codeExpiryDays * 86_400_000,
        ).toISOString(),
      }),
    };

    this.store.saveCode(referralCode);
    return referralCode;
  }

  /**
   * Retrieve a referral code object by its string value.
   */
  getCode(code: string): ReferralCode | null {
    return this.store.getCode(code) ?? null;
  }

  /**
   * Deactivate a referral code so it can no longer be used.
   */
  deactivateCode(code: string): void {
    const entry = this.store.getCode(code);
    if (entry) {
      entry.active = false;
      this.store.saveCode(entry);
    }
  }

  // --------------------------------------------------------------------------
  // Referral tracking
  // --------------------------------------------------------------------------

  /**
   * Track a referral when a new user signs up with a referral code.
   *
   * @param code          - The referral code provided by the new user
   * @param refereeId     - The new user's ID
   * @param metadata      - Optional metadata (ipHash, deviceHash, source)
   *
   * Throws if:
   *   - Code does not exist or is inactive / expired
   *   - Self-referral attempted
   *   - User already has a referral
   *   - Rate limit exceeded
   *   - IP abuse detected
   */
  trackReferral(
    code: string,
    refereeId: string,
    metadata?: ReferralEntryMetadata,
  ): Referral {
    const codeEntry = this.store.getCode(code);

    if (!codeEntry) {
      throw new Error(`Referral code not found: ${code}`);
    }
    if (!codeEntry.active) {
      throw new Error(`Referral code is inactive: ${code}`);
    }
    if (codeEntry.expiresAt && new Date(codeEntry.expiresAt) < new Date()) {
      throw new Error(`Referral code has expired: ${code}`);
    }
    if (codeEntry.maxUses > 0 && codeEntry.useCount >= codeEntry.maxUses) {
      throw new Error(`Referral code has reached its maximum use limit: ${code}`);
    }

    const referrerId = codeEntry.ownerId;

    // Self-referral prevention
    if (referrerId === refereeId) {
      throw new Error('Self-referral is not allowed');
    }

    // Duplicate referral prevention
    const existingReferral = this.store.getReferralByReferee(refereeId);
    if (existingReferral) {
      throw new Error(
        `User ${refereeId} already has a referral (id: ${existingReferral.id})`,
      );
    }

    // Rate limiting
    const currentCount = this.store.getRateLimit(referrerId);
    if (currentCount >= this.config.maxReferralsPerUser) {
      throw new Error(
        `Rate limit exceeded for referrer ${referrerId}: max ${this.config.maxReferralsPerUser} referrals`,
      );
    }

    // IP abuse detection (basic: flag if too many users from same IP)
    if (metadata?.ipHash) {
      this.store.recordIpUser(metadata.ipHash, refereeId);
      const usersFromIp = this.store.getUsersFromIp(metadata.ipHash);
      if (usersFromIp.size > this.config.maxUsersPerIp) {
        throw new Error(
          `IP abuse detected: too many users from the same IP address`,
        );
      }
    }

    const now = new Date().toISOString();
    const referral: Referral = {
      id: this._generateId(),
      referrerUserId: referrerId,
      referredUserId: refereeId,
      code,
      createdAt: now,
      status: 'pending',
      metadata,
    };

    this.store.saveReferral(referral);
    this.store.incrementRateLimit(referrerId);

    // Increment code use count
    codeEntry.useCount += 1;
    this.store.saveCode(codeEntry);

    return referral;
  }

  /**
   * Activate a referral — called when the referred user completes the
   * qualifying action (e.g., first trade).
   *
   * Transitions status: pending → active
   */
  activateReferral(referralId: string): Referral {
    const referral = this.store.getReferral(referralId);

    if (!referral) {
      throw new Error(`Referral not found: ${referralId}`);
    }
    if (referral.status !== 'pending') {
      throw new Error(
        `Referral ${referralId} cannot be activated (current status: ${referral.status})`,
      );
    }

    referral.status = 'active';
    referral.activatedAt = new Date().toISOString();

    this.store.saveReferral(referral);
    return referral;
  }

  /**
   * Mark a referral as rewarded after rewards have been distributed.
   *
   * Transitions status: active → rewarded
   */
  markRewarded(referralId: string): Referral {
    const referral = this.store.getReferral(referralId);

    if (!referral) {
      throw new Error(`Referral not found: ${referralId}`);
    }
    if (referral.status !== 'active') {
      throw new Error(
        `Referral ${referralId} cannot be marked as rewarded (current status: ${referral.status})`,
      );
    }

    referral.status = 'rewarded';
    referral.rewardedAt = new Date().toISOString();

    this.store.saveReferral(referral);
    return referral;
  }

  // --------------------------------------------------------------------------
  // Query API
  // --------------------------------------------------------------------------

  /**
   * Retrieve a referral by its ID.
   */
  getReferral(referralId: string): Referral | null {
    return this.store.getReferral(referralId) ?? null;
  }

  /**
   * Get all referrals created by a referrer.
   */
  getReferralsByReferrer(referrerId: string): Referral[] {
    return this.store.getReferralsByReferrer(referrerId);
  }

  /**
   * Get the referral for a specific referred user (if any).
   */
  getReferralByReferee(refereeId: string): Referral | null {
    return this.store.getReferralByReferee(refereeId) ?? null;
  }

  /**
   * Aggregate referral statistics for a user (as referrer).
   */
  getStats(referrerId: string): ReferralStats {
    const all = this.store.getReferralsByReferrer(referrerId);
    const total = all.length;
    const active = all.filter(r => r.status === 'active').length;
    const rewarded = all.filter(r => r.status === 'rewarded').length;
    const pending = all.filter(r => r.status === 'pending').length;

    // Activated = active + rewarded (both have completed qualifying action)
    const activated = active + rewarded;
    const conversionRate = total > 0 ? (activated / total) * 100 : 0;

    return {
      totalReferrals: total,
      activeReferrals: active,
      rewardedReferrals: rewarded,
      pendingReferrals: pending,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _generateCode(): string {
    const alphabet = this.config.codeAlphabet;
    let code = '';
    for (let i = 0; i < this.config.codeLength; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    // Ensure uniqueness (retry on collision — extremely rare for 8-char codes)
    if (this.store.getCode(code)) {
      return this._generateCode();
    }
    return code;
  }

  private _generateId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createReferralSystem(
  config?: Partial<ReferralSystemConfig>,
): ReferralSystem {
  return new ReferralSystem(config);
}

export default ReferralSystem;
