# 《疯狂鸽王》当前项目基线报告

> 阶段 1 交付｜生成时间：2026-11-12｜工作目录：`H:/AI-game/crazy_monster_tide`
> 本轮**未修改任何游戏源码、未提交任何 Git 内容、未重置或清理用户改动**。
> 所有数字均来自本轮实际执行的命令，历史报告里的 PASS 数量未被当成本轮结果。

---

## 0. 检查方法与边界

| 项 | 说明 |
|---|---|
| 检查方式 | 源码定位读取 + `git` 只读命令 + 项目既有验证命令 |
| 明确未做 | `git reset` / `git clean` / `checkout --` / 删除文件 / 覆盖历史报告 / 升级引擎或依赖 |
| 临时产物 | `.tmp/baseline_tests.log`、`.tmp/baseline_build.log`、`.tmp/diag_numbers.ts`、`.tmp/diag_numbers.log`（均为诊断用，不属交付物、不入库） |
| 数值推算 | `.tmp/diag_numbers.ts` 直接 import 项目真实配置模块（Balance / Const / Combat / Enemies / Items / Modules / Attrs / Skills），是**按配置公式推算**，不是真实玩家数据 |

---

## 1. Git 与工作区真实状态

| 项 | 实际情况 | 证据 |
|---|---|---|
| 分支 / 远端 | `main`，跟踪 `origin/main`，无 ahead/behind 标记 | `git status -sb` → `## main...origin/main` |
| 最近提交 | `5d8644e 合规弹窗正文改为居中排版`；再往前 `cede58b 上架前合规内容`、`421e074 命名审查`、`94285b9 清理开发术语`、`d8e75e4 清理测试入口，HUD 按胶囊重排…` | `git log --oneline -12` |
| 已修改（未暂存） | **16 个文件**，合计 `849 insertions / 81 deletions` | `git diff --stat` |
| 未跟踪 | `.workbuddy/`、`M2提示词.md`、`M3提示词.txt`、`cocos/assets/scripts/game/Ads.ts` + `.meta`、`reports/ads_design_20261111.md`、`reports/encryption_plan_20261107.md`、`reports/fix_wechat_boot_20261107.md`、`reports/launch_gap_20261107.md`、3 个 xlsx 备份、`小游戏上架资料/` | `git status -sb` |
| stash | 空 | `git stash list` |
| 归属判断 | 与 `memory-bank/tasks.md` 顶部「广告接入 v1.1.0（2026-11-11）」记录吻合，属**用户正在进行的在途工作** | tasks.md L3–L80 |

**16 个已修改文件清单**（后续提交必须先界定边界，不得混入）：
`GameRoot.ts`、`battle/Battle.ts`、`core/Balance.ts`、`core/BuildTag.ts`、`data/Chars.ts`、`data/Difficulties.ts`、`data/Skills.ts`、`ui/CharLayout.ts`、`ui/DifficultyScreens.ts`、`ui/MenuScreens.ts`、`ui/MetaScreens.ts`、`ui/Modals.ts`、`cocos/tests/run.ts`、`memory-bank/rules.md`、`memory-bank/tasks.md`、`tools/build-wechat.ps1`。

> ⚠️ 构建之后再查一次 `git status --short`，输出与构建前一致 —— 微信构建产物未被 Git 跟踪，本轮验证未污染工作区。

---

## 2. 基线检查表（任务 A）

| 检查项 | 当前实际情况 | 证据（文件:行 或 命令） |
|---|---|---|
| **Git 分支和提交** | `main` @ `5d8644e`，与 `origin/main` 同步 | `git status -sb` / `git log --oneline -12` |
| **工作区状态** | 16 改 + 13 类未跟踪，均为在途工作；stash 空；本轮零改动 | `git status -sb` / `git diff --stat` |
| **游戏启动流程** | `GameRoot.onLoad` → `boot()`（`await preloadUiArt()` 后出菜单）+ 并行 `preloadAll()` → `showMenu()` → `requestStart()`（有活动存档时多一层确认弹窗）→ `showDifficulty()` → `showCharSelect()` → `startBattle()` → `await battle.startRun()` | `GameRoot.ts:237-241, 267-273, 339-380, 565-581, 688-719, 724-760` |
| **战斗系统** | `battle/Battle.ts` 2877 行；4 技能槽自动攻击；敌人 64px 空间网格粗筛；子弹 `hitSetPool` 复用；伤害单一入口 `rollDamage`/`dealDamage` | `Battle.ts:1281-1310`、`game/Combat.ts:112-117`、`memory-bank/tasks.md` PERF-01/批次5 |
| **经验系统** | `gems: Gem[]`；**每只怪固定生成 1 颗**，`v = e.exp`（`ENEMIES` 表静态值，生成时不随波次放大）；击杀只结算金币和击杀数，经验**仅在拾取时**入账；`BASE_PICKUP=56`；波末全场吸取经验 **×0.5** | `Battle.ts:1722-1734, 2656-2695, 1027, 1663`；`RunState.ts:161-189`；`core/Const.ts:54`；`Balance.ts:96` |
| **升级系统** | `expNeed = round(5 + lv × 3.2)`，初始 5；`rollRewards()` 三选一，候选 **5 种 RewardKind**：`skill / skillup / module / item / attr`；权重按等级分 early/mid/late 三档；升多级会连开多次卡，**每次暂停战斗** | `RunState.ts:19-20, 161-171, 224-288`；`Battle.ts:2838-2858`；`Balance.ts:75-80` |
| **商店系统** | 固定 4 货位 + 锁定 + 跨波携带；`makeShopItem` 约 50% 抽 `item`，否则 `module`，两池皆空才兜底 `heal`/`attr`；刷新费 `rerollBase + 次数×3` 并乘难度倍率 | `RunState.ts:22-30, 488-555`；`Const.ts:99-100`；`GameRoot.ts:1201-1305` |
| **技能系统** | 17 个技能（`SKILL_IDS`），8 类形态（projectile / area / pulse / chain / orbit / trap / summon / charge）；角色**开局只有 1 个起始技能**，`MAX_SKILLS=4`；`skillup` 仅 `sk.lvl++` | `data/Skills.ts`、`data/Chars.ts:12-47`、`RunState.ts:356-358`、`SkillCalc.ts:89-91` |
| **黑科技系统** | 17 个模块（`MODULES`），每技能 3 槽；`requires` 兼容校验 + Ⅰ/Ⅱ/Ⅲ 整数级；真实机制分支存在于 Battle（split / chain / echo / orbit / thunder / harvest 等） | `data/Modules.ts:6-22`、`game/SkillCalc.ts`、`Battle.ts:1176-1190, 2580-2600` |
| **敌人和波次** | 12 杂兵 + 1 精英 + 1 BOSS 模板 + 6 个 BOSS 轮换；远程怪 4 种有弹幕；精英冲锋、BOSS 砸地/召唤；`RUN.waves=20`，BOSS 波 10/20，精英第 3 波起（5 波起每 2 波）、12 波起 2 只；波时长 `22 + floor((n-1)/3)×4` 秒 | `data/Enemies.ts:6-47`、`Const.ts:59-82`、`Balance.ts:74`、`Battle.ts:2100-2147, 2167-2180` |
| **难度系统** | 5 档 `casual/normal/hard/nightmare/hell`；除数值倍率外还有 11 类结构化 `rules`（禁精英 / 商店保底 / 精英词缀 / BOSS 召唤 / 刷新次数限制 / 锁位收费 / 狂暴等） | `data/Difficulties.ts:9-22, 50-114` |
| **测试状态** | `cocos/tests/run.ts` 纯逻辑层单测，本轮实跑 **586 PASS / 0 FAIL**；无引擎级战斗实体自动化测试 | 本轮 `tsx tests/run.ts`；`memory-bank/HANDOFF.md:64` |
| **微信构建状态** | **成功**，exit 0，耗时约 2 分钟；主包 3.16MB（限 4MB）/ 总 10.99MB（限 20MB）；已注入 devtools window polyfill、强制 `useIsolateContext=false` | `.tmp/baseline_build.log`；产物 `cocos/build/wechatgame/` |
| **UI / 资源检查** | **失败（环境缺口，非代码缺陷）**：`node tools/ui/audit_text_fit.cjs` → `MODULE_NOT_FOUND: playwright`；`http://127.0.0.1:8123/` → HTTP 502（预览服务未就绪） | 本轮实跑，退出码 1 |
| **遥测** | 本地环形缓冲 `cmt_device_log_v1`（600 条）+ 微信实时日志 `wx.getRealtimeLogManager()` + console；`Telemetry.ts` 本地 `cmt_log_v1`；**全仓无 `wx.request` / 自建上传链路** | `game/DeviceLog.ts:24-63`、`GameRoot.ts:169-211`、全仓 Grep |

---

## 3. 验证命令与真实输出

| # | 命令 | 退出码 | 结果 |
|---|---|---|---|
| 1 | `node …/typescript/bin/tsc -p tsconfig.check.json`（cwd `cocos/`） | 0 | 0 错误 |
| 2 | `node …/typescript/bin/tsc -p tsconfig.ui-check.json`（cwd `cocos/`） | 0 | 0 错误 |
| 3 | `node …/tsx/dist/cli.mjs tests/run.ts`（cwd `cocos/`） | 0 | `PASS 586 / FAIL 0` |
| 4 | `node …/tsx/dist/cli.mjs .tmp/diag_numbers.ts` | 0 | 输出配置快照 + 逐波推算表（见诊断报告） |
| 5 | `cmd //c "build-wechat.bat -nopause"` | 0 | `[1/3] building…` / `[3/3] done`；`main package 3.16MB (limit 4MB) total 10.99MB (limit 20MB)`；appid `wx8a25bc49632e9b92`，libVersion `3.17.5` |
| 6 | `node tools/ui/audit_text_fit.cjs` | **1** | `Error: Cannot find module 'playwright'`（`audit_text_fit.cjs:21`）；设 `NODE_PATH` 指向 H 盘 node_modules 后仍失败（H 盘无 playwright） |

> 命令 1/2/3 使用 `HANDOFF.md` 指定的 H 盘工具链绝对路径，未执行 `npm install`，未向 C 盘写入缓存（`TEMP/TMP/TMPDIR` 均指向工程内 `.tmp/`）。
> 命令 6 的失败已如实记录，**未删除脚本、未降低标准、未用历史「0 条」结论顶替**。

---

## 4. 历史文档与当前代码不一致（抽查）

| # | 文档说法 | 代码 / 实测 | 性质 |
|---|---|---|---|
| 1 | `memory-bank/HANDOFF.md:8` 「测试 **435 PASS**」、`:21` 「期望 435 PASS」 | 本轮实际 **586 PASS** | 文档过期（tasks.md 已记 586） |
| 2 | `memory-bank/architecture.md:14` 「单元测试…**49 项**」 | 586 项 | 文档过期 |
| 3 | `docs/requirements.md:195` R13「商店购买模块后要**直接触发安装**」 | `GameRoot.ts:1268-1269` 注释明确：后续用户指令改为「买完只进背包，点下一波统一装一次」 | 需求变更未回写需求书（按规则不擅自改需求书，登记） |
| 4 | `core/Const.ts:64` `RUN.baseTime = 18`、`:74` `waveTime()` 注释 | 实际生效走 `Balance.wave.baseTime = 22`（Const 第 91-92 行已自注明「仅作文档默认值」） | 双数值源，易误读 |
| 5 | `data/Attrs.ts:38` `pickup.base = 34` | `Stats.ts:11,30` 实际 `pickup = BASE_PICKUP = 56` | 展示基准与生效值不一致（低危） |
| 6 | `Battle.ts:1720-1721` 注释「普通 1×、精英 1.12×、BOSS 1.35×」 | `Battle.ts:1729` 实际 `e.exp>=12 ? 1.15 : e.exp>=4 ? 1.0 : 0.85`（且普通怪 exp ≤ 4） | 注释与实现不一致 |
| 7 | `game/Combat.ts:17-20`、`ALIVE_SOFT=40 / ALIVE_HARD=60 / SLOW=1.6` | `Balance.spawn` 实际 `44 / 58 / 1.45`（`aliveCaps()` 读 Balance） | 默认常量被覆盖，注释未同步 |

---

## 5. 基线缺口（影响后续验收能力）

1. **无引擎级战斗自动化测试**：`tests/run.ts` 只覆盖 `core/data/game` 纯逻辑层，经验球节点、拾取、对象池、波末吸收等运行时行为目前只能靠浏览器/真机验证。
2. **UI 审计链路当前不可用**：`playwright` 依赖缺失 + 8123 预览返回 502 → 本轮**无法产出实际运行截图**。任务书要求的经验球掉落/吸收、升级三选一、商店截图需在实施里程碑前先修复验证环境，不得用设计稿冒充。
3. **无真实玩家行为数据回传**：只有本地日志与微信官方实时日志通道，无自建服务端聚合；6 名玩家 30 秒离开的数据无法从当前链路还原（详见诊断报告 §10）。
4. **真机帧率 / 内存证据缺失**：历史 60s 压测是 headless 浏览器数据，不能当微信小游戏真机 FPS 证据。

---

## 6. 本轮边界声明

- 阶段 1（基线）+ 阶段 2（诊断）+ 阶段 3（方案）已完成，输出三份文档。
- **M1 / M2 / M3 实施、测试报告、截图、Git 提交尚未执行**：按 `AGENTS.md` §7 里程碑制（用户强制要求、最高优先），做完一个里程碑必须停下等确认。
- 用户 16 个未提交修改与全部未跟踪文件**完整保留**，本轮既未覆盖也未混入。
