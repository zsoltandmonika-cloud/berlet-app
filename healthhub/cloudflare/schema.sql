-- HealthHub Central Vault - Cloudflare D1 / SQLite
-- Stores one central Zsolt + Monika JSON bundle.
-- Health data must never be committed to the public GitHub repository.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS healthhub_vault (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version TEXT NOT NULL DEFAULT '2.0',
  payload TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS healthhub_vault_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  schema_version TEXT NOT NULL,
  payload TEXT NOT NULL,
  version INTEGER NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_healthhub_vault_history_saved_at
  ON healthhub_vault_history(saved_at DESC);

CREATE TABLE IF NOT EXISTS healthhub_audit (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  actor TEXT,
  version INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_healthhub_audit_created_at
  ON healthhub_audit(created_at DESC);
