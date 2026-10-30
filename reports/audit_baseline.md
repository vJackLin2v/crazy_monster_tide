# 阶段 0 · 项目现状审计（audit_baseline）

> 审计时间：2026-10-30 ｜ 版本标记：`2026-10-30 13:14 商店一句话 v6`
> 审计方式：读源码 + 运行测试 + 构建产物核对（**不是**只看文档）

---

## 0. 结论摘要（先看这 5 条）

1. **成长公式与审核假设不一致**：当前是**线性**增长（HP `1+0.18×(w-1)`，伤害 `1+0.10×(w-1)`），
   第 20 波 HP 仅 **×4.42**、伤害 **×2.90**；审核材料假设的复合增长（×23.21 / ×6.12）**不存在**。
   → 这是"第 20 波打不动"判断的关键前提，必须先纠正。
2. **实体数量与文档有 1 处不一致**：代码里敌人 **17 个**，README/交付文档写 18 个。
3. 技能 16、道具 70、黑科技 18（合成版 `_2` 运行期生成，不在 ID 列表里）、角色 6 —— 与文档一致。
4. 测试 **163 PASS / 0 FAIL**，`tsc` 双配置 exit 0，微信包 main 3.02MB / total 10.84MB。
5. 上一轮已修的三类问题（滚动、卡片文本、结算/暂停/刷怪）**已确认修复**，本轮不重复动。

---

## 1. 页面清单（代码 ↔ 实际页面）

| # | 页面 | 代码文件 | 构建函数 |
|---|---|---|---|
| 1 | 主菜单 | `ui/MenuScreens.ts` | `buildMenu` |
| 2 | 选择角色 | `ui/MenuScreens.ts` | `buildCharSelect` |
| 3 | 玩法说明 | `ui/MenuScreens.ts` | `buildHowTo` |
| 4 | 战斗 HUD | `ui/Hud.ts` | `Hud` 组件 |
| 5 | 升级三选一 | `ui/Modals.ts` | `buildLevelUp` |
| 6 | 构建抽屉（4 页签） | `ui/Modals.ts` | `buildBuildDrawer` |
| 7 | 商店 | `ui/Modals.ts` | `buildShop` |
| 8 | 二次确认 | `ui/Modals.ts` | `buildConfirm` |
| 9 | 图鉴（4 页签） | `ui/CodexScreens.ts` | `buildCodex` |
| 10 | 成就 | `ui/CodexScreens.ts` | `buildAchievements` |
| 11 | 设置 | `ui/MetaScreens.ts` | `buildSettings` |
| 12 | 结算 | `ui/MenuScreens.ts` | `buildResult` |

滚动组件：`ui/ScrollView.ts`（Mask GRAPHICS_RECT + 全局 input + 节点事件双通道）。

---

## 2. 实体数量（代码实测）

| 类别 | 数量 | 位置 | 与文档一致？ |
|---|---:|---|---|
| 角色 | 6 | `data/Chars.ts` | ✅ |
| 技能 | 16 | `data/Skills.ts` | ✅ |
| 道具 | 70 | `data/Items.ts` | ✅ |
| 黑科技 | 18（合成 `_2` 运行期生成） | `data/Modules.ts` | ✅ |
| 敌人 | **17** | `data/Enemies.ts` | ❌ 文档写 18 |
| 成就 | 27 | `game/Achievements.ts` | ✅ |

---

## 3. 数值基线（真实代码）

### 3.1 成长公式（`game/Combat.ts:97`）

```ts
waveScale(wave) = { hp: 1 + 0.18*(wave-1), dmg: 1 + 0.10*(wave-1) }   // 线性
```

| 波次 | HP 倍率 | 伤害倍率 |
|---:|---:|---:|
| 1 | 1.00 | 1.00 |
| 5 | 1.72 | 1.40 |
| 10 | 2.62 | 1.90 |
| 15 | 3.52 | 2.40 |
| 20 | 4.42 | 2.90 |

> 审核材料里的 23.21 / 6.12 是**复合增长**假设的结果，与本项目实现不符。

### 3.2 刷怪（`core/Balance.ts` spawn 段 + `battle/Battle.ts:1322`）

- 间隔：`interval = max(0.34, 0.62 - 0.016×wave)`
- 批量：`batch = min(3, 1 + floor(wave/4))`
- 开场波：`open = min(12, 5 + 2×wave/2?)`（`openBase=5, openEvery=2, openMax=12`）
- 同屏：软上限 40、硬上限 60，超软上限时**刷怪间隔 ×1.6**（`slowMul`），不是停止生成
- 峰值：约 **8.82/s**（与文档一致）

### 3.3 波次时长（`core/Balance.ts` wave 段）

`time = 18 + floor((wave-1)/3) × 3` 秒（每 3 波 +3 秒）

### 3.4 商店（`game/RunState.ts`）

- 道具价：`itemBase + rng(0,itemRand) + wave×itemPerWave`
- 黑科技价：`modBase + rng(0,modRand) + wave×modPerWave`
- 锁定：`refreshShop(keepLocked=true)` 时锁定且未售出的商品**保留 id**
- 刷新价随波次增长（`rerollCost`）

### 3.5 通关 / 无尽（`GameRoot.ts:657, 696`）

- `done = wave >= 20 && !endless` → 结算页
- 「继续挑战」→ `continueEndless()`：`endless=true`，回到战斗并从第 21 波起

### 3.6 黑科技兼容（`data/Modules.ts:86`）

`MODULE_HOOKS` 定义每个模块挂在哪个钩子（calc / onhit / cast / kill / player），
安装时校验"技能形态是否支持该钩子"，不支持则拒绝并提示。

---

## 4. 问题清单

### 4.1 已确认存在

| # | 问题 | 证据 | 级别 |
|---|---|---|---|
| A1 | 敌人数量文档写 18，代码 17 | 运行期统计；`data/Enemies.ts` | P3 |
| A2 | 审核材料的"复合成长"前提不成立 | `Combat.ts:97` 线性公式 | P0（结论层面） |
| A3 | 未解锁图鉴条目只显示「？？？/ 尚未发现」，缺少解锁条件提示 | `CodexScreens.ts` 渲染逻辑 | P2 |
| A4 | 结算页未展示"4 个技能 + 每个技能的黑科技数量" | `MenuScreens.buildResult` 入参只有 items | P2 |
| A5 | ~~升级卡「跳过」按钮金币不足仍可点~~ | 核实后**不适用**：本作「跳过」是**给 +8 金币**，不存在"金币不足"前提（`Modals.ts:142`） | 不存在 |

### 4.2 待验证（需要跑数据/真机才能定性）

| # | 问题 | 验证方式 |
|---|---|---|
| B1 | 第 15–20 波是否出现输出瓶颈 | 阶段 2 的 A/B 数值模拟（同种子） |
| B2 | `multi+fan+split` 弹体是否指数膨胀 | 阶段 3 组合测试（统计单次施法弹体数） |
| B3 | `vamp+harvest+reaper` 每秒回血是否超过承伤 | 阶段 3 统计各回血来源 |
| B4 | 减速是否可无限叠加 | 阶段 3 `frost+frostnova+frostring` |
| B5 | 屏震/受击红屏在真机的观感 | 真机（本机无微信开发者工具/手机） |
| B6 | 长列表滚动的惯性/边界停止 | 浏览器已验证可拖，惯性未验证 |

### 4.3 已确认不存在（本轮无需改）

| # | 曾怀疑的问题 | 实际 |
|---|---|---|
| N1 | 图鉴/成就/抽屉滚不动 | 已重写 `ScrollView.ts`，实测 y 值变化 ✅ |
| N2 | 设置页版本号被遮挡 | 已移到标题下方 ✅ |
| N3 | 卡片长描述被裁 | 已改"一句话"，审计脚本 0 处裁切 ✅ |
| N4 | 结算后仍刷怪 | `startWave` 已加 `running` 判据 ✅ |
| N5 | 暂停键/倒计时跑出屏幕 | 胶囊坐标已做区间校验+回退 ✅ |
| N6 | 道具文本 `+-92%` | 属性卡已改"显示值之差"，70 件扫描 0 异常 ✅ |

---

## 5. 测试与构建现状

```
tsx tests/run.ts                     → PASS 163 / FAIL 0
tsc -p tsconfig.check.json           → exit 0（core/game/data/ui-layout）
tsc -p tsconfig.ui-check.json        → exit 0（UI 文件专项，本轮新增）
web-mobile 构建                       → success
wechatgame 构建                       → success
主包 / 总包                           → 3.02MB / 10.84MB（上限 4MB / 20MB）
```

测试覆盖：核心数值（`core/`）、存档、奖励池、商店、模块安装/替换、波次、成就、遥测。
**未覆盖**：战斗实时循环（`battle/` 需要引擎）、UI 交互（用 Playwright 脚本验证）。

---

## 6. 基线快照文件

- `docs/delivery/data_snapshot.json`（角色/技能/道具/黑科技全量数据）
- `screenshots/delivery/01~17.png`（全页面截图，v6）

---

## 7. 阶段 0 结论

- 审核材料中的**核心前提（复合成长）不成立**，数值评估必须在真实线性公式上重做；
- 其余问题分为 5 个已确认、6 个待验证、6 个已修复；
- 建议下一阶段（阶段 1 UI 收尾）优先处理：**A5 跳过按钮禁用态**、**A3 图鉴解锁提示**、**A4 结算技能/模块展示**，
  其余 UI 项（热区、对齐、滚动惯性）逐项核验后按需修改。
