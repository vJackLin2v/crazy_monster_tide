# 阶段3 初审报告（stage3_initial_audit）

> 生成时间：2026-10-31 14:3x（Asia/Shanghai）
> 目的：在改任何代码之前，先把"文档写了什么 / 代码实际做了什么 / 测试证明了什么"三者对齐到同一个事实基线。
> 本报告所有结论都来自本机实际执行，不接受文档自述。

---

## 1. 基线信息

| 项 | 值 |
|---|---|
| 仓库路径 | `H:/AI-game/crazy_monster_tide` |
| 分支 | `main` |
| 当前 commit | `17005da46921f58dd4b80966b350fff7dc1441f4` |
| 最近 3 次提交 | 17005da 修复技能卡展开 ReferenceError → d58d584 文档交接 → 2c63d66 商店道具滚动列表 |
| 工作区（已跟踪文件） | **干净**：`git diff --stat` = 0 行 |
| 工作区（未跟踪） | 11 项：`wlog*.txt`（10 个调试日志）、`tools/ui/verify_handoff.py`。均为上一轮遗留，本次不删除、不提交 |
| 引擎 | Cocos Creator 3.8.6 |
| 目标平台 | 微信小游戏（wechatgame） |
| 设计分辨率 | 360×640（竖屏） |

### 1.1 本报告的可复现命令

```powershell
cd H:/AI-game/crazy_monster_tide/cocos
node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json       # EXIT=0
node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.ui-check.json    # EXIT=0
node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts

cd H:/AI-game/crazy_monster_tide
cmd /c "build-wechat.bat -nopause"
```

---

## 2. 源码与测试的真实位置

### 2.1 源码（`cocos/assets/scripts/`，共 46 个 .ts）

| 系统 | 真实文件 | 关键符号 |
|---|---|---|
| 伤害事件 | `game/DamageContext.ts` | `DamageSource` / `DamageContext` / `makeDamageContext` / `canHarvest` / `canVamp` / `ModuleUsage` / `nextCastId` |
| 伤害结算入口 | `battle/Battle.ts` L1196 `hitEnemy` / L1311 `killEnemy` / L1174 `applyRawDamage` | 所有伤害必须走 `hitEnemy` |
| 黑科技数据与闸门 | `data/Modules.ts`、`game/ModuleValues.ts`、`game/ModuleScale.ts` | `MODULES` / `MODULE_HOOKS` / `MODULE_NUMS` / `modEffect` |
| 模块兼容白名单 | `game/SkillCalc.ts` L3 `NEW_SKILL_ALLOW` | 四个新技能的可装模块列表 |
| Harvest / Vamp | `Battle.ts` L1249（vamp）、L1352（harvest）、L196 `healPlayer` | 回血统一入口 |
| 哨兵 | `Battle.ts` L902（施放）、L1548-1558（开火）、`src='summon'` | 单体直接伤害，无弹体 |
| 地雷阵 | `Battle.ts` L895-901（布置）、L1534-1547（触发）、L1577-1584 `explodeTrap` | 48px 范围伤害 |
| 环刃 | `Battle.ts` L891-894（施放）、L1520-1533（每 0.25s 判定） | `orbits[slot].n = min(4, 1+lvl)` |
| 蓄能脉冲 | `Battle.ts` L905-907（进入蓄力）、L1560-1574（3s 结算） | `charges[slot]` |
| BOSS 召唤 | `game/BossSummon.ts`（纯逻辑）+ `Battle.ts` L1597-1632 | `BossSummonState` |
| 难度 | `data/Difficulties.ts`（配置 + 公式） | `difficultyOf` / `shopPrice` / `eliteChance` / `healAmount` / `healBudget` |
| 难度 UI | `ui/DifficultyScreens.ts` | 由 `rules[]` 自动生成文案 |
| 商店与经济 | `game/RunState.ts` L388 `refreshShop` / L409 `makeShopItem` / L447 `buySlot` / L433 `rerollCost` | 价格在生成时锁定 |
| 精英生成 | `Battle.ts` L1642-1655 | 见 §6.2（词缀未实现） |
| 传说道具 | `data/Items.ts`（`tier: 3`）+ `RunState.ts` L174 / L411（候选池） | 无共享计数 |
| 无尽 / 徽章 | `game/RunState.ts` L46 `endless`、`GameRoot.ts` L802 `continueEndless` | 无里程碑记录 |
| 存档 | `game/Progress.ts`（类型 + `migrateDifficulty`）、`engine/Save.ts`（读写） | 见 §6.3 |
| 遥测 | `game/Telemetry.ts` | 每波一行 / 每局一行 |
| 成就 | `game/Achievements.ts` | 15 条，无难度/无尽维度 |

### 2.2 测试

| 文件 | 作用 |
|---|---|
| `cocos/tests/run.ts` | **唯一的逻辑层单测入口**（699 行，264 条断言，纯 Node，不依赖 cc） |
| `cocos/tests/_gen_balance.ts` / `_gen_design.ts` / `_smoke_numbers.ts` | 生成脚本 / 冒烟脚本，不是断言测试 |
| `cocos/tsconfig.check.json` | 覆盖 `core/ data/ game/ tests/`（**不含 ui/、不含 GameRoot.ts**） |
| `cocos/tsconfig.ui-check.json` | 只覆盖 `ui/ScrollView.ts、CodexScreens.ts、Modals.ts、MetaScreens.ts` |

> ⚠️ `GameRoot.ts`（1071 行）与绝大多数 `ui/*.ts` **不在任何类型检查配置里**。本报告认为这是既有结构性问题，本轮不扩大重构，但涉及 UI 传参的改动会手动核对。

### 2.3 设计文档

`docs/design/` 下 34 个文件（含 PNG 参考图），本轮直接相关 9 个：
`FINAL_DESIGN_DECISIONS.md`、`doc_conflict_check.md`、`damage_event_interface.md`、
`skill_expansion_design.md`、`difficulty_system_design.md`、`difficulty_ui_spec.md`、
`difficulties_data_spec.md`、`expansion_acceptance_criteria.md`、`item_expansion_design.md`。

---

## 3. 当前测试与构建基线（实测）

### 3.1 测试

```
PASS 264 / FAIL 0
```

- 执行：`tsx tests/run.ts`
- 原始输出已保存：`stage3_delivery/test_reports/test_execution.log`
- 264 条中与本次任务直接相关的分组：5n（伤害上下文）、5o（M1–M6 数值）、5p（难度 + 召唤状态机）、5q（新技能白名单）、5r（特殊道具）
- **测试覆盖的盲区**（本轮必须补）：
  1. `killEnemy` 的来源传递（哨兵击杀是否触发 harvest）没有测试；
  2. `updateEcho` 是否计入蓄势（overcharge）没有测试；
  3. 环刃 `orbit` 模块是否真的加片没有测试；
  4. 地雷 `split` / `echo` 的实际行为没有测试（白名单测试只证明"能装"，不证明"有效果"）；
  5. 蓄能 `echo` 没有测试；
  6. 精英词缀没有任何测试（因为没实现）；
  7. 传说道具共享上限没有测试；
  8. 存档**读取路径**（`loadSave`）没有测试，只测了 `migrateDifficulty` 纯函数；
  9. 无尽徽章没有测试。

### 3.2 构建

```
[1/3] building wechatgame (~60s) ...
[2/3] writing project.config.json (BOM-less UTF-8) ...
   appid=wx8a25bc49632e9b92  libVersion=3.17.5  orientation=portrait
   main package 3.06MB (limit 4MB)   total 10.89MB (limit 20MB)
[3/3] done: ...\cocos\build\wechatgame
```

产物：`cocos/build/wechatgame`，`assets/main/index.js` 247,466 字节，LastWriteTime 2026-10-31 13:38:06。
**构建成功，无报错。** 该产物对应 commit `17005da` 的代码内容。

---

## 4. 已实现且与已确定规则一致（本轮不需要改）

| 规则 | 证据 |
|---|---|
| `canTriggerModules` 由来源推导，调用方无法传（`extra` 类型里没有该字段） | `DamageContext.ts` L51-64 |
| module / summon 默认不触发模块 | `canSourceTriggerModules` L24-26 |
| 模块统一闸门（来源 → allowedSources → CD → 单次施法上限） | `ModuleUsage.canTrigger` L91-98 |
| `castId` 每次主动施法递增 | `nextCastId` L40-43 + `Battle.fireSkill` L791 |
| 召唤物击杀**计入总击杀数** | `killEnemy` L1316 `this.rs.addKill(...)` 无条件执行 |
| BOSS 召唤状态机字段已是新规则（`pendingWaves` / `lastSummonCompletedAt` / `warningActive`） | `BossSummon.ts` L15-70 |
| 五档难度配置与 §1 参数表一致（含普通 `healBudgetPerSecond: null`） | `Difficulties.ts` L51-115 |
| 地狱 1.8225 = `shopPriceMul 1.35` × `(1 + 0.35)`，且为配置项 | `Difficulties.ts` L105 / L139-143 |
| 难度页视觉 40 / 热区 44 | `DifficultyScreens.ts` + 5p 测试 |
| 普通难度不重复乘倍率（`difficultyOf('normal')` 直接返回 BASE，无覆盖） | `Difficulties.ts` L119-123 |
| 地狱 BOSS 狂怒（伤害 +25% / 移速 +15%） | `Battle.ts` L1601-1605 |
| 旧档迁移纯函数（只补不改） | `Progress.ts` L63-76 + 5p 测试 |

---

## 5. 未实现 / 半实现（必须在本轮处理）

| # | 功能 | 现状 | 证据 |
|---|---|---|---|
| 1 | **精英词缀**（shield / swift / split） | 只在 `Difficulties.rules` 里写了字符串，**没有任何战斗效果**；`Battle.ts` 里 grep 不到 `affix` | `Difficulties.ts` L82/L95/L109；`Battle.ts` 无命中 |
| 2 | **难度精英概率倍率** | `eliteChance()` 已实现并被测试，但 **Battle 从未调用**；精英出现完全由波次决定 | `Difficulties.ts` L129；全仓仅测试文件引用 |
| 3 | **精英单位写死** | 精英恒为 `gnollberserker`，与当前波次的怪池无关 | `Battle.ts` L1652 |
| 4 | **传说道具共享上限** | `RunState` 的商店池 / 奖励池只按"是否已拥有"过滤，**没有"每局最多 1 件传说"的计数**，也没有商店↔奖励共享 | `RunState.ts` L174、L411 |
| 5 | **无尽徽章** | 无里程碑记录、无持久化、无结算展示 | `RunState.ts` 只有 `endless` 布尔 |
| 6 | **地狱经济数据采集** | `Telemetry` 只记每波耗时/击杀/金币/血量，**不记商品原价、售价、购买数、刷新数、难度** | `Telemetry.ts` L16-45 |
| 7 | **环刃 × orbit（S）** | 白名单允许安装，但 `orbits[slot].n` 只按等级算，**忽略 `rt.orbit`** | `Battle.ts` L893 |
| 8 | **地雷 × split（S）** | 白名单允许，`explodeTrap` **不产生分裂弹** | `Battle.ts` L1577-1584 |
| 9 | **地雷 × echo（S）** | 白名单允许，trap 分支**从不 `queueEcho`** → 装了完全没效果 | `Battle.ts` L895-901 |
| 10 | **蓄能 × echo（S）** | 白名单允许，charge 分支**从不 `queueEcho`** → 无效果（设计写的是"重放不重新蓄力"，现在是"没有重放"） | `Battle.ts` L905-907 |
| 11 | **哨兵 × multi/fan/split（白名单 Y）** | 哨兵是**直接单体伤害**，不生成弹体 → multi/fan/split/bounce/pierce 全部无效（只有 burn/slow/chain/vamp/echo 之类在 `hitEnemy` 内生效） | `Battle.ts` L1558 |

---

## 6. 已知冲突（文档 ↔ 代码 ↔ 任务书）

### 6.1 兼容矩阵与 S 规则

- `skill_expansion_design.md` 矩阵有 **6 个 S**：`split×地雷`、`orbit×环刃`、`echo×地雷`、`echo×蓄能`、`vamp×哨兵`、`overload×地雷`。
- 但 §6「四条 S 规则」只定义了 4 条（没有 `echo×蓄能`、`overload×地雷`），`FINAL_DESIGN_DECISIONS.md` §J 也只列 4 条。
- 矩阵里 **harvest × 哨兵 = Y**，与"哨兵击杀不触发 Harvest"直接矛盾。
- `SkillCalc.NEW_SKILL_ALLOW` 与矩阵不一致：

| 组合 | 矩阵 | 白名单 | 实际效果 |
|---|---|---|---|
| 环刃 echo | N | **允许** | 无（orbit 分支不 queueEcho） |
| 地雷 chain | N | **允许** | 生效（hitEnemy 会连锁） |
| 哨兵 giant | N | **允许** | 生效（影响 rt.size，但哨兵不用 size） |
| 哨兵 echo | N | **允许** | 生效（重放哨兵施法） |
| 蓄能 rapid | N | **允许** | 生效（影响 cd） |
| 蓄能 echo | S | 允许 | **无效果** |

### 6.2 精英生成

- 设计：休闲 0.8 倍概率、困难 1.2、噩梦 1.5、地狱 1.8；困难 12 波起 25% 带护盾；噩梦 8 波起必带 1 词缀；地狱必带 2 个不同词缀。
- 代码：`want = max(elitesThisWave, guaranteed ? 1 : 0)`，与概率倍率无关；词缀字段完全没读。
- 设计文档还要求"地狱 5/8/11/14/17/20 波至少 1 只（已有则不补）" —— 代码的 `guaranteed` 用 `max` 实现，若该波本来就出 2 只则不额外补，语义基本一致。

### 6.3 存档

- 文档/任务书要求：`Progress.selectedDifficulty`、`Progress.difficulties`、`RunState.difficulty` 三个字段完整持久化，局内只读 `RunState.difficulty`。
- 代码：
  - `Progress.ts` 定义了完整 `SaveData`（含 `seen`/`charsWin`/`fxAlpha` 等）；
  - **`engine/Save.ts` 的 `loadSave` 只恢复 `music/sfx/runs/wins/kills/bestWave/bestLv/bossKills/merges/ach`**（L28-32），
    `selectedDifficulty` / `difficulties` / `seen` / `charsWin` / `fxAlpha` / `shakeOn` / `hurtOn` **全部丢失**。
  - 后果 1：玩家解锁的难度重启后回到 `['casual','normal']`；
  - 后果 2：图鉴/角色通关记录/画面偏好全部不落盘；
  - 后果 3：`migrateDifficulty` 因为字段已存在（默认值）而永远不会补 `hard`。
- 这是 **P0**：不是"没实现"，是"写进去了但读不回来"。

### 6.4 伤害来源链路

- `hitEnemy` 构造了 `ctx`（来源正确），但 L1303 调用 `killEnemy(e, rt)` **没有把 `ctx.source` 传下去**。
- `killEnemy` 的 `src` 默认 `'normal'`，于是 **哨兵击杀被当成玩家普攻击杀**：
  - `rt.harvest` 照常回血（L1352）→ 违反"哨兵击杀不触发 Harvest"；
  - `killblast` 照常触发（L1327）；`killHeal` 属性照常回血（L1318）。
- 现有测试没有覆盖这一点，所以 264 PASS 并不代表这条规则成立。

### 6.5 echo 与蓄势

- 设计：echo 重放**不计入** overcharge 施法次数、不重置计数。
- 代码：`updateEcho` → `fireSkill` → L793-803 无条件 `castCount++`。**echo 会计数。**
- 这会改变 M6 的实际触发频率（装了 echo 的技能更早蓄势）。

### 6.6 文档内部重复

- `difficulty_system_design.md` **§4** 用旧字段（`summon70Done/summon35Done/lastSummonAt/pendingSummon`），**§8** 用新字段（`pendingSummonWaves/lastSummonCompletedAt`）。两套规则并存。
- `doc_conflict_check.md` 的 L13「哨兵击杀禁止触发 harvest = PASS」与 §6.4 的代码事实不符，属于**断言失真**。
- `FINAL_DESIGN_DECISIONS.md` 抬头写"状态：待开发（未写任何游戏代码）"，与实际（阶段3 已交付）不符。

### 6.7 回血预算

- 配置：休闲 8 / 普通 null / 困难 8 / 噩梦 6 / 地狱 5 —— 与任务书一致。
- 代码：`healPlayer` 对所有来源统一走 `healAmount` × `healBudget`（正确）；
  但**普通难度**分支里 `cap = budget === null ? 5 : min(budget,5)`，即普通难度每次回血被夹 5 点、且**不累计预算**。
  这是否等于"旧版本行为"无法从当前仓库证明（见 §7）。
- `healBudgetSpent` 的每秒清零逻辑需要确认（在 `update` 中）。

---

## 7. 无法验证的内容

| 项 | 原因 | 结论 |
|---|---|---|
| 微信真机运行 | 本机无微信开发者工具 + 真机 | 不能声称"真机通过" |
| 真机帧率 / 滚动手感 | 同上 | 待人工 |
| 地狱 1.8225 的经济合理性 | 无真机对局数据 | 标记"暂定，待真机" |
| "普通难度完全复刻旧版本" | 仓库里**没有阶段2 的旧版本代码或旧测试基线**（git 历史有，但旧行为没有断言化） | 只能证明"普通难度不进入覆盖分支"，不能证明"逐项等于旧版"；本轮会把可证明的部分写成测试并明确标注不可证明项 |
| 视觉观感（陨石/乱杀/自爆特效） | 需人眼确认 | 待人工 |
| UI 全部界面 | 需真机/模拟器 | 本轮只做构建级验证 + 代码级检查 |

---

## 8. 初审结论

1. **可以继续**：源码完整、测试可跑、构建可出包，环境具备修复条件。
2. **P0 四项全部真实存在**，且其中两项（损伤来源、存档读取）是**规则级 bug**，不是文档问题：
   - P0-1 兼容矩阵：6 个 S 里 4 个无实现，harvest×哨兵标错；
   - P0-2 DamageContext：接口基本正确，但**来源在击杀链路上丢失**、echo 会计数；
   - P0-3 BOSS 状态机：代码已是新规则，**文档有两套**；
   - P0-4 存档：字段定义完整，**读取路径丢字段**（P0 级）。
3. **P1 五项全部未落地或半落地**（精英词缀 0%、传说上限 0%、无尽徽章 0%、经济采集 0%）。
4. 因此本任务书的工作量是"真实开发"，不是"文档对齐"。

### 下一步（按任务书顺序）

1. P0-1：重做兼容矩阵 + 实现/修正 S 规则（含 harvest×哨兵 = S）；
2. P0-2：来源贯穿击杀链路、echo 不计数、权限字段只读化；
3. P0-3：文档只留一套状态机；
4. P0-4：存档读取路径 + 迁移测试；
5. P1-1 ~ P1-5；
6. 回归 + 集成测试；
7. 文档同步 + 交付包（含真实截图，若无法截图则明确标注待人工）。
