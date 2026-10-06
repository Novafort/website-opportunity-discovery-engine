/**
 * WebSearchProvider abstraction layer
 * 
 * Defines the interface for search providers. Business logic depends on this
 * interface, not on a specific search engine implementation.
 * 
 * Providers must be replaceable. Search queries and selected URLs are persisted
 * in a log for auditability.
 */

export class WebSearchProvider {
  /**
   * Search for URLs matching the given query.
   * @param {string} query - Search query string
   * @param {Object} options - Search options
   *   - {number} [options.maxResults=10] - Maximum number of results to return
   *   - {number} [options.timeoutMs=30000] - Request timeout
   * @returns {Promise<Array<{url: string, title: string, snippet?: string}>>} Search results
   */
  async search(query, options = {}) {
    throw new Error('Must override search() in subclass');
  }

  /**
   * Log a search query and its selected URL for auditability.
   * @param {string} query - The search query that was executed
   * @param {string} selectedUrl - The URL that was selected/clicked
   * @param {Object} [metadata] - Additional metadata (provider, position, etc.)
   */
  logSearch(query, selectedUrl, metadata = {}) {
    // Default no-op; subclasses may persist to DB, file, or monitoring
    // Business code can call this after selecting a result
    // Example: await provider.logSearch(query, selectedUrl, { provider: 'openrouter', position: 3 });
  }
}