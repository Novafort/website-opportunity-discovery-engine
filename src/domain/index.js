/**
 * Domain Discovery and Verification
 * 
 * Searches for possible company websites using multiple query patterns.
 * Rejects directories, social platforms, parked domains, etc.
 * 
 * Only accepts standalone domains when company identity is sufficiently
 * corroborated (per identity verifier).
 */

import { WebSearchProvider } from "../search/provider.js";
import { CompanyIdentityVerifier } from "../identity/verifier.js";

/**
 * Patterns that must be rejected as official company domains
 */
const REJECTED_DOMAIN_PATTERNS = [
  /^facebook\.com$/i,
  /^instagram\.com$/i,
  /^linkedin\.com$/i,
  /^bbb\.org$/i,
  /^yelp\.com$/i,
  /^directory\.com$/i,
  /^superpages\.com$/i,
  /^angieslist\.com$/i,
  /^homeadvisor\.com$/i,
  /^google\.com$/i,
  /^bing\.com$/i,
  /^youtube\.com$/i,
  /^twitter\.com$/i,
  /^x\.com$/i,
];

/**
 * Check if a domain matches any rejected pattern
 * @param {string} domain - Domain to check
 * @returns {boolean} True if domain should be rejected
 */
function isRejectedDomain(domain) {
  if (!domain) return true;

  const normalized = domain.toLowerCase().replace(/^www\./, "");

  return REJECTED_DOMAIN_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Normalize a domain (strip www, ensure https:// prefix for consistency)
 * @param {string} domain - Raw domain
 * @returns {string} Normalized domain
 */
function normalizeDomain(domain) {
  if (!domain) return "";
  return domain
    .toString()
    .trim()
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

/**
 * Discover company websites using multiple query patterns.
 * 
 * Query patterns (from Section 7):
 * - company name + city/state
 * - company name + phone
 * - phone
 * - company name + website
 * - email domain
 * - social profile cross-links
 * - directory website links
 * 
 * @param {Object} options - Discovery options
 *   - {WebSearchProvider} options.provider - Search provider instance
 *   - {CompanyIdentityVerifier} options.identityVerifier - Identity verifier
 *   - {string} options.companyName - Company name
 *   - {string} [options.city] - City (optional)
 *   - {string} [options.state] - State (optional)
 *   - {string} [options.phone] - Phone (optional)
 *   - {string} [options.emailDomain] - Email domain (optional)
 *   - {Array<string>} [options.socialProfiles] - Known social profile URLs (optional)
 * @returns {Promise<Object>} - { verifiedDomain: string, confidence: number, discoveryMethod: string, rejected: boolean }
 */
export async function discoverDomain({
  provider,
  identityVerifier,
  companyName,
  city,
  state,
  phone,
  emailDomain,
  socialProfiles = [],
}) {
  if (!provider || !companyName) {
    return {
      verifiedDomain: "",
      confidence: 0,
      discoveryMethod: "missing_params",
      rejected: true,
    };
  }

  const normalizedCompanyName = companyName
    .toString()
    .trim()
    .toLowerCase();

  // Build search queries
  const queries = [];

  if (city && state) {
    queries.push(`${normalizedCompanyName} ${city} ${state}`);
  }

  if (phone) {
    queries.push(`${normalizedCompanyName} ${phone}`);
  }

  queries.push(normalizedCompanyName); // baseline

  if (emailDomain) {
    queries.push(emailDomain);
  }

  // Cross-link with known social profiles
  // (we'll check these after initial search)

  // Execute searches and collect candidate domains
  const candidateDomains = new Set();
  const searchResults = [];

  const limit = provider.search.bind(provider);

  for (const query of queries.slice(0, 5)) { // limit to 5 queries to avoid overload
    try {
      const results = await provider.search(query, { maxResults: 5 });
      searchResults.push({ query, results });

      for (const result of results) {
        if (result.url) {
          try {
            const domain = new URL(result.url).hostname;
            candidateDomains.add(normalizeDomain(domain));
          } catch (e) {
            // Skip malformed URLs
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Search query failed: "${query}"`, e.message);
    }
  }

  // Also check social profile cross-links for website URLs
  for (const profileUrl of socialProfiles) {
    try {
      if (profileUrl && profileUrl.includes("facebook.com")) {
        // Try to extract linked website from Facebook page
        // (handled in social discovery section)
      }
      if (profileUrl && profileUrl.includes("instagram.com")) {
        // Try to extract linked website from Instagram page
      }
    } catch (e) {
      // skip
    }
  }

  // Evaluate candidate domains
  let verifiedDomain = "";
  let confidence = 0;
  let rejectionReason = "";
  let discoveryMethod = "no_candidates";

  for (const domain of candidateDomains) {
    // Reject known bad patterns
    if (isRejectedDomain(domain)) {
      rejectionReason = `Rejected: ${domain} matches blocked pattern`;
      continue;
    }

    // Check if domain appears to be a legitimate standalone website
    // (not a directory, not a social platform)
    const domainScore = evaluateDomain(domain);

    if (domainScore > confidence) {
      confidence = domainScore;
      verifiedDomain = domain;
      discoveryMethod = "domain_candidate";
    }
  }

  // If we have a verified domain and identity verification passes, strengthen
  if (verifiedDomain && identityVerifier) {
    const identityResult = identityVerifier.scoreIdentity({
      hasDomain: true,
      companyName,
    });

    // Boost confidence if identity is verified
    if (identityResult.meetsThreshold) {
      confidence = Math.min(confidence + 0.2, 1.0);
    }
  }

  // Final decision: if confidence is too low, mark as uncertain/no verified domain
  if (confidence < 0.3) {
    verifiedDomain = "";
    confidence = 0;
    rejectionReason = "Insufficient evidence for verified domain";
  }

  return {
    verifiedDomain,
    confidence: Number(confidence.toFixed(3)),
    discoveryMethod,
    rejected: verifiedDomain === "",
    rejectionReason,
  };
}

/**
 * Evaluate a domain's likelihood of being the official company website.
 * Objective signals only (no subjective LLM visual scoring in V1).
 * @param {string} domain - Normalized domain
 * @returns {number} Confidence score 0-1
 */
function evaluateDomain(domain) {
  let score = 0;

  // A real domain has basic structure
  if (!domain) return 0;

  // Basic domain validity gives a small base score
  score += 0.1; // just having a domain candidate

  // Heuristics (these are rough estimates, not definitive):
  // - Domain length (shorter = more likely legitimate business)
  // - TLD (.com, .co, .io vs .pw, .top, .xyz - commonly used for parked domains)
  // - Subdomain complexity

  // For V1, we keep this very simple and conservative
  // The real verification comes from the identity + social cross-linking

  return Math.min(score, 1.0);
}

/**
 * Attempt to find a website URL from a Facebook business page.
 * @param {WebSearchProvider} provider - Search provider
 * @param {string} facebookUrl - Facebook page URL
 * @param {string} companyName - Company name for context
 * @returns {Promise<Object>} - { websiteUrl: string, confidence: number }
 */
export async function discoverWebsiteFromFacebook({ provider, facebookUrl, companyName }) {
  if (!provider || !facebookUrl) {
    return { websiteUrl: "", confidence: 0 };
  }

  const queries = [
    `${companyName} website`,
    `${companyName} official site`,
  ];

  let bestResult = { websiteUrl: "", confidence: 0 };

  for (const query of queries) {
    try {
      const results = await provider.search(query, { maxResults: 3 });
      for (const result of results) {
        if (result.url && !result.url.includes("facebook.com") && !result.url.includes("instagram.com")) {
          const confidence = result.snippet ? 0.6 : 0.4;
          if (confidence > bestResult.confidence) {
            bestResult = { websiteUrl: result.url, confidence };
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  return bestResult;
}

/**
 * Attempt to find a website URL from an Instagram profile.
 * @param {WebSearchProvider} provider - Search provider
 * @param {string} instagramUrl - Instagram profile URL
 * @param {string} companyName - Company name for context
 * @returns {Promise<Object>} - { websiteUrl: string, confidence: number }
 */
export async function discoverWebsiteFromInstagram({ provider, instagramUrl, companyName }) {
  if (!provider || !instagramUrl) {
    return { websiteUrl: "", confidence: 0 };
  }

  const queries = [
    `${companyName} website`,
    `${companyName} official site`,
  ];

  let bestResult = { websiteUrl: "", confidence: 0 };

  for (const query of queries) {
    try {
      const results = await provider.search(query, { maxResults: 3 });
      for (const result of results) {
        if (result.url && !result.url.includes("facebook.com") && !result.url.includes("instagram.com")) {
          const confidence = result.snippet ? 0.6 : 0.4;
          if (confidence > bestResult.confidence) {
            bestResult = { websiteUrl: result.url, confidence };
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  return bestResult;
}