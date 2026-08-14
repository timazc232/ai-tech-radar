PRODUCT & TECHNICAL PLAN
AI Tech Radar
V1.0 最终计划与设计方案
| 决策项 | 最终结论 |
| 产品阶段 | Personal-first MVP / 单用户可日用版本 |
| 交付周期 | 4 周 MVP；连续运行 7 天后进入 Beta Gate |
| 技术原则 | 单体优先、SQLite 优先、原生能力优先、可迁移但不超前建设 |
| 核心目标 | 每天把大量变化压缩为不超过 8 条可解释、可追溯的技术事件 |
| 文档日期 | 2026-08-06 |


一句话方案：一个 Next.js 单体应用负责页面与 API，一个共享代码库中的 Worker 负责定时采集；SQLite/WAL 保存事件、评分、反馈和 Memory；LLM 只分析少量高潜候选。

# 0. 最终决策摘要
V1.0 的产品核心不是新闻聚合，而是面向个人注意力的技术事件决策系统。系统只做一个闭环：Watch → Collect → Event → Rank → Explain → Feedback → Memory → Rank Better。
| 领域 | 最终选择 | 理由 |
| 产品形态 | 单用户 Web 应用 | 先验证每天是否愿意用，不引入账户、支付和团队能力 |
| 应用架构 | 模块化单体 | Web、API、任务逻辑共用 TypeScript 模型与校验 |
| 数据库 | SQLite + WAL + FTS5 | 单用户吞吐足够，零运维，未来可迁移 PostgreSQL |
| 任务调度 | 系统 Cron + 独立 Worker 命令 | 不在 Web 进程内跑长任务，不引入 Redis/队列 |
| 事件去重 | 规则优先，LLM 辅助 | canonical URL、内容哈希、实体/类型/时间窗先过滤 |
| 历史检索 | 结构化查询 + FTS5 | V1.0 不引入向量数据库 |
| 部署 | 单 Docker 镜像 + 持久卷 | 本机或单台 VPS 即可运行 |


# 1. 产品目标与范围冻结
## 1.1 目标用户与核心结果
首位用户是关注 AI Coding、Agent、Memory、Computer Use、MCP 与 Agent Security 的程序员或独立开发者。每天投入 5–15 分钟，得到少量真正值得继续阅读或试用的变化。
每天自动完成采集、归一化、去重、评分和情报卡生成。
Today 默认最多展示 3 条 Must Read 和 5 条 Worth Knowing。
每条推荐都有原始证据、个性化原因、变化点和建议动作。
用户反馈必须在下一次排序中产生可解释影响。
系统记住的偏好和研究上下文必须可查看、修改和删除。
## 1.2 V1.0 范围
| 级别 | 能力 | 验收边界 |
| P0 | Watchlist | Topic、GitHub Repo、官方 RSS/页面；支持新增、暂停、删除 |
| P0 | Collectors | GitHub Release/Repo、RSS/Atom、官方网页变更 |
| P0 | Technology Event | 统一事实模型、证据关联、规则去重与聚类 |
| P0 | Scoring & Card | 分项评分、总分、Why/Difference/Action/Evidence |
| P0 | Today & Detail | 每日推荐、事件详情、来源追溯、反馈 |
| P0 | Memory | Interest、Entity、Research、Feedback 四类；可纠正和删除 |
| P0 | Operations | 来源健康、任务运行记录、失败重试、成本统计 |
| P1 | Daily Brief | 站内固定日报；Week 4 有余量时交付 |
| P1 | Radar | Topic 列表、近 7/30 天事件趋势；不做图谱 |


## 1.3 明确不做
多用户、注册登录、权限系统、团队协作、计费与订阅。
移动 App、浏览器插件、邮件/飞书/Telegram 分发。
Redis、Kafka、RabbitMQ、微服务、Kubernetes。
Vector DB、复杂 RAG、Knowledge Graph、Multi-Agent 自动研究。
社区全网抓取、论文、X、公众号和通用搜索。
由 LLM 无证据地生成趋势、事实或用户偏好。
## 1.4 默认运行参数
| 参数 | 默认值 | 说明 |
| Topic | 6 个 | AI Coding、AI Agent、Agent Memory、Computer Use、MCP、Agent Security |
| Watchlist | 10–20 个实体 | GitHub Repo、公司、模型或官方页面 |
| 来源 | 约 25 个 | 10 个 Repo + 10 个 RSS/Blog + 5 个 Changelog/Docs |
| 采集时间 | 每日 07:00 | Asia/Shanghai；失败后 10/30/120 分钟退避重试 |
| Today | 最多 8 条 | Must Read ≤3；Worth Knowing ≤5 |
| Raw 数据 | 保留 90 天 | 保留哈希、元数据和必要正文；事件与证据长期保留 |
| LLM 预算 | 默认 ≤10 元/天 | 达到硬上限后停止深度分析，但保留采集和规则评分 |


# 2. 用户体验与可执行规格
## 2.1 首次使用
选择 3–6 个默认 Topic，并为每个 Topic 设置普通或高优先级。
添加 10–20 个重点实体或来源；系统检查 URL 类型和可采集性。
设置不感兴趣内容和每日阅读预算，默认 10 分钟。
系统执行首次采集；若候选不足，明确展示空状态和来源健康，不用低质量内容填满配额。
## 2.2 每日使用
打开 Today，看到扫描量、候选事件量、最终推荐量和来源异常数。
先浏览 Must Read，再按需展开 Worth Knowing；每张卡 30–90 秒可完成决策。
进入 Event Detail 查看事实、差异、历史关联、证据和建议动作。
选择有用、不相关、收藏或稍后再看；不相关时可选原因。
下一次评分显示反馈带来的 reason code，例如‘降低 Topic 权重’或‘来源降噪’。
## 2.3 核心验收场景
| 场景 | Given | When | Then |
| 采集与事件化 | 已配置一个 Repo | 出现新 Release | 生成唯一 Event，至少一个 Evidence，保留 occurred_at/captured_at |
| 重复来源 | RSS 与 GitHub 指向同一变化 | 同批或跨批采集 | 合并为一个 Event，Evidence 增加，不重复占用 Today |
| 推荐 | Event 与高权重 Topic 相关 | 评分满足阈值 | 进入 Today，展示分项分数和 Why it matters |
| 负反馈 | 用户选择不相关并标注泛营销 | 下一批排序 | 同类信号降权；记录可撤销证据，不永久改写事实 |
| LLM 失败 | Provider 超时或 JSON 非法 | 深度分析阶段 | 重试一次后降级；保留事件，不生成无证据 Card |
| 来源失败 | 一个 Collector 连续失败 | Daily Job 执行 | 其他来源继续；健康页显示错误和 last_success_at |


# 3. 轻量技术架构
架构原则：一套代码、一个数据库、两个进程角色。Web 进程处理交互，Worker 进程处理批任务；二者共享领域代码和 SQLite 文件。
## 3.1 逻辑组件
| 组件 | 职责 |
| Web UI | Today、Event Detail、Watchlist、Memory、Source Health、Settings |
| Route Handlers | REST API、输入校验、领域服务调用、统一错误响应 |
| Worker CLI | collect、normalize、dedup、score、analyze、brief；由 Cron 调用 |
| Domain Services | 事件、评分、Memory、反馈、来源健康；不依赖页面实现 |
| SQLite | 事务数据、FTS5 索引、任务锁、评分快照和审计信息 |
| LLM Adapter | Provider 切换、结构化输出、预算、重试、Prompt/模型版本记录 |


## 3.2 数据流
Cron 启动 Worker，并在 job_run 表获取租约锁，防止重复执行。
Collector 使用游标、ETag 或 Last-Modified 拉取增量内容，写入 raw_item。
Normalizer 识别 Entity、Event Type、时间与事实，生成候选事件。
Deduplicator 按 canonical URL、内容哈希、实体/类型/时间窗聚类。
规则与轻量模型筛选候选；只对 Top N 调用强模型生成 Intelligence Card。
Scoring Service 结合用户兴趣、历史事件和反馈生成 score_snapshot。
Daily Selector 按阈值、配额和多样性规则生成 Today / Daily Brief。
反馈写入 evidence-backed Memory，下一次排序读取但不改写历史评分。
## 3.3 进程与部署
Web：`node server.js`，负责页面和 API；不执行长时间采集。
Worker：`node dist/worker.js daily`，由宿主机 Cron 或容器 Cron 每日执行。
数据库：单个 SQLite 文件挂载到持久卷，启用 WAL、foreign_keys 和 busy_timeout。
备份：每日任务结束后执行 SQLite online backup，保留最近 7 份。
远程访问：默认仅绑定 localhost；如部署 VPS，由 Caddy/反向代理提供 HTTPS 和基础认证。
# 4. 技术栈最终选择
| 层 | 选择 | 说明 |
| 语言 | TypeScript | 前后端共享类型；单语言降低维护成本 |
| Web/API | Next.js App Router + Route Handlers | 一个应用完成页面与 API，支持服务端渲染 |
| UI | React + Tailwind CSS | 快速实现信息密度较高的工作台界面 |
| 校验 | Zod | API、环境变量和 LLM JSON 共用 Schema |
| 数据库 | SQLite 3（WAL） | 零服务依赖；单用户吞吐足够 |
| ORM/迁移 | Drizzle ORM + drizzle-kit | SQL 清晰、类型轻量、迁移可审计 |
| 全文检索 | SQLite FTS5 | 支持历史事件和 Memory 关键词检索 |
| 调度 | 系统 Cron + Worker CLI | 避免 Web 内定时器和外部队列 |
| 采集 | 原生 fetch + RSS parser + HTML parser | 优先 API/RSS，网页只做必要变更检测 |
| 日志 | Pino 结构化日志 | 记录 job_id/source_id/event_id，便于本地排障 |
| 测试 | Vitest + Playwright | 领域逻辑、API 和关键用户路径 |
| 部署 | Docker + 单持久卷 | 开发机、NAS 或 VPS 均可运行 |


## 4.1 暂不采用的组件
PostgreSQL：多用户、并发写入或数据量明显增长后再迁移。
Redis/队列：单 Worker + 数据库租约锁可以满足 V1.0。
Vector DB：FTS5 与结构化 Topic/Entity 查询先覆盖主要历史检索。
独立 FastAPI 服务：会增加语言、部署和契约维护成本，V1.0 不需要。
changedetection.io：先用 ETag/Last-Modified/内容哈希实现最小网页变更检测。
# 5. 数据模型与存储设计
| 表 | 关键字段 | 说明 |
| profile | id, timezone, daily_budget, settings_json | 预留 profile_id='local'，不实现登录 |
| source | id, type, url, config, status, cursor | 采集配置与增量游标 |
| source_run | source_id, started_at, status, metrics, error | 来源健康与重试证据 |
| raw_item | source_id, external_id, hash, captured_at, payload | 90 天保留；唯一键保证幂等 |
| entity | type, name, aliases, canonical_url | Repo、公司、模型或页面 |
| event | entity_id, type, title, facts_json, occurred_at, status | 稳定的技术事件事实 |
| event_evidence | event_id, source_id, url, quote, confidence | 一个事件可有多个原始证据 |
| topic / event_topic | name, weight / event_id, topic_id, confidence | 显式主题关系 |
| score_snapshot | event_id, profile_id, dimensions, total, version | 评分不可覆盖，便于回放 |
| intelligence_card | event_id, what, why, difference, take, action | 与事实字段分离 |
| feedback | event_id, action, reason, created_at | 显式行为证据 |
| memory | type, content, evidence, confidence, expires_at | 可编辑、可撤销、可删除 |
| daily_brief | date, selected_event_ids, metrics, status | 固定每日产物 |
| job_run | job_type, lease_until, status, metrics, error | 任务锁、审计、恢复 |


## 5.1 关键约束
所有时间以 UTC 存储，API 返回 ISO 8601；展示按 profile.timezone 转换。
raw_item 使用 `(source_id, external_id)` 或 `(source_id, content_hash)` 唯一约束。
Event 与 Evidence 分离；来源增加、失效或修正不会覆盖事件历史。
评分与 Card 保存 model、prompt_version、schema_version 和 generated_at。
用户可编辑内容与系统推断分开存储；系统推断不能伪装成用户事实。
删除 Memory 后立即停止参与排序，并从后续备份周期中清除。
# 6. 采集、事件化与去重
## 6.1 Collector 合同
输入：source 配置、上次 cursor、抓取时间和预算。
输出：0..N 个 RawItem + 新 cursor + metrics；不得直接写 Event。
必须支持幂等重跑、超时、限流、指数退避和单来源失败隔离。
优先 GitHub API/RSS；网页仅抓公开内容，并尊重站点规则与速率限制。
每次运行记录 fetched、created、unchanged、failed 和 duration_ms。
## 6.2 去重顺序
精确去重：source + external_id、canonical URL、内容哈希。
规则聚类：相同 Entity + Event Type + 72 小时时间窗 + 版本号/关键词。
近似聚类：标题归一化与 FTS5 相似候选，仅比较小集合。
LLM 判断：只处理规则无法判断的候选对，并保存判断理由。
人工修正：允许 Merge / Split，修正结果写入规则回归测试。
# 7. 评分、推荐与 Intelligence Card
## 7.1 分项与总分
| 维度 | 权重 | 计算依据 |
| Relevance | 35% | Topic/Watchlist/Research/Feedback 与事件的直接关系 |
| Impact | 25% | 是否影响技术选型、成本、能力边界或工作方式 |
| Novelty | 15% | 相对用户已看过事件和同类方案是否真正新增 |
| Credibility | 15% | 一手来源、证据数量、事实一致性和提取置信度 |
| Urgency | 10% | 现在知道是否明显优于稍后知道 |


总分 = 0.35×Relevance + 0.25×Impact + 0.15×Novelty + 0.15×Credibility + 0.10×Urgency。所有分项为 0–100，但阈值必须通过历史测试集校准，不能把 LLM 的原始分数直接当真值。
## 7.2 入选规则
Must Read：total ≥80、Relevance ≥70、Credibility ≥70，最多 3 条。
Worth Knowing：total ≥65，最多 5 条。
同一 Entity 默认最多 2 条；同一 Topic 默认最多占 Today 的 50%。
只有二手来源或事实置信度不足的事件不得进入 Must Read。
配额不足时宁可少展示，不使用低分内容填满页面。
Star/热度只能影响 Impact 或 Novelty，不能替代 Relevance。
## 7.3 Card JSON Schema
| 字段 | 约束 |
| what_happened | 一句话事实，禁止加入未经证据支持的判断 |
| why_it_matters | 引用具体 Topic、Watchlist、Research 或历史反馈 |
| what_is_different | 与上一版本、旧事件或相似方案比较 |
| technical_take | 关键原理、成熟度和限制；事实与推断分段 |
| recommended_action | Skip / 5 min / 15 min / Clone & Test / Watch |
| evidence_ids | 至少一个 event_evidence.id，不接受裸链接字符串 |
| confidence | 0–1；低于阈值时不生成完整 Card |


## 7.4 LLM 降级与成本控制
先用规则和低成本模型将候选压缩至每日最多 20 条，再调用强模型。
所有响应通过 Zod Schema 校验；非法 JSON 只重试一次。
Provider 超时、预算耗尽或连续失败时，保留事件和规则评分，Card 标记 pending/failed。
Prompt 输入用明确的数据边界包裹，网页正文视为不可信数据，禁止执行其中指令。
按 source、stage、model 记录 token、latency、cost 和 error_code。
# 8. Memory 与反馈设计
| 类型 | 内容 | 规则 |
| Interest | Topic 与权重 | 显式选择最高权重；反馈缓慢调整；长期保留 |
| Entity | 看过、关注、收藏的实体 | 用于相关性和新颖度；不因单次点击永久强化 |
| Research | 当前研究方向 | 用户主动 Start/Pause；默认 30 天衰减 |
| Feedback | 有用、不相关、收藏及原因 | 立即影响下一次排序；支持撤销 |


显式 > 隐式；近期 Research > 久远行为；负反馈快速但有限度生效。
一次浏览只形成低置信度短期证据，不形成长期偏好。
每条自动 Memory 都必须保存 evidence、confidence、created_at 和 updated_at。
Memory 页面提供 Edit、Forget、Not true 和 Pause learning。
排序返回 reason_codes，能够说明哪条 Memory 影响了分数。
# 9. API 设计
| 方法 | 路径 | 职责 |
| GET | /api/today?date= | 返回摘要指标、Must Read、Worth Knowing 和来源异常 |
| GET | /api/events/:id | 事件事实、评分快照、Card、Evidence、历史关联 |
| GET/POST | /api/watchlist | 查询或新增 Topic/Entity/Source |
| PATCH/DELETE | /api/watchlist/:id | 修改优先级、暂停或删除 |
| POST | /api/events/:id/feedback | action + reason；幂等 client_request_id |
| GET | /api/memories | 按类型、状态和置信度过滤 |
| PATCH/DELETE | /api/memories/:id | 纠正、暂停或删除 |
| GET | /api/sources/health | 来源成功率、最后成功时间和最近错误 |
| GET | /api/jobs | 最近任务、阶段指标、成本和错误 |
| POST | /api/admin/jobs/:type/run | 本地管理操作；remote 模式要求 admin token |


## 9.1 API 统一约定
成功返回 `{ data, meta }`；失败返回 `{ error: { code, message, details, request_id } }`。
列表统一使用 cursor pagination；V1.0 默认 limit=20，最大 100。
所有写接口使用 Zod 校验；反馈接口支持 client_request_id 防止重复提交。
HTTP 状态使用 400/404/409/422/429/500/503，不把业务失败包装成 200。
API Schema 与领域类型放在共享模块，页面不得复制接口类型。
# 10. 安全、隐私与信任
| 风险面 | V1.0 控制 |
| Prompt Injection | 抓取正文始终视为数据；系统 Prompt 禁止执行来源中的指令；输出必须引用 Evidence |
| 凭据 | GitHub/LLM Token 只从环境变量读取；日志不输出 Header、Token 或完整敏感正文 |
| 网络 | 限制协议为 http/https；阻断 localhost、私网和云元数据地址，防止 SSRF |
| Memory | 可见、可编辑、可删除；删除后立即停止使用；系统推断与用户事实分离 |
| 远程访问 | 默认 localhost；remote 模式必须 HTTPS + 认证 + admin token |
| 审计 | 保存模型/Prompt/评分版本、Evidence 与 job_run，支持推荐回放 |
| 备份 | SQLite online backup；默认保留 7 天；备份与日志不得包含明文 Token |


# 11. 非功能预算
| 指标 | 目标 | 实现约束 |
| 采集成功率 | ≥95%/日（按启用来源计） | 单来源失败不阻塞整批 |
| 幂等性 | 同一批可安全重跑 | RawItem、Event、Feedback 均有唯一约束 |
| Today API | P95 <500ms | 不在请求内调用 LLM；读取预生成结果 |
| Event Detail | P95 <800ms | FTS5 历史关联限制候选数 |
| Daily Job | 25 个来源 <30 分钟 | 每阶段记录耗时；超时可断点续跑 |
| LLM 成本 | 默认 ≤10 元/天 | 硬上限；超限自动降级 |
| 可恢复性 | RPO 24h / RTO 2h | 每日备份，恢复流程可演练 |
| 重复事件率 | <5% | 按用户实际看到的 Today 计算 |



# 12. 4 周最终开发计划
## Phase 0 · 开工前 1 天
冻结 6 个 Topic、10–20 个实体、约 25 个来源和 Today 配额。
建立至少 60 条历史事件评测集：Must Read、Worth、Filtered 各有样本。
确定 LLM Provider、每日预算和远程访问方式。
创建仓库、环境变量模板、迁移基线、CI 和 ADR-001 技术选型记录。
| 时间 | 目标 | 主要交付 | 周验收 |
| Week 1 | 数据进来 | 项目骨架；SQLite/迁移；GitHub/RSS Collector；Source Health；RawItem/Event/Entity；幂等测试 | 无需 LLM 即可看到结构化事件流；单来源失败隔离；重跑不重复 |
| Week 2 | 情报可用 | Normalize/Dedup；Topic 分类；评分 v1；Card Schema；LLM Adapter；历史测试集评测 | 每日候选 ≤10；Must Read Precision ≥60%；所有推荐有 Evidence |
| Week 3 | 产品可日用 | Today、Detail、Watchlist、Feedback、任务与来源健康页；关键 E2E | 不看数据库即可完成每日使用；页面 10 分钟内浏览完 |
| Week 4 | Memory 与稳定性 | 四类 Memory；Ranking v2；Daily Brief；预算/备份/恢复；7 天试运行准备 | 有/无 Memory 排序明显不同且可解释；所有 DoD 检查通过 |


## 12.1 每周执行节奏
周一：冻结本周验收场景和测试数据，不临时扩范围。
周二至周四：按垂直切片实现，每个切片包含数据、服务、API、UI 和测试。
周五：运行回归、质量评测、成本统计和 Source Health 检查；更新风险清单。
任何新增功能只有在当前 Gate 达标后进入下一周，不以页面数量判断进度。
# 13. 测试与验证方案
| 层级 | 必须覆盖 |
| 单元测试 | URL 规范化、哈希、时间解析、评分、Memory 衰减、配额与多样性 |
| Collector 契约 | Fixture 驱动；分页、ETag、限流、超时、空结果、格式变化 |
| 数据库 | 迁移、唯一约束、事务、WAL 并发、任务租约、删除语义 |
| LLM Schema | 合法/非法 JSON、缺字段、无 Evidence、注入文本、Provider 超时 |
| 排序回归 | 固定事件集 + 固定画像；比较 score_snapshot 和入选结果 |
| API 契约 | 状态码、Zod 校验、分页、幂等、错误结构 |
| E2E | 配置来源 → 运行任务 → Today → Detail → Feedback → 次日排序 |
| 恢复演练 | 从备份恢复 SQLite，并验证来源、事件、Memory 与 Brief 完整 |


## 13.1 提交与发布前检查
format、lint、typecheck、unit test、API test、Playwright 关键路径、production build。
对历史评测集输出 Precision@3、Precision@8、重复率、无证据率和失败类型。
检查数据库迁移可从空库执行，并能在备份副本上恢复。
检查日志、环境变量和测试 Fixture 不包含 Token、Cookie 或个人敏感信息。
# 14. 成功指标与决策 Gate
| 指标 | 目标 | 定义 |
| 推荐量 | 每天 0–8 条 | 少于 8 条是允许的；禁止低质量填充 |
| Must Read Precision | Week 2 ≥60%；Day 30 ≥80% | Must Read 中被标记有用或收藏的比例 |
| 总体推荐有用率 | Day 30 ≥70% | 排除未反馈；同时报告反馈覆盖率 |
| 来源可追溯 | 100% | 每条展示至少一个原始 Evidence |
| 重复事件率 | <5% | Today 中被人工认定重复的比例 |
| 采集成功率 | ≥95% | 启用来源按日计算 |
| 每日阅读时间 | ≤15 分钟 | 首位用户自报 + 页面会话时长参考 |
| 个人留存 | 连续 30 天保持高频使用 | 未形成习惯则不进入 SaaS |


## 14.1 Gate
Gate A / Week 2：Must Read Precision <60% 时，停止扩 UI，优先修 Event、Dedup 和 Scoring。
Gate B / Week 4：无法稳定压到 0–8 条、推荐原因仍泛化或 Memory 不可解释时，不进入 Beta。
Gate C / Day 30：首位用户未形成使用习惯或总体有用率 <70% 时，不做多用户和付费。
# 15. Definition of Done
系统连续 7 天自动运行，无需手工补数据；失败来源清晰可见且可重试。
每天生成不超过 8 条 Today 推荐，允许因质量不足而少于配额。
100% 推荐包含原始 Evidence、Why it matters 和 Recommended action。
反馈能在下一批排序中产生可验证、可解释的影响。
四类 Memory 可查看、编辑、删除和暂停使用。
同一事件多来源不会重复展示，重复事件率低于 5%。
LLM 超时、非法输出或预算耗尽时系统可降级，不丢失采集结果。
备份与恢复流程完成一次实测；日志和制品无敏感信息。
核心测试、类型检查和生产构建全部通过，并保存实际命令结果。
开发者本人可以指出至少一个‘因为此前研究 X，所以今天推荐 Y’的真实案例。
# 16. 演进路线
| 触发条件 | 演进动作 |
| 并发用户 >10 或 SQLite 写锁成为瓶颈 | 迁移 PostgreSQL；保留 Repository/SQL 边界 |
| 任务量增大且单 Worker 超过 30 分钟 | 先按 source 分片并行，再评估轻量队列 |
| FTS5 无法满足历史语义检索 | 先启用 SQLite 向量扩展或 pgvector，避免独立 Vector DB |
| 个人 30 天 Gate 达标 | 进入 3–10 人 Beta，增加账户隔离和配置导入 |
| Beta 留存和推荐质量达标 | 再评估支付、分发、团队 Watchlist 和 Ask Radar |


# 17. 开工清单
创建单仓库 Next.js 项目，建立 `app/`、`modules/`、`db/`、`workers/`、`connectors/` 和 `tests/`。
提交 ADR-001：选择 Next.js + SQLite/WAL + Cron Worker，并记录迁移触发条件。
定义 Zod Domain Schema：Source、RawItem、Event、Evidence、Score、Card、Feedback、Memory。
建立迁移 0001、默认 profile='local'、6 个 Topic Seed 和 Source Fixture。
先完成 GitHub Release 垂直切片：采集 → Event → Today API → 最小页面 → 测试。
再接 RSS；网页变更只在前两类稳定后实现。
用历史评测集校准阈值，记录失败类型，不以主观 Demo 代替指标。
最终判断：V1.0 是否成功，只看能否连续稳定地把‘大量变化’压缩成‘少量值得行动的事件’，并且下一次推荐确实因为用户反馈而更准。功能数量不是成功标准。