# 上手与配置

## 环境

- Node.js ≥ 20
- 可选：Docker（见 `radar-app/docker-compose.yml`）

## 安装

```bash
cd radar-app
npm install
npm run db:migrate
npm run db:seed
```

迁移会建 SQLite 表（含 FTS5）。种子写入 6 个 Topic 和默认来源。可重复执行，已存在的行不会覆盖。

数据库默认路径：`radar-app/data/radar.db`。可用环境变量 `DATABASE_PATH` 改掉。

## 配置密钥

两种方式，**网页 Settings > `.env.local`**：

1. 打开 http://localhost:3000/settings  
2. 填 GitHub Token（采集 Release 需要，勾选 `public_repo` 即可）  
3. 填 LLM Provider 与 API Key（DeepSeek / Anthropic / OpenAI / OpenRouter）  
4. 可选：强模型、便宜模型、每日预算（默认 10 元）

或复制环境文件：

```bash
cd radar-app
copy .env.example .env.local   # Windows
# cp .env.example .env.local  # macOS / Linux
```

| 变量 | 说明 |
|---|---|
| `GITHUB_TOKEN` | GitHub API |
| `DEEPSEEK_API_KEY` 等 | 对应 Provider 的 Key |
| `LLM_PROVIDER` | `deepseek` / `anthropic` / `openai` / `openrouter` |
| `LLM_DAILY_BUDGET_YUAN` | 日预算，超限后停止深度分析，采集和规则评分继续 |
| `ADMIN_TOKEN` | 若设置，手动跑任务需要 `Authorization: Bearer …` |
| `TIMEZONE` | 固定按 `Asia/Shanghai` 理解 |

没有 LLM Key 时：采集、去重、规则评分、规则摘要仍可用；没有精炼中文标题和情报卡。

## 第一次出简报

```bash
npm run dev
```

浏览器打开 Today，点「扫描近 7 天」。或命令行：

```bash
npm run worker:daily
```

默认回看北京时间近 7 天，结果归到「昨日」这一天的 Today。首次扫描要拉官网和 GitHub，可能要几分钟。

## 日常使用

1. 每天打开 Today，读 Must Read，按需看 Worth Watching  
2. 点有用 / 不相关 / 收藏 / 稍后；不相关会调低相关权重  
3. Memory 里可删掉某条反馈并回滚权重  
4. Watchlist 增加自己关心的仓库或 RSS  
5. Sources / Jobs 看来源失败和任务耗时、花费  

打开 Today 时，若某条还没有结构化摘要，页面会自动补一次（需已配置 LLM）。

## 备份

```bash
npm run worker:backup
```

在数据库同目录生成热备份，默认留最近 7 份。

## Docker

```bash
cd radar-app
docker compose up -d --build
```

时区请设 `TZ=Asia/Shanghai`。Cron 示例见 `radar-app/cron.tab`。
