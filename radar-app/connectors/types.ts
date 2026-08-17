import type { Source, RawItem } from '@/modules/domain/schema';

export interface CollectorResult {
  items: RawItem[];
  newCursor: string | null;
  newEtag: string | null;
  warning?: string;
  rateLimit?: { remaining: number; resetAt: string };
}

export interface Collector {
  fetch(source: Source, window: { start: string; end: string }): Promise<CollectorResult>;
}

export class ConnectorError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'AUTH_FAILED' | 'PARSE_ERROR' | 'NETWORK' | 'SSRF_BLOCKED',
    public retryable: boolean,
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}
