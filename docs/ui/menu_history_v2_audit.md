# 主菜单 / 历史战绩 V2 审计（menu_history_v2_audit）

> 日期：2026-10-31 ｜ HEAD：`9a59d3f`（已推送）｜ 工作区：干净
> 目的：先确认现有页面、存档与历史链路，再改 UI；避免"只改了截图"。

## 1. 当前页面结构

| 页面 | 文件 | 结构 |
|---|---|---|
| 主菜单 | `ui/MenuScreens.buildMenu` | 背景 + LOGO + 继续卡（有/无/损坏）+ 开始游戏 + 玩法说明 + 历史对局 + 图鉴/成就/设置 + 版本 |
| 历史列表 | `ui/HistoryScreens.buildHistoryList` | 标题条 + 返回 + 一行总览 + 4 个筛选按钮 + ModalList 记录行 |
| 历史详情 | `ui/HistoryScreens.buildHistoryDetail` | 标题条 + 返回 + 头像/名称 + 2×2 卡 + Key-Value 统计 + 技能 + 道具 + 里程碑 + 结束原因 |

## 2. 当前按钮与热区

| 页面 | 按钮 | 尺寸 / 热区 |
|---|---|---|
| 主菜单 | 继续卡 | 300×78（整卡可点） |
| 主菜单 | 开始游戏 | 270×54 |
| 主菜单 | 玩法说明 / 历史对局 | 270×44 |
| 主菜单 | 图鉴 / 成就 / 设置 | 100×46 |
| 历史列表 | 返回 | 64×36（视觉），onTap 全节点 |
| 历史列表 | 筛选 ×4 | 76×32 |
| 历史列表 | 记录行 | 330×96（整行可点） |
| 历史详情 | 返回 | 64×36 |

热区均 ≥44 高（筛选 32 高 + 行间 12 间距，真机复测时再确认是否够）。

## 3. 当前页面状态

- 主菜单：有存档 / 无存档 / 存档损坏或版本不符；没有"开始新冒险覆盖存档"的确认。
- 历史列表：有记录 / 空记录 / 筛选后为空；没有"开始第一场冒险"入口。
- 历史详情：有摘要+详情 / 只有摘要（详情缺失时降级）；没有按结果区分标题。

## 4. 存档模型现状

| 数据 | 位置 | 说明 |
|---|---|---|
| Progress | `game/Progress` + `cmt_save_v1` | 永久进度/难度/图鉴/成就/徽章 |
| ActiveRunSave | `game/RunSave` + `cmt_active_run_v1` | 本局完整快照（stats/baseStats/skills/items/shop/battle/enemies/rng） |
| RunHistory | `game/RunHistory` + `cmt_history_v1` | 摘要 50 局 + 详情 |

写入：`GameRoot.saveActiveRunNow`；读取：`loadActiveRun`；恢复：`Battle.resumeRun`。

## 5. 历史记录生成流程

`showResult(win)` → 成就/徽章 → `finishRun(result)`（buildSummary → addRun → 写成功才 `clearActiveRun`）→ 结算页。
主动放弃走 `confirmQuit → finishRun('abandoned')`；保存退出只 `saveActiveRunNow`，不写历史。

## 6. 现有测试覆盖

- `tests/run.ts`：404 PASS / 0 FAIL（纯逻辑）。
- 覆盖：RNG 快照、ActiveRunSave 校验、历史幂等/容量/筛选、BOSS 快照、击杀/吸血判定分支。
- **未覆盖**：Battle 实体层、真实商店/升级恢复（只有代码路径）、HP 恢复的具体数值断言、damageDealt/damageTaken 统计。

## 7. 已知问题（本轮修）

1. **截图里的"45/72 → 72/72"不是游戏 bug，而是截图脚本在恢复后把血补满**（为了防死）。
   真实代码恢复的是存档 hp；但缺少固定断言与干净的证据，本轮补纯函数 + 浏览器校验 + 重拍截图。
2. 主菜单：继续卡没有成为视觉中心；开始/玩法/历史/图鉴混在同一层级；缺少角色展示。
3. 历史列表：顶部一行文字太弱，卡片像数据表；空态没有行动入口。
4. 历史详情：结果标题单一（都是"倒下"风格），统计没有伤害数据，技能/道具没有图标，不能展开。
5. 开始新游戏会直接覆盖活动存档，没有确认。
6. 战斗运行时链路（实体层）仍无引擎级自动化测试，只能逻辑 + 浏览器验证。

## 8. 本轮准备修改

- `ui/MenuScreens.ts`（主菜单 V2：品牌区/角色展示/核心操作/次级图标入口）
- `ui/HistoryScreens.ts`（列表 V2：统计面板/卡片；详情 V2：结果头图/图标构筑/可展开）
- `GameRoot.ts`（开始新游戏确认、历史页回调、结算统计补伤害）
- `battle/Battle.ts`（totalDmgDealt 统计）
- `game/RunSave.ts` / `game/RunRestore.ts`（恢复数值规范化）
- `game/RunHistory.ts`（伤害字段，可选，兼容旧数据）
- `tests/run.ts`（HP 恢复、商店/升级快照、伤害字段）
- 文档：本文件、素材清单、V2 设计、测试报告、HANDOFF/README/决策表

## 9. 保持不变

- 战斗数值、技能/道具/黑科技规则、难度规则、掉落与奖励；
- ActiveRunSave/历史记录的键名与 50 局策略（仅向后兼容地加可选字段）；
- 微信包构建入口 `build-wechat.bat`。
