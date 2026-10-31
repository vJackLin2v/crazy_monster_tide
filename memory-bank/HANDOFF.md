# HANDOFF · 《疯狂鸽王》（2026-10-31 主菜单 V3 + 真机日志监听）

> 新会话唯一必读（配合 START_PROMPT.md 与 AGENTS.md 路由表）。
> 当前：主菜单 V3 极简版已交付；真机行为日志监听与离线分析工具就绪，等真机实测数据。

## 0. 现状

- Cocos 3.8.6 微信小游戏；测试 **435 PASS / 0 FAIL**；tsc 双配置 0。
- 微信包：主包 3.11MB / 总计 10.95MB（18:27 构建，index.js 302,870 B）。
- 主菜单：LOGO / 继续游戏（橙色主按钮）+ 开始游戏（同尺寸；有继续时深蓝次级，无继续时橙色主按钮）/ 底部四个像素图标。
- 战绩列表与详情保持 V2，未改。
- 真机日志：`game/DeviceLog.ts` + `tools/analyze_device_log.cjs` + `docs/testing/device_log_monitoring.md`。

## 1. 开工三步

    cd H:/AI-game/crazy_monster_tide/cocos
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.ui-check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts

期望 435 PASS。再读 `docs/ui/menu_v3_design.md`、`docs/testing/device_log_monitoring.md`。

## 2. 构建 / 截图 / 真机日志

    cmd /c "build-wechat.bat -nopause"          # 微信包唯一入口

    # 网页截图（web-mobile 已构建，serve.cjs 在 8123）
    node tools/ui/shot_menu_v3.cjs

    # 真机日志行为分析（玩家发来的 JSON）
    node tools/analyze_device_log.cjs <日志文件.json>

真机上取日志：开发者工具「实时日志」过滤 `[CPK]`；或控制台 `__deviceLogDump()`；
本地键：`cmt_device_log_v1`（600 条行为事件）、`cmt_log_v1`（20 局 Telemetry）。

## 3. 关键文件

| 文件 | 作用 |
|---|---|
| `ui/MenuScreens.ts` | 主菜单 V3：按钮尺寸/颜色规则、继续确认、四入口 |
| `ui/MenuIcons.ts` | 16×16 像素图标（卷轴/书/奖杯/齿轮），Graphics 整数矩形 |
| `ui/MetaScreens.ts` | 设置页（含「玩法说明」入口） |
| `game/DeviceLog.ts` | 真机行为事件：本地环形缓冲 + 微信实时日志 + 全局异常 |
| `game/Telemetry.ts` | 每局/每波/商店经济（原有） |
| `GameRoot.ts` | 流程 + 日志埋点（菜单/确认/开局/死亡/商店/升级/退出/页面） |
| `tools/analyze_device_log.cjs` | 日志分析：funnel/死亡波次/商店/升级/异常 |
| `docs/ui/menu_v3_icon_design.md` / `menu_v3_icons_preview.png` | 图标设计与预览 |
| `docs/testing/device_log_monitoring.md` | 真机取日志步骤与事件表 |

## 4. 硬事实 / 踩坑

- 主菜单按钮：有继续时「继续游戏」橙色、**「开始游戏」同尺寸深蓝**；无继续时开始才橙色。
- 图标**不是汉字/Emoji**：16×16 网格 Graphics，32×32 显示，热区 84×72。
- 底部入口中心 `VH-B-86`（已上移）。
- 截图/聊天缓存：同一文件名会被客户端缓存；发图时用新文件名（如 `menu_save_v3_260x56.png`）。
- 真机日志不记录账号/openid/输入；只有玩法事件 + 机型。
- 实时日志有采样/保留限制，要完整数据用 `__deviceLogDump()` 导 JSON。
- 历史"45/72 → 72/72"曾是截图脚本补血造成，已修；续玩严格恢复存档 hp。

## 5. 待办

1. 真机实测：按钮/图标观感、底部手势区、按下缩放手感；
2. 回收真机日志 → 跑分析 → 定位首屏漏斗/死亡波次/商店问题；
3. 历史详情 V2 保持；战斗实体层仍无引擎级自动化测试。

## 6. 命令速查

| 用途 | 命令 |
|---|---|
| 类型检查 | `tsc -p tsconfig.check.json` / `-p tsconfig.ui-check.json` |
| 单测 | `tsx tests/run.ts` |
| 微信构建 | `cmd /c "build-wechat.bat -nopause"` |
| 网页构建 | `CocosCreator.exe --project cocos --build 'platform=web-mobile;debug=false'` |
| 菜单截图 | `node tools/ui/shot_menu_v3.cjs` |
| 日志分析 | `node tools/analyze_device_log.cjs <file>` |
