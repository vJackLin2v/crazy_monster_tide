# 最终设计决策表（FINAL_DESIGN_DECISIONS）

> **本文是唯一裁决来源**。其他文档中的数值若与此表冲突，以本表为准，并应修正该文档。
> 更新：2026-10-31 v6（阶段3 收尾） ｜ 状态：**代码已实现并测试**（见各行的"证据"列）。
> 唯一例外：地狱商店 1.8225 倍仍是暂定值，必须等真机经济数据（§I）。

## A. 伤害事件与模块

| 决策 | 最终值 | 证据 |
|---|---|---|
| 伤害上下文 | `DamageContext{source, canTriggerModules, canHarvest, canVamp, castId, projectileId?, returnIndex?, isBoss, summonKind?}`，三个 can* 只由工厂推导并 freeze | game/DamageContext.ts；tests §7 |
| 来源可触发模块 | normal ✔ / split ✔ / echo ✔ / chain ✔ / module ✘ / summon ✘ | 同上 |
| Harvest | 仅 `source !== 'summon'`；召唤物击杀仍计入总击杀数 | 同上 + Battle.killEnemy |
| Vamp | module ✘；summon 仅 `summonKind === 'sentry'` ✔；其余 ✔ | 同上 |
| 模块触发闸门 | 单一入口 `ModuleUsage.canTrigger`（来源 + CD + 单次施法上限） | ModuleUsage + tests §5n |
| M1 溢出爆裂 | 伤害 8/14/20；半径 40/46/52；取最近 60 只；爆炸击杀不连锁；module / summon 击杀不引爆 | ModuleValues + tests §5o |
| M2 残影护盾 | 3 / 5 / 7（每份 +2，池上限 9）；全局 1.5s CD；获得即刷新 4s | 同上 |
| M3 处决 | +40 / +58 / +76%；BOSS +20 / +29 / +38%；按**结算前**血量 | 同上 |
| M4 返程斩 | +70 / +95 / +120%；每次返程仅 1 次 | 同上 |
| M5 焚烧地带 | 35/45/55%（split 减半）；allowedSources = normal/split；3 跳；同屏 ≤4 | 同上 |
| M6 蓄势 | 每 3/2/2 次**主动施法**；echo 不计数（`Battle.echoReplay`） | Battle.fireSkill + tests §7 |

## B. 技能

| 技能 | 定位 | 关键上限 |
|---|---|---|
| ring_blade 环刃 | 近身防御 | `min(4, 1+等级+orbit)` 片 |
| mine_field 地雷阵 | 区域控制 | 同屏 ≤4 枚；分裂弹 40% |
| sentry 哨戒哨兵 | 自动追击 | 同时 1 个，8s，真实弹体 |
| charge_pulse 蓄能脉冲 | 单体爆发 | 3s 蓄力；空放返还 50% 冷却；echo 不重新蓄力 |

唯一来源：skill_expansion_design.md（矩阵与代码逐格一致）

## C. 难度

| 决策 | 最终值 | 来源 |
|---|---|---|
| 五档倍率 | HP 0.80/1.00/1.25/1.45/1.90；伤害 0.80/1.00/1.15/1.35/1.55；刷怪间隔 1.15/1.00/0.92/0.85/0.78 | difficulty_system_design.md |
| 初始生命 | 1.10 / 1.00 / 1.00 / 0.95 / 0.90 | 同上 |
| 回血 | 倍率 1.20/1.00/0.90/0.80/0.70；预算 8 / **null** / 8 / 6 / 5 | 同上 |
| 商店价格 | 基础 × shopPriceMul × (1 + 0.02×(wave-1))，仅地狱；增量封顶 +35%，最终最高 1.8225 倍（**暂定**） | 同上 |
| 噩梦 BOSS 召唤 | 阈值各提交 1 个波次；`pendingWaves`；每次 min(3, 6-存活)；空位 0 请求完成；两次**实际完成** ≥12s；同一时刻 1 个预警；BOSS 死亡清空 | game/BossSummon.ts；tests §14 |
| 精英概率 | `min(1, eliteChanceMul)`；普通 = 1 → **不掷骰子**（不消耗随机数）；禁止波次优先；保底波次无视概率 | Battle.updateSpawn |
| 精英词缀 | 护盾 +20% 生命 / 加速 +25% 移速 / 分裂死亡出 2 只小怪（0.35 生命，不递归） | game/EliteAffix.ts；tests §9 |
| 精英词缀分配 | 困难 12 波起 25% 1 个；噩梦 8 波起必带 1 个；地狱 5 波起必带 2 个不重复 | Difficulties.rules + EliteAffix |
| 存档 | `Progress.selectedDifficulty` / `Progress.difficulties` / `RunState.difficulty`；其他进度字段（seen/charsWin/偏好/徽章）一并持久化 | game/Progress.ts（parseSave）；tests §10 |
| 无尽 | 保留本局难度；30/40/50 波每档每里程碑只记一次（`endlessBadges: '<难度>:<波次>'`） | Progress.badgesForRun；tests §10 |
| UI 坐标/热区 | 视觉 40 高、pitch 44（S+118 起）；点击热区 44×44；详情 370~506；主按钮 520；返回 576~620 | difficulty_ui_spec.md |

## D. 道具

| 决策 | 最终值 | 证据 |
|---|---|---|
| 稀有度 | 三档：普通 / 稀有 / 传说（tier 1/2/3） | data/Items.ts |
| 传说道具 | 每局最多 1 件；商店与升级池**共享** `RunState.legendaryTaken`；拿到后两个池子都排除 tier 3 | RunState + tests §11 |
| 专注核心 focused | 装备技能 ≤2 时：技能伤害 +25%、冷却 -10%；echo 同样享受乘区但不计施法次数 | SpecialItems + tests §5r |
| 稀有度归属 | 余烬刻印/碎冰/回响电弧/背水/贪欲之心 = 稀有；荆棘外衣/精打细算 = 普通；血契/专注核心/共鸣器 = 传说 | data/Items.ts |

## E. 验收

| 项 | 要求 | 现状 |
|---|---|---|
| 测试 | 覆盖六模块、五档、召唤状态机、旧档迁移、传说上限、新技能 S 规则 | 344 PASS / 0 FAIL |
| 文档一致性 | doc_conflict_check.md 关键词 0 命中 + 逻辑断言全 PASS | 已重跑（2026-10-31） |

## F. 普通难度（最高优先级）

普通难度 = **不介入原版本逻辑**：不重复乘倍率、不应用商店价格、不启用回血预算（null）、
不增加精英随机判定（`eliteChanceMul = 1` 时直接跳过掷骰）、不改变奖励权重。
实现上走"非普通才叠加覆盖项"的分支，禁止在各函数里散落难度判断。

**可证明范围**：公式层（spawnInterval / shopPrice / eliteChance / healAmount / healBudget）已由 tests §13 断言"原样返回"。
**不可证明范围**：仓库没有阶段2 的旧版行为快照（无旧测试基线），因此**不能声称逐项像素级复刻**，
报告中标注为"待真机对照"。

## G. 存档字段（定稿）

`Progress.selectedDifficulty`：当前选择的难度。
`Progress.difficulties`：永久解锁的难度列表。
`RunState.difficulty`：本局实际使用的难度（开局从 Progress 复制，局内只读）。

读取路径由 `parseSave` 统一解析 + 校验 + 迁移；`Save.ts` 只负责存取。

## H. 召唤物与回血

| 规则 | 结论 |
|---|---|
| 召唤物伤害 | 正常扣血、正常击杀，计入玩家击杀总数 |
| Harvest（击杀回血） | **召唤物击杀不触发**，也不允许被重新归类为玩家击杀 |
| Vamp（吸血） | **只有哨兵**（`summonKind === 'sentry'`）可以触发，且走统一 `healPlayer` 预算 |
| 其他 onhit 模块 | 默认不触发（canTriggerModules = false） |

## I. 暂定项（不得标记最终验收）

| 项 | 现状 |
|---|---|
| 地狱商店最终价 1.8225 倍 | 暂定配置（`shopPriceMul=1.35` × 增量封顶 +35%），待真机经济数据；已加经济遥测（§12 测试） |

## J. 六条 S 规则（行为已定，全部有实现与测试）

| 组合 | 语义 |
|---|---|
| orbit × 环刃 | 片数 +1（不是重复施放技能），受 4 片上限 |
| split × 地雷 | 分裂弹伤害 40%，衍生物不再分裂 |
| echo × 地雷 | 最多复制 1 次，复制品不再触发 echo |
| echo × 蓄能 | 不重新蓄力，按已蓄满数值 × 60% 结算一次 |
| vamp × 哨兵 | 可吸血；系数由 vamp 份数决定，受每秒回血预算约束 |
| harvest × 哨兵 | 可安装，但哨兵击杀不回血（玩家直接击杀正常回血） |

**overload × 地雷**：判定为普通兼容（Y），不设 S —— overload 只是伤害乘区，无需专门规则。
