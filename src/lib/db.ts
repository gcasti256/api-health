import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "api-health.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initTables(_db);
  }
  return _db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS endpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      check_interval INTEGER NOT NULL DEFAULT 60,
      expected_status INTEGER NOT NULL DEFAULT 200,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint_id INTEGER NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER,
      is_up INTEGER NOT NULL DEFAULT 1,
      error TEXT,
      checked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_checks_endpoint_id ON checks(endpoint_id);
    CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at);
    CREATE INDEX IF NOT EXISTS idx_checks_endpoint_checked ON checks(endpoint_id, checked_at);
  `);

  // Seed data if endpoints table is empty
  const count = db.prepare("SELECT COUNT(*) as count FROM endpoints").get() as { count: number };
  if (count.count === 0) {
    const insertEndpoint = db.prepare(
      "INSERT INTO endpoints (name, url, check_interval, expected_status) VALUES (?, ?, ?, ?)"
    );
    insertEndpoint.run("GitHub API", "https://api.github.com", 60, 200);
    insertEndpoint.run("JSONPlaceholder", "https://jsonplaceholder.typicode.com/posts", 60, 200);
    insertEndpoint.run("HTTPBin", "https://httpbin.org/get", 60, 200);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Endpoint {
  id: number;
  name: string;
  url: string;
  check_interval: number;
  expected_status: number;
  created_at: string;
  updated_at: string;
}

export interface Check {
  id: number;
  endpoint_id: number;
  status_code: number | null;
  response_time_ms: number | null;
  is_up: number;
  error: string | null;
  checked_at: string;
}

export interface EndpointWithLatestCheck extends Endpoint {
  latest_status_code: number | null;
  latest_response_time_ms: number | null;
  latest_is_up: number | null;
  latest_checked_at: string | null;
}

// ─── Endpoints CRUD ──────────────────────────────────────────────────────────

export function getAllEndpoints(): EndpointWithLatestCheck[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT e.*,
              c.status_code as latest_status_code,
              c.response_time_ms as latest_response_time_ms,
              c.is_up as latest_is_up,
              c.checked_at as latest_checked_at
       FROM endpoints e
       LEFT JOIN (
         SELECT endpoint_id, status_code, response_time_ms, is_up, checked_at,
                ROW_NUMBER() OVER (PARTITION BY endpoint_id ORDER BY checked_at DESC) as rn
         FROM checks
       ) c ON c.endpoint_id = e.id AND c.rn = 1
       ORDER BY e.created_at DESC`
    )
    .all() as EndpointWithLatestCheck[];
}

export function getEndpointById(id: number): Endpoint | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM endpoints WHERE id = ?").get(id) as Endpoint | undefined;
}

export function createEndpoint(
  name: string,
  url: string,
  checkInterval: number,
  expectedStatus: number
): Endpoint {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO endpoints (name, url, check_interval, expected_status) VALUES (?, ?, ?, ?)"
    )
    .run(name, url, checkInterval, expectedStatus);
  return db.prepare("SELECT * FROM endpoints WHERE id = ?").get(result.lastInsertRowid) as Endpoint;
}

export function deleteEndpoint(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM endpoints WHERE id = ?").run(id);
  return result.changes > 0;
}

// ─── Checks CRUD ─────────────────────────────────────────────────────────────

export function recordCheck(
  endpointId: number,
  statusCode: number | null,
  responseTimeMs: number | null,
  isUp: boolean,
  error: string | null
): Check {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO checks (endpoint_id, status_code, response_time_ms, is_up, error) VALUES (?, ?, ?, ?, ?)"
    )
    .run(endpointId, statusCode, responseTimeMs, isUp ? 1 : 0, error);
  return db.prepare("SELECT * FROM checks WHERE id = ?").get(result.lastInsertRowid) as Check;
}

export function getChecksForEndpoint(
  endpointId: number,
  limit: number = 100
): Check[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM checks WHERE endpoint_id = ? ORDER BY checked_at DESC LIMIT ?"
    )
    .all(endpointId, limit) as Check[];
}

export function getChecksLast24h(endpointId: number): Check[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM checks WHERE endpoint_id = ? AND checked_at >= datetime('now', '-24 hours') ORDER BY checked_at ASC"
    )
    .all(endpointId) as Check[];
}

export function getUptimePercentage(endpointId: number, hours: number = 24): number {
  const db = getDb();
  const result = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_up = 1 THEN 1 ELSE 0 END) as up_count
       FROM checks
       WHERE endpoint_id = ? AND checked_at >= datetime('now', '-' || ? || ' hours')`
    )
    .get(endpointId, hours) as { total: number; up_count: number };

  if (result.total === 0) return 100;
  return Math.round((result.up_count / result.total) * 10000) / 100;
}

export function getEndpointsDueForCheck(): Endpoint[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT e.* FROM endpoints e
       LEFT JOIN (
         SELECT endpoint_id, MAX(checked_at) as last_check
         FROM checks
         GROUP BY endpoint_id
       ) c ON c.endpoint_id = e.id
       WHERE c.last_check IS NULL
          OR (julianday('now') - julianday(c.last_check)) * 86400 >= e.check_interval`
    )
    .all() as Endpoint[];
}

export function getIncidents(endpointId: number, limit: number = 20): Check[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM checks WHERE endpoint_id = ? AND is_up = 0 ORDER BY checked_at DESC LIMIT ?"
    )
    .all(endpointId, limit) as Check[];
}
