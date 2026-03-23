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
      threshold_degraded INTEGER NOT NULL DEFAULT 200,
      threshold_down INTEGER NOT NULL DEFAULT 1000,
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

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'webhook',
      destination TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_triggered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alert_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      endpoint_id INTEGER NOT NULL,
      event TEXT NOT NULL,
      message TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
      FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_checks_endpoint_id ON checks(endpoint_id);
    CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at);
    CREATE INDEX IF NOT EXISTS idx_checks_endpoint_checked ON checks(endpoint_id, checked_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_endpoint_id ON alerts(endpoint_id);
    CREATE INDEX IF NOT EXISTS idx_alert_log_endpoint_id ON alert_log(endpoint_id);
  `);

  // Add columns if they don't exist (migration for existing DBs)
  try {
    db.prepare("SELECT threshold_degraded FROM endpoints LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE endpoints ADD COLUMN threshold_degraded INTEGER NOT NULL DEFAULT 200");
    db.exec("ALTER TABLE endpoints ADD COLUMN threshold_down INTEGER NOT NULL DEFAULT 1000");
  }

  // Seed data if endpoints table is empty
  const count = db.prepare("SELECT COUNT(*) as count FROM endpoints").get() as { count: number };
  if (count.count === 0) {
    const insertEndpoint = db.prepare(
      "INSERT INTO endpoints (name, url, check_interval, expected_status, threshold_degraded, threshold_down) VALUES (?, ?, ?, ?, ?, ?)"
    );
    insertEndpoint.run("GitHub API", "https://api.github.com", 60, 200, 200, 1000);
    insertEndpoint.run("JSONPlaceholder", "https://jsonplaceholder.typicode.com/posts", 60, 200, 200, 1000);
    insertEndpoint.run("HTTPBin", "https://httpbin.org/get", 60, 200, 300, 1500);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Endpoint {
  id: number;
  name: string;
  url: string;
  check_interval: number;
  expected_status: number;
  threshold_degraded: number;
  threshold_down: number;
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

export interface Alert {
  id: number;
  endpoint_id: number;
  type: string;
  destination: string;
  enabled: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface AlertLogEntry {
  id: number;
  alert_id: number;
  endpoint_id: number;
  event: string;
  message: string | null;
  success: number;
  triggered_at: string;
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
  expectedStatus: number,
  thresholdDegraded: number = 200,
  thresholdDown: number = 1000
): Endpoint {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO endpoints (name, url, check_interval, expected_status, threshold_degraded, threshold_down) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, url, checkInterval, expectedStatus, thresholdDegraded, thresholdDown);
  return db.prepare("SELECT * FROM endpoints WHERE id = ?").get(result.lastInsertRowid) as Endpoint;
}

export function updateEndpoint(
  id: number,
  updates: Partial<Pick<Endpoint, "name" | "url" | "check_interval" | "expected_status" | "threshold_degraded" | "threshold_down">>
): Endpoint | undefined {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (updates.name !== undefined) { sets.push("name = ?"); vals.push(updates.name); }
  if (updates.url !== undefined) { sets.push("url = ?"); vals.push(updates.url); }
  if (updates.check_interval !== undefined) { sets.push("check_interval = ?"); vals.push(updates.check_interval); }
  if (updates.expected_status !== undefined) { sets.push("expected_status = ?"); vals.push(updates.expected_status); }
  if (updates.threshold_degraded !== undefined) { sets.push("threshold_degraded = ?"); vals.push(updates.threshold_degraded); }
  if (updates.threshold_down !== undefined) { sets.push("threshold_down = ?"); vals.push(updates.threshold_down); }

  if (sets.length === 0) return getEndpointById(id);

  sets.push("updated_at = datetime('now')");
  vals.push(id);

  db.prepare(`UPDATE endpoints SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return db.prepare("SELECT * FROM endpoints WHERE id = ?").get(id) as Endpoint | undefined;
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

export function getChecksInRange(endpointId: number, hours: number): Check[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM checks WHERE endpoint_id = ? AND checked_at >= datetime('now', '-' || ? || ' hours') ORDER BY checked_at ASC"
    )
    .all(endpointId, hours) as Check[];
}

export function getChecksLast24h(endpointId: number): Check[] {
  return getChecksInRange(endpointId, 24);
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

// ─── Alerts CRUD ─────────────────────────────────────────────────────────────

export function getAlertsForEndpoint(endpointId: number): Alert[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM alerts WHERE endpoint_id = ? ORDER BY created_at DESC")
    .all(endpointId) as Alert[];
}

export function createAlert(endpointId: number, type: string, destination: string): Alert {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO alerts (endpoint_id, type, destination) VALUES (?, ?, ?)")
    .run(endpointId, type, destination);
  return db.prepare("SELECT * FROM alerts WHERE id = ?").get(result.lastInsertRowid) as Alert;
}

export function deleteAlert(id: number): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM alerts WHERE id = ?").run(id).changes > 0;
}

export function toggleAlert(id: number, enabled: boolean): void {
  const db = getDb();
  db.prepare("UPDATE alerts SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
}

export function getActiveAlertsForEndpoint(endpointId: number): Alert[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM alerts WHERE endpoint_id = ? AND enabled = 1")
    .all(endpointId) as Alert[];
}

export function recordAlertLog(
  alertId: number,
  endpointId: number,
  event: string,
  message: string | null,
  success: boolean
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO alert_log (alert_id, endpoint_id, event, message, success) VALUES (?, ?, ?, ?, ?)"
  ).run(alertId, endpointId, event, message, success ? 1 : 0);
  db.prepare("UPDATE alerts SET last_triggered_at = datetime('now') WHERE id = ?").run(alertId);
}

export function getAlertLog(endpointId: number, limit: number = 20): AlertLogEntry[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM alert_log WHERE endpoint_id = ? ORDER BY triggered_at DESC LIMIT ?")
    .all(endpointId, limit) as AlertLogEntry[];
}

// ─── Public Status Page ──────────────────────────────────────────────────────

export function getPublicStatus(): Array<{
  name: string;
  url: string;
  is_up: number | null;
  response_time_ms: number | null;
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
  last_checked: string | null;
}> {
  const db = getDb();
  const endpoints = db.prepare(`
    SELECT e.id, e.name, e.url,
           c.is_up, c.response_time_ms, c.checked_at as last_checked
    FROM endpoints e
    LEFT JOIN (
      SELECT endpoint_id, is_up, response_time_ms, checked_at,
             ROW_NUMBER() OVER (PARTITION BY endpoint_id ORDER BY checked_at DESC) as rn
      FROM checks
    ) c ON c.endpoint_id = e.id AND c.rn = 1
    ORDER BY e.name ASC
  `).all() as Array<{ id: number; name: string; url: string; is_up: number | null; response_time_ms: number | null; last_checked: string | null }>;

  return endpoints.map((ep) => ({
    name: ep.name,
    url: ep.url,
    is_up: ep.is_up,
    response_time_ms: ep.response_time_ms,
    uptime_24h: getUptimePercentage(ep.id, 24),
    uptime_7d: getUptimePercentage(ep.id, 168),
    uptime_30d: getUptimePercentage(ep.id, 720),
    last_checked: ep.last_checked,
  }));
}
