import { z } from 'zod';
import {
  EventTypeEnum, FeedbackActionEnum, MemoryTypeEnum, ScorerTypeEnum,
  SourceTypeEnum, EventStatusEnum, RecommendedActionEnum,
} from './enums';

// ===== Source / RawItem =====
export const SourceConfig = z.object({
  noise_factor: z.number().min(0.5).max(1.0).default(1.0),
  cursor: z.string().nullable().default(null),
  etag: z.string().nullable().default(null),
  last_modified: z.string().nullable().default(null),
  source_tier: z.enum(['official', 'community', 'social']).optional(),
  query: z.string().optional(),
  max_items: z.number().int().positive().max(100).optional(),
  min_score: z.number().min(0).optional(),
});
export type SourceConfig = z.infer<typeof SourceConfig>;

export const Source = z.object({
  id: z.string(),
  type: z.enum(['github_release', 'github_repo', 'rss', 'web', 'api']),
  url: z.string(),
  config: SourceConfig,
  status: z.enum(['active', 'paused', 'error']).default('active'),
  entityId: z.string().nullable(),
  topicId: z.string().nullable(),
});
export type Source = z.infer<typeof Source>;

export const RawItem = z.object({
  id: z.string(),
  sourceId: z.string(),
  externalId: z.string(),
  contentHash: z.string(),
  capturedAt: z.string(),
  payload: z.record(z.unknown()),
});
export type RawItem = z.infer<typeof RawItem>;

// ===== Event =====
export const Fact = z.object({
  key: z.string(),
  value: z.string(),
  before: z.string().optional(),
  after: z.string().optional(),
});
export type Fact = z.infer<typeof Fact>;

export const Event = z.object({
  id: z.string(),
  entityId: z.string(),
  type: z.enum([
    'release', 'launch', 'pricing_change', 'spec_change',
    'breaking_change', 'docs_change', 'research', 'security_advisory',
  ]),
  title: z.string(),
  factsJson: z.array(Fact),
  occurredAt: z.string(),
  capturedAt: z.string(),
  status: z.enum(['candidate', 'confirmed', 'merged', 'superseded']).default('candidate'),
  backfill: z.boolean().default(false),
  version: z.number().default(1),
});
export type Event = z.infer<typeof Event>;

export const EventCandidate = z.object({
  title: z.string(),
  entityName: z.string(),
  canonicalUrl: z.string(),
  facts: z.array(Fact),
  occurredAt: z.string(),
  rawItemId: z.string(),
  sourceId: z.string(),
  entityId: z.string(),
});
export type EventCandidate = z.infer<typeof EventCandidate>;

// ===== Score =====
export const ScoreDimensions = z.object({
  relevance: z.number().int().min(0).max(100),
  impact: z.number().int().min(0).max(100),
  novelty: z.number().int().min(0).max(100),
  credibility: z.number().int().min(0).max(100),
  urgency: z.number().int().min(0).max(100),
});
export type ScoreDimensions = z.infer<typeof ScoreDimensions>;

export const ScoreSnapshot = z.object({
  id: z.string(),
  eventId: z.string(),
  profileId: z.string().default('local'),
  dimensions: ScoreDimensions,
  total: z.number().min(0).max(100),
  scorer: z.enum(['rules', 'llm']),
  version: z.number().int(),
  weightDiff: z.record(z.unknown()).default({}),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
  generatedAt: z.string(),
});
export type ScoreSnapshot = z.infer<typeof ScoreSnapshot>;

// ===== Card =====
export const IntelligenceCard = z.object({
  id: z.string(),
  eventId: z.string(),
  whatHappened: z.string(),
  whyItMatters: z.string(),
  whatIsDifferent: z.string(),
  technicalTake: z.string(),
  recommendedAction: z.enum(['skip', '5min', '15min', 'clone_test', 'watch']),
  evidenceIds: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
  status: z.enum(['pending', 'generated', 'failed']).default('pending'),
});
export type IntelligenceCard = z.infer<typeof IntelligenceCard>;

// ===== Feedback =====
export const Feedback = z.object({
  id: z.string(),
  eventId: z.string(),
  action: z.enum(['useful', 'irrelevant', 'save', 'later']),
  reason: z.string().optional(),
  weightDelta: z.record(z.number()).default({}),
  clientRequestId: z.string(),
  createdAt: z.string(),
});
export type Feedback = z.infer<typeof Feedback>;

// ===== Memory =====
export const Memory = z.object({
  id: z.string(),
  type: z.enum(['interest', 'entity', 'research', 'feedback']),
  content: z.record(z.unknown()),
  evidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  expiresAt: z.string().nullable(),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Memory = z.infer<typeof Memory>;

// ===== Daily Brief =====
export const DailyBriefMetrics = z.object({
  scanned: z.number().int(),
  candidates: z.number().int(),
  recommended: z.number().int(),
  filtered: z.number().int(),
  sourceAnomalies: z.number().int(),
});
export type DailyBriefMetrics = z.infer<typeof DailyBriefMetrics>;

export const DailyBrief = z.object({
  date: z.string(),
  selectedEventIds: z.array(z.string()),
  metrics: DailyBriefMetrics,
  status: z.enum(['pending', 'fresh', 'stale']).default('pending'),
});
export type DailyBrief = z.infer<typeof DailyBrief>;

// ===== API envelope =====
export const ApiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ data, meta: z.record(z.unknown()).optional() });
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string(),
  }),
});

// API request bodies
export const FeedbackBody = z.object({
  action: z.enum(['useful', 'irrelevant', 'save', 'later']),
  reason: z.string().max(200).optional(),
  clientRequestId: z.string().min(8),
});

export const WatchlistBody = z.object({
  entityName: z.string().min(1),
  type: z.enum(['repo', 'company', 'model', 'page', 'person']),
  topicId: z.string().optional(),
});
