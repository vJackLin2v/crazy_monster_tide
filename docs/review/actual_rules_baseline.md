# 实际规则基准（M1 · actual_rules_baseline）

> 基准时间：2026-10-31 ｜ M1 起始 commit：`de41ae0` ｜ 引擎：Cocos Creator 3.8.6
> 原则：以**实际被调用的代码**为准；注释/旧文档与代码冲突时，记录冲突并以代码为准，不为对齐文档改规则。

## 1. 回血（M1 重点）

### 1.1 唯一入口

| 项 | 内容 |
|---|---|
| 入口 | `RunState.heal(amount, instant?)`（`game/RunState.ts`） |
| 预算窗口 | `healWindow = floor(runTime)`；跨秒自动清零 `healSpent` |
| 状态字段 | `RunState.healWindow` / `RunState.healSpent`（随存档保存） |
| 战斗入口 | `Battle.healPlayer(amount)` → `rs.heal(amount)` → 回血 ≥0.5 时播反馈 |
| 瞬时入口 | `rs.heal(amount, true)`：商店治疗、波末节奏恢复；不占战斗每秒预算，但仍受最大生命与有限数校验 |

### 1.2 预算数值（实际配置）

| 难度 | healBudgetPerSecond | healMul | 有效预算（null→8） | 单秒硬上限 |
|---|---|---|---|---|
| 休闲 | 8 | 1.20 | 8 | min(8,5)=**5** |
| 普通 | null | 1.00 | **8** | **5** |
| 困难 | 8 | 0.90 | 8 | **5** |
| 噩梦 | 6 | 0.80 | 6 | **5** |
| 地狱 | 5 | 0.70 | 5 | **5** |

硬上限常量：`HealRules.HEAL_HARD_CAP = 5`。实际单秒可回 = `min(budget, 5)`。
条件倍率：休闲低血（<30%）×1.2（`healAmount`）。

### 1.3 各来源

| 来源 | 计算 | 入口 | 是否占预算 |
|---|---|---|---|
| 属性吸血 | `dmg × stats.lifesteal` | `Battle.healPlayer` | 是 |
| 黑科技吸血 | `dmg × 4% × rt.vamp` | `Battle.healPlayer` | 是 |
| 击杀回血（harvest） | `rt.harvest`（份数） | `Battle.healPlayer` | 是 |
| 击杀回血（属性 killHeal） | `stats.killHeal` | `Battle.healPlayer` | 是 |
| 自然恢复 | `stats.regen × dt` 每帧 | `Battle.healPlayer` | 是 |
| 波末节奏恢复 | `max(4, 6% maxhp)`，夹剩余生命 | `rs.heal(..., true)` | **否**（瞬时） |
| 商店治疗 | 固定 40 | `rs.heal(40, true)` | **否**（瞬时） |
| 波次开始 | 第 2 波起 `hp = maxhp`；第 1 波 `maxhp × startHpMul` | `Battle.startWave` 直接重置 | 否（规则重置，不是 heal） |
| 升级 maxhp 属性 | `maxhp += step; hp += step` | `RunState.applyReward/buySlot` | 否（上限成长，非回血） |

### 1.4 每波回血（只核实，未修改）

| 问题 | 实际行为 |
|---|---|
| 第 1 波开始是否回满 | 否。`startRun` 按 `startHpMul` 设初始生命（普通 100%），随后 `startWave(1)` **不**回满 |
| 第 2 波以后 | 是。`startWave(n)` 中 `if (n > 1) hp = maxhp` |
| 触发位置 | `Battle.startWave()`，每次正常进入新波 |
| BOSS 波 | 相同（同样走 startWave） |
| 无尽模式 | 相同（波次继续 +1） |
| 商店治疗是否重复 | 商店治疗固定 40，独立于波次回满；困难配置有 `noHealInShop`，但**代码从未读取**（见冲突） |
| 暂停/切后台 | 不回血；`runTime` 不前进，预算窗口不前进 |
| 续玩（resumeRun） | 不调用 `startWave`，不触发波次回满；恢复存档 HP 与预算窗口 |

### 1.5 存档

- `Battle.snapshotBattle()` 写入 `battle.healWindow / battle.healSpent`；
- `Battle.restoreBattle()` 恢复：窗口相同则沿用 spent，窗口不同则清零；
- 旧存档缺字段：按当前窗口、spent=0 处理（向后兼容）。

## 2. 波次 / BOSS / 精英（实际）

| 规则 | 实际值 | 位置 |
|---|---|---|
| 总波数 | 20（通关后可无尽） | `core/Const.ts RUN.waves` |
| BOSS 周期 | **每 10 波**（10、20；无尽 30、40…） | `RUN.bossEvery = 10` |
| 精英波 | 第 5 波起每 2 波；1~4 波按每 3 波；BOSS 波无精英 | `isEliteWave` |
| 精英数量 | 第 12 波起 2 只，其余 1 只 | `eliteCount` |
| 精英词缀 | 困难：12 波起 25% 护盾；噩梦：8 波起必 1 个；地狱：5 波起必 2 个 + 指定波保底 | `Difficulties.rules` |
| 波次时长 | `22 + floor((n-1)/3) × 4` 秒 | `waveTime` + `Balance.wave` |
| 刷怪间隔 | `(0.92 + 0.012×(wave-1)) × spawnMul`，最低 0.52 | `spawnInterval` + `Balance.spawn` |
| 批量刷怪 | 每 6s 一次，最多 2 只 | `Balance.spawn.batchEvery/batchMax` |
| 开场铺怪 | `4 + floor(wave/3)`，上限 7 | `Balance.spawn.open*` |
| 同屏上限 | 软 24 / 硬 34；超过软上限刷怪速度 ×1.7 放慢 | `aliveCaps` / `slowMul` |
| 敌人 HP | `baseHP × (1 + 0.42×(wave-1)) × 生成 scale` | `waveScale` |
| 敌人伤害 | `baseDmg × (1 + 0.20×(wave-1)) × 生成 scale` | `waveScale` |

> 冲突：`RUN.baseTime=18/timeStep=3/timeEvery=3` 是**默认常量**，实际 `waveTime` 读取 `Balance.wave = 22/4/3`，以 22/4 为准。

## 3. 技能 / 黑科技 / 道具

| 项 | 实际值 |
|---|---|
| 技能数量 | **20**（`Object.keys(SKILLS).length`） |
| 黑科技数量 | **18**（`MODULE_IDS.length`） |
| 道具数量 | **80**（`Object.keys(ITEMS).length`） |
| 技能槽 | 4；每技能黑科技槽 3 |
| 黑科技等级效果 | `modEffect = 1 + 0.6×(level-1)`：Ⅰ=1、Ⅱ=1.6、Ⅲ=2.2 |
| 合成占用 | `modPower`：Ⅱ 仍算 2 份占位，效果只 1.6 |
| 冷却缩减 | 急速 `0.88^份数`；攻速 ≤2.2；cdr 属性封顶 50%；总冷却 ≥ max(0.12s, 35%基础) |
| BOSS 技能 | 5 向红球（0.45s 预警）、冲锋（方向预警）、砸地（0.9s 预警，半径 70，1.5× 伤害） |

## 4. 商店经济

| 项 | 实际公式 |
|---|---|
| 道具原价 | `14 + rand(0..6) + wave×3.4` |
| 黑科技原价 | `18 + rand(0..7) + wave×5.0` |
| 难度价格 | `shopPrice = 原价 × shopPriceMul × (1 + min(0.35, perWave×(wave-1)))` |
| 治疗价格 | `8 + wave×1`（**未乘难度价格倍率**） |
| 属性价格 | `16 + wave×3`（**未乘难度价格倍率**） |
| 刷新 | `(3 + 已刷次数×3) × rerollCostMul`；`frugal` ×0.5 |
| 波末金币 | `9 + wave×3.5 + bonus`，受 greed 上限 +100% |
| 锁定 | 免费；噩梦 `lockCostPerLock=2` 规则**未在代码中读取** |

## 5. 已知冲突清单（本轮不改数值，只记录）

1. **困难 `noHealInShop` 未实现**：商店治疗仍然生效。
2. **噩梦 `lockCostPerLock` 未实现**：锁定仍免费。
3. **治疗/属性价格未乘 `shopPriceMul`**：与道具/黑科技价格规则不一致。
4. **`RUN.baseTime/timeStep/timeEvery` 与实际 `Balance.wave` 不一致**：以 22/4 为准。
5. **`healBudgetPerSecond: null` 旧注释写"不限制"**：实际默认 8 且硬夹 5。
6. **旧审查文档 BOSS 周期写"每 5 波"**：实际每 10 波。
7. **REVIEW_DOC 难度表旧值**（休闲 0.88 等）已过期：以本文件与 `gpt_review_tables` 实际值为准。

## 6. 对应测试

- `tests/run.ts §25`：统一回血入口、预算、硬上限、满血、异常值、跨秒窗口、商店瞬时、存档同秒/跨秒。
- 原有 §24：预算/倍率常量。
