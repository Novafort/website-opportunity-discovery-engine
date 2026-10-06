# Reuse Audit: Website Opportunity Discovery Engine

## 1. Useful Architectural Patterns (from existing project)

Since the "Autonomous B2B Company Discovery Engine V1" project was not found on disk,
general architectural patterns typical of B2B discovery engines are documented below:

- **Modular job queue design** — jobs enqueued separately from execution, with worker processes
- **Company normalization** — standardizing company names, domains, and formats for deduplication
- **Confidence scoring** — probabilistic scoring of prospects based on signal strength
- **Evidence/provenance tracking** — tracking source URLs, crawl dates, and data origins
- **Web-search transport patterns** — using APIs (OpenRouter, etc.) with retry and backoff
- **Crawler utilities** —robots.txt respect, rate limiting, HTML parsing, extractors
- **Contact extraction helpers** — parsing email/phone from web pages with validation
- **Domain/URL normalization** — stripping protocols, handling www, subdomain consolidation

## 2. Files/Functions Worth Copying/Adapting

If the existing project is located later, the following categories should be examined:

- Job queue worker patterns (which framework, how workers are leased)
- Retry/backoff handling for network requests
- Company deduplication helper functions
- Contact extraction regexes/utilities
- OpenRouter wrapper configuration
- CLI argument parsing and entry points
- Database access patterns (ORM or raw SQL used)
- Test setup and fixtures

## 3. Code That Must Not Be Reused

- Do NOT import from `../Autonomous B2B Company Discovery Engine V1/...`
- Do NOT depend on the existing project's database schema or migrations
- Do NOT depend on the existing project's worker runtime
- Do NOT require the existing project to be running at runtime

## 4. Dependencies Worth Adopting

Consider adopting (from scratch or adapted):

- `openrouter` — OpenRouter LLM API wrapper
- `cheerio` or `jsdom` — HTML crawling/parsing
- `p-limit` — request concurrency limiting
- `axios` or `node-fetch` — HTTP client
- `bcryptjs` or `argon2` — password hashing (if auth is needed)
- `jsonwebtoken` — if authentication is needed
- `date-fns` — date handling
- `slugify` — URL/domain slug generation

## 5. Database Patterns Worth Adopting

Typical patterns for a discovery engine:

- **Company table**: name, domain, normalized_name, confidence_score, status
- **Prospect/Contact table**: company_id, name, title, email, phone, linkedin_url
- **CrawlLog table**: url, status, fetched_at, error_message, retry_count
- **Evidence table**: prospect_id, source_url, snippet, captured_at
- Indexes on: domain, normalized_name, status, confidence_score

Consider using SQLite for simplicity, or PostgreSQL if more features are needed.

## 6. Job/Worker Patterns Worth Adopting

- **Queue-based job processing**: enqueue discovery jobs, workers process asynchronously
- **Worker leasing/fencing**: use a lock/claim mechanism so only one worker processes a job
- **Retry handling**: exponential backoff on failures, max retry count
- **Job status tracking**: pending → in_progress → completed/failed
- **Heartbeat/check-in**: workers signal they're alive

## 7. Web-Search Patterns Worth Adopting

- API key management (environment variables)
- Rate limiting per API provider
- Response schema validation
- Fallback/fallback ordering among multiple providers
- Request timeout and cancellation

## 8. Crawler Patterns Worth Adopting

- `robots.txt` checking before crawling
- Politeness delay between requests to same domain
- User-agent identification
- Error handling for 403, 429, connection errors
- HTML cleaning (remove scripts/styles, extract text)
- Extract links from page, follow depth-limited BFS

## 9. Social-Discovery Patterns Worth Adopting

- LinkedIn profile URL extraction
- Company social media handle discovery
- Email format inference (first.last, firstinitial.last, etc.)
- Validation of found contacts (regex, deliverability check)

## 10. Risks of Coupling

- **Runtime imports** from the existing project break independence
- **Shared database** causes schema conflicts and deployment coupling
- **Shared worker process** means one project must be running for the other to function
- **Configuration leakage** — environment variables, paths hardcoded to existing project
- **Git history coupling** — committing to both repos from same workspace causes confusion

## 11. Plan for Keeping the New Project Independent

1. **Zero runtime imports** from the existing project — all code is self-contained
2. **Own database** — migrations and schema are completely separate; use own data directory
3. **Own worker/runtime** — standalone CLI or Node scripts; no dependency on existing project's server
4. **Environment file template** — `.env.template` with all required vars documented
5. **Self-contained `package.json`** — dependencies only from npm, no path references to existing project
6. **Git repository initialized independently** — `git init` in own folder, own initial commit
7. **No shared configuration** — `config/` or `.env` files are project-local only
8. **CI configuration** — GitHub Actions or similar that runs on the new repo only
9. **Docker optional** — if used, own Dockerfile and docker-compose, not referencing existing project
10. **Deletable** — the entire folder can be `rm -rf`’d without affecting the existing project

---

*Audit performed as first task for new project setup. Existing project "Autonomous B2B Company Discovery Engine V1" not found on disk — patterns documented are generic to the B2B discovery engine category.*