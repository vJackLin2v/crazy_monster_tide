# 战斗日志 + 可配置数值表

> 2026-10-29 ｜ 两个基础设施：`game/Telemetry.ts`（记录/分析）与 `core/Balance.ts`（可配置数值）
> 都只做"记录"和"读配置"，不改变规则分支。

---

## 1. 战斗日志（Telemetry）

### 记什么
每局一行汇总 + **每波一行**（20 波 ≈ 21 条，很小）：

```ts
WaveRec { wave, sec, kills, lv, gold, aliveMax, hp, dmgTaken }
RunRec  { id, at, charId, seed, waves[], end, deathWave, kills, maxAlive, dmgTaken, durSec }
```

### 什么时候写
| 时机 | 调用 | 位置 |
|---|---|---|
| 进局 | `telemetryStart(charId, seed)` | `GameRoot.startBattle()` |
| 每波开始 | `telemetryWaveStart(kills)` | `Battle.startWave()` |
| 每波结束 | `telemetryWaveEnd({...})` | `Battle.beginWaveEnd()` |
| 阵亡/通关 | `telemetryRunEnd({...})` | `GameRoot.showResult()` |

存 `localStorage['cmt_log_v1']`，**保留最近 20 局**；无 localStorage（单测）时全部走 try/catch，不崩。

### 怎么看
| 场景 | 做法 |
|---|---|
| 游戏内 | 设置 → 「导出战斗日志」：打印到控制台 + 写剪贴板 |
| 控制台 | `__logs()` 全部 / `__logSummary()` 按角色汇总 / `__logDump()` JSON / `__logClear()` |
| 自动跑图 | `node tools/analysis/log_probe.cjs`（跑一局 → 打印日志并验证数值表） |

### 实测样例（探针真实跑出的一局）
```json
{"char":"knight","seed":4242,"end":"dead","deathWave":2,"kills":35,"maxAlive":12,"dmgTaken":76,"durSec":27,
 "waves":[{"wave":1,"sec":19.1,"kills":26,"lv":3,"gold":43,"aliveMax":7,"hp":24,"dmgTaken":48}]}
```
`__logSummary()` → `{"knight":{"runs":1,"avgDeathWave":2,"bestWave":2,"avgKills":35}}`

**能回答的问题**：每波清怪速度、哪一波开始掉血、同屏峰值是否失控、不同角色的死亡波次分布。

---

## 2. 可配置数值表（Balance）

### 原则
- 默认值集中在 `core/Balance.ts` 的 `DEFAULT_BALANCE`（一个文件看全）；
- 运行时可用 `balanceOverride()` 局部覆盖，写进 `localStorage['cmt_balance_v1']`，**不用重新编译**；
- 代码里只读 `balance().xxx`，不写死数字。

### 可配项
| 分组 | 字段 | 影响 |
|---|---|---|
| `spawn` | baseInterval / perWave / minInterval / batchEvery / batchMax / openBase / openEvery / openMax / aliveSoft / aliveHard / slowMul | 刷怪曲线与同屏上限 |
| `growth` | hpPerWave / dmgPerWave | 敌人每波成长 |
| `wave` | baseTime / timeStep / timeEvery | 波次时长 |
| `reward` | earlyMax / midMax + 三档权重 | 升级三选一 |
| `shop` | 价格基数/随机/每波增量、rerollBase、波末金币 | 商店经济 |
| `ai` | 精英/BOSS 冲锋与砸地的预警/冲刺/恢复/冷却/伤害倍率 | 敌人强度 |
| `exp` | base / perLevel / waveEndMul | 经验与波末 50% 规则 |

### 用法
```js
// 控制台热调（下次进局生效，可反复）
__balSet({ spawn: { batchMax: 4, aliveSoft: 50 } });
__bal()            // 看当前生效值
__balExport()      // 导出 JSON
__balReset()       // 回到代码默认
__balImport(json)  // 导入一套调好的参数
```

### 实测
```text
__balSet({ spawn: { batchMax: 4 } }) → __bal().spawn.batchMax = 4
__balReset()                          → 3（代码默认）
```

---

## 3. 与"玩法审计"的关系

`docs/audits/gameplay_audit_and_proposal.md` 里的候选值现在都能直接试，不用改代码：

```js
// 候选 A（审计 §8.2）
__balSet({ spawn: { baseInterval: 0.62, perWave: 0.016, minInterval: 0.34, batchEvery: 4, batchMax: 3 } });
// 候选 B（更激进）
__balSet({ spawn: { minInterval: 0.30, batchMax: 4, aliveSoft: 55, aliveHard: 80 } });
```

跑 5~10 局后 `__logSummary()` 对比 `avgDeathWave`/`maxAlive`，再决定写回哪个默认值。

---

## 4. 未做 / 风险

1. 日志只存在**本机 localStorage**，换设备/清缓存会丢；没有上传通道（未做联网）。
2. 日志按"波"采样，**不是逐秒**：看不到波内血线变化，只能看到波末残血。
3. 微信真机未验证 `localStorage`（`sys.localStorage` 已在存档里用过，风险低但仍需真机确认）。
4. `balance()` 的结果在**进局时读取**；对局中改数值不会热更新当前局（避免中途规则漂移）。
