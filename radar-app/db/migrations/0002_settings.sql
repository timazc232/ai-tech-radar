-- 0002_settings.sql -- app settings incl. secrets managed from the web Settings page
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
