/**
 * CSV Export Module
 * 
 * Implements primary qualified prospect CSV (Section 14-17) and raw/audit CSV (Section 16-17).
 * 
 * Primary CSV rules:
 *   - Contains ONLY: NO_WEBSITE, SOCIAL_ONLY, WEAK_WEBSITE
 *   - Requires: identity_confidence >= configured threshold
 *   - Requires: has_verified_outreach_email = true
 *   - Requires: opportunity_score >= configured threshold
 *   - Explicitly excludes: GOOD_WEBSITE, UNCERTAIN, WRONG_IDENTITY,
 *     NO_VERIFIED_EMAIL, FAILED
 * 
 * Raw/audit CSV contains all researched candidates for QA.
 */

import { EMAIL_CLASSIFICATION } from "../email/index.js";

// Configurable thresholds (import from config in full implementation)
const IDENTITY_CONFIDENCE_THRESHOLD = 0.90;
const OPPORTUNITY_SCORE_THRESHOLD = 30; // configurable

/**
 * Determines if a pipeline result should be included in the PRIMARY qualified CSV.
 * 
 * @param {Object} result - Pipeline result from runPipeline()
 * @param {number} [identityThreshold=0.90] - Minimum identity confidence
 * @param {number} [opportunityThreshold=30] - Minimum opportunity score
 * @returns {boolean} - True if company qualifies for primary CSV
 */
export function shouldIncludeInPrimaryCSV(result, identityThreshold = IDENTITY_CONFIDENCE_THRESHOLD, opportunityThreshold = OPPORTUNITY_SCORE_THRESHOLD) {
  // Must have verified identity confidence
  if (result.identity_confidence < identityThreshold) {
    return false;
  }

  // Must have verified outreach email
  if (!result.has_verified_outreach_email) {
    return false;
  }

  // Must meet opportunity score threshold
  if (result.opportunity_score < opportunityThreshold) {
    return false;
  }

  // Explicitly exclude bad statuses
  const excludedStatuses = [
    "GOOD_WEBSITE",
    "UNCERTAIN",
    "WRONG_IDENTITY",
    "NO_VERIFIED_EMAIL",
    "FAILED",
  ];

  if (excludedStatuses.includes(result.website_status)) {
    return false;
  }

  // Only include allowed statuses: NO_WEBSITE, SOCIAL_ONLY, WEAK_WEBSITE
  const allowedStatuses = [
    "NO_WEBSITE",
    "SOCIAL_ONLY",
    "WEAK_WEBSITE",
  ];

  return allowedStatuses.includes(result.website_status);
}

/**
 * Determines if a company should go in the RAW/audit CSV.
 * Raw CSV contains ALL researched candidates for QA purposes.
 * 
 * @param {Object} result - Pipeline result from runPipeline()
 * @returns {boolean} - True if company should be in raw/audit CSV
 */
export function shouldIncludeInRawAuditCSV(result) {
  // Raw CSV contains all researched candidates
  // Exclude only truly failed/complete-invalid results
  if (!result.company_name) {
    return false;
  }

  // Include everything that has some identity data
  if (result.identity_confidence >= 0.1) {
    return true;
  }

  return false;
}

/**
 * Serialize an object/array to deterministic JSON for CSV cell.
 * Handles arrays, objects, null, undefined.
 * 
 * @param {*} value - Value to serialize
 * @returns {string} - JSON string safe for CSV
 */
function serializeJsonValue(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  // String or number
  return String(value);
}

/**
 * Format a value for CSV (quote if contains comma, newline, or quote).
 * 
 * @param {*} value - Value to format
 * @returns {string} - CSV-safe formatted value
 */
function formatCsvValue(value) {
  const str = serializeJsonValue(value);

  // Quote if contains comma, newline, or double-quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate the PRIMARY qualified prospect CSV from pipeline results.
 * 
 * Column order (from Section 14 spec):
 *   company_id, company_name, category
 *   owner_name, owner_title
 *   street, city, state, postal_code
 *   phone
 *   public_email, email_type, email_confidence
 *   facebook_url, facebook_confidence
 *   instagram_url, instagram_confidence
 *   linkedin_url, linkedin_confidence
 *   verified_domain
 *   website_status, website_quality_score
 *   services, service_area
 *   logo_url, brand_colors, photo_urls
 *   trust_signals
 *   identity_confidence, research_confidence, opportunity_score
 *   source_urls, evidence_json
 * 
 * @param {Array<Object>} results - Pipeline results array
 * @param {Object} [options] - Generation options
 *   - {number} [options.identityThreshold] - Minimum identity confidence
 *   - {number} [options.opportunityThreshold] - Minimum opportunity score
 *   - {string} [options.csvPath] - Path to write CSV file (optional, for future file I/O)
 * @returns {string} - CSV formatted string
 */
export function generatePrimaryCsv(results, options = {}) {
  const identityThreshold = options.identityThreshold !== undefined
    ? options.identityThreshold
    : IDENTITY_CONFIDENCE_THRESHOLD;

  const opportunityThreshold = options.opportunityThreshold !== undefined
    ? options.opportunityThreshold
    : OPPORTUNITY_SCORE_THRESHOLD;

  // Filter results that qualify for primary CSV
  const qualified = results.filter(result => shouldIncludeInPrimaryCSV(result, identityThreshold, opportunityThreshold));

  if (qualified.length === 0) {
    return "company_name,website_status,opportunity_score\nNo qualified prospects found\n";
  }

  // Define CSV headers (from Section 14 spec, ordered)
  const headers = [
    "company_id",
    "company_name",
    "category",

    "owner_name",
    "owner_title",

    "street",
    "city",
    "state",
    "postal_code",

    "phone",

    "public_email",
    "email_type",
    "email_confidence",

    "facebook_url",
    "facebook_confidence",

    "instagram_url",
    "instagram_confidence",

    "linkedin_url",
    "linkedin_confidence",

    "verified_domain",
    "website_status",
    "website_quality_score",

    "services",
    "service_area",

    "logo_url",
    "brand_colors",
    "photo_urls",

    "trust_signals",

    "identity_confidence",
    "research_confidence",
    "opportunity_score",

    "source_urls",
    "evidence_json",
  ];

  // Build rows
  const rows = [headers.join(",")];

  qualified.forEach((result, index) => {
    // Generate a simple company_id (in real system would use DB ID)
    const companyId = `c${index + 1}`;

    // Determine category based on website_status
    let category;
    switch (result.website_status) {
      case "NO_WEBSITE":
        category = "No Website";
        break;
      case "SOCIAL_ONLY":
        category = "Social Only";
        break;
      case "WEAK_WEBSITE":
        category = "Weak Website";
        break;
      default:
        category = "Uncategorized";
    }

    // Extract fields from result, with defaults
    const row = [
      companyId,
      result.company_name || "",
      category,

      result.owner_name || "",
      result.owner_title || "",

      "", // street - would come from address enrichment
      result.owner_name ? "" : "", // city - placeholder
      "", // state
      "", // postal_code

      result.phone || "",

      result.public_email || "",
      result.email_type || "",
      Number(result.email_confidence.toFixed(3)),

      result.facebook_url || "",
      Number(result.facebook_confidence.toFixed(3)),

      result.instagram_url || "",
      Number(result.instagram_confidence.toFixed(3)),

      result.linkedin_url || "",
      Number(result.linkedin_confidence.toFixed(3)),

      result.verified_domain || "",
      result.website_status || "",
      Number(result.website_quality_score.toFixed(1)),

      result.opportunity_breakdown && result.opportunity_breakdown.services || "",
      "", // service_area

      result.logo_url || "",
      [], // brand_colors - empty array serialized
      [], // photo_urls - empty array serialized

      "", // trust_signals

      Number(result.identity_confidence.toFixed(3)),
      Number(result.research_confidence || 0, toFixed(3)),
      Number(result.opportunity_score.toFixed(1)),

      [], // source_urls - empty array serialized
      {}, // evidence_json - empty object serialized
    ];

    rows.push(row.join(","));
  });

  return rows.join("\n");
}

/**
 * Generate the RAW/audit CSV containing all researched candidates.
 * 
 * Columns (from Section 16-17 spec):
 *   website_status, identity_confidence, email_status, rejection_reason
 *   plus all other pipeline result fields for QA review
 * 
 * @param {Array<Object>} results - Pipeline results array
 * @param {Object} [options] - Generation options
 *   - {number} [options.identityThreshold] - Minimum identity confidence to include
 * @returns {string} - CSV formatted string
 */
export function generateRawAuditCsv(results, options = {}) {
  const identityThreshold = options.identityThreshold !== undefined
    ? options.identityThreshold
    : 0.1; // Very low threshold for raw CSV - include almost everything

  // Filter results for raw CSV
  const rawResults = results.filter(result => shouldIncludeInRawAuditCSV(result, identityThreshold));

  if (rawResults.length === 0) {
    return "company_name,website_status,identity_confidence,email_status,rejection_reason\nNo results found\n";
  }

  // Define CSV headers for raw audit
  const headers = [
    "company_name",
    "website_status",
    "identity_confidence",
    "email_type",
    "email_confidence",
    "has_verified_outreach_email",
    "rejection_reason",
    "opportunity_score",
    "source_urls",
  ];

  // Build rows
  const rows = [headers.join(",")];

  rawResults.forEach((result, index) => {
    // Generate rejection reason if applicable
    let rejectionReason = "";
    const allowedStatuses = ["NO_WEBSITE", "SOCIAL_ONLY", "WEAK_WEBSITE"];

    if (!allowedStatuses.includes(result.website_status)) {
      if (result.identity_confidence < identityThreshold) {
        rejectionReason = `identity_confidence ${Number(result.identity_confidence.toFixed(2))} below threshold ${identityThreshold}`;
      } else if (result.website_status === "GOOD_WEBSITE" || result.website_status === "UNCERTAIN") {
        rejectionReason = `website_status="${result.website_status}" excluded from primary CSV`;
      } else if (!result.has_verified_outreach_email) {
        rejectionReason = "no_verified_outreach_email";
      } else {
        rejectionReason = "below_opportunity_threshold";
      }
    }

    // Serialize arrays/objects for CSV
    const sourceUrlsStr = JSON.stringify(result.opportunity_breakdown && result.opportunity_breakdown.sourceUrls || []);
    const evidenceJsonStr = JSON.stringify(result.opportunity_breakdown && result.opportunity_breakdown.evidence || {});

    const row = [
      result.company_name || "",
      result.website_status || "",
      Number(result.identity_confidence.toFixed(3)),
      result.email_type || "",
      Number(result.email_confidence.toFixed(3)),
      result.has_verified_outreach_email || false,
      rejectionReason,
      Number(result.opportunity_score.toFixed(1)),
      sourceUrlsStr,
    ];

    rows.push(row.join(","));
  });

  return rows.join("\n");
}

export default {
  generatePrimaryCsv,
  generateRawAuditCsv,
  shouldIncludeInPrimaryCSV,
  shouldIncludeInRawAuditCSV,
};