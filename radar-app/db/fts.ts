import { rawDb } from './client';
import { log } from '@/lib/logger';

/**
 * FTS5 external-content table for event title + entity name (§7.6 Novelty recall).
 * Created via raw SQL since Drizzle doesn't model virtual tables.
 * Triggers keep event_fts in sync with event + entity.
 */
const FTS_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS event_fts USING fts5(
  title,
  entity_name,
  content='event',
  content_rowid='rowid',
  tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS event_ai AFTER INSERT ON event BEGIN
  INSERT INTO event_fts(rowid, title, entity_name)
  VALUES (new.rowid, new.title, (SELECT name FROM entity WHERE id = new.entity_id));
END;

CREATE TRIGGER IF NOT EXISTS event_ad AFTER DELETE ON event BEGIN
  INSERT INTO event_fts(event_fts, rowid, title, entity_name)
  VALUES ('delete', old.rowid, old.title, (SELECT name FROM entity WHERE id = old.entity_id));
END;

CREATE TRIGGER IF NOT EXISTS event_au AFTER UPDATE ON event BEGIN
  INSERT INTO event_fts(event_fts, rowid, title, entity_name)
  VALUES ('delete', old.rowid, old.title, (SELECT name FROM entity WHERE id = old.entity_id));
  INSERT INTO event_fts(rowid, title, entity_name)
  VALUES (new.rowid, new.title, (SELECT name FROM entity WHERE id = new.entity_id));
END;
`;

/** Create FTS5 table and triggers if not present. Idempotent. */
export function ensureFts(): void {
  const db = rawDb();
  db.exec(FTS_SQL);
  log.info('fts5 event_fts ensured');
}

/** bm25 recall for novelty (§7.6). Returns top-N similar events. */
export function ftsRecall(query: string, limit = 5): Array<{ id: string; title: string; rank: number }> {
  const db = rawDb();
  // FTS5 MATCH syntax breaks on raw punctuation (. - ( ) etc.).
  // Tokenize to alphanumeric runs, wrap each in double quotes, join with OR for recall.
  const tokens = query.match(/[\p{L}\p{N}]+/gu) ?? [];
  const ftsQuery = tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(' OR ');
  if (!ftsQuery) return [];
  const rows = db
    .prepare(
      `SELECT e.id AS id, e.title AS title, bm25(event_fts) AS rank
       FROM event_fts f JOIN event e ON e.rowid = f.rowid
       WHERE event_fts MATCH ?
       ORDER BY rank LIMIT ?`,
    )
    .all(ftsQuery, limit) as Array<{ id: string; title: string; rank: number }>;
  return rows;
}
