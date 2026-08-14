import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'ai-tech-radar' },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
});

/** Redact helper: never log raw tokens/keys. */
export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (/token|key|secret|password|auth/i.test(k)) out[k] = '[redacted]';
  }
  return out;
}
