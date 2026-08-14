# 架构说明

一套 TypeScript、一个 SQLite、两个进程角色。

```
浏览器
  └── Next.js（页面 + Route Handlers）
          │
          ├── modules/*     领域逻辑（Web / Worker 共用）
          ├── connectors/*  GitHub / RSS / Web
          └── db/*          Drizzle + better-sqlite3 + FTS5
          │
Worker CLI（tsx workers/cli.ts daily）
  └── 同一套 modules / connectors / db
```

Web 不跑长采集。手动扫描走 `/api/admin/jobs/daily/run`，或直接跑 CLI。

## 数据流

1. **Collect**：按源拉取窗口内增量（ETag / 列表日期 / RSS）  
2. **Normalize**：统一成事件候选（标题、实体、facts、canonical URL）  
3. **Dedup**：内容哈希 + 标题/实体 + FTS5 相似度  
4. **Score**：规则评分；有 LLM 时对头部候选补第二版分数和情报卡  
5. **Select**：Must Read（≥80）/ Worth Watching（≥65），带话题多样性  
6. **Briefing**：整理精炼标题、主体类型、项目、更新要点，写入 `event_brief`  
7. **i18n**：原文保留，中文对照写入 `event_i18n`  
8. **Daily brief**：选定事件 id 写入 `daily_brief`

评分快照不可覆盖，便于回放。反馈只影响下一次排序的权重，不改历史事实。

## 关键目录

| 路径 | 职责 |
|---|---|
| `radar-app/app/` | App Router 页面与 API |
| `radar-app/modules/domain/` | Zod 领域模型 |
| `radar-app/modules/scoring/` | 规则分、Novelty、入选 |
| `radar-app/modules/briefing/` | 结构化摘要 |
| `radar-app/modules/llm/` | Provider 适配、预算、翻译、补析 |
| `radar-app/modules/feedback/` | 反馈步长与回滚 |
| `radar-app/connectors/` | 采集器 |
| `radar-app/workers/` | 日批、补跑、备份 |
| `radar-app/db/migrations/` | SQL 迁移 |

## 评分权重

Relevance 35% · Impact 25% · Novelty 15% · Credibility 15% · Urgency 10%。

LLM 失败或超预算时保留规则分，pipeline 不中断。

## 存储

SQLite WAL。表包括：source / raw_item / entity / event / event_evidence / score_snapshot / intelligence_card / event_brief / event_i18n / feedback / memory / daily_brief / job_run / cost_ledger / app_settings。

全文检索用 FTS5（`event_fts`），不为 V1 引入向量库。
