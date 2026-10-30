# 新黑科技设计（module_expansion_design）

> 第一批 6 个正式 + 6 个候选。每条都写清触发边界，防止递归与重复结算。

## 第一批（6 个）

### 1. killblast 溢出爆裂

| 字段 | 值 |
|---|---|
| hook | kill |
| requires | 无（任何技能都能用） |
| effect | 击杀敌人时对 40px 内敌人造成 8 点伤害 |
| baseValue | 8 伤害 / 40px |
| stackRule | 叠加：伤害 +6、半径 +6（**半径上限 70**） |
| maxStack | 3 |
| levelScaling | 仅伤害：1+0.6×(级-1)；半径不随合成成长 |
| triggerLimit | **每次击杀只触发 1 次**，不连锁（击杀由爆炸产生的敌人不再触发） |
| damageRule | 不吃暴击、不吃吸血 |
| bossRule | 对 BOSS 无效 |
| performanceRisk | 低（单次圆形判定） |

### 2. shieldonhit 残影护盾

| 字段 | 值 |
|---|---|
| hook | onhit |
| requires | projectile 或 chain |
| effect | 命中时获得 3 点护盾，持续 4s |
| baseValue | 3 HP |
| stackRule | 护盾值 +2/份；**上限 9 点** |
| maxStack | 3 |
| triggerLimit | **每 1.5 秒最多 1 次** |
| bossRule | 无特殊 |
| performanceRisk | 极低 |

### 3. execute 处决

| 字段 | 值 |
|---|---|
| hook | onhit |
| requires | 任意 |
| effect | 目标生命低于 30% 时，本次伤害 +40% |
| stackRule | 每份 +18%，**上限 +90%** |
| bossRule | 对 BOSS 效果减半（+20%） |
| triggerLimit | 无（随伤害结算） |
| performanceRisk | 低 |

### 4. returnstrike 返程斩

| 字段 | 值 |
|---|---|
| hook | onreturn（新增） |
| requires | 仅 return 标签技能（回旋刃） |
| effect | 返程命中额外造成原伤害 70% |
| stackRule | 每份 +25%，上限 120% |
| bossRule | 正常 |
| triggerLimit | 每枚弹体每次返程 1 次 |
| performanceRisk | 低 |

### 5. lingering 焚烧地带

| 字段 | 值 |
|---|---|
| hook | onhit |
| requires | 任意 |
| effect | 命中有 35% 概率在地面留下 1.5s 灼烧区（每 0.5s 造成 30% 伤害） |
| stackRule | 概率 +10%/份（上限 65%），伤害比例不变 |
| maxStack | 3 |
| triggerLimit | **同屏最多 4 个区域**，超出时最早的一个立刻消失 |
| bossRule | 正常 |
| performanceRisk | 中（最多 4 个区域 × 每 0.5s 判定） |

### 6. overcharge 蓄势

| 字段 | 值 |
|---|---|
| hook | calc |
| requires | 任意 |
| effect | 每第 4 次施法（每份 -1，最少第 2 次）伤害 +80% |
| stackRule | 倍率 +30%/份，上限 +140% |
| bossRule | 正常 |
| triggerLimit | 计数按技能独立 |
| performanceRisk | 极低 |

## 第二批候选（6 个，先不做）

| id | 名称 | 行为 | 先不做的原因 |
|---|---|---|---|
| wallbounce | 界壁反弹 | 弹体撞边界反弹一次 | 需要弹体与边界碰撞，成本较高 |
| elementresonance | 元素共鸣 | 同元素技能 ≥2 时该元素伤害 +20% | 与道具的标签加成重叠，需要先算总账 |
| combostack | 连击叠层 | 连续命中同一目标每层 +4%（上限 5 层） | 与 execute 有重叠 |
| markdown | 标记猎杀 | 命中标记目标，标记目标死亡时爆炸 | 和 killblast 重叠 |
| slowfield | 迟滞力场 | 命中留下减速区 | 与 frost 模块重叠 |
| summonlink | 召唤协同 | 召唤物伤害 +30% | 依赖 summon 技能，等新技能上线后再评估 |

## 行为边界统一规则（所有新模块必须遵守）

1. 模块**不能触发自身**（例如 killblast 产生的击杀不触发 killblast）；
2. 模块**可以被 echo 重放触发**，但受各自 triggerLimit 限制；
3. split/fan 产生的衍生弹**不触发** onhit 类新模块（保持现有"衍生弹不递归"规则）；
4. chain 连锁可以触发 onhit 模块，但同一次连锁对同一目标只结算一次；
5. 合成等级**只放大允许成长的值**（伤害/概率），触发上限与半径上限不随等级增长；
6. 所有新模块必须有"对 BOSS 特殊规则"字段，不允许留空。