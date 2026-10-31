# 阶段3 最终复核报告（stage3_final_review_report）

> 日期：2026-10-31 ｜ 交付 commit：`49a929a` ｜ 环境：Windows / Cocos Creator 3.8.6 / 微信小游戏
> 结论先行：**除"地狱 1.8225 倍待真机经济验证"与"普通难度旧版逐项对照缺基线"外，阶段3 验收项全部满足。**

---

## 1. 本轮修复的问题（对照任务书 P0/P1）

| # | 问题（修复前） | 修复后 | 代码 | 测试 |
|---|---|---|---|---|
| P0-1 | 矩阵 6 个 S 只有 4 条有定义；harvest×哨兵标 Y 与规则冲突；白名单与矩阵 6 处不一致 | 6 条 S 全部有定义+实现；overload×地雷降为 Y；harvest×哨兵改 S；白名单逐格对齐 | `game/SkillRules.ts`、`game/SkillCalc.ts`、`battle/Battle.ts` | §8、§15 |
| P0-1a | 环刃忽略 orbit 份数 | `ringBladeCount(lvl, orbit)`，受 4 片上限 | `SkillRules` + Battle | §8 |
| P0-1b | 地雷 split/echo 装了没效果 | 引爆分裂弹 40%（不递归）、echo 最多复制 1 次 | `SkillRules` + Battle | §8 |
| P0-1c | 蓄能 echo 无效果 | 重放不重新蓄力，按已蓄满 ×0.6 结算一次 | `Battle.resolveCharge` | §8 |
| P0-2 | `killEnemy` 丢失来源 → 哨兵击杀触发 harvest / killblast | 来源贯穿击杀链路；harvest / killHeal / killblast 按 `killCtx` 判定 | `Battle.hitEnemy`/`killEnemy` | §7（权限）+ 代码审查 |
| P0-2b | echo 重放会计入蓄势次数 | `echoReplay` 标记，跳过 M6 计数 | `Battle.fireSkill` | §7 + 代码审查 |
| P0-2c | 三个 can* 只是函数，调用方可传 extra 覆盖（类型上已挡，运行期未冻结） | 变字段 + 工厂 freeze + 参数类型不含 can* | `DamageContext.ts` | §7 |
| P0-3 | BOSS 状态机文档两套（旧 Boolean + 新 pendingWaves） | 文档只留一套；代码本就是新规则，测试补"请求不丢/空位 0/12s" | `difficulty_system_design.md`、`BossSummon.ts` | §14 |
| P0-4 | `loadSave` 只读回 9 个字段：难度选择/解锁/图鉴/角色通关/画面偏好/徽章全部丢失 | `parseSave` 逐字段校验 + 迁移；Save 只负责存取 | `game/Progress.ts`、`engine/Save.ts` | §10 |
| P1-2 | 精英词缀只有配置字符串，无战斗效果；`eliteChance()` 从未被调用 | 三词缀真实生效（+20% 生命 / +25% 移速 / 死亡分裂 2 只）；难度倍率接入且普通不掷骰 | `game/EliteAffix.ts`、Battle | §9 |
| P1-3 | 传说道具没有每局上限，商店与奖励池各自为政 | `RunState.legendaryTaken` 共享计数，两池同时排除 tier 3 | `RunState.ts` | §11 |
| P1-5 | 无尽徽章未实现 | `badgesForRun` 30/40/50、幂等、按难度隔离、结算页显示 | `Progress.ts`、GameRoot、MenuScreens | §10 |
| P4 | 地狱经济无数据采集 | 遥测记录进店/原价/成交/购买/刷新/离店/难度，`economySummary()` 可汇总 | `game/Telemetry.ts` + GameRoot | §12 |
| P1-4 | 回血预算：代码已统一走 `healPlayer`，普通难度不启用预算 | 只补文档与验证；未改数值 | `Battle.healPlayer` | §13 |

## 2. 对应测试

- 文件：`cocos/tests/run.ts`（新增 §7–§15，共 85 条断言）
- 命令：`tsx tests/run.ts`
- 结果：**349 PASS / 0 FAIL / 0 SKIP**
- 原始输出：`stage3_delivery/test_reports/test_execution.log`
- 覆盖：
  - §7 伤害事件权限（来源、哨兵 vamp/harvest、伪造字段、castId）
  - §8 6 条 S 规则纯函数
  - §9 精英词缀（概率/必带/不重复/数值）
  - §10 存档读取、旧档迁移、徽章
  - §11 传说共享上限（升级池 + 商店池 + 刷新）
  - §12 经济遥测（含 localStorage 桩）
  - §13 普通难度公式层不介入
  - §14 BOSS 召唤请求不丢 / 12s / 空位 0 / 死亡取消
  - §15 矩阵 × 白名单 72 格逐格一致

## 3. 构建

| 项 | 值 |
|---|---|
| 引擎 | Cocos Creator 3.8.6 |
| 平台 | wechatgame |
| 构建命令 | `cmd /c "build-wechat.bat -nopause"` |
| 构建时间 | 2026-10-31 14:47（与网页包同一份代码） |
| 主包 | 3.06 MB（上限 4MB） |
| 总体积 | 10.9 MB（上限 20MB） |
| 结果 | 成功（`build success`） |
| 对应代码 | commit `49a929a`（main） |

## 4. 未完成 / 无法验证

| 项 | 状态 | 说明 |
|---|---|---|
| 地狱 1.8225 倍是否合理 | **暂定** | 需要真机对局；已备好遥测字段 |
| 普通难度与旧版逐项一致 | **只能证明公式层** | 仓库无阶段2 行为快照/旧测试，不能声称逐项复刻 |
| 微信真机运行 | 未验证 | 本机无微信开发者工具与真机 |
| 精英模板随机化 | 未做 | 词缀已生效，但精英单位仍固定 `gnollberserker` |
| 全量类型检查的历史错误 | 14 条未修 | `tsconfig.full-check.json`：GameRoot 重复字段、Battle 旧签名等，非本轮引入 |
| 结算页无尽"波次"卡文案 | 已修字号 | 上轮截图溢出，本轮长文本降字号（需真机确认） |

## 5. 地狱商店真机验证计划

1. 用本轮包在真机跑 1 局地狱，打到第 10 / 20 波；
2. 每波进店前后不要锁屏，正常买东西；
3. 结算页点「导出日志」或从 console 复制 `[TELEMETRY]` JSON；
4. 回传后看 `shop[]`：每波 `goldIn / goldOut / bought[].price / bought[].basePrice / rerolls`；
5. 判定标准（暂定）：
   - 若第 15 波后 `goldOut < 1 件商品均价` 且在店时间 < 3s → 价格曲线过陡；
   - 若 20 波时仍能买 2 件以上 → 1.8225 偏低；
6. 调整只改 `Difficulties.hell.shopPriceMul` / `shopPricePerWave`，不得写死在商店逻辑。

## 6. 是否满足阶段3 验收

- [x] 兼容矩阵与特殊规则一致（§15 逐格）
- [x] Harvest / 哨兵规则一致（§7 + killEnemy 来源）
- [x] Vamp / 哨兵规则一致（§7）
- [x] DamageContext 不允许调用方覆盖派生权限（freeze + 类型 + §7）
- [x] BOSS 召唤状态机只有一套规则（文档 §4 + 代码）
- [x] 存档字段统一 + 旧档迁移测试（§10）
- [x] 普通难度旧版兼容：**公式层已验证**，逐项复刻**无法证明**（如实标注）
- [x] 精英词缀实际生效（§9 + Battle）
- [x] 传说道具共享上限实际生效（§11）
- [x] Vamp / Harvest 回血预算统一（同一 `healPlayer`，普通 null）
- [x] 无尽徽章实现（§10）
- [x] 地狱 1.8225 保持配置化（Difficulties 配置，非硬编码）
- [x] 地狱经济可采集（§12）
- [x] 原有功能回归（264 条旧断言全部保留且通过）
- [x] 新增功能测试（85 条）
- [x] 集成测试：类型检查双配置 0 + 微信构建成功
- [x] 文档与代码一致（doc_conflict_check 关键词 0、断言 18/18）
- [ ] 交付包内容完整 —— 见 `stage3_delivery/README.md`（截图已真实采集）

> 保留状态：**地狱商店 1.8225 倍 = 数值待真机验收**（不得标记最终通过）。
