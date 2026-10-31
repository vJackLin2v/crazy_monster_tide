# M2-A 战斗遥测

> 目标：用真实对局数据回答“怎么赢/怎么输、什么技能有用、什么构筑强”。
> 本轮只做采集/存储/导出/查看，不改任何平衡数值。

- 代码：`cocos/assets/scripts/game/telemetry/`、`ui/TelemetryScreen.ts`
- 数据版本：schemaVersion 2（M2-A.1：来源绑定/波次明细/展示分母）
- 存储：localStorage `cmt_telemetry_v1`，最多 50 局
- 查看：DEBUG 构建主菜单右上「数据」；或控制台 `__m2a()` / `__m2aJson()`
- 关闭：不创建 Recorder 时所有调用点均为 `telemetry?.xxx`，零开销

## 文档

| 文件 | 内容 |
|---|---|
| telemetry_architecture.md | 架构、接入点、如何保证不影响战斗 |
| event_dictionary.md | 事件类型、字段、采集位置 |
| data_schema.md | 单局记录结构与版本 |
| performance_budget.md | 采样频率、事件上限、内存估算 |
| test_report.md | 测试与运行时结果 |
| known_limitations.md | 已支持/未支持、待验证 |

## 命令

    cd cocos
    tsc -p tsconfig.check.json
    tsc -p tsconfig.ui-check.json
    tsx tests/run.ts
    # 运行时（web-mobile）
    node tools/ui/verify_m2a.cjs
