# AI Tech Radar 工程实施方案 V1.0

基于《AI_Tech_Radar_V1.2 最终计划与设计方案》
文档日期：2026-08-07

---

## 1. 总览

### 1.1 目标

本方案把 V1.2 设计方案落地为可执行工程：一份 4 周等粒度任务分解（WBS）+ 一套可运行的项目脚手架。手册是"设计到代码的桥梁"，脚手架是按手册继续开发的起点（Week 1 第一切片已实现）。

### 1.2 与 V1.2 设计方案章节映射

| 实施手册节 | V1.2 设计方案依据 | 产出 |
|---|---|---|
| §2 项目骨架 | §3 架构、§17 开工清单 | 目录树 + 文件职责 |
| §3 技术栈与依赖 | §4 技术栈、§4.2 构建细节 | package.json + Dockerfile |
| §4 领域模型 | §5 数据模型、§5.1/5.2 约束 | Zod schema + Drizzle 表 + 迁移 |
| §5 核心模块 | §3.1 组件、§6/7/8 算法 | 接口签名 + 算法函数化 |
| §6 API | §9 API 设计、§2.4 freshness | 路由 Zod in/out + handler |
| §7 UI | §2 UX、PRD §11 IA | 组件树 + 数据流 |
| §8 Worker CLI | §3.2 数据流、§3.4 断跑 | 命令结构 + 阶段编排 |
| §9 WBS | §12 4 周计划 | T-01~T-42 任务级分解 |
| §10 测试 | §13 测试方案、§7.8 校准 | 测试金字塔 + Fixture |
| §11 部署运维 | §3.3 部署、§10 安全 | Docker + Cron + 备份 |
| §12 风险 | §14 Gate、V1.2 B1-B10 | 风险矩阵 + 缓解 |

### 1.3 执行前置条件

- Node.js ≥20（当前环境 v24.14.1 ✓）
- npm registry 可达（已验证 PONG ✓）
- GITHUB_TOKEN（第一切片 GitHub Collector 需要）
- LLM Provider API Key（Week 2 起）
- 时区固定 Asia/Shanghai（容器 TZ 环境变量）

### 1.4 交付物清单

| 交付物 | 路径 | 说明 |
|---|---|---|
| 实施手册 md | `D:\radar\AI_Tech_Radar_实施方案_V1.0.md` | 本文档 |
| 实施手册 docx | `D:\radar\AI_Tech_Radar_实施方案_V1.0.docx` | 同上 Word 版 |
| 项目脚手架 | `D:\radar\radar-app\` | 可运行 Next.js 项目 + Week 1 第一切片 |

---

## 2. 项目骨架

### 2.1 目录树

```
radar-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局 + Tailwind + 字体
│   ├── page.tsx                  # Today 页（Server Component）
│   ├── globals.css               # Tailwind 指令 + 主题变量
│   ├── today/                    # Today 页（如需独立路由）
│   ├── events/[id]/page.tsx      # Event Detail 页
│   ├── watchlist/page.tsx
│   ├── memory/page.tsx
│   ├── sources/page.tsx
│   ├── jobs/page.tsx
│   ├── settings/page.tsx
│   └── api/
│       ├── today/route.ts
│       ├── events/[id]/route.ts
│       ├── events/[id]/feedback/route.ts
│       ├── watchlist/route.ts
│       ├── watchlist/[id]/route.ts
│       ├── memories/route.ts
│       ├── memories/[id]/route.ts
│       ├── sources/health/route.ts
│       ├── jobs/route.ts
│       └── admin/jobs/[type]/run/route.ts
├── modules/                      # 领域逻辑（Web 与 Worker 共享）
│   ├── domain/
│   │   ├── schema.ts             # Zod Domain Schema（全量）
│   │   ├── types.ts              # TS 类型（从 Zod 推导）
│   │   └── enums.ts              # 枚举与常量
│   ├── scoring/
│   │   ├── rules.ts              # 7.5 规则评分 rubric
│   │   ├── novelty.ts            # 7.6 Novelty 相似度算法
│   │   └── select.ts             # 7.7 Tie-break 与多样性
│   ├── feedback/
│   │   └── engine.ts             # 8.1 反馈调整算法
│   ├── memory/
│   │   ├── decay.ts              # 8.2 权重与 Research 衰减
│   │   └── service.ts            # Memory CRUD
│   ├── pipeline/
│   │   ├── normalize.ts
│   │   ├── dedup.ts
│   │   ├── score.ts
│   │   └── brief.ts              # Daily Selector
│   └── llm/
│       ├── adapter.ts            # Provider 切换 + 预算 + 重试
│       ├── prompts.ts            # Card 生成 Prompt 模板
│       └── budget.ts             # 成本追踪
├── db/
│   ├── schema.ts                 # Drizzle 全量表结构
│   ├── client.ts                 # better-sqlite3 + Drizzle 实例
│   ├── fts.ts                    # FTS5 external-content 触发器
│   ├── migrations/
│   │   └── 0001_init.sql
│   └── seed.ts                   # profile=local + 6 topics + source fixtures
├── connectors/                   # 采集器
│   ├── types.ts                  # Collector 接口合同
│   ├── github.ts                 # GitHub Release/Repo（第一切片完整）
│   ├── rss.ts                    # RSS/Atom
│   ├── web.ts                    # 网页变更（三层防误报）
│   └── registry.ts               # source.type -> collector 映射
├── workers/
│   ├── cli.ts                    # 命令入口（daily/backfill/score/analyze）
│   ├── pipeline.ts               # 阶段编排 + 租约锁
│   ├── catchup.ts                # 3.4 断跑补跑检测
│   └── backup.ts                 # SQLite online backup
├── lib/
│   ├── time.ts                   # 5.2 北京时间窗口计算
│   ├── url.ts                    # 6.5 canonical URL 归一化
│   ├── hash.ts                   # 内容哈希
│   └── env.ts                    # 环境变量 Zod 校验
├── config/
│   ├── pricing.json              # LLM 单价表
│   ├── topics.json               # 6 topic seed
│   └── sources.json              # 默认 25 source fixtures
├── tests/
│   ├── domain.test.ts
│   ├── github-collector.test.ts
│   ├── rss-collector.test.ts
│   ├── dedup.test.ts
│   ├── time-window.test.ts
│   ├── feedback-engine.test.ts
│   ├── scoring-rules.test.ts
│   ├── novelty.test.ts
│   ├── select-tiebreak.test.ts
│   ├── memory-decay.test.ts
│   ├── api-contract.test.ts
│   ├── e2e/today-flow.spec.ts
│   └── fixtures/
│       ├── github-release.json
│       ├── rss-feed.xml
│       └── eval-set.json         # 100 条评测集
├── .env.example
├── .env.local                    # 本地密钥（gitignore）
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── Dockerfile
├── docker-compose.yml            # 可选：含 Caddy 反代
├── .gitignore
└── README.md
```

### 2.2 关键文件职责

| 文件 | 职责 | V1.2 依据 |
|---|---|---|
| `modules/domain/schema.ts` | 全量 Zod schema，API/Worker/LLM 共用 | §5、§9.1 |
| `db/schema.ts` | Drizzle 14 表 + 索引 + FTS5 | §5 |
| `db/fts.ts` | FTS5 external-content 同步触发器 | §4.2 |
| `lib/time.ts` | 数据窗口 = 北京时间前一日；边界规则 | §5.2、A1 |
| `modules/scoring/rules.ts` | LLM 不可用时的规则评分 | §7.5 |
| `modules/scoring/novelty.ts` | bm25 召回 + Jaccard 判定 | §7.6 |
| `modules/scoring/select.ts` | 四级 Tie-break + 多样性 | §7.7 |
| `modules/feedback/engine.ts` | 步长/clamp/回滚/来源降噪 | §8.1 |
| `modules/memory/decay.ts` | Interest 回归 + Research 衰减 | §8.2 |
| `workers/catchup.ts` | 断跑检测 + 缺失窗口补跑 | §3.4、B1 |
| `connectors/web.ts` | 三层防误报网页变更 | §6.1、A7 |

---

## 3. 技术栈与依赖

### 3.1 package.json 依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| next | ^15.1 | App Router + Route Handlers |
| react / react-dom | ^19.0 | UI |
| drizzle-orm | ^0.38 | ORM |
| better-sqlite3 | ^11.8 | SQLite 驱动（同步 API，Worker 友好） |
| zod | ^3.24 | schema 校验 |
| @t3-oss/env-nextjs | ^0.11 | 环境变量校验 |
| pino | ^9.5 | 结构化日志 |
| rss-parser | ^3.13 | RSS/Atom 解析 |
| cheerio | ^1.0 | HTML 正文抽取（网页变更） |
| tsx | ^4.19 | Worker 开发时直接跑 TS |

devDependencies：

| 依赖 | 版本 | 用途 |
|---|---|---|
| typescript | ^5.7 | 类型 |
| drizzle-kit | ^0.30 | 迁移生成 |
| tsup | ^8.3 | Worker 打包 dist/worker.js |
| tailwindcss | ^4.0 | 样式 |
| vitest | ^2.1 | 单元测试 |
| @playwright/test | ^1.49 | E2E |
| @types/better-sqlite3 | ^7.6 | 类型 |
| eslint / prettier | latest | 代码质量 |

### 3.2 package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker:dev": "tsx workers/cli.ts",
    "worker:build": "tsup workers/cli.ts --format esm --dts --out-dir dist",
    "worker:daily": "tsx workers/cli.ts daily",
    "worker:backfill": "tsx workers/cli.ts daily_backfill",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx db/seed.ts",
    "db:studio": "drizzle-kit studio",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

### 3.3 环境变量（.env.example）

```bash
# 必备
GITHUB_TOKEN=ghp_xxx                    # GitHub API 认证（必备）
DATABASE_PATH=./data/radar.db           # SQLite 文件路径
TIMEZONE=Asia/Shanghai                  # 数据窗口时区

# LLM（Week 2 起）
LLM_PROVIDER=deepseek                   # deepseek | anthropic | openai | openrouter
DEEPSEEK_API_KEY=sk-xxx                 # platform.deepseek.com/api_keys
ANTHROPIC_API_KEY=                      # 仅 provider=anthropic 时需要
LLM_STRONG_MODEL=deepseek-chat          # Card 分析
LLM_CHEAP_MODEL=deepseek-chat           # 预筛
LLM_DAILY_BUDGET_YUAN=10                # 硬上限（元）

# 远程访问（可选）
ADMIN_TOKEN=                            # openssl rand -hex 32
BIND_HOST=127.0.0.1                     # 默认 localhost
```

以上变量也可在网页 `/settings` 页配置（存 SQLite `app_settings` 表，API 返回一律脱敏）。
优先级：**网页设置 > .env.local**。Worker（tsx）与 Web（Next.js）共用同一解析逻辑（`lib/settings.ts`）。

### 3.4 Dockerfile（多阶段）

```dockerfile
# Stage 1: deps（含 better-sqlite3 prebuild）
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run worker:build && npm run build

# Stage 3: runner
FROM node:20-slim AS runner
WORKDIR /app
ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db/migrations ./db/migrations
COPY --from=builder /app/config ./config
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 && rm -rf /var/lib/apt/lists/*
EXPOSE 3000
CMD ["node", "server.js"]
```

注意：better-sqlite3 为 native 模块，CI 中需验证 prebuild 可用；无 prebuild 时安装时回退 node-gyp（需 python3 + make + g++）。

---

## 4. 领域模型实现规格

### 4.1 Zod Domain Schema（modules/domain/schema.ts）

```typescript
import { z } from 'zod';

// ===== 枚举（enums.ts）=====
export const EventTypeEnum = z.enum([
  'release', 'launch', 'pricing_change', 'spec_change',
  'breaking_change', 'docs_change', 'research', 'security_advisory',
]);
export const FeedbackActionEnum = z.enum(['useful', 'irrelevant', 'save', 'later']);
export const MemoryTypeEnum = z.enum(['interest', 'entity', 'research', 'feedback']);
export const ScorerTypeEnum = z.enum(['rules', 'llm']);
export const SourceTypeEnum = z.enum(['github_release', 'github_repo', 'rss', 'web', 'api']);
export const EventStatusEnum = z.enum(['candidate', 'confirmed', 'merged', 'superseded']);
export const JobTypeEnum = z.enum(['daily', 'daily_backfill', 'score', 'analyze']);

// ===== 核心领域类型 =====
export const Source = z.object({
  id: z.string(),
  type: SourceTypeEnum,
  url: z.string().url(),
  config: z.object({
    noise_factor: z.number().min(0.5).max(1.0).default(1.0),  // §8.1 来源降噪
    cursor: z.string().nullable().default(null),               // 增量游标
    etag: z.string().nullable().default(null),
    last_modified: z.string().nullable().default(null),
  }),
  status: z.enum(['active', 'paused', 'error']).default('active'),
  entity_id: z.string().nullable(),
});

export const RawItem = z.object({
  id: z.string(),
  source_id: z.string(),
  external_id: z.string(),            // source 内唯一
  content_hash: z.string(),           // sha256(normalized_content)
  captured_at: z.string().datetime(), // UTC ISO 8601
  payload: z.record(z.unknown()),     // 原始响应
});

export const Entity = z.object({
  id: z.string(),
  type: z.enum(['repo', 'company', 'model', 'page', 'person']),
  name: z.string(),
  aliases: z.array(z.string()).default([]),    // §6.5 别名
  canonical_url: z.string(),                    // §6.5 归一化
});

export const Event = z.object({
  id: z.string(),
  entity_id: z.string(),
  type: EventTypeEnum,
  title: z.string(),
  facts_json: z.array(z.object({
    key: z.string(),
    value: z.string(),
    before: z.string().optional(),
    after: z.string().optional(),
  })),
  occurred_at: z.string().datetime(),  // UTC，归桶用 §5.2
  captured_at: z.string().datetime(),
  status: EventStatusEnum.default('candidate'),
  backfill: z.boolean().default(false), // §6.3 冷启动回填标记
  version: z.number().int().default(1), // facts 更新重入时 +1 §6.4
});

export const Evidence = z.object({
  id: z.string(),
  event_id: z.string(),
  source_id: z.string(),
  url: z.string().url(),
  quote: z.string(),
  confidence: z.number().min(0).max(1),
  captured_at: z.string().datetime(),
});

export const ScoreDimensions = z.object({
  relevance: z.number().int().min(0).max(100),
  impact: z.number().int().min(0).max(100),
  novelty: z.number().int().min(0).max(100),
  credibility: z.number().int().min(0).max(100),
  urgency: z.number().int().min(0).max(100),
});

export const ScoreSnapshot = z.object({
  id: z.string(),
  event_id: z.string(),
  profile_id: z.string().default('local'),
  dimensions: ScoreDimensions,
  total: z.number().min(0).max(100),
  scorer: ScorerTypeEnum,               // rules | llm
  version: z.number().int(),            // §5.1 v1=rules, v2=llm 补析
  weight_diff: z.record(z.unknown()).default({}), // §8.1 调整前后权重
  model: z.string().optional(),
  prompt_version: z.string().optional(),
  generated_at: z.string().datetime(),
});

export const IntelligenceCard = z.object({
  id: z.string(),
  event_id: z.string(),
  what_happened: z.string(),
  why_it_matters: z.string(),
  what_is_different: z.string(),
  technical_take: z.string(),
  recommended_action: z.enum(['skip', '5min', '15min', 'clone_test', 'watch']),
  evidence_ids: z.array(z.string()).min(1),  // 至少 1 个，不接受裸链接
  confidence: z.number().min(0).max(1),
  status: z.enum(['pending', 'generated', 'failed']).default('pending'),
});

export const Feedback = z.object({
  id: z.string(),
  event_id: z.string(),
  action: FeedbackActionEnum,
  reason: z.string().optional(),         // 不相关原因
  weight_delta: z.record(z.number()).default({}), // §8.1 回滚用
  client_request_id: z.string(),         // §9.1 幂等
  created_at: z.string().datetime(),
});

export const Memory = z.object({
  id: z.string(),
  type: MemoryTypeEnum,
  content: z.record(z.unknown()),
  evidence: z.array(z.string()),         // 关联 event/feedback id
  confidence: z.number().min(0).max(1),
  expires_at: z.string().datetime().nullable(),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const DailyBrief = z.object({
  date: z.string(),                      // 北京时间日历日 YYYY-MM-DD
  selected_event_ids: z.array(z.string()),
  metrics: z.object({
    scanned: z.number().int(),
    candidates: z.number().int(),
    recommended: z.number().int(),
    filtered: z.number().int(),
    source_anomalies: z.number().int(),
  }),
  status: z.enum(['pending', 'fresh', 'stale']).default('pending'), // §2.4
});

// API 统一响应
export const ApiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ data, meta: z.record(z.unknown()).optional() });
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    request_id: z.string(),
  }),
});
```

### 4.2 Drizzle 表结构（db/schema.ts 关键表）

```typescript
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const profile = sqliteTable('profile', {
  id: text('id').primaryKey().default('local'),
  timezone: text('timezone').default('Asia/Shanghai'),
  daily_budget: integer('daily_budget').default(10),
  settings_json: text('settings_json').default('{"thresholds":{"must":80,"worth":65}}'),
});

export const source = sqliteTable('source', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  url: text('url').notNull(),
  config: text('config', { mode: 'json' }).notNull(),
  status: text('status').default('active'),
  entity_id: text('entity_id'),
});

export const rawItem = sqliteTable('raw_item', {
  id: text('id').primaryKey(),
  source_id: text('source_id').notNull().references(() => source.id),
  external_id: text('external_id').notNull(),
  content_hash: text('content_hash').notNull(),
  captured_at: text('captured_at').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
}, (t) => ({
  uniq: uniqueIndex('raw_item_uniq').on(t.source_id, t.external_id),
  hashIdx: index('raw_item_hash_idx').on(t.content_hash),
}));

export const event = sqliteTable('event', {
  id: text('id').primaryKey(),
  entity_id: text('entity_id').notNull().references(() => entity.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  facts_json: text('facts_json', { mode: 'json' }).notNull(),
  occurred_at: text('occurred_at').notNull(),
  captured_at: text('captured_at').notNull(),
  status: text('status').default('candidate'),
  backfill: integer('backfill', { mode: 'boolean' }).default(false),
  version: integer('version').default(1),
}, (t) => ({
  occurredIdx: index('event_occurred_idx').on(t.occurred_at),
  entityIdx: index('event_entity_idx').on(t.entity_id),
}));

export const eventEvidence = sqliteTable('event_evidence', {
  id: text('id').primaryKey(),
  event_id: text('event_id').notNull().references(() => event.id),
  source_id: text('source_id').notNull().references(() => source.id),
  url: text('url').notNull(),
  quote: text('quote').notNull(),
  confidence: real('confidence').notNull(),
  captured_at: text('captured_at').notNull(),
});

export const scoreSnapshot = sqliteTable('score_snapshot', {
  id: text('id').primaryKey(),
  event_id: text('event_id').notNull().references(() => event.id),
  profile_id: text('profile_id').default('local'),
  dimensions: text('dimensions', { mode: 'json' }).notNull(),
  total: real('total').notNull(),
  scorer: text('scorer').notNull(),       // rules | llm
  version: integer('version').notNull(),
  weight_diff: text('weight_diff', { mode: 'json' }).default('{}'),
  model: text('model'),
  prompt_version: text('prompt_version'),
  generated_at: text('generated_at').notNull(),
}, (t) => ({
  eventIdx: index('score_event_idx').on(t.event_id),
}));

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  event_id: text('event_id').notNull().references(() => event.id),
  action: text('action').notNull(),
  reason: text('reason'),
  weight_delta: text('weight_delta', { mode: 'json' }).default('{}'),
  client_request_id: text('client_request_id').notNull(),
  created_at: text('created_at').notNull(),
}, (t) => ({
  uniq: uniqueIndex('feedback_client_uniq').on(t.client_request_id),
}));

export const memory = sqliteTable('memory', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  content: text('content', { mode: 'json' }).notNull(),
  evidence: text('evidence', { mode: 'json' }).notNull(),
  confidence: real('confidence').notNull(),
  expires_at: text('expires_at'),
  status: text('status').default('active'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const dailyBrief = sqliteTable('daily_brief', {
  date: text('date').primaryKey(),        // 北京时间日历日
  selected_event_ids: text('selected_event_ids', { mode: 'json' }).notNull(),
  metrics: text('metrics', { mode: 'json' }).notNull(),
  status: text('status').default('pending'),
});

export const jobRun = sqliteTable('job_run', {
  id: text('id').primaryKey(),
  job_type: text('job_type').notNull(),   // daily | daily_backfill | ...
  lease_until: text('lease_until').notNull(),
  status: text('status').notNull(),
  started_at: text('started_at').notNull(),
  finished_at: text('finished_at'),
  metrics: text('metrics', { mode: 'json' }),
  error: text('error'),
});

// FTS5 external-content 表（db/fts.ts 中用原生 SQL 创建）
// CREATE VIRTUAL TABLE event_fts USING fts5(
//   title, entity_name, content='event', content_rowid='rowid'
// );
// 同步触发器：INSERT/UPDATE/DELETE on event -> 同步 event_fts
```

### 4.3 迁移 0001_init.sql（关键部分）

```sql
-- 启用 WAL 与外键
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- （Drizzle generate 产出所有 CREATE TABLE ...）

-- FTS5 external-content 表与触发器
CREATE VIRTUAL TABLE IF NOT EXISTS event_fts USING fts5(
  title, entity_name, content='event', content_rowid='rowid', tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS event_ai AFTER INSERT ON event BEGIN
  INSERT INTO event_fts(rowid, title, entity_name)
  VALUES (new.rowid, new.title, (SELECT name FROM entity WHERE id = new.entity_id));
END;
CREATE TRIGGER IF NOT EXISTS event_ad AFTER DELETE ON event BEGIN
  INSERT INTO event_fts(event_fts, rowid, title, entity_name)
  VALUES ('delete', old.rowid, old.title, (SELECT name FROM entity WHERE id = old.entity_id));
END;
CREATE TRIGGER IF NOT EXISTS event_au AFTER UPDATE ON event BEGIN
  INSERT INTO event_fts(event_fts, rowid, title, entity_name)
  VALUES ('delete', old.rowid, old.title, (SELECT name FROM entity WHERE id = old.entity_id));
  INSERT INTO event_fts(rowid, title, entity_name)
  VALUES (new.rowid, new.title, (SELECT name FROM entity WHERE id = new.entity_id));
END;

-- 默认 profile
INSERT OR IGNORE INTO profile (id, timezone, daily_budget, settings_json)
VALUES ('local', 'Asia/Shanghai', 10, '{"thresholds":{"must":80,"worth":65}}');
```

### 4.4 lib/time.ts -- 北京时间窗口（§5.2）

```typescript
import { Temporal } from 'temporal-polyfill'; // 或用 Intl + Date 计算

const TZ = 'Asia/Shanghai';

/** 返回数据窗口：北京时间前一个自然日的 [start, end) UTC 区间 */
export function dataWindow(now: Date = new Date()): { start: string; end: string; date: string } {
  const zoned = Temporal.Instant.fromEpochMs(now.getTime()).toZonedDateTimeISO(TZ);
  // 今日 00:00 北京时间
  const todayStart = zoned.startOfDay();
  // 昨日 00:00 = 今日 - 1 天
  const yesterdayStart = todayStart.subtract({ days: 1 });
  return {
    start: yesterdayStart.toInstant().toString(),  // UTC ISO
    end: todayStart.toInstant().toString(),
    date: yesterdayStart.toPlainDate().toString(),  // YYYY-MM-DD 北京时间
  };
}

/** 判断 occurred_at 是否落在数据窗口内（§5.2） */
export function isInWindow(occurredAtUtc: string, window: { start: string; end: string }): boolean {
  return occurredAtUtc >= window.start && occurredAtUtc < window.end;
}

/** 将 UTC ISO 转为北京时间日历日字符串（归桶用） */
export function toBeijingDate(utcIso: string): string {
  return Temporal.Instant.from(utcIso).toZonedDateTimeISO(TZ).toPlainDate().toString();
}
```

---

## 5. 核心模块实现规格

### 5.1 Collector 接口合同（connectors/types.ts）

```typescript
export interface Collector {
  /** 增量拉取，返回 normalized RawItem[] */
  fetch(source: Source, window: { start: string; end: string }): Promise<CollectorResult>;
}

export interface CollectorResult {
  items: RawItem[];
  newCursor: string | null;      // 更新 source.config.cursor
  newEtag: string | null;
  rateLimit?: { remaining: number; resetAt: string };
}

export interface ConnectorError extends Error {
  code: 'RATE_LIMIT' | 'AUTH_FAILED' | 'PARSE_ERROR' | 'NETWORK' | 'SSRF_BLOCKED';
  retryable: boolean;
}
```

所有 Collector 必须实现该接口；`registry.ts` 按 `source.type` 路由。SSRF 防护在 `lib/url.ts` 的 `assertSafeUrl()` 中统一拦截（拒绝内网/localhost/元数据端点 169.254.169.254）。

### 5.2 GitHub Collector（第一切片完整实现，connectors/github.ts）

支撑 `github_release` 与 `github_repo` 两种 source.type。

```typescript
export class GitHubCollector implements Collector {
  constructor(private token: string, private fetcher = fetch) {}

  async fetch(source: Source, window: { start: string; end: string }): Promise<CollectorResult> {
    const { owner, repo, kind } = parseGitHubUrl(source.url);
    const url = kind === 'release'
      ? `https://api.github.com/repos/${owner}/${repo}/releases?per_page=50`
      : `https://api.github.com/repos/${owner}/${repo}`;
    const headers = buildAuthHeaders(this.token, source.config.etag);
    const resp = await this.fetcher(url, { headers });

    if (resp.status === 304) return { items: [], newCursor: source.config.cursor, newEtag: source.config.etag };
    if (resp.status === 403 && resp.headers.get('x-ratelimit-remaining') === '0') {
      throw connectorError('RATE_LIMIT', true);
    }
    if (resp.status === 401) throw connectorError('AUTH_FAILED', false);

    const data = await resp.json();
    const items = (kind === 'release' ? data : [data])
      .filter((r) => inWindow(r.published_at ?? r.updated_at, window))
      .map((r) => toRawItem(r, source.id, kind));

    return {
      items,
      newCursor: items.at(-1)?.external_id ?? source.config.cursor,
      newEtag: resp.headers.get('etag') ?? source.config.etag,
      rateLimit: parseRateLimit(resp.headers),
    };
  }
}
```

关键点：
- 用 ETag 做条件请求，304 不计配额
- `published_at` 为 UTC，直接与 window 比较
- Release 与 Repo 详情统一映射为 RawItem，payload 保留原始响应供下游抽取
- 鉴权头 `Authorization: Bearer ${token}`，token 仅从 env 读取，不入日志

### 5.3 RSS Collector（骨架，connectors/rss.ts）

```typescript
export class RSSCollector implements Collector {
  async fetch(source: Source, window) {
    const parser = new Parser();
    const feed = await parser.parseURL(source.url);
    const items = feed.items
      .filter((it) => inWindow(it.isoDate, window))
      .map((it) => toRawItem(it, source.id));
    return { items, newCursor: null, newEtag: null };
  }
}
```

### 5.4 Web 变更 Collector（三层防误报，connectors/web.ts，§6.1/A7）

```typescript
export class WebCollector implements Collector {
  async fetch(source: Source, window) {
    const html = await fetchHtml(source.url);          // 第 0 层：抓取
    const current = extractMain(html);                 // 抽正文，去 nav/footer
    const hash = sha256(current);
    if (hash === source.config.cursor) return { items: [], ... }; // 第 1 层：内容哈希无变化

    const diff = computeDiff(lastSnapshot(current), current);
    if (diff.ratio < 0.05) return { items: [], ... };  // 第 2 层：差异比 < 5% 视为噪声

    const significant = filterBoilerplate(diff.hunks);  // 第 3 层：过滤模板/广告/日期块
    if (significant.length === 0) return { items: [], ... };

    // 真实变更 -> 生成 spec_change event
    return { items: [toRawItem(significant, source.id)], newCursor: hash, newEtag: null };
  }
}
```

三层防误报：内容哈希 → 差异比阈值 → 模板噪声过滤。Week 2 实现。

### 5.5 Normalize（modules/pipeline/normalize.ts，§6.4/6.5）

```typescript
export function normalize(raw: RawItem, source: Source): EventCandidate {
  const payload = raw.payload as Record<string, unknown>;
  const title = extractTitle(payload, source.type);
  const entityName = extractEntityName(source.url, source.type);
  const canonical = canonicalUrl(source.url);          // §6.5 去除 tracking 参数
  const facts = extractFacts(payload, source.type);    // 结构化键值对
  const occurredAt = toUtcIso(extractTimestamp(payload, source.type));
  return { title, entityName, canonicalUrl: canonical, facts, occurredAt, rawItemId: raw.id };
}

/** §6.5 URL 归一化：保留 host+path+必要 query，去 utm_/_ga 等 */
export function canonicalUrl(raw: string): string {
  const u = new URL(raw);
  const strip = ['utm_source', 'utm_medium', 'utm_campaign', '_ga', 'gclid', 'fbclid'];
  strip.forEach((k) => u.searchParams.delete(k));
  u.hash = '';
  return u.toString();
}
```

### 5.6 Dedup / Novelty（modules/pipeline/dedup.ts + scoring/novelty.ts，§7.6）

```typescript
/**
 * §7.6 Novelty 判定：
 * 1) FTS5 bm25 召回 top-5 历史 event
 * 2) 标题 Jaccard + facts key 重叠度综合相似度
 * 3) sim >= 0.85 -> 视为重复，标记 status=merged 指向既有 event
 */
export async function assessNovelty(
  candidate: EventCandidate,
  db: DrizzleDB,
): Promise<{ isDuplicate: boolean; duplicateOf?: string; similarity: number; noveltyScore: number }> {
  // 1) bm25 召回
  const similar = await db.run(sql`
    SELECT e.id, e.title, bm25(event_fts) AS rank
    FROM event_fts f JOIN event e ON e.rowid = f.rowid
    WHERE event_fts MATCH ${candidate.title}
    ORDER BY rank LIMIT 5
  `);

  let best = { id: '', sim: 0 };
  for (const s of similar) {
    const titleSim = jaccard(tokenize(candidate.title), tokenize(s.title));
    const factsOverlap = factsKeyOverlap(candidate.facts, await loadFacts(s.id, db));
    const sim = 0.6 * titleSim + 0.4 * factsOverlap;   // 加权综合
    if (sim > best.sim) best = { id: s.id, sim };
  }

  return {
    isDuplicate: best.sim >= 0.85,
    duplicateOf: best.sim >= 0.85 ? best.id : undefined,
    similarity: best.sim,
    noveltyScore: clamp(Math.round((1 - best.sim) * 100), 0, 100),  // 越新越高
  };
}
```

### 5.7 Scorer -- 规则评分（modules/scoring/rules.ts，§7.5）

LLM 不可用或 v1 第一遍时使用，保证 pipeline 不中断。

```typescript
const RULES: Rule[] = [
  { id: 'release_v1', match: (e) => e.type === 'release' && /v1\b/.test(e.title), dim: 'impact', score: 60 },
  { id: 'release_major', match: (e) => e.type === 'release', dim: 'impact', score: 50 },
  { id: 'watchlist_match', match: (e, ctx) => ctx.watchlist.includes(e.entityName), dim: 'relevance', score: 70 },
  { id: 'breaking_change', match: (e) => e.type === 'breaking_change', dim: 'urgency', score: 90 },
  { id: 'research_arxiv', match: (e) => /arxiv\.org/.test(e.canonicalUrl), dim: 'novelty', score: 70 },
  { id: 'official_source', match: (e, ctx) => ctx.officialEntities.has(e.entityName), dim: 'credibility', score: 85 },
];

export function scoreByRules(event: Event, ctx: ScoreContext): ScoreDimensions {
  const dims = { relevance: 50, impact: 50, novelty: 50, credibility: 50, urgency: 30 };
  for (const r of RULES) {
    if (r.match(event, ctx)) dims[r.dim] = Math.min(100, dims[r.dim] + r.score - 50);
  }
  return dims;
}

export const WEIGHTS = { relevance: 0.35, impact: 0.25, novelty: 0.15, credibility: 0.15, urgency: 0.10 };
export function weightedTotal(d: ScoreDimensions): number {
  return Math.round(d.relevance * WEIGHTS.relevance + d.impact * WEIGHTS.impact
    + d.novelty * WEIGHTS.novelty + d.credibility * WEIGHTS.credibility + d.urgency * WEIGHTS.urgency);
}
```

### 5.8 Scorer -- LLM 评分（modules/llm/，v2 补析，§7.1-7.4）

```typescript
export async function scoreByLLM(event: Event, ctx: ScoreContext, adapter: LLMAdapter): Promise<{
  dimensions: ScoreDimensions; card: IntelligenceCard;
}> {
  const prompt = renderPrompt('score_v1', { event, ctx });
  const result = await adapter.complete({
    model: ctx.cheapModel,
    prompt,
    schema: llmScoreSchema,        // 强制结构化输出
    maxTokens: 800,
  });
  return { dimensions: result.dimensions, card: result.card };
}
```

LLM Adapter（modules/llm/adapter.ts）职责：
- Provider 切换（anthropic / openai / openrouter），统一接口
- 预算追踪（daily_budget_yuan 硬上限，超限抛 `BudgetExceeded`）
- 重试（指数退避，最多 3 次，仅对 5xx/超时）
- 结构化输出（JSON schema 约束）
- 成本日志（token 用量 + 单价 -> 累计，写 cost_ledger）

### 5.9 Daily Selector / Tie-break（modules/scoring/select.ts，§7.7）

```typescript
/**
 * §7.7 入选与排序：
 * 1) Must Read: total >= 80
 * 2) Worth Watching: 65 <= total < 80
 * 3) 排序 Tie-break（依次）: total DESC -> relevance DESC -> 实体多样性 -> occurred_at DESC
 * 4) 单一 topic 上限: ceil(入选总数 / 2)  防止单一话题霸屏
 */
export function selectDaily(scored: ScoredEvent[], opts: { must: number; worth: number }): {
  mustRead: ScoredEvent[]; worthWatching: ScoredEvent[]; filtered: ScoredEvent[];
} {
  const mustRead = scored.filter((s) => s.total >= opts.must);
  const worthWatching = scored.filter((s) => s.total >= opts.worth && s.total < opts.must);
  const filtered = scored.filter((s) => s.total < opts.worth);

  const mustSorted = tieBreakSort(mustRead);
  const worthSorted = tieBreakSort(worthWatching);

  return {
    mustRead: applyTopicCap(mustSorted, Math.ceil(mustSorted.length / 2)),
    worthWatching: applyTopicCap(worthSorted, Math.ceil(worthSorted.length / 2)),
    filtered,
  };
}

function tieBreakSort(list: ScoredEvent[]): ScoredEvent[] {
  return [...list].sort((a, b) =>
    b.total - a.total
    || b.dimensions.relevance - a.dimensions.relevance
    || diversityScore(b) - diversityScore(a)   // 实体多样性
    || b.occurredAt.localeCompare(a.occurredAt)
  );
}
```

### 5.10 Feedback Engine（modules/feedback/engine.ts，§8.1）

```typescript
/**
 * §8.1 反馈调整算法：
 * - weight ∈ [0.2, 1.0]，clamp 防止归零
 * - useful: +0.03；irrelevant: -0.05
 * - 记录 weight_delta 供回滚
 * - 来源降噪: 单一 source 累计 >= 3 条 irrelevant -> 该 source 的 credibility 维度 ×0.8
 */
export const FEEDBACK_STEPS = { useful: 0.03, irrelevant: -0.05, save: 0.01, later: 0 };
export const WEIGHT_BOUNDS = { min: 0.2, max: 1.0 };
export const SOURCE_NOISE_THRESHOLD = 3;
export const SOURCE_NOISE_FACTOR = 0.8;

export function applyFeedback(
  feedback: Feedback,
  currentWeights: DimensionWeights,
  db: DrizzleDB,
): { newWeights: DimensionWeights; delta: Record<string, number> } {
  const step = FEEDBACK_STEPS[feedback.action];
  const delta: Record<string, number> = {};
  const newWeights = { ...currentWeights };

  // 调整相关维度权重（useful/irrelevant 影响该 event 命中的 topic/entity 关联维度）
  for (const dim of affectedDimensions(feedback)) {
    const before = newWeights[dim];
    const after = clamp(before + step, WEIGHT_BOUNDS.min, WEIGHT_BOUNDS.max);
    newWeights[dim] = after;
    delta[dim] = after - before;
  }

  // 来源降噪检查
  if (feedback.action === 'irrelevant') {
    const event = db.getEvent(feedback.event_id);
    const sourceIrrelevantCount = db.countFeedback(event.source_id, 'irrelevant');
    if (sourceIrrelevantCount >= SOURCE_NOISE_THRESHOLD) {
      newWeights.credibility = clamp(newWeights.credibility * SOURCE_NOISE_FACTOR, WEIGHT_BOUNDS.min, WEIGHT_BOUNDS.max);
      delta.credibility = newWeights.credibility - currentWeights.credibility;
    }
  }

  return { newWeights, delta };
}

/** 回滚：删除 feedback 时反向应用 delta */
export function rollbackFeedback(delta: Record<string, number>, weights: DimensionWeights): DimensionWeights {
  const rolled = { ...weights };
  for (const [dim, d] of Object.entries(delta)) {
    rolled[dim] = clamp(rolled[dim] - d, WEIGHT_BOUNDS.min, WEIGHT_BOUNDS.max);
  }
  return rolled;
}
```

### 5.11 Memory Decay（modules/memory/decay.ts，§8.2）

```typescript
/**
 * §8.2 衰减：
 * - Interest memory: 90 天无反馈 -> 线性回归到 base（0.001/天）
 * - Research memory: 创建即 full，30 天后开始 15 天线性衰减，衰减完 auto-pause
 */
export const INTEREST_DECAY_DAYS = 90;
export const INTEREST_REGRESSION_RATE = 0.001;
export const RESEARCH_FULL_DAYS = 30;
export const RESEARCH_DECAY_DAYS = 15;

export function decayInterest(mem: Memory, now: Date): Memory {
  if (mem.type !== 'interest' || mem.status !== 'active') return mem;
  const daysSinceFeedback = daysBetween(lastFeedbackDate(mem), now);
  if (daysSinceFeedback <= INTEREST_DECAY_DAYS) return mem;
  const regressDays = daysSinceFeedback - INTEREST_DECAY_DAYS;
  const base = mem.content.base ?? 0.3;
  const current = mem.content.weight ?? 0.5;
  const regressed = Math.max(base, current - INTEREST_REGRESSION_RATE * regressDays);
  return { ...mem, content: { ...mem.content, weight: regressed }, updated_at: now.toISOString() };
}

export function decayResearch(mem: Memory, now: Date): Memory {
  if (mem.type !== 'research' || mem.status !== 'active') return mem;
  const age = daysBetween(mem.created_at, now);
  if (age <= RESEARCH_FULL_DAYS) return mem;                 // 30 天内全权
  if (age > RESEARCH_FULL_DAYS + RESEARCH_DECAY_DAYS) {       // 衰减完 -> 暂停
    return { ...mem, status: 'paused', updated_at: now.toISOString() };
  }
  const decayProgress = (age - RESEARCH_FULL_DAYS) / RESEARCH_DECAY_DAYS;
  const decayed = (mem.content.weight ?? 1.0) * (1 - decayProgress);
  return { ...mem, content: { ...mem.content, weight: decayed }, updated_at: now.toISOString() };
}
```

### 5.12 Catch-up / 断跑补跑（workers/catchup.ts，§3.4/B1）

```typescript
/**
 * §3.4 断跑检测与补跑：
 * - 检查 job_run 表，距上次成功 > 26h -> 判定断跑
 * - 计算缺失的北京时间窗口列表
 * - 逐窗口补跑，每窗口最多重试 2 次
 */
export const STALE_THRESHOLD_HOURS = 26;
export const MAX_RETRY = 2;

export async function detectAndBackfill(db: DrizzleDB): Promise<string[]> {
  const lastSuccess = await db.lastSuccessfulJob('daily');
  if (!lastSuccess) return [];  // 首次运行，不补跑

  const hoursSince = hoursBetween(lastSuccess.finished_at, new Date());
  if (hoursSince <= STALE_THRESHOLD_HOURS) return [];

  const missingWindows = computeMissingWindows(lastSuccess.finished_at, new Date());
  log.info({ missingWindows: missingWindows.length }, 'backfill triggered');
  return missingWindows;
}

export async function runBackfill(windows: string[], pipeline: DailyPipeline): Promise<void> {
  for (const date of windows) {
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        await pipeline.run({ date, backfill: true });
        break;
      } catch (err) {
        if (attempt === MAX_RETRY) {
          log.error({ date, err }, 'backfill window exhausted retries');
          // 标记该窗口为 failed，不阻塞后续窗口
        }
      }
    }
  }
}
```

---

## 6. API 实现规格

### 6.1 路由总览

| 方法 | 路径 | 功能 | V1.2 依据 |
|---|---|---|---|
| GET | `/api/today` | 当日简报（含 freshness） | §2.4、§9.2 |
| GET | `/api/events/:id` | 事件详情 + card + evidence | §9.3 |
| POST | `/api/events/:id/feedback` | 反馈（幂等） | §8.1、§9.4 |
| GET | `/api/watchlist` | 关注列表 | §9.5 |
| POST | `/api/watchlist` | 新增关注 | §9.5 |
| PATCH | `/api/watchlist/:id` | 暂停/恢复 | §9.5 |
| GET | `/api/memories` | 记忆列表 | §9.6 |
| PATCH | `/api/memories/:id` | 修正记忆 | §8.2 |
| GET | `/api/sources/health` | source 健康度 | §9.7 |
| POST | `/api/admin/jobs/:type/run` | 手动触发任务 | §3.4 |

### 6.2 统一响应与错误码

所有响应体遵循 §4.1 的 `ApiSuccess` / `ApiError`。错误码：

| code | HTTP | 含义 |
|---|---|---|
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | Zod 校验失败，details 含字段 |
| `IDEMPOTENT_CONFLICT` | 409 | client_request_id 已用于不同 action |
| `RATE_LIMITED` | 429 | 触发节流 |
| `BUDGET_EXCEEDED` | 503 | LLM 预算耗尽（手动触发任务时） |
| `JOB_LEASE_HELD` | 409 | 任务已有实例在跑 |
| `INTERNAL` | 500 | 未分类错误 |

### 6.3 关键路由示例：POST /api/events/:id/feedback

```typescript
// app/api/events/[id]/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applyFeedback } from '@/modules/feedback/engine';
import { db } from '@/db/client';

const Body = z.object({
  action: z.enum(['useful', 'irrelevant', 'save', 'later']),
  reason: z.string().max(200).optional(),
  client_request_id: z.string().min(8),   // 幂等键
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(errorBody('VALIDATION_ERROR', parsed.error.message),
      { status: 400 });
  }

  // 幂等：同 client_request_id 直接返回既有结果
  const existing = await db.findFeedbackByRequestId(parsed.data.client_request_id);
  if (existing) {
    if (existing.event_id !== params.id || existing.action !== parsed.data.action) {
      return NextResponse.json(errorBody('IDEMPOTENT_CONFLICT', 'request id reused'),
        { status: 409 });
    }
    return NextResponse.json({ data: existing });
  }

  const event = await db.getEvent(params.id);
  if (!event) return NextResponse.json(errorBody('NOT_FOUND', 'event'), { status: 404 });

  const weights = await db.loadWeights('local');
  const { newWeights, delta } = applyFeedback({ ...parsed.data, event_id: params.id }, weights, db);
  await db.tx(async (tx) => {
    await tx.insertFeedback({ ...parsed.data, event_id: params.id, weight_delta: delta });
    await tx.saveWeights('local', newWeights);
  });

  return NextResponse.json({ data: { applied: true, delta } });
}
```

### 6.4 GET /api/today -- freshness 语义（§2.4）

```typescript
export async function GET() {
  const window = dataWindow();
  const brief = await db.getDailyBrief(window.date);
  if (!brief) return NextResponse.json({ data: null, meta: { status: 'pending' } });

  // freshness: 基于当日 job_run 状态
  const job = await db.lastJobForDate(window.date);
  const freshness = computeFreshness(job, brief);  // fresh | stale | pending

  return NextResponse.json({
    data: { ...brief, window, freshness },
    meta: { generated_at: new Date().toISOString() },
  });
}

/** §2.4: 当日 07:00 后成功跑完 -> fresh；之后 source 有更新或重跑 -> stale；未跑 -> pending */
function computeFreshness(job, brief): 'fresh' | 'stale' | 'pending' {
  if (!job || job.status !== 'success') return 'pending';
  if (brief.status === 'fresh') return 'fresh';
  return 'stale';
}
```

---

## 7. UI 页面规格

### 7.1 页面与路由（8 页，对应 prototype hash 路由）

| 路由 | 页面 | 类型 | 数据来源 |
|---|---|---|---|
| `/` | Today | Server Component | `/api/today` |
| `/events/[id]` | Event Detail | Server + Client | `/api/events/:id` |
| `/watchlist` | Watchlist | Server Component | `/api/watchlist` |
| `/memory` | Memory | Server Component | `/api/memories` |
| `/sources` | Sources Health | Server Component | `/api/sources/health` |
| `/jobs` | Jobs | Server Component | `/api/jobs` |
| `/settings` | Settings | Client Component | profile settings |

### 7.2 Today 页组件树（与 prototype 对齐）

```
<TodayPage>
  <TopBar>                         // "07:00 处理北京时间昨日数据" + freshness 徽章
    <FreshnessBadge status={freshness} />
  </TopBar>
  <WindowLabel date={window.date} />  // "数据窗口：2026-08-06（北京时间昨日）"
  <MetricsBar metrics={brief.metrics} />  // scanned/candidates/recommended/filtered
  <MustReadSection>
    {mustRead.map(e => <EventCard event={e} tier="must" />)}
  </MustReadSection>
  <WorthWatchingSection>
    {worthWatching.map(e => <EventCard event={e} tier="worth" />)}
  </WorthWatchingSection>
</TodayPage>
```

`EventCard` 客户端组件含反馈按钮：useful / irrelevant(reason picker) / save / later，调用 `/api/events/:id/feedback`，乐观更新 + toast。reason picker 选项与 prototype 一致（已读/不相关领域/噪音/重复）。

### 7.3 Event Detail 页

```
<EventDetailPage>
  <BackLink />
  <EventHeader title type occurredAt />
  <CardView card={event.card} />      // what/why/what-different/take + recommended_action
  <EvidenceList evidence={event.evidence} />  // quote + url，至少 1 条
  <ScoreBreakdown dimensions={score.dimensions} total={score.total} />
  <FeedbackBar />
  <RelatedMemories />
</EventDetailPage>
```

### 7.4 样式约定（Tailwind 4）

- 主色：neutral 灰阶 + 单一强调色（indigo-500）
- 卡片：`rounded-lg border border-neutral-200 p-4`
- Must Read：左侧 4px indigo 边条；Worth Watching：neutral 边条
- 字体：系统无衬线，中文回退到系统默认（prototype 用 system-ui）
- 响应式：mobile-first，桌面端 max-w-3xl 居中

---

## 8. Worker CLI 规格

### 8.1 命令结构（workers/cli.ts）

```typescript
// 用法：
//   tsx workers/cli.ts daily              # 跑当日窗口
//   tsx workers/cli.ts daily_backfill     # 断跑检测 + 补跑
//   tsx workers/cli.ts score --event <id> # 单事件重评分
//   tsx workers/cli.ts analyze --event <id> # 单事件 LLM 补析
//   tsx workers/cli.ts backup             # SQLite online backup

import { Command } from 'commander';  // 或自实现极简 argv 解析

const program = new Command();
program.command('daily').action(runDaily);
program.command('daily_backfill').action(runBackfillCommand);
program.command('score').option('--event <id>').action(runScore);
program.command('analyze').option('--event <id>').action(runAnalyze);
program.command('backup').action(runBackup);
program.parse();
```

### 8.2 Daily Pipeline 阶段编排（workers/pipeline.ts）

```typescript
export class DailyPipeline {
  async run(opts: { date: string; backfill?: boolean }): Promise<JobMetrics> {
    const lease = await this.acquireLease(opts.date);   // 租约锁，防并发
    if (!lease.acquired) throw jobLeaseHeld();

    try {
      const window = windowForDate(opts.date);           // lib/time.ts
      // 1. 采集
      const raws = await this.collect(window);
      // 2. 归一化
      const candidates = raws.map((r) => normalize(r, r.source));
      // 3. 去重 / Novelty
      const unique = await this.dedup(candidates);
      // 4. 评分 v1（规则）
      const scoredV1 = unique.map((c) => ({ ...c, score: scoreByRules(c, this.ctx), scorer: 'rules' }));
      // 5. 评分 v2（LLM 补析，预算内）
      const scoredV2 = await this.llmScore(scoredV1);
      // 6. 选择 + Tie-break
      const { mustRead, worthWatching, filtered } = selectDaily(scoredV2, this.thresholds);
      // 7. 写 DailyBrief
      await this.persist(opts.date, { mustRead, worthWatching, filtered, metrics });

      await this.releaseLease(lease.id, 'success', metrics);
      return metrics;
    } catch (err) {
      await this.releaseLease(lease.id, 'failed', undefined, err);
      throw err;
    }
  }
}
```

阶段间用 Pino 结构化日志，每阶段输出计数。租约锁通过 `job_run.lease_until` 实现：开工写 `lease_until = now + 30min`，结束时更新 status；并发实例检测到未过期 lease 即退出。

### 8.3 Cron 配置（§3.3、A1）

容器内 crontab（TZ=Asia/Shanghai）：

```cron
# 每日 07:00 北京时间跑前一天数据
0 7 * * * /usr/local/bin/node /app/dist/cli.js daily >> /app/logs/cron.log 2>&1

# 每小时检测断跑（如需更及时的补跑）
0 * * * * /usr/local/bin/node /app/dist/cli.js daily_backfill >> /app/logs/cron.log 2>&1

# 每周日凌晨备份
0 3 * * 0 /usr/local/bin/node /app/dist/cli.js backup >> /app/logs/cron.log 2>&1
```

宿主机若用 systemd timer，同样设 `TZ=Asia/Shanghai`。关键：cron 进程的时区必须是北京时间，否则 07:00 错位。

### 8.4 SQLite Online Backup（workers/backup.ts）

```typescript
export async function runBackup(): Promise<void> {
  const dest = `${process.env.DATABASE_PATH}.${dateStamp()}.bak`;
  // better-sqlite3 的 backup API：在线热备，不阻塞写
  await db.backup(dest);
  // 保留最近 7 份
  await rotateBackups(dest, 7);
  log.info({ dest }, 'backup done');
}
```

<!-- MANUAL_PART3 -->

---

## 9. 4 周任务分解 WBS

等粒度原则：每周约 10-11 个任务，每个任务 0.5-2 人日，含验收标准。每周结束有 Gate 评审。

### Week 1 -- 骨架与第一切片（GitHub Release 全链路）

目标：从 GitHub Release 采集到 Today 页展示的端到端可运行链路（规则评分，无 LLM）。

| ID | 任务 | 交付物 | 验收标准 | 人日 |
|---|---|---|---|---|
| T-01 | 初始化 Next.js 项目骨架 | radar-app/ 目录 + package.json + tsconfig | `npm run dev` 启动无错 | 0.5 |
| T-02 | 配置 Tailwind 4 + 主题 | tailwind.config + globals.css | 页面应用主题变量 | 0.5 |
| T-03 | Drizzle schema 14 表 + 迁移 | db/schema.ts + 0001_init.sql | `drizzle-kit migrate` 成功，表结构正确 | 1 |
| T-04 | FTS5 external-content + 触发器 | db/fts.ts | 插入 event 后 event_fts 可查 | 0.5 |
| T-05 | better-sqlite3 client + WAL 配置 | db/client.ts | busy_timeout=5000，WAL 开启 | 0.5 |
| T-06 | lib/time.ts 北京时间窗口 | lib/time.ts | dataWindow() 返回昨日 [start,end) UTC | 0.5 |
| T-07 | lib/url.ts canonical + SSRF 防护 | lib/url.ts | 去除 utm 参数，拦截内网 URL | 0.5 |
| T-08 | Seed: profile + 6 topics + 25 sources | db/seed.ts + config/*.json | seed 后 source 表 25 行 | 0.5 |
| T-09 | GitHub Collector 完整实现 | connectors/github.ts | ETag 304/配额/401 处理正确 | 1.5 |
| T-10 | Normalize + Dedup（哈希去重） | modules/pipeline/{normalize,dedup}.ts | 相同 content_hash 不重复入库 | 1 |
| T-11 | 规则评分 Scorer + 加权 | modules/scoring/rules.ts | 6 条规则命中正确，total 加权 | 1 |
| T-12 | Today 页 + GET /api/today | app/page.tsx + api/today/route.ts | 展示 GitHub Release 简报 | 1.5 |

**Week 1 Gate**：手动触发一次 daily，Today 页看到至少 1 条 GitHub Release 事件，含 title/score/freshness。

### Week 2 -- LLM 评分与多源采集

目标：接入 LLM 做结构化评分与 Card 生成，扩展 RSS/Web 源，完整反馈闭环。

| ID | 任务 | 交付物 | 验收标准 | 人日 |
|---|---|---|---|---|
| T-13 | LLM Adapter（provider 切换+预算+重试） | modules/llm/adapter.ts | 超预算抛 BudgetExceeded | 1.5 |
| T-14 | 成本追踪 ledger | modules/llm/budget.ts | token+单价累计写库 | 0.5 |
| T-15 | 评分 v2 LLM Prompt 模板 | modules/llm/prompts.ts | 结构化输出 5 维度 | 1 |
| T-16 | Card 生成 Prompt + 至少 1 evidence 校验 | modules/llm/prompts.ts | 无 evidence 的 card 拒收 | 1 |
| T-17 | RSS Collector 实现 | connectors/rss.ts | 解析 Atom+RSS 2.0 | 1 |
| T-18 | Web Collector 三层防误报 | connectors/web.ts | 哈希+差异比+模板过滤 | 1.5 |
| T-19 | Novelty 算法（bm25+Jaccard） | modules/scoring/novelty.ts | sim>=0.85 标记 merged | 1.5 |
| T-20 | Tie-break + Topic 上限 | modules/scoring/select.ts | 四级排序+ceil(n/2) 上限 | 1 |
| T-21 | Feedback Engine（步长/clamp/回滚） | modules/feedback/engine.ts | weight 不越 [0.2,1.0] | 1 |
| T-22 | 来源降噪逻辑 | modules/feedback/engine.ts | 3 条 irrelevant -> ×0.8 | 0.5 |
| T-23 | POST /api/events/:id/feedback 幂等 | api/.../feedback/route.ts | 同 request_id 幂等 | 1 |
| T-24 | Event Detail 页 + 反馈交互 | app/events/[id]/page.tsx | reason picker + toast | 1.5 |

**Week 2 Gate**：LLM 评分链路通，反馈后重跑评分能看到权重变化，重复事件被标记 merged。

### Week 3 -- 记忆、衰减、运维闭环

目标：Memory 与衰减机制、断跑补跑、监控与手动触发。

| ID | 任务 | 交付物 | 验收标准 | 人日 |
|---|---|---|---|---|
| T-25 | Memory service CRUD | modules/memory/service.ts | 4 类 memory 增删改查 | 1 |
| T-26 | Interest 衰减（90 天回归） | modules/memory/decay.ts | 无反馈 90 天后权重下降 | 1 |
| T-27 | Research 衰减（30+15 天 auto-pause） | modules/memory/decay.ts | 衰减完自动 paused | 1 |
| T-28 | Memory 页 UI | app/memory/page.tsx | 列表+修正入口 | 1 |
| T-29 | 断跑检测（26h 阈值） | workers/catchup.ts | 模拟断跑触发补跑 | 1 |
| T-30 | 补跑多窗口 + 最多 2 重试 | workers/catchup.ts | 缺失窗口逐个补 | 1 |
| T-31 | Worker CLI 全命令 | workers/cli.ts | daily/backfill/score/analyze/backup | 1 |
| T-32 | Daily Pipeline 阶段编排 + 租约锁 | workers/pipeline.ts | 并发实例不冲突 | 1.5 |
| T-33 | Jobs 页 + 手动触发 API | app/jobs + api/admin/jobs | 手动触发 daily | 1 |

**Week 3 Gate**：断跑场景能自动补跑缺失窗口；Memory 衰减在测试 fixture 下行为正确；Worker CLI 各命令可用。

### Week 4 -- 评测、部署、硬化

目标：评测集校准阈值、Docker 化部署、E2E、安全加固、上线。

| ID | 任务 | 交付物 | 验收标准 | 人日 |
|---|---|---|---|---|
| T-34 | 评测集 100 条标注 | tests/fixtures/eval-set.json | 含正负样本+期望分级 | 1.5 |
| T-35 | 阈值校准脚本（§7.8） | scripts/calibrate.ts | 输出 must/worth 推荐阈值 | 1 |
| T-36 | 评测通过率报告 | scripts/eval.ts | must 召回>=80%，误报<=15% | 1 |
| T-37 | 单元测试补全（覆盖核心算法） | tests/*.test.ts | feedback/novelty/select/decay 全覆盖 | 1.5 |
| T-38 | API 契约测试 | tests/api-contract.test.ts | 10 路由 in/out 校验 | 1 |
| T-39 | E2E: 今日流程 | tests/e2e/today-flow.spec.ts | 采集->展示->反馈全流程 | 1.5 |
| T-40 | Dockerfile 多阶段构建 | Dockerfile + compose | 镜像可起，TZ=Asia/Shanghai | 1 |
| T-41 | 安全加固（token 不入日志/SSRF/localhost） | lib/env + url + 日志过滤 | 审计无 token 泄漏 | 1 |
| T-42 | 备份演练 + 上线检查清单 | scripts/backup-drill + checklist | 备份可恢复，清单逐项过 | 1 |

**Week 4 Gate（上线）**：评测通过率达标，Docker 部署成功，备份恢复演练通过，安全审计无高危项。

### WBS 汇总

| 周 | 任务数 | 累计 | 人日 | Gate |
|---|---|---|---|---|
| Week 1 | 12 | 12 | 9.5 | 第一切片端到端 |
| Week 2 | 12 | 24 | 12.0 | LLM+反馈闭环 |
| Week 3 | 9 | 33 | 10.0 | 记忆+运维闭环 |
| Week 4 | 9 | 42 | 10.5 | 评测+部署上线 |
| **合计** | **42** | - | **42.0** | - |

注：人日为单人估算；实际可并行（如 T-13/T-17/T-18 可三人并行），4 周日历时间对应约 1 人全程。

---

## 10. 测试策略

### 10.1 测试金字塔

| 层 | 工具 | 占比 | 范围 |
|---|---|---|---|
| 单元 | Vitest | 70% | 纯函数：time/novelty/feedback/decay/select/rules |
| 集成 | Vitest + 内存 SQLite | 20% | 模块+DB：pipeline 各阶段、API 路由 |
| E2E | Playwright | 10% | 关键用户流程：today/feedback/backfill |

### 10.2 测试 Fixture

| Fixture | 用途 |
|---|---|
| `github-release.json` | GitHub API 响应样本（含 v1/major/breaking） |
| `rss-feed.xml` | Atom + RSS 2.0 混合样本 |
| `eval-set.json` | 100 条标注事件（期望分级 + 期望 novelty） |
| `web-snapshots/` | 网页变更前后快照对（含模板噪声样本） |

### 10.3 核心算法测试用例

| 模块 | 关键用例 |
|---|---|
| time-window | 跨日边界、UTC 与北京时间换算、夏令时无关（中国无夏令时） |
| novelty | 标题完全相同 sim=1.0；改动词 sim<0.85；facts 重叠高 sim 提升 |
| feedback | useful +0.03 不超 1.0；irrelevant -0.05 不低于 0.2；回滚精确还原 |
| feedback-noise | 单 source 第 3 条 irrelevant 触发 ×0.8 |
| select | total 相同时 relevance 优先；单 topic 超 ceil(n/2) 截断 |
| decay-interest | 89 天不变，91 天开始回归；回归不低于 base |
| decay-research | 30 天全权，45 天衰减完 paused |

### 10.4 评测集与阈值校准（§7.8）

- 100 条标注事件：60 正样本（期望 must/worth）+ 40 负样本（期望 filtered）
- 指标：must 召回率 ≥80%，误报率 ≤15%
- 阈值校准脚本遍历 must∈[75,85]、worth∈[60,70]，选 F1 最优组合
- 评测作为 CI 门禁：通过率不达标阻塞合并

### 10.5 CI 流水线

```
lint -> typecheck -> unit -> integration -> eval(阈值校准) -> build -> e2e(可选 nightly)
```

---

## 11. 部署与运维

### 11.1 部署形态

单容器（Web + 共享 SQLite），Worker 由宿主 cron 调用容器内 `node dist/cli.js`。

```yaml
# docker-compose.yml
services:
  radar:
    build: .
    ports: ["3000:3000"]
    volumes:
      - ./data:/app/data          # SQLite 持久化
      - ./logs:/app/logs
      - ./config:/app/config:ro
    environment:
      - TZ=Asia/Shanghai
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_PATH=/app/data/radar.db
    restart: unless-stopped
  cron:
    image: radar:latest
    entrypoint: /bin/sh
    command: -c "crontab /app/cron.tab && crond -f"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./cron.tab:/app/cron.tab:ro
    environment:
      - TZ=Asia/Shanghai
    depends_on: [radar]
```

### 11.2 首次部署步骤

1. 准备 `.env`：GITHUB_TOKEN、ANTHROPIC_API_KEY、ADMIN_TOKEN
2. `docker compose up -d radar`
3. 进入容器执行迁移与 seed：`docker compose exec radar node dist/cli.js migrate && seed`
4. 部署 cron 容器
5. 手动触发首次 daily 验证：`POST /api/admin/jobs/daily/run`
6. 确认 Today 页有数据

### 11.3 运维监控

| 指标 | 来源 | 告警阈值 |
|---|---|---|
| daily job 成功 | job_run | 连续 2 天 failed |
| LLM 日成本 | cost_ledger | > daily_budget × 1.2 |
| source 错误率 | source.status=error | 单 source 连续 3 次失败 |
| 数据库大小 | 文件 | > 500MB 触发清理 |
| 断跑 | catchup 日志 | 触发 backfill 即告警 |

### 11.4 备份与恢复演练

- 每周日凌晨自动 backup（§8.4），保留 7 份
- 季度恢复演练：从备份恢复到临时实例，验证数据完整
- 演练清单：恢复 -> 跑一次 daily -> 对比事件数 -> 清理临时实例

### 11.5 安全清单

- [ ] GITHUB_TOKEN / API_KEY 仅从 env 读取，不入日志、不入 git
- [ ] 日志过滤：对 payload/url 做敏感字段脱敏
- [ ] SSRF 防护：lib/url.ts 拦截内网/元数据端点
- [ ] ADMIN_TOKEN 校验：手动触发 API 需 Bearer token
- [ ] localhost-first：BIND_HOST=127.0.0.1 默认，远程访问需显式配置 + 反代
- [ ] 数据库文件权限 600

---

## 12. 风险与缓解

| ID | 风险 | 影响 | 概率 | 缓解 | V1.2 依据 |
|---|---|---|---|---|---|
| R1 | LLM API 不可用/超预算 | 当日无 Card | 中 | 规则评分降级（v1）保底，pipeline 不中断 | §7.5、B2 |
| R2 | GitHub API 配额耗尽 | 采集缺失 | 中 | ETag 条件请求省配额；多源分散；配额监控告警 | T-09 |
| R3 | 网页变更误报淹没 | 信噪比低 | 高 | 三层防误报（哈希+差异比+模板过滤） | §6.1、A7 |
| R4 | 时区错位致窗口偏移 | 数据归属错日 | 中 | 容器 TZ=Asia/Shanghai；time.ts 单测覆盖跨日边界 | A1、§5.2 |
| R5 | SQLite 写锁竞争 | Worker 与 Web 互锁 | 低 | WAL 模式 + busy_timeout=5000；Web 只读为主 | §4.2 |
| R6 | 反馈权重漂移 | 评分失真 | 中 | clamp [0.2,1.0]；weight_delta 回滚；衰减回归 base | §8.1、§8.2 |
| R7 | 断跑漏数据 | 缺日简报 | 中 | 26h 阈值检测 + 自动补跑 + 2 重试 | §3.4、B1 |
| R8 | Novelty 漏判重复 | 重复事件入选 | 中 | bm25+Jaccard 双重判定；0.85 阈值可调 | §7.6 |
| R9 | FTS5 索引与主表不同步 | 召回缺失 | 低 | 触发器同步；启动时一致性检查 | §4.3 |
| R10 | 单一 topic 霸屏 | 多样性差 | 中 | Tie-break Topic 上限 ceil(n/2) | §7.7 |
| R11 | better-sqlite3 native 编译失败 | 部署阻塞 | 低 | 优先用 prebuild；Dockerfile 含编译工具链回退 | §3.4 |
| R12 | 评测集偏差致阈值失准 | 分级不准 | 中 | 100 条多源标注；季度复评；校准脚本 | §7.8、T-34 |

### 12.1 上线检查清单（Week 4 Gate 终检）

- [ ] 评测通过率达标（must 召回≥80%，误报≤15%）
- [ ] 4 周 WBS 全部任务完成（T-01~T-42）
- [ ] Docker 部署成功，TZ 正确
- [ ] 备份恢复演练通过
- [ ] 安全清单 6 项全过
- [ ] 至少 3 天连续 daily 成功运行
- [ ] E2E 测试全绿
- [ ] 文档（本手册 + README）齐全

---

## 附录 A：脚手架现状

`D:\radar\radar-app\` 已按本手册 §2-§3 搭建骨架，并实现 Week 1 第一切片（T-01~T-12 的核心）：
- 项目配置：package.json / tsconfig / next.config / drizzle.config / tailwind / Dockerfile / .env.example
- 数据层：db/schema.ts（14 表 + FTS5）、db/client.ts、db/seed.ts、迁移 0001_init.sql
- 领域层：modules/domain/schema.ts（全量 Zod）、scoring/rules.ts、pipeline/{normalize,dedup}.ts
- 采集层：connectors/github.ts（完整）+ rss/web 骨架 + registry
- Worker：workers/cli.ts + pipeline.ts + catchup.ts
- 应用层：app/layout + page(Today) + api/today + events/[id]
- lib：time.ts / url.ts / hash.ts / env.ts
- 测试：github-collector / time-window / dedup 等基础用例

进入 `radar-app/` 后执行 `npm install && npm run db:migrate && npm run db:seed && npm run worker:daily && npm run dev` 即可看到第一切片运行。

---

*文档版本 V1.0 · 2026-08-07 · 基于 AI_Tech_Radar_V1.2 设计方案*
