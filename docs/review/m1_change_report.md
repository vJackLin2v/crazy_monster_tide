# M1 变更报告（回血统一 + 规则核对 + 隐藏黑科技/范围审计）

> 起始 commit：`de41ae0` ｜ 完成 commit：见 `m1_test_report.md` / 最终交付说明
> 引擎：Cocos Creator 3.8.6 ｜ 测试：447 PASS / 0 FAIL（原 435 + 新增 12）｜ tsc check/ui-check = 0

## 一、确认的代码错误（已修）

### 1. 属性吸血绕过统一回血预算（P0）

修改前（`Battle.hitEnemy`）：

```ts
if (this.rs.stats.lifesteal > 0) {
  const before = this.rs.stats.hp;
  this.rs.stats.hp = Math.min(this.rs.stats.maxhp, this.rs.stats.hp + dmg * this.rs.stats.lifesteal);
  const healed = this.rs.stats.hp - before;
  if (healed >= 0.5) this.healFeedback(healed);
}
```

修改后：

```ts
if (this.rs.stats.lifesteal > 0) {
  this.healPlayer(dmg * this.rs.stats.lifesteal);
}
```

同一问题还存在于：

- **击杀回血属性**（`stats.killHeal`）直接 `hp += kh` → 改走 `healPlayer`；
- **自然恢复**（`stats.regen`）每帧直接 `hp += regen*dt` → 改走 `healPlayer`。

### 2. 回血状态不随存档保存（P1）

修改前：`restoreBattle()` 与 `resetRunState()` 把 `healBudgetSpent/Sec` 清零；续玩同一秒内可重新获得完整预算。
修改后：预算状态收口到 `RunState.healWindow/healSpent`，写入 `BattleSave`；恢复时同窗口沿用 spent、跨窗口清零。

### 3. 唯一入口

`RunState.heal(amount, instant?)` 成为唯一玩家回血入口：

- 校验 `Number.isFinite(amount)`、正数、`maxhp` 有限且 >0；
- 战斗回血：秒窗口预算（难度预算，默认 8）+ 硬上限 5；
- 瞬时治疗：商店 40、波末 6%（min 4）——受最大生命夹取，不占战斗预算（保留原设计数值）；
- 满血/超上限正确截断；
- 所有战斗来源（属性吸血/黑科技吸血/harvest/击杀回血/自然恢复）统一走 `Battle.healPlayer → RunState.heal`。

未改任何数值配置：预算 8/5、吸血 4%、harvest 1、商店 40、波末 6%、每波回满规则。

### 行为影响（统一入口带来的必然变化，非配置改动）

- 属性吸血、击杀回血属性、自然恢复以前**不乘 healMul、不吃预算**；现在与黑科技吸血同规则：
  受每秒预算/硬上限，并按难度 `healMul`（困难 0.90、噩梦 0.80、地狱 0.70）缩放。
- 因此在困难以上，属性吸血的**有效回复量会低于修改前**；这是"所有回血统一"的直接结果，不是改了吸血比例。
- 商店治疗与波末恢复仍为瞬时，保留原数值（40 / 6%），不乘 healMul，不占预算。

## 二、每波回血（核实，未修改）

| 项 | 实际 |
|---|---|
| 第 1 波 | 不回满；按 `startHpMul` 设置初始生命 |
| 第 2 波起 | `startWave(n)`：`if (n>1) hp=maxhp` |
| BOSS / 无尽 | 同样走 startWave，相同规则 |
| 暂停 / 切后台 | 不回血；预算窗口不前进 |
| 续玩 | `resumeRun` 不调用 startWave，不重复回满 |
| 商店治疗 | 固定 40，瞬时，独立于波次回满 |

## 三、六个隐藏黑科技审计（未加入池、未删除）

结论：**六个都不在 MODULES 主表、不在升级奖励池、不在商店池，也没有其他发放入口**。
奖励池与商店池都使用 `Object.keys(MODULES)`（`RunState.rollRewards / makeShopItem`）；隐藏模块只在 `Battle` / `ModuleValues` 有实现。可进入对局的唯一方式是**手改存档**（存档校验未对模块 id 做白名单）。

| id | 实现 | 实际效果 / 数值 | 设计依据 | 池状态 |
|---|---|---|---|---|
| killblast | `Battle` 击杀爆炸 + `ModuleValues` | 伤害 8/14/20，半径 40/46/52，最近 60 只，爆炸击杀不连锁、module/summon 击杀不触发 | `module_expansion_design.md` M1 + FINAL_DESIGN_DECISIONS M1 | 不在池 |
| shieldonhit | `Battle` 命中生成护盾 | 护盾 3/5/7，池上限 9，全局 CD 1.5s，持续 4s；仅 normal/chain/split 命中触发 | 同上 M2 | 不在池 |
| execute | `Battle.hitEnemy` 增伤 | 普通 +40/58/76%，BOSS 减半 +20/29/38%，按结算前 HP<30% | 同上 M3 | 不在池 |
| returnstrike | `Battle` 返程斩 | 额外 +70/95/120%，每次返程仅 1 次 | 同上 M4 | 不在池 |
| lingering | `Battle` 命中生成焚烧区 | 35/45/55% 概率（split 减半），3 跳，每跳 30%，区域上限 4 | 同上 M5 | 不在池 |
| overcharge | `Battle` 蓄势 | 每 3/2/2 次施法触发，倍率 1.8/2.1/2.4 | 同上 M6 | 不在池 |

风险：实现存在但玩家永远拿不到 = 死代码；是否接入奖励池/商店属于设计决策（M2），本轮不动。

## 四、范围公式审计（未改代码）

调用链：`freshStats`（area=1、sizeMul=1、aoeDmg=0） → 道具/属性修改 → `calcSkill` → `rt.size` → Battle 生成弹体/区域。

`SkillCalc.calcSkill` 实际公式：

```ts
size: b.size * sizeMul * (0.9 + 0.1 * Math.min(2.2, stats.area)) * Math.min(2.2, stats.area) * (stats.sizeMul ?? 1)
```

- `area` 被乘了**两次**：一次线性系数 `(0.9+0.1*area)`，一次直接 `*area`；
- `sizeMul` 是独立乘区（子弹大小）；
- `aoeDmg` 只加成 area/pulse 技能伤害，封顶 +100%，与 size 无关；
- 代码中**不存在** `sizeMulStat` 字段（任务书名称与实现不一致）。

示例（基础 size=100，sizeMul=1）：

| area | 实际 size | 相对基础 |
|---|---|---|
| 1.0 | 100 | 100% |
| 1.09 | 109.98 | +10.0% |
| 1.5 | 157.5 | +57.5% |
| 2.0 | 220 | +120% |
| 2.2 | 246.4 | +146.4% |

结论：**无法从设计文档证明"双乘"是刻意设计**，但也不能确认必须改成单乘区；本轮保留代码，列入 M2 待确认风险。若改成单乘区，同样 area=2 时 size 只有 110（+10%），会显著改变现有手感，不属于 M1 范围。

## 五、边界测试结果（浏览器真实运行）

脚本：`tools/ui/test_m1_boundaries.cjs`

```json
{"deathDuringLevelup":{"phase":"result","levelup":false,"result":true},
 "afterFirst":{"phase":"levelup","paused":true,"pending":1,"levelup":true},
 "afterSecond":{"phase":"battle","paused":false,"pending":0,"levelup":false},
 "installReturn":{"phase":"battle","paused":false,"pending":0}}
```

- 升级弹窗期间死亡：结算页正常出现，升级弹窗关闭；
- 连续两次升级：第一次选完仍弹第二张，第二次选完恢复战斗；
- 黑科技安装屏返回：phase=battle、paused=false。

## 六、问题分类

| 类型 | 内容 |
|---|---|
| 确认的代码错误（已修） | 属性吸血/击杀回血/自然恢复绕过预算；预算状态不随存档恢复 |
| 文档/注释错误（已修注释） | `Difficulties` 把 `null` 写成"不限制"（实际默认 8）；`HealRules` 注释指向 Battle 而非 RunState |
| 设计问题（记录，未改） | 困难 `noHealInShop`、噩梦 `lockCostPerLock` 规则未实现；治疗/属性价格未乘 `shopPriceMul`；BOSS 周期旧文档写 5 实际 10；`RUN` 默认波次时长被 `Balance.wave` 覆盖 |
| 未证实风险（记录） | `area` 双乘；隐藏六模块是死代码；清档校验未校验模块 id |
| 已确认但超出范围 | 无（未改技能伤害/成长/难度/价格/UI） |

## 七、修改文件清单

- `game/RunState.ts`：`healWindow/healSpent`、`heal()`、`resetHealBudget()`、商店治疗改走 `heal(40,true)`
- `battle/Battle.ts`：`healPlayer` 委托 RunState；属性吸血/击杀回血/自然恢复/波末恢复改走入口；移除旧预算字段与秒表；快照/恢复 heal 字段
- `game/RunSave.ts`：`BattleSave.healWindow/healSpent`（可选）
- `data/Difficulties.ts`、`game/HealRules.ts`：仅注释修正
- `tests/run.ts`：§25 统一回血测试（12 条）
- `docs/review/actual_rules_baseline.md`、本报告、测试报告

## 八、留给 M2

1. area 双乘是否改为单乘区（需策划确认与手感回归）；
2. 六个隐藏黑科技是否接入奖励池/白名单，或标记废弃；
3. `noHealInShop`、`lockCostPerLock`、治疗/属性价格倍率是否补齐；
4. BOSS 周期/波次时长文档统一（实际 10 波、22s 起）；
5. 每波回满与真机低承伤下的难度曲线（需对照实验）。
