# 扩展基线审计（expansion_baseline）

> 2026-10-30 ｜ 依据：仓库实际代码 + 一次全量测试（182 PASS）｜ 不抄历史报告

## 1. 技能（16 个，data/Skills.ts）

| id | 名称 | type | tags | 伤害 | 冷却 |
|---|---|---|---|---:|---:|
| fireball | 火球 | projectile | fire, projectile | 12 | 0.85 |
| ice_spear | 冰晶矛 | projectile | ice, projectile, pierceable | 14 | 1.25 |
| arcane | 奥术飞弹 | projectile | arcane, projectile, homing | 5 | 0.50 |
| blade | 回旋刃 | projectile | physical, projectile, return | 11 | 1.25 |
| shockwave | 震荡波 | pulse | physical, area, pulse | 14 | 2.40 |
| chain | 连锁闪电 | chain | lightning, chain | 9 | 1.80 |
| poison | 毒雾 | area | poison, area, dot | 4 | 3.00（4.2s 区域 0.4 跳） |
| meteor | 陨石 | area | fire, area, dot | 14 | 3.60（2.4s 0.35 跳） |
| frostnova | 霜爆 | pulse | ice, area, pulse, slow | 7 | 3.60 |
| blade_storm | 乱杀 | area | physical, area, dot | 7 | 2.40（2.8s 0.30 跳） |
| holybolt | 圣光弹 | projectile | holy, projectile, pierceable | 7 | 0.75 |
| thorn | 荆棘环 | pulse | nature, area, pulse | 10 | 2.60 |
| orb | 雷球 | projectile | lightning, projectile, homing | 12 | 1.10 |
| spike | 扎心 | area | nature, area, dot | 5 | 2.00（3.2s 0.50 跳） |
| frostring | 寒冰环 | pulse | ice, area, pulse, slow | 6 | 1.60 |
| spirit | 灵能箭 | projectile | holy, projectile, homing, pierce | 6 | 1.20 |

类型分布：projectile 7 / pulse 4 / area 4 / chain 1。
**没有任何召唤物、陷阱、环绕物、蓄力型技能。**

## 2. 黑科技（18 个，data/Modules.ts）

| Hook 语义 | 模块 |
|---|---|
| calc（出手时改数值） | multi, fan, orbit, giant, rapid, snipe, overload |
| onhit（命中时） | split, bounce, pierce, burn, frost, vamp, chain, thunder |
| cast（施放时） | echo |
| kill（击杀时） | harvest |
| player（玩家自身） | thornmail |

缺少的 Hook 语义：oncrit（暴击）、onkill-AoE（击杀范围）、onhurt（受击）、onreturn（回旋返程）、onshield（护盾）。

## 3. 道具（70 个，data/Items.ts）

- tier 1 × 50 = **24 个属性 × 2 档（+8% / +16%）+ 2 个治疗** —— 机制同质，只是数值两档；
- tier 2 × 20 = 元素标签加成（火/冰/雷/奥术/物理/毒/圣/自然）、冷却减免、多属性组合；
- **全部唯一**（按 id 去重），70 就是池子大小，重复获取不叠层。

结论：道具目前是"属性微调器"，**没有一件改变规则**（无以血换攻、无少技能多强化、无经济联动）。

## 4. 难度系统

**不存在**。Balance.ts 只有全局常量（spawn/growth/wave/reward/shop/ai/exp），无 per-difficulty 配置；Progress.ts 无难度字段。

## 5. 存档（game/Progress.ts）

字段：金币、解锁角色、统计、成就、seen（图鉴）、fxAlpha/shakeOn/hurtOn、charsWin。
**没有版本号字段**，迁移只能靠"缺字段给默认值"。

## 6. UI 结构（ui/）

12 页：菜单 / 选角 / 玩法 / HUD / 升级 / 抽屉（4 页）/ 商店 / 确认 / 图鉴 / 成就 / 设置 / 结算。
共用 UIKit、ScrollView（Mask + 全局 input + 惯性）、Safe（安全区 + 胶囊）。

## 7. 测试与构建基线（本次实测）

| 项 | 值 |
|---|---|
| 单测 | 182 PASS / 0 FAIL |
| 类型检查 | core + ui 两套配置 exit 0 |
| 微信包 | 主包 3.03MB / 4MB，总包 10.84MB / 20MB |
| 真机 | 未做 |

## 8. 需要扩展的位置

| 位置 | 扩展内容 |
|---|---|
| data/Skills.ts + Battle.fireSkill | 新技能行为（需新增 type 分支） |
| data/Modules.ts + Battle 应用点 | 新 Hook（oncrit/onkill/onhurt/onreturn） |
| data/Items.ts + Stats | 新道具需要"规则型"字段，不只 apply(stats) |
| 新增 data/Difficulties.ts | 五档配置 |
| RunState | 难度倍率注入（成长/刷怪/商店/回血/经验） |
| Progress | 难度解锁 + 存档迁移默认值 |
| ui/ | 难度选择页 + HUD/结算/暂停显示难度 |