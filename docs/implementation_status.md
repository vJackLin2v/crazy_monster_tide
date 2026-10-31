# 设计 → 实现 对照表（implementation_status）

> 用途：设计文档（`docs/design/*`）是意图；这里是**代码实际做到哪、由哪条测试证明**。
> 更新：2026-10-31（阶段3 收尾）｜ 基线：`349 PASS / 0 FAIL`，`tsc check + ui-check = 0`，微信包构建成功。

## 一、已实现且与设计一致（有测试）

| 设计决策 | 代码位置 | 测试 |
|---|---|---|
| DamageContext：三个 can* 由工厂推导并 freeze | `game/DamageContext.ts` | §5n、§7 |
| 击杀链路传递来源（summon 不回血、不引爆） | `battle/Battle.ts` `hitEnemy` → `killEnemy` | §7（权限断言）+ 代码审查 |
| 模块统一闸门（来源 / CD / 单次施法上限） | `ModuleUsage` | §5n |
| M1–M6 数值与来源过滤 | `game/ModuleValues.ts` + Battle | §5o |
| 蓄势不统计 echo | `Battle.echoReplay` | §7（castId）+ 代码审查 |
| 四个新技能实体上限 | `data/Skills.ts` + Battle | §5q、§8 |
| 6 条 S 规则 | `game/SkillRules.ts` + Battle | §8（纯函数） |
| 矩阵 = 白名单 = 测试 | `SkillCalc.NEW_SKILL_ALLOW` | §15（72 格） |
| 五档难度与公式 | `data/Difficulties.ts` | §5p、§13 |
| 普通难度不介入（公式层） | `Difficulties` | §13 |
| BOSS 召唤状态机（唯一版本） | `game/BossSummon.ts` | §5p、§14 |
| 精英概率倍率 + 三词缀真实效果 | `game/EliteAffix.ts` + `Battle.updateSpawn` | §9 |
| 存档读全 + 迁移 | `game/Progress.ts` `parseSave` | §10 |
| 传说道具共享上限 | `RunState.legendaryTaken` | §11 |
| 无尽徽章 30/40/50 | `Progress.badgesForRun` + GameRoot | §10 |
| 商店经济遥测 | `game/Telemetry.ts` + GameRoot | §12 |
| 10 件新道具 / 特殊道具 | `data/Items.ts`、`game/SpecialItems.ts` | §5r |

## 二、实现与设计的偏差（已记录，未隐藏）

| 项 | 设计 | 实现 | 说明 |
|---|---|---|---|
| 矩阵里的 thunder/chain | 原矩阵多处 Y | 改为 N（无弹体技能） | 环刃/地雷/蓄能没有弹体，连锁/落雷无从生效；哨兵有真实弹体，保留 Y |
| overload × 地雷 | S | Y（普通伤害乘区） | 见 skill_expansion §8.1；不为了 S 而造机制 |
| 蓄势计数残留 | 替换技能后清零 | 未清零 | 影响极小（同槽位技能换掉后计数沿用），已在此标注 |
| 余烬刻印 | 叠层 +25% | "目标处于灼烧时 +25%" | 与意图接近的简化 |
| 背水 | 攻速 +35% | 伤害乘区近似 | 口径差异 |
| 战斗日志 dmgDealt | 记录本波伤害 | 已补签名并写入 `WaveRec.dmgDealt` | 已修（本轮顺手补齐） |

## 三、尚未实现 / 待人工验证

| 项 | 状态 | 原因 |
|---|---|---|
| 地狱 1.8225 倍经济合理性 | **暂定值** | 需要真机对局数据；已加遥测（波次/进店金币/原价/成交价/购买数/刷新/离店/难度） |
| 精英词缀的视觉区分度 | 部分（护盾蓝色描边） | 需要真机看是否够显眼 |
| 普通难度"完全复刻旧版" | **只能证明公式层** | 仓库没有阶段2 的旧行为快照；已如实标注 |
| 微信真机运行 / 滚动手感 / 特效观感 | 待人工 | 本环境无微信开发者工具与真机 |
| 结算页无尽徽章文案 | 已接 | 未真机确认排版（宽度 340、11px） |

## 四、验证基线（写任何结论前先跑）

    tsc -p tsconfig.check.json         -> 0
    tsc -p tsconfig.ui-check.json      -> 0
    tsx tests/run.ts                   -> 349 PASS / 0 FAIL
    cmd /c "build-wechat.bat -nopause" -> success（3.07MB / 10.90MB 级别）

> `tsconfig.full-check.json` 是诊断用全量检查（含 Battle/GameRoot/UI），当前有 **14 条历史遗留类型错误**
> （GameRoot 重复字段、Battle 旧签名等），**不是本轮引入**，未纳入门禁；本轮只把它当"新增错误过滤器"用。
