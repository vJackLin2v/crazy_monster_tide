# HANDOFF · 《疯狂鸽王》（2026-10-31 主菜单升级后）

> 新会话唯一必读（配合 START_PROMPT.md 与 AGENTS.md 路由表）。
> 本轮：主菜单升级（继续游戏 + 历史对局）+ 阶段3 三项偏差收尾。

## 0. 现状一句话

Cocos 3.8.6 微信小游戏；16 老技能 + 4 新技能、24 黑科技、80 道具、5 档难度、11 屏 UI。
**测试 404 PASS / 0 FAIL**，tsc 双配置 0，微信包构建成功（3.06MB / 10.9MB 级别）。
新能力：**继续游戏（ActiveRunSave 波内恢复）+ 历史对局（摘要/详情、50 局、幂等）+ 自动存档（含切后台）**。

## 1. 开工三步

    cd H:/AI-game/crazy_monster_tide/cocos
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.ui-check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts

期望 **404 PASS**。然后读 `docs/review/menu_upgrade_initial_audit.md` 与 `docs/review/menu_upgrade_test_report.md`。

## 2. 构建 / 出包（唯一正确方式）

    cd H:/AI-game/crazy_monster_tide
    cmd /c "build-wechat.bat -nopause"

产物：`cocos/build/wechatgame`。出包后必须校验 `assets/main/index.js` 的 LastWriteTime 是刚刚。
web-mobile 可直接 CLI 构建（截图用）：`CocosCreator.exe --project cocos --build 'platform=web-mobile;debug=false'`。

## 3. 本轮新增/变更的代码

| 文件 | 作用 |
|---|---|
| `game/RunSave.ts` | ActiveRunSave 模型、校验、版本、继续卡片摘要 |
| `game/RunHistory.ts` | 历史摘要/详情、50 局容量、runId 幂等、筛选/统计、坏数据重建 |
| `engine/RunStore.ts` | 活动存档 / 历史记录 localStorage 读写 |
| `game/CombatRules.ts` | 击杀/吸血判定分支（Battle 与单测共用，补 §7.1） |
| `ui/HistoryScreens.ts` | 历史列表 + 详情（滚动、筛选、空态、滚动位置保持） |
| `ui/MenuScreens.ts` | 新主菜单（继续卡片三态 + 历史入口 + 三选退出确认） |
| `ui/ModalList.ts` | 增加 `offset()` 与 `initialOff`（返回列表保持位置） |
| `battle/Battle.ts` | `snapshotBattle` / `resumeRun` / `restoreEnemy` / `resetCastCount`；背水改为冷却；击杀/精英/BOSS 计数与里程碑 |
| `GameRoot.ts` | 自动存档、继续游戏、退出三选、历史页面、切后台钩子、结算写历史 |
| `game/RunState.ts` | eliteKills/bossKills/goldEarned/goldSpent/milestones |
| `core/Rng.ts` / `game/BossSummon.ts` | RNG 状态、BOSS 状态机快照/恢复 |
| `tests/run.ts` | 新增 §16–§21（RNG/存档/历史/BOSS 快照/偏差/战斗判定） |

## 4. 三条结束路径（最容易写错的地方）

| 行为 | ActiveRunSave | RunHistory |
|---|---|---|
| 保存并退出 / 切后台 | 保留 | 不写 |
| 放弃本局（确认） | 删除 | 写 `abandoned` |
| 死亡 / 通关 / 无尽倒下 | 删除 | 写 `defeat` / `victory` / `endless_end` |

- 结算顺序：写历史成功 → 才清活动存档；写失败保留存档重试。
- 恢复时 `shop` 不重刷货架（`resuming` 标记）、`levelup` 恢复原待选卡。

## 5. 硬事实 / 踩坑

- `tsconfig.check.json` 不含 ui/ 与 GameRoot.ts；动 UI 必跑 `ui-check`。
  `tsconfig.full-check.json` 是诊断用全量检查，有 13 条**历史遗留**错误，不是本轮引入。
- 续玩不恢复子弹/区域/地雷/哨兵/蓄能（瞬时实体），文档已写明，不要对外宣称"100% 还原"。
- 历史页按钮与标题条会轻微重叠（视觉上可接受），真机复测时若拥挤再调。
- 主菜单继续卡在 360×640 上第 4 行（构筑）贴近卡片底边，改字号/坐标时注意别裁掉。
- 截图脚本 `tools/ui/shot_menu_history.cjs` 用 headless Chrome；微信真机仍需人工。

## 6. 待办（优先级）

1. **微信真机**：杀进程后继续、切后台继续、商店/升级中断恢复、历史详情滚动；
2. 地狱 1.8225 倍经济数据（真机 `[TELEMETRY]`）；
3. 普通难度逐项等于旧版（缺旧基线，只能公式层证明）；
4. 余烬刻印是否升级为真叠层（当前简化版已入文档）；
5. 图鉴技能分类筛选、文档由代码生成（未做，验收表已标注）。

## 7. 命令速查

| 用途 | 命令 |
|---|---|
| 类型检查 | `tsc -p tsconfig.check.json` / `-p tsconfig.ui-check.json` |
| 诊断全量 | `tsc -p tsconfig.full-check.json`（看新增错误） |
| 单测 | `tsx tests/run.ts` |
| 微信构建 | `cmd /c "build-wechat.bat -nopause"` |
| 网页截图 | 先 `node tools/ui/serve.cjs`，再 `node tools/ui/shot_menu_history.cjs` |
