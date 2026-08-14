# 来源与采集

## 源类型

| type | 采集器 | 典型 URL |
|---|---|---|
| `github_release` | GitHub Releases API | `https://github.com/owner/repo/releases` |
| `github_repo` | Repo 详情（pushed_at） | `https://github.com/owner/repo` |
| `rss` | RSS / Atom | `…/feed.xml` |
| `web` | 官网列表或整页变更 | `https://x.ai/news` |

Watchlist 粘贴 URL 时会按路径自动判断类型，并做 SSRF 拦截（拒绝内网和 metadata 地址）。

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
