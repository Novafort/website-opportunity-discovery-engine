# Website Opportunity Discovery Engine

> A standalone B2B website opportunity discovery engine that identifies qualified prospects by crawling and analyzing websites.

## Overview

This engine autonomously discovers business opportunities by:
- Crawling target websites and extracting relevant business information
- Normalizing company data and scoring prospects by confidence
- Providing a CSV export of qualified prospects

## Features (Planned)

- 🕷️ Web crawling with politeness and robots.txt respect
- 🏢 Company normalization and deduplication
- 📊 Confidence scoring based on signals
- 📧 Contact extraction (email, phone, social)
- 🔍 OpenRouter AI-powered analysis
- 📁 CSV export of qualified prospects
- ⚙️ Configurable via environment variables

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.template .env
# Edit .env with your configuration

# Run the engine
npm start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the discovery engine |
| `npm test` | Run the test suite |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed initial data |

## Project Structure

```
├── docs/           # Documentation (including REUSE-AUDIT.md)
├── migrations/     # Database migrations
├── src/            # Source code
├── tests/          # Test suite
├── .env.template   # Environment variable template
└── package.json    # Project dependencies
```

## Independence

This is a **completely independent project** — no runtime dependencies on any other project.
It can be deleted and recreated without affecting other systems.

## Roadmap

- [ ] Basic web crawler with politeness delays
- [ ] Company normalization helpers
- [ ] Contact extraction from pages
- [ ] Confidence scoring algorithm
- [ ] OpenRouter AI integration
- [ ] CSV export functionality
- [ ] CLI interface
- [ ] Database schema and migrations