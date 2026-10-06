/**
 * Website Quality Assessment
 * 
 * Assesses objective signals for verified official domains only.
 * No subjective LLM visual scoring in V1.
 * 
 * Produces website_quality_score (0-100).
 * 
 * Thresholds:
 *   0–44   WEAK_WEBSITE
 *   45–64  UNCERTAIN
 *   65–100 GOOD_WEBSITE
 * 
 * All thresholds are configurable.
 */

export class WebsiteQualityAssessor {
  constructor(config = {}) {
    this.thresholds = {
      weak: config.weakThreshold || 44,
      uncertain: config.uncertainThreshold || 64,
      good: config.goodThreshold || 100,
    };
  }

  /**
   * Assess the quality of a website given its HTML and metadata.
   * Only objective signals are used.
   * 
   * @param {Object} options - Assessment options
   *   - {string} options.html - HTML content of the page
   *   - {string} options.url - Page URL
   *   - {boolean} options.https - Whether HTTPS is used
   *   - {boolean} options.mobileViewport - Whether viewport meta tag exists
   *   - {boolean} options.responsive - Whether responsive indicators found
   *   - {boolean} options.navigation - Whether clear navigation exists
   *   - {boolean} options.visiblePhone - Whether visible phone number found
   *   - {boolean} options.contactForm - Whether contact form exists
   *   - {boolean} options.servicesClearlyPresented - Whether services are clearly presented
   *   - {boolean} options.locationServiceArea - Whether location/service area is indicated
   *   - {boolean} options.clearCTA - Whether clear call-to-action exists
   *   - {number} options.brokenLinkCount - Number of broken links detected
   *   - {number} options.pageCount - Approximate page count
   *   - {boolean} options.copyrightFresh - Whether copyright date is recent
   *   - {boolean} options.socialLinks - Whether social media links exist
   * @returns {Object} - { websiteQualityScore: number, signals: Object, classification: string }
   */
  assess({
    html,
    url,
    https,
    mobileViewport,
    responsive,
    navigation,
    visiblePhone,
    contactForm,
    servicesClearlyPresented,
    locationServiceArea,
    clearCTA,
    brokenLinkCount = 0,
    pageCount = 1,
    copyrightFresh = false,
    socialLinks = false,
  }) {
    let score = 0;

    // HTTPS (max 10 points)
    if (https) {
      score += 10;
    }

    // Mobile viewport (max 10 points)
    if (mobileViewport) {
      score += 10;
    }

    // Responsive indicators (max 10 points)
    if (responsive) {
      score += 10;
    }

    // Navigation (max 10 points)
    if (navigation) {
      score += 10;
    }

    // Visible phone (max 10 points)
    if (visiblePhone) {
      score += 10;
    }

    // Contact form (max 10 points)
    if (contactForm) {
      score += 10;
    }

    // Services clearly presented (max 10 points)
    if (servicesClearlyPresented) {
      score += 10;
    }

    // Location/service area (max 10 points)
    if (locationServiceArea) {
      score += 10;
    }

    // Clear CTA (max 10 points)
    if (clearCTA) {
      score += 10;
    }

    // Broken links penalty (max -20 points)
    const brokenLinkPenishment = Math.min(brokenLinkCount * 2, 20);
    score -= brokenLinkPenishment;

    // Page count bonus (max 5 points, for substantive sites)
    if (pageCount >= 5) {
      score += 5;
    } else if (pageCount >= 3) {
      score += 3;
    } else if (pageCount >= 2) {
      score += 1;
    }

    // Copyright freshness (max 5 points)
    if (copyrightFresh) {
      score += 5;
    }

    // Social links (max 5 points)
    if (socialLinks) {
      score += 5;
    }

    // Clamp to 0-100
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

    // Classify
    let classification;
    if (clampedScore <= this.thresholds.weak) {
      classification = "WEAK_WEBSITE";
    } else if (clampedScore <= this.thresholds.uncertain) {
      classification = "UNCERTAIN";
    } else {
      classification = "GOOD_WEBSITE";
    }

    return {
      websiteQualityScore: clampedScore,
      classification,
      signals: {
        https,
        mobileViewport,
        responsive,
        navigation,
        visiblePhone,
        contactForm,
        servicesClearlyPresented,
        locationServiceArea,
        clearCTA,
        brokenLinkCount,
        pageCount,
        copyrightFresh,
        socialLinks,
      },
    };
  }
}