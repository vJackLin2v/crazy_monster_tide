# 修复报告 2026-10-31（P0/P1/P2/P3）

> 基线：tests 425 PASS → 本轮 **435 PASS / 0 FAIL**；tsc 双配置 0 新增错误；微信构建成功。
> 说明：改动集中在 Battle/UI；P0 与 P2 在 `Battle.ts` 内交叉，无法按批次拆成完全独立的 hunk，提交按"P0+P1（含 Battle 性能）"与"P2 UI/HUD + P3"两次提交，message 里已标注。

## A6 平衡改动（单独列出，不和纯 bug 混在一起）

| 项 | 旧 | 新 | 影响 |
|---|---|---|---|
| 吸血 vamp | 实现每份 **2%**（desc/nums 写 4%/6%，三处不一致） | 统一为每份 **4%**（实现 ×0.04；nums 改"4%"；desc 保持 4%/Ⅱ 6.4%） | **吸血翻倍**，续航明显增强，属于平衡改动 |
| 反伤 thornmail | 实现每份 6，nums 写 8，desc 写 6 | 统一为每份 **6**（实现不变；nums 改"6"） | 无数值变化，仅文案统一 |

---

## P0

### A1 滚动区全局数组泄漏
- 根因：`ui/ScrollView.ts` 的 `areas[]` 只 push 不删；视图销毁后仍持有节点引用，且每帧 fling 遍历全部历史项。
- 改动：`ScrollView.ts`
  - 新增 `sweep()`（倒序清理 `!view.isValid || !content.isValid`），在 `TOUCH_START`、`EVENT_AFTER_UPDATE`、`makeScroll` 入口调用；
  - `ScrollHandle` 新增 `dispose()`（移除 + destroy）；
  - 新增 `scrollAreaCount()` 并挂 `globalThis.__scrollAreas` 供验收。
- 验证：浏览器反复重建图鉴 40 次，`__scrollAreas()` 采样 **[1,1,1]**（第 10/20/40 次），不随操作增长。

### A2 resetRunState 漏清技能运行时
- 根因：只清敌人/子弹/区域等带节点实体，`traps/sentries/charges/orbits/traps` 与回血/计时不清 → 新一局幽灵伤害。
- 改动：`Battle.resetRunState()` 补清 `traps/sentries/charges/orbits/castCount/echoQueue`，重置 `runTime/healBudget*/healAccum/healFxCd/thorncoatAt/voltloopAt/cdTotal`。
- 验证：注入四类残留后重开一局，`A2={"traps":0,"sentries":0,"charges":0,"orbits":0,"runTime":0,"healSpent":0}`。

### A3 替换/丢弃技能不清运行时
- 根因：`resetCastCount(slot)` 只删蓄势计数，环刃/蓄能仍结算。
- 改动：新增 `Battle.clearSkillRuntime(slot)`（castCount/orbits/charges/skillT/cdTotal），`resetCastCount` 保留为兼容别名；GameRoot 的替换/丢弃仍走该入口。
- 验证：注入后调用，`A3={"orbits":0,"charges":0,"cast":0}`。

### A4 普通难度回血预算失效
- 根因：`healPlayer` 在 `budget === null` 时既不累加 spent，还每调用给 5 点 → 可站桩回满。
- 改动：新增 `game/HealRules.ts`（`DEFAULT_HEAL_BUDGET=8`、`HEAL_HARD_CAP=5`、`healStep`），`Battle.healPlayer` 统一走 `healStep`；普通 null → 8HP/s 预算并记账（仍夹 5）。
- 验证：tests §24：同一秒 6 次回血总和 ≤5 且 ≤8；地狱/噩梦预算不变；条件倍率不破硬夹。

### A5 击杀震屏绕过设置
- 根因：`killEnemy` 直接 `cam.addShake`，其它地方走 `shake()`（内部判断 `FxPrefs.shake`）。
- 改动：`Battle.ts killEnemy` → `this.shake(...)`。
- 验证：代码路径统一（关震屏后击杀不再震）。

### A6 数值三处不一致
- 处理见上方"平衡改动"；常量抽到 `ModuleValues.VAMP_HEAL_PER_STACK / thornmailBack`，Battle 使用。
- 验证：tests §24 断言 4%/6 点与 nums 文案；实现、desc、MODULE_NUMS 三处一致。

## P1 文案

| 文件 | 改动 |
|---|---|
| `data/Modules.ts` | 18 条 desc 统一为"做什么"的一句话：去掉叠加公式、裸秒数、英文/Hook 术语；vamp/thornmail 随 A6 统一 |
| `data/Items.ts` | bloodpact → **血契**；focused → **极简专精**；resonator → **黑科技共鸣**，desc 改"同一技能装了 2 个同类黑科技时，该技能伤害 +20%" |
| `data/Skills.ts` | 哨兵/蓄能/毒雾/陨石/刃风/裂地 6 条 desc 去掉裸秒数，改体验向描述（均 ≤22 字） |

验证：全文检索技能 desc 无"秒"数值；MODULE_NUMS 保留精确数值。

## P2 性能

| 项 | 改动 | 验证 |
|---|---|---|
| C1 冷却 16 次 calcSkill/帧 | Battle 新增 `cdTotal[]`，开火/echo 时记录；getter 只读缓存（懒填充一次）；GameRoot 只取一次 `skillCdPct` | 代码路径 + 无报错运行 |
| C2 每帧 getChildByName/new Color | Enemy 缓存 `bodySp`；染色用模块级 `TINT_*` 常量 | 代码 + 浏览器运行无异常 |
| C3 高频节点 | 伤害数字与 hitSpark 对象池（`dmgPool/sparkPool`，上限 48/64），过期回池不 destroy | 代码 + 运行 |
| C4 每帧 filter | 新增 `compact()` 就地压实，替换 bullets/areas/fx/gems/bolts/meteors/enemies/echoQueue 的 filter | 代码 |
| C5 追踪弹索敌 | 每颗弹 0.1s 节流（`homingT`） | 代码 + 运行 |
| C6 HUD 重绘 | Hud 数据签名（HP/EXP/金币/波次/技能 cd 量化），不变则跳过；GameRoot 复用同一 HudData | 代码 + 截图 HUD 正常 |
| C7 小项 | 刷怪池按波缓存；Camera2D 尺寸 0.5s 轮询缓存；`Object.keys(orbits/charges)` 改 `for..in` | 代码 |

## P3 UI 细节

| # | 改动 | 验证 |
|---|---|---|
| D1 | 安装屏选中提示去掉"（满槽也能换）"，单行不孤字 | `install.png`（提示一行，无孤立"）"） |
| D2 | 图鉴/成就 `viewBottom = VH-B-74` | `codex.png`（返回按钮上方留白） |
| D3 | 抽屉 `VIEW_BOTTOM` 196 → 210 | 代码；真机复测 |
| D4 | 难度详情内容整体垂直居中（按行数计算） | 代码；截图待补 |
| D5 | HUD 技能名常显（9px dim），并真正写入 `name.string` | `hud.png`（回旋刃可见） |
| D6 | 商店刷新按钮子节点定位：文字左、金币+数字右，2~3 位数不错位 | 代码；真机复测 |
| D7 | 胶囊安全区：复核 HUD/商店顶部；无新增遮挡，模拟器无法覆盖真机胶囊，保留日志与人工项 | 人工 |

## 验证汇总

```
tsc -p tsconfig.check.json      -> EXIT=0
tsc -p tsconfig.ui-check.json   -> EXIT=0
tsx tests/run.ts                -> PASS 435 / FAIL 0
wechat build                    -> success
verify_fixes.cjs                -> A2/A3 全 0；A1 [1,1,1]；errors=none
```

## 未完成 / 风险

- A1/A2/A3/A5 的运行验证在 web-mobile；微信真机未复测。
- C1/C4/C6 的性能收益未做 profiler 对比，只验证了行为不变。
- D3/D4/D6/D7 需要真机看实际观感/胶囊遮挡。
- 安装屏底部"效果说明/合成区"在 360×640 下仍可能与按钮带贴得较近（D1 只修了顶部孤字）。
