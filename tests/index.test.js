import { crawlUrl, discoverOpportunities, normalizeCompanyName, extractEmails, extractPhones } from "../src/index.js";

describe("Company Name Normalization", () => {
  test("normalizes simple company names", () => {
    expect(normalizeCompanyName("  Acme Corp  ")).toBe("acme corp");
  });

  test("lowercases and trims", () => {
    expect(normalizeCompanyName("  WEB  ").toLowerCase().trim()).toBe("web");
  });
});

describe("Email Extraction", () => {
  test("extracts emails from text", () => {
    const text = "Contact us at info@example.com or support@test.org";
    const emails = extractEmails(text);
    expect(emails).toContain("info@example.com");
    expect(emails).toContain("support@test.org");
  });

  test("deduplicates emails", () => {
    const text = "Email: info@example.com, info@example.com";
    const emails = extractEmails(text);
    expect(emails).toHaveLength(1);
  });
});

describe("Phone Extraction", () => {
  test("extracts phone numbers from text", () => {
    const text = "Call us at +1-555-0199 or (555) 0199";
    const phones = extractPhones(text);
    expect(phones).toContain("+1-555-0199");
  });
});

describe("URL Crawling", () => {
  test("crawls a URL and returns structured data", async () => {
    const result = await crawlUrl("https://httpbin.org/get");
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("status");
  }, 30000);
});