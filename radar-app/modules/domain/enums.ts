// Domain enums and constants (§5, §7, §8).

export const EventTypeEnum = {
  RELEASE: 'release',
  LAUNCH: 'launch',
  PRICING_CHANGE: 'pricing_change',
  SPEC_CHANGE: 'spec_change',
  BREAKING_CHANGE: 'breaking_change',
  DOCS_CHANGE: 'docs_change',
  RESEARCH: 'research',
  SECURITY_ADVISORY: 'security_advisory',
} as const;
export type EventType = (typeof EventTypeEnum)[keyof typeof EventTypeEnum];

export const FeedbackActionEnum = {
  USEFUL: 'useful',
  IRRELEVANT: 'irrelevant',
  SAVE: 'save',
  LATER: 'later',
} as const;
export type FeedbackAction = (typeof FeedbackActionEnum)[keyof typeof FeedbackActionEnum];

export const MemoryTypeEnum = {
  INTEREST: 'interest',
  ENTITY: 'entity',
  RESEARCH: 'research',
  FEEDBACK: 'feedback',
} as const;
export type MemoryType = (typeof MemoryTypeEnum)[keyof typeof MemoryTypeEnum];

export const ScorerTypeEnum = {
  RULES: 'rules',
  LLM: 'llm',
} as const;
export type ScorerType = (typeof ScorerTypeEnum)[keyof typeof ScorerTypeEnum];

export const SourceTypeEnum = {
  GITHUB_RELEASE: 'github_release',
  GITHUB_REPO: 'github_repo',
  RSS: 'rss',
  WEB: 'web',
  API: 'api',
} as const;
export type SourceType = (typeof SourceTypeEnum)[keyof typeof SourceTypeEnum];

export const EventStatusEnum = {
  CANDIDATE: 'candidate',
  CONFIRMED: 'confirmed',
  MERGED: 'merged',
  SUPERSEDED: 'superseded',
} as const;
export type EventStatus = (typeof EventStatusEnum)[keyof typeof EventStatusEnum];

export const JobTypeEnum = {
  DAILY: 'daily',
  DAILY_BACKFILL: 'daily_backfill',
  SCORE: 'score',
  ANALYZE: 'analyze',
} as const;
export type JobType = (typeof JobTypeEnum)[keyof typeof JobTypeEnum];

export const RecommendedActionEnum = {
  SKIP: 'skip',
  FIVE_MIN: '5min',
  FIFTEEN_MIN: '15min',
  CLONE_TEST: 'clone_test',
  WATCH: 'watch',
} as const;
export type RecommendedAction = (typeof RecommendedActionEnum)[keyof typeof RecommendedActionEnum];

// §7 scoring weights
export const SCORE_WEIGHTS = {
  relevance: 0.35,
  impact: 0.25,
  novelty: 0.15,
  credibility: 0.15,
  urgency: 0.10,
} as const;

// §7.7 / §7.8 thresholds
export const DEFAULT_THRESHOLDS = { must: 80, worth: 65 };

// §7.6 novelty
export const NOVELTY_DUPLICATE_THRESHOLD = 0.85;

// §8.1 feedback
export const FEEDBACK_STEPS = {
  useful: 0.03,
  irrelevant: -0.05,
  save: 0.01,
  later: 0,
} as const;
export const WEIGHT_BOUNDS = { min: 0.2, max: 1.0 };
export const SOURCE_NOISE_THRESHOLD = 3;
export const SOURCE_NOISE_FACTOR = 0.8;

// §8.2 decay
export const INTEREST_DECAY_DAYS = 90;
export const INTEREST_REGRESSION_RATE = 0.001;
export const RESEARCH_FULL_DAYS = 30;
export const RESEARCH_DECAY_DAYS = 15;

// §3.4 catch-up
export const STALE_THRESHOLD_HOURS = 26;
export const MAX_BACKFILL_RETRY = 2;
