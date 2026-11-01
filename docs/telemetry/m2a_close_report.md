# M2-A 遥测系统结项报告（CLOSE）

> 日期：2026-11-01 ｜ 结论：**建议冻结**（代码不再主动改；仅采集期发现数据损坏时申请小修）
> 工作区：HEAD `82360b3`；遥测代码基线 `d039f4c`（M2-A.3b）
> 未提交文件：`.workbuddy/`、`M2提示词.md`、`M3提示词.txt`（未触碰）

## 1. 最终基线

| 项 | 值 |
|---|---|
| 遥测功能 commit | `d039f4c` |
| 当前 HEAD | `82360b3`（仅结项规则/清理脚本/文档） |
| tsc check / ui-check | 0 / 0 |
| 自动化测试 | **525 PASS / 0 FAIL** |
| 微信构建 | 3.14MB / 10.97MB，index.js 331,018 B（2026-10-31 22:36:46） |
| 真机 | 未验证 |

## 2. 检查项

| # | 检查 | 结果 | 证据 |
|---|---|---|---|
| 1 | 事件正常记录 | 通过 | `TelemetryRecorder` 聚合/事件环；§28 测试；浏览器运行时 events>0 |
| 2 | 单局保存 | 通过 | `GameRoot.finishRun` → `end` → `saveRecord`；运行时 agg.runs=1 |
| 3 | 多局不覆盖 | 通过 | Store 按 runId upsert + 50 局裁剪；§28 多局测试 |
| 4 | JSON 完整导出 | 通过（浏览器） | `__m2aJson()` / DEBUG 页导出；运行时 5,606B JSON 可解析 |
| 5 | 事件环不无限增长 | 通过 | 上限 300；`totalEventCount` 独立累计；§28 400 事件测试 |
| 6 | 技能/延迟攻击归因 | 通过 | 弹体/区域/陷阱/哨兵/环刃/蓄能/陨石 `telSkill`；§26/§28 + 浏览器火球/冰矛、lingering |
| 7 | DoT/反伤/unknown | 通过 | DoT 来源只按本次生效 burn/poison；反伤 unknown；killEnemy 缺省 unknown；§28 + 浏览器 1/1/1 |
| 8 | DEBUG 数据页面 | 通过（DEBUG 构建） | 主菜单「数据」页；截图 `verification/telemetry_screen_20261101.png` |
| 9 | release 不暴露 DEBUG | 部分通过 | release `debug=false` 不显示「数据」按钮；但 `window.__m2a*` 控制台钩子保留（采集用，非界面） |

## 3. 遥测能力清单

- 对局：runId/角色/难度/结果/时长/最高波次/承伤/治疗/击杀/BOSS/金币；
- 技能：cast/hit/damage/avg/max/kill/moduleBonus/首末时间；
- 黑科技：获得/触发/直接伤害/治疗/关联技能；
- 波次：时长/击杀/承伤/治疗/技能伤害/模块触发/BOSS；
- 商店：进入/展示/购买/购买率基础/刷新/锁定/金币；
- 性能：敌/弹/区域峰值、事件峰值、updateMs；
- 存储：`cmt_telemetry_v1`，50 局；导出 JSON（全部/单局）。

## 4. 已知限制

- 模块乘区加成（shatter/emberstack/execute）未拆成 module_damage；
- 护盾减伤量、item_effect、控制持续时间未统计；
- 续玩当前波实时累计无法恢复（历史波保留）；
- 仅 finishRun 落盘；进程被杀会丢失本局（无 checkpoint）；
- 性能仅 updateMs 峰值，无 CPU profiler；
- 微信真机未验证。

## 5. 冻结规则

从本报告起：

- 不新增遥测事件；
- 不重构架构；
- 不改 Schema；
- 不改来源归因逻辑；
- 不为统计改战斗代码。

仅当真实采集出现数据损坏、明显错误、无法分析时，可申请小范围修复并重新验收。

## 6. 结论

**建议冻结 M2-A 代码，进入 M2-A-R。** 采集前先做 2 局普通难度试采，确认 JSON 导出与校验工具可用，再开始 24 局。
