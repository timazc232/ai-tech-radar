#!/usr/bin/env tsx
/**
 * Worker CLI entry (§8.1, T-31).
 * Usage:
 *   tsx workers/cli.ts daily              # run today's window
 *   tsx workers/cli.ts daily_backfill     # detect + backfill missing windows
 *   tsx workers/cli.ts score --event <id> # re-score single event
 *   tsx workers/cli.ts analyze --event <id> # LLM re-analyze single event
 *   tsx workers/cli.ts backup             # sqlite online backup
 *   tsx workers/cli.ts migrate            # apply migrations + FTS
 *   tsx workers/cli.ts seed               # seed topics/entities/sources
 */
import { runDaily } from './pipeline';
import { runBackfill } from './catchup';
import { runBackup } from './backup';
import { runDecay } from '@/modules/memory/service';
import { translateEvents } from '@/modules/llm/translate';
import { organizeEvents } from '@/modules/briefing/service';
import { getBriefForDate } from '@/modules/pipeline/brief';
import { closeDb } from '@/db/client';
import { log } from '@/lib/logger';

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  try {
    switch (cmd) {
      case 'daily': {
        const lookbackDays = flags.lookback ? Number(flags.lookback) : undefined;
        const { metrics } = await runDaily({ date: flags.date, backfill: false, lookbackDays });
        log.info({ metrics }, 'cli daily done');
        break;
      }
      case 'daily_backfill': {
        const result = await runBackfill();
        log.info({ result }, 'cli backfill done');
        break;
      }
      case 'score': {
        if (!flags.event) throw new Error('--event <id> required');
        log.info({ event: flags.event }, 'cli score (single) - not yet wired');
        break;
      }
      case 'analyze': {
        if (!flags.event) throw new Error('--event <id> required');
        log.info({ event: flags.event }, 'cli analyze (single) - not yet wired');
        break;
      }
      case 'backup': {
        const { dest } = await runBackup();
        log.info({ dest }, 'cli backup done');
        break;
      }
      case 'decay': {
        const result = runDecay();
        log.info({ result }, 'cli decay done');
        break;
      }
      case 'brief':
      case 'organize': {
        let ids = flags.event ? [flags.event] : [];
        if (ids.length === 0) {
          const { brief } = getBriefForDate(flags.date);
          ids = (brief?.selectedEventIds as string[] | undefined) ?? [];
        }
        if (ids.length === 0) throw new Error('--event <id> or --date <YYYY-MM-DD> required');
        const result = await organizeEvents(ids, { force: true });
        log.info({ result }, 'cli organize done');
        break;
      }
      case 'translate': {
        let ids = flags.event ? [flags.event] : [];
        if (ids.length === 0) {
          const { brief } = getBriefForDate(flags.date);
          ids = (brief?.selectedEventIds as string[] | undefined) ?? [];
        }
        if (ids.length === 0) throw new Error('--event <id> or --date <YYYY-MM-DD> required (or have today brief)');
        const result = await translateEvents(ids);
        log.info({ result }, 'cli translate done');
        break;
      }
      default:
        log.error({ cmd }, 'unknown command');
        log.error('usage: tsx workers/cli.ts <daily|daily_backfill|score|analyze|backup|decay|translate|organize>');
        process.exit(1);
    }
  } catch (err) {
    log.error({ err: (err as Error).message, stack: (err as Error).stack }, 'cli failed');
    process.exit(1);
  } finally {
    closeDb();
  }
}

function parseFlags(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      out[args[i].slice(2)] = args[i + 1] ?? '';
      i++;
    }
  }
  return out;
}

main();
