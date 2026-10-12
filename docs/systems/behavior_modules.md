# 行为模块系统（本作核心差异点）

> **状态标记约定**：`[定]` = `requirements.md` 已明确的规则；`[TBD]` = 尚未定义，**不得自行脑补**，
> 需经用户确认后写入 `memory-bank/decisions.md` 再回填本文件。
> **迁移候选**：母本工程 `H:\AI-game\pixel_roguelike_wechat_agent_kit\docs\systems\` 有同主题成稿，
> 迁移属决策项（`decisions.md` D-04），未批准前不作为依据。

## 1. 已确定规则 `[定]`

- 行为模块 = 可插拔的技能修饰器。
- 每个主动技能 **最多 3 个槽位**。
- 模块**可以重复安装**，除非该模块被定义为唯一 / 不可重复。
- 重复模块按**自身声明的叠加规则**生效。
- 模块可安装到**任意兼容**的主动技能槽位。
- 玩家可在 **Build 面板中重新分配**已拥有的模块到其他技能。
- 升级奖励中「行为模块」选取后，进入**安装目标**步骤。

## 2. 模块数据字段 `[TBD]`

```
behavior_id / name / requires_tags[] / conflicts[] 
/ stack_type: additive | tier | unique | exclusive
/ max_stack / priority / scope: self | spawned | descendant / description
```

## 3. 执行顺序与冲突 `[TBD]`

- 多模块同时生效时的**执行优先级**规则未定义。
- `conflicts` 的判定时机（安装时拦截 / 运行时忽略）未定义。
- 兼容性判定的唯一依据（标签？能力接口？两者皆需？）未定义。

## 4. 待定义清单

- [ ] 首版约 18 个行为模块清单（ID / 叠加方式 / 作用 / 上限）
- [ ] 叠加规则的具体语义（additive 的加法基数是乘区还是加区）
- [ ] 唯一 / 互斥模块的处理与 UI 提示
- [ ] 卸下 / 搬家是否有代价（金币？冷却？不可逆？）
- [ ] 槽位是否可扩容
