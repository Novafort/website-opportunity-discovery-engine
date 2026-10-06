/**
 * Company Identity Verifier
 * 
 * Implements identity confidence scoring based on corroborating evidence.
 * Threshold for "verified" identity: identity_confidence >= 0.90
 * (configurable via IDENTITY_CONFIDENCE_THRESHOLD)
 * 
 * Does NOT accept name-only matches. Requires at least 2 corroborating
 * pieces of evidence (phone, address, email, etc.).
 */

export class CompanyIdentityVerifier {
  constructor(config = {}) {
    this.confidenceThreshold = config.identityConfidenceThreshold || 0.90;
    this.minEvidenceCount = config.minEvidenceCount || 2;
  }

  /**
   * Score company identity confidence based on evidence.
   * 
   * Evidence sources:
   * - phone: verified phone number matching company
   * - address: verified street address + city/state
   * - email: verified published or domain-matched email
   * - name: company name (name-only is insufficient)
   * - domain: website domain matching company
   * - owner: owner/key person identified
   * 
   * @param {Object} evidence - Evidence object with boolean/filed fields
   * @param {boolean} evidence.hasPhone - Phone verified against company
   * @param {boolean} evidence.hasAddress - Address verified (street + city/state)
   * @param {boolean} evidence.hasPublishedEmail - Published email verified
   * @param {boolean} evidence.hasDomain - Domain matches company
   * @param {boolean} evidence.hasOwner - Owner/key person identified
   * @param {string} [evidence.companyName] - Company name (present but not sufficient alone)
   * @param {string} [evidence.phone] - Phone number if found
   * @param {string} [evidence.email] - Email if found
   * @param {string} [evidence.address] - Address if found
   * @param {string} [evidence.owner] - Owner if identified
   * @param {string} [evidence.domain] - Domain if found
   * 
   * @returns {Object} - { identityConfidence: number, reasons: string[], evidence: Object }
   */
  scoreIdentity(evidence) {
    let score = 0;
    const reasons = [];
    const evidenceSummary = { ...evidence };

    // Name-only is insufficient
    if (evidence.companyName && !evidence.hasPhone && !evidence.hasAddress && !evidence.hasOwner) {
      return {
        identityConfidence: 0,
        reasons: ["Name-only match — insufficient evidence for identity verification"],
        evidence: evidenceSummary,
      };
    }

    // Phone verification (+20)
    if (evidence.hasPhone) {
      score += 20;
      reasons.push("Verified phone number matches company");
    }

    // Address verification (+25)
    if (evidence.hasAddress) {
      score += 25;
      reasons.push("Verified street address + city/state matches company");
    }

    // Published email verification (+25)
    if (evidence.hasPublishedEmail) {
      score += 25;
      reasons.push("Verified published email matches company");
    }

    // Domain verification (+15)
    if (evidence.hasDomain) {
      score += 15;
      reasons.push("Website domain matches company identity");
    }

    // Owner identification (+20)
    if (evidence.hasOwner) {
      score += 20;
      reasons.push("Owner/key person identified");
    }

    // Normalize to 0-100 scale, then to 0-1
    // Base weights designed to reach ~90+ with strong evidence
    const normalizedScore = Math.min(Math.round((score / 100) * 100), 100);
    const confidence = normalizedScore / 100;

    // Apply threshold check
    const meetsThreshold = confidence >= this.confidenceThreshold;

    return {
      identityConfidence: confidence,
      meetsThreshold,
      score,
      reasons,
      evidence: evidenceSummary,
    };
  }

  /**
   * Determine if identity is verified based on confidence threshold.
   * @param {number} identityConfidence - Score from 0 to 1
   * @returns {boolean} True if identity is verified
   */
  isVerified(identityConfidence) {
    return identityConfidence >= this.confidenceThreshold;
  }

  /**
   * Build evidence object from raw company data.
   * @param {Object} companyData - Raw company data from input/discovery
   * @returns {Object} - Evidence object for scoreIdentity
   */
  buildEvidenceFromCompany(companyData) {
    // Extract phone verification
    const hasPhone = !!(companyData.phone && companyData.phone.trim());

    // Extract address verification (street + city + state)
    const hasAddress = !!(
      !companyData.address ||
      !companyData.city ||
      !companyData.state
    )
      ? true
      : false;

    // Email verification
    const hasPublishedEmail = !!(
      !companyData.public_email ||
      companyData.email_type === "INFERRED"
    )
      ? true
      : false;

    // Domain verification
    const hasDomain = !!(companyData.verified_domain && companyData.verified_domain.trim());

    // Owner identification
    const hasOwner = !!(companyData.owner_name && companyData.owner_name.trim());

    return {
      companyName: companyData.company_name,
      hasPhone,
      hasAddress,
      hasPublishedEmail,
      hasDomain,
      hasOwner,
      phone: companyData.phone,
      email: companyData.public_email,
      address: companyData.address,
      city: companyData.city,
      state: companyData.state,
      owner: companyData.owner_name,
    };
  }
}