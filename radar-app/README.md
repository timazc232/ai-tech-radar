# AI Tech Radar（应用目录）

可运行的 Next.js 应用。仓库级说明见上一级 [README](../README.md) 与 [docs/](../docs/)。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库 + 迁移 + FTS5 + 种子数据
npm run db:migrate
npm run db:seed

# 3. 启动 Web
npm run dev
# 打开 http://localhost:3000
# Settings 填 GitHub Token（以及可选的 DeepSeek key）
# Jobs 页点「冷启动 7 天」生成第一份简报
```

配置两种方式（优先级：网页设置 > .env.local）：
- **网页**：`http://localhost:3000/settings` 填 GitHub Token / DeepSeek key / 模型 / 预算
- **文件**：`cp .env.example .env.local` 后编辑

## 环境变量

| 变量 | 必备 | 说明 |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | GitHub API token |
| `DATABASE_PATH` | | SQLite 路径，默认 `./data/radar.db` |
| `TIMEZONE` | | 固定 `Asia/Shanghai` |
| `ANTHROPIC_API_KEY` | Week 2+ | LLM 评分与 Card 生成 |
| `ADMIN_TOKEN` | | 手动触发任务的 admin token |

## 常用命令

```bash
npm run dev              # Web 开发服务器
npm run worker:daily     # 跑当日采集+评分+简报
# 也可加 --lookback 7     # 冷启动：采集近 7 天写入今日简报
tsx workers/cli.ts translate --date 2026-08-09   # 给已有简报补中文
npm run worker:backfill  # 检测断跑并补跑
npm run worker:backup    # SQLite 在线备份
npm run db:migrate       # 应用迁移
npm run db:seed          # 种子数据（6 topics + 25 sources）
npm run db:studio        # Drizzle Studio 查看数据
npm test                 # 单元测试
npm run typecheck        # 类型检查
```

## 架构

```
Web (Next.js App Router)  ←─共享─→  Worker CLI (tsx/tsup)
        │                              │
        └──── modules/* (领域逻辑) ─────┘
                     │
              db/* (SQLite + Drizzle + FTS5)
                     │
        connectors/* (github / rss / web)
```

- **数据窗口**：北京时间（Asia/Shanghai）前一个自然日，07:00 跑
- **评分**：5 维度（Relevance 35% / Impact 25% / Novelty 15% / Credibility 15% / Urgency 10%），Must Read ≥80，Worth ≥65
- **降级**：LLM 不可用时回退规则评分（v1），pipeline 不中断
- **去重**：content_hash + FTS5 bm25 召回 + Jaccard 相似度（≥0.85 判重）

## 目录结构

详见《实施方案》§2.1。核心：
- `modules/domain/schema.ts` — 全量 Zod schema
- `db/schema.ts` — Drizzle 14 表
- `modules/scoring/` — 规则评分 / Novelty / 选择排序
- `modules/feedback/engine.ts` — 反馈调整算法
- `modules/memory/decay.ts` — 权重衰减
- `workers/pipeline.ts` — Daily 阶段编排 + 租约锁
- `workers/catchup.ts` — 断跑补跑

## 测试

```bash
npm test          # Vitest 单元测试
```

覆盖：时间窗口 / 反馈引擎 / 选择排序 / 规则评分 / Novelty / 记忆衰减 / GitHub 采集器。

## 部署

```bash
docker compose up -d --build
```

Cron 配置见 `cron.tab`（TZ=Asia/Shanghai，每日 07:00 跑 `daily`）。

## 实施进度

参考《实施方案》§9 WBS（T-01~T-42）。

当前可日用闭环：
- Today（历史日期、空状态一键扫描、冷启动 7 天）
- Watchlist（粘贴 URL 添加 / 暂停 / 删除）
- Memory（查看、暂停、Forget 回滚权重）
- Inbox（收藏 / 稍后）
- Sources / Jobs / Radar / 搜索
- Settings（密钥存本机 SQLite）
