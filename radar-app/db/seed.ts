/**
 * Seed: default profile, 6 topics, entities, 25 sources.
 * Usage: tsx db/seed.ts  (run after db:migrate)
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, rawDb, closeDb } from './client';
import { topic, entity, source, profile, profileWeights } from './schema';
import { log } from '@/lib/logger';
import { canonicalUrl } from '@/lib/url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configDir = join(__dirname, '..', 'config');

interface TopicSeed { id: string; name: string; keywords: string[] }
interface SourceSeed { id: string; type: string; url: string; entity: string; topic: string }

function main() {
  const topics = JSON.parse(readFileSync(join(configDir, 'topics.json'), 'utf8')) as TopicSeed[];
  const sources = JSON.parse(readFileSync(join(configDir, 'sources.json'), 'utf8')) as SourceSeed[];

  // ensure profile + default weights exist
  rawDb().exec(`INSERT OR IGNORE INTO profile (id, timezone, daily_budget, settings_json)
    VALUES ('local', 'Asia/Shanghai', 10, '{"thresholds":{"must":80,"worth":65}}')`);
  rawDb().exec(`INSERT OR IGNORE INTO profile_weights (profile_id, relevance, impact, novelty, credibility, urgency, updated_at)
    VALUES ('local', 1.0, 1.0, 1.0, 1.0, 1.0, '1970-01-01T00:00:00.000Z')`);

  // topics
  for (const t of topics) {
    db().insert(topic).values({
      id: t.id, name: t.name, keywords: t.keywords,
    }).onConflictDoNothing().run();
  }

  // entities + sources
  for (const s of sources) {
    const entityId = `ent_${s.entity}`;
    const entUrl = canonicalUrl(s.url);
    db().insert(entity).values({
      id: entityId,
      type: s.type === 'github_release' || s.type === 'github_repo' ? 'repo' : 'company',
      name: s.entity,
      aliases: '[]',
      canonicalUrl: entUrl,
      topicId: s.topic,
    }).onConflictDoNothing().run();

    db().insert(source).values({
      id: s.id,
      type: s.type,
      url: s.url,
      config: { noise_factor: 1.0, cursor: null, etag: null, last_modified: null },
      status: 'active',
      entityId,
      topicId: s.topic,
      lastError: null,
      lastFetchedAt: null,
    }).onConflictDoNothing().run();
  }

  const counts = {
    topics: db().select().from(topic).all().length,
    entities: db().select().from(entity).all().length,
    sources: db().select().from(source).all().length,
  };
  log.info(counts, 'seed complete');
  closeDb();
}

main();
