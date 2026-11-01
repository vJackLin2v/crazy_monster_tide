# 当前任务

## M2-B.3.x 整数型黑科技 Ⅲ 级空转（2026-11-01）

### 完成
- 新增 data/Modules.ts modIntEffect(id)=levelOf(id)（Ⅰ/Ⅱ/Ⅲ = 1/2/3）。
- 效果读取改用 modIntEffect：SkillCalc 的 multi/fan/split/bounce/pierce/orbit/chain/echo；ModuleText 对应文案。
- modPower 保持 1/2，仍只服务 canInstall 容量上限与合成计数。
- 数值型模块继续 modEffect（1.6/2.2），未动。

### 验证
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **556 PASS / 0 FAIL**（移除旧反伤模块测试 2 条、新增 1 条后，相对 558 基线 -2）
- 反伤模块已从 MODULES/MODULE_IDS/MODULE_HOOKS/图标/Battle/SkillCalc 移除；thorncoat 道具保留
- RUN_SAVE_VERSION 1 → 2，旧存档按“版本过旧”拒绝，用户已确认可删旧存档
- multi_3 装火球 count=4；multi_3 文案 +3 发；chain_3 文案跳 3 次；echo_3 = 3 次
- chain 图标改为 ui-thunder-core；multi 保留 sh-multihits；两模块描述区分“终结/不终结”
- 黑科技图标加统一青色底框（商店/安装屏），覆盖跨类同图标 11 组
- 技能 4 组重复图标已拆分：ring_blade/blade_storm、arcane/sentry、mine_field/spike、charge_pulse/orb
- 道具 14 组图标已拆分（生命/护盾/金币/血/回复/拳/时/拾取/移速/暴伤/冰/火/低血）
- 冰系数值统一：t_ice 20%→25%，cdr_ice 18%→15%
- 霜爆/寒冰环拆分：寒冰环自带 35%/BOSS30% 减速；霜爆不再自带减速，对减速目标 1.5x 爆发
- 天火之心 aoe_x tier2→3，修复稀有度倒挂；tier 统计 51/24/4
- resonator 描述改为“相同触发时机（Hook）”，与实现一致
- 微信构建 success：3.14MB / 10.97MB；index.js 333,422 B（15:31:56）

### 未完成 / 待决策
- chain 与 bounce 行为已有区别（chain 终结弹体跳击 70%，bounce 弹体转向续飞并 0.8 衰减），但图标/描述仍易混；未动。
- reports/全量审核_黑科技_道具_技能_20261101.xlsx 的 P2-P14（图标、冰系标签、霜爆/寒冰环重叠、文档漂移、tier 倒挂等）已记录，未修。
- 同类 modPower 误用排查：除已修处外，未发现其他“效果读取”使用 modPower；剩余用法均为 canInstall/合成容量语义。

### 下一步
- 下一里程碑：greed 金币转攻击 smoke 断言 / 文档数量漂移（非数值）；卡片 Hook 标签另开 UI。



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
