export const ACTOR_KINDS = ['company', 'person', 'org', 'community', 'unknown'] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

export const PROJECT_KINDS = ['repo', 'product', 'model', 'spec', 'service', 'other'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export interface EventBriefing {
  headline: string;
  headlineEn: string | null;
  projectName: string;
  projectKind: ProjectKind;
  actorName: string;
  actorKind: ActorKind;
  versionLabel: string | null;
  changePoints: string[];
  changeDetail: string;
  model: string | null;
}

export const ACTOR_KIND_LABEL: Record<ActorKind, string> = {
  company: '公司',
  person: '个人',
  org: '组织',
  community: '社区',
  unknown: '未知',
};

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  repo: '仓库',
  product: '产品',
  model: '模型',
  spec: '规范',
  service: '服务',
  other: '项目',
};

const COMPANY = new Set([
  'openai', 'anthropic', 'google', 'meta', 'microsoft', 'mistral', 'huggingface',
  'vercel', 'deepseek', 'amazon', 'apple', 'nvidia', 'cohere', 'xai', 'spacexai',
  'cursor',
]);
const COMMUNITY = new Set([
  'ggml-org', 'vllm-project', 'sgl-project', 'modelcontextprotocol', 'ollama',
  'continuedev', 'langchain-ai', 'run-llama',
]);

export function inferActorKind(name: string): ActorKind {
  const key = name.trim().toLowerCase().replace(/\s+/g, '');
  if (!key) return 'unknown';
  if (COMPANY.has(key)) return 'company';
  if (COMMUNITY.has(key)) return 'community';
  if (key.endsWith('-org') || key.endsWith('foundation') || key.includes('project')) return 'org';
  if (/^[a-z0-9-]{2,20}$/.test(key) && !key.includes('-')) return 'person';
  return 'org';
}

export function asActorKind(v: unknown): ActorKind {
  return ACTOR_KINDS.includes(v as ActorKind) ? (v as ActorKind) : 'unknown';
}

export function asProjectKind(v: unknown): ProjectKind {
  return PROJECT_KINDS.includes(v as ProjectKind) ? (v as ProjectKind) : 'other';
}
