# 当前任务

## 当前阶段

**阶段3（2026-10-31）收尾完成 — 交付后等真机复测**

### 本轮（阶段3 收尾 / 任务书执行）已完成
- P0-1 兼容矩阵：6 条 S 规则全部有定义 + 实现 + 测试；overload×地雷降为 Y；harvest×哨兵改 S；
  `SkillCalc.NEW_SKILL_ALLOW` 与矩阵逐格一致（tests §15，72 格）。
- P0-2 伤害事件：`DamageContext` v7（canHarvest/canVamp 变字段、工厂 freeze、哨兵 summonKind 例外）；
  `killEnemy` 接收来源（哨兵击杀不再触发 harvest/killblast/击杀回血）；echo 不再计入蓄势。
- P0-3 BOSS 召唤：文档只留一套状态机（旧 Boolean 版删除）；测试补"请求不丢 / 空位 0 / 12s / 死亡取消"。
- P0-4 存档：`Progress.parseSave` 读全字段 + 校验 + 迁移（此前难度/图鉴/角色通关/偏好/徽章全部读不回来）。
- P1-2 精英词缀：新 `game/EliteAffix.ts`（护盾 +20% 生命 / 加速 +25% 移速 / 分裂出 2 只小怪）；
  难度 `eliteChanceMul` 真正接入，普通难度不掷骰。
- P1-3 传说道具：`RunState.legendaryTaken`，商店/升级池共享计数，刷新绕不过。
- P1-5 无尽徽章：`Progress.badgesForRun`（30/40/50，幂等、按难度隔离），结算页显示。
- P4 经济遥测：`Telemetry` 记录进店/原价/成交/购买/刷新/离店/难度 + `economySummary()`。
- 截图：web-mobile 真实构建 + headless Chrome，5 张（主菜单/战斗/商店/结算/无尽）。
- 交付包：`crazy_pigeon_king_stage3_final_20261031_1449.zip`（含 docs / test_reports / build_reports / screenshots）。

### 验证
- `tsc -p tsconfig.check.json` = 0；`-p tsconfig.ui-check.json` = 0
- `tsx tests/run.ts` = **349 PASS / 0 FAIL**
- 微信包 3.06MB / 10.90MB（14:47 构建，commit `49a929a`）

### 未完成 / 待真机
- 地狱 1.8225 倍：暂定，等真机 `[TELEMETRY]` 经济数据；
- 普通难度逐项等于旧版：**无法证明**（仓库缺阶段2 基线），只能证明公式层 + 旧断言回归；
- 微信真机：难度页 / 精英词缀辨识 / 滚动 / 商店详情 / BOSS→结算→无尽 / 徽章文案；
- 图鉴技能分类筛选、文档由代码生成：未做（见 expansion_acceptance_criteria）。
