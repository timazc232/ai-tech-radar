-- 0001_init.sql -- AI Tech Radar initial schema (matches db/schema.ts)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY DEFAULT 'local',
  timezone TEXT DEFAULT 'Asia/Shanghai',
  daily_budget INTEGER DEFAULT 10,
  settings_json TEXT DEFAULT '{"thresholds":{"must":80,"worth":65}}'
);

CREATE TABLE IF NOT EXISTS entity (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT DEFAULT '[]',
  canonical_url TEXT NOT NULL,
  topic_id TEXT
);
CREATE INDEX IF NOT EXISTS entity_name_idx ON entity(name);

CREATE TABLE IF NOT EXISTS topic (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  keywords TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  config TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  entity_id TEXT REFERENCES entity(id),
  topic_id TEXT,
  last_error TEXT,
  last_fetched_at TEXT
);
CREATE INDEX IF NOT EXISTS source_type_idx ON source(type);
CREATE INDEX IF NOT EXISTS source_status_idx ON source(status);

CREATE TABLE IF NOT EXISTS raw_item (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source(id),
  external_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS raw_item_uniq ON raw_item(source_id, external_id);
CREATE INDEX IF NOT EXISTS raw_item_hash_idx ON raw_item(content_hash);

CREATE TABLE IF NOT EXISTS event (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entity(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  facts_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  status TEXT DEFAULT 'candidate',
  backfill INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS event_occurred_idx ON event(occurred_at);
CREATE INDEX IF NOT EXISTS event_entity_idx ON event(entity_id);
CREATE INDEX IF NOT EXISTS event_status_idx ON event(status);

CREATE TABLE IF NOT EXISTS event_evidence (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES event(id),
  source_id TEXT NOT NULL REFERENCES source(id),
  url TEXT NOT NULL,
  quote TEXT NOT NULL,
  confidence REAL NOT NULL,
  captured_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS evidence_event_idx ON event_evidence(event_id);

CREATE TABLE IF NOT EXISTS score_snapshot (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES event(id),
  profile_id TEXT DEFAULT 'local',
  dimensions TEXT NOT NULL,
  total REAL NOT NULL,
  scorer TEXT NOT NULL,
  version INTEGER NOT NULL,
  weight_diff TEXT DEFAULT '{}',
  model TEXT,
  prompt_version TEXT,
  generated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS score_event_idx ON score_snapshot(event_id);

CREATE TABLE IF NOT EXISTS intelligence_card (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES event(id),
  what_happened TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  what_is_different TEXT NOT NULL,
  technical_take TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  evidence_ids TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  generated_at TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES event(id),
  action TEXT NOT NULL,
  reason TEXT,
  weight_delta TEXT DEFAULT '{}',
  client_request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS feedback_client_uniq ON feedback(client_request_id);
CREATE INDEX IF NOT EXISTS feedback_event_idx ON feedback(event_id);

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  evidence TEXT NOT NULL,
  confidence REAL NOT NULL,
  expires_at TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS memory_type_idx ON memory(type);
CREATE INDEX IF NOT EXISTS memory_status_idx ON memory(status);

CREATE TABLE IF NOT EXISTS profile_weights (
  profile_id TEXT PRIMARY KEY DEFAULT 'local',
  relevance REAL DEFAULT 1.0,
  impact REAL DEFAULT 1.0,
  novelty REAL DEFAULT 1.0,
  credibility REAL DEFAULT 1.0,
  urgency REAL DEFAULT 1.0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_brief (
  date TEXT PRIMARY KEY,
  selected_event_ids TEXT NOT NULL,
  metrics TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  generated_at TEXT
);

CREATE TABLE IF NOT EXISTS job_run (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  date TEXT,
  lease_until TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  metrics TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS job_type_idx ON job_run(job_type);
CREATE INDEX IF NOT EXISTS job_date_idx ON job_run(date);

CREATE TABLE IF NOT EXISTS cost_ledger (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_yuan REAL NOT NULL,
  purpose TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cost_date_idx ON cost_ledger(date);

-- Default profile + weights
INSERT OR IGNORE INTO profile (id, timezone, daily_budget, settings_json)
VALUES ('local', 'Asia/Shanghai', 10, '{"thresholds":{"must":80,"worth":65}}');

INSERT OR IGNORE INTO profile_weights (profile_id, relevance, impact, novelty, credibility, urgency, updated_at)
VALUES ('local', 1.0, 1.0, 1.0, 1.0, 1.0, '1970-01-01T00:00:00.000Z');
