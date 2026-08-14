PRODUCT DESIGN DOCUMENT
AI Tech Radar
有长期记忆的个人 AI 技术情报 Agent · V0.1 产品设计 + 开发计划
产品阶段：V0.1 · Personal-first MVP
目标用户：关注 AI 技术的程序员 / 独立开发者；首位用户就是开发者本人
核心目标：少看很多，但不错过真正重要的 AI 技术变化
建议周期：4 周完成可日用版本；第 5–6 周用于稳定性与小范围 Beta
文档日期：2026-08-06
| 一句话定义  持续监控 GitHub、AI 模型、官方博客/文档和用户指定来源，从海量变化中筛出与用户真正相关的少量技术事件，解释“发生了什么、为什么重要、值不值得花时间”，并通过反馈逐步建立个人技术 Memory。 |


# 0. 执行摘要
AI Tech Radar 不做“又一个 AI 新闻聚合站”。V0.1 的任务是建立一个可每天使用的闭环：Watch → Detect → Rank → Explain → Feedback → Remember → Rank Better。第一阶段先解决个人信息过载与技术跟踪断裂；在验证推荐质量之后，再考虑多用户和收费。
| 决策项 | V0.1 结论 | 理由 |
| 产品形态 | 个人技术情报 Agent | 避免新闻站同质化，突出个性化与长期记忆 |
| 首要场景 | 每日 AI 技术情报 + 重点项目跟踪 | 高频、可验证、开发者本人可作为首个用户 |
| 第一数据核心 | Event，而不是 Article | 便于去重、关联、时间演化与 Memory |
| 第一智能核心 | Relevance + Importance + Why it matters | 必须回答“为什么对我重要” |
| 第一护城河 | 个人长期 Memory 与反馈历史 | 时间越久，推荐越贴合用户 |
| 商业化 | V0.1 不做支付 | 先验证日用价值与推荐命中率 |


# 1. 产品问题与机会
## 1.1 用户今天怎么解决问题
目标用户每天在 GitHub、官方 Blog、模型平台、技术社区、RSS 和搜索引擎之间切换。信息获取并不困难，困难的是判断优先级、建立上下文、追踪变化，以及几周后还记得“之前看到过什么、当时为什么重要”。
信息源分散：同一技术方向的变化散落在多个网站。
噪声巨大：热门不等于相关，Release 里多数变化与个人当前工作无关。
上下文丢失：今天看到一个项目，数周后很难和此前研究建立联系。
重复阅读：不同媒体重复转述同一件事，却缺乏事件级去重。
缺少决策：摘要告诉用户“是什么”，但没有告诉用户“要不要花时间”。
## 1.2 产品机会
| 核心机会  从“信息发现”转向“注意力决策”。用户不是缺更多信息，而是缺一个知道自己关注什么、正在研究什么、以前看过什么的长期技术分析师。 |


# 2. 产品定位
## 2.1 产品承诺
每天扫描大量 AI 技术变化，最终只把少量真正值得关注的事件放到用户面前；每条事件都必须可追溯到原始来源，并说明为什么与用户相关、建议投入多少时间。
## 2.2 核心工作（Jobs to be Done）
| 用户想完成的工作 | 产品必须给出的结果 |
| 今天有什么值得看？ | 不超过 5–10 条的 Today Brief |
| 这个项目到底是什么？ | 一句话定位 + 原理 + 生态位置 |
| 它和我之前看的有什么不同？ | 与历史 Entity / Research Thread 关联 |
| 这次 Release 哪些和我有关？ | 变化提取 + 个性化优先级 |
| 这个方向最近是不是在升温？ | 趋势信号 + 证据事件 |
| 我之前研究过什么？ | 可查询、可纠正的个人 Memory |


## 2.3 明确不是什么
不是通用搜索引擎。
不是全网 AI 新闻门户。
不是“把 100 篇文章总结成 20 篇”的摘要工具。
不是第一天就做复杂 Knowledge Graph / Multi-Agent 的研究项目。
不是第一阶段就做企业协作、支付、公众号分发、移动 App。
# 3. 目标用户与首个 Persona
| 维度 | 定义 |
| 身份 | AI 工程师、后端/全栈程序员、独立开发者、技术型产品创作者 |
| 行为 | 每天或每周主动看 GitHub、官方 Blog、Release、模型更新 |
| 痛点 | 信息太多、重复、缺少优先级；对旧信息没有长期上下文 |
| 愿望 | 10–15 分钟掌握真正重要变化，必要时再深入 |
| V0.1 首位用户 | 开发者本人：重点关注 AI Coding、Agent、Memory、Computer Use、MCP、Security |


| 首要原则  V0.1 先做到“自己连续 30 天愿意每天打开”。如果首位用户都不愿意用，就不进入 SaaS 化。 |


# 4. V0.1 用户体验闭环
## 4.1 首次进入
选择 5–10 个关注 Topic，例如 AI Agent、AI Coding、Agent Memory、Computer Use、MCP。
添加 5–20 个重点 Entity：GitHub Repo、公司、模型或 URL。
选择不感兴趣内容：泛营销、纯融资、AI 绘画等。
设置 Daily Brief 时间；V0.1 可先仅站内展示，不强依赖邮件推送。
## 4.2 每日使用
| 步骤 | 用户看到什么 | 系统要完成什么 |
| 1. 打开 Today | “扫描 N 条，建议关注 6 条” | 采集、去重、事件化、评分 |
| 2. 浏览 Must Read | 每条 30–90 秒可判断 | 给出 Why it matters 与建议动作 |
| 3. 深入一条 | 原始来源 + 技术分析 + 历史关联 | 检索相关 Memory 与 Entity |
| 4. 反馈 | 有用 / 不相关 / 收藏 | 写入反馈与偏好证据 |
| 5. 次日 | 推荐略有改善 | 更新 Relevance 与 Memory |


# 5. 信息源与采集边界
| Source | V0.1 采什么 | 方式 | 优先级 |
| GitHub | Repo / Release / Star / README 重要变化 | 官方 API + Watchlist | P0 |
| 官方 AI 来源 | Blog / Changelog / Docs / Pricing | RSS / HTML change | P0 |
| 模型平台 | 新模型、价格、能力、上下文等 | 公开 API / RSS | P0 |
| 用户 URL | 指定文档、产品页、Release 页 | changedetection 类抓取 | P1 |
| 技术 RSS | 高质量工程博客 | RSS | P1 |
| 社区信号 | HN / Reddit / GitHub Discussion | 后续增加 | P2 |
| 论文 / X / 公众号 | 暂缓 | 非 V0.1 | Out |


## 5.1 来源原则
优先一手来源；媒体转述只作为补充信号。
所有推荐必须保留 source_url、source_type、captured_at。
同一事件多个来源必须聚类，不要重复占用用户注意力。
抓取失败不是“没有变化”；必须记录采集健康状态。
# 6. 核心数据单位：Technology Event
V0.1 内部核心不是文章，而是“技术实体在某个时间发生的一件变化”。文章、Release、README 或 Docs 只是 Event 的证据来源。
| 字段 | 含义 | 示例 |
| entity_id | 变化属于谁 | Claude Code / 某 GitHub Repo |
| event_type | 事件类型 | release / pricing_change / launch / docs_change |
| occurred_at | 事件发生时间 | 2026-08-06T... |
| title | 标准化标题 | 项目发布新 Agent Memory 能力 |
| facts | 事实性变化 | 版本、before/after、新增能力 |
| topics | 主题标签 | Agent Memory / MCP |
| evidence | 证据来源 | GitHub Release + Docs |
| novelty_key | 去重/聚类键 | entity + event type + semantic hash |
| confidence | 事实提取可信度 | 0–1 |


# 7. Intelligence Pipeline
## 7.1 管线目标
让昂贵的 LLM 深度分析只发生在少量候选事件上。先用结构化规则和便宜模型完成采集、清洗、去重、基础分类，再把高潜事件交给深度分析。
| 阶段 | 输入 → 输出 | 关键要求 |
| Collect | Source → Raw Item | 稳定、可追溯、可重试 |
| Normalize | Raw Item → Candidate Event | 统一时间、实体、来源 |
| Deduplicate | Candidates → Event Cluster | 同一新闻不重复推荐 |
| Extract | Cluster → Technology Event | 事实与观点分离 |
| Score | Event + User → Scores | 相关性与重要性分开 |
| Analyze | Top Events → Intelligence Card | 解释 why / difference / action |
| Deliver | Cards → Today / Brief | 默认少量，高精度 |
| Learn | Feedback → Memory | 可解释、可撤销 |


# 8. 情报评分系统
第一版不训练模型，采用规则 + LLM 结构化打分。避免简单做一个乘法黑盒；UI 展示总分，但内部保留分项，方便调试。
| 维度 | 问题 | 建议权重 |
| Relevance | 与用户当前兴趣/研究/Watchlist 有多相关？ | 35% |
| Impact | 对技术选择或工作方式的潜在影响？ | 25% |
| Novelty | 相对用户历史是否真的新？ | 15% |
| Credibility | 来源和证据是否可靠？ | 15% |
| Urgency | 现在知道是否比以后知道更有价值？ | 10% |


建议总分 = 0.35×Relevance + 0.25×Impact + 0.15×Novelty + 0.15×Credibility + 0.10×Urgency。所有分项统一到 0–100。
| 总分 | 默认层级 | UI 行为 |
| 85–100 | Must Read | Today 顶部，默认展开摘要 |
| 70–84 | Worth Knowing | Today 次级列表 |
| 50–69 | Related | 折叠，不占主注意力 |
| <50 | Filtered | 默认不展示，仅用于审计/调参 |


| 评分底线  “热门”不能直接等价于“相关”。Star 暴涨可以提高 Impact/Novelty 信号，但如果与用户研究完全无关，最终仍应被过滤。 |


# 9. Intelligence Card 规范
每个进入 Today 的 Event 必须生成同一结构，用户在 30–90 秒内即可决定是否继续深入。
What happened：一句话说明发生了什么。
Why it matters to you：引用用户当前 Topic、Research Thread、Watchlist 或历史反馈解释相关性。
What is different：与旧版本/相似项目/已有方案相比的新变化。
Technical take：关键技术原理或实现差异，避免简单复述 README。
Recommended action：Skip / 5 min / 15 min / Clone & Test / Watch。
Evidence：原始来源链接、时间和可信度。
# 10. Memory 设计：V0.1 只做四类
Memory 的目标不是“把所有文本向量化”，而是让下一次推荐拥有个人上下文。每条自动形成的 Memory 都必须有 evidence、confidence、created_at / updated_at，并允许用户纠正或删除。
| Memory 类型 | 记什么 | 产生方式 | 用途 |
| Interest | 长期关注 Topic 及强度 | 显式选择 + 反馈累积 | Relevance |
| Entity | 看过/收藏/关注的项目、公司、模型 | 阅读与 Watchlist | Novelty / 关联 |
| Research | 当前正在研究的方向 | 用户 Start Research | 短期高权重 |
| Feedback | 有用 / 不相关 / 收藏及原因 | 用户动作 | 纠正推荐 |


## 10.1 Memory 更新规则
显式 > 隐式：用户主动关注的权重高于一次点击。
近期 > 久远：Research Memory 具有时间衰减。
负反馈必须快速生效，避免连续推荐同类噪声。
不要因为单次浏览就永久推断“长期偏好”。
事实 Memory 与偏好 Memory 分开；LLM 的推测不能伪装成用户事实。
所有用户可见 Memory 提供 Edit / Forget / Not true。
# 11. 信息架构与页面设计
| 页面 | 核心问题 | V0.1 必要内容 |
| Today | 今天我该看什么？ | Must Read、Worth Knowing、压缩统计、反馈 |
| Event Detail | 为什么值得看？ | 技术分析、历史关联、证据、建议动作 |
| Watchlist | 我让系统盯什么？ | Topics、Repos、Companies、Models、URLs |
| Radar | 我关注的技术方向在怎么变化？ | Topic 热度、近期 Event、关注实体 |
| Memory | AI 记住我什么？ | Interest / Entity / Research / Feedback 管理 |
| Settings | 如何控制采集与输出？ | Brief、阈值、来源健康、模型设置 |


## 11.1 Today 页面
页面顶部只显示三件事：扫描量、相关事件量、最终推荐量。默认信息流严格控制在 5–10 条；Related 内容折叠。每张卡片必须显示总分、推荐原因、来源和动作。
| 区块 | 内容 | 验收标准 |
| Summary | 扫描 N → 相关 M → 推荐 K | 用户一眼知道系统替自己过滤了多少 |
| Must Read | 85+ 事件 | 默认不超过 3–5 条 |
| Worth Knowing | 70–84 | 默认不超过 5 条 |
| Feedback | 有用 / 不相关 / 收藏 | 单击完成，不打断阅读 |
| Others | 50–69 折叠 | 不抢占首页注意力 |


## 11.2 Event Detail 页面
事件事实与时间线。
Why this matters to you。
与已有 Entity / 历史 Event 的对比。
技术分析：原理、差异、成熟度。
原始来源，不允许只有 AI 结论。
Recommended action 与预计阅读投入。
## 11.3 Radar 页面
Radar 不追求复杂图谱可视化。V0.1 用 Topic 列表 + 趋势 + 近期重要事件即可；例如 Agent Memory ↑、AI Coding →、Computer Use ↑。趋势必须能点开看到支撑它的 Event，而不是 LLM 凭空判断。
# 12. Daily Brief 输出规范
Daily Brief 是固定产物，不等于把 Today 页面全文发出去。目标阅读时间 5–10 分钟。
| 区块 | 上限 | 内容 |
| Must Read | 3 条 | 最重要变化 + 为什么与你相关 |
| Worth Knowing | 5 条 | 一句话摘要 + 建议动作 |
| Trend Signal | 1 条 | 有至少 3 个 Event 支撑时才出现 |
| Watchlist Changes | 若干 | 用户明确关注实体的 Release / 价格 / Docs 变化 |
| Ignored | 不展开 | 告诉用户过滤量即可 |


# 13. 功能需求优先级
| ID | 需求 | 优先级 | 验收 |
| F-01 | Topic / Repo Watchlist | P0 | 可新增、删除、暂停 |
| F-02 | GitHub Release / Repo Collector | P0 | 稳定生成 Raw Item 与来源 |
| F-03 | RSS / Official Source Collector | P0 | 定时拉取、去重、失败可见 |
| F-04 | Technology Event Normalize | P0 | 统一 schema，可聚类 |
| F-05 | Relevance / Importance Score | P0 | 输出分项与原因 |
| F-06 | Today Feed | P0 | 按阈值分层展示 |
| F-07 | Intelligence Card | P0 | 含 Why / Difference / Action / Evidence |
| F-08 | 有用 / 不相关 / 收藏 Feedback | P0 | 写入并影响后续排序 |
| F-09 | Memory Page | P1 | 可查看、编辑、删除 |
| F-10 | Research Thread | P1 | 可创建并挂接 Event/Entity |
| F-11 | Radar | P1 | Topic 趋势有证据可追溯 |
| F-12 | Daily Brief | P1 | 每日生成固定摘要 |
| F-13 | Ask Radar | P2 | V0.2 再做 |
| F-14 | 多用户 / 支付 / Team | Out | V0.1 不做 |


# 14. 非功能需求与信任设计
## 14.1 可追溯性
100% 的推荐卡片至少有一个原始来源。
LLM 生成的推断必须和事实字段分开。
趋势判断必须能展开查看支撑事件。
## 14.2 稳定性
Collector 有 last_success_at、last_error 和 retry。
同一源失败不能阻塞整批 Daily Brief。
重复采集必须幂等。
## 14.3 隐私与 Memory 控制
Memory 默认只用于个性化，不对其他用户共享。
用户能看到系统记住了什么。
用户能纠正、删除、暂停学习。
未来导入 GitHub Stars / 浏览历史等敏感数据时必须单独授权。
# 15. 概念数据模型
| 对象 | 关键字段 | 关系 |
| Source | type, url, health, schedule | 产生 RawItem |
| RawItem | source, content_hash, captured_at | 归一化为 Event |
| Entity | type, name, aliases, canonical_url | 拥有 Event |
| Event | type, facts, occurred_at, evidence | 关联 Topic / Entity |
| Topic | name, parent, keywords | 关联 UserInterest / Event |
| UserInterest | topic, weight, source, updated_at | 参与 Relevance |
| Feedback | event, action, reason | 更新 Memory / 排序 |
| ResearchThread | topic, status, started_at | 聚合 Event / Entity |
| Memory | type, content, evidence, confidence | 提供个性化上下文 |
| DailyBrief | date, selected_event_ids | 固定每日输出 |


| V0.1 数据策略  PostgreSQL 足够。先不要引入专门 Vector DB；只有当“历史语义检索”成为明确瓶颈，再增加 pgvector 或外部向量能力。 |


# 16. 推荐的 V0.1 技术边界
这不是最终架构，只是为了让 4 周计划可落地。技术选择优先“熟悉、简单、可调试”。
| 层 | 建议 | 备注 |
| Web | Next.js | Today / Detail / Watchlist / Memory / Radar |
| API | FastAPI 或 Next.js Server | 选开发者最熟的一种，不做微服务 |
| DB | PostgreSQL | Events + Memory + Feedback 统一存储 |
| Jobs | Cron / 单一 Worker | V0.1 无需复杂队列 |
| GitHub | GitHub REST API | Repo / Release / Stats |
| Web Change | changedetection.io 或轻量自建 | 仅用于无 API/RSS 来源 |
| LLM | 可切换 Provider | 结构化输出、低成本模型预筛 + 强模型分析 |
| Deploy | Docker Compose | 单机优先 |


# 17. 成功指标与 V0.1 Gate
| 指标 | 目标 | 为什么 |
| 推荐数量 | 5–10 / 天 | 保护注意力 |
| Must Read Precision | ≥80% 被认为有用 | 最核心质量指标 |
| 总体推荐有用率 | ≥70% 有用/收藏 | 验证 relevance |
| 来源可追溯 | 100% | 建立信任 |
| 重复事件率 | <5% | 避免信息疲劳 |
| 每日阅读时间 | ≤15 分钟 | 证明节省时间 |
| 30 天个人留存 | 开发者本人愿意持续使用 | 进入 Beta 的前置 Gate |


# 18. 开发 Plan：4 周 MVP + 2 周 Beta
## Phase 0 · 0.5–1 天：冻结范围
确定第一批 10–20 个 Watchlist 实体。
确定第一批 5–8 个 Topic taxonomy。
确定 Today Card 的固定字段与评分阈值。
建立测试集：人工挑选 30–50 条“应该推/不该推”的历史事件，用于后续评估。
## Week 1 · 数据进来：Collector + Event
| 任务 | 交付 | Done 标准 |
| GitHub Collector | Repo / Release 原始数据 | 定时拉取、幂等、可重跑 |
| RSS Collector | 官方 Blog / Changelog | 至少 10 个稳定源 |
| Source Health | 采集状态 | 失败可见、有时间戳 |
| Normalize | Technology Event schema | 不同 Source 进入同一事件模型 |
| Dedup v1 | hash + entity + event type | 明显重复事件合并 |


| Week 1 验收  不用 AI 也能看到一条结构化的“技术事件流”，每条都有 Entity、Event Type、时间和原始来源。 |


## Week 2 · Intelligence：从 100 条压到 5–10 条
| 任务 | 交付 | Done 标准 |
| Topic Classifier | 事件主题 | 可命中首批 Topic |
| Scoring v1 | 5 个分项 + 总分 | 分数和解释可调试 |
| Analysis Prompt | Intelligence Card JSON | 稳定输出 Why / Difference / Action |
| Today API | 分层结果 | Must Read / Worth / Related |
| 人工评测 | 历史测试集结果 | 记录 precision 与失败类型 |


| Week 2 验收  每天自动生成不超过 10 条的候选情报；开发者人工检查时，至少大部分“Must Read”确实值得看。 |


## Week 3 · 产品可用：Today + Detail + Feedback
| 任务 | 交付 | Done 标准 |
| Today UI | 每日情报首页 | 10 分钟内浏览完 |
| Event Detail | 深度分析页 | 可追溯历史与来源 |
| Watchlist UI | 关注管理 | 新增/暂停/删除 |
| Feedback | 有用 / 不相关 / 收藏 | 反馈立即落库 |
| Daily Brief | 站内日报 | 每天固定生成 |


| Week 3 验收  停止依赖数据库/日志查看结果，开始真正像普通用户一样每天打开网页使用。 |


## Week 4 · Memory：让第二天比第一天更懂用户
| 任务 | 交付 | Done 标准 |
| Interest Memory | Topic 权重 | 显式关注 + feedback 更新 |
| Entity Memory | 看过/收藏实体 | 参与 Novelty |
| Research Thread | 当前研究主题 | 可 Start / Pause |
| Memory Page | 可见可改 | Edit / Forget / Not true |
| Ranking v2 | Memory-aware relevance | 能展示“为什么推荐给你” |


| Week 4 验收  同一批事件对“有 Memory”和“无 Memory”两种用户画像得到明显不同且可解释的排序。 |


## Week 5–6 · 小范围 Beta（只有 V0.1 达标才做）
找 3–10 个和首位用户类似的程序员试用。
只做最小账户隔离，不急着支付。
记录每个用户的推荐有用率、误推原因和缺失信息源。
修 Collector 健壮性、成本、性能和 Prompt 稳定性。
决定是否进入 V0.2；如果核心命中率不够，继续修 Intelligence，不增加花哨功能。
# 19. 任务拆分与优先级 Backlog
| Epic | P0 | P1 | 以后 |
| Collect | GitHub、RSS、官方源 | 用户 URL | 社区/论文/X |
| Intelligence | Event、去重、评分、Card | 趋势聚类 | 预测/自动调研 |
| Experience | Today、Detail、Watchlist | Radar、Brief | 浏览器插件/移动端 |
| Memory | Interest、Entity、Feedback | Research Thread | Temporal Graph / Ask Radar |
| Platform | 单用户、Docker、日志 | 基础账户隔离 | Billing / Team / RBAC |


# 20. 风险与应对
| 风险 | 表现 | V0.1 应对 |
| 做成新闻聚合器 | 内容多但每天不想开 | 首页强制 5–10 条；提高 Precision |
| LLM 摘要同质化 | 只是复述 README | Card 强制 Why / Difference / Action |
| Memory 污染 | 错误偏好长期影响推荐 | 证据、置信度、可纠正、时间衰减 |
| 采集范围失控 | 不停接平台 | V0.1 只四类数据源 |
| 成本失控 | 所有原文都强模型处理 | 规则/便宜模型预筛，Top Event 深析 |
| 趋势幻觉 | AI 凭感觉说“正在升温” | 至少 3 个可追溯 Event 作为证据 |
| 个人好用但别人不用 | 过拟合首位用户 | Week 5–6 小 Beta 验证 |


# 21. 决策 Gate 与后续路线
## Gate A · Week 2
如果 Must Read 人工命中率明显低于 60%，停止做 UI 扩展，优先修 Event、去重与 Scoring。
## Gate B · Week 4
如果产品不能稳定把每日信息压到 5–10 条，或者推荐原因仍很泛，不进入多用户。
## Gate C · Day 30
如果开发者本人没有形成每天/高频使用习惯，不做支付和 SaaS 化；先找出“为什么仍然要自己刷 GitHub/新闻”。
## V0.2 候选
Ask Radar：询问个人技术历史。
Research Thread 自动技术地图。
GitHub Stars / OPML 导入辅助冷启动。
社区信号（HN / Reddit / GitHub Discussions）。
更细的模型价格/能力变化。
3–10 人 Beta 的账户隔离与配置。
## V1 候选
正式多用户。
Pro 订阅。
团队 Watchlist / Shared Research。
邮件 / Telegram / 飞书等分发。
可导出个人 Technology Memory。
# 22. 开工前必须回答的 8 个问题
首批 Topic 到底是哪 5–8 个？
首批必须监控的 10–20 个 Repo/Company/Model 是哪些？
什么条件才叫“Must Read”？给出 10 个正例、10 个反例。
哪些信息即使很热门也不应该推荐？
Intelligence Card 最多允许多长？
用户标记“不相关”后，系统应该仅降低此 Event，还是降低对应 Topic / Source？
Research Thread 是用户主动开启，还是系统可建议但需确认？
每天自己愿意给这个产品多少阅读时间：5、10 还是 15 分钟？
# 23. Definition of Done：V0.1 真正完成的标准
系统连续 7 天自动采集，不需要手动补数据。
每天能生成 5–10 条以内的 Today 推荐。
每条推荐都有原始证据、Why it matters、建议动作。
Must Read 有用率达到约 80%，总体推荐有用率达到约 70%。
有用 / 不相关 / 收藏反馈会影响后续排序，而不是只存起来。
Memory 对用户可见、可编辑、可删除。
能指出一个“因为你之前研究过 X，所以今天推荐 Y”的真实案例。
开发者本人连续使用，明显减少无目的刷 GitHub/技术新闻的时间。
| 最终判断  V0.1 的成功不是“功能都做完”，而是形成一个可重复的个人价值闭环：系统替你发现 → 只挑少数重要变化 → 解释为什么与你相关 → 记住反馈 → 下一次推荐更准。 |


# 附录 A · V0.1 首批 Topic 建议
| Topic | V0.1 建议 | 说明 |
| AI Coding | P0 | Codex / Claude Code / coding agent |
| AI Agent | P0 | Agent framework / runtime / orchestration |
| Agent Memory | P0 | 长期记忆、检索、用户 Memory |
| Computer Use | P0 | 浏览器/桌面/执行环境 |
| MCP / Protocol | P0 | Agent 工具与上下文协议 |
| Agent Security | P0 | Agent 安全、自动检测、sandbox |
| LLM / Model | P1 | 模型发布、价格、能力变化 |
| RAG | P1 | 只保留高影响变化，不泛抓 |


# 附录 B · 外部能力参考
以下用于实现阶段核对能力边界，不构成产品依赖锁定：
GitHub Notifications / Watching: https://docs.github.com/en/subscriptions-and-notifications/
GitHub REST Metrics: https://docs.github.com/en/rest/metrics/statistics
OpenRouter Models API: https://openrouter.ai/docs/guides/overview/models
Hugging Face Hub: https://huggingface.co/docs/hub/index
changedetection.io API: https://changedetection.io/docs/api_v1/index.html