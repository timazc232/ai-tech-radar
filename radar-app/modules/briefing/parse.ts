import { asActorKind, asProjectKind, type EventBriefing } from './types';

export function parseBriefingResult(parsed: unknown, fallback: EventBriefing): EventBriefing | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  const headline = str(p.headline) || fallback.headline;
  if (!headline) return null;
  const points = Array.isArray(p.changePoints)
    ? p.changePoints.map((x) => String(x).trim()).filter((x) => x.length > 0).slice(0, 8)
    : fallback.changePoints;
  return {
    headline: headline.slice(0, 80),
    headlineEn: str(p.headlineEn) || fallback.headlineEn,
    projectName: str(p.projectName) || fallback.projectName,
    projectKind: asProjectKind(p.projectKind ?? fallback.projectKind),
    actorName: str(p.actorName) || fallback.actorName,
    actorKind: asActorKind(p.actorKind ?? fallback.actorKind),
    versionLabel: str(p.versionLabel) || fallback.versionLabel,
    changePoints: points,
    changeDetail: str(p.changeDetail) || fallback.changeDetail,
    model: fallback.model,
  };
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
}

export function renderBriefingPrompt(input: {
  title: string;
  type: string;
  entityName: string;
  facts: unknown;
  evidence: Array<{ quote: string; url: string }>;
}): string {
  return `你是技术情报编辑。根据证据把事件整理成结构化摘要。禁止编造证据里没有的事实。

事件标题: ${input.title}
类型: ${input.type}
实体: ${input.entityName}
事实: ${JSON.stringify(input.facts)}
证据:
${input.evidence.map((e, i) => `[${i + 1}] ${e.quote} (${e.url})`).join('\n') || '(无)'}

只输出 JSON：
{
  "headline": "中文精炼标题，不超过28字，说清主体+项目+做了什么",
  "headlineEn": "optional short English headline",
  "projectName": "被改动的项目/产品/仓库名",
  "projectKind": "repo|product|model|spec|service|other",
  "actorName": "主体名称（公司/个人/组织/社区）",
  "actorKind": "company|person|org|community|unknown",
  "versionLabel": "版本号，没有则空字符串",
  "changePoints": ["中文更新要点，3到6条，每条不超过40字"],
  "changeDetail": "中文详细更新说明，200到500字，可换行分段，只写证据支持的内容"
}`;
}
