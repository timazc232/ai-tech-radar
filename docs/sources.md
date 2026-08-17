# 来源与采集

## 源类型

| type | 采集器 | 典型 URL |
|---|---|---|
| `github_release` | GitHub Releases API | `https://github.com/owner/repo/releases` |
| `github_repo` | Repo 详情（pushed_at） | `https://github.com/owner/repo` |
| `rss` | RSS / Atom | `…/feed.xml` |
| `web` | 官网列表或整页变更 | `https://x.ai/news` |
| `api` | 无密钥社区 JSON API | Hacker News / Lobsters |

Watchlist 粘贴 URL 时会按路径自动判断类型，并做 SSRF 拦截（拒绝内网和 metadata 地址）。

## 内置社区信号

默认来源还包含三类无需用户凭据的社区信号：

- **Hacker News**：读取官方 Firebase `beststories`，仅保留窗口内且分数不低于 20 的前 60 条候选。
- **Linux.do**：通过 Discourse 官方 `latest.rss` 进入现有 RSS 管线。
- **Lobsters**：读取官方 `hottest.json`，仅保留窗口内且分数不低于 5 的前 60 条候选。

社区载荷会保留作者、分数、评论数、讨论页和原帖链接。热度门槛只用于控制候选噪声，后续仍需经过统一去重、评分与日报选择。

## X 与 Reddit（可选）

X 名人账号和 Reddit 社区通过官方 API 接入，不使用页面抓取：

- X 使用 recent search，默认关注 OpenAI、Anthropic 和常见 AI 研究/产品账号；需要 `X_BEARER_TOKEN`。
- Reddit 使用 OAuth `client_credentials`，默认读取 `r/MachineLearning`、`r/LocalLLaMA`、`r/artificial`；需要 `REDDIT_CLIENT_ID` 与 `REDDIT_CLIENT_SECRET`。

凭据可在“设置”页面填写，也可通过 `.env.local` 提供。未配置时来源保持可用但显示“可选源未启用”，任务指标记入 `optionalSourcesSkipped`，不会把整批扫描标记为失败。鉴权失败和限流仍会作为来源异常显示，便于定位配置或配额问题。

## 为什么以前会漏掉大模型发布

早期种子几乎全是 **GitHub Release**。模型发布常常只出现在官网新闻或 changelog，例如：

- Grok 4.6 → [x.ai/news](https://x.ai/news)（2026-08-12）
- DeepSeek 版本说明 → [api-docs.deepseek.com/updates](https://api-docs.deepseek.com/updates/)

所以现在种子里加了 xAI / DeepSeek / Anthropic / OpenAI / Cursor 的官方页。网页采集会先抽带日期的文章列表，抽不到再退回整页哈希变更。

## 时间窗口

- 存储用 UTC  
- 展示和归桶用 `Asia/Shanghai`  
- 默认扫描 **近 7 个北京自然日**，简报日期仍记在「昨日」那一天  

只扫「昨天」时，隔一天发布的公告会直接漏掉。

## 自己加源

1. 打开 `/watchlist`  
2. 粘贴 GitHub / RSS / 官网 URL  
3. 选 Topic，点检查并添加  

已有历史数据的源不能硬删（外键），删除会改成暂停。

## 健康与重试

`/sources` 显示 last success 和 last error。状态为 `error` 的源会在下一次扫描时重试；`paused` 会被跳过。单源失败不阻断整批。
