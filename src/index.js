/**
 * Website Opportunity Discovery Engine - Main Entry Point
 *
 * Discovers qualified B2B opportunities by crawling and analyzing websites.
 * Completely independent — no runtime dependencies on other projects.
 */

import axios from "axios";
import cheerio from "cheerio";
import { pLimit } from "p-limit";
import dotenv from "dotenv";

dotenv.config();

const { OPENROUTER_API_KEY } = process.env;
if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY not set. See .env.template");
  process.exit(1);
}

const limit = pLimit(2);

/**
 * Normalize a company name for deduplication
 * @param {string} name - Raw company name
 * @returns {string} Normalized name
 */
function normalizeCompanyName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Extract potential emails from page text
 * @param {string} text - HTML text content
 * @returns {string[]} Found email addresses
 */
function extractEmails(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches)];
}

/**
 * Extract potential phone numbers from page text
 * @param {string} text - HTML text content
 * @returns {string[]} Found phone numbers
 */
function extractPhones(text) {
  const phoneRegex = /\+?[\d\s\-\(\)]{8,}/g;
  const matches = text.match(phoneRegex) || [];
  return [...new Set(matches)];
}

/**
 * Crawl a single URL and extract relevant data
 * @param {string} url - URL to crawl
 * @returns {Promise<Object>} Crawl result
 */
async function crawlUrl(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Website-Opp-Discovery-Engine/0.1.0",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const text = $("body").text();

    return {
      url,
      status: "success",
      title: $("title").text() || "",
      emails: extractEmails(text),
      phones: extractPhones(text),
      companyName: normalizeCompanyName(
        /([A-Z][a-zA-Z0-9\s&]+(?=(\n|$)))/g.exec(text)?.pop() || ""
      ),
      rawText: text.substring(0, 2000),
    };
  } catch (error) {
    return {
      url,
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Discover opportunities from a list of starting URLs
 * @param {string[]} startingUrls - URLs to start crawling from
 * @param {number} maxDepth - Maximum crawl depth
 * @returns {Promise<Object[]>} Array of crawl results
 */
export async function discoverOpportunities(startingUrls, maxDepth = 2) {
  console.log(`🔍 Starting discovery with ${startingUrls.length} URLs, max depth ${maxDepth}`);

  const results = [];

  const crawlTask = async (url, depth) => {
    if (depth > maxDepth) return;

    const result = await crawlUrl(url);
    results.push(result);

    if (depth < maxDepth && result.status === "success") {
      // Extract links from the page
      const $ = cheerio.load(result.rawText);
      const links = $("a")
        .map((_, el) => $(el).attr("href"))
        .get()
        .filter(
          (href) =>
            href &&
            !href.startsWith("mailto:") &&
            !href.startsWith("javascript:") &&
            (href.startsWith("http://") || href.startsWith("https://"))
        );

      // Queue links for next depth level
      const linkPromises = links.map((link) => limit(() => crawlTask(link, depth + 1)));
      await Promise.all(linkPromises);
    }
  };

  await Promise.all(startingUrls.map((url) => crawlTask(url, 0)));

  return results;
}

// If run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const urls = args.length > 0 ? args : ["https://example.com"];
  const depth = args.length > 1 ? parseInt(args[1], 10) : 1;

  discoverOpportunities(urls, depth).then((results) => {
    console.log(`\n📊 Discovery complete: ${results.length} results`);
    results.forEach((r) => {
      console.log(`\n─ ${r.url} (status: ${r.status})`);
      if (r.status === "success") {
        console.log(`  Title: ${r.title}`);
        console.log(`  Company: ${r.companyName}`);
        console.log(`  Emails: ${r.emails.join(", ") || "none"}`);
        console.log(`  Phones: ${r.phones.join(", ") || "none"}`);
      } else {
        console.log(`  Error: ${r.error}`);
      }
    });
  });
}

export default { crawlUrl, discoverOpportunities, normalizeCompanyName, extractEmails, extractPhones };