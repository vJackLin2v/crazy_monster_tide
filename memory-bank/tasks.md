# 当前任务

## M2-B.3.x 整数型黑科技 Ⅲ 级空转（2026-11-01）

### 完成
- 新增 data/Modules.ts modIntEffect(id)=levelOf(id)（Ⅰ/Ⅱ/Ⅲ = 1/2/3）。
- 效果读取改用 modIntEffect：SkillCalc 的 multi/fan/split/bounce/pierce/orbit/chain/echo；ModuleText 对应文案。
- modPower 保持 1/2，仍只服务 canInstall 容量上限与合成计数。
- 数值型模块继续 modEffect（1.6/2.2），未动。

### 验证
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **587 PASS / 0 FAIL**
- 反伤模块已移除，thorncoat 保留；RUN_SAVE_VERSION 2 拒绝旧存档
- 整数型 Ⅲ 级空转已修（modIntEffect / modPower 分离）
- chain 图标/描述与弹射区分；黑科技统一青色底框
- 技能 4 组、道具 14 组重复图标已拆分
- 冰系 t_ice 25%、cdr_ice 15%
- 寒冰环自带减速；霜爆对减速目标 1.5x
- aoe_x tier3；resonator 描述统一；greed 金币 +25% 实装
- 道具/技能头注释 79/20；item_audit 已按当前代码重新生成（79 图标 / 0 重复 / 23 同属性档）
- 微信构建 success：3.14MB / 10.98MB；index.js 334,125 B（2026-11-01 16:14:25）

### 未完成 / 待决策
- 微信真机视觉/交互确认；
- 可选：卡片显示 Hook 标签（resonator 目前用文字说明）；
- item_audit 只统计道具；跨类图标仍由黑科技底框区分。

### 下一步
- 等待用户决定是否做 Hook 标签或真机验证；无其他已知代码缺陷。



## 当前阶段（历史记录）

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
