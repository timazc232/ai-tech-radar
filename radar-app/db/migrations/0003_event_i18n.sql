-- 0003_event_i18n.sql -- bilingual fields; originals stay on event / intelligence_card
CREATE TABLE IF NOT EXISTS event_i18n (
  event_id TEXT PRIMARY KEY REFERENCES event(id),
  title_zh TEXT,
  what_zh TEXT,
  why_zh TEXT,
  difference_zh TEXT,
  take_zh TEXT,
  quotes_zh TEXT DEFAULT '{}',
  model TEXT,
  generated_at TEXT NOT NULL
);
