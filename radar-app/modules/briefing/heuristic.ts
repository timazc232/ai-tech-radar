import type { Fact } from '@/modules/domain/schema';
import { inferActorKind, type EventBriefing } from './types';

export interface HeuristicInput {
  title: string;
  eventType: string;
  entityName: string;
  facts: Fact[];
  sourceUrl?: string;
}

function fact(facts: Fact[], key: string): string {
  return facts.find((f) => f.key === key)?.value ?? '';
}

function parseGithub(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('github.com')) return null;
    const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

function bulletsFromNotes(notes: string, limit = 4): string[] {
  const lines = notes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = lines
    .filter((l) => /^[-*•]\s+/.test(l) || /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter((l) => l.length > 2 && l.length < 160);
  if (items.length > 0) return items.slice(0, limit);
  return lines.filter((l) => l.length > 8 && !l.startsWith('#')).slice(0, limit);
}

/** Rule-based briefing when LLM is unavailable. Never invents facts. */
export function heuristicBriefing(input: HeuristicInput): EventBriefing {
  const url = fact(input.facts, 'url') || fact(input.facts, 'link') || input.sourceUrl || '';
  const gh = parseGithub(url);
  const tag = fact(input.facts, 'tag');
  const notes = fact(input.facts, 'notes') || fact(input.facts, 'diff');
  const projectName = fact(input.facts, 'repo') || gh?.repo || input.entityName || 'unknown';
  const actorName = fact(input.facts, 'owner') || gh?.owner || input.entityName || 'unknown';
  const versionLabel = tag || null;
  const typeLabel: Record<string, string> = {
    release: '发布',
    breaking_change: '破坏性变更',
    pricing_change: '定价调整',
    research: '研究',
    security_advisory: '安全公告',
    announcement: '公告',
    docs_change: '文档更新',
  };
  const verb = typeLabel[input.eventType] ?? '更新';
  const headline = versionLabel
    ? `${projectName} ${versionLabel} ${verb}`
    : `${projectName} ${verb}`;
  const changePoints = bulletsFromNotes(notes);
  const changeDetail = notes
    ? notes.slice(0, 1200)
    : `${actorName} 对 ${projectName} 进行了${verb}${versionLabel ? `（${versionLabel}）` : ''}。`;

  return {
    headline,
    headlineEn: input.title,
    projectName,
    projectKind: gh ? 'repo' : 'other',
    actorName,
    actorKind: inferActorKind(actorName),
    versionLabel,
    changePoints,
    changeDetail,
    model: 'heuristic',
  };
}
