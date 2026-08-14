# AI Tech Radar V1.0 设计方案评审意见

评审对象：`AI_Tech_Radar_V1.0_最终计划与设计方案.docx`（2026-08-06）
参照文档：`AI_Tech_Radar_PRD_v0.1.docx`
评审日期：2026-08-07

---

## 一、总体结论

**方案整体质量高，可直接作为执行基线；但开工前需补齐 5 处"已声明原则、未落地为可执行规则"的细节**（见第三节），否则 Week 2 / Week 4 Gate 验收时必然出现口径争议。

| 维度 | 评价 | 一句话说明 |
|---|---|---|
| 产品定位与范围 | ★★★★★ | 闭环清晰，"明确不做"坚决，与 personal-first 定位一致 |
| 架构选择 | ★★★★★ | 模块化单体 + SQLite/WAL + Cron Worker，选择全部匹配单用户吞吐假设 |
| 数据模型 | ★★★★☆ | Event/Evidence 分离、score_snapshot 不可变很好；部分语义（日期边界、重入）未定义 |
| 算法规则（评分/反馈/去重） | ★★★☆☆ | 方向正确但缺参数；反馈→排序的调整算法完全空白 |
| 工程计划与 Gate | ★★★★☆ | 节奏合理；评测集过小，不足以支撑 Gate 的统计意义 |
| 安全与隐私 | ★★★★☆ | 覆盖面广；凭据轮换与公网暴露细节需补充 |

**核心优点**：

1. **注意力决策的第一性原则贯彻到位**：每日 0–8 条上限、"宁可少展示不低质填充"、"热度≠相关"三处互相呼应，避免退化为新闻聚合器。
2. **Event-first + Evidence 可追溯**：Event/Evidence 分离、Card 禁止裸链接、输出必须引用证据，从结构上阻断 LLM 幻觉进入推荐。
3. **成本与降级路径明确**：LLM 预算硬上限 + 超限保留规则评分 + Card 标记 pending/failed，失败模式是提前设计好的而不是事后补救。
4. **Gate/DoD 量化、以指标而非页面数判断进度**，并明确用评测集校准阈值而非主观 Demo，比多数 MVP 方案成熟。
5. **演进触发条件具体**（SQLite→PG、FTS5→向量扩展、单 Worker→分片），"可迁移但不超前建设"真正落地。

---

## 二、与 PRD v0.1 的一致性问题

| # | 不一致点 | PRD v0.1 | V1.0 方案 | 处理建议 |
|---|---|---|---|---|
| D1 | 分层阈值 | Must Read ≥85；Worth 70–84 | Must Read ≥80；Worth ≥65 | 若是有意放宽校准，写入 ADR 并将阈值参数化（见 A1） |
| D2 | 网页变更检测 | 用户 URL 为 **P1** | 范围表列为 **P0**（官方网页变更） | §17 执行顺序已放最后；建议范围表注明"P0 但最后交付的切片，可降级延后" |
| D3 | 每日推荐量 | 5–10 条 | 0–8 条 | V1.0 更严格，合理；但引用 PRD Brief 结构时注意口径统一 |
| D4 | 数据库 | PostgreSQL | SQLite/WAL | V1.0 决策正确（单用户零运维），§4.1 已有迁移触发条件，无问题 |
| D5 | 评测集规模 | 30–50 条 | 60 条 | 均偏小，见 A6 |

---

## 三、开工前必须补齐的问题（P0，直接影响验收）

### A1. "Today" 的日期边界与事件归属日未定义
- 方案规定 UTC 存储 + 按 profile.timezone 展示，但 `/api/today?date=` 与 `daily_brief` 的**归桶日期**没有定义：按 Asia/Shanghai 日历日吗？`occurred_at` 为前一日 23:30 UTC（本地次日 07:30）的事件算哪天的 Today？
- 同理：昨天发生、今天采集才首次入库的事件，是否占用今天配额？
- **建议**：明确"Today 归桶日期 = profile.timezone 日历日，以 score_snapshot 生成日为准；occurred_at 原样展示，跨日时标注'发生于昨日'"。这是高频展示细节，不定会在 Week 3 联调时反复返工。

### A2. 冷启动回填（backfill）策略缺失
- 首次采集时 RSS/GitHub API 会返回大量历史内容，不加限制会导致首日 Today 被灌满，或被陈旧事件污染评分。
- **建议**：首次采集只接受最近 7 天内的事件并标记 `backfill=true`；backfill 事件只进历史库与评测集，不进当日 Today（或最多占用 Worth Knowing 名额）。写入 Week 1 验收标准。

### A3. 反馈→排序的调整算法完全空白
- 方案承诺"反馈在下次排序产生 reason code 可解释影响"，Week 4 Gate 正是"有/无 Memory 排序明显不同且可解释"，但权重调整步长、上下限、衰减、反馈撤销语义均未定义。这是产品护城河的核心，不应留到 Week 4 临场发挥。
- **建议**（最小可执行版本，供直接采纳）：
  - Interest 权重 w ∈ [0.2, 1.0]，初始值来自显式设置；
  - 有用 +0.03、不相关 −0.05（负反馈更快），clamp 上下限；单事件只调整其命中的最强 Topic；
  - 撤销反馈回滚对应 step（feedback 表记录 delta，支持 rollback）；
  - 来源降噪：同源累计不相关 ≥3 次 → Credibility 维度 ×0.8，可在 Source Health 页解除；
  - 每次调整生成 reason_code，score_snapshot 记录前后权重 diff。
- 这套规则在 Week 2 冻结，单元测试和排序回归才能写出来，Week 4 只是接入。

### A4. 规则降级评分（LLM fallback）没有 rubric
- DoD 要求"LLM 失败/预算耗尽时保留采集和规则评分"，但 Impact/Novelty 这类维度在纯规则模式下如何给 0–100 没有定义，降级后 Today 质量不可预期。
- **建议**：定义启发式映射表并做单元测试，例如：
  - Relevance = Topic 权重 × 关键词命中 × Watchlist 命中；
  - Impact = 事件类型基础分（release 60 / pricing_change 70 / breaking change 80）± 版本号大跳加成；
  - Credibility = 一手来源 80，每多一条证据 +5（上限 95），二手来源 50；
  - Novelty = 100 − 与近 30 天已见事件的 FTS5 相似度；
  - Urgency = 发布类 50，随天数衰减。
  - 规则评分仅用于候选筛选与降级展示；LLM 恢复后对未生成 Card 的事件补分析。

### A5. 已展示/已合并事件的重入规则未定义
- 事件昨天已进过 Today，今天又有新来源合并进来（evidence+1）或版本推进（facts 变化），是否再次占用配额？方案只写了"证据增加不重复占 Today"，未覆盖跨日重入。
- **建议**：仅证据增加不重入；facts 更新（新版本号/新能力）允许重入一次，卡片标 "Updated" 并引用上次推荐记录。

---

## 四、建议调整项（P1，不阻塞开工，但应在 Week 1 内定稿）

### A6. 评测集过小，Gate 缺乏统计意义
- 60 条评测集、Must Read 每天 ≤3 条，Week 2 Gate 的 "Precision ≥60%" 样本只有十几条，一条判断差异就能让 Precision 波动 10 个百分点，Gate 会失去裁决力。
- **建议**：离线评测集扩到 ≥100 条，分层构造：Must 25 / Worth 35 / Filtered 40（含媒体转述同质化内容、泛营销等反例）；Gate A 以离线 Precision@3 / Precision@8 + 重复率为主依据，线上反馈前两周只作辅助参考。

### A7. 网页变更检测的误报风险
- ETag/内容哈希对动态页面（时间戳、CSRF token、A/B 文案）误报率高，误报会消耗 LLM 预算并污染 Today。
- **建议**：网页 collector 做三层防护——正文文本抽取 + 模板区域过滤（导航/页脚/时间组件）+ 连续两次检测到变化才确认入库；确认期内不触发 LLM 分析。与 D2 对应，放最后一个切片实现。

### A8. SQLite/WAL 工程细节
- `busy_timeout` 未给值（建议 5000ms，API 层对 SQLITE_BUSY 做一次重试）；
- WAL 单写者：Worker 批量写入时 Web 写会排队，Worker 应按来源小批量提交事务，避免跨整个 job 的长事务；
- FTS5 建议用 external-content 表与 event 同步，并把 rebuild 策略（人工 merge/split 后离线重建）写入方案；
- `node dist/worker.js` 与 Next.js standalone 是两套构建产物：明确 worker 用 tsup/esbuild 单独打包、迁移在容器启动时先于 Worker 执行；better-sqlite3 是原生模块，Dockerfile 需要处理编译（node-gyp 或 prebuild）。

### A9. 安全细节补充
- remote 模式 admin token 的生成、存放与轮换未定义（建议 openssl rand 生成、仅环境变量注入、Settings 页支持重新生成）；
- Caddy basic auth 暴露公网时，API 写接口仍应校验 Origin/SameSite 防 CSRF；
- "删除 Memory 后从后续备份周期清除"实际靠 7 天备份轮换实现，建议写明，避免被读成"立即从所有备份抹除"。

### A10. 其他小项
- GitHub API 未认证 60 req/h，10 个 repo 够用，但方案应写明 **GITHUB_TOKEN 为必备环境变量**；
- 成本统计需要 per-provider 单价配置（input/output 每百万 token 单价），建议 `config/pricing.json`，否则"¥10/天"无法精确结算；
- Today API P95 <500ms：直接读 daily_brief 物化结果即可达标，接口实现明确读该表，不做运行时重算。

---

## 五、补充的风险点（方案未提及）

| 风险 | 说明 | 缓解 |
|---|---|---|
| 首位用户=评测者的确认偏差 | 开发者给自己做的推荐打分，Precision 会系统性高估 | Week 4 邀请 1–2 位同事对同一批 Today 盲评，仅用于校准口径，不进 Gate |
| 去重"误合并"成本高于"漏合并" | 72h 窗口内同 repo 的 hotfix 与 feature release 可能被误并 | facts_json 保持独立可拆分；每次人工 Split 生成回归测试用例（方案已写，强调执行） |
| reason code 沦为装饰 | 若 reason code 只是日志文案而非真实参与计算的痕迹，"可解释"承诺落空 | 验收标准：每个 reason_code 必须能回溯到一次具体的权重/降噪参数 diff |

---

## 六、评审结论

**同意按此方案开工**。建议：

1. A1–A5 在 Phase 0 以"补充决策表"形式写入文档（半天工作量）；
2. A6 评测集扩充列入 Phase 0 的一天之内（60 → 100 条）；
3. A3 的反馈调整算法在 Week 2 冻结为代码前完成评审；
4. 本次交付的可交互原型按方案 §2 / PRD §11 的信息架构实现，可直接作为 Week 3 UI 开发的视觉与交互参照。
