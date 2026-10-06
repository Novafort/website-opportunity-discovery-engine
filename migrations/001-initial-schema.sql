/** Initial migration: create companies and prospects tables */
export function up(db) {
  return Promise.all([
    // Companies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL UNIQUE,
        domain TEXT,
        confidence_score REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        source_url TEXT,
        discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `),

    // Prospects/contacts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS prospects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        title TEXT,
        email TEXT,
        phone TEXT,
        linkedin_url TEXT,
        confidence_score REAL DEFAULT 0,
        source_url TEXT,
        discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        evidence JSON DEFAULT '{}'
      );
    `),

    // Crawl log table
    db.exec(`
      CREATE TABLE IF NOT EXISTS crawl_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        response_time_ms INTEGER
      );
    `),

    // Evidence/provenance table
    db.exec(`
      CREATE TABLE IF NOT EXISTS evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
        source_url TEXT NOT NULL,
        snippet TEXT,
        captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        mime_type TEXT
      );
    `),
  ]);
}

export function down(db) {
  return Promise.all([
    db.exec("DROP TABLE IF EXISTS evidence;"),
    db.exec("DROP TABLE IF EXISTS crawl_log;"),
    db.exec("DROP TABLE IF EXISTS prospects;"),
    db.exec("DROP TABLE IF EXISTS companies;"),
  ]);
}