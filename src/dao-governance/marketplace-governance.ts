/**
 * TONAIAgent - DAO Marketplace Governance (Issue #103)
 *
 * Token-holder governed marketplace for AI investment strategies.
 * Handles strategy approval/rejection, community ratings, and curation.
 */

import type {
  GovernedStrategyListing,
  StrategyVote,
  DaoEvent,
  DaoEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface MarketplaceGovernanceManager {
  // Strategy submission
  submitStrategy(
    strategyId: string,
    strategyName: string,
    developerAddress: string,
    riskRating: GovernedStrategyListing['riskRating']
  ): GovernedStrategyListing;

  // Governance approval
  approveStrategy(strategyId: string, approvalProposalId: string): boolean;
  rejectStrategy(strategyId: string, reason: string): boolean;
  suspendStrategy(strategyId: string, reason: string): boolean;

  // Community voting
  voteOnStrategy(strategyId: string, voter: string, rating: number, comment?: string): StrategyVote;
  getStrategyVotes(strategyId: string): StrategyVote[];

  // Queries
  getListing(strategyId: string): GovernedStrategyListing | undefined;
  getListingsByStatus(status: GovernedStrategyListing['status']): GovernedStrategyListing[];
  getAllListings(): GovernedStrategyListing[];
  getStats(): MarketplaceGovernanceStats;

  // Events
  onEvent(callback: DaoEventCallback): () => void;
}

export interface MarketplaceGovernanceStats {
  totalListings: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  suspended: number;
  totalCommunityVotes: number;
  averageCommunityRating: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultMarketplaceGovernanceManager implements MarketplaceGovernanceManager {
  private readonly listings = new Map<string, GovernedStrategyListing>();
  private readonly eventCallbacks: DaoEventCallback[] = [];

  // --------------------------------------------------------------------------
  // Strategy Submission
  // --------------------------------------------------------------------------

  submitStrategy(
    strategyId: string,
    strategyName: string,
    developerAddress: string,
    riskRating: GovernedStrategyListing['riskRating']
  ): GovernedStrategyListing {
    if (this.listings.has(strategyId)) {
      throw new Error(`Strategy ${strategyId} is already listed`);
    }

    const listing: GovernedStrategyListing = {
      strategyId,
      strategyName,
      developerAddress,
      status: 'pending_review',
      riskRating,
      communityRating: 0,
      totalAllocated: 0,
      submittedAt: new Date(),
      votes: [],
    };

    this.listings.set(strategyId, listing);
    return listing;
  }

  // --------------------------------------------------------------------------
  // Governance Approval
  // --------------------------------------------------------------------------

  approveStrategy(strategyId: string, approvalProposalId: string): boolean {
    const listing = this.listings.get(strategyId);
    if (!listing) return false;
    if (listing.status !== 'pending_review') return false;

    listing.status = 'approved';
    listing.approvalProposalId = approvalProposalId;
    listing.reviewedAt = new Date();

    this.emit({
      type: 'marketplace.strategy_approved',
      data: { strategyId, approvalProposalId },
      timestamp: new Date(),
    });

    return true;
  }

  rejectStrategy(strategyId: string, reason: string): boolean {
    const listing = this.listings.get(strategyId);
    if (!listing) return false;
    if (listing.status !== 'pending_review') return false;

    listing.status = 'rejected';
    listing.rejectionReason = reason;
    listing.reviewedAt = new Date();

    this.emit({
      type: 'marketplace.strategy_rejected',
      data: { strategyId, reason },
      timestamp: new Date(),
    });

    return true;
  }

  suspendStrategy(strategyId: string, reason: string): boolean {
    const listing = this.listings.get(strategyId);
    if (!listing) return false;
    if (listing.status !== 'approved') return false;

    listing.status = 'suspended';
    listing.rejectionReason = reason;

    return true;
  }

  // --------------------------------------------------------------------------
  // Community Voting
  // --------------------------------------------------------------------------

  voteOnStrategy(strategyId: string, voter: string, rating: number, comment?: string): StrategyVote {
    const listing = this.listings.get(strategyId);
    if (!listing) throw new Error(`Strategy ${strategyId} not found`);
    if (listing.status !== 'approved') {
      throw new Error(`Can only vote on approved strategies (status: ${listing.status})`);
    }
    if (rating < 1 || rating > 5) {
      throw new Error(`Rating must be between 1 and 5`);
    }

    // Check for existing vote
    const existingIdx = listing.votes.findIndex(v => v.voter === voter);

    const vote: StrategyVote = {
      voter,
      rating,
      comment,
      timestamp: new Date(),
    };

    if (existingIdx >= 0) {
      listing.votes[existingIdx] = vote;
    } else {
      listing.votes.push(vote);
    }

    // Update community rating
    listing.communityRating = listing.votes.reduce((s, v) => s + v.rating, 0) / listing.votes.length;

    return vote;
  }

  getStrategyVotes(strategyId: string): StrategyVote[] {
    return this.listings.get(strategyId)?.votes ?? [];
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  getListing(strategyId: string): GovernedStrategyListing | undefined {
    return this.listings.get(strategyId);
  }

  getListingsByStatus(status: GovernedStrategyListing['status']): GovernedStrategyListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.status === status)
      .sort((a, b) => b.communityRating - a.communityRating);
  }

  getAllListings(): GovernedStrategyListing[] {
    return Array.from(this.listings.values())
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  getStats(): MarketplaceGovernanceStats {
    const all = Array.from(this.listings.values());
    const totalVotes = all.reduce((s, l) => s + l.votes.length, 0);
    const allRatings = all.flatMap(l => l.votes.map(v => v.rating));
    const avgRating = allRatings.length > 0
      ? allRatings.reduce((s, r) => s + r, 0) / allRatings.length
      : 0;

    return {
      totalListings: all.length,
      pendingReview: all.filter(l => l.status === 'pending_review').length,
      approved: all.filter(l => l.status === 'approved').length,
      rejected: all.filter(l => l.status === 'rejected').length,
      suspended: all.filter(l => l.status === 'suspended').length,
      totalCommunityVotes: totalVotes,
      averageCommunityRating: avgRating,
    };
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: DaoEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private emit(event: DaoEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createMarketplaceGovernanceManager(): DefaultMarketplaceGovernanceManager {
  return new DefaultMarketplaceGovernanceManager();
}
