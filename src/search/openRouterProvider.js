/**
 * OpenRouter-based WebSearchProvider implementation
 * 
 * Wraps the OpenRouter LLM API for web searching and content analysis.
 * Can be replaced with any other provider implementing the WebSearchProvider interface.
 */

import axios from "axios";
import { WebSearchProvider } from "./provider.js";

/**
 * OpenRouterWebSearchProvider - searches using OpenRouter's completion API
 * with web search-capable models.
 */
export class OpenRouterWebSearchProvider extends WebSearchProvider {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
    this.baseUrl = options.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel = options.defaultModel || "anthropic/claude-3.5-sonnet";
    this.timeoutMs = options.timeoutMs || 30000;
    this.maxResults = options.maxResults || 10;

    if (!this.apiKey) {
      console.warn("⚠️ OPENROUTER_API_KEY not set; OpenRouterWebSearchProvider will no-op.");
    }
  }

  /**
   * Search the web using OpenRouter with a web-capable model.
   * @param {string} query - Search query
   * @param {Object} options - Search options
   *   - {number} [options.maxResults] - Max results to return
   * @returns {Promise<Array<{url: string, title: string, snippet?: string}>>}
   */
  async search(query, options = {}) {
    if (!this.apiKey) {
      return [];
    }

    const maxResults = options.maxResults ?? this.maxResults;

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.defaultModel,
          messages: [
            {
              role: "system",
              content:
                "You are a web search assistant. Return exactly 5 web search results " +
                "as a JSON array with fields: url, title, snippet. " +
                "Only return valid URLs. Do NOT include any analysis or extra text.",
            },
            {
              role: "user",
              content: `Search the web for: "${query}". Return exactly 5 results in the specified JSON format.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        },
        {
          timeout: this.timeoutMs / 1000,
        }
      );

      const content = response.data.choices[0].message.content.trim();

      // Parse the JSON array from the response
      let results;
      try {
        results = JSON.parse(content);
      } catch (e) {
        // Fallback: try to extract JSON array
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          results = JSON.parse(match[0]);
        } else {
          console.warn(`❌ Failed to parse OpenRouter search response: ${content}`);
          return [];
        }
      }

      // Ensure we have the right shape
      if (!Array.isArray(results)) {
        return [];
      }

      return results
        .filter(
          (r) =>
            r && typeof r === "object" && r.url && typeof r.url === "string"
        )
        .slice(0, maxResults)
        .map((r) => ({
          url: r.url,
          title: r.title || r.url,
          snippet: r.snippet || "",
        }));
    } catch (error) {
      console.error(`❌ OpenRouter search error for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Log a search query and selected URL.
   * @param {string} query - The search query
   * @param {string} selectedUrl - The URL that was selected
   * @param {Object} metadata - Additional metadata
   */
  logSearch(query, selectedUrl, metadata = {}) {
    super.logSearch(query, selectedUrl, {
      ...metadata,
      provider: "openrouter",
      model: this.defaultModel,
    });
    // Could also persist to DB, file, or monitoring here
    console.log(`🔍 [OpenRouter log] query="${query}" url="${selectedUrl}"`);
  }
}