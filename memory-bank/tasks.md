# 当前任务

## 当前阶段

**主菜单 V3 已交付 + 真机行为日志监听就绪（2026-10-31）— 等真机实测数据**

### 本轮已完成
- 主菜单 V3 极简三区：LOGO / 继续游戏 + 开始游戏 / 底部四个像素图标（战绩·图鉴·成就·设置）。
- 按钮：260×56；有继续时=橙色主按钮 + 深蓝次级开始；无继续时开始=橙色主按钮。
- 图标：`ui/MenuIcons.ts` 16×16 Graphics 像素图（卷轴/书/奖杯/齿轮），非汉字/Emoji。
- 玩法说明移入设置页；角色选择保留在开始流程。
- 真机日志：`game/DeviceLog.ts` 记录菜单/确认/开局/死亡/商店/升级/退出等事件，
  同步到 `wx.getRealtimeLogManager()` 与本地 `cmt_device_log_v1`（600 条）。
- 分析工具：`tools/analyze_device_log.cjs`，输出启动/菜单漏斗/死亡波次/商店/升级/异常摘要。
- 文档：`docs/testing/device_log_monitoring.md`、`docs/ui/menu_v3_design.md`、`menu_v3_icon_design.md`、测试报告。

### 验证
- `tsc -p tsconfig.check.json` = 0；`-p tsconfig.ui-check.json` = 0
- `tsx tests/run.ts` = **435 PASS / 0 FAIL**
- 微信包构建成功（见 build_reports）；浏览器截图 `errors=none`

### 未完成 / 待真机
- 微信真机：主菜单按钮/图标观感、底部手势区；
- 真机日志回收：玩家实际行为分析（funnel/死亡波次/商店/升级/报错）；
- 历史列表/详情保持 V2；
- 战斗实体层无引擎级自动化测试。

### 下一步
1. 真机试玩后发送实时日志或 JSON；
2. 跑 `node tools/analyze_device_log.cjs <file>` 输出行为摘要，定位问题；
3. 按数据修正难度/经济/交互，再回归。
