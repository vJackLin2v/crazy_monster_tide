# 新技能设计 v3（skill_expansion_design）

> v3（2026-10-31）：矩阵与实现逐格对齐；6 条 S 规则全部有行为定义与测试；`overload × 地雷阵` 判定为普通兼容。
> 依据人工确认意见：四个方向通过，但**必须各有不同定位**，不能换皮。
> 定位：环绕=近身防御、陷阱=区域控制、召唤=自动追击、蓄力=单体爆发。

## 1. 环刃（ring_blade）· 近身防御

| 字段 | 值 |
|---|---|
| type | orbit |
| tags | physical, orbit, melee, defense |
| 定位 | **持续贴身防守**：怪贴上来就掉血，玩家可以放心站着输出 |
| 伤害 / 存在 | 每片刀刃每秒 6 伤害（每 0.25s 判定一次，单次 1.5 × 片数） |
| 范围 | 以玩家为圆心、半径 40px 的环带（刃宽 10px） |
| 片数 | `min(4, 1 + 等级 + orbit 份数)`：1 级 2 片，每级 +1，硬上限 4 |
| 转速 | 1.4 圈/秒（受 rapid 加成） |
| 目标 | 环带内全部敌人，**不区分目标数量** |
| 兼容 | orbit（S，+1 片）、giant（半径）、rapid、burn / frost / vamp / harvest / thornmail（命中与击杀结算）有效；multi/fan/split/bounce/pierce/chain/echo/thunder/overload/snipe **无效**（无弹体） |
| 弱点 | 只有贴脸才打得到；对远程/风筝型敌人零输出；**不能打 BOSS 外围** |
| 性能 | 最多 4 片 × 每 0.25s 一次圆形判定 |

**与现有技能的区别**：脉冲（震荡波/霜爆/荆棘环/寒冰环）是"瞬发一圈然后等冷却"，环刃是**常驻**且随玩家移动，属于持续防御而非爆发。

## 2. 地雷阵（mine_field）· 区域控制

| 字段 | 值 |
|---|---|
| type | trap |
| tags | physical, trap, area, control |
| 定位 | **预布置 + 引怪**：玩家主动把怪群带到雷区 |
| 伤害 | 单雷 22，爆炸半径 48px（判定圈 16px） |
| 布置 | 施放时在脚下放 1 枚，0.6s 后进入待触发 |
| 上限 | **同屏最多 4 枚**；超过时最早的一枚立即引爆（不会消失，避免浪费） |
| 触发 | 敌人进入 16px 判定圈即爆 |
| 兼容 | giant（半径）、rapid、burn / frost / vamp / harvest / thornmail 有效；split（S）、echo（S）、overload（普通伤害乘区）有效；multi/fan/bounce/pierce/chain/snipe/thunder **无效** |
| 弱点 | **对移动快的怪命中率低**（狼/眼球蝠）；需要玩家预判走位 |
| 性能 | 最多 4 枚静态实体，每帧 4×N 距离检测 + 分裂弹上限 4 |

**与扎心的区别**：扎心是"站上去持续掉血"的地面 DoT；地雷是"踩到才爆"的离散触发，且**需要玩家布置**。

## 3. 哨戒哨兵（sentry）· 自动追击

| 字段 | 值 |
|---|---|
| type | summon |
| tags | arcane, summon, projectile, auto |
| 定位 | **多一个输出源**：玩家可以专心走位，让哨兵持续打 |
| 伤害 | 每发 6，射速 0.9s/发，弹速 260（固定，哨兵自身 spd = 0） |
| 存在 | 8s；重复施放会**移动**哨兵到当前位置并刷新时长（不是新增） |
| 上限 | **同时 1 个**（硬上限，防止无限堆） |
| 行为 | 自动索敌最近的敌人（射程 160px），**发射真实弹体**：multi 决定发数、fan 决定散射、split/bounce/pierce/chain 由弹体结算 |
| 兼容 | multi / fan / split / bounce / pierce / rapid / burn / frost / chain / snipe / harvest（S）/ thunder / vamp（S）；orbit / giant / echo / thornmail / overload **无效** |
| 弱点 | 哨兵**不会移动**，怪群会绕开；输出依赖玩家把它放对位置 |
| 性能 | 1 个哨兵 × 1.1 发/秒；每发 ≤ 5 主弹 + 6 散射弹 |

## 4. 蓄能脉冲（charge_pulse）· 单体爆发 / 精英攻坚

| 字段 | 值 |
|---|---|
| type | charge |
| tags | lightning, charge, burst, boss |
| 定位 | **点名精英/BOSS 的高爆发**，不是清场技能 |
| 蓄力 | 3.0s 蓄力（地面出现收缩光圈 + 角色描边发亮，**必须可读**） |
| 释放 | 对**当前锁定目标**造成 26 基础伤害 ×蓄力层数加成，并对 90px 内其他敌人造成 40% 伤害 |
| 冷却 | 4.0s（蓄力 + 1s 收尾） |
| 成长 | 每级 +6 单体伤害、+8px 溅射半径 |
| 兼容 | giant、overload、burn / frost / vamp / harvest / thornmail、echo（S）有效；multi/fan/split/bounce/pierce/orbit/rapid/chain/snipe/thunder **无效** |
| 目标死亡 | **立即重新索敌**并用剩余蓄力时间继续（不重置蓄力进度） |
| 无目标 | **暂停蓄力**（进度保留），出现目标后继续；场上无敌人时不会空放 |
| 空放返还 | 蓄力完成但目标已消失 → 返还**当前剩余冷却的 50%** |
| echo 重放 | **不重新进入蓄力**（直接以已蓄满的数值 × 60% 结算一次），不占用/重置冷却 |
| 性能 | 单次大范围判定 |

**与"长冷却技能"的区别**：现有陨石是"CD 到就砸"，蓄能脉冲是**可见的蓄力过程 + 释放瞬间的强反馈**，玩家的决策是"什么时候开始蓄"（例如精英冲锋前）。

## 5. 四技能定位对照（开发时以此验收）

| 技能 | 主要作用 | 不适合 | 数值重心 |
|---|---|---|---|
| 环刃 | 贴脸清杂兵、防身 | 打 BOSS / 远程怪 | 持续 DPS |
| 地雷阵 | 预布置、拖住怪群 | 追击快速目标 | 单次爆发 + 上限 4 |
| 哨戒哨兵 | 持续补伤害、解放走位 | 需要爆发时 | 稳定 DPS |
| 蓄能脉冲 | 精英/BOSS 攻坚 | 清小怪 | 单体高爆发 |

## 6. 第二批候选（保持不变，先不开发）

| id | 名称 | 行为 | 延后原因 |
|---|---|---|---|
| counter_aura | 反击光环 | 受击反弹 | 与 thornmail 重叠 |
| staged_meteor | 裂空陨星 | 二次爆炸 | 与陨石定位重叠 |
| frost_prison | 冰封牢笼 | 定身 1.2s | 控制过强，需 BOSS 抗性规则 |
| boomerang_axe | 回旋战斧 | 返程 120% | 与回旋刃重叠 |

## 7. 四个新技能 × 18 黑科技 兼容矩阵（v7 定稿，与代码逐格一致）

图例：Y = 有效（安装后改变行为）；N = 无效（**禁止安装并显示原因**）；S = 特殊（可装但有专门规则，§8）。

| 模块 | 环刃 | 地雷阵 | 哨兵 | 蓄能脉冲 |
|---|---|---|---|---|
| multi | N | N | Y | N |
| fan | N | N | Y | N |
| split | N | S | Y | N |
| bounce | N | N | Y | N |
| pierce | N | N | Y | N |
| orbit | S | N | N | N |
| giant | Y | Y | N | Y |
| rapid | Y | Y | Y | N |
| echo | N | S | N | S |
| burn | Y | Y | Y | Y |
| frost | Y | Y | Y | Y |
| vamp | Y | Y | S | Y |
| chain | N | N | Y | N |
| snipe | N | N | Y | N |
| harvest | Y | Y | S | Y |
| thunder | N | N | Y | N |
| thornmail | Y | Y | N | Y |
| overload | N | Y | N | Y |

> 代码真相：`game/SkillCalc.ts` 的 `NEW_SKILL_ALLOW` 与上表**逐格相同**；
> 测试 `tests/run.ts` §5q 断言了 N 的组合装不上、S/Y 的组合能装上。

**为什么有些格子是 N 而不是 Y（实现真相）**：
- 环刃 / 地雷阵 / 蓄能没有弹体 → chain / pierce / bounce / snipe / multi / fan / split（除地雷 S）/ thunder 无从生效；
- thunder 在这些技能里被 `noThunder` 挡住（否则 4 次/秒 × 全屏敌人会触发海量连锁）；
- 哨兵没有"范围"参数 → giant 无意义；
- 环刃/哨兵/蓄能的 echo 语义分别由 §8 的 S 规则或"不支持"处理。

## 8. 特殊（S）规则明细（6 条，全部已实现 + 有测试）

| 组合 | 行为语义 | 代码位置 | 测试 |
|---|---|---|---|
| orbit × 环刃 | 片数 +1（`min(4, 1+等级+orbit)`），不是重复触发整套技能 | `SkillRules.ringBladeCount` → `Battle.fireSkill` orbit 分支 | §8「orbit × 环刃」 |
| split × 地雷阵 | 引爆时额外炸出 2/3/4 枚小子弹，伤害系数 **40%**，衍生物 `split = 0` **不再分裂** | `SkillRules.mineSplitCount` → `Battle.explodeTrap` | §8「split × 地雷」 |
| echo × 地雷阵 | 回声**最多复制 1 次**；复制出来的地雷 `echo = 0`，不会再次触发 echo | `SkillRules.mineEchoRepeats` → `Battle.fireSkill` trap 分支 | §8「echo × 地雷」 |
| echo × 蓄能脉冲 | 重放**不重新蓄力**，直接按已蓄满数值 × 60% 结算一次；最多 1 次，不占用冷却 | `SkillRules.chargeEchoRepeats` + `Battle.resolveCharge` | §8「echo × 蓄能」 |
| vamp × 哨兵 | 哨兵伤害可以吸血；来源仍是 summon（不触发玩家 onhit 模块），受难度回血预算约束 | `DamageContext.canSourceVamp`（`summonKind === 'sentry'`） | §7「哨兵可以吸血」 |
| harvest × 哨兵 | **可安装，但哨兵击杀不回血**；玩家直接击杀正常回血；哨兵击杀仍计入总击杀数 | `DamageContext.canSourceHarvest` + `Battle.killEnemy` | §7「召唤物击杀不触发 harvest」 |

### 8.1 overload × 地雷阵：从 S 降为普通兼容

- `overload` 的定义是"伤害 +25%、范围 -10%（每份叠乘）"，属于**纯数值乘区**；
- 地雷阵是普通伤害技能，装 overload 就是伤害更高、爆炸半径更小，**不需要任何专门规则**；
- 因此矩阵改为 **Y**，删除原来的 S 标记，避免"为了 S 而 S"。

### 8.2 哨兵（召唤物）专项规则

1. 哨兵弹体伤害来源 = summon，**不触发玩家任何 onhit 模块**；
2. 明确允许的模块（multi/fan/split/bounce/pierce/chain/snipe/burn/frost/thunder/vamp）作用于**哨兵自己的弹体**，按哨兵伤害计算；
3. 哨兵**不能被 echo 复制自身**（同时只有 1 个）；
4. 召唤物击杀**计入玩家击杀总数**，但**不触发 Harvest（击杀回血）**，也不能被重新归类为玩家直接击杀；
5. 召唤物伤害**可以通过 Vamp 吸血**（`summonKind === 'sentry'` 的显式例外，受每秒回血预算约束）；
6. 同一只怪的死亡事件只会进入一次结算：summon 来源的击杀事件里 harvest 直接跳过，vamp 已在命中阶段结算，不重复。
