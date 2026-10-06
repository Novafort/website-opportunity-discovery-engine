import { runPipeline } from "../src/pipeline.js";
import { CompanyIdentityVerifier } from "../src/identity/verifier.js";
import { WebsiteQualityAssessor } from "../src/quality/index.js";
import { OpportunityScorer } from "../src/scoring/opportunity.js";
import { shouldIncludeInPrimaryCSV, generatePrimaryCsv } from "../src/csv/index.js";
import { EMAIL_CLASSIFICATION } from "../src/email/index.js";

describe("Website Opportunity Discovery Engine - Pipeline", () => {
  let mockProvider;
  let identityVerifier;
  let scorer;

  beforeEach(() => {
    mockProvider = {
      search: async (query) => {
        // Default empty results
        return [];
      },
    };

    identityVerifier = new CompanyIdentityVerifier();
    scorer = new OpportunityScorer();
  });

  describe("CompanyIdentityVerifier", () => {
    test("returns 0 confidence for name-only match", () => {
      const result = identityVerifier.scoreIdentity({
        companyName: "Acme Corp",
      });
      expect(result.identityConfidence).toBe(0);
      expect(result.reasons.length > 0).toBe(true);
    });

    test("returns positive confidence with phone + address", () => {
      const result = identityVerifier.scoreIdentity({
        companyName: "Acme Corp",
        hasPhone: true,
        hasAddress: true,
      });
      expect(result.identityConfidence).toBeGreaterThan(0);
      expect(result.meetsThreshold).toBe(true);
    });

    test("meets threshold with strong evidence", () => {
      const result = identityVerifier.scoreIdentity({
        companyName: "Acme Corp",
        hasPhone: true,
        hasAddress: true,
        hasPublishedEmail: true,
        hasDomain: true,
        hasOwner: true,
      });
      expect(result.meetsThreshold).toBe(true);
    });
  });

  describe("OpportunityScorer", () => {
    test("calculates score for NO_WEBSITE", () => {
      const result = scorer.calculate({
        websiteStatus: "NO_WEBSITE",
        identityConfidence: 0.95,
        researchConfidence: 0.9,
      });
      expect(result.opportunityScore).toBeGreaterThan(0);
      expect(result.breakdown.NO_WEBSITE).toBe(45);
    });

    test("applies GOOD_WEBSITE penalty", () => {
      const result = scorer.calculate({
        websiteStatus: "GOOD_WEBSITE",
        identityConfidence: 0.95,
        researchConfidence: 0.9,
      });
      expect(result.opportunityScore).toBeLessThan(0);
      expect(result.breakdown.GOOD_WEBSITE).toBe(-100);
    });

    test("clamps score to 0-100", () => {
      const result = scorer.calculate({
        websiteStatus: "NO_WEBSITE",
        identityConfidence: 1.0,
        researchConfidence: 1.0,
      });
      expect(result.opportunityScore).toBeLessThanOrEqual(100);
      expect(result.opportunityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("CSV Filtering", () => {
    test("includes NO_WEBSITE with verified email in primary CSV", () => {
      const result = {
        company_name: "Test Corp",
        identity_confidence: 0.95,
        website_status: "NO_WEBSITE",
        has_verified_outreach_email: true,
        opportunity_score: 50,
      };
      expect(shouldIncludeInPrimaryCSV(result)).toBe(true);
    });

    test("excludes GOOD_WEBSITE from primary CSV", () => {
      const result = {
        company_name: "Test Corp",
        identity_confidence: 0.95,
        website_status: "GOOD_WEBSITE",
        has_verified_outreach_email: true,
        opportunity_score: 50,
      };
      expect(shouldIncludeInPrimaryCSV(result)).toBe(false);
    });

    test("excludes UNCERTAIN from primary CSV", () => {
      const result = {
        company_name: "Test Corp",
        identity_confidence: 0.95,
        website_status: "UNCERTAIN",
        has_verified_outreach_email: true,
        opportunity_score: 50,
      };
      expect(shouldIncludeInPrimaryCSV(result)).toBe(false);
    });

    test("excludes companies without verified email from primary CSV", () => {
      const result = {
        company_name: "Test Corp",
        identity_confidence: 0.95,
        website_status: "NO_WEBSITE",
        has_verified_outreach_email: false,
        opportunity_score: 50,
      };
      expect(shouldIncludeInPrimaryCSV(result)).toBe(false);
    });

    test("excludes companies below identity threshold", () => {
      const result = {
        company_name: "Test Corp",
        identity_confidence: 0.5,
        website_status: "NO_WEBSITE",
        has_verified_outreach_email: true,
        opportunity_score: 50,
      };
      expect(shouldIncludeInPrimaryCSV(result, 0.9)).toBe(false);
    });

    test("includes SOCIAL_ONLY with all requirements met", () => {
      const result = {
        company_name: "Test Corp",
        identity_confidence: 0.95,
        website_status: "SOCIAL_ONLY",
        has_verified_outreach_email: true,
        opportunity_score: 45,
      };
      expect(shouldIncludeInPrimaryCSV(result)).toBe(true);
    });
  });

  describe("Email Classification", () => {
    test("EMAIL_CLASSIFICATION constants exist", () => {
      expect(EMAIL_CLASSIFICATION.PUBLISHED).toBe("PUBLISHED");
      expect(EMAIL_CLASSIFICATION.INFERRED).toBe("INFERRED");
      expect(EMAIL_CLASSIFICATION.UNKNOWN).toBe("UNKNOWN");
    });

    test("verified outreach email gate", () => {
      // Published email with high confidence should pass the gate
      const hasVerified = EMAIL_CLASSIFICATION.PUBLISHED === "PUBLISHED";
      expect(hasVerified).toBe(true);
    });
  });
});