# 给 DeepSeek 的开发提示词 —— 《疯狂鸽王 / crazy_monster_tide》修复与优化

> 你是一名资深 Cocos Creator 3.8.6 + TypeScript 游戏客户端工程师。请**严格按本提示词**在现有工程上做修复与优化，不要重构整体架构、不要擅自改玩法数值（除明确要求外）。

## 0. 工程背景与硬约束（必须遵守）

- 工程根目录：`H:/AI-game/crazy_monster_tide`，Cocos Creator 3.8.6，竖屏微信小游戏（设计分辨率 360×640，`FIXED_WIDTH`）。
- 代码分层（**严禁破坏**）：
  - `cocos/assets/scripts/core/`、`data/`、`game/` 三层**不得 import `cc`**（可脱离编辑器跑 `tests/run.ts`）。
  - `cocos/assets/scripts/battle/`、`ui/`、`engine/` 可以 import `cc`。
- 像素风硬规则：任何贴图过滤必须 NEAREST；立绘/图标只允许整数倍缩放；不得拉伸。
- 坐标系：世界 y 向下；Cocos 节点 y 向上，`place(node, wx, wy)` 已处理。**不要写死 640**，一律用 `view.getVisibleSize()` / `safeTop()` / `safeBottom()`。
- 渲染层序（沿用在 `Battle.buildTree()`）：Area → Bullet → Unit → Player → Fx → Text。不要调整。
- 修改后**必须**：① `tsc` 双配置 0 新增错误；② `tests/run.ts` 全绿（当前基线 404 PASS，不得回归）；③ 不引入 `any` 兜底掩盖问题。

## 1. 任务 A —— 内存泄漏与真实 Bug（P0，最高优先）

### A1. 【内存泄漏·最严重】滚动区全局数组从不回收
- 文件：`cocos/assets/scripts/ui/ScrollView.ts`
- 现象：`const areas: Area[] = []`（约 L19），`makeScroll()` 每次 `areas.push(a)`（约 L109），但**视图销毁时从不从数组移除**。图鉴页签切换（`CodexScreens.buildCodex().refresh()` 每次都 `makeScroll`）、暂停抽屉切页（`Modals.buildBuildDrawer` 的 `renderMods/renderItems/renderSkills` 每次都 `makeScroll`）会**无限堆积**已销毁的 Area（仍持有 view/content 节点引用）。每帧 fling 循环与触摸循环还要遍历全部历史 Area → 越玩越卡、内存持续增长。
- 修复：在 `makeScroll` 返回的句柄上提供 `dispose()`（或调用方在销毁 view 时调用）；并在 `bind()` 的 `TOUCH_START` 与 `EVENT_AFTER_UPDATE` 回调里**顺带清理** `!a.view.isValid` 的 Area（倒序 splice）。`Modals.ts` / `CodexScreens.ts` 每次 destroy 旧 scroll 后要调用 dispose（或依赖 isValid 清理）。
- 验收：连续切换图鉴 4 个页签 × 20 次、反复开关暂停抽屉，`areas.length` 保持有界（≈当前有效滚动区数量），不随操作次数增长。

### A2. 【跨局状态残留】`resetRunState()` 漏清技能运行时
- 文件：`cocos/assets/scripts/battle/Battle.ts`，`resetRunState()`（约 L426-454）。
- 现象：只清了 enemies/gems/bullets/areas/fx/bolts/meteors/echoQueue，**未清** `this.traps`、`this.sentries`、`this.charges`、`this.orbits`（这四个是纯数据，不带 node，但会让新一局出现"幽灵地雷/哨兵/蓄能/环刃"造成伤害）。
- 修复：在 `resetRunState()` 中补 `this.traps = []; this.sentries = []; this.charges = {}; this.orbits = {};`，并同时重置 `this.healBudgetSpent = 0; this.healBudgetSec = 0; this.healAccum = 0; this.healFxCd = 0; this.thorncoatAt = -9; this.voltloopAt = -9; this.runTime = 0;`。

### A3. 【换/丢技能不清运行时】丢弃环刃后仍在造成伤害
- 文件：`Battle.ts` 的 `resetCastCount(slot)`（约 L417）与技能替换/丢弃调用点。
- 现象：技能被替换/丢弃后只 `delete this.castCount[slot]`，但 `this.orbits[slot]` / `this.charges[slot]` 仍在，`updateNewSkillTypes` 继续结算 → 幽灵伤害。
- 修复：新增 `clearSkillRuntime(slot)`，清 `castCount/orbits/charges` 该槽，并在技能替换、丢弃、开新局处调用。

### A4. 【回血预算失效】普通难度没有每秒回血上限
- 文件：`Battle.healPlayer()`（约 L210-222）+ `data/Difficulties.ts`（`normal.healBudgetPerSecond: null`，L56）。
- 现象：`budget === null` 时 `healBudgetSpent` 永不累加（L220 的 `if (budget !== null)`），每帧/每次命中都能回满 5 点，与文件头注释"吸血+击杀回血合计 ≤8HP/s，不改就站桩不死"**直接矛盾**。普通难度是默认难度，影响最大。
- 修复：给 `normal` 也设置一个预算（建议 8），或在 `healPlayer` 里对 `null` 采用默认 8 并**照常累加** `healBudgetSpent`。保持 `healAmount()` 的条件倍率不变。改完在 `tests/run.ts` 补一条断言：同一秒内多次吸血总和不超过预算。

### A5. 【忽略设置】击杀震屏绕过"关闭震屏"开关
- 文件：`Battle.killEnemy()` 约 L1498：`this.cam.addShake(...)`。
- 现象：其他地方都走 `this.shake()`（内部判断 `FxPrefs.shake`），唯独击杀直接调 `cam.addShake`，玩家关掉震屏后击杀仍震。
- 修复：改为 `this.shake(e.boss ? SHAKE.boss : (e.elite ? SHAKE.elite : SHAKE.kill));`。

### A6. 【数值三处不一致】vamp / thornmail
- `vamp`：`data/Modules.ts` desc（L17）写"伤害的 4% 回复"，`MODULE_NUMS.vamp`（L69）写"伤害的 6% 回血"，`Battle.ts` 实现（L1400）是 `dmg * 0.02 * rt.vamp` = **每份 2%**。
- `thornmail`：desc（L22）"反弹 6 点（Ⅱ 约 9.6）"，`MODULE_NUMS.thornmail`（L74）"反伤 8"，实现（L2041）`Math.round(6 * thorn)` = 6。
- 处理：**以设计意图为准统一为**——vamp 每份 4%（把实现 `0.02` 改成 `0.04`，并同步 `MODULE_NUMS` 为"伤害的 4% 回血"、desc 的"Ⅱ 约 6.4%"保持不变）；thornmail 每份 6 点（把 `MODULE_NUMS` 改成"被咬时反伤 6"）。改完务必让 `tests/run.ts` 里若有数值断言同步更新（若断言写的是旧值，以新规则为准并说明）。

> 注意：A6 会改变平衡，请在提交说明里**单独列出**，不要与纯 bug 混在一起。

## 2. 任务 B —— 描述文案：简洁 + 精准（P1）

> 目标：**同一屏内文风一致、玩家一眼看懂效果**；精确数值统一放到"数值行"（`itemNumbers` / `MODULE_NUMS`），描述行只讲"做什么/换什么"。

### B1. 黑科技（`cocos/assets/scripts/data/Modules.ts`）
- `vamp` / `thornmail`：随 A6 统一。
- 统一规则：desc 里**不要再塞"每份 +10% 且 +0.6s"这类叠加公式**，叠加信息交给 `MODULE_NUMS` 或升级卡 meta；desc 只保留一句效果。请把 `fan / burn / frost / thunder / echo` 中过长的叠加尾巴精简为一句（示例：
  - `burn`：改为"命中附加灼烧，持续掉血"（具体 10%/2s 在 nums）
  - `frost`：改为"命中减速目标"（35%/1.2s 在 nums）
  - `thunder`：改为"命中有概率落雷，范围伤害"（15% 在 nums）
  - `fan`：改为"额外散开 2 枚小子弹（伤害较低、射程短）"
- 删除 desc 里的英文/Hook 术语，全部中文化。

### B2. 道具（`cocos/assets/scripts/data/Items.ts`）
- **`resonator` 描述含开发者术语"同 Hook"**（L96）→ 改为玩家语言："同一技能装了 2 个『同类效果』的黑科技时，该技能伤害 +20%"。若难以解释"同类"，改成更直白："同一技能装满 2 个黑科技时，该技能伤害 +20%"（二选一，选不会误导的那个）。
- `bloodpact` 名称"攻击强化（代价生命）"过于工程化 → 改为有味道的名字（如"血契"），desc 保持"攻击力 +30%，最大生命 -25%"。
- `focused` 名称"少技能强化"拗口 → 改为"极简专精"（或类似），desc 不变。
- tier1 道具 desc 是"更疼一点/明显更疼"这类口语（配合 `itemNumbers` 精确值），**保留**；但请统一语气（不要一半"血条变长"一半"攻击更疼"混着量词）。

### B3. 技能（`cocos/assets/scripts/data/Skills.ts`）
- 去掉 desc 里生硬的裸秒数（如 `poison` 的"持续 4.2 秒"、`blade_storm` 的"0.3 秒一跳"、`spike` 的"3.2 秒"、`meteor` 的"只烧 2.4 秒"），改为体验向描述（"铺得最久/跳得最快/短促爆发"），数值留在图鉴 stats 行。
- 保持每条 desc ≤ 22 个汉字为宜，风格统一为"形态 + 一句话手感"。

### B4. 术语统一
- 全文（`data/`、`ui/`）统一用"**黑科技**"指代 behaviour module，"**道具**"指 items，"**技能**"指 active skill；不要在同一句里混用"模块/黑科技"。

## 3. 任务 C —— 流畅度 / 性能优化（P2）

### C1. 【每帧 16 次 calcSkill】HUD 冷却取值
- 文件：`GameRoot.ts` `syncHud()` 约 L1580-1590：`cdPct: this.battle.skillCdPct[i]` 写在 `[0,1,2,3].map()` 内，而 `Battle.skillCdPct` 是 getter（L2419），每次访问都 `[0,1,2,3].map(i => calcSkill(...).cd)` → 每帧被调用 **4 次** × 内部 4 次 `calcSkill` = **16 次/帧**。
- 修复：`syncHud` 里先 `const cds = this.battle.skillCdPct;` 再按下标取；`Battle` 内改为**缓存每槽总冷却**（`updateSkills` 开火时 `this.skillT[i] = rt.cd`，同时记 `this.cdTotal[i] = rt.cd`），getter 直接用 `skillT[i]/cdTotal[i]`，不再重算 `calcSkill`。

### C2. 【每帧每敌 new Color + getChildByName】
- 文件：`Battle.updateEnemies()` 约 L2010-2016：每帧对每只怪 `e.node.getChildByName('body')` + `getComponent(Sprite)`，并在受击/中毒/灼烧时 `new Color(...)`。
- 修复：① 在 `spawnEnemy` 时把 body 的 `Sprite` 组件引用挂到 `Enemy`（如 `e.bodySp`），update 直接读；② 把 `受击红 / 中毒绿 / 灼烧橙 / 白` 做成模块级常量 `Color`，复用不 new。

### C3. 【对象池】高频 new/destroy 的节点
- 高发对象：伤害数字 `addDamageText`、命中特效 `addVfx(FX.hitSpark)`、经验球、子弹。当前每次命中 `new Node + addComponent(Label/Sprite)`，GC 峰值高。
- 修复：至少为「伤害数字 Label」和「hitSpark 特效」建一个简单对象池（预建 N 个、用完回收、复用 `spriteFrame/string/color`），池上限可配置；避免无限增长。**不要动**池外的玩法逻辑。

### C4. 【每帧 filter 新建数组】
- 位置：`updateBullets`(L2164)、`updateAreas`(L2220)、`updateMeteors`(L1244)、`updateFx`(L2280)、`updateGems`(L2272)、`updateBolts`(L1098)、`updateEcho`(L1196-1197)。
- 修复：改为**就地双指针压实**（`let w=0; for(...) if(keep) arr[w++]=x; arr.length=w;`），避免每帧多次分配新数组。

### C5. 【近邻查询】可选优化
- `nearestEnemy()` 为 O(敌人数)，homing 子弹/连锁/落雷每帧多次调用。若实施成本可接受，加一个简单**空间网格**（按 64px 分桶）加速；若不做网格，则给 homing 子弹的"重新锁定"加 0.1s 节流（每颗弹每 0.1s 才查一次最近敌人）。

### C6. 【HUD 重绘节流】
- 文件：`ui/Hud.ts` `sync()`：每帧对 4 个槽 `clear()+重绘` Graphics、`paintPanel`、并新建 `HudData`/数组。
- 修复：缓存上次的 hp/exp/gold/wave/timer/slot 状态，**值变化才重绘**；`modDots`、冷却遮罩仅在对应数值变化时 clear+draw。`GameRoot.syncHud` 复用同一个 `HudData` 对象，避免每帧 new。

### C7. 其他小项
- `spawnPool` getter（`RunState.ts` L157）每次 `enemyPool(wave)` 新建数组：按 `wave` 缓存。
- `Camera2D.update` 每帧 `view.getVisibleSize()`：缓存尺寸，仅在 `view.on('canvas-resize')` 或尺寸变化时更新。
- `Object.keys(this.orbits/charges)` 每帧分配：改为 `for (const k in obj)` 或维护键数组。

## 4. 任务 D —— UI 细节修复（P3，已登记，逐条修）

1. **装黑科技顶部提示孤字**：`ui/ManageScreens.ts` `buildInstall` 顶部提示（约 L98-101），"……占用=替换（满槽也能换）"在 360 窄屏折行后剩孤立"）"。→ 把"满槽也能换"拆到独立行或去掉括号，确保不出现单字符末行。
2. **图鉴/成就底部与返回按钮仅 12px**：`ui/CodexScreens.ts` L157 `viewBottom = VH - B - 60` → 改为 `VH - B - 74`（给遮罩留更稳的呼吸空间，360 实测不遮挡）。
3. **抽屉末项贴按钮带**：`ui/Modals.ts` L670 `VIEW_BOTTOM = -VH/2 + 196` → 再上收 14px（`+210`），或在底部按钮带加不透明底板，消除"半行贴按钮"观感。
4. **难度卡大片留白**：`ui/DifficultyScreens.ts` 描述卡内容垂直居中（标题顶、奖励底之间空白过大）→ 卡内容整体垂直居中或缩小卡高。
5. **HUD 技能名常显**：`ui/Hud.ts` 里 `nm.node.active = false`（L217）→ 改为常显（字号 9~10、颜色 `COL.dim`），4 技能时可辨识；若担心拥挤，可在槽下居中显示。
6. **商店刷新按钮排版脆弱**：`ui/Modals.ts` L393-397 手动挪 Label 坐标；改为用子节点布局（文字左、金币+数字右），使 2/3 位数都不错位。
7. **微信胶囊**：`ui/Safe.ts` 的 `wxCapsuleRect()` 已用于 HUD；请确认所有顶部 header 右侧元素（商店金币已左移）在真机胶囊下不被压，模拟器验证不了就加日志。

## 5. 已知待裁决项（不要擅自改，仅需保留记录）
- `M1–M6` 六套"扩展黑科技"（`game/ModuleValues.ts` 的 killblast/overcharge/execute/lingering/shieldonhit/returnstrike）在 `Battle.ts` 有结算分支，但**不在 `MODULES` 主表、不在奖励池/白名单**，玩家永远获取不到（死代码）。本轮**不要求**处理；若你顺手接入模块池或删除，请**单独提交**并说明。

## 6. 验收标准（全部满足才算完成）
- `tsc`（`check` + `ui-check` 双配置）0 新增错误；`tests/run.ts` 全绿，PASS 数 ≥ 404。
- A1：反复切图鉴/抽屉 100 次后 `areas` 有界（给出你加的统计或断言行）。
- A2/A3：新开一局无上一局的地雷/哨兵/环刃伤害；丢弃环刃后不再造成伤害（可用单测或日志断言）。
- A4：普通难度同秒多次吸血总和 ≤ 预算（补单测）。
- B：`vamp/thornmail` 描述·nums·实现三者一致；`resonator` 无英文术语；技能 desc 无裸秒数。
- C：`skillCdPct` 每帧不再重算 `calcSkill`（用 profiler 或计数验证）；update 内 filter 改就地压实；HUD 值不变时不重绘。
- D：4 张关键截图（360×640）复检：install 无孤字、codex 底部不压返回、drawer 末项不贴按钮、HUD 技能名可见。

## 7. 交付物
- 按 P0→P1→P2→P3 分批提交（每批一个 commit，message 写清修了什么、影响面）。
- 附一份 `docs/review/fix_report_2026-10-31.md`：逐条列出「问题→根因→改动文件:行→验证方式」，并单列 A6 的平衡改动。
- 不要顺手重排无关代码/格式，保持 diff 可读。
