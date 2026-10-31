# 文档冲突检查报告（doc_conflict_check · v7）

> 生成：2026-10-31 ｜ 检查对象：`docs/design/*.md`（不含本文件自身）
> 方式：A 关键词扫描（PowerShell Select-String）+ B 逻辑一致性断言（代码/测试对照）。

## A. 关键词扫描（旧规则残留）

命令（`docs/design` 下）：

    Select-String -Path *.md -Pattern 'pendingSummon\b|lastSummonAt|summon70Done|summon35Done|pendingSummonCount' -Exclude doc_conflict_check.md

| 旧规则 | 命中 |
|---|---|
| pendingSummon / lastSummonAt（旧 Boolean 状态机） | **0** |
| summon70Done / summon35Done | **0** |
| pendingSummonCount（旧名） | **0** |
| 技能槽 -2 | **0** |
| 护盾 3/5/9 | **0** |
| 半径不随合成成长 | **0** |
| 四档稀有度 | **0** |
| 衍生弹不触发 onhit | **0** |
| 每波涨价 1.2% | **0** |

结论：**关键词 0 命中**（本文件自述行除外）。

## B. 逻辑一致性断言

| # | 断言 | 证据 | 结果 |
|---|---|---|---|
| L1 | 存档只允许 selectedDifficulty / difficulties / RunState.difficulty 三个**难度**字段，且读取路径读全 | `game/Progress.ts` `parseSave`；tests §10 | PASS |
| L2 | 难度行：视觉 40 + 热区 44 | `ui/DifficultyScreens.ts`；tests §5p | PASS |
| L3 | M5 allowedSources 仅 normal/split | `ModuleValues.lingeringChance`；tests §5o | PASS |
| L4 | BOSS 状态机字段与空位规则只有一套（§4） | `game/BossSummon.ts`；tests §5p + §14 | PASS |
| L5 | 普通难度不介入：倍率/价格/概率/回血原样返回 | tests §13 | PASS |
| L6 | M2 护盾 3/5/7 | tests §5o | PASS |
| L7 | M1 半径 40/46/52 且无矛盾表述 | tests §5o | PASS |
| L8 | M3/M4/M6 三档数值 | tests §5o | PASS |
| L9 | 四技能兼容矩阵 18 行，且与白名单**逐格一致** | tests §15（72 格）+ `SkillCalc.NEW_SKILL_ALLOW` | PASS |
| L10 | 传说奖励池排除规则（商店与升级池共享计数） | `RunState.itemAllowedInPool`；tests §11 | PASS |
| L11 | 旧系统回归基线（16 技能 / 18 模块 / 70 道具） | tests §1~§6（264 条旧断言全部保留） | PASS |
| L12 | 最终决策表含 v6 新增（六条 S / 精英词缀 / 徽章 / 遥测） | FINAL_DESIGN_DECISIONS.md | PASS |
| L13 | 哨兵击杀禁止触发 harvest | `DamageContext.canSourceHarvest` + `Battle.killEnemy`；tests §7 | PASS |
| L14 | 哨兵可通过 vamp 吸血（仅哨兵） | `canSourceVamp`；tests §7 | PASS |
| L15 | 地狱价格标为暂定 | FINAL_DESIGN_DECISIONS §I + difficulty_system_design §9 | PASS |
| L16 | 测试禁止用配置值当预期 | `tests/run.ts` 新断言全部写死独立期望值 | PASS |
| L17 | 精英词缀三档有真实效果 | `game/EliteAffix.ts`；tests §9 | PASS |
| L18 | 无尽徽章 30/40/50、幂等、按难度隔离 | `Progress.badgesForRun`；tests §10 | PASS |

## C. 本轮修掉的文档矛盾（记录）

1. `difficulty_system_design.md` §4 旧 Boolean 状态机与 §8 新规则并存 → 合并为唯一 §4；
2. `FINAL_DESIGN_DECISIONS.md` 抬头"未写任何游戏代码" → 改为"已实现并测试"；
3. 兼容矩阵 6 个 S 但决策表只列 4 条 → 统一为 6 条（overload×地雷降为 Y，补 echo×蓄能 / harvest×哨兵）；
4. 矩阵里 harvest×哨兵 标 Y → 改 S（可装但召唤物击杀不回血）；
5. `difficulties_data_spec.md` 的 `rewards` 字段与代码 `reward` 不一致 → 统一；
6. 矩阵与 `NEW_SKILL_ALLOW` 有 6 处不一致（环刃 echo、地雷 chain、哨兵 giant/echo、蓄能 rapid/chain/thunder）→ 以"无弹体不产生弹体模块效果"为准全部对齐。

## 结论

关键词 **0 命中**；逻辑断言 **18/18 PASS**；测试 **349 PASS / 0 FAIL**。
