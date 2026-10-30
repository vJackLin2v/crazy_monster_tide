# 最终设计决策表（FINAL_DESIGN_DECISIONS）

> **本文是唯一裁决来源**。其他文档中的数值若与此表冲突，以本表为准，并应修正该文档。
> 生成时间：2026-10-30 v4 ｜ 状态：待开发（未写任何游戏代码）

## A. 伤害事件与模块

| 决策 | 最终值 | 唯一来源 |
|---|---|---|
| 伤害上下文 | DamageContext{source, canTriggerModules, castId, projectileId, returnIndex?, isBoss} | damage_event_interface.md |
| 来源可触发模块 | normal ✔ / split ✔（受模块上限）/ echo ✔（不计施法次数）/ chain ✔ / module ✘ / summon ✘ | damage_event_interface.md |
| 模块触发闸门 | 单一入口 canTriggerModule(ctx, mod)（来源 + CD + 单次施法上限） | damage_event_interface.md |
| M1 溢出爆裂 | 伤害 8/14/20；半径 40/46/52；**范围查询后取最近 60 只**（不全场排序）；爆炸击杀不连锁；可击杀精英；对 BOSS 无效 | module_expansion_design.md |
| M2 残影护盾 | 1/2/3 份 → **3 / 5 / 7** 点（每份 +2，池上限 9）；**全局** 1.5s CD；获得即刷新 4s；过期全清 | module_expansion_design.md |
| M3 处决 | +40 / +58 / +76%；BOSS +20 / +29 / +38%；按**结算前**血量判定 | module_expansion_design.md |
| M4 返程斩 | +70 / +95 / +120%；每次返程仅 1 次；保留原返程伤害 | module_expansion_design.md |
| M5 焚烧地带 | 概率 35/45/55%（split 减半）；**allowedSources = normal/split**（echo/chain/module/summon 不允许）；3 跳；伤害快照；同屏 ≤4 区、同帧按序号删最早 | module_expansion_design.md |
| M6 蓄势 | 每 3/2/2 次**主动施法**生效（生效后计数归零）；+80/+110/+140%；castId 唯一计数；echo 不计数也不重置 | module_expansion_design.md |

## B. 技能

| 技能 | 定位 | 关键上限 |
|---|---|---|
| ring_blade 环刃 | 近身防御 | 最多 4 片，转速上限 2.2 圈/秒 |
| mine_field 地雷阵 | 区域控制 | 同屏 ≤4 枚 |
| sentry 哨戒哨兵 | 自动追击 | 同时 1 个，8s |
| charge_pulse 蓄能脉冲 | 单体爆发 | 3s 蓄力；目标死亡立即重新索敌；无目标暂停蓄力；空放返还剩余冷却 50%；echo 不重新蓄力 |

唯一来源：skill_expansion_design.md

## C. 难度

| 决策 | 最终值 | 来源 |
|---|---|---|
| 五档倍率 | HP 0.80/1.00/1.25/1.45/1.90；伤害 0.80/1.00/1.15/1.35/1.55；刷怪间隔 1.15/1.00/0.92/0.85/0.78 | difficulty_system_design.md |
| 初始生命 | 1.10 / 1.00 / 1.00 / 0.95 / 0.90 | 同上 |
| 回血 | 倍率 1.20/1.00/0.90/0.80/0.70；预算 8 / **null** / 8 / 6 / 5；公式 min(原值×healMul×条件, 剩余预算) | 同上 |
| 刷怪公式 | 实际间隔 = 基础间隔 × spawnMul（>1 更慢） | 同上 |
| 商店价格 | 基础 × shopPrice × (1 + 0.02×(wave-1))，仅地狱；增量封顶 +35%，最终最高 1.8225 倍 | 同上 |
| 噩梦 BOSS 召唤 | <70%/<35% 各提交 1 个波次；pendingSummonWaves 记录待执行波次；每次召唤 min(3, 6-存活)；空位 0 则请求完成不挂起；两次**实际完成**间隔 ≥12s；同一时刻 1 个预警；BOSS 死亡清空 | 同上 |
| 地狱精英 | 5/8/11/14/17/20 波至少 1 只（已有则不补）；2 个词缀且不重复 | 同上 |
| 精英概率 | min(1, 基础 × eliteChanceMul)；优先级：禁止波次 → 倍率判定 → 保底波次 → 词缀 | difficulties_data_spec.md |
| 存档 | 只允许 Progress.selectedDifficulty / Progress.difficulties / RunState.difficulty 三个字段；UI 只写 selectedDifficulty，开局复制到 RunState，局内只读 | difficulty_system_design.md |
| 无尽 | 保留本局难度；30/40/50 波每档每里程碑只记一次 | difficulty_system_design.md |
| UI 坐标/热区 | 视觉 40 高、pitch 44（S+118 起）；**点击热区 44x44**（覆盖行间 4px 空隙）；详情 370~506；主按钮 520；返回 576~620 | difficulty_ui_spec.md |

## D. 道具

| 决策 | 最终值 | 来源 |
|---|---|---|
| 稀有度 | **三档**：普通 / 稀有 / 传说 | item_expansion_design.md |
| 传说道具 | 每局最多 1 件；商店与升级池共享计数；**已拥有后两个系统在生成候选时就排除传说**，不足 3 个用普通/稀有补位 | 同上 |
| 专注核心 focused | 装备技能 ≤2 时：技能伤害 +25%、冷却 -10%；不改技能槽；echo 重放同样享受乘区但不计施法次数 | 同上 + damage_event_interface.md |
| 10 件稀有度 | 余烬刻印/碎冰/回响电弧/背水/贪欲之心=稀有；荆棘外衣/精打细算=普通；血契/专注核心/共鸣器=传说 | 同上 |

## E. 验收

| 项 | 要求 | 来源 |
|---|---|---|
| 测试 | 数量不作为标准；必须覆盖六模块正常/边界/来源过滤、五档倍率、召唤状态机、旧档迁移、传说上限、新技能上限 | expansion_acceptance_criteria.md |
| 文档一致性 | doc_conflict_check.md 扫描命中必须为 0 | doc_conflict_check.md |


## F. 普通难度（v5 新增，最高优先级）

普通难度 = **不介入原版本逻辑**：不重新计算刷怪间隔、不重复乘 1.0、不应用商店倍率、不启用回血预算（null）、不增加精英随机判定、不改变奖励权重。
实现上走"非普通才叠加覆盖项"的分支，禁止在各函数里散落难度判断。

## G. 存档字段（v5 定稿）

只允许三个字段：Progress.selectedDifficulty、Progress.difficulties、RunState.difficulty。
除上表三个字段外，任何其他存档字段写法均已删除，出现即为文档错误。
