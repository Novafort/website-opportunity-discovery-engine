/**
 * Website Opportunity Discovery Engine - Main Pipeline
 * 
 * Orchestrates the full discovery flow:
 *   Identity Verification → Domain Discovery → Social Discovery → Website Quality → Email Enrichment → Opportunity Scoring → CSV Export
 * 
 * Maintains independence throughout - no runtime imports from any existing B2B project.
 */

import { WebSearchProvider } from "../search/provider.js";
import { CompanyIdentityVerifier } from "../identity/verifier.js";
import { discoverDomain } from "../domain/index.js";
import { verifyFacebookProfile } from "../social/index.js";
import { verifyInstagramProfile } from "../social/index.js";
import { discoverLinkedIn } from "../social/index.js";
import { WebsiteQualityAssessor } from "../quality/index.js";
import { enrichEmail } from "../email/index.js";
import { OpportunityScorer } from "../scoring/opportunity.js";

// Import status classifications
import {
  STATUS_CLASSIFICATIONS,
  OPPORTUNITY_SCORE_WEIGHTS,
  WEBSITE_QUALITY_THRESHOLDS,
} from "../config/index.js";

/**
 * Main discovery pipeline for a single company.
 * 
 * @param {Object} options - Pipeline options
 *   - {WebSearchProvider} options.provider - Search provider instance
 *   - {CompanyIdentityVerifier} options.identityVerifier - Identity verifier instance
 *   - {string} options.companyName - Company name
 *   - {string} [options.initialDomain] - Pre-existing domain (optional)
 *   - {string} [options.phone] - Company phone (optional)
 *   - {string} [options.address] - Company address (optional)
 *   - {string} [options.city] - Company city (optional)
 *   - {string} [options.state] - Company state (optional)
 *   - {string} [options.facebookUrl] - Known Facebook URL (optional)
 *   - {string} [options.instagramUrl] - Known Instagram URL (optional)
 *   - {string} [options.linkedinUrl] - Known LinkedIn URL (optional)
 *   - {string} [options.website] - Known website URL (optional)
 * @returns {Promise<Object>} - Full pipeline result with all computed fields
 */
export async function runPipeline({
  provider,
  identityVerifier,
  companyName,
  initialDomain,
  phone,
  address,
  city,
  state,
  facebookUrl,
  instagramUrl,
  linkedinUrl,
  website,
}) {
  // -------------------------------------------------------------------------
  // 1. IDENTITY VERIFICATION
  // -------------------------------------------------------------------------
  const identityResult = identityVerifier.scoreIdentity({
    companyName,
    hasPhone: !!phone,
    hasAddress: !!address && !!city && !!state,
    hasPublishedEmail: false, // will be filled later
    hasDomain: !!initialDomain,
    hasOwner: false, // will be filled later
  });

  // -------------------------------------------------------------------------
  // 2. DOMAIN DISCOVERY & VERIFICATION
  // -------------------------------------------------------------------------
  const domainResult = await discoverDomain({
    provider,
    identityVerifier,
    companyName,
    city,
    state,
    phone,
    emailDomain: initialDomain,
    socialProfiles: [], // will be populated from social discovery
  });

  const verifiedDomain = domainResult.verifiedDomain || initialDomain || "";

  // -------------------------------------------------------------------------
  // 3. SOCIAL DISCOVERY (Facebook, Instagram, LinkedIn)
  // -------------------------------------------------------------------------
  const facebookResult = await verifyFacebookProfile({
    provider,
    identityVerifier,
    facebookUrl,
    companyName,
    phone,
    address,
    city,
    state,
    website,
  });

  const instagramResult = await verifyInstagramProfile({
    provider,
    identityVerifier,
    instagramUrl,
    companyName,
    phone,
    address,
    city,
    state,
    website,
  });

  const linkedinResult = await discoverLinkedIn({
    provider,
    companyName,
    website,
  });

  // -------------------------------------------------------------------------
  // 4. WEBSITE QUALITY ASSESSMENT
  //    Only for verified domains
  // -------------------------------------------------------------------------
  let websiteQualityScore = 0;
  let websiteStatus = STATUS_CLASSIFICATIONS.UNCERTAIN;

  if (verifiedDomain) {
    // Basic assessment with minimal signals (will be enhanced with actual crawling)
    const assessor = new WebsiteQualityAssessor();

    // We'll do a minimal assessment based on what we can determine
    const qualityResult = assessor.assess({
      https: verifiedDomain.includes("https://") || verifiedDomain.includes("http://"),
      // For now, we can't actually crawl the HTML, so many signals will be false
      // In a real implementation, we'd fetch the page and analyze it
      mobileViewport: false,
      responsive: false,
      navigation: true, // assumption for real websites
      visiblePhone: false,
      contactForm: false,
      servicesClearlyPresented: false,
      locationServiceArea: false,
      clearCTA: false,
      brokenLinkCount: 0,
      pageCount: 1,
      copyrightFresh: false,
      socialLinks: false,
    });

    websiteQualityScore = qualityResult.websiteQualityScore;
    websiteStatus = qualityResult.classification;
  } else {
    // No website - classify accordingly
    if (facebookUrl || instagramUrl) {
      websiteStatus = STATUS_CLASSIFICATIONS.SOCIAL_ONLY;
    } else {
      websiteStatus = STATUS_CLASSIFICATIONS.NO_WEBSITE;
    }
  }

  // Adjust website status based on quality score thresholds
  if (websiteQualityScore <= WEBSITE_QUALITY_THRESHOLDS.weak) {
    websiteStatus = STATUS_CLASSIFICATIONS.WEAK_WEBSITE;
  } else if (websiteQualityScore >= WEBSITE_QUALITY_THRESHOLDS.uncertain + 1) {
    // Could be uncertain or good depending on other factors
  }

  // -------------------------------------------------------------------------
  // 5. EMAIL ENRICHMENT & VERIFIED EMAIL GATE
  // -------------------------------------------------------------------------
  const emailResult = await enrichEmail({
    provider,
    identityVerifier,
    companyName,
    website: verifiedDomain,
    facebookUrl,
    instagramUrl,
    linkedinUrl,
    phone,
    address,
    city,
    state,
  });

  // -------------------------------------------------------------------------
  // 6. OPPORTUNITY SCORING
  // -------------------------------------------------------------------------
  const opportunityScorer = new OpportunityScorer();

  const opportunityResult = opportunityScorer.calculate({
    websiteStatus,
    identityConfidence: identityResult.identityConfidence,
    researchConfidence: identityResult.identityConfidence, // using identity as research proxy
    facebookConfidence: facebookResult.facebook_confidence,
    instagramConfidence: instagramResult.instagram_confidence,
    ownerIdentified: identityResult.meetsThreshold,
    verifiedPublishedEmail: emailResult.has_verified_outreach_email,
    phone: !!phone,
    bbbProfile: false, // would need separate BBB search
  });

  // -------------------------------------------------------------------------
  // 7. STATUS CLASSIFICATION FINALIZATION
  // -------------------------------------------------------------------------
  // Apply the definitive status based on all evidence
  let finalWebsiteStatus = websiteStatus;

  // Priority logic:
  // - If identity is wrong/unverified, mark WRONG_IDENTITY
  // - If no verified email, gate accordingly
  // - Website status takes precedence based on quality

  // If identity confidence is below threshold, mark as uncertain
  if (!identityResult.meetsThreshold) {
    // Identity too low - we should be cautious
    if (finalWebsiteStatus === STATUS_CLASSIFICATIONS.GOOD_WEBSITE) {
      finalWebsiteStatus = STATUS_CLASSIFICATIONS.UNCERTAIN;
    }
  }

  // -------------------------------------------------------------------------
  // 8. RETURN FULL PIPELINE RESULT
  // -------------------------------------------------------------------------
  return {
    // Company identity
    company_name: companyName,
    identity_confidence: Number(identityResult.identityConfidence.toFixed(3)),
    identity_meets_threshold: identityResult.meetsThreshold,

    // Domain & website
    verified_domain: verifiedDomain,
    website_status: finalWebsiteStatus,
    website_quality_score: websiteQualityScore,

    // Social
    facebook_url: facebookResult.facebook_url || "",
    facebook_confidence: Number(facebookResult.facebook_confidence.toFixed(3)),
    instagram_url: instagramResult.instagram_url || "",
    instagram_confidence: Number(instagramResult.instagram_confidence.toFixed(3)),
    linkedin_url: linkedinResult.linkedin_url || "",
    linkedin_confidence: Number(linkedinResult.linkedin_confidence.toFixed(3)),

    // Email
    public_email: emailResult.public_email || "",
    email_type: emailResult.email_type,
    email_confidence: Number(emailResult.email_confidence.toFixed(3)),
    has_verified_outreach_email: emailResult.has_verified_outreach_email,

    // Opportunity
    opportunity_score: opportunityResult.opportunityScore,
    opportunity_breakdown: opportunityResult.breakdown,

    // Derived classifications
    // NO_WEBSITE: identity verified, no standalone website
    // SOCIAL_ONLY: verified FB/IG, no verified standalone website
    // WEAK_WEBSITE: official website but low quality
    // GOOD_WEBSITE: official website and sufficient quality
    // UNCERTAIN: incomplete/contradictory evidence
  };
}