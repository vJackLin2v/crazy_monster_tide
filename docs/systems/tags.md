# 标签系统

> **状态标记约定**：`[定]` = `requirements.md` 已明确的规则；`[TBD]` = 尚未定义，**不得自行脑补**，
> 需经用户确认后写入 `memory-bank/decisions.md` 再回填本文件。
> **迁移候选**：母本工程 `H:\AI-game\pixel_roguelike_wechat_agent_kit\docs\systems\` 有同主题成稿，
> 迁移属决策项（`decisions.md` D-04），未批准前不作为依据。

## 1. 定位 `[定]`

标签是**程序用途**的语义标记，用于：

1. 行为模块与技能的**兼容性判定**（`requires_tags`）；
2. 道具 / 属性的**联动判定**；
3. 角色天赋的作用域筛选。

## 2. 标签分类 `[TBD]`

候选维度（待确认）：

| 维度 | 示例 | 用途 |
|---|---|---|
| 元素 | fire / ice / lightning / arcane / physical | 元素联动、抗性、特效 |
| 形态 | projectile / melee / area / beam / chain / summon | 模块兼容判定 |
| 触发 | on_hit / on_kill / on_crit / on_expire | 事件驱动型模块与道具 |
| 来源 | character / item / behavior | 叠加与归属追溯 |

## 3. 待定义清单

- [ ] 标签总表（ID / 中文名 / 语义 / 程序用途）
- [ ] 一个技能可挂几个标签、是否互斥
- [ ] 标签能否被道具临时添加 / 移除
- [ ] 未识别标签的容错策略（报错 / 忽略并记录）
