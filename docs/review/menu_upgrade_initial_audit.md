# 主菜单升级 · 初审报告（menu_upgrade_initial_audit）

> 日期：2026-10-31 ｜ HEAD：`1a1df2e`（工作区干净）｜ 代码规模：46 个 .ts，测试 349 PASS
> 目的：在改任何代码前，先确认"继续游戏 / 历史对局"需要哪些真实数据、当前缺什么、会碰到哪些坑。

## 1. Git 与工作区

| 项 | 值 |
|---|---|
| 分支 | `main` |
| HEAD | `1a1df2e`（已推送 origin/main） |
| 工作区 | 干净（`git status --porcelain` 为空） |
| 与交付 ZIP 的差异 | 交付包 `crazy_pigeon_king_stage3_final_20261031_1451.zip` 由 commit `49a929a` 构建；之后只有文档与目录整理（`fad15f4`/`3f901b0`/`1a1df2e`），**代码无差异** |

## 2. 主菜单现状

- 实现：`ui/MenuScreens.buildMenu`（约 70 行），`GameRoot.showMenu` 调用。
- 结构：标题 + 开始游戏（CTA）+ 玩法说明 + 图鉴/成就/设置 三个次级按钮；背景 `home-bg-360x640` + 上下暗角。
- 坐标：全部按 `view.getVisibleSize()` 与 `safeTop()/safeBottom()` 换算（`at()`），没有继续游戏/历史入口。
- 结论：**需要改造签名与布局**，新增"继续游戏卡片 + 历史对局"入口。

## 3. 存档系统现状

| 能力 | 现状 |
|---|---|
| 永久进度 | `engine/Save.ts` + `game/Progress.parseSave`（本轮刚补全：难度/解锁/图鉴/角色通关/偏好/徽章） |
| 本局状态 | **完全不存在**（RunState 只在内存里，进程被杀即丢） |
| 中断恢复 | **不支持**：`GameRoot.confirmQuit` 文案就是"本局进度会丢失" |
| 存档版本 | 只有隐含版本（字段级兼容），没有 `version` 字段 |
| 写入时机 | 结算/成就/设置等离散点；无生命周期钩子 |

## 4. 历史对局现状

| 能力 | 现状 |
|---|---|
| 已有数据 | `game/Telemetry.ts`：`RunRec`（角色/种子/每波耗时/击杀/金币/商店经济/结束方式），最多 20 局，key `cmt_log_v1` |
| 是否有 UI | **没有**：只能控制台 `__logs()` 导出 |
| 是否含构筑 | **没有**：不记技能、黑科技、道具、难度（difficulty 是本轮才加） |
| 是否幂等 | 否（结算重复调用会重复入列，只靠 `endShown` 挡） |
| 容量 | 20 局、每波一行；无摘要/详情分层 |

结论：**需要独立的 RunHistory 模型**（摘要 + 详情、50 局上限、runId 幂等），Telemetry 保留为分析日志，二者不混用。

## 5. 结算数据现状

`GameRoot.showResult` 已有：胜负、波次、等级、击杀、时长、金币、种子、难度名、技能列表（名称/Lv/模块数）、道具（同名合并数量）、构筑行。
**缺**：精英/BOSS 击杀数、造成/承受伤害、金币花费、购买/升级次数、结束原因枚举、里程碑时间线。
这些字段要么由 Battle 现算，要么在结算时从 RunState 累计——本轮需要在 RunState/Battle 里补计数器（低成本，不逐帧写盘）。

## 6. 微信小游戏生命周期

- 全仓 **没有** `game.on(Game.EVENT_HIDE/EVENT_SHOW)`、没有 `wx.onHide/onShow`。
- 结论：本轮必须补"进入后台自动存档 + 回前台暂停"的钩子，否则继续游戏在切后台场景下不可靠。

## 7. 战斗恢复可行性（关键风险）

| 数据 | 能否恢复 | 方案 |
|---|---|---|
| 角色/属性/金币/等级/经验 | 能 | RunState 全字段快照 |
| 技能/等级/黑科技/道具/难度 | 能 | SkillInst[]、items[]、difficulty |
| RNG | 能 | `Rng` 是 mulberry32，内部只有一个 `s`；加 `state` 读写即可 |
| 波次/剩余时间/刷怪进度 | 能 | `waveLeft / spawnAcc / elitesSpawned` |
| 存活敌人 | 能（需序列化） | 敌人字段子集（kind/x/y/hp/spd/elite/boss/词缀/summoned） |
| BOSS 召唤状态机 | 能 | 给 BossSummonState 加 snapshot/restore |
| 子弹/区域/地雷/哨兵/蓄能 | **不恢复**（瞬时实体，寿命 <3s） | 文档明确；恢复后由技能自然重建 |
| 商店货架/锁定 | 能 | ShopSlot[] 直接存 |
| 升级三选一待选卡 | 能 | GameRoot.pendingRewards |

结论：**可以做"波内精确恢复"**（敌人逐只还原），但弹体类瞬时物不还原——必须在文档里写清楚，不能假装 100% 还原。

## 8. 测试现状

- `cocos/tests/run.ts`：349 PASS / 0 FAIL（纯逻辑层，不依赖 cc）。
- 缺口：存档序列化、历史容量/幂等、恢复不重复发奖、生命周期保存——全部无测试。
- 战斗链路运行时（哨兵 harvest/vamp、精英词缀落地）仍无自动化测试，本轮计划把"可判定分支"抽成纯函数补测（见任务书 §7.1）。

## 9. 上一轮遗留（本轮一并处理）

| 项 | 现状 | 本轮动作 |
|---|---|---|
| 蓄势计数 | 替换技能后计数未清零 | Battle 提供 `resetCastCount(slot)`，替换/丢弃时调用 + 测试 |
| 余烬刻印 | 设计写"叠层 +25%"，实现是"灼烧中 +25%" | 以代码为准改文档与决策表（保留简化实现，不假装叠层） |
| 背水 | 设计攻速 +35%，实现伤害乘区近似 | 改为真实冷却缩短（cd / 1.35），保留低血判定 |
| 文档数量冲突 | 344/349 混写 | 统一为 349，并在报告里写明 |
| README | 仍写"阶段3 收尾 / 已全部完成" | 随本轮改造更新 |

## 10. 本次需要新增/修改的文件

**新增**
- `game/RunSave.ts`（ActiveRunSave 模型、序列化、校验、迁移）
- `game/RunHistory.ts`（摘要/详情模型、容量、幂等、筛选、统计）
- `engine/RunStore.ts`（active/history 的 localStorage 读写）
- `ui/HistoryScreens.ts`（历史列表 + 详情页）
- `docs/ui/menu_continue_history_design.md`
- `docs/design/run_save_and_history_design.md`
- `docs/review/menu_upgrade_test_report.md`
- `cocos/tests/` 新增断言（并入 `tests/run.ts`）

**修改**
- `ui/MenuScreens.ts`（新主菜单布局 + 继续卡片 + 退出确认三选）
- `GameRoot.ts`（菜单回调、继续、自动存档、历史入口、生命周期、结算写历史、蓄势清零）
- `battle/Battle.ts`（snapshot/resume、计数器、resetCastCount）
- `game/RunState.ts`（runId/里程碑/统计计数）
- `game/BossSummon.ts`（snapshot/restore）
- `core/Rng.ts`（state 读写）
- `docs/*`（HANDOFF / implementation_status / FINAL_DESIGN_DECISIONS / README）

## 11. 结论

1. 现有代码**能支撑**"波内精确恢复"，但前提是新增序列化层，不能靠重开一局蒙混；
2. 历史对局必须新建模型，不能让 Telemetry 兼任；
3. 生命周期钩子是硬缺口，必须补；
4. 先把数据模型 + 恢复流程做通，再改 UI——按任务书 §13 的顺序执行。
