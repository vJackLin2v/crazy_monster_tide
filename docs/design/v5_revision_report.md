# v5 修订报告（v5_revision_report）

> 本轮**只改设计文档**，未修改任何游戏源代码、未新增/删除技能黑科技道具、未改变已确认数值。
> 检查方式：关键词扫描 + 12 条逻辑断言（见 doc_conflict_check.md）。

## 一、P0 修复

### P0-1 存档字段统一

| 项 | 内容 |
|---|---|
| 修改文件 | difficulty_system_design.md、difficulty_ui_spec.md、FINAL_DESIGN_DECISIONS.md |
| 修改前 | 三份文档分别写 progress.difficulty / save.difficulty / Progress.selectedDifficulty |
| 修改后 | 只允许 Progress.selectedDifficulty、Progress.difficulties、RunState.difficulty；UI 只写 selectedDifficulty，开局复制到 RunState，局内只读 |
| 同步 | 迁移代码改为 selectedDifficulty == null 判定；UI 保存规则同步；最终决策表新增 G 节 |
| 断言 | L1：全文无旧字段写法 —— PASS |

### P0-2 难度行热区

| 项 | 内容 |
|---|---|
| 修改文件 | difficulty_ui_spec.md |
| 修改前 | 视觉 40px，验收却要求 44x44，自相矛盾 |
| 修改后 | 视觉 40px、pitch 44px、**点击热区 44x44**（上下各外扩 2px 覆盖行间 4px 空隙）；按钮 48/44 达标；最后一行热区底 366 < 详情 370 |
| 断言 | L2 —— PASS |

### P0-3 M5 allowedSources

| 项 | 内容 |
|---|---|
| 修改文件 | module_expansion_design.md、FINAL_DESIGN_DECISIONS.md |
| 修改前 | 只写了 normal 35/45/55%、split 减半，没有 allowedSources |
| 修改后 | allowedSources = normal / split；echo、chain、module、summon 明确不允许 |
| 断言 | L3 —— PASS |

### P0-4 BOSS 召唤状态机

| 项 | 内容 |
|---|---|
| 修改文件 | difficulty_system_design.md（新增 §8）、FINAL_DESIGN_DECISIONS.md |
| 修改前 | pending 字段语义不明（波次还是怪物数），空位为 0 时可能永久挂起 |
| 修改后 | pendingSummonWaves（待执行波次）；每个阈值只提交 1 个请求；执行时 空位 = 6 - 存活，数量 = min(3, 空位)，空位 0 则请求直接完成；两次**实际完成**间隔 >= 12s；同一时刻 1 个预警；BOSS 死亡清空 |
| 断言 | L4 —— PASS |

### P0-5 普通难度不介入

| 项 | 内容 |
|---|---|
| 修改文件 | difficulty_system_design.md（新增 §9）、FINAL_DESIGN_DECISIONS.md（新增 F 节） |
| 修改前 | 只说了"不启用回血预算"，未说明其他系统 |
| 修改后 | 刷怪间隔不重算、成长不乘 1.0、商店不应用倍率、回血走原逻辑（null）、不加精英随机判定、奖励权重不变；实现用"非普通才叠加覆盖" |
| 断言 | L5 —— PASS |

## 二、P1 修复

| 编号 | 修改文件 | 修改后 |
|---|---|---|
| P1-1 | module_expansion_design.md | M6 明确计数时机：主动施法生成 castId → 计数 +1 → 达到周期则该次生效并归零；周期表 3/2/2 次；echo 不计数、不重置 |
| P1-2 | damage_event_interface.md | canTriggerModules 由入口按来源推导（module/summon 为 false），调用方不得传；模块再用 allowedSources 过滤；豁免只能走白名单 |
| P1-3 | damage_event_interface.md §8 | M1 先范围查询取候选，>60 时只在候选内按距离取最近 60，禁止全场排序 |
| P1-4 | module_expansion_design.md | M5 同帧按创建序号删除最早；删除即停止后续跳伤；伤害快照不可变；来源固定 module |
| P1-5 | skill_expansion_design.md | 新增四技能 x 18 黑科技兼容矩阵（Y/N/S 共 72 格）+ 特殊规则明细 + 哨兵专项（来源 summon、不触发玩家 onhit、不可复制自身） |
| P1-6 | item_expansion_design.md | 已拥有传说后两个系统在**生成候选时排除**；不足 3 个用普通/稀有补位；不重复发放唯一道具；无空位 |

## 三、旧系统回归基线（新增）

expansion_acceptance_criteria.md 增加一节：普通难度下 16 技能 DPS（偏差 <2%）、18 模块触发逻辑（现有断言不得修改）、70 道具 itemNumbers 快照、普通商店价格快照、旧存档字段完整性、第 1/10/20 波生成数量快照。

## 四、同步情况

| 文档 | 是否同步 |
|---|---|
| FINAL_DESIGN_DECISIONS.md | 已更新（M1/M5/M6/召唤/存档/UI/传说/普通难度/新增 F、G 节） |
| doc_conflict_check.md | 已重生成（关键词 0 命中 + 12 条逻辑断言全 PASS） |
| module_expansion_design.md | 已更新（M1/M2/M5/M6） |
| damage_event_interface.md | 已更新（canTriggerModules 推导、M1 流程、returnIndex） |
| difficulty_system_design.md | 已更新（存档、召唤、普通难度） |
| difficulty_ui_spec.md | 已更新（热区、热区与视觉分离） |
| difficulties_data_spec.md | 已更新（healBudget null、词缀池、优先级） |
| skill_expansion_design.md | 已更新（兼容矩阵、哨兵规则） |
| item_expansion_design.md | 已更新（传说池处理、稀有度表） |
| expansion_acceptance_criteria.md | 已更新（回归基线、覆盖要求） |

## 五、尚未解决 / 需人工确认

1. 哨兵击杀是否计入 harvest（击杀回血）——文档写了"需实现时显式确认"，这是**唯一保留的待定项**；
2. 地狱商店最终价 1.8225 倍是否可接受（数值层面，需真机数据）；
3. 兼容矩阵中 4 个 S（特殊）规则的具体数值（orbit×环刃 +1 片、split×地雷 40%、echo×地雷 1 次、vamp×哨兵回血）仍需在开发时用测试固定。

## 六、结论

P0 5 项、P1 6 项全部处理；关键词扫描 0 命中；12 条逻辑断言 PASS。
仍有 3 个待确认项（其中 2 个是数值/规则细化，不影响开工）。
