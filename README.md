# AI Tech Radar

个人技术情报代理。每天把 GitHub Release、官方 RSS 和官网公告压缩成一份可读的简报：精炼标题、主体/项目、更新要点，点进详情再看完整说明。

单用户、本机优先。没有账号系统，密钥只存在本地 SQLite。

## 它解决什么

关注模型、Agent、MCP、推理基础设施时，信息散落在仓库 Release 和官网新闻里。Radar 只做一件事：

**采集 → 去重 → 评分 → 整理成事件 → 每天最多看几条。**

默认盯 AI Coding / Agent / 大模型 / 基础设施等主题。Watchlist 可自己加源。

## 仓库结构

```
radar/                          # 本仓库根目录
├── radar-app/                  # 可运行的 Next.js 应用 + Worker
├── docs/                       # 使用与架构说明
├── prototype/                  # 早期 HTML 原型
├── AI_Tech_Radar_*.md          # 设计与实施方案
└── design_review.md            # 设计评审记录
```

应用代码都在 `radar-app/`。日常开发请进入该目录。

## 快速开始

需要 Node.js 20+。GitHub Token 用于采集 Release；LLM Key（如 DeepSeek）用于评分、中文摘要和情报卡。没有 LLM 时采集和规则评分仍可跑。

```bash
cd radar-app
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

打开 http://localhost:3000

1. **Settings** 填写 GitHub Token，以及可选的 DeepSeek / Anthropic / OpenAI Key  
2. Today 页点 **扫描近 7 天**（约 1–3 分钟）  
3. 看 Must Read / Worth Watching，点卡片进详情

密钥优先存在网页 Settings（本机 SQLite，接口只返回脱敏值）。也可以放 `radar-app/.env.local`，网页设置优先级更高。

## 常用命令

在 `radar-app/` 下：

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动 Web |
| `npm run worker:daily` | 采集近 7 天并生成今日简报 |
| `npx tsx workers/cli.ts daily --lookback 7` | 同上，显式回看天数 |
| `npx tsx workers/cli.ts organize --date YYYY-MM-DD` | 给已有简报补结构化摘要 |
| `npm run worker:backfill` | 检测断跑并补跑 |
| `npm run worker:backup` | SQLite 在线备份 |
| `npm test` | 单元测试 |
| `npm run typecheck` | TypeScript 检查 |

## 页面

| 路由 | 用途 |
|---|---|
| `/` | 每日简报 |
| `/events/[id]` | 事件详情：更新说明、证据、评分 |
| `/watchlist` | 添加 / 暂停 / 删除来源 |
| `/sources` | 来源健康 |
| `/jobs` | 任务记录与 LLM 成本 |
| `/memory` | 反馈形成的记忆，可删除回滚 |
| `/inbox` | 收藏与稍后再看 |
| `/radar` | Topic 近 7 / 30 天数量 |
| `/settings` | Token、模型、预算 |

## 默认来源里有什么

种子数据约 30 个源，包括：

- GitHub Release：vLLM、llama.cpp、MCP servers、LangChain 等  
- 官方新闻页：xAI News、DeepSeek Changelog、Anthropic / OpenAI News、Cursor Changelog  
- RSS：Hugging Face Blog、Google AI、Meta AI 等  

网页源会按列表抽出带日期的公告（例如 x.ai/news 上的 Grok 发布），不再只做整页哈希。Watchlist 里可继续粘贴自己的 Repo / RSS / 官网。

## 文档

- [上手与配置](docs/getting-started.md)
- [架构说明](docs/architecture.md)
- [来源与采集](docs/sources.md)
- 设计原稿：`AI_Tech_Radar_V1.2_修订稿.md`、`AI_Tech_Radar_实施方案_V1.0.md`

## 不会上传的内容

`.gitignore` 已排除：

- `node_modules/`、`.next/`
- `radar-app/data/*.db`（本地数据库）
- `.env` / `.env.local`（密钥）

**不要把 GitHub Token 或 LLM Key 提交进仓库。**

## 许可

私人项目，未设开源许可证。未经作者同意请勿再分发。
