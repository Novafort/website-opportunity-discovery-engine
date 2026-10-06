/**
 * Opportunity Score
 * 
 * Configurable commercial score separate from research confidence.
 * Keeps: identity_confidence, research_confidence, opportunity_score
 * as separate concepts.
 * 
 * Suggested starting weights (from spec):
 *   NO_WEBSITE                  +45
 *   SOCIAL_ONLY                 +40
 *   WEAK_WEBSITE                +25
 *   verified Facebook           +10
 *   verified Instagram          +5
 *   owner identified            +10
 *   verified published email    +15
 *   phone                       +5
 *   BBB profile                 +5
 *   GOOD_WEBSITE               -100
 *   UNCERTAIN                  -100
 * 
 * Clamped to 0–100.
 */

export class OpportunityScorer {
  constructor(config = {}) {
    this.weights = {
      NO_WEBSITE: config.noWebsiteWeight || 45,
      SOCIAL_ONLY: config.socialOnlyWeight || 40,
      WEAK_WEBSITE: config.weakWebsiteWeight || 25,
      VERIFIED_FACEBOOK: config.facebookWeight || 10,
      VERIFIED_INSTAGRAM: config.instagramWeight || 5,
      OWNER_IDENTIFIED: config.ownerWeight || 10,
      VERIFIED_PUBLISHED_EMAIL: config.emailWeight || 15,
      PHONE: config.phoneWeight || 5,
      BBB_PROFILE: config.bbbWeight || 5,
      GOOD_WEBSITE: config.goodWebsitePenalty || -100,
      UNCERTAIN: config.uncertainPenalty || -100,
    };

    this.thresholds = {
      min: config.minScore || 0,
      max: config.maxScore || 100,
    };
  }

  /**
   * Calculate the opportunity score.
   * 
   * @param {Object} options - Scoring options
   *   - {string} options.websiteStatus - One of: NO_WEBSITE, SOCIAL_ONLY, WEAK_WEBSITE, GOOD_WEBSITE, UNCERTAIN
   *   - {number} options.identityConfidence - Identity confidence score (0-1)
   *   - {number} options.researchConfidence - Research confidence score (0-1)
   *   - {number} [options.facebookConfidence] - Facebook verification confidence (0-1)
   *   - {number} [options.instagramConfidence] - Instagram verification confidence (0-1)
   *   - {boolean} [options.ownerIdentified] - Whether owner was identified
   *   - {boolean} [options.verifiedPublishedEmail] - Whether verified published email exists
   *   - {boolean} [options.phone] - Whether phone is available
   *   - {boolean} [options.bbbProfile] - Whether BBB profile exists
   * @returns {Object} - { opportunityScore: number, breakdown: Object, clamped: number }
   */
  calculate({
    websiteStatus,
    identityConfidence,
    researchConfidence,
    facebookConfidence = 0,
    instagramConfidence = 0,
    ownerIdentified = false,
    verifiedPublishedEmail = false,
    phone = false,
    bbbProfile = false,
  }) {
    let score = 0;
    const breakdown = {};

    // Helper to add weight and record in breakdown
    const addWeight = (weight, label) => {
      score += weight;
      breakdown[label] = weight;
    };

    // Website status weights
    if (websiteStatus === "NO_WEBSITE") {
      addWeight(this.weights.NO_WEBSITE, "NO_WEBSITE");
    } else if (websiteStatus === "SOCIAL_ONLY") {
      addWeight(this.weights.SOCIAL_ONLY, "SOCIAL_ONLY");
    } else if (websiteStatus === "WEAK_WEBSITE") {
      addWeight(this.weights.WEAK_WEBSITE, "WEAK_WEBSITE");
    } else if (websiteStatus === "GOOD_WEBSITE") {
      addWeight(this.weights.GOOD_WEBSITE, "GOOD_WEBSITE");
    } else if (websiteStatus === "UNCERTAIN") {
      addWeight(this.weights.UNCERTAIN, "UNCERTAIN");
    }

    // Social verification weights
    if (facebookConfidence && facebookConfidence >= 0.5) {
      addWeight(this.weights.VERIFIED_FACEBOOK, "VERIFIED_FACEBOOK");
    }
    if (instagramConfidence && instagramConfidence >= 0.5) {
      addWeight(this.weights.VERIFIED_INSTAGRAM, "VERIFIED_INSTAGRAM");
    }

    // Owner identification
    if (ownerIdentified) {
      addWeight(this.weights.OWNER_IDENTIFIED, "OWNER_IDENTIFIED");
    }

    // Verified published email
    if (verifiedPublishedEmail) {
      addWeight(this.weights.VERIFIED_PUBLISHED_EMAIL, "VERIFIED_PUBLISHED_EMAIL");
    }

    // Phone
    if (phone) {
      addWeight(this.weights.PHONE, "PHONE");
    }

    // BBB profile
    if (bbbProfile) {
      addWeight(this.weights.BBB_PROFILE, "BBB_PROFILE");
    }

    // Research confidence influence (soft - adjusts but doesn't override)
    // Research confidence modifies the final score proportionally
    const researchInfluence = researchConfidence * 20; // up to 20 point adjustment
    score += researchInfluence;
    breakdown.researchConfidenceInfluence = researchInfluence;

    // Apply clamping
    const clampedScore = Math.max(
      this.thresholds.min,
      Math.min(this.thresholds.max, Math.round(score))
    );

    // Also incorporate identity confidence as a multiplier/adjuster
    // Higher identity confidence = more trust in the opportunity score
    const finalScore = Math.round((clampedScore * identityConfidence) * 100) / 100;

    return {
      opportunityScore: finalScore,
      breakdown,
      clamped: clampedScore,
      identityConfidence,
      researchConfidence,
    };
  }
}