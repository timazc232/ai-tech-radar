-- 0004_event_brief.sql -- AI/heuristic structured briefing; originals stay on event
CREATE TABLE IF NOT EXISTS event_brief (
  event_id TEXT PRIMARY KEY REFERENCES event(id),
  headline TEXT NOT NULL,
  headline_en TEXT,
  project_name TEXT NOT NULL,
  project_kind TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  version_label TEXT,
  change_points TEXT NOT NULL DEFAULT '[]',
  change_detail TEXT NOT NULL DEFAULT '',
  model TEXT,
  generated_at TEXT NOT NULL
);
