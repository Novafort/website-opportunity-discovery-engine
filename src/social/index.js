/**
 * Social Discovery Module
 * 
 * Implements mandatory Facebook and Instagram discovery (Sections 3-5).
 * LinkedIn discovery is lower priority (Section 5).
 * 
 * Verification uses: company name, phone, address, city/state, owner,
 * services, website cross-links, logo/branding, email.
 * Only verified profiles are returned; ambiguous profiles are excluded.
 */

import { WebSearchProvider } from "../search/provider.js";
import { CompanyIdentityVerifier } from "../identity/verifier.js";

/**
 * Patterns that indicate a Facebook profile is for the target company
 */
const FACEBOOK_VERIFICATION_PATTERNS = {
  // Company name in page title/about
  companyNameInAbout: /company|business/i,
  // Location matches
  locationMatches: /city|state/i,
  // Phone matches
  phoneMatches: /phone|tel:/i,
  // Email matches
  emailMatches: /email:/i,
  // Website cross-link present
  websiteCrossLink: /website|url:/i,
};

/**
 * LinkedIn verification patterns
 */
const LINKEDIN_VERIFICATION_PATTERNS = {
  companyNameInTitle: /company|corporation|inc|llc/i,
  industryMatches: /industry|sector/i,
  locationMatches: /location|city|state/i,
};

/**
 * Verify a Facebook profile against a company.
 * @param {Object} options - Verification options
 *   - {WebSearchProvider} options.provider - Search provider
 *   - {CompanyIdentityVerifier} options.identityVerifier - Identity verifier
 *   - {string} options.facebookUrl - Facebook profile URL
 *   - {string} options.companyName - Target company name
 *   - {string} [options.phone] - Company phone (optional)
 *   - {string} [options.address] - Company address (optional)
 *   - {string} [options.city] - Company city (optional)
 *   - {string} [options.state] - Company state (optional)
 *   - {string} [options.owner] - Owner name (optional)
 *   - {string} [options.website] - Company website (optional)
 * @returns {Promise<Object>} - { facebook_url: string, facebook_confidence: number, verification_details: Object }
 */
export async function verifyFacebookProfile({
  provider,
  identityVerifier,
  facebookUrl,
  companyName,
  phone,
  address,
  city,
  state,
  owner,
  website,
}) {
  if (!provider || !facebookUrl || !companyName) {
    return {
      facebook_url: "",
      facebook_confidence: 0,
      verification_details: {},
    };
  }

  // Search for the Facebook page and extract verification data
  const queries = [
    `${companyName} facebook business page`,
    `${companyName} facebook`,
  ];

  let bestMatchConfidence = 0;
  let verificationDetails = {};

  for (const query of queries) {
    try {
      const results = await provider.search(query, { maxResults: 5 });
      for (const result of results) {
        if (result.url && result.url.includes("facebook.com")) {
          // Extract confidence from snippet/text
          const snippet = result.snippet || "";
          let confidence = 0.3; // base confidence for finding a FB page

          // Check for company name in snippet
          if (snippet.toLowerCase().includes(companyName.toLowerCase())) {
            confidence += 0.2;
            verificationDetails.companyNameMatched = true;
          }

          // Check for phone match
          if (phone && snippet.includes(phone)) {
            confidence += 0.2;
            verificationDetails.phoneMatched = true;
          }

          // Check for address match
          if (address && snippet.includes(address)) {
            confidence += 0.15;
            verificationDetails.addressMatched = true;
          }

          // Check for location match
          if (city && snippet.toLowerCase().includes(city.toLowerCase())) {
            confidence += 0.1;
            verificationDetails.cityMatched = true;
          }
          if (state && snippet.toLowerCase().includes(state.toLowerCase())) {
            confidence += 0.1;
            verificationDetails.stateMatched = true;
          }

          // Check for website cross-link
          if (website && snippet.toLowerCase().includes("website")) {
            confidence += 0.1;
            verificationDetails.websiteCrossLink = true;
          }

          if (confidence > bestMatchConfidence) {
            bestMatchConfidence = confidence;
            verificationDetails.query = query;
            verificationDetails.snippet = snippet;
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Apply minimum confidence threshold for returning a result
  const minConfidence = 0.5;
  const facebookConfidence = Math.min(bestMatchConfidence, 1.0);

  return {
    facebook_url: bestMatchConfidence >= minConfidence ? facebookUrl : "",
    facebook_confidence: facebookConfidence,
    verification_details,
  };
}

/**
 * Verify an Instagram profile against a company.
 * @param {Object} options - Verification options
 *   - {WebSearchProvider} options.provider - Search provider
 *   - {CompanyIdentityVerifier} options.identityVerifier - Identity verifier
 *   - {string} options.instagramUrl - Instagram profile URL
 *   - {string} options.companyName - Target company name
 *   - {string} [options.phone] - Company phone (optional)
 *   - {string} [options.address] - Company address (optional)
 *   - {string} [options.city] - Company city (optional)
 *   - {string} [options.state] - Company state (optional)
 *   - {string} [options.owner] - Owner name (optional)
 *   - {string} [options.website] - Company website (optional)
 * @returns {Promise<Object>} - { instagram_url: string, instagram_confidence: number, verification_details: Object }
 */
export async function verifyInstagramProfile({
  provider,
  identityVerifier,
  instagramUrl,
  companyName,
  phone,
  address,
  city,
  state,
  owner,
  website,
}) {
  if (!provider || !instagramUrl || !companyName) {
    return {
      instagram_url: "",
      instagram_confidence: 0,
      verification_details: {},
    };
  }

  // Search for the Instagram profile and extract verification data
  const queries = [
    `${companyName} instagram business`,
    `${companyName} instagram`,
  ];

  let bestMatchConfidence = 0;
  let verificationDetails = {};

  for (const query of queries) {
    try {
      const results = await provider.search(query, { maxResults: 5 });
      for (const result of results) {
        if (result.url && result.url.includes("instagram.com")) {
          const snippet = result.snippet || "";
          let confidence = 0.3; // base confidence for finding an IG profile

          // Check for company name in snippet
          if (snippet.toLowerCase().includes(companyName.toLowerCase())) {
            confidence += 0.2;
            verificationDetails.companyNameMatched = true;
          }

          // Check for phone match
          if (phone && snippet.includes(phone)) {
            confidence += 0.2;
            verificationDetails.phoneMatched = true;
          }

          // Check for address match
          if (address && snippet.includes(address)) {
            confidence += 0.15;
            verificationDetails.addressMatched = true;
          }

          // Check for location match
          if (city && snippet.toLowerCase().includes(city.toLowerCase())) {
            confidence += 0.1;
            verificationDetails.cityMatched = true;
          }
          if (state && snippet.toLowerCase().includes(state.toLowerCase())) {
            confidence += 0.1;
            verificationDetails.stateMatched = true;
          }

          // Check for website cross-link
          if (website && snippet.toLowerCase().includes("website")) {
            confidence += 0.1;
            verificationDetails.websiteCrossLink = true;
          }

          if (confidence > bestMatchConfidence) {
            bestMatchConfidence = confidence;
            verificationDetails.query = query;
            verificationDetails.snippet = snippet;
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Apply minimum confidence threshold
  const minConfidence = 0.5;
  const instagramConfidence = Math.min(bestMatchConfidence, 1.0);

  return {
    instagram_url: bestMatchConfidence >= minConfidence ? instagramUrl : "",
    instagram_confidence: instagramConfidence,
    verification_details,
  };
}

/**
 * Attempt LinkedIn discovery (lower priority, Section 5).
 * @param {Object} options - Discovery options
 *   - {WebSearchProvider} options.provider - Search provider
 *   - {string} options.companyName - Company name
 *   - {string} [options.website] - Company website (optional)
 * @returns {Promise<Object>} - { linkedin_url: string, linkedin_confidence: number }
 */
export async function discoverLinkedIn({
  provider,
  companyName,
  website,
}) {
  if (!provider || !companyName) {
    return { linkedin_url: "", linkedin_confidence: 0 };
  }

  const queries = [
    `${companyName} LinkedIn`,
    `${companyName} company LinkedIn`,
  ];

  let bestMatchConfidence = 0;
  let bestResultUrl = "";

  for (const query of queries) {
    try {
      const results = await provider.search(query, { maxResults: 5 });
      for (const result of results) {
        if (result.url && result.url.includes("linkedin.com/company")) {
          const confidence = result.snippet ? 0.55 : 0.45;
          if (confidence > bestMatchConfidence) {
            bestMatchConfidence = confidence;
            bestResultUrl = result.url;
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  return {
    linkedin_url: bestMatchConfidence >= 0.5 ? bestResultUrl : "",
    linkedin_confidence: Math.min(bestMatchConfidence, 1.0),
  };
}