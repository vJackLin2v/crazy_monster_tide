# 设计 → 实现 对照表（implementation_status）

> 用途：设计文档（docs/design/*）是意图；这里是**代码实际做到哪**。
> 新会话接手时，判断"某个设计是否已落地"看这张表，不要凭文档假设。

## 一、已实现且与设计一致

| 设计决策 | 代码位置 | 说明 |
|---|---|---|
| DamageContext（来源推导 canTriggerModules） | game/DamageContext.ts | module/summon 默认不可触发；canHarvest / canVamp 按 v6 定稿 |
| 模块统一闸门 | ModuleUsage（同文件）+ hitEnemy | 冷却与"单次施法上限"都在闸门里判 |
| M1 溢出爆裂 | ModuleValues.killblast* + killEnemy | 取最近 60 只、爆炸来源 module、不连锁 |
| M2 残影护盾 | ModuleValues.shield* + hitEnemy | 全局 1.5s CD、池上限 9、4s 刷新、受击先扣盾 |
| M3 处决 | ModuleValues.executePct | 结算前血量判定，BOSS 减半 |
| M4 返程斩 | returnstrikePct + Bullet.returnHit | 每次返程只结算一次；原返程伤害保留 |
| M5 焚烧地带 | lingeringChance + spawnArea | 35/45/55%（split 减半）、3 跳、同屏 4 区、快照 |
| M6 蓄势 | overchargePeriod/Mul + fireSkill | 按技能计数，echo 不计数 |
| 五档难度 | data/Difficulties.ts | 普通=基准（倍率 1、rules 空、回血预算 null） |
| BOSS 召唤状态机 | game/BossSummon.ts | 阈值各一次、12s 实际完成间隔、空位 0 请求完成 |
| 难度页 | ui/DifficultyScreens.ts | 视觉 40 / 热区 44 / rules 自动生成文案 |
| 通关解锁 | nextDifficulty + unlockNextDifficulty | 写存档 |
| 四个新技能 | data/Skills.ts + Battle.fireSkill/updateNewSkillTypes | 实体上限：环刃 4 片、地雷 4 枚、哨兵 1 个、蓄能 3s |
| 新技能兼容白名单 | SkillCalc.NEW_SKILL_ALLOW | 无效模块拒绝安装并给原因 |
| 十件新道具 | data/Items.ts + game/SpecialItems.ts | 全部接线（含专注核心冷却 -10%） |
| 滚动列表 | ui/ModalList.ts | 安装屏背包 + 商店已有道具；Node.EventType + 正确位移公式 |

## 二、实现与设计有偏差（以代码为准，文档待回写）

| 项 | 设计值 | 实现现状 | 备注 |
|---|---|---|---|
| 蓄势触发 | 每 3/2/2 次施法 | 同设计，计数在 fireSkill；技能被替换后计数未清零 | 小概率残留，可接受 |
| 精英词缀 | 困难 25% / 噩梦必带 / 地狱 2 个不重复 | **未实现词缀效果**，只有精英数量与血量 | 待做 |
| 地狱 BOSS 狂怒 | 伤害 +25% / 移速 +15% | 已实现（bossEnraged） | — |
| 合成区滚动 | 可滚动 | 未做（候选通常 <=3 行，当前静态显示） | 待做 |
| 余烬刻印 | 叠层 +25% | 实现为"目标处于灼烧时 +25%"（简化） | 与意图接近 |
| 背水 | 攻速 +35% / -8% | 用伤害乘区近似攻速收益 | 口径差异 |
| 陨石方向 | 垂直下落 | 已转 90 度 + 自转（观感待确认） | — |
| 乱杀特效 | 与陨石区分 | 已换斩击特效 | 观感待确认 |

## 三、设计里写了但代码尚未覆盖

1. 精英词缀（护盾/加速/分裂）实际效果；
2. 传说道具"每局 1 件 + 商店与升级池共享计数"（数据有 tier，池权重未接）；
3. 无尽徽章（30/40/50 波每档每里程碑一次）；
4. 图鉴的技能分类（环绕/陷阱/召唤/蓄力）。

## 四、验证基线（写任何结论前先跑）

    tsc -p tsconfig.check.json         -> 0
    tsc -p tsconfig.ui-check.json      -> 0
    tsx tests/run.ts                   -> 264 PASS / 0 FAIL
    cmd /c "build-wechat.bat -nopause" -> success（3.06MB / 10.89MB）
