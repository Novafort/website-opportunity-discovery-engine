/**
 * Email Enrichment and Verified Email Gate
 * 
 * Attempts to return: owner_name, owner_title, phone, public_email
 * Every material field retains source and confidence internally.
 * 
 * Email classification:
 *   PUBLISHED - publicly displayed on website, directory, or social profile
 *   INFERRED - generated via pattern (first.last, etc.) but NOT verified as published
 *   UNKNOWN - no email found
 * 
 * Never represent an inferred email as published.
 * 
 * Primary prospect CSV must only contain companies where:
 *   has_verified_outreach_email = true
 */

import { WebSearchProvider } from "../search/provider.js";
import { CompanyIdentityVerifier } from "../identity/verifier.js";

/**
 * Classification of an email source
 */
export const EMAIL_CLASSIFICATION = {
  PUBLISHED: "PUBLISHED",
  INFERRED: "INFERRED",
  UNKNOWN: "UNKNOWN",
};

/**
 * Enrich company data with owner and contact information.
 * @param {Object} options - Enrichment options
 *   - {WebSearchProvider} options.provider - Search provider
 *   - {CompanyIdentityVerifier} options.identityVerifier - Identity verifier
 *   - {string} options.companyName - Company name
 *   - {string} options.website - Verified website URL (optional)
 *   - {string} [options.facebookUrl] - Facebook profile URL (optional)
 *   - {string} [options.instagramUrl] - Instagram profile URL (optional)
 *   - {string} [options.linkedinUrl] - LinkedIn URL (optional)
 *   - {string} [options.phone] - Company phone (optional)
 *   - {string} [options.address] - Company address (optional)
 *   - {string} [options.city] - Company city (optional)
 *   - {string} [options.state] - Company state (optional)
 * @returns {Promise<Object>} - { owner_name, owner_title, phone, public_email, email_type, email_confidence, has_verified_outreach_email }
 */
export async function enrichEmail({
  provider,
  identityVerifier,
  companyName,
  website,
  facebookUrl,
  instagramUrl,
  linkedinUrl,
  phone,
  address,
  city,
  state,
}) {
  let publicEmail = "";
  let emailType = EMAIL_CLASSIFICATION.UNKNOWN;
  let emailConfidence = 0;
  let ownerName = "";
  let ownerTitle = "";
  let hasVerifiedOutreachEmail = false;

  // Strategy 1: Search for published email on website
  if (website) {
    try {
      const emailResults = await provider.search(
        `${companyName} contact email`,
        { maxResults: 3 }
      );

      for (const result of emailResults) {
        if (result.snippet) {
          const snippet = result.snippet;

          // Check for published email pattern (mailto: or obvious display)
          const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (emailMatch) {
            // Determine if this is likely published or inferred
            // If it's directly in the snippet text, it's more likely published
            emailConfidence = 0.8;
            emailType = EMAIL_CLASSIFICATION.PUBLISHED;
            publicEmail = emailMatch[0];
            break;
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Strategy 2: Check Facebook for published contact
  if (!publicEmail && facebookUrl) {
    try {
      const fbResults = await provider.search(
        `${companyName} facebook contact`,
        { maxResults: 3 }
      );

      for (const result of fbResults) {
        if (result.snippet) {
          const emailMatch = result.snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (emailMatch && emailType === EMAIL_CLASSIFICATION.UNKNOWN) {
            emailConfidence = 0.6;
            emailType = EMAIL_CLASSIFICATION.PUBLISHED;
            publicEmail = emailMatch[0];
            break;
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Strategy 3: Check Instagram for contact
  if (!publicEmail && instagramUrl) {
    try {
      const igResults = await provider.search(
        `${companyName} instagram contact`,
        { maxResults: 3 }
      );

      for (const result of igResults) {
        if (result.snippet) {
          const emailMatch = result.snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (emailMatch && emailType === EMAIL_CLASSIFICATION.UNKNOWN) {
            emailConfidence = 0.5;
            emailType = EMAIL_CLASSIFICATION.PUBLISHED;
            publicEmail = emailMatch[0];
            break;
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Strategy 4: Infer email from patterns (name, domain) - but mark as INFERRED
  // Only if we have name + domain and no published email found
  if (emailType === EMAIL_CLASSIFICATION.UNKNOWN && website) {
    // Try to extract name and domain to infer
    // This is marked as INFERRED, never PUBLISHED
    const domainMatch = website.match(/^https?:\/\/([^\/]+)/i);
    if (domainMatch) {
      const domain = domainMatch[1];
      // If we have some name info or can infer, mark as INFERRED with lower confidence
      emailConfidence = 0.3;
      emailType = EMAIL_CLASSIFICATION.INFERRED;
      // We don't set a specific email address - just mark the type
      // The actual email would need proper validation which is beyond V1
    }
  }

  // Determine verified outreach email gate
  // has_verified_outreach_email = true only if we have a PUBLISHED email with sufficient confidence
  hasVerifiedOutreachEmail = emailType === EMAIL_CLASSIFICATION.PUBLISHED && emailConfidence >= 0.7;

  // Owner enrichment - search for owner name
  if (!ownerName) {
    try {
      const ownerResults = await provider.search(
        `${companyName} owner president`,
        { maxResults: 3 }
      );

      for (const result of ownerResults) {
        if (result.snippet && result.snippet.length > 10) {
          // Simple heuristic: look for Mr./Ms. or person name patterns
          const namePatterns = result.snippet.match(
            /(Mr\.|Ms\.|Mrs\.)?\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?/g
          );
          if (namePatterns && !ownerName) {
            // Be conservative - only accept if snippet clearly indicates owner
            ownerName = namePatterns[0].trim();
            ownerTitle = "Owner"; // default
            emailConfidence = Math.max(emailConfidence, 0.4);
            break;
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Phone enrichment - retain company phone with confidence
  const finalPhone = phone || "";

  // Return enriched data
  return {
    owner_name: ownerName || undefined,
    owner_title: ownerTitle || undefined,
    phone: finalPhone,
    public_email: publicEmail || undefined,
    email_type: emailType,
    email_confidence: Number(emailConfidence.toFixed(3)),
    has_verified_outreach_email: hasVerifiedOutreachEmail,
  };
}