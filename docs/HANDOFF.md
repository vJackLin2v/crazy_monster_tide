# HANDOFF · 《疯狂鸽王》（2026-10-31 主菜单/战绩 V2）

> 新会话唯一必读（配合 START_PROMPT.md 与 AGENTS.md 路由表）。
> 本轮：主菜单 V2 + 战绩档案 V2 + 续玩可靠性（生命/商店/升级）+ 上一轮遗留收尾。

## 0. 现状

Cocos 3.8.6 微信小游戏；测试 **425 PASS / 0 FAIL**，tsc 双配置 0，微信包约 3.1MB / 10.94MB。
主菜单：品牌 + 角色立绘 + 继续冒险（有存档时第一优先）/ 开始冒险 + 四个次级图标入口。
战绩：统计面板 + Tab + 战绩卡片 + 单局报告（结果大字 / 伤害数据 / 图标化技能可展开）。
续玩：45/72 恢复为 45/72（纯函数 + 浏览器断言双重证据）；商店货架、升级三选一可恢复。

## 1. 开工三步

    cd H:/AI-game/crazy_monster_tide/cocos
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.ui-check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts

期望 425 PASS。再读 `docs/ui/menu_history_v2_audit.md`、`docs/review/menu_history_v2_test_report.md`。

## 2. 构建 / 截图

    cmd /c "build-wechat.bat -nopause"          # 微信包唯一入口

    # 截图/运行时断言（web-mobile 已构建，serve.cjs 在 8123）
    node tools/ui/shot_menu_history_v2.cjs

脚本会打印：`saved` / `resume`(matchHp,hpText) / `shop-before/after` / `lv-before/after` / `errors`。

## 3. 本轮新增/修改

| 文件 | 作用 |
|---|---|
| `ui/MenuScreens.ts` | 主菜单 V2（角色展示/继续卡/开始确认/次级图标入口） |
| `ui/HistoryScreens.ts` | 战绩档案 V2（统计面板/Tab/卡片/空态；详情结果头图/2×3/图标/展开浮层） |
| `game/RunRestore.ts` | 生命恢复规范化（严格恢复 + 非法值修复），Battle 与测试共用 |
| `game/RunSave.ts` | ActiveRunSave 增加 elite/boss 击杀、金币收支、里程碑；continue 摘要增加技能/道具数 |
| `battle/Battle.ts` | resume 使用规范化的 stats；新增 totalDmgDealt |
| `GameRoot.ts` | 开始新冒险确认、主菜单放弃写历史、历史空态入口、结算伤害字段 |
| `tests/run.ts` | §22 生命恢复、§23 商店/升级快照（425 条） |
| `tools/ui/shot_menu_history_v2.cjs` | 12 张截图 + 续玩/商店/升级运行时断言 |

## 4. 硬事实 / 踩坑

- **"45/72 → 72/72" 是截图脚本补血造成的假象**；代码一直恢复存档 hp。
  V2 已删除补血，改为暂停冻结，并加纯函数测试 + 浏览器 `matchHp` 断言。
- 主菜单确认弹窗必须用 **透明层**（`mkNode` + Graphics dim），用 `screen()` 会把背景刷黑。
- 历史卡片三列要留足宽度：中列 time/kills、右列 result/date，宽度不够会重叠。
- 续玩时 `assertRestorable` 会拒绝 hp≤0 的存档（例：测试脚本先被打到 -9 再存档会被拒绝）。
- 商店恢复走 `resuming` 标记，不能重刷货架；升级恢复直接用 `pendingRewards`。
- `tsconfig.check.json` 不含 ui/GameRoot；`full-check` 仍有 13 条历史遗留错误（非本轮）。

## 5. 待办

1. 微信真机：杀进程/切后台续玩、商店/升级中断、战绩滚动、技能浮层；
2. 地狱 1.8225 倍经济数据（真机 `[TELEMETRY]`）；
3. 战斗实体层（碰撞/生成/动画）仍无引擎级自动化测试；
4. 普通难度逐项等于旧版（缺阶段2 基线）；
5. 图鉴技能分类、文档由代码生成（未做，验收表已标注）。

## 6. 命令速查

| 用途 | 命令 |
|---|---|
| 类型检查 | `tsc -p tsconfig.check.json` / `-p tsconfig.ui-check.json` |
| 单测 | `tsx tests/run.ts` |
| 微信构建 | `cmd /c "build-wechat.bat -nopause"` |
| 网页构建 | `CocosCreator.exe --project cocos --build 'platform=web-mobile;debug=false'` |
| 截图+断言 | `node tools/ui/shot_menu_history_v2.cjs` |
