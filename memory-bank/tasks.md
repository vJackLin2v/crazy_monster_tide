# 当前任务

## 全部批次完成（2026-11-02）

### 完成：批次 1-6
- 批次 1（P0 泄漏）：GameRoot.ts:80/378-385 DEBUG 按钮复用；Battle.ts:489-500 clearSkillRuntime 销毁 chargeFx；Battle.ts:537-550 resetRunState 清理 chargeFx。
- 批次 2（视觉/文案）：GameRoot.ts 删除结算水印/导出按钮；TAG_CN 补 orbit/trap/summon/charge；Modals.ts:121 行高 21px；Hud.ts:191 ASCII +。
- 批次 3（假选项）：SkillCalc.ts:8 环刃移除 rapid；Battle.ts explodeTrap 读取 size；SkillRules.ts chainEchoRepeats + Battle.ts 连锁 jumpR/queueEcho。
- 批次 4（数值）：Skills.ts frostnova dmg 7→12；docs/delivery/SKILLS.md 同步。
- 批次 5（性能）：Hud.ts syncT 20Hz；Battle.ts hitSetPool 复用/回收。
- 批次 6（收尾）：Battle.ts waveDmgDealt 两处去掉无意义 Math.min；Tokens.ts FS.xs 11→12。

### 验证（最终）
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **586 PASS / 0 FAIL**
- UI 审计三视口 **0 条**
- 微信构建 success：3.14MB / 10.97MB；index.js 332,551 B（2026-11-02 15:21:27）
- 批次 1/5 的运行时验证见对应提交与 tasks 历史段

### 未完成
- PERF-01 网格化单独排期，未做
- 微信真机确认

### 每批必跑
```
npx tsc -p tsconfig.check.json
npx tsc -p tsconfig.ui-check.json
node <tsx> tests/run.ts
node tools/ui/audit_text_fit.cjs   # 期望 0 条
```

### 下一步
- 等用户安排 PERF-01 或真机验证。


## 批次 1：P0 节点泄漏修复（2026-11-02）

### 完成
- BUG-01：GameRoot.ts:80 新增 dbgBtn；GameRoot.ts:378-385 改为复用并置顶，菜单连续进出不再累积。
- BUG-02：Battle.ts:489-500 clearSkillRuntime 增加 chargeFx destroy + delete。
- BUG-03：Battle.ts:537-550 resetRunState 清理 chargeFx 节点并重置 Record。

### 验证
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **586 PASS / 0 FAIL**
- 浏览器运行时：
  - 连续 showMenu ×5 后，uiRoot 内含「数据」文字的 btn 数 = 1
  - 蓄力中 clearSkillRuntime → `chargeFx` 节点数 1 → 0
  - 再次蓄力后 resetRunState → `chargeFx` 节点数 1 → 0
- 验收脚本：tools/ui/verify_batch1.cjs
- 当前未做批次 2-6；本轮按规则停在批次 1。

### 下一步
- 等用户确认后进入批次 2（视觉/文案 4 项）。

## 批次 5：性能低风险 2 项（2026-11-02）

### 完成
- PERF-03：Hud.ts 新增 syncT；sync(d, dt) 20Hz 节流，GameRoot.update→syncHud(_dt) 传 dt。
- PERF-02：Battle.ts 新增 hitSetPool；spawnBullet 复用并 clear；子弹 compact 回收时 clear + 入池（上限 64）。

### 验证
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **586 PASS / 0 FAIL**
- UI 审计：三视口 **0 条**
- 60s 压测：nodes 126 → 272（振荡），heap 82MB 恒定，peak 111MB，errors none
- 子弹对象池运行时：两次独立子弹均命中 10 伤害；第一颗回收后 hitSetPool 非空，第二颗正常命中
- 微信构建 success：3.14MB / 10.97MB；index.js 332,571 B（2026-11-02 14:10:44）

### 下一步
- 等用户确认后进入批次 6。

## 批次 4：霜爆单变量数值（2026-11-02）

### 完成
- A-BAL-01：data/Skills.ts frostnova dmg 7 → 12；cd 3.6 不变。
- docs/delivery/SKILLS.md 同步伤害 12。

### 验证
- 组合审计：
  - 霜爆裸装：1.9 → **3.3 DPS**
  - 霜爆最强：5.4 → **9.3 DPS**（echo+echo+echo）
  - 全局最强/中位：4.00×（取整后不变；霜爆不是全局最强头部）
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **586 PASS / 0 FAIL**
- 测试期望值：**未改**
- 微信构建 success：3.14MB / 10.97MB；index.js 332,335 B（2026-11-02 14:03:42）

### 下一步
- 等用户确认后进入批次 5。

## 批次 3：假选项 3 项（2026-11-02）

### 完成
- CNT-01：SkillCalc.ts:8 环刃白名单移除 rapid；docs/design/skill_expansion_design.md 转速改“固定”、兼容说明更新。
- CNT-02：Battle.ts explodeTrap 使用 `Math.max(48, tr.rt.size)` 爆炸半径，特效按 radius/48 同步缩放。
- CNT-03：SkillRules.ts 新增 chainEchoRepeats；Battle.ts chain 分支新增 jumpR、nearestEnemy 改用 jumpR、return 前 queueEcho。

### 验证
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **586 PASS / 0 FAIL**
- 测试期望值变更（经用户批准）：tests/run.ts ring_blade 矩阵移除 rapid
- tools/audit_combo.ts = 8588 组合；中位 19.0；最强/中位 4.00×
  - 空转清单不再有环刃×急速、地雷阵×增大、连锁×增大/重复施放
  - 连锁闪电最强 DPS：27.7 → **39.1**（echo+echo+chain）
  - 地雷阵最强仍 30.5；环刃最强 24.0
- 剩余空转：哨戒哨兵 × 狙击（既有问题，不属本批）
- 微信构建 success：3.14MB / 10.97MB；index.js 332,334 B（2026-11-02 12:38:35）

### 下一步
- 等用户确认后进入批次 4。

## 批次 2：视觉 / 文案 4 项（2026-11-02）

### 完成
- BUG-04：删除 GameRoot.ts 结算页 1476-1483 的「阶段3 收尾版」水印与「导出日志」按钮；copyRunLogs 保留。
- BUG-05：GameRoot.ts:1771 TAG_CN 补 orbit/trap/summon/charge；构筑面板标签全中文。
- BUG-06：ui/Modals.ts:121 卡片高度改为 nLines * Math.round(14 * 1.5)（21px/行）。
- BUG-07：ui/Hud.ts:191 空槽全角「＋」改为 ASCII「+」。

### 验证
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **586 PASS / 0 FAIL**
- UI 审计：三视口合计问题 **0 条**（原 2 条）
- 截图：reports/text_fit/360x640-{result,build,hud,levelup}.png
- 结算页无水印/导出日志；构筑标签「物理 · 远程 · 回旋」全中文；升级卡数值行完整

### 下一步
- 等用户确认后进入批次 3。

## 全量审查交付（2026-11-02）

### 完成
- **主交付**：`reports/full_audit_and_fix_plan_20261102.md` —— 审查报告 + 每个缺陷的详细修复方案（含代码补丁、验证步骤、风险评估、修复批次建议）。
- 摘要版：`reports/full_audit_20261102.md`（BUG / 性能 / 组合 / UI / AI 测试五块）。
- 新增审计工具：`tools/audit_combo.ts`（8616 组合枚举）、`tools/ui/audit_text_fit.cjs`（三视口逐页文本/遮挡审计）。
- 缺陷 8 项 + 规则问题 3 项：
  - BUG-1 P0 `GameRoot.ts:376` DEBUG「数据」按钮每次进菜单追加、永不销毁（实测 1→2→3）。
  - BUG-2 P0 `Battle.ts:489 clearSkillRuntime` 不销毁 `chargeFx` 节点（实测换技能后 charging=false 但节点仍在，截图 `reports/text_fit/chargefx_leak.png`）。
  - BUG-3 结算页残留水印「阶段3 收尾版」+ 导出日志按钮（`GameRoot.ts:1473`）。
  - BUG-4 `TAG_CN` 缺 orbit/trap/summon/charge → 面板露英文。
  - BUG-5 升级卡片 14px 字 / 19px 框（需 21px）→ 第二行裁切。
  - BUG-6 HUD 空槽全角「＋」字形缺失 → ▯▯▯。
  - BUG-7 `Battle.ts:1527/2240` `Math.min(dmg)` 单参数笔误。
  - RULE-1 环刃转速未读 rapid（文档说受加成）→ 装急速零收益。
  - RULE-2 白名单空转：`地雷阵×增大`、`哨戒哨兵×狙击`。

### 验证
- `tests/run.ts` = **586 PASS / 0 FAIL**（基线未破）
- `tools/audit_combo.ts` = 8616 组合、中位 18.7、最强 76.2、比值 4.08×、4 条空转
- `tools/ui/audit_text_fit.cjs` = 三视口合计 2 条裁切（均在升级三选一），截图 21 张
- 内存：战斗内 60s 压测 mem 87MB 恒定、peak 117MB、节点 122→351 振荡 → **无泄漏**
- 本轮**未修改任何游戏源码**

### 未完成
- 8 项 BUG + 3 项规则问题均未修（等确认；修复方案见 `reports/full_audit_and_fix_plan_20261102.md` 第 2、3 章）。
- 微信真机视觉/交互确认（沿用上轮遗留）。
- 性能优化只给定位，未做优化前后 FPS 对比。

### 下一步
- 等用户选定批次（建议 P0 两项内存 → P1 视觉/文案 → 规则空转 → 数值平衡 → 性能）。

---

## 历史：M2-B.3.x 整数型黑科技 Ⅲ 级空转（2026-11-01）

### 完成
- 新增 data/Modules.ts modIntEffect(id)=levelOf(id)（Ⅰ/Ⅱ/Ⅲ = 1/2/3）。
- 效果读取改用 modIntEffect：SkillCalc 的 multi/fan/split/bounce/pierce/orbit/chain/echo；ModuleText 对应文案。
- modPower 保持 1/2，仍只服务 canInstall 容量上限与合成计数。
- 数值型模块继续 modEffect（1.6/2.2），未动。

### 验证
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **586 PASS / 0 FAIL**
- 反伤模块已移除，thorncoat 保留；RUN_SAVE_VERSION 2 拒绝旧存档
- 整数型 Ⅲ 级空转已修（modIntEffect / modPower 分离）
- chain 图标/描述与弹射区分；黑科技统一青色底框
- 技能/道具重复图标已拆分；全局 113 个图标唯一
- 冰系 t_ice 25%、cdr_ice 15%
- 移除寒冰环；霜爆保留为唯一范围爆发（对减速目标 1.5x）
- aoe_x tier3；resonator 描述统一；greed 金币 +25% 实装
- 道具/技能头注释 79/17；item_audit 当前 79 图标 / 0 重复 / 23 同属性档
- 移除重复范围技能 shockwave/thorn/frostring；商店去掉 requires 长提示；HUD 橙色波次条删除；陨石旋转 90° 竖直下落
- 移除 moduleRequiresHint 死代码；安装详情增加“触发：”Hook 标签
- 设计/交付文档已加当前状态说明（17 技能/17 黑科技，移除旧技能/反伤模块）
- 微信构建 success：3.14MB / 10.97MB；index.js 332,335 B（2026-11-01 20:35:05）

### 未完成 / 待决策
- 微信真机视觉/交互确认（唯一剩余）。

### 下一步
- 等待用户决定是否做 Hook 标签或真机验证；无其他已知代码缺陷。
- 审计工作簿已整理：保留 01-04 历史快照，移除 05/06/06B/07/08/09；备份在 reports/*.before_sheet_cleanup.xlsx。



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
