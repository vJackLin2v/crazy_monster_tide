# 当前任务

## 道具 / 黑科技 / 技能 命名审查（2026-11-06）

### 方法
把 113 个名字（17 技能 + 17 黑科技 + 79 道具）按"玩家能不能看名字猜到效果"分三级：
- **A 保留**：具象、能联想（火球、陨石、穿透、吸血、铁匠手套……）
- **B 可优化**：生僻词/技术词/与同类撞字
- **C 必改**：把功能描述直接当名字（和"写入历史"同一类问题）

### 完成（改 14 个名称 + 2 处描述缩写）
技能（3）：
- 哨戒哨兵 → **哨戒塔**（"哨戒"是军事术语，塔是具象形状）
- 蓄能脉冲 → **蓄能炮**（"脉冲"是电子术语）
- 灵能箭 → **追魂箭**（"灵能"是科幻词，与像素东方风不搭；同步改了 desc）

黑科技（1）：
- 增大 → **变大**（"增什么大"不明确；其余 16 个都能看懂，未动）

道具（10）：
- 灼烧增伤 → **火油瓶**｜破冰增伤 → **碎冰锥**｜落雷追加 → **引雷针**
- 低血强化 → **残血护符**｜受击反伤 → **荆棘甲**｜金币转攻击 → **点金手**
- 刷新省钱 → **赊账簿**｜极简专精 → **少即是多**｜黑科技共鸣 → **共鸣石**
- 苔藓苔 → **苔藓**（重复字，像笔误）

描述里的开发缩写（2）：
- 荆棘甲 desc：`0.5s CD` → `0.5 秒一次`
- 黑科技「收割」数值：`击杀回复 1 HP` → `击杀回复 1 点血`

### 明确保留（附理由，避免下次重复讨论）
- 「乱杀」「扎心」—— 口语但记忆点强，符合割草爽感
- 「回旋刃」—— 虽与"环刃"同带"刃"，但"回旋"已把机制说清
- 「吸尘器」「吸铁石」「急救包」「大就是好」—— 现代物件/口语，但**一看就懂**，符合 Brotato 那种荒诞具体感
- 「多重射击」「冷却缩减」「重复施放」—— 游戏通用词，玩家认知成本低
- 24 组属性道具的"XX之X"命名 —— 具体器物，质量在线

### 验证
- `tsc` 双配置 = 0；`cocos/tests/run.ts` = **586 PASS / 0 FAIL**
- 编码自检：三个数据文件无乱码特征字
- 产物扫描：12 个新名字全部存在，6 个旧名字全部清除
- 截图：`reports/text_fit/names_pause.png`（技能页）、`names_items.png`（道具页，名字与效果对得上）

### 未完成
- `docs/` 里的设计文档仍用旧名（不影响运行，下轮同步）
- 「荆棘甲」图标 `sh-heart` 显示成奖杯样，疑似图标缺失走 fallback，待查

### 下一步
- 真机验收

---

## 清理玩家可见的开发术语（2026-11-06）

### 背景
用户发现退出确认弹窗写着「放弃本局（写入历史）」—— "写入历史"是数据库术语，玩家看不懂。要求全量排查同类问题。

### 完成（全量扫描 3 轮：可疑词 / 括号解释 / 中文夹英文）
- `MenuScreens.ts` 退出确认：「放弃本局（写入历史）」→「放弃本局」
- `MenuScreens.ts` 坏档卡片：「存档不可用」→「进度读取失败」，正文不再透传底层校验信息
  （`存档缺少技能` 这类只进 `logEvent('save_unreadable')`），「点此清除坏档后重新开始」→「点此清除，重新开始」
- `MenuView.corruptNote` 字段删除（不再有 UI 展示路径）
- `MetaScreens.ts` 删除残留的调试块：「战斗日志：已记录 N 局（调试构建可见）」+「导出战斗日志」按钮
  （上一轮只删了 GameRoot 的入口，这处在 DEBUG 分支里漏网）；同步清理 `DEBUG` / `listRuns` / `exportLogs` / `BUILD_TAG` 的 import
- `MetaScreens.ts` 更新提示：「新版本已就绪，点击重启」→「已更新，点击重启」
- `Modals.ts` 暂停抽屉标题：「构建面板」→「当前构筑」（与结算页"本局构筑"统一）
- `core/BuildTag.ts`：`BUILD_TAG` 从「v0.3 · 2026-10-31 · 菜单V3 + 真机日志」改为「v0.3」——
  这行**直接显示在主菜单底部给玩家看**，原来把开发标记也写进去了；开发标记拆到 `BUILD_ID`，只进 `session_start` 日志

### 验证
- 扫描脚本 3 轮：可疑技术词 21 条 → 逐条判定；括号解释 29 条；中文夹英文 0 条
- `tsc` 双配置 = 0；`cocos/tests/run.ts` = **586 PASS / 0 FAIL**；UI 审计三视口 = **0 条**
- 截图：`reports/text_fit/copy_quit.png`（退出确认，已无"写入历史"）、`copy_settings.png`（设置页，已无战斗日志）、`copy_menu_ver.png`（主菜单底部只剩 v0.3）
- 微信包：主包 3.14MB / 总 10.97MB

### 未完成
- 真机确认（沿用前几轮的待办）

### 下一步
- 等真机验收

---

## HUD 布局重排 + 转发改为纯微信自带（2026-11-06 下午）

### 完成
- **HUD 布局重排（`ui/Hud.ts`）**：放弃上一版"把右上内容横向挤到胶囊左侧"的做法（会在右上留一大块空白、暂停键被挤到屏幕中间）。改为行业通行的**顶部整体留系统区**：
  - `S = max(safeTop, capsule.bottom + 6)`，HUD 从胶囊下沿开始排；左右两块顶部对齐。
  - 右侧恢复贴边：波次文字右边界 `VW-68`、暂停键 `VW-30`（回到右上角，符合 `docs/ui/reference-library/wechat-minigame-guidelines.md` 的"暂停键右上角肌肉记忆"要求）。
  - 波次文案恢复「波次 N · 击杀 M」。
  - BOSS 条与顶部渐隐板跟随下移（`bossY = S+80`、`PLATE = max(S+100, bossY+22)`）。
  - 血条 156 → 144，给中间留 ~28px 呼吸区。
- **转发改为微信自带**（按用户澄清：不要游戏内分享按钮）：
  - 撤掉 `buildResult` 的 `onShare` 参数与「分享」按钮，底部恢复「主界面 / 再来一局（/ 继续·无尽）」。
  - `Share.ts`：`shareResult` → `shareNow`（保留但不被 UI 调用）；真正生效的是 `initShare()` + `setPassiveShare()`。
  - `GameRoot.showResult` 里把本局成绩设为被动转发内容 —— 玩家点右上角 ··· → 转发，卡片就是本局战绩。

### 验证
- `tsc` 双配置 = 0；`cocos/tests/run.ts` = **586 PASS / 0 FAIL**；UI 审计三视口 = **0 条**
- 胶囊：四机型 `pauseHit` 重叠全 0，且 `x[308,352]` 贴回右边缘
  - SE2 y[516,560]｜iPhone13 y[632,676]｜14Pro y[628,672]｜15PM y[630,674]
- 微信构建：主包 3.14MB / 总 10.97MB；产物含 `showShareMenu / onShareAppMessage / shareAppMessage`，无测试残留
- 截图：`reports/text_fit/capsule_390x844.png`（HUD）、`capsule_375x667.png`（小屏）

### 未完成
- 真机确认（转发卡片、暂停键手感、iOS BGM）
- 分享封面图（`SHARE_IMG` 留空 → 微信自动截图）

### 下一步
- 等真机验收；若 HUD 还需调整，按具体位置改。

---

## 清理测试 UI + 修胶囊 + 转发（2026-11-06）

### 完成
- **删除全部测试 UI 入口**：
  - `GameRoot.ts`：删除 DEBUG「数据」按钮块、`dbgBtn` 字段、`showTelemetry()`、`copyRunLogs()`、`import { DEBUG }`、`import { buildTelemetryScreen }`。
  - 删除 `ui/TelemetryScreen.ts` + `.meta`（唯一引用方已移除）。
  - 保留控制台调试钩子（`__logs` / `__deviceLogDump` 等），它们不占玩家可见区域。
- **HUD 胶囊避让（BUG-09 修复）**：
  - `ui/Hud.ts`：`caps`/`capsSane` 从死变量改为真正参与布局；倒计时与暂停键水平让到胶囊左侧。
  - 波次文案由「波次 N · 击杀 M」改为「第 N 波」并缩短宽度 —— 纯水平避让，不再依赖各机型胶囊高度（SE2 距顶 24~56、iPhone 13 是 47~77，垂直方案必然在某类机型翻车）。
  - 四机型实测重叠归零：SE2 / iPhone 13 / 14 Pro / 15 Pro Max，`pauseHit` 重叠面积全部 = 0。
- **转发（微信小游戏）**：
  - 新增 `game/Share.ts`（+ .meta）：`initShare`（showShareMenu + onShareAppMessage）、`shareResult`（主动）、`readLaunchQuery`、`onShareEnter`。
  - `GameRoot.ts`：启动时 `initShare()`；冷启动读 query 记 `share_enter`；热启动 `onShareEnter` 埋点；结算页传 `onShare`。
  - `ui/MenuScreens.ts`：`buildResult` 增加 `onShare?`，底部按钮区重排为「主界面 / 再来一局 / 继续·无尽 / 分享（44×50）」，右侧固定 12px 边距。
  - 分享文案按胜负区分，落地参数 `from / wave / win`。

### 验证
- `tsc -p tsconfig.check.json` / `-p tsconfig.ui-check.json` = **0 错误**
- `tsx cocos/tests/run.ts` = **586 PASS / 0 FAIL**
- UI 审计三视口 = **0 条**
- 胶囊实测（`.tmp/probe_capsule.cjs`）：四机型 `pauseHit / pauseIcon` 重叠均为 **0**
- 分享点击实测（`.tmp/probe_share.cjs`）：`deviceLog: {"ev":"share_click","d":{"wave":20,"win":1,"kills":1}}`，`pageerror: none`
- 微信构建：主包 **3.14MB**（限 4MB）、总 **10.97MB**（限 20MB）
- 构建产物扫描：无 `showTelemetry / 导出日志 / 阶段3` 残留；含 `shareAppMessage / showShareMenu / share_click / share_enter`
- 截图：`reports/text_fit/capsule_390x844.png`（修复后 HUD）、`result_share.png`（结算页四按钮）

### 未完成
- 真机确认：转发卡片标题/封面、iOS 首次 BGM 是否静音（RISK-01）、胶囊真实位置与 mock 的偏差。
- 分享封面图未做（`SHARE_IMG` 留空 → 微信自动截图；美术出图后填包内路径）。
- 排行榜/订阅消息按用户要求**不做**。

### 下一步
- 等真机验证结果；如需要再做分享卡片图。

---

## 二次全量审查：微信平台 / 苹果端专项（2026-11-06）

### 完成
- 报告：`reports/review_20261106_wechat_ios.md`（审查结论 + 苹果端逐项对照 + 微信功能实现方案）。
- 回归基线全部通过：tsc 双配置 0、`cocos/tests/run.ts` 586 PASS、UI 审计 0 条、60s 压测无泄漏（堆 51MB/峰值 87MB/节点 125→309）。
- 包体积：主包 3.2MB（<4MB）、总 18MB（<20MB）。
- **新发现 BUG-09（P0）**：微信胶囊遮挡 HUD 暂停键与倒计时。`ui/Hud.ts:146` 的 `caps`/`capsSane` 计算后从未使用，暂停键写死 `S+42`。四机型实测重叠：SE2 253px²、iPhone13 1259px²、14Pro 1290px²、15ProMax 1179px²（按钮 66% 被盖）。注释写 `S+62` 与实现 `S+42` 矛盾，属回归。
- RISK-01：iOS 首次 BGM 可能静音（无手势解锁逻辑，待真机确认）。
- 微信功能现状：转发/分享/排行榜/订阅**全部未实现**（0 处相关 API），`game.json` 无 `openDataContext`。

### 验证
- `tsc -p tsconfig.check.json` / `-p tsconfig.ui-check.json` = 0
- `tsx cocos/tests/run.ts` = 586 PASS / 0 FAIL
- `node tools/ui/audit_text_fit.cjs` = 0 条
- `node .tmp/probe_soak2.cjs` = 60s，mem 51MB 恒定、errors none
- 新增胶囊实测脚本 `.tmp/probe_capsule.cjs`（4 机型）
- 本轮**未改动任何游戏源码**

### 未完成
- BUG-09 未修（等确认方案 A/B/C，建议 C：暂停键移到左上角）。
- RISK-01 需 iPhone 真机确认。
- 转发/排行榜未开工（方案已给）。

### 下一步
- 等用户确认从「修 BUG-09」还是「转发功能」开始；一次只做一个里程碑。

---

## 全部批次完成（2026-11-02）

### 完成：批次 1-6
- 批次 1（P0 泄漏）：GameRoot.ts:80/378-385 DEBUG 按钮复用；Battle.ts:489-500 clearSkillRuntime 销毁 chargeFx；Battle.ts:537-550 resetRunState 清理 chargeFx。
- 批次 2（视觉/文案）：GameRoot.ts 删除结算水印/导出按钮；TAG_CN 补 orbit/trap/summon/charge；Modals.ts:121 行高 21px；Hud.ts:191 ASCII +。
- 批次 3（假选项）：SkillCalc.ts:8 环刃移除 rapid；Battle.ts explodeTrap 读取 size；SkillRules.ts chainEchoRepeats + Battle.ts 连锁 jumpR/queueEcho。
- 批次 4（数值）：Skills.ts frostnova dmg 7→12；docs/delivery/SKILLS.md 同步。
- 批次 5（性能）：Hud.ts syncT 20Hz；Battle.ts hitSetPool 复用/回收。
- 批次 6（收尾）：Battle.ts waveDmgDealt 两处去掉无意义 Math.min；Tokens.ts FS.xs 11→12。
- 批次 7（PERF-01）：Battle.ts 敌人 64px 空间网格；updateBullets 只查附近格，距离改平方比较；每帧 updateEnemies 后重建。

### 验证（最终）
- tsc check = 0；tsc ui-check = 0
- tests/run.ts = **586 PASS / 0 FAIL**
- UI 审计三视口 **0 条**
- 微信构建 success：3.14MB / 10.97MB；index.js 333,266 B（2026-11-02 15:28:49）
- PERF-01 60s 压测：mem 54MB、peak 87MB、nodes 124→332 振荡、errors none
- 批次 1/5/7 的运行时验证见对应提交与 tasks 历史段

### 未完成
- 微信真机确认

### 每批必跑
```
npx tsc -p tsconfig.check.json
npx tsc -p tsconfig.ui-check.json
node <tsx> tests/run.ts
node tools/ui/audit_text_fit.cjs   # 期望 0 条
```

### 下一步
- 等用户安排微信真机验证；无已知代码缺陷。


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
