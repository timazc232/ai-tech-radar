import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ===== profile =====
export const profile = sqliteTable('profile', {
  id: text('id').primaryKey().default('local'),
  timezone: text('timezone').default('Asia/Shanghai'),
  dailyBudget: integer('daily_budget').default(10),
  settingsJson: text('settings_json').default('{"thresholds":{"must":80,"worth":65}}'),
});

// ===== entity =====
export const entity = sqliteTable('entity', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // repo | company | model | page | person
  name: text('name').notNull(),
  aliases: text('aliases', { mode: 'json' }).default('[]'),
  canonicalUrl: text('canonical_url').notNull(),
  topicId: text('topic_id'),
}, (t) => ({
  nameIdx: index('entity_name_idx').on(t.name),
}));

// ===== topic =====
export const topic = sqliteTable('topic', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  keywords: text('keywords', { mode: 'json' }).notNull(),
});

// ===== source =====
export const source = sqliteTable('source', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // github_release | github_repo | rss | web | api
  url: text('url').notNull(),
  config: text('config', { mode: 'json' }).notNull(),
  status: text('status').default('active'), // active | paused | error
  entityId: text('entity_id').references(() => entity.id),
  topicId: text('topic_id'),
  lastError: text('last_error'),
  lastFetchedAt: text('last_fetched_at'),
}, (t) => ({
  typeIdx: index('source_type_idx').on(t.type),
  statusIdx: index('source_status_idx').on(t.status),
}));

// ===== raw_item =====
export const rawItem = sqliteTable('raw_item', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => source.id),
  externalId: text('external_id').notNull(),
  contentHash: text('content_hash').notNull(),
  capturedAt: text('captured_at').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
}, (t) => ({
  uniq: uniqueIndex('raw_item_uniq').on(t.sourceId, t.externalId),
  hashIdx: index('raw_item_hash_idx').on(t.contentHash),
}));

// ===== event =====
export const event = sqliteTable('event', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entity.id),
  type: text('type').notNull(), // release | launch | pricing_change | spec_change | breaking_change | docs_change | research | security_advisory
  title: text('title').notNull(),
  factsJson: text('facts_json', { mode: 'json' }).notNull(),
  occurredAt: text('occurred_at').notNull(),
  capturedAt: text('captured_at').notNull(),
  status: text('status').default('candidate'), // candidate | confirmed | merged | superseded
  backfill: integer('backfill', { mode: 'boolean' }).default(false),
  version: integer('version').default(1),
}, (t) => ({
  occurredIdx: index('event_occurred_idx').on(t.occurredAt),
  entityIdx: index('event_entity_idx').on(t.entityId),
  statusIdx: index('event_status_idx').on(t.status),
}));

// ===== event_evidence =====
export const eventEvidence = sqliteTable('event_evidence', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => event.id),
  sourceId: text('source_id').notNull().references(() => source.id),
  url: text('url').notNull(),
  quote: text('quote').notNull(),
  confidence: real('confidence').notNull(),
  capturedAt: text('captured_at').notNull(),
}, (t) => ({
  eventIdx: index('evidence_event_idx').on(t.eventId),
}));

// ===== score_snapshot =====
export const scoreSnapshot = sqliteTable('score_snapshot', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => event.id),
  profileId: text('profile_id').default('local'),
  dimensions: text('dimensions', { mode: 'json' }).notNull(),
  total: real('total').notNull(),
  scorer: text('scorer').notNull(), // rules | llm
  version: integer('version').notNull(),
  weightDiff: text('weight_diff', { mode: 'json' }).default('{}'),
  model: text('model'),
  promptVersion: text('prompt_version'),
  generatedAt: text('generated_at').notNull(),
}, (t) => ({
  eventIdx: index('score_event_idx').on(t.eventId),
}));

// ===== intelligence_card =====
export const intelligenceCard = sqliteTable('intelligence_card', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => event.id),
  whatHappened: text('what_happened').notNull(),
  whyItMatters: text('why_it_matters').notNull(),
  whatIsDifferent: text('what_is_different').notNull(),
  technicalTake: text('technical_take').notNull(),
  recommendedAction: text('recommended_action').notNull(), // skip | 5min | 15min | clone_test | watch
  evidenceIds: text('evidence_ids', { mode: 'json' }).notNull(),
  confidence: real('confidence').notNull(),
  status: text('status').default('pending'), // pending | generated | failed
  generatedAt: text('generated_at'),
});

// ===== feedback =====
export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => event.id),
  action: text('action').notNull(), // useful | irrelevant | save | later
  reason: text('reason'),
  weightDelta: text('weight_delta', { mode: 'json' }).default('{}'),
  clientRequestId: text('client_request_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  uniq: uniqueIndex('feedback_client_uniq').on(t.clientRequestId),
  eventIdx: index('feedback_event_idx').on(t.eventId),
}));

// ===== memory =====
export const memory = sqliteTable('memory', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // interest | entity | research | feedback
  content: text('content', { mode: 'json' }).notNull(),
  evidence: text('evidence', { mode: 'json' }).notNull(),
  confidence: real('confidence').notNull(),
  expiresAt: text('expires_at'),
  status: text('status').default('active'), // active | paused | archived
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  typeIdx: index('memory_type_idx').on(t.type),
  statusIdx: index('memory_status_idx').on(t.status),
}));

// ===== profile_weights (feedback-adjusted dimension weights) =====
export const profileWeights = sqliteTable('profile_weights', {
  profileId: text('profile_id').primaryKey().default('local'),
  relevance: real('relevance').default(1.0),
  impact: real('impact').default(1.0),
  novelty: real('novelty').default(1.0),
  credibility: real('credibility').default(1.0),
  urgency: real('urgency').default(1.0),
  updatedAt: text('updated_at').notNull(),
});

// ===== daily_brief =====
export const dailyBrief = sqliteTable('daily_brief', {
  date: text('date').primaryKey(), // Beijing calendar date
  selectedEventIds: text('selected_event_ids', { mode: 'json' }).notNull(),
  metrics: text('metrics', { mode: 'json' }).notNull(),
  status: text('status').default('pending'), // pending | fresh | stale
  generatedAt: text('generated_at'),
});

// ===== job_run =====
export const jobRun = sqliteTable('job_run', {
  id: text('id').primaryKey(),
  jobType: text('job_type').notNull(), // daily | daily_backfill | score | analyze
  date: text('date'), // target Beijing date
  leaseUntil: text('lease_until').notNull(),
  status: text('status').notNull(), // running | success | failed | lease_expired
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  metrics: text('metrics', { mode: 'json' }),
  error: text('error'),
}, (t) => ({
  typeIdx: index('job_type_idx').on(t.jobType),
  dateIdx: index('job_date_idx').on(t.date),
}));

// ===== cost_ledger (LLM cost tracking) =====
export const costLedger = sqliteTable('cost_ledger', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // Beijing date for budget window
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costYuan: real('cost_yuan').notNull(),
  purpose: text('purpose').notNull(), // score | card | analyze
  createdAt: text('created_at').notNull(),
}, (t) => ({
  dateIdx: index('cost_date_idx').on(t.date),
}));

// ===== app_settings (web Settings page, incl. secrets) =====
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ===== event_brief (AI/heuristic structured briefing) =====
export const eventBrief = sqliteTable('event_brief', {
  eventId: text('event_id').primaryKey().references(() => event.id),
  headline: text('headline').notNull(),
  headlineEn: text('headline_en'),
  projectName: text('project_name').notNull(),
  projectKind: text('project_kind').notNull(),
  actorName: text('actor_name').notNull(),
  actorKind: text('actor_kind').notNull(),
  versionLabel: text('version_label'),
  changePoints: text('change_points', { mode: 'json' }).notNull().default('[]'),
  changeDetail: text('change_detail').notNull().default(''),
  model: text('model'),
  generatedAt: text('generated_at').notNull(),
});

// ===== event_i18n (zh overlay; originals stay on event / intelligence_card) =====
export const eventI18n = sqliteTable('event_i18n', {
  eventId: text('event_id').primaryKey().references(() => event.id),
  titleZh: text('title_zh'),
  whatZh: text('what_zh'),
  whyZh: text('why_zh'),
  differenceZh: text('difference_zh'),
  takeZh: text('take_zh'),
  quotesZh: text('quotes_zh', { mode: 'json' }).default('{}'),
  model: text('model'),
  generatedAt: text('generated_at').notNull(),
});

// FTS5 virtual table is created via raw SQL in db/fts.ts and migrations.
