# 设计 → 实现 对照表（implementation_status）

> 用途：设计文档（`docs/design/*`）是意图；这里是**代码实际做到哪、由哪条测试证明**。
> 更新：2026-10-31（主菜单 V3）｜ 基线：`435 PASS / 0 FAIL`、tsc 双配置 0、微信包构建成功。

## 一、主菜单 / 续玩 / 历史（本轮新增）

| 能力 | 代码 | 测试 / 证据 |
|---|---|---|
| 主菜单 V3（LOGO/继续卡或开始按钮/四个像素图标） | `ui/MenuScreens.buildMenu` | 截图 menu_no_save / menu_has_save |
| 功能图标（卷轴/书/奖杯/齿轮，16×16 Graphics） | `ui/MenuIcons.ts` | `docs/ui/menu_v3_icons_preview.png` + 截图 |
| 玩法说明移入设置 | `ui/MetaScreens.buildSettings` | 截图 settings.png |
| 真机行为日志 | `game/DeviceLog.ts` + GameRoot 埋点 | localStorage + 微信实时日志 |
| 日志分析工具 | `tools/analyze_device_log.cjs` | 样例日志输出漏斗/死亡波/商店/升级摘要 |
| 日志说明文档 | `docs/testing/device_log_monitoring.md` | 真机取日志步骤 |
| 开始新冒险确认（不静默覆盖存档） | `buildStartNewConfirm` + `GameRoot.requestStart` | 截图 start_confirm |
| 战绩档案 V2（统计面板/Tab/卡片/空态） | `ui/HistoryScreens.buildHistoryList` | 截图 history_list / history_empty |
| 对局详情 V2（结果标题/2×3/图标/展开） | `ui/HistoryScreens.buildHistoryDetail` | 截图 detail_victory / defeat / abandon |
| 续玩生命严格恢复 | `game/RunRestore` + Battle.resumeRun | tests §22 + 浏览器 45/72 |
| 商店/升级恢复 | ActiveRunSave shopStock/pendingRewards | tests §23 + 浏览器断言一致 |
| 活动存档模型（ActiveRunSave） | `game/RunSave.ts` | tests §17（序列化/校验/非法字段/新版本） |
| 续玩持久化 | `engine/RunStore.ts` | 同上 + 浏览器 resume-match |
| 战斗恢复（敌人/波次/RNG/BOSS 状态机） | `battle/Battle.resumeRun/snapshotBattle` | 浏览器 resume-match（波次/构筑一致，金币击杀只增不减） |
| 自动存档时机 | `GameRoot.saveActiveRunNow`（开局/商店/升级/暂停/切后台） | 代码审查 + 截图流程 |
| 暂停退出三选（保存/放弃/继续） | `ui/MenuScreens.buildQuitConfirm` | 截图 + 代码路径 |
| 历史摘要 / 详情（50 局、runId 幂等） | `game/RunHistory.ts` | tests §18 |
| 历史列表 / 详情 / 空态 | `ui/HistoryScreens.ts` | 浏览器截图（列表/详情/空态） |
| 结束路径数据一致性 | `GameRoot.finishRun`（历史失败不清档） | 代码审查 + tests §18 幂等 |
| 战斗判定分支可测化 | `game/CombatRules.ts`（Battle 实际调用） | tests §21 |

## 二、阶段3 遗留修复

| 项 | 处理 | 测试 |
|---|---|---|
| 蓄势计数未清零 | 替换/丢弃技能时 `Battle.resetCastCount(slot)` | 代码审查（Battle 运行时） |
| 背水用伤害近似 | 改为真实攻速 → 技能冷却倍率 `lastbreathCdMul` | tests §20 |
| 余烬刻印叠层偏差 | **保留简化版**（灼烧 +25%），设计文档与决策表已标注 | tests §20 |
| 文档测试数 344/349 冲突 | 统一为当前实测 404 | 全仓库检索 |
| README 状态过期 | 已更新为 435 PASS + 主菜单 V3 | README |

## 三、既有能力（阶段3 收尾时已验证）

| 设计决策 | 代码 | 测试 |
|---|---|---|
| DamageContext v7（三个 can* 工厂推导 + freeze） | `game/DamageContext.ts` | §5n、§7 |
| 击杀链路传递来源 | `Battle.hitEnemy → killEnemy` | §21 |
| 6 条 S 规则 | `game/SkillRules.ts` + Battle | §8 |
| 矩阵 × 白名单 72 格一致 | `SkillCalc.NEW_SKILL_ALLOW` | §15 |
| 五档难度 / 普通不介入 | `data/Difficulties.ts` | §5p、§13 |
| BOSS 召唤状态机（含快照） | `game/BossSummon.ts` | §5p、§14、§19 |
| 精英词缀真实效果 | `game/EliteAffix.ts` + Battle | §9 |
| 传说道具共享上限 | `RunState.legendaryTaken` | §11 |
| 无尽徽章 | `Progress.badgesForRun` | §10 |
| 商店经济遥测 | `game/Telemetry.ts` | §12 |

## 四、实现与设计偏差（未隐藏）

| 项 | 设计 | 实现 | 说明 |
|---|---|---|---|
| 余烬刻印 | 叠层 +25%（3 层） | 灼烧目标 +25%，不叠层 | 已改文档为简化版；不声称叠层 |
| 历史"加载中"状态 | 需要 | 未做骨架屏 | 本地存储同步读取，没有真实加载态；异步化再补 |
| 续玩不含瞬时实体 | — | 不恢复子弹/区域/地雷/哨兵/蓄能 | 文档已写明；恢复后由技能重建 |
| 精英单位种类 | 随机 | 固定 gnollberserker | 词缀已生效，单位种类仍固定 |
| thunder/chain 对无弹体技能 | 原矩阵 Y | 矩阵与白名单均为 N | 见 skill_expansion §7 说明 |

## 五、尚未完成 / 待真机

| 项 | 状态 | 原因 |
|---|---|---|
| 微信真机续玩（杀进程/切后台） | 待验证 | 本机无微信开发者工具与真机 |
| 地狱 1.8225 倍经济 | 暂定 | 等真机 `[TELEMETRY]` |
| 普通难度逐项等于旧版 | 无法证明 | 仓库缺阶段2 行为快照 |
| 图鉴技能分类筛选 | 未做 | 非本轮范围，验收表已标注 |
| 文档由代码生成 | 未做 | 非本轮范围 |
| 历史列表滚动位置记忆 | 已实现（ModalList.offset） | 真机手感未验 |

## 六、验证基线（写任何结论前先跑）

    tsc -p tsconfig.check.json         -> 0
    tsc -p tsconfig.ui-check.json      -> 0
    tsx tests/run.ts                   -> 435 PASS / 0 FAIL
    cmd /c "build-wechat.bat -nopause" -> success

> `tsconfig.full-check.json` 仍有 13 条历史遗留错误（GameRoot 重复字段、Battle 旧签名等），
> 不是本轮引入；本轮用它做"新增错误过滤器"，修改前后错误集合一致。
