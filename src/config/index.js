/**
 * Configuration for Website Opportunity Discovery Engine
 * 
 * All values are configurable via environment variables (.env.template).
 * Defaults are provided for reasonable out-of-the-box operation.
 */

// Website quality assessment thresholds
export const WEBSITE_QUALITY_THRESHOLDS = {
  WEAK: 44,
  UNCERTAIN: 64,
  GOOD: 100,
};

// Opportunity scoring weights
export const OPPORTUNITY_SCORE_WEIGHTS = {
  NO_WEBSITE: 45,
  SOCIAL_ONLY: 40,
  WEAK_WEBSITE: 25,
  VERIFIED_FACEBOOK: 10,
  VERIFIED_INSTAGRAM: 5,
  OWNER_IDENTIFIED: 10,
  VERIFIED_PUBLISHED_EMAIL: 15,
  PHONE: 5,
  BBB_PROFILE: 5,
  GOOD_WEBSITE: -100,
  UNCERTAIN_WEBSITE: -100,
};

// Identity confidence threshold
export const IDENTITY_CONFIDENCE_THRESHOLD = 0.90;

// Email verification requirements
export const EMAIL_REQUIREMENTS = {
  MINIMUM_CONFIDENCE: 0.80,
  REQUIRE_VERIFIED: true,
};

// Run configuration
export const RUN_CONFIG = {
  DEFAULT_DISCOVERY_LIMIT: 100,
  DEFAULT_QUALIFIED_TARGET: 50,
  MAX_RUNTIME_MINUTES: 1440, // 24 hours
  DEFAULT_CONCURRENCY: 4,
};

// Status classifications
export const STATUS_CLASSIFICATIONS = {
  NO_WEBSITE: 'NO_WEBSITE',
  SOCIAL_ONLY: 'SOCIAL_ONLY',
  WEAK_WEBSITE: 'WEAK_WEBSITE',
  GOOD_WEBSITE: 'GOOD_WEBSITE',
  UNCERTAIN: 'UNCERTAIN',
};

// Email types
export const EMAIL_TYPES = {
  PUBLISHED: 'PUBLISHED',
  INFERRED: 'INFERRED',
  UNKNOWN: 'UNKNOWN',
};

// Export for environment variable documentation
export default {
  websiteQualityThresholds: WEBSITE_QUALITY_THRESHOLDS,
  opportunityScoreWeights: OPPORTUNITY_SCORE_WEIGHTS,
  identityConfidenceThreshold: IDENTITY_CONFIDENCE_THRESHOLD,
  emailRequirements: EMAIL_REQUIREMENTS,
  runConfig: RUN_CONFIG,
  statusClassifications: STATUS_CLASSIFICATIONS,
  emailTypes: EMAIL_TYPES,
};