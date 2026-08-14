import type { Collector } from './types';
import type { Source } from '@/modules/domain/schema';
import { GitHubCollector } from './github';
import { RSSCollector } from './rss';
import { WebCollector } from './web';
import { effectiveGitHubToken } from '@/lib/settings';

const rss = new RSSCollector();
const web = new WebCollector();

/** Map source.type -> collector instance. GitHub token resolves lazily (Settings > env). */
export function getCollector(source: Source): Collector {
  switch (source.type) {
    case 'github_release':
    case 'github_repo':
      return new GitHubCollector(effectiveGitHubToken());
    case 'rss':
      return rss;
    case 'web':
      return web;
    default:
      throw new Error(`no collector for type: ${source.type}`);
  }
}
