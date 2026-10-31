# 续玩存档与历史对局设计（run_save_and_history_design）

> 代码：`game/RunSave.ts`、`game/RunHistory.ts`、`engine/RunStore.ts`、`battle/Battle.ts`（snapshot/resume）、`GameRoot.ts`（流程）。
> 原则：先保证"恢复后不重复发奖 / 不丢构筑"，再谈 UI。

## 1. 三份数据，职责分开

| 数据 | key | 内容 | 生命周期 |
|---|---|---|---|
| Progress | `cmt_save_v1` | 永久解锁 / 成就 / 图鉴 / 偏好 / 徽章 | 永久 |
| ActiveRunSave | `cmt_active_run_v1` | 当前未完成的一局（恢复用） | 开局创建 → 结束/放弃时删除 |
| RunHistory | `cmt_history_v1` | 已结束对局的摘要 + 详情 | 永久（上限 50 局） |

- 未完成的对局**只**进 ActiveRunSave，绝不写历史；
- 已结束的对局写 RunHistory 后**立即清** ActiveRunSave；
- Telemetry（`cmt_log_v1`）保留为分析日志，不参与 UI。

## 2. ActiveRunSave 数据模型

```ts
interface ActiveRunSave {
  v: 1; runId; startedAt; savedAt;
  charId; difficulty; seed; rngState;
  phase: 'battle' | 'shop' | 'levelup';
  wave; endless;
  gold; lv; exp; expNeed; kills; waveKills; runTime;
  stats; baseStats;
  skills: { id; lvl; mods[] }[];
  modsBag: string[]; items: { id }[]; attrTaken;
  shopReroll; shopStock; carryOver;
  legendaryTaken;
  pendingRewards?;
  battle: { waveLeft; spawnAcc; elitesSpawned; px; py; skillT[]; enemies[]; bossSummon?; bossDefeated? };
}
```

### 2.1 恢复范围（诚实边界）

| 恢复 | 不恢复 |
|---|---|
| 角色 / 属性 / 生命 / 金币 / 等级 / 经验 | 子弹 / 区域 / 地雷 / 哨兵 / 蓄能（瞬时实体，寿命 <3s） |
| 技能 / 等级 / 黑科技 / 道具 / 传说计数 / 难度 | 具体的命中顿帧 / 屏幕震动状态 |
| 波次 / 剩余时间 / 刷怪进度 / 精英数 | 视觉特效与音效队列 |
| 存活敌人（逐只）+ 状态（灼烧/中毒剩余） | — |
| BOSS 召唤状态机 | — |
| RNG（mulberry32 内部状态） | — |
| 商店货架 / 锁定 / 刷新计数、升级待选卡 | — |

## 3. 保存时机（事件触发，不逐帧）

| 时机 | 调用 |
|---|---|
| 开局 startRun 完成 | `startBattle → saveActiveRunNow()` |
| 波次结束进商店 | `showShop → saveActiveRunNow()` |
| 商店购买 / 锁定 / 刷新 | 对应回调成功后 |
| 升级三选一出现 | `showLevelUp`（含 pendingRewards） |
| 选卡完成 | `pickReward`（奖励落袋后） |
| 打开暂停面板 | `showPause` |
| 切后台 | `Game.EVENT_HIDE` |
| 保存并退出 | 确认弹窗 → save → showMenu |

写入是同步 `sys.localStorage.setItem`（字符串 < 100KB），失败只警告、不阻断游戏。

## 4. 恢复流程

```
主菜单 → loadActiveRun()
  ├ none      → 继续卡置灰
  ├ corrupt   → 显示原因 + 清档入口
  ├ version   → 显示原因 + 清档入口
  └ ok → battle.resumeRun(save)
           ├ 重建 RunState（属性/构筑/经济/RNG）
           ├ 重建玩家与敌人（restoreEnemy）
           ├ 恢复 waveLeft / spawnAcc / skillT / bossSummon
           └ 按 phase 进入：battle / shop（不重刷货架）/ levelup（原待选卡）
```

**防重复的关键**：
1. `shop` 恢复时 `resuming=true`，跳过 `refreshShop` 与遥测进店；
2. 奖励在 `pickReward` 里先落袋再存档，恢复不会再触发同一张卡；
3. `runId` 在开局生成，结算写历史按 runId 幂等。

## 5. 三条结束路径（数据层区分）

| 玩家行为 | ActiveRunSave | RunHistory |
|---|---|---|
| 保存并退出 / 切后台 | **保留** | 不写 |
| 放弃本局（确认） | 删除 | 写 `abandoned` |
| 死亡 / 通关 / 无尽倒下 | 删除 | 写 `defeat` / `victory` / `endless_end` |

结算顺序：生成 runId → 写历史（失败则**保留活动存档**并 return）→ 成功才清活动存档。

## 6. RunHistory 模型与容量

- `RunSummary`：列表用（角色/难度/结果/波次/时长/击杀/精英/BOSS/金币/无尽/最终技能与道具/徽章）。
- `RunDetail`：点开才读（技能+黑科技明细、道具计数、关键属性、里程碑、结束原因）。
- 容量：**50 局**；超出按 `endedAt` 删最旧，摘要与详情一起删。
- 幂等：`addRun` 发现同 `runId` 直接返回 `{added:false}`。
- 解析：`validateHistory` 过滤坏记录、版本不符重建空历史，不抛异常。

## 7. 版本迁移

- `ActiveRunSave.v` 与 `RUN_SAVE_VERSION` 比较：
  - 更高或更低 → `status:'version'`（菜单提示并允许清档），**不尝试半恢复**；
  - 结构缺字段 → `corrupt`；
  - 未来新增字段时：升版本 + 在 `validateActiveRun` 里补迁移分支（拒绝是默认安全策略）。
- `RunHistory.v` 不符 → 重建空历史（历史不是关键进度，不做复杂迁移）。

## 8. 测试映射

| 规则 | 测试 |
|---|---|
| 序列化/校验/非法字段 | tests §17 |
| 历史幂等 / 50 上限 / 筛选 / 统计 / 坏数据 | tests §18 |
| RNG 续接 | tests §16 |
| BOSS 状态机快照 | tests §19 |
| 战斗链路判定（击杀/吸血） | tests §21 |
| 真实恢复（浏览器） | `tools/ui/shot_menu_history.cjs` 的 `resume-match` 断言（gold/kills/wave/skills 前后一致） |
